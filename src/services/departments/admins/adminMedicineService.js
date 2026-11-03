import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  adminMedicineDetailResponseSchema,
  adminMedicineListItemResponseSchema,
} from '../../../dtos/departments/admins/adminMedicineDto.js';

/**
 * Sinh mã thuốc ngẫu nhiên duy nhất nếu không được truyền vào (TH-XXXX)
 */
const generateUniqueMedicineCode = async () => {
  for (let i = 0; i < 5; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidateCode = `TH-${randomSuffix}`;
    const existing = await prisma.thuoc.findUnique({
      where: { maThuoc: candidateCode },
      select: { id: true },
    });
    if (!existing) return candidateCode;
  }
  return `TH-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * getMedicinesListService
 * Lấy danh sách thuốc trong thư viện có phân trang, bộ lọc (nhóm, trạng thái) và tìm kiếm
 */
export const getMedicinesListService = async ({
  page = 1,
  limit = 10,
  group = 'ALL',
  status = 'ALL',
  search = '',
}) => {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (group && group !== 'ALL') {
    where.nhomThuoc = group;
  }

  if (status && status !== 'ALL') {
    where.trangThai = status;
  }

  const cleanSearch = typeof search === 'string' ? search.trim() : '';
  if (cleanSearch) {
    where.OR = [
      { tenThuoc: { contains: cleanSearch, mode: 'insensitive' } },
      { hoatChat: { contains: cleanSearch, mode: 'insensitive' } },
      { tenBietDuoc: { contains: cleanSearch, mode: 'insensitive' } },
      { maThuoc: { contains: cleanSearch, mode: 'insensitive' } },
    ];
  }

  const [rawMedicines, totalItems] = await Promise.all([
    prisma.thuoc.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { chiTietDonThuoc: true },
        },
      },
    }),
    prisma.thuoc.count({ where }),
  ]);

  const medicines = rawMedicines.map(adminMedicineListItemResponseSchema);
  const totalPages = Math.ceil(totalItems / limitNum);

  return {
    medicines,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalItems,
    },
  };
};

/**
 * getMedicineDetailService
 * Lấy thông tin chi tiết một loại thuốc theo UUID
 */
export const getMedicineDetailService = async (id) => {
  const medicine = await prisma.thuoc.findUnique({
    where: { id },
    include: {
      _count: {
        select: { chiTietDonThuoc: true },
      },
    },
  });

  if (!medicine) {
    throw new ApiError(404, 'Không tìm thấy thông tin thuốc yêu cầu');
  }

  return adminMedicineDetailResponseSchema(medicine);
};

/**
 * createMedicineService
 * Thêm mới một loại thuốc vào thư viện (Level 0 - Master Data)
 */
export const createMedicineService = async ({
  name,
  code,
  brandName,
  activeIngredient,
  strength,
  dosageForm,
  route,
  unit,
  group,
  defaultDosage,
  defaultFrequency = 2,
  defaultTiming,
  defaultInstructions,
  contraindications,
  referencePrice = 0,
  status = 'hoat_dong',
}) => {
  let medicineCode = code ? code.trim() : null;

  if (medicineCode) {
    const existing = await prisma.thuoc.findUnique({
      where: { maThuoc: medicineCode },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(409, `Mã thuốc '${medicineCode}' đã tồn tại trong hệ thống`);
    }
  } else {
    medicineCode = await generateUniqueMedicineCode();
  }

  const newMedicine = await prisma.thuoc.create({
    data: {
      maThuoc: medicineCode,
      tenThuoc: name.trim(),
      tenBietDuoc: brandName ? brandName.trim() : null,
      hoatChat: activeIngredient ? activeIngredient.trim() : null,
      hamLuong: strength ? strength.trim() : null,
      dangBaoChe: dosageForm ? dosageForm.trim() : null,
      duongDung: route ? route.trim() : null,
      donViTinh: unit.trim(),
      nhomThuoc: group ? group.trim() : null,
      lieuDungMacDinh: defaultDosage ? defaultDosage.trim() : null,
      soLanNgayMacDinh: defaultFrequency,
      thoiDiemUongMacDinh: defaultTiming ? defaultTiming.trim() : null,
      huongDanMacDinh: defaultInstructions ? defaultInstructions.trim() : null,
      chongChiDinh: contraindications ? contraindications.trim() : null,
      giaThamKhao: referencePrice,
      trangThai: status,
    },
    include: {
      _count: {
        select: { chiTietDonThuoc: true },
      },
    },
  });

  return adminMedicineDetailResponseSchema(newMedicine);
};

/**
 * updateMedicineService
 * Cập nhật thông tin chi tiết của một loại thuốc
 */
export const updateMedicineService = async (id, data) => {
  const existingMedicine = await prisma.thuoc.findUnique({
    where: { id },
    select: { id: true, maThuoc: true },
  });

  if (!existingMedicine) {
    throw new ApiError(404, 'Không tìm thấy thuốc để cập nhật');
  }

  const updateData = {};

  if (data.name !== undefined) {
    updateData.tenThuoc = data.name.trim();
  }

  if (data.brandName !== undefined) {
    updateData.tenBietDuoc = data.brandName ? data.brandName.trim() : null;
  }

  if (data.activeIngredient !== undefined) {
    updateData.hoatChat = data.activeIngredient ? data.activeIngredient.trim() : null;
  }

  if (data.strength !== undefined) {
    updateData.hamLuong = data.strength ? data.strength.trim() : null;
  }

  if (data.dosageForm !== undefined) {
    updateData.dangBaoChe = data.dosageForm ? data.dosageForm.trim() : null;
  }

  if (data.route !== undefined) {
    updateData.duongDung = data.route ? data.route.trim() : null;
  }

  if (data.unit !== undefined) {
    updateData.donViTinh = data.unit.trim();
  }

  if (data.group !== undefined) {
    updateData.nhomThuoc = data.group ? data.group.trim() : null;
  }

  if (data.defaultDosage !== undefined) {
    updateData.lieuDungMacDinh = data.defaultDosage ? data.defaultDosage.trim() : null;
  }

  if (data.defaultFrequency !== undefined) {
    updateData.soLanNgayMacDinh = data.defaultFrequency;
  }

  if (data.defaultTiming !== undefined) {
    updateData.thoiDiemUongMacDinh = data.defaultTiming ? data.defaultTiming.trim() : null;
  }

  if (data.defaultInstructions !== undefined) {
    updateData.huongDanMacDinh = data.defaultInstructions ? data.defaultInstructions.trim() : null;
  }

  if (data.contraindications !== undefined) {
    updateData.chongChiDinh = data.contraindications ? data.contraindications.trim() : null;
  }

  if (data.referencePrice !== undefined) {
    updateData.giaThamKhao = data.referencePrice;
  }

  if (data.status !== undefined) {
    updateData.trangThai = data.status;
  }

  if (data.code !== undefined && data.code !== null && data.code.trim() !== '') {
    const newCode = data.code.trim();
    if (newCode !== existingMedicine.maThuoc) {
      const codeCheck = await prisma.thuoc.findUnique({
        where: { maThuoc: newCode },
        select: { id: true },
      });
      if (codeCheck) {
        throw new ApiError(409, `Mã thuốc '${newCode}' đã tồn tại trong hệ thống`);
      }
      updateData.maThuoc = newCode;
    }
  }

  const updatedMedicine = await prisma.thuoc.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: { chiTietDonThuoc: true },
      },
    },
  });

  return adminMedicineDetailResponseSchema(updatedMedicine);
};

/**
 * updateMedicineStatusService
 * Bật / tắt trạng thái hoạt động của thuốc (hoat_dong <-> ngung_hoat_dong)
 */
export const updateMedicineStatusService = async (id, status) => {
  const existingMedicine = await prisma.thuoc.findUnique({
    where: { id },
    select: { id: true, trangThai: true },
  });

  if (!existingMedicine) {
    throw new ApiError(404, 'Không tìm thấy thuốc để thay đổi trạng thái');
  }

  const updatedMedicine = await prisma.thuoc.update({
    where: { id },
    data: { trangThai: status },
    include: {
      _count: {
        select: { chiTietDonThuoc: true },
      },
    },
  });

  return adminMedicineDetailResponseSchema(updatedMedicine);
};

