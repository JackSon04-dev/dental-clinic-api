import express from 'express';
import {
  getDashboardStats,
  getTopServices,
  getInventoryAlerts,
  getPatientFlow,
  getChairUtilization,
  getActiveDentists,
} from '../../../controllers/departments/admins/adminDashboard.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminDashboardStatsQuerySchema,
  adminTopServicesQuerySchema,
  adminAlertsQuerySchema,
  adminPatientFlowQuerySchema,
  adminChairUtilizationQuerySchema,
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

/**
 * [GET] /dashboard/patient-flow (và alias /patient-flow)
 * Endpoint thống kê lưu lượng bệnh nhân theo chuỗi thời gian (7D | 30D | TODAY)
 */
router.get(
  '/dashboard/patient-flow',
  validate(adminPatientFlowQuerySchema, 'query'),
  getPatientFlow
);
router.get(
  '/patient-flow',
  validate(adminPatientFlowQuerySchema, 'query'),
  getPatientFlow
);

/**
 * [GET] /dashboard/chair-utilization (và alias /chair-utilization)
 * Endpoint đo lường công suất ghế / phòng khám theo 5 slot giờ trong ngày
 */
router.get(
  '/dashboard/chair-utilization',
  validate(adminChairUtilizationQuerySchema, 'query'),
  getChairUtilization
);
router.get(
  '/chair-utilization',
  validate(adminChairUtilizationQuerySchema, 'query'),
  getChairUtilization
);


/**
 * [GET] /dashboard/active-dentists (và alias /active-dentists)
 * Endpoint lấy danh sách 4 bác sĩ trực ca hôm nay (Ca Sáng/Chiều)
 */
router.get(
  '/dashboard/active-dentists',
  getActiveDentists
);
router.get(
  '/active-dentists',
  getActiveDentists
);

export default router;


