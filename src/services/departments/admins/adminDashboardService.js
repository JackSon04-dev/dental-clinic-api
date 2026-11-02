import prisma from '../../../config/prisma.js';
import {
  adminDashboardStatsResponseSchema,
  adminTopServicesResponseSchema,
  adminAlertsResponseSchema,
  adminPatientFlowResponseSchema,
  adminChairUtilizationResponseSchema,
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

/**
 * 4. getPatientFlowService
 * Thống kê lưu lượng bệnh nhân theo chuỗi thời gian (7D | 30D | TODAY)
 * Phân loại Khách mới (newPatients = ca khám đầu tiên trong đời) vs Tái khám (followUp = có phác đồ hoặc ca thứ 2+)
 */
export const getPatientFlowService = async ({ timeRange = '7D', date } = {}) => {
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(23, 59, 59, 999);

  const DAYS_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const pad = (n) => String(n).padStart(2, '0');

  let startRange = new Date(targetDate);
  let endRange = new Date(targetDate);
  let prevStart = new Date(targetDate);
  let prevEnd = new Date(targetDate);

  let pointDefs = [];

  if (timeRange === 'TODAY') {
    startRange.setHours(0, 0, 0, 0);
    prevStart = new Date(startRange);
    prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(endRange);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const hours = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    pointDefs = hours.map((h) => ({
      key: h,
      label: h,
      hour: parseInt(h.split(':')[0], 10),
    }));
  } else if (timeRange === '30D') {
    // 4 tuần gần nhất
    startRange.setDate(startRange.getDate() - 27);
    startRange.setHours(0, 0, 0, 0);

    prevStart = new Date(startRange);
    prevStart.setDate(prevStart.getDate() - 28);
    prevEnd = new Date(startRange);
    prevEnd.setMilliseconds(-1);

    pointDefs = [
      { key: 'W1', label: 'Tuần 1', startDayOffset: 0, endDayOffset: 6 },
      { key: 'W2', label: 'Tuần 2', startDayOffset: 7, endDayOffset: 13 },
      { key: 'W3', label: 'Tuần 3', startDayOffset: 14, endDayOffset: 20 },
      { key: 'W4', label: 'Tuần 4', startDayOffset: 21, endDayOffset: 27 },
    ];
  } else {
    // Mặc định: '7D' (7 ngày gần nhất)
    startRange.setDate(startRange.getDate() - 6);
    startRange.setHours(0, 0, 0, 0);

    prevStart = new Date(startRange);
    prevStart.setDate(prevStart.getDate() - 7);
    prevEnd = new Date(startRange);
    prevEnd.setMilliseconds(-1);

    for (let i = 0; i < 7; i++) {
      const cur = new Date(startRange);
      cur.setDate(cur.getDate() + i);
      const dayLabel = `${DAYS_VN[cur.getDay()]} (${pad(cur.getDate())}/${pad(cur.getMonth() + 1)})`;
      const dateKey = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
      pointDefs.push({
        key: dateKey,
        label: dayLabel,
      });
    }
  }

  // Truy vấn tất cả ca khám trong khoảng thời gian phân loại khách mới vs tái khám
  const [appointmentsRaw, prevTotalRaw] = await Promise.all([
    prisma.$queryRaw`
      SELECT 
          lh.id,
          lh.benh_nhan_id,
          lh.ngay_hen::TEXT as ngay_str,
          EXTRACT(HOUR FROM lh.gio_hen)::INT as gio_hen_hour,
          CASE 
              WHEN gdpd.id IS NOT NULL THEN 'follow_up'
              WHEN lh.ngay_hen = first_app.min_ngay_hen AND lh.gio_hen = first_app.min_gio_hen THEN 'new_patient'
              ELSE 'follow_up'
          END AS patient_type
      FROM lich_hen lh
      LEFT JOIN giai_doan_phac_do gdpd ON gdpd.lich_hen_id = lh.id
      JOIN (
          SELECT benh_nhan_id, MIN(ngay_hen) AS min_ngay_hen, MIN(gio_hen) AS min_gio_hen
          FROM lich_hen
          WHERE trang_thai != 'da_huy'
          GROUP BY benh_nhan_id
      ) first_app ON first_app.benh_nhan_id = lh.benh_nhan_id
      WHERE lh.trang_thai != 'da_huy'
        AND lh.ngay_hen >= ${startRange}
        AND lh.ngay_hen <= ${endRange};
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::INT as total_prev
      FROM lich_hen
      WHERE trang_thai != 'da_huy'
        AND ngay_hen >= ${prevStart}
        AND ngay_hen <= ${prevEnd};
    `,
  ]);

  const prevTotal = Number(prevTotalRaw[0]?.total_prev || 0);
  const currentTotal = appointmentsRaw.length;

  let points = [];

  if (timeRange === 'TODAY') {
    points = pointDefs.map((def) => {
      const matched = appointmentsRaw.filter((a) => a.gio_hen_hour === def.hour);
      const newPatients = matched.filter((a) => a.patient_type === 'new_patient').length;
      const followUp = matched.filter((a) => a.patient_type === 'follow_up').length;
      return {
        label: def.label,
        date: def.label,
        newPatients,
        followUp,
        total: newPatients + followUp,
      };
    });
  } else if (timeRange === '30D') {
    points = pointDefs.map((def) => {
      const wStart = new Date(startRange);
      wStart.setDate(wStart.getDate() + def.startDayOffset);
      const wEnd = new Date(startRange);
      wEnd.setDate(wEnd.getDate() + def.endDayOffset);
      wEnd.setHours(23, 59, 59, 999);

      const matched = appointmentsRaw.filter((a) => {
        const d = new Date(a.ngay_str);
        return d >= wStart && d <= wEnd;
      });

      const newPatients = matched.filter((a) => a.patient_type === 'new_patient').length;
      const followUp = matched.filter((a) => a.patient_type === 'follow_up').length;
      return {
        label: def.label,
        date: def.label,
        newPatients,
        followUp,
        total: newPatients + followUp,
      };
    });
  } else {
    // '7D'
    points = pointDefs.map((def) => {
      const matched = appointmentsRaw.filter((a) => a.ngay_str === def.key);
      const newPatients = matched.filter((a) => a.patient_type === 'new_patient').length;
      const followUp = matched.filter((a) => a.patient_type === 'follow_up').length;
      return {
        label: def.label,
        date: def.label,
        newPatients,
        followUp,
        total: newPatients + followUp,
      };
    });
  }

  return adminPatientFlowResponseSchema({
    timeRange,
    growthRatePercentage: calculateGrowthRate(currentTotal, prevTotal),
    points,
  });
};

/**
 * 5. getChairUtilizationService
 * Tính tỷ lệ lấp đầy theo 5 khung giờ trong ngày dựa trên số phòng hoạt động và số ca khám
 */
export const getChairUtilizationService = async ({ date } = {}) => {
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;

  // 1. Tổng số phòng đang hoạt động (Level 0: phong_dieu_tri)
  const totalActiveRooms = await prisma.phongDieuTri.count({
    where: { trangThai: 'hoat_dong' },
  });

  // 2. Định nghĩa 5 khung giờ chuẩn theo nghiệp vụ phòng khám (khớp 100% với ChairUtilizationChart UI)
  const SLOTS = [
    { slot: '08:00 - 10:00', label: 'Đầu ca sáng', start: '08:00:00', end: '10:00:00' },
    { slot: '10:00 - 12:00', label: 'Cao điểm sáng', start: '10:00:00', end: '12:00:00' },
    { slot: '13:30 - 15:30', label: 'Đầu ca chiều', start: '13:30:00', end: '15:30:00' },
    { slot: '15:30 - 17:30', label: 'Cao điểm chiều', start: '15:30:00', end: '17:30:00' },
    { slot: '17:30 - 19:30', label: 'Ca ngoài giờ', start: '17:30:00', end: '19:30:00' },
  ];

  // 3. Lấy toàn bộ lịch hẹn trong ngày có gắn phòng điều trị qua ca_lam_viec
  const dayAppointments = await prisma.$queryRaw`
    SELECT 
        lh.id,
        clv.phong_dieu_tri_id,
        TO_CHAR(lh.gio_hen, 'HH24:MI:SS') AS start_time,
        TO_CHAR(COALESCE(lh.gio_ket_thuc_du_kien, lh.gio_hen + interval '30 minutes'), 'HH24:MI:SS') AS end_time
    FROM lich_hen lh
    JOIN ca_lam_viec clv ON lh.ca_lam_viec_id = clv.id
    WHERE lh.trang_thai != 'da_huy'
      AND lh.ngay_hen = ${targetDate};
  `;

  let sumRate = 0;

  const timeSlots = SLOTS.map((s) => {
    // Lọc các ca khám nằm trong slot
    const inSlot = dayAppointments.filter(
      (app) => app.start_time < s.end && app.end_time > s.start
    );

    // Đếm số phòng có bệnh nhân trong slot
    const activeRoomsSet = new Set(inSlot.map((app) => app.phong_dieu_tri_id));
    const activeRooms = activeRoomsSet.size;

    // Tỷ lệ lấp đầy = (activeRooms / totalActiveRooms) * 100
    const rate = totalActiveRooms > 0
      ? Math.min(100, Math.round((activeRooms / totalActiveRooms) * 100))
      : 0;

    sumRate += rate;

    return {
      slot: s.slot,
      label: s.label,
      rate,
      activeRooms,
    };
  });

  const overallOccupancyRate = SLOTS.length > 0 ? Math.round(sumRate / SLOTS.length) : 0;

  return adminChairUtilizationResponseSchema({
    date: dateStr,
    totalActiveRooms,
    overallOccupancyRate,
    timeSlots,
  });
};


/**
 * 6. getActiveDentistsService
 * Lấy danh sách 4 bác sĩ trực ca hôm nay tương ứng với 4 phòng điều trị
 * So sánh thời gian hiện tại với giờ bắt đầu ca để tự động lọc Ca Sáng (08:00 - 12:00) hoặc Ca Chiều (13:30 - 17:30)
 * Query count số lượng ca khám thực tế trong ngày từ bảng lich_hen
 */
export const getActiveDentistsService = async ({ date = null, session = 'AUTO' } = {}) => {
  let dateStr = date;
  if (!dateStr) {
    const now = new Date();
    const vnDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    dateStr = vnDateStr;
  }

  let selectedSession = session;
  if (!selectedSession || selectedSession === 'AUTO') {
    const now = new Date();
    const vnTimeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
    const hour = parseInt(vnTimeStr.split(':')[0], 10);
    selectedSession = hour < 13 ? 'SANG' : 'CHIEU';
  }

  const startTimeMin = selectedSession === 'SANG' ? '00:00:00' : '12:00:00';
  const startTimeMax = selectedSession === 'SANG' ? '12:00:00' : '23:59:59';

  const shiftsRaw = await prisma.$queryRaw`
    SELECT 
        clv.id AS shift_id,
        TO_CHAR(clv.gio_bat_dau, 'HH24:MI') AS start_time,
        TO_CHAR(clv.gio_ket_thuc, 'HH24:MI') AS end_time,
        clv.trang_thai AS shift_status,
        clv.ghi_chu AS notes,
        ns.id AS doctor_id,
        ns.ma_nha_si AS doctor_code,
        ns.ho_ten AS doctor_name,
        ns.chuyen_khoa AS doctor_specialty,
        ns.sdt AS doctor_phone,
        pdt.id AS room_id,
        pdt.ma_phong AS room_code,
        pdt.ten_phong AS room_name,
        (
            SELECT COUNT(*)::INT
            FROM lich_hen lh
            WHERE lh.ca_lam_viec_id = clv.id
              AND lh.trang_thai != 'da_huy'
        ) AS patient_count
    FROM ca_lam_viec clv
    JOIN nha_si ns ON clv.nha_si_id = ns.id
    JOIN phong_dieu_tri pdt ON clv.phong_dieu_tri_id = pdt.id
    WHERE clv.ngay = ${dateStr}::DATE
      AND clv.gio_bat_dau >= ${startTimeMin}::TIME
      AND clv.gio_bat_dau < ${startTimeMax}::TIME
    ORDER BY pdt.ma_phong ASC;
  `;

  const statusTitleMap = {
    co_mat: 'Có mặt',
    dang_dien_ra: 'Đang trực',
    dang_kham: 'Đang khám',
    chua_dien_ra: 'Chưa diễn ra',
    vang_mat: 'Vắng mặt',
  };

  const doctors = shiftsRaw.map((s) => ({
    shiftId: s.shift_id,
    session: selectedSession,
    startTime: s.start_time,
    endTime: s.end_time,
    shiftStatus: s.shift_status,
    statusTitle: statusTitleMap[s.shift_status] || 'Chưa diễn ra',
    doctor: {
      id: s.doctor_id,
      code: s.doctor_code,
      fullName: s.doctor_name,
      specialty: s.doctor_specialty || 'Nha khoa tổng quát',
      phone: s.doctor_phone,
    },
    room: {
      id: s.room_id,
      code: s.room_code,
      name: s.room_name,
    },
    patientToday: Number(s.patient_count || 0),
  }));

  return {
    date: dateStr,
    currentSession: selectedSession,
    sessionTitle: selectedSession === 'SANG' ? 'Ca Sáng (08:00 - 12:00)' : 'Ca Chiều (13:30 - 17:30)',
    totalDoctorsOnShift: doctors.length,
    doctors,
  };
};

export default {
  getDashboardStatsService,
  getTopServicesService,
  getInventoryAlertsService,
  getPatientFlowService,
  getChairUtilizationService,
  getActiveDentistsService,
};


