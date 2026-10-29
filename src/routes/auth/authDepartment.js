import express from 'express';
import { getMe, login, logout, refreshToken } from '../../controllers/auth/authDepartment.js';
import { verifyToken } from '../../middlewares/auth/authGuard.js';
import { validate } from '../../common/validateMiddleware.js';
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

export default router;

