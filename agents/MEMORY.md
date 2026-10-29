# MEMORY — Single Source of Truth dành cho AI Agents

> **File này là bộ nhớ bối cảnh (Context Memory) quan trọng nhất dành cho mọi AI Agent (Antigravity, Cursor, Copilot, Claude...) khi tham gia phát triển dự án `DentalClinicApp` (Backend).** Mọi Agent trước khi sinh mã hoặc tái cấu trúc BẮT BUỘC phải đọc và tuân thủ các nguyên tắc dưới đây.

---

## 1. Thông tin Dự án & Công nghệ

* **Tên dự án:** Dental Clinic Management System (Backend API Server).
* **Công nghệ cốt lõi:**
  * **Runtime:** Node.js (ES Modules, `"type": "module"`).
  * **Framework:** Express.js 4.x.
  * **Database & ORM:** PostgreSQL 16 (kết nối và truy vấn qua **Prisma ORM**, cấu hình tại `prisma/schema.prisma` và `src/config/prisma.js`).
  * **Validation:** Joi Schema tập trung trong `src/dtos/`, thực thi qua `validate(schema)` từ `src/common/validateMiddleware.js`.
  * **Bảo mật:** JWT (JSON Web Token), bcryptjs, CORS.
  * **Port:** Cấu hình qua `.env` (`PORT=5000` hoặc mặc định `3000`).

---

## 2. Quy tắc Kiến trúc "Bất di bất dịch" (Golden Rules)

### Quy tắc 1: Luồng xử lý tinh gọn chuẩn Prisma (Request-Response Flow)
Mọi request khi đi vào hệ thống PHẢI đi qua đúng thứ tự:
```
[Client Request]
       │
       ▼
1. [Route]               (src/routes/: Khai báo endpoint URL, gắn validate(dtoSchema) và verifyToken trực tiếp)
       │
       ▼
2. [Middleware & Guard]  (validate(dtoSchema) dùng Joi check payload; authGuard verifyToken & restrictToRoles)
       │
       ▼
3. [Controller]          (src/controllers/: Bọc trong asyncHandler, nhận clean payload, gọi Service, trả JSON)
       │
       ▼
4. [Service]             (src/services/: Xử lý logic nghiệp vụ, gọi trực tiếp prisma.taiKhoan... để truy vấn DB)
       │
       ▼
5. [DTO Formatter]       (src/dtos/: Bóc tách Dual-Identity và format JSON an toàn trước khi trả về Client)
       │
       ▼
6. [PostgreSQL DB]       (CSDL được quản lý qua Prisma ORM, kết nối qua src/config/prisma.js)
```

### Quy tắc 2: Quy chuẩn Validation Schemas (DTOs) & Middleware Guards
* **Tầng DTOs (`src/dtos/`):** Nơi duy nhất định nghĩa các Request Schemas và Response Schemas. Bắt buộc đặt tên theo quy chuẩn nhất quán:
  1. **Request Schemas (Dữ liệu đầu vào):**
     - Luôn có hậu tố **`RequestSchema`** (Ví dụ: `departmentLoginRequestSchema`, `clientRegisterRequestSchema`, `clientLoginRequestSchema`, `clientResetPasswordRequestSchema`).
     - Sử dụng thư viện **Joi** để kiểm duyệt `req.body` ngay tại cửa ngõ Route.
  2. **Response Schemas (Dữ liệu đầu ra):**
     - Luôn có hậu tố **`ResponseSchema`** (Ví dụ: `departmentAuthResponseSchema`, `departmentUserProfileResponseSchema`, `clientAuthResponseSchema`, `clientProfileResponseSchema`).
     - Đóng vai trò là data sanitizer & formatter trước khi Service trả dữ liệu về Controller/Client, loại bỏ các trường nhạy cảm (`passwordHash`, `refreshTokenHash`) và chuẩn hóa 100% `camelCase`.
  3. **Nguyên tắc Tối thiểu hóa Payload Auth (Minimal UI Shell Data Policy):**
     - Toàn bộ Response Schemas trong Auth (`departmentAuthResponseSchema`, `departmentUserProfileResponseSchema`, `clientAuthResponseSchema`, `clientProfileResponseSchema`) và API `GET /me` **CHỈ ĐƯỢC PHÉP TRẢ VỀ DỮ LIỆU KHUNG UI SHELL** để vẽ Header, Navbar, Sidebar, Avatar và phân quyền Role:
       - Department: `id`, `profileId`, `code`, `username`, `fullName`, `role`, `roleTitle`, `email`, `phone`, `specialty`, `avatarUrl`.
       - Client: `id`, `profileId`, `patientCode`, `fullName`, `role: 'BENH_NHAN'`, `roleTitle: 'Bệnh nhân'`, `email`, `phone`, `avatarUrl` (bỏ `username` do trùng lặp với `email`).
     - **TUYỆT ĐỐI KHÔNG** trả về các thông tin cá nhân/chuyên môn chi tiết (`dateOfBirth`, `gender`, `address`, `soGiayPhep`, `tienSuBenh`, `diUng`, `status`, `createdAt`...) trong các API Auth (`/login`, `/register`, `/verify`, `/refresh`, `/me`).
     - Toàn bộ thông tin cá nhân/y tế chi tiết trên **BẮT BUỘC thuộc về Module Profile chuyên biệt (`GET /api/v1/.../profile`)** khi người dùng chủ động truy cập màn hình Cài đặt hồ sơ cá nhân.
     - API `GET /me` trong Auth đóng vai trò là cơ chế **Khôi phục phiên (Session Hydration)** khi F5/mở lại app bằng Access Token; dữ liệu trả về của nó luôn đồng nhất 100% với `user` trong phản hồi Đăng nhập.
* **Tầng Generic Validation (`src/common/validateMiddleware.js`):** Xuất hàm factory `validate(schema)`.
* **Tầng Route (`src/routes/`):** Import trực tiếp `validate` từ `common` và schema từ `dtos`, gắn trực tiếp vào route:
  ```javascript
  router.post('/login', validate(departmentLoginRequestSchema), login);
  router.post('/refresh', validate(departmentRefreshTokenRequestSchema), refreshToken);
  ```
  *(KHÔNG tạo các file middleware trung gian thừa thãi chỉ để bọc lại `validate(schema)`).*
* **Tầng Middlewares (`src/middlewares/`):** Chuyên trách các Middleware bảo mật, xác thực phiên và phân quyền RBAC (ví dụ: `src/middlewares/auth/authGuard.js` với `verifyToken` và `restrictToRoles`).
* Tầng Service **KHÔNG** làm nhiệm vụ validate định dạng cơ bản, vì Middleware `validate(schema)` đã đảm bảo dữ liệu đầu vào là hợp lệ.

### Quy tắc 3: Định nghĩa rõ ràng & Không lạm dụng toán tử `||` (No Redundant Fallbacks)
* Toàn bộ field name của Database Schema, Model, DTO và Payload đã được định nghĩa minh bạch.
* **KHÔNG** viết các biến tham chiếu value theo kiểu fallback `||` (ví dụ: `req.user?.userId || req.user?.id` hoặc `req.body?.refreshToken || req.body?.token`).
* Luôn sử dụng đúng thuộc tính đã quy ước: `req.user.userId`, `req.body.refreshToken`, `raw.ma_nha_si`, `raw.ho_ten_nha_si`, `user.position`, v.v.

### Quy tắc 4: Chuẩn hóa 100% camelCase cho Tầng Ứng dụng & API
* **Database (PostgreSQL Raw):** Sử dụng `snake_case` (`tai_khoan_id`, `loai_tai_khoan`, `chuc_vu`, `ma_nha_si`...).
* **Ứng dụng & API (JWT Payload, DTO, Controller, Client JSON):** 100% sử dụng `camelCase` (`userId`, `profileId`, `role`, `patientCode`...).

### Quy tắc 5: Mô hình Định danh Kép (Dual-Identity: `id` vs `profileId`)
Nhân sự phòng khám có 2 cấp độ định danh cần phân biệt rạch ròi:
* **`id` (`tai_khoan.id`):** Dùng làm Root ID cho Authentication, Session, JWT Token, đổi mật khẩu, phân quyền.
* **`profileId` (`nha_si.id` / `nhan_vien.id` / `benh_nhan.id`):** Dùng làm Foreign Key khi tương tác với các bảng nghiệp vụ chuyên sâu (`ca_lam_viec`, `ho_so_benh_an`, `phac_do_dieu_tri`, `don_thuoc`, `hoa_don`).

### Quy tắc 6: Cơ chế Đơn phiên (Single Active Session) & Token Rotation
* Bảng `tai_khoan` có 1 cột duy nhất `refresh_token_hash`.
* Mỗi lần đăng nhập (`login`) hoặc cấp lại token (`refresh`), hash mới sẽ **ghi đè** hash cũ $\rightarrow$ phiên làm việc cũ tự động bị thu hồi quyền refresh (kick out), phù hợp với máy tính làm việc theo ca trực phòng khám.
* Cấp lại token tại `POST /refresh` luôn đi kèm **Token Rotation** (cấp cả access token mới và refresh token mới).
* Khi đăng xuất (`logout`), cập nhật `refresh_token_hash = NULL`.

### Quy tắc 7: Cấu trúc Module Auth với 2 Branches (Prisma Clean Architecture)
Module `auth` được chia tách độc lập thành 2 nhánh:
* **`authDepartment`**: Dành cho nhân sự các phòng ban nội bộ phòng khám (Nha sĩ, Lễ tân, Quản trị).
  * Route: `/api/v1/auth/department` (endpoints: `/login`, `/logout`, `/refresh`, `/me`).
  * Route file: `src/routes/auth/authDepartment.js`.
  * Controller: `src/controllers/auth/authDepartment.js`.
  * Middleware Guard: `src/middlewares/auth/authGuard.js` (phân quyền theo `role: 'BAC_SI' | 'LE_TAN' | 'ADMIN'`).
  * Service: `src/services/auth/authDepartment.js` (truy vấn trực tiếp qua `prisma.taiKhoan`).
  * DTO: `src/dtos/auth/authDepartmentDto.js`.
* **`authClient`**: Dành cho khách hàng/bệnh nhân sử dụng app di động.
  * Route file: `src/routes/auth/authClient.js`.
  * Controller: `src/controllers/auth/authClient.js`.
  * Service: `src/services/auth/authClient.js` (truy vấn trực tiếp qua `prisma.taiKhoan`, `prisma.benhNhan`).
  * DTO: `src/dtos/auth/authClientDto.js`.

### Quy tắc 8: Tách biệt Business Logic theo 4 Roles
Hệ thống phân định 4 vai trò rõ rệt với cấu trúc thư mục đồng bộ:
1. **`admin`**: Quản trị viên (`src/controllers/departments/admins/`, `src/routes/departments/admins/`...).
2. **`dentist`** (`BAC_SI`): Bác sĩ nha khoa (`src/controllers/departments/dentists/`, `src/routes/departments/dentists/`...).
3. **`receptionist`** (`LE_TAN`): Lễ tân & Thu ngân (`src/controllers/departments/receptionists/`, `src/routes/departments/receptionists/`...).
4. **`patient`** (`BENH_NHAN`): Bệnh nhân (`src/controllers/clients/`, `src/routes/clients/`...).

### Quy tắc 9: Bảo vệ CSDL 22 bảng & Snapshot giá
* Tuyệt đối không thay đổi schema mà không có migration. Toàn bộ 22 bảng được mô tả trong `prisma/schema.prisma`.
* Khi thanh toán hoặc chỉ định dịch vụ/vật tư, đơn giá phải được lưu cứng (Snapshot), không lấy theo giá hiện hành trong danh mục dịch vụ.

### Quy tắc 10: Nạp Dữ liệu mẫu Kiểm thử (Mock Data Seeding)
* Dữ liệu mẫu tổng hợp của 22 bảng (Level 0 – Level 6) được đặt tại `prisma/mock_data.sql` (với `password_hash` chuẩn hóa bcrypt cho mật khẩu `Password123@`).
* Script thực thi tự động, idempotent (tự động `TRUNCATE CASCADE` trước khi nạp) nằm tại `prisma/seed.js`.
* Thực thi qua lệnh: `npm run db:seed` hoặc `npx prisma db seed`.

---

## 3. Bản đồ Tài liệu Tham khảo trong `agents/`

| File tài liệu | Nội dung chi tiết |
| :--- | :--- |
| [`agents/ARCHITECTURE.md`](ARCHITECTURE.md) | Kiến trúc tổng thể toàn bộ thư mục và giải thích vai trò từng file. |
| [`agents/modules/auth.md`](modules/auth.md) | Chi tiết Module Auth: Phân nhánh `authDepartment` vs `authClient`, JWT, Token Rotation, Dual-Identity. |
| [`agents/modules/roles.md`](modules/roles.md) | Chi tiết phân hệ 4 Roles: Admin, Dentist, Receptionist, Patient theo cấu trúc `departments/` và `clients/`. |
| [`agents/modules/middlewares.md`](modules/middlewares.md) | Cơ chế `validate(dtoSchema)` trực tiếp tại Route, Tolerant Token Parsing và Security Guard (`authGuard.js`). |
| [`agents/modules/database.md`](modules/database.md) | Sơ đồ 22 bảng PostgreSQL, 7 cấp độ Level 0–6 và Bản đồ Khóa ngoại (FK Architecture). |
| [`agents/CHANGELOG.md`](CHANGELOG.md) | Lịch sử cập nhật dự án và roadmap các bước tiếp theo. |