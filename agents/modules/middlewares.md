# Kiến trúc Tầng Middleware & Validation (Middlewares Architecture)

Hệ thống kết hợp 2 lớp bảo vệ độc lập và tinh gọn: **Kiểm tra định dạng dữ liệu (Payload Validation qua DTOs)** và **Xác thực & Phân quyền (Security & RBAC Guards qua Middlewares)**.

---

## 1. Cơ chế Kiểm tra Payload (`validate(dtoSchema)`)

### Nguyên tắc thiết kế:
* **Tầng DTOs (`src/dtos/`):** Nơi duy nhất định nghĩa các Joi Schemas cho Request payload (ví dụ `departmentLoginRequestSchema`, `departmentRefreshTokenRequestSchema` trong `src/dtos/auth/authDepartmentDto.js` hay `clientRegisterRequestSchema` trong `src/dtos/auth/authClientDto.js`).
* **Hàm Factory `validate(schema)` (`src/common/validateMiddleware.js`):** Hàm middleware dùng chung toàn dự án để validate payload đầu vào.
* **Gắn trực tiếp tại Route (`src/routes/`):** Tầng Route import trực tiếp `validate` từ `common` và schema từ `dtos`, gọi trực tiếp không qua file bọc trung gian:
  ```javascript
  import { validate } from '../../common/validateMiddleware.js';
  import {
    departmentLoginRequestSchema,
    departmentRefreshTokenRequestSchema,
  } from '../../dtos/auth/authDepartmentDto.js';

  // Gắn trực tiếp:
  router.post('/login', validate(departmentLoginRequestSchema), login);
  router.post('/refresh', validate(departmentRefreshTokenRequestSchema), refreshToken);
  ```

### Cơ chế hoạt động của `validate(schema)`:
* Tự động validate `req.body`, `req.query`, hoặc `req.params`.
* Áp dụng cấu hình chuẩn: `{ abortEarly: false, stripUnknown: true }` (tự động loại bỏ các trường rác không khai báo).
* Nếu có lỗi: Ngắt luồng ngay lập tức và ném `ApiError(400, 'Dữ liệu đầu vào không hợp lệ', msgs)`.
* Nếu hợp lệ: Gán dữ liệu sạch `req[source] = value` và chuyển sang controller bằng `next()`.

---

## 2. Middleware Xác thực & Phân quyền (Auth & RBAC Guards)

Được đặt tập trung tại `src/middlewares/auth/authGuard.js`:

### A. `verifyToken` (Xác thực Access Token linh hoạt)
* **Tách token thông minh (Tolerant Token Parsing):**
  * Hỗ trợ chuẩn HTTP RFC: `Authorization: Bearer <token>`.
  * Hỗ trợ khi lỡ dính liền chuỗi: `Authorization: Bearer<token>`.
  * Hỗ trợ khi Client chỉ gửi mỗi chuỗi JWT thuần: `Authorization: <token>`.
* **Cơ chế Type Guard (Chống lỗi TS2339 trong `checkJs: true`):**
  * Hàm `jwt.verify()` trả về kiểu `string | JwtPayload`. 
  * Áp dụng kiểm tra:
    ```javascript
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded === 'string') {
      return next(new ApiError(401, 'Access Token khong hop le hoac da bi chinh sua.'));
    }
    req.user = decoded;
    ```
  * Vừa ngăn chặn lỗi crash ở runtime khi payload là primitive string, vừa giúp TypeScript tự động thu hẹp kiểu dữ liệu về `JwtPayload` mà không cần ép kiểu giả.
* Gán payload đã giải mã vào `req.user = decoded` (gồm 3 trường định danh cốt lõi: `userId`, `profileId`, `role` chuẩn 100% camelCase).

### B. `restrictToRoles(...roles)` (Phân quyền RBAC Tinh gọn theo `role`)
* Kiểm tra phân quyền truy cập dựa trên duy nhất 1 trường **`role`** chuẩn hóa trong `req.user`:
  * `'ADMIN'`: Quản trị viên hệ thống.
  * `'BAC_SI'`: Nha sĩ điều trị.
  * `'LE_TAN'`: Nhân viên lễ tân & thu ngân.
  * `'BENH_NHAN'`: Bệnh nhân / khách hàng.
* So khớp trực tiếp `userRole` với danh sách quyền được cấp phép `roles`. Nếu không khớp, ném `ApiError(403, 'Ban khong co quyen thuc hien hanh dong nay!')`.

---

## 3. Tầng Xử lý Lỗi Tập trung (Centralized Error Handling)

Được đặt tại `src/common/errorMiddleware.js`:
* **`ApiError`:** Class kế thừa từ `Error`, chứa `statusCode`, `message`, `errors` mảng chi tiết.
* **`asyncHandler`:** Wrapper bọc ngoài các Async Controller, tự động bắt lỗi bất đồng bộ và chuyển tiếp cho `next(err)`, loại bỏ hoàn toàn các khối `try-catch` lặp lại.
* **`errorHandler`:** Middleware bắt lỗi cuối cùng trong `app.js`, định dạng response lỗi chuẩn:
  ```json
  {
    "success": false,
    "status": 401,
    "message": "Thông báo lỗi",
    "errors": []
  }
  ```