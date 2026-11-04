import express from 'express';
import {
  getCheckInQueue,
  createCheckInSlip,
  updateSlipStatus,
} from '../../../controllers/departments/receptionists/receptionistCheckInController.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import { receptionistCreateCheckInRequestSchema } from '../../../dtos/departments/receptionists/receptionistCheckInDto.js';
import { receptionistUpdateAppointmentStatusRequestSchema } from '../../../dtos/departments/receptionists/receptionistAppointmentDto.js';

const router = express.Router();

// Yêu cầu quyền LE_TAN hoặc ADMIN
router.use(verifyToken, restrictToRoles('LE_TAN', 'ADMIN', 'BAC_SI'));

/**
 * [GET] /api/v1/receptionist/check-in
 * Lấy hàng đợi tiếp nhận khám hôm nay
 */
router.get('/', getCheckInQueue);

/**
 * [POST] /api/v1/receptionist/check-in
 * Tiếp nhận nhanh bệnh nhân tại sảnh (bệnh nhân vãng lai)
 */
router.post(
  '/',
  validate(receptionistCreateCheckInRequestSchema, 'body'),
  createCheckInSlip
);

/**
 * [PATCH] /api/v1/receptionist/check-in/:id/status
 * Cập nhật trạng thái phiếu khám
 */
router.patch(
  '/:id/status',
  validate(receptionistUpdateAppointmentStatusRequestSchema, 'body'),
  updateSlipStatus
);

export default router;
