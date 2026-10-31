import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  adminPromotionDetailResponseSchema,
  adminPromotionListItemResponseSchema,
} from '../../../dtos/departments/admins/adminPromotionDto.js';

/**
 * Sinh mã khuyến mãi ngẫu nhiên duy nhất nếu không được truyền
 */
const generateUniquePromotionCode = async () => {
  for (let i = 0; i < 5; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidateCode = `KM-${randomSuffix}`;
    const existing = await prisma.khuyenMai.findUnique({
      where: { maKhuyenMai: candidateCode },
      select: { id: true },
    });
    if (!existing) return candidateCode;
  }
  return `KM-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * getPromotionsListService
 * Lấy danh sách chương trình khuyến mãi / voucher có phân trang, bộ lọc và tìm kiếm
 */
export const getPromotionsListService = async ({
  page = 1,
  limit = 10,
  status = 'ALL',
  discountType = 'ALL',
  timeStatus = 'ALL',
  search = '',
}) => {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (status && status !== 'ALL') {
    where.trangThai = status;
  }

  if (discountType && discountType !== 'ALL') {
    where.loaiGiam = discountType;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (timeStatus === 'UPCOMING') {
    where.ngayBatDau = { gt: today };
  } else if (timeStatus === 'HAPPENING') {
    where.ngayBatDau = { lte: today };
    where.ngayKetThuc = { gte: today };
  } else if (timeStatus === 'EXPIRED') {
    where.ngayKetThuc = { lt: today };
  }

  const cleanSearch = (search || '').trim();
  if (cleanSearch) {
    where.OR = [
      { maKhuyenMai: { contains: cleanSearch, mode: 'insensitive' } },
      { tenChuongTrinh: { contains: cleanSearch, mode: 'insensitive' } },
    ];
  }

  const [rawPromotions, totalItems] = await Promise.all([
    prisma.khuyenMai.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            hoaDon: true,
          },
        },
      },
    }),
    prisma.khuyenMai.count({ where }),
  ]);

  const promotions = rawPromotions.map(adminPromotionListItemResponseSchema);
  const totalPages = Math.ceil(totalItems / limitNum);

  return {
    promotions,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalItems,
    },
  };
};

/**
 * getPromotionDetailService
 * Lấy chi tiết thông tin một chương trình khuyến mãi theo UUID
 */
export const getPromotionDetailService = async (id) => {
  const promotion = await prisma.khuyenMai.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          hoaDon: true,
        },
      },
    },
  });

  if (!promotion) {
    throw new ApiError(404, 'Không tìm thấy thông tin chương trình khuyến mãi');
  }

  return adminPromotionDetailResponseSchema(promotion);
};

/**
 * createPromotionService
 * Thêm mới chương trình khuyến mãi (Level 0)
 */
export const createPromotionService = async ({
  code,
  programName,
  discountType,
  discountValue,
  startDate,
  endDate,
  maxUsageCount,
  status = 'hoat_dong',
}) => {
  let promoCode = (code || '').trim().toUpperCase();

  if (promoCode) {
    const existing = await prisma.khuyenMai.findUnique({
      where: { maKhuyenMai: promoCode },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(409, `Mã khuyến mãi '${promoCode}' đã tồn tại trong hệ thống`);
    }
  } else {
    promoCode = await generateUniquePromotionCode();
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    throw new ApiError(400, 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');
  }

  const newPromotion = await prisma.khuyenMai.create({
    data: {
      maKhuyenMai: promoCode,
      tenChuongTrinh: programName.trim(),
      loaiGiam: discountType,
      giaTriGiam: discountValue,
      ngayBatDau: start,
      ngayKetThuc: end,
      soLanSuDungToiDa: maxUsageCount ?? null,
      trangThai: status,
    },
    include: {
      _count: {
        select: {
          hoaDon: true,
        },
      },
    },
  });

  return adminPromotionDetailResponseSchema(newPromotion);
};

/**
 * updatePromotionService
 * Cập nhật thông tin chương trình khuyến mãi
 */
export const updatePromotionService = async (id, data) => {
  const existingPromo = await prisma.khuyenMai.findUnique({
    where: { id },
    select: {
      id: true,
      maKhuyenMai: true,
      ngayBatDau: true,
      ngayKetThuc: true,
    },
  });

  if (!existingPromo) {
    throw new ApiError(404, 'Không tìm thấy chương trình khuyến mãi để cập nhật');
  }

  const updateData = {};

  if (data.programName !== undefined) {
    updateData.tenChuongTrinh = data.programName.trim();
  }

  if (data.discountType !== undefined) {
    updateData.loaiGiam = data.discountType;
  }

  if (data.discountValue !== undefined) {
    updateData.giaTriGiam = data.discountValue;
  }

  const newStart = data.startDate ? new Date(data.startDate) : existingPromo.ngayBatDau;
  const newEnd = data.endDate ? new Date(data.endDate) : existingPromo.ngayKetThuc;

  if (data.startDate !== undefined) {
    updateData.ngayBatDau = newStart;
  }

  if (data.endDate !== undefined) {
    updateData.ngayKetThuc = newEnd;
  }

  if (newEnd < newStart) {
    throw new ApiError(400, 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');
  }

  if (data.maxUsageCount !== undefined) {
    updateData.soLanSuDungToiDa = data.maxUsageCount ?? null;
  }

  if (data.status !== undefined) {
    updateData.trangThai = data.status;
  }

  if (data.code !== undefined) {
    const newCode = data.code ? data.code.trim().toUpperCase() : null;
    if (newCode && newCode !== existingPromo.maKhuyenMai) {
      const codeCheck = await prisma.khuyenMai.findUnique({
        where: { maKhuyenMai: newCode },
        select: { id: true },
      });
      if (codeCheck) {
        throw new ApiError(409, `Mã khuyến mãi '${newCode}' đã tồn tại trong hệ thống`);
      }
      updateData.maKhuyenMai = newCode;
    }
  }

  const updatedPromotion = await prisma.khuyenMai.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: {
          hoaDon: true,
        },
      },
    },
  });

  return adminPromotionDetailResponseSchema(updatedPromotion);
};

/**
 * updatePromotionStatusService
 * Bật / tắt trạng thái hoạt động của khuyến mãi (hoat_dong <-> da_huy <-> het_han)
 */
export const updatePromotionStatusService = async (id, status) => {
  const existingPromo = await prisma.khuyenMai.findUnique({
    where: { id },
    select: { id: true, trangThai: true },
  });

  if (!existingPromo) {
    throw new ApiError(404, 'Không tìm thấy chương trình khuyến mãi để thay đổi trạng thái');
  }

  const updatedPromotion = await prisma.khuyenMai.update({
    where: { id },
    data: { trangThai: status },
    include: {
      _count: {
        select: {
          hoaDon: true,
        },
      },
    },
  });

  return adminPromotionDetailResponseSchema(updatedPromotion);
};
