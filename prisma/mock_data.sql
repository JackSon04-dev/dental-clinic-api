-- ============================================================================
-- DENTAL CLINIC DATABASE - DỮ LIỆU MẪU TỔNG HỢP (MOCK DATA)
-- Tự động sinh từ 22 file SQL theo thứ tự dependency (Level 0 → 6)
-- Ngày cập nhật: 2026-10-16
-- ============================================================================

BEGIN;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG TÀI KHOẢN (Level 0)
-- Gồm: 1 Admin, 5 Bác sĩ, 2 Lễ tân, 4 Bệnh nhân
-- Mật khẩu mặc định: Password123@
-- ============================================================================

INSERT INTO tai_khoan (username, password_hash, google_id, loai_tai_khoan, trang_thai)
VALUES
    -- 1. Quản trị viên (Admin)
    ('admin_system', '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'admin', 'hoat_dong'),

    -- 2. 5 Bác sĩ nha khoa
    ('bs_quang',    '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'nha_si', 'hoat_dong'),
    ('bs_nam',      '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'nha_si', 'hoat_dong'),
    ('bs_lan',      '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'nha_si', 'hoat_dong'),
    ('bs_tuananh',  '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'nha_si', 'hoat_dong'),
    ('bs_haidang',  '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'nha_si', 'hoat_dong'),

    -- 3. 2 Nhân viên lễ tân kiêm thu ngân
    ('letan_lan',   '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'nhan_vien', 'hoat_dong'),
    ('letan_hoa',   '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'nhan_vien', 'hoat_dong'),

    -- 4. 4 Bệnh nhân cho 4 kịch bản điều trị
    ('bn_nguyenan', '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'benh_nhan', 'hoat_dong'),
    ('bn_lethibich', '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'benh_nhan', 'hoat_dong'),
    ('bn_trancuong', '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'benh_nhan', 'hoat_dong'),
    ('bn_hoangdung', '$2b$10$bTjY/2mZ87/7xcDN65230.RVwgonK8lTJAyGmxxXgy90fumttVGdu', NULL, 'benh_nhan', 'hoat_dong')
ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG DỊCH VỤ (Level 0)
-- 10 dịch vụ chính với đầy đủ mô tả, quy trình và thời gian dự kiến
-- ============================================================================

INSERT INTO dich_vu (ma_dich_vu, ten_dich_vu, mo_ta, thong_tin_quy_trinh, thoi_gian_du_kien_phut, trang_thai)
VALUES
    ('DV_CAORANG', 'Lấy cao răng',
     'Loại bỏ cao răng, mảng bám và vi khuẩn dưới nướu. Phòng ngừa viêm nướu, viêm nha chu, hôi miệng và sâu răng. Đây là dịch vụ phòng ngừa cơ bản nhất.',
     'Sử dụng máy siêu âm kết hợp dụng cụ cầm tay làm sạch -> đánh bóng răng -> có thể bôi fluoride. Thời gian thực hiện khoảng 30-60 phút tùy mức độ cao răng.',
     45, 'hoat_dong'),

    ('DV_TRAMRANG', 'Trám răng',
     'Phục hồi răng bị sâu, mẻ hoặc khuyết bằng vật liệu composite hoặc GIC. Ngăn sâu lan rộng và bảo vệ tủy răng.',
     'Làm sạch lỗ sâu -> đặt vật liệu trám -> chiếu đèn quang trùng hợp cứng hóa. Trường hợp lỗ sâu lớn có thể sử dụng kỹ thuật Inlay/Onlay.',
     30, 'hoat_dong'),

    ('DV_NHORANG', 'Nhổ răng (răng sữa & thông thường)',
     'Loại bỏ răng sữa lung lay ở trẻ em, răng sâu nặng không thể cứu được hoặc răng lung lay do viêm nha chu.',
     'Gây tê tại chỗ -> nhổ bằng kẹp hoặc đòn bẩy chuyên dụng -> cầm máu. Trường hợp khó có thể cần cắt xương nhẹ.',
     30, 'hoat_dong'),

    ('DV_RANGKHON', 'Nhổ răng khôn',
     'Loại bỏ răng khôn mọc lệch, mọc ngầm, gây đau, viêm hoặc ảnh hưởng đến răng bên cạnh.',
     'Gây tê -> rạch nướu (nếu cần) -> cắt xương/chia thân răng -> lấy răng -> khâu đóng. Có thể kết hợp PRF hoặc ghép xương tùy trường hợp.',
     45, 'hoat_dong'),

    ('DV_KHAMTQ', 'Khám tổng quát nha khoa',
     'Phát hiện sớm sâu răng, viêm nướu, lệch khớp cắn và các vấn đề răng miệng khác. Kết hợp tư vấn vệ sinh và lập kế hoạch điều trị.',
     'Khám lâm sàng toàn diện + chụp phim nếu cần. Thời gian khoảng 15-30 phút.',
     20, 'hoat_dong'),

    ('DV_TUYRANG', 'Điều trị tủy răng',
     'Loại bỏ tủy bị viêm hoặc nhiễm trùng nhằm giữ lại răng thật thay vì phải nhổ bỏ.',
     'Mở buồng tủy -> làm sạch và tạo hình ống tủy -> trám bít ống tủy. Thường kết hợp bọc sứ sau khi điều trị xong.',
     60, 'hoat_dong'),

    ('DV_NIENGRANG', 'Niềng răng',
     'Chỉnh răng lệch lạc, hô, móm, thưa, khớp cắn sai để cải thiện thẩm mỹ và chức năng nhai.',
     'Gắn mắc cài hoặc mang khay Invisalign -> tái khám định kỳ 4-6 tuần trong thời gian 12-24 tháng.',
     60, 'hoat_dong'),

    ('DV_TAYTRANG', 'Tẩy trắng răng',
     'Làm sáng màu răng bị ố vàng do cà phê, thuốc lá, tuổi tác hoặc kháng sinh.',
     'Bôi gel tẩy trắng + chiếu đèn Laser/Plasma (tại phòng khám) hoặc mang máng tại nhà. Kết quả thường duy trì từ 6-18 tháng.',
     45, 'hoat_dong'),

    ('DV_IMPLANT', 'Trồng răng',
     'Thay thế răng đã mất bằng trụ titanium cắm vào xương hàm kết hợp mão sứ trên trụ. Phục hồi chức năng nhai gần như răng thật và ngăn tiêu xương hàm.',
     'Cấy trụ Implant -> chờ tích hợp xương 3-6 tháng -> gắn abutment + mão sứ. Có thể gắn răng tạm ngay sau khi cấy trụ.',
     60, 'hoat_dong'),

    ('DV_BOCSU', 'Bọc sứ',
     'Phục hình răng sâu lớn, gãy, đổi màu, thưa hoặc cải thiện thẩm mỹ nụ cười.',
     'Mài răng (đối với bọc sứ) hoặc mài rất ít (đối với Veneer) -> lấy dấu -> gắn mão sứ hoặc dán Veneer. Thường hoàn thành trong 2-3 buổi hẹn.',
     45, 'hoat_dong')
ON CONFLICT (ma_dich_vu) DO NOTHING;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG SẢN PHẨM (Level 0)
-- Quản lý: Mão sứ, Cặp Implant+Abutment, Mắc cài, Dây cung, Khay niềng
-- Có trường dich_vu_id tương ứng
-- ============================================================================

INSERT INTO san_pham (ma_san_pham, ten_san_pham, loai, don_vi_tinh, gia_ban, so_luong_ton, muc_ton_toi_thieu, dich_vu_id, mo_ta, trang_thai)
VALUES
    -- 1. Nhóm Mão sứ (Dùng cho Bọc sứ hoặc lắp lên Trụ Implant - Chuẩn 3NF)
    ('SP_MAO_KL', 'Mão răng sứ kim loại Ni-Cr', 'vat_lieu_nha_khoa', 'Cái', 4000000, 25, 5,
     (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_BOCSU'),
     'Mão răng sứ khung sườn hợp kim Ni-Cr phủ sứ bên ngoài, bảo hành 3 năm', 'hoat_dong'),

    ('SP_MAO_EMAX', 'Mão răng toàn sứ cao cấp Emax', 'vat_lieu_nha_khoa', 'Cái', 8500000, 30, 5,
     (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_BOCSU'),
     'Mão toàn sứ thủy tinh IPS Emax độ trong mờ tự nhiên như răng thật, chịu lực 400MPa', 'hoat_dong'),

    ('SP_MAO_CERCON', 'Mão toàn sứ Cercon HT', 'vat_lieu_nha_khoa', 'Cái', 6000000, 30, 5,
     (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_BOCSU'),
     'Mão toàn sứ Cercon HT Đức độ cứng 1200MPa, tương thích sinh học tuyệt đối', 'hoat_dong'),

    ('SP_VENEER_EMAX', 'Mặt dán sứ Veneer Emax Press', 'vat_lieu_nha_khoa', 'Cái', 8000000, 20, 3,
     (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_BOCSU'),
     'Mặt dán sứ siêu mỏng 0.3 - 0.5mm bảo tồn tối đa răng thật, thẩm mỹ đỉnh cao', 'hoat_dong'),

    -- 2. Nhóm Cặp Trụ Implant + Abutment
    ('SP_IMP_KR', 'Cặp Trụ Implant + Abutment Hàn Quốc (Dentium)', 'vat_lieu_nha_khoa', 'Bộ', 15000000, 15, 3,
     (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_IMPLANT'),
     'Trụ Implant Dentium Hàn Quốc ren xoắn kép tăng diện tích tiếp xúc xương', 'hoat_dong'),

    ('SP_IMP_US', 'Cặp Trụ Implant + Abutment Mỹ / Đức (Hiossen)', 'vat_lieu_nha_khoa', 'Bộ', 25000000, 10, 2,
     (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_IMPLANT'),
     'Trụ Implant Hiossen ETIII công nghệ bề mặt SA xử lý tinh xảo', 'hoat_dong'),

    ('SP_IMP_CH', 'Cặp Trụ Implant + Abutment Thụy Sĩ (Straumann SLA)', 'vat_lieu_nha_khoa', 'Bộ', 38000000, 8, 2,
     (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_IMPLANT'),
     'Trụ Implant Straumann SLA Thụy Sĩ dòng cao cấp nhất, thời gian tích hợp xương nhanh 3-4 tuần', 'hoat_dong'),

    -- 3. Nhóm Mắc cài & Niềng răng
    ('SP_MC_KL', 'Bộ mắc cài kim loại tiêu chuẩn MBT 0.022', 'dung_cu', 'Bộ', 4500000, 20, 5,
     (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_NIENGRANG'),
     'Bộ mắc cài kim loại cao cấp thép không gỉ 17-4, rãnh trượt 0.022', 'hoat_dong'),

    ('SP_MC_SU', 'Bộ mắc cài sứ tự buộc Damon Clear 2', 'dung_cu', 'Bộ', 9000000, 12, 3,
     (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_NIENGRANG'),
     'Mắc cài sứ trong suốt tự buộc công nghệ thụ động giảm ma sát, thẩm mỹ cao', 'hoat_dong'),

    ('SP_DAY_NITI', 'Cặp dây cung NiTi kích hoạt nhiệt', 'vat_tu', 'Cặp', 300000, 50, 10,
     (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_NIENGRANG'),
     'Dây cung Nickel Titanium biến đổi dẻo theo nhiệt độ miệng', 'hoat_dong'),

    ('SP_DAY_SS', 'Cặp dây cung thép không gỉ Stainless Steel', 'vat_tu', 'Cặp', 250000, 40, 10,
     (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_NIENGRANG'),
     'Dây cung thép chỉnh nha lực kéo ổn định đóng khoảng', 'hoat_dong'),

    ('SP_THUN_CH', 'Bộ thun chuỗi / thun buộc tại chỗ', 'vat_tu', 'Gói', 100000, 100, 20,
     (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_NIENGRANG'),
     'Thun buộc chỉnh nha đàn hồi y tế không độc hại', 'hoat_dong'),

    ('SP_KHAY_INVIS', 'Bộ khay niềng trong suốt Invisalign', 'vat_lieu_nha_khoa', 'Hộp', 45000000, 5, 1,
     (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_NIENGRANG'),
     'Bộ khay niềng vật liệu SmartTrack chính hãng Align Technology', 'hoat_dong'),

    -- 4. Nhóm Vật tư tiêu hao cơ bản (Có sản phẩm tồn kho thấp phục vụ API Alerts)
    ('SP_GANGTAY_M', 'Găng tay y tế Nitrile không bột (Size M)', 'vat_tu', 'Hộp', 120000, 0, 10,
     NULL,
     'Găng tay y tế Nitrile không bột chống dị ứng, độ đàn hồi cao', 'hoat_dong'),

    ('SP_KIMTIEM_30G', 'Kim tiêm gây tê nha khoa 30G ngắn', 'dung_cu', 'Hộp', 150000, 3, 10,
     NULL,
     'Kim tiêm nha khoa sử dụng 1 lần tiệt trùng dùng gây tê cục bộ', 'hoat_dong')
ON CONFLICT (ma_san_pham) DO NOTHING;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG PHÁC ĐỒ MẪU (Level 0)
-- 3 template chuẩn: Trồng răng Implant, Niềng răng, Bọc sứ
-- ============================================================================

INSERT INTO phac_do_mau (ma_phac_do_mau, ten_phac_do_mau, mo_ta, trang_thai)
VALUES
    ('PDM_IMPLANT', 'Phác đồ mẫu Cấy ghép Implant đơn lẻ',
     'Quy trình chuẩn y khoa cấy ghép 1 trụ Implant bao gồm khảo sát CT 3D, cấy trụ, cắt chỉ theo dõi và phục hình mão sứ.',
     'hoat_dong'),

    ('PDM_NIENGRANG', 'Phác đồ mẫu Chỉnh nha Niềng răng cố định 2 hàm',
     'Kế hoạch nắn chỉnh răng toàn diện 2 hàm kéo dài từ 12-24 tháng qua 4 giai đoạn gắn mắc cài, siết lực và đeo hàm duy trì.',
     'hoat_dong'),

    ('PDM_BOCSU', 'Phác đồ mẫu Phục hình Bọc răng sứ thẩm mỹ',
     'Quy trình mài cùi răng sinh học, lấy dấu kỹ thuật số và gắn cố định mão răng sứ trong 2 buổi hẹn.',
     'hoat_dong')
ON CONFLICT (ma_phac_do_mau) DO NOTHING;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG KHUYẾN MÃI / VOUCHER (Level 0)
-- ============================================================================

INSERT INTO khuyen_mai (ma_khuyen_mai, ten_chuong_trinh, loai_giam, gia_tri_giam, ngay_bat_dau, ngay_ket_thuc, so_lan_su_dung_toi_da, so_lan_da_su_dung, trang_thai)
VALUES
    ('KM_HE2026', 'Chương trình Ưu Đãi Nụ Cười Mùa Hè 2026', 'phan_tram', 10.00,
     '2026-01-01', '2026-12-31', 100, 0, 'hoat_dong'),

    ('KM_IMPLANT', 'Trợ giá Cấy Ghép Răng Implant Chuyên Sâu', 'so_tien', 2000000.00,
     '2026-01-01', '2026-12-31', 50, 0, 'hoat_dong')
ON CONFLICT (ma_khuyen_mai) DO NOTHING;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG PHÒNG ĐIỀU TRỊ (Level 0)
-- 3 phòng điều trị đa năng, đáp ứng toàn bộ 10 dịch vụ
-- ============================================================================

INSERT INTO phong_dieu_tri (ma_phong, ten_phong, trang_thai, ghi_chu)
VALUES
    ('P101', 'Phòng Nha Khoa 01 (Tầng 1)', 'hoat_dong',
     'Phòng khám & điều trị đa năng 01, ghế nha khoa tiêu chuẩn trang bị đầy đủ dụng cụ khám, trám, tủy, nhổ'),

    ('P102', 'Phòng Nha Khoa 02 (Tầng 1)', 'hoat_dong',
     'Phòng khám & điều trị đa năng 02, ghế nha khoa thẩm mỹ tích hợp máy tẩy trắng và lấy dấu khớp cắn'),

    ('P201', 'Phòng Nha Khoa 03 (Tầng 2)', 'hoat_dong',
     'Phòng khám & điều trị đa năng 03, hệ thống vô trùng cao cấp phục vụ cấy ghép Implant và tiểu phẫu'),

    ('P301', 'Phòng Phẫu Thuật Vô Trùng (Tầng 3)', 'hoat_dong',
     'Phòng phẫu thuật vô khuẩn áp lực dương chuyên sâu phục vụ chỉnh nha và cấy ghép Implant')
ON CONFLICT (ma_phong) DO UPDATE SET
    ten_phong = EXCLUDED.ten_phong,
    trang_thai = EXCLUDED.trang_thai,
    ghi_chu = EXCLUDED.ghi_chu;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG CHI TIẾT DỊCH VỤ (Level 1)
-- 14 mức giá chi tiết cho 7 dịch vụ điều trị thông thường
-- Lưu ý: 3 dịch vụ bán sản phẩm (Niềng răng, Trồng răng Implant, Bọc răng sứ)
-- KHÔNG lưu trong bảng này, mà query trực tiếp danh mục từ bảng `san_pham` qua `dich_vu_id`.
-- Phụ thuộc: dich_vu
-- ============================================================================

INSERT INTO chi_tiet_dich_vu (dich_vu_id, ma_chi_tiet, ten_chi_tiet, gia, don_vi_tinh, trang_thai)
VALUES
    -- 1. Lấy cao răng (DV_CAORANG)
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_CAORANG'),
     'CTDV_CR_NHE', 'Lấy cao răng mức độ nhẹ (cao răng mỏng)', 300000, '2 hàm', 'hoat_dong'),
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_CAORANG'),
     'CTDV_CR_TB', 'Lấy cao răng mức độ trung bình - nặng', 550000, '2 hàm', 'hoat_dong'),
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_CAORANG'),
     'CTDV_CR_COMBO', 'Combo (lấy cao + đánh bóng + thổi cát + fluoride)', 800000, '2 hàm', 'hoat_dong'),

    -- 2. Trám răng (DV_TRAMRANG)
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_TRAMRANG'),
     'CTDV_TR_NHO', 'Trám composite nhỏ - vừa', 600000, '1 răng', 'hoat_dong'),
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_TRAMRANG'),
     'CTDV_TR_LON', 'Trám thẩm mỹ lớn hoặc răng cửa', 1000000, '1 răng', 'hoat_dong'),
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_TRAMRANG'),
     'CTDV_TR_INLAY', 'Trám kỹ thuật cao / Inlay-Onlay sứ', 3500000, '1 răng', 'hoat_dong'),

    -- 3. Nhổ răng thường (DV_NHORANG)
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_NHORANG'),
     'CTDV_NR_SUA', 'Nhổ răng sữa', 200000, '1 răng', 'hoat_dong'),
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_NHORANG'),
     'CTDV_NR_VINH', 'Nhổ răng vĩnh viễn bị lung lay', 700000, '1 răng', 'hoat_dong'),

    -- 4. Nhổ răng khôn (DV_RANGKHON)
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_RANGKHON'),
     'CTDV_RK_TREN', 'Răng khôn hàm trên dễ', 1500000, '1 răng', 'hoat_dong'),
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_RANGKHON'),
     'CTDV_RK_DUOI', 'Răng khôn hàm dưới / tiểu phẫu khó', 3000000, '1 răng', 'hoat_dong'),

    -- 5. Khám tổng quát nha khoa (DV_KHAMTQ)
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_KHAMTQ'),
     'CTDV_KTQ_ALL', 'Khám + tư vấn + chụp phim toàn cảnh', 0, '1 lần khám', 'hoat_dong'),

    -- 6. Điều trị tủy răng (DV_TUYRANG)
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_TUYRANG'),
     'CTDV_TUY_CUA', 'Điều trị tủy răng cửa / nanh', 2200000, '1 răng', 'hoat_dong'),
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_TUYRANG'),
     'CTDV_TUY_TIEN', 'Điều trị tủy răng tiền cối', 3200000, '1 răng', 'hoat_dong'),
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_TUYRANG'),
     'CTDV_TUY_COI', 'Điều trị tủy răng cối lớn', 4500000, '1 răng', 'hoat_dong'),

    -- 8. Tẩy trắng răng (DV_TAYTRANG)
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_TAYTRANG'),
     'CTDV_TT_NHA', 'Tẩy trắng tại nhà (máng + thuốc)', 1500000, '2 hàm / 1 liệu trình', 'hoat_dong'),
    ((SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_TAYTRANG'),
     'CTDV_TT_PHONG', 'Tẩy trắng tại phòng khám (Laser/Plasma)', 2500000, '2 hàm / 1 liệu trình', 'hoat_dong')
ON CONFLICT (ma_chi_tiet) DO UPDATE SET
    ten_chi_tiet = EXCLUDED.ten_chi_tiet,
    gia = EXCLUDED.gia,
    don_vi_tinh = EXCLUDED.don_vi_tinh,
    trang_thai = EXCLUDED.trang_thai;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG BỆNH NHÂN (Level 1)
-- 4 bệnh nhân cụ thể cho 4 kịch bản điều trị
-- Phụ thuộc: tai_khoan
-- ============================================================================

INSERT INTO benh_nhan (tai_khoan_id, ma_benh_nhan, ho_ten, ngay_sinh, gioi_tinh, sdt, email, dia_chi, hinh_anh_url, tien_su_benh, di_ung, ghi_chu)
VALUES
    -- BN 1 (Kịch bản 1: Khám thường - Lấy cao răng + Trám răng composite)
    ((SELECT id FROM tai_khoan WHERE username = 'bn_nguyenan'),
     'BN001', 'Nguyễn Văn An', '1993-05-14', 'nam', '0901112233', 'nguyenvanan93@gmail.com',
     '123 Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội', NULL,
     'Không có tiền sử bệnh tim mạch hay huyết áp', 'Không có dị ứng thuốc đã biết',
     'Bệnh nhân chăm sóc răng miệng đều đặn, đến khám định kỳ vệ sinh và trám kẽ răng sâu'),

    -- BN 2 (Kịch bản 2: Khám thường - Nhổ răng khôn khó + Đơn thuốc + Voucher)
    ((SELECT id FROM tai_khoan WHERE username = 'bn_lethibich'),
     'BN002', 'Lê Thị Bích', '2000-08-20', 'nu', '0902223344', 'bichle2000@gmail.com',
     '45 Nguyễn Trãi, Phường Thượng Đình, Quận Thanh Xuân, Hà Nội', NULL,
     'Đau nhức sưng viêm nướu góc hàm dưới bên trái nhiều đợt', 'Dị ứng nhẹ với thuốc giảm đau Aspirin',
     'Răng số 38 mọc lệch 90 độ đâm vào răng 37, cần tiểu phẫu nhổ sớm'),

    -- BN 3 (Kịch bản 3: Phác đồ Trồng răng Implant Thụy Sĩ - Trả 1 lần trọn gói)
    ((SELECT id FROM tai_khoan WHERE username = 'bn_trancuong'),
     'BN003', 'Trần Quốc Cường', '1970-11-03', 'nam', '0903334455', 'cuongtran1970@gmail.com',
     '78 Trần Duy Hưng, Phường Trung Hòa, Quận Cầu Giấy, Hà Nội', NULL,
     'Mất răng cối 46 lâu năm dẫn đến tiêu xương nhẹ, có tiền sử tăng huyết áp nhẹ đã kiểm soát ổn định', 'Không dị ứng',
     'Mong muốn cấy ghép trụ Implant Thụy Sĩ chất lượng cao nhất, thanh toán trọn gói 1 lần'),

    -- BN 4 (Kịch bản 4: Phác đồ Niềng răng mắc cài kim loại - Trả theo từng đợt)
    ((SELECT id FROM tai_khoan WHERE username = 'bn_hoangdung'),
     'BN004', 'Hoàng Phương Dung', '2004-03-25', 'nu', '0904445566', 'dungphuong2004@gmail.com',
     '12 Chùa Bộc, Phường Quang Trung, Quận Đống Đa, Hà Nội', NULL,
     'Khớp cắn sâu hạng II, răng khấp khểnh hàm trên', 'Không có dị ứng thuốc',
     'Sinh viên đại học, chọn phương án thanh toán theo từng giai đoạn điều trị')
ON CONFLICT (ma_benh_nhan) DO NOTHING;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG NHA SĨ (Level 1)
-- 5 bác sĩ có thể khám và điều trị toàn bộ 10 dịch vụ
-- chuyen_khoa đóng vai trò là thông tin giới thiệu chuyên môn/thế mạnh
-- Phụ thuộc: tai_khoan
-- ============================================================================

INSERT INTO nha_si (tai_khoan_id, ma_nha_si, ho_ten, ngay_sinh, gioi_tinh, sdt, email, dia_chi, hinh_anh_url, chuyen_khoa, gioi_thieu, so_giay_phep, trang_thai)
VALUES
    ((SELECT id FROM tai_khoan WHERE username = 'bs_quang'),
     'NS001', 'BSCKII. Trần Minh Quang', '1978-04-12', 'nam', '0912345601', 'bsquang@dentalclinic.vn',
     'Số 15 Phố Huế, Quận Hai Bà Trưng, Hà Nội', NULL,
     'Phẫu thuật hàm mặt & Cấy ghép Implant chuyên sâu',
     'Hơn 20 năm kinh nghiệm phẫu thuật hàm mặt và phục hình cấy ghép Implant chuyên sâu, tu nghiệp tại CHLB Đức. Đảm nhiệm toàn diện các dịch vụ phẫu thuật và điều trị nha khoa.',
     'CCHN-00124/BYT', 'dang_lam_viec'),

    ((SELECT id FROM tai_khoan WHERE username = 'bs_nam'),
     'NS002', 'ThS.BS. Nguyễn Hoàng Nam', '1985-09-18', 'nam', '0912345602', 'bsnam@dentalclinic.vn',
     'Số 88 Láng Hạ, Quận Đống Đa, Hà Nội', NULL,
     'Chỉnh nha - Niềng răng & Khớp cắn chuyên sâu',
     'Thạc sĩ Chuyên khoa Chỉnh nha Đại học Y Hà Nội, chứng chỉ quốc tế Invisalign Diamond Provider. Khám và điều trị toàn diện 10 dịch vụ của phòng khám.',
     'CCHN-00289/BYT', 'dang_lam_viec'),

    ((SELECT id FROM tai_khoan WHERE username = 'bs_lan'),
     'NS003', 'BSCKI. Lê Thị Mai Lan', '1988-12-05', 'nu', '0912345603', 'bslan@dentalclinic.vn',
     'Số 26 Kim Mã, Quận Ba Đình, Hà Nội', NULL,
     'Phục hình Thẩm mỹ & Thiết kế nụ cười Smile Design',
     'Chuyên gia phục hình răng sứ thẩm mỹ, dán sứ Veneer bảo tồn và nha khoa thẩm mỹ. Đảm nhiệm toàn diện các dịch vụ khám và điều trị tại phòng khám.',
     'CCHN-00351/BYT', 'dang_lam_viec'),

    ((SELECT id FROM tai_khoan WHERE username = 'bs_tuananh'),
     'NS004', 'BS. Phạm Tuấn Anh', '1990-06-22', 'nam', '0912345604', 'bstuananh@dentalclinic.vn',
     'Số 102 Hoàng Cầu, Quận Đống Đa, Hà Nội', NULL,
     'Nội nha (Điều trị tủy vi phẫu) & Nha khoa Tổng quát',
     'Bác sĩ chuyên sâu điều trị nội nha vi phẫu bảo tồn răng thật, trám răng thẩm mỹ và điều trị nha chu. Thực hiện toàn diện các ca khám và điều trị trong hệ thống.',
     'CCHN-00412/BYT', 'dang_lam_viec'),

    ((SELECT id FROM tai_khoan WHERE username = 'bs_haidang'),
     'NS005', 'BS. Vũ Hải Đăng', '1992-10-30', 'nam', '0912345605', 'bshaidang@dentalclinic.vn',
     'Số 55 Nguyễn Chí Thanh, Quận Đống Đa, Hà Nội', NULL,
     'Nha khoa Tổng quát, Tiểu phẫu & Nha khoa Trẻ em',
     'Bác sĩ năng động, tay nghề cao trong nhổ răng khôn không đau, điều trị nha khoa dự phòng và trẻ em. Đáp ứng toàn bộ các dịch vụ lâm sàng của phòng khám.',
     'CCHN-00508/BYT', 'dang_lam_viec')
ON CONFLICT (ma_nha_si) DO NOTHING;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG NHÂN VIÊN (Level 1)
-- 2 Lễ tân kiêm thu ngân / thu hóa đơn
-- Phụ thuộc: tai_khoan
-- ============================================================================

INSERT INTO nhan_vien (tai_khoan_id, ma_nhan_vien, ho_ten, ngay_sinh, gioi_tinh, sdt, email, dia_chi, hinh_anh_url, chuc_vu, trang_thai)
VALUES
    ((SELECT id FROM tai_khoan WHERE username = 'letan_lan'),
     'NV001', 'Đỗ Thị Ngọc Lan', '1996-03-15', 'nu', '0981234001', 'ngoclan.letan@dentalclinic.vn',
     'Số 18 Thái Hà, Quận Đống Đa, Hà Nội', NULL,
     'le_tan', 'dang_lam_viec'),

    ((SELECT id FROM tai_khoan WHERE username = 'letan_hoa'),
     'NV002', 'Vũ Phương Hoa', '1998-07-22', 'nu', '0981234002', 'phuonghoa.letan@dentalclinic.vn',
     'Số 35 Cầu Giấy, Quận Cầu Giấy, Hà Nội', NULL,
     'le_tan', 'dang_lam_viec')
ON CONFLICT (ma_nhan_vien) DO NOTHING;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG GIAI ĐOẠN PHÁC ĐỒ MẪU (Level 1)
-- Các bước giai đoạn trong 3 template phác đồ mẫu: Implant, Niềng răng, Bọc sứ
-- Phụ thuộc: phac_do_mau
-- Lưu ý: ten_dich_vu chỉ lưu text tên dịch vụ định hướng lâm sàng
-- ============================================================================

INSERT INTO giai_doan_phac_do_mau (phac_do_mau_id, buoc_so, ten_giai_doan, ten_dich_vu, mo_ta, thoi_gian_nghi_giua_buoc)
VALUES
    -- 1. Phác đồ mẫu Cấy ghép Implant (PDM_IMPLANT) - 3 bước
    ((SELECT id FROM phac_do_mau WHERE ma_phac_do_mau = 'PDM_IMPLANT'),
     1, 'Khảo sát CT 3D & Phẫu thuật cấy trụ Implant',
     'Trồng răng Implant',
     'Chụp phim CT ConeBeam 3D, lập kế hoạch định vị máng hướng dẫn và cấy ghép trụ titanium vào xương hàm',
     'Nghỉ 7 ngày (cắt chỉ phẫu thuật)'),

    ((SELECT id FROM phac_do_mau WHERE ma_phac_do_mau = 'PDM_IMPLANT'),
     2, 'Tái khám cắt chỉ & Chờ tích hợp xương hàm',
     'Trồng răng Implant',
     'Kiểm tra vết thương, cắt chỉ phẫu thuật và theo dõi quá trình lành thương, tích hợp xương',
     'Chờ 4 tuần (tích hợp xương Straumann)'),

    ((SELECT id FROM phac_do_mau WHERE ma_phac_do_mau = 'PDM_IMPLANT'),
     3, 'Lấy dấu, gắn Abutment & Lắp mão sứ hoàn thiện',
     'Trồng răng Implant',
     'Mở nắp lành thương, gắn khớp nối Abutment, lấy dấu phục hình và gắn cố định mão răng sứ lên trụ',
     'Hoàn tất phác đồ'),

    -- 2. Phác đồ mẫu Niềng răng cố định 2 hàm (PDM_NIENGRANG) - 4 bước
    ((SELECT id FROM phac_do_mau WHERE ma_phac_do_mau = 'PDM_NIENGRANG'),
     1, 'Khám khớp cắn, lấy dấu & Gắn mắc cài 2 hàm',
     'Niềng răng',
     'Khám lâm sàng, chụp phim Cephalo/Panorama, lấy dấu mẫu hàm kỹ thuật số và gắn bộ mắc cài 2 hàm',
     'Nghỉ 3 - 4 tuần (tái khám siết lực đợt 1)'),

    ((SELECT id FROM phac_do_mau WHERE ma_phac_do_mau = 'PDM_NIENGRANG'),
     2, 'Tinh chỉnh khớp cắn & Thay thun / Dây cung đợt 1',
     'Niềng răng',
     'Kiểm tra độ di chuyển răng, thay dây cung NiTi kích hoạt nhiệt và thay thun chuỗi đóng khoảng',
     'Nghỉ 3 - 4 tuần (tái khám siết lực đợt 2)'),

    ((SELECT id FROM phac_do_mau WHERE ma_phac_do_mau = 'PDM_NIENGRANG'),
     3, 'Siết lực đóng khoảng & Tinh chỉnh trục răng đợt 2',
     'Niềng răng',
     'Thay dây cung thép Stainless Steel, kích hoạt lò xo kéo đóng khoảng nhổ răng và chỉnh trục thân răng',
     'Nghỉ 3 - 4 tuần (tinh chỉnh khớp cắn & tháo mắc cài)'),

    ((SELECT id FROM phac_do_mau WHERE ma_phac_do_mau = 'PDM_NIENGRANG'),
     4, 'Tháo mắc cài, vệ sinh & Bàn giao hàm duy trì',
     'Niềng răng',
     'Tháo gỡ toàn bộ hệ thống mắc cài, đánh bóng bề mặt men răng và bàn giao máng duy trì chống tái phát',
     'Tái khám kiểm tra hàm duy trì sau 3 tháng'),

    -- 3. Phác đồ mẫu Bọc răng sứ thẩm mỹ (PDM_BOCSU) - 2 bước
    ((SELECT id FROM phac_do_mau WHERE ma_phac_do_mau = 'PDM_BOCSU'),
     1, 'Mài cùi răng sinh học, lấy dấu & Gắn răng tạm',
     'Bọc răng sứ',
     'Gây tê, mài cùi răng sinh học theo tỷ lệ an toàn, lấy dấu cao su chính xác và gắn răng tạm bảo vệ',
     'Nghỉ 3 ngày (chờ Labo chế tác mão sứ)'),

    ((SELECT id FROM phac_do_mau WHERE ma_phac_do_mau = 'PDM_BOCSU'),
     2, 'Thử sườn, gắn cố định mão răng sứ & Chỉnh khớp cắn',
     'Bọc răng sứ',
     'Thử độ khít sát viền nướu, màu sắc thẩm mỹ, gắn cố định bằng cement nha khoa chuyên dụng và tinh chỉnh khớp cắn',
     'Hoàn tất phác đồ')
ON CONFLICT (phac_do_mau_id, buoc_so) DO UPDATE SET
    ten_giai_doan = EXCLUDED.ten_giai_doan,
    ten_dich_vu = EXCLUDED.ten_dich_vu,
    mo_ta = EXCLUDED.mo_ta,
    thoi_gian_nghi_giua_buoc = EXCLUDED.thoi_gian_nghi_giua_buoc;

-- ============================================================================
-- 12. AUDIT LOG (Level 1) - FILE TRỐNG
-- Bảng audit_log được hệ thống tự động ghi nhận thông qua Database Triggers.
-- Dữ liệu sẽ được tự sinh ra khi có các thao tác INSERT / UPDATE / DELETE trên các bảng nghiệp vụ.
-- ============================================================================

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG KHUNG CA LÀM VIỆC CỐ ĐỊNH THEO TUẦN (Template Frame - Level 2)
-- Khung ca mẫu 1 tuần cho 5 nha sĩ tại 4 phòng điều trị (56 ca trực mẫu)
-- Quy chuẩn: 2 ca/ngày (Sáng: 08:00 - 12:00, Chiều: 13:30 - 17:30)
-- Thứ trong tuần: 2 = Thứ Hai, 3 = Thứ Ba, 4 = Thứ Tư, 5 = Thứ Năm, 6 = Thứ Sáu, 7 = Thứ Bảy, 8 = Chủ Nhật
-- Phụ thuộc: nha_si, phong_dieu_tri
-- ============================================================================

INSERT INTO khung_ca_lam_viec (thu_trong_tuan, gio_bat_dau, gio_ket_thuc, phong_dieu_tri_id, nha_si_id, ghi_chu)
VALUES
    -- Thứ Hai (2)
    (2, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), 'Khung ca Thứ Hai - Sáng'),
    (2, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), 'Khung ca Thứ Hai - Sáng'),
    (2, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), 'Khung ca Thứ Hai - Sáng'),
    (2, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), 'Khung ca Thứ Hai - Sáng'),
    (2, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), 'Khung ca Thứ Hai - Chiều'),
    (2, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), 'Khung ca Thứ Hai - Chiều'),
    (2, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), 'Khung ca Thứ Hai - Chiều'),
    (2, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), 'Khung ca Thứ Hai - Chiều'),

    -- Thứ Ba (3)
    (3, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), 'Khung ca Thứ Ba - Sáng'),
    (3, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), 'Khung ca Thứ Ba - Sáng'),
    (3, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), 'Khung ca Thứ Ba - Sáng'),
    (3, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), 'Khung ca Thứ Ba - Sáng'),
    (3, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), 'Khung ca Thứ Ba - Chiều'),
    (3, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), 'Khung ca Thứ Ba - Chiều'),
    (3, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), 'Khung ca Thứ Ba - Chiều'),
    (3, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), 'Khung ca Thứ Ba - Chiều'),

    -- Thứ Tư (4)
    (4, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), 'Khung ca Thứ Tư - Sáng'),
    (4, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), 'Khung ca Thứ Tư - Sáng'),
    (4, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), 'Khung ca Thứ Tư - Sáng'),
    (4, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), 'Khung ca Thứ Tư - Sáng'),
    (4, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), 'Khung ca Thứ Tư - Chiều'),
    (4, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), 'Khung ca Thứ Tư - Chiều'),
    (4, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), 'Khung ca Thứ Tư - Chiều'),
    (4, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), 'Khung ca Thứ Tư - Chiều'),

    -- Thứ Năm (5)
    (5, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), 'Khung ca Thứ Năm - Sáng'),
    (5, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), 'Khung ca Thứ Năm - Sáng'),
    (5, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), 'Khung ca Thứ Năm - Sáng'),
    (5, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), 'Khung ca Thứ Năm - Sáng'),
    (5, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), 'Khung ca Thứ Năm - Chiều'),
    (5, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), 'Khung ca Thứ Năm - Chiều'),
    (5, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), 'Khung ca Thứ Năm - Chiều'),
    (5, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), 'Khung ca Thứ Năm - Chiều'),

    -- Thứ Sáu (6)
    (6, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), 'Khung ca Thứ Sáu - Sáng'),
    (6, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), 'Khung ca Thứ Sáu - Sáng'),
    (6, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), 'Khung ca Thứ Sáu - Sáng'),
    (6, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), 'Khung ca Thứ Sáu - Sáng'),
    (6, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), 'Khung ca Thứ Sáu - Chiều'),
    (6, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), 'Khung ca Thứ Sáu - Chiều'),
    (6, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), 'Khung ca Thứ Sáu - Chiều'),
    (6, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), 'Khung ca Thứ Sáu - Chiều'),

    -- Thứ Bảy (7)
    (7, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), 'Khung ca Thứ Bảy - Sáng'),
    (7, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), 'Khung ca Thứ Bảy - Sáng'),
    (7, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), 'Khung ca Thứ Bảy - Sáng'),
    (7, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), 'Khung ca Thứ Bảy - Sáng'),
    (7, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), 'Khung ca Thứ Bảy - Chiều'),
    (7, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), 'Khung ca Thứ Bảy - Chiều'),
    (7, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), 'Khung ca Thứ Bảy - Chiều'),
    (7, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), 'Khung ca Thứ Bảy - Chiều'),

    -- Chủ Nhật (8)
    (8, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), 'Khung ca Chủ Nhật - Sáng'),
    (8, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), 'Khung ca Chủ Nhật - Sáng'),
    (8, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), 'Khung ca Chủ Nhật - Sáng'),
    (8, '08:00:00', '12:00:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), 'Khung ca Chủ Nhật - Sáng'),
    (8, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), 'Khung ca Chủ Nhật - Chiều'),
    (8, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), 'Khung ca Chủ Nhật - Chiều'),
    (8, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), 'Khung ca Chủ Nhật - Chiều'),
    (8, '13:30:00', '17:30:00', (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), (SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), 'Khung ca Chủ Nhật - Chiều')
ON CONFLICT (thu_trong_tuan, gio_bat_dau, phong_dieu_tri_id) DO UPDATE SET
    nha_si_id = EXCLUDED.nha_si_id,
    gio_ket_thuc = EXCLUDED.gio_ket_thuc,
    ghi_chu = EXCLUDED.ghi_chu;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG CA LÀM VIỆC CỐ ĐỊNH THEO TUẦN (Level 2)
-- Áp dụng khung lịch tuần cố định (Weekly Fixed Shift Template) lặp lại chính xác
-- Phủ sóng 3 tuần liên tiếp (21 ngày: 28/09/2026 - 18/10/2026) cho 5 nha sĩ tại 4 phòng khám
-- Quy chuẩn: 2 ca/ngày (Sáng: 08:00 - 12:00, Chiều: 13:30 - 17:30)
-- Thỏa mãn 100% Exclusion Constraints (không trùng bác sĩ, không trùng phòng)
-- Khớp 100% với toàn bộ 6 lịch hẹn lâm sàng của bệnh nhân!
-- Phụ thuộc: nha_si, phong_dieu_tri
-- ============================================================================

INSERT INTO ca_lam_viec (nha_si_id, phong_dieu_tri_id, ngay, gio_bat_dau, gio_ket_thuc, trang_thai)
VALUES
    -- Ngày: 2026-09-28 (Thứ Hai)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-09-28', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-09-28', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-09-28', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-09-28', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-09-28', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-09-28', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-09-28', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-09-28', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-09-29 (Thứ Ba)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-09-29', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-09-29', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-09-29', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-09-29', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-09-29', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-09-29', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-09-29', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-09-29', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-09-30 (Thứ Tư)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-09-30', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-09-30', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-09-30', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-09-30', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-09-30', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-09-30', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-09-30', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-09-30', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-01 (Thứ Năm)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-01', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-01', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-01', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-01', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-01', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-01', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-01', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-01', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-02 (Thứ Sáu)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-02', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-02', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-02', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-02', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-02', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-02', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-02', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-02', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-03 (Thứ Bảy)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-03', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-03', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-03', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-03', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-03', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-03', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-03', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-03', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-04 (Chủ Nhật)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-04', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-04', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-04', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-04', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-04', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-04', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-04', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-04', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-05 (Thứ Hai)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-05', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-05', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-05', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-05', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-05', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-05', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-05', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-05', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-06 (Thứ Ba)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-06', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-06', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-06', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-06', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-06', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-06', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-06', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-06', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-07 (Thứ Tư)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-07', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-07', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-07', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-07', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-07', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-07', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-07', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-07', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-08 (Thứ Năm)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-08', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-08', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-08', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-08', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-08', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-08', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-08', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-08', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-09 (Thứ Sáu)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-09', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-09', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-09', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-09', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-09', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-09', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-09', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-09', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-10 (Thứ Bảy)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-10', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-10', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-10', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-10', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-10', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-10', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-10', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-10', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-11 (Chủ Nhật)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-11', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-11', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-11', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-11', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-11', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-11', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-11', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-11', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-12 (Thứ Hai)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-12', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-12', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-12', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-12', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-12', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-12', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-12', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-12', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-13 (Thứ Ba)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-13', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-13', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-13', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-13', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-13', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-13', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-13', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-13', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-14 (Thứ Tư)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-14', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-14', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-14', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-14', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-14', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-14', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-14', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-14', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-15 (Thứ Năm)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-15', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-15', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-15', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-15', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-15', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-15', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-15', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-15', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-16 (Thứ Sáu)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-16', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-16', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-16', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-16', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-16', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-16', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-16', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-16', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-17 (Thứ Bảy)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-17', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-17', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-17', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-17', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-17', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-17', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-17', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-17', '13:30:00', '17:30:00', 'chua_dien_ra'),
    -- Ngày: 2026-10-18 (Chủ Nhật)
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-18', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-18', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-18', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-18', '08:00:00', '12:00:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P101'), '2026-10-18', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P102'), '2026-10-18', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P201'), '2026-10-18', '13:30:00', '17:30:00', 'chua_dien_ra'),
    ((SELECT id FROM nha_si WHERE ma_nha_si = 'NS005'), (SELECT id FROM phong_dieu_tri WHERE ma_phong = 'P301'), '2026-10-18', '13:30:00', '17:30:00', 'chua_dien_ra');

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG PHÁC ĐỒ ĐIỀU TRỊ (Level 2)
-- Tạo 3 phác đồ điều trị cho 3 bệnh nhân:
-- 1. BN003 (Trần Quốc Cường): Cấy ghép Implant - Trả trọn gói (tron_goi)
-- 2. BN004 (Hoàng Phương Dung): Niềng răng mắc cài - Trả từng giai đoạn (tung_giai_doan)
-- 3. BN002 (Lê Thị Bích): Bọc răng sứ thẩm mỹ - Trả từng giai đoạn (tung_giai_doan)
-- (BN001 khám lẻ dịch vụ thường nên không tạo phác đồ)
-- Phụ thuộc: benh_nhan, nha_si, phac_do_mau
-- ============================================================================

INSERT INTO phac_do_dieu_tri (
    ma_phac_do, benh_nhan_id, nha_si_id, phac_do_mau_id, ten_phac_do,
    chan_doan_ban_dau, hinh_thuc_thanh_toan, trang_thai,
    ngay_bat_dau, ngay_du_kien_hoan_thanh, ngay_hoan_thanh_thuc_te, ghi_chu
)
VALUES
    -- 1. Phác đồ Cấy ghép Implant (BN003 - Trả trọn gói)
    (
        'PDT_IMPLANT_001',
        (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN003'),
        (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'),
        (SELECT id FROM phac_do_mau WHERE ma_phac_do_mau = 'PDM_IMPLANT'),
        'Phác đồ Cấy ghép Implant đơn lẻ răng 36',
        'Mất răng 36 do sâu răng vỡ lớn đã nhổ 6 tháng trước, tiêu xương ổ răng nhẹ. Chỉ định cấy ghép 01 trụ Implant Straumann Thụy Sĩ kết hợp phục hình mão toàn sứ Cercon.',
        'tron_goi',
        'dang_dieu_tri',
        '2026-10-06',
        '2026-11-15',
        NULL,
        'Bệnh nhân thanh toán 100% trọn gói ngay giai đoạn 1 để hưởng gói bảo hành trọn đời và ưu đãi giảm giá.'
    ),

    -- 2. Phác đồ Niềng răng mắc cài (BN004 - Trả từng giai đoạn)
    (
        'PDT_NIENGRANG_001',
        (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN004'),
        (SELECT id FROM nha_si WHERE ma_nha_si = 'NS003'),
        (SELECT id FROM phac_do_mau WHERE ma_phac_do_mau = 'PDM_NIENGRANG'),
        'Phác đồ Chỉnh nha mắc cài kim loại tự buộc 2 hàm',
        'Sai khớp cắn hạng II, răng chen chúc cung hàm trên và lệch lạc nhẹ cung hàm dưới. Chỉ định niềng răng mắc cài kim loại tự buộc 2 hàm, theo dõi định kỳ 3 - 4 tuần/lần.',
        'tung_giai_doan',
        'dang_dieu_tri',
        '2026-10-07',
        '2027-10-07',
        NULL,
        'Bệnh nhân lựa chọn thanh toán trả theo 4 giai đoạn tiến độ điều trị.'
    ),

    -- 3. Phác đồ Bọc răng sứ thẩm mỹ (BN002 - Phác đồ hoàn thành ngắn nhất, bắt đầu 02/10 và kết thúc 06/10)
    (
        'PDT_BOCSU_001',
        (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN002'),
        (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'),
        (SELECT id FROM phac_do_mau WHERE ma_phac_do_mau = 'PDM_BOCSU'),
        'Phác đồ Phục hình Bọc 4 răng sứ Cercon HT hàm trên',
        'Răng 11, 12, 21, 22 nhiễm màu tetracycline độ 3, mòn cổ răng, hình thể răng ngắn. Chỉ định mài cùi phục hình bọc 4 răng toàn sứ cao cấp Cercon HT.',
        'tung_giai_doan',
        'hoan_thanh',
        '2026-10-02',
        '2026-10-06',
        '2026-10-06',
        'Bệnh nhân đã hoàn thành cả 2 giai đoạn: Giai đoạn 1 mài cùi ngày 02/10 (tạm ứng 50%), Giai đoạn 2 lắp mão ngày 06/10 (thanh toán 50% còn lại).'
    )
ON CONFLICT (ma_phac_do) DO UPDATE SET
    ten_phac_do = EXCLUDED.ten_phac_do,
    chan_doan_ban_dau = EXCLUDED.chan_doan_ban_dau,
    hinh_thuc_thanh_toan = EXCLUDED.hinh_thuc_thanh_toan,
    trang_thai = EXCLUDED.trang_thai,
    ngay_bat_dau = EXCLUDED.ngay_bat_dau,
    ngay_du_kien_hoan_thanh = EXCLUDED.ngay_du_kien_hoan_thanh,
    ngay_hoan_thanh_thuc_te = EXCLUDED.ngay_hoan_thanh_thuc_te,
    ghi_chu = EXCLUDED.ghi_chu;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG LỊCH HẸN (Level 3)
-- Tạo lịch hẹn cho 4 ca bệnh nhân:
-- 1. BN002 (Lê Thị Bích): Bọc răng sứ (Đã hoàn thành xong 2/2 giai đoạn -> 2 lịch hẹn 'da_kham')
-- 2. BN003 (Trần Quốc Cường): Cấy ghép Implant (Đã xong 1 giai đoạn -> GĐ1: 'da_kham', GĐ2: 'da_xac_nhan')
-- 3. BN004 (Hoàng Phương Dung): Niềng răng mắc cài (Mới tạo, chưa xong giai đoạn nào -> GĐ1: 'da_xac_nhan')
-- 4. BN001 (Nguyễn Văn An): Khám chữa dịch vụ lẻ không phác đồ -> 'da_kham'
-- Phụ thuộc: benh_nhan, ca_lam_viec, dich_vu
-- ============================================================================

INSERT INTO lich_hen (
    ma_lich_hen, benh_nhan_id, ca_lam_viec_id, dich_vu_id,
    ngay_hen, gio_hen, gio_ket_thuc_du_kien, trang_thai, ghi_chu
)
VALUES
    -- ========================================================================
    -- 1. BN002 (Lê Thị Bích) - Phác đồ Bọc răng sứ (Hoàn tất 2 giai đoạn)
    -- ========================================================================
    -- Giai đoạn 1: Mài cùi răng, lấy dấu (02/10/2026 - Đã khám)
    (
        'LH_BOCSU_01',
        (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN002'),
        (SELECT id FROM ca_lam_viec 
         WHERE nha_si_id = (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002') 
           AND ngay = '2026-10-02' 
           AND gio_bat_dau = '08:00:00'),
        (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_BOCSU'),
        '2026-10-02', '08:30:00', '10:30:00', 'da_kham',
        'GĐ1 Bọc sứ: Mài cùi răng sinh học, lấy dấu 4 răng cửa hàm trên và gắn răng tạm bảo vệ.'
    ),

    -- Giai đoạn 2: Lắp mão toàn sứ Cercon HT hoàn thiện (06/10/2026 - Đã khám)
    (
        'LH_BOCSU_02',
        (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN002'),
        (SELECT id FROM ca_lam_viec 
         WHERE nha_si_id = (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002') 
           AND ngay = '2026-10-06' 
           AND gio_bat_dau = '13:30:00'),
        (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_BOCSU'),
        '2026-10-06', '14:00:00', '16:00:00', 'da_kham',
        'GĐ2 Bọc sứ: Thử sườn, gắn cố định 4 mão sứ Cercon HT và chỉnh khớp cắn hoàn tất phác đồ.'
    ),

    -- ========================================================================
    -- 2. BN003 (Trần Quốc Cường) - Phác đồ Implant (Đã xong GĐ1, GĐ2 chưa khám)
    -- ========================================================================
    -- Giai đoạn 1: Khảo sát CT 3D & Phẫu thuật cấy trụ (06/10/2026 - Đã khám)
    (
        'LH_IMPLANT_01',
        (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN003'),
        (SELECT id FROM ca_lam_viec 
         WHERE nha_si_id = (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001') 
           AND ngay = '2026-10-06' 
           AND gio_bat_dau = '08:00:00'),
        (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_IMPLANT'),
        '2026-10-06', '08:30:00', '11:00:00', 'da_kham',
        'GĐ1 Cấy ghép Implant: Khảo sát CT 3D & Phẫu thuật cấy trụ Implant Straumann Thụy Sĩ răng 36.'
    ),

    -- Giai đoạn 2: Tái khám cắt chỉ & kiểm tra lành thương (12/10/2026 - Đã xác nhận, chưa khám)
    (
        'LH_IMPLANT_02',
        (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN003'),
        (SELECT id FROM ca_lam_viec 
         WHERE nha_si_id = (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001') 
           AND ngay = '2026-10-12' 
           AND gio_bat_dau = '08:00:00'),
        (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_IMPLANT'),
        '2026-10-12', '09:00:00', '10:00:00', 'da_xac_nhan',
        'GĐ2 Cấy ghép Implant: Tái khám cắt chỉ và kiểm tra lành thương trụ Implant.'
    ),

    -- ========================================================================
    -- 3. BN004 (Hoàng Phương Dung) - Phác đồ Niềng răng (Mới tạo, chưa xong giai đoạn nào)
    -- ========================================================================
    -- Giai đoạn 1: Gắn mắc cài 2 hàm (10/10/2026 - Đã xác nhận, chưa khám)
    (
        'LH_NIENGRANG_01',
        (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN004'),
        (SELECT id FROM ca_lam_viec 
         WHERE nha_si_id = (SELECT id FROM nha_si WHERE ma_nha_si = 'NS003') 
           AND ngay = '2026-10-10' 
           AND gio_bat_dau = '08:00:00'),
        (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_NIENGRANG'),
        '2026-10-10', '08:30:00', '11:00:00', 'da_xac_nhan',
        'GĐ1 Niềng răng: Khám khớp cắn, lấy dấu kỹ thuật số và gắn bộ mắc cài kim loại tự buộc 2 hàm.'
    ),

    -- ========================================================================
    -- 4. BN001 (Nguyễn Văn An) - Khám dịch vụ lẻ không theo phác đồ
    -- ========================================================================
    -- Khám tổng quát & Lấy cao răng (05/10/2026 - Đã khám)
    (
        'LH_KHAMLE_01',
        (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN001'),
        (SELECT id FROM ca_lam_viec 
         WHERE nha_si_id = (SELECT id FROM nha_si WHERE ma_nha_si = 'NS004') 
           AND ngay = '2026-10-05' 
           AND gio_bat_dau = '08:00:00'),
        (SELECT id FROM dich_vu WHERE ma_dich_vu = 'DV_CAORANG'),
        '2026-10-05', '08:30:00', '10:00:00', 'da_kham',
        'Khám tổng quát, lấy cao răng mức độ nhẹ và trám răng composite.'
    )
ON CONFLICT (ma_lich_hen) DO UPDATE SET
    ca_lam_viec_id = EXCLUDED.ca_lam_viec_id,
    dich_vu_id = EXCLUDED.dich_vu_id,
    ngay_hen = EXCLUDED.ngay_hen,
    gio_hen = EXCLUDED.gio_hen,
    gio_ket_thuc_du_kien = EXCLUDED.gio_ket_thuc_du_kien,
    trang_thai = EXCLUDED.trang_thai,
    ghi_chu = EXCLUDED.ghi_chu;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG HỒ SƠ BỆNH ÁN (Level 4)
-- Tạo hồ sơ bệnh án cho 4 buổi khám đã hoàn thành (trang_thai = 'da_kham'):
-- 1. HSBA_KHAMLE_01: BN001 (05/10/2026) - Khám tổng quát, lấy cao răng, trám composite
-- 2. HSBA_BOCSU_01: BN002 (02/10/2026) - Bọc sứ GĐ1: Mài cùi răng, lấy dấu, gắn răng tạm
-- 3. HSBA_BOCSU_02: BN002 (06/10/2026) - Bọc sứ GĐ2: Lắp 4 mão sứ Cercon HT hoàn thiện
-- 4. HSBA_IMPLANT_01: BN003 (06/10/2026) - Implant GĐ1: Phẫu thuật cấy trụ Straumann SLA Thụy Sĩ răng 36
-- Phụ thuộc: lich_hen (1:1 qua lich_hen_id)
-- ============================================================================

INSERT INTO ho_so_benh_an (
    ma_ho_so, lich_hen_id, chan_doan, phuong_phap_dieu_tri,
    ket_qua, loi_dan, ngay_kham, ngay_tai_kham, tinh_trang_rang_mieng, ghi_chu
)
VALUES
    -- 1. BN001: Khám tổng quát & Lấy cao răng (LH_KHAMLE_01)
    (
        'HSBA_KHAMLE_01',
        (SELECT id FROM lich_hen WHERE ma_lich_hen = 'LH_KHAMLE_01'),
        'Vôi răng bám mảng bám độ 1, sâu men răng 16 (xoang I nhỏ)',
        'Lấy cao răng siêu âm 2 hàm, đánh bóng men răng, làm sạch xoang sâu và trám phục hồi composite 3M Z250',
        'Sạch mảng bám vôi răng, mối trám thẩm mỹ khít sát, không cộm cắn',
        'Tránh nhai đồ quá cứng trong 24h đầu, chải răng đúng cách ngày 2 lần, tái khám sau 6 tháng',
        '2026-10-05', '2027-04-05',
        'Nướu hồng hào, không chảy máu, vệ sinh răng miệng mức độ khá',
        'Bệnh nhân tuân thủ tốt, đã kê đơn dặn dò vệ sinh kỹ lưỡng'
    ),

    -- 2. BN002: Bọc sứ Giai đoạn 1 (LH_BOCSU_01)
    (
        'HSBA_BOCSU_01',
        (SELECT id FROM lich_hen WHERE ma_lich_hen = 'LH_BOCSU_01'),
        'Răng 11, 12, 21, 22 nhiễm màu tetracycline độ 3, hình thể răng ngắn, mòn men cổ răng',
        'Gây tê cục bộ, mài cùi sinh học bảo tồn tủy 4 răng cửa trên, lấy dấu cao su chính xác chuyển Labo và gắn răng tạm bảo vệ',
        'Cùi răng mài đúng trục giải phẫu, bờ vai khít sát, tủy răng an toàn, răng tạm lưu giữ tốt',
        'Ăn đồ mềm, không cắn xé đồ cứng bằng răng tạm, súc miệng nước muối ấm, hẹn 4 ngày sau lắp răng sứ',
        '2026-10-02', '2026-10-06',
        'Răng tạm ổn định, nướu viền lành thương tốt',
        'Labo cam kết giao 4 mão Cercon HT chuẩn màu A1 vào sáng ngày 06/10'
    ),

    -- 3. BN002: Bọc sứ Giai đoạn 2 (LH_BOCSU_02)
    (
        'HSBA_BOCSU_02',
        (SELECT id FROM lich_hen WHERE ma_lich_hen = 'LH_BOCSU_02'),
        'Hậu phục hình mài cùi 4 răng cửa hàm trên, khớp cắn ổn định',
        'Tháo răng tạm, vệ sinh cùi răng, thử sườn 4 mão sứ Cercon HT, kiểm tra tiếp xúc điểm và gắn cố định bằng cement RelyX Luting 2, tinh chỉnh khớp cắn',
        'Mão sứ Cercon HT màu sắc tự nhiên A1, khít sát đường hoàn tất, khớp cắn chuẩn, bệnh nhân rất hài lòng',
        'Ăn nhai nhẹ nhàng trong ngày đầu, sử dụng chỉ nha khoa vệ sinh kẽ răng, bảo hành răng sứ 10 năm',
        '2026-10-06', '2027-04-06',
        'Thẩm mỹ hoàn hảo, nướu ôm sát viền mão sứ, không cộm cắn',
        'Hoàn tất toàn bộ phác đồ bọc 4 răng sứ Cercon HT, bàn giao thẻ bảo hành chính hãng'
    ),

    -- 4. BN003: Implant Giai đoạn 1 (LH_IMPLANT_01)
    (
        'HSBA_IMPLANT_01',
        (SELECT id FROM lich_hen WHERE ma_lich_hen = 'LH_IMPLANT_01'),
        'Mất răng 36, tiêu xương ổ răng nhẹ, mật độ xương D2 thích hợp cấy ghép Implant',
        'Gây tê tại chỗ, rạch vạt bộc lộ xương, khoan xương theo trình tự tiêu chuẩn và cấy ghép 01 trụ Implant Straumann SLA Thụy Sĩ (đường kính 4.1mm, dài 10mm), vặn nắp lành thương healing cap và khâu đóng vết mổ',
        'Trụ Implant đạt lực siết sơ khởi (ISQ 75, torque 35 Ncm), vị trí lý tưởng, vết mổ khâu kín',
        'Cắn chặt gạc 45 phút, chườm lạnh ngoài má 24h đầu, uống thuốc theo toa, ăn đồ mềm nguội, không súc miệng mạnh, tái khám cắt chỉ sau 7 ngày',
        '2026-10-06', '2026-10-12',
        'Huyệt ổ răng 36 lành thương ban đầu tốt, không chảy máu thêm',
        'Phẫu thuật thành công mỹ mãn, hẹn cắt chỉ ngày 12/10/2026'
    )
ON CONFLICT (ma_ho_so) DO UPDATE SET
    chan_doan = EXCLUDED.chan_doan,
    phuong_phap_dieu_tri = EXCLUDED.phuong_phap_dieu_tri,
    ket_qua = EXCLUDED.ket_qua,
    loi_dan = EXCLUDED.loi_dan,
    ngay_kham = EXCLUDED.ngay_kham,
    ngay_tai_kham = EXCLUDED.ngay_tai_kham,
    tinh_trang_rang_mieng = EXCLUDED.tinh_trang_rang_mieng,
    ghi_chu = EXCLUDED.ghi_chu;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG HÓA ĐƠN (Level 4)
-- Tạo 4 hóa đơn tương ứng cho 4 buổi khám đã hoàn thành:
-- 1. HD_KHAMLE_01: BN001 (05/10/2026) - Tiền mặt, áp voucher KM_CHAOMUNG giảm 10%
-- 2. HD_BOCSU_01: BN002 (02/10/2026) - Bọc sứ GĐ1: Chi phí 0 VNĐ (dịch vụ chuẩn bị đi kèm)
-- 3. HD_BOCSU_02: BN002 (06/10/2026) - Bọc sứ GĐ2: Chi phí 24.000.000 VNĐ (4 mão sứ Cercon HT), chuyển khoản
-- 4. HD_IMPLANT_01: BN003 (06/10/2026) - Implant GĐ1: Trả trọn gói trụ Straumann 38.000.000 VNĐ, áp KM_TRIAN giảm 1.000.000 VNĐ
-- Phụ thuộc: lich_hen, nhan_vien, phac_do_dieu_tri (optional), khuyen_mai (optional)
-- ============================================================================

INSERT INTO hoa_don (
    ma_hoa_don, lich_hen_id, phac_do_dieu_tri_id, nhan_vien_id,
    khuyen_mai_id, phuong_thuc_thanh_toan, trang_thai_thanh_toan,
    ngay_lap, ngay_thanh_toan, ghi_chu
)
VALUES
    -- 1. Hóa đơn khám lẻ BN001 (LH_KHAMLE_01)
    (
        'HD_KHAMLE_01',
        (SELECT id FROM lich_hen WHERE ma_lich_hen = 'LH_KHAMLE_01'),
        NULL,
        (SELECT id FROM nhan_vien WHERE ma_nhan_vien = 'NV001'),
        (SELECT id FROM khuyen_mai WHERE ma_khuyen_mai = 'KM_HE2026'),
        'tien_mat',
        'da_thanh_toan',
        '2026-10-05 10:00:00+07',
        '2026-10-05 10:05:00+07',
        'Thu phí khám tổng quát + lấy cao răng + trám composite. Áp voucher mùa hè giảm 10%.'
    ),

    -- 2. Hóa đơn Bọc sứ GĐ1 BN002 (LH_BOCSU_01) - 0 VNĐ (Thanh toán theo giai đoạn: phac_do_dieu_tri_id = NULL)
    (
        'HD_BOCSU_01',
        (SELECT id FROM lich_hen WHERE ma_lich_hen = 'LH_BOCSU_01'),
        NULL,
        (SELECT id FROM nhan_vien WHERE ma_nhan_vien = 'NV001'),
        NULL,
        'chuyen_khoan',
        'da_thanh_toan',
        '2026-10-02 10:30:00+07',
        '2026-10-02 10:35:00+07',
        'Giai đoạn 1 mài cùi lấy dấu và gắn răng tạm: Chi phí 0 VNĐ (dịch vụ đi kèm trọn gói bọc răng sứ).'
    ),

    -- 3. Hóa đơn Bọc sứ GĐ2 BN002 (LH_BOCSU_02) - 24.000.000 VNĐ (Thanh toán theo giai đoạn: phac_do_dieu_tri_id = NULL)
    (
        'HD_BOCSU_02',
        (SELECT id FROM lich_hen WHERE ma_lich_hen = 'LH_BOCSU_02'),
        NULL,
        (SELECT id FROM nhan_vien WHERE ma_nhan_vien = 'NV002'),
        NULL,
        'chuyen_khoan',
        'da_thanh_toan',
        '2026-10-06 16:00:00+07',
        '2026-10-06 16:05:00+07',
        'Giai đoạn 2 lắp 4 mão toàn sứ Cercon HT: 24.000.000 VNĐ (4 x 6.000.000đ), thanh toán chuyển khoản hoàn tất phác đồ.'
    ),

    -- 4. Hóa đơn Implant Trả trọn gói 1 lần BN003 (LH_IMPLANT_01) - Tổng toàn bộ 44.000.000 VNĐ
    (
        'HD_IMPLANT_01',
        (SELECT id FROM lich_hen WHERE ma_lich_hen = 'LH_IMPLANT_01'),
        (SELECT id FROM phac_do_dieu_tri WHERE ma_phac_do = 'PDT_IMPLANT_001'),
        (SELECT id FROM nhan_vien WHERE ma_nhan_vien = 'NV001'),
        (SELECT id FROM khuyen_mai WHERE ma_khuyen_mai = 'KM_IMPLANT'),
        'chuyen_khoan',
        'da_thanh_toan',
        '2026-10-06 11:00:00+07',
        '2026-10-06 11:10:00+07',
        'Thanh toán trọn gói 1 lần toàn bộ phác đồ Implant răng 36 (Trụ Straumann SLA 38tr + Mão Cercon HT 6tr = 44.000.000 VNĐ). Áp voucher KM_IMPLANT giảm 2.000.000 VNĐ. Các buổi khám sau chỉ ghi nhận hồ sơ bệnh án và vật tư, không xuất hóa đơn.'
    )
ON CONFLICT (ma_hoa_don) DO UPDATE SET
    phuong_thuc_thanh_toan = EXCLUDED.phuong_thuc_thanh_toan,
    trang_thai_thanh_toan = EXCLUDED.trang_thai_thanh_toan,
    ngay_lap = EXCLUDED.ngay_lap,
    ngay_thanh_toan = EXCLUDED.ngay_thanh_toan,
    ghi_chu = EXCLUDED.ghi_chu;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG GIAI ĐOẠN PHÁC ĐỒ (Level 4)
-- Cá nhân hóa các giai đoạn từ phác đồ mẫu:
-- 1. PDT_BOCSU_001 (BN002): 2 giai đoạn (GĐ1: 0đ - hoàn thành; GĐ2: 24tr - hoàn thành)
-- 2. PDT_IMPLANT_001 (BN003): 3 giai đoạn (GĐ1: 38tr - hoàn thành; GĐ2: 0đ - chưa khám; GĐ3: 6tr - chưa khám)
-- 3. PDT_NIENGRANG_001 (BN004): 4 giai đoạn (GĐ1: 4.8tr - chưa khám; GĐ2, 3, 4: chưa khám)
-- Tuân thủ snapshot string format trong mo_ta_vat_tu_dich_vu
-- Phụ thuộc: phac_do_dieu_tri, lich_hen (optional)
-- ============================================================================

INSERT INTO giai_doan_phac_do (
    phac_do_id, buoc_so, ten_giai_doan, mo_ta, mo_ta_vat_tu_dich_vu,
    chi_phi, trang_thai_thanh_toan, lich_hen_id, trang_thai,
    ngay_du_kien, ngay_thuc_hien, co_phat_sinh, ghi_chu
)
VALUES
    -- ========================================================================
    -- 1. PHÁC ĐỒ BỌC RĂNG SỨ (PDT_BOCSU_001 - BN002) - 2 Giai đoạn
    -- ========================================================================
    -- Giai đoạn 1: Mài cùi răng sinh học & Lấy dấu (Chi phí 0 VNĐ)
    (
        (SELECT id FROM phac_do_dieu_tri WHERE ma_phac_do = 'PDT_BOCSU_001'),
        1,
        'Mài cùi răng sinh học, lấy dấu & Gắn răng tạm',
        'Gây tê, mài cùi răng sinh học theo tỷ lệ an toàn, lấy dấu cao su chính xác và gắn răng tạm bảo vệ',
        'Mài cùi răng sinh học lấy dấu, Răng tạm bảo vệ',
        0,
        'da_thanh_toan',
        (SELECT id FROM lich_hen WHERE ma_lich_hen = 'LH_BOCSU_01'),
        'da_hoan_thanh',
        '2026-10-02', '2026-10-02', FALSE,
        'Giai đoạn chuẩn bị, chi phí kỹ thuật đi kèm trọn gói bọc răng sứ.'
    ),

    -- Giai đoạn 2: Lắp 4 mão sứ Cercon HT (Chi phí 24.000.000 VNĐ)
    (
        (SELECT id FROM phac_do_dieu_tri WHERE ma_phac_do = 'PDT_BOCSU_001'),
        2,
        'Thử sườn, gắn cố định mão răng sứ & Chỉnh khớp cắn',
        'Thử độ khít sát viền nướu, màu sắc thẩm mỹ, gắn cố định bằng cement nha khoa chuyên dụng và tinh chỉnh khớp cắn',
        'Mão toàn sứ Cercon HT-SP_MAO_CERCON',
        24000000,
        'da_thanh_toan',
        (SELECT id FROM lich_hen WHERE ma_lich_hen = 'LH_BOCSU_02'),
        'da_hoan_thanh',
        '2026-10-06', '2026-10-06', FALSE,
        'Lắp 4 mão toàn sứ Cercon HT (4 x 6.000.000đ = 24.000.000đ), thanh toán hoàn tất toàn bộ phác đồ.'
    ),

    -- ========================================================================
    -- 2. PHÁC ĐỒ CẤY GHÉP IMPLANT (PDT_IMPLANT_001 - BN003) - 3 Giai đoạn
    -- ========================================================================
    -- Giai đoạn 1: Cấy trụ Straumann SLA Thụy Sĩ (Chi phí trọn gói 38.000.000 VNĐ)
    (
        (SELECT id FROM phac_do_dieu_tri WHERE ma_phac_do = 'PDT_IMPLANT_001'),
        1,
        'Khảo sát CT 3D & Phẫu thuật cấy trụ Implant',
        'Chụp phim CT ConeBeam 3D, lập kế hoạch định vị máng hướng dẫn và cấy ghép trụ titanium vào xương hàm',
        'Cặp Trụ Implant + Abutment Thụy Sĩ (Straumann SLA)-SP_IMP_CH',
        38000000,
        'da_thanh_toan',
        (SELECT id FROM lich_hen WHERE ma_lich_hen = 'LH_IMPLANT_01'),
        'da_hoan_thanh',
        '2026-10-06', '2026-10-06', FALSE,
        'Bệnh nhân thanh toán 100% trọn gói trụ Straumann SLA ngay đợt 1.'
    ),

    -- Giai đoạn 2: Tái khám cắt chỉ (Chi phí 0 VNĐ - Đã bao gồm trong trọn gói)
    (
        (SELECT id FROM phac_do_dieu_tri WHERE ma_phac_do = 'PDT_IMPLANT_001'),
        2,
        'Tái khám cắt chỉ & Chờ tích hợp xương hàm',
        'Kiểm tra vết thương, cắt chỉ phẫu thuật và theo dõi quá trình lành thương, tích hợp xương',
        'Tái khám cắt chỉ và theo dõi tích hợp xương',
        0,
        'da_thanh_toan',
        (SELECT id FROM lich_hen WHERE ma_lich_hen = 'LH_IMPLANT_02'),
        'chua_thuc_hien',
        '2026-10-12', NULL, FALSE,
        'Tái khám cắt chỉ phẫu thuật theo lịch hẹn ngày 12/10/2026.'
    ),

    -- Giai đoạn 3: Phục hình mão toàn sứ Cercon HT lên Implant (6.000.000 VNĐ - Đã thanh toán trọn gói)
    (
        (SELECT id FROM phac_do_dieu_tri WHERE ma_phac_do = 'PDT_IMPLANT_001'),
        3,
        'Lấy dấu, gắn Abutment & Lắp mão sứ hoàn thiện',
        'Mở nắp lành thương, gắn khớp nối Abutment, lấy dấu phục hình và gắn cố định mão răng sứ lên trụ',
        'Mão toàn sứ Cercon HT-SP_MAO_CERCON',
        6000000,
        'da_thanh_toan',
        NULL,
        'chua_thuc_hien',
        '2026-11-15', NULL, FALSE,
        'Chuẩn hóa 3NF: Mão toàn sứ lắp trên trụ Implant đã được tính tổng và thanh toán trọn gói 1 lần từ buổi đầu.'
    ),

    -- ========================================================================
    -- 3. PHÁC ĐỒ NIỀNG RĂNG MẮC CÀI (PDT_NIENGRANG_001 - BN004) - 4 Giai đoạn
    -- ========================================================================
    -- Giai đoạn 1: Gắn mắc cài 2 hàm (4.800.000 VNĐ)
    (
        (SELECT id FROM phac_do_dieu_tri WHERE ma_phac_do = 'PDT_NIENGRANG_001'),
        1,
        'Khám khớp cắn, lấy dấu & Gắn mắc cài 2 hàm',
        'Khám lâm sàng, chụp phim Cephalo/Panorama, lấy dấu mẫu hàm kỹ thuật số và gắn bộ mắc cài 2 hàm',
        'Bộ mắc cài kim loại tiêu chuẩn MBT 0.022-SP_MC_KL, Cặp dây cung NiTi kích hoạt nhiệt-SP_DAY_NITI',
        4800000,
        'chua_thanh_toan',
        (SELECT id FROM lich_hen WHERE ma_lich_hen = 'LH_NIENGRANG_01'),
        'chua_thuc_hien',
        '2026-10-10', NULL, FALSE,
        'Đợt 1 gắn mắc cài kim loại và dây cung NiTi kích hoạt nhiệt.'
    ),

    -- Giai đoạn 2: Thay thun & Tinh chỉnh đợt 1 (400.000 VNĐ)
    (
        (SELECT id FROM phac_do_dieu_tri WHERE ma_phac_do = 'PDT_NIENGRANG_001'),
        2,
        'Tinh chỉnh khớp cắn & Thay thun / Dây cung đợt 1',
        'Kiểm tra độ di chuyển răng, thay dây cung NiTi kích hoạt nhiệt và thay thun chuỗi đóng khoảng',
        'Bộ thun chuỗi / thun buộc tại chỗ-SP_THUN_CH, Cặp dây cung NiTi kích hoạt nhiệt-SP_DAY_NITI',
        400000,
        'chua_thanh_toan',
        NULL,
        'chua_thuc_hien',
        '2026-11-10', NULL, FALSE,
        'Tái khám sau 4 tuần thay thun và dây cung kéo lực.'
    ),

    -- Giai đoạn 3: Siết lực đóng khoảng đợt 2 (350.000 VNĐ)
    (
        (SELECT id FROM phac_do_dieu_tri WHERE ma_phac_do = 'PDT_NIENGRANG_001'),
        3,
        'Siết lực đóng khoảng & Tinh chỉnh trục răng đợt 2',
        'Thay dây cung thép Stainless Steel, kích hoạt lò xo kéo đóng khoảng nhổ răng và chỉnh trục thân răng',
        'Cặp dây cung thép không gỉ Stainless Steel-SP_DAY_SS, Bộ thun chuỗi / thun buộc tại chỗ-SP_THUN_CH',
        350000,
        'chua_thanh_toan',
        NULL,
        'chua_thuc_hien',
        '2026-12-10', NULL, FALSE,
        'Thay dây cung thép đóng khoảng nhổ răng.'
    ),

    -- Giai đoạn 4: Tháo mắc cài & Bàn giao hàm duy trì (0 VNĐ)
    (
        (SELECT id FROM phac_do_dieu_tri WHERE ma_phac_do = 'PDT_NIENGRANG_001'),
        4,
        'Tháo mắc cài, vệ sinh & Bàn giao hàm duy trì',
        'Tháo gỡ toàn bộ hệ thống mắc cài, đánh bóng bề mặt men răng và bàn giao máng duy trì chống tái phát',
        'Tháo mắc cài đánh bóng men răng, Bàn giao máng duy trì',
        0,
        'chua_thanh_toan',
        NULL,
        'chua_thuc_hien',
        '2027-04-10', NULL, FALSE,
        'Hoàn tất quá trình chỉnh nha, bàn giao máng duy trì chống xô lệch.'
    )
ON CONFLICT (phac_do_id, buoc_so) DO UPDATE SET
    ten_giai_doan = EXCLUDED.ten_giai_doan,
    mo_ta = EXCLUDED.mo_ta,
    mo_ta_vat_tu_dich_vu = EXCLUDED.mo_ta_vat_tu_dich_vu,
    chi_phi = EXCLUDED.chi_phi,
    trang_thai_thanh_toan = EXCLUDED.trang_thai_thanh_toan,
    lich_hen_id = EXCLUDED.lich_hen_id,
    trang_thai = EXCLUDED.trang_thai,
    ngay_du_kien = EXCLUDED.ngay_du_kien,
    ngay_thuc_hien = EXCLUDED.ngay_thuc_hien,
    ghi_chu = EXCLUDED.ghi_chu;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG DỊCH VỤ ĐIỀU TRỊ (Level 5)
-- Ghi nhận chi tiết dịch vụ thực tế đã thực hiện trong hồ sơ bệnh án
-- Quy tắc hệ thống:
-- 1. Các dịch vụ điều trị thông thường (Lấy cao răng, Trám răng, Nhổ răng,...) 
--    sẽ ghi nhận vào bảng này nối với chi_tiet_dich_vu.
-- 2. Ba dịch vụ bán sản phẩm (Bọc răng sứ, Cấy ghép Implant, Niềng răng) KHÔNG
--    lưu trong bảng này, mà khi thực hiện sẽ ghi nhận qua bảng vat_tu_su_dung (san_pham).
-- Phụ thuộc: ho_so_benh_an, chi_tiet_dich_vu
-- ============================================================================

INSERT INTO dich_vu_dieu_tri (
    ho_so_id, chi_tiet_dich_vu_id, so_luong, don_gia, vi_tri_rang, ghi_chu
)
VALUES
    -- 1. HSBA_KHAMLE_01 (BN001 - Khám lẻ ngày 05/10/2026):
    -- Dịch vụ 1: Lấy cao răng mức độ nhẹ (300.000 VNĐ)
    (
        (SELECT id FROM ho_so_benh_an WHERE ma_ho_so = 'HSBA_KHAMLE_01'),
        (SELECT id FROM chi_tiet_dich_vu WHERE ma_chi_tiet = 'CTDV_CR_NHE'),
        1,
        300000,
        '2 hàm',
        'Lấy cao răng siêu âm và đánh bóng men răng 2 hàm mức độ nhẹ'
    ),

    -- Dịch vụ 2: Trám composite nhỏ - vừa răng 16 (600.000 VNĐ)
    (
        (SELECT id FROM ho_so_benh_an WHERE ma_ho_so = 'HSBA_KHAMLE_01'),
        (SELECT id FROM chi_tiet_dich_vu WHERE ma_chi_tiet = 'CTDV_TR_NHO'),
        1,
        600000,
        'Răng 16',
        'Làm sạch xoang sâu men mặt nhai và trám thẩm mỹ composite 3M Z250'
    );

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG ĐƠN THUỐC (Level 5)
-- Đơn thuốc ngoại trú do nha sĩ kê sau buổi khám/điều trị
-- 1. DT_KHAMLE_01: Cho BN001 (HSBA_KHAMLE_01) - BS. Phạm Thị Dung (NS004) kê
-- 2. DT_BOCSU_01: Cho BN002 (HSBA_BOCSU_01) - BS. Trần Thị Mai (NS002) kê
-- 3. DT_IMPLANT_01: Cho BN003 (HSBA_IMPLANT_01) - TS.BS. Nguyễn Văn Hùng (NS001) kê
-- Phụ thuộc: ho_so_benh_an, nha_si
-- ============================================================================

INSERT INTO don_thuoc (
    ma_don_thuoc, ho_so_id, nha_si_id, ngay_ke, so_ngay_dung,
    chan_doan, loi_dan, ghi_chu
)
VALUES
    -- 1. Đơn thuốc BN001 (Khám lẻ: Lấy cao răng & Trám răng 16)
    (
        'DT_KHAMLE_01',
        (SELECT id FROM ho_so_benh_an WHERE ma_ho_so = 'HSBA_KHAMLE_01'),
        (SELECT id FROM nha_si WHERE ma_nha_si = 'NS004'),
        '2026-10-05',
        3,
        'Sau lấy cao răng 2 hàm và trám thẩm mỹ composite răng 16',
        'Uống thuốc giảm đau khi có cảm giác ê buốt nhẹ. Súc miệng đều đặn hàng ngày bằng dung dịch sát khuẩn sau khi đánh răng. Không nhai đồ cứng tại vị trí răng 16 trong 24h đầu.',
        'Đơn thuốc giảm đau, chống ê buốt và dung dịch súc miệng sát khuẩn ngừa mảng bám.'
    ),

    -- 2. Đơn thuốc BN002 (Bọc sứ GĐ1: Mài cùi 4 răng cửa & Răng tạm)
    (
        'DT_BOCSU_01',
        (SELECT id FROM ho_so_benh_an WHERE ma_ho_so = 'HSBA_BOCSU_01'),
        (SELECT id FROM nha_si WHERE ma_nha_si = 'NS002'),
        '2026-10-02',
        3,
        'Sau mài cùi sinh học 4 răng cửa hàm trên (11, 12, 21, 22) và gắn răng tạm',
        'Uống thuốc giảm đau sau khi ăn no khi hết thuốc tê nếu cảm thấy ê buốt. Bôi gel thảo dược quanh viền nướu để làm dịu mô mềm. Tránh ăn đồ quá nóng hoặc quá lạnh.',
        'Đơn thuốc giảm đau nhạy cảm ngà răng và gel bôi săn se viền nướu.'
    ),

    -- 3. Đơn thuốc BN003 (Implant GĐ1: Phẫu thuật cấy trụ Straumann SLA răng 36)
    (
        'DT_IMPLANT_01',
        (SELECT id FROM ho_so_benh_an WHERE ma_ho_so = 'HSBA_IMPLANT_01'),
        (SELECT id FROM nha_si WHERE ma_nha_si = 'NS001'),
        '2026-10-06',
        5,
        'Hậu phẫu cấy ghép trụ Implant Straumann SLA Thụy Sĩ vị trí răng 36',
        'Uống thuốc đúng giờ sau khi ăn no đủ 5 ngày liên tục, tuyệt đối không tự ý dừng kháng sinh. Cắn chặt gạc cầm máu, chườm lạnh ngoài má 24h đầu. Không khạc nhổ mạnh, không súc miệng mạnh trong ngày đầu. Tái khám cắt chỉ đúng hẹn ngày 12/10/2026.',
        'Đơn thuốc kháng sinh phổ rộng dự phòng nhiễm khuẩn, kháng viêm chống phù nề và giảm đau sau phẫu thuật cấy ghép trụ Implant.'
    )
ON CONFLICT (ma_don_thuoc) DO UPDATE SET
    ngay_ke = EXCLUDED.ngay_ke,
    so_ngay_dung = EXCLUDED.so_ngay_dung,
    chan_doan = EXCLUDED.chan_doan,
    loi_dan = EXCLUDED.loi_dan,
    ghi_chu = EXCLUDED.ghi_chu;

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG VẬT TƯ SỬ DỤNG (Level 5)
-- Ghi nhận vật tư/sản phẩm thực tế đã sử dụng trong buổi điều trị
-- Khớp chính xác với snapshot mo_ta_vat_tu_dich_vu của các giai đoạn phác đồ đã hoàn thành
-- 1. HSBA_BOCSU_02 (GĐ2 Phác đồ bọc răng sứ):
--    Snapshot: 'Mão toàn sứ Cercon HT-SP_MAO_CERCON'
--    -> SP_MAO_CERCON, số lượng 4 x 6.000.000 = 24.000.000 VNĐ
-- 2. HSBA_IMPLANT_01 (GĐ1 Phác đồ cấy ghép Implant):
--    Snapshot: 'Cặp Trụ Implant + Abutment Thụy Sĩ (Straumann SLA)-SP_IMP_CH'
--    -> SP_IMP_CH, số lượng 1 x 38.000.000 = 38.000.000 VNĐ
-- Phụ thuộc: ho_so_benh_an, san_pham
-- ============================================================================

INSERT INTO vat_tu_su_dung (
    ho_so_id, san_pham_id, so_luong, don_gia, ghi_chu
)
VALUES
    -- 1. Bọc răng sứ GĐ2 (BN002 - HSBA_BOCSU_02 - Ngày 06/10/2026)
    -- Lắp 4 mão toàn sứ Cercon HT khớp với snapshot 'Mão toàn sứ Cercon HT-SP_MAO_CERCON'
    (
        (SELECT id FROM ho_so_benh_an WHERE ma_ho_so = 'HSBA_BOCSU_02'),
        (SELECT id FROM san_pham WHERE ma_san_pham = 'SP_MAO_CERCON'),
        4,
        6000000,
        'Lắp cố định 4 mão toàn sứ Cercon HT răng 11, 12, 21, 22 (Khớp snapshot GĐ2: Mão toàn sứ Cercon HT-SP_MAO_CERCON)'
    ),

    -- 2. Implant GĐ1 (BN003 - HSBA_IMPLANT_01 - Ngày 06/10/2026)
    -- Cấy 01 trụ Straumann SLA khớp với snapshot 'Cặp Trụ Implant + Abutment Thụy Sĩ (Straumann SLA)-SP_IMP_CH'
    (
        (SELECT id FROM ho_so_benh_an WHERE ma_ho_so = 'HSBA_IMPLANT_01'),
        (SELECT id FROM san_pham WHERE ma_san_pham = 'SP_IMP_CH'),
        1,
        38000000,
        'Cấy ghép 01 trụ Implant Straumann SLA Thụy Sĩ vị trí răng 36 (Khớp snapshot GĐ1: Cặp Trụ Implant + Abutment Thụy Sĩ (Straumann SLA)-SP_IMP_CH)'
    );

-- ============================================================================
-- DỮ LIỆU MẪU: BẢNG CHI TIẾT ĐƠN THUỐC (Level 6)
-- Từng dòng thuốc chi tiết trong đơn thuốc do nha sĩ kê
-- 1. Đơn DT_IMPLANT_01 (4 thuốc): Augmentin 1g, Ibuprofen 400mg, Alpha Choay, Medoral
-- 2. Đơn DT_BOCSU_01 (2 thuốc): Efferalgan 500mg, Gel Kamistad-Gel N
-- 3. Đơn DT_KHAMLE_01 (2 thuốc): Panadol Extra, Dung dịch Kin Gingival
-- Phụ thuộc: don_thuoc
-- ============================================================================

INSERT INTO chi_tiet_don_thuoc (
    don_thuoc_id, ten_thuoc, hoat_chat, ham_luong, dang_bao_che,
    lieu_dung, so_luong, don_vi_tinh, so_lan_ngay, thoi_diem_uong,
    huong_dan, ghi_chu
)
VALUES
    -- ========================================================================
    -- 1. ĐƠN THUỐC HẬU PHẪU IMPLANT (DT_IMPLANT_01 - BN003)
    -- ========================================================================
    -- Kháng sinh: Augmentin 1g
    (
        (SELECT id FROM don_thuoc WHERE ma_don_thuoc = 'DT_IMPLANT_01'),
        'Augmentin 1g (GlaxoSmithKline)',
        'Amoxicillin + Acid clavulanic',
        '1000mg (875mg/125mg)',
        'Viên nén bao phim',
        '1 viên / lần',
        10,
        'Viên',
        2,
        'Sau khi ăn no (sáng 8h - tối 20h)',
        'Uống trọn viên thuốc với 1 cốc nước lớn ngay đầu bữa ăn. Uống đủ liều 5 ngày liên tục, không tự ý ngưng thuốc.',
        'Kháng sinh phổ rộng dự phòng nhiễm trùng vết mổ cấy ghép trụ Implant'
    ),

    -- Giảm đau, kháng viêm: Ibuprofen Stada 400mg
    (
        (SELECT id FROM don_thuoc WHERE ma_don_thuoc = 'DT_IMPLANT_01'),
        'Ibuprofen Stada 400mg',
        'Ibuprofen',
        '400mg',
        'Viên nén bao phim',
        '1 viên / lần',
        10,
        'Viên',
        2,
        'Sau khi ăn no (khi cảm thấy đau nhức)',
        'Uống sau bữa ăn no khi có cảm giác đau nhiều, mỗi lần cách nhau tối thiểu 6-8 tiếng. Không uống khi đói.',
        'Giảm đau nhức và chống phản ứng viêm sau phẫu thuật'
    ),

    -- Chống phù nề dạng men: Alpha Choay Sanofi
    (
        (SELECT id FROM don_thuoc WHERE ma_don_thuoc = 'DT_IMPLANT_01'),
        'Alpha Choay Sanofi',
        'Chymotrypsin',
        '4.2mg (21 microkatals)',
        'Viên ngậm dưới lưỡi',
        '2 viên / lần',
        20,
        'Viên',
        2,
        'Ngậm dưới lưỡi sau bữa ăn (sáng - chiều)',
        'Đặt 2 viên dưới lưỡi để thuốc tan tự nhiên từ từ, không nuốt trọn hay nhai vỡ viên để đạt hiệu quả chống phù nề mô tốt nhất.',
        'Kháng viêm dạng men chống sưng phù nề và tan máu bầm mô nướu'
    ),

    -- Nước súc miệng sát khuẩn: Medoral 250ml
    (
        (SELECT id FROM don_thuoc WHERE ma_don_thuoc = 'DT_IMPLANT_01'),
        'Nước súc miệng Medoral 250ml',
        'Chlorhexidine digluconate',
        '0.2%',
        'Dung dịch súc miệng',
        '15ml / lần',
        1,
        'Chai',
        3,
        'Sau khi chải răng sạch',
        'Dùng 15ml dung dịch súc nhẹ nhàng khoang miệng trong 30 giây rồi nhổ bỏ. Không nuốt, không súc lại bằng nước lọc và không ăn uống trong 30 phút sau khi súc.',
        'Sát khuẩn tại chỗ, bảo vệ lành thương huyệt ổ mổ Implant'
    ),

    -- ========================================================================
    -- 2. ĐƠN THUỐC BỌC RĂNG SỨ GĐ1 (DT_BOCSU_01 - BN002)
    -- ========================================================================
    -- Giảm đau, giảm ê buốt: Efferalgan 500mg
    (
        (SELECT id FROM don_thuoc WHERE ma_don_thuoc = 'DT_BOCSU_01'),
        'Efferalgan 500mg',
        'Paracetamol',
        '500mg',
        'Viên sủi bọt',
        '1 viên / lần',
        6,
        'Viên',
        2,
        'Hòa tan nước sau ăn khi thấy ê buốt cùi răng',
        'Hòa tan 1 viên trong 150ml nước đun sôi để nguội, uống khi hết bọt khí. Mỗi liều cách nhau 4-6 tiếng nếu còn cảm giác ê buốt cùi răng.',
        'Giảm ê buốt nhạy cảm ngà sau khi mài cùi răng sinh học'
    ),

    -- Gel làm dịu viền nướu: Kamistad-Gel N
    (
        (SELECT id FROM don_thuoc WHERE ma_don_thuoc = 'DT_BOCSU_01'),
        'Kamistad-Gel N (Stada)',
        'Lidocaine HCl + Chiết xuất hoa cúc Matricaria',
        '10g',
        'Gel bôi niêm mạc miệng',
        'Thoa lượng bằng hạt đậu quanh viền nướu',
        1,
        'Tuýp',
        3,
        'Sau khi vệ sinh răng miệng sạch',
        'Dùng tăm bông sạch lấy một lượng nhỏ thoa nhẹ quanh bờ viền nướu của 4 răng cửa đã mài và gắn răng tạm để làm dịu cảm giác cộm rát.',
        'Giảm kích ứng, chống viêm và gây tê bề mặt viền nướu'
    ),

    -- ========================================================================
    -- 3. ĐƠN THUỐC KHÁM LẺ (DT_KHAMLE_01 - BN001)
    -- ========================================================================
    -- Giảm đau nhẹ: Panadol Extra đỏ
    (
        (SELECT id FROM don_thuoc WHERE ma_don_thuoc = 'DT_KHAMLE_01'),
        'Panadol Extra đỏ (GSK)',
        'Paracetamol + Caffeine',
        '500mg / 65mg',
        'Viên nén bao phim',
        '1 viên / lần',
        4,
        'Viên',
        2,
        'Sau khi ăn no khi có cảm giác ê nhức',
        'Chỉ dùng khi có cảm giác ê buốt nhẹ sau khi trám răng 16 hoặc sau lấy cao răng. Uống cách nhau tối thiểu 6 giờ.',
        'Giảm cảm giác ê buốt nhẹ sau can thiệp trám phục hồi'
    ),

    -- Nước súc miệng săn se nướu: Kin Gingival 250ml
    (
        (SELECT id FROM don_thuoc WHERE ma_don_thuoc = 'DT_KHAMLE_01'),
        'Nước súc miệng Kin Gingival 250ml',
        'Chlorhexidine digluconate + Sodium Fluoride',
        '0.12% + 0.05%',
        'Dung dịch súc miệng',
        '10ml - 15ml / lần',
        1,
        'Chai',
        2,
        'Sáng và tối trước khi đi ngủ sau khi chải răng',
        'Ngậm dung dịch súc đều các kẽ răng trong 1 phút rồi nhổ ra. Không súc lại bằng nước lọc để hoạt chất bảo vệ cổ chân răng tối ưu.',
        'Kháng khuẩn, phòng ngừa viêm nướu và ngăn ngừa mảng bám tái hình thành'
    );

-- ============================================================================
-- DATABASE EMBEDDED FUNCTION: fn_calculate_revenue
-- Tính doanh thu thực thu theo kỳ lọc bám sát logic 3 trường hợp phác đồ & khám lẻ
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_calculate_revenue(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)
RETURNS NUMERIC(18, 2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_revenue NUMERIC(18, 2) := 0;
BEGIN
    WITH invoice_raw AS (
        SELECT 
            hd.id,
            hd.khuyen_mai_id,
            km.loai_giam,
            km.gia_tri_giam,
            CASE
                -- Trường hợp 1: Phác đồ thanh toán trọn gói 1 lần
                WHEN hd.phac_do_dieu_tri_id IS NOT NULL THEN (
                    SELECT COALESCE(SUM(gdpd.chi_phi), 0)
                    FROM giai_doan_phac_do gdpd
                    WHERE gdpd.phac_do_id = hd.phac_do_dieu_tri_id
                )
                -- Trường hợp 2: Phác đồ thanh toán theo từng giai đoạn
                WHEN EXISTS (
                    SELECT 1 FROM giai_doan_phac_do gdpd 
                    WHERE gdpd.lich_hen_id = hd.lich_hen_id
                ) THEN (
                    SELECT COALESCE(gdpd.chi_phi, 0)
                    FROM giai_doan_phac_do gdpd
                    WHERE gdpd.lich_hen_id = hd.lich_hen_id
                )
                -- Trường hợp 3: Khám dịch vụ lẻ không theo phác đồ
                ELSE (
                    SELECT 
                        COALESCE(SUM(dvdt.don_gia * dvdt.so_luong), 0) +
                        COALESCE((
                            SELECT COALESCE(SUM(vtsd.don_gia * vtsd.so_luong), 0)
                            FROM vat_tu_su_dung vtsd
                            WHERE vtsd.ho_so_id = hsba.id
                        ), 0)
                    FROM ho_so_benh_an hsba
                    LEFT JOIN dich_vu_dieu_tri dvdt ON dvdt.ho_so_id = hsba.id
                    WHERE hsba.lich_hen_id = hd.lich_hen_id
                    GROUP BY hsba.id
                )
            END AS tien_goc
        FROM hoa_don hd
        LEFT JOIN khuyen_mai km ON hd.khuyen_mai_id = km.id
        WHERE hd.trang_thai_thanh_toan = 'da_thanh_toan'
          AND hd.ngay_thanh_toan >= p_start_date
          AND hd.ngay_thanh_toan <= p_end_date
    )
    SELECT COALESCE(SUM(
        CASE 
            WHEN loai_giam = 'phan_tram' THEN 
                tien_goc * (1 - COALESCE(gia_tri_giam, 0) / 100.0)
            WHEN loai_giam = 'so_tien' THEN 
                GREATEST(0, tien_goc - COALESCE(gia_tri_giam, 0))
            ELSE 
                COALESCE(tien_goc, 0)
        END
    ), 0)::NUMERIC(18, 2)
    INTO v_total_revenue
    FROM invoice_raw;

    RETURN v_total_revenue;
END;
$$;

-- ============================================================================
-- VIEW: v_dich_vu_da_thanh_toan
-- Dùng cho API: GET /api/v1/admin/top-services
-- ============================================================================
CREATE OR REPLACE VIEW v_dich_vu_da_thanh_toan AS
SELECT 
    dv.id AS dich_vu_id,
    dv.ma_dich_vu,
    dv.ten_dich_vu,
    dvdt.so_luong,
    (dvdt.don_gia * dvdt.so_luong)::NUMERIC(18, 2) AS thanh_tien,
    hd.ngay_thanh_toan,
    hd.id AS hoa_don_id
FROM dich_vu_dieu_tri dvdt
JOIN chi_tiet_dich_vu ctdv ON dvdt.chi_tiet_dich_vu_id = ctdv.id
JOIN dich_vu dv ON ctdv.dich_vu_id = dv.id
JOIN ho_so_benh_an hsba ON dvdt.ho_so_id = hsba.id
JOIN hoa_don hd ON hsba.lich_hen_id = hd.lich_hen_id
WHERE hd.trang_thai_thanh_toan = 'da_thanh_toan'

UNION ALL

SELECT 
    dv.id AS dich_vu_id,
    dv.ma_dich_vu,
    dv.ten_dich_vu,
    vtsd.so_luong,
    (vtsd.don_gia * vtsd.so_luong)::NUMERIC(18, 2) AS thanh_tien,
    hd.ngay_thanh_toan,
    hd.id AS hoa_don_id
FROM vat_tu_su_dung vtsd
JOIN san_pham sp ON vtsd.san_pham_id = sp.id
JOIN dich_vu dv ON sp.dich_vu_id = dv.id
JOIN ho_so_benh_an hsba ON vtsd.ho_so_id = hsba.id
JOIN hoa_don hd ON hsba.lich_hen_id = hd.lich_hen_id
WHERE hd.trang_thai_thanh_toan = 'da_thanh_toan'
  AND sp.dich_vu_id IS NOT NULL;

COMMIT;

