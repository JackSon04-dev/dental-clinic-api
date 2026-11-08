import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminWorkShiftService from '../../../services/departments/admins/adminWorkShiftService.js';

/**
 * getWorkShiftsMatrix
 * [GET] /api/v1/admin/work-shifts
 * Lấy ma trận ca làm việc tuần (mặc định tuần hiện tại), tự động cập nhật vắng mặt sau 15 phút
 */
export const getWorkShiftsMatrix = asyncHandler(async (req, res) => {
  const data = await adminWorkShiftService.getWorkShiftsMatrixService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách ca làm việc tuần thành công',
    data,
  });
});

/**
 * getDoctorsWorkShiftsOverview
 * [GET] /api/v1/admin/work-shifts/doctors-overview
 * Lấy danh sách bác sĩ kèm số ca trong ngày và tổng số ca trong tuần
 */
export const getDoctorsWorkShiftsOverview = asyncHandler(async (req, res) => {
  const data = await adminWorkShiftService.getDoctorsWorkShiftsOverviewService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy tổng quan ca làm việc của bác sĩ thành công',
    data,
  });
});

/**
 * getShiftAppointments
 * [GET] /api/v1/admin/work-shifts/:id/appointments
 * Lấy chi tiết ca làm việc kèm danh sách bệnh nhân và lịch hẹn
 */
export const getShiftAppointments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminWorkShiftService.getShiftAppointmentsService({ shiftId: id });

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách lịch hẹn của ca làm việc thành công',
    data,
  });
});

/**
 * updateWorkShiftStatus
 * [PATCH] /api/v1/admin/work-shifts/:id/status
 * Cập nhật trạng thái có mặt / vắng mặt cho ca làm việc
 */
export const updateWorkShiftStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminWorkShiftService.updateWorkShiftStatusService(id, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật trạng thái ca làm việc thành công',
    data,
  });
});

/**
 * generateWorkShiftsFromTemplate
 * [POST] /api/v1/admin/work-shifts/generate
 * Tự động khởi tạo 56 ca làm việc tuần từ Khung mẫu
 */
export const generateWorkShiftsFromTemplate = asyncHandler(async (req, res) => {
  const data = await adminWorkShiftService.generateWorkShiftsFromTemplateService(req.body);

  return res.status(201).json({
    success: true,
    status: 201,
    message: data.message,
    data,
  });
});
