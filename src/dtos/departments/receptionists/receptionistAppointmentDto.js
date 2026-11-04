import Joi from 'joi';

// ============================================================================
// 1. QUERY & BODY SCHEMAS
// ============================================================================

export const receptionistGetAppointmentsQuerySchema = Joi.object({
  date: Joi.string().isoDate().optional(),
  status: Joi.string().allow('', 'ALL').optional(),
  dentistId: Joi.string().allow('', 'ALL').optional(),
  roomId: Joi.string().allow('', 'ALL').optional(),
  search: Joi.string().allow('', null).optional(),
});

export const receptionistCreateAppointmentRequestSchema = Joi.object({
  patientId: Joi.string().allow('', null).optional(),
  patientName: Joi.string().required().messages({
    'any.required': 'Họ và tên bệnh nhân là bắt buộc',
  }),
  patientPhone: Joi.string().required().messages({
    'any.required': 'Số điện thoại bệnh nhân là bắt buộc',
  }),
  dentistId: Joi.string().required().messages({
    'any.required': 'Vui lòng chọn bác sĩ phụ trách',
  }),
  dentistName: Joi.string().allow('', null).optional(),
  serviceId: Joi.string().allow('', null).optional(),
  serviceName: Joi.string().allow('', null).optional(),
  roomId: Joi.string().allow('', null).optional(),
  doctorRoom: Joi.string().allow('', null).optional(),
  date: Joi.string().required().messages({
    'any.required': 'Ngày hẹn là bắt buộc',
  }),
  timeSlot: Joi.string().required().messages({
    'any.required': 'Khung giờ hẹn là bắt buộc',
  }),
  notes: Joi.string().allow('', null).optional(),
});

export const receptionistUpdateAppointmentStatusRequestSchema = Joi.object({
  status: Joi.string()
    .valid(
      'CHO_XAC_NHAN',
      'DA_XAC_NHAN',
      'DA_TIEP_NHAN',
      'CHO_KHAM',
      'DANG_KHAM',
      'CHO_THANH_TOAN',
      'HOAN_THANH',
      'DA_HUY',
      'cho_xac_nhan',
      'da_xac_nhan',
      'da_tiep_nhan',
      'cho_kham',
      'dang_kham',
      'cho_thanh_toan',
      'da_kham',
      'da_huy'
    )
    .required()
    .messages({
      'any.required': 'Trạng thái lịch hẹn là bắt buộc',
    }),
});

export const receptionistReassignAppointmentRequestSchema = Joi.object({
  dentistId: Joi.string().allow('', null).optional(),
  dentistName: Joi.string().allow('', null).optional(),
  doctorRoom: Joi.string().allow('', null).optional(),
  roomId: Joi.string().allow('', null).optional(),
  notes: Joi.string().allow('', null).optional(),
});

export const receptionistRescheduleAppointmentRequestSchema = Joi.object({
  date: Joi.string().required().messages({
    'any.required': 'Ngày hẹn mới là bắt buộc',
  }),
  timeSlot: Joi.string().required().messages({
    'any.required': 'Khung giờ hẹn mới là bắt buộc',
  }),
  notes: Joi.string().allow('', null).optional(),
});

// ============================================================================
// 2. MAPPERS & RESPONSE FORMATTERS
// ============================================================================

export const mapStatusToFrontend = (dbStatus) => {
  switch (dbStatus) {
    case 'cho_xac_nhan':
      return 'CHO_XAC_NHAN';
    case 'da_xac_nhan':
      return 'DA_XAC_NHAN';
    case 'da_tiep_nhan':
      return 'DA_TIEP_NHAN';
    case 'cho_kham':
      return 'CHO_KHAM';
    case 'dang_kham':
      return 'DANG_KHAM';
    case 'cho_thanh_toan':
      return 'CHO_THANH_TOAN';
    case 'da_kham':
      return 'HOAN_THANH';
    case 'da_huy':
      return 'DA_HUY';
    default:
      return 'CHO_XAC_NHAN';
  }
};

export const mapStatusToDatabase = (feStatus) => {
  switch (feStatus) {
    case 'CHO_XAC_NHAN':
      return 'cho_xac_nhan';
    case 'DA_XAC_NHAN':
      return 'da_xac_nhan';
    case 'DA_TIEP_NHAN':
      return 'da_tiep_nhan';
    case 'CHO_KHAM':
      return 'cho_kham';
    case 'DANG_KHAM':
      return 'dang_kham';
    case 'CHO_THANH_TOAN':
      return 'cho_thanh_toan';
    case 'HOAN_THANH':
      return 'da_kham';
    case 'DA_HUY':
      return 'da_huy';
    default:
      return feStatus.toLowerCase();
  }
};

export const receptionistAppointmentItemResponseSchema = (item) => {
  const bn = item.benhNhan || {};
  const ca = item.caLamViec || {};
  const ns = ca.nhaSi || {};
  const phong = ca.phongDieuTri || {};
  const dv = item.dichVu || {};

  const timeStr = item.gioHen
    ? typeof item.gioHen === 'string'
      ? item.gioHen.slice(11, 16) || item.gioHen.slice(0, 5)
      : item.gioHen.toISOString().slice(11, 16)
    : '08:00';

  const dateStr = item.ngayHen
    ? typeof item.ngayHen === 'string'
      ? item.ngayHen.slice(0, 10)
      : item.ngayHen.toISOString().slice(0, 10)
    : '';

  return {
    id: item.id,
    code: item.maLichHen || `LH-${item.id.slice(0, 8)}`,
    patientId: item.benhNhanId,
    patientName: bn.hoTen || 'Bệnh nhân',
    patientCode: bn.maBenhNhan || '',
    patientPhone: bn.sdt || '',
    patientBirthYear: bn.ngaySinh ? new Date(bn.ngaySinh).getFullYear() : undefined,
    patientGender: bn.gioiTinh === 'nam' ? 'MALE' : 'FEMALE',
    dentistId: ca.nhaSiId || ns.id || '',
    dentistName: ns.hoTen || 'Bác sĩ trực',
    serviceId: item.dichVuId || '',
    serviceName: dv.tenDichVu || 'Khám tổng quát',
    doctorRoom: phong.tenPhong || 'Phòng 01 (Tầng 1)',
    roomId: ca.phongDieuTriId || phong.id || '',
    roomCode: phong.maPhong || 'P-01',
    date: dateStr,
    time: timeStr,
    timeSlot: timeStr,
    status: mapStatusToFrontend(item.trangThai),
    rawStatus: item.trangThai,
    notes: item.ghiChu || '',
    createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
  };
};

export default {
  receptionistGetAppointmentsQuerySchema,
  receptionistCreateAppointmentRequestSchema,
  receptionistUpdateAppointmentStatusRequestSchema,
  receptionistReassignAppointmentRequestSchema,
  receptionistRescheduleAppointmentRequestSchema,
  mapStatusToFrontend,
  mapStatusToDatabase,
  receptionistAppointmentItemResponseSchema,
};
