import authDepartmentService from '../../services/auth/authDepartment.js';
import { asyncHandler } from '../../common/errorMiddleware.js';

export const login = asyncHandler(async (req, res) => {
  const result = await authDepartmentService.login(req.body);
  res.json({
    msg: 'Dang nhap thanh cong',
    ...result,
  });
});

export const logout = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const result = await authDepartmentService.logout(userId);
  res.json(result);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken;
  const result = await authDepartmentService.refreshAccessToken(token);
  res.json({
    msg: 'Cap lai Access Token thanh cong',
    ...result,
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const result = await authDepartmentService.getMe(userId);
  res.json({
    success: true,
    ...result,
  });
});

export default { login, logout, refreshToken, getMe };
