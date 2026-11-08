import express from 'express';
import {
  getPatients,
  getPatientDetail,
  updatePatient,
  createPatient,
} from '../../../controllers/departments/admins/adminPatient.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetPatientsQuerySchema,
  adminGetPatientDetailParamsSchema,
  adminUpdatePatientRequestSchema,
  adminCreatePatientRequestSchema,
} from '../../../dtos/departments/admins/adminPatientDto.js';

const router = express.Router();

// Tất cả endpoints quản lý hồ sơ bệnh nhân trong phân hệ Admin yêu cầu quyền ADMIN
// Cho phép ADMIN, BAC_SI và LE_TAN tra cứu hồ sơ bệnh nhân
router.use(verifyToken, restrictToRoles('ADMIN', 'BAC_SI', 'LE_TAN'));

/**
 * [GET] /api/v1/admin/patients
 * Tra cứu danh sách hồ sơ bệnh nhân (tìm kiếm chỉ theo mã BN hoặc SĐT)
 */
router.get(
  '/',
  validate(adminGetPatientsQuerySchema, 'query'),
  getPatients
);

/**
 * [POST] /api/v1/admin/patients
 * Tạo mới hồ sơ bệnh nhân
 */
router.post(
  '/',
  validate(adminCreatePatientRequestSchema, 'body'),
  createPatient
);

/**
 * [GET] /api/v1/admin/patients/:id
 * Xem chi tiết hồ sơ bệnh nhân (thông tin hành chính, tiền sử, lịch sử khám, phác đồ điều trị)
 */
router.get(
  '/:id',
  validate(adminGetPatientDetailParamsSchema, 'params'),
  getPatientDetail
);

/**
 * [PUT] /api/v1/admin/patients/:id
 * Cập nhật thông tin hồ sơ bệnh nhân
 */
router.put(
  '/:id',
  validate(adminGetPatientDetailParamsSchema, 'params'),
  validate(adminUpdatePatientRequestSchema, 'body'),
  updatePatient
);

export default router;
