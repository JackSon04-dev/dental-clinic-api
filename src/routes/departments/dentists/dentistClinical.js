import express from 'express';
import {
  getClinicalQueue,
  updateSlipStatus,
  getClinicalRecord,
  saveClinicalRecord,
} from '../../../controllers/departments/dentists/dentistClinicalController.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  saveClinicalRecordRequestSchema,
  updateSlipStatusRequestSchema,
} from '../../../dtos/departments/dentists/dentistClinicalDto.js';

const router = express.Router();

router.use(verifyToken, restrictToRoles('BAC_SI', 'ADMIN'));

/**
 * [GET] /api/v1/dentist/clinical/queue
 * Hàng đợi khám bệnh
 */
router.get('/queue', getClinicalQueue);

/**
 * [PATCH] /api/v1/dentist/clinical/queue/:id/status
 * Cập nhật trạng thái phiếu khám (Bắt đầu khám -> DANG_KHAM...)
 */
router.patch(
  '/queue/:id/status',
  validate(updateSlipStatusRequestSchema, 'body'),
  updateSlipStatus
);

/**
 * [GET] /api/v1/dentist/clinical/records
 * Lấy hồ sơ khám bệnh theo patientId hoặc slipId
 */
router.get('/records', getClinicalRecord);

/**
 * [POST] /api/v1/dentist/clinical/records
 * Lưu hồ sơ khám, chỉ định dịch vụ, kê đơn và chuyển thu ngân
 */
router.post(
  '/records',
  validate(saveClinicalRecordRequestSchema, 'body'),
  saveClinicalRecord
);

export default router;
