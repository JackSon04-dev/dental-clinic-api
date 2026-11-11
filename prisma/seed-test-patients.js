import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function seedTestPatients() {
  await client.connect();
  console.log('✅ Kết nối PostgreSQL thành công.');

  try {
    await client.query('BEGIN');

    // 1. Dọn dẹp dữ liệu test cũ nếu có
    await client.query(`
      DELETE FROM lich_hen WHERE ma_lich_hen IN ('LH_TEST01', 'LH_TEST02', 'LH_TEST03');
      DELETE FROM benh_nhan WHERE ma_benh_nhan IN ('BN_TEST01', 'BN_TEST02', 'BN_TEST03');
      DELETE FROM tai_khoan WHERE username IN ('bn_test1', 'bn_test2', 'bn_test3');
    `);

    // 2. Tài khoản cho 3 bệnh nhân test (mật khẩu Password123@)
    await client.query(`
      INSERT INTO tai_khoan (username, password_hash, loai_tai_khoan, trang_thai)
      VALUES
        ('bn_test1', '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', 'benh_nhan', 'hoat_dong'),
        ('bn_test2', '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', 'benh_nhan', 'hoat_dong'),
        ('bn_test3', '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', 'benh_nhan', 'hoat_dong');
    `);

    // 3. Hồ sơ 3 bệnh nhân test
    await client.query(`
      INSERT INTO benh_nhan (
        tai_khoan_id, ma_benh_nhan, ho_ten, ngay_sinh, gioi_tinh, sdt, email, dia_chi, diem_suc_khoe_ban_dau, diem_suc_khoe_hien_tai
      )
      VALUES
        ((SELECT id FROM tai_khoan WHERE username = 'bn_test1'), 'BN_TEST01', 'Nguyễn Văn Test 1', '1995-05-15', 'nam', '0909000001', 'test1@dentalclinic.vn', '123 Phố Huế, Hai Bà Trưng, Hà Nội', 85, 95),
        ((SELECT id FROM tai_khoan WHERE username = 'bn_test2'), 'BN_TEST02', 'Trần Thị Test 2', '1998-08-20', 'nu', '0909000002', 'test2@dentalclinic.vn', '45 Hàng Bài, Hoàn Kiếm, Hà Nội', 85, 95),
        ((SELECT id FROM tai_khoan WHERE username = 'bn_test3'), 'BN_TEST03', 'Lê Văn Test 3', '1986-11-10', 'nam', '0909000003', 'test3@dentalclinic.vn', '88 Bà Triệu, Hai Bà Trưng, Hà Nội', 85, 95);
    `);

    // 4. Đảm bảo ca trực chiều hôm nay của BS Trần Minh Quang (NS001) tại phòng P101 hoặc P201
    const shiftRes = await client.query(`
      SELECT id FROM ca_lam_viec 
      WHERE nha_si_id = (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001')
        AND ngay = CURRENT_DATE 
        AND gio_bat_dau = '13:30:00'
      LIMIT 1;
    `);

    let shiftId;
    if (shiftRes.rows.length === 0) {
      const insertShift = await client.query(`
        INSERT INTO ca_lam_viec (nha_si_id, phong_dieu_tri_id, ngay, gio_bat_dau, gio_ket_thuc, trang_thai)
        VALUES (
          (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'),
          (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'),
          CURRENT_DATE,
          '13:30:00',
          '17:30:00',
          'co_mat'
        )
        RETURNING id;
      `);
      shiftId = insertShift.rows[0].id;
    } else {
      shiftId = shiftRes.rows[0].id;
      await client.query(`UPDATE ca_lam_viec SET trang_thai = 'co_mat' WHERE id = $1`, [shiftId]);
    }

    // 5. Thêm 3 lịch hẹn hôm nay với trạng thái 'cho_kham'
    await client.query(`
      INSERT INTO lich_hen (
        ma_lich_hen, benh_nhan_id, ca_lam_viec_id, dich_vu_id, ngay_hen, gio_hen, gio_ket_thuc_du_kien, trang_thai, ghi_chu
      )
      VALUES
        (
          'LH_TEST01',
          (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN_TEST01'),
          $1,
          (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_CAORANG'),
          CURRENT_DATE,
          '14:00:00',
          '14:45:00',
          'cho_kham',
          'Bệnh nhân kiểm tra định kỳ và lấy cao răng'
        ),
        (
          'LH_TEST02',
          (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN_TEST02'),
          $1,
          (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_TRAMRANG'),
          CURRENT_DATE,
          '14:45:00',
          '15:15:00',
          'cho_kham',
          'Răng hàm dưới ê buốt, nghi sâu men răng'
        ),
        (
          'LH_TEST03',
          (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN_TEST03'),
          $1,
          (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_IMPLANT'),
          CURRENT_DATE,
          '15:30:00',
          '16:30:00',
          'cho_kham',
          'Mất răng 36, có nhu cầu cấy ghép Implant Straumann'
        );
    `, [shiftId]);

    await client.query('COMMIT');
    console.log('🎉 Thêm thành công 3 bệnh nhân và 3 lịch hẹn hôm nay cho BS Trần Minh Quang!');
    console.log('📋 Danh sách lịch hẹn đã tạo:');
    console.log('   1. LH_TEST01: BN_TEST01 - Nguyễn Văn Test 1 (Lấy cao răng - 14:00)');
    console.log('   2. LH_TEST02: BN_TEST02 - Trần Thị Test 2 (Trám răng - 14:45)');
    console.log('   3. LH_TEST03: BN_TEST03 - Lê Văn Test 3 (Cấy ghép Implant - 15:30)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi khi nạp dữ liệu:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedTestPatients();
