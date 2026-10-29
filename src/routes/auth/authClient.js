import express from 'express';
import {
  register,
  verifyRegistration,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  getMe,
} from '../../controllers/auth/authClient.js';
import { verifyToken } from '../../middlewares/auth/authGuard.js';
import { validate } from '../../common/validateMiddleware.js';
import {
  clientRegisterRequestSchema,
  clientVerifyRegistrationRequestSchema,
  clientResendOtpRequestSchema,
  clientLoginRequestSchema,
  clientForgotPasswordRequestSchema,
  clientResetPasswordRequestSchema,
  clientRefreshTokenRequestSchema,
} from '../../dtos/auth/authClientDto.js';

const router = express.Router();

// 1. Luồng Đăng ký & Xác thực qua OTP Email
router.post('/register', validate(clientRegisterRequestSchema), register);
router.post('/verify-registration', validate(clientVerifyRegistrationRequestSchema), verifyRegistration);
router.post('/resend-otp', validate(clientResendOtpRequestSchema), resendOtp);

// 2. Luồng Đăng nhập & Quên mật khẩu
router.post('/login', validate(clientLoginRequestSchema), login);
router.post('/forgot-password', validate(clientForgotPasswordRequestSchema), forgotPassword);
router.post('/reset-password', validate(clientResetPasswordRequestSchema), resetPassword);

// 3. Quản lý phiên làm việc & Token
router.post('/refresh', validate(clientRefreshTokenRequestSchema), refreshToken);
router.post('/logout', verifyToken, logout);

// 4. Lấy hồ sơ cá nhân bệnh nhân
router.get('/me', verifyToken, getMe);

export default router;
