import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as dentistDashboardService from '../../../services/departments/dentists/dentistDashboardService.js';

/**
 * getDashboardStats
 * [GET] /api/v1/dentist/dashboard/stats
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const dentistId =
    req.user.role === 'BAC_SI'
      ? req.user.profileId
      : req.query.dentistId || req.user.profileId;

  const data = await dentistDashboardService.getDentistDashboardStatsService(dentistId);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy dữ liệu thống kê KPI dashboard Bác sĩ thành công',
    data,
  });
});

/**
 * getTodayQueue
 * [GET] /api/v1/dentist/dashboard/queue
 */
export const getTodayQueue = asyncHandler(async (req, res) => {
  const dentistId =
    req.user.role === 'BAC_SI'
      ? req.user.profileId
      : req.query.dentistId || req.user.profileId;

  const data = await dentistDashboardService.getDentistTodayQueueService(dentistId);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy hàng đợi bệnh nhân chờ khám hôm nay thành công',
    data,
  });
});

/**
 * getWeeklyShifts
 * [GET] /api/v1/dentist/shifts/weekly
 */
export const getWeeklyShifts = asyncHandler(async (req, res) => {
  const dentistId =
    req.user.role === 'BAC_SI'
      ? req.user.profileId
      : req.query.dentistId || req.user.profileId;

  const { date } = req.query;

  const data = await dentistDashboardService.getDentistWeeklyShiftsService(
    dentistId,
    date
  );

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy lịch làm việc & ca trực trong tuần thành công',
    data,
  });
});

/**
 * updateShiftAttendance
 * [PATCH] /api/v1/dentist/shifts/:id/attendance
 */
export const updateShiftAttendance = asyncHandler(async (req, res) => {
  const dentistId = req.user.profileId;
  const { id: shiftId } = req.params;
  const { status = 'co_mat' } = req.body;

  const data = await dentistDashboardService.updateShiftAttendanceService(
    shiftId,
    dentistId,
    status
  );

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Điểm danh ca trực thành công',
    data,
  });
});

/**
 * getDentistAppointments
 * [GET] /api/v1/dentist/appointments
 */
export const getDentistAppointments = asyncHandler(async (req, res) => {
  const dentistId =
    req.user.role === 'BAC_SI'
      ? req.user.profileId
      : req.query.dentistId || req.user.profileId;

  const { date, status, search } = req.query;

  const data = await dentistDashboardService.getDentistAppointmentsService(dentistId, {
    date,
    status,
    search,
  });

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách lịch hẹn của Bác sĩ thành công',
    data,
  });
});

export default {
  getDashboardStats,
  getTodayQueue,
  getWeeklyShifts,
  updateShiftAttendance,
  getDentistAppointments,
};
