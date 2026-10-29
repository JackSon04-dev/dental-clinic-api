# 🦷 Dental Clinic Management RESTful API

Hệ thống Backend API quản lý và vận hành phòng khám Nha khoa toàn diện, được xây dựng theo kiến trúc **Clean Service-Centric Architecture**, sử dụng **Node.js, Express, Prisma ORM, PostgreSQL 16** và được đóng gói hoàn chỉnh bằng **Docker & Docker Compose**.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

- **Ngôn ngữ & Nền tảng:** JavaScript (Node.js v20+ ESM)
- **Framework Web:** Express.js
- **ORM / Database Client:** Prisma ORM v5.22.0
- **Cơ sở dữ liệu:** PostgreSQL 16 (22 bảng chuẩn hóa 3NF, phân cấp quan hệ 7 tầng từ Level 0 – Level 6)
- **Xác thực & Bảo mật:** JWT (Access Token & Refresh Token Rotation), bcryptjs
- **Kiểm thực dữ liệu:** Joi Validation
- **Containerization:** Docker & Docker Compose

---

## 📋 Yêu cầu hệ thống (Prerequisites)

- **Khuyên dùng:** Đã cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Hỗ trợ chạy full môi trường chỉ với 1 câu lệnh).
- **Hoặc nếu chạy thủ công:**
  - Node.js version 20.x trở lên
  - PostgreSQL version 16 trở lên
  - npm version 9.x trở lên

---

## 🚀 Hướng dẫn khởi chạy

### Cách 1: Chạy toàn bộ hệ thống bằng Docker (Khuyên dùng)

Đây là cách nhanh nhất và đảm bảo môi trường đồng bộ 100% giữa các thành viên.

#### 1. Clone repository về máy
```bash
git clone <URL_REPO_CUA_BAN>
cd DentalClinicApp
```

#### 2. Khởi tạo file môi trường `.env`
Sao chép cấu hình từ file mẫu `.env.example`:
```bash
# Trên Windows PowerShell:
Copy-Item .env.example .env

# Trên Linux/macOS/Git Bash:
cp .env.example .env
```

#### 3. Khởi động Docker Containers
Chạy lệnh sau tại thư mục gốc của dự án:
```bash
docker compose up --build -d
```

> **Lưu ý:** Lệnh trên sẽ tự động hoàn toàn:
> 1. Kéo image `postgres:16`, tạo volume `dental_pgdata` và cấu hình tài khoản database.
> 2. Chờ Postgres sẵn sàng (`healthcheck`), sau đó build image Node.js 20 Alpine.
> 3. Tự động đồng bộ toàn bộ 22 bảng CSDL vào PostgreSQL (`npx prisma db push`) ngay khi container khởi động.
> 4. Tự động sinh mã Prisma Client (`npx prisma generate`).
> 5. Khởi chạy API với Nodemon (hỗ trợ live-reload khi sửa code trên máy host). Member **không cần** vào terminal gõ lệnh migration thủ công!

#### 4. Kiểm tra trạng thái hoạt động & Nạp dữ liệu mẫu (Mock Data)
```bash
docker compose ps
```
Nếu 2 container `dentaldb` và `dental_clinic_api` hiển thị trạng thái `Up` là thành công!

**Nạp dữ liệu mẫu để kiểm thử ngay:**
```bash
npm run db:seed
# hoặc: npx prisma db seed
```
> **Mật khẩu dùng chung cho tất cả tài khoản mẫu:** `Password123@`
> - **Admin:** `admin_system`
> - **Bác sĩ:** `bs_quang`, `bs_nam`, `bs_lan`, `bs_tuananh`, `bs_haidang`
> - **Lễ tân:** `letan_lan`, `letan_hoa`
> - **Bệnh nhân:** `bn_nguyenan`, `bn_lethibich`, `bn_trancuong`, `bn_hoangdung`

---

### Cách 2: Chạy trực tiếp trên máy cục bộ (Local Development)

Nếu bạn muốn chạy Node.js trực tiếp trên máy và chỉ mượn container Postgres:

#### 1. Cài đặt dependencies
```bash
npm install
```

#### 2. Khởi chạy riêng container Database PostgreSQL
```bash
docker compose up -d postgres
```
*(Hoặc bạn có thể dùng PostgreSQL đã cài trực tiếp trên máy của mình)*.

#### 3. Cấu hình file `.env`
Đảm bảo chuỗi kết nối `DATABASE_URL` trỏ về đúng máy host:
```env
PORT=5000
DATABASE_URL="postgresql://admin:password123@127.0.0.1:5432/DentalClinicDB?schema=public"
JWT_SECRET="your_jwt_secret_key"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_key"
```

#### 4. Sinh Prisma Client & Đồng bộ Schema
```bash
# Sinh mã Prisma Client cho Node.js:
npx prisma generate

# Đẩy cấu trúc schema vào database (nếu database mới tinh):
npx prisma db push
```

#### 5. Khởi động API Server
```bash
npm run dev
```

Server sẽ lắng nghe tại: `http://localhost:5000`

---

## 🌐 Các cổng kết nối & Dịch vụ (Ports & Services)

| Dịch vụ | URL / Địa chỉ | Thông tin đăng nhập / Ghi chú |
| :--- | :--- | :--- |
| **Backend REST API** | `http://localhost:5000` | Port `5000` |
| **Prisma Studio (GUI Database)** | `http://localhost:5555` | Giao diện trực quan xem/sửa toàn bộ 22 bảng CSDL |
| **PostgreSQL Database** | `localhost:5432` | **User:** `admin`<br>**Password:** `password123`<br>**Database:** `DentalClinicDB` |

---

## 🧭 Mở giao diện quản lý CSDL (Prisma Studio)

Hệ thống tích hợp sẵn Prisma Studio để xem dữ liệu bảng trực quan:

```bash
# Chạy Prisma Studio trên máy host:
npm run prisma:studio
```
Sau đó truy cập trình duyệt tại: `http://localhost:5555`

---

## 📂 Cấu trúc thư mục (Project Structure)

```text
DentalClinicApp/
├── agents/                   # Tài liệu kiến trúc chuẩn (Clean Architecture, Rules)
├── prisma/
│   └── schema.prisma         # Định nghĩa 22 models và quan hệ CSDL của hệ thống
├── src/
│   ├── app.js                # Khởi tạo Express app và đăng ký global middlewares
│   ├── common/               # Middleware validate Joi dùng chung
│   ├── config/
│   │   └── prisma.js         # Khởi tạo Prisma Client Singleton instance
│   ├── constants/            # Định nghĩa HttpStatusCode, Error Codes
│   ├── controllers/          # Nhận Request, gọi Service, trả Response chuẩn
│   ├── dtos/                 # Data Transfer Objects & Schemas xác thực dữ liệu đầu vào
│   ├── middlewares/          # AuthGuard, RBAC, Centralized Error Handling
│   ├── routes/               # Bộ định tuyến API
│   ├── services/             # Xử lý nghiệp vụ chính và thao tác Prisma ORM
│   └── utils/                # Token parser, ApiError, asyncHandler...
├── .env.example              # Mẫu biến môi trường
├── docker-compose.yml        # Điều phối các dịch vụ Docker (PostgreSQL & Node API)
├── Dockerfile                # Cấu hình containerization cho Node.js API
└── package.json
```

---

## 🔑 Kiểm tra API mẫu (Authentication Flow)

### 1. Đăng nhập nhân sự phòng khám (Lễ tân / Nha sĩ / Quản lý)
- **Endpoint:** `POST /api/v1/auth/department/login`
- **Body (JSON):**
```json
{
  "username": "letan01",
  "password": "Password123@"
}
```
- **Response thành công (200):**
```json
{
  "success": true,
  "status": 200,
  "message": "Dang nhap thanh cong",
  "data": {
    "user": {
      "userId": "uuid-tai-khoan",
      "profileId": "uuid-nhan-vien",
      "username": "letan01",
      "role": "nhan_vien",
      "position": "le_tan",
      "workStatus": "dang_lam_viec"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
}
```

### 2. Lấy thông tin cá nhân hiện tại
- **Endpoint:** `GET /api/v1/auth/department/me`
- **Header:** `Authorization: Bearer <accessToken>`

### 3. Làm mới Access Token
- **Endpoint:** `POST /api/v1/auth/department/refresh`
- **Body (JSON):**
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

### 4. Đăng xuất
- **Endpoint:** `POST /api/v1/auth/department/logout`
- **Header:** `Authorization: Bearer <accessToken>`

---

### 5. Luồng xác thực Khách hàng / Bệnh nhân (`/api/v1/auth/client`)

#### Bước 1: Gửi form Đăng ký (Nhận OTP qua Email)
- **Endpoint:** `POST /api/v1/auth/client/register`
- **Body (JSON):**
```json
{
  "fullName": "Nguyễn Văn Bệnh Nhân",
  "email": "patient@example.com",
  "phone": "0987654321",
  "password": "Password123@",
  "confirmPassword": "Password123@",
  "dateOfBirth": "1995-10-20",
  "gender": "nam",
  "address": "123 Đường Nguyễn Huệ, Q1, TP.HCM"
}
```

#### Bước 2: Nhập mã OTP xác thực (Hoàn tất tạo tài khoản & Hồ sơ bệnh nhân)
- **Endpoint:** `POST /api/v1/auth/client/verify-registration`
- **Body (JSON):**
```json
{
  "email": "patient@example.com",
  "otp": "123456"
}
```

#### Đăng nhập Bệnh nhân (Email hoặc Số điện thoại)
- **Endpoint:** `POST /api/v1/auth/client/login`
- **Body (JSON):**
```json
{
  "identifier": "patient@example.com",
  "password": "Password123@"
}
```

#### Quên mật khẩu & Đặt lại mật khẩu
- **Gửi OTP quên mật khẩu:** `POST /api/v1/auth/client/forgot-password` (`{ "email": "patient@example.com" }`)
- **Đặt lại mật khẩu mới:** `POST /api/v1/auth/client/reset-password` (`{ "email": "patient@example.com", "otp": "123456", "newPassword": "NewPassword123@", "confirmPassword": "NewPassword123@" }`)

---

## 📜 Các lệnh thông dụng (Useful Scripts)

```bash
# Chạy API server ở chế độ dev (Nodemon)
npm run dev

# Mở Prisma Studio để xem dữ liệu CSDL
npm run prisma:studio

# Tái sinh Prisma Client sau khi cập nhật schema.prisma
npm run prisma:generate

# Tắt toàn bộ Docker containers
docker compose down

# Tắt Docker containers và xóa sạch volume dữ liệu (khởi động lại từ đầu)
docker compose down -v
```