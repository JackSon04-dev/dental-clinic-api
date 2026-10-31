import Joi from 'joi';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

/**
 * adminGetPromotionsQuerySchema
 * Kiểm thực query parameters cho API lấy danh sách khuyến mãi / voucher
 */
export const adminGetPromotionsQuerySchema = Joi.object({
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
    .valid('ALL', 'hoat_dong', 'het_han', 'da_huy')
    .default('ALL')
    .messages({
      'any.only': 'Tham số status phải là một trong: ALL, hoat_dong, het_han, da_huy',
    }),
  discountType: Joi.string()
    .valid('ALL', 'phan_tram', 'so_tien')
    .default('ALL')
    .messages({
      'any.only': 'Tham số discountType phải là một trong: ALL, phan_tram, so_tien',
    }),
  timeStatus: Joi.string()
    .valid('ALL', 'UPCOMING', 'HAPPENING', 'EXPIRED')
    .default('ALL')
    .messages({
      'any.only': 'Tham số timeStatus phải là một trong: ALL, UPCOMING, HAPPENING, EXPIRED',
    }),
  search: Joi.string().trim().allow('').default(''),
});

/**
 * adminGetPromotionDetailParamsSchema
 * Kiểm thực params :id (UUID khuyến mãi)
 */
export const adminGetPromotionDetailParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'any.required': 'ID khuyến mãi không được để trống',
    'string.guid': 'ID khuyến mãi phải là UUID hợp lệ',
  }),
});

/**
 * adminCreatePromotionRequestSchema
 * Kiểm thực dữ liệu thêm mới chương trình khuyến mãi (Level 0)
 */
export const adminCreatePromotionRequestSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .max(30)
    .pattern(/^[A-Z0-9_-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mã khuyến mãi tối đa 30 ký tự',
      'string.pattern.base': 'Mã khuyến mãi chỉ chứa chữ hoa, số, gạch ngang hoặc gạch dưới',
    }),
  programName: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Tên chương trình khuyến mãi không được để trống',
    'string.empty': 'Tên chương trình khuyến mãi không được để trống',
    'string.min': 'Tên chương trình khuyến mãi tối thiểu 2 ký tự',
    'string.max': 'Tên chương trình khuyến mãi tối đa 200 ký tự',
  }),
  discountType: Joi.string()
    .valid('phan_tram', 'so_tien')
    .required()
    .messages({
      'any.required': 'Loại giảm giá không được để trống',
      'any.only': 'Loại giảm giá phải là phan_tram hoặc so_tien',
    }),
  discountValue: Joi.number()
    .positive()
    .required()
    .when('discountType', {
      is: 'phan_tram',
      then: Joi.number().max(100).messages({
        'number.max': 'Giảm giá theo phần trăm không được vượt quá 100%',
      }),
    })
    .messages({
      'any.required': 'Giá trị giảm không được để trống',
      'number.base': 'Giá trị giảm phải là số hợp lệ',
      'number.positive': 'Giá trị giảm phải lớn hơn 0',
    }),
  startDate: Joi.date().iso().required().messages({
    'any.required': 'Ngày bắt đầu không được để trống',
    'date.format': 'Ngày bắt đầu phải theo định dạng YYYY-MM-DD',
  }),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required().messages({
    'any.required': 'Ngày kết thúc không được để trống',
    'date.format': 'Ngày kết thúc phải theo định dạng YYYY-MM-DD',
    'date.min': 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu',
  }),
  maxUsageCount: Joi.number().integer().min(1).optional().allow(null).messages({
    'number.base': 'Số lần sử dụng tối đa phải là số nguyên',
    'number.min': 'Số lần sử dụng tối đa tối thiểu là 1',
  }),
  status: Joi.string()
    .valid('hoat_dong', 'da_huy')
    .default('hoat_dong')
    .messages({
      'any.only': 'Trạng thái ban đầu phải là hoat_dong hoặc da_huy',
    }),
});

/**
 * adminUpdatePromotionRequestSchema
 * Kiểm thực dữ liệu cập nhật chương trình khuyến mãi
 */
export const adminUpdatePromotionRequestSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .max(30)
    .pattern(/^[A-Z0-9_-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mã khuyến mãi tối đa 30 ký tự',
      'string.pattern.base': 'Mã khuyến mãi chỉ chứa chữ hoa, số, gạch ngang hoặc gạch dưới',
    }),
  programName: Joi.string().trim().min(2).max(200).optional().messages({
    'string.empty': 'Tên chương trình khuyến mãi không được để trống',
    'string.min': 'Tên chương trình khuyến mãi tối thiểu 2 ký tự',
    'string.max': 'Tên chương trình khuyến mãi tối đa 200 ký tự',
  }),
  discountType: Joi.string()
    .valid('phan_tram', 'so_tien')
    .optional()
    .messages({
      'any.only': 'Loại giảm giá phải là phan_tram hoặc so_tien',
    }),
  discountValue: Joi.number()
    .positive()
    .optional()
    .when('discountType', {
      is: 'phan_tram',
      then: Joi.number().max(100).messages({
        'number.max': 'Giảm giá theo phần trăm không được vượt quá 100%',
      }),
    })
    .messages({
      'number.base': 'Giá trị giảm phải là số hợp lệ',
      'number.positive': 'Giá trị giảm phải lớn hơn 0',
    }),
  startDate: Joi.date().iso().optional().messages({
    'date.format': 'Ngày bắt đầu phải theo định dạng YYYY-MM-DD',
  }),
  endDate: Joi.date().iso().optional().messages({
    'date.format': 'Ngày kết thúc phải theo định dạng YYYY-MM-DD',
  }),
  maxUsageCount: Joi.number().integer().min(1).optional().allow(null).messages({
    'number.base': 'Số lần sử dụng tối đa phải là số nguyên',
    'number.min': 'Số lần sử dụng tối đa tối thiểu là 1',
  }),
  status: Joi.string()
    .valid('hoat_dong', 'het_han', 'da_huy')
    .optional()
    .messages({
      'any.only': 'Trạng thái phải là hoat_dong, het_han hoặc da_huy',
    }),
}).min(1).messages({
  'object.min': 'Cần ít nhất một trường dữ liệu để cập nhật',
});

/**
 * adminUpdatePromotionStatusRequestSchema
 * Kiểm thực cập nhật trạng thái hoạt động của khuyến mãi
 */
export const adminUpdatePromotionStatusRequestSchema = Joi.object({
  status: Joi.string()
    .valid('hoat_dong', 'het_han', 'da_huy')
    .required()
    .messages({
      'any.required': 'Trạng thái không được để trống',
      'any.only': 'Trạng thái phải là hoat_dong, het_han hoặc da_huy',
    }),
});

// ============================================================================
// 2. RESPONSE SCHEMAS (Sanitizers & Formatters chuẩn camelCase)
// ============================================================================

const discountTypeTitleMap = {
  phan_tram: 'Phần trăm (%)',
  so_tien: 'Số tiền cố định (VNĐ)',
};

const statusTitleMap = {
  hoat_dong: 'Đang áp dụng',
  het_han: 'Hết hạn',
  da_huy: 'Đã hủy',
};

/**
 * Format date sang chuỗi YYYY-MM-DD
 */
const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * adminPromotionDetailResponseSchema
 * Format thông tin chi tiết một chương trình khuyến mãi
 */
export const adminPromotionDetailResponseSchema = (promo) => {
  if (!promo) return null;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const endDateStr = promo.ngayKetThuc ? new Date(promo.ngayKetThuc).toISOString().split('T')[0] : null;
  const startDateStr = promo.ngayBatDau ? new Date(promo.ngayBatDau).toISOString().split('T')[0] : null;

  const maxUsage = promo.soLanSuDungToiDa ?? null;
  const usedCount = promo.soLanDaSuDung ?? 0;
  const remainingUsage = maxUsage !== null ? Math.max(0, maxUsage - usedCount) : null;

  const isExpiredByTime = endDateStr ? endDateStr < todayStr : false;
  const isExpiredByUsage = maxUsage !== null ? usedCount >= maxUsage : false;
  const isExpired = isExpiredByTime || isExpiredByUsage || promo.trangThai === 'het_han';

  return {
    id: promo.id,
    code: promo.maKhuyenMai,
    programName: promo.tenChuongTrinh,
    discountType: promo.loaiGiam,
    discountTypeTitle: discountTypeTitleMap[promo.loaiGiam] || promo.loaiGiam,
    discountValue: Number(promo.giaTriGiam),
    startDate: formatDate(promo.ngayBatDau),
    endDate: formatDate(promo.ngayKetThuc),
    maxUsageCount: maxUsage,
    usedCount,
    remainingUsageCount: remainingUsage,
    isExpired,
    status: promo.trangThai,
    statusTitle: statusTitleMap[promo.trangThai] || promo.trangThai,
    invoicesCount: promo._count?.hoaDon ?? undefined,
    createdAt: promo.createdAt,
    updatedAt: promo.updatedAt,
  };
};

/**
 * adminPromotionListItemResponseSchema
 * Format phần tử khuyến mãi trong danh sách bảng tổng quan
 */
export const adminPromotionListItemResponseSchema = (promo) => {
  return adminPromotionDetailResponseSchema(promo);
};
