import Joi from 'joi';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

/**
 * adminGetUsersQuerySchema
 * Kiểm thực query parameters cho API lấy danh sách nhân sự nội bộ (Bác sĩ, Lễ tân)
 */
export const adminGetUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Tham số page phải là số nguyên',
    'number.min': 'Tham số page tối thiểu là 1',
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Tham số limit phải là số nguyên',
    'number.min': 'Tham số limit tối thiểu là 1',
    'number.max': 'Tham số limit tối đa là 100',
  }),
  role: Joi.string()
    .valid('ALL', 'BAC_SI', 'LE_TAN')
    .default('ALL')
    .messages({
      'any.only': 'Tham số role phải là một trong các giá trị: ALL, BAC_SI, LE_TAN',
    }),
  status: Joi.string()
    .valid('ALL', 'dang_lam_viec', 'nghi_phep', 'nghi_viec', 'tam_nghi')
    .default('ALL')
    .messages({
      'any.only': 'Tham số status phải là một trong các giá trị: ALL, dang_lam_viec, nghi_phep, nghi_viec',
    }),
  search: Joi.string().trim().allow('').default(''),
});

/**
 * adminGetUserDetailParamsSchema
 * Kiểm thực params :id (phải là UUID)
 */
export const adminGetUserDetailParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'any.required': 'ID người dùng không được để trống',
    'string.guid': 'ID người dùng phải là UUID hợp lệ',
  }),
});

/**
 * adminCreateUserRequestSchema
 * Kiểm thực dữ liệu thêm mới nhân sự (Bác sĩ hoặc Lễ tân)
 */
export const adminCreateUserRequestSchema = Joi.object({
  role: Joi.string().valid('BAC_SI', 'LE_TAN').required().messages({
    'any.required': 'Vai trò (role) không được để trống',
    'any.only': 'Vai trò phải là BAC_SI hoặc LE_TAN',
  }),
  username: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9_]+$/)
    .min(3)
    .max(50)
    .required()
    .messages({
      'any.required': 'Tên đăng nhập không được để trống',
      'string.empty': 'Tên đăng nhập không được để trống',
      'string.pattern.base': 'Tên đăng nhập chỉ chứa chữ cái, số và dấu gạch dưới',
      'string.min': 'Tên đăng nhập tối thiểu 3 ký tự',
      'string.max': 'Tên đăng nhập tối đa 50 ký tự',
    }),
  password: Joi.string().min(6).optional().allow('', null).messages({
    'string.min': 'Mật khẩu tối thiểu 6 ký tự',
  }),
  fullName: Joi.string().trim().min(2).max(150).required().messages({
    'any.required': 'Họ và tên không được để trống',
    'string.empty': 'Họ và tên không được để trống',
    'string.min': 'Họ và tên tối thiểu 2 ký tự',
    'string.max': 'Họ và tên tối đa 150 ký tự',
  }),
  phone: Joi.string()
    .trim()
    .pattern(/^(0[3|5|7|8|9])[0-9]{8}$/)
    .required()
    .messages({
      'any.required': 'Số điện thoại không được để trống',
      'string.pattern.base': 'Số điện thoại không đúng định dạng Việt Nam (10 chữ số, ví dụ 0912345678)',
    }),
  email: Joi.string().trim().email().required().messages({
    'any.required': 'Email không được để trống',
    'string.email': 'Email không đúng định dạng',
  }),
  dateOfBirth: Joi.date().iso().optional().allow(null).messages({
    'date.format': 'Ngày sinh không đúng định dạng (YYYY-MM-DD)',
  }),
  gender: Joi.string().valid('nam', 'nu', 'khac').optional().allow(null),
  address: Joi.string().trim().max(500).optional().allow('', null),
  avatarUrl: Joi.string().trim().uri().optional().allow('', null),
  // Field chuyên biệt cho Nha sĩ
  specialty: Joi.string().trim().max(100).optional().allow('', null),
  licenseNumber: Joi.string().trim().max(100).optional().allow('', null),
  bio: Joi.string().trim().optional().allow('', null),
  // Field chuyên biệt cho Lễ tân
  position: Joi.string().trim().valid('le_tan').default('le_tan').optional(),
});

/**
 * adminUpdateUserRequestSchema
 * Kiểm thực dữ liệu cập nhật thông tin nhân sự
 */
export const adminUpdateUserRequestSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(150).optional().messages({
    'string.min': 'Họ và tên tối thiểu 2 ký tự',
    'string.max': 'Họ và tên tối đa 150 ký tự',
  }),
  phone: Joi.string()
    .trim()
    .pattern(/^(0[3|5|7|8|9])[0-9]{8}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Số điện thoại không đúng định dạng Việt Nam',
    }),
  email: Joi.string().trim().email().optional().messages({
    'string.email': 'Email không đúng định dạng',
  }),
  dateOfBirth: Joi.date().iso().optional().allow(null).messages({
    'date.format': 'Ngày sinh không đúng định dạng (YYYY-MM-DD)',
  }),
  gender: Joi.string().valid('nam', 'nu', 'khac').optional().allow(null),
  address: Joi.string().trim().max(500).optional().allow('', null),
  avatarUrl: Joi.string().trim().uri().optional().allow('', null),
  workStatus: Joi.string()
    .valid('dang_lam_viec', 'nghi_phep', 'nghi_viec')
    .optional()
    .messages({
      'any.only': 'Trạng thái làm việc phải là: dang_lam_viec, nghi_phep hoặc nghi_viec',
    }),
  // Field cho Nha sĩ
  specialty: Joi.string().trim().max(100).optional().allow('', null),
  licenseNumber: Joi.string().trim().max(100).optional().allow('', null),
  bio: Joi.string().trim().optional().allow('', null),
  // Field cho Lễ tân
  position: Joi.string().trim().valid('le_tan').optional(),
}).min(1).messages({
  'object.min': 'Cần ít nhất một trường thông tin để cập nhật',
});

/**
 * adminUpdateUserStatusRequestSchema
 * Kiểm thực dữ liệu khóa / kích hoạt tài khoản
 */
export const adminUpdateUserStatusRequestSchema = Joi.object({
  status: Joi.string().valid('hoat_dong', 'bi_khoa').required().messages({
    'any.required': 'Trạng thái tài khoản không được để trống',
    'any.only': 'Trạng thái tài khoản phải là hoat_dong hoặc bi_khoa',
  }),
});

/**
 * adminResetPasswordRequestSchema
 * Kiểm thực dữ liệu đặt lại mật khẩu nhân sự
 */
export const adminResetPasswordRequestSchema = Joi.object({
  newPassword: Joi.string().min(6).optional().allow('', null).messages({
    'string.min': 'Mật khẩu mới tối thiểu 6 ký tự',
  }),
});

// ============================================================================
// 2. RESPONSE SCHEMAS & FORMATTERS
// ============================================================================

/**
 * Bóc tách thông tin profile chung từ đối tượng TaiKhoan của Prisma
 * @param {any} user - TaiKhoan kèm nhaSi / nhanVien
 */
const extractStaffProfile = (user) => {
  if (user.loaiTaiKhoan === 'nha_si' && user.nhaSi) {
    const ns = user.nhaSi;
    return {
      profileId: ns.id,
      code: ns.maNhaSi,
      fullName: ns.hoTen,
      phone: ns.sdt,
      email: ns.email,
      role: 'BAC_SI',
      roleTitle: 'Nha sĩ điều trị',
      workStatus: ns.trangThai,
    };
  }

  if (user.loaiTaiKhoan === 'nhan_vien' && user.nhanVien) {
    const nv = user.nhanVien;
    return {
      profileId: nv.id,
      code: nv.maNhanVien,
      fullName: nv.hoTen,
      phone: nv.sdt,
      email: nv.email,
      role: 'LE_TAN',
      roleTitle: 'Lễ tân & Thu ngân',
      workStatus: nv.trangThai,
    };
  }

  return {
    profileId: null,
    code: null,
    fullName: user.username,
    phone: null,
    email: null,
    role: 'ADMIN',
    roleTitle: 'Quản trị viên',
    workStatus: 'dang_lam_viec',
  };
};

/**
 * adminUserItemResponseSchema
 * Form chung đồng nhất giữa Bác sĩ và Nhân viên cho trang Main List
 */
export const adminUserItemResponseSchema = (user) => {
  const profile = extractStaffProfile(user);

  return {
    id: user.id, // UUID (tai_khoan.id)
    code: profile.code, // maNhaSi hoặc maNhanVien
    username: user.username,
    fullName: profile.fullName,
    role: profile.role, // 'BAC_SI' | 'LE_TAN'
    roleTitle: profile.roleTitle, // 'Nha sĩ điều trị' | 'Lễ tân & Thu ngân'
    phone: profile.phone,
    email: profile.email,
    accountStatus: user.trangThai, // 'hoat_dong' | 'bi_khoa'
    workStatus: profile.workStatus, // 'dang_lam_viec' | 'nghi_phep' | 'nghi_viec'
    createdAt: user.createdAt,
  };
};

/**
 * adminUsersListResponseSchema
 * Danh sách người dùng trang Main kèm metadata phân trang
 */
export const adminUsersListResponseSchema = ({ users, pagination }) => {
  return {
    pagination: {
      page: Number(pagination.page),
      limit: Number(pagination.limit),
      totalItems: Number(pagination.totalItems),
      totalPages: Number(pagination.totalPages),
      hasNextPage: Boolean(pagination.hasNextPage),
      hasPrevPage: Boolean(pagination.hasPrevPage),
    },
    users: users.map(adminUserItemResponseSchema),
  };
};

/**
 * adminUserDetailResponseSchema
 * Chi tiết người dùng: giữ form chung và bung thêm các field khác biệt theo vai trò
 */
export const adminUserDetailResponseSchema = (user) => {
  const common = adminUserItemResponseSchema(user);

  if (user.loaiTaiKhoan === 'nha_si' && user.nhaSi) {
    const ns = user.nhaSi;
    return {
      ...common,
      profileId: ns.id,
      dateOfBirth: ns.ngaySinh,
      gender: ns.gioiTinh,
      address: ns.diaChi,
      avatarUrl: ns.hinhAnhUrl,
      // Field đặc thù Nha sĩ
      specialty: ns.chuyenKhoa,
      licenseNumber: ns.soGiayPhep,
      bio: ns.gioiThieu,
    };
  }

  if (user.loaiTaiKhoan === 'nhan_vien' && user.nhanVien) {
    const nv = user.nhanVien;
    return {
      ...common,
      profileId: nv.id,
      dateOfBirth: nv.ngaySinh,
      gender: nv.gioiTinh,
      address: nv.diaChi,
      avatarUrl: nv.hinhAnhUrl,
      // Field đặc thù Nhân viên
      position: nv.chucVu, // 'le_tan', ...
    };
  }

  return common;
};

export default {
  adminGetUsersQuerySchema,
  adminGetUserDetailParamsSchema,
  adminCreateUserRequestSchema,
  adminUpdateUserRequestSchema,
  adminUpdateUserStatusRequestSchema,
  adminResetPasswordRequestSchema,
  adminUserItemResponseSchema,
  adminUsersListResponseSchema,
  adminUserDetailResponseSchema,
};
