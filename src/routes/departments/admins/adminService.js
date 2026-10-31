import express from 'express';
import {
  getServices,
  getServiceDetail,
  createService,
  updateService,
  updateServiceStatus,
  createServiceItem,
  updateServiceItem,
  updateServiceItemStatus,
} from '../../../controllers/departments/admins/adminService.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetServicesQuerySchema,
  adminGetServiceDetailParamsSchema,
  adminCreateServiceRequestSchema,
  adminUpdateServiceRequestSchema,
  adminUpdateServiceStatusRequestSchema,
  adminCreateServiceItemRequestSchema,
  adminCreateServiceItemParamsSchema,
  adminServiceItemParamsSchema,
  adminUpdateServiceItemRequestSchema,
  adminUpdateServiceItemStatusRequestSchema,
} from '../../../dtos/departments/admins/adminServiceDto.js';

const router = express.Router();

// Tất cả các endpoints quản lý dịch vụ yêu cầu xác thực JWT và vai trò ADMIN
router.use(verifyToken, restrictToRoles('ADMIN'));

// ============================================================================
// 1. CÁC ENDPOINT QUẢN LÝ GÓI CHI TIẾT DỊCH VỤ (ITEM-LEVEL)
// ============================================================================

/**
 * [PUT] /api/v1/admin/services/items/:itemId
 * Cập nhật thông tin chi tiết gói dịch vụ
 */
router.put(
  '/items/:itemId',
  validate(adminServiceItemParamsSchema, 'params'),
  validate(adminUpdateServiceItemRequestSchema, 'body'),
  updateServiceItem
);

/**
 * [PATCH] /api/v1/admin/services/items/:itemId/status
 * Bật / tắt trạng thái hoạt động gói chi tiết dịch vụ
 */
router.patch(
  '/items/:itemId/status',
  validate(adminServiceItemParamsSchema, 'params'),
  validate(adminUpdateServiceItemStatusRequestSchema, 'body'),
  updateServiceItemStatus
);

// ============================================================================
// 2. CÁC ENDPOINT QUẢN LÝ DỊCH VỤ CHA (PARENT SERVICE)
// ============================================================================

/**
 * [GET] /api/v1/admin/services
 * Lấy danh sách dịch vụ cha (Level 0) có phân trang, bộ lọc và tìm kiếm
 */
router.get(
  '/',
  validate(adminGetServicesQuerySchema, 'query'),
  getServices
);

/**
 * [POST] /api/v1/admin/services
 * Tạo mới dịch vụ cha (Level 0)
 */
router.post(
  '/',
  validate(adminCreateServiceRequestSchema, 'body'),
  createService
);

/**
 * [GET] /api/v1/admin/services/:id
 * Lấy chi tiết thông tin dịch vụ cha kèm toàn bộ danh sách gói con
 */
router.get(
  '/:id',
  validate(adminGetServiceDetailParamsSchema, 'params'),
  getServiceDetail
);

/**
 * [PUT] /api/v1/admin/services/:id
 * Cập nhật thông tin dịch vụ cha
 */
router.put(
  '/:id',
  validate(adminGetServiceDetailParamsSchema, 'params'),
  validate(adminUpdateServiceRequestSchema, 'body'),
  updateService
);

/**
 * [PATCH] /api/v1/admin/services/:id/status
 * Bật / tắt trạng thái hoạt động dịch vụ cha (tự động cascade gói con khi ngừng)
 */
router.patch(
  '/:id/status',
  validate(adminGetServiceDetailParamsSchema, 'params'),
  validate(adminUpdateServiceStatusRequestSchema, 'body'),
  updateServiceStatus
);

/**
 * [POST] /api/v1/admin/services/:serviceId/items
 * Thêm mới gói chi tiết dịch vụ vào dịch vụ cha
 */
router.post(
  '/:serviceId/items',
  validate(adminCreateServiceItemParamsSchema, 'params'),
  validate(adminCreateServiceItemRequestSchema, 'body'),
  createServiceItem
);

export default router;
