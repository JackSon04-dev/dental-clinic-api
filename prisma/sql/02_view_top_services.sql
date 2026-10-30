-- ============================================================================
-- VIEW: v_dich_vu_da_thanh_toan
-- Mục đích: Tổng hợp chi tiết dịch vụ và vật tư tiêu hao đã thực hiện và 
--          hóa đơn tương ứng đã được thanh toán (trang_thai_thanh_toan = 'da_thanh_toan').
--          Dữ liệu quy tụ về dịch vụ cha (dich_vu) để tính Top Services và Doanh thu.
-- Áp dụng: API GET /api/v1/admin/top-services
-- ============================================================================

CREATE OR REPLACE VIEW v_dich_vu_da_thanh_toan AS
-- 1. Nhánh dịch vụ điều trị thông thường (Lấy cao răng, Trám răng, Nhổ răng, ...)
--    Nối qua chi_tiet_dich_vu -> dich_vu
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

-- 2. Nhánh vật tư tiêu hao / sản phẩm điều trị (Mão sứ, Trụ Implant, Mắc cài, ...)
--    Nối qua san_pham -> dich_vu (thông qua san_pham.dich_vu_id)
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
