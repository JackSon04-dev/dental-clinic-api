# CHANGELOG - Lịch sử Cập nhật & Tiến độ Codebase

Tài liệu này ghi lại toàn bộ các mốc thay đổi kiến trúc và tính năng đã triển khai trên `DentalClinicApp`.

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