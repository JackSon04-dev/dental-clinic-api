import Joi from 'joi';

export const receptionistCreateCheckInRequestSchema = Joi.object({
  patientId: Joi.string().allow('', null).optional(),
  patientName: Joi.string().required().messages({
    'any.required': 'Tên bệnh nhân là bắt buộc',
  }),
  patientPhone: Joi.string().required().messages({
    'any.required': 'Số điện thoại là bắt buộc',
  }),
  dentistId: Joi.string().allow('', null).optional(),
  dentistName: Joi.string().allow('', null).optional(),
  roomName: Joi.string().allow('', null).optional(),
  chiefComplaint: Joi.string().required().messages({
    'any.required': 'Lý do đến khám là bắt buộc',
  }),
  bloodPressure: Joi.string().allow('', null).optional(),
  pulse: Joi.number().allow(null).optional(),
  allergiesAlert: Joi.string().allow('', null).optional(),
});

export const receptionistCheckInSlipResponseSchema = (item) => {
  const bn = item.benhNhan || {};
  const ca = item.caLamViec || {};
  const phong = ca.phongDieuTri || {};
  const dv = item.dichVu || {};

  const timeStr = item.gioHen
    ? typeof item.gioHen === 'string'
      ? item.gioHen.slice(11, 16) || item.gioHen.slice(0, 5)
      : item.gioHen.toISOString().slice(11, 16)
    : '08:00';

  const allergies = bn.diUng ? [bn.diUng] : [];

  let status = 'CHO_KHAM';
  if (item.trangThai === 'dang_kham') status = 'DANG_KHAM';
  if (item.trangThai === 'da_kham') status = 'HOAN_THANH';
  if (item.trangThai === 'cho_thanh_toan') status = 'CHO_THANH_TOAN';

  return {
    id: item.id,
    code: item.maLichHen || `PK-${item.id.slice(0, 8)}`,
    patientId: item.benhNhanId,
    patientCode: bn.maBenhNhan || 'BN00',
    patientName: bn.hoTen || 'Bệnh nhân',
    patientPhone: bn.sdt || '',
    patientGender: bn.gioiTinh === 'nam' ? 'MALE' : 'FEMALE',
    patientBirthDate: bn.ngaySinh ? bn.ngaySinh.toISOString().slice(0, 10) : undefined,
    roomName: phong.tenPhong || 'Phòng Nha Khoa 01 (Tầng 1)',
    serviceName: dv.tenDichVu || 'Khám tổng quát nha khoa',
    chiefComplaint: item.ghiChu || 'Khám và tư vấn',
    bloodPressure: null,
    allergiesAlert: bn.diUng ? `Dị ứng: ${bn.diUng}` : 'Không có dị ứng thuốc đã biết',
    allergies,
    medicalHistory: bn.tienSuBenh || 'Bình thường',
    status,
    rawStatus: item.trangThai,
    time: timeStr,
    createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
  };
};

export default {
  receptionistCreateCheckInRequestSchema,
  receptionistCheckInSlipResponseSchema,
};
