import Joi from 'joi';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

/**
 * adminGetServicesQuerySchema
 * Kiểm thực query parameters cho API lấy danh sách dịch vụ cha
 */
export const adminGetServicesQuerySchema = Joi.object({
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
      'any.only': 'Tham số status phải là một trong các giá trị: ALL, hoat_dong, ngung_hoat_dong',
    }),
  search: Joi.string().trim().allow('').default(''),
});

/**
 * adminGetServiceDetailParamsSchema
 * Kiểm thực params :id (phải là UUID của dịch vụ cha)
 */
export const adminGetServiceDetailParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'any.required': 'ID dịch vụ không được để trống',
    'string.guid': 'ID dịch vụ phải là UUID hợp lệ',
  }),
});

/**
 * adminCreateServiceRequestSchema
 * Kiểm thực dữ liệu tạo mới dịch vụ cha (Level 0)
 */
export const adminCreateServiceRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).required().messages({
    'any.required': 'Tên dịch vụ không được để trống',
    'string.empty': 'Tên dịch vụ không được để trống',
    'string.min': 'Tên dịch vụ tối thiểu 2 ký tự',
    'string.max': 'Tên dịch vụ tối đa 255 ký tự',
  }),
  code: Joi.string()
    .trim()
    .max(20)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mã dịch vụ tối đa 20 ký tự',
      'string.pattern.base': 'Mã dịch vụ chỉ chứa chữ cái, số, gạch ngang hoặc gạch dưới',
    }),
  description: Joi.string().trim().optional().allow('', null),
  processInfo: Joi.string().trim().optional().allow('', null),
  estimatedDurationMinutes: Joi.number().integer().min(1).max(1440).default(30).messages({
    'number.base': 'Thời gian dự kiến phải là số phút nguyên',
    'number.min': 'Thời gian dự kiến tối thiểu 1 phút',
    'number.max': 'Thời gian dự kiến tối đa 1440 phút (24 giờ)',
  }),
  status: Joi.string()
    .valid('hoat_dong', 'ngung_hoat_dong')
    .default('hoat_dong')
    .messages({
      'any.only': 'Trạng thái phải là hoat_dong hoặc ngung_hoat_dong',
    }),
});

/**
 * adminUpdateServiceRequestSchema
 * Kiểm thực dữ liệu cập nhật thông tin dịch vụ cha
 */
export const adminUpdateServiceRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).optional().messages({
    'string.empty': 'Tên dịch vụ không được để trống',
    'string.min': 'Tên dịch vụ tối thiểu 2 ký tự',
    'string.max': 'Tên dịch vụ tối đa 255 ký tự',
  }),
  code: Joi.string()
    .trim()
    .max(20)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mã dịch vụ tối đa 20 ký tự',
      'string.pattern.base': 'Mã dịch vụ chỉ chứa chữ cái, số, gạch ngang hoặc gạch dưới',
    }),
  description: Joi.string().trim().optional().allow('', null),
  processInfo: Joi.string().trim().optional().allow('', null),
  estimatedDurationMinutes: Joi.number().integer().min(1).max(1440).optional().messages({
    'number.base': 'Thời gian dự kiến phải là số phút nguyên',
    'number.min': 'Thời gian dự kiến tối thiểu 1 phút',
    'number.max': 'Thời gian dự kiến tối đa 1440 phút (24 giờ)',
  }),
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
 * adminUpdateServiceStatusRequestSchema
 * Kiểm thực thay đổi trạng thái hoạt động dịch vụ cha
 */
export const adminUpdateServiceStatusRequestSchema = Joi.object({
  status: Joi.string()
    .valid('hoat_dong', 'ngung_hoat_dong')
    .required()
    .messages({
      'any.required': 'Trạng thái không được để trống',
      'any.only': 'Trạng thái phải là hoat_dong hoặc ngung_hoat_dong',
    }),
});

/**
 * adminCreateServiceItemRequestSchema
 * Kiểm thực dữ liệu thêm mới gói / chi tiết dịch vụ (Level 1)
 */
export const adminCreateServiceItemRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Tên chi tiết dịch vụ không được để trống',
    'string.empty': 'Tên chi tiết dịch vụ không được để trống',
    'string.min': 'Tên chi tiết dịch vụ tối thiểu 2 ký tự',
    'string.max': 'Tên chi tiết dịch vụ tối đa 200 ký tự',
  }),
  code: Joi.string()
    .trim()
    .max(20)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mã chi tiết tối đa 20 ký tự',
      'string.pattern.base': 'Mã chi tiết chỉ chứa chữ cái, số, gạch ngang hoặc gạch dưới',
    }),
  price: Joi.number().min(0).required().messages({
    'any.required': 'Đơn giá không được để trống',
    'number.base': 'Đơn giá phải là số hợp lệ',
    'number.min': 'Đơn giá phải lớn hơn hoặc bằng 0',
  }),
  unit: Joi.string().trim().max(50).required().messages({
    'any.required': 'Đơn vị tính không được để trống',
    'string.empty': 'Đơn vị tính không được để trống',
    'string.max': 'Đơn vị tính tối đa 50 ký tự',
  }),
  status: Joi.string()
    .valid('hoat_dong', 'ngung_hoat_dong')
    .default('hoat_dong')
    .messages({
      'any.only': 'Trạng thái phải là hoat_dong hoặc ngung_hoat_dong',
    }),
});

/**
 * adminCreateServiceItemParamsSchema
 * Kiểm thực params :serviceId
 */
export const adminCreateServiceItemParamsSchema = Joi.object({
  serviceId: Joi.string().uuid().required().messages({
    'any.required': 'ID dịch vụ cha không được để trống',
    'string.guid': 'ID dịch vụ cha phải là UUID hợp lệ',
  }),
});

/**
 * adminServiceItemParamsSchema
 * Kiểm thực params :itemId
 */
export const adminServiceItemParamsSchema = Joi.object({
  itemId: Joi.string().uuid().required().messages({
    'any.required': 'ID chi tiết dịch vụ không được để trống',
    'string.guid': 'ID chi tiết dịch vụ phải là UUID hợp lệ',
  }),
});

/**
 * adminUpdateServiceItemRequestSchema
 * Kiểm thực dữ liệu cập nhật gói chi tiết dịch vụ
 */
export const adminUpdateServiceItemRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).optional().messages({
    'string.empty': 'Tên chi tiết dịch vụ không được để trống',
    'string.min': 'Tên chi tiết dịch vụ tối thiểu 2 ký tự',
    'string.max': 'Tên chi tiết dịch vụ tối đa 200 ký tự',
  }),
  code: Joi.string()
    .trim()
    .max(20)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mã chi tiết tối đa 20 ký tự',
      'string.pattern.base': 'Mã chi tiết chỉ chứa chữ cái, số, gạch ngang hoặc gạch dưới',
    }),
  price: Joi.number().min(0).optional().messages({
    'number.base': 'Đơn giá phải là số hợp lệ',
    'number.min': 'Đơn giá phải lớn hơn hoặc bằng 0',
  }),
  unit: Joi.string().trim().max(50).optional().messages({
    'string.empty': 'Đơn vị tính không được để trống',
    'string.max': 'Đơn vị tính tối đa 50 ký tự',
  }),
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
 * adminUpdateServiceItemStatusRequestSchema
 * Kiểm thực cập nhật trạng thái gói chi tiết dịch vụ
 */
export const adminUpdateServiceItemStatusRequestSchema = Joi.object({
  status: Joi.string()
    .valid('hoat_dong', 'ngung_hoat_dong')
    .required()
    .messages({
      'any.required': 'Trạng thái không được để trống',
      'any.only': 'Trạng thái phải là hoat_dong hoặc ngung_hoat_dong',
    }),
});

// ============================================================================
// 2. RESPONSE SCHEMAS (Sanitizers & Formatters chuẩn camelCase)
// ============================================================================

/**
 * adminServiceItemResponseSchema
 * Format chi tiết dịch vụ lâm sàng (chi_tiet_dich_vu)
 */
export const adminServiceItemResponseSchema = (item) => {
  if (!item) return null;

  return {
    id: item.id,
    serviceId: item.dichVuId,
    code: item.maChiTiet || null,
    name: item.tenChiTiet,
    price: Number(item.gia),
    unit: item.donViTinh || null,
    status: item.trangThai,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

/**
 * adminServiceDetailResponseSchema
 * Format thông tin chi tiết dịch vụ cha kèm toàn bộ danh sách gói chi tiết
 */
export const adminServiceDetailResponseSchema = (service) => {
  if (!service) return null;

  const items = Array.isArray(service.chiTietDichVu)
    ? service.chiTietDichVu.map(adminServiceItemResponseSchema)
    : [];

  return {
    id: service.id,
    code: service.maDichVu || null,
    name: service.tenDichVu,
    description: service.moTa || null,
    processInfo: service.thongTinQuyTrinh || null,
    estimatedDurationMinutes: service.thoiGianDuKienPhut ?? 30,
    status: service.trangThai,
    itemsCount: items.length,
    items,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
};

/**
 * adminServiceListItemResponseSchema
 * Format phần tử dịch vụ cha trong danh sách tổng quan
 */
export const adminServiceListItemResponseSchema = (service) => {
  if (!service) return null;

  const rawItems = Array.isArray(service.chiTietDichVu) ? service.chiTietDichVu : [];
  let minPrice = null;
  let maxPrice = null;

  if (rawItems.length > 0) {
    const prices = rawItems
      .filter((i) => i.trangThai === 'hoat_dong' || rawItems.length === 1)
      .map((i) => Number(i.gia));

    if (prices.length > 0) {
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    }
  }

  const itemsCount = service._count?.chiTietDichVu ?? rawItems.length;

  return {
    id: service.id,
    code: service.maDichVu || null,
    name: service.tenDichVu,
    description: service.moTa || null,
    processInfo: service.thongTinQuyTrinh || null,
    estimatedDurationMinutes: service.thoiGianDuKienPhut ?? 30,
    status: service.trangThai,
    itemsCount,
    minPrice,
    maxPrice,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
};
