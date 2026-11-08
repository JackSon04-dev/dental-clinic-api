import express from 'express';
import {
  getServices,
  getServiceDetail,
  createService,
  updateService,
  updateServiceStatus,
} from '../../../controllers/departments/admins/adminService.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetServicesQuerySchema,
  adminGetServiceDetailParamsSchema,
  adminCreateServiceRequestSchema,
  adminUpdateServiceRequestSchema,
  adminUpdateServiceStatusRequestSchema,
} from '../../../dtos/departments/admins/adminServiceDto.js';

const router = express.Router();

// Cho phép ADMIN, BAC_SI, LE_TAN tra cứu dịch vụ
router.use(verifyToken, restrictToRoles('ADMIN', 'BAC_SI', 'LE_TAN'));

/**
 * [GET] /api/v1/admin/services
 * Lấy danh sách dịch vụ trực tiếp (Level 0) có phân trang, bộ lọc và tìm kiếm
 */
router.get(
  '/',
  validate(adminGetServicesQuerySchema, 'query'),
  getServices
);

/**
 * [GET] /api/v1/admin/services/:id
 * Lấy chi tiết thông tin dịch vụ trực tiếp
 */
router.get(
  '/:id',
  validate(adminGetServiceDetailParamsSchema, 'params'),
  getServiceDetail
);

/**
 * [POST] /api/v1/admin/services
 * Tạo mới dịch vụ trực tiếp (Chỉ ADMIN)
 */
router.post(
  '/',
  restrictToRoles('ADMIN'),
  validate(adminCreateServiceRequestSchema, 'body'),
  createService
);

/**
 * [PUT] /api/v1/admin/services/:id
 * Cập nhật thông tin dịch vụ trực tiếp (Chỉ ADMIN)
 */
router.put(
  '/:id',
  restrictToRoles('ADMIN'),
  validate(adminGetServiceDetailParamsSchema, 'params'),
  validate(adminUpdateServiceRequestSchema, 'body'),
  updateService
);

/**
 * [PATCH] /api/v1/admin/services/:id/status
 * Bật / tắt trạng thái hoạt động dịch vụ trực tiếp (Chỉ ADMIN)
 */
router.patch(
  '/:id/status',
  restrictToRoles('ADMIN'),
  validate(adminGetServiceDetailParamsSchema, 'params'),
  validate(adminUpdateServiceStatusRequestSchema, 'body'),
  updateServiceStatus
);

export default router;
