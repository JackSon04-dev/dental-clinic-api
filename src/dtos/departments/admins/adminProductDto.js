import Joi from 'joi';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

/**
 * adminGetProductsQuerySchema
 * Kiểm thực query parameters cho API lấy danh sách sản phẩm / vật tư
 */
export const adminGetProductsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Tham số page phải là số nguyên',
    'number.min': 'Tham số page tối thiểu là 1',
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Tham số limit phải là số nguyên',
    'number.min': 'Tham số limit tối thiểu là 1',
    'number.max': 'Tham số limit tối đa là 100',
  }),
  type: Joi.string()
    .valid('ALL', 'vat_lieu_nha_khoa', 'dung_cu', 'vat_tu')
    .default('ALL')
    .messages({
      'any.only': 'Tham số type phải là một trong: ALL, vat_lieu_nha_khoa, dung_cu, vat_tu',
    }),
  status: Joi.string()
    .valid('ALL', 'hoat_dong', 'ngung_hoat_dong')
    .default('ALL')
    .messages({
      'any.only': 'Tham số status phải là một trong: ALL, hoat_dong, ngung_hoat_dong',
    }),
  stockAlert: Joi.string()
    .valid('ALL', 'LOW_STOCK', 'OUT_OF_STOCK')
    .default('ALL')
    .messages({
      'any.only': 'Tham số stockAlert phải là một trong: ALL, LOW_STOCK, OUT_OF_STOCK',
    }),
  serviceId: Joi.string().uuid().optional().allow('', null).messages({
    'string.guid': 'serviceId phải là UUID hợp lệ',
  }),
  search: Joi.string().trim().allow('').default(''),
});

/**
 * adminGetProductDetailParamsSchema
 * Kiểm thực params :id (UUID sản phẩm)
 */
export const adminGetProductDetailParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'any.required': 'ID sản phẩm không được để trống',
    'string.guid': 'ID sản phẩm phải là UUID hợp lệ',
  }),
});

/**
 * adminCreateProductRequestSchema
 * Kiểm thực dữ liệu thêm mới sản phẩm / vật tư (Level 0)
 */
export const adminCreateProductRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Tên sản phẩm không được để trống',
    'string.empty': 'Tên sản phẩm không được để trống',
    'string.min': 'Tên sản phẩm tối thiểu 2 ký tự',
    'string.max': 'Tên sản phẩm tối đa 200 ký tự',
  }),
  code: Joi.string()
    .trim()
    .max(30)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mã sản phẩm tối đa 30 ký tự',
      'string.pattern.base': 'Mã sản phẩm chỉ chứa chữ cái, số, gạch ngang hoặc gạch dưới',
    }),
  type: Joi.string()
    .valid('vat_lieu_nha_khoa', 'dung_cu', 'vat_tu')
    .required()
    .messages({
      'any.required': 'Loại sản phẩm không được để trống',
      'any.only': 'Loại sản phẩm phải là: vat_lieu_nha_khoa, dung_cu, hoặc vat_tu',
    }),
  unit: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Đơn vị tính không được để trống',
    'string.empty': 'Đơn vị tính không được để trống',
    'string.max': 'Đơn vị tính tối đa 50 ký tự',
  }),
  price: Joi.number().min(0).default(0).messages({
    'number.base': 'Giá bán phải là số hợp lệ',
    'number.min': 'Giá bán phải lớn hơn hoặc bằng 0',
  }),
  stockQuantity: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'Số lượng tồn phải là số nguyên',
    'number.min': 'Số lượng tồn phải lớn hơn hoặc bằng 0',
  }),
  minStockThreshold: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'Mức tồn tối thiểu phải là số nguyên',
    'number.min': 'Mức tồn tối thiểu phải lớn hơn hoặc bằng 0',
  }),
  serviceId: Joi.string().uuid().optional().allow('', null).messages({
    'string.guid': 'serviceId phải là UUID hợp lệ',
  }),
  description: Joi.string().trim().optional().allow('', null),
  status: Joi.string()
    .valid('hoat_dong', 'ngung_hoat_dong')
    .default('hoat_dong')
    .messages({
      'any.only': 'Trạng thái phải là hoat_dong hoặc ngung_hoat_dong',
    }),
});

/**
 * adminUpdateProductRequestSchema
 * Kiểm thực dữ liệu cập nhật sản phẩm / vật tư
 */
export const adminUpdateProductRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).optional().messages({
    'string.empty': 'Tên sản phẩm không được để trống',
    'string.min': 'Tên sản phẩm tối thiểu 2 ký tự',
    'string.max': 'Tên sản phẩm tối đa 200 ký tự',
  }),
  code: Joi.string()
    .trim()
    .max(30)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mã sản phẩm tối đa 30 ký tự',
      'string.pattern.base': 'Mã sản phẩm chỉ chứa chữ cái, số, gạch ngang hoặc gạch dưới',
    }),
  type: Joi.string()
    .valid('vat_lieu_nha_khoa', 'dung_cu', 'vat_tu')
    .optional()
    .messages({
      'any.only': 'Loại sản phẩm phải là: vat_lieu_nha_khoa, dung_cu, hoặc vat_tu',
    }),
  unit: Joi.string().trim().min(1).max(50).optional().messages({
    'string.empty': 'Đơn vị tính không được để trống',
    'string.max': 'Đơn vị tính tối đa 50 ký tự',
  }),
  price: Joi.number().min(0).optional().messages({
    'number.base': 'Giá bán phải là số hợp lệ',
    'number.min': 'Giá bán phải lớn hơn hoặc bằng 0',
  }),
  stockQuantity: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Số lượng tồn phải là số nguyên',
    'number.min': 'Số lượng tồn phải lớn hơn hoặc bằng 0',
  }),
  minStockThreshold: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Mức tồn tối thiểu phải là số nguyên',
    'number.min': 'Mức tồn tối thiểu phải lớn hơn hoặc bằng 0',
  }),
  serviceId: Joi.string().uuid().optional().allow('', null).messages({
    'string.guid': 'serviceId phải là UUID hợp lệ',
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
 * adminUpdateProductStatusRequestSchema
 * Kiểm thực dữ liệu thay đổi trạng thái hoạt động
 */
export const adminUpdateProductStatusRequestSchema = Joi.object({
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

const productTypeTitleMap = {
  vat_lieu_nha_khoa: 'Vật liệu nha khoa',
  dung_cu: 'Dụng cụ y tế',
  vat_tu: 'Vật tư tiêu hao',
};

/**
 * adminProductDetailResponseSchema
 * Format thông tin chi tiết một sản phẩm / vật tư
 */
export const adminProductDetailResponseSchema = (product) => {
  if (!product) return null;

  const stockQuantity = product.soLuongTon ?? 0;
  const minStockThreshold = product.mucTonToiThieu ?? 0;

  return {
    id: product.id,
    code: product.maSanPham || null,
    name: product.tenSanPham,
    type: product.loai,
    typeTitle: productTypeTitleMap[product.loai] || product.loai,
    unit: product.donViTinh,
    price: Number(product.giaBan),
    stockQuantity,
    minStockThreshold,
    isLowStock: stockQuantity <= minStockThreshold,
    isOutOfStock: stockQuantity === 0,
    serviceId: product.dichVuId || null,
    service: product.dichVu
      ? {
          id: product.dichVu.id,
          code: product.dichVu.maDichVu || null,
          name: product.dichVu.tenDichVu,
        }
      : null,
    description: product.moTa || null,
    status: product.trangThai,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

/**
 * adminProductListItemResponseSchema
 * Format phần tử sản phẩm trong bảng danh sách tổng quan
 */
export const adminProductListItemResponseSchema = (product) => {
  return adminProductDetailResponseSchema(product);
};
