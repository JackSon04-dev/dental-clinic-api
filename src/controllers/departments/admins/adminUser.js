import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminUserService from '../../../services/departments/admins/adminUserService.js';

/**
 * getUsers
 * [GET] /api/v1/admin/users
 * Lấy danh sách nhân sự nội bộ (Bác sĩ, Lễ tân) có phân trang, lọc role/status và search theo mã
 */
export const getUsers = asyncHandler(async (req, res) => {
  const data = await adminUserService.getUsersListService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách nhân sự thành công',
    data,
  });
});

/**
 * getUserDetail
 * [GET] /api/v1/admin/users/:id
 * Lấy chi tiết thông tin nhân sự theo UUID (tai_khoan.id)
 */
export const getUserDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminUserService.getUserDetailService(id);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy thông tin chi tiết nhân sự thành công',
    data,
  });
});

/**
 * createUser
 * [POST] /api/v1/admin/users
 * Thêm mới nhân sự (Bác sĩ hoặc Lễ tân)
 */
export const createUser = asyncHandler(async (req, res) => {
  const data = await adminUserService.createUserService(req.body);

  return res.status(201).json({
    success: true,
    status: 201,
    message: 'Thêm mới nhân sự thành công',
    data,
  });
});

/**
 * updateUser
 * [PUT] /api/v1/admin/users/:id
 * Cập nhật thông tin hồ sơ của nhân sự
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminUserService.updateUserService(id, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật thông tin nhân sự thành công',
    data,
  });
});

/**
 * updateUserStatus
 * [PATCH] /api/v1/admin/users/:id/status
 * Khóa hoặc mở khóa tài khoản nhân sự
 */
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const currentAdminUserId = req.user.userId;

  const data = await adminUserService.updateUserStatusService(id, status, currentAdminUserId);

  return res.status(200).json({
    success: true,
    status: 200,
    message: data.message,
    data,
  });
});

/**
 * resetUserPassword
 * [POST] /api/v1/admin/users/:id/reset-password
 * Đặt lại mật khẩu nhân sự về mặc định hoặc mật khẩu mới
 */
export const resetUserPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const currentAdminUserId = req.user.userId;

  const data = await adminUserService.resetUserPasswordService(id, newPassword, currentAdminUserId);

  return res.status(200).json({
    success: true,
    status: 200,
    message: data.message,
    data,
  });
});

export default {
  getUsers,
  getUserDetail,
  createUser,
  updateUser,
  updateUserStatus,
  resetUserPassword,
};
