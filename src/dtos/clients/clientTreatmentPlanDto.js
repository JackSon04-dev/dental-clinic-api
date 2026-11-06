import Joi from 'joi';
import { formatDayMonthYear } from '../../utils/dateFormatter.js';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

/**
 * clientGetTreatmentPlansQuerySchema
 * Kiểm thực tham số phân trang danh sách phác đồ điều trị của bệnh nhân
 */
export const clientGetTreatmentPlansQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Tham số page phải là số nguyên',
    'number.min': 'Tham số page tối thiểu là 1',
  }),
  limit: Joi.number().integer().min(1).max(50).default(10).messages({
    'number.base': 'Tham số limit phải là số nguyên',
    'number.min': 'Tham số limit tối thiểu là 1',
    'number.max': 'Tham số limit tối đa là 50',
  }),
});

// ============================================================================
// 2. HELPER FUNCTIONS & FORMATTERS
// ============================================================================

const formatPlanStatus = (status) => {
  switch (status) {
    case 'hoan_thanh':
      return {
        code: 'completed',
        label: 'Đã hoàn thành',
        variant: 'success',
      };
    case 'dang_dieu_tri':
      return {
        code: 'in_progress',
        label: 'Đang điều trị',
        variant: 'warning',
      };
    case 'da_huy':
      return {
        code: 'cancelled',
        label: 'Đã hủy',
        variant: 'neutral',
      };
    default:
      return {
        code: status || 'pending',
        label: status || 'Chưa thực hiện',
        variant: 'neutral',
      };
  }
};

const formatPaymentTypeTitle = (type) => {
  switch (type) {
    case 'tung_giai_doan':
      return 'Thanh toán theo từng giai đoạn';
    case 'tron_goi':
      return 'Thanh toán trọn gói';
    default:
      return type || 'Chưa xác định';
  }
};

// ============================================================================
// 3. RESPONSE SCHEMAS (Chuẩn 100% camelCase cho Client)
// ============================================================================

/**
 * clientTreatmentPlanListItemResponseSchema
 * Format một bản ghi phác đồ điều trị kèm danh sách các giai đoạn chi tiết
 * @param {object} plan Bản ghi phac_do_dieu_tri từ Prisma kèm relation nhaSi, giaiDoanPhacDo
 */
export const clientTreatmentPlanListItemResponseSchema = (plan) => {
  if (!plan) return null;

  const rawStages = plan.giaiDoanPhacDo || [];
  const totalStages = rawStages.length;

  // Format từng giai đoạn của phác đồ
  const formattedStages = rawStages.map((stage) => {
    const isCompleted =
      stage.trangThai === 'da_hoan_thanh' || stage.trangThai === 'hoan_thanh';

    let dateText = null;
    if (isCompleted && stage.ngayThucHien) {
      dateText = `Hoàn thành ngày ${formatDayMonthYear(stage.ngayThucHien).formattedDate}`;
    } else if (!isCompleted && stage.ngayDuKien) {
      dateText = `Dự kiến ngày ${formatDayMonthYear(stage.ngayDuKien).formattedDate}`;
    }

    const paymentStatusTitle =
      stage.trangThaiThanhToan === 'da_thanh_toan' ? 'Đã thanh toán' : 'Chưa thanh toán';

    return {
      id: stage.id,
      stepNumber: stage.buocSo,
      title: `Giai đoạn ${stage.buocSo}: ${stage.tenGiaiDoan}`,
      rawStageName: stage.tenGiaiDoan,
      description: stage.moTa || null,
      cost: Number(stage.chiPhi || 0),
      paymentStatus: stage.trangThaiThanhToan || 'chua_thanh_toan',
      paymentStatusTitle,
      dateText,
      status: {
        code: isCompleted ? 'completed' : 'pending',
        label: isCompleted ? 'Đã hoàn thành' : 'Chưa thực hiện',
        variant: isCompleted ? 'success' : 'neutral',
      },
      isCompleted,
      note: stage.ghiChu || null,
    };
  });

  const completedStagesCount = formattedStages.filter((s) => s.isCompleted).length;
  const progressPercentage =
    totalStages > 0 ? Math.round((completedStagesCount / totalStages) * 100) : 0;
  const progressText = `${completedStagesCount}/${totalStages} giai đoạn (${progressPercentage}%)`;

  const startDate = plan.ngayBatDau
    ? formatDayMonthYear(plan.ngayBatDau).formattedDate
    : null;
  const expectedEndDate = plan.ngayDuKienHoanThanh
    ? formatDayMonthYear(plan.ngayDuKienHoanThanh).formattedDate
    : null;
  const actualEndDate = plan.ngayHoanThanhThucTe
    ? formatDayMonthYear(plan.ngayHoanThanhThucTe).formattedDate
    : null;

  return {
    id: plan.id,
    planCode: plan.maPhacDo || null,
    planName: plan.tenPhacDo,
    diagnosis: plan.chanDoanBanDau || null,
    doctor: {
      id: plan.nhaSi?.id || null,
      fullName: plan.nhaSi?.hoTen || 'Bác sĩ phụ trách',
      specialty: plan.nhaSi?.chuyenKhoa || 'Bác sĩ chuyên khoa',
      avatarUrl: plan.nhaSi?.hinhAnhUrl || null,
    },
    paymentType: plan.hinhThucThanhToan || 'tung_giai_doan',
    paymentTypeTitle: formatPaymentTypeTitle(plan.hinhThucThanhToan),
    status: formatPlanStatus(plan.trangThai),
    progress: {
      totalStages,
      completedStages: completedStagesCount,
      percentage: progressPercentage,
      progressText,
    },
    startDate,
    expectedEndDate,
    actualEndDate,
    dentistAdvice: plan.ghiChu || null,
    stages: formattedStages,
  };
};

export default {
  clientGetTreatmentPlansQuerySchema,
  clientTreatmentPlanListItemResponseSchema,
};

