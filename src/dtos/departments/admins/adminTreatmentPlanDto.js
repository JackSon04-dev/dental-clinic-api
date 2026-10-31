import Joi from 'joi';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

/**
 * adminGetTreatmentPlansQuerySchema
 * Kiểm thực query parameters cho API lấy danh sách phác đồ mẫu
 */
export const adminGetTreatmentPlansQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Tham số page phải là số nguyên',
    'number.min': 'Tham số page tối thiểu là 1',
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Tham số limit phải là số nguyên',
    'number.min': 'Tham số limit tối thiểu là 1',
    'number.max': 'Tham số limit tối đa là 100',
  }),
  status: Joi.string()
    .valid('ALL', 'hoat_dong', 'ngung_hoat_dong')
    .default('ALL')
    .messages({
      'any.only': 'Tham số status phải là một trong: ALL, hoat_dong, ngung_hoat_dong',
    }),
  search: Joi.string().trim().allow('').default(''),
});

/**
 * adminGetTreatmentPlanDetailParamsSchema
 * Kiểm thực params :id (UUID phác đồ mẫu cha)
 */
export const adminGetTreatmentPlanDetailParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'any.required': 'ID phác đồ mẫu không được để trống',
    'string.guid': 'ID phác đồ mẫu phải là UUID hợp lệ',
  }),
});

/**
 * Stage item schema dùng trong mảng khởi tạo kèm phác đồ mẫu
 */
const initialStageSchema = Joi.object({
  stepNumber: Joi.number().integer().min(1).optional(),
  name: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Tên giai đoạn không được để trống',
    'string.empty': 'Tên giai đoạn không được để trống',
    'string.min': 'Tên giai đoạn tối thiểu 2 ký tự',
    'string.max': 'Tên giai đoạn tối đa 200 ký tự',
  }),
  serviceName: Joi.string().trim().max(255).optional().allow('', null),
  description: Joi.string().trim().optional().allow('', null),
  restingTime: Joi.string().trim().max(100).optional().allow('', null),
});

/**
 * adminCreateTreatmentPlanRequestSchema
 * Kiểm thực dữ liệu tạo mới phác đồ mẫu (Level 0)
 */
export const adminCreateTreatmentPlanRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Tên phác đồ mẫu không được để trống',
    'string.empty': 'Tên phác đồ mẫu không được để trống',
    'string.min': 'Tên phác đồ mẫu tối thiểu 2 ký tự',
    'string.max': 'Tên phác đồ mẫu tối đa 200 ký tự',
  }),
  code: Joi.string()
    .trim()
    .uppercase()
    .max(30)
    .pattern(/^[A-Z0-9_-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mã phác đồ mẫu tối đa 30 ký tự',
      'string.pattern.base': 'Mã phác đồ mẫu chỉ chứa chữ hoa, số, gạch ngang hoặc gạch dưới',
    }),
  description: Joi.string().trim().optional().allow('', null),
  status: Joi.string()
    .valid('hoat_dong', 'ngung_hoat_dong')
    .default('hoat_dong')
    .messages({
      'any.only': 'Trạng thái phải là hoat_dong hoặc ngung_hoat_dong',
    }),
  stages: Joi.array().items(initialStageSchema).optional().default([]),
});

/**
 * adminUpdateTreatmentPlanRequestSchema
 * Kiểm thực dữ liệu cập nhật thông tin phác đồ mẫu cha
 */
export const adminUpdateTreatmentPlanRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).optional().messages({
    'string.empty': 'Tên phác đồ mẫu không được để trống',
    'string.min': 'Tên phác đồ mẫu tối thiểu 2 ký tự',
    'string.max': 'Tên phác đồ mẫu tối đa 200 ký tự',
  }),
  code: Joi.string()
    .trim()
    .uppercase()
    .max(30)
    .pattern(/^[A-Z0-9_-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mã phác đồ mẫu tối đa 30 ký tự',
      'string.pattern.base': 'Mã phác đồ mẫu chỉ chứa chữ hoa, số, gạch ngang hoặc gạch dưới',
    }),
  description: Joi.string().trim().optional().allow('', null),
  status: Joi.string()
    .valid('hoat_dong', 'ngung_hoat_dong')
    .optional()
    .messages({
      'any.only': 'Trạng thái phải là hoat_dong hoặc ngung_hoat_dong',
    }),
}).min(1).messages({
  'object.min': 'Cần ít nhất một trường dữ liệu để cập nhật',
});

/**
 * adminUpdateTreatmentPlanStatusRequestSchema
 * Kiểm thực thay đổi trạng thái hoạt động của phác đồ mẫu
 */
export const adminUpdateTreatmentPlanStatusRequestSchema = Joi.object({
  status: Joi.string()
    .valid('hoat_dong', 'ngung_hoat_dong')
    .required()
    .messages({
      'any.required': 'Trạng thái không được để trống',
      'any.only': 'Trạng thái phải là hoat_dong hoặc ngung_hoat_dong',
    }),
});

/**
 * adminCreateTreatmentStageParamsSchema
 * Kiểm thực params :planId khi thêm giai đoạn con
 */
export const adminCreateTreatmentStageParamsSchema = Joi.object({
  planId: Joi.string().uuid().required().messages({
    'any.required': 'ID phác đồ mẫu không được để trống',
    'string.guid': 'ID phác đồ mẫu phải là UUID hợp lệ',
  }),
});

/**
 * adminCreateTreatmentStageRequestSchema
 * Kiểm thực dữ liệu thêm mới một giai đoạn / bước điều trị mẫu (Level 1)
 */
export const adminCreateTreatmentStageRequestSchema = Joi.object({
  stepNumber: Joi.number().integer().min(1).optional().messages({
    'number.base': 'Bước số phải là số nguyên',
    'number.min': 'Bước số tối thiểu là 1',
  }),
  name: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Tên giai đoạn không được để trống',
    'string.empty': 'Tên giai đoạn không được để trống',
    'string.min': 'Tên giai đoạn tối thiểu 2 ký tự',
    'string.max': 'Tên giai đoạn tối đa 200 ký tự',
  }),
  serviceName: Joi.string().trim().max(255).optional().allow('', null),
  description: Joi.string().trim().optional().allow('', null),
  restingTime: Joi.string().trim().max(100).optional().allow('', null),
});

/**
 * adminTreatmentStageParamsSchema
 * Kiểm thực params :stageId
 */
export const adminTreatmentStageParamsSchema = Joi.object({
  stageId: Joi.string().uuid().required().messages({
    'any.required': 'ID giai đoạn không được để trống',
    'string.guid': 'ID giai đoạn phải là UUID hợp lệ',
  }),
});

/**
 * adminUpdateTreatmentStageRequestSchema
 * Kiểm thực dữ liệu chỉnh sửa một giai đoạn điều trị mẫu
 */
export const adminUpdateTreatmentStageRequestSchema = Joi.object({
  stepNumber: Joi.number().integer().min(1).optional().messages({
    'number.base': 'Bước số phải là số nguyên',
    'number.min': 'Bước số tối thiểu là 1',
  }),
  name: Joi.string().trim().min(2).max(200).optional().messages({
    'string.empty': 'Tên giai đoạn không được để trống',
    'string.min': 'Tên giai đoạn tối thiểu 2 ký tự',
    'string.max': 'Tên giai đoạn tối đa 200 ký tự',
  }),
  serviceName: Joi.string().trim().max(255).optional().allow('', null),
  description: Joi.string().trim().optional().allow('', null),
  restingTime: Joi.string().trim().max(100).optional().allow('', null),
}).min(1).messages({
  'object.min': 'Cần ít nhất một trường dữ liệu để cập nhật',
});

// ============================================================================
// 2. RESPONSE SCHEMAS (Sanitizers & Formatters chuẩn camelCase)
// ============================================================================

const planStatusTitleMap = {
  hoat_dong: 'Hoạt động',
  ngung_hoat_dong: 'Ngưng hoạt động',
};

/**
 * adminTreatmentStageResponseSchema
 * Format thông tin một giai đoạn / bước điều trị con
 */
export const adminTreatmentStageResponseSchema = (stage) => {
  if (!stage) return null;

  return {
    id: stage.id,
    planId: stage.phacDoMauId,
    stepNumber: stage.buocSo,
    name: stage.tenGiaiDoan,
    serviceName: stage.tenDichVu || null,
    description: stage.moTa || null,
    restingTime: stage.thoiGianNghiGiuaBuoc || null,
    createdAt: stage.createdAt,
    updatedAt: stage.updatedAt,
  };
};

/**
 * adminTreatmentPlanDetailResponseSchema
 * Format thông tin chi tiết một phác đồ mẫu kèm danh sách các giai đoạn con
 */
export const adminTreatmentPlanDetailResponseSchema = (plan) => {
  if (!plan) return null;

  const stages = Array.isArray(plan.giaiDoanMau)
    ? plan.giaiDoanMau.map(adminTreatmentStageResponseSchema)
    : [];

  return {
    id: plan.id,
    code: plan.maPhacDoMau || null,
    name: plan.tenPhacDoMau,
    description: plan.moTa || null,
    status: plan.trangThai,
    statusTitle: planStatusTitleMap[plan.trangThai] || plan.trangThai,
    stagesCount: stages.length,
    appliedPatientsCount: plan._count?.phacDoDieuTri ?? 0,
    stages,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
};

/**
 * adminTreatmentPlanListItemResponseSchema
 * Format phần tử phác đồ mẫu trong bảng danh sách tổng quan
 */
export const adminTreatmentPlanListItemResponseSchema = (plan) => {
  if (!plan) return null;

  return {
    id: plan.id,
    code: plan.maPhacDoMau || null,
    name: plan.tenPhacDoMau,
    description: plan.moTa || null,
    status: plan.trangThai,
    statusTitle: planStatusTitleMap[plan.trangThai] || plan.trangThai,
    stagesCount: plan._count?.giaiDoanMau ?? (plan.giaiDoanMau?.length ?? 0),
    appliedPatientsCount: plan._count?.phacDoDieuTri ?? 0,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
};
