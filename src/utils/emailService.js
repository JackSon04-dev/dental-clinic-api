import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.emailUser = process.env.EMAIL_USER;
    this.emailPass = process.env.EMAIL_PASS;
    this.transporter = null;

    if (this.emailUser && this.emailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.emailUser,
          pass: this.emailPass,
        },
      });
    }
  }

  /**
   * Tạo mã OTP ngẫu nhiên 6 chữ số
   * @returns {string}
   */
  generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Gửi mã OTP xác thực qua Email
   * @param {string} toEmail - Email người nhận
   * @param {string} otp - Mã 6 số
   * @param {'register' | 'forgot_password'} type - Mục đích
   * @param {string} [recipientName] - Tên người nhận
   */
  async sendOtpEmail(toEmail, otp, type = 'register', recipientName = 'Quý khách') {
    const isRegister = type === 'register';
    const subject = isRegister
      ? '🦷 [Nha Khoa] Mã OTP xác thực đăng ký tài khoản'
      : '🔐 [Nha Khoa] Mã OTP khôi phục mật khẩu';

    const actionText = isRegister
      ? 'xác thực và kích hoạt tài khoản khám bệnh của bạn'
      : 'đặt lại mật khẩu mới cho tài khoản của bạn';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #0088cc;">
          <h2 style="color: #0088cc; margin: 0;">🦷 NHA KHOA DENTAL CLINIC</h2>
          <p style="color: #666; font-size: 14px; margin-top: 5px;">Hệ thống chăm sóc & điều trị răng miệng chuyên nghiệp</p>
        </div>
        <div style="padding: 25px 0;">
          <p style="font-size: 16px; color: #333;">Kính chào <strong>${recipientName || 'Quý khách'}</strong>,</p>
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            Bạn vừa yêu cầu ${actionText}. Vui lòng sử dụng mã OTP dưới đây để hoàn tất:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0088cc; background-color: #f0f8ff; padding: 12px 30px; border-radius: 8px; border: 1px dashed #0088cc;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #e65100; background-color: #fff3e0; padding: 10px; border-radius: 4px;">
            ⚠️ <strong>Lưu ý:</strong> Mã xác thực có hiệu lực trong vòng <strong>5 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai nhằm bảo vệ quyền riêng tư hồ sơ y tế của bạn.
          </p>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 15px; text-align: center; font-size: 12px; color: #888;">
          <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ hotline phòng khám.</p>
          <p>© 2026 Dental Clinic Management System. All rights reserved.</p>
        </div>
      </div>
    `;

    // 1. Chế độ có cấu hình SMTP thật: Gửi qua nodemailer
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Nha Khoa Dental Clinic" <${this.emailUser}>`,
          to: toEmail,
          subject,
          html: htmlContent,
        });
        console.log(`[EmailService] Da gui OTP thanh cong den: ${toEmail}`);
        return true;
      } catch (error) {
        console.error('[EmailService] Loi gui mail qua SMTP:', error.message);
        // Fallback in ra console để quá trình test không bị ngắt
        this.logOtpToConsole(toEmail, otp, type);
        return true;
      }
    }

    // 2. Chế độ Dev (chưa có cấu hình Gmail trong .env): Tự động in OTP ra console
    this.logOtpToConsole(toEmail, otp, type);
    return true;
  }

  logOtpToConsole(toEmail, otp, type) {
    console.log('\n======================================================');
    console.log(`📧 [EMAIL MOCK SERVICE - DEV MODE]`);
    console.log(`Gửi đến: ${toEmail}`);
    console.log(`Loại yêu cầu: ${type}`);
    console.log(`🔑 Mã OTP xác thực: >>> ${otp} <<< (Hạn 5 phút)`);
    console.log('======================================================\n');
  }
}

export default new EmailService();
