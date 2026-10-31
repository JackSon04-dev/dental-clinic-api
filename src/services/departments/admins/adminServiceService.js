import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  adminServiceListItemResponseSchema,
  adminServiceDetailResponseSchema,
  adminServiceItemResponseSchema,
} from '../../../dtos/departments/admins/adminServiceDto.js';

/**
 * Sinh mã dịch vụ ngẫu nhiên duy nhất nếu không được truyền
 */
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
 * Sinh mã chi tiết dịch vụ ngẫu nhiên duy nhất nếu không được truyền
 */
const generateUniqueItemCode = async () => {
  for (let i = 0; i < 5; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidateCode = `CTDV-${randomSuffix}`;
    const existing = await prisma.chiTietDichVu.findUnique({
      where: { maChiTiet: candidateCode },
      select: { id: true },
    });
    if (!existing) return candidateCode;
  }
  return `CTDV-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * getServicesListService
 * Lấy danh sách dịch vụ cha (Level 0) có phân trang, bộ lọc trạng thái và tìm kiếm
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
        chiTietDichVu: {
          select: {
            gia: true,
            trangThai: true,
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
 * Lấy chi tiết thông tin dịch vụ cha kèm toàn bộ danh sách gói con
 */
export const getServiceDetailService = async (id) => {
  const service = await prisma.dichVu.findUnique({
    where: { id },
    include: {
      chiTietDichVu: {
        orderBy: { createdAt: 'asc' },
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
 * Tạo mới dịch vụ cha (Level 0)
 */
export const createServiceService = async ({
  name,
  code,
  description,
  processInfo,
  estimatedDurationMinutes = 30,
  status = 'hoat_dong',
}) => {
  let serviceCode = (code || '').trim();

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

  const newService = await prisma.dichVu.create({
    data: {
      maDichVu: serviceCode,
      tenDichVu: name.trim(),
      moTa: description ? description.trim() : null,
      thongTinQuyTrinh: processInfo ? processInfo.trim() : null,
      thoiGianDuKienPhut: estimatedDurationMinutes,
      trangThai: status,
    },
    include: {
      chiTietDichVu: true,
    },
  });

  return adminServiceDetailResponseSchema(newService);
};

/**
 * updateServiceService
 * Cập nhật thông tin dịch vụ cha
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

  if (data.name !== undefined) {
    updateData.tenDichVu = data.name.trim();
  }

  if (data.description !== undefined) {
    updateData.moTa = data.description ? data.description.trim() : null;
  }

  if (data.processInfo !== undefined) {
    updateData.thongTinQuyTrinh = data.processInfo ? data.processInfo.trim() : null;
  }

  if (data.estimatedDurationMinutes !== undefined) {
    updateData.thoiGianDuKienPhut = data.estimatedDurationMinutes;
  }

  if (data.status !== undefined) {
    updateData.trangThai = data.status;
  }

  if (data.code !== undefined) {
    const newCode = data.code ? data.code.trim() : null;
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

  const updatedService = await prisma.dichVu.update({
    where: { id },
    data: updateData,
    include: {
      chiTietDichVu: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return adminServiceDetailResponseSchema(updatedService);
};

/**
 * updateServiceStatusService
 * Bật / tắt trạng thái hoạt động của dịch vụ cha
 * Khi chuyển sang 'ngung_hoat_dong', cascade cập nhật toàn bộ gói chi tiết con trực thuộc
 */
export const updateServiceStatusService = async (id, status) => {
  const existingService = await prisma.dichVu.findUnique({
    where: { id },
    select: { id: true, trangThai: true },
  });

  if (!existingService) {
    throw new ApiError(404, 'Không tìm thấy dịch vụ để thay đổi trạng thái');
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.dichVu.update({
      where: { id },
      data: { trangThai: status },
      include: {
        chiTietDichVu: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Nếu ngưng hoạt động dịch vụ cha, ngưng hoạt động toàn bộ gói con
    if (status === 'ngung_hoat_dong') {
      await tx.chiTietDichVu.updateMany({
        where: { dichVuId: id },
        data: { trangThai: 'ngung_hoat_dong' },
      });

      // Nạp lại danh sách gói con sau khi update
      const updatedItems = await tx.chiTietDichVu.findMany({
        where: { dichVuId: id },
        orderBy: { createdAt: 'asc' },
      });
      updated.chiTietDichVu = updatedItems;
    }

    return adminServiceDetailResponseSchema(updated);
  });
};

/**
 * createServiceItemService
 * Thêm mới gói / chi tiết dịch vụ (Level 1) vào một dịch vụ cha
 */
export const createServiceItemService = async (serviceId, { name, code, price, unit, status = 'hoat_dong' }) => {
  const service = await prisma.dichVu.findUnique({
    where: { id: serviceId },
    select: { id: true, trangThai: true },
  });

  if (!service) {
    throw new ApiError(404, 'Không tìm thấy dịch vụ cha để thêm gói chi tiết');
  }

  let itemCode = (code || '').trim();

  if (itemCode) {
    const existing = await prisma.chiTietDichVu.findUnique({
      where: { maChiTiet: itemCode },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(409, `Mã chi tiết dịch vụ '${itemCode}' đã tồn tại trong hệ thống`);
    }
  } else {
    itemCode = await generateUniqueItemCode();
  }

  const newItem = await prisma.chiTietDichVu.create({
    data: {
      dichVuId: serviceId,
      maChiTiet: itemCode,
      tenChiTiet: name.trim(),
      gia: price,
      donViTinh: unit.trim(),
      trangThai: status,
    },
  });

  return adminServiceItemResponseSchema(newItem);
};

/**
 * updateServiceItemService
 * Cập nhật thông tin gói / chi tiết dịch vụ
 */
export const updateServiceItemService = async (itemId, data) => {
  const existingItem = await prisma.chiTietDichVu.findUnique({
    where: { id: itemId },
    select: { id: true, maChiTiet: true },
  });

  if (!existingItem) {
    throw new ApiError(404, 'Không tìm thấy chi tiết dịch vụ để cập nhật');
  }

  const updateData = {};

  if (data.name !== undefined) {
    updateData.tenChiTiet = data.name.trim();
  }

  if (data.price !== undefined) {
    updateData.gia = data.price;
  }

  if (data.unit !== undefined) {
    updateData.donViTinh = data.unit.trim();
  }

  if (data.status !== undefined) {
    updateData.trangThai = data.status;
  }

  if (data.code !== undefined) {
    const newCode = data.code ? data.code.trim() : null;
    if (newCode && newCode !== existingItem.maChiTiet) {
      const codeCheck = await prisma.chiTietDichVu.findUnique({
        where: { maChiTiet: newCode },
        select: { id: true },
      });
      if (codeCheck) {
        throw new ApiError(409, `Mã chi tiết dịch vụ '${newCode}' đã tồn tại trong hệ thống`);
      }
      updateData.maChiTiet = newCode;
    }
  }

  const updatedItem = await prisma.chiTietDichVu.update({
    where: { id: itemId },
    data: updateData,
  });

  return adminServiceItemResponseSchema(updatedItem);
};

/**
 * updateServiceItemStatusService
 * Bật / tắt trạng thái hoạt động của gói chi tiết dịch vụ
 */
export const updateServiceItemStatusService = async (itemId, status) => {
  const existingItem = await prisma.chiTietDichVu.findUnique({
    where: { id: itemId },
    include: {
      dichVu: {
        select: { id: true, trangThai: true, tenDichVu: true },
      },
    },
  });

  if (!existingItem) {
    throw new ApiError(404, 'Không tìm thấy chi tiết dịch vụ để thay đổi trạng thái');
  }

  // Nếu muốn kích hoạt nhưng dịch vụ cha đang ngưng hoạt động -> cảnh báo
  if (status === 'hoat_dong' && existingItem.dichVu.trangThai === 'ngung_hoat_dong') {
    throw new ApiError(
      400,
      `Không thể kích hoạt gói này vì dịch vụ cha '${existingItem.dichVu.tenDichVu}' đang ở trạng thái ngưng hoạt động. Hãy kích hoạt dịch vụ cha trước.`
    );
  }

  const updatedItem = await prisma.chiTietDichVu.update({
    where: { id: itemId },
    data: { trangThai: status },
  });

  return adminServiceItemResponseSchema(updatedItem);
};

