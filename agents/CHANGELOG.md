# CHANGELOG - Lịch sử Cập nhật & Tiến độ Codebase

Tài liệu này ghi lại toàn bộ các mốc thay đổi kiến trúc và tính năng đã triển khai trên `DentalClinicApp`.

## [2026-10-31] - Screen 10: Quản lý Ca làm việc Thực tế Tuần (Work Shifts Management)

### Đã hoàn thành:
1. **Kiến trúc & Cơ chế Tự động Quét Vắng mặt Sau 15 Phút (JIT / Lazy Evaluation):**
   - Triển khai cơ chế quét tự động ngay trong tầng Service khi gọi API `GET`: các ca trong quá khứ hoặc ca hôm nay còn ở trạng thái `chua_dien_ra` mà đã quá 15 phút so với giờ bắt đầu (`ngay + gio_bat_dau + 15 phút < NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'`) sẽ được tự động batch update thành `vang_mat` trong CSDL trước khi trả về cho client.
   - Các ca đã điểm danh `co_mat` hoặc ca chưa đến giờ giữ nguyên trạng thái.
2. **API 1: `GET /api/v1/admin/work-shifts` (Xem Ca làm việc Ma trận tuần):**
   - Query params: `date` (mặc định ngày hiện tại theo giờ Việt Nam GMT+7, tự động tính tuần Thứ Hai -> Chủ Nhật), `roomId` (lọc theo phòng khám tùy chọn).
   - Tự động cập nhật vắng mặt sau 15 phút, trả về dữ liệu ma trận 4 phòng × 7 ngày kèm tóm tắt số liệu (`totalShifts`, `presentCount`, `absentCount`, `pendingCount`).
3. **API 2: `PATCH /api/v1/admin/work-shifts/:id/status` (Cập nhật trạng thái Có mặt / Vắng mặt):**
   - Hỗ trợ đổi trạng thái linh hoạt luân phiên (`co_mat` $\leftrightarrow$ `vang_mat` $\leftrightarrow$ `chua_dien_ra`) khi bác sĩ xin nghỉ trước hoặc bác sĩ đến phòng khám muộn báo giải trình với Admin.
   - Có kiểm tra chống trùng lịch: chặn điểm danh `co_mat` nếu bác sĩ đã có mặt ở phòng khác trong cùng khung giờ (`409 Conflict`).
4. **API 3: `POST /api/v1/admin/work-shifts/generate` (Tạo 56 ca tuần mới từ Khung mẫu):**
   - Nhận `startDate` (bắt buộc là ngày Thứ Hai của tuần).
   - Tự động nhân bản 56 ca từ Khung mẫu (`KhungCaLamViec`) sang 56 ca thực tế cho 7 ngày của tuần đó.
   - Chặn tạo trùng lặp nếu tuần đó đã có lịch làm việc (`400 Bad Request`).
5. **Kiểm thử tự động:**
   - 100% bài test pass (Default week, auto absent scan, chuyển đổi trạng thái luân phiên, tạo ca tuần mới, chặn tạo trùng lặp, RBAC 401).

---

## [2026-10-31] - Screen 9: Quản lý Khung mẫu Ca làm việc Động (Shift Template Frame)

### Đã hoàn thành:
1. **Mô hình Dữ liệu Khung ca mẫu tuần (`KhungCaLamViec`):**
   - Tạo model Prisma `KhungCaLamViec` (bảng `khung_ca_lam_viec`) độc lập với bảng ca thực tế `ca_lam_viec`:
     - Các trường: `id` (UUID), `thuTrongTuan` (SmallInt 2..8: Thứ Hai -> Chủ Nhật), `gioBatDau` (Time: 08:00, 13:30), `gioKetThuc` (Time: 12:00, 17:30), `phongDieuTriId` (UUID), `nhaSiId` (UUID), `ghiChu` (VarChar), `createdAt`, `updatedAt`.
     - Unique constraints bảo vệ toàn vẹn: `@@unique([thuTrongTuan, gioBatDau, phongDieuTriId])` (1 phòng 1 ca cùng giờ) và `@@unique([thuTrongTuan, gioBatDau, nhaSiId])` (1 bác sĩ 1 phòng cùng giờ).
   - Bổ sung phòng `P301` và nạp 56 bản ghi ca mẫu luân phiên cho 5 bác sĩ qua 4 phòng khám trong `prisma/mock_data.sql`.
2. **API 1: `GET /api/v1/admin/work-shift-templates` (Xem Ma trận Khung ca mẫu tuần):**
   - Trả về cấu trúc ma trận 4 phòng × 7 ngày (mỗi ngày 2 ca Sáng/Chiều), kèm danh sách phòng hoạt động và danh sách bác sĩ để frontend hiển thị bảng ma trận và dropdown.
   - Hỗ trợ lọc gọn duy nhất theo phòng khám: `?roomId=<UUID>` (khi lọc phòng chỉ trả về đúng 1 phòng và 14 ca của tuần).
3. **API 2: `PUT /api/v1/admin/work-shift-templates/:id` (Đổi bác sĩ phụ trách ca mẫu):**
   - Cho phép Admin chỉ định lại bác sĩ phụ trách cho đúng 1 record ca mẫu theo `:id` trên URL.
   - Kiểm tra trạng thái bác sĩ: chặn phân công bác sĩ đã nghỉ việc (`400 Bad Request`).
   - Tự động kiểm tra chống trùng lịch ca trực: chặn và cảnh báo nếu bác sĩ đó đã được xếp vào phòng khác trong cùng khung giờ (`409 Conflict`).
4. **Kiểm thử tự động & Bảo mật RBAC:**
   - Đã kiểm thử tự động toàn diện: Đăng nhập Admin, lấy ma trận 56 ca, lọc theo phòng, đổi bác sĩ thành công, kiểm tra conflict 409 khi bác sĩ trùng ca, và chặn truy cập trái phép (401 Unauthorized khi thiếu token).

---

## [2026-10-30] - Hoàn thiện Toàn diện Màn hình 1 (Admin Dashboard) với 3 APIs

### Đã hoàn thành:
1. **API 1: `GET /api/v1/admin/stats` (KPI Tổng quan Dashboard):**
   - Đóng gói toàn bộ logic tính doanh thu vào hàm PostgreSQL Stored Function `fn_calculate_revenue(p_start_date, p_end_date)` bám sát 3 kịch bản lâm sàng (Phác đồ 1 lần, Phác đồ theo đợt, Khám dịch vụ lẻ - voucher).
   - Tối ưu song song qua `Promise.all` 4 tác vụ: Doanh thu thực thu, Số ca khám hoàn thành (`ho_so_benh_an`), Lịch hẹn hôm nay, Bệnh nhân mới hôm nay.
2. **API 2: `GET /api/v1/admin/top-services` (Top Dịch vụ & Doanh thu đóng góp):**
   - **PostgreSQL View:** Tạo View `v_dich_vu_da_thanh_toan` (lưu tại `prisma/sql/02_view_top_services.sql`) tổng hợp bằng `UNION ALL` giữa:
     - Nhánh dịch vụ điều trị: `dich_vu_dieu_tri` $\rightarrow$ `chi_tiet_dich_vu` $\rightarrow$ `dich_vu`.
     - Nhánh vật tư / sản phẩm tiêu hao: `vat_tu_su_dung` $\rightarrow$ `san_pham` $\rightarrow$ `dich_vu` (qua `san_pham.dich_vu_id`).
     - Điều kiện bắt buộc: Hóa đơn đã thanh toán (`hoa_don.trang_thai_thanh_toan = 'da_thanh_toan'`).
   - Sắp xếp (Rank) theo số lượt sử dụng (`execution_count DESC`) và doanh thu (`total_revenue DESC`).
   - Tự động tính tỷ lệ % đóng góp (`percentageContribution`) trên tổng doanh thu dịch vụ của kỳ.
   - Query params: `period` (mặc định `'this_month'`), `limit` (mặc định 5, min 1, max 50).
3. **API 3: `GET /api/v1/admin/alerts` (Cảnh báo Tồn kho Vật tư Y tế):**
   - Lọc các sản phẩm hoạt động có `so_luong_ton <= muc_ton_toi_thieu`.
   - Phân cấp cảnh báo:
     - `CRITICAL`: Hết hàng hoàn toàn (`so_luong_ton = 0`).
     - `WARNING`: Tồn kho chạm ngưỡng tối thiểu (`0 < so_luong_ton <= muc_ton_toi_thieu`).
   - Trả về cấu trúc `summary` (`totalAlerts`, `criticalCount`, `warningCount`) và danh sách `alerts` chi tiết.
   - Query params: `limit` (mặc định 20, min 1, max 100).
4. **Kiểm thử Toàn diện & Bảo mật RBAC:**
   - Đã kiểm thử tự động 8 kịch bản (Success, Bad Request Validation, Unauthorized, Forbidden RBAC). Tất cả đều pass 100%.

5. **Screen 2: Quản lý Nhân sự Toàn diện (Staff / User Management):**
   - **Thống nhất vai trò & chức vụ:** Nha sĩ (`role: 'BAC_SI'`), Lễ tân & Thu ngân (`role: 'LE_TAN'`, chức vụ lưu tại `position: 'le_tan'`).
   - **Form danh sách Main đồng nhất:** Cả Bác sĩ và Lễ tân đều trả về form chuẩn đồng nhất (`id` là UUID, `code`, `username`, `fullName`, `role`, `roleTitle`, `phone`, `email`, `accountStatus`, `workStatus`, `createdAt`).
   - **API 1: `GET /api/v1/admin/users`:** Phân trang `page`, `limit` (default 10), bộ lọc `role` (`ALL`, `BAC_SI`, `LE_TAN`), `status` và `search` (mã nha sĩ `maNhaSi`, mã nhân viên `maNhanVien`, họ tên, sđt, username).
   - **API 2: `GET /api/v1/admin/users/:id`:** Truy vấn chi tiết theo UUID (`tai_khoan.id`), bung thêm các trường chuyên biệt theo vai trò (`specialty`, `licenseNumber`, `bio` cho Nha sĩ; `position` cho Lễ tân).
   - **API 3: `POST /api/v1/admin/users`:** Thêm mới nhân sự (Bác sĩ hoặc Lễ tân). Tự động sinh mã `NS-XXXX` hoặc `NV-XXXX`, băm mật khẩu mặc định `Password123@` (hoặc mật khẩu do admin truyền), thực thi đồng thời trong `prisma.$transaction`.
   - **API 4: `PUT /api/v1/admin/users/:id`:** Cập nhật thông tin nhân sự (họ tên, sđt, email, địa chỉ, chuyên khoa, số CCHN, trạng thái làm việc, chức vụ). Có kiểm tra chống trùng lặp sđt/email.
   - **API 5: `PATCH /api/v1/admin/users/:id/status`:** Khóa / Kích hoạt tài khoản nhân sự (`hoat_dong` $\leftrightarrow$ `bi_khoa`). Khi bị khóa (`bi_khoa`), tự động xóa `refreshTokenHash = null` để thu hồi phiên làm việc lập tức. Chặn tự khóa tài khoản Admin.
   - **API 6: `POST /api/v1/admin/users/:id/reset-password`:** Admin đặt lại mật khẩu cho nhân sự (mặc định `Password123@` hoặc mật khẩu mới), xóa `refreshTokenHash = null` buộc đăng nhập lại. Chặn reset tài khoản Admin.
   - **Kiểm thử tự động:** Vượt qua 10/10 bài kiểm thử CRUD và bảo mật RBAC.

6. **Screen 3: Quản lý Dịch vụ & Chi tiết Dịch vụ (Services & Service Details Screen):**
   - **Kiến trúc 2 cấp chuẩn Lâm sàng Nha khoa:** Dịch vụ cha (`dich_vu` - Level 0) định nghĩa nhóm quy trình tổng quát; Chi tiết dịch vụ (`chi_tiet_dich_vu` - Level 1) quản lý bảng giá điều trị, đơn vị tính.
   - **Đặc tả nghiệp vụ sạch UI & Bảo vệ dữ liệu y khoa:** Không áp dụng API xóa vật lý (`DELETE`). Thay vào đó, áp dụng cơ chế Khóa / Kích hoạt trạng thái (`hoat_dong` $\leftrightarrow$ `ngung_hoat_dong`) để giữ giao diện tinh gọn, bảo toàn 100% lịch sử bệnh án lâm sàng.
   - **API 1: `GET /api/v1/admin/services`:** Phân trang `page`, `limit` (default 10), bộ lọc `status` (`ALL`, `hoat_dong`, `ngung_hoat_dong`), tìm kiếm `search` theo mã và tên dịch vụ. Tự động tính toán tổng số gói con (`itemsCount`), khoảng giá sàn - trần (`minPrice`, `maxPrice`).
   - **API 2: `GET /api/v1/admin/services/:id`:** Lấy thông tin chi tiết dịch vụ cha kèm toàn bộ danh sách gói chi tiết (`chiTietDichVu`) bên trong đã format chuẩn camelCase.
   - **API 3: `POST /api/v1/admin/services`:** Tạo mới dịch vụ cha Level 0. Tự động sinh mã duy nhất `DV-XXXX` nếu không chỉ định mã.
   - **API 4: `PUT /api/v1/admin/services/:id`:** Cập nhật thông tin dịch vụ cha (tên, mô tả, thông tin quy trình điều trị, thời gian dự kiến phút, mã dịch vụ). Có kiểm tra chống trùng lặp mã.
   - **API 5: `PATCH /api/v1/admin/services/:id/status`:** Bật / tắt trạng thái hoạt động của dịch vụ cha. Khi chuyển sang `ngung_hoat_dong`, tự động **cascade cập nhật toàn bộ các gói chi tiết con trực thuộc** sang `ngung_hoat_dong` để tránh chỉ định nhầm trong điều trị.
   - **API 6: `POST /api/v1/admin/services/:serviceId/items`:** Thêm mới gói chi tiết điều trị vào dịch vụ cha. Tự động sinh mã duy nhất `CTDV-XXXX` nếu không truyền.
   - **API 7: `PUT /api/v1/admin/services/items/:itemId`:** Cập nhật thông tin gói chi tiết (tên gói, giá, đơn vị tính, mã chi tiết).
   - **API 8: `PATCH /api/v1/admin/services/items/:itemId/status`:** Bật / tắt trạng thái gói chi tiết. Chặn kích hoạt nếu dịch vụ cha đang ở trạng thái `ngung_hoat_dong`.
   - **Kiểm thử tự động:** Vượt qua 100% các kịch bản kiểm thử CRUD danh mục, cascade trạng thái và chặn kích hoạt gói mồ côi.

7. **Screen 4: Quản lý Sản phẩm & Vật tư Tiêu hao (Products & Inventory Screen):**
   - **Mô hình Dữ liệu & Kho Lâm sàng:** Quản lý danh mục `san_pham` (Level 0), bám sát 3 loại chuẩn CSDL (`vat_lieu_nha_khoa` - Vật liệu nha khoa, `dung_cu` - Dụng cụ y tế, `vat_tu` - Vật tư tiêu hao).
   - **Cơ chế sạch UI & Bảo vệ lịch sử điều trị:** Tuyệt đối không xóa vật lý (`DELETE`). Sử dụng cơ chế Khóa / Kích hoạt (`hoat_dong` $\leftrightarrow$ `ngung_hoat_dong`) để bảo toàn các bản ghi kê đơn vật tư (`vat_tu_su_dung`).
   - **API 1: `GET /api/v1/admin/products`:** Phân trang `page`, `limit` (default 10), bộ lọc đa tiêu chí: `type` (phân loại), `status` (trạng thái), `stockAlert` (`ALL`, `LOW_STOCK` - chạm ngưỡng, `OUT_OF_STOCK` - hết hàng), `serviceId` (dịch vụ liên kết) và `search` (tìm theo tên hoặc mã). Tự động gắn cờ `isLowStock`, `isOutOfStock`.
   - **API 2: `GET /api/v1/admin/products/:id`:** Lấy thông tin chi tiết sản phẩm theo UUID kèm tóm tắt dịch vụ nha khoa liên kết (`service: { id, code, name }`).
   - **API 3: `POST /api/v1/admin/products`:** Thêm mới sản phẩm/vật tư (tên, loại, đơn vị tính, giá bán, số lượng tồn ban đầu, ngưỡng tồn tối thiểu, dịch vụ liên kết, mô tả). Tự động sinh mã `SP-XXXX` nếu không truyền.
   - **API 4: `PUT /api/v1/admin/products/:id`:** Cập nhật thông tin sản phẩm hoặc điều chỉnh số lượng tồn kho. Có kiểm tra chống trùng lặp mã sản phẩm và tồn tại của dịch vụ liên kết.
   - **API 5: `PATCH /api/v1/admin/products/:id/status`:** Bật / tắt trạng thái hoạt động của sản phẩm (`hoat_dong` $\leftrightarrow$ `ngung_hoat_dong`).
   - **Kiểm thử tự động:** Vượt qua 11/11 kịch bản kiểm thử phân trang, lọc tồn kho, tạo mã duy nhất, cảnh báo chạm ngưỡng và RBAC 100%.

8. **Screen 5: Quản lý Khuyến mãi & Voucher (Promotions & Vouchers Screen):**
   - **Mô hình Dữ liệu Tài chính Khuyến mãi:** Quản lý bảng `khuyen_mai` (Level 0), hỗ trợ 2 cơ chế chiết khấu: theo phần trăm (`phan_tram`, $\le 100\%$) và số tiền cố định (`so_tien` VNĐ).
   - **Cơ chế sạch UI & Toàn vẹn Hóa đơn:** Tuyệt đối không xóa vật lý (`DELETE`). Áp dụng cơ chế Hủy / Kích hoạt (`hoat_dong` $\leftrightarrow$ `da_huy`) để bảo toàn các hóa đơn bệnh nhân đã áp dụng mã (`hoa_don.khuyen_mai_id`).
   - **API 1: `GET /api/v1/admin/promotions`:** Phân trang `page`, `limit` (default 10), bộ lọc đa tiêu chí: `status` (`ALL`, `hoat_dong`, `het_han`, `da_huy`), `discountType` (`phan_tram`, `so_tien`), `timeStatus` (`ALL`, `UPCOMING` - sắp tới, `HAPPENING` - đang diễn ra, `EXPIRED` - hết hạn), và `search` (theo mã voucher hoặc tên chương trình). Tự động tính lượt dùng còn lại `remainingUsageCount` và cờ hết hạn `isExpired`.
   - **API 2: `GET /api/v1/admin/promotions/:id`:** Lấy thông tin chi tiết chương trình khuyến mãi theo UUID kèm số lượng hóa đơn đã áp dụng (`invoicesCount`).
   - **API 3: `POST /api/v1/admin/promotions`:** Thêm mới chương trình khuyến mãi (mã voucher, tên chương trình, loại giảm, giá trị giảm, ngày bắt đầu, ngày kết thúc, số lượt dùng tối đa). Tự sinh mã `KM-XXXX` nếu không truyền.
   - **API 4: `PUT /api/v1/admin/promotions/:id`:** Cập nhật thông tin chương trình khuyến mãi, gia hạn ngày kết thúc hoặc điều chỉnh lượt sử dụng tối đa.
   - **API 5: `PATCH /api/v1/admin/promotions/:id/status`:** Bật / tắt trạng thái hoạt động của khuyến mãi (`hoat_dong` $\leftrightarrow$ `da_huy` $\leftrightarrow$ `het_han`).
   - **Kiểm thử tự động:** Vượt qua 11/11 kịch bản kiểm thử phân trang, lọc theo thời gian thực, cập nhật hạn mức, hủy chương trình và bảo mật RBAC 100%.

9. **Screen 6: Quản lý Phòng khám / Phòng điều trị (Clinic Treatment Rooms Screen):**
   - **Đơn giản hóa Trạng thái theo yêu cầu:** Tinh gọn trạng thái `trang_thai` trong CSDL và hệ thống thành đúng 2 trạng thái: `hoat_dong` (Hoạt động) và `ngung_hoat_dong` (Ngưng hoạt động) - thay thế cho các trạng thái cũ (`san_sang`, `bao_tri`). Đã cập nhật check constraint `phong_dieu_tri_trang_thai_check` trong PostgreSQL và `schema.prisma`.
   - **Cơ chế sạch UI & Toàn vẹn Lịch làm việc:** Tuyệt đối không xóa vật lý (`DELETE`). Áp dụng cơ chế Khóa / Kích hoạt (`hoat_dong` $\leftrightarrow$ `ngung_hoat_dong`) để bảo toàn các ca làm việc (`ca_lam_viec.phong_dieu_tri_id`).
   - **API 1: `GET /api/v1/admin/rooms`:** Phân trang `page`, `limit` (default 10), bộ lọc `status` (`ALL`, `hoat_dong`, `ngung_hoat_dong`), tìm kiếm `search` theo mã phòng hoặc tên phòng. Kèm số lượng ca làm việc gắn kèm (`workShiftsCount`).
   - **API 2: `GET /api/v1/admin/rooms/:id`:** Lấy thông tin chi tiết phòng khám theo UUID.
   - **API 3: `POST /api/v1/admin/rooms`:** Thêm mới phòng khám (tên phòng, mã phòng, trạng thái, ghi chú/trang thiết bị). Tự động sinh mã `PK-XXXX` nếu không truyền.
   - **API 4: `PUT /api/v1/admin/rooms/:id`:** Cập nhật thông tin phòng khám (tên, mã, ghi chú, trạng thái). Có kiểm tra chống trùng lặp mã phòng.
   - **API 5: `PATCH /api/v1/admin/rooms/:id/status`:** Bật / tắt trạng thái hoạt động của phòng khám (`hoat_dong` $\leftrightarrow$ `ngung_hoat_dong`).
   - **Kiểm thử tự động:** Vượt qua 10/10 kịch bản kiểm thử phân trang, tìm kiếm, CRUD phòng khám, khóa/kích hoạt và bảo mật RBAC 100%.

10. **Screen 7: Quản lý Phác đồ Điều trị Mẫu (Treatment Plan Templates Screen):**
    - **Cấu trúc Phân cấp 2 cấp chuẩn Lâm sàng:** Phác đồ mẫu cha (`phac_do_mau` - Level 0) định nghĩa nhóm quy trình điều trị dài hạn; Các giai đoạn/bước điều trị con (`giai_doan_phac_do_mau` - Level 1) xác định các bước tuần tự (`buoc_so`), tên giai đoạn, tên dịch vụ áp dụng và thời gian chờ lành thương (`thoi_gian_nghi_giua_buoc`).
    - **Cơ chế sạch UI & Toàn vẹn Dữ liệu Y tế:** Phác đồ mẫu cha không xóa vật lý (`DELETE`) để bảo toàn các bệnh án đang áp dụng mẫu (`phac_do_dieu_tri`). Chỉ cho phép xóa một giai đoạn con khi phác đồ đó chưa từng được gán cho bệnh nhân nào.
    - **API 1: `GET /api/v1/admin/treatment-plans`:** Phân trang `page`, `limit` (default 10), bộ lọc `status` (`ALL`, `hoat_dong`, `ngung_hoat_dong`), tìm kiếm `search` theo mã hoặc tên phác đồ. Kèm số lượng giai đoạn con (`stagesCount`) và số bệnh nhân đã áp dụng (`appliedPatientsCount`).
    - **API 2: `GET /api/v1/admin/treatment-plans/:id`:** Lấy thông tin chi tiết phác đồ mẫu kèm danh sách toàn bộ các giai đoạn con tuần tự bên trong sắp xếp theo `buocSo`.
    - **API 3: `POST /api/v1/admin/treatment-plans`:** Tạo mới phác đồ mẫu (hỗ trợ tạo kèm mảng các bước ban đầu `stages` trong một transaction duy nhất). Tự sinh mã `PDM-XXXX` nếu không truyền.
    - **API 4: `PUT /api/v1/admin/treatment-plans/:id`:** Cập nhật thông tin phác đồ mẫu cha (tên, mã, mô tả, trạng thái). Có kiểm tra chống trùng mã phác đồ.
    - **API 5: `PATCH /api/v1/admin/treatment-plans/:id/status`:** Bật / tắt trạng thái hoạt động của phác đồ mẫu (`hoat_dong` $\leftrightarrow$ `ngung_hoat_dong`).
    - **API 6: `POST /api/v1/admin/treatment-plans/:planId/stages`:** Thêm một giai đoạn mới vào phác đồ (tự động tính `buocSo = max + 1` nếu không chỉ định).
    - **API 7: `PUT /api/v1/admin/treatment-plans/stages/:stageId`:** Chỉnh sửa thông tin giai đoạn điều trị mẫu (tên bước, bước số, tên dịch vụ, mô tả, thời gian nghỉ).
    - **API 8: `DELETE /api/v1/admin/treatment-plans/stages/:stageId`:** Xóa một bước điều trị mẫu (chỉ cho phép khi phác đồ mẫu chưa từng áp dụng cho bệnh nhân nào).
    - **Kiểm thử tự động:** Vượt qua 13/13 kịch bản kiểm thử tích hợp, RBAC và toàn vẹn dữ liệu y tế 100%.

11. **Screen 8: Quản lý Hóa đơn Viện phí (Invoices Screen - Level 4):**
    - **Tái hiện Bảng kê Chi phí Y tế từ Mô hình Chuẩn 3NF:** Hóa đơn liên kết với lịch hẹn (`lich_hen`), hồ sơ bệnh án (`ho_so_benh_an`), dịch vụ điều trị (`dich_vu_dieu_tri`), vật tư sử dụng (`vat_tu_su_dung`), giai đoạn phác đồ (`giai_doan_phac_do`) và voucher khuyến mãi (`khuyen_mai`).
    - **Bung Toàn bộ Bảng kê Viện phí:** Chi tiết hóa đơn hiển thị đầy đủ 2 danh mục:
      - **Dịch vụ điều trị (`services`):** Tên dịch vụ/thủ thuật, mã chi tiết, số lượng, đơn giá, vị trí răng, thành tiền, ghi chú chuyên môn.
      - **Vật tư tiêu hao / Sản phẩm (`materials`):** Tên vật tư (mão răng sứ, trụ implant, abutment...), phân loại, đơn vị tính, hãng sản xuất, số lượng, đơn giá, thành tiền.
    - **Tính toán Tài chính Minh bạch:** Tự động tính toán tổng dịch vụ (`totalServicesAmount`), tổng vật tư (`totalMaterialsAmount`), tạm tính (`subtotalAmount`), giảm trừ voucher (`discountAmount` theo % hoặc số tiền mặt) và thực thu (`finalAmount`).
    - **API 1: `GET /api/v1/admin/invoices`:** Lấy danh sách hóa đơn phân trang (`page`, `limit`), bộ lọc trạng thái thanh toán (`status`), phương thức thanh toán (`paymentMethod`: `tien_mat`, `chuyen_khoan`), khoảng thời gian lập (`fromDate`, `toDate`), tìm kiếm (`search` theo mã hóa đơn, họ tên, số điện thoại bệnh nhân).
    - **API 2: `GET /api/v1/admin/invoices/:id`:** Lấy toàn bộ thông tin chi tiết bảng kê hóa đơn viện phí, thông tin bệnh nhân, bác sĩ khám, nhân viên thu ngân, phác đồ/giai đoạn điều trị, voucher và tóm tắt tài chính.
    - **API 3: `PATCH /api/v1/admin/invoices/:id/payment`:** Xác nhận thanh toán hóa đơn (`chua_thanh_toan` $\rightarrow$ `da_thanh_toan`), ghi nhận phương thức thanh toán (`tien_mat` hoặc `chuyen_khoan`), ngày giờ thanh toán, đồng thời tự động cập nhật trạng thái giai đoạn phác đồ tương ứng sang `da_thanh_toan`. Chặn thanh toán lại hóa đơn đã thanh toán hoặc đã hủy (400).
    - **API 4: `PATCH /api/v1/admin/invoices/:id/cancel`:** Hủy hóa đơn (`da_huy`) kèm lý do hủy bắt buộc (`cancelReason`), hoàn nguyên trạng thái giai đoạn phác đồ về `chua_thanh_toan`. Chặn hủy lại hóa đơn đã hủy (400).
    - **Kiểm thử tự động:** Script `test_admin_invoices.js` vượt qua 100% các bài kiểm thử xác thực JWT, RBAC, phân trang, lọc, tìm kiếm, bung chi tiết dịch vụ/vật tư và quy trình thanh toán/hủy.

---

## [2026-10-29] - Chuẩn hóa Toàn diện Quy tắc Đặt tên DTOs (RequestSchema & ResponseSchema)

### Đã hoàn thành:
1. **Quy chuẩn hóa 100% Tên DTOs:**
   - **Request Schemas (Dữ liệu đầu vào / Joi):** Bắt buộc theo mẫu `<domain><Action>RequestSchema` (ví dụ `departmentLoginRequestSchema`, `departmentRefreshTokenRequestSchema`, `clientRegisterRequestSchema`, `clientVerifyRegistrationRequestSchema`, `clientResendOtpRequestSchema`, `clientLoginRequestSchema`, `clientForgotPasswordRequestSchema`, `clientResetPasswordRequestSchema`, `clientRefreshTokenRequestSchema`).
   - **Response Schemas (Dữ liệu đầu ra / Sanitizer & Formatter):** Bắt buộc theo mẫu `<domain><Action/Entity>ResponseSchema` (ví dụ `departmentUserProfileResponseSchema`, `departmentAuthResponseSchema`, `clientProfileResponseSchema`, `clientAuthResponseSchema`).
2. **Cập nhật Toàn bộ Consumers & Loại bỏ Hoàn toàn Aliases Cũ:**
   - Cập nhật các routes (`routes/auth/authDepartment.js`, `routes/auth/authClient.js`) và services (`services/auth/authDepartment.js`, `services/auth/authClient.js`).
   - Xóa bỏ triệt để toàn bộ các biến aliases cũ, đảm bảo duy nhất 1 tên định danh chuẩn hóa cho mỗi schema trên toàn codebase.
3. **Cập nhật Đồng bộ Bộ nhớ & Tài liệu AI Agents:**
   - Cập nhật `agents/MEMORY.md` (Quy tắc 2), `agents/ARCHITECTURE.md`, `agents/modules/auth.md` và `agents/modules/middlewares.md`.
4. **Quy chuẩn Nguyên tắc Tối thiểu hóa Payload Auth (Minimal UI Shell):**
   - Loại bỏ các biến thừa `expiresIn`, `refreshExpiresIn` khỏi phản hồi Auth; FE tự decode `exp` từ JWT.
   - Đồng bộ `clientProfileResponseSchema` với `departmentUserProfileResponseSchema`: loại bỏ `dateOfBirth`, `gender`, `address`, `status`, `createdAt`, `username` khỏi Auth Response; chỉ giữ lại các trường khung UI Shell để dựng Header/Navbar/Sidebar.
   - Thống nhất cơ chế `GET /me` chỉ phục vụ khôi phục phiên (Session Hydration); phân tách hoàn toàn với module Profile chi tiết sau này.
5. **Tối giản hóa JWT Payload & Phân quyền RBAC qua duy nhất 1 trường `role`:**
   - Loại bỏ `accountType` và `position` trong `jwt.sign()` ở cả 2 phân hệ; JWT payload chỉ còn đúng 3 trường định danh: `{ userId, profileId, role }`.
   - Cập nhật middleware `authGuard.js`: hàm `restrictToRoles` so khớp trực tiếp duy nhất trường `req.user.role` với chuẩn hóa chữ hoa an toàn.
   - Dọn sạch toàn bộ vết tích tầng `Repository` và `Model` cũ trong `roles.md`, `auth.md`, `database.md`, `MEMORY.md`, đồng bộ 100% theo kiến trúc Prisma Service-Centric.

---

## [2026-10-28] - Triển khai Hoàn chỉnh Module Xác thực Bệnh nhân (Auth Client & Nodemailer OTP)

### Đã hoàn thành:
1. **Thiết kế & Tách cổng API Độc lập (`/api/v1/auth/client`):**
   - Đảm bảo tính phân tách trách nhiệm (Separation of Concerns): Tách biệt hoàn toàn luồng người dùng Bệnh nhân với nhân sự phòng khám (`authDepartment`).
2. **Quy trình Đăng ký 2 bước qua OTP Email (Anti-Spam Database):**
   - **Bước 1 (`POST /register`):** Tiếp nhận thông tin bệnh nhân, hash password, sinh mã OTP 6 số lưu tạm tại `src/utils/otpStore.js` (TTL 5 phút), gửi mail qua `src/utils/emailService.js` (tích hợp `nodemailer`).
   - **Bước 2 (`POST /verify-registration`):** Xác thực OTP hợp lệ mới chính thức thực thi `prisma.$transaction` tạo đồng thời `TaiKhoan` và `BenhNhan`, tự động sinh mã hồ sơ `BN-XXXXXX`.
3. **Bộ Tính năng Auth Client Toàn diện:**
   - Đăng nhập linh hoạt bằng Email hoặc SĐT (`POST /login`).
   - Quên mật khẩu & Đặt lại mật khẩu qua OTP Email (`POST /forgot-password` & `POST /reset-password`).
   - Gửi lại mã OTP (`POST /resend-otp`).
   - Token Rotation (`POST /refresh`), Đăng xuất an toàn (`POST /logout`), Lấy hồ sơ cá nhân (`GET /me`).
4. **Dev Experience Fallback:**
   - Cơ chế fallback tự động in mã OTP ra Terminal/Console khi chưa cấu hình SMTP Gmail trong `.env`, giúp quá trình phát triển và kiểm thử diễn ra trơn tru.

---

## [2026-10-27] - Triển khai Toàn diện 22 Bảng CSDL (Level 0 – 6) sang Prisma ORM & PostgreSQL Container

### Đã hoàn thành:
1. **Hoàn thiện `prisma/schema.prisma` với đầy đủ 22 Models & Relations:**
   - **Level 0 (Master Data):** `TaiKhoan`, `DichVu`, `SanPham`, `PhacDoMau`, `KhuyenMai`, `PhongDieuTri`.
   - **Level 1 (Hồ sơ & Chi tiết):** `ChiTietDichVu`, `BenhNhan`, `NhaSi`, `NhanVien`, `GiaiDoanPhacDoMau`, `AuditLog`.
   - **Level 2 (Lịch làm việc & Kế hoạch):** `CaLamViec`, `PhacDoDieuTri`.
   - **Level 3 (Đặt lịch hẹn):** `LichHen`.
   - **Level 4 (Hồ sơ điều trị, Hóa đơn & Giai đoạn):** `HoSoBenhAn`, `HoaDon`, `GiaiDoanPhacDo`.
   - **Level 5 (Thực thi lâm sàng & Vật tư):** `DichVuDieuTri`, `DonThuoc`, `VatTuSuDung`.
   - **Level 6 (Chi tiết dòng thuốc):** `ChiTietDonThuoc`.
   - Toàn bộ models được định nghĩa đầy đủ quan hệ 1-1, 1-N, Self-relation (`buocCha` / `cacBuocCon`), `@map` / `@@map` chuẩn hóa sang `camelCase`, và `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]`.
2. **Triển khai CSDL PostgreSQL (`dentaldb`):**
   - Đã thực thi trọn vẹn toàn bộ 22 bảng, extensions (`uuid-ossp`, `btree_gist`), functions (`fn_cap_nhat_updated_at`), triggers cập nhật `updated_at`, check constraints và exclusion constraints (`no_overlap_nha_si_ca`, `no_overlap_phong_ca`, `no_overlap_lich_hen`) vào container `dentaldb`.
3. **Sinh Prisma Client & Kiểm thử Đồng bộ:**
   - Đã biên dịch `npx prisma generate` thành công trên cả môi trường Host (Windows) và Container (`dental_clinic_api`).
   - Kiểm thử truy vấn toàn bộ 22 model thành công 100% không phát sinh lỗi.
   - API server hoạt động ổn định trên `http://localhost:5000` và Prisma Studio sẵn sàng tại `http://localhost:5555`.

---

## [2026-10-27] - Chuyển đổi Toàn diện sang Prisma ORM & Dọn sạch Tầng Thừa

### Đã hoàn thành:
1. **Tích hợp Prisma ORM (v5.22.0):**
   - Khởi tạo `prisma/schema.prisma` định nghĩa 4 bảng cốt lõi (`tai_khoan`, `nha_si`, `nhan_vien`, `benh_nhan`) với các thuộc tính `@map` ánh xạ `snake_case` sang `camelCase` và `@relation` tự động.
   - Tạo `src/config/prisma.js` khởi tạo Prisma Client Singleton instance duy nhất.
2. **Dọn dẹp Triệt để Tầng Thừa (Clean Architecture Optimization):**
   - **Xóa bỏ hoàn toàn tầng `src/models/`:** Không cần class `DepartmentUser` hay hàm `fromDatabase()` viết tay; chuyển logic trích xuất hồ sơ trực tiếp vào `extractDepartmentProfile()` trong `src/dtos/auth/authDepartmentDto.js`.
   - **Xóa bỏ hoàn toàn tầng `src/repositories/`:** Tầng `src/services/auth/authDepartment.js` gọi trực tiếp `prisma.taiKhoan` với cú pháp hướng đối tượng trực quan và an toàn.
   - **Xóa bỏ `src/config/db.js` (`pg.Pool`):** Ứng dụng Express chính thức chỉ sử dụng kết nối của Prisma. Tách biệt script migration `scripts/migrate_schema.js` tự khởi tạo kết nối riêng.
3. **Đồng bộ Tài liệu Quy chuẩn:**
   - Cập nhật `agents/ARCHITECTURE.md` và `agents/MEMORY.md` chuyển sang quy chuẩn Prisma Service-Centric.

---

## [2026-10-27] - Chuẩn hóa Toàn diện Codebase, Loại bỏ Fallbacks || & Đồng bộ Agents Documentation

### Đã hoàn thành:
1. **Loại bỏ toán tử Fallback `||` (Direct Field Referencing):**
   - Đã quy chuẩn toàn bộ field name giữa CSDL, Model, DTO và Payload.
   - Loại bỏ các biểu thức fallback rườm rà trong `controllers/auth/authDepartment.js` (`req.user.userId`, `req.body.refreshToken`).
   - Loại bỏ các giá trị fallback mặc định không cần thiết trong `models/auth/departmentUser.js` (`constructor` và `fromDatabase`).
   - Dọn sạch fallback token extraction trong `common/validateMiddleware.js`, biến middleware validation thành thuần túy theo schema.
   - Chuẩn hóa `middlewares/auth/authGuard.js` kiểm tra header `req.headers['authorization']` và RBAC trực tiếp (`role`, `loai_tai_khoan`, `chuc_vu`).
2. **Đồng bộ Cấu trúc & Tinh gọn Middleware:**
   - Xóa bỏ file middleware bọc thừa `src/middlewares/auth/authDepartment.js`, quy chuẩn gắn trực tiếp `validate(loginRequestSchema)` và `validate(refreshTokenRequestSchema)` ngay tại `routes/auth/authDepartment.js`.
   - Quy chuẩn duy nhất một canonical endpoint `POST /refresh`, loại bỏ route alias rườm rà.
   - Triển khai cơ chế Tolerant Token Parsing tại `middlewares/auth/authGuard.js`: linh hoạt bóc tách token (chấp nhận `Bearer <token>`, `Bearer\n<token>`, `Bearer<token>` hoặc raw token `ey...`).
   - Thêm runtime Type Guard (`if (!decoded || typeof decoded === 'string')`) trong `authDepartment.js` và `authGuard.js` xử lý triệt để cảnh báo TypeScript TS2339 trong môi trường `checkJs: true`.
   - Quy chuẩn Kiến trúc Dual-Identity (`userId` / `id` đại diện tài khoản vs `profileId` đại diện bác sĩ `nha_si.id` hoặc nhân viên `nhan_vien.id`).
   - Quy chuẩn Single Active Session: lưu duy nhất 1 `refresh_token_hash` trên bảng `tai_khoan`, ghi đè khi đăng nhập/làm mới để tránh phình dữ liệu và tự động vô hiệu hóa phiên cũ.
   - Bổ sung script chạy migration `scripts/migrate_schema.js` hỗ trợ `npm run migrate` tự động thực thi 22 file schema SQL theo đúng thứ tự 7 cấp bậc phụ thuộc (Level 0 – 6).
3. **Bảo mật & Nghiệp vụ Nhân sự:**
   - Kiểm tra trạng thái nghỉ việc của nhân viên/bác sĩ (`user.workStatus === 'nghi_viec'`) ngay tại cổng đăng nhập và làm mới token.
   - Cơ chế Token Rotation với `bcrypt.hash` lưu tại `refresh_token_hash` của PostgreSQL.
   - API `logout` xóa hash refresh token trên database.
   - API `getMe` trả về profile chuẩn hóa kèm cờ `success: true`.

---

## [2026-10-26] - Khởi tạo Module Auth & Thiết lập Kiến trúc Phân vai trò

### Đã hoàn thành:
1. **Kiến trúc Codebase:**
   - Tổ chức cấu trúc thư mục phân tách theo 4 vai trò: `admin`, `dentist`, `receptionist`, `patient`.
   - Tách module Auth thành 2 branches: `authDepartment` (nhân sự phòng khám) và `authClient` (bệnh nhân/khách hàng).
2. **Cơ chế Validation Middleware:**
   - Tách biệt Schemas (DTO) và Middleware Validation bằng Joi.
   - Tích hợp Centralized Error Handling (`ApiError`, `errorHandler`, `asyncHandler`).