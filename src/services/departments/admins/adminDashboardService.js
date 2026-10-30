import prisma from '../../../config/prisma.js';
import {
  adminDashboardStatsResponseSchema,
  adminTopServicesResponseSchema,
  adminAlertsResponseSchema,
} from '../../../dtos/departments/admins/adminDashboardDto.js';

/**
 * calculateGrowthRate
 * Tính tỷ lệ % tăng trưởng giữa kỳ hiện tại và kỳ trước
 */
const calculateGrowthRate = (current, previous) => {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(2));
};

/**
 * getDateRanges
 * Xác định các mốc thời gian bắt đầu và kết thúc của kỳ hiện tại và kỳ trước
 */
const getDateRanges = (period = 'this_month') => {
  const now = new Date();

  let currentStart = new Date();
  let currentEnd = new Date();
  let prevStart = new Date();
  let prevEnd = new Date();

  if (period === 'today') {
    currentStart.setHours(0, 0, 0, 0);
    currentEnd.setHours(23, 59, 59, 999);

    prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(currentEnd);
    prevEnd.setDate(prevEnd.getDate() - 1);
  } else if (period === 'this_week') {
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Quy ước Thứ 2 là đầu tuần
    currentStart.setDate(now.getDate() - dayOfWeek + 1);
    currentStart.setHours(0, 0, 0, 0);

    currentEnd = new Date(currentStart);
    currentEnd.setDate(currentStart.getDate() + 6);
    currentEnd.setHours(23, 59, 59, 999);

    prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - 7);

    prevEnd = new Date(currentEnd);
    prevEnd.setDate(prevEnd.getDate() - 7);
  } else if (period === 'this_quarter') {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
    currentEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);

    prevStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), currentQuarter * 3, 0, 23, 59, 59, 999);
  } else if (period === 'this_year') {
    currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  } else {
    // Mặc định: 'this_month'
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  }

  return { currentStart, currentEnd, prevStart, prevEnd };
};

/**
 * 1. getRevenueStats
 * Gọi DB Function `fn_calculate_revenue` để tính doanh thu thực thu kỳ này và kỳ trước
 */
const getRevenueStats = async (ranges) => {
  const [currResult, prevResult] = await Promise.all([
    prisma.$queryRaw`SELECT fn_calculate_revenue(${ranges.currentStart}, ${ranges.currentEnd}) AS rev;`,
    prisma.$queryRaw`SELECT fn_calculate_revenue(${ranges.prevStart}, ${ranges.prevEnd}) AS rev;`,
  ]);

  const current = Number(currResult[0]?.rev || 0);
  const previous = Number(prevResult[0]?.rev || 0);

  return {
    current,
    previous,
    growthRatePercentage: calculateGrowthRate(current, previous),
  };
};

/**
 * 2. getCompletedExaminationsStats
 * Đếm số ca thực sự đã khám có lập hồ sơ bệnh án (ho_so_benh_an) trong kỳ
 */
const getCompletedExaminationsStats = async (ranges) => {
  const [current, previous] = await Promise.all([
    prisma.hoSoBenhAn.count({
      where: {
        ngayKham: {
          gte: ranges.currentStart,
          lte: ranges.currentEnd,
        },
      },
    }),
    prisma.hoSoBenhAn.count({
      where: {
        ngayKham: {
          gte: ranges.prevStart,
          lte: ranges.prevEnd,
        },
      },
    }),
  ]);

  return {
    current,
    previous,
    growthRatePercentage: calculateGrowthRate(current, previous),
  };
};

/**
 * 3. getTodayAppointmentsStats
 * Lấy lịch hẹn trong ngày hôm nay (00:00:00 -> 23:59:59) và phân loại theo trạng thái
 */
const getTodayAppointmentsStats = async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const appointments = await prisma.lichHen.findMany({
    where: {
      ngayHen: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    select: {
      trangThai: true,
    },
  });

  let total = 0;
  let confirmed = 0;
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;

  for (const app of appointments) {
    if (app.trangThai === 'da_xac_nhan') confirmed++;
    else if (app.trangThai === 'dang_kham') inProgress++;
    else if (app.trangThai === 'da_kham') completed++;
    else if (app.trangThai === 'da_huy') cancelled++;

    // Tổng số lịch hẹn không bao gồm các lịch bị hủy
    if (app.trangThai !== 'da_huy') {
      total++;
    }
  }

  return {
    total,
    confirmed,
    inProgress,
    completed,
    cancelled,
  };
};

/**
 * 4. getTodayNewPatientsStats
 * Đếm số bệnh nhân mới tạo trong ngày hôm nay từ bảng `benh_nhan` và so sánh với hôm qua
 */
const getTodayNewPatientsStats = async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayEnd);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  const [current, yesterday] = await Promise.all([
    prisma.benhNhan.count({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    }),
    prisma.benhNhan.count({
      where: {
        createdAt: {
          gte: yesterdayStart,
          lte: yesterdayEnd,
        },
      },
    }),
  ]);

  return {
    current,
    yesterday,
    growthRatePercentage: calculateGrowthRate(current, yesterday),
  };
};

/**
 * getDashboardStatsService
 * Hàm điều phối chính: Gọi đồng thời 4 tác vụ thống kê qua Promise.all
 */
export const getDashboardStatsService = async (period = 'this_month') => {
  const ranges = getDateRanges(period);

  // Đóng gói và chạy đồng thời 4 tác vụ độc lập qua Promise.all
  const [revenue, completedExaminations, todayAppointments, todayNewPatients] = await Promise.all([
    getRevenueStats(ranges),
    getCompletedExaminationsStats(ranges),
    getTodayAppointmentsStats(),
    getTodayNewPatientsStats(),
  ]);

  // Trả về dữ liệu đã được sanitizer & format 100% camelCase
  return adminDashboardStatsResponseSchema({
    period,
    revenue,
    completedExaminations,
    todayAppointments,
    todayNewPatients,
  });
};

/**
 * getTopServicesService
 * Lấy danh sách Top dịch vụ được sử dụng nhiều nhất và doanh thu mang lại
 * Truy vấn qua PostgreSQL VIEW `v_dich_vu_da_thanh_toan`
 */
export const getTopServicesService = async (period = 'this_month', limit = 5) => {
  const ranges = getDateRanges(period);
  const limitNumber = Number(limit) || 5;

  const [servicesRaw, grandTotalRaw] = await Promise.all([
    prisma.$queryRaw`
      SELECT 
          dich_vu_id,
          ma_dich_vu,
          ten_dich_vu,
          SUM(so_luong)::INT AS execution_count,
          SUM(thanh_tien)::NUMERIC(18, 2) AS total_revenue
      FROM v_dich_vu_da_thanh_toan
      WHERE ngay_thanh_toan >= ${ranges.currentStart}
        AND ngay_thanh_toan <= ${ranges.currentEnd}
      GROUP BY dich_vu_id, ma_dich_vu, ten_dich_vu
      ORDER BY execution_count DESC, total_revenue DESC
      LIMIT ${limitNumber};
    `,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(thanh_tien), 0)::NUMERIC(18, 2) AS grand_total
      FROM v_dich_vu_da_thanh_toan
      WHERE ngay_thanh_toan >= ${ranges.currentStart}
        AND ngay_thanh_toan <= ${ranges.currentEnd};
    `,
  ]);

  const grandTotal = Number(grandTotalRaw[0]?.grand_total || 0);

  const services = servicesRaw.map((svc) => {
    const totalRev = Number(svc.total_revenue || 0);
    const percentage = grandTotal > 0 ? Number(((totalRev / grandTotal) * 100).toFixed(2)) : 0;
    return {
      serviceId: svc.dich_vu_id,
      serviceCode: svc.ma_dich_vu,
      serviceName: svc.ten_dich_vu,
      executionCount: Number(svc.execution_count || 0),
      totalRevenue: totalRev,
      percentageContribution: percentage,
    };
  });

  return adminTopServicesResponseSchema({
    period,
    totalRevenuePeriod: grandTotal,
    services,
  });
};

/**
 * getInventoryAlertsService
 * Lấy danh sách cảnh báo tồn kho thấp cho các vật tư / sản phẩm y tế
 */
export const getInventoryAlertsService = async (limit = 20) => {
  const limitNumber = Number(limit) || 20;

  const rawProducts = await prisma.$queryRaw`
    SELECT 
        id, 
        ma_san_pham, 
        ten_san_pham, 
        loai, 
        don_vi_tinh, 
        so_luong_ton, 
        muc_ton_toi_thieu 
    FROM san_pham 
    WHERE trang_thai = 'hoat_dong' 
      AND so_luong_ton <= muc_ton_toi_thieu 
    ORDER BY 
      CASE WHEN so_luong_ton = 0 THEN 0 ELSE 1 END ASC,
      so_luong_ton ASC,
      muc_ton_toi_thieu DESC
    LIMIT ${limitNumber};
  `;

  let criticalCount = 0;
  let warningCount = 0;

  const alerts = rawProducts.map((p) => {
    const stock = Number(p.so_luong_ton || 0);
    const minThreshold = Number(p.muc_ton_toi_thieu || 0);
    const isCritical = stock === 0;

    if (isCritical) {
      criticalCount++;
    } else {
      warningCount++;
    }

    return {
      id: p.id,
      productCode: p.ma_san_pham,
      productName: p.ten_san_pham,
      category: p.loai,
      unit: p.don_vi_tinh,
      stockQuantity: stock,
      minStockThreshold: minThreshold,
      alertLevel: isCritical ? 'CRITICAL' : 'WARNING',
      message: isCritical
        ? 'Vật tư đã hết hàng hoàn toàn trong kho (Tồn: 0)'
        : `Số lượng tồn (${stock}) đã chạm ngưỡng tồn tối thiểu (${minThreshold})`,
    };
  });

  return adminAlertsResponseSchema({
    summary: {
      totalAlerts: alerts.length,
      criticalCount,
      warningCount,
    },
    alerts,
  });
};

export default {
  getDashboardStatsService,
  getTopServicesService,
  getInventoryAlertsService,
};
