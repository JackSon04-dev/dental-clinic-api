import express from 'express';
import {
  getAvailableSlots,
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  getClientServices,
  getClientDoctors,
  getClientAppointments,
} from '../../controllers/clients/clientAppointmentController.js';
import { verifyToken, restrictToRoles } from '../../middlewares/auth/authGuard.js';
import { validate } from '../../common/validateMiddleware.js';
import {
  clientGetAvailableSlotsQuerySchema,
  clientCreateAppointmentRequestSchema,
  clientRescheduleAppointmentRequestSchema,
  clientCancelAppointmentRequestSchema,
  clientAppointmentDetailParamsSchema,
  clientGetAppointmentsQuerySchema,
} from '../../dtos/clients/clientAppointmentDto.js';

const router = express.Router();

// Tất cả endpoints đặt lịch yêu cầu xác thực JWT và vai trò Bệnh nhân (BENH_NHAN)
router.use(verifyToken, restrictToRoles('BENH_NHAN'));

/**
 * [GET] /api/v1/client/appointments/available-slots
 * Lấy danh sách 16 ca khám khả dụng kèm trạng thái mở/khóa theo dịch vụ và bác sĩ
 */
router.get(
  '/available-slots',
  validate(clientGetAvailableSlotsQuerySchema, 'query'),
  getAvailableSlots
);

/**
 * [GET] /api/v1/client/appointments/services
 * Lấy danh mục dịch vụ nha khoa để Client chọn khi đặt lịch
 */
router.get('/services', getClientServices);

/**
 * [GET] /api/v1/client/appointments/doctors
 * Lấy danh sách bác sĩ nha khoa để Client chọn khi đặt lịch
 */
router.get('/doctors', getClientDoctors);

/**
 * [GET] /api/v1/client/appointments
 * Lấy danh sách lịch hẹn của bệnh nhân (hỗ trợ phân trang, lọc tab upcoming/completed/cancelled)
 */
router.get(
  '/',
  validate(clientGetAppointmentsQuerySchema, 'query'),
  getClientAppointments
);

/**
 * [POST] /api/v1/client/appointments
 * Đặt lịch hẹn mới
 */
router.post(
  '/',
  validate(clientCreateAppointmentRequestSchema, 'body'),
  createAppointment
);

/**
 * [PATCH] /api/v1/client/appointments/:id
 * Dời lịch hẹn sang ngày và khung giờ mới (chỉ cho phép khi chưa tiếp nhận/hoàn thành)
 */
router.patch(
  '/:id',
  validate(clientAppointmentDetailParamsSchema, 'params'),
  validate(clientRescheduleAppointmentRequestSchema, 'body'),
  rescheduleAppointment
);

/**
 * [PATCH] /api/v1/client/appointments/:id/cancel
 * Hủy lịch hẹn
 */
router.patch(
  '/:id/cancel',
  validate(clientAppointmentDetailParamsSchema, 'params'),
  validate(clientCancelAppointmentRequestSchema, 'body'),
  cancelAppointment
);

export default router;

