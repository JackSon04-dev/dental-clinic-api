import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminInvoiceService from '../../../services/departments/admins/adminInvoiceService.js';

/**
 * getInvoices
 * [GET] /api/v1/admin/invoices
 * Lấy danh sách hóa đơn viện phí có phân trang, bộ lọc và tìm kiếm
 */
export const getInvoices = asyncHandler(async (req, res) => {
  const data = await adminInvoiceService.getInvoicesListService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách hóa đơn viện phí thành công',
    data,
  });
});

/**
 * getInvoiceDetail
 * [GET] /api/v1/admin/invoices/:id
 * Lấy chi tiết thông tin hóa đơn viện phí kèm đầy đủ bảng kê dịch vụ và vật tư y tế
 */
export const getInvoiceDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminInvoiceService.getInvoiceDetailService(id);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy chi tiết hóa đơn viện phí thành công',
    data,
  });
});

/**
 * updateInvoicePayment
 * [PATCH] /api/v1/admin/invoices/:id/payment
 * Xác nhận thanh toán hóa đơn viện phí (chuyển trạng thái sang da_thanh_toan)
 */
export const updateInvoicePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminInvoiceService.updateInvoicePaymentService(id, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Xác nhận thanh toán hóa đơn viện phí thành công',
    data,
  });
});

/**
 * cancelInvoice
 * [PATCH] /api/v1/admin/invoices/:id/cancel
 * Hủy hóa đơn viện phí kèm lý do hủy
 */
export const cancelInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminInvoiceService.cancelInvoiceService(id, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Hủy hóa đơn viện phí thành công',
    data,
  });
});
