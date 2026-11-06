import prisma from '../../config/prisma.js';
import { ApiError } from '../../common/errorMiddleware.js';
import { clientTreatmentPlanListItemResponseSchema } from '../../dtos/clients/clientTreatmentPlanDto.js';

/**
 * getTreatmentPlansListService
 * Lấy danh sách các phác đồ điều trị phân trang của bệnh nhân đang đăng nhập,
 * sắp xếp mới nhất lên đầu, bao gồm toàn bộ danh sách các giai đoạn điều trị
 * @param {string} patientId - ID bệnh nhân (benh_nhan.id)
 * @param {{ page: number, limit: number }} options
 */
export const getTreatmentPlansListService = async (patientId, { page = 1, limit = 10 }) => {
  if (!patientId) {
    throw new ApiError(400, 'Không xác định được danh tính bệnh nhân');
  }

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    benhNhanId: patientId,
  };

  const [totalRecords, records] = await Promise.all([
    prisma.phacDoDieuTri.count({ where }),
    prisma.phacDoDieuTri.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        nhaSi: true,
        giaiDoanPhacDo: {
          orderBy: {
            buocSo: 'asc',
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
    records: records.map(clientTreatmentPlanListItemResponseSchema),
  };
};

export default {
  getTreatmentPlansListService,
};

