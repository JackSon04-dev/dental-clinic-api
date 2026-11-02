import prisma from '../../../config/prisma.js';
import {
  adminRevenueTrendResponseSchema,
  adminPaymentMethodsResponseSchema,
  adminTopPerformanceResponseSchema,
  adminInventoryCategoriesResponseSchema,
} from '../../../dtos/departments/admins/adminReportDto.js';

/**
 * calculateGrowthRate
 * Tính tỷ lệ % tăng trưởng giữa kỳ hiện tại và kỳ trước
 */
const calculateGrowthRate = (current, previous) => {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

/**
 * getReportDateRanges
 * Tính toán mốc thời gian bắt đầu, kết thúc cho kỳ hiện tại và kỳ đối ứng trước đó
 */
const getReportDateRanges = (preset = '7_DAYS', customStart = null, customEnd = null) => {
  const pad = (n) => String(n).padStart(2, '0');
  const formatShortDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  const formatIsoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let currStart = new Date();
  let currEnd = new Date();
  let prevStart = new Date();
  let prevEnd = new Date();
  let comparisonLabel = '';

  const now = new Date();

  if (preset === 'TODAY') {
    currStart = new Date(now);
    currStart.setHours(0, 0, 0, 0);
    currEnd = new Date(now);
    currEnd.setHours(23, 59, 59, 999);

    prevStart = new Date(currStart);
    prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(currEnd);
    prevEnd.setDate(prevEnd.getDate() - 1);

    comparisonLabel = `So với ngày hôm qua (${formatShortDate(prevStart)})`;
  } else if (preset === 'THIS_MONTH') {
    currStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    currEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    comparisonLabel = `So với tháng trước (Tháng ${prevStart.getMonth() + 1}/${prevStart.getFullYear()})`;
  } else if (preset === 'THIS_QUARTER') {
    const q = Math.floor(now.getMonth() / 3);
    currStart = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0, 0);
    currEnd = new Date(now.getFullYear(), (q + 1) * 3, 0, 23, 59, 59, 999);

    prevStart = new Date(now.getFullYear(), (q - 1) * 3, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), q * 3, 0, 23, 59, 59, 999);

    comparisonLabel = `So với quý trước (Q${q === 0 ? 4 : q}/${prevStart.getFullYear()})`;
  } else if (preset === 'THIS_YEAR') {
    currStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    currEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

    comparisonLabel = `So với năm trước (${now.getFullYear() - 1})`;
  } else if (preset === 'CUSTOM' && customStart && customEnd) {
    currStart = new Date(customStart);
    currStart.setHours(0, 0, 0, 0);
    currEnd = new Date(customEnd);
    currEnd.setHours(23, 59, 59, 999);

    const diffDays = Math.max(1, Math.round((currEnd - currStart) / (1000 * 60 * 60 * 24)));
    prevEnd = new Date(currStart);
    prevEnd.setMilliseconds(-1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - diffDays + 1);
    prevStart.setHours(0, 0, 0, 0);

    comparisonLabel = `So với ${diffDays} ngày trước (${formatShortDate(prevStart)} - ${formatShortDate(prevEnd)})`;
  } else {
    // Mặc định: '7_DAYS'
    currEnd = new Date(now);
    currEnd.setHours(23, 59, 59, 999);
    currStart = new Date(currEnd);
    currStart.setDate(currStart.getDate() - 6);
    currStart.setHours(0, 0, 0, 0);

    prevEnd = new Date(currStart);
    prevEnd.setMilliseconds(-1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
    prevStart.setHours(0, 0, 0, 0);

    comparisonLabel = `So với 7 ngày trước (${formatShortDate(prevStart)} - ${formatShortDate(prevEnd)})`;
  }

  return {
    currStart,
    currEnd,
    prevStart,
    prevEnd,
    startDateStr: formatIsoDate(currStart),
    endDateStr: formatIsoDate(currEnd),
    comparisonLabel,
  };
};

/**
 * queryInvoiceFinancials
 * Truy vấn raw SQL danh sách hóa đơn đã thanh toán kèm tính toán số tiền thực thu chuẩn 3NF
 */
const queryInvoiceFinancials = async (startDate, endDate) => {
  return await prisma.$queryRaw`
    WITH invoice_raw AS (
      SELECT 
          hd.id,
          hd.ma_hoa_don,
          hd.ngay_thanh_toan,
          hd.phuong_thuc_thanh_toan,
          hd.khuyen_mai_id,
          km.loai_giam,
          km.gia_tri_giam,
          clv.nha_si_id,
          ns.ho_ten AS nha_si_ten,
          ns.chuyen_khoa AS nha_si_chuyen_khoa,
          CASE
              -- 1. Phác đồ thanh toán trọn gói 1 lần
              WHEN hd.phac_do_dieu_tri_id IS NOT NULL THEN (
                  SELECT COALESCE(SUM(gdpd.chi_phi), 0)
                  FROM giai_doan_phac_do gdpd
                  WHERE gdpd.phac_do_id = hd.phac_do_dieu_tri_id
              )
              -- 2. Phác đồ thanh toán theo từng giai đoạn
              WHEN EXISTS (
                  SELECT 1 FROM giai_doan_phac_do gdpd 
                  WHERE gdpd.lich_hen_id = hd.lich_hen_id
              ) THEN (
                  SELECT COALESCE(gdpd.chi_phi, 0)
                  FROM giai_doan_phac_do gdpd
                  WHERE gdpd.lich_hen_id = hd.lich_hen_id
              )
              -- 3. Khám dịch vụ lẻ không theo phác đồ
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
      LEFT JOIN lich_hen lh ON hd.lich_hen_id = lh.id
      LEFT JOIN ca_lam_viec clv ON lh.ca_lam_viec_id = clv.id
      LEFT JOIN nha_si ns ON clv.nha_si_id = ns.id
      WHERE hd.trang_thai_thanh_toan = 'da_thanh_toan'
        AND hd.ngay_thanh_toan >= ${startDate}
        AND hd.ngay_thanh_toan <= ${endDate}
    )
    SELECT 
        id,
        ma_hoa_don,
        ngay_thanh_toan,
        phuong_thuc_thanh_toan,
        nha_si_id,
        nha_si_ten,
        nha_si_chuyen_khoa,
        COALESCE(
          CASE 
              WHEN loai_giam = 'phan_tram' THEN tien_goc * (1 - COALESCE(gia_tri_giam, 0) / 100.0)
              WHEN loai_giam = 'so_tien' THEN GREATEST(0, tien_goc - COALESCE(gia_tri_giam, 0))
              ELSE COALESCE(tien_goc, 0)
          END, 0
        )::NUMERIC(18, 2) AS thuc_thu
    FROM invoice_raw;
  `;
};

/**
 * 1. getRevenueTrendReportService
 * Lấy báo cáo xu hướng doanh thu chuỗi thời gian (RevenueTrendChart)
 */
export const getRevenueTrendReportService = async ({ preset = '7_DAYS', startDate, endDate } = {}) => {
  const ranges = getReportDateRanges(preset, startDate, endDate);

  const [currentInvoices, previousInvoices] = await Promise.all([
    queryInvoiceFinancials(ranges.currStart, ranges.currEnd),
    queryInvoiceFinancials(ranges.prevStart, ranges.prevEnd),
  ]);

  const netRevenue = currentInvoices.reduce((sum, inv) => sum + Number(inv.thuc_thu || 0), 0);
  const previousNetRevenue = previousInvoices.reduce((sum, inv) => sum + Number(inv.thuc_thu || 0), 0);
  const totalPaidInvoices = currentInvoices.length;
  const averageOrderValue = totalPaidInvoices > 0 ? Math.round(netRevenue / totalPaidInvoices) : 0;
  const growthRate = calculateGrowthRate(netRevenue, previousNetRevenue);

  // Tạo timeline từng ngày
  const DAYS_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const pad = (n) => String(n).padStart(2, '0');
  const timeline = [];

  const daysCount = Math.max(1, Math.round((ranges.currEnd - ranges.currStart) / (1000 * 60 * 60 * 24)));

  for (let i = 0; i < daysCount; i++) {
    const cur = new Date(ranges.currStart);
    cur.setDate(cur.getDate() + i);

    const prevCur = new Date(ranges.prevStart);
    prevCur.setDate(prevCur.getDate() + i);

    const dateKey = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
    const prevDateKey = `${prevCur.getFullYear()}-${pad(prevCur.getMonth() + 1)}-${pad(prevCur.getDate())}`;

    const label = `${DAYS_VN[cur.getDay()]} (${pad(cur.getDate())}/${pad(cur.getMonth() + 1)})`;

    // Lọc hóa đơn ngày hiện tại
    const currDayInvs = currentInvoices.filter((inv) => {
      const d = new Date(inv.ngay_thanh_toan);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === dateKey;
    });

    // Lọc hóa đơn ngày kỳ trước
    const prevDayInvs = previousInvoices.filter((inv) => {
      const d = new Date(inv.ngay_thanh_toan);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === prevDateKey;
    });

    const currentRevenue = currDayInvs.reduce((sum, inv) => sum + Number(inv.thuc_thu || 0), 0);
    const previousRevenue = prevDayInvs.reduce((sum, inv) => sum + Number(inv.thuc_thu || 0), 0);

    timeline.push({
      label,
      date: dateKey,
      currentRevenue,
      previousRevenue,
      invoiceCount: currDayInvs.length,
    });
  }

  return adminRevenueTrendResponseSchema({
    preset,
    startDate: ranges.startDateStr,
    endDate: ranges.endDateStr,
    comparisonLabel: ranges.comparisonLabel,
    kpi: {
      netRevenue,
      previousNetRevenue,
      growthRate,
      totalPaidInvoices,
      averageOrderValue,
    },
    timeline,
  });
};

/**
 * 2. getPaymentMethodsReportService
 * Báo cáo cơ cấu phương thức thanh toán (PaymentMethodDonutChart)
 */
export const getPaymentMethodsReportService = async ({ preset = '7_DAYS', startDate, endDate } = {}) => {
  const ranges = getReportDateRanges(preset, startDate, endDate);
  const invoices = await queryInvoiceFinancials(ranges.currStart, ranges.currEnd);

  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.thuc_thu || 0), 0);

  // Gom nhóm theo 3 phương thức thanh toán chuẩn
  const groups = {
    CHUYEN_KHOAN: {
      method: 'CHUYEN_KHOAN',
      label: 'Chuyển khoản QR (VietQR / Internet Banking)',
      amount: 0,
      count: 0,
      color: '#0284c7', // Sky 600
    },
    QUET_THE: {
      method: 'QUET_THE',
      label: 'Thẻ thanh toán POS (Visa / Mastercard)',
      amount: 0,
      count: 0,
      color: '#6366f1', // Indigo 500
    },
    TIEN_MAT: {
      method: 'TIEN_MAT',
      label: 'Tiền mặt tại quầy',
      amount: 0,
      count: 0,
      color: '#10b981', // Emerald 500
    },
  };

  invoices.forEach((inv) => {
    const rawMethod = (inv.phuong_thuc_thanh_toan || '').toLowerCase();
    const amount = Number(inv.thuc_thu || 0);

    if (rawMethod === 'chuyen_khoan') {
      groups.CHUYEN_KHOAN.amount += amount;
      groups.CHUYEN_KHOAN.count += 1;
    } else if (rawMethod === 'the' || rawMethod === 'quet_the') {
      groups.QUET_THE.amount += amount;
      groups.QUET_THE.count += 1;
    } else {
      groups.TIEN_MAT.amount += amount;
      groups.TIEN_MAT.count += 1;
    }
  });

  const paymentMethods = Object.values(groups).map((g) => ({
    ...g,
    percent: totalRevenue > 0 ? Math.round((g.amount / totalRevenue) * 100) : 0,
  }));

  return adminPaymentMethodsResponseSchema(paymentMethods);
};

/**
 * 3. getTopPerformanceReportService
 * Báo cáo Top hiệu suất Bác sĩ & Dịch vụ (TopPerformanceCharts)
 */
export const getTopPerformanceReportService = async ({
  preset = 'THIS_MONTH',
  startDate,
  endDate,
  limit = 5,
} = {}) => {
  const ranges = getReportDateRanges(preset, startDate, endDate);
  const limitNumber = Number(limit) || 5;

  const [invoices, topServicesRaw, grandTotalRaw] = await Promise.all([
    queryInvoiceFinancials(ranges.currStart, ranges.currEnd),
    prisma.$queryRaw`
      SELECT 
          dich_vu_id,
          ma_dich_vu,
          ten_dich_vu,
          SUM(so_luong)::INT AS execution_count,
          SUM(thanh_tien)::NUMERIC(18, 2) AS total_revenue
      FROM v_dich_vu_da_thanh_toan
      WHERE ngay_thanh_toan >= ${ranges.currStart}
        AND ngay_thanh_toan <= ${ranges.currEnd}
      GROUP BY dich_vu_id, ma_dich_vu, ten_dich_vu
      ORDER BY total_revenue DESC, execution_count DESC
      LIMIT ${limitNumber};
    `,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(thanh_tien), 0)::NUMERIC(18, 2) AS grand_total
      FROM v_dich_vu_da_thanh_toan
      WHERE ngay_thanh_toan >= ${ranges.currStart}
        AND ngay_thanh_toan <= ${ranges.currEnd};
    `,
  ]);

  const totalInvoiceRev = invoices.reduce((sum, inv) => sum + Number(inv.thuc_thu || 0), 0);
  const grandTotal = Number(grandTotalRaw[0]?.grand_total || 0);

  // 1. Gom nhóm doanh thu theo Bác sĩ
  const dentistMap = new Map();

  invoices.forEach((inv) => {
    if (!inv.nha_si_id) return;
    const existing = dentistMap.get(inv.nha_si_id) || {
      dentistId: inv.nha_si_id,
      dentistName: inv.nha_si_ten || 'Bác sĩ điều trị',
      specialty: inv.nha_si_chuyen_khoa || 'Chuyên khoa Nha',
      treatmentsCount: 0,
      revenue: 0,
    };

    existing.treatmentsCount += 1;
    existing.revenue += Number(inv.thuc_thu || 0);
    dentistMap.set(inv.nha_si_id, existing);
  });

  const dentists = Array.from(dentistMap.values())
    .map((d) => ({
      ...d,
      sharePercent: totalInvoiceRev > 0 ? Number(((d.revenue / totalInvoiceRev) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limitNumber);

  // 2. Map dịch vụ
  const services = topServicesRaw.map((svc) => {
    const rev = Number(svc.total_revenue || 0);
    return {
      serviceName: svc.ten_dich_vu,
      count: Number(svc.execution_count || 0),
      revenue: rev,
      sharePercent: grandTotal > 0 ? Number(((rev / grandTotal) * 100).toFixed(1)) : 0,
    };
  });

  return adminTopPerformanceResponseSchema({ dentists, services });
};

/**
 * 4. getInventoryCategoriesReportService
 * Báo cáo cơ cấu vốn tồn kho theo danh mục (InventoryCategoryDonutChart)
 * Tính tổng vốn tồn = SUM(so_luong_ton * gia_ban)
 */
export const getInventoryCategoriesReportService = async () => {
  const products = await prisma.sanPham.findMany({
    where: { trangThai: 'hoat_dong' },
    select: {
      id: true,
      maSanPham: true,
      tenSanPham: true,
      loai: true,
      giaBan: true,
      soLuongTon: true,
    },
  });

  // Phân loại chuyên khoa nha khoa khớp 100% với giao diện InventoryCategoryDonutChart
  const CATEGORY_DEFS = {
    IMPLANT: {
      category: 'IMPLANT',
      label: 'Vật liệu cấy ghép',
      color: '#0284c7', // Sky 600
    },
    PROSTHETICS: {
      category: 'PROSTHETICS',
      label: 'Răng sứ phục hình',
      color: '#8b5cf6', // Violet 500
    },
    ORTHODONTICS: {
      category: 'ORTHODONTICS',
      label: 'Khí cụ chỉnh nha',
      color: '#06b6d4', // Cyan 500
    },
    BIOMATERIALS: {
      category: 'BIOMATERIALS',
      label: 'Vật liệu sinh học',
      color: '#10b981', // Emerald 500
    },
    CONSUMABLES: {
      category: 'CONSUMABLES',
      label: 'Vật tư tiêu hao',
      color: '#64748b', // Slate 500
    },
  };

  const getCategoryKey = (p) => {
    const code = (p.maSanPham || '').toUpperCase();
    const name = (p.tenSanPham || '').toLowerCase();

    if (code.startsWith('SP_IMP_') || name.includes('implant') || name.includes('trụ implant') || name.includes('abutment')) {
      return 'IMPLANT';
    }
    if (
      code.startsWith('SP_MAO_') ||
      code.startsWith('SP_VENEER_') ||
      name.includes('mão') ||
      name.includes('răng sứ') ||
      name.includes('veneer') ||
      name.includes('cercon') ||
      name.includes('emax')
    ) {
      return 'PROSTHETICS';
    }
    if (
      code.startsWith('SP_MC_') ||
      code.startsWith('SP_DAY_') ||
      code.startsWith('SP_THUN_') ||
      code.startsWith('SP_KHAY_') ||
      name.includes('mắc cài') ||
      name.includes('dây cung') ||
      name.includes('invisalign') ||
      name.includes('thun')
    ) {
      return 'ORTHODONTICS';
    }
    if (name.includes('xương') || name.includes('màng') || name.includes('sinh học') || name.includes('bio-oss')) {
      return 'BIOMATERIALS';
    }
    return 'CONSUMABLES';
  };

  const categoryAgg = {
    IMPLANT: { totalValue: 0, totalQuantity: 0, skuCount: 0 },
    PROSTHETICS: { totalValue: 0, totalQuantity: 0, skuCount: 0 },
    ORTHODONTICS: { totalValue: 0, totalQuantity: 0, skuCount: 0 },
    BIOMATERIALS: { totalValue: 0, totalQuantity: 0, skuCount: 0 },
    CONSUMABLES: { totalValue: 0, totalQuantity: 0, skuCount: 0 },
  };

  let grandTotalValue = 0;

  products.forEach((p) => {
    const key = getCategoryKey(p);
    const qty = Number(p.soLuongTon || 0);
    const price = Number(p.giaBan || 0);
    const val = qty * price;

    categoryAgg[key].totalValue += val;
    categoryAgg[key].totalQuantity += qty;
    categoryAgg[key].skuCount += 1;
    grandTotalValue += val;
  });

  const categories = Object.keys(categoryAgg).map((key) => {
    const def = CATEGORY_DEFS[key];
    const agg = categoryAgg[key];
    const share = grandTotalValue > 0 ? Number(((agg.totalValue / grandTotalValue) * 100).toFixed(1)) : 0;

    return {
      category: def.category,
      label: def.label,
      totalValue: agg.totalValue,
      totalQuantity: agg.totalQuantity,
      skuCount: agg.skuCount,
      sharePercent: share,
      color: def.color,
    };
  });

  return adminInventoryCategoriesResponseSchema(categories);
};


/**
 * 5. getInventoryMovementReportService
 * Báo cáo biến động Xuất / Nhập / Tồn kho và chi phí tiêu hao lâm sàng
 */
export const getInventoryMovementReportService = async ({
  preset = 'CUSTOM',
  startDate,
  endDate,
} = {}) => {
  const ranges = getReportDateRanges(preset, startDate, endDate);

  const products = await prisma.sanPham.findMany({
    where: { trangThai: 'hoat_dong' },
    select: {
      id: true,
      maSanPham: true,
      tenSanPham: true,
      loai: true,
      donViTinh: true,
      giaBan: true,
      soLuongTon: true,
      mucTonToiThieu: true,
    },
  });

  const totalStockValue = products.reduce(
    (sum, p) => sum + Number(p.soLuongTon || 0) * Number(p.giaBan || 0),
    0
  );

  const [consumptionAgg, timelineRaw, topConsumedRaw, transactionsRaw, movementsRaw] = await Promise.all([
    prisma.$queryRaw`
      SELECT 
          COALESCE(SUM(vtsd.so_luong * vtsd.don_gia), 0)::NUMERIC(18, 2) AS total_consumption_value,
          COALESCE(SUM(vtsd.so_luong), 0)::INT AS total_consumption_qty
      FROM vat_tu_su_dung vtsd
      JOIN ho_so_benh_an hsba ON vtsd.ho_so_id = hsba.id
      JOIN lich_hen lh ON hsba.lich_hen_id = lh.id
      WHERE lh.ngay_hen >= ${ranges.currStart} AND lh.ngay_hen <= ${ranges.currEnd};
    `,
    prisma.$queryRaw`
      SELECT 
          to_char(lh.ngay_hen, 'YYYY-MM-DD') AS date,
          to_char(lh.ngay_hen, 'DD/MM') AS label,
          COALESCE(SUM(vtsd.so_luong * vtsd.don_gia), 0)::NUMERIC(18, 2) AS consumption_amount,
          COALESCE(SUM(vtsd.so_luong), 0)::INT AS consumption_qty,
          COUNT(DISTINCT hsba.id)::INT AS treatment_sessions_count
      FROM vat_tu_su_dung vtsd
      JOIN ho_so_benh_an hsba ON vtsd.ho_so_id = hsba.id
      JOIN lich_hen lh ON hsba.lich_hen_id = lh.id
      WHERE lh.ngay_hen >= ${ranges.currStart} AND lh.ngay_hen <= ${ranges.currEnd}
      GROUP BY lh.ngay_hen
      ORDER BY lh.ngay_hen ASC;
    `,
    prisma.$queryRaw`
      SELECT 
          sp.id,
          sp.ma_san_pham AS code,
          sp.ten_san_pham AS name,
          sp.loai AS category,
          sp.don_vi_tinh AS unit,
          SUM(vtsd.so_luong)::INT AS quantity,
          SUM(vtsd.so_luong * vtsd.don_gia)::NUMERIC(18, 2) AS total_value
      FROM vat_tu_su_dung vtsd
      JOIN san_pham sp ON vtsd.san_pham_id = sp.id
      JOIN ho_so_benh_an hsba ON vtsd.ho_so_id = hsba.id
      JOIN lich_hen lh ON hsba.lich_hen_id = lh.id
      WHERE lh.ngay_hen >= ${ranges.currStart} AND lh.ngay_hen <= ${ranges.currEnd}
      GROUP BY sp.id, sp.ma_san_pham, sp.ten_san_pham, sp.loai, sp.don_vi_tinh
      ORDER BY total_value DESC
      LIMIT 5;
    `,
    prisma.$queryRaw`
      SELECT 
          vtsd.id,
          'PXK-' || to_char(lh.ngay_hen, 'YYYYMMDD') || '-' || SUBSTRING(vtsd.id::text, 1, 4) AS code,
          'EXPORT_TREATMENT' AS type,
          to_char(lh.ngay_hen, 'YYYY-MM-DD') AS date,
          to_char(lh.gio_hen, 'HH24:MI') AS time,
          sp.id AS material_id,
          sp.ma_san_pham AS material_code,
          sp.ten_san_pham AS material_name,
          sp.loai AS category,
          vtsd.so_luong AS quantity,
          sp.don_vi_tinh AS unit,
          vtsd.don_gia::NUMERIC(18, 2) AS unit_price,
          (vtsd.so_luong * vtsd.don_gia)::NUMERIC(18, 2) AS total_amount,
          COALESCE(ns.ho_ten, 'Bác sĩ điều trị') AS actor_name,
          bn.ho_ten AS patient_name,
          ptd.ten_phong AS room_name,
          vtsd.ghi_chu AS notes
      FROM vat_tu_su_dung vtsd
      JOIN san_pham sp ON vtsd.san_pham_id = sp.id
      JOIN ho_so_benh_an hsba ON vtsd.ho_so_id = hsba.id
      JOIN lich_hen lh ON hsba.lich_hen_id = lh.id
      JOIN benh_nhan bn ON lh.benh_nhan_id = bn.id
      LEFT JOIN ca_lam_viec clv ON lh.ca_lam_viec_id = clv.id
      LEFT JOIN nha_si ns ON clv.nha_si_id = ns.id
      LEFT JOIN phong_dieu_tri ptd ON clv.phong_dieu_tri_id = ptd.id
      WHERE lh.ngay_hen >= ${ranges.currStart} AND lh.ngay_hen <= ${ranges.currEnd}
      ORDER BY lh.ngay_hen DESC, lh.gio_hen DESC;
    `,
    prisma.$queryRaw`
      SELECT 
          sp.id,
          sp.ma_san_pham AS code,
          sp.ten_san_pham AS name,
          sp.loai AS category,
          sp.don_vi_tinh AS unit,
          sp.so_luong_ton AS ending_stock,
          sp.gia_ban AS unit_price,
          sp.muc_ton_toi_thieu AS min_alert_stock,
          COALESCE(SUM(vtsd.so_luong), 0)::INT AS consumed_stock
      FROM san_pham sp
      LEFT JOIN (
          SELECT v.san_pham_id, v.so_luong
          FROM vat_tu_su_dung v
          JOIN ho_so_benh_an h ON v.ho_so_id = h.id
          JOIN lich_hen l ON h.lich_hen_id = l.id
          WHERE l.ngay_hen >= ${ranges.currStart} AND l.ngay_hen <= ${ranges.currEnd}
      ) vtsd ON sp.id = vtsd.san_pham_id
      WHERE sp.trang_thai = 'hoat_dong'
      GROUP BY sp.id, sp.ma_san_pham, sp.ten_san_pham, sp.loai, sp.don_vi_tinh, sp.so_luong_ton, sp.gia_ban, sp.muc_ton_toi_thieu
      ORDER BY sp.ma_san_pham;
    `
  ]);

  const totalConsumptionValue = Number(consumptionAgg[0]?.total_consumption_value || 0);
  const totalConsumptionQty = Number(consumptionAgg[0]?.total_consumption_qty || 0);

  return {
    preset,
    startDate: ranges.startDateStr,
    endDate: ranges.endDateStr,
    comparisonLabel: ranges.comparisonLabel,
    totalStockValue,
    totalConsumptionValue,
    totalConsumptionQty,
    timeline: timelineRaw.map(t => ({
      date: t.date,
      label: t.label,
      consumptionAmount: Number(t.consumption_amount || 0),
      consumptionQty: Number(t.consumption_qty || 0),
      treatmentSessionsCount: Number(t.treatment_sessions_count || 0),
      importAmount: 0,
      importQty: 0,
    })),
    topConsumed: topConsumedRaw.map(tc => {
      const val = Number(tc.total_value || 0);
      return {
        id: tc.id,
        code: tc.code,
        name: tc.name,
        category: tc.category,
        unit: tc.unit || 'Cái',
        quantity: Number(tc.quantity || 0),
        totalValue: val,
        sharePercent: totalConsumptionValue > 0 ? Number(((val / totalConsumptionValue) * 100).toFixed(1)) : 0,
      };
    }),
    transactions: transactionsRaw.map(tx => ({
      id: tx.id,
      code: tx.code,
      type: tx.type,
      date: tx.date,
      time: tx.time,
      materialId: tx.material_id,
      materialCode: tx.material_code,
      materialName: tx.material_name,
      category: tx.category,
      quantity: Number(tx.quantity || 0),
      unit: tx.unit || 'Cái',
      unitPrice: Number(tx.unit_price || 0),
      totalAmount: Number(tx.total_amount || 0),
      actorName: tx.actor_name,
      patientName: tx.patient_name,
      roomName: tx.room_name,
      notes: tx.notes,
    })),
    movements: movementsRaw.map(m => {
      const endingStock = Number(m.ending_stock || 0);
      const consumedStock = Number(m.consumed_stock || 0);
      const unitPrice = Number(m.unit_price || 0);
      const minAlertStock = Number(m.min_alert_stock || 0);
      const beginningStock = endingStock + consumedStock;
      const totalEndingValue = endingStock * unitPrice;

      let status = 'SAFE';
      if (endingStock === 0) status = 'CRITICAL';
      else if (endingStock <= minAlertStock) status = 'LOW_STOCK';

      return {
        id: m.id,
        code: m.code,
        name: m.name,
        category: m.category,
        unit: m.unit || 'Cái',
        beginningStock,
        importedStock: 0,
        consumedStock,
        adjustedStock: 0,
        endingStock,
        unitPrice,
        totalEndingValue,
        minAlertStock,
        status,
      };
    }),
  };
};

export default {
  getRevenueTrendReportService,
  getPaymentMethodsReportService,
  getTopPerformanceReportService,
  getInventoryCategoriesReportService,
  getInventoryMovementReportService,
};
