import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as receptionistDashboardService from '../../../services/departments/receptionists/receptionistDashboardService.js';

/**
 * [GET] /api/v1/receptionist/dashboard/stats
 * Lấy 4 chỉ số KPI tổng quan ca trực
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const data = await receptionistDashboardService.getReceptionistDashboardStatsService();
  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy dữ liệu thống kê KPI ca trực thành công',
    data,
  });
});

/**
 * [GET] /api/v1/receptionist/dashboard/chairs
 * Lấy trạng thái Ghế & Phòng khám động theo thời gian thực
 */
export const getClinicChairs = asyncHandler(async (req, res) => {
  const data = await receptionistDashboardService.getClinicChairsStatusService();
  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy trạng thái ghế và phòng khám thành công',
    data,
  });
});

export default {
  getDashboardStats,
  getClinicChairs,
};
