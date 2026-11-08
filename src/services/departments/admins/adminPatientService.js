import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  adminPatientDetailResponseSchema,
} from '../../../dtos/departments/admins/adminPatientDto.js';

// Query include chung để lấy đầy đủ thông tin hành chính, lịch sử khám và phác đồ điều trị
const patientFullInclude = {
  taiKhoan: { select: { username: true } },
  lichHen: {
    orderBy: { ngayHen: 'desc' },
    include: {
      dichVu: { select: { tenDichVu: true } },
      caLamViec: {
        include: {
          nhaSi: { select: { hoTen: true } },
          phongDieuTri: { select: { tenPhong: true } },
        },
      },
      hoSoBenhAn: {
        include: {
          dichVuDieuTri: {
            include: {
              dichVu: true,
            },
          },
          vatTuSuDung: {
            include: {
              sanPham: true,
            },
          },
          donThuoc: {
            include: {
              chiTietDonThuoc: {
                include: {
                  thuoc: true,
                },
              },
            },
          },
        },
      },
    },
  },
  phacDoDieuTri: {
    orderBy: { createdAt: 'desc' },
    include: {
      nhaSi: { select: { hoTen: true } },
      giaiDoanPhacDo: {
        orderBy: { buocSo: 'asc' },
      },
    },
  },
};

/**
 * getPatientsListService
 * Lấy danh sách bệnh nhân phân trang, tìm kiếm chỉ theo mã bệnh nhân hoặc SĐT
 */
export const getPatientsListService = async ({ page = 1, limit = 15, search = '' }) => {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 15;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  // Tìm kiếm chỉ theo mã bệnh nhân (maBenhNhan) hoặc số điện thoại (sdt)
  const cleanSearch = typeof search === 'string' ? search.trim() : '';
  if (cleanSearch) {
    where.OR = [
      { maBenhNhan: { contains: cleanSearch, mode: 'insensitive' } },
      { sdt: { contains: cleanSearch } },
    ];
  }

  const [rawPatients, totalItems] = await Promise.all([
    prisma.benhNhan.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: patientFullInclude,
    }),
    prisma.benhNhan.count({ where }),
  ]);

  const patients = rawPatients.map(adminPatientDetailResponseSchema);
  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  return {
    patients,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalItems,
    },
  };
};

/**
 * getPatientDetailService
 * Lấy chi tiết hồ sơ bệnh nhân theo UUID (kèm tiền sử y tế, lịch sử ca khám và phác đồ điều trị)
 */
export const getPatientDetailService = async (id) => {
  const patient = await prisma.benhNhan.findUnique({
    where: { id },
    include: patientFullInclude,
  });

  if (!patient) {
    throw new ApiError(404, 'Không tìm thấy hồ sơ bệnh nhân yêu cầu');
  }

  return adminPatientDetailResponseSchema(patient);
};

/**
 * updatePatientService
 * Cập nhật thông tin bệnh nhân theo UUID (họ tên, ngày sinh, giới tính, SĐT, email, địa chỉ, tiền sử bệnh, dị ứng)
 */
export const updatePatientService = async (id, data) => {
  const existing = await prisma.benhNhan.findUnique({
    where: { id },
    select: { id: true, sdt: true, email: true },
  });

  if (!existing) {
    throw new ApiError(404, 'Không tìm thấy hồ sơ bệnh nhân để cập nhật');
  }

  const updateData = {};

  const nameVal = data.fullName ?? data.hoTen;
  if (nameVal !== undefined) updateData.hoTen = nameVal.trim();

  const birthDateVal = data.birthDate ?? data.ngaySinh;
  if (birthDateVal !== undefined) {
    updateData.ngaySinh = birthDateVal ? new Date(birthDateVal) : null;
  }

  const genderVal = data.gender ?? data.gioiTinh;
  if (genderVal !== undefined) {
    const g = genderVal.toLowerCase();
    updateData.gioiTinh = g === 'female' || g === 'nu' ? 'nu' : g === 'male' || g === 'nam' ? 'nam' : 'khac';
  }

  const phoneVal = data.phone ?? data.sdt;
  if (phoneVal !== undefined) {
    const cleanPhone = phoneVal ? phoneVal.trim() : null;
    if (cleanPhone && cleanPhone !== existing.sdt) {
      const phoneCheck = await prisma.benhNhan.findUnique({
        where: { sdt: cleanPhone },
        select: { id: true },
      });
      if (phoneCheck) {
        throw new ApiError(409, `Số điện thoại '${cleanPhone}' đã được sử dụng bởi bệnh nhân khác`);
      }
    }
    updateData.sdt = cleanPhone;
  }

  if (data.email !== undefined) {
    const cleanEmail = data.email ? data.email.trim() : null;
    if (cleanEmail && cleanEmail !== existing.email) {
      const emailCheck = await prisma.benhNhan.findUnique({
        where: { email: cleanEmail },
        select: { id: true },
      });
      if (emailCheck) {
        throw new ApiError(409, `Email '${cleanEmail}' đã được sử dụng bởi bệnh nhân khác`);
      }
    }
    updateData.email = cleanEmail;
  }

  const addressVal = data.address ?? data.diaChi;
  if (addressVal !== undefined) updateData.diaChi = addressVal ? addressVal.trim() : null;

  const medHistoryVal = data.medicalHistory ?? data.tienSuBenh;
  if (medHistoryVal !== undefined) {
    updateData.tienSuBenh = Array.isArray(medHistoryVal)
      ? medHistoryVal.join(', ')
      : medHistoryVal ? String(medHistoryVal).trim() : null;
  }

  const allergiesVal = data.allergies ?? data.diUng;
  if (allergiesVal !== undefined) {
    updateData.diUng = Array.isArray(allergiesVal)
      ? allergiesVal.join(', ')
      : allergiesVal ? String(allergiesVal).trim() : null;
  }

  const notesVal = data.notes ?? data.ghiChu;
  if (notesVal !== undefined) updateData.ghiChu = notesVal ? String(notesVal).trim() : null;

  const updatedPatient = await prisma.benhNhan.update({
    where: { id },
    data: updateData,
    include: patientFullInclude,
  });

  return adminPatientDetailResponseSchema(updatedPatient);
};

export const createPatientService = async (data) => {
  const hoTen = (data.fullName || data.hoTen || '').trim();
  if (!hoTen) {
    throw new ApiError(400, 'Họ và tên bệnh nhân là bắt buộc');
  }

  let sdt = (data.phone || data.sdt || '').trim();
  if (sdt) {
    const existingPhone = await prisma.benhNhan.findUnique({ where: { sdt } });
    if (existingPhone) {
      throw new ApiError(409, 'Số điện thoại này đã được sử dụng bởi bệnh nhân khác');
    }
  } else {
    sdt = null;
  }

  let email = (data.email || '').trim().toLowerCase();
  if (email) {
    const existingEmail = await prisma.benhNhan.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ApiError(409, 'Email này đã được sử dụng bởi bệnh nhân khác');
    }
  } else {
    email = null;
  }

  let code = '';
  let isUnique = false;
  while (!isUnique) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    code = `BN-${randomDigits}`;
    const existing = await prisma.benhNhan.findUnique({ where: { maBenhNhan: code } });
    if (!existing) isUnique = true;
  }

  const rawDob = data.dateOfBirth || data.birthDate || data.ngaySinh;
  const ngaySinh = rawDob ? new Date(rawDob) : null;
  const gioiTinh = data.gender || data.gioiTinh || 'khac';
  const diaChi = data.address || data.diaChi || null;
  const tienSuBenh = data.medicalHistory || data.tienSuBenh ? String(data.medicalHistory || data.tienSuBenh).trim() : null;
  const diUng = data.allergies || data.diUng ? String(data.allergies || data.diUng).trim() : null;

  const patient = await prisma.benhNhan.create({
    data: {
      maBenhNhan: code,
      hoTen,
      sdt,
      email,
      ngaySinh,
      gioiTinh,
      diaChi,
      tienSuBenh,
      diUng,
    },
    include: patientFullInclude,
  });

  return adminPatientDetailResponseSchema(patient);
};
