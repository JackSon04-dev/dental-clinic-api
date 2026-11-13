import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import { formatTimeHHmm } from '../../../utils/dateFormatter.js';
import {
  getWeekRangeFromDateString,
  getVietnamTodayDateString,
  formatDateYYYYMMDD,
} from '../../../dtos/departments/admins/adminWorkShiftDto.js';
import {
  dentistDashboardStatsResponseSchema,
  dentistQueueItemResponseSchema,
  dentistWeeklyShiftsResponseSchema,
} from '../../../dtos/departments/dentists/dentistDashboardDto.js';

/**
 * Lấy 5 chỉ số KPI cho Dashboard Bác sĩ
 */
export const getDentistDashboardStatsService = async (dentistId) => {
  const todayStr = getVietnamTodayDateString();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  // Điều kiện lọc theo ca trực của bác sĩ
  const doctorCondition = dentistId
    ? { caLamViec: { nhaSiId: dentistId } }
    : {};

  const [
    waitingCount,
    inProgressCount,
    completedCount,
    activePlansCount,
    totalPlansCount,
    todayRecordsCount,
  ] = await Promise.all([
    // 1. Bệnh nhân đang chờ (Đã xác nhận hoặc Đã tiếp nhận)
    prisma.lichHen.count({
      where: {
        ngayHen: todayDate,
        trangThai: { in: ['da_xac_nhan', 'da_tiep_nhan', 'cho_kham'] },
        ...doctorCondition,
      },
    }),

    // 2. Đang điều trị trên ghế
    prisma.lichHen.count({
      where: {
        ngayHen: todayDate,
        trangThai: 'dang_kham',
        ...doctorCondition,
      },
    }),

    // 3. Đã hoàn thành / chuyển thu ngân hôm nay
    prisma.lichHen.count({
      where: {
        ngayHen: todayDate,
        trangThai: { in: ['cho_thanh_toan', 'da_kham', 'hoan_thanh'] },
        ...doctorCondition,
      },
    }),

    // 4. Phác đồ điều trị đang thực hiện
    dentistId
      ? prisma.phacDoDieuTri.count({
          where: {
            nhaSiId: dentistId,
            trangThai: 'dang_dieu_tri',
          },
        })
      : prisma.phacDoDieuTri.count({
          where: { trangThai: 'dang_dieu_tri' },
        }),

    // 5. Tổng số phác đồ điều trị
    dentistId
      ? prisma.phacDoDieuTri.count({
          where: { nhaSiId: dentistId },
        })
      : prisma.phacDoDieuTri.count(),

    // 6. Hồ sơ bệnh án khám hôm nay
    prisma.hoSoBenhAn.count({
      where: {
        ngayKham: todayDate,
        ...(dentistId
          ? { lichHen: { caLamViec: { nhaSiId: dentistId } } }
          : {}),
      },
    }),
  ]);

  return dentistDashboardStatsResponseSchema({
    waitingCount,
    inProgressCount,
    activePlansCount,
    totalPlansCount,
    todayRecordsCount,
    completedCount,
  });
};

/**
 * Lấy hàng đợi bệnh nhân chờ khám tại phòng hôm nay
 */
export const getDentistTodayQueueService = async (dentistId) => {
  const todayStr = getVietnamTodayDateString();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  const baseStatuses = [
    'da_xac_nhan',
    'da_tiep_nhan',
    'cho_kham',
    'dang_kham',
    'cho_thanh_toan',
    'da_kham',
    'hoan_thanh',
  ];

  let where = {
    ngayHen: todayDate,
    trangThai: { in: baseStatuses },
  };

  if (dentistId) {
    where.caLamViec = { nhaSiId: dentistId };
  }

  let slips = await prisma.lichHen.findMany({
    where,
    include: {
      benhNhan: true,
      caLamViec: {
        include: {
          phongDieuTri: true,
        },
      },
      dichVu: true,
    },
    orderBy: [
      { gioHen: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  // Nếu ca trực riêng của bác sĩ chưa có ca nào, lấy toàn bộ ca hẹn hôm nay của phòng khám
  if (slips.length === 0 && dentistId) {
    slips = await prisma.lichHen.findMany({
      where: {
        ngayHen: todayDate,
        trangThai: { in: baseStatuses },
      },
      include: {
        benhNhan: true,
        caLamViec: {
          include: {
            phongDieuTri: true,
          },
        },
        dichVu: true,
      },
      orderBy: [
        { gioHen: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  return slips.map(dentistQueueItemResponseSchema);
};

/**
 * Lấy lịch làm việc & ca trực trong tuần của Bác sĩ
 */
export const getDentistWeeklyShiftsService = async (dentistId, dateStr = null) => {
  const weekRange = getWeekRangeFromDateString(dateStr);

  const where = {
    ngay: {
      gte: new Date(weekRange.startDate),
      lte: new Date(weekRange.endDate),
    },
  };

  if (dentistId) {
    where.nhaSiId = dentistId;
  }

  const shifts = await prisma.caLamViec.findMany({
    where,
    include: {
      phongDieuTri: true,
      lichHen: true,
    },
    orderBy: [
      { ngay: 'asc' },
      { gioBatDau: 'asc' },
    ],
  });

  return dentistWeeklyShiftsResponseSchema(weekRange, shifts);
};

/**
 * Điểm danh ca trực của Bác sĩ
 * - Nếu Bác sĩ tự điểm danh: kiểm tra giới hạn 15 phút sau khi ca bắt đầu.
 *   Nếu quá 15 phút -> chuyển sang 'vang_mat' và ném lỗi 403 yêu cầu liên hệ Admin.
 * - Nếu Admin điểm danh: cho phép điểm danh hộ bất kỳ lúc nào.
 */
export const updateShiftAttendanceService = async (shiftId, user, status = 'co_mat') => {
  const shift = await prisma.caLamViec.findUnique({
    where: { id: shiftId },
  });

  if (!shift) {
    throw new ApiError(404, 'Không tìm thấy ca làm việc');
  }

  const callerRole = user?.role || (typeof user === 'string' ? 'BAC_SI' : 'BAC_SI');
  const callerDoctorId = user?.profileId || (typeof user === 'string' ? user : null);

  if (callerRole === 'BAC_SI') {
    if (callerDoctorId && shift.nhaSiId !== callerDoctorId) {
      throw new ApiError(403, 'Bạn không thể điểm danh ca trực của bác sĩ khác');
    }

    // Kiểm tra thời gian điểm danh của Bác sĩ
    const dateStr = formatDateYYYYMMDD(shift.ngay);
    const timeStr = formatTimeHHmm(shift.gioBatDau);
    const shiftStartMs = new Date(`${dateStr}T${timeStr}:00+07:00`).getTime();
    const nowMs = Date.now();

    // 1. Chưa tới giờ bắt đầu ca trực -> Không cho phép điểm danh trước
    if (nowMs < shiftStartMs) {
      const formattedDateVN = dateStr.split('-').reverse().join('/');
      throw new ApiError(
        400,
        `Chưa tới giờ bắt đầu ca làm việc (${timeStr} ngày ${formattedDateVN}). Bác sĩ không thể điểm danh trước.`
      );
    }

    // 2. Quá 15 phút sau giờ bắt đầu ca trực -> Tự động chuyển Vắng mặt và chỉ Admin mới điểm danh hộ được
    if (nowMs > shiftStartMs + 15 * 60 * 1000) {
      if (shift.trangThai === 'chua_dien_ra') {
        await prisma.caLamViec.update({
          where: { id: shiftId },
          data: {
            trangThai: 'vang_mat',
            updatedAt: new Date(),
          },
        });
      }
      throw new ApiError(
        403,
        'Đã quá thời gian tự điểm danh (15 phút sau khi ca bắt đầu). Ca trực đã chuyển sang Vắng mặt. Vui lòng liên hệ Admin để được hỗ trợ điểm danh.'
      );
    }
  }

  const updated = await prisma.caLamViec.update({
    where: { id: shiftId },
    data: {
      trangThai: status,
      updatedAt: new Date(),
    },
    include: {
      phongDieuTri: true,
      lichHen: true,
    },
  });

  return updated;
};

/**
 * Lấy danh sách lịch hẹn của Bác sĩ (có thể lọc theo ngày, trạng thái, tìm kiếm)
 */
export const getDentistAppointmentsService = async (dentistId, { date, status, search, shiftId } = {}) => {
  const where = {};

  if (dentistId) {
    where.caLamViec = { nhaSiId: dentistId };
  }

  if (shiftId) {
    where.caLamViecId = shiftId;
  }

  if (date) {
    const targetDate = new Date(`${date}T00:00:00.000Z`);
    where.ngayHen = targetDate;
  }

  if (status && status !== 'ALL') {
    const statusMap = {
      'CHO_XAC_NHAN': 'cho_xac_nhan',
      'DA_XAC_NHAN': 'da_xac_nhan',
      'DA_TIEP_NHAN': 'da_tiep_nhan',
      'CHO_KHAM': 'cho_kham',
      'DANG_KHAM': 'dang_kham',
      'DANG_DIEU_TRI': 'dang_dieu_tri',
      'HOAN_THANH': { in: ['hoan_thanh', 'da_kham'] },
      'CHO_THANH_TOAN': 'cho_thanh_toan',
      'DA_HUY': 'da_huy',
    };
    where.trangThai = statusMap[status] || status.toLowerCase();
  }

  if (search) {
    where.OR = [
      { benhNhan: { hoTen: { contains: search, mode: 'insensitive' } } },
      { benhNhan: { soDienThoai: { contains: search } } },
      { maLichHen: { contains: search, mode: 'insensitive' } },
    ];
  }

  const appointments = await prisma.lichHen.findMany({
    where,
    include: {
      benhNhan: true,
      dichVu: true,
      caLamViec: {
        include: {
          nhaSi: true,
          phongDieuTri: true,
        },
      },
    },
    orderBy: [
      { ngayHen: 'desc' },
      { gioHen: 'asc' },
    ],
  });

  const statusReverseMap = {
    'cho_xac_nhan': 'CHO_XAC_NHAN',
    'da_xac_nhan': 'DA_XAC_NHAN',
    'da_tiep_nhan': 'DA_TIEP_NHAN',
    'cho_kham': 'CHO_KHAM',
    'dang_kham': 'DANG_KHAM',
    'dang_dieu_tri': 'DANG_DIEU_TRI',
    'da_kham': 'HOAN_THANH',
    'hoan_thanh': 'HOAN_THANH',
    'cho_thanh_toan': 'CHO_THANH_TOAN',
    'da_huy': 'DA_HUY',
    'huy': 'DA_HUY',
  };

  return appointments.map((item) => ({
    id: item.id,
    code: item.maLichHen || `LH-${item.id.slice(0, 8)}`,
    patientId: item.benhNhanId,
    patientName: item.benhNhan?.hoTen || 'Bệnh nhân',
    patientPhone: item.benhNhan?.sdt || item.benhNhan?.soDienThoai || '',
    patientAvatarUrl: item.benhNhan?.hinhAnhUrl || null,
    avatarUrl: item.benhNhan?.hinhAnhUrl || null,
    patientBirthYear: item.benhNhan?.ngaySinh ? new Date(item.benhNhan.ngaySinh).getFullYear() : undefined,
    patientGender: item.benhNhan?.gioiTinh === 'nam' ? 'MALE' : 'FEMALE',
    dentistId: item.caLamViec?.nhaSiId || '',
    dentistName: item.caLamViec?.nhaSi?.hoTen || 'Bác sĩ',
    serviceId: item.dichVuId || '',
    serviceName: item.dichVu?.tenDichVu || 'Khám răng hàm mặt',
    roomId: item.caLamViec?.phongDieuTriId || '',
    roomName: item.caLamViec?.phongDieuTri?.tenPhong || 'Phòng khám',
    shiftId: item.caLamViecId,
    caLamViecId: item.caLamViecId,
    date: item.ngayHen.toISOString().slice(0, 10),
    time: item.gioHen.toISOString().slice(11, 16),
    timeSlot: item.gioHen.toISOString().slice(11, 16),
    doctorRoom: item.caLamViec?.phongDieuTri?.tenPhong || 'Phòng khám',
    status: statusReverseMap[item.trangThai] || (item.trangThai ? item.trangThai.toUpperCase() : 'CHO_KHAM'),
    rawStatus: item.trangThai,
    notes: item.ghiChu || '',
    createdAt: item.createdAt.toISOString(),
  }));
};

export default {
  getDentistDashboardStatsService,
  getDentistTodayQueueService,
  getDentistWeeklyShiftsService,
  updateShiftAttendanceService,
  getDentistAppointmentsService,
};
