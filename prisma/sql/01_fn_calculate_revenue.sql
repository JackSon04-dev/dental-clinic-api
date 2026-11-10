-- ============================================================================
-- FUNCTION: fn_calculate_revenue
-- Mô tả: Tính tổng doanh thu thực thu trong khoảng thời gian [p_start_date, p_end_date]
-- Tuân thủ nghiệp vụ chuẩn:
-- Tính tiền gốc theo từng hóa đơn ca khám (hd.tong_tien hoặc dịch vụ/vật tư trong ho_so_benh_an)
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
            COALESCE(hd.tong_tien, (
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
            ), 0) AS tien_goc
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
