import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

// Load biến môi trường
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Lỗi: DATABASE_URL không được tìm thấy trong file .env');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
  });

  try {
    console.log('🔄 Đang kết nối tới PostgreSQL database...');
    await client.connect();
    console.log('✅ Kết nối cơ sở dữ liệu thành công.');

    const sqlFilePath = path.join(__dirname, 'mock_data.sql');
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`❌ Lỗi: Không tìm thấy file dữ liệu mẫu tại: ${sqlFilePath}`);
      process.exit(1);
    }

    console.log('🧹 Đang làm sạch dữ liệu cũ (TRUNCATE CASCADE các bảng gốc)...');
    await client.query(`
      TRUNCATE TABLE 
        tai_khoan, 
        dich_vu, 
        san_pham, 
        phac_do_mau, 
        khuyen_mai, 
        phong_dieu_tri 
      CASCADE;
    `);

    console.log(`📖 Đang đọc file mock_data.sql (${(fs.statSync(sqlFilePath).size / 1024).toFixed(1)} KB)...`);
    let sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    if (sqlContent.charCodeAt(0) === 0xFEFF) {
      sqlContent = sqlContent.slice(1);
    }

    console.log('🚀 Đang thực thi nạp dữ liệu mẫu (22 bảng theo thứ tự dependency Level 0 -> 6)...');
    await client.query(sqlContent);

    // Nạp các hàm / thủ tục nhúng từ thư mục prisma/sql (nếu có)
    const sqlDir = path.join(__dirname, 'sql');
    if (fs.existsSync(sqlDir)) {
      const sqlFiles = fs.readdirSync(sqlDir).filter((file) => file.endsWith('.sql'));
      for (const file of sqlFiles) {
        console.log(`⚡ Đang nạp mã SQL nhúng: ${file}...`);
        const embeddedSql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
        await client.query(embeddedSql);
      }
    }

    // Kiểm tra nhanh số lượng bản ghi tài khoản
    const accountCheck = await client.query('SELECT COUNT(*) FROM tai_khoan');
    console.log(`\n🎉 IMPORT MOCK DATA THÀNH CÔNG!`);
    console.log(`📊 Số lượng tài khoản hiện có trong DB: ${accountCheck.rows[0].count}`);
    console.log(`🔑 Mật khẩu mặc định cho tất cả tài khoản mẫu: Password123@`);
    console.log(`   - Admin: admin_system`);
    console.log(`   - Bác sĩ: bs_quang, bs_nam, bs_lan, bs_tuananh, bs_haidang`);
    console.log(`   - Lễ tân: letan_lan, letan_hoa`);
    console.log(`   - Bệnh nhân: bn_nguyenan, bn_lethibich, bn_trancuong, bn_hoangdung\n`);

  } catch (err) {
    console.error('❌ Lỗi khi thực thi import mock data:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
