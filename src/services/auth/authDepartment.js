import bcrypt from 'bcryptjs';
import prisma from '../../config/prisma.js';
import {
  departmentAuthResponseSchema,
  departmentUserProfileResponseSchema,
  extractDepartmentProfile,
} from '../../dtos/auth/authDepartmentDto.js';
import { ApiError } from '../../common/errorMiddleware.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt.js';

class AuthDepartmentService {
  /**
   * Sinh Access Token chứa thông tin định danh và phân quyền
   * @param {any} user - Prisma TaiKhoan
   * @param {any} profile - Profile trích xuất từ extractDepartmentProfile
   * @returns {string}
   */
  generateAccessToken(user, profile) {
    return generateAccessToken({
      userId: user.id,
      profileId: profile.profileId,
      role: profile.role,
    });
  }

  /**
   * Sinh Refresh Token cho phiên làm việc
   * @param {any} user - Prisma TaiKhoan
   * @param {any} profile - Profile trích xuất từ extractDepartmentProfile
   * @returns {string}
   */
  generateRefreshToken(user, profile) {
    return generateRefreshToken({
      userId: user.id,
      profileId: profile.profileId,
      role: profile.role,
    });
  }

  async checkPassword(plainPassword, hashedPassword) {
    if (!plainPassword || !hashedPassword) return false;
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch {
      return false;
    }
  }

  async login(loginData) {
    const { username, password } = loginData;

    // 1. Truy vấn trực tiếp qua Prisma Client (Tự động JOIN nha_si, nhan_vien)
    const user = await prisma.taiKhoan.findUnique({
      where: { username },
      include: {
        nhaSi: true,
        nhanVien: true,
      },
    });

    if (!user) throw new ApiError(401, 'Ten dang nhap hoac mat khau khong chinh xac');

    if (user.trangThai === 'bi_khoa')
      throw new ApiError(403, 'Tai khoan cua ban da bi khoa. Vui long lien he quan tri vien.');

    if (user.loaiTaiKhoan === 'benh_nhan')
      throw new ApiError(403, 'Cong nay chi danh cho nhan su phong kham (Bac si, Le tan, Quan tri).');

    // 2. Trích xuất thông tin profile và kiểm tra trạng thái làm việc
    const profile = extractDepartmentProfile(user);
    if (profile.workStatus === 'nghi_viec')
      throw new ApiError(403, 'Tai khoan khong the truy cap do nhan su da nghi viec.');

    const isPasswordValid = await this.checkPassword(password, user.passwordHash);
    if (!isPasswordValid) throw new ApiError(401, 'Ten dang nhap hoac mat khau khong chinh xac');

    // 3. Khởi tạo Tokens với Dual-Identity
    const accessToken = this.generateAccessToken(user, profile);
    const refreshToken = this.generateRefreshToken(user, profile);

    // 4. Cập nhật Single Active Session hash trên database qua Prisma
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await prisma.taiKhoan.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashedRefreshToken },
    });

    return departmentAuthResponseSchema(user, accessToken, refreshToken);
  }

  async refreshAccessToken(rawRefreshToken) {
    if (!rawRefreshToken) throw new ApiError(400, 'Khong tim thay Refresh Token');

    let decoded;
    try {
      decoded = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new ApiError(403, 'Refresh Token da het han hoac khong hop le');
    }

    if (!decoded || typeof decoded === 'string') {
      throw new ApiError(403, 'Refresh Token da het han hoac khong hop le');
    }

    const userId = decoded.userId;
    const user = await prisma.taiKhoan.findUnique({
      where: { id: userId },
      include: {
        nhaSi: true,
        nhanVien: true,
      },
    });

    if (!user) throw new ApiError(404, 'Nguoi dung khong ton tai trong he thong');

    if (user.trangThai === 'bi_khoa')
      throw new ApiError(403, 'Tai khoan cua ban da bi khoa');

    const profile = extractDepartmentProfile(user);
    if (profile.workStatus === 'nghi_viec')
      throw new ApiError(403, 'Tai khoan khong the truy cap do nhan su da nghi viec');

    if (!user.refreshTokenHash)
      throw new ApiError(403, 'Refresh Token khong hop le hoac da bi vo hieu hoa');

    const isMatched = await bcrypt.compare(rawRefreshToken, user.refreshTokenHash);
    if (!isMatched) throw new ApiError(403, 'Refresh Token khong hop le hoac da bi thay the');

    const newAccessToken = this.generateAccessToken(user, profile);
    const newRefreshToken = this.generateRefreshToken(user, profile);

    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await prisma.taiKhoan.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashedNewRefreshToken },
    });

    return departmentAuthResponseSchema(user, newAccessToken, newRefreshToken);
  }

  async getMe(userId) {
    const user = await prisma.taiKhoan.findUnique({
      where: { id: userId },
      include: {
        nhaSi: true,
        nhanVien: true,
      },
    });

    if (!user) throw new ApiError(404, 'Nguoi dung khong ton tai trong he thong');

    return { user: departmentUserProfileResponseSchema(user) };
  }

  async logout(userId) {
    if (!userId) throw new ApiError(400, 'Khong tim thay thong tin phien lam viec can dang xuat');
    await prisma.taiKhoan.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return {
      success: true,
      msg: 'Dang xuat thanh cong va token da duoc vo hieu hoa tren may chu.',
    };
  }
}

export default new AuthDepartmentService();
