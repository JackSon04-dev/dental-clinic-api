# Các Tính năng Nâng cao trong Cơ sở Dữ liệu PostgreSQL (Database Features)

Tài liệu này tổng hợp đầy đủ và chi tiết nhất về bản chất, đặc điểm hoạt động, mục đích cốt lõi và cách thức tương tác của **7 tính năng trụ cột** trong hệ quản trị cơ sở dữ liệu quan hệ (RDBMS), đặc biệt trên nền tảng **PostgreSQL 16** của hệ thống `DentalClinicApp`.

---

## Bảng Tổng quan So sánh Nhanh

| Tính năng | Bản chất | Lưu trữ vật lý? | Nhận tham số? | Trả về kết quả? | Quản lý Transaction? | Mục đích cốt lõi |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **1. View** | Bảng ảo từ câu lệnh SELECT | ❌ Không | ❌ Không | ✅ Cấu trúc bảng | ❌ Không | Đơn giản hóa truy vấn phức tạp, bảo mật cột dữ liệu. |
| **2. Function** | Khối mã tính toán & thuật toán | ❌ Không | ✅ Có | ✅ Bắt buộc | ❌ Không (chạy theo caller) | Đóng gói công thức, tính toán trực tiếp trên DB engine. |
| **3. Stored Procedure** | Quy trình thực thi nghiệp vụ | ❌ Không | ✅ Có | ⚠️ Không bắt buộc | ✅ **CÓ (COMMIT / ROLLBACK)** | Thực thi chuỗi thao tác Ghi/Sửa/Xóa toàn vẹn. |
| **4. Trigger** | Cơ chế canh gác tự động | ❌ Không | ❌ Không trực tiếp | ⚠️ Kích hoạt Trigger Function | ❌ Chạy cùng transaction sự kiện | Ép buộc toàn vẹn dữ liệu, tự động ghi Audit Log. |
| **5. Materialized View** | Snapshot kết quả SELECT ra ổ cứng | ✅ Có | ❌ Không | ✅ Cấu trúc bảng | ❌ Không | Tăng tốc báo cáo/dashboard hàng triệu dòng (caching). |
| **6. Index** | Cây dữ liệu tra cứu (B-Tree...) | ✅ Có | ❌ Không | ❌ Không | ❌ Không | Tăng tốc SELECT WHERE, đánh đổi làm chậm nhẹ Write. |
| **7. Constraint** | Ràng buộc logic tại tầng bảng | ✅ Có (Metadata) | ❌ Không | ❌ Ném lỗi nếu vi phạm | ❌ Chặn đứng thao tác | Bảo vệ tính toàn vẹn, chống dữ liệu rác ở tầng vật lý. |

---

## 1. View (Khung nhìn)

### Bản chất
* Là một **"bảng ảo"**, thực chất là một câu lệnh truy vấn (`SELECT`) được lưu trữ lại dưới một cái tên trong schema database.

### Đặc điểm hoạt động
* **Không lưu trữ dữ liệu vật lý** (trừ Materialized View). Khi bạn gọi View, cơ sở dữ liệu mới bắt đầu phân giải truy vấn và đi lấy dữ liệu từ các bảng gốc ở thời gian thực.
* **Không nhận tham số đầu vào** (không truyền argument như hàm).
* **Luôn trả về kết quả dưới dạng cấu trúc của một bảng** (gồm tập hợp các hàng và các cột).
* **Về cơ bản là "chỉ đọc" (Read-only)**: Dù PostgreSQL có hỗ trợ cập nhật dữ liệu qua View (Updatable Views) trong một số trường hợp đơn giản một bảng, nhưng nguyên tắc thiết kế chung là dùng để truy xuất.

### Mục đích cốt lõi
* **Giảm sự phức tạp (Abstraction):** Đóng gói các câu lệnh `JOIN` 5–7 bảng phức tạp thành một cái tên ngắn gọn để Backend chỉ cần `SELECT * FROM view_name`.
* **Bảo mật dữ liệu (Data Security):** Tạo ra các View che đi hoặc loại bỏ các cột nhạy cảm (`password_hash`, `refresh_token_hash`), sau đó phân quyền cho role nhân viên/lễ tân chỉ được đọc qua View này thay vì cấp quyền truy cập bảng gốc.

### Cách thức tương tác
* Được gọi trực tiếp bằng câu lệnh `SELECT` (ví dụ: `SELECT * FROM v_active_dentists WHERE specialty = 'Chỉnh nha'`).
* Có thể được sử dụng làm nguồn dữ liệu đầu vào bên trong Function hoặc Procedure.

---

## 2. Function (Hàm định nghĩa sẵn)

### Bản chất
* Là một khối mã logic được biên dịch sẵn trên Database (thường viết bằng `PL/pgSQL` hoặc `SQL`), dùng để **tính toán, biến đổi dữ liệu và đóng gói các thuật toán**.

### Đặc điểm hoạt động
* **Có nhận tham số đầu vào (Input):** Hỗ trợ đầy đủ các kiểu dữ liệu, giá trị mặc định (`DEFAULT`).
* **Bắt buộc phải trả về kết quả (Return):** Kết quả này có thể là:
  * Một giá trị vô hướng (Scalar Value: một con số, một chuỗi, kiểu boolean).
  * Một cấu trúc bảng (Return Table: `TABLE(...)` hoặc `SETOF`).
  * Một đối tượng JSON/JSONB nguyên khối (`RETURNS JSONB`).
* **Không có quyền quản lý Transaction:** Tuyệt đối **không thể** sử dụng lệnh `COMMIT` (lưu) hoặc `ROLLBACK` (hoàn tác) bên trong Function. Nó luôn chạy bám theo Transaction của câu lệnh hoặc session gọi nó.

### Mục đích cốt lõi
* **Tối ưu hóa hiệu năng & Tiết kiệm băng thông:** Thay vì kéo hàng ngàn hoặc hàng triệu dòng dữ liệu thô về Node.js Backend qua mạng để cộng trừ nhân chia, ta gọi Function xử lý trực tiếp ngay trên bộ xử lý của PostgreSQL và chỉ trả kết quả cuối cùng.
* **Tái sử dụng thuật toán:** Đóng gói các công thức tính toán phức tạp (tính tổng doanh thu trừ voucher, tính phần trăm tăng trưởng, tính giá trị bảo hiểm y tế).

### Cách thức tương tác
* Gọi trực tiếp bên trong câu lệnh `SELECT` (ví dụ: `SELECT fn_get_admin_dashboard_stats('this_month')`).
* Rất hay được Procedure hoặc Trigger gọi để thực hiện một khâu tính toán hoặc kiểm tra điều kiện.

---

## 3. Stored Procedure (Thủ tục lưu trữ)

### Bản chất
* Là một khối mã dùng để **thực thi một chuỗi quy trình nghiệp vụ (Business Logic)** làm thay đổi trạng thái của dữ liệu trên nhiều bảng.

### Đặc điểm hoạt động
* **Có nhận tham số đầu vào (Input/INOUT).**
* **Không bắt buộc phải trả về kết quả** (không dùng để nhúng trực tiếp vào giữa câu `SELECT`).
* **Quyền năng tối thượng — Quản lý Transaction:**
  * Procedure cho phép bạn chủ động gọi lệnh `COMMIT` để chốt dữ liệu xuống ổ cứng giữa chừng, hoặc `ROLLBACK` để hủy toàn bộ chuỗi thao tác nếu xảy ra lỗi.
  * Hỗ trợ khối bắt lỗi chuyên sâu (`EXCEPTION WHEN OTHERS THEN ... ROLLBACK;`).

### Mục đích cốt lõi
* Dành cho các tác vụ Ghi/Sửa/Xóa (`INSERT`/`UPDATE`/`DELETE`) phức tạp cần đảm bảo tính toàn vẹn ACID tuyệt đối.
* *Ví dụ:* Quy trình thanh toán ca khám: trừ số lượng tồn kho vật tư trong `san_pham`, ghi nhận hồ sơ `ho_so_benh_an`, cập nhật trạng thái `lich_hen = 'da_kham'`, lập hóa đơn `hoa_don`, và ghi log giao dịch — nếu một bước thất bại thì tự động `ROLLBACK` toàn bộ.

### Cách thức tương tác
* **Chỉ có thể gọi độc lập bằng lệnh `CALL`:**  
  `CALL sp_checkout_appointment('uuid-lich-hen', 'tien_mat', ...);`
* Bên trong Procedure thường gọi các View để đối chiếu dữ liệu và gọi Function để tính toán số liệu trước khi chốt lệnh cập nhật.

---

## 4. Trigger (Trình kích hoạt)

### Bản chất
* Là hệ thống **"cảnh giới" bảo vệ dữ liệu tự động**, chạy ngầm ở tầng Database mà không phụ thuộc vào code ứng dụng Backend.

### Đặc điểm hoạt động
* **Không thể bị gọi thủ công bởi bất kỳ ai:** Không tồn tại lệnh `CALL` hay `SELECT` dành cho Trigger.
* **Nghe ngóng sự kiện trên bảng chỉ định:** Khi bảng mục tiêu xảy ra các sự kiện `INSERT`, `UPDATE`, hoặc `DELETE`, Trigger sẽ tự động can thiệp vào thời điểm:
  * `BEFORE`: Trước khi dữ liệu kịp ghi xuống đĩa (dùng để kiểm tra hợp lệ hoặc biến đổi dữ liệu trước khi lưu).
  * `AFTER`: Sau khi dữ liệu đã ghi xong (dùng để ghi log, đồng bộ dữ liệu sang bảng khác).
  * `INSTEAD OF`: Thường áp dụng trên View để chuyển hướng thao tác.
* **Chạy chung Transaction với câu lệnh kích hoạt:** Nếu logic trong Trigger bắn ra Exception, thao tác `INSERT`/`UPDATE` ban đầu của người dùng/Backend cũng sẽ bị hủy bỏ ngay lập tức.

### Mục đích cốt lõi
* **Đảm bảo tính toàn vẹn cưỡng chế (Data Integrity):** Không đặt trọn niềm tin vào Backend (phòng trường hợp developer quên validate hoặc viết thiếu điều kiện).
* **Tự động cập nhật thời gian:** Tự động gán `updated_at = NOW()` mỗi khi có thao tác sửa dòng.
* **Ghi vết kiểm toán tự động (Audit Logging):** Tự động bắt lấy biến `OLD` (dữ liệu cũ) và `NEW` (dữ liệu mới) rồi ghi vào bảng `audit_log` (Ai sửa, sửa bảng nào, giá trị cũ/mới là gì, thời điểm nào).

### Cách thức tương tác
* Trong PostgreSQL, một Trigger luôn đi kèm với một **Trigger Function** (hàm có kiểu trả về là `RETURNS TRIGGER`):
  ```sql
  CREATE TRIGGER trg_audit_hoa_don
  AFTER UPDATE OR DELETE ON hoa_don
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();
  ```

---

## 5. Materialized View (Khung nhìn cụ thể hóa)

### Bản chất
* Là một **"bức ảnh chụp" (Snapshot)** kết quả của một câu lệnh truy vấn phức tạp, nhưng được **lưu trữ vật lý xuống ổ cứng** giống hệt như một bảng dữ liệu thật.

### Đặc điểm hoạt động
* **Chiếm dung lượng lưu trữ thực tế trên đĩa:** Khác với View thông thường (chỉ là câu lệnh SELECT ảo), Materialized View chứa dữ liệu thật.
* **Dữ liệu có độ trễ (Static Snapshot):** Dữ liệu bên trong nó không tự động cập nhật ngay lập tức khi các bảng gốc thay đổi.
* **Hỗ trợ đánh Chỉ mục (Index):** Bạn có thể tạo các `CREATE INDEX` trực tiếp trên các cột của Materialized View để tăng tốc độ tìm kiếm lên mức tối đa.

### Mục đích cốt lõi
* **Phục vụ Báo cáo phân tích (Analytics & Reporting) và Dashboard:**  
  Thay vì bắt Database phải quét và tính toán hàng triệu dòng hóa đơn/lịch hẹn mỗi khi Admin mở trang Dashboard, DB chỉ cần tính toán sẵn một lần và lưu vào Materialized View. Khi người dùng truy vấn, thời gian phản hồi chỉ mất vài mili-giây.

### Cách thức tương tác
* Đọc dữ liệu cực nhanh bằng lệnh `SELECT * FROM mv_monthly_revenue_summary`.
* Cập nhật dữ liệu mới từ các bảng gốc thông qua lệnh:
  ```sql
  REFRESH MATERIALIZED VIEW mv_monthly_revenue_summary;
  -- Hoặc làm mới không khóa đọc (yêu cầu có Unique Index):
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_revenue_summary;
  ```
* Thường được kết hợp với công cụ lập lịch ngầm (Cron job / `pg_cron`) để làm mới định kỳ vào ban đêm hoặc mỗi 30 phút.

---

## 6. Index (Chỉ mục)

### Bản chất
* Là một **cấu trúc dữ liệu phụ trợ độc lập** (thường là cây cân bằng **B-Tree**, Hash, GiST, GIN), hoạt động tương tự như phần **"Mục lục"** ở cuối một cuốn bách khoa toàn thư dày hàng ngàn trang.

### Đặc điểm hoạt động
* **Chiếm dung lượng lưu trữ riêng trên ổ cứng.**
* **Tăng tốc độ Đọc (`SELECT`) vượt trội:** Giúp Database nhảy thẳng đến vị trí vật lý của dòng dữ liệu cần tìm, loại bỏ việc phải đọc quét tuần tự toàn bộ bảng từ đầu đến cuối (`Seq Scan` / `Full Table Scan`).
* **Đánh đổi làm chậm tốc độ Ghi (`INSERT`/`UPDATE`/`DELETE`):** Mỗi khi thêm mới hoặc sửa dữ liệu trên cột có đánh chỉ mục, Database phải tốn thêm tài nguyên I/O để tái cân bằng và cập nhật lại cây Index.

### Mục đích cốt lõi
* Tối ưu hóa hiệu năng truy vấn cho các bảng lớn (hàng trăm ngàn đến hàng triệu bản ghi).
* Tăng tốc các mệnh đề lọc dữ liệu: `WHERE`, `JOIN ... ON`, `ORDER BY`, `GROUP BY`.
* *Ví dụ trong DentalClinicApp:* Đánh Index trên `tai_khoan.username`, `benh_nhan.sdt`, `hoa_don.ngay_thanh_toan`, `ca_lam_viec.ngay`.

### Cách thức tương tác
* Được khai báo một lần duy nhất bằng lệnh:
  ```sql
  CREATE INDEX idx_hoa_don_ngay_thanh_toan ON hoa_don (ngay_thanh_toan);
  ```
* Sau khi tạo, lập trình viên **không bao giờ phải gọi trực tiếp Index**. Bộ tối ưu hóa truy vấn nội bộ của PostgreSQL (**Query Planner**) sẽ tự động phân tích chi phí câu lệnh SQL và quyết định xem có nên sử dụng Index đó hay không.

---

## 7. Constraint (Ràng buộc toàn vẹn)

### Bản chất
* Là những **"quy tắc thép" mang tính pháp lý cao nhất** được cài đặt trực tiếp vào định nghĩa của bảng, ép buộc toàn bộ dữ liệu lưu trữ phải tuân thủ nghiêm ngặt.

### Đặc điểm hoạt động
* **Hoạt động ở tầng vật lý sâu nhất của CSDL:** Không một ai có thể lách luật hay vượt qua Constraint (kể cả thao tác bằng tay của Database Administrator hay lỗi code từ ứng dụng Backend).
* **Kiểm tra tức thời:** Được kích hoạt ngay trong quá trình thực thi câu lệnh `INSERT` hoặc `UPDATE`. Nếu phát hiện vi phạm, hệ thống lập tức chặn đứng thao tác và ném ra lỗi (Exception).

### Các loại Constraint phổ biến
1. **PRIMARY KEY (Khóa chính):** Định danh duy nhất cho từng dòng trong bảng, bắt buộc `NOT NULL` và `UNIQUE` (ví dụ: `id UUID PRIMARY KEY`).
2. **FOREIGN KEY (Khóa ngoại):** Thiết lập mối quan hệ cha - con giữa các bảng, đảm bảo tính toàn vẹn tham chiếu (ví dụ: `lich_hen.benh_nhan_id` bắt buộc phải tồn tại trong bảng `benh_nhan`).
3. **UNIQUE (Duy nhất):** Cấm dữ liệu trùng lặp trên một hoặc nhiều cột (ví dụ: `tai_khoan.username`, `benh_nhan.sdt`, `dich_vu.ma_dich_vu`).
4. **CHECK (Kiểm tra logic):** Kiểm tra biểu thức điều kiện boolean (ví dụ: `CHECK (gia >= 0)`, `CHECK (so_luong_ton >= 0)`).
5. **NOT NULL (Không được rỗng):** Bắt buộc cột phải có giá trị thực, không được để `NULL`.
6. **EXCLUDE (Loại trừ nâng cao - PostgreSQL GiST):** Ngăn chặn sự chồng lấn khoảng thời gian (dùng để chống trùng lịch ca trực bác sĩ trong `ca_lam_viec`).

### Mục đích cốt lõi
* Phòng chống dữ liệu rác, đảm bảo tính đúng đắn và an toàn thông tin (Data Integrity) ở mức độ tuyệt đối.
* Là chốt chặn cuối cùng bảo vệ hệ thống khi ứng dụng Backend xảy ra lỗi logic hoặc xử lý đồng thời (Race Condition).

### Cách thức tương tác
* Được định nghĩa khi tạo bảng (`CREATE TABLE`) hoặc thêm vào sau bằng lệnh `ALTER TABLE ... ADD CONSTRAINT`.
* Hoạt động 100% tự động trong mọi chu trình sống của cơ sở dữ liệu.
