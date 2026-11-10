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
const parseSafeDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

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

const planIncludeQuery = {
  benhNhan: true,
  nhaSi: true,
  giaiDoanPhacDo: {
    include: {
      lichHen: {
        include: {
          dichVu: true,
          caLamViec: {
            include: {
              nhaSi: true,
            },
          },
        },
      },
    },
    orderBy: { buocSo: 'asc' },
  },
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
    include: planIncludeQuery,
    orderBy: { createdAt: 'desc' },
  });

  // Đồng bộ trạng thái phác đồ: Nếu toàn bộ giai đoạn đã hoàn thành, cập nhật phác đồ sang hoan_thanh
  for (const p of plans) {
    const phases = p.giaiDoanPhacDo || [];
    const isAllCompleted =
      phases.length > 0 &&
      phases.every(
        (ph) => ph.trangThai === 'hoan_thanh' || ph.trangThai === 'COMPLETED'
      );
    if (isAllCompleted && p.trangThai !== 'hoan_thanh') {
      await prisma.phacDoDieuTri.update({
        where: { id: p.id },
        data: {
          trangThai: 'hoan_thanh',
          ngayHoanThanhThucTe: p.ngayHoanThanhThucTe || new Date(),
          updatedAt: new Date(),
        },
      });
      p.trangThai = 'hoan_thanh';
    }
  }

  return plans.map(dentistTreatmentPlanListItemResponseSchema);
};

/**
 * Lấy chi tiết một phác đồ điều trị
 */
export const getTreatmentPlanDetailService = async (planId) => {
  const plan = await prisma.phacDoDieuTri.findUnique({
    where: { id: planId },
    include: planIncludeQuery,
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
        trangThai: 'dang_dieu_tri',
        ngayBatDau: parseSafeDate(startDate) || new Date(),
        ngayDuKienHoanThanh: parseSafeDate(estimatedEndDate),
        ghiChu: notes || null,
      },
    });

    // Tạo các giai đoạn phác đồ (thuần chuyên môn & tiến độ, không còn trường chi phí)
    if (phases.length > 0) {
      for (const phase of phases) {
        const validNgayDuKien = parseSafeDate(phase.estimatedDate);
        const ghiChu = validNgayDuKien
          ? (phase.notes || null)
          : (phase.notes ? `${phase.notes} (${phase.estimatedDate})` : (phase.estimatedDate || null));

        await tx.giaiDoanPhacDo.create({
          data: {
            phacDoId: createdPlan.id,
            buocSo: phase.stepNumber,
            tenGiaiDoan: phase.name,
            moTa: phase.description || null,
            moTaVatTuDichVu: phase.serviceDescription || null,
            trangThai: 'chua_thuc_hien',
            ngayDuKien: validNgayDuKien,
            ghiChu,
          },
        });
      }
    }

    return await tx.phacDoDieuTri.findUnique({
      where: { id: createdPlan.id },
      include: planIncludeQuery,
    });
  });

  return dentistTreatmentPlanDetailResponseSchema(plan);
};

/**
 * Cập nhật trạng thái của một giai đoạn trong phác đồ điều trị
 * Hỗ trợ nhận appointmentCode hoặc appointmentId làm minh chứng điều trị
 */
export const updatePhaseStatusService = async (
  arg1,
  arg2,
  arg3,
  arg4 = null,
  arg5 = null,
  arg6 = null
) => {
  let planId;
  let phaseId;
  let status;
  let completedDate;
  let appointmentCode;
  let appointmentId;

  if (typeof arg1 === 'object' && arg1 !== null) {
    planId = arg1.planId;
    phaseId = arg1.phaseId;
    status = arg1.status;
    completedDate = arg1.completedDate;
    appointmentCode = arg1.appointmentCode;
    appointmentId = arg1.appointmentId;
  } else {
    planId = arg1;
    phaseId = arg2;
    status = arg3;
    completedDate = arg4;
    appointmentCode = arg5;
    appointmentId = arg6;
  }

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
    include: { phacDoDieuTri: true },
  });

  if (!phase) {
    throw new ApiError(404, 'Không tìm thấy giai đoạn điều trị');
  }

  let targetLichHenId = phase.lichHenId;
  let actualCompletedDate = completedDate ? new Date(completedDate) : new Date();

  // Khi hoàn thành giai đoạn, tìm và liên kết lịch hẹn làm minh chứng
  if (dbStatus === 'hoan_thanh') {
    let appointment = null;

    if (appointmentId) {
      appointment = await prisma.lichHen.findUnique({
        where: { id: appointmentId },
      });
    } else if (appointmentCode) {
      appointment = await prisma.lichHen.findFirst({
        where: {
          maLichHen: { equals: appointmentCode.trim(), mode: 'insensitive' },
        },
      });
    }

    if (appointment) {
      // Xác thực lịch hẹn phải thuộc đúng bệnh nhân của phác đồ
      if (appointment.benhNhanId !== phase.phacDoDieuTri.benhNhanId) {
        throw new ApiError(
          400,
          `Lịch hẹn #${appointment.maLichHen} không thuộc về bệnh nhân của phác đồ này.`
        );
      }
      targetLichHenId = appointment.id;
      actualCompletedDate = parseSafeDate(completedDate)
        || (appointment ? parseSafeDate(appointment.ngayHen) : null)
        || new Date();

      // Tránh lỗi Unique constraint nếu lịch hẹn này từng được gán cho giai đoạn khác
      await prisma.giaiDoanPhacDo.updateMany({
        where: {
          lichHenId: appointment.id,
          NOT: { id: phaseId },
        },
        data: {
          lichHenId: null,
        },
      });
    }
  } else {
    // Nếu chuyển về chưa thực hiện hoặc đang thực hiện -> xóa liên kết minh chứng
    targetLichHenId = null;
    actualCompletedDate = null;
  }

  await prisma.giaiDoanPhacDo.update({
    where: { id: phaseId },
    data: {
      trangThai: dbStatus,
      lichHenId: targetLichHenId,
      ngayThucHien: actualCompletedDate,
      updatedAt: new Date(),
    },
  });

  // Kiểm tra xem tất cả các giai đoạn đã hoàn thành chưa
  const allPhases = await prisma.giaiDoanPhacDo.findMany({
    where: { phacDoId: planId },
  });

  const isAllCompleted = allPhases.length > 0 && allPhases.every((p) => p.trangThai === 'hoan_thanh');
  if (isAllCompleted) {
    await prisma.phacDoDieuTri.update({
      where: { id: planId },
      data: {
        trangThai: 'hoan_thanh',
        ngayHoanThanhThucTe: new Date(),
        updatedAt: new Date(),
      },
    });
  } else if (phase.phacDoDieuTri.trangThai === 'hoan_thanh') {
    // Nếu trước đó là hoan_thanh nhưng giờ có bước chưa xong -> chuyển lại dang_dieu_tri
    await prisma.phacDoDieuTri.update({
      where: { id: planId },
      data: {
        trangThai: 'dang_dieu_tri',
        ngayHoanThanhThucTe: null,
        updatedAt: new Date(),
      },
    });
  }

  const updatedPlan = await prisma.phacDoDieuTri.findUnique({
    where: { id: planId },
    include: planIncludeQuery,
  });

  return dentistTreatmentPlanDetailResponseSchema(updatedPlan);
};

export default {
  getTreatmentPlansService,
  getTreatmentPlanDetailService,
  createTreatmentPlanService,
  updatePhaseStatusService,
};
