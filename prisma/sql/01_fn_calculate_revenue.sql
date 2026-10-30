-- ============================================================================
-- FUNCTION: fn_calculate_revenue
-- Mô tả: Tính tổng doanh thu thực thu trong khoảng thời gian [p_start_date, p_end_date]
-- Tuân thủ nghiệp vụ chuẩn:
-- 1. Phác đồ trả 1 lần trọn gói (phac_do_dieu_tri_id IS NOT NULL):
--    -> SUM(chi_phi) của tất cả giai đoạn trong phác đồ đó.
-- 2. Phác đồ trả theo từng giai đoạn (giai_doan_phac_do.lich_hen_id = hd.lich_hen_id):
--    -> Lấy đúng chi_phi của giai đoạn ứng với lịch hẹn đã thanh toán.
-- 3. Khám dịch vụ lẻ không theo phác đồ:
--    -> SUM(dich_vu_dieu_tri.don_gia * so_luong) + SUM(vat_tu_su_dung.don_gia * so_luong)
-- Cuối cùng trừ voucher khuyến mãi (nếu có: phan_tram hoặc so_tien).
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
