import { EventEmitter } from 'events';

/**
 * AppEventBus
 * Centralized Event-Driven Bus cho toàn bộ ứng dụng Dental Clinic API
 */
class AppEventBus extends EventEmitter {
  constructor() {
    super();
    // Tăng giới hạn listeners để có thể gắn nhiều listener (Email, Zalo, Notification, Kho...)
    this.setMaxListeners(30);
  }
}

export const eventBus = new AppEventBus();

export const EVENTS = {
  INVOICE_PAID: 'INVOICE_PAID',
};

export default eventBus;
