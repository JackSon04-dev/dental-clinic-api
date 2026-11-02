import clientDashboardService from '../../services/clients/clientDashboardService.js';
import { asyncHandler } from '../../common/errorMiddleware.js';

/**
 * Controller: Lấy dữ liệu 4 Card thống kê chính trên Dashboard bệnh nhân
 * GET /api/v1/client/dashboard/stats
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  // Lấy profileId (UUID của bệnh nhân) từ Access Token đã giải mã
  const benhNhanId = req.user.profileId;
  const result = await clientDashboardService.getDashboardStats(benhNhanId);

  res.status(200).json({
    success: true,
    message: 'Lấy dữ liệu thống kê tổng quan thành công',
    data: result,
  });
});

/**
 * Controller: Lấy thông tin chi tiết cuộc hẹn gần nhất (Featured Appointment Card)
 * GET /api/v1/client/dashboard/featured-appointment
 */
export const getFeaturedAppointment = asyncHandler(async (req, res) => {
  const benhNhanId = req.user.profileId;
  const result = await clientDashboardService.getFeaturedAppointment(benhNhanId);

  res.status(200).json({
    success: true,
    message: 'Lấy thông tin cuộc hẹn gần nhất thành công',
    data: result,
  });
});

/**
 * Controller: Lấy thông tin phác đồ điều trị gần nhất kèm danh sách giai đoạn
 * GET /api/v1/client/dashboard/treatment-plan
 */
export const getTreatmentPlan = asyncHandler(async (req, res) => {
  const benhNhanId = req.user.profileId;
  const result = await clientDashboardService.getTreatmentPlan(benhNhanId);

  res.status(200).json({
    success: true,
    message: 'Lấy thông tin phác đồ điều trị thành công',
    data: result,
  });
});

export default {
  getDashboardStats,
  getFeaturedAppointment,
  getTreatmentPlan,
};
