import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as receptionistAppointmentService from '../../../services/departments/receptionists/receptionistAppointmentService.js';

/**
 * [GET] /api/v1/receptionist/appointments
 * Tra cứu danh sách lịch hẹn (mặc định hôm nay)
 */
export const getAppointments = asyncHandler(async (req, res) => {
  const data = await receptionistAppointmentService.getReceptionistAppointmentsService(req.query);
  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách lịch hẹn thành công',
    data,
    appointments: data, // Tương thích ngược với cả 2 cách đọc data?.appointments || data
  });
});

/**
 * [POST] /api/v1/receptionist/appointments
 * Đặt lịch hẹn mới
 */
export const createAppointment = asyncHandler(async (req, res) => {
  const data = await receptionistAppointmentService.createAppointmentService(req.body);
  return res.status(201).json({
    success: true,
    status: 201,
    message: 'Đặt lịch hẹn mới thành công',
    data,
  });
});

/**
 * [PATCH] /api/v1/receptionist/appointments/:id/status
 * Cập nhật trạng thái lịch hẹn (Check-in, Vào phòng, Hủy ca...)
 */
export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const data = await receptionistAppointmentService.updateAppointmentStatusService(id, status);
  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật trạng thái lịch hẹn thành công',
    data,
  });
});

/**
 * [PUT] /api/v1/receptionist/appointments/:id
 * Cập nhật thông tin điều phối lịch hẹn (Bác sĩ, Phòng khám...)
 */
export const updateAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await receptionistAppointmentService.reassignAppointmentService(id, req.body);
  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Điều phối lại lịch hẹn thành công',
    data,
  });
});

/**
 * [PATCH] /api/v1/receptionist/appointments/:id/reschedule
 * Dời lịch hẹn sang ngày/giờ mới
 */
export const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await receptionistAppointmentService.rescheduleAppointmentService(id, req.body);
  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Dời lịch hẹn thành công',
    data,
  });
});

/**
 * [GET] /api/v1/receptionist/appointments/available-slots
 * Tra cứu danh sách ca khám khả dụng kèm trạng thái mở/khóa theo dịch vụ và bác sĩ (tương tự luồng Bệnh nhân)
 */
export const getAvailableSlots = asyncHandler(async (req, res) => {
  const data = await receptionistAppointmentService.getReceptionistAvailableSlotsService(req.query);
  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách ca khám khả dụng thành công',
    data,
  });
});

/**
 * [GET] /api/v1/receptionist/appointments/available-reassign-shifts
 * Lấy danh sách ca làm việc thực tế đang trống và khả dụng để Lễ tân điều phối đổi Bác sĩ / Phòng
 */
export const getAvailableReassignShifts = asyncHandler(async (req, res) => {
  const data = await receptionistAppointmentService.getAvailableReassignShiftsService(req.query);
  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách ca làm việc khả dụng để điều phối thành công',
    data,
  });
});

export default {
  getAppointments,
  getAvailableSlots,
  getAvailableReassignShifts,
  createAppointment,
  updateAppointmentStatus,
  updateAppointment,
  rescheduleAppointment,
};
