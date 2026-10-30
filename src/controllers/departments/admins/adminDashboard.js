import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminDashboardService from '../../../services/departments/admins/adminDashboardService.js';

/**
 * getDashboardStats
 * [GET] /api/v1/admin/stats
 * Lấy 4 chỉ số KPI cốt lõi phục vụ màn hình Admin Dashboard
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const { period = 'this_month' } = req.query;

  const data = await adminDashboardService.getDashboardStatsService(period);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy dữ liệu thống kê KPI dashboard thành công',
    data,
  });
});

/**
 * getTopServices
 * [GET] /api/v1/admin/top-services
 * Lấy top dịch vụ được sử dụng nhiều nhất và doanh thu mang lại
 */
export const getTopServices = asyncHandler(async (req, res) => {
  const { period = 'this_month', limit = 5 } = req.query;

  const data = await adminDashboardService.getTopServicesService(period, limit);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách top dịch vụ thành công',
    data,
  });
});

/**
 * getInventoryAlerts
 * [GET] /api/v1/admin/alerts
 * Lấy danh sách cảnh báo tồn kho thấp cho vật tư y tế
 */
export const getInventoryAlerts = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;

  const data = await adminDashboardService.getInventoryAlertsService(limit);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách cảnh báo tồn kho thành công',
    data,
  });
});

export default {
  getDashboardStats,
  getTopServices,
  getInventoryAlerts,
};
