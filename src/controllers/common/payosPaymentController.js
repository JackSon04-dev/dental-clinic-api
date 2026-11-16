import { asyncHandler } from '../../common/errorMiddleware.js';
import * as payosPaymentService from '../../services/common/payosPaymentService.js';

/**
 * Tạo link thanh toán / VietQR PayOS
 * [POST] /api/v1/payment/payos/create-payment-link
 */
export const createPaymentLink = asyncHandler(async (req, res) => {
  const { invoiceId, customAmount, clientBaseUrl } = req.body;

  let derivedBaseUrl = clientBaseUrl;
  if (!derivedBaseUrl) {
    const origin = req.get('origin');
    const host = req.get('host');
    const protocol = req.protocol || 'http';
    derivedBaseUrl = origin || `${protocol}://${host}`;
  }

  const data = await payosPaymentService.createPayosPaymentService({
    invoiceId,
    customAmount,
    reqUser: req.user,
    clientBaseUrl: derivedBaseUrl,
  });

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Tạo liên kết thanh toán VietQR PayOS thành công',
    data,
  });
});

/**
 * Kiểm tra trạng thái thanh toán của hóa đơn viện phí (Polling)
 * [GET] /api/v1/payment/payos/status/:invoiceId
 */
export const checkPaymentStatus = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;

  const data = await payosPaymentService.checkInvoicePaymentStatusService(
    invoiceId,
    req.user
  );

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Tra cứu trạng thái thanh toán thành công',
    data,
  });
});

/**
 * Webhook nhận kết quả thanh toán từ Server PayOS
 * [POST] /api/v1/payment/payos/webhook
 */
export const payosWebhook = asyncHandler(async (req, res) => {
  console.log('\n📡 [PayOS Webhook] Received webhook call from PayOS server');

  const result = await payosPaymentService.handlePayosWebhookService(req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Webhook PayOS đã được xử lý thành công',
    data: result,
  });
});

