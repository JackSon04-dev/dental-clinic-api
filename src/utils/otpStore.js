/**
 * In-Memory OTP Store with TTL Expiration & Auto Cleanup
 * Lưu trữ mã OTP tạm thời cho luồng Đăng ký và Quên mật khẩu
 */
class OtpStore {
  constructor() {
    /** @type {Map<string, { otp: string, payload?: any, expiresAt: number }>} */
    this.store = new Map();

    // Dọn dẹp các bản ghi hết hạn mỗi 5 phút (unref để không giữ event loop)
    const timer = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
    if (timer.unref) {
      timer.unref();
    }
  }

  /**
   * Tạo khóa định danh cho từng mục đích
   * @param {string} email
   * @param {'register' | 'forgot_password'} type
   * @returns {string}
   */
  getKey(email, type) {
    return `${type}:${email.toLowerCase().trim()}`;
  }

  /**
   * Lưu OTP và dữ liệu tạm
   * @param {string} email
   * @param {'register' | 'forgot_password'} type
   * @param {string} otp - Mã 6 số
   * @param {any} [payload] - Dữ liệu kèm theo (thông tin user pending)
   * @param {number} [ttlMinutes=5] - Thời gian sống tính bằng phút (mặc định 5 phút)
   */
  set(email, type, otp, payload = null, ttlMinutes = 5) {
    const key = this.getKey(email, type);
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
    this.store.set(key, { otp, payload, expiresAt });
  }

  /**
   * Lấy thông tin OTP
   * @param {string} email
   * @param {'register' | 'forgot_password'} type
   * @returns {{ otp: string, payload?: any, expiresAt: number } | null}
   */
  get(email, type) {
    const key = this.getKey(email, type);
    const data = this.store.get(key);
    if (!data) return null;

    if (Date.now() > data.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return data;
  }

  /**
   * Xóa OTP sau khi xác thực thành công
   * @param {string} email
   * @param {'register' | 'forgot_password'} type
   */
  delete(email, type) {
    const key = this.getKey(email, type);
    this.store.delete(key);
  }

  /**
   * Dọn dẹp các OTP đã hết hạn
   */
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

export default new OtpStore();
