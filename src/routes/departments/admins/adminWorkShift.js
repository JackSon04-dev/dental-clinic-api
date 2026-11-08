import express from 'express';
import {
  getWorkShiftsMatrix,
  updateWorkShiftStatus,
  generateWorkShiftsFromTemplate,
  getDoctorsWorkShiftsOverview,
  getShiftAppointments,
} from '../../../controllers/departments/admins/adminWorkShift.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetWorkShiftsQuerySchema,
  adminWorkShiftIdParamSchema,
  adminUpdateWorkShiftStatusRequestSchema,
  adminGenerateWorkShiftsRequestSchema,
  adminGetDoctorsOverviewQuerySchema,
} from '../../../dtos/departments/admins/adminWorkShiftDto.js';

const router = express.Router();

// Tất cả endpoints quản lý ca làm việc thực tế yêu cầu xác thực Admin
router.use(verifyToken, restrictToRoles('ADMIN'));

/**
 * [GET] /api/v1/admin/work-shifts/doctors-overview
 * Lấy danh sách bác sĩ kèm KPI ca trực: số ca trong ngày được chọn, tổng số ca trong tuần, và danh sách ca trực trong tuần
 */
router.get(
  '/doctors-overview',
  validate(adminGetDoctorsOverviewQuerySchema, 'query'),
  getDoctorsWorkShiftsOverview
);

/**
 * [GET] /api/v1/admin/work-shifts
 * Lấy ma trận ca làm việc tuần (mặc định tuần hiện tại), tự động cập nhật vắng mặt sau 15 phút
 */
router.get(
  '/',
  validate(adminGetWorkShiftsQuerySchema, 'query'),
  getWorkShiftsMatrix
);

/**
 * [GET] /api/v1/admin/work-shifts/:id/appointments
 * Lấy chi tiết ca làm việc kèm danh sách bệnh nhân và lịch hẹn
 */
router.get(
  '/:id/appointments',
  validate(adminWorkShiftIdParamSchema, 'params'),
  getShiftAppointments
);

/**
 * [PATCH] /api/v1/admin/work-shifts/:id/status
 * Cập nhật trạng thái có mặt / vắng mặt
 */
router.patch(
  '/:id/status',
  validate(adminWorkShiftIdParamSchema, 'params'),
  validate(adminUpdateWorkShiftStatusRequestSchema, 'body'),
  updateWorkShiftStatus
);

/**
 * [POST] /api/v1/admin/work-shifts/generate
 * Tự động tạo 56 ca làm việc tuần từ Khung mẫu (KhungCaLamViec)
 */
router.post(
  '/generate',
  validate(adminGenerateWorkShiftsRequestSchema, 'body'),
  generateWorkShiftsFromTemplate
);

export default router;
