import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  adminInvoiceListItemResponseSchema,
  adminInvoiceDetailResponseSchema,
} from '../../../dtos/departments/admins/adminInvoiceDto.js';

/**
 * Common include object để truy vấn liên kết 3NF hóa đơn
 */
const invoiceRelationsInclude = {
  lichHen: {
    include: {
      benhNhan: true,
      caLamViec: {
        include: {
          nhaSi: true,
        },
      },
      dichVu: true,
      giaiDoanPhacDo: {
        include: {
          phacDoDieuTri: true,
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
        },
      },
    },
  },
  phacDoDieuTri: true,
  nhanVien: true,
  khuyenMai: true,
  chiTietHoaDon: {
    include: {
      dichVu: true,
      sanPham: true,
    },
  },
};

/**
 * getInvoicesListService
 * Lấy danh sách hóa đơn viện phí có phân trang, bộ lọc và tìm kiếm
 */
export const getInvoicesListService = async ({
  page = 1,
  limit = 10,
  status = 'ALL',
  paymentMethod = 'ALL',
  fromDate = null,
  toDate = null,
  search = '',
  appointmentId = null,
}) => {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  // Bộ lọc theo lịch hẹn cụ thể
  if (appointmentId) {
    where.lichHenId = appointmentId;
  }

  // Bộ lọc theo trạng thái thanh toán
  if (status && status !== 'ALL') {
    where.trangThaiThanhToan = status;
  }

  // Bộ lọc theo phương thức thanh toán
  if (paymentMethod && paymentMethod !== 'ALL') {
    where.phuongThucThanhToan = paymentMethod;
  }

  // Bộ lọc theo khoảng ngày lập hóa đơn
  if (fromDate || toDate) {
    where.ngayLap = {};
    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      where.ngayLap.gte = start;
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      where.ngayLap.lte = end;
    }
  }

  // Tìm kiếm theo mã hóa đơn, tên bệnh nhân, số điện thoại bệnh nhân
  if (search && search.trim() !== '') {
    const keyword = search.trim();
    where.OR = [
      { maHoaDon: { contains: keyword, mode: 'insensitive' } },
      {
        lichHen: {
          benhNhan: {
            hoTen: { contains: keyword, mode: 'insensitive' },
          },
        },
      },
      {
        lichHen: {
          benhNhan: {
            sdt: { contains: keyword },
          },
        },
      },
    ];
  }

  const [totalItems, rawInvoices] = await Promise.all([
    prisma.hoaDon.count({ where }),
    prisma.hoaDon.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: [{ ngayLap: 'desc' }, { dotThanhToan: 'asc' }],
      include: invoiceRelationsInclude,
    }),
  ]);

  const totalPages = Math.ceil(totalItems / limitNum) || 1;
  const items = rawInvoices.map((inv) => adminInvoiceListItemResponseSchema(inv));

  return {
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
    },
  };
};

/**
 * getInvoiceDetailService
 * Lấy chi tiết toàn bộ hóa đơn viện phí kèm bảng kê dịch vụ và vật tư
 */
export const getInvoiceDetailService = async (id) => {
  const invoice = await prisma.hoaDon.findUnique({
    where: { id },
    include: invoiceRelationsInclude,
  });

  if (!invoice) {
    throw new ApiError(404, 'Không tìm thấy hóa đơn viện phí');
  }

  return adminInvoiceDetailResponseSchema(invoice);
};

/**
 * updateInvoicePaymentService
 * Xác nhận thanh toán hóa đơn viện phí (chua_thanh_toan -> da_thanh_toan)
 */
export const updateInvoicePaymentService = async (
  id,
  {
    paymentMethod,
    paymentDate,
    note,
    khuyenMaiId,
    voucherId,
    giamGia,
    discountAmount,
    soTienThanhToan,
    finalAmount,
  }
) => {
  const invoice = await prisma.hoaDon.findUnique({
    where: { id },
    include: {
      lichHen: {
        include: {
          giaiDoanPhacDo: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new ApiError(404, 'Không tìm thấy hóa đơn viện phí');
  }

  const targetVoucherId = khuyenMaiId || voucherId || invoice.khuyenMaiId || null;
  const targetDiscount = discountAmount !== undefined ? discountAmount : (giamGia !== undefined ? giamGia : undefined);
  const targetFinal = finalAmount !== undefined ? finalAmount : (soTienThanhToan !== undefined ? soTienThanhToan : undefined);

  if (invoice.trangThaiThanhToan === 'da_thanh_toan') {
    // Hóa đơn đã thanh toán: cho phép cập nhật lại phương thức thanh toán và ghi chú đối soát
    const updateData = {
      phuongThucThanhToan: paymentMethod,
      ghiChu: note !== undefined ? note : invoice.ghiChu,
    };
    if (targetVoucherId) updateData.khuyenMaiId = targetVoucherId;
    if (targetDiscount !== undefined) updateData.giamGia = targetDiscount;
    if (targetFinal !== undefined) updateData.soTienThanhToan = targetFinal;

    await prisma.hoaDon.update({
      where: { id },
      data: updateData,
    });
    const updatedInvoice = await prisma.hoaDon.findUnique({
      where: { id },
      include: invoiceRelationsInclude,
    });
    return adminInvoiceDetailResponseSchema(updatedInvoice);
  }

  if (invoice.trangThaiThanhToan === 'da_huy') {
    throw new ApiError(400, 'Không thể thanh toán hóa đơn đã bị hủy');
  }

  const paidTimestamp = paymentDate ? new Date(paymentDate) : new Date();

  // Thực hiện transaction cập nhật hóa đơn và đồng bộ giai đoạn phác đồ nếu có
  await prisma.$transaction(async (tx) => {
    // 1. Cập nhật hóa đơn
    const updateData = {
      trangThaiThanhToan: 'da_thanh_toan',
      phuongThucThanhToan: paymentMethod,
      ngayThanhToan: paidTimestamp,
      ghiChu: note !== undefined ? note : invoice.ghiChu,
    };
    if (targetVoucherId) updateData.khuyenMaiId = targetVoucherId;
    if (targetDiscount !== undefined) updateData.giamGia = targetDiscount;
    if (targetFinal !== undefined) updateData.soTienThanhToan = targetFinal;

    await tx.hoaDon.update({
      where: { id },
      data: updateData,
    });

    // 1.1. Nếu áp dụng voucher khuyến mãi, tăng 1 lượt đã sử dụng cho chương trình
    if (targetVoucherId) {
      await tx.khuyenMai.update({
        where: { id: targetVoucherId },
        data: {
          soLanDaSuDung: {
            increment: 1,
          },
        },
      });
    }

    // 2. Cập nhật trạng thái ca hẹn sang 'hoan_thanh' hoặc 'dang_dieu_tri' để kết thúc quy trình khám
    if (invoice.lichHenId) {
      await tx.lichHen.update({
        where: { id: invoice.lichHenId },
        data: {
          trangThai: 'dang_dieu_tri',
          updatedAt: new Date(),
        },
      });
    }
  });

  // Truy vấn lại chi tiết sau khi cập nhật
  const updatedInvoice = await prisma.hoaDon.findUnique({
    where: { id },
    include: invoiceRelationsInclude,
  });

  return adminInvoiceDetailResponseSchema(updatedInvoice);
};

/**
 * cancelInvoiceService
 * Hủy hóa đơn viện phí kèm lý do hủy
 */
export const cancelInvoiceService = async (id, { cancelReason }) => {
  const invoice = await prisma.hoaDon.findUnique({
    where: { id },
    include: {
      lichHen: {
        include: {
          giaiDoanPhacDo: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new ApiError(404, 'Không tìm thấy hóa đơn viện phí');
  }

  // RÀNG BUỘC R1: Bất biến hóa đơn viện phí đã hoàn tất thanh toán
  if (invoice.trangThaiThanhToan === 'da_thanh_toan') {
    throw new ApiError(400, 'Không thể hủy hóa đơn đã hoàn tất thanh toán viện phí');
  }

  if (invoice.trangThaiThanhToan === 'da_huy') {
    throw new ApiError(400, 'Hóa đơn này đã được hủy trước đó');
  }

  // Thực hiện transaction hủy hóa đơn và cập nhật giai đoạn phác đồ nếu cần
  await prisma.$transaction(async (tx) => {
    // 1. Cập nhật trạng thái hủy và lý do hủy
    await tx.hoaDon.update({
      where: { id },
      data: {
        trangThaiThanhToan: 'da_huy',
        lyDoHuy: cancelReason,
      },
    });

    // 1.1. Nếu hóa đơn có áp dụng voucher khuyến mãi, hoàn lại 1 lượt sử dụng cho chương trình
    if (invoice.khuyenMaiId) {
      await tx.khuyenMai.update({
        where: { id: invoice.khuyenMaiId },
        data: {
          soLanDaSuDung: {
            decrement: 1,
          },
        },
      });
    }
  });

  // Truy vấn lại chi tiết sau khi hủy
  const cancelledInvoice = await prisma.hoaDon.findUnique({
    where: { id },
    include: invoiceRelationsInclude,
  });

  return adminInvoiceDetailResponseSchema(cancelledInvoice);
};
