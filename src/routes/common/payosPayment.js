import express from 'express';
import {
  createPaymentLink,
  checkPaymentStatus,
  payosWebhook,
} from '../../controllers/common/payosPaymentController.js';
import { verifyToken, restrictToRoles } from '../../middlewares/auth/authGuard.js';
import { validate } from '../../common/validateMiddleware.js';
import {
  createPayosPaymentRequestSchema,
  payosInvoiceIdParamSchema,
} from '../../dtos/common/payosPaymentDto.js';

const router = express.Router();

/**
 * [GET] & [POST] /api/v1/payment/payos/webhook
 * Nhận webhook từ PayOS Server.
 * Endpoint này KHÔNG dùng Bearer token, vì PayOS server gọi trực tiếp và bảo mật bằng chữ ký số checksumKey.
 * Hỗ trợ cả GET để PayOS ping kiểm tra trạng thái sống của URL khi nhập trên dashboard.
 */
router.get('/webhook', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'PayOS webhook endpoint is active and ready to receive transactions',
  });
});

router.post('/webhook', payosWebhook);

/**
 * [POST] /api/v1/payment/payos/create-payment-link
 * Tạo link thanh toán VietQR PayOS cho một hóa đơn viện phí
 * Dành cho Lễ tân, Quản trị viên và Bệnh nhân
 */
router.post(
  '/create-payment-link',
  verifyToken,
  restrictToRoles('ADMIN', 'LE_TAN', 'BENH_NHAN'),
  validate(createPayosPaymentRequestSchema, 'body'),
  createPaymentLink
);

/**
 * [GET] /api/v1/payment/payos/status/:invoiceId
 * Kiểm tra trạng thái thanh toán của hóa đơn (Phục vụ Polling 2.5s)
 * Dành cho Lễ tân, Quản trị viên và Bệnh nhân
 */
router.get(
  '/status/:invoiceId',
  verifyToken,
  restrictToRoles('ADMIN', 'LE_TAN', 'BENH_NHAN'),
  validate(payosInvoiceIdParamSchema, 'params'),
  checkPaymentStatus
);

export default router;
