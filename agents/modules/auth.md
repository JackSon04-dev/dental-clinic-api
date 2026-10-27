# Module Xác thực & Phân quyền (Auth Module)

Module Auth quản lý việc đăng nhập, cấp phát JWT token, và nhận diện thông tin người dùng được phân tách rõ rệt thành 2 cổng API riêng biệt: **`authDepartment`** (nhân sự phòng khám) và **`authClient`** (bệnh nhân/khách hàng), được tổ chức tinh gọn theo Clean Architecture kết hợp Repository Pattern cho PostgreSQL.

---

## 1. Cấu trúc Route & Controller Phân hệ Phòng ban (`authDepartment`)

Cổng API: **`department`** (`src/routes/auth/authDepartment.js`)

| Phương thức | Endpoint | Middleware / Guard | Controller Handler | Mô tả chức năng |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/department/login` | `validate(loginRequestSchema)` | `login` | Đăng nhập tài khoản nhân sự phòng khám |
| `POST` | `/api/v1/auth/department/logout` | `verifyToken` | `logout` | Đăng xuất, hủy refresh token trên DB |
| `POST` | `/api/v1/auth/department/refresh` | `validate(refreshTokenRequestSchema)` | `refreshToken` | Cấp lại Access Token mới & Token Rotation |
| `GET` | `/api/v1/auth/department/me` | `verifyToken` | `getMe` | Lấy thông tin tài khoản người dùng hiện tại |

---

## 2. Chi tiết Triển khai các Tầng

### 1. DTOs & Schemas (`src/dtos/auth/authDepartmentDto.js`)
* `loginRequestSchema`: Kiểm tra bắt buộc `username`, `password`.
* `refreshTokenRequestSchema`: Kiểm tra bắt buộc `refreshToken`.
* `formatUserProfile(user)`: Format thông tin hồ sơ trả về cho Client.
* `formatAuthResponse(...)`: Format payload xác thực chuẩn (`accessToken`, `refreshToken`, `tokenType: 'Bearer'`, `expiresIn`, `user`).

### 2. Middleware & Guards (`src/common/validateMiddleware.js` & `src/middlewares/auth/authGuard.js`)
* `validate(schema)`: Generic middleware gắn trực tiếp tại Route để validate DTOs (`loginRequestSchema`, `refreshTokenRequestSchema`).
* `verifyToken`: 
  * Tách token linh hoạt (hỗ trợ cả chuẩn `Bearer <token>`, dính liền `Bearer<token>`, hoặc người dùng chỉ gửi mỗi chuỗi token thuần `eyJ...`).
  * Sử dụng **Type Guard** `if (!decoded || typeof decoded === 'string')` để đảm bảo an toàn runtime và tương thích 100% với trình kiểm tra TypeScript (`checkJs: true`).
  * Gán thông tin đã giải mã vào `req.user = decoded`.
* `restrictToRoles`: Kiểm tra phân quyền đa chiều theo `accountType`, `position`, `role`.

### 3. Controller (`src/controllers/auth/authDepartment.js`)
* Sử dụng Named Exports: `login`, `logout`, `refreshToken`, `getMe`.
* Bọc toàn bộ trong `asyncHandler` để bắt lỗi tự động.
* Truy xuất trực tiếp các trường dữ liệu định nghĩa sẵn, không dùng fallback `||`:
  * `userId`: `req.user.userId`.
  * `token`: `req.body.refreshToken`.

### 4. Service (`src/services/auth/authDepartment.js`)
* `generateAccessToken(user)`: Cấp token 1h chứa `userId`, `profileId`, `username`, `accountType`, `position`, `role` (100% camelCase).
* `generateRefreshToken(user)`: Cấp token 7d.
* `checkPassword(plainPassword, hashedPassword)`: So khớp mật khẩu với `bcrypt.compare`.
* `login(loginData)`: Kiểm tra tài khoản, kiểm tra khóa (`isBlocked`), kiểm tra nghỉ việc (`workStatus === 'nghi_viec'`), băm lưu `refresh_token_hash`.
* `refreshAccessToken(rawRefreshToken)`: Giải mã token, kiểm tra khớp hash với DB, thực hiện token rotation.
* `logout(userId)`: Xóa `refresh_token_hash = NULL`.
* `getMe(userId)`: Lấy thông tin chi tiết qua `DepartmentUser`.

### 5. Repository (`src/repositories/auth/authDepartment.js`)
* `findDepartmentUserByUsername(username)`: Query `tai_khoan` LEFT JOIN `nha_si` và `nhan_vien`.
* `findDepartmentUserById(taiKhoanId)`: Query theo UUID tài khoản.
* `updateRefreshToken(taiKhoanId, tokenHash)`: Lưu hash của refresh token (`UPDATE tai_khoan SET refresh_token_hash = $2 WHERE id = $1`).
* `clearRefreshToken(taiKhoanId)`: Thu hồi refresh token (`UPDATE tai_khoan SET refresh_token_hash = NULL WHERE id = $1`).

### 6. Model (`src/models/auth/departmentUser.js`)
* Đóng gói dữ liệu nhân sự thống nhất `DepartmentUser`:
  * `id`: UUID tài khoản (`tai_khoan_id`).
  * `profileId`: UUID hồ sơ nha sĩ (`nha_si_id`) hoặc nhân viên (`nhan_vien_id`).
  * `code`: Mã định danh (`ma_nha_si`, `ma_nhan_vien` hoặc `ADMIN-01`).
  * `username`, `fullName`, `phone`, `email`, `specialty`, `avatarUrl`, `position`.
  * `accountType`, `role`, `roleTitle`, `isBlocked`, `workStatus`.

---

## 3. Ngữ cảnh & Luồng Nghiệp vụ Cốt lõi (Core Flows & Context)

### A. Mô hình Định danh Kép (Dual-Identity: `id` vs `profileId`)
Trong hệ thống y tế nha khoa, nhân sự có 2 cấp độ danh tính:
1. **`id` (`tai_khoan.id`):** 
   * Đại diện cho tư cách tài khoản đăng nhập hệ thống.
   * Dùng cho: Xác thực danh tính (Auth), Cấp phát JWT token, Đổi mật khẩu, Quản lý phiên làm việc, Khóa tài khoản.
2. **`profileId` (`nha_si.id` hoặc `nhan_vien.id`):** 
   * Đại diện cho hồ sơ chuyên môn y tế.
   * Dùng làm Khóa ngoại (FK) khi liên kết với các bảng nghiệp vụ: Phân ca trực (`ca_lam_viec.nha_si_id`), Hồ sơ bệnh án (`ho_so_benh_an`), Phác đồ điều trị (`phac_do_dieu_tri.nha_si_id`), Đơn thuốc (`don_thuoc.nha_si_id`), Hóa đơn (`hoa_don.nhan_vien_id`).
   * *Lưu ý:* Admin hệ thống không có hồ sơ nha sĩ hay nhân viên nên `profileId = null`.

### B. Nguyên lý Đơn phiên & Vòng đời Token (Single Active Session Policy)
* **Lý do thiết kế:** Bác sĩ và Lễ tân làm việc theo ca trực trên các máy tính phòng khám. Hệ thống áp dụng chính sách **1 phiên hoạt động duy nhất** bằng cách lưu `refresh_token_hash` trực tiếp vào 1 cột trong bảng `tai_khoan`.
* **Cơ chế hoạt động:**
  * Mỗi lần gọi `login` hoặc `refreshAccessToken`, hash mới sẽ **ghi đè** hash cũ.
  * Phiên làm việc cũ lập tức bị vô hiệu hóa Refresh Token trên máy chủ $\rightarrow$ Tự động kick out máy cũ khi Access Token hết hạn 1h.
  * Không làm phình to CSDL (zero bloat, không cần bảng session phụ hay cron job dọn rác).
* **Token Rotation:** Mỗi lần cấp lại Access Token qua `/refresh`, hệ thống đồng thời hủy Refresh Token cũ và cấp cặp Access Token + Refresh Token hoàn toàn mới.
* **Đăng xuất an toàn (`logout`):** Cập nhật `refresh_token_hash = NULL`, khóa vĩnh viễn phiên làm việc đó.

### C. Ranh giới Chuyển đổi Dữ liệu (Boundary Data Transformation Pattern)
* **Tầng Database (Raw PostgreSQL):** Sử dụng `snake_case` (`tai_khoan_id`, `ma_nha_si`, `ho_ten`, `chuc_vu`).
* **Tầng Model (`departmentUser.js`):** Đóng vai trò ranh giới duy nhất ánh xạ từ `snake_case` sang `camelCase`.
* **Tầng Ứng dụng & API (Service, Controller, DTO, JWT Token, Client JSON):** Sử dụng 100% `camelCase` (`userId`, `profileId`, `username`, `accountType`, `position`, `role`).