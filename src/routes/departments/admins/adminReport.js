import express from 'express';
import {
  getRevenueTrend,
  getPaymentMethods,
  getTopPerformance,
  getInventoryCategories,
  getInventoryMovement,
} from '../../../controllers/departments/admins/adminReport.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminRevenueTrendQuerySchema,
  adminPaymentMethodsQuerySchema,
  adminTopPerformanceQuerySchema,
  adminInventoryCategoriesQuerySchema,
  adminInventoryMovementQuerySchema,
} from '../../../dtos/departments/admins/adminReportDto.js';

const router = express.Router();

// Tất cả endpoints Admin Reports yêu cầu xác thực Admin
router.use(verifyToken, restrictToRoles('ADMIN'));

/**
 * [GET] /revenue-trend
 * Endpoint lấy xu hướng doanh thu chuỗi thời gian (RevenueTrendChart)
 */
router.get(
  '/revenue-trend',
  validate(adminRevenueTrendQuerySchema, 'query'),
  getRevenueTrend
);

/**
 * [GET] /payment-methods
 * Endpoint lấy cơ cấu phương thức thanh toán (PaymentMethodDonutChart)
 */
router.get(
  '/payment-methods',
  validate(adminPaymentMethodsQuerySchema, 'query'),
  getPaymentMethods
);

/**
 * [GET] /top-performance
 * Endpoint lấy Top Bác sĩ & Top Dịch vụ theo doanh thu (TopPerformanceCharts)
 */
router.get(
  '/top-performance',
  validate(adminTopPerformanceQuerySchema, 'query'),
  getTopPerformance
);

/**
 * [GET] /inventory-categories
 * Endpoint lấy cơ cấu vốn tồn kho theo nhóm danh mục (InventoryCategoryDonutChart)
 */
router.get(
  '/inventory-categories',
  validate(adminInventoryCategoriesQuerySchema, 'query'),
  getInventoryCategories
);


/**
 * [GET] /inventory-movement
 * Endpoint lấy biến động xuất nhập kho và chi phí tiêu hao (Inventory Movement)
 */
router.get(
  '/inventory-movement',
  validate(adminInventoryMovementQuerySchema, 'query'),
  getInventoryMovement
);

export default router;
