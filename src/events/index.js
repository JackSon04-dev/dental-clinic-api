import { registerInvoiceEventListeners } from './invoiceEvents.js';

/**
 * Khởi tạo toàn bộ Event Listeners của hệ thống khi ứng dụng khởi động
 */
export const initEventListeners = () => {
  registerInvoiceEventListeners();
};

export default initEventListeners;
