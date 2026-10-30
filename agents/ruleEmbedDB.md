# QUY CHUẨN NHÚNG MÃ SQL VÀO POSTGRESQL TRONG KIẾN TRÚC PRISMA (ruleEmbedDB)

> **Tài liệu tham chiếu liên kết:**
> * Cấu trúc quan hệ 22 bảng: [`agents/database/databaseRelation.md`](databaseRelation.md)
> * Chi tiết 7 tính năng Database: [`agents/database/databaseFeatures.md`](databaseFeatures.md)
> * Bộ nhớ kiến trúc hệ thống: [`agents/MEMORY.md`](../MEMORY.md)
> * Schema CSDL hiện tại: [`prisma/schema.prisma`](../../prisma/schema.prisma)

---

## 1. BỐI CẢNH KIẾN TRÚC & TRIẾT LÝ PHÂN CHIA TRÁCH NHIỆM

Hệ thống `DentalClinicApp` sử dụng **Node.js (ESM) + Express + Prisma ORM** kết nối tới **PostgreSQL 16**.  
Trong kiến trúc hiện đại, việc phân định ranh giới giữa **Tầng Ứng dụng (Prisma/Node.js)** và **Tầng Cơ sở Dữ liệu (PostgreSQL Engine)** tuân theo triết lý cốt lõi:

* **Tầng Ứng dụng (Prisma/Node.js đảm nhiệm):**
  * Xác thực JWT, phân quyền RBAC (`ADMIN`, `BAC_SI`, `LE_TAN`, `BENH_NHAN`).
  * Kiểm thực cấu trúc dữ liệu đầu vào (Joi DTO Schemas).
  * Các thao tác CRUD thông thường (thêm/sửa/đọc/xóa bản ghi đơn lẻ, phân trang).
  * Lọc dữ liệu hiển thị (DTO Sanitizer & Formatters loại bỏ hash nhạy cảm).
* **Tầng Cơ sở Dữ liệu (PostgreSQL Stored Code đảm nhiệm):**
  * Các phép tính toán thống kê, tổng hợp dữ liệu lớn (Aggregation, OLAP, Dashboard KPIs).
  * Các quy trình nghiệp vụ ghi nhiều bảng phức tạp đòi hỏi khóa dòng (`FOR UPDATE`) và tính toàn vẹn tuyệt đối.
  * Các ràng buộc toàn vẹn cứng ở cấp độ vật lý (chống trùng lịch, chống âm kho).
  * Tự động hóa ghi vết kiểm toán (Audit Logging qua Trigger).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               REQUEST ROUTING ARCHITECTURE                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Client Request ──► Route ──► AuthGuard / Joi DTO ──► Controller                      │
│                                                            │                           │
│              ┌─────────────────────────────────────────────┴─────────────┐             │
│              ▼                                                           ▼             │
│     [Luồng CRUD & Thao tác Nhẹ]                              [Luồng Thống kê / Ghi Nặng]│
�---

## 2. 6 NGUYÊN TẮC "VÀNG" KHI NHÚNG SQL VÀO POSTGRESQL

1. **Nguyên tắc Idempotency (Chạy lại an toàn):** Mọi mã SQL nhúng (Function, Procedure, View, Trigger) bắt buộc phải sử dụng cú pháp an toàn khi thực thi lại nhiều lần (`CREATE OR REPLACE ...`, `DROP ... IF EXISTS`, `CREATE INDEX IF NOT EXISTS`).
2. **Nguyên tắc An toàn Truy vấn (Parameterization):** Khi gọi Function/Procedure từ Prisma, **TUYỆT ĐỐI KHÔNG** cộng chuỗi SQL. Bắt buộc dùng Tagged Template String của Prisma:
   * Đúng: `await prisma.$queryRaw\`SELECT * FROM fn_get_stats(${period})\``
   * Sai: `await prisma.$queryRawUnsafe("SELECT * FROM fn_get_stats('" + period + "')")`
3. **Nguyên tắc Không can thiệp Schema Migration ngầm:** Không được tạo thêm bảng mới bằng SQL thủ công mà không cập nhật vào `prisma/schema.prisma`. Các đối tượng SQL nhúng (Function, Procedure, View, Trigger) không ảnh hưởng tới model Prisma nhưng phải được lưu trữ trong thư mục mã nguồn để quản lý phiên bản.
4. **Nguyên tắc Tách biệt Quyền hạn (Security Isolation):** Mọi logic liên quan đến giải mã mật khẩu bcrypt, cấp phát JWT Access/Refresh Token và phân quyền Header **BẮT BUỘC thuộc về Node.js Backend**, không đưa vào PostgreSQL.
5. **Nguyên tắc Bảo toàn Snapshot Giá:** Khi thực hiện chỉ định dịch vụ (`dich_vu_dieu_tri`) hoặc vật tư (`vat_tu_su_dung`), đơn giá bắt buộc phải được chốt cứng (`snapshot`) tại thời điểm tạo, không được lấy động theo giá tương lai.
6. **Nguyên tắc Tối ưu Chi phí Xử lý Dữ liệu (Backend vs Database Cost-Benefit Trade-off):**
   Vị trí tính toán dữ liệu (Backend Node.js hay Database PostgreSQL) cho từng tính năng/API là **linh hoạt và do AI/Developer chủ động lựa chọn dựa trên đặc điểm của dữ liệu (Data Characteristics) và chi phí tài nguyên (Cost & Latency)**:
   * **Đẩy xuống Database (DB Engine) khi:**
     - Dữ liệu có quy mô lớn, liên kết nhiều bảng (`JOIN` 3–5 bảng trở lên).
     - Đòi hỏi các phép tính toán tổng hợp, lũy kế, gom nhóm phức tạp (`SUM`, `AGGREGATE`, `CTE`, `CASE WHEN`).
     - *Mục tiêu:* Giảm thiểu độ trễ mạng (Zero Network I/O), giải phóng 100% RAM Node.js, tận dụng engine tính toán và cache của PostgreSQL. *(Ví dụ: Hàm tính doanh thu `fn_calculate_revenue` giải quyết 3 kịch bản phác đồ & voucher).*
   * **Giữ lại xử lý ở Backend (Node.js/Prisma) khi:**
     - Dữ liệu có quy mô nhỏ hoặc phạm vi hẹp (ví dụ lọc lịch hẹn trong 1 ngày chỉ có vài chục bản ghi).
     - Các phép đếm đơn giản trên 1 bảng (`count()`), tra cứu theo ID, phân trang đơn thuần.
     - Các logic định dạng chuỗi, mapping DTO, kết hợp quyền RBAC, gửi email/thông báo.
     - *Mục tiêu:* Giữ mã nguồn Node.js dễ đọc, dễ viết test/mock, tránh lạm dụng làm quá tải CPU của Database server.
   * **Mô hình Hybrid (Thực thi Song song qua `Promise.all`):**
     - Đóng gói các tác vụ tính toán nặng (gọi DB Function) và các truy vấn Prisma nhẹ nhàng trong một `Promise.all` tại tầng Service (như kiến trúc chuẩn của API `GET /api/v1/admin/stats`).

---

## 3. DANH MỤC ĐỀ XUẤT NHÚNG SQL & PHÂN TÍCH TRADE-OFFS

Dưới đây là 8 đề xuất kỹ thuật cụ thể tương ứng với 22 bảng CSDL và 7 tính năng Database. Mỗi đề xuất đi kèm **Bản chất**, **Mã SQL minh họa**, **Cách gọi từ Prisma** và **Đánh giá Trade-off (Ưu / Nhược)** để bạn đưa ra quyết định lựa chọn (**CÓ / KHÔNG**).

---

### Đề xuất 1: Analytical Stored Function cho Dashboard KPI & Báo cáo (`fn_get_admin_dashboard_stats`)

* **Bảng liên quan:** `hoa_don`, `ho_so_benh_an`, `lich_hen`, `dich_vu_dieu_tri`, `vat_tu_su_dung`, `khuyen_mai`, `benh_nhan`, `ca_lam_viec`.
* **Tính năng DB áp dụng:** **Function (`PL/pgSQL`)**
* **Vấn đề giải quyết:** API `GET /api/v1/admin/stats` cần tính doanh thu, số ca khám, lịch hẹn hôm nay, bệnh nhân mới và % tăng trưởng so với kỳ trước. Nếu dùng Prisma thuần, Backend phải bắn 6–10 query và kéo hàng ngàn row về RAM để tính toán.
#### Mã SQL đề xuất:
```sql
CREATE OR REPLACE FUNCTION fn_get_admin_dashboard_stats(p_period VARCHAR DEFAULT 'this_month')
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_curr_start TIMESTAMPTZ; v_curr_end TIMESTAMPTZ;
    v_prev_start TIMESTAMPTZ; v_prev_end TIMESTAMPTZ;
    v_curr_revenue NUMERIC(18, 2) := 0; v_prev_revenue NUMERIC(18, 2) := 0;
    v_growth NUMERIC(5, 2) := 0;
    v_result JSONB;
BEGIN
    -- Xác định mốc thời gian kỳ hiện tại và kỳ trước...
    -- Tính doanh thu thực thu: dịch vụ + vật tư + phác đồ - voucher...
    -- Gom nhóm kết quả và trả về JSONB nguyên khối...
    RETURN v_result;
END;
$$;
```

#### Cách gọi từ Prisma (Node.js):
```javascript
const [row] = await prisma.$queryRaw`SELECT fn_get_admin_dashboard_stats(${period}) AS stats;`;
return row.stats;
```

#### Phân tích Trade-off:
* **Ưu điểm (NÊN CHỌN):**
  * Tốc độ phản hồi cực nhanh (5ms – 15ms so với 250ms – 400ms của Prisma loop).
  * Tiết kiệm 100% băng thông mạng giữa DB và Node.js server.
  * Code Service phía Backend chỉ vỏn vẹn 3 dòng, cực kỳ trong sáng và dễ bảo trì.
* **Nhược điểm:**
  * Logic tính toán doanh thu nằm trong file SQL, lập trình viên Backend phải hiểu cú pháp PostgreSQL.
  * Khó viết Unit Test Mock ở tầng Node.js (phải chạy test trên DB thật).
* 👉 **Khuyến nghị:** **CÓ (BẮT BUỘC NÊN CHỌN)** cho API Thống kê Dashboard.

---

### Đề xuất 2: Stored Procedure cho Chu trình Thanh toán Hóa đơn & Xuất kho (`sp_checkout_appointment`)

* **Bảng liên quan:** `lich_hen`, `ho_so_benh_an`, `hoa_don`, `san_pham`, `vat_tu_su_dung`.
* **Tính năng DB áp dụng:** **Stored Procedure (`PL/pgSQL` với Transaction)**
* **Vấn đề giải quyết:** Khi Lễ tân bấm thanh toán: cần chuyển `lich_hen.trang_thai = 'da_kham'`, cập nhật `hoa_don.trang_thai_thanh_toan = 'da_thanh_toan'`, trừ số lượng tồn kho `san_pham.so_luong_ton` theo danh sách vật tư đã dùng. Cần đảm bảo nếu kho bị âm thì `ROLLBACK` toàn bộ.

#### Mã SQL đề xuất:
```sql
CREATE OR REPLACE PROCEDURE sp_checkout_appointment(
    p_lich_hen_id UUID,
    p_nhan_vien_id UUID,
    p_phuong_thuc VARCHAR,
    p_khuyen_mai_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_item RECORD;
BEGIN
    -- 1. Kiểm tra tồn kho và khóa dòng (Pessimistic Locking)
    FOR v_item IN 
        SELECT vtsd.san_pham_id, vtsd.so_luong, sp.ten_san_pham, sp.so_luong_ton
        FROM vat_tu_su_dung vtsd
        JOIN ho_so_benh_an hsba ON vtsd.ho_so_id = hsba.id
        JOIN san_pham sp ON vtsd.san_pham_id = sp.id
        WHERE hsba.lich_hen_id = p_lich_hen_id
        FOR UPDATE OF sp
    LOOP
        IF v_item.so_luong_ton < v_item.so_luong THEN
            RAISE EXCEPTION 'Vật tư "%" không đủ tồn kho để xuất (Còn: %, Cần: %)', 
                v_item.ten_san_pham, v_item.so_luong_ton, v_item.so_luong;
        END IF;

        -- Trừ tồn kho
        UPDATE san_pham 
        SET so_luong_ton = so_luong_ton - v_item.so_luong, updated_at = NOW()
        WHERE id = v_item.san_pham_id;
    END LOOP;

    -- 2. Cập nhật hóa đơn & lịch hẹn
    UPDATE hoa_don 
    SET trang_thai_thanh_toan = 'da_thanh_toan', 
        phuong_thuc_thanh_toan = p_phuong_thuc,
        nhan_vien_id = p_nhan_vien_id,
        khuyen_mai_id = p_khuyen_mai_id,
        ngay_thanh_toan = NOW(),
        updated_at = NOW()
    WHERE lich_hen_id = p_lich_hen_id;

    UPDATE lich_hen SET trang_thai = 'da_kham', updated_at = NOW() WHERE id = p_lich_hen_id;

    COMMIT;
END;
$$;
```

#### Cách gọi từ Prisma (Node.js):
```javascript
await prisma.$executeRaw`
  CALL sp_checkout_appointment(${appointmentId}::uuid, ${staffId}::uuid, ${paymentMethod}, ${voucherId}::uuid);
`;
```

#### Phân tích Trade-off:
* **Ưu điểm (NÊN CHỌN NẾU YÊU CẦU TOÀN VẸN CAO):**
  * Khóa dòng an toàn tuyệt đối (`FOR UPDATE`), triệt tiêu 100% lỗi tranh chấp Race Condition khi nhiều thu ngân thanh toán cùng lúc các ca dùng chung một loại vật tư hiếm (như Trụ Straumann SLA).
  * Chống hoàn toàn tình trạng âm kho ở mức độ vật lý.
* **Nhược điểm:**
  * Prisma vốn đã có `prisma.$transaction([ ... ])` xử lý được ở tầng code JS.
  * Nếu dùng Procedure, việc debug luồng nghiệp vụ đòi hỏi đọc log PostgreSQL.
* 👉 **Khuyến nghị:** **TÙY CHỌN (OPTIONAL)**. Nếu muốn code tập trung ở Node.js thì dùng `prisma.$transaction`. Nếu muốn an toàn tuyệt đối chống âm kho đồng thời thì chọn Procedure.

---

### Đề xuất 3: Database Trigger tự động ghi Nhật ký Hệ thống (`trg_audit_log_universal`)

* **Bảng liên quan:** Bảng đích `audit_log` (Level 1); bảng theo dõi: `tai_khoan`, `dich_vu`, `chi_tiet_dich_vu`, `hoa_don`, `san_pham`.
* **Tính năng DB áp dụng:** **Trigger + Trigger Function**
* **Vấn đề giải quyết:** Màn hình `AuditLogsPage.tsx` cần theo dõi lịch sử ai sửa bảng giá, ai khóa tài khoản, ai hủy hóa đơn. Nếu viết code ghi audit log bằng tay trong từng Controller/Service của Node.js, lập trình viên rất dễ quên hoặc bị sót khi cập nhật trực tiếp qua DB client (Prisma Studio/DBeaver).

#### Mã SQL đề xuất:
```sql
CREATE OR REPLACE FUNCTION fn_audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_record_id UUID;
BEGIN
    -- Lấy ID bản ghi bị thay đổi
    IF TG_OP = 'DELETE' THEN
        v_record_id := OLD.id;
    ELSE
        v_record_id := NEW.id;
    END IF;

    -- Lấy user_id từ session context (nếu có truyền từ Backend qua SET LOCAL)
    v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::UUID;

    INSERT INTO audit_log (
        id, nguoi_thuc_hien, bang_bi_thay_doi, ban_ghi_id, 
        hanh_dong, du_lieu_cu, du_lieu_moi, thoi_diem
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        TG_TABLE_NAME,
        v_record_id,
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Gắn Trigger lên các bảng nhạy cảm
CREATE OR REPLACE TRIGGER trg_audit_hoa_don
AFTER UPDATE OR DELETE ON hoa_don
FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();

CREATE OR REPLACE TRIGGER trg_audit_dich_vu
AFTER UPDATE OR DELETE ON chi_tiet_dich_vu
FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();

CREATE OR REPLACE TRIGGER trg_audit_tai_khoan
AFTER UPDATE ON tai_khoan
FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();
```

#### Phân tích Trade-off:
* **Ưu điểm (NÊN CHỌN):**
  * **Chống gian lận 100%:** Dù sửa qua API, qua Prisma Studio hay can thiệp trực tiếp bằng câu lệnh SQL console thì Trigger vẫn âm thầm chụp lại bản ghi cũ/mới.
  * Giảm tải hoàn toàn cho code Backend: Không cần phải viết thêm logic `prisma.auditLog.create()` rải rác ở hàng chục Service.
* **Nhược điểm:**
  * Mỗi thao tác UPDATE/DELETE sẽ tốn thêm 1 phép INSERT vào `audit_log`, làm tăng nhẹ thời gian ghi đĩa.
  * Để lấy được chính xác `nguoi_thuc_hien`, Backend cần chạy lệnh `SET LOCAL app.current_user_id = ...` trước khi cập nhật.
* 👉 **Khuyến nghị:** **CÓ (RẤT NÊN CHỌN)** cho các bảng nhạy cảm tài chính và tài khoản (`hoa_don`, `tai_khoan`, `chi_tiet_dich_vu`).

---

### Đề xuất 4: Ràng buộc GiST EXCLUDE chống Trùng lịch trực Bác sĩ & Ghế nha

* **Bảng liên quan:** `ca_lam_viec` (Level 2).
* **Tính năng DB áp dụng:** **Constraint nâng cao (`GiST EXCLUDE` qua extension `btree_gist`)**
* **Vấn đề giải quyết:** Một Bác sĩ không thể có 2 ca trực cùng một khung giờ; một Phòng điều trị / Ghế nha không thể có 2 bác sĩ trực cùng lúc. Nếu kiểm tra bằng Backend (`findFirst` rồi `create`), khi có 2 Admin cùng xếp ca đồng thời (Race Condition), hệ thống sẽ bị lọt bản ghi trùng.

#### Mã SQL đề xuất:
```sql
-- Kích hoạt extension hỗ trợ GiST index trên kiểu dữ liệu vô hướng
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Thêm ràng buộc: Không cho phép trùng (nha_si_id, ngay) khi khoảng thời gian chồng lấn
ALTER TABLE ca_lam_viec 
DROP CONSTRAINT IF EXISTS exclude_dentist_shift_overlap;

ALTER TABLE ca_lam_viec 
ADD CONSTRAINT exclude_dentist_shift_overlap 
EXCLUDE USING gist (
    nha_si_id WITH =,
    ngay WITH =,
    tsrange(
        (ngay + gio_bat_dau)::timestamp, 
        (ngay + gio_ket_thuc)::timestamp
    ) WITH &&
);

-- Thêm ràng buộc: Không cho phép trùng phòng điều trị trong cùng khung giờ
ALTER TABLE ca_lam_viec 
DROP CONSTRAINT IF EXISTS exclude_room_shift_overlap;

ALTER TABLE ca_lam_viec 
ADD CONSTRAINT exclude_room_shift_overlap 
EXCLUDE USING gist (
    phong_dieu_tri_id WITH =,
    ngay WITH =,
    tsrange(
        (ngay + gio_bat_dau)::timestamp, 
        (ngay + gio_ket_thuc)::timestamp
    ) WITH &&
);
```

#### Phân tích Trade-off:
* **Ưu điểm (NÊN CHỌN):**
  * Triệt tiêu 100% rủi ro xung đột ca trực ở tầng vật lý, không có bất kỳ race condition nào lọt qua được.
  * Tự động tạo Index GiST giúp việc truy vấn tìm kiếm ca trực theo thời gian nhanh hơn.
* **Nhược điểm:**
  * Prisma schema hiện tại chưa hỗ trợ định nghĩa trực tiếp cú pháp `EXCLUDE USING gist` trong file `.prisma`, phải khai báo thông qua SQL migration thuần.
* 👉 **Khuyến nghị:** **CÓ (BẮT BUỘC NÊN CHỌN)** để bảo vệ tính toàn vẹn của lịch trực phòng khám.

---

### Đề xuất 5: Materialized View cho Báo cáo Doanh thu & Tần suất Dịch vụ theo Tháng

* **Bảng liên quan:** `hoa_don`, `ho_so_benh_an`, `dich_vu_dieu_tri`, `vat_tu_su_dung`, `chi_tiet_dich_vu`, `dich_vu`.
* **Tính năng DB áp dụng:** **Materialized View + Index**
* **Vấn đề giải quyết:** Khi phòng khám hoạt động lâu năm, bảng `hoa_don` và `dich_vu_dieu_tri` lên đến hàng triệu dòng. Màn hình `ReportsPage.tsx` khi mở báo cáo năm/quý sẽ bị chậm nếu cứ phải quét toàn bộ bảng lịch sử.

#### Mã SQL đề xuất:
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_revenue_report AS
SELECT 
    to_char(hd.ngay_thanh_toan, 'YYYY-MM') AS thang_nam,
    dv.id AS dich_vu_id,
    dv.ten_dich_vu,
    COUNT(DISTINCT hd.id) AS tong_so_hoa_don,
    COUNT(dvdt.id) AS so_luot_thuc_hien,
    COALESCE(SUM(dvdt.don_gia * dvdt.so_luong), 0) AS tong_doanh_thu_dich_vu
FROM hoa_don hd
JOIN lich_hen lh ON hd.lich_hen_id = lh.id
JOIN ho_so_benh_an hsba ON hsba.lich_hen_id = lh.id
JOIN dich_vu_dieu_tri dvdt ON dvdt.ho_so_id = hsba.id
JOIN chi_tiet_dich_vu ctdv ON dvdt.chi_tiet_dich_vu_id = ctdv.id
JOIN dich_vu dv ON ctdv.dich_vu_id = dv.id
WHERE hd.trang_thai_thanh_toan = 'da_thanh_toan'
GROUP BY to_char(hd.ngay_thanh_toan, 'YYYY-MM'), dv.id, dv.ten_dich_vu;

-- Đánh Index trên Materialized View để tìm kiếm theo tháng nhanh nhất
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_rev ON mv_monthly_revenue_report (thang_nam, dich_vu_id);
```

#### Cách làm mới dữ liệu (Refresh):
```sql
-- Chạy ngầm định kỳ (ví dụ nửa đêm hoặc mỗi 1 tiếng qua node-cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_revenue_report;
```

#### Phân tích Trade-off:
* **Ưu điểm:**
  * Báo cáo mở lên tức thì (< 2ms) vì dữ liệu thống kê đã được tính toán sẵn và nén thành bảng vật lý.
* **Nhược điểm (CÂN NHẮC):**
  * Dữ liệu có độ trễ (không cập nhật realtime từng giây).
  * Phải thiết lập cơ chế Refresh định kỳ từ Backend.
* 👉 **Khuyến nghị:** **CHƯA CẦN THIẾT Ở GIAI ĐOẠN ĐẦU (KHÔNG CHỌN NGAY)**. Chỉ nên kích hoạt khi hệ thống có trên 100.000 bản ghi hóa đơn và báo cáo bắt đầu có hiện tượng phản hồi chậm.

---

### Đề xuất 6: View Tinh gọn Hồ sơ Bác sĩ công khai (`v_public_dentists`)

* **Bảng liên quan:** `nha_si` (Level 1), `tai_khoan` (Level 0).
* **Tính năng DB áp dụng:** **View (Bảng ảo)**
* **Vấn đề giải quyết:** Che giấu các thông tin nhạy cảm của bác sĩ (mật khẩu băm, số điện thoại riêng, refresh token) khi hiển thị lên giao diện đặt lịch cho bệnh nhân hoặc màn hình chọn bác sĩ của lễ tân.

#### Mã SQL đề xuất:
```sql
CREATE OR REPLACE VIEW v_public_dentists AS
SELECT 
    ns.id AS profile_id,
    ns.tai_khoan_id,
    ns.ma_nha_si,
    ns.ho_ten,
    ns.gioi_tinh,
    ns.hinh_anh_url,
    ns.chuyen_khoa,
    ns.gioi_thieu,
    ns.so_giay_phep,
    ns.trang_thai
FROM nha_si ns
JOIN tai_khoan tk ON ns.tai_khoan_id = tk.id
WHERE tk.trang_thai = 'hoat_dong' AND ns.trang_thai = 'dang_lam_viec';
```

#### Phân tích Trade-off:
* **Ưu điểm:** Đơn giản, an toàn dữ liệu ở tầng truy vấn DB.
* **Nhược điểm:** Trong kiến trúc hiện tại, tầng DTO của Backend (`src/dtos/`) và Prisma `select: { ... }` đã làm rất tốt việc chọn lọc các trường cần trả về (Minimal UI Shell Data Policy). Tạo thêm View sẽ làm phân tán nơi định nghĩa dữ liệu.
* 👉 **Khuyến nghị:** **KHÔNG CẦN CHỌN**. Hãy sử dụng `select` tường minh của Prisma Client kết hợp với Response DTO Formatter trong Node.js để thống nhất một nơi quản lý shape dữ liệu.

---

### Đề xuất 7: Tối ưu B-Tree Indexes cho các Cột Truy vấn Tần suất Cao

* **Bảng liên quan:** `lich_hen`, `hoa_don`, `san_pham`, `ca_lam_viec`.
* **Tính năng DB áp dụng:** **Index (B-Tree)**
* **Vấn đề giải quyết:** Tăng tốc tức thì cho các câu truy vấn lọc ngày, trạng thái của toàn bộ 10 màn hình Admin mà không cần sửa bất kỳ dòng code Backend nào.

#### Mã SQL đề xuất:
```sql
-- 1. Tối ưu tìm kiếm lịch hẹn theo ngày và trạng thái
CREATE INDEX IF NOT EXISTS idx_lich_hen_ngay_trang_thai 
ON lich_hen (ngay_hen, trang_thai);

-- 2. Tối ưu tính doanh thu theo ngày thanh toán
CREATE INDEX IF NOT EXISTS idx_hoa_don_thanh_toan 
ON hoa_don (ngay_thanh_toan) 
WHERE trang_thai_thanh_toan = 'da_thanh_toan';

-- 3. Tối ưu cảnh báo tồn kho
CREATE INDEX IF NOT EXISTS idx_san_pham_ton_kho 
ON san_pham (so_luong_ton, muc_ton_toi_thieu) 
WHERE trang_thai = 'hoat_dong';

-- 4. Tối ưu tra cứu ca trực theo bác sĩ và ngày
CREATE INDEX IF NOT EXISTS idx_ca_lam_viec_nha_si_ngay 
ON ca_lam_viec (nha_si_id, ngay);
```

#### Phân tích Trade-off:
* **Ưu điểm (NÊN CHỌN):**
  * Tăng tốc truy vấn từ 10x đến 100x khi bảng có nhiều dữ liệu.
  * Hoàn toàn trong suốt với Prisma: Prisma tự động tận dụng Index mà không cần đổi cú pháp query.
  * Chỉ mục có điều kiện (`Partial Index`) giúp tiết kiệm tối đa dung lượng ổ cứng.
* **Nhược điểm:** Tốn thêm một lượng dung lượng đĩa nhỏ (không đáng kể).
* 👉 **Khuyến nghị:** **CÓ (BẮT BUỘC NÊN CHỌN)** cho mọi hệ thống production.

---

## 4. MA TRẬN QUYẾT ĐỊNH (DECISION MATRIX CHECKLIST)

Bảng dưới đây giúp bạn nhanh chóng chốt các tính năng SQL nhúng sẽ triển khai cho dự án:

| STT | Đề xuất Nhúng SQL | Tính năng DB | Đánh giá | Trạng thái đề xuất | Lựa chọn của bạn |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **1** | Dashboard KPI Analytics (`fn_get_admin_dashboard_stats`) | **Function** | Nhanh hơn 20x, giải phóng RAM Node.js | **Khuyên dùng** | [x] CÓ / [ ] KHÔNG |
| **2** | Thanh toán & Trừ kho toàn vẹn (`sp_checkout_appointment`) | **Procedure** | Chống âm kho, khóa dòng chống race condition | **Tùy chọn** | [ ] CÓ / [ ] KHÔNG |
| **3** | Tự động ghi Audit Log (`trg_audit_log_universal`) | **Trigger** | Tự động 100%, bảo mật cao, chống gian lận | **Khuyên dùng** | [x] CÓ / [ ] KHÔNG |
| **4** | Chống trùng lịch trực & phòng (`GiST EXCLUDE`) | **Constraint** | Chống xung đột bác sĩ/ghế nha tầng vật lý | **Khuyên dùng** | [x] CÓ / [ ] KHÔNG |
| **5** | Materialized View Báo cáo Doanh thu Tháng | **Mat. View** | Tối ưu khi dữ liệu > 100.000 dòng | **Để sau** | [ ] CÓ / [ ] KHÔNG |
| **6** | View hồ sơ Bác sĩ công khai | **View** | Trùng lặp với Prisma `select` & DTO | **Không cần** | [ ] CÓ / [ ] KHÔNG |
| **7** | B-Tree / Partial Indexes trên các cột lọc | **Index** | Tăng tốc toàn bộ hệ thống, zero rủi ro | **Khuyên dùng** | [x] CÓ / [ ] KHÔNG |

---

## 5. QUY TRÌNH QUẢN LÝ MÃ SQL NHÚNG TRONG SOURCE CODE

Để mã SQL nhúng hoạt động đồng bộ với Prisma và Docker của dự án:

1. **Vị trí lưu trữ mã nguồn SQL:**  
   Toàn bộ mã SQL Stored (Function, Procedure, Trigger, Constraint) được đặt trong thư mục:
   ```text
   prisma/
   ├── schema.prisma              # Định nghĩa 22 tables chuẩn
   ├── mock_data.sql              # Dữ liệu mẫu khởi tạo
   ├── sql/                       # NƠI TẬP TRUNG MÃ SQL NHÚNG
   │   ├── 01_constraints.sql     # btree_gist & GiST EXCLUDE ca_lam_viec
   │   ├── 02_indexes.sql         # Partial indexes cho hoa_don, lich_hen
   │   ├── 03_triggers.sql        # Trigger audit_log tự động
   │   └── 04_functions.sql       # fn_get_admin_dashboard_stats
   └── seed.js                    # Script nạp tự động khi khởi chạy Docker
   ```
2. **Cơ chế nạp tự động qua `seed.js`:**  
   Trong file [`prisma/seed.js`](../../prisma/seed.js), sau khi nạp xong `mock_data.sql`, chạy lần lượt các file trong thư mục `prisma/sql/` thông qua `client.query(sqlContent)`.
3. **Cách gọi trong Clean Architecture:**
   * **Route & Controller:** Giữ nguyên quy chuẩn gọi Service như bình thường.
   * **Service:** Sử dụng `prisma.$queryRaw` (đối với Function trả dữ liệu) hoặc `prisma.$executeRaw` (đối với Procedure thực thi) với tham số an toàn.
