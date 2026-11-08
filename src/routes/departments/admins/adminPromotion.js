import express from 'express';
import {
  getPromotions,
  getPromotionDetail,
  createPromotion,
  updatePromotion,
  updatePromotionStatus,
  validatePromotion,
} from '../../../controllers/departments/admins/adminPromotion.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetPromotionsQuerySchema,
  adminGetPromotionDetailParamsSchema,
  adminCreatePromotionRequestSchema,
  adminUpdatePromotionRequestSchema,
  adminUpdatePromotionStatusRequestSchema,
  validatePromotionRequestSchema,
} from '../../../dtos/departments/admins/adminPromotionDto.js';

const router = express.Router();

/**
 * [POST] /api/v1/admin/promotions/validate
 * Kiểm tra tính hợp lệ của voucher và tính số tiền giảm
 * Mở quyền cho cả Lễ tân (LE_TAN) và Quản trị viên (ADMIN)
 */
router.post(
  '/validate',
  verifyToken,
  restrictToRoles('ADMIN', 'LE_TAN'),
  validate(validatePromotionRequestSchema, 'body'),
  validatePromotion
);

/**
 * [GET] /api/v1/admin/promotions
 * Danh sách khuyến mãi (để Lễ tân chọn voucher từ danh mục hoặc Admin quản lý)
 */
router.get(
  '/',
  verifyToken,
  restrictToRoles('ADMIN', 'LE_TAN'),
  validate(adminGetPromotionsQuerySchema, 'query'),
  getPromotions
);

// Các thao tác CRUD quản trị chỉ dành cho ADMIN
router.use(verifyToken, restrictToRoles('ADMIN'));

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
