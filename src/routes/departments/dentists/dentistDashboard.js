import express from 'express';
import {
  getDashboardStats,
  getTodayQueue,
  getWeeklyShifts,
  updateShiftAttendance,
  getDentistAppointments,
} from '../../../controllers/departments/dentists/dentistDashboardController.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';

const router = express.Router();

// Tất cả endpoints Bác sĩ yêu cầu quyền BAC_SI hoặc ADMIN
router.use(verifyToken, restrictToRoles('BAC_SI', 'ADMIN'));

/**
 * [GET] /api/v1/dentist/dashboard/stats
 * Lấy 5 chỉ số KPI cho Dashboard Bác sĩ
 */
router.get('/stats', getDashboardStats);

/**
 * [GET] /api/v1/dentist/dashboard/queue
 * Lấy hàng đợi bệnh nhân chờ khám tại phòng hôm nay
 */
router.get('/queue', getTodayQueue);

/**
 * [GET] /api/v1/dentist/shifts/weekly hoặc /api/v1/dentist/dashboard/shifts/weekly
 * Lấy lịch làm việc & ca trực trong tuần
 */
router.get('/shifts/weekly', getWeeklyShifts);
router.get('/weekly', getWeeklyShifts);

/**
 * [GET] /api/v1/dentist/appointments
 * Lấy danh sách lịch hẹn của Bác sĩ (hỗ trợ lọc ngày, trạng thái, từ khóa)
 */
router.get('/appointments', getDentistAppointments);

/**
 * [PATCH] /api/v1/dentist/shifts/:id/attendance hoặc /api/v1/dentist/dashboard/shifts/:id/attendance
 * Điểm danh ca trực
 */
router.patch('/shifts/:id/attendance', updateShiftAttendance);
router.patch('/:id/attendance', updateShiftAttendance);

export default router;
