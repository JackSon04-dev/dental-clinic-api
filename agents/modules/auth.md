# Module Xác thực & Phân quyền (Auth Module)

Module Auth quản lý việc đăng nhập, cấp phát JWT token, và nhận diện thông tin người dùng được phân tách rõ rệt thành 2 cổng API riêng biệt: **`authDepartment`** (nhân sự phòng khám) và **`authClient`** (bệnh nhân/khách hàng), được tổ chức tinh gọn theo Clean Architecture kết hợp Repository Pattern cho PostgreSQL.

---

## 1. Cấu trúc Route & Controller Phân hệ Phòng ban (`authDepartment`)

Cổng API: **`department`** (`src/routes/auth/authDepartment.js`)

| Phương thức | Endpoint | Middleware / Guard | Controller Handler | Mô tả chức năng |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/department/login` | `validate(departmentLoginRequestSchema)` | `login` | Đăng nhập tài khoản nhân sự phòng khám |
| `POST` | `/api/v1/auth/department/logout` | `verifyToken` | `logout` | Đăng xuất, hủy refresh token trên DB |
| `POST` | `/api/v1/auth/department/refresh` | `validate(departmentRefreshTokenRequestSchema)` | `refreshToken` | Cấp lại Access Token mới & Token Rotation |
| `GET` | `/api/v1/auth/department/me` | `verifyToken` | `getMe` | Lấy thông tin tài khoản người dùng hiện tại |

---

## 2. Chi tiết Triển khai các Tầng

### 1. DTOs & Schemas
* **`src/dtos/auth/authDepartmentDto.js` (Phân hệ Phòng ban):**
  * `departmentLoginRequestSchema`: Kiểm tra bắt buộc `username`, `password`.
  * `departmentRefreshTokenRequestSchema`: Kiểm tra bắt buộc `refreshToken`.
  * `departmentUserProfileResponseSchema(user)`: Format thông tin hồ sơ trả về cho Client.
  * `departmentAuthResponseSchema(user, accessToken, refreshToken)`: Format payload xác thực chuẩn (`accessToken`, `refreshToken`, `tokenType: 'Bearer'`, `user`).
* **`src/dtos/auth/authClientDto.js` (Phân hệ Bệnh nhân):**
  * `clientRegisterRequestSchema`: Kiểm tra `fullName`, `email`, `phone`, `password`, `confirmPassword`, `dateOfBirth`, `gender`, `address`.
  * `clientVerifyRegistrationRequestSchema`: Kiểm tra `email`, `otp` (6 chữ số).
  * `clientResendOtpRequestSchema`: Kiểm tra `email`, `type` (`register` hoặc `forgot_password`).
  * `clientLoginRequestSchema`: Kiểm tra `identifier` (email hoặc phone), `password`.
  * `clientForgotPasswordRequestSchema`: Kiểm tra `email`.
  * `clientResetPasswordRequestSchema`: Kiểm tra `email`, `otp`, `newPassword`, `confirmPassword`.
  * `clientRefreshTokenRequestSchema`: Kiểm tra `refreshToken`.
  * `clientProfileResponseSchema(user)`: Format thông tin khung UI Shell cho Bệnh nhân (`id`, `profileId`, `patientCode`, `fullName`, `role: 'BENH_NHAN'`, `roleTitle: 'Bệnh nhân'`, `email`, `phone`, `avatarUrl`).
  * `clientAuthResponseSchema(user, accessToken, refreshToken)`: Format payload xác thực bệnh nhân (`accessToken`, `refreshToken`, `tokenType: 'Bearer'`, `user`).

### 2. Middleware & Guards (`src/common/validateMiddleware.js` & `src/middlewares/auth/authGuard.js`)
* `validate(schema)`: Generic middleware gắn trực tiếp tại Route để validate DTOs (`departmentLoginRequestSchema`, `departmentRefreshTokenRequestSchema`, `clientRegisterRequestSchema`, v.v.).
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

### 4. Service (`src/services/auth/authDepartment.js` & `src/services/auth/authClient.js`)
* Sử dụng tiện ích tập trung tại `src/utils/jwt.js` (`generateAccessToken`, `generateRefreshToken`, `verifyRefreshToken`).
* `generateAccessToken(user, profile)`: Cấp token 1h chứa 3 trường định danh `{ userId, profileId, role }` (100% camelCase).
* `generateRefreshToken(user, profile)`: Cấp token 7d chứa `{ userId, profileId, role }`.
* `checkPassword(plainPassword, hashedPassword)`: So khớp mật khẩu với `bcrypt.compare`.
* `login(loginData)`: Kiểm tra tài khoản, kiểm tra khóa (`trangThai === 'bi_khoa'`), kiểm tra nghỉ việc (`workStatus === 'nghi_viec'`), băm lưu `refreshTokenHash` qua Prisma.
* `refreshAccessToken(rawRefreshToken)`: Giải mã token qua `verifyRefreshToken`, kiểm tra khớp hash với DB, thực hiện token rotation.
* `logout(userId)`: Xóa `refreshTokenHash = null` qua Prisma.
* `getMe(userId)`: Lấy thông tin tài khoản qua DTO response schema.

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
* **Tầng Prisma ORM (`prisma/schema.prisma`):** Đóng vai trò ranh giới duy nhất tự động ánh xạ từ `snake_case` sang `camelCase` (qua thuộc tính `@map`).
* **Tầng Ứng dụng & API (Service, Controller, DTO, JWT Token, Client JSON):** Sử dụng 100% `camelCase` (`userId`, `profileId`, `role`).

---

## 4. Cấu trúc Route & Controller Phân hệ Bệnh nhân (`authClient`)

Cổng API: **`client`** (`src/routes/auth/authClient.js`) - Quản lý đăng ký, xác thực OTP email, khôi phục mật khẩu và đăng nhập cho bệnh nhân.

| Phương thức | Endpoint | Middleware / Guard | Controller Handler | Mô tả chức năng |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/client/register` | `validate(clientRegisterRequestSchema)` | `register` | Bước 1: Gửi thông tin (email, phone, password...), gửi mã OTP 6 số về email |
| `POST` | `/api/v1/auth/client/verify-registration` | `validate(clientVerifyRegistrationRequestSchema)` | `verifyRegistration` | Bước 2: Nhập OTP xác thực → Tạo `TaiKhoan` + `BenhNhan` trên CSDL |
| `POST` | `/api/v1/auth/client/resend-otp` | `validate(clientResendOtpRequestSchema)` | `resendOtp` | Gửi lại mã OTP mới nếu chưa nhận được hoặc hết hạn |
| `POST` | `/api/v1/auth/client/login` | `validate(clientLoginRequestSchema)` | `login` | Đăng nhập bệnh nhân bằng Email hoặc SĐT + Password |
| `POST` | `/api/v1/auth/client/forgot-password` | `validate(clientForgotPasswordRequestSchema)` | `forgotPassword` | Yêu cầu mã OTP khôi phục mật khẩu qua Email |
| `POST` | `/api/v1/auth/client/reset-password` | `validate(clientResetPasswordRequestSchema)` | `resetPassword` | Đặt lại mật khẩu mới bằng mã OTP xác thực |
| `POST` | `/api/v1/auth/client/refresh` | `validate(clientRefreshTokenRequestSchema)` | `refreshToken` | Cấp lại Access Token mới (Token Rotation) |
| `POST` | `/api/v1/auth/client/logout` | `verifyToken` | `logout` | Đăng xuất, hủy refresh token trên DB |
| `GET` | `/api/v1/auth/client/me` | `verifyToken` | `getMe` | Lấy hồ sơ cá nhân bệnh nhân hiện tại |

### Kỹ thuật cốt lõi:
1. **Two-Step Registration:** Dữ liệu đăng ký được giữ trong `OtpStore` (In-memory TTL 5 phút). Chỉ khi nhập đúng OTP mới ghi vào PostgreSQL bằng Prisma Transaction, chống rác database 100%.
2. **Dual-Identity:** Token chứa `userId` (ID tài khoản) và `profileId` (`benh_nhan.id`), tự động sinh mã bệnh nhân `BN-XXXXXX`.
3. **Nodemailer Fallback:** Tự động gửi email qua SMTP Gmail nếu có credentials, hoặc fallback in mã OTP ra Terminal/Console trong môi trường Development.

---

## 5. Nguyên tắc Tối thiểu hóa Payload Auth (Minimal UI Shell) & Phân định với Profile Module

### A. Phản hồi Auth Chỉ Chứa Khung Giao Diện (UI Shell Data)
Mọi endpoint thuộc phân hệ Auth (`/login`, `/register`, `/verify`, `/refresh`, `/me`) ở cả 2 nhánh **Department** và **Client** chỉ trả về payload siêu nhẹ (< 1KB) để phục vụ dựng Header, Navbar, Sidebar, Avatar và phân quyền:
* **Department:** `id`, `profileId`, `code`, `username`, `fullName`, `role`, `roleTitle`, `email`, `phone`, `specialty`, `avatarUrl`.
* **Client:** `id`, `profileId`, `patientCode`, `fullName`, `role: 'BENH_NHAN'`, `roleTitle: 'Bệnh nhân'`, `email`, `phone`, `avatarUrl` (bỏ `username` do trùng lặp với `email`).

### B. Cơ chế Khôi phục Phiên qua `GET /me` (Session Hydration)
* Khi người dùng F5 hoặc mở lại App, Client không lưu mật khẩu nên không thể gọi lại `/login`.
* Client dùng `accessToken` còn lưu trong máy gọi `GET /me` để:
  1. Xác thực tính hợp lệ của tài khoản theo thời gian thực (nếu tài khoản bị khóa $\rightarrow$ văng 403).
  2. Nạp lại đúng đối tượng `user` khung UI vào State/Redux để render giao diện.
* Nếu `accessToken` hết hạn (401), Client dùng `refreshToken` gọi `POST /refresh` để nhận cặp token mới ngầm (Silent Refresh) mà không ngắt quãng phiên làm việc.

### C. Dữ liệu Chi tiết & Nhạy cảm Thuộc về Profile Module
* **Tuyệt đối KHÔNG** trả về các trường sau trong các API Auth:
  * Nhân sự: `diaChi`, `ngaySinh`, `gioiTinh`, `soGiayPhep` (chứng chỉ hành nghề y).
  * Bệnh nhân: `diaChi`, `ngaySinh`, `gioiTinh`, `tienSuBenh` (bệnh lý nền), `diUng` (dị ứng thuốc), `ghiChu`.
* Toàn bộ dữ liệu này được bảo vệ theo nguyên tắc *Least Privilege* và chỉ được tải khi người dùng chủ động truy cập màn hình Cài đặt hồ sơ cá nhân (`GET /api/v1/.../profile`).