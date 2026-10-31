import express from 'express';
import {
  getProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  updateProductStatus,
} from '../../../controllers/departments/admins/adminProduct.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetProductsQuerySchema,
  adminGetProductDetailParamsSchema,
  adminCreateProductRequestSchema,
  adminUpdateProductRequestSchema,
  adminUpdateProductStatusRequestSchema,
} from '../../../dtos/departments/admins/adminProductDto.js';

const router = express.Router();

// Tất cả các endpoints quản lý sản phẩm / vật tư yêu cầu xác thực JWT và vai trò ADMIN
router.use(verifyToken, restrictToRoles('ADMIN'));

/**
 * [GET] /api/v1/admin/products
 * Lấy danh sách sản phẩm / vật tư (Level 0) có phân trang, bộ lọc và tìm kiếm
 */
router.get(
  '/',
  validate(adminGetProductsQuerySchema, 'query'),
  getProducts
);

/**
 * [POST] /api/v1/admin/products
 * Thêm mới sản phẩm / vật tư (Level 0)
 */
router.post(
  '/',
  validate(adminCreateProductRequestSchema, 'body'),
  createProduct
);

/**
 * [GET] /api/v1/admin/products/:id
 * Lấy chi tiết thông tin sản phẩm theo UUID
 */
router.get(
  '/:id',
  validate(adminGetProductDetailParamsSchema, 'params'),
  getProductDetail
);

/**
 * [PUT] /api/v1/admin/products/:id
 * Cập nhật thông tin hoặc số lượng tồn kho của sản phẩm
 */
router.put(
  '/:id',
  validate(adminGetProductDetailParamsSchema, 'params'),
  validate(adminUpdateProductRequestSchema, 'body'),
  updateProduct
);

/**
 * [PATCH] /api/v1/admin/products/:id/status
 * Bật / tắt trạng thái hoạt động của sản phẩm (hoat_dong <-> ngung_hoat_dong)
 */
router.patch(
  '/:id/status',
  validate(adminGetProductDetailParamsSchema, 'params'),
  validate(adminUpdateProductStatusRequestSchema, 'body'),
  updateProductStatus
);

export default router;
