import Joi from 'joi';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

/**
 * adminGetRoomsQuerySchema
 * Kiểm thực query parameters cho API lấy danh sách phòng khám / phòng điều trị
 */
export const adminGetRoomsQuerySchema = Joi.object({
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
 * adminGetRoomDetailParamsSchema
 * Kiểm thực params :id (UUID phòng khám)
 */
export const adminGetRoomDetailParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'any.required': 'ID phòng khám không được để trống',
    'string.guid': 'ID phòng khám phải là UUID hợp lệ',
  }),
});

/**
 * adminCreateRoomRequestSchema
 * Kiểm thực dữ liệu thêm mới phòng khám (Level 0)
 */
export const adminCreateRoomRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required().messages({
    'any.required': 'Tên phòng khám không được để trống',
    'string.empty': 'Tên phòng khám không được để trống',
    'string.min': 'Tên phòng khám tối thiểu 2 ký tự',
    'string.max': 'Tên phòng khám tối đa 150 ký tự',
  }),
  code: Joi.string()
    .trim()
    .uppercase()
    .max(20)
    .pattern(/^[A-Z0-9_-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mã phòng khám tối đa 20 ký tự',
      'string.pattern.base': 'Mã phòng khám chỉ chứa chữ hoa, số, gạch ngang hoặc gạch dưới',
    }),
  status: Joi.string()
    .valid('hoat_dong', 'ngung_hoat_dong')
    .default('hoat_dong')
    .messages({
      'any.only': 'Trạng thái phải là hoat_dong hoặc ngung_hoat_dong',
    }),
  note: Joi.string().trim().max(500).optional().allow('', null).messages({
    'string.max': 'Ghi chú tối đa 500 ký tự',
  }),
});

/**
 * adminUpdateRoomRequestSchema
 * Kiểm thực dữ liệu cập nhật phòng khám
 */
export const adminUpdateRoomRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional().messages({
    'string.empty': 'Tên phòng khám không được để trống',
    'string.min': 'Tên phòng khám tối thiểu 2 ký tự',
    'string.max': 'Tên phòng khám tối đa 150 ký tự',
  }),
  code: Joi.string()
    .trim()
    .uppercase()
    .max(20)
    .pattern(/^[A-Z0-9_-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mã phòng khám tối đa 20 ký tự',
      'string.pattern.base': 'Mã phòng khám chỉ chứa chữ hoa, số, gạch ngang hoặc gạch dưới',
    }),
  status: Joi.string()
    .valid('hoat_dong', 'ngung_hoat_dong')
    .optional()
    .messages({
      'any.only': 'Trạng thái phải là hoat_dong hoặc ngung_hoat_dong',
    }),
  note: Joi.string().trim().max(500).optional().allow('', null).messages({
    'string.max': 'Ghi chú tối đa 500 ký tự',
  }),
}).min(1).messages({
  'object.min': 'Cần ít nhất một trường dữ liệu để cập nhật',
});

/**
 * adminUpdateRoomStatusRequestSchema
 * Kiểm thực dữ liệu thay đổi trạng thái hoạt động của phòng khám
 */
export const adminUpdateRoomStatusRequestSchema = Joi.object({
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

const roomStatusTitleMap = {
  hoat_dong: 'Hoạt động',
  ngung_hoat_dong: 'Ngưng hoạt động',
};

/**
 * adminRoomDetailResponseSchema
 * Format thông tin chi tiết phòng khám
 */
export const adminRoomDetailResponseSchema = (room) => {
  if (!room) return null;

  return {
    id: room.id,
    code: room.maPhong || null,
    name: room.tenPhong,
    status: room.trangThai,
    statusTitle: roomStatusTitleMap[room.trangThai] || room.trangThai,
    note: room.ghiChu || null,
    workShiftsCount: room._count?.caLamViec ?? undefined,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
};

/**
 * adminRoomListItemResponseSchema
 * Format phần tử phòng khám trong bảng danh sách tổng quan
 */
export const adminRoomListItemResponseSchema = (room) => {
  return adminRoomDetailResponseSchema(room);
};
