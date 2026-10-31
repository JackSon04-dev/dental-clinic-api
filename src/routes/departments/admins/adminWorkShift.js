import express from 'express';
import {
  getWorkShiftsMatrix,
  updateWorkShiftStatus,
  generateWorkShiftsFromTemplate,
} from '../../../controllers/departments/admins/adminWorkShift.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetWorkShiftsQuerySchema,
  adminWorkShiftIdParamSchema,
  adminUpdateWorkShiftStatusRequestSchema,
  adminGenerateWorkShiftsRequestSchema,
} from '../../../dtos/departments/admins/adminWorkShiftDto.js';

const router = express.Router();

// Tất cả endpoints quản lý ca làm việc thực tế yêu cầu xác thực Admin
router.use(verifyToken, restrictToRoles('ADMIN'));

/**
 * [GET] /api/v1/admin/work-shifts
 * Lấy ma trận ca làm việc tuần (mặc định tuần hiện tại), tự động cập nhật vắng mặt sau 15 phút
 */
router.get(
  '/',
  validate(adminGetWorkShiftsQuerySchema, 'query'),
  getWorkShiftsMatrix
);

/**
 * [PATCH] /api/v1/admin/work-shifts/:id/status
 * Cập nhật trạng thái có mặt / vắng mặt
 */
router.patch(
  '/:id/status',
  validate(adminWorkShiftIdParamSchema, 'params'),
  validate(adminUpdateWorkShiftStatusRequestSchema, 'body'),
  updateWorkShiftStatus
);

/**
 * [POST] /api/v1/admin/work-shifts/generate
 * Tự động tạo 56 ca làm việc tuần từ Khung mẫu (KhungCaLamViec)
 */
router.post(
  '/generate',
  validate(adminGenerateWorkShiftsRequestSchema, 'body'),
  generateWorkShiftsFromTemplate
);

export default router;
