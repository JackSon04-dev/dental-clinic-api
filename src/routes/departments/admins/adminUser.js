import express from 'express';
import {
  getUsers,
  getUserDetail,
  createUser,
  updateUser,
  updateUserStatus,
  resetUserPassword,
} from '../../../controllers/departments/admins/adminUser.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetUsersQuerySchema,
  adminGetUserDetailParamsSchema,
  adminCreateUserRequestSchema,
  adminUpdateUserRequestSchema,
  adminUpdateUserStatusRequestSchema,
  adminResetPasswordRequestSchema,
} from '../../../dtos/departments/admins/adminUserDto.js';

const router = express.Router();

// Tất cả endpoints quản lý nhân sự yêu cầu xác thực Admin
router.use(verifyToken, restrictToRoles('ADMIN'));

/**
 * [GET] /api/v1/admin/users
 * Lấy danh sách nhân sự nội bộ (Bác sĩ, Lễ tân)
 */
router.get(
  '/',
  validate(adminGetUsersQuerySchema, 'query'),
  getUsers
);

/**
 * [POST] /api/v1/admin/users
 * Thêm mới nhân sự (Bác sĩ hoặc Lễ tân)
 */
router.post(
  '/',
  validate(adminCreateUserRequestSchema, 'body'),
  createUser
);

/**
 * [GET] /api/v1/admin/users/:id
 * Lấy chi tiết thông tin nhân sự theo UUID (tai_khoan.id)
 */
router.get(
  '/:id',
  validate(adminGetUserDetailParamsSchema, 'params'),
  getUserDetail
);

/**
 * [PUT] /api/v1/admin/users/:id
 * Cập nhật thông tin nhân sự
 */
router.put(
  '/:id',
  validate(adminGetUserDetailParamsSchema, 'params'),
  validate(adminUpdateUserRequestSchema, 'body'),
  updateUser
);

/**
 * [PATCH] /api/v1/admin/users/:id/status
 * Khóa hoặc kích hoạt tài khoản nhân sự
 */
router.patch(
  '/:id/status',
  validate(adminGetUserDetailParamsSchema, 'params'),
  validate(adminUpdateUserStatusRequestSchema, 'body'),
  updateUserStatus
);

/**
 * [POST] /api/v1/admin/users/:id/reset-password
 * Đặt lại mật khẩu nhân sự
 */
router.post(
  '/:id/reset-password',
  validate(adminGetUserDetailParamsSchema, 'params'),
  validate(adminResetPasswordRequestSchema, 'body'),
  resetUserPassword
);

export default router;
