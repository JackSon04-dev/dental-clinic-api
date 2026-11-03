import Joi from 'joi';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

/**
 * adminGetMedicinesQuerySchema
 * Kiểm thực query parameters cho API lấy danh sách thuốc có phân trang, bộ lọc và tìm kiếm
 */
export const adminGetMedicinesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Tham số page phải là số nguyên',
    'number.min': 'Tham số page tối thiểu là 1',
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Tham số limit phải là số nguyên',
    'number.min': 'Tham số limit tối thiểu là 1',
    'number.max': 'Tham số limit tối đa là 100',
  }),
  group: Joi.string().trim().allow('', 'ALL').default('ALL').messages({
    'string.base': 'Tham số group phải là chuỗi',
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
 * adminGetMedicineDetailParamsSchema
 * Kiểm thực params :id (UUID của thuốc)
 */
export const adminGetMedicineDetailParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'any.required': 'ID thuốc không được để trống',
    'string.guid': 'ID thuốc phải là định dạng UUID hợp lệ',
  }),
});

/**
 * adminCreateMedicineRequestSchema
 * Kiểm thực dữ liệu thêm mới một loại thuốc vào thư viện (Level 0 - Master Data)
 */
export const adminCreateMedicineRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Tên thuốc không được để trống',
    'string.empty': 'Tên thuốc không được để trống',
    'string.min': 'Tên thuốc tối thiểu 2 ký tự',
    'string.max': 'Tên thuốc tối đa 200 ký tự',
  }),
  code: Joi.string()
    .trim()
    .max(30)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mã thuốc tối đa 30 ký tự',
      'string.pattern.base': 'Mã thuốc chỉ chứa chữ cái, số, gạch ngang (-) hoặc gạch dưới (_)',
    }),
  brandName: Joi.string().trim().max(200).optional().allow('', null).messages({
    'string.max': 'Tên biệt dược tối đa 200 ký tự',
  }),
  activeIngredient: Joi.string().trim().max(200).optional().allow('', null).messages({
    'string.max': 'Hoạt chất tối đa 200 ký tự',
  }),
  strength: Joi.string().trim().max(100).optional().allow('', null).messages({
    'string.max': 'Hàm lượng tối đa 100 ký tự',
  }),
  dosageForm: Joi.string().trim().max(100).optional().allow('', null).messages({
    'string.max': 'Dạng bào chế tối đa 100 ký tự',
  }),
  route: Joi.string().trim().max(50).optional().allow('', null).messages({
    'string.max': 'Đường dùng tối đa 50 ký tự',
  }),
  unit: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Đơn vị tính không được để trống',
    'string.empty': 'Đơn vị tính không được để trống',
    'string.max': 'Đơn vị tính tối đa 50 ký tự',
  }),
  group: Joi.string().trim().max(100).optional().allow('', null).messages({
    'string.max': 'Nhóm thuốc tối đa 100 ký tự',
  }),
  defaultDosage: Joi.string().trim().max(200).optional().allow('', null).messages({
    'string.max': 'Liều dùng mặc định tối đa 200 ký tự',
  }),
  defaultFrequency: Joi.number().integer().min(1).max(10).default(2).messages({
    'number.base': 'Số lần dùng trong ngày phải là số nguyên',
    'number.min': 'Số lần dùng trong ngày tối thiểu là 1',
    'number.max': 'Số lần dùng trong ngày tối đa là 10',
  }),
  defaultTiming: Joi.string().trim().max(100).optional().allow('', null).messages({
    'string.max': 'Thời điểm uống mặc định tối đa 100 ký tự',
  }),
  defaultInstructions: Joi.string().trim().optional().allow('', null).messages({
    'string.base': 'Hướng dẫn sử dụng mặc định phải là chuỗi',
  }),
  contraindications: Joi.string().trim().optional().allow('', null).messages({
    'string.base': 'Chống chỉ định phải là chuỗi',
  }),
  referencePrice: Joi.number().min(0).default(0).messages({
    'number.base': 'Giá tham khảo phải là số hợp lệ',
    'number.min': 'Giá tham khảo phải lớn hơn hoặc bằng 0',
  }),
  status: Joi.string()
    .valid('hoat_dong', 'ngung_hoat_dong')
    .default('hoat_dong')
    .messages({
      'any.only': 'Trạng thái thuốc phải là: hoat_dong hoặc ngung_hoat_dong',
    }),
});

/**
 * adminUpdateMedicineRequestSchema
 * Kiểm thực dữ liệu cập nhật thông tin thuốc
 */
export const adminUpdateMedicineRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).optional().messages({
    'string.empty': 'Tên thuốc không được để rỗng',
    'string.min': 'Tên thuốc tối thiểu 2 ký tự',
    'string.max': 'Tên thuốc tối đa 200 ký tự',
  }),
  code: Joi.string()
    .trim()
    .max(30)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mã thuốc tối đa 30 ký tự',
      'string.pattern.base': 'Mã thuốc chỉ chứa chữ cái, số, gạch ngang (-) hoặc gạch dưới (_)',
    }),
  brandName: Joi.string().trim().max(200).optional().allow('', null).messages({
    'string.max': 'Tên biệt dược tối đa 200 ký tự',
  }),
  activeIngredient: Joi.string().trim().max(200).optional().allow('', null).messages({
    'string.max': 'Hoạt chất tối đa 200 ký tự',
  }),
  strength: Joi.string().trim().max(100).optional().allow('', null).messages({
    'string.max': 'Hàm lượng tối đa 100 ký tự',
  }),
  dosageForm: Joi.string().trim().max(100).optional().allow('', null).messages({
    'string.max': 'Dạng bào chế tối đa 100 ký tự',
  }),
  route: Joi.string().trim().max(50).optional().allow('', null).messages({
    'string.max': 'Đường dùng tối đa 50 ký tự',
  }),
  unit: Joi.string().trim().min(1).max(50).optional().messages({
    'string.empty': 'Đơn vị tính không được để rỗng',
    'string.max': 'Đơn vị tính tối đa 50 ký tự',
  }),
  group: Joi.string().trim().max(100).optional().allow('', null).messages({
    'string.max': 'Nhóm thuốc tối đa 100 ký tự',
  }),
  defaultDosage: Joi.string().trim().max(200).optional().allow('', null).messages({
    'string.max': 'Liều dùng mặc định tối đa 200 ký tự',
  }),
  defaultFrequency: Joi.number().integer().min(1).max(10).optional().messages({
    'number.base': 'Số lần dùng trong ngày phải là số nguyên',
    'number.min': 'Số lần dùng trong ngày tối thiểu là 1',
    'number.max': 'Số lần dùng trong ngày tối đa là 10',
  }),
  defaultTiming: Joi.string().trim().max(100).optional().allow('', null).messages({
    'string.max': 'Thời điểm uống mặc định tối đa 100 ký tự',
  }),
  defaultInstructions: Joi.string().trim().optional().allow('', null).messages({
    'string.base': 'Hướng dẫn sử dụng mặc định phải là chuỗi',
  }),
  contraindications: Joi.string().trim().optional().allow('', null).messages({
    'string.base': 'Chống chỉ định phải là chuỗi',
  }),
  referencePrice: Joi.number().min(0).optional().messages({
    'number.base': 'Giá tham khảo phải là số hợp lệ',
    'number.min': 'Giá tham khảo phải lớn hơn hoặc bằng 0',
  }),
  status: Joi.string()
    .valid('hoat_dong', 'ngung_hoat_dong')
    .optional()
    .messages({
      'any.only': 'Trạng thái thuốc phải là: hoat_dong hoặc ngung_hoat_dong',
    }),
})
  .min(1)
  .messages({
    'object.min': 'Cần gửi ít nhất một trường thông tin cần cập nhật',
  });

/**
 * adminUpdateMedicineStatusRequestSchema
 * Kiểm thực dữ liệu bật / tắt trạng thái hoạt động của thuốc
 */
export const adminUpdateMedicineStatusRequestSchema = Joi.object({
  status: Joi.string()
    .valid('hoat_dong', 'ngung_hoat_dong')
    .required()
    .messages({
      'any.required': 'Trạng thái không được để trống',
      'any.only': 'Trạng thái phải là: hoat_dong hoặc ngung_hoat_dong',
    }),
});

// ============================================================================
// 2. RESPONSE SCHEMAS (Sanitizers & Formatters chuẩn camelCase cho FE)
// ============================================================================

/**
 * adminMedicineDetailResponseSchema
 * Format chi tiết đầy đủ một loại thuốc cho màn hình xem / sửa
 */
export const adminMedicineDetailResponseSchema = (medicine) => {
  if (!medicine) return null;

  return {
    id: medicine.id,
    code: medicine.maThuoc || null,
    name: medicine.tenThuoc,
    brandName: medicine.tenBietDuoc || null,
    activeIngredient: medicine.hoatChat || null,
    strength: medicine.hamLuong || null,
    dosageForm: medicine.dangBaoChe || null,
    route: medicine.duongDung || null,
    unit: medicine.donViTinh,
    group: medicine.nhomThuoc || null,
    defaultDosage: medicine.lieuDungMacDinh || null,
    defaultFrequency: medicine.soLanNgayMacDinh ?? 2,
    defaultTiming: medicine.thoiDiemUongMacDinh || null,
    defaultInstructions: medicine.huongDanMacDinh || null,
    contraindications: medicine.chongChiDinh || null,
    referencePrice: Number(medicine.giaThamKhao || 0),
    status: medicine.trangThai,
    statusTitle: medicine.trangThai === 'hoat_dong' ? 'Đang sử dụng' : 'Ngừng sử dụng',
    usageCount: medicine._count ? medicine._count.chiTietDonThuoc : (medicine.chiTietDonThuoc?.length ?? 0),
    createdAt: medicine.createdAt,
    updatedAt: medicine.updatedAt,
  };
};

/**
 * adminMedicineListItemResponseSchema
 * Format một phần tử thuốc trong bảng danh sách tổng quan
 */
export const adminMedicineListItemResponseSchema = (medicine) => {
  return adminMedicineDetailResponseSchema(medicine);
};

