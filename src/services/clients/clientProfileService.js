import prisma from '../../config/prisma.js';
import { ApiError } from '../../common/errorMiddleware.js';
import {
  clientProfileDetailResponseSchema,
  normalizeGenderForDb,
} from '../../dtos/clients/clientProfileDto.js';

/**
 * getProfileService
 * Lấy toàn bộ thông tin hồ sơ của bệnh nhân hiện tại (bao gồm thông tin cá nhân, lâm sàng và tài khoản)
 * @param {string} profileId - ID của bệnh nhân (benh_nhan.id)
 * @param {string} userId - ID tài khoản (tai_khoan.id)
 */
export const getProfileService = async (profileId, userId) => {
  const whereCondition = {};
  if (profileId) {
    whereCondition.id = profileId;
  } else if (userId) {
    whereCondition.taiKhoanId = userId;
  } else {
    throw new ApiError(400, 'Không xác định được danh tính người dùng');
  }

  const patient = await prisma.benhNhan.findFirst({
    where: whereCondition,
    include: {
      taiKhoan: {
        select: {
          username: true,
          trangThai: true,
        },
      },
    },
  });

  if (!patient) {
    throw new ApiError(404, 'Không tìm thấy thông tin hồ sơ bệnh nhân');
  }

  return clientProfileDetailResponseSchema(patient);
};

/**
 * updateProfileService
 * Cập nhật thông tin cá nhân của bệnh nhân (CHỈ CHO PHÉP: fullName, phone, gender, dateOfBirth, address)
 * BẢO VỆ TUYỆT ĐỐI các trường y tế (tienSuBenh, diUng, ghiChu, diemSucKhoe...) và định danh (maBenhNhan, email)
 * @param {string} profileId - ID của bệnh nhân (benh_nhan.id)
 * @param {string} userId - ID tài khoản (tai_khoan.id)
 * @param {object} updateData - Dữ liệu cập nhật từ client
 */
export const updateProfileService = async (profileId, userId, updateData) => {
  const whereCondition = {};
  if (profileId) {
    whereCondition.id = profileId;
  } else if (userId) {
    whereCondition.taiKhoanId = userId;
  } else {
    throw new ApiError(400, 'Không xác định được danh tính người dùng');
  }

  const existingPatient = await prisma.benhNhan.findFirst({
    where: whereCondition,
    select: {
      id: true,
      sdt: true,
    },
  });

  if (!existingPatient) {
    throw new ApiError(404, 'Không tìm thấy hồ sơ bệnh nhân để cập nhật');
  }

  const dataToUpdate = {};

  // 1. Cập nhật Họ và tên
  if (updateData.fullName !== undefined) {
    dataToUpdate.hoTen = updateData.fullName.trim();
  }

  // 2. Cập nhật Số điện thoại (kiểm tra chống trùng lặp với bệnh nhân khác)
  if (updateData.phone !== undefined) {
    const cleanPhone = updateData.phone.trim();
    if (cleanPhone !== existingPatient.sdt) {
      const phoneConflict = await prisma.benhNhan.findFirst({
        where: {
          sdt: cleanPhone,
          id: { not: existingPatient.id },
        },
        select: { id: true },
      });

      if (phoneConflict) {
        throw new ApiError(
          409,
          `Số điện thoại '${cleanPhone}' đã được sử dụng bởi bệnh nhân khác trong hệ thống`
        );
      }
      dataToUpdate.sdt = cleanPhone;
    }
  }

  // 3. Cập nhật Giới tính
  if (updateData.gender !== undefined) {
    dataToUpdate.gioiTinh = normalizeGenderForDb(updateData.gender);
  }

  // 4. Cập nhật Ngày sinh
  if (updateData.dateOfBirth !== undefined) {
    dataToUpdate.ngaySinh = updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null;
  }

  // 5. Cập nhật Địa chỉ
  if (updateData.address !== undefined) {
    dataToUpdate.diaChi = updateData.address ? updateData.address.trim() : null;
  }

  const updatedPatient = await prisma.benhNhan.update({
    where: { id: existingPatient.id },
    data: dataToUpdate,
    include: {
      taiKhoan: {
        select: {
          username: true,
          trangThai: true,
        },
      },
    },
  });

  return clientProfileDetailResponseSchema(updatedPatient);
};

export default {
  getProfileService,
  updateProfileService,
};

