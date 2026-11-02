import express from 'express';
import {
  getDashboardStats,
  getFeaturedAppointment,
  getTreatmentPlan,
} from '../../controllers/clients/clientDashboardController.js';
import { verifyToken, restrictToRoles } from '../../middlewares/auth/authGuard.js';

const router = express.Router();

/**
 * Phân hệ Bệnh nhân (Client Portal):
 * GET /api/v1/client/dashboard/stats
 * Yêu cầu quyền: BENH_NHAN
 */
router.get(
  '/stats',
  verifyToken,
  restrictToRoles('BENH_NHAN'),
  getDashboardStats
);

/**
 * Phân hệ Bệnh nhân (Client Portal):
 * GET /api/v1/client/dashboard/featured-appointment
 * Yêu cầu quyền: BENH_NHAN
 */
router.get(
  '/featured-appointment',
  verifyToken,
  restrictToRoles('BENH_NHAN'),
  getFeaturedAppointment
);

/**
 * Phân hệ Bệnh nhân (Client Portal):
 * GET /api/v1/client/dashboard/treatment-plan
 * Yêu cầu quyền: BENH_NHAN
 */
router.get(
  '/treatment-plan',
  verifyToken,
  restrictToRoles('BENH_NHAN'),
  getTreatmentPlan
);

export default router;

