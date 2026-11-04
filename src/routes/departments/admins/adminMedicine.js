import express from 'express';
import {
  getMedicines,
  getMedicineDetail,
  createMedicine,
  updateMedicine,
  updateMedicineStatus,
} from '../../../controllers/departments/admins/adminMedicine.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetMedicinesQuerySchema,
  adminGetMedicineDetailParamsSchema,
  adminCreateMedicineRequestSchema,
  adminUpdateMedicineRequestSchema,
  adminUpdateMedicineStatusRequestSchema,
} from '../../../dtos/departments/admins/adminMedicineDto.js';

const router = express.Router();

// Tất cả các endpoints quản lý thuốc yêu cầu xác thực JWT và vai trò ADMIN
// Cho phép ADMIN, BAC_SI, LE_TAN tra cứu thuốc
router.use(verifyToken, restrictToRoles('ADMIN', 'BAC_SI', 'LE_TAN'));

/**
 * [GET] /api/v1/admin/medicines
 * Lấy danh sách thuốc (Level 0) có phân trang, bộ lọc (nhóm, trạng thái) và tìm kiếm
 */
router.get(
  '/',
  validate(adminGetMedicinesQuerySchema, 'query'),
  getMedicines
);

/**
 * [POST] /api/v1/admin/medicines
 * Thêm mới một loại thuốc vào thư viện (Level 0)
 */
router.post(
  '/',
  validate(adminCreateMedicineRequestSchema, 'body'),
  createMedicine
);

/**
 * [GET] /api/v1/admin/medicines/:id
 * Lấy chi tiết thông tin thuốc theo UUID
 */
router.get(
  '/:id',
  validate(adminGetMedicineDetailParamsSchema, 'params'),
  getMedicineDetail
);

/**
 * [PUT] /api/v1/admin/medicines/:id
 * Cập nhật thông tin chi tiết của thuốc
 */
router.put(
  '/:id',
  validate(adminGetMedicineDetailParamsSchema, 'params'),
  validate(adminUpdateMedicineRequestSchema, 'body'),
  updateMedicine
);

/**
 * [PATCH] /api/v1/admin/medicines/:id/status
 * Bật / tắt trạng thái hoạt động của thuốc (hoat_dong <-> ngung_hoat_dong)
 */
router.patch(
  '/:id/status',
  validate(adminGetMedicineDetailParamsSchema, 'params'),
  validate(adminUpdateMedicineStatusRequestSchema, 'body'),
  updateMedicineStatus
);

export default router;

