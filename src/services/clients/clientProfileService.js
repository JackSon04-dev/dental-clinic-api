import prisma from '../../config/prisma.js';
import { ApiError } from '../../common/errorMiddleware.js';
import { uploadBufferToCloudinary } from '../../config/cloudinary.js';
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

  // 6. Cập nhật URL ảnh đại diện trực tiếp (nếu có)
  if (updateData.avatarUrl !== undefined) {
    dataToUpdate.hinhAnhUrl = updateData.avatarUrl ? updateData.avatarUrl.trim() : null;
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

/**
 * uploadAvatarService
 * Upload ảnh đại diện lên Cloudinary và lưu URL vào database
 * Hỗ trợ toàn bộ user trừ admin (BENH_NHAN, BAC_SI, LE_TAN)
 * Yêu cầu: UUID của access token phải khớp với UUID của record muốn cập nhật
 */
export const uploadAvatarService = async (authInfo, maybeFile) => {
  // Chuẩn hóa tham số: hỗ trợ cả signature cũ (profileId, userId, file) và mới ({ role, profileId, userId, targetId }, file)
  let role = 'BENH_NHAN';
  let profileId = null;
  let userId = null;
  let targetId = null;
  let file = maybeFile;

  if (typeof authInfo === 'object' && authInfo !== null && (authInfo.role || authInfo.userId || authInfo.profileId)) {
    role = authInfo.role || 'BENH_NHAN';
    profileId = authInfo.profileId || null;
    userId = authInfo.userId || null;
    targetId = authInfo.targetId || null;
  } else {
    profileId = authInfo;
    userId = arguments[1];
    file = arguments[2];
  }

  if (!file || !file.buffer) {
    throw new ApiError(400, 'Vui lòng chọn file ảnh để tải lên (trường form-data: avatar)');
  }

  // Xác thực bảo mật: UUID của access token phải khớp với UUID của record muốn cập nhật
  if (targetId && targetId !== profileId && targetId !== userId) {
    throw new ApiError(403, 'UUID của access token không khớp với UUID của record muốn cập nhật');
  }

  const normalizedRole = String(role || 'BENH_NHAN').toUpperCase();
  if (normalizedRole === 'ADMIN') {
    throw new ApiError(403, 'Tài khoản quản trị viên không sử dụng endpoint này');
  }

  let entityRecord = null;
  let publicIdPrefix = 'user';

  if (normalizedRole === 'BENH_NHAN') {
    const whereCondition = {};
    if (profileId) {
      whereCondition.id = profileId;
    } else if (userId) {
      whereCondition.taiKhoanId = userId;
    } else {
      throw new ApiError(400, 'Không xác định được danh tính bệnh nhân từ token');
    }

    entityRecord = await prisma.benhNhan.findFirst({
      where: whereCondition,
      select: { id: true, hoTen: true, sdt: true },
    });

    if (!entityRecord) {
      throw new ApiError(404, 'Không tìm thấy hồ sơ bệnh nhân');
    }
    publicIdPrefix = `patient_${entityRecord.id}`;
  } else if (normalizedRole === 'BAC_SI') {
    const whereCondition = {};
    if (profileId) {
      whereCondition.id = profileId;
    } else if (userId) {
      whereCondition.taiKhoanId = userId;
    } else {
      throw new ApiError(400, 'Không xác định được danh tính bác sĩ từ token');
    }

    entityRecord = await prisma.nhaSi.findFirst({
      where: whereCondition,
      select: { id: true, hoTen: true, sdt: true },
    });

    if (!entityRecord) {
      throw new ApiError(404, 'Không tìm thấy hồ sơ bác sĩ');
    }
    publicIdPrefix = `doctor_${entityRecord.id}`;
  } else if (normalizedRole === 'LE_TAN') {
    const whereCondition = {};
    if (profileId) {
      whereCondition.id = profileId;
    } else if (userId) {
      whereCondition.taiKhoanId = userId;
    } else {
      throw new ApiError(400, 'Không xác định được danh tính nhân viên từ token');
    }

    entityRecord = await prisma.nhanVien.findFirst({
      where: whereCondition,
      select: { id: true, hoTen: true, sdt: true },
    });

    if (!entityRecord) {
      throw new ApiError(404, 'Không tìm thấy hồ sơ nhân viên lễ tân');
    }
    publicIdPrefix = `staff_${entityRecord.id}`;
  } else {
    throw new ApiError(403, 'Vai trò không được phép cập nhật ảnh qua endpoint này');
  }

  // Upload buffer lên Cloudinary
  const uploadResult = await uploadBufferToCloudinary(file.buffer, {
    public_id: `${publicIdPrefix}_avatar`,
    overwrite: true,
  });

  const avatarUrl = uploadResult.secure_url;

  // Cập nhật URL ảnh vào bảng dữ liệu tương ứng
  if (normalizedRole === 'BENH_NHAN') {
    const updatedPatient = await prisma.benhNhan.update({
      where: { id: entityRecord.id },
      data: {
        hinhAnhUrl: avatarUrl,
      },
      include: {
        taiKhoan: {
          select: {
            username: true,
            trangThai: true,
          },
        },
      },
    });

    return {
      avatarUrl,
      patient: clientProfileDetailResponseSchema(updatedPatient),
    };
  } else if (normalizedRole === 'BAC_SI') {
    await prisma.nhaSi.update({
      where: { id: entityRecord.id },
      data: {
        hinhAnhUrl: avatarUrl,
      },
    });

    return {
      avatarUrl,
      doctor: {
        id: entityRecord.id,
        fullName: entityRecord.hoTen,
        avatarUrl,
      },
    };
  } else {
    await prisma.nhanVien.update({
      where: { id: entityRecord.id },
      data: {
        hinhAnhUrl: avatarUrl,
      },
    });

    return {
      avatarUrl,
      staff: {
        id: entityRecord.id,
        fullName: entityRecord.hoTen,
        avatarUrl,
      },
    };
  }
};

export default {
  getProfileService,
  updateProfileService,
  uploadAvatarService,
};

