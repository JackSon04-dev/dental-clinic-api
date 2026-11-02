import { formatDayMonthYear, formatTimeHHmm } from '../../utils/dateFormatter.js';

/**
 * Format dữ liệu cho Card 1: Lịch hẹn kế tiếp
 * @param {any|null} appointment - Bản ghi lich_hen từ Prisma
 * @returns {object}
 */
export const formatNextAppointmentCard = (appointment) => {
  if (!appointment || !appointment.ngayHen) {
    return {
      hasUpcoming: false,
      message: 'Chưa có lịch hẹn',
    };
  }

  const { dayOfWeek, formattedDate } = formatDayMonthYear(appointment.ngayHen);
  const time = formatTimeHHmm(appointment.gioHen);

  return {
    hasUpcoming: true,
    date: formattedDate,
    time: time,
    dayOfWeek: dayOfWeek,
    formattedSubtext: `Khám lúc ${time} (${dayOfWeek})`,
    serviceName: appointment.dichVu?.tenDichVu || 'Khám điều trị nha khoa',
  };
};

/**
 * Format dữ liệu cho Card 2: Chỉ số sức khỏe nụ cười
 * @param {any} benhNhan - Bản ghi benh_nhan từ Prisma
 * @returns {object}
 */
export const formatSmileScoreCard = (benhNhan) => {
  const banDau = benhNhan?.diemSucKhoeBanDau ?? 85;
  const hienTai = benhNhan?.diemSucKhoeHienTai ?? 95;
  const diff = hienTai - banDau;
  const trendSign = diff > 0 ? `+${diff}%` : `${diff}%`;

  return {
    scoreText: `${hienTai}/100`,
    trend: trendSign,
    isPositive: diff >= 0,
    statusNote: benhNhan?.ghiChu || 'Men răng tốt, không cao răng',
  };
};

/**
 * Format dữ liệu cho Card 3: Tiến độ phác đồ
 * @param {any|null} latestPlan - Phác đồ mới nhất từ Prisma (kèm giaiDoanPhacDo)
 * @returns {object}
 */
export const formatTreatmentProgressCard = (latestPlan) => {
  if (!latestPlan) {
    return {
      hasPlan: false,
      message: 'Chưa có phác đồ',
    };
  }

  const stages = latestPlan.giaiDoanPhacDo || [];
  const totalSteps = stages.length;
  const completedStages = stages.filter(
    (g) => g.trangThai === 'da_hoan_thanh' || g.trangThai === 'hoan_thanh'
  );
  const completedCount = completedStages.length;

  const percentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  
  // Tìm ghi chú của giai đoạn phác đồ đã hoàn thành mới nhất
  const latestCompletedStage = completedStages.length > 0 
    ? completedStages[completedStages.length - 1] 
    : null;

  return {
    hasPlan: true,
    planName: latestPlan.tenPhacDo,
    progressText: `${percentage}%`,
    stageLabel: `Giai đoạn ${completedCount}/${totalSteps}`,
    latestStepNote: latestCompletedStage?.ghiChu || latestPlan.ghiChu || 'Đang thực hiện theo lộ trình',
  };
};

/**
 * Format dữ liệu cho Card 4: Lịch sử thăm khám
 * @param {number} visitCount - Số lượng hồ sơ bệnh án đã hoàn thành
 * @returns {object}
 */
export const formatVisitHistoryCard = (visitCount = 0) => {
  return {
    visitsText: `${visitCount} lượt`,
  };
};

/**
 * Tổng hợp phản hồi hoàn chỉnh cho API 4 Cards Thống kê Dashboard
 */
export const formatDashboardStatsResponse = ({
  appointment,
  benhNhan,
  latestPlan,
  visitCount,
}) => {
  return {
    nextAppointment: formatNextAppointmentCard(appointment),
    smileScore: formatSmileScoreCard(benhNhan),
    treatmentProgress: formatTreatmentProgressCard(latestPlan),
    visitHistory: formatVisitHistoryCard(visitCount),
  };
};

/**
 * Format dữ liệu cho Component lớn: Lịch hẹn gần nhất (Featured Appointment)
 * @param {any|null} appointment - Bản ghi lich_hen từ Prisma
 * @param {boolean} isUpcoming - true nếu là lịch tương lai, false nếu là lịch quá khứ đã hoàn thành
 * @returns {object}
 */
export const formatFeaturedAppointment = (appointment, isUpcoming = false) => {
  if (!appointment || !appointment.ngayHen) {
    return {
      hasAppointment: false,
      message: 'Chưa có thông tin lịch hẹn',
    };
  }

  const { dayOfWeek, formattedDate } = formatDayMonthYear(appointment.ngayHen);
  const startTime = formatTimeHHmm(appointment.gioHen);
  const endTime = formatTimeHHmm(appointment.gioKetThucDuKien);
  const timeRange = endTime ? `${startTime} - ${endTime}` : startTime;

  // Xử lý tiêu đề dịch vụ (ghép giai đoạn nếu có)
  const baseServiceName = appointment.dichVu?.tenDichVu || 'Khám điều trị nha khoa';
  const stageTitle = appointment.giaiDoanPhacDo?.tenGiaiDoan;
  const serviceTitle = stageTitle ? `${baseServiceName} (${stageTitle})` : baseServiceName;

  // Xử lý trạng thái và nhãn hiển thị
  let statusObj;
  if (isUpcoming) {
    const isConfirmed = appointment.trangThai === 'da_xac_nhan';
    statusObj = {
      code: isConfirmed ? 'confirmed' : 'pending',
      label: isConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận',
      variant: isConfirmed ? 'success' : 'warning',
    };
  } else {
    statusObj = {
      code: 'completed',
      label: 'Đã hoàn thành',
      variant: 'info',
    };
  }

  // Tính toán chuỗi countdownText
  let countdownText = '';
  if (isUpcoming) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const apptDate = new Date(appointment.ngayHen);
    const apptDayOnly = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate());
    const diffTime = apptDayOnly.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      countdownText = 'Lịch hẹn diễn ra hôm nay';
    } else if (diffDays === 1) {
      countdownText = 'Còn 1 ngày nữa đến giờ hẹn';
    } else {
      countdownText = `Còn ${diffDays} ngày nữa đến giờ hẹn`;
    }
  } else {
    countdownText = `Đã hoàn thành vào ngày ${formattedDate}`;
  }

  const result = {
    hasAppointment: true,
    isUpcoming,
    serviceTitle,
    doctor: {
      fullName: appointment.caLamViec?.nhaSi?.hoTen || 'Bác sĩ chuyên khoa',
      specialty: appointment.caLamViec?.nhaSi?.chuyenKhoa || 'Chuyên gia nha khoa',
      avatarUrl: appointment.caLamViec?.nhaSi?.hinhAnhUrl || null,
    },
    status: statusObj,
    date: `${dayOfWeek}, ${formattedDate}`,
    time: timeRange,
    room: appointment.caLamViec?.phongDieuTri?.tenPhong || 'Phòng khám đa khoa',
    countdownText,
  };

  if (!isUpcoming) {
    result.clinicalSummary =
      appointment.hoSoBenhAn?.ketQua ||
      appointment.hoSoBenhAn?.loiDan ||
      appointment.ghiChu ||
      null;
  }

  return result;
};

/**
 * Format dữ liệu cho Component: Phác đồ điều trị gần nhất & danh sách giai đoạn (Treatment Plan)
 * Quy tắc trạng thái: Chỉ có 2 trạng thái hiển thị "Đã hoàn thành" và "Chưa thực hiện"
 * @param {any|null} latestPlan - Bản ghi phac_do_dieu_tri từ Prisma (kèm giaiDoanPhacDo và nhaSi)
 * @returns {object}
 */
export const formatTreatmentPlanDetail = (latestPlan) => {
  if (!latestPlan) {
    return {
      hasPlan: false,
      message: 'Chưa có phác đồ điều trị',
    };
  }

  const stages = latestPlan.giaiDoanPhacDo || [];
  const totalStages = stages.length;

  // Format từng giai đoạn với ràng buộc strictly 2 trạng thái
  const formattedStages = stages.map((stage) => {
    const isCompleted =
      stage.trangThai === 'da_hoan_thanh' || stage.trangThai === 'hoan_thanh';

    let dateText = null;
    if (isCompleted && stage.ngayThucHien) {
      dateText = `Hoàn thành ngày ${formatDayMonthYear(stage.ngayThucHien).formattedDate}`;
    } else if (!isCompleted && stage.ngayDuKien) {
      dateText = `Dự kiến ngày ${formatDayMonthYear(stage.ngayDuKien).formattedDate}`;
    }

    return {
      id: stage.id,
      stepNumber: stage.buocSo,
      title: `Giai đoạn ${stage.buocSo}: ${stage.tenGiaiDoan}`,
      rawStageName: stage.tenGiaiDoan,
      description: stage.moTa || null,
      note: stage.ghiChu || null,
      dateText,
      status: {
        code: isCompleted ? 'completed' : 'pending',
        label: isCompleted ? 'Đã hoàn thành' : 'Chưa thực hiện',
        variant: isCompleted ? 'success' : 'neutral',
      },
      isCompleted,
    };
  });

  const completedStagesCount = formattedStages.filter((s) => s.isCompleted).length;
  const progressPercentage =
    totalStages > 0 ? Math.round((completedStagesCount / totalStages) * 100) : 0;
  const progressText = `${completedStagesCount}/${totalStages} giai đoạn (${progressPercentage}%)`;

  // Trạng thái phác đồ tổng quát: Chỉ 2 trạng thái
  const isPlanCompleted = latestPlan.trangThai === 'hoan_thanh';
  const planStatus = {
    code: isPlanCompleted ? 'completed' : 'pending',
    label: isPlanCompleted ? 'Đã hoàn thành' : 'Chưa thực hiện',
    variant: isPlanCompleted ? 'success' : 'neutral',
  };

  const startDate = latestPlan.ngayBatDau
    ? formatDayMonthYear(latestPlan.ngayBatDau).formattedDate
    : null;
  const expectedEndDate = latestPlan.ngayDuKienHoanThanh
    ? formatDayMonthYear(latestPlan.ngayDuKienHoanThanh).formattedDate
    : null;
  const actualEndDate = latestPlan.ngayHoanThanhThucTe
    ? formatDayMonthYear(latestPlan.ngayHoanThanhThucTe).formattedDate
    : null;

  return {
    hasPlan: true,
    planCode: latestPlan.maPhacDo || null,
    planName: latestPlan.tenPhacDo,
    diagnosis: latestPlan.chanDoanBanDau || null,
    doctor: {
      fullName: latestPlan.nhaSi?.hoTen || 'Bác sĩ phụ trách',
      specialty: latestPlan.nhaSi?.chuyenKhoa || 'Bác sĩ chuyên khoa',
    },
    status: planStatus,
    progress: {
      totalStages,
      completedStages: completedStagesCount,
      percentage: progressPercentage,
      progressText,
    },
    startDate,
    expectedEndDate,
    actualEndDate,
    dentistAdvice:
      latestPlan.ghiChu ||
      'Tuân thủ đúng lộ trình điều trị và tái khám định kỳ theo chỉ định của bác sĩ.',
    stages: formattedStages,
  };
};

export default {
  formatNextAppointmentCard,
  formatSmileScoreCard,
  formatTreatmentProgressCard,
  formatVisitHistoryCard,
  formatDashboardStatsResponse,
  formatFeaturedAppointment,
  formatTreatmentPlanDetail,
};

