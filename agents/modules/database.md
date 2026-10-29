# CSDL 22 Bảng & Kiến trúc Quan hệ Prisma (Database & Prisma Relations)

Toàn bộ nghiệp vụ của hệ sinh thái Nha khoa được xây dựng trên 22 bảng CSDL PostgreSQL, chia làm **7 cấp độ phân cấp (Level 0 đến Level 6)**, khởi tạo bằng file `00_init.sql` (chứa extensions & trigger function cập nhật `updated_at`).

Toàn bộ schema được lưu trữ trong thư mục `migration_schemas/` và được thực thi tự động qua script [`scripts/migrate_schema.js`](file:///d:/DentalClinicApp/scripts/migrate_schema.js).

---

## 1. Phân cấp 22 Bảng (Hierarchy Levels 0 – 6)

* **Level 0 (Bảng gốc độc lập, không phụ thuộc):**
  1. `tai_khoan`: Quản lý định danh tài khoản, mật khẩu băm bcrypt, `refresh_token_hash`, phân loại vai trò.
  2. `dich_vu`: Danh mục dịch vụ nha khoa cha.
  3. `san_pham`: Danh mục thuốc, vật tư tiêu hao, dụng cụ tồn kho.
  4. `phac_do_mau`: Mẫu phác đồ điều trị chuẩn để tái sử dụng.
  5. `khuyen_mai`: Chương trình giảm giá, voucher khuyến mãi.
  6. `phong_dieu_tri`: Danh sách phòng khám và ghế nha khoa.

* **Level 1 (Phụ thuộc Level 0):**
  7. `chi_tiet_dich_vu`: Các gói giá cụ thể của dịch vụ cha (FK `dich_vu_id`).
  8. `benh_nhan`: Thông tin y bạ, hành chính của bệnh nhân (FK `tai_khoan_id`).
  9. `nha_si`: Hồ sơ bác sĩ, số CCHN, chuyên khoa (FK `tai_khoan_id`).
  10. `nhan_vien`: Hồ sơ lễ tân, thu ngân (FK `tai_khoan_id`).
  11. `giai_doan_phac_do_mau`: Các bước mẫu trong phác đồ điều trị mẫu (FK `phac_do_mau_id`).
  12. `audit_log`: Truy vết lịch sử thêm/sửa/xóa hệ thống (FK `tai_khoan_id`).

* **Level 2 (Phụ thuộc Level 1):**
  13. `ca_lam_viec`: Phân ca trực bác sĩ theo phòng điều trị và ngày giờ (FK `nha_si_id`, `phong_id`).
  14. `phac_do_dieu_tri`: Hợp đồng phác đồ điều trị dài hạn của bệnh nhân (FK `benh_nhan_id`, `nha_si_id`).
  15. `lich_hen`: Cuộc hẹn khám của bệnh nhân theo ca trực bác sĩ (FK `benh_nhan_id`, `ca_lam_viec_id`).

* **Level 3 (Phụ thuộc Level 2):**
  16. `ho_so_benh_an`: Hồ sơ khám lâm sàng sinh ra khi check-in lịch hẹn (FK `lich_hen_id`, `benh_nhan_id`).
  17. `hoa_don`: Hóa đơn viện phí phát sinh từ cuộc hẹn/phác đồ (FK `benh_nhan_id`, `nhan_vien_id`).

* **Level 4 (Phụ thuộc Level 3):**
  18. `giai_doan_phac_do`: Các bước thực tế của phác đồ đang điều trị (FK `phac_do_id`).

* **Level 5 (Phụ thuộc Level 3 & Level 4):**
  19. `dich_vu_dieu_tri`: Chi tiết dịch vụ bác sĩ thực hiện trong ca khám (FK `ho_so_id`, `chi_tiet_dich_vu_id` - **lưu đơn giá snapshot**).
  20. `don_thuoc`: Phiếu đơn thuốc do bác sĩ kê (FK `ho_so_id`, `nha_si_id`).
  21. `vat_tu_su_dung`: Vật tư tiêu hao trong ca khám (FK `ho_so_id`, `san_pham_id` - **lưu đơn giá snapshot, trừ kho**).

* **Level 6 (Phụ thuộc Level 5):**
  22. `chi_tiet_don_thuoc`: Danh sách từng loại thuốc và liều dùng trong đơn (FK `don_thuoc_id`, `san_pham_id`).

---

## 2. Bản đồ Tham chiếu Khóa ngoại (Foreign Key Architecture)

Rất nhiều bảng nghiệp vụ liên kết với nhân sự phòng khám, các Agent cần phân biệt chính xác:
* **Bảng liên kết với `tai_khoan.id` (`tai_khoan_id`):** 
  * `nha_si`, `nhan_vien`, `benh_nhan`, `audit_log`.
* **Bảng liên kết với `nha_si.id` (`nha_si_id` - profileId của bác sĩ):** 
  * `ca_lam_viec`, `phac_do_dieu_tri`, `don_thuoc`.
* **Bảng liên kết với `nhan_vien.id` (`nhan_vien_id` - profileId của lễ tân/thu ngân):** 
  * `hoa_don` (nhân viên lập hóa đơn).
* **Bảng liên kết với `benh_nhan.id` (`benh_nhan_id`):** 
  * `phac_do_dieu_tri`, `lich_hen`, `ho_so_benh_an`, `hoa_don`.

---

## 3. Quy chuẩn Tầng Repository

* **Nguyên tắc:** Mỗi Repository chịu trách nhiệm viết câu lệnh SQL cho một thực thể hoặc một nhóm bảng liên quan.
* **Chống SQL Injection:** Luôn sử dụng câu truy vấn có tham số hóa `$1, $2, $3` qua `pool.query(query, params)`. Tuyệt đối không cộng chuỗi SQL.
* **Snapshot Giá:** Khi insert vào `dich_vu_dieu_tri` và `vat_tu_su_dung`, bắt buộc lấy giá niêm yết hiện tại để lưu vào trường `don_gia` của bản ghi đó.
* **Quy ước Naming:** CSDL luôn dùng `snake_case` (`tai_khoan_id`, `ma_nha_si`, `ho_ten`). Khi SELECT thì alias rõ ràng (`tk.id AS tai_khoan_id`, `ns.id AS nha_si_id`) để Model chuyển đổi sang `camelCase`.