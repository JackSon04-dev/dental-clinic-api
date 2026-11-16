import eventBus, { EVENTS } from './eventBus.js';
import emailService from '../utils/emailService.js';

/**
 * Đăng ký các Listener cho các sự kiện liên quan đến Hóa đơn
 */
export const registerInvoiceEventListeners = () => {
  eventBus.on(EVENTS.INVOICE_PAID, async (invoiceOrId) => {
    try {
      console.log('📡 [EventBus] Nhận sự kiện INVOICE_PAID. Bắt đầu gửi hóa đơn điện tử...');
      await emailService.sendInvoiceReceiptEmail(invoiceOrId);
    } catch (err) {
      console.error('⚠️ [EventBus:INVOICE_PAID] Lỗi listener:', err.message);
    }
  });

  console.log('✅ [EventBus] Đã đăng ký thành công Listener cho sự kiện INVOICE_PAID');
};

export default registerInvoiceEventListeners;
