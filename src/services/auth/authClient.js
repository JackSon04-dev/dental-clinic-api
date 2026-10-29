import bcrypt from 'bcryptjs';
import prisma from '../../config/prisma.js';
import emailService from '../../utils/emailService.js';
import otpStore from '../../utils/otpStore.js';
import {
  clientProfileResponseSchema,
  clientAuthResponseSchema,
} from '../../dtos/auth/authClientDto.js';
import { ApiError } from '../../common/errorMiddleware.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt.js';

class AuthClientService {
  /**
   * Sinh Access Token cho Bệnh nhân
   */
  generateAccessToken(user, benhNhan) {
    return generateAccessToken({
      userId: user.id,
      profileId: benhNhan.id,
      role: 'BENH_NHAN',
    });
  }

  /**
   * Sinh Refresh Token cho Bệnh nhân
   */
  generateRefreshToken(user, benhNhan) {
    return generateRefreshToken({
      userId: user.id,
      profileId: benhNhan.id,
      role: 'BENH_NHAN',
    });
  }

  /**
   * Sinh mã bệnh nhân duy nhất theo định dạng BN-XXXXXX
   */
  async generateUniquePatientCode() {
    let code = '';
    let isUnique = false;
    while (!isUnique) {
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      code = `BN-${randomDigits}`;
      const existing = await prisma.benhNhan.findUnique({
        where: { maBenhNhan: code },
      });
      if (!existing) isUnique = true;
    }
    return code;
  }

  /**
   * BƯỚC 1: Đăng ký tài khoản - Kiểm tra trùng lặp và gửi OTP về Email
   */
  async register(data) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const normalizedPhone = data.phone.trim();

    // 1. Kiểm tra xem Email hoặc SĐT đã tồn tại trong hệ thống chưa
    const existingAccount = await prisma.taiKhoan.findFirst({
      where: {
        OR: [
          { username: normalizedEmail },
          { benhNhan: { email: normalizedEmail } },
          { benhNhan: { sdt: normalizedPhone } },
        ],
      },
      include: { benhNhan: true },
    });

    if (existingAccount) {
      if (existingAccount.benhNhan?.email === normalizedEmail || existingAccount.username === normalizedEmail) {
        throw new ApiError(409, 'Địa chỉ email này đã được đăng ký tài khoản trong hệ thống.');
      }
      if (existingAccount.benhNhan?.sdt === normalizedPhone) {
        throw new ApiError(409, 'Số điện thoại này đã được liên kết với một tài khoản khác.');
      }
      throw new ApiError(409, 'Tài khoản với thông tin này đã tồn tại trong hệ thống.');
    }

    // 2. Hash mật khẩu trước khi lưu tạm vào bộ nhớ
    const passwordHash = await bcrypt.hash(data.password, 10);

    // 3. Sinh mã OTP 6 số
    const otp = emailService.generateOtp();

    // 4. Lưu thông tin chờ xác thực vào OtpStore (hạn 5 phút)
    otpStore.set(normalizedEmail, 'register', otp, {
      fullName: data.fullName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      dateOfBirth: data.dateOfBirth || null,
      gender: data.gender || null,
      address: data.address ? data.address.trim() : null,
    }, 5);

    // 5. Gửi email chứa mã OTP
    await emailService.sendOtpEmail(normalizedEmail, otp, 'register', data.fullName);

    return {
      message: 'Mã xác thực OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư (hiệu lực trong 5 phút).',
      email: normalizedEmail,
    };
  }

  /**
   * BƯỚC 2: Xác thực mã OTP và chính thức tạo tài khoản + hồ sơ bệnh nhân
   */
  async verifyRegistration(email, otp) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Kiểm tra mã OTP trong OtpStore
    const record = otpStore.get(normalizedEmail, 'register');
    if (!record) {
      throw new ApiError(400, 'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại mã.');
    }

    if (record.otp !== otp.trim()) {
      throw new ApiError(400, 'Mã OTP xác thực không chính xác.');
    }

    const pending = record.payload;
    if (!pending) {
      throw new ApiError(400, 'Không tìm thấy dữ liệu đăng ký tương ứng. Vui lòng thực hiện lại từ đầu.');
    }

    // 2. Sinh mã bệnh nhân duy nhất
    const patientCode = await this.generateUniquePatientCode();

    // 3. Thực thi Prisma Transaction tạo TaiKhoan & BenhNhan
    const result = await prisma.$transaction(async (tx) => {
      const newAccount = await tx.taiKhoan.create({
        data: {
          username: pending.email,
          passwordHash: pending.passwordHash,
          loaiTaiKhoan: 'benh_nhan',
          trangThai: 'hoat_dong',
        },
      });

      const newPatient = await tx.benhNhan.create({
        data: {
          taiKhoanId: newAccount.id,
          maBenhNhan: patientCode,
          hoTen: pending.fullName,
          sdt: pending.phone,
          email: pending.email,
          ngaySinh: pending.dateOfBirth ? new Date(pending.dateOfBirth) : null,
          gioiTinh: pending.gender || null,
          diaChi: pending.address || null,
        },
      });

      return { account: newAccount, patient: newPatient };
    });

    // 4. Khởi tạo Tokens với Dual-Identity
    const accessToken = this.generateAccessToken(result.account, result.patient);
    const refreshToken = this.generateRefreshToken(result.account, result.patient);

    // 5. Lưu hash Refresh Token vào tài khoản
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await prisma.taiKhoan.update({
      where: { id: result.account.id },
      data: { refreshTokenHash: hashedRefreshToken },
    });

    // 6. Xóa OTP đã sử dụng
    otpStore.delete(normalizedEmail, 'register');

    // Nạp lại đối tượng hoàn chỉnh cho DTO
    result.account.benhNhan = result.patient;
    return clientAuthResponseSchema(result.account, accessToken, refreshToken);
  }

  /**
   * Gửi lại mã OTP mới (cho Đăng ký hoặc Quên mật khẩu)
   */
  async resendOtp(email, type = 'register') {
    const normalizedEmail = email.toLowerCase().trim();

    if (type === 'register') {
      const existing = otpStore.get(normalizedEmail, 'register');
      if (!existing || !existing.payload) {
        throw new ApiError(400, 'Không tìm thấy thông tin đăng ký chờ xác thực. Vui lòng đăng ký lại.');
      }
      const newOtp = emailService.generateOtp();
      otpStore.set(normalizedEmail, 'register', newOtp, existing.payload, 5);
      await emailService.sendOtpEmail(normalizedEmail, newOtp, 'register', existing.payload.fullName);
    } else if (type === 'forgot_password') {
      const user = await prisma.taiKhoan.findFirst({
        where: {
          OR: [
            { username: normalizedEmail },
            { benhNhan: { email: normalizedEmail } },
          ],
          loaiTaiKhoan: 'benh_nhan',
        },
        include: { benhNhan: true },
      });

      if (!user) {
        throw new ApiError(404, 'Không tìm thấy tài khoản bệnh nhân nào gắn với email này.');
      }

      const newOtp = emailService.generateOtp();
      otpStore.set(normalizedEmail, 'forgot_password', newOtp, { userId: user.id }, 5);
      await emailService.sendOtpEmail(normalizedEmail, newOtp, 'forgot_password', user.benhNhan?.hoTen);
    }

    return {
      message: 'Mã xác thực OTP mới đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
      email: normalizedEmail,
    };
  }

  /**
   * Đăng nhập Bệnh nhân (Bằng Email hoặc Số điện thoại + Password)
   */
  async login(loginData) {
    const { identifier, password } = loginData;
    const cleanId = identifier.trim().toLowerCase();

    // Tìm tài khoản theo Email hoặc Số điện thoại (loại tài khoản: benh_nhan)
    const user = await prisma.taiKhoan.findFirst({
      where: {
        OR: [
          { username: cleanId },
          { benhNhan: { email: cleanId } },
          { benhNhan: { sdt: identifier.trim() } },
        ],
        loaiTaiKhoan: 'benh_nhan',
      },
      include: {
        benhNhan: true,
      },
    });

    if (!user || !user.benhNhan) {
      throw new ApiError(401, 'Email, số điện thoại hoặc mật khẩu không chính xác.');
    }

    if (user.trangThai === 'bi_khoa') {
      throw new ApiError(403, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ phòng khám để được hỗ trợ.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash || '');
    if (!isPasswordValid) {
      throw new ApiError(401, 'Email, số điện thoại hoặc mật khẩu không chính xác.');
    }

    // Khởi tạo Tokens với Dual-Identity
    const accessToken = this.generateAccessToken(user, user.benhNhan);
    const refreshToken = this.generateRefreshToken(user, user.benhNhan);

    // Cập nhật Single Active Session refresh token hash
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await prisma.taiKhoan.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashedRefreshToken },
    });

    return clientAuthResponseSchema(user, accessToken, refreshToken);
  }

  /**
   * Yêu cầu khôi phục mật khẩu (Quên mật khẩu)
   */
  async forgotPassword(email) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.taiKhoan.findFirst({
      where: {
        OR: [
          { username: normalizedEmail },
          { benhNhan: { email: normalizedEmail } },
        ],
        loaiTaiKhoan: 'benh_nhan',
      },
      include: { benhNhan: true },
    });

    if (!user) {
      throw new ApiError(404, 'Không tìm thấy tài khoản bệnh nhân nào liên kết với địa chỉ email này.');
    }

    if (user.trangThai === 'bi_khoa') {
      throw new ApiError(403, 'Tài khoản của bạn đang bị khóa. Vui lòng liên hệ trực tiếp phòng khám.');
    }

    // Sinh OTP và lưu vào store
    const otp = emailService.generateOtp();
    otpStore.set(normalizedEmail, 'forgot_password', otp, { userId: user.id }, 5);

    // Gửi email
    await emailService.sendOtpEmail(normalizedEmail, otp, 'forgot_password', user.benhNhan?.hoTen);

    return {
      message: 'Mã xác thực OTP đặt lại mật khẩu đã được gửi đến email của bạn.',
      email: normalizedEmail,
    };
  }

  /**
   * Đặt lại mật khẩu mới bằng mã OTP
   */
  async resetPassword(email, otp, newPassword) {
    const normalizedEmail = email.toLowerCase().trim();

    const record = otpStore.get(normalizedEmail, 'forgot_password');
    if (!record) {
      throw new ApiError(400, 'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại mã mới.');
    }

    if (record.otp !== otp.trim()) {
      throw new ApiError(400, 'Mã OTP xác thực không chính xác.');
    }

    const userId = record.payload?.userId;
    if (!userId) {
      throw new ApiError(400, 'Dữ liệu xác thực không hợp lệ. Vui lòng thử lại.');
    }

    // Băm mật khẩu mới
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu và hủy toàn bộ phiên refresh token cũ
    await prisma.taiKhoan.update({
      where: { id: userId },
      data: {
        passwordHash,
        refreshTokenHash: null,
      },
    });

    // Xóa OTP
    otpStore.delete(normalizedEmail, 'forgot_password');

    return {
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.',
    };
  }

  /**
   * Cấp lại Access Token mới qua Refresh Token
   */
  async refreshAccessToken(rawRefreshToken) {
    if (!rawRefreshToken) throw new ApiError(400, 'Không tìm thấy Refresh Token');

    let decoded;
    try {
      decoded = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new ApiError(403, 'Refresh Token đã hết hạn hoặc không hợp lệ');
    }

    if (!decoded || typeof decoded === 'string' || decoded.role !== 'BENH_NHAN') {
      throw new ApiError(403, 'Refresh Token không hợp lệ cho phân hệ Bệnh nhân');
    }

    const userId = decoded.userId;
    const user = await prisma.taiKhoan.findUnique({
      where: { id: userId },
      include: { benhNhan: true },
    });

    if (!user || !user.benhNhan) {
      throw new ApiError(404, 'Người dùng không tồn tại trong hệ thống');
    }

    if (user.trangThai === 'bi_khoa') {
      throw new ApiError(403, 'Tài khoản của bạn đã bị khóa');
    }

    if (!user.refreshTokenHash) {
      throw new ApiError(403, 'Refresh Token đã bị thu hồi hoặc đã đăng xuất');
    }

    const isMatched = await bcrypt.compare(rawRefreshToken, user.refreshTokenHash);
    if (!isMatched) {
      throw new ApiError(403, 'Refresh Token không hợp lệ hoặc đã bị thay thế');
    }

    const newAccessToken = this.generateAccessToken(user, user.benhNhan);
    const newRefreshToken = this.generateRefreshToken(user, user.benhNhan);

    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await prisma.taiKhoan.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashedNewRefreshToken },
    });

    return clientAuthResponseSchema(user, newAccessToken, newRefreshToken);
  }

  /**
   * Đăng xuất
   */
  async logout(userId) {
    if (!userId) throw new ApiError(400, 'Không tìm thấy phiên làm việc cần đăng xuất');
    await prisma.taiKhoan.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return {
      message: 'Đăng xuất thành công.',
    };
  }

  /**
   * Lấy thông tin hồ sơ bệnh nhân hiện tại
   */
  async getMe(userId) {
    const user = await prisma.taiKhoan.findUnique({
      where: { id: userId },
      include: { benhNhan: true },
    });

    if (!user || !user.benhNhan) {
      throw new ApiError(404, 'Không tìm thấy thông tin hồ sơ bệnh nhân');
    }

    return { user: clientProfileResponseSchema(user) };
  }
}

export default new AuthClientService();
