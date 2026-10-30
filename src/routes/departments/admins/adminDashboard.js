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

/**
 * [GET] /stats
 * Endpoint lấy 4 chỉ số KPI tổng quan Dashboard
 * Bảo vệ: Bắt buộc Bearer Token và quyền ADMIN
 */
router.get(
  '/stats',
  verifyToken,
  restrictToRoles('ADMIN'),
  validate(adminDashboardStatsQuerySchema, 'query'),
  getDashboardStats
);

/**
 * [GET] /top-services
 * Endpoint lấy danh sách top dịch vụ được sử dụng nhiều nhất và doanh thu mang lại
 * Bảo vệ: Bắt buộc Bearer Token và quyền ADMIN
 */
router.get(
  '/top-services',
  verifyToken,
  restrictToRoles('ADMIN'),
  validate(adminTopServicesQuerySchema, 'query'),
  getTopServices
);

/**
 * [GET] /alerts
 * Endpoint lấy danh sách cảnh báo tồn kho thấp cho vật tư y tế
 * Bảo vệ: Bắt buộc Bearer Token và quyền ADMIN
 */
router.get(
  '/alerts',
  verifyToken,
  restrictToRoles('ADMIN'),
  validate(adminAlertsQuerySchema, 'query'),
  getInventoryAlerts
);

export default router;
