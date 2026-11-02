import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminReportService from '../../../services/departments/admins/adminReportService.js';

/**
 * getRevenueTrend
 * [GET] /api/v1/admin/reports/revenue-trend
 * Lấy báo cáo xu hướng doanh thu chuỗi thời gian kèm các chỉ số KPI
 */
export const getRevenueTrend = asyncHandler(async (req, res) => {
  const { preset = '7_DAYS', startDate, endDate } = req.query;

  const data = await adminReportService.getRevenueTrendReportService({
    preset,
    startDate,
    endDate,
  });

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy dữ liệu xu hướng doanh thu thành công',
    data,
  });
});

/**
 * getPaymentMethods
 * [GET] /api/v1/admin/reports/payment-methods
 * Lấy phân bổ doanh thu theo phương thức thanh toán
 */
export const getPaymentMethods = asyncHandler(async (req, res) => {
  const { preset = '7_DAYS', startDate, endDate } = req.query;

  const data = await adminReportService.getPaymentMethodsReportService({
    preset,
    startDate,
    endDate,
  });

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy dữ liệu cơ cấu phương thức thanh toán thành công',
    data,
  });
});

/**
 * getTopPerformance
 * [GET] /api/v1/admin/reports/top-performance
 * Lấy Top Bác sĩ & Top Dịch vụ theo doanh thu
 */
export const getTopPerformance = asyncHandler(async (req, res) => {
  const { preset = 'THIS_MONTH', startDate, endDate, limit = 5 } = req.query;

  const data = await adminReportService.getTopPerformanceReportService({
    preset,
    startDate,
    endDate,
    limit,
  });

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy dữ liệu top hiệu suất thành công',
    data,
  });
});

/**
 * getInventoryCategories
 * [GET] /api/v1/admin/reports/inventory-categories
 * Lấy cơ cấu vốn tồn kho theo nhóm danh mục sản phẩm
 */
export const getInventoryCategories = asyncHandler(async (req, res) => {
  const data = await adminReportService.getInventoryCategoriesReportService();

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy dữ liệu cơ cấu vốn tồn kho thành công',
    data,
  });
});


/**
 * getInventoryMovement
 * [GET] /api/v1/admin/reports/inventory-movement
 * Lấy báo cáo biến động xuất nhập tồn kho và chi phí tiêu hao lâm sàng
 */
export const getInventoryMovement = asyncHandler(async (req, res) => {
  const { preset = 'CUSTOM', startDate, endDate } = req.query;

  const data = await adminReportService.getInventoryMovementReportService({
    preset,
    startDate,
    endDate,
  });

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy dữ liệu biến động kho thành công',
    data,
  });
});

export default {
  getRevenueTrend,
  getPaymentMethods,
  getTopPerformance,
  getInventoryCategories,
  getInventoryMovement,
};
