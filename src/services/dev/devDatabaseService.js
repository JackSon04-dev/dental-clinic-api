// [DEV-ONLY / DEMO TEST TOOL] - Sẽ bị xóa khi dọn dẹp TopDemoBar
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import { ApiError } from '../../common/errorMiddleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Đường dẫn tới thư mục prisma
const prismaDir = path.resolve(__dirname, '../../../prisma');

class DevDatabaseService {
  /**
   * Tạo PostgreSQL client kết nối trực tiếp
   */
  getPgClient() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new ApiError(500, 'DATABASE_URL không được tìm thấy trong file .env');
    }
    return new pg.Client({ connectionString: databaseUrl });
  }

  /**
   * Đọc và thực thi các file SQL nhúng trong thư mục prisma/sql
   */
  async executeEmbeddedSqlFiles(client) {
    const sqlDir = path.join(prismaDir, 'sql');
    if (fs.existsSync(sqlDir)) {
      const sqlFiles = fs.readdirSync(sqlDir).filter((file) => file.endsWith('.sql'));
      for (const file of sqlFiles) {
        const embeddedSql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
        await client.query(embeddedSql);
      }
    }
  }

  /**
   * Xóa trắng database, CHỈ GIỮ LẠI 3 tài khoản nhân sự hệ thống cơ bản:
   * 1. Admin: admin_system / Password123@
   * 2. Bác sĩ: bs_quang / Password123@ (kèm hồ sơ nha_si NS001)
   * 3. Lễ tân: letan_lan / Password123@ (kèm hồ sơ nhan_vien NV001)
   * Toàn bộ danh mục dịch vụ, thuốc, phòng khám, ca làm việc, bệnh nhân, lịch hẹn... đều được làm sạch.
   */
  async resetClean() {
    const client = this.getPgClient();
    try {
      await client.connect();

      // 1. Truncate toàn bộ các bảng gốc có liên kết CASCADE
      await client.query(`
        TRUNCATE TABLE 
          tai_khoan, 
          dich_vu, 
          san_pham, 
          thuoc, 
          phac_do_mau, 
          khuyen_mai, 
          phong_dieu_tri, 
          khung_ca_lam_viec,
          audit_log 
        CASCADE;
      `);

      // 2. Thêm 3 tài khoản cốt lõi vào bảng tai_khoan (mật khẩu băm chuẩn của Password123@)
      await client.query(`
        INSERT INTO tai_khoan (username, password_hash, google_id, loai_tai_khoan, trang_thai)
        VALUES
          ('admin_system', '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'admin', 'hoat_dong'),
          ('bs_quang',    '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'nha_si', 'hoat_dong'),
          ('letan_lan',   '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'nhan_vien', 'hoat_dong');
      `);

      // 3. Thêm hồ sơ nha sĩ cho bs_quang
      await client.query(`
        INSERT INTO nha_si (tai_khoan_id, ma_nha_si, ho_ten, ngay_sinh, gioi_tinh, sdt, email, dia_chi, hinh_anh_url, chuyen_khoa, gioi_thieu, so_giay_phep, trang_thai)
        VALUES
          ((SELECT id FROM tai_khoan WHERE username = 'bs_quang'),
           'NS001', 'BSCKII. Trần Minh Quang', '1978-04-12', 'nam', '0912345601', 'bsquang@dentalclinic.vn',
           'Số 15 Phố Huế, Quận Hai Bà Trưng, Hà Nội', NULL,
           'Phẫu thuật hàm mặt & Cấy ghép Implant chuyên sâu',
           'Hơn 20 năm kinh nghiệm phẫu thuật hàm mặt và phục hình cấy ghép Implant chuyên sâu, tu nghiệp tại CHLB Đức.',
           'CCHN-00124/BYT', 'dang_lam_viec');
      `);

      // 4. Thêm hồ sơ nhân viên cho letan_lan
      await client.query(`
        INSERT INTO nhan_vien (tai_khoan_id, ma_nhan_vien, ho_ten, ngay_sinh, gioi_tinh, sdt, email, dia_chi, hinh_anh_url, chuc_vu, trang_thai)
        VALUES
          ((SELECT id FROM tai_khoan WHERE username = 'letan_lan'),
           'NV001', 'Đỗ Thị Ngọc Lan', '1996-03-15', 'nu', '0981234001', 'ngoclan.letan@dentalclinic.vn',
           'Số 18 Thái Hà, Quận Đống Đa, Hà Nội', NULL,
           'le_tan', 'dang_lam_viec');
      `);

      // 5. Nạp lại các function/view trong sql/
      await this.executeEmbeddedSqlFiles(client);

      return {
        success: true,
        message: 'Đã xóa trắng database thành công và bảo lưu 3 tài khoản nhân sự cơ bản (admin_system, bs_quang, letan_lan).',
        preservedAccounts: ['admin_system', 'bs_quang', 'letan_lan'],
      };
    } catch (err) {
      console.error('[DevDatabaseService] Lỗi resetClean:', err);
      throw new ApiError(500, `Lỗi khi xóa trắng database: ${err.message}`);
    } finally {
      await client.end();
    }
  }

  /**
   * Làm sạch và nạp lại toàn bộ dữ liệu mẫu ban đầu từ prisma/mock_data.sql (22 bảng)
   */
  async seedMock() {
    const client = this.getPgClient();
    try {
      await client.connect();

      const sqlFilePath = path.join(prismaDir, 'mock_data.sql');
      if (!fs.existsSync(sqlFilePath)) {
        throw new ApiError(500, `Không tìm thấy file dữ liệu mẫu tại: ${sqlFilePath}`);
      }

      // 1. Truncate làm sạch dữ liệu cũ
      await client.query(`
        TRUNCATE TABLE 
          tai_khoan, 
          dich_vu, 
          san_pham, 
          thuoc,
          phac_do_mau, 
          khuyen_mai, 
          phong_dieu_tri 
        CASCADE;
      `);

      // 2. Đọc file mock_data.sql và thực thi
      let sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      if (sqlContent.charCodeAt(0) === 0xFEFF) {
        sqlContent = sqlContent.slice(1);
      }
      await client.query(sqlContent);

      // 3. Nạp lại các function/view trong sql/
      await this.executeEmbeddedSqlFiles(client);

      const accountCheck = await client.query('SELECT COUNT(*) FROM tai_khoan');

      return {
        success: true,
        message: 'Đã nạp lại toàn bộ dữ liệu mẫu (22 bảng) từ mock_data.sql thành công.',
        totalAccounts: accountCheck.rows[0]?.count || 0,
      };
    } catch (err) {
      console.error('[DevDatabaseService] Lỗi seedMock:', err);
      throw new ApiError(500, `Lỗi khi nạp dữ liệu mẫu: ${err.message}`);
    } finally {
      await client.end();
    }
  }
}

export default new DevDatabaseService();
