import prisma from '../../config/prisma.js';
import { ApiError } from '../../common/errorMiddleware.js';
import {
  clientTreatmentHistoryListItemResponseSchema,
  clientTreatmentHistoryDetailResponseSchema,
} from '../../dtos/clients/clientTreatmentHistoryDto.js';

/**
 * getTreatmentHistoryListService
 * Lấy danh sách hồ sơ bệnh án có phân trang của bệnh nhân đang đăng nhập
 * @param {string} patientId - ID bệnh nhân (benh_nhan.id)
 * @param {{ page: number, limit: number }} options
 */
export const getTreatmentHistoryListService = async (patientId, { page = 1, limit = 10 }) => {
  if (!patientId) {
    throw new ApiError(400, 'Không xác định được danh tính bệnh nhân');
  }

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    lichHen: {
      benhNhanId: patientId,
    },
  };

  const [totalRecords, records] = await Promise.all([
    prisma.hoSoBenhAn.count({ where }),
    prisma.hoSoBenhAn.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        ngayKham: 'desc',
      },
      include: {
        lichHen: {
          include: {
            dichVu: true,
            caLamViec: {
              include: {
                nhaSi: true,
                phongDieuTri: true,
              },
            },
            giaiDoanPhacDo: {
              include: {
                phacDoDieuTri: true,
              },
            },
            hoaDon: {
              include: {
                khuyenMai: true,
              },
            },
          },
        },
        dichVuDieuTri: {
          include: {
            chiTietDichVu: true,
          },
        },
        vatTuSuDung: {
          include: {
            sanPham: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalRecords / limitNum);

  return {
    pagination: {
      currentPage: pageNum,
      limit: limitNum,
      totalRecords,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
    records: records.map(clientTreatmentHistoryListItemResponseSchema),
  };
};

/**
 * getTreatmentHistoryDetailService
 * Lấy toàn bộ chi tiết của một hồ sơ bệnh án cụ thể (dịch vụ, vật tư, viện phí/hóa đơn)
 * Kiểm tra chặt chẽ quyền sở hữu (multi-tenant security)
 * @param {string} patientId - ID bệnh nhân (benh_nhan.id)
 * @param {string} recordId - ID hồ sơ bệnh án (ho_so_benh_an.id)
 */
export const getTreatmentHistoryDetailService = async (patientId, recordId) => {
  if (!patientId) {
    throw new ApiError(400, 'Không xác định được danh tính bệnh nhân');
  }

  if (!recordId) {
    throw new ApiError(400, 'Vui lòng cung cấp mã hồ sơ bệnh án');
  }

  const record = await prisma.hoSoBenhAn.findFirst({
    where: {
      id: recordId,
      lichHen: {
        benhNhanId: patientId,
      },
    },
    include: {
      lichHen: {
        include: {
          dichVu: true,
          caLamViec: {
            include: {
              nhaSi: true,
              phongDieuTri: true,
            },
          },
          giaiDoanPhacDo: {
            include: {
              phacDoDieuTri: true,
            },
          },
          hoaDon: {
            include: {
              nhanVien: true,
              khuyenMai: true,
            },
          },
        },
      },
      dichVuDieuTri: {
        include: {
          chiTietDichVu: true,
        },
      },
      vatTuSuDung: {
        include: {
          sanPham: true,
        },
      },
    },
  });

  if (!record) {
    throw new ApiError(
      404,
      'Không tìm thấy thông tin hồ sơ bệnh án hoặc bạn không có quyền truy cập hồ sơ này'
    );
  }

  return clientTreatmentHistoryDetailResponseSchema(record);
};

export default {
  getTreatmentHistoryListService,
  getTreatmentHistoryDetailService,
};

