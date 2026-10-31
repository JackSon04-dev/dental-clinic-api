import bcrypt from 'bcryptjs';
import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  adminUsersListResponseSchema,
  adminUserDetailResponseSchema,
} from '../../../dtos/departments/admins/adminUserDto.js';

/**
 * Sinh mã Bác sĩ duy nhất dạng NS-XXXX (4 số)
 */
const generateUniqueDoctorCode = async (tx) => {
  let code = '';
  let isUnique = false;
  while (!isUnique) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    code = `NS-${randomDigits}`;
    const existing = await tx.nhaSi.findUnique({
      where: { maNhaSi: code },
    });
    if (!existing) isUnique = true;
  }
  return code;
};

/**
 * Sinh mã Nhân viên duy nhất dạng NV-XXXX (4 số)
 */
const generateUniqueStaffCode = async (tx) => {
  let code = '';
  let isUnique = false;
  while (!isUnique) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    code = `NV-${randomDigits}`;
    const existing = await tx.nhanVien.findUnique({
      where: { maNhanVien: code },
    });
    if (!existing) isUnique = true;
  }
  return code;
};

/**
 * 1. getUsersListService
 * Lấy danh sách nhân sự nội bộ (Bác sĩ, Lễ tân) có phân trang, lọc và tìm kiếm theo mã
 */
export const getUsersListService = async ({
  page = 1,
  limit = 10,
  role = 'ALL',
  status = 'ALL',
  search = '',
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  // Điều kiện lọc cơ bản: chỉ lấy nhân sự phòng khám (nha_si, nhan_vien), bỏ qua benh_nhan
  const andConditions = [];

  // 1. Lọc theo Role
  if (role === 'BAC_SI') {
    andConditions.push({ loaiTaiKhoan: 'nha_si' });
  } else if (role === 'LE_TAN') {
    andConditions.push({ loaiTaiKhoan: 'nhan_vien' });
  } else {
    // Mặc định ALL: lấy cả Bác sĩ và Nhân viên
    andConditions.push({ loaiTaiKhoan: { in: ['nha_si', 'nhan_vien'] } });
  }

  // 2. Lọc theo Trạng thái làm việc (workStatus)
  if (status !== 'ALL') {
    // Cho phép mapping linh hoạt giữa tam_nghi và nghi_phep
    const targetStatus = status === 'tam_nghi' ? 'nghi_phep' : status;

    if (role === 'BAC_SI') {
      andConditions.push({ nhaSi: { trangThai: targetStatus } });
    } else if (role === 'LE_TAN') {
      andConditions.push({ nhanVien: { trangThai: targetStatus } });
    } else {
      andConditions.push({
        OR: [
          { nhaSi: { trangThai: targetStatus } },
          { nhanVien: { trangThai: targetStatus } },
        ],
      });
    }
  }

  // 3. Tìm kiếm theo mã nhân sự (hoặc tên, sđt, username)
  const cleanSearch = String(search).trim();
  if (cleanSearch) {
    andConditions.push({
      OR: [
        { nhaSi: { maNhaSi: { contains: cleanSearch, mode: 'insensitive' } } },
        { nhanVien: { maNhanVien: { contains: cleanSearch, mode: 'insensitive' } } },
        { nhaSi: { hoTen: { contains: cleanSearch, mode: 'insensitive' } } },
        { nhanVien: { hoTen: { contains: cleanSearch, mode: 'insensitive' } } },
        { nhaSi: { sdt: { contains: cleanSearch, mode: 'insensitive' } } },
        { nhanVien: { sdt: { contains: cleanSearch, mode: 'insensitive' } } },
        { username: { contains: cleanSearch, mode: 'insensitive' } },
      ],
    });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  // Truy vấn song song dữ liệu và tổng số lượng bản ghi
  const [users, totalItems] = await Promise.all([
    prisma.taiKhoan.findMany({
      where,
      include: {
        nhaSi: true,
        nhanVien: true,
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.taiKhoan.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  return adminUsersListResponseSchema({
    users,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  });
};

/**
 * 2. getUserDetailService
 * Lấy thông tin chi tiết một nhân sự theo UUID (tai_khoan.id)
 */
export const getUserDetailService = async (id) => {
  const user = await prisma.taiKhoan.findUnique({
    where: { id },
    include: {
      nhaSi: true,
      nhanVien: true,
    },
  });

  if (!user || user.loaiTaiKhoan === 'benh_nhan') {
    throw new ApiError(404, 'Không tìm thấy thông tin nhân sự!');
  }

  return adminUserDetailResponseSchema(user);
};

/**
 * 3. createUserService
 * Thêm mới nhân sự (Bác sĩ hoặc Lễ tân) trong một Prisma Transaction
 */
export const createUserService = async (createData) => {
  const {
    role,
    username,
    password,
    fullName,
    phone,
    email,
    dateOfBirth,
    gender,
    address,
    avatarUrl,
    specialty,
    licenseNumber,
    bio,
    position,
  } = createData;

  const normalizedUsername = username.toLowerCase().trim();
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedPhone = phone.trim();

  // 1. Kiểm tra username đã tồn tại chưa
  const existingUsername = await prisma.taiKhoan.findUnique({
    where: { username: normalizedUsername },
  });
  if (existingUsername) {
    throw new ApiError(400, 'Tên đăng nhập đã tồn tại trên hệ thống. Vui lòng chọn tên khác.');
  }

  // 2. Kiểm tra email và số điện thoại theo vai trò
  if (role === 'BAC_SI') {
    const existingDoctor = await prisma.nhaSi.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { sdt: normalizedPhone },
        ],
      },
    });
    if (existingDoctor) {
      if (existingDoctor.email === normalizedEmail) {
        throw new ApiError(400, 'Địa chỉ email này đã được sử dụng bởi một nha sĩ khác.');
      }
      throw new ApiError(400, 'Số điện thoại này đã được sử dụng bởi một nha sĩ khác.');
    }
  } else if (role === 'LE_TAN') {
    const existingStaff = await prisma.nhanVien.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { sdt: normalizedPhone },
        ],
      },
    });
    if (existingStaff) {
      if (existingStaff.email === normalizedEmail) {
        throw new ApiError(400, 'Địa chỉ email này đã được sử dụng bởi một nhân viên khác.');
      }
      throw new ApiError(400, 'Số điện thoại này đã được sử dụng bởi một nhân viên khác.');
    }
  }

  // 3. Băm mật khẩu mặc định (nếu không truyền -> mặc định 'Password123@')
  const plainPassword = (password && password.trim()) ? password.trim() : 'Password123@';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // 4. Thực thi Prisma Transaction tạo đồng thời TaiKhoan và NhaSi / NhanVien
  const newAccount = await prisma.$transaction(async (tx) => {
    const account = await tx.taiKhoan.create({
      data: {
        username: normalizedUsername,
        passwordHash: hashedPassword,
        loaiTaiKhoan: role === 'BAC_SI' ? 'nha_si' : 'nhan_vien',
        trangThai: 'hoat_dong',
      },
    });

    if (role === 'BAC_SI') {
      const code = await generateUniqueDoctorCode(tx);
      await tx.nhaSi.create({
        data: {
          taiKhoanId: account.id,
          maNhaSi: code,
          hoTen: fullName.trim(),
          sdt: normalizedPhone,
          email: normalizedEmail,
          ngaySinh: dateOfBirth ? new Date(dateOfBirth) : null,
          gioiTinh: gender || null,
          diaChi: address ? address.trim() : null,
          hinhAnhUrl: avatarUrl ? avatarUrl.trim() : null,
          chuyenKhoa: specialty ? specialty.trim() : null,
          soGiayPhep: licenseNumber ? licenseNumber.trim() : null,
          gioiThieu: bio ? bio.trim() : null,
          trangThai: 'dang_lam_viec',
        },
      });
    } else {
      const code = await generateUniqueStaffCode(tx);
      await tx.nhanVien.create({
        data: {
          taiKhoanId: account.id,
          maNhanVien: code,
          hoTen: fullName.trim(),
          sdt: normalizedPhone,
          email: normalizedEmail,
          ngaySinh: dateOfBirth ? new Date(dateOfBirth) : null,
          gioiTinh: gender || null,
          diaChi: address ? address.trim() : null,
          hinhAnhUrl: avatarUrl ? avatarUrl.trim() : null,
          chucVu: position || 'le_tan',
          trangThai: 'dang_lam_viec',
        },
      });
    }

    return account;
  });

  // Query lại đầy đủ với relations để format theo DTO
  const createdUser = await prisma.taiKhoan.findUnique({
    where: { id: newAccount.id },
    include: { nhaSi: true, nhanVien: true },
  });

  return adminUserDetailResponseSchema(createdUser);
};

/**
 * 4. updateUserService
 * Cập nhật thông tin cá nhân và nghiệp vụ của nhân sự
 */
export const updateUserService = async (id, updateData) => {
  const user = await prisma.taiKhoan.findUnique({
    where: { id },
    include: { nhaSi: true, nhanVien: true },
  });

  if (!user || user.loaiTaiKhoan === 'benh_nhan') {
    throw new ApiError(404, 'Không tìm thấy thông tin nhân sự!');
  }

  const {
    fullName,
    phone,
    email,
    dateOfBirth,
    gender,
    address,
    avatarUrl,
    workStatus,
    specialty,
    licenseNumber,
    bio,
    position,
  } = updateData;

  const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
  const normalizedPhone = phone ? phone.trim() : undefined;

  // Kiểm tra trùng email hoặc sđt với người khác
  if (user.loaiTaiKhoan === 'nha_si' && user.nhaSi) {
    if (normalizedEmail || normalizedPhone) {
      const existing = await prisma.nhaSi.findFirst({
        where: {
          id: { not: user.nhaSi.id },
          OR: [
            ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
            ...(normalizedPhone ? [{ sdt: normalizedPhone }] : []),
          ],
        },
      });
      if (existing) {
        if (existing.email === normalizedEmail) {
          throw new ApiError(400, 'Địa chỉ email này đã được sử dụng bởi nha sĩ khác');
        }
        throw new ApiError(400, 'Số điện thoại này đã được sử dụng bởi nha sĩ khác');
      }
    }

    await prisma.nhaSi.update({
      where: { id: user.nhaSi.id },
      data: {
        ...(fullName !== undefined && { hoTen: fullName.trim() }),
        ...(normalizedPhone !== undefined && { sdt: normalizedPhone }),
        ...(normalizedEmail !== undefined && { email: normalizedEmail }),
        ...(dateOfBirth !== undefined && { ngaySinh: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(gender !== undefined && { gioiTinh: gender }),
        ...(address !== undefined && { diaChi: address ? address.trim() : null }),
        ...(avatarUrl !== undefined && { hinhAnhUrl: avatarUrl ? avatarUrl.trim() : null }),
        ...(specialty !== undefined && { chuyenKhoa: specialty ? specialty.trim() : null }),
        ...(licenseNumber !== undefined && { soGiayPhep: licenseNumber ? licenseNumber.trim() : null }),
        ...(bio !== undefined && { gioiThieu: bio ? bio.trim() : null }),
        ...(workStatus !== undefined && { trangThai: workStatus }),
      },
    });
  } else if (user.loaiTaiKhoan === 'nhan_vien' && user.nhanVien) {
    if (normalizedEmail || normalizedPhone) {
      const existing = await prisma.nhanVien.findFirst({
        where: {
          id: { not: user.nhanVien.id },
          OR: [
            ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
            ...(normalizedPhone ? [{ sdt: normalizedPhone }] : []),
          ],
        },
      });
      if (existing) {
        if (existing.email === normalizedEmail) {
          throw new ApiError(400, 'Địa chỉ email này đã được sử dụng bởi nhân viên khác');
        }
        throw new ApiError(400, 'Số điện thoại này đã được sử dụng bởi nhân viên khác');
      }
    }

    await prisma.nhanVien.update({
      where: { id: user.nhanVien.id },
      data: {
        ...(fullName !== undefined && { hoTen: fullName.trim() }),
        ...(normalizedPhone !== undefined && { sdt: normalizedPhone }),
        ...(normalizedEmail !== undefined && { email: normalizedEmail }),
        ...(dateOfBirth !== undefined && { ngaySinh: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(gender !== undefined && { gioiTinh: gender }),
        ...(address !== undefined && { diaChi: address ? address.trim() : null }),
        ...(avatarUrl !== undefined && { hinhAnhUrl: avatarUrl ? avatarUrl.trim() : null }),
        ...(position !== undefined && { chucVu: position }),
        ...(workStatus !== undefined && { trangThai: workStatus }),
      },
    });
  }

  const updatedUser = await prisma.taiKhoan.findUnique({
    where: { id },
    include: { nhaSi: true, nhanVien: true },
  });

  return adminUserDetailResponseSchema(updatedUser);
};

/**
 * 5. updateUserStatusService
 * Khóa hoặc kích hoạt lại tài khoản nhân sự (tự động thu hồi phiên nếu bị khóa)
 */
export const updateUserStatusService = async (id, status, currentAdminUserId) => {
  const user = await prisma.taiKhoan.findUnique({
    where: { id },
  });

  if (!user || user.loaiTaiKhoan === 'benh_nhan') {
    throw new ApiError(404, 'Không tìm thấy tài khoản nhân sự!');
  }

  // Không cho phép tự khóa tài khoản Admin hoặc đổi trạng thái admin
  if (user.id === currentAdminUserId || user.loaiTaiKhoan === 'admin') {
    throw new ApiError(400, 'Không thể thay đổi trạng thái của tài khoản Quản trị viên');
  }

  const updateData = { trangThai: status };
  // Nếu bị khóa -> thu hồi ngay phiên đăng nhập hiện tại
  if (status === 'bi_khoa') {
    updateData.refreshTokenHash = null;
  }

  const updated = await prisma.taiKhoan.update({
    where: { id },
    data: updateData,
  });

  return {
    id: updated.id,
    username: updated.username,
    accountStatus: updated.trangThai,
    message:
      status === 'bi_khoa'
        ? 'Đã khóa tài khoản nhân sự và thu hồi phiên đăng nhập thành công.'
        : 'Đã kích hoạt lại tài khoản nhân sự thành công.',
  };
};

/**
 * 6. resetUserPasswordService
 * Admin đặt lại mật khẩu cho nhân sự (mặc định 'Password123@' nếu không nhập)
 */
export const resetUserPasswordService = async (id, newPassword, currentAdminUserId) => {
  const user = await prisma.taiKhoan.findUnique({
    where: { id },
  });

  if (!user || user.loaiTaiKhoan === 'benh_nhan') {
    throw new ApiError(404, 'Không tìm thấy tài khoản nhân sự!');
  }

  if (user.loaiTaiKhoan === 'admin') {
    throw new ApiError(400, 'Không thể đặt lại mật khẩu tài khoản Quản trị viên qua tính năng này.');
  }

  const plainPassword = (newPassword && newPassword.trim()) ? newPassword.trim() : 'Password123@';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Đổi mật khẩu và thu hồi phiên làm việc cũ
  await prisma.taiKhoan.update({
    where: { id },
    data: {
      passwordHash: hashedPassword,
      refreshTokenHash: null,
    },
  });

  return {
    id: user.id,
    username: user.username,
    message: 'Đặt lại mật khẩu cho nhân sự thành công. Phiên làm việc cũ đã được thu hồi.',
    defaultPasswordUsed: !newPassword || !newPassword.trim(),
  };
};

export default {
  getUsersListService,
  getUserDetailService,
  createUserService,
  updateUserService,
  updateUserStatusService,
  resetUserPasswordService,
};
