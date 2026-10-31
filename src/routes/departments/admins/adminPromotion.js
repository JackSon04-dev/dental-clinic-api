import express from 'express';
import {
  getPromotions,
  getPromotionDetail,
  createPromotion,
  updatePromotion,
  updatePromotionStatus,
} from '../../../controllers/departments/admins/adminPromotion.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetPromotionsQuerySchema,
  adminGetPromotionDetailParamsSchema,
  adminCreatePromotionRequestSchema,
  adminUpdatePromotionRequestSchema,
  adminUpdatePromotionStatusRequestSchema,
} from '../../../dtos/departments/admins/adminPromotionDto.js';

const router = express.Router();

// Tất cả các endpoints quản lý khuyến mãi yêu cầu xác thực JWT và vai trò ADMIN
router.use(verifyToken, restrictToRoles('ADMIN'));

/**
 * [GET] /api/v1/admin/promotions
 * Lấy danh sách chương trình khuyến mãi / voucher (Level 0) có phân trang, bộ lọc và tìm kiếm
 */
router.get(
  '/',
  validate(adminGetPromotionsQuerySchema, 'query'),
  getPromotions
);

/**
 * [POST] /api/v1/admin/promotions
 * Thêm mới chương trình khuyến mãi (Level 0)
 */
router.post(
  '/',
  validate(adminCreatePromotionRequestSchema, 'body'),
  createPromotion
);

/**
 * [GET] /api/v1/admin/promotions/:id
 * Lấy chi tiết thông tin chương trình khuyến mãi theo UUID
 */
router.get(
  '/:id',
  validate(adminGetPromotionDetailParamsSchema, 'params'),
  getPromotionDetail
);

/**
 * [PUT] /api/v1/admin/promotions/:id
 * Cập nhật thông tin chương trình khuyến mãi
 */
router.put(
  '/:id',
  validate(adminGetPromotionDetailParamsSchema, 'params'),
  validate(adminUpdatePromotionRequestSchema, 'body'),
  updatePromotion
);

/**
 * [PATCH] /api/v1/admin/promotions/:id/status
 * Bật / tắt trạng thái hoạt động của khuyến mãi (hoat_dong <-> da_huy <-> het_han)
 */
router.patch(
  '/:id/status',
  validate(adminGetPromotionDetailParamsSchema, 'params'),
  validate(adminUpdatePromotionStatusRequestSchema, 'body'),
  updatePromotionStatus
);

export default router;
