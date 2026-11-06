import prisma from '../../config/prisma.js';
import { ApiError } from '../../common/errorMiddleware.js';
import { clientPrescriptionItemResponseSchema } from '../../dtos/clients/clientPrescriptionDto.js';

/**
 * getPrescriptionsListService
 * Lấy danh sách các đơn thuốc phân trang của bệnh nhân đang đăng nhập,
 * sắp xếp mới nhất lên đầu, bao gồm toàn bộ chi tiết danh mục thuốc
 * @param {string} patientId - ID bệnh nhân (benh_nhan.id)
 * @param {{ page: number, limit: number }} options
 */
export const getPrescriptionsListService = async (patientId, { page = 1, limit = 10 }) => {
  if (!patientId) {
    throw new ApiError(400, 'Không xác định được danh tính bệnh nhân');
  }

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    hoSoBenhAn: {
      lichHen: {
        benhNhanId: patientId,
      },
    },
  };

  const [totalRecords, records] = await Promise.all([
    prisma.donThuoc.count({ where }),
    prisma.donThuoc.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        ngayKe: 'desc',
      },
      include: {
        nhaSi: true,
        hoSoBenhAn: {
          include: {
            lichHen: true,
          },
        },
        chiTietDonThuoc: true,
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
    records: records.map(clientPrescriptionItemResponseSchema),
  };
};

export default {
  getPrescriptionsListService,
};

