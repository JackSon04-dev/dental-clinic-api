import Joi from 'joi';
import { getDoctorDegreeSurcharge, formatDoctorFullName } from '../../constants/academicDegree.js';

// ============================================================================
// 1. 16 KHUNG GIỜ CỐ ĐỊNH CHUẨN CỦA PHÒNG KHÁM
// ============================================================================
export const STANDARD_SLOTS = [
  // Sáng: 08:00 - 12:00
  { slotIndex: 1, time: '08:00', endTime: '08:20', displayTime: '08:00 – 08:20', period: 'morning' },
  { slotIndex: 2, time: '08:30', endTime: '08:50', displayTime: '08:30 – 08:50', period: 'morning' },
  { slotIndex: 3, time: '09:00', endTime: '09:20', displayTime: '09:00 – 09:20', period: 'morning' },
  { slotIndex: 4, time: '09:30', endTime: '09:50', displayTime: '09:30 – 09:50', period: 'morning' },
  { slotIndex: 5, time: '10:00', endTime: '10:20', displayTime: '10:00 – 10:20', period: 'morning' },
  { slotIndex: 6, time: '10:30', endTime: '10:50', displayTime: '10:30 – 10:50', period: 'morning' },
  { slotIndex: 7, time: '11:00', endTime: '11:20', displayTime: '11:00 – 11:20', period: 'morning' },
  { slotIndex: 8, time: '11:30', endTime: '11:50', displayTime: '11:30 – 11:50', period: 'morning' },
  // Chiều: 13:30 - 17:30
  { slotIndex: 9, time: '13:30', endTime: '13:50', displayTime: '13:30 – 13:50', period: 'afternoon' },
  { slotIndex: 10, time: '14:00', endTime: '14:20', displayTime: '14:00 – 14:20', period: 'afternoon' },
  { slotIndex: 11, time: '14:30', endTime: '14:50', displayTime: '14:30 – 14:50', period: 'afternoon' },
  { slotIndex: 12, time: '15:00', endTime: '15:20', displayTime: '15:00 – 15:20', period: 'afternoon' },
  { slotIndex: 13, time: '15:30', endTime: '15:50', displayTime: '15:30 – 15:50', period: 'afternoon' },
  { slotIndex: 14, time: '16:00', endTime: '16:20', displayTime: '16:00 – 16:20', period: 'afternoon' },
  { slotIndex: 15, time: '16:30', endTime: '16:50', displayTime: '16:30 – 16:50', period: 'afternoon' },
  { slotIndex: 16, time: '17:00', endTime: '17:20', displayTime: '17:00 – 17:20', period: 'afternoon' },
];

export const VALID_SLOT_TIMES = STANDARD_SLOTS.map((s) => s.time);

// ============================================================================
// 2. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

/**
 * clientGetAvailableSlotsQuerySchema
 * Kiểm thực query params lấy danh sách ca khám khả dụng
 */
export const clientGetAvailableSlotsQuerySchema = Joi.object({
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Ngày khám phải theo định dạng YYYY-MM-DD',
    }),
  serviceId: Joi.string().uuid().required().messages({
    'any.required': 'Vui lòng cung cấp mã dịch vụ (serviceId)',
    'string.guid': 'Mã dịch vụ phải là UUID hợp lệ',
  }),
  dentistId: Joi.string().uuid().allow('', null).optional().messages({
    'string.guid': 'Mã bác sĩ phải là UUID hợp lệ',
  }),
});

/**
 * clientCreateAppointmentRequestSchema
 * Kiểm thực payload đặt lịch hẹn mới
 */
export const clientCreateAppointmentRequestSchema = Joi.object({
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'any.required': 'Vui lòng chọn ngày khám',
      'string.pattern.base': 'Ngày khám phải theo định dạng YYYY-MM-DD',
    }),
  timeSlot: Joi.string()
    .valid(...VALID_SLOT_TIMES)
    .required()
    .messages({
      'any.required': 'Vui lòng chọn khung giờ khám',
      'any.only': 'Khung giờ khám không hợp lệ. Vui lòng chọn một trong 16 khung giờ chuẩn của phòng khám',
    }),
  serviceId: Joi.string().uuid().required().messages({
    'any.required': 'Vui lòng chọn dịch vụ nha khoa',
    'string.guid': 'Mã dịch vụ phải là định dạng UUID hợp lệ',
  }),
  dentistId: Joi.string().uuid().allow('', null).optional().messages({
    'string.guid': 'Mã bác sĩ phải là định dạng UUID hợp lệ',
  }),
  notes: Joi.string().trim().max(500).allow('', null).optional().messages({
    'string.max': 'Ghi chú triệu chứng tối đa 500 ký tự',
  }),
});

/**
 * clientRescheduleAppointmentRequestSchema
 * Kiểm thực payload dời lịch hẹn (chỉ thay đổi ngày và giờ)
 */
export const clientRescheduleAppointmentRequestSchema = Joi.object({
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'any.required': 'Vui lòng chọn ngày khám mới',
      'string.pattern.base': 'Ngày khám mới phải theo định dạng YYYY-MM-DD',
    }),
  timeSlot: Joi.string()
    .valid(...VALID_SLOT_TIMES)
    .required()
    .messages({
      'any.required': 'Vui lòng chọn khung giờ khám mới',
      'any.only': 'Khung giờ khám mới không hợp lệ. Vui lòng chọn một trong 16 khung giờ chuẩn',
    }),
});

/**
 * clientCancelAppointmentRequestSchema
 * Kiểm thực payload hủy lịch hẹn
 */
export const clientCancelAppointmentRequestSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required().messages({
    'any.required': 'Vui lòng cung cấp lý do hủy lịch',
    'string.empty': 'Lý do hủy lịch không được để trống',
    'string.min': 'Lý do hủy lịch tối thiểu 3 ký tự',
    'string.max': 'Lý do hủy lịch tối đa 500 ký tự',
  }),
});

/**
 * clientAppointmentDetailParamsSchema
 * Kiểm thực UUID param :id
 */
export const clientAppointmentDetailParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'any.required': 'ID lịch hẹn không được để trống',
    'string.guid': 'ID lịch hẹn phải là UUID hợp lệ',
  }),
});

/**
 * clientGetAppointmentsQuerySchema
 * Kiểm thực query params lấy danh sách lịch hẹn của bệnh nhân
 */
export const clientGetAppointmentsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string()
    .valid(
      'all',
      'upcoming',
      'completed',
      'cancelled',
      'cho_xac_nhan',
      'da_xac_nhan',
      'da_tiep_nhan',
      'cho_kham',
      'dang_kham',
      'cho_thanh_toan',
      'da_kham',
      'huy',
      'da_huy'
    )
    .default('all')
    .messages({
      'any.only':
        'Trạng thái lọc lịch hẹn không hợp lệ (hỗ trợ all, upcoming, completed, cancelled hoặc mã trạng thái cụ thể)',
    }),
});

// ============================================================================
// 3. RESPONSE FORMATTERS & HELPER MAPPERS
// ============================================================================

/**
 * Map trạng thái Database sang Frontend format & nhãn hiển thị
 */
export const mapAppointmentStatus = (dbStatus) => {
  switch (dbStatus) {
    case 'cho_xac_nhan':
      return { code: 'CHO_XAC_NHAN', label: 'Chờ xác nhận', variant: 'warning' };
    case 'da_xac_nhan':
      return { code: 'DA_XAC_NHAN', label: 'Đã xác nhận', variant: 'success' };
    case 'da_tiep_nhan':
      return { code: 'DA_TIEP_NHAN', label: 'Đã tiếp nhận', variant: 'info' };
    case 'cho_kham':
      return { code: 'CHO_KHAM', label: 'Chờ khám', variant: 'info' };
    case 'dang_kham':
      return { code: 'DANG_KHAM', label: 'Đang khám', variant: 'primary' };
    case 'cho_thanh_toan':
      return { code: 'CHO_THANH_TOAN', label: 'Chờ thanh toán', variant: 'warning' };
    case 'da_kham':
      return { code: 'HOAN_THANH', label: 'Hoàn thành', variant: 'default' };
    case 'huy':
    case 'da_huy':
      return { code: 'DA_HUY', label: 'Đã hủy', variant: 'destructive' };
    default:
      return { code: String(dbStatus).toUpperCase(), label: dbStatus, variant: 'default' };
  }
};

/**
 * Trích xuất giờ HH:mm từ Time field (Date object hoặc string ISO/Time)
 */
export const extractHHmm = (timeValue, defaultTime = '08:00') => {
  if (!timeValue) return defaultTime;
  if (typeof timeValue === 'string') {
    if (timeValue.includes('T')) {
      const date = new Date(timeValue);
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return timeValue.slice(0, 5);
  }
  if (timeValue instanceof Date) {
    const hours = String(timeValue.getUTCHours()).padStart(2, '0');
    const minutes = String(timeValue.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return defaultTime;
};

/**
 * Tính toán thông tin khung tuần (Thứ Hai -> Chủ Nhật) và các cờ điều hướng
 */
export const calculateWeekSchedule = ({
  selectedDateStr,
  todayStr,
  maxAvailableDateStr,
  daysWithShiftsSet = new Set(),
}) => {
  const [year, month, day] = selectedDateStr.split('-').map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day));

  // getUTCDay(): 0 = Chủ Nhật, 1 = Thứ Hai, ..., 6 = Thứ Bảy
  const dayOfWeek = targetDate.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const mondayDate = new Date(targetDate);
  mondayDate.setUTCDate(targetDate.getUTCDate() + diffToMonday);

  const sundayDate = new Date(mondayDate);
  sundayDate.setUTCDate(mondayDate.getUTCDate() + 6);

  const weekStartDate = mondayDate.toISOString().split('T')[0];
  const weekEndDate = sundayDate.toISOString().split('T')[0];

  // Tính tuần của ngày hôm nay để so sánh
  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const tDate = new Date(Date.UTC(tY, tM - 1, tD));
  const tDayOfWeek = tDate.getUTCDay();
  const tDiffToMonday = tDayOfWeek === 0 ? -6 : 1 - tDayOfWeek;
  const currentWeekMonday = new Date(tDate);
  currentWeekMonday.setUTCDate(tDate.getUTCDate() + tDiffToMonday);
  const currentWeekStartDate = currentWeekMonday.toISOString().split('T')[0];

  // Cờ điều hướng:
  // Không được bấm lùi nếu tuần đang chọn <= tuần hiện tại
  const canNavigatePrev = weekStartDate > currentWeekStartDate;
  // Không được bấm tới nếu tuần đang chọn >= maxAvailableDate
  const canNavigateNext = maxAvailableDateStr ? weekEndDate < maxAvailableDateStr : false;

  const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
  const days = [];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(mondayDate);
    cur.setUTCDate(mondayDate.getUTCDate() + i);
    const curDateStr = cur.toISOString().split('T')[0];

    days.push({
      date: curDateStr,
      dayOfWeek: i + 2, // 2 = Thứ Hai ... 8 = Chủ Nhật
      dayName: dayNames[i],
      isPast: curDateStr < todayStr,
      isToday: curDateStr === todayStr,
      isSelected: curDateStr === selectedDateStr,
      hasAvailableShifts: daysWithShiftsSet.has(curDateStr),
    });
  }

  return {
    currentDate: todayStr,
    selectedDate: selectedDateStr,
    weekStartDate,
    weekEndDate,
    maxAvailableDate: maxAvailableDateStr,
    canNavigatePrev,
    canNavigateNext,
    days,
  };
};

/**
 * Format thông tin chi tiết lịch hẹn trả về cho client
 */
export const formatAppointmentDetailResponse = (appointment) => {
  if (!appointment) return null;

  const statusMeta = mapAppointmentStatus(appointment.trangThai);
  const startTime = extractHHmm(appointment.gioHen, '08:00');
  const endTime = extractHHmm(appointment.gioKetThucDuKien, '08:30');

  const ca = appointment.caLamViec || {};
  const ns = ca.nhaSi || {};
  const phong = ca.phongDieuTri || {};
  const dv = appointment.dichVu || {};

  const dateStr = appointment.ngayHen
    ? (typeof appointment.ngayHen === 'string'
        ? appointment.ngayHen.slice(0, 10)
        : appointment.ngayHen.toISOString().slice(0, 10))
    : '';

  return {
    id: appointment.id,
    appointmentCode: appointment.maLichHen || '',
    date: dateStr,
    timeRange: `${startTime} – ${endTime}`,
    startTime,
    endTime,
    status: statusMeta.code,
    statusLabel: statusMeta.label,
    statusVariant: statusMeta.variant,
    rawStatus: appointment.trangThai,
    doctor: ns.id
      ? {
          id: ns.id,
          code: ns.maNhaSi,
          fullName: ns.hoTen,
          specialty: ns.chuyenKhoa || 'Bác sĩ Nha khoa',
          avatarUrl: ns.hinhAnhUrl || null,
        }
      : null,
    service: dv.id
      ? {
          id: dv.id,
          code: dv.maDichVu,
          name: dv.tenDichVu,
          durationMinutes: dv.thoiGianDuKienPhut || 30,
        }
      : null,
    room: phong.id
      ? {
          id: phong.id,
          code: phong.maPhong,
          name: phong.tenPhong,
        }
      : null,
    notes: appointment.ghiChu || '',
    cancelReason: appointment.lyDoHuy || null,
    cancelledAt: appointment.ngayHuy ? appointment.ngayHuy.toISOString() : null,
    createdAt: appointment.createdAt ? appointment.createdAt.toISOString() : null,
    updatedAt: appointment.updatedAt ? appointment.updatedAt.toISOString() : null,
  };
};

/**
 * Format danh sách 16 slots khả dụng trả về cho client kèm khung Tuần
 */
export const formatAvailableSlotsResponse = ({
  weekSchedule,
  service,
  filterDoctor,
  slots,
}) => {
  return {
    weekSchedule,
    service: {
      id: service.id,
      code: service.maDichVu || '',
      name: service.tenDichVu,
      durationMinutes: service.thoiGianDuKienPhut || 30,
    },
    filterDoctor: filterDoctor
      ? {
          id: filterDoctor.id,
          code: filterDoctor.maNhaSi || '',
          fullName: filterDoctor.hoTen,
          specialty: filterDoctor.chuyenKhoa || 'Bác sĩ Nha khoa',
          avatarUrl: filterDoctor.hinhAnhUrl || null,
        }
      : null,
    slots,
  };
};

/**
 * Format thông tin dịch vụ trả về cho Client lựa chọn đặt lịch
 */
export const formatClientServiceItem = (service) => {
  const rawPrice = service.gia !== undefined && service.gia !== null ? Number(service.gia) : null;
  const unit = service.donViTinh || (service.chiTietDichVu?.[0]?.donViTinh) || 'lượt';
  const code = (service.maDichVu || '').toUpperCase();
  const name = (service.tenDichVu || '').toLowerCase();

  // Dịch vụ chuyên sâu bán theo sản phẩm/vật tư (Implant, Niềng răng, Bọc sứ) -> Giá 0, cần đến khám trước để tư vấn
  const isConsultationRequired =
    code === 'DV_IMPLANT' ||
    code === 'DV_NIENGRANG' ||
    code === 'DV_BOCSU' ||
    name.includes('implant') ||
    name.includes('niềng') ||
    name.includes('bọc sứ');

  const resolvedPrice = isConsultationRequired
    ? 0
    : (rawPrice !== null ? rawPrice : (service.chiTietDichVu?.[0] ? Number(service.chiTietDichVu[0].gia) : null));

  let priceText = 'Liên hệ tư vấn';
  if (isConsultationRequired) {
    priceText = 'Cần đến khám trước để tư vấn';
  } else if (resolvedPrice === 0) {
    priceText = 'Miễn phí khám';
  } else if (resolvedPrice !== null) {
    priceText = `${new Intl.NumberFormat('vi-VN').format(resolvedPrice)} đ`;
  }

  return {
    id: service.id,
    code: service.maDichVu || '',
    name: service.tenDichVu,
    description: service.moTa || '',
    procedureInfo: service.thongTinQuyTrinh || '',
    durationMinutes: service.thoiGianDuKienPhut || 30,
    price: resolvedPrice,
    priceText,
    isConsultationRequired,
    unit,
  };
};

/**
 * Format thông tin bác sĩ nha khoa trả về cho Client lựa chọn đặt lịch
 */
export const formatClientDoctorItem = (doctor) => {
  const degree = doctor.hocVi || 'BS';
  return {
    id: doctor.id,
    code: doctor.maNhaSi || '',
    fullName: doctor.hoTen,
    hocVi: degree,
    academicDegree: degree,
    titleFullName: formatDoctorFullName(degree, doctor.hoTen),
    surcharge: getDoctorDegreeSurcharge(degree),
    gender: doctor.gioiTinh || null,
    specialty: doctor.chuyenKhoa || 'Bác sĩ Nha khoa',
    bio: doctor.gioiThieu || '',
    avatarUrl: doctor.hinhAnhUrl || null,
  };
};

/**
 * Format danh sách lịch hẹn của bệnh nhân
 */
export const formatClientAppointmentListItem = (appointment) => {
  if (!appointment) return null;

  const statusMeta = mapAppointmentStatus(appointment.trangThai);
  const startTime = extractHHmm(appointment.gioHen, '08:00');
  const endTime = extractHHmm(appointment.gioKetThucDuKien, '08:30');

  const ca = appointment.caLamViec || {};
  const ns = ca.nhaSi || {};
  const phong = ca.phongDieuTri || {};
  const dv = appointment.dichVu || {};

  const dateStr = appointment.ngayHen
    ? (typeof appointment.ngayHen === 'string'
        ? appointment.ngayHen.slice(0, 10)
        : appointment.ngayHen.toISOString().slice(0, 10))
    : '';

  const canModify = ['cho_xac_nhan', 'da_xac_nhan'].includes(appointment.trangThai);

  return {
    id: appointment.id,
    appointmentCode: appointment.maLichHen || '',
    date: dateStr,
    timeRange: `${startTime} – ${endTime}`,
    startTime,
    endTime,
    status: statusMeta.code,
    statusLabel: statusMeta.label,
    statusVariant: statusMeta.variant,
    rawStatus: appointment.trangThai,
    canReschedule: canModify,
    canCancel: canModify,
    doctor: ns.id
      ? {
          id: ns.id,
          code: ns.maNhaSi,
          fullName: ns.hoTen,
          specialty: ns.chuyenKhoa || 'Bác sĩ Nha khoa',
          avatarUrl: ns.hinhAnhUrl || null,
        }
      : null,
    service: dv.id
      ? {
          id: dv.id,
          code: dv.maDichVu,
          name: dv.tenDichVu,
          durationMinutes: dv.thoiGianDuKienPhut || 30,
        }
      : null,
    room: phong.id
      ? {
          id: phong.id,
          code: phong.maPhong,
          name: phong.tenPhong,
        }
      : null,
    notes: appointment.ghiChu || '',
    cancelReason: appointment.lyDoHuy || null,
    cancelledAt: appointment.ngayHuy ? appointment.ngayHuy.toISOString() : null,
    createdAt: appointment.createdAt ? appointment.createdAt.toISOString() : null,
    updatedAt: appointment.updatedAt ? appointment.updatedAt.toISOString() : null,
  };
};

export default {
  STANDARD_SLOTS,
  VALID_SLOT_TIMES,
  clientGetAvailableSlotsQuerySchema,
  clientCreateAppointmentRequestSchema,
  clientRescheduleAppointmentRequestSchema,
  clientCancelAppointmentRequestSchema,
  clientAppointmentDetailParamsSchema,
  clientGetAppointmentsQuerySchema,
  mapAppointmentStatus,
  extractHHmm,
  calculateWeekSchedule,
  formatAppointmentDetailResponse,
  formatAvailableSlotsResponse,
  formatClientServiceItem,
  formatClientDoctorItem,
  formatClientAppointmentListItem,
};
