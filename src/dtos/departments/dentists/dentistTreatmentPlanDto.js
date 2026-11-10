import Joi from 'joi';
import { formatDateYYYYMMDD } from '../admins/adminWorkShiftDto.js';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

export const createDentistTreatmentPlanRequestSchema = Joi.object({
  patientId: Joi.string().uuid().required().messages({
    'any.required': 'Bệnh nhân là bắt buộc',
  }),
  title: Joi.string().trim().required().messages({
    'any.required': 'Tên phác đồ điều trị không được để trống',
    'string.empty': 'Tên phác đồ điều trị không được để trống',
  }),
  samplePlanId: Joi.string().uuid().allow('', null).optional(),
  initialDiagnosis: Joi.string().allow('', null).optional(),
  startDate: Joi.string().allow('', null).optional(),
  estimatedEndDate: Joi.string().allow('', null).optional(),
  notes: Joi.string().allow('', null).optional(),

  phases: Joi.array()
    .items(
      Joi.object({
        stepNumber: Joi.number().integer().min(1).required(),
        name: Joi.string().required().messages({
          'any.required': 'Tên giai đoạn không được để trống',
        }),
        description: Joi.string().allow('', null).optional(),
        serviceDescription: Joi.string().allow('', null).optional(),
        estimatedDate: Joi.string().allow('', null).optional(),
        notes: Joi.string().allow('', null).optional(),
      })
    )
    .default([]),
});

export const updateDentistPhaseStatusRequestSchema = Joi.object({
  status: Joi.string()
    .valid('PENDING', 'IN_PROGRESS', 'COMPLETED', 'chua_thuc_hien', 'dang_thuc_hien', 'hoan_thanh')
    .required()
    .messages({
      'any.required': 'Trạng thái là bắt buộc',
    }),
  completedDate: Joi.string().allow('', null).optional(),
  appointmentCode: Joi.string().trim().allow('', null).optional(),
  appointmentId: Joi.string().uuid().allow('', null).optional(),
});

// ============================================================================
// 2. RESPONSE SCHEMAS
// ============================================================================

const mapPlanStatusToFrontend = (dbStatus) => {
  switch (dbStatus) {
    case 'dang_dieu_tri':
      return 'ACTIVE';
    case 'hoan_thanh':
      return 'COMPLETED';
    case 'tam_dung':
    case 'huy':
      return 'SUSPENDED';
    default:
      return 'ACTIVE';
  }
};

const mapPhaseStatusToFrontend = (dbStatus) => {
  switch (dbStatus) {
    case 'chua_thuc_hien':
    case 'PENDING':
      return 'PENDING';
    case 'dang_thuc_hien':
    case 'IN_PROGRESS':
      return 'IN_PROGRESS';
    case 'hoan_thanh':
    case 'COMPLETED':
      return 'COMPLETED';
    default:
      return 'PENDING';
  }
};

export const dentistTreatmentPlanListItemResponseSchema = (plan) => {
  const bn = plan.benhNhan || {};
  const ns = plan.nhaSi || {};
  const phases = plan.giaiDoanPhacDo || [];

  const completedPhases = phases.filter(
    (p) => p.trangThai === 'hoan_thanh' || p.trangThai === 'COMPLETED'
  ).length;

  const isAllCompleted =
    phases.length > 0 &&
    phases.every(
      (p) => p.trangThai === 'hoan_thanh' || p.trangThai === 'COMPLETED'
    );

  const finalStatus = isAllCompleted
    ? 'COMPLETED'
    : mapPlanStatusToFrontend(plan.trangThai);
  const finalRawStatus = isAllCompleted ? 'hoan_thanh' : plan.trangThai;

  return {
    id: plan.id,
    code: plan.maPhacDo || `PT-${plan.id.slice(0, 8)}`,
    title: plan.tenPhacDo,
    patientId: bn.id,
    patientName: bn.hoTen,
    patientCode: bn.maBenhNhan,
    patientPhone: bn.sdt,
    dentistId: ns.id,
    dentistName: ns.hoTen,
    samplePlanId: plan.phacDoMauId || null,
    status: finalStatus,
    rawStatus: finalRawStatus,
    startDate: plan.ngayBatDau ? formatDateYYYYMMDD(plan.ngayBatDau) : '',
    estimatedEndDate: plan.ngayDuKienHoanThanh
      ? formatDateYYYYMMDD(plan.ngayDuKienHoanThanh)
      : '',
    actualEndDate: plan.ngayHoanThanhThucTe
      ? formatDateYYYYMMDD(plan.ngayHoanThanhThucTe)
      : null,
    initialDiagnosis: plan.chanDoanBanDau || null,
    notes: plan.ghiChu || null,
    totalPhases: phases.length,
    completedPhases,
    phases: phases.map((p) => {
      const appt = p.lichHen || {};
      const apptDoctor = appt.caLamViec?.nhaSi?.hoTen || null;
      const apptService = appt.dichVu?.tenDichVu || null;

      return {
        id: p.id,
        stepNumber: p.buocSo,
        phaseNumber: p.buocSo,
        name: p.tenGiaiDoan,
        title: p.tenGiaiDoan,
        status: mapPhaseStatusToFrontend(p.trangThai),
        rawStatus: p.trangThai,
        estimatedDate: p.ngayDuKien ? formatDateYYYYMMDD(p.ngayDuKien) : (p.ghiChu || ''),
        nextAppointmentDate: p.ngayDuKien ? formatDateYYYYMMDD(p.ngayDuKien) : (p.ghiChu || ''),
        completedDate: p.ngayThucHien ? formatDateYYYYMMDD(p.ngayThucHien) : null,
        description: p.moTa || '',
        serviceDescription: p.moTaVatTuDichVu || '',
        notes: p.ghiChu || null,
        // Minh chứng lâm sàng (Clinical Proof)
        appointmentId: p.lichHenId || null,
        appointmentCode: appt.maLichHen || null,
        appointmentDate: appt.ngayHen
          ? formatDateYYYYMMDD(appt.ngayHen)
          : p.ngayThucHien
          ? formatDateYYYYMMDD(p.ngayThucHien)
          : null,
        appointmentService: apptService,
        appointmentDoctor: apptDoctor,
      };
    }),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
};

export const dentistTreatmentPlanDetailResponseSchema = (plan) => {
  return dentistTreatmentPlanListItemResponseSchema(plan);
};

export default {
  createDentistTreatmentPlanRequestSchema,
  updateDentistPhaseStatusRequestSchema,
  dentistTreatmentPlanListItemResponseSchema,
  dentistTreatmentPlanDetailResponseSchema,
};
