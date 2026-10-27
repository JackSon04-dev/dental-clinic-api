# Cấu trúc Kiến trúc Codebase Tổng thể (ARCHITECTURE)

Tài liệu này mô tả chi tiết sơ đồ tổ chức thư mục và nguyên tắc đồng bộ cấu trúc theo mô hình **Prisma Service-Centric Clean Architecture** trên toàn bộ các tầng của `DentalClinicApp`.

---

## 1. Nguyên tắc Tổ chức Đồng bộ (Prisma Clean Architecture)

Hệ thống Backend được phân tầng rõ rệt, tận dụng sức mạnh của **Prisma ORM** để loại bỏ các tầng trung gian rườm rà (Repository & Model Mapper):
1. **`common/`**: Các middleware dùng chung toàn hệ thống (`errorMiddleware.js`, `validateMiddleware.js`).
2. **`config/`**: Kết nối cơ sở dữ liệu qua **Prisma Client Singleton** (`prisma.js`).
3. **`dtos/`**: Nơi tập trung định nghĩa Joi validation schemas cho Request, hàm trích xuất profile (`extractDepartmentProfile`) và formatters cho Response.
4. **`middlewares/`**: Lớp bảo vệ chuyên trách Security, Xác thực và Phân quyền RBAC Guards (`authGuard.js`).
5. **`controllers/`**: Tiếp nhận HTTP request, gọi Service và trả về JSON chuẩn (Thin Controllers).
6. **`routes/`**: Định tuyến URL, gắn trực tiếp `validate(dtoSchema)` và `verifyToken`.
7. **`services/`**: Xử lý logic nghiệp vụ cốt lõi, gọi trực tiếp `prisma` với cú pháp hướng đối tượng, mã hóa bcrypt, JWT tokens, kiểm tra trạng thái tài khoản/nhân sự.

*(Lưu ý: Tầng `repositories/` và `models/` thủ công đã được loại bỏ hoàn toàn vì `PrismaClient` đã đóng vai trò là Data Access Layer an toàn và tự sinh kiểu).*

**Cấu trúc thư mục tính năng phân tách rõ ràng:**
```text
<layer>/
├── auth/                       # Phân hệ Xác thực & Quản lý phiên làm việc
│   ├── authDepartment.js       # Nghiệp vụ xác thực cho nhân sự các phòng ban
│   └── authClient.js           # Nghiệp vụ xác thực cho khách hàng / bệnh nhân (App)
├── departments/                # Nghiệp vụ Nhân sự Nội bộ Phòng khám
│   ├── admins/                 # Nghiệp vụ Quản trị viên (quản lý nhân sự, dịch vụ, phân ca)
│   ├── dentists/               # Nghiệp vụ Bác sĩ Nha khoa (khám bệnh, sơ đồ răng, kê đơn)
│   └── receptionists/          # Nghiệp vụ Lễ tân & Thu ngân (tiếp đón, check-in, hóa đơn)
└── clients/                    # Nghiệp vụ dành riêng cho Bệnh nhân (App Mobile)
```

---

## 2. Cây thư mục Mã nguồn Chi tiết (`src/`)

```text
├── Dockerfile                                  # Containerize Node.js Express Server
├── docker-compose.yml                          # Điều phối Container (PostgreSQL + API Server)
│
├── prisma/
│   └── schema.prisma                           # Khai báo cấu trúc CSDL Prisma (Relations, @map)
│
├── migration_schemas/                          # 22 Bảng CSDL PostgreSQL (Level 0 - 6) tham chiếu
│
├── src/
│   ├── config/
│   │   └── prisma.js                           # Khởi tạo Prisma Client Singleton instance
│   │
│   ├── common/                                 # DÙNG CHUNG TOÀN HỆ THỐNG
│   │   ├── errorMiddleware.js                  # ApiError class, asyncHandler, errorHandler
│   │   └── validateMiddleware.js               # Generic validate(schema) middleware
│   │
│   ├── dtos/                                   # 1. ĐỊNH DẠNG DỮ LIỆU, JOI SCHEMAS & FORMATTERS
│   │   └── auth/
│   │       └── authDepartmentDto.js            # loginRequestSchema, extractDepartmentProfile, formatAuthResponse
│   │
│   ├── middlewares/                            # 2. BẢO VỆ XÁC THỰC & PHÂN QUYỀN RBAC GUARDS
│   │   └── auth/
│   │       └── authGuard.js                    # verifyToken (Access Token) & restrictToRoles (RBAC)
│   │
│   ├── controllers/                            # 3. ĐIỀU HƯỚNG HTTP (NAMED EXPORTS)
│   │   └── auth/
│   │       └── authDepartment.js               # login, logout, refreshToken, getMe
│   │
│   ├── routes/                                 # 4. KHAI BÁO ENDPOINTS (GẮN VALIDATE DTO TRỰC TIẾP)
│   │   └── auth/
│   │       └── authDepartment.js               # validate(loginRequestSchema), validate(refreshTokenRequestSchema)
│   │
│   ├── services/                               # 5. NGHIỆP VỤ CỐT LÕI (TRUY VẤN QUA PRISMA)
│   │   └── auth/
│   │       └── authDepartment.js               # Login, checkPassword, JWT, token rotation, logout, getMe
│   │
│   └── app.js                                  # Khởi chạy Express server, CORS, mount routes, 404 & errorHandler
```

---

## 3. Luồng đi chuẩn của Tính năng Auth Department (`authDepartment.js`)

1. **`Route`** (`routes/auth/authDepartment.js`):  
   Khai báo endpoint (ví dụ: `POST /login`), import `validate` từ `common/validateMiddleware.js` và `loginRequestSchema` từ `dtos/auth/authDepartmentDto.js`. Gắn trực tiếp `validate(loginRequestSchema)` vào route.
2. **`Validation & Security Guard`**:  
   - Payload Validation: `validate(loginRequestSchema)` dùng Joi kiểm tra `req.body`. Nếu lỗi $\rightarrow$ văng `ApiError(400)`. Nếu hợp lệ $\rightarrow$ gán dữ liệu sạch và gọi `next()`.
   - Security Guard: `verifyToken` kiểm tra Bearer token từ Header `authorization`, giải mã và gán `req.user = decoded`.
3. **`Controller`** (`controllers/auth/authDepartment.js`):  
   Nhận `req.body` đã chuẩn hóa, gọi `authDepartmentService.login(req.body)` và trả về mã HTTP 200 kèm JSON format chuẩn.
4. **`Service`** (`services/auth/authDepartment.js`):  
   - Gọi trực tiếp `prisma.taiKhoan.findUnique({ where: { username }, include: { nhaSi: true, nhanVien: true } })`.
   - Kiểm tra tài khoản có bị khóa không (`user.trangThai === 'bi_khoa'`).
   - Trích xuất profile bằng `extractDepartmentProfile(user)` và kiểm tra trạng thái làm việc (`profile.workStatus === 'nghi_viec'`).
   - Kiểm tra mật khẩu bằng `bcrypt.compare`.
   - Tạo `accessToken` và `refreshToken` (100% camelCase), băm lưu `refreshTokenHash` vào CSDL bằng `prisma.taiKhoan.update()`.
   - Format response bằng `formatAuthResponse(user, accessToken, refreshToken)`.