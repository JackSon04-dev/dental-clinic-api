import express from 'express';
import {
  getInvoices,
  getInvoiceDetail,
  updateInvoicePayment,
  cancelInvoice,
} from '../../../controllers/departments/admins/adminInvoice.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetInvoicesQuerySchema,
  adminInvoiceIdParamSchema,
  adminUpdateInvoicePaymentRequestSchema,
  adminCancelInvoiceRequestSchema,
} from '../../../dtos/departments/admins/adminInvoiceDto.js';

const router = express.Router();

// Tất cả các endpoints quản lý hóa đơn yêu cầu xác thực JWT và vai trò ADMIN
router.use(verifyToken, restrictToRoles('ADMIN'));

/**
 * [GET] /api/v1/admin/invoices
 * Lấy danh sách hóa đơn viện phí có phân trang, bộ lọc và tìm kiếm
 */
router.get(
  '/',
  validate(adminGetInvoicesQuerySchema, 'query'),
  getInvoices
);

/**
 * [GET] /api/v1/admin/invoices/:id
 * Lấy chi tiết hóa đơn viện phí kèm đầy đủ bảng kê dịch vụ và vật tư y tế
 */
router.get(
  '/:id',
  validate(adminInvoiceIdParamSchema, 'params'),
  getInvoiceDetail
);

/**
 * [PATCH] /api/v1/admin/invoices/:id/payment
 * Xác nhận thanh toán hóa đơn viện phí
 */
router.patch(
  '/:id/payment',
  validate(adminInvoiceIdParamSchema, 'params'),
  validate(adminUpdateInvoicePaymentRequestSchema, 'body'),
  updateInvoicePayment
);

/**
 * [PATCH] /api/v1/admin/invoices/:id/cancel
 * Hủy hóa đơn viện phí kèm lý do hủy
 */
router.patch(
  '/:id/cancel',
  validate(adminInvoiceIdParamSchema, 'params'),
  validate(adminCancelInvoiceRequestSchema, 'body'),
  cancelInvoice
);

export default router;
