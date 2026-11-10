import express from 'express';
import {
  getAppointments,
  getAvailableSlots,
  getAvailableReassignShifts,
  createAppointment,
  updateAppointmentStatus,
  updateAppointment,
  rescheduleAppointment,
} from '../../../controllers/departments/receptionists/receptionistAppointmentController.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  receptionistGetAppointmentsQuerySchema,
  receptionistGetAvailableSlotsQuerySchema,
  receptionistGetAvailableReassignQuerySchema,
  receptionistCreateAppointmentRequestSchema,
  receptionistUpdateAppointmentStatusRequestSchema,
  receptionistReassignAppointmentRequestSchema,
  receptionistRescheduleAppointmentRequestSchema,
} from '../../../dtos/departments/receptionists/receptionistAppointmentDto.js';

const router = express.Router();

// Yêu cầu quyền LE_TAN, ADMIN hoặc BAC_SI
router.use(verifyToken, restrictToRoles('LE_TAN', 'ADMIN', 'BAC_SI'));

/**
 * [GET] /api/v1/receptionist/appointments/available-slots
 * Tra cứu danh sách ca khám khả dụng kèm trạng thái mở/khóa theo dịch vụ và bác sĩ (tương tự luồng Bệnh nhân)
 */
router.get(
  '/available-slots',
  validate(receptionistGetAvailableSlotsQuerySchema, 'query'),
  getAvailableSlots
);

/**
 * [GET] /api/v1/receptionist/appointments/available-reassign-shifts
 * Lấy danh sách ca làm việc thực tế đang trống và khả dụng để Lễ tân điều phối đổi Bác sĩ / Phòng
 */
router.get(
  '/available-reassign-shifts',
  validate(receptionistGetAvailableReassignQuerySchema, 'query'),
  getAvailableReassignShifts
);

/**
 * [GET] /api/v1/receptionist/appointments
 * Tra cứu danh sách lịch hẹn hôm nay (có bộ lọc theo tab, bác sĩ, phòng, từ khóa)
 */
router.get(
  '/',
  validate(receptionistGetAppointmentsQuerySchema, 'query'),
  getAppointments
);

/**
 * [POST] /api/v1/receptionist/appointments
 * Đặt lịch hẹn mới
 */
router.post(
  '/',
  validate(receptionistCreateAppointmentRequestSchema, 'body'),
  createAppointment
);

/**
 * [PATCH] /api/v1/receptionist/appointments/:id/status
 * Cập nhật trạng thái lịch hẹn (Check-in, Vào phòng, Hủy ca...)
 */
router.patch(
  '/:id/status',
  validate(receptionistUpdateAppointmentStatusRequestSchema, 'body'),
  updateAppointmentStatus
);

/**
 * [PUT] /api/v1/receptionist/appointments/:id
 * Điều phối lại Bác sĩ hoặc Phòng khám
 */
router.put(
  '/:id',
  validate(receptionistReassignAppointmentRequestSchema, 'body'),
  updateAppointment
);

/**
 * [PATCH] /api/v1/receptionist/appointments/:id/reschedule
 * Dời lịch hẹn sang ngày/giờ mới
 */
router.patch(
  '/:id/reschedule',
  validate(receptionistRescheduleAppointmentRequestSchema, 'body'),
  rescheduleAppointment
);

export default router;
