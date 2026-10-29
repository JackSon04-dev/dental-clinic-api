# Phân hệ 4 Vai trò Người dùng (Roles & RBAC)

Hệ thống phân chia logic nghiệp vụ theo 4 vai trò rõ ràng, tổ chức đồng bộ trên toàn bộ các tầng thư mục (`routes/`, `controllers/`, `services/`, `dtos/`):

* **Nhánh Phòng ban nội bộ (`departments/`):** `dentists/`, `receptionists/`, `admins/`.
* **Nhánh Bệnh nhân / Khách hàng (`clients/`):** Phục vụ Mobile App đặt lịch và tra cứu hồ sơ.

---

## 1. Vai trò Nha sĩ (`dentist`) — `BAC_SI`

* **Mã định danh (Code):** `NS001`, `NS002`... (bảng `nha_si.ma_nha_si`).
* **Định danh hệ thống:** `role: 'BAC_SI'`.
* **Cấu trúc thư mục:**
  * Route: `src/routes/departments/dentists/`
  * Controller: `src/controllers/departments/dentists/`
  * DTO: `src/dtos/departments/dentists/`
  * Service: `src/services/departments/dentists/` (truy vấn trực tiếp qua `prisma`)
* **Quyền hạn & Nghiệp vụ cốt lõi:**
  * Xem lịch trực cá nhân (`ca_lam_viec`) và danh sách bệnh nhân trong ca.
  * Tiếp nhận bệnh nhân từ hàng đợi vào phòng điều trị.
  * Khám, chẩn đoán và ghi nhận hồ sơ bệnh án (`ho_so_benh_an`).
  * Chỉ định dịch vụ nha khoa thực hiện (`dich_vu_dieu_tri` - snapshot đơn giá).
  * Chỉ định vật tư y tế tiêu hao (`vat_tu_su_dung` - snapshot đơn giá, trừ kho).
  * Thiết lập phác đồ điều trị dài hạn & các giai đoạn (`phac_do_dieu_tri`, `giai_doan_phac_do`).
  * Kê đơn thuốc điện tử (`don_thuoc`, `chi_tiet_don_thuoc`).

---

## 2. Vai trò Lễ tân & Thu ngân (`receptionist`) — `LE_TAN`

* **Mã định danh (Code):** `NV001`, `NV002`... (bảng `nhan_vien.ma_nhan_vien`).
* **Định danh hệ thống:** `role: 'LE_TAN'`.
* **Cấu trúc thư mục:**
  * Route: `src/routes/departments/receptionists/`
  * Controller: `src/controllers/departments/receptionists/`
  * DTO: `src/dtos/departments/receptionists/`
  * Service: `src/services/departments/receptionists/` (truy vấn trực tiếp qua `prisma`)
* **Quyền hạn & Nghiệp vụ cốt lõi:**
  * Tiếp đón bệnh nhân đến khám trực tiếp (Walk-in) hoặc qua lịch hẹn online.
  * Xác nhận lịch hẹn (`da_xac_nhan`) và thực hiện Check-in (`dang_kham`), tự động khởi tạo hồ sơ bệnh án rỗng chờ Bác sĩ tiếp nhận.
  * Xếp lịch hẹn mới, kiểm tra xung đột trùng ca trực bác sĩ và ghế/phòng khám (`phong_dieu_tri`).
  * Quản lý thông tin hành chính của bệnh nhân (`benh_nhan`).
  * Lập hóa đơn điều trị (`hoa_don`) dựa trên các chỉ định dịch vụ của Bác sĩ.
  * Áp dụng mã giảm giá (`khuyen_mai`), xác nhận thanh toán đứt điểm 100% (`tien_mat` / `chuyen_khoan`).

---

## 3. Vai trò Quản trị viên (`admin`) — `ADMIN`

* **Mã định danh (Code):** `ADMIN-01`... (khởi tạo từ bảng `tai_khoan.username`).
* **Định danh hệ thống:** `role: 'ADMIN'`.
* **Cấu trúc thư mục:**
  * Route: `src/routes/departments/admins/`
  * Controller: `src/controllers/departments/admins/`
  * DTO: `src/dtos/departments/admins/`
  * Service: `src/services/departments/admins/` (truy vấn trực tiếp qua `prisma`)
* **Quyền hạn & Nghiệp vụ cốt lõi:**
  * Quản lý tài khoản toàn bộ nhân sự (tạo mới, khóa/mở khóa tài khoản `tai_khoan`).
  * Phân công ca làm việc (`ca_lam_viec`) cho bác sĩ theo phòng điều trị và ngày giờ.
  * Quản lý danh mục dịch vụ nha khoa (`dich_vu`) và bảng giá chi tiết (`chi_tiet_dich_vu`).
  * Quản lý kho dược và vật tư y tế (`san_pham`), nhập kho, điều chỉnh số lượng tồn kho.
  * Xem báo cáo doanh thu tài chính tổng hợp và truy vết lịch sử thao tác qua `audit_log`.

---

## 4. Vai trò Bệnh nhân (`patient`) — `BENH_NHAN`

* **Mã định danh (Code):** `BN001`, `BN002`... (bảng `benh_nhan.ma_benh_nhan`).
* **Định danh hệ thống:** `role: 'BENH_NHAN'`.
* **Cấu trúc thư mục:**
  * Route: `src/routes/clients/`
  * Controller: `src/controllers/clients/`
  * DTO: `src/dtos/clients/`
  * Service: `src/services/clients/` (truy vấn trực tiếp qua `prisma`)
* **Quyền hạn & Nghiệp vụ cốt lõi:**
  * Đăng ký tài khoản và cập nhật thông tin cá nhân, tiền sử bệnh án, dị ứng thuốc.
  * Đặt lịch hẹn khám online qua App Mobile.
  * Hủy hoặc đổi lịch hẹn (chỉ được hủy trước giờ hẹn tối thiểu 2 giờ).
  * Xem hồ sơ bệnh án, lịch sử các lần khám và đơn thuốc điện tử của chính mình.
  * Xem chi tiết hóa đơn, biên lai thanh toán và tiến độ thanh toán của phác đồ điều trị.