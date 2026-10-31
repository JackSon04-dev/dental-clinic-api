import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  adminProductDetailResponseSchema,
  adminProductListItemResponseSchema,
} from '../../../dtos/departments/admins/adminProductDto.js';

/**
 * Sinh mã sản phẩm ngẫu nhiên duy nhất nếu không được truyền
 */
const generateUniqueProductCode = async () => {
  for (let i = 0; i < 5; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidateCode = `SP-${randomSuffix}`;
    const existing = await prisma.sanPham.findUnique({
      where: { maSanPham: candidateCode },
      select: { id: true },
    });
    if (!existing) return candidateCode;
  }
  return `SP-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * getProductsListService
 * Lấy danh sách sản phẩm / vật tư có phân trang, bộ lọc (loại, trạng thái, tồn kho, dịch vụ) và tìm kiếm
 */
export const getProductsListService = async ({
  page = 1,
  limit = 10,
  type = 'ALL',
  status = 'ALL',
  stockAlert = 'ALL',
  serviceId,
  search = '',
}) => {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (type && type !== 'ALL') {
    where.loai = type;
  }

  if (status && status !== 'ALL') {
    where.trangThai = status;
  }

  if (serviceId) {
    where.dichVuId = serviceId;
  }

  // Xử lý bộ lọc cảnh báo tồn kho
  if (stockAlert === 'OUT_OF_STOCK') {
    where.soLuongTon = 0;
  } else if (stockAlert === 'LOW_STOCK') {
    const lowStockRecords = await prisma.$queryRaw`
      SELECT id FROM san_pham WHERE so_luong_ton <= muc_ton_toi_thieu
    `;
    const lowStockIds = lowStockRecords.map((r) => r.id);
    where.id = { in: lowStockIds };
  }

  const cleanSearch = (search || '').trim();
  if (cleanSearch) {
    where.OR = [
      { tenSanPham: { contains: cleanSearch, mode: 'insensitive' } },
      { maSanPham: { contains: cleanSearch, mode: 'insensitive' } },
    ];
  }

  const [rawProducts, totalItems] = await Promise.all([
    prisma.sanPham.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        dichVu: {
          select: {
            id: true,
            maDichVu: true,
            tenDichVu: true,
          },
        },
      },
    }),
    prisma.sanPham.count({ where }),
  ]);

  const products = rawProducts.map(adminProductListItemResponseSchema);
  const totalPages = Math.ceil(totalItems / limitNum);

  return {
    products,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalItems,
    },
  };
};

/**
 * getProductDetailService
 * Lấy chi tiết thông tin sản phẩm / vật tư theo UUID
 */
export const getProductDetailService = async (id) => {
  const product = await prisma.sanPham.findUnique({
    where: { id },
    include: {
      dichVu: {
        select: {
          id: true,
          maDichVu: true,
          tenDichVu: true,
        },
      },
    },
  });

  if (!product) {
    throw new ApiError(404, 'Không tìm thấy thông tin sản phẩm yêu cầu');
  }

  return adminProductDetailResponseSchema(product);
};

/**
 * createProductService
 * Thêm mới sản phẩm / vật tư (Level 0)
 */
export const createProductService = async ({
  name,
  code,
  type,
  unit,
  price = 0,
  stockQuantity = 0,
  minStockThreshold = 0,
  serviceId,
  description,
  status = 'hoat_dong',
}) => {
  let productCode = (code || '').trim();

  if (productCode) {
    const existing = await prisma.sanPham.findUnique({
      where: { maSanPham: productCode },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(409, `Mã sản phẩm '${productCode}' đã tồn tại trong hệ thống`);
    }
  } else {
    productCode = await generateUniqueProductCode();
  }

  // Kiểm tra dịch vụ liên kết nếu có truyền
  if (serviceId) {
    const serviceExists = await prisma.dichVu.findUnique({
      where: { id: serviceId },
      select: { id: true },
    });
    if (!serviceExists) {
      throw new ApiError(404, 'Không tìm thấy dịch vụ để liên kết với sản phẩm');
    }
  }

  const newProduct = await prisma.sanPham.create({
    data: {
      maSanPham: productCode,
      tenSanPham: name.trim(),
      loai: type,
      donViTinh: unit.trim(),
      giaBan: price,
      soLuongTon: stockQuantity,
      mucTonToiThieu: minStockThreshold,
      dichVuId: serviceId || null,
      moTa: description ? description.trim() : null,
      trangThai: status,
    },
    include: {
      dichVu: {
        select: {
          id: true,
          maDichVu: true,
          tenDichVu: true,
        },
      },
    },
  });

  return adminProductDetailResponseSchema(newProduct);
};

/**
 * updateProductService
 * Cập nhật thông tin sản phẩm / vật tư
 */
export const updateProductService = async (id, data) => {
  const existingProduct = await prisma.sanPham.findUnique({
    where: { id },
    select: { id: true, maSanPham: true },
  });

  if (!existingProduct) {
    throw new ApiError(404, 'Không tìm thấy sản phẩm để cập nhật');
  }

  const updateData = {};

  if (data.name !== undefined) {
    updateData.tenSanPham = data.name.trim();
  }

  if (data.type !== undefined) {
    updateData.loai = data.type;
  }

  if (data.unit !== undefined) {
    updateData.donViTinh = data.unit.trim();
  }

  if (data.price !== undefined) {
    updateData.giaBan = data.price;
  }

  if (data.stockQuantity !== undefined) {
    updateData.soLuongTon = data.stockQuantity;
  }

  if (data.minStockThreshold !== undefined) {
    updateData.mucTonToiThieu = data.minStockThreshold;
  }

  if (data.description !== undefined) {
    updateData.moTa = data.description ? data.description.trim() : null;
  }

  if (data.status !== undefined) {
    updateData.trangThai = data.status;
  }

  if (data.serviceId !== undefined) {
    if (data.serviceId) {
      const serviceExists = await prisma.dichVu.findUnique({
        where: { id: data.serviceId },
        select: { id: true },
      });
      if (!serviceExists) {
        throw new ApiError(404, 'Không tìm thấy dịch vụ để liên kết với sản phẩm');
      }
      updateData.dichVuId = data.serviceId;
    } else {
      updateData.dichVuId = null;
    }
  }

  if (data.code !== undefined) {
    const newCode = data.code ? data.code.trim() : null;
    if (newCode && newCode !== existingProduct.maSanPham) {
      const codeCheck = await prisma.sanPham.findUnique({
        where: { maSanPham: newCode },
        select: { id: true },
      });
      if (codeCheck) {
        throw new ApiError(409, `Mã sản phẩm '${newCode}' đã tồn tại trong hệ thống`);
      }
      updateData.maSanPham = newCode;
    }
  }

  const updatedProduct = await prisma.sanPham.update({
    where: { id },
    data: updateData,
    include: {
      dichVu: {
        select: {
          id: true,
          maDichVu: true,
          tenDichVu: true,
        },
      },
    },
  });

  return adminProductDetailResponseSchema(updatedProduct);
};

/**
 * updateProductStatusService
 * Bật / tắt trạng thái hoạt động của sản phẩm (hoat_dong <-> ngung_hoat_dong)
 */
export const updateProductStatusService = async (id, status) => {
  const existingProduct = await prisma.sanPham.findUnique({
    where: { id },
    select: { id: true, trangThai: true },
  });

  if (!existingProduct) {
    throw new ApiError(404, 'Không tìm thấy sản phẩm để thay đổi trạng thái');
  }

  const updatedProduct = await prisma.sanPham.update({
    where: { id },
    data: { trangThai: status },
    include: {
      dichVu: {
        select: {
          id: true,
          maDichVu: true,
          tenDichVu: true,
        },
      },
    },
  });

  return adminProductDetailResponseSchema(updatedProduct);
};
