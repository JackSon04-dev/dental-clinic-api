import express from 'express';
import { getMe, login, logout, refreshToken, uploadAvatar } from '../../controllers/auth/authDepartment.js';
import { verifyToken, restrictToRoles } from '../../middlewares/auth/authGuard.js';
import { validate } from '../../common/validateMiddleware.js';
import { uploadAvatarMiddleware } from '../../middlewares/uploadMiddleware.js';
import {
  departmentLoginRequestSchema,
  departmentRefreshTokenRequestSchema,
} from '../../dtos/auth/authDepartmentDto.js';

const router = express.Router();

// 1. Nhom endpoint cong khai / quan ly phien
router.post('/login', validate(departmentLoginRequestSchema), login);
router.post('/logout', verifyToken, logout);
router.post('/refresh', validate(departmentRefreshTokenRequestSchema), refreshToken);

// 2. Nhom endpoint bat buoc vuot qua Access Token (verifyToken)
router.get('/me', verifyToken, getMe);

// 3. Endpoint upload avatar cho nhân sự (Nha sĩ, Lễ tân, Quản trị viên)
router.post(
  '/avatar',
  verifyToken,
  restrictToRoles('BAC_SI', 'LE_TAN', 'ADMIN'),
  uploadAvatarMiddleware.single('avatar'),
  uploadAvatar
);

export default router;

