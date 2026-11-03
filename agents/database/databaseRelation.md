# CSDL 23 Bảng & Kiến trúc Quan hệ Prisma (Database & Prisma Relations)

Toàn bộ nghiệp vụ của hệ sinh thái Nha khoa được xây dựng trên 23 bảng CSDL PostgreSQL, chia làm **7 cấp độ phân cấp (Level 0 đến Level 6)**, kết nối và đồng bộ hoàn toàn thông qua Prisma ORM (`prisma/schema.prisma`).

---

## 1. Phân cấp 23 Bảng (Hierarchy Levels 0 – 6)

* **Level 0 (Bảng gốc độc lập, không phụ thuộc - Master Data):**
  1. `tai_khoan`: Quản lý định danh tài khoản, mật khẩu băm bcrypt, `refresh_token_hash`, phân loại vai trò (`ADMIN`, `BAC_SI`, `LE_TAN`, `BENH_NHAN`).
  2. `dich_vu`: Danh mục dịch vụ nha khoa cha (Khám tổng quát, Cấy ghép Implant, Chỉnh nha, Bọc răng sứ...).
  3. `san_pham`: Danh mục vật tư tiêu hao, dụng cụ, vật liệu nha khoa tồn kho phòng khám (quản lý số lượng tồn, ngưỡng tối thiểu, trừ kho khi điều trị).
  4. `thuoc`: **Thư viện danh mục thuốc kê đơn chuẩn y khoa** (biệt dược, hoạt chất, hàm lượng, đường dùng, hướng dẫn mặc định, chống chỉ định). Đóng vai trò thư viện dùng chung cho bác sĩ tra cứu và điền nhanh đơn thuốc.
  5. `phac_do_mau`: Mẫu phác đồ điều trị chuẩn y khoa để tái sử dụng nhiều lần.
  6. `khuyen_mai`: Chương trình giảm giá, voucher khuyến mãi (% hoặc số tiền).
  7. `phong_dieu_tri`: Danh sách phòng khám và ghế nha khoa thực tế.

* **Level 1 (Phụ thuộc Level 0):**
  8. `chi_tiet_dich_vu`: Các gói dịch vụ / đơn giá cụ thể của dịch vụ cha (FK `dich_vu_id`).
  9. `benh_nhan`: Thông tin y bạ, hành chính của bệnh nhân (FK `tai_khoan_id`).
  10. `nha_si`: Hồ sơ bác sĩ, số CCHN, chuyên khoa (FK `tai_khoan_id`).
  11. `nhan_vien`: Hồ sơ lễ tân, thu ngân (FK `tai_khoan_id`).
  12. `giai_doan_phac_do_mau`: Các bước mẫu trong phác đồ điều trị mẫu (FK `phac_do_mau_id`).
  13. `audit_log`: Truy vết lịch sử thêm/sửa/xóa hệ thống (FK `tai_khoan_id`).

* **Level 2 (Phụ thuộc Level 1):**
  14. `ca_lam_viec`: Phân ca trực bác sĩ theo phòng điều trị và ngày giờ (FK `nha_si_id`, `phong_dieu_tri_id`), cùng bảng khung mẫu tuần lặp lại `khung_ca_lam_viec`.
  15. `phac_do_dieu_tri`: Hợp đồng phác đồ điều trị dài hạn của bệnh nhân (FK `benh_nhan_id`, `nha_si_id`, `phac_do_mau_id`).
  16. `lich_hen`: Cuộc hẹn khám của bệnh nhân theo ca trực bác sĩ (FK `benh_nhan_id`, `ca_lam_viec_id`, `dich_vu_id`).

* **Level 3 (Phụ thuộc Level 2):**
  17. `ho_so_benh_an`: Hồ sơ khám lâm sàng sinh ra khi check-in lịch hẹn (FK `lich_hen_id`).
  18. `hoa_don`: Hóa đơn viện phí phát sinh từ cuộc hẹn/phác đồ (FK `lich_hen_id`, `nhan_vien_id`, `khuyen_mai_id`).

* **Level 4 (Phụ thuộc Level 3):**
  19. `giai_doan_phac_do`: Các bước thực tế của phác đồ đang điều trị (FK `phac_do_id`, `buoc_cha_id`, `lich_hen_id`).

* **Level 5 (Phụ thuộc Level 3 & Level 4):**
  20. `dich_vu_dieu_tri`: Chi tiết dịch vụ bác sĩ thực hiện trong ca khám (FK `ho_so_id`, `chi_tiet_dich_vu_id` - **lưu đơn giá snapshot**).
  21. `don_thuoc`: Phiếu đơn thuốc do bác sĩ kê (FK `ho_so_id`, `nha_si_id`).
  22. `vat_tu_su_dung`: Vật tư tiêu hao trong ca khám (FK `ho_so_id`, `san_pham_id` - **lưu đơn giá snapshot, trừ tồn kho `san_pham`**).

* **Level 6 (Phụ thuộc Level 5):**
  23. `chi_tiet_don_thuoc`: Danh sách từng loại thuốc và liều dùng trong đơn (FK `don_thuoc_id`, `thuoc_id` - **lưu thông tin thuốc & liều lượng snapshot, liên kết thư viện thuốc để hỗ trợ autocomplete & pre-fill**).

---

## 2. Bản đồ Tham chiếu Khóa ngoại (Foreign Key Architecture)

Rất nhiều bảng nghiệp vụ liên kết với nhân sự phòng khám, các Agent cần phân biệt chính xác:
* **Bảng liên kết với `tai_khoan.id` (`tai_khoan_id`):** 
  * `nha_si`, `nhan_vien`, `benh_nhan`, `audit_log`.
* **Bảng liên kết với `nha_si.id` (`nha_si_id` - profileId của bác sĩ):** 
  * `ca_lam_viec`, `khung_ca_lam_viec`, `phac_do_dieu_tri`, `don_thuoc`.
* **Bảng liên kết với `nhan_vien.id` (`nhan_vien_id` - profileId của lễ tân/thu ngân):** 
  * `hoa_don` (nhân viên lập hóa đơn).
* **Bảng liên kết với `benh_nhan.id` (`benh_nhan_id`):** 
  * `phac_do_dieu_tri`, `lich_hen`.
* **Bảng liên kết với `thuoc.id` (`thuoc_id`):**
  * `chi_tiet_don_thuoc` (SetNull on delete: Đảm bảo nếu thuốc bị xóa/ngừng bán thì lịch sử đơn thuốc của bệnh nhân vẫn giữ nguyên vẹn snapshot).

---

## 3. Phân biệt Trách nhiệm giữa `san_pham` và `thuoc`

| Tiêu chí so sánh | `san_pham` (Vật tư / Dụng cụ kho) | `thuoc` (Thư viện thuốc kê đơn) |
| :--- | :--- | :--- |
| **Bản chất nghiệp vụ** | Vật liệu, dụng cụ tiêu hao phục vụ điều trị tại chỗ (Mão sứ, Trụ Implant, Mắc cài, Găng tay, Kim tiêm...) | Thuốc điều trị ngoại trú kê cho bệnh nhân tự ra nhà thuốc mua (Kháng sinh, giảm đau, kháng viêm...) |
| **Quản lý kho (`soLuongTon`)** | **CÓ** (Trừ kho tự động khi bác sĩ sử dụng trong `vat_tu_su_dung`) | **KHÔNG** (Phòng khám không giữ kho bán lẻ thuốc này) |
| **Tính tiền vào hóa đơn (`hoa_don`)** | **CÓ** (Cộng dồn chi phí vật tư vào viện phí điều trị) | **KHÔNG** (Bệnh nhân tự chi trả riêng tại nhà thuốc ngoài) |
| **Thuộc tính y khoa** | Mã sản phẩm, Đơn vị tính, Mức tồn tối thiểu, Đơn giá nhập/bán | Hoạt chất, Hàm lượng, Dạng bào chế, Đường dùng, Liều dùng chuẩn, Chống chỉ định |
| **Mục đích hỗ trợ App** | Cảnh báo hết hàng, kiểm kê vật tư, hạch toán lợi nhuận ca khám | Autocomplete tìm kiếm nhanh, Pre-fill liều dùng mặc định, Cảnh báo dị ứng bệnh nhân |
