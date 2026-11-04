import express from 'express';
import {
  getDashboardStats,
  getClinicChairs,
} from '../../../controllers/departments/receptionists/receptionistDashboardController.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';

const router = express.Router();

// Yêu cầu quyền LE_TAN hoặc ADMIN
router.use(verifyToken, restrictToRoles('LE_TAN', 'ADMIN'));

/**
 * [GET] /api/v1/receptionist/dashboard/stats
 * Lấy 4 chỉ số KPI tổng quan ca trực
 */
router.get('/stats', getDashboardStats);

/**
 * [GET] /api/v1/receptionist/dashboard/chairs
 * Lấy trạng thái Ghế & Phòng khám động
 */
router.get('/chairs', getClinicChairs);

export default router;
