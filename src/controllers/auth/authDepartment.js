import authDepartmentService from '../../services/auth/authDepartment.js';
import clientProfileService from '../../services/clients/clientProfileService.js';
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

export const uploadAvatar = asyncHandler(async (req, res) => {
  const result = await clientProfileService.uploadAvatarService(req.user, req.file);
  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Tải lên ảnh đại diện nhân sự thành công',
    data: result,
  });
});

export default { login, logout, refreshToken, getMe, uploadAvatar };
