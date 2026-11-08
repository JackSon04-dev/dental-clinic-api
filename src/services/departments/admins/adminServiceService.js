import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  adminServiceListItemResponseSchema,
  adminServiceDetailResponseSchema,
} from '../../../dtos/departments/admins/adminServiceDto.js';

const generateUniqueServiceCode = async () => {
  for (let i = 0; i < 5; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidateCode = `DV-${randomSuffix}`;
    const existing = await prisma.dichVu.findUnique({
      where: { maDichVu: candidateCode },
      select: { id: true },
    });
    if (!existing) return candidateCode;
  }
  return `DV-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * getServicesListService
 * Lấy danh sách dịch vụ trực tiếp có phân trang, bộ lọc trạng thái và tìm kiếm
 */
export const getServicesListService = async ({ page = 1, limit = 10, status = 'ALL', search = '' }) => {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (status && status !== 'ALL') {
    where.trangThai = status;
  }

  const cleanSearch = (search || '').trim();
  if (cleanSearch) {
    where.OR = [
      { tenDichVu: { contains: cleanSearch, mode: 'insensitive' } },
      { maDichVu: { contains: cleanSearch, mode: 'insensitive' } },
    ];
  }

  const [rawServices, totalItems] = await Promise.all([
    prisma.dichVu.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        sanPham: {
          select: {
            id: true,
            giaBan: true,
          },
        },
        _count: {
          select: {
            sanPham: true,
          },
        },
      },
    }),
    prisma.dichVu.count({ where }),
  ]);

  const services = rawServices.map(adminServiceListItemResponseSchema);
  const totalPages = Math.ceil(totalItems / limitNum);

  return {
    services,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalItems,
    },
  };
};

/**
 * getServiceDetailService
 * Lấy chi tiết thông tin dịch vụ trực tiếp
 */
export const getServiceDetailService = async (id) => {
  const service = await prisma.dichVu.findUnique({
    where: { id },
    include: {
      sanPham: {
        select: {
          id: true,
          maSanPham: true,
          tenSanPham: true,
          giaBan: true,
          donViTinh: true,
        },
      },
      _count: {
        select: {
          sanPham: true,
        },
      },
    },
  });

  if (!service) {
    throw new ApiError(404, 'Không tìm thấy thông tin dịch vụ yêu cầu');
  }

  return adminServiceDetailResponseSchema(service);
};

/**
 * createServiceService
 * Tạo mới dịch vụ trực tiếp với giá và đơn vị tính
 */
export const createServiceService = async (payload) => {
  const {
    name,
    tenDichVu,
    code,
    maDichVu,
    price,
    gia,
    unit,
    donViTinh,
    description,
    moTa,
    processInfo,
    thongTinQuyTrinh,
    estimatedDurationMinutes = 30,
    thoiGianDuKienPhut,
    status = 'hoat_dong',
    trangThai,
  } = payload;

  const rawCode = (code || maDichVu || '').trim();
  let serviceCode = rawCode;

  if (serviceCode) {
    const existing = await prisma.dichVu.findUnique({
      where: { maDichVu: serviceCode },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(409, `Mã dịch vụ '${serviceCode}' đã tồn tại trong hệ thống`);
    }
  } else {
    serviceCode = await generateUniqueServiceCode();
  }

  const finalName = (name || tenDichVu || '').trim();
  const finalPrice = gia !== undefined ? Number(gia) : (price !== undefined ? Number(price) : 0);
  const finalUnit = (donViTinh !== undefined && donViTinh !== null && String(donViTinh).trim() !== '') 
    ? String(donViTinh).trim() 
    : (unit !== undefined && unit !== null && String(unit).trim() !== '' ? String(unit).trim() : 'Lần');
  const finalDesc = description !== undefined ? description : moTa;
  const finalProc = processInfo !== undefined ? processInfo : thongTinQuyTrinh;
  const finalDuration = estimatedDurationMinutes !== undefined ? estimatedDurationMinutes : (thoiGianDuKienPhut ?? 30);
  const finalStatus = status || trangThai || 'hoat_dong';

  let newService;
  try {
    newService = await prisma.dichVu.create({
      data: {
        maDichVu: serviceCode,
        tenDichVu: finalName,
        gia: finalPrice,
        donViTinh: finalUnit,
        moTa: finalDesc ? finalDesc.trim() : null,
        thongTinQuyTrinh: finalProc ? finalProc.trim() : null,
        thoiGianDuKienPhut: Number(finalDuration),
        trangThai: finalStatus,
      },
      include: {
        sanPham: true,
        _count: {
          select: { sanPham: true },
        },
      },
    });
  } catch (err) {
    if (err?.code === 'P2002') {
      throw ApiError.conflict 
        ? ApiError.conflict('Mã dịch vụ đã tồn tại trong hệ thống') 
        : new ApiError(409, 'Mã dịch vụ đã tồn tại trong hệ thống');
    }
    throw err;
  }

  return adminServiceDetailResponseSchema(newService);
};

/**
 * updateServiceService
 * Cập nhật thông tin dịch vụ trực tiếp
 */
export const updateServiceService = async (id, data) => {
  const existingService = await prisma.dichVu.findUnique({
    where: { id },
    select: { id: true, maDichVu: true },
  });

  if (!existingService) {
    throw new ApiError(404, 'Không tìm thấy dịch vụ để cập nhật');
  }

  const updateData = {};

  if (data.name !== undefined || data.tenDichVu !== undefined) {
    updateData.tenDichVu = (data.name || data.tenDichVu).trim();
  }

  if (data.gia !== undefined || data.price !== undefined) {
    updateData.gia = data.gia !== undefined ? Number(data.gia) : Number(data.price);
  }

  if (data.donViTinh !== undefined || data.unit !== undefined) {
    const rawUnit = (data.donViTinh !== undefined && data.donViTinh !== null && String(data.donViTinh).trim() !== '')
      ? String(data.donViTinh).trim()
      : (data.unit !== undefined && data.unit !== null && String(data.unit).trim() !== '' ? String(data.unit).trim() : 'Lần');
    updateData.donViTinh = rawUnit;
  }

  if (data.description !== undefined || data.moTa !== undefined) {
    const desc = data.description !== undefined ? data.description : data.moTa;
    updateData.moTa = desc ? desc.trim() : null;
  }

  if (data.processInfo !== undefined || data.thongTinQuyTrinh !== undefined) {
    const proc = data.processInfo !== undefined ? data.processInfo : data.thongTinQuyTrinh;
    updateData.thongTinQuyTrinh = proc ? proc.trim() : null;
  }

  if (data.estimatedDurationMinutes !== undefined || data.thoiGianDuKienPhut !== undefined) {
    updateData.thoiGianDuKienPhut = Number(data.estimatedDurationMinutes ?? data.thoiGianDuKienPhut);
  }

  if (data.status !== undefined || data.trangThai !== undefined) {
    updateData.trangThai = data.status || data.trangThai;
  }

  const rawCode = data.code !== undefined ? data.code : data.maDichVu;
  if (rawCode !== undefined) {
    const newCode = rawCode ? rawCode.trim() : null;
    if (newCode && newCode !== existingService.maDichVu) {
      const codeCheck = await prisma.dichVu.findUnique({
        where: { maDichVu: newCode },
        select: { id: true },
      });
      if (codeCheck) {
        throw new ApiError(409, `Mã dịch vụ '${newCode}' đã tồn tại trong hệ thống`);
      }
      updateData.maDichVu = newCode;
    }
  }

  let updatedService;
  try {
    updatedService = await prisma.dichVu.update({
      where: { id },
      data: updateData,
      include: {
        sanPham: true,
        _count: {
          select: { sanPham: true },
        },
      },
    });
  } catch (err) {
    if (err?.code === 'P2002') {
      throw ApiError.conflict 
        ? ApiError.conflict(`Mã dịch vụ '${updateData.maDichVu || 'đã tồn tại'}' đã tồn tại trong hệ thống`) 
        : new ApiError(409, `Mã dịch vụ '${updateData.maDichVu || 'đã tồn tại'}' đã tồn tại trong hệ thống`);
    }
    throw err;
  }

  return adminServiceDetailResponseSchema(updatedService);
};

/**
 * updateServiceStatusService
 * Bật / tắt trạng thái hoạt động dịch vụ trực tiếp
 */
export const updateServiceStatusService = async (id, status) => {
  const existingService = await prisma.dichVu.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingService) {
    throw new ApiError(404, 'Không tìm thấy dịch vụ để thay đổi trạng thái');
  }

  const updated = await prisma.dichVu.update({
    where: { id },
    data: { trangThai: status },
    include: {
      sanPham: true,
      _count: {
        select: { sanPham: true },
      },
    },
  });

  return adminServiceDetailResponseSchema(updated);
};
