import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminPayrollService from '../../../services/departments/admins/adminPayrollService.js';

/**
 * getPayrolls
 * [GET] /api/v1/admin/payrolls
 * Lấy danh sách bảng lương tháng của toàn bộ nhân sự kèm tổng hợp KPI
 */
export const getPayrolls = asyncHandler(async (req, res) => {
  const data = await adminPayrollService.getMonthlyPayrollService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy dữ liệu bảng lương thành công',
    data,
  });
});

/**
 * calculatePayroll
 * [POST] /api/v1/admin/payrolls/calculate
 * Kích hoạt tính toán lại toàn bộ bảng lương tháng
 */
export const calculatePayroll = asyncHandler(async (req, res) => {
  const { month, year } = req.body;
  const data = await adminPayrollService.calculateAndGenerateMonthlyPayrollService({ month, year });

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Đã hoàn tất tính toán bảng lương tháng',
    data,
  });
});

/**
 * getPayslipDetail
 * [GET] /api/v1/admin/payrolls/:id
 * Lấy chi tiết phiếu lương của 1 nhân sự kèm đối soát hóa đơn và ca trực
 */
export const getPayslipDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await adminPayrollService.getPayslipDetailService(id);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy chi tiết phiếu lương thành công',
    data,
  });
});

/**
 * lockPayroll
 * [POST] /api/v1/admin/payrolls/lock
 * Khóa và chốt bảng lương tháng
 */
export const lockPayroll = asyncHandler(async (req, res) => {
  const { month, year } = req.body;
  const data = await adminPayrollService.lockMonthlyPayrollService({ month, year });

  return res.status(200).json({
    success: true,
    status: 200,
    message: data.message,
    data,
  });
});

/**
 * updatePayrollAdjustment
 * [PATCH] /api/v1/admin/payrolls/:id/adjustment
 * Điều chỉnh phụ cấp hoặc phạt trừ cho 1 phiếu lương
 */
export const updatePayrollAdjustment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await adminPayrollService.updatePayrollAdjustmentService(id, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật điều chỉnh phiếu lương thành công',
    data,
  });
});

export default {
  getPayrolls,
  calculatePayroll,
  getPayslipDetail,
  lockPayroll,
  updatePayrollAdjustment,
};
