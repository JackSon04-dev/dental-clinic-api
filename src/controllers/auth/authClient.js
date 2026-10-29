import authClientService from '../../services/auth/authClient.js';
import { asyncHandler } from '../../common/errorMiddleware.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authClientService.register(req.body);
  res.status(200).json({
    success: true,
    ...result,
  });
});

export const verifyRegistration = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const result = await authClientService.verifyRegistration(email, otp);
  res.status(201).json({
    success: true,
    message: 'Xác thực và tạo tài khoản bệnh nhân thành công!',
    ...result,
  });
});

export const resendOtp = asyncHandler(async (req, res) => {
  const { email, type } = req.body;
  const result = await authClientService.resendOtp(email, type);
  res.status(200).json({
    success: true,
    ...result,
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authClientService.login(req.body);
  res.status(200).json({
    success: true,
    message: 'Đăng nhập thành công',
    ...result,
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authClientService.forgotPassword(email);
  res.status(200).json({
    success: true,
    ...result,
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const result = await authClientService.resetPassword(email, otp, newPassword);
  res.status(200).json({
    success: true,
    ...result,
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken;
  const result = await authClientService.refreshAccessToken(token);
  res.status(200).json({
    success: true,
    message: 'Cấp lại Access Token thành công',
    ...result,
  });
});

export const logout = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const result = await authClientService.logout(userId);
  res.status(200).json({
    success: true,
    ...result,
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const result = await authClientService.getMe(userId);
  res.status(200).json({
    success: true,
    ...result,
  });
});

export default {
  register,
  verifyRegistration,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  getMe,
};
