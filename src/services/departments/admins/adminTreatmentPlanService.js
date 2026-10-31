import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  adminTreatmentPlanDetailResponseSchema,
  adminTreatmentPlanListItemResponseSchema,
  adminTreatmentStageResponseSchema,
} from '../../../dtos/departments/admins/adminTreatmentPlanDto.js';

/**
 * Sinh mã phác đồ mẫu ngẫu nhiên duy nhất nếu không được truyền
 */
const generateUniquePlanCode = async () => {
  for (let i = 0; i < 5; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidateCode = `PDM-${randomSuffix}`;
    const existing = await prisma.phacDoMau.findUnique({
      where: { maPhacDoMau: candidateCode },
      select: { id: true },
    });
    if (!existing) return candidateCode;
  }
  return `PDM-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * getTreatmentPlansListService
 * Lấy danh sách phác đồ mẫu (Level 0) có phân trang, bộ lọc trạng thái và tìm kiếm
 */
export const getTreatmentPlansListService = async ({
  page = 1,
  limit = 10,
  status = 'ALL',
  search = '',
}) => {
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
      { tenPhacDoMau: { contains: cleanSearch, mode: 'insensitive' } },
      { maPhacDoMau: { contains: cleanSearch, mode: 'insensitive' } },
    ];
  }

  const [rawPlans, totalItems] = await Promise.all([
    prisma.phacDoMau.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            giaiDoanMau: true,
            phacDoDieuTri: true,
          },
        },
      },
    }),
    prisma.phacDoMau.count({ where }),
  ]);

  const treatmentPlans = rawPlans.map(adminTreatmentPlanListItemResponseSchema);
  const totalPages = Math.ceil(totalItems / limitNum);

  return {
    treatmentPlans,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalItems,
    },
  };
};

/**
 * getTreatmentPlanDetailService
 * Lấy chi tiết thông tin một phác đồ mẫu kèm toàn bộ danh sách các giai đoạn con
 */
export const getTreatmentPlanDetailService = async (id) => {
  const plan = await prisma.phacDoMau.findUnique({
    where: { id },
    include: {
      giaiDoanMau: {
        orderBy: { buocSo: 'asc' },
      },
      _count: {
        select: {
          phacDoDieuTri: true,
        },
      },
    },
  });

  if (!plan) {
    throw new ApiError(404, 'Không tìm thấy thông tin phác đồ mẫu yêu cầu');
  }

  return adminTreatmentPlanDetailResponseSchema(plan);
};

/**
 * createTreatmentPlanService
 * Tạo mới phác đồ mẫu (Level 0) kèm danh sách giai đoạn ban đầu nếu có
 */
export const createTreatmentPlanService = async ({
  name,
  code,
  description,
  status = 'hoat_dong',
  stages = [],
}) => {
  let planCode = (code || '').trim().toUpperCase();

  if (planCode) {
    const existing = await prisma.phacDoMau.findUnique({
      where: { maPhacDoMau: planCode },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(409, `Mã phác đồ '${planCode}' đã tồn tại trong hệ thống`);
    }
  } else {
    planCode = await generateUniquePlanCode();
  }

  return await prisma.$transaction(async (tx) => {
    const newPlan = await tx.phacDoMau.create({
      data: {
        maPhacDoMau: planCode,
        tenPhacDoMau: name.trim(),
        moTa: description ? description.trim() : null,
        trangThai: status,
        giaiDoanMau:
          stages && stages.length > 0
            ? {
                create: stages.map((st, index) => ({
                  buocSo: st.stepNumber || index + 1,
                  tenGiaiDoan: st.name.trim(),
                  tenDichVu: st.serviceName ? st.serviceName.trim() : null,
                  moTa: st.description ? st.description.trim() : null,
                  thoiGianNghiGiuaBuoc: st.restingTime ? st.restingTime.trim() : null,
                })),
              }
            : undefined,
      },
      include: {
        giaiDoanMau: {
          orderBy: { buocSo: 'asc' },
        },
        _count: {
          select: {
            phacDoDieuTri: true,
          },
        },
      },
    });

    return adminTreatmentPlanDetailResponseSchema(newPlan);
  });
};

/**
 * updateTreatmentPlanService
 * Cập nhật thông tin phác đồ mẫu cha
 */
export const updateTreatmentPlanService = async (id, data) => {
  const existingPlan = await prisma.phacDoMau.findUnique({
    where: { id },
    select: { id: true, maPhacDoMau: true },
  });

  if (!existingPlan) {
    throw new ApiError(404, 'Không tìm thấy phác đồ mẫu để cập nhật');
  }

  const updateData = {};

  if (data.name !== undefined) {
    updateData.tenPhacDoMau = data.name.trim();
  }

  if (data.description !== undefined) {
    updateData.moTa = data.description ? data.description.trim() : null;
  }

  if (data.status !== undefined) {
    updateData.trangThai = data.status;
  }

  if (data.code !== undefined) {
    const newCode = data.code ? data.code.trim().toUpperCase() : null;
    if (newCode && newCode !== existingPlan.maPhacDoMau) {
      const codeCheck = await prisma.phacDoMau.findUnique({
        where: { maPhacDoMau: newCode },
        select: { id: true },
      });
      if (codeCheck) {
        throw new ApiError(409, `Mã phác đồ '${newCode}' đã tồn tại trong hệ thống`);
      }
      updateData.maPhacDoMau = newCode;
    }
  }

  const updatedPlan = await prisma.phacDoMau.update({
    where: { id },
    data: updateData,
    include: {
      giaiDoanMau: {
        orderBy: { buocSo: 'asc' },
      },
      _count: {
        select: {
          phacDoDieuTri: true,
        },
      },
    },
  });

  return adminTreatmentPlanDetailResponseSchema(updatedPlan);
};

/**
 * updateTreatmentPlanStatusService
 * Bật / tắt trạng thái hoạt động của phác đồ mẫu (hoat_dong <-> ngung_hoat_dong)
 */
export const updateTreatmentPlanStatusService = async (id, status) => {
  const existingPlan = await prisma.phacDoMau.findUnique({
    where: { id },
    select: { id: true, trangThai: true },
  });

  if (!existingPlan) {
    throw new ApiError(404, 'Không tìm thấy phác đồ mẫu để thay đổi trạng thái');
  }

  const updatedPlan = await prisma.phacDoMau.update({
    where: { id },
    data: { trangThai: status },
    include: {
      giaiDoanMau: {
        orderBy: { buocSo: 'asc' },
      },
      _count: {
        select: {
          phacDoDieuTri: true,
        },
      },
    },
  });

  return adminTreatmentPlanDetailResponseSchema(updatedPlan);
};

/**
 * createTreatmentStageService
 * Thêm một giai đoạn / bước điều trị mới vào phác đồ mẫu
 */
export const createTreatmentStageService = async (
  planId,
  { stepNumber, name, serviceName, description, restingTime }
) => {
  const plan = await prisma.phacDoMau.findUnique({
    where: { id: planId },
    select: { id: true, tenPhacDoMau: true },
  });

  if (!plan) {
    throw new ApiError(404, 'Không tìm thấy phác đồ mẫu để thêm giai đoạn');
  }

  let finalStep = stepNumber;

  if (finalStep) {
    const existingStep = await prisma.giaiDoanPhacDoMau.findFirst({
      where: {
        phacDoMauId: planId,
        buocSo: finalStep,
      },
      select: { id: true },
    });
    if (existingStep) {
      throw new ApiError(409, `Bước số ${finalStep} đã tồn tại trong phác đồ này`);
    }
  } else {
    const maxStepRecord = await prisma.giaiDoanPhacDoMau.findFirst({
      where: { phacDoMauId: planId },
      orderBy: { buocSo: 'desc' },
      select: { buocSo: true },
    });
    finalStep = (maxStepRecord?.buocSo ?? 0) + 1;
  }

  const newStage = await prisma.giaiDoanPhacDoMau.create({
    data: {
      phacDoMauId: planId,
      buocSo: finalStep,
      tenGiaiDoan: name.trim(),
      tenDichVu: serviceName ? serviceName.trim() : null,
      moTa: description ? description.trim() : null,
      thoiGianNghiGiuaBuoc: restingTime ? restingTime.trim() : null,
    },
  });

  return adminTreatmentStageResponseSchema(newStage);
};

/**
 * updateTreatmentStageService
 * Chỉnh sửa thông tin một giai đoạn điều trị mẫu
 */
export const updateTreatmentStageService = async (stageId, data) => {
  const existingStage = await prisma.giaiDoanPhacDoMau.findUnique({
    where: { id: stageId },
    select: { id: true, phacDoMauId: true, buocSo: true },
  });

  if (!existingStage) {
    throw new ApiError(404, 'Không tìm thấy giai đoạn điều trị mẫu để cập nhật');
  }

  const updateData = {};

  if (data.name !== undefined) {
    updateData.tenGiaiDoan = data.name.trim();
  }

  if (data.serviceName !== undefined) {
    updateData.tenDichVu = data.serviceName ? data.serviceName.trim() : null;
  }

  if (data.description !== undefined) {
    updateData.moTa = data.description ? data.description.trim() : null;
  }

  if (data.restingTime !== undefined) {
    updateData.thoiGianNghiGiuaBuoc = data.restingTime ? data.restingTime.trim() : null;
  }

  if (data.stepNumber !== undefined && data.stepNumber !== existingStage.buocSo) {
    const stepConflict = await prisma.giaiDoanPhacDoMau.findFirst({
      where: {
        phacDoMauId: existingStage.phacDoMauId,
        buocSo: data.stepNumber,
      },
      select: { id: true },
    });
    if (stepConflict) {
      throw new ApiError(409, `Bước số ${data.stepNumber} đã tồn tại trong phác đồ này`);
    }
    updateData.buocSo = data.stepNumber;
  }

  const updatedStage = await prisma.giaiDoanPhacDoMau.update({
    where: { id: stageId },
    data: updateData,
  });

  return adminTreatmentStageResponseSchema(updatedStage);
};

/**
 * deleteTreatmentStageService
 * Xóa một bước thừa/nhập nhầm trong phác đồ mẫu
 * (Chỉ cho phép khi phác đồ mẫu này chưa từng được gán cho bệnh nhân nào)
 */
export const deleteTreatmentStageService = async (stageId) => {
  const existingStage = await prisma.giaiDoanPhacDoMau.findUnique({
    where: { id: stageId },
    select: {
      id: true,
      phacDoMauId: true,
      tenGiaiDoan: true,
      phacDoMau: {
        select: {
          tenPhacDoMau: true,
          _count: {
            select: {
              phacDoDieuTri: true,
            },
          },
        },
      },
    },
  });

  if (!existingStage) {
    throw new ApiError(404, 'Không tìm thấy giai đoạn điều trị mẫu để xóa');
  }

  const appliedCount = existingStage.phacDoMau?._count?.phacDoDieuTri ?? 0;
  if (appliedCount > 0) {
    throw new ApiError(
      400,
      `Không thể xóa giai đoạn '${existingStage.tenGiaiDoan}' vì phác đồ mẫu '${existingStage.phacDoMau.tenPhacDoMau}' đã được áp dụng trong ${appliedCount} hồ sơ điều trị bệnh nhân.`
    );
  }

  await prisma.giaiDoanPhacDoMau.delete({
    where: { id: stageId },
  });

  return {
    deletedId: stageId,
    deletedName: existingStage.tenGiaiDoan,
  };
};
