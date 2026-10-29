import Joi from 'joi';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation for Incoming Request Payload)
// ============================================================================

export const departmentLoginRequestSchema = Joi.object({
  username: Joi.string().trim().required().messages({
    'any.required': 'Ten dang nhap khong duoc de trong',
    'string.empty': 'Ten dang nhap khong duoc de trong',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Mat khau khong duoc de trong',
    'string.empty': 'Mat khau khong duoc de trong',
  }),
});

export const departmentRefreshTokenRequestSchema = Joi.object({
  refreshToken: Joi.string().trim().required().messages({
    'any.required': 'Refresh token khong duoc de trong',
    'string.empty': 'Refresh token khong duoc de trong',
  }),
});


// ============================================================================
// 2. RESPONSE SCHEMAS & FORMATTERS (Sanitized & Standardized Outgoing Data)
// ============================================================================

/**
 * Bóc tách thông tin hồ sơ nhân sự (Nha sĩ, Lễ tân hoặc Admin) từ Prisma object
 * @param {any} user - Object tài khoản trả về từ Prisma
 */
export const extractDepartmentProfile = (user) => {
  if (user.loaiTaiKhoan === 'nha_si' && user.nhaSi) {
    const ns = user.nhaSi;
    return {
      profileId: ns.id,
      code: ns.maNhaSi,
      fullName: ns.hoTen,
      phone: ns.sdt,
      email: ns.email,
      specialty: ns.chuyenKhoa,
      avatarUrl: ns.hinhAnhUrl,
      position: null,
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
      specialty: null,
      avatarUrl: nv.hinhAnhUrl,
      position: nv.chucVu,
      role: 'LE_TAN',
      roleTitle: 'Lễ tân & Thu ngân',
      workStatus: nv.trangThai,
    };
  }

  // Quản trị viên hệ thống (Admin)
  return {
    profileId: null,
    code: 'ADMIN-01',
    fullName: 'Quản trị viên Hệ thống',
    phone: '0903555666',
    email: 'admin@dentalclinic.vn',
    specialty: null,
    avatarUrl: null,
    position: 'admin',
    role: 'ADMIN',
    roleTitle: 'Quản trị cấp cao',
    workStatus: 'dang_lam_viec',
  };
};

/**
 * Format thông tin hồ sơ người dùng nhân sự trả về cho Client
 * @param {any} user - Object trả về từ Prisma
 */
export const departmentUserProfileResponseSchema = (user) => {
  const profile = extractDepartmentProfile(user);
  return {
    id: user.id,
    profileId: profile.profileId,
    code: profile.code,
    username: user.username,
    fullName: profile.fullName,
    role: profile.role,
    roleTitle: profile.roleTitle,
    email: profile.email,
    phone: profile.phone,
    specialty: profile.specialty,
    avatarUrl: profile.avatarUrl,
  };
};

/**
 * Format phản hồi xác thực đăng nhập nhân sự (Token + User Profile)
 * @param {any} user - Object trả về từ Prisma
 * @param {string} accessToken
 * @param {string} refreshToken
 */
export const departmentAuthResponseSchema = (user, accessToken, refreshToken) => {
  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    user: departmentUserProfileResponseSchema(user),
  };
};

export default {
  departmentLoginRequestSchema,
  departmentRefreshTokenRequestSchema,
  extractDepartmentProfile,
  departmentUserProfileResponseSchema,
  departmentAuthResponseSchema,
};