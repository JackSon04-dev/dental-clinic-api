import express from 'express';
import {
  getDashboardStats,
  getTopServices,
  getInventoryAlerts,
} from '../../../controllers/departments/admins/adminDashboard.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminDashboardStatsQuerySchema,
  adminTopServicesQuerySchema,
  adminAlertsQuerySchema,
} from '../../../dtos/departments/admins/adminDashboardDto.js';

const router = express.Router();

// Tất cả endpoints Admin Dashboard yêu cầu xác thực Admin
router.use(verifyToken, restrictToRoles('ADMIN'));

/**
 * [GET] /stats
 * Endpoint lấy 4 chỉ số KPI tổng quan Dashboard
 */
router.get(
  '/stats',
  validate(adminDashboardStatsQuerySchema, 'query'),
  getDashboardStats
);

/**
 * [GET] /top-services
 * Endpoint lấy danh sách top dịch vụ được sử dụng nhiều nhất và doanh thu mang lại
 */
router.get(
  '/top-services',
  validate(adminTopServicesQuerySchema, 'query'),
  getTopServices
);

/**
 * [GET] /alerts
 * Endpoint lấy danh sách cảnh báo tồn kho thấp cho vật tư y tế
 */
router.get(
  '/alerts',
  validate(adminAlertsQuerySchema, 'query'),
  getInventoryAlerts
);

export default router;
