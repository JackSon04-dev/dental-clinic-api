import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  getVietnamTodayDateString,
  formatDateYYYYMMDD,
} from '../../../dtos/departments/admins/adminWorkShiftDto.js';
import {
  dentistTreatmentPlanListItemResponseSchema,
  dentistTreatmentPlanDetailResponseSchema,
} from '../../../dtos/departments/dentists/dentistTreatmentPlanDto.js';

/**
 * Sinh mã phác đồ điều trị ngẫu nhiên không trùng lặp
 */
const generateUniquePlanCode = async () => {
  const dateStr = getVietnamTodayDateString().replace(/-/g, '').slice(0, 6);
  for (let i = 0; i < 5; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `PT-${dateStr}-${randomSuffix}`;
    const existing = await prisma.phacDoDieuTri.findUnique({
      where: { maPhacDo: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return `PT-${dateStr}-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * Lấy danh sách phác đồ điều trị
 */
export const getTreatmentPlansService = async ({
  dentistId,
  patientId,
  status = 'ALL',
  search = '',
}) => {
  const where = {};

  if (dentistId) {
    where.nhaSiId = dentistId;
  }

  if (patientId) {
    where.benhNhanId = patientId;
  }

  if (status && status !== 'ALL') {
    if (status === 'ACTIVE') {
      where.trangThai = 'dang_dieu_tri';
    } else if (status === 'COMPLETED') {
      where.trangThai = 'hoan_thanh';
    } else {
      where.trangThai = status;
    }
  }

  const cleanSearch = (search || '').trim();
  if (cleanSearch) {
    where.OR = [
      { tenPhacDo: { contains: cleanSearch, mode: 'insensitive' } },
      { maPhacDo: { contains: cleanSearch, mode: 'insensitive' } },
      { benhNhan: { hoTen: { contains: cleanSearch, mode: 'insensitive' } } },
      { benhNhan: { sdt: { contains: cleanSearch } } },
    ];
  }

  const plans = await prisma.phacDoDieuTri.findMany({
    where,
    include: {
      benhNhan: true,
      nhaSi: true,
      giaiDoanPhacDo: {
        orderBy: { buocSo: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return plans.map(dentistTreatmentPlanListItemResponseSchema);
};

/**
 * Lấy chi tiết một phác đồ điều trị
 */
export const getTreatmentPlanDetailService = async (planId) => {
  const plan = await prisma.phacDoDieuTri.findUnique({
    where: { id: planId },
    include: {
      benhNhan: true,
      nhaSi: true,
      giaiDoanPhacDo: {
        orderBy: { buocSo: 'asc' },
      },
    },
  });

  if (!plan) {
    throw new ApiError(404, 'Không tìm thấy phác đồ điều trị');
  }

  return dentistTreatmentPlanDetailResponseSchema(plan);
};

/**
 * Tạo mới phác đồ điều trị cho bệnh nhân
 */
export const createTreatmentPlanService = async (dentistId, payload) => {
  const {
    patientId,
    title,
    samplePlanId,
    initialDiagnosis,
    paymentMethod = 'tung_giai_doan',
    startDate,
    estimatedEndDate,
    notes,
    phases = [],
  } = payload;

  // Xác thực bệnh nhân
  const patient = await prisma.benhNhan.findUnique({
    where: { id: patientId },
  });
  if (!patient) {
    throw new ApiError(404, 'Không tìm thấy thông tin bệnh nhân');
  }

  const currentDoctorId =
    dentistId || (await prisma.nhaSi.findFirst())?.id;
  if (!currentDoctorId) {
    throw new ApiError(400, 'Không tìm thấy thông tin bác sĩ điều trị');
  }

  const maPhacDo = await generateUniquePlanCode();

  const plan = await prisma.$transaction(async (tx) => {
    const createdPlan = await tx.phacDoDieuTri.create({
      data: {
        maPhacDo,
        benhNhanId: patientId,
        nhaSiId: currentDoctorId,
        phacDoMauId: samplePlanId || null,
        tenPhacDo: title,
        chanDoanBanDau: initialDiagnosis || null,
        hinhThucThanhToan: paymentMethod,
        trangThai: 'dang_dieu_tri',
        ngayBatDau: startDate ? new Date(startDate) : new Date(),
        ngayDuKienHoanThanh: estimatedEndDate ? new Date(estimatedEndDate) : null,
        ghiChu: notes || null,
      },
    });

    // Tạo các giai đoạn phác đồ
    if (phases.length > 0) {
      for (const phase of phases) {
        await tx.giaiDoanPhacDo.create({
          data: {
            phacDoId: createdPlan.id,
            buocSo: phase.stepNumber,
            tenGiaiDoan: phase.name,
            moTa: phase.description || null,
            moTaVatTuDichVu: phase.serviceDescription || null,
            chiPhi: Number(phase.cost) || 0,
            trangThai: 'chua_thuc_hien',
            ngayDuKien: phase.estimatedDate ? new Date(phase.estimatedDate) : null,
          },
        });
      }
    }

    return await tx.phacDoDieuTri.findUnique({
      where: { id: createdPlan.id },
      include: {
        benhNhan: true,
        nhaSi: true,
        giaiDoanPhacDo: {
          orderBy: { buocSo: 'asc' },
        },
      },
    });
  });

  return dentistTreatmentPlanDetailResponseSchema(plan);
};

/**
 * Cập nhật trạng thái của một giai đoạn trong phác đồ điều trị
 */
export const updatePhaseStatusService = async (
  planId,
  phaseId,
  status,
  completedDate = null
) => {
  let dbStatus = 'chua_thuc_hien';
  if (status === 'COMPLETED' || status === 'hoan_thanh') {
    dbStatus = 'hoan_thanh';
  } else if (status === 'IN_PROGRESS' || status === 'dang_thuc_hien') {
    dbStatus = 'dang_thuc_hien';
  } else {
    dbStatus = 'chua_thuc_hien';
  }

  const phase = await prisma.giaiDoanPhacDo.findFirst({
    where: { id: phaseId, phacDoId: planId },
  });

  if (!phase) {
    throw new ApiError(404, 'Không tìm thấy giai đoạn điều trị');
  }

  await prisma.giaiDoanPhacDo.update({
    where: { id: phaseId },
    data: {
      trangThai: dbStatus,
      ngayThucHien:
        dbStatus === 'hoan_thanh'
          ? completedDate
            ? new Date(completedDate)
            : new Date()
          : null,
      updatedAt: new Date(),
    },
  });

  // Kiểm tra xem tất cả các giai đoạn đã hoàn thành chưa
  const allPhases = await prisma.giaiDoanPhacDo.findMany({
    where: { phacDoId: planId },
  });

  const isAllCompleted = allPhases.every((p) => p.trangThai === 'hoan_thanh');
  if (isAllCompleted && allPhases.length > 0) {
    await prisma.phacDoDieuTri.update({
      where: { id: planId },
      data: {
        trangThai: 'hoan_thanh',
        ngayHoanThanhThucTe: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  const updatedPlan = await prisma.phacDoDieuTri.findUnique({
    where: { id: planId },
    include: {
      benhNhan: true,
      nhaSi: true,
      giaiDoanPhacDo: {
        orderBy: { buocSo: 'asc' },
      },
    },
  });

  return dentistTreatmentPlanDetailResponseSchema(updatedPlan);
};

export default {
  getTreatmentPlansService,
  getTreatmentPlanDetailService,
  createTreatmentPlanService,
  updatePhaseStatusService,
};
