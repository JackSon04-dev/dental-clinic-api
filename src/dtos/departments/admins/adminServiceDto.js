import Joi from 'joi';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

export const adminGetServicesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string()
    .valid('ALL', 'hoat_dong', 'ngung_hoat_dong')
    .default('ALL'),
  search: Joi.string().trim().allow('').default(''),
});

export const adminGetServiceDetailParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'any.required': 'ID dịch vụ không được để trống',
    'string.guid': 'ID dịch vụ phải là UUID hợp lệ',
  }),
});

/**
 * adminCreateServiceRequestSchema
 * Chấp nhận cả price/unit (English) và gia/donViTinh (Tiếng Việt)
 */
export const adminCreateServiceRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).optional(),
  tenDichVu: Joi.string().trim().min(2).max(255).optional(),
  code: Joi.string().trim().max(20).pattern(/^[A-Za-z0-9_-]+$/).optional().allow('', null),
  maDichVu: Joi.string().trim().max(20).pattern(/^[A-Za-z0-9_-]+$/).optional().allow('', null),
  price: Joi.number().min(0).optional(),
  gia: Joi.number().min(0).optional(),
  unit: Joi.string().trim().max(50).optional().allow('', null),
  donViTinh: Joi.string().trim().max(50).optional().allow('', null),
  description: Joi.string().trim().optional().allow('', null),
  moTa: Joi.string().trim().optional().allow('', null),
  processInfo: Joi.string().trim().optional().allow('', null),
  thongTinQuyTrinh: Joi.string().trim().optional().allow('', null),
  estimatedDurationMinutes: Joi.number().integer().min(1).max(1440).default(30),
  thoiGianDuKienPhut: Joi.number().integer().min(1).max(1440).optional(),
  status: Joi.string().valid('hoat_dong', 'ngung_hoat_dong').default('hoat_dong'),
  trangThai: Joi.string().valid('hoat_dong', 'ngung_hoat_dong').optional(),
}).custom((value, helpers) => {
  if (!value.name && !value.tenDichVu) {
    return helpers.error('any.required', { message: 'Tên dịch vụ không được để trống (name hoặc tenDichVu)' });
  }
  return value;
});

/**
 * adminUpdateServiceRequestSchema
 */
export const adminUpdateServiceRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).optional(),
  tenDichVu: Joi.string().trim().min(2).max(255).optional(),
  code: Joi.string().trim().max(20).pattern(/^[A-Za-z0-9_-]+$/).optional().allow('', null),
  maDichVu: Joi.string().trim().max(20).pattern(/^[A-Za-z0-9_-]+$/).optional().allow('', null),
  price: Joi.number().min(0).optional(),
  gia: Joi.number().min(0).optional(),
  unit: Joi.string().trim().max(50).optional().allow('', null),
  donViTinh: Joi.string().trim().max(50).optional().allow('', null),
  description: Joi.string().trim().optional().allow('', null),
  moTa: Joi.string().trim().optional().allow('', null),
  processInfo: Joi.string().trim().optional().allow('', null),
  thongTinQuyTrinh: Joi.string().trim().optional().allow('', null),
  estimatedDurationMinutes: Joi.number().integer().min(1).max(1440).optional(),
  thoiGianDuKienPhut: Joi.number().integer().min(1).max(1440).optional(),
  status: Joi.string().valid('hoat_dong', 'ngung_hoat_dong').optional(),
  trangThai: Joi.string().valid('hoat_dong', 'ngung_hoat_dong').optional(),
}).min(1).messages({
  'object.min': 'Cần ít nhất một trường dữ liệu để cập nhật',
});

export const adminUpdateServiceStatusRequestSchema = Joi.object({
  status: Joi.string()
    .valid('hoat_dong', 'ngung_hoat_dong')
    .required()
    .messages({
      'any.required': 'Trạng thái không được để trống',
      'any.only': 'Trạng thái phải là hoat_dong hoặc ngung_hoat_dong',
    }),
});

// ============================================================================
// 2. RESPONSE SCHEMAS
// ============================================================================

export const adminServiceDetailResponseSchema = (service) => {
  if (!service) return null;

  const rawProducts = Array.isArray(service.sanPham) ? service.sanPham : [];
  const productsCount = service._count?.sanPham ?? rawProducts.length;
  const directPrice = Number(service.gia ?? 0);
  const directUnit = service.donViTinh || 'Lần';

  return {
    id: service.id,
    code: service.maDichVu || null,
    maDichVu: service.maDichVu || null,
    name: service.tenDichVu,
    tenDichVu: service.tenDichVu,
    price: directPrice,
    gia: directPrice,
    unit: directUnit,
    donViTinh: directUnit,
    minPrice: directPrice,
    maxPrice: directPrice,
    description: service.moTa || null,
    moTa: service.moTa || null,
    processInfo: service.thongTinQuyTrinh || null,
    thongTinQuyTrinh: service.thongTinQuyTrinh || null,
    estimatedDurationMinutes: service.thoiGianDuKienPhut ?? 30,
    thoiGianDuKienPhut: service.thoiGianDuKienPhut ?? 30,
    status: service.trangThai,
    trangThai: service.trangThai,
    itemsCount: 0,
    productsCount,
    items: [],
    products: rawProducts.map((p) => ({
      id: p.id,
      code: p.maSanPham || null,
      name: p.tenSanPham,
      price: Number(p.giaBan || 0),
      unit: p.donViTinh || null,
    })),
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
};

export const adminServiceListItemResponseSchema = (service) => {
  if (!service) return null;

  const rawProducts = Array.isArray(service.sanPham) ? service.sanPham : [];
  const productsCount = service._count?.sanPham ?? rawProducts.length;
  const directPrice = Number(service.gia ?? 0);
  const directUnit = service.donViTinh || 'Lần';

  return {
    id: service.id,
    code: service.maDichVu || null,
    maDichVu: service.maDichVu || null,
    name: service.tenDichVu,
    tenDichVu: service.tenDichVu,
    price: directPrice,
    gia: directPrice,
    unit: directUnit,
    donViTinh: directUnit,
    minPrice: directPrice,
    maxPrice: directPrice,
    description: service.moTa || null,
    moTa: service.moTa || null,
    processInfo: service.thongTinQuyTrinh || null,
    thongTinQuyTrinh: service.thongTinQuyTrinh || null,
    estimatedDurationMinutes: service.thoiGianDuKienPhut ?? 30,
    thoiGianDuKienPhut: service.thoiGianDuKienPhut ?? 30,
    status: service.trangThai,
    trangThai: service.trangThai,
    itemsCount: 0,
    productsCount,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
};
