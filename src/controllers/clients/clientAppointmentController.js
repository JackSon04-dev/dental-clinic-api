import { asyncHandler } from '../../common/errorMiddleware.js';
import * as clientAppointmentService from '../../services/clients/clientAppointmentService.js';

/**
 * [GET] /api/v1/client/appointments/available-slots
 * Lấy danh sách 16 ca khám khả dụng kèm trạng thái mở/khóa
 */
export const getAvailableSlots = asyncHandler(async (req, res) => {
  const data = await clientAppointmentService.getAvailableSlotsService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách ca khám khả dụng thành công',
    data,
  });
});

/**
 * [POST] /api/v1/client/appointments
 * Đặt lịch hẹn mới với cơ chế ACID Transaction chống race condition
 */
export const createAppointment = asyncHandler(async (req, res) => {
  const benhNhanId = req.user.profileId;
  const userId = req.user.userId;

  const data = await clientAppointmentService.createAppointmentService(
    benhNhanId,
    userId,
    req.body
  );

  return res.status(201).json({
    success: true,
    status: 201,
    message: 'Đặt lịch hẹn khám thành công. Lịch hẹn đang chờ phòng khám xác nhận.',
    data,
  });
});

/**
 * [PATCH] /api/v1/client/appointments/:id
 * Dời lịch hẹn (chỉ thay đổi ngày và khung ca)
 */
export const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const benhNhanId = req.user.profileId;

  const data = await clientAppointmentService.rescheduleAppointmentService(
    id,
    benhNhanId,
    req.body
  );

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Dời lịch hẹn sang ngày giờ mới thành công',
    data,
  });
});

/**
 * [PATCH] /api/v1/client/appointments/:id/cancel
 * Hủy lịch hẹn
 */
export const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const benhNhanId = req.user.profileId;
  const userId = req.user.userId;

  const data = await clientAppointmentService.cancelAppointmentService(
    id,
    benhNhanId,
    userId,
    req.body
  );

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Hủy lịch hẹn thành công',
    data,
  });
});

/**
 * [GET] /api/v1/client/appointments/services
 * Lấy danh sách dịch vụ nha khoa cho Client lựa chọn đặt lịch
 */
export const getClientServices = asyncHandler(async (req, res) => {
  const data = await clientAppointmentService.getClientServicesService();

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh mục dịch vụ nha khoa thành công',
    data,
  });
});

/**
 * [GET] /api/v1/client/appointments/doctors
 * Lấy danh sách Bác sĩ nha khoa cho Client lựa chọn đặt lịch
 */
export const getClientDoctors = asyncHandler(async (req, res) => {
  const data = await clientAppointmentService.getClientDoctorsService();

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách bác sĩ nha khoa thành công',
    data,
  });
});

/**
 * [GET] /api/v1/client/appointments
 * Lấy danh sách lịch hẹn của bệnh nhân đang đăng nhập (hỗ trợ phân trang và lọc status)
 */
export const getClientAppointments = asyncHandler(async (req, res) => {
  const benhNhanId = req.user.profileId;
  const { appointments, pagination } = await clientAppointmentService.getClientAppointmentsService(
    benhNhanId,
    req.query
  );

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách lịch hẹn thành công',
    data: appointments,
    pagination,
  });
});

export default {
  getAvailableSlots,
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  getClientServices,
  getClientDoctors,
  getClientAppointments,
};

