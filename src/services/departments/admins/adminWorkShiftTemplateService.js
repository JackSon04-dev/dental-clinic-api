import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  adminWorkShiftTemplatesMatrixResponseSchema,
  adminWorkShiftTemplateDetailResponseSchema,
  formatTimeHHMM,
  DAY_NAMES,
} from '../../../dtos/departments/admins/adminWorkShiftTemplateDto.js';

/**
 * getWorkShiftTemplatesMatrixService
 * Lấy ma trận khung ca làm việc mẫu 1 tuần theo phòng điều trị
 * @param {Object} query { roomId }
 */
export const getWorkShiftTemplatesMatrixService = async ({
  roomId = null,
} = {}) => {
  const where = {};
  if (roomId) where.phongDieuTriId = roomId;

  const roomWhere = { trangThai: 'hoat_dong' };
  if (roomId) roomWhere.id = roomId;

  // Lấy đồng thời danh mục phòng, bác sĩ và danh sách khung ca mẫu
  const [rooms, doctors, templates] = await Promise.all([
    prisma.phongDieuTri.findMany({
      where: roomWhere,
      orderBy: { maPhong: 'asc' },
    }),
    prisma.nhaSi.findMany({
      where: { trangThai: 'dang_lam_viec' },
      orderBy: { maNhaSi: 'asc' },
    }),
    prisma.khungCaLamViec.findMany({
      where,
      include: {
        phongDieuTri: true,
        nhaSi: true,
      },
      orderBy: [
        { thuTrongTuan: 'asc' },
        { gioBatDau: 'asc' },
      ],
    }),
  ]);

  return adminWorkShiftTemplatesMatrixResponseSchema({
    templates,
    rooms,
    doctors,
  });
};


/**
 * updateWorkShiftTemplateDoctorService
 * Thay đổi bác sĩ phụ trách ca làm việc trong khung mẫu (Dynamic Shift Template)
 * - Kiểm tra bác sĩ có đang làm việc
 * - Kiểm tra chống trùng lịch: Không cho phép 1 bác sĩ trực 2 phòng cùng lúc trong cùng 1 khung giờ
 * @param {string} templateId UUID ca mẫu cần cập nhật
 * @param {Object} param { doctorId, notes }
 */
export const updateWorkShiftTemplateDoctorService = async (
  templateId,
  { doctorId, notes = undefined }
) => {
  // 1. Kiểm tra ca mẫu có tồn tại
  const template = await prisma.khungCaLamViec.findUnique({
    where: { id: templateId },
    include: {
      phongDieuTri: true,
      nhaSi: true,
    },
  });

  if (!template) {
    throw new ApiError(404, 'Không tìm thấy ca làm việc mẫu trong hệ thống');
  }

  // 2. Kiểm tra bác sĩ mới có tồn tại và đang làm việc
  const doctor = await prisma.nhaSi.findUnique({
    where: { id: doctorId },
  });

  if (!doctor) {
    throw new ApiError(404, 'Bác sĩ được chỉ định không tồn tại');
  }

  if (doctor.trangThai === 'nghi_viec') {
    throw new ApiError(400, `Bác sĩ ${doctor.hoTen} đã nghỉ việc, không thể phân công vào ca mẫu`);
  }

  // 3. Kiểm tra chống trùng ca trực trong cùng khung giờ:
  // Tại cùng thuTrongTuan và gioBatDau, bác sĩ này đã trực ở phòng khác chưa?
  const existingConflict = await prisma.khungCaLamViec.findFirst({
    where: {
      id: { not: templateId },
      thuTrongTuan: template.thuTrongTuan,
      gioBatDau: template.gioBatDau,
      nhaSiId: doctorId,
    },
    include: {
      phongDieuTri: true,
    },
  });

  if (existingConflict) {
    const dayName = DAY_NAMES[template.thuTrongTuan] || `Thứ ${template.thuTrongTuan}`;
    const timeStr = formatTimeHHMM(template.gioBatDau);
    const roomName = existingConflict.phongDieuTri?.tenPhong || existingConflict.phongDieuTri?.maPhong || 'phòng khác';

    throw new ApiError(
      409,
      `Trùng lịch trực: Bác sĩ ${doctor.hoTen} (${doctor.maNhaSi}) đã được phân công trực tại ${roomName} vào ${dayName} lúc ${timeStr}. Vui lòng chọn bác sĩ khác!`
    );
  }

  // 4. Cập nhật bác sĩ phụ trách ca mẫu
  const updateData = {
    nhaSiId: doctorId,
  };
  if (notes !== undefined) {
    updateData.ghiChu = notes;
  }

  const updatedTemplate = await prisma.khungCaLamViec.update({
    where: { id: templateId },
    data: updateData,
    include: {
      phongDieuTri: true,
      nhaSi: true,
    },
  });

  return adminWorkShiftTemplateDetailResponseSchema(updatedTemplate);
};
