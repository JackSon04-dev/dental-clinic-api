import nodemailer from 'nodemailer';
import prisma from '../config/prisma.js';
import { formatDoctorFullName } from '../constants/academicDegree.js';

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

  /**
   * Gửi hóa đơn điện tử (E-Receipt) xác nhận thanh toán thành công cho bệnh nhân
   * @param {string | object} invoiceOrId - Object hóa đơn đã nạp sẵn quan hệ hoặc invoice ID (UUID)
   * @returns {Promise<boolean>}
   */
  async sendInvoiceReceiptEmail(invoiceOrId) {
    try {
      if (!invoiceOrId) return false;

      let invoice = null;

      // 1. Phân giải dữ liệu: Nếu là ID thì query DB, nếu là Object thì tái sử dụng trực tiếp
      if (typeof invoiceOrId === 'string') {
        invoice = await prisma.hoaDon.findUnique({
          where: { id: invoiceOrId },
          include: {
            lichHen: {
              include: {
                benhNhan: true,
                caLamViec: {
                  include: {
                    nhaSi: true,
                  },
                },
              },
            },
            chiTietHoaDon: true,
          },
        });
      } else if (typeof invoiceOrId === 'object') {
        invoice = invoiceOrId;
      }

      if (!invoice) {
        console.warn('⚠️ [EmailService] Không tìm thấy dữ liệu hóa đơn để gửi email.');
        return false;
      }

      // 2. Trích xuất thông tin bệnh nhân
      const patient = invoice.lichHen?.benhNhan || invoice.patient || {};
      const patientEmail = patient.email;
      const patientName = patient.hoTen || patient.fullName || 'Quý khách';
      const patientPhone = patient.sdt || patient.phone || '';

      // Kiểm tra nếu bệnh nhân không có email thì dừng ngay
      if (!patientEmail || !patientEmail.includes('@')) {
        console.log(`ℹ️ [EmailService] Bệnh nhân ${patientName} không có email. Bỏ qua gửi hóa đơn điện tử.`);
        return false;
      }

      // 3. Trích xuất thông tin bác sĩ điều trị
      const doctor = invoice.lichHen?.caLamViec?.nhaSi || invoice.doctor || {};
      const doctorDegree = doctor.hocVi || doctor.academicDegree || 'BS';
      const doctorRawName = doctor.hoTen || doctor.fullName || '';
      const doctorTitleFullName = doctorRawName ? formatDoctorFullName(doctorDegree, doctorRawName) : 'Đội ngũ Bác sĩ Nha khoa';

      // 4. Định dạng tài chính & thời gian
      const formatVND = (amount) =>
        new Intl.NumberFormat('vi-VN').format(Number(amount) || 0) + ' đ';

      const formatDateTimeVN = (dateInput) => {
        const d = dateInput ? new Date(dateInput) : new Date();
        const validDate = isNaN(d.getTime()) ? new Date() : d;
        const formatter = new Intl.DateTimeFormat('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour12: false,
        });
        const parts = {};
        formatter.formatToParts(validDate).forEach((x) => {
          parts[x.type] = x.value;
        });
        return `${parts.hour}:${parts.minute} - ${parts.day}/${parts.month}/${parts.year}`;
      };

      const mapPaymentMethod = (method) => {
        const map = {
          tien_mat: 'Tiền mặt tại quầy',
          chuyen_khoan: 'Chuyển khoản VietQR (PayOS)',
          the: 'Thẻ ngân hàng (POS)',
          vi_dien_tu: 'Ví điện tử',
        };
        return map[method] || method || 'Tiền mặt';
      };

      const invoiceCode = invoice.maHoaDon || invoice.code || 'HD-PENDING';
      const paidDate = invoice.ngayThanhToan || invoice.paidAt || invoice.createdAt || new Date();
      const formattedPaidDate = formatDateTimeVN(paidDate);

      const paymentMethod = mapPaymentMethod(invoice.phuongThucThanhToan || invoice.paymentMethod);
      const subtotal = Number(invoice.tongTien ?? invoice.financialSummary?.subtotalAmount ?? 0);
      const discount = Number(invoice.giamGia ?? invoice.financialSummary?.discountAmount ?? 0);
      const surcharge = Number(invoice.phuThuChuyenGia ?? invoice.financialSummary?.surchargeAmount ?? 0);
      const finalAmount = Number(invoice.soTienThanhToan ?? invoice.financialSummary?.finalAmount ?? 0);

      // 5. Render danh sách bảng kê dịch vụ / vật tư theo chuẩn Responsive Mobile-First
      // Sử dụng bố cục 2 cột linh hoạt: Tên + Đơn giá ở bên trái, Thành tiền cố định không xuống dòng ở bên phải
      const items = invoice.chiTietHoaDon || invoice.items || [];
      const itemsHtml = items.length > 0
        ? items.map((item, idx) => {
            const name = item.tenMuc || item.name || 'Dịch vụ điều trị';
            const tooth = (item.viTriRang || item.toothNumber)
              ? `<span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; margin-left: 4px; vertical-align: middle; white-space: nowrap;">Răng: ${item.viTriRang || item.toothNumber}</span>`
              : '';
            const qty = Number(item.soLuong || item.quantity) || 1;
            const unitPrice = Number(item.donGia || item.unitPrice) || 0;
            const total = Number(item.thanhTien || item.totalAmount) || (qty * unitPrice);

            return `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px 6px 12px 0; vertical-align: top; text-align: left;">
                  <div style="font-size: 14px; font-weight: 600; color: #1e293b; line-height: 1.4;">
                    ${idx + 1}. ${name} ${tooth}
                  </div>
                  <div style="font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.3;">
                    Số lượng: <strong style="color: #334155;">${qty}</strong> &times; <span style="white-space: nowrap;">${formatVND(unitPrice)}</span>
                  </div>
                </td>
                <td style="padding: 12px 0 12px 8px; vertical-align: top; text-align: right; white-space: nowrap;">
                  <div style="font-size: 14px; font-weight: 700; color: #0f172a; white-space: nowrap; font-variant-numeric: tabular-nums;">
                    ${formatVND(total)}
                  </div>
                </td>
              </tr>
            `;
          }).join('')
        : `
          <tr>
            <td colspan="2" style="padding: 18px 0; text-align: center; color: #94a3b8; font-size: 13px;">
              Dịch vụ khám & điều trị theo ca hẹn
            </td>
          </tr>
        `;

      const subject = `🦷 [Nha Khoa Dental Clinic] Xác nhận thanh toán hóa đơn ${invoiceCode} thành công`;

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
          <title>Biên lai thanh toán ${invoiceCode}</title>
          <style type="text/css">
            /* Reset & Responsive Email Styles */
            body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
            body { margin: 0; padding: 0; width: 100% !important; min-width: 100%; background-color: #f1f5f9; }
            
            /* Responsive theo inch / chiều rộng thiết bị */
            @media only screen and (max-width: 600px) {
              .main-wrapper { padding: 8px !important; }
              .card-container { border-radius: 8px !important; }
              .header-section { padding: 18px 14px !important; }
              .header-title { font-size: 18px !important; }
              .header-subtitle { font-size: 12px !important; }
              .banner-text { font-size: 12px !important; }
              .banner-badge { font-size: 10px !important; padding: 3px 7px !important; }
              .content-body { padding: 16px 12px !important; }
              .meta-label { font-size: 12px !important; width: 36% !important; }
              .meta-value { font-size: 12px !important; width: 64% !important; }
              .summary-box { padding: 12px 10px !important; }
              .total-label { font-size: 13px !important; }
              .total-amount { font-size: 17px !important; }
              .footer-box { padding: 14px 10px !important; font-size: 11px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <!-- Wrapper bao ngoài cùng co giãn theo màn hình -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; width: 100%; min-width: 100%;">
            <tr>
              <td align="center" class="main-wrapper" style="padding: 20px 10px;">
                <!-- Khung card chính: Tối đa 600px trên desktop, 100% trên điện thoại -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="card-container" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin: 0 auto;">
                  
                  <!-- 1. Header Thương hiệu -->
                  <tr>
                    <td class="header-section" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px 20px; text-align: center; color: #ffffff;">
                      <div class="header-title" style="font-size: 20px; font-weight: 700; letter-spacing: 0.5px; line-height: 1.3;">
                        🦷 NHA KHOA DENTAL CLINIC
                      </div>
                      <div class="header-subtitle" style="font-size: 13px; opacity: 0.95; margin-top: 5px; font-weight: 400;">
                        Biên lai xác nhận thanh toán điện tử (E-Receipt)
                      </div>
                    </td>
                  </tr>

                  <!-- 2. Status Banner (Dùng Table chuẩn Email Client để không vỡ như flexbox) -->
                  <tr>
                    <td style="background-color: #ecfdf5; border-bottom: 1px solid #d1fae5; padding: 12px 18px;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td align="left" class="banner-text" style="color: #065f46; font-weight: 600; font-size: 13px; vertical-align: middle;">
                            ✅ Giao dịch thanh toán hoàn tất
                          </td>
                          <td align="right" style="vertical-align: middle;">
                            <span class="banner-badge" style="background-color: #10b981; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 9px; border-radius: 9999px; text-transform: uppercase; white-space: nowrap; display: inline-block;">
                              ĐÃ THANH TOÁN
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- 3. Nội dung chính -->
                  <tr>
                    <td class="content-body" style="padding: 22px 18px;">
                      <p style="font-size: 15px; color: #1e293b; margin: 0 0 10px 0; font-weight: 600;">
                        Kính chào ${patientName},
                      </p>
                      <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 18px 0;">
                        Cảm ơn Quý khách đã tin tưởng và sử dụng dịch vụ tại Phòng khám Nha khoa Dental Clinic. Hệ thống xin gửi đến Quý khách biên lai xác nhận thanh toán chi tiết:
                      </p>

                      <!-- Bảng thông tin ca khám & hóa đơn (Auto-fit chống tràn) -->
                      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 22px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td class="meta-label" style="padding: 5px 0; color: #64748b; font-size: 13px; width: 35%; white-space: nowrap; vertical-align: top;">
                              Mã hóa đơn:
                            </td>
                            <td class="meta-value" style="padding: 5px 0; color: #0284c7; font-weight: 700; font-size: 13px; text-align: right; word-break: break-all;">
                              ${invoiceCode}
                            </td>
                          </tr>
                          <tr>
                            <td class="meta-label" style="padding: 5px 0; color: #64748b; font-size: 13px; white-space: nowrap; vertical-align: top;">
                              Khách hàng:
                            </td>
                            <td class="meta-value" style="padding: 5px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">
                              ${patientName} ${patientPhone ? `<span style="color: #64748b; font-weight: 400; font-size: 12px;">(${patientPhone})</span>` : ''}
                            </td>
                          </tr>
                          <tr>
                            <td class="meta-label" style="padding: 5px 0; color: #64748b; font-size: 13px; white-space: nowrap; vertical-align: top;">
                              Bác sĩ điều trị:
                            </td>
                            <td class="meta-value" style="padding: 5px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">
                              ${doctorTitleFullName}
                            </td>
                          </tr>
                          <tr>
                            <td class="meta-label" style="padding: 5px 0; color: #64748b; font-size: 13px; white-space: nowrap; vertical-align: top;">
                              Thời gian thanh toán:
                            </td>
                            <td class="meta-value" style="padding: 5px 0; color: #334155; font-size: 13px; text-align: right; white-space: nowrap;">
                              ${formattedPaidDate}
                            </td>
                          </tr>
                          <tr>
                            <td class="meta-label" style="padding: 5px 0; color: #64748b; font-size: 13px; white-space: nowrap; vertical-align: top;">
                              Phương thức:
                            </td>
                            <td class="meta-value" style="padding: 5px 0; color: #334155; font-size: 13px; text-align: right; font-weight: 500;">
                              ${paymentMethod}
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- Bảng kê dịch vụ & vật tư (Thiết kế 2 cột thích ứng mọi màn hình) -->
                      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
                        📋 Bảng kê chi tiết dịch vụ & vật tư:
                      </div>
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                        <thead>
                          <tr style="border-bottom: 2px solid #cbd5e1;">
                            <th align="left" style="padding: 8px 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase;">Mục điều trị</th>
                            <th align="right" style="padding: 8px 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; white-space: nowrap;">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${itemsHtml}
                        </tbody>
                      </table>

                      <!-- Hộp tổng kết tài chính (Không bao giờ vỡ số tiền) -->
                      <div class="summary-box" style="background-color: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td align="left" style="padding: 5px 0; color: #64748b; font-size: 13px;">Tổng tiền dịch vụ & vật tư:</td>
                            <td align="right" style="padding: 5px 0; color: #1e293b; font-size: 13px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums;">
                              ${formatVND(subtotal)}
                            </td>
                          </tr>
                          ${
                            surcharge > 0
                              ? `<tr>
                                  <td align="left" style="padding: 5px 0; color: #64748b; font-size: 13px;">Phụ thu chuyên gia (${doctorDegree}):</td>
                                  <td align="right" style="padding: 5px 0; color: #d97706; font-size: 13px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums;">
                                    +${formatVND(surcharge)}
                                  </td>
                                </tr>`
                              : ''
                          }
                          ${
                            discount > 0
                              ? `<tr>
                                  <td align="left" style="padding: 5px 0; color: #64748b; font-size: 13px;">Giảm giá / Voucher:</td>
                                  <td align="right" style="padding: 5px 0; color: #16a34a; font-size: 13px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums;">
                                    -${formatVND(discount)}
                                  </td>
                                </tr>`
                              : ''
                          }
                          <tr>
                            <td colspan="2" style="padding-top: 8px; border-top: 1px dashed #cbd5e1;"></td>
                          </tr>
                          <tr>
                            <td align="left" class="total-label" style="padding: 6px 0 2px 0; color: #0f172a; font-weight: 700; font-size: 14px; text-transform: uppercase; white-space: nowrap;">
                              TỔNG THỰC THU:
                            </td>
                            <td align="right" class="total-amount" style="padding: 6px 0 2px 0; color: #0284c7; font-weight: 800; font-size: 19px; white-space: nowrap; font-variant-numeric: tabular-nums;">
                              ${formatVND(finalAmount)}
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- Lời dặn y khoa -->
                      <div style="background-color: #eff6ff; border-left: 4px solid #0284c7; padding: 12px 14px; border-radius: 0 6px 6px 0; margin-bottom: 20px;">
                        <div style="font-size: 12px; color: #1e40af; line-height: 1.5;">
                          💡 <strong>Lời dặn y khoa:</strong> Vui lòng chăm sóc và vệ sinh răng miệng theo đúng hướng dẫn của Bác sĩ. Nếu có dấu hiệu bất thường, xin vui lòng liên hệ hotline phòng khám ngay lập tức.
                        </div>
                      </div>
                    </td>
                  </tr>

                  <!-- 4. Footer chân trang -->
                  <tr>
                    <td class="footer-box" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 16px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
                      <div style="font-weight: 700; color: #334155; margin-bottom: 4px;">HỆ THỐNG PHÒNG KHÁM NHA KHOA DENTAL CLINIC</div>
                      <div>📍 Địa chỉ: Tầng 2, Tòa nhà Y khoa Kỹ thuật cao, TP. Hồ Chí Minh</div>
                      <div>📞 Hotline: 1900 6868 | 📧 Email: support@dentalclinic.vn</div>
                      <div style="color: #94a3b8; font-size: 11px; margin-top: 8px;">
                        Đây là email tự động xác nhận từ hệ thống, Quý khách vui lòng không trả lời thư này.
                      </div>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      // 6. Gửi email qua SMTP nếu đã cấu hình, hoặc fallback in ra console nếu ở Dev mode
      if (this.transporter) {
        await this.transporter.sendMail({
          from: `"Nha Khoa Dental Clinic" <${this.emailUser}>`,
          to: patientEmail,
          subject,
          html: htmlContent,
        });
        console.log(`✅ [EmailService] Đã gửi biên lai hóa đơn ${invoiceCode} thành công đến: ${patientEmail}`);
        return true;
      }

      // Dev mode fallback
      this.logInvoiceReceiptToConsole(patientEmail, invoiceCode, patientName, finalAmount, paymentMethod);
      return true;
    } catch (error) {
      console.error('⚠️ [EmailService] Lỗi xử lý gửi hóa đơn qua email:', error.message);
      return false; // Tuyệt đối không throw ra ngoài để bảo vệ giao dịch thanh toán
    }
  }

  logInvoiceReceiptToConsole(toEmail, invoiceCode, patientName, finalAmount, paymentMethod) {
    console.log('\n======================================================');
    console.log(`📧 [EMAIL RECEIPT MOCK - DEV MODE]`);
    console.log(`Gửi đến: ${toEmail} (${patientName})`);
    console.log(`Mã hóa đơn: ${invoiceCode}`);
    console.log(`Số tiền thanh toán: ${new Intl.NumberFormat('vi-VN').format(finalAmount)} đ`);
    console.log(`Phương thức: ${paymentMethod}`);
    console.log(`Trạng thái: ĐÃ GỬI BIÊN LAI THÀNH CÔNG (Mô phỏng)`);
    console.log('======================================================\n');
  }
}

export default new EmailService();
