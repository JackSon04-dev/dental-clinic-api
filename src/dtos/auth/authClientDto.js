import Joi from 'joi';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation for Incoming Request Payload)
// ============================================================================

export const clientRegisterRequestSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(150).required().messages({
    'any.required': 'Họ và tên không được để trống',
    'string.empty': 'Họ và tên không được để trống',
    'string.min': 'Họ và tên phải có ít nhất 2 ký tự',
  }),
  email: Joi.string().trim().email().required().messages({
    'any.required': 'Email không được để trống',
    'string.empty': 'Email không được để trống',
    'string.email': 'Địa chỉ email không đúng định dạng',
  }),
  phone: Joi.string().trim().pattern(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/).required().messages({
    'any.required': 'Số điện thoại không được để trống',
    'string.empty': 'Số điện thoại không được để trống',
    'string.pattern.base': 'Số điện thoại không hợp lệ (yêu cầu định dạng 10 chữ số của Việt Nam)',
  }),
  password: Joi.string().min(6).max(100).required().messages({
    'any.required': 'Mật khẩu không được để trống',
    'string.empty': 'Mật khẩu không được để trống',
    'string.min': 'Mật khẩu phải có độ dài tối thiểu 6 ký tự',
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.required': 'Vui lòng nhập lại mật khẩu để xác nhận',
    'any.only': 'Mật khẩu xác nhận không khớp với mật khẩu đã nhập',
  }),
  dateOfBirth: Joi.date().iso().allow(null, '').messages({
    'date.format': 'Ngày sinh không hợp lệ (định dạng chuẩn YYYY-MM-DD)',
  }),
  gender: Joi.string().valid('nam', 'nu', 'khac').allow(null, '').messages({
    'any.only': 'Giới tính chỉ chấp nhận: nam, nu hoặc khac',
  }),
  address: Joi.string().trim().max(500).allow(null, ''),
});

export const clientVerifyRegistrationRequestSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'any.required': 'Email không được để trống',
    'string.email': 'Địa chỉ email không đúng định dạng',
  }),
  otp: Joi.string().trim().length(6).pattern(/^[0-9]+$/).required().messages({
    'any.required': 'Mã OTP không được để trống',
    'string.length': 'Mã OTP phải có đúng 6 chữ số',
    'string.pattern.base': 'Mã OTP chỉ bao gồm các chữ số từ 0 đến 9',
  }),
});

export const clientResendOtpRequestSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'any.required': 'Email không được để trống',
    'string.email': 'Địa chỉ email không đúng định dạng',
  }),
  type: Joi.string().valid('register', 'forgot_password').default('register').messages({
    'any.only': 'Loại yêu cầu gửi lại OTP không hợp lệ',
  }),
});

export const clientLoginRequestSchema = Joi.object({
  identifier: Joi.string().trim().required().messages({
    'any.required': 'Email hoặc số điện thoại đăng nhập không được để trống',
    'string.empty': 'Email hoặc số điện thoại đăng nhập không được để trống',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Mật khẩu không được để trống',
    'string.empty': 'Mật khẩu không được để trống',
  }),
});

export const clientForgotPasswordRequestSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'any.required': 'Email không được để trống',
    'string.email': 'Địa chỉ email không đúng định dạng',
  }),
});

export const clientResetPasswordRequestSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'any.required': 'Email không được để trống',
    'string.email': 'Địa chỉ email không đúng định dạng',
  }),
  otp: Joi.string().trim().length(6).pattern(/^[0-9]+$/).required().messages({
    'any.required': 'Mã OTP không được để trống',
    'string.length': 'Mã OTP phải có đúng 6 chữ số',
    'string.pattern.base': 'Mã OTP chỉ bao gồm các chữ số từ 0 đến 9',
  }),
  newPassword: Joi.string().min(6).max(100).required().messages({
    'any.required': 'Mật khẩu mới không được để trống',
    'string.min': 'Mật khẩu mới phải có tối thiểu 6 ký tự',
  }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.required': 'Vui lòng xác nhận mật khẩu mới',
    'any.only': 'Mật khẩu xác nhận không khớp',
  }),
});

export const clientRefreshTokenRequestSchema = Joi.object({
  refreshToken: Joi.string().trim().required().messages({
    'any.required': 'Refresh token không được để trống',
    'string.empty': 'Refresh token không được để trống',
  }),
});


// ============================================================================
// 2. RESPONSE SCHEMAS & FORMATTERS (Sanitized & Standardized Outgoing Data)
// ============================================================================

/**
 * Format thông tin hồ sơ bệnh nhân (Khung UI Shell cho Login & GET /me)
 * @param {any} user - Prisma TaiKhoan (đã include benhNhan)
 */
export const clientProfileResponseSchema = (user) => {
  const bn = user.benhNhan || {};
  return {
    id: user.id,
    profileId: bn.id || null,
    patientCode: bn.maBenhNhan || null,
    fullName: bn.hoTen || null,
    role: 'BENH_NHAN',
    roleTitle: 'Bệnh nhân',
    email: bn.email || null,
    phone: bn.sdt || null,
    avatarUrl: bn.hinhAnhUrl || null,
  };
};

/**
 * Format phản hồi xác thực đăng nhập Bệnh nhân (Token + Profile)
 * @param {any} user - Prisma TaiKhoan
 * @param {string} accessToken
 * @param {string} refreshToken
 */
export const clientAuthResponseSchema = (user, accessToken, refreshToken) => {
  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    user: clientProfileResponseSchema(user),
  };
};

export default {
  clientRegisterRequestSchema,
  clientVerifyRegistrationRequestSchema,
  clientResendOtpRequestSchema,
  clientLoginRequestSchema,
  clientForgotPasswordRequestSchema,
  clientResetPasswordRequestSchema,
  clientRefreshTokenRequestSchema,
  clientProfileResponseSchema,
  clientAuthResponseSchema,
};
