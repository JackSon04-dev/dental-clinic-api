import prisma from '../../config/prisma.js';
import { ApiError } from '../../common/errorMiddleware.js';
import { formatDoctorFullName } from '../../constants/academicDegree.js';
import {
  STANDARD_SLOTS,
  calculateWeekSchedule,
  formatAppointmentDetailResponse,
  formatAvailableSlotsResponse,
  formatClientServiceItem,
  formatClientDoctorItem,
  formatClientAppointmentListItem,
} from '../../dtos/clients/clientAppointmentDto.js';

// ============================================================================
// HELPER FUNCTIONS: XỬ LÝ THỜI GIAN & BOUNDARY
// ============================================================================

/**
 * Lấy chuỗi ngày YYYY-MM-DD hôm nay theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
 */
export const getVietnamTodayDateString = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
};

/**
 * Lấy số phút hiện tại trong ngày theo múi giờ Việt Nam (0 - 1439)
 */
export const getVietnamCurrentMinutes = () => {
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [h, m] = timeFormatter.format(now).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Chuyển chuỗi 'HH:mm' thành số phút tính từ 00:00 (ví dụ '08:30' -> 510)
 */
export const timeStringToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = String(timeStr).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Chuyển số phút tính từ 00:00 thành chuỗi 'HH:mm' (ví dụ 510 -> '08:30')
 */
export const minutesToTimeString = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Tạo đối tượng Date (1970-01-01) từ số phút để lưu vào trường @db.Time(6) của Prisma
 */
export const createTimeDateFromMinutes = (minutesFromMidnight) => {
  const d = new Date('1970-01-01T00:00:00.000Z');
  const h = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  d.setUTCHours(h, m, 0, 0);
  return d;
};

/**
 * Trích xuất số phút tính từ 00:00 từ trường Date/String của Prisma Time(6)
 */
export const extractMinutesFromDbTime = (val) => {
  if (!val) return 0;
  if (typeof val === 'string') {
    if (val.includes('T')) {
      const d = new Date(val);
      return d.getUTCHours() * 60 + d.getUTCMinutes();
    }
    const [h, m] = val.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  if (val instanceof Date) {
    return val.getUTCHours() * 60 + val.getUTCMinutes();
  }
  return 0;
};

/**
 * Kiểm tra 2 khoảng thời gian [startA, endA) và [startB, endB) có giao nhau (overlap) không
 */
export const isTimeOverlapping = (startA, endA, startB, endB) => {
  return startA < endB && endA > startB;
};

/**
 * Kiểm tra khung giờ có vượt quá giờ đóng cửa của buổi khám không
 * Sáng: 08:00 (480) - 12:00 (720)
 * Chiều: 13:30 (810) - 17:30 (1050)
 */
export const checkShiftBoundary = (startMinutes, endMinutes) => {
  if (startMinutes < 720) {
    return endMinutes <= 720;
  }
  if (startMinutes >= 810) {
    return endMinutes <= 1050;
  }
  return false;
};

/**
 * Sinh mã lịch hẹn duy nhất LH-YYYYMMDD-XXXX
 */
const generateUniqueAppointmentCode = async (tx, dateStr) => {
  const cleanDate = dateStr.replace(/-/g, '');
  let code = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts += 1;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    code = `LH-${cleanDate}-${randomSuffix}`;
    const existing = await tx.lichHen.findUnique({
      where: { maLichHen: code },
    });
    if (!existing) isUnique = true;
  }

  return code;
};

// ============================================================================
// SHARED VALIDATION HELPER: TÌM CA TRỰC THỰC TẾ & KIỂM TRA TRÙNG LỊCH (ACID)
// ============================================================================

/**
 * Tìm ca làm việc hợp lệ và khóa Advisory Lock để kiểm tra xung đột thời gian
 * @param {object} params
 * @param {any} params.tx - Prisma Transaction client
 * @param {string} params.dateStr - 'YYYY-MM-DD'
 * @param {number} params.startMinutes - Số phút bắt đầu
 * @param {number} params.endMinutes - Số phút kết thúc
 * @param {string|null} params.dentistId - UUID bác sĩ (nếu client chọn)
 * @param {string|null} params.excludeAppointmentId - Bỏ qua khi dời lịch
 */
const validateAndFindShiftWithLock = async ({
  tx,
  dateStr,
  startMinutes,
  endMinutes,
  dentistId = null,
  excludeAppointmentId = null,
}) => {
  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

  if (dentistId) {
    // 1. Trường hợp bệnh nhân CHỌN bác sĩ cụ thể: Tìm tất cả ca trực của bác sĩ trong ngày
    const doctorShifts = await tx.caLamViec.findMany({
      where: {
        nhaSiId: dentistId,
        ngay: targetDate,
        trangThai: { notIn: ['vang_mat', 'da_huy', 'huy'] },
      },
      include: {
        nhaSi: true,
        phongDieuTri: true,
      },
    });

    if (!doctorShifts || doctorShifts.length === 0) {
      throw new ApiError(400, 'Bác sĩ không có ca làm việc nào vào ngày đã chọn.');
    }

    // Tìm đúng ca trực bao trọn khung giờ khám (hỗ trợ bác sĩ có cả ca sáng và ca chiều trong ngày)
    const shift = doctorShifts.find((s) => {
      const sStart = extractMinutesFromDbTime(s.gioBatDau);
      const sEnd = extractMinutesFromDbTime(s.gioKetThuc);
      return sStart <= startMinutes && sEnd >= endMinutes;
    });

    if (!shift) {
      const shiftTimes = doctorShifts
        .map(
          (s) =>
            `${minutesToTimeString(extractMinutesFromDbTime(s.gioBatDau))} – ${minutesToTimeString(extractMinutesFromDbTime(s.gioKetThuc))}`
        )
        .join(', ');
      throw new ApiError(
        400,
        `Khung giờ hẹn (${minutesToTimeString(startMinutes)} – ${minutesToTimeString(endMinutes)}) nằm ngoài các ca làm việc của bác sĩ (${shiftTimes}).`
      );
    }

    // Khóa Advisory Lock trên bác sĩ được chọn
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext('booking_doctor_${dentistId}_${dateStr}'));`
    );

    // Kiểm tra xung đột với các lịch hẹn khác của bác sĩ
    const doctorAppointments = await tx.lichHen.findMany({
      where: {
        ngayHen: targetDate,
        trangThai: { notIn: ['huy', 'da_huy'] },
        caLamViec: { nhaSiId: dentistId },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
    });

    const isConflict = doctorAppointments.some((app) => {
      const appStart = extractMinutesFromDbTime(app.gioHen);
      const appEnd = extractMinutesFromDbTime(app.gioKetThucDuKien);
      return isTimeOverlapping(startMinutes, endMinutes, appStart, appEnd);
    });

    if (isConflict) {
      throw new ApiError(
        409,
        'Khung giờ này bác sĩ đã có lịch hẹn hoặc bị ca khám trước lan sang. Vui lòng chọn ca khám khác.'
      );
    }

    return { chosenDoctorId: dentistId, shift };
  }

  // 2. Trường hợp bệnh nhân KHÔNG CHỌN bác sĩ: Tìm tất cả ca trực bao bọc khung giờ
  const candidateShifts = await tx.caLamViec.findMany({
    where: {
      ngay: targetDate,
      trangThai: { notIn: ['vang_mat', 'da_huy', 'huy'] },
      nhaSi: { trangThai: 'dang_lam_viec' },
    },
    include: {
      nhaSi: true,
      phongDieuTri: true,
    },
  });

  // Lọc các ca trực bao trọn giờ khám
  const coveringShifts = candidateShifts.filter((s) => {
    const sStart = extractMinutesFromDbTime(s.gioBatDau);
    const sEnd = extractMinutesFromDbTime(s.gioKetThuc);
    return sStart <= startMinutes && sEnd >= endMinutes;
  });

  if (coveringShifts.length === 0) {
    throw new ApiError(
      400,
      'Không có bác sĩ nào có ca làm việc trong khung giờ này vào ngày đã chọn.'
    );
  }

  // Lấy các lịch hẹn hiện có trong ngày của các bác sĩ này
  const doctorIds = coveringShifts.map((s) => s.nhaSiId);
  const existingApps = await tx.lichHen.findMany({
    where: {
      ngayHen: targetDate,
      trangThai: { notIn: ['huy', 'da_huy'] },
      caLamViec: { nhaSiId: { in: doctorIds } },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    include: { caLamViec: { select: { nhaSiId: true } } },
  });

  // Tìm các ca trực mà bác sĩ thực sự rảnh
  const freeShifts = coveringShifts.filter((shift) => {
    const docApps = existingApps.filter((a) => a.caLamViec?.nhaSiId === shift.nhaSiId);
    const hasOverlap = docApps.some((a) => {
      const aStart = extractMinutesFromDbTime(a.gioHen);
      const aEnd = extractMinutesFromDbTime(a.gioKetThucDuKien);
      return isTimeOverlapping(startMinutes, endMinutes, aStart, aEnd);
    });
    return !hasOverlap;
  });

  if (freeShifts.length === 0) {
    throw new ApiError(
      409,
      'Tất cả bác sĩ đều đã kín lịch hoặc bị lan ca trong khung giờ này. Vui lòng chọn ca khám khác.'
    );
  }

  // Chọn ngẫu nhiên (Random Selection) 1 bác sĩ trong các bác sĩ rảnh
  const randomIndex = Math.floor(Math.random() * freeShifts.length);
  const chosenShift = freeShifts[randomIndex];
  const chosenDoctorId = chosenShift.nhaSiId;

  // Khóa Advisory Lock trên bác sĩ được chọn ngẫu nhiên
  await tx.$executeRawUnsafe(
    `SELECT pg_advisory_xact_lock(hashtext('booking_doctor_${chosenDoctorId}_${dateStr}'));`
  );

  return { chosenDoctorId, shift: chosenShift };
};

// ============================================================================
// 1. getAvailableSlotsService
// Lấy danh sách 16 ca khám kèm khung Tuần và phụ thuộc vào record CaLamViec thực tế
// ============================================================================
export const getAvailableSlotsService = async ({ date, serviceId, dentistId }) => {
  const todayStr = getVietnamTodayDateString();
  const targetDateStr = date || todayStr;

  // 1. Kiểm tra ngày không được ở quá khứ
  if (targetDateStr < todayStr) {
    throw new ApiError(400, 'Không thể tra cứu ca khám cho các ngày trong quá khứ');
  }
  const isToday = targetDateStr === todayStr;
  const currentMinutes = getVietnamCurrentMinutes();

  // 2. Kiểm tra dịch vụ
  const service = await prisma.dichVu.findUnique({
    where: { id: serviceId },
  });
  if (!service || service.trangThai !== 'hoat_dong') {
    throw new ApiError(404, 'Dịch vụ nha khoa không tồn tại hoặc đã ngừng cung cấp');
  }
  const durationMinutes = service.thoiGianDuKienPhut || 30;

  // 3. Kiểm tra thông tin Bác sĩ (nếu client chọn) - Hỗ trợ cả nhaSi.id và taiKhoan.id
  let filterDoctor = null;
  let targetDentistId = dentistId;
  if (dentistId) {
    filterDoctor = await prisma.nhaSi.findFirst({
      where: {
        OR: [{ id: dentistId }, { taiKhoanId: dentistId }],
      },
    });
    if (!filterDoctor || filterDoctor.trangThai === 'nghi_viec') {
      throw new ApiError(404, 'Không tìm thấy thông tin bác sĩ hoặc bác sĩ đã nghỉ việc');
    }
    targetDentistId = filterDoctor.id;
  }

  // 4. Lấy ngày có ca trực xa nhất trong tương lai từ DB (maxAvailableDate)
  const latestShift = await prisma.caLamViec.findFirst({
    where: {
      ngay: { gte: new Date(`${todayStr}T00:00:00.000Z`) },
      trangThai: { notIn: ['vang_mat', 'da_huy', 'huy'] },
      ...(targetDentistId ? { nhaSiId: targetDentistId } : {}),
    },
    orderBy: { ngay: 'desc' },
    select: { ngay: true },
  });

  const maxAvailableDateStr = latestShift
    ? latestShift.ngay.toISOString().split('T')[0]
    : todayStr;

  if (targetDateStr > maxAvailableDateStr) {
    throw new ApiError(
      400,
      `Ngày được chọn (${targetDateStr}) vượt quá phạm vi ca làm việc đã được phòng khám xếp lịch (tối đa đến ${maxAvailableDateStr}).`
    );
  }

  // 5. Tính toán khung tuần (Thứ Hai -> Chủ Nhật) của ngày được chọn
  const [year, month, day] = targetDateStr.split('-').map(Number);
  const targetDateObj = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = targetDateObj.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayDate = new Date(targetDateObj);
  mondayDate.setUTCDate(targetDateObj.getUTCDate() + diffToMonday);
  const sundayDate = new Date(mondayDate);
  sundayDate.setUTCDate(mondayDate.getUTCDate() + 6);

  const weekStartDate = mondayDate.toISOString().split('T')[0];
  const weekEndDate = sundayDate.toISOString().split('T')[0];

  // Lấy các ngày trong tuần có ca làm việc hợp lệ
  const weekShifts = await prisma.caLamViec.findMany({
    where: {
      ngay: {
        gte: new Date(`${weekStartDate}T00:00:00.000Z`),
        lte: new Date(`${weekEndDate}T23:59:59.999Z`),
      },
      trangThai: { notIn: ['vang_mat', 'da_huy', 'huy'] },
      ...(targetDentistId ? { nhaSiId: targetDentistId } : {}),
    },
    select: { ngay: true },
  });

  const daysWithShiftsSet = new Set(
    weekShifts.map((s) => s.ngay.toISOString().split('T')[0])
  );

  const weekSchedule = calculateWeekSchedule({
    selectedDateStr: targetDateStr,
    todayStr,
    maxAvailableDateStr,
    daysWithShiftsSet,
  });

  // 6. Lấy các ca làm việc thực tế trong ngày targetDateStr
  const targetDate = new Date(`${targetDateStr}T00:00:00.000Z`);
  const shiftsOnDate = await prisma.caLamViec.findMany({
    where: {
      ngay: targetDate,
      trangThai: { notIn: ['vang_mat', 'da_huy', 'huy'] },
      ...(targetDentistId ? { nhaSiId: targetDentistId } : {}),
    },
    include: {
      nhaSi: {
        select: {
          id: true,
          hoTen: true,
          chuyenKhoa: true,
          hinhAnhUrl: true,
          trangThai: true,
        },
      },
      phongDieuTri: {
        select: {
          id: true,
          tenPhong: true,
        },
      },
    },
  });

  // Lấy các lịch hẹn hiện có trong ngày của các bác sĩ này (loại trừ huy/da_huy)
  const doctorIdsOnDate = [...new Set(shiftsOnDate.map((s) => s.nhaSiId))];
  const existingAppointments = await prisma.lichHen.findMany({
    where: {
      ngayHen: targetDate,
      trangThai: { notIn: ['huy', 'da_huy'] },
      caLamViec: {
        nhaSiId: { in: doctorIdsOnDate },
      },
    },
    include: {
      caLamViec: { select: { nhaSiId: true } },
    },
  });

  // 7. Duyệt qua 16 ca khám chuẩn để tính toán tính khả dụng
  const slots = STANDARD_SLOTS.map((slot) => {
    const slotStartMin = timeStringToMinutes(slot.time);
    const serviceEndMin = slotStartMin + durationMinutes;

    // A. Kiểm tra giờ đã qua (nếu là hôm nay)
    if (isToday && slotStartMin <= currentMinutes) {
      return {
        slotIndex: slot.slotIndex,
        time: slot.time,
        displayTime: slot.displayTime,
        period: slot.period,
        isAvailable: false,
        reason: 'PAST_TIME',
        reasonLabel: 'Khung giờ này đã trôi qua',
        availableDoctorCount: 0,
        availableDoctors: [],
      };
    }

    // B. Kiểm tra ranh giới ca sáng (12:00) và ca chiều (17:30)
    const isWithinBoundary = checkShiftBoundary(slotStartMin, serviceEndMin);
    if (!isWithinBoundary) {
      return {
        slotIndex: slot.slotIndex,
        time: slot.time,
        displayTime: slot.displayTime,
        period: slot.period,
        isAvailable: false,
        reason: 'EXCEEDS_CLOSING_TIME',
        reasonLabel: 'Thời gian dịch vụ vượt quá giờ làm việc của ca (12:00 trưa hoặc 17:30 chiều)',
        availableDoctorCount: 0,
        availableDoctors: [],
      };
    }

    // C. Tìm các ca làm việc THỰC TẾ của bác sĩ bao trọn slot này
    const coveringShifts = shiftsOnDate.filter((s) => {
      const sStart = extractMinutesFromDbTime(s.gioBatDau);
      const sEnd = extractMinutesFromDbTime(s.gioKetThuc);
      return sStart <= slotStartMin && sEnd >= serviceEndMin;
    });

    if (coveringShifts.length === 0) {
      return {
        slotIndex: slot.slotIndex,
        time: slot.time,
        displayTime: slot.displayTime,
        period: slot.period,
        isAvailable: false,
        reason: 'NO_DOCTOR_SHIFT',
        reasonLabel: dentistId
          ? 'Bác sĩ không có ca làm việc trong khung giờ này'
          : 'Không có bác sĩ nào có ca làm việc trong khung giờ này',
        availableDoctorCount: 0,
        availableDoctors: [],
      };
    }

    // D. Trong các ca trực bao trọn, kiểm tra bác sĩ nào đang THỰC SỰ RẢNH
    const availableDoctorsForSlot = [];

    coveringShifts.forEach((shift) => {
      const docId = shift.nhaSiId;
      const docApps = existingAppointments.filter((a) => a.caLamViec?.nhaSiId === docId);

      const hasConflict = docApps.some((app) => {
        const appStart = extractMinutesFromDbTime(app.gioHen);
        const appEnd = extractMinutesFromDbTime(app.gioKetThucDuKien);
        return isTimeOverlapping(slotStartMin, serviceEndMin, appStart, appEnd);
      });

      if (!hasConflict && !availableDoctorsForSlot.some((d) => d.id === docId)) {
        const docDegree = shift.nhaSi.hocVi || 'BS';
        const docTitle = formatDoctorFullName(docDegree, shift.nhaSi.hoTen);
        availableDoctorsForSlot.push({
          id: shift.nhaSi.id,
          fullName: docTitle,
          titleFullName: docTitle,
          academicDegree: docDegree,
          specialty: shift.nhaSi.chuyenKhoa || 'Bác sĩ Nha khoa',
          avatarUrl: shift.nhaSi.hinhAnhUrl || null,
          shiftId: shift.id,
        });
      }
    });

    const isAvailable = availableDoctorsForSlot.length > 0;

    return {
      slotIndex: slot.slotIndex,
      time: slot.time,
      displayTime: slot.displayTime,
      period: slot.period,
      isAvailable,
      reason: isAvailable ? null : 'OCCUPIED',
      reasonLabel: isAvailable
        ? null
        : dentistId
        ? 'Bác sĩ đã có lịch hẹn hoặc bị lan ca trong khung giờ này'
        : 'Tất cả bác sĩ đều đã kín lịch hoặc bị lan ca trong khung giờ này',
      availableDoctorCount: availableDoctorsForSlot.length,
      availableDoctors: availableDoctorsForSlot,
    };
  });

  return formatAvailableSlotsResponse({
    weekSchedule,
    service,
    filterDoctor,
    slots,
  });
};

// ============================================================================
// 2. createAppointmentService
// Đặt lịch hẹn mới: Kiểm tra CaLamViec thực tế, chọn ngẫu nhiên bác sĩ nếu để trống,
// và Double-check với ACID Transaction + Advisory Lock
// ============================================================================
export const createAppointmentService = async (benhNhanId, userId, payload) => {
  const { date, timeSlot, serviceId, dentistId, notes } = payload;

  // 0. Bắt buộc kiểm tra số điện thoại liên hệ của bệnh nhân
  const patient = await prisma.benhNhan.findUnique({
    where: { id: benhNhanId },
    select: { id: true, sdt: true },
  });
  if (!patient || !patient.sdt || !patient.sdt.trim()) {
    throw new ApiError(
      400,
      'Bệnh nhân chưa có số điện thoại liên hệ. Vui lòng cập nhật số điện thoại trước khi đặt lịch hẹn.'
    );
  }

  const todayStr = getVietnamTodayDateString();
  if (date < todayStr) {
    throw new ApiError(400, 'Không thể đặt lịch hẹn cho ngày trong quá khứ');
  }
  const isToday = date === todayStr;
  const currentMinutes = getVietnamCurrentMinutes();
  const startMinutes = timeStringToMinutes(timeSlot);

  if (isToday && startMinutes <= currentMinutes) {
    throw new ApiError(400, 'Khung giờ này đã trôi qua. Vui lòng chọn ca khám tiếp theo.');
  }

  // Kiểm tra dịch vụ
  const service = await prisma.dichVu.findUnique({
    where: { id: serviceId },
  });
  if (!service || service.trangThai !== 'hoat_dong') {
    throw new ApiError(404, 'Dịch vụ nha khoa không tồn tại hoặc đã ngừng cung cấp');
  }

  const durationMinutes = service.thoiGianDuKienPhut || 30;
  const endMinutes = startMinutes + durationMinutes;

  if (!checkShiftBoundary(startMinutes, endMinutes)) {
    throw new ApiError(
      400,
      'Thời gian điều trị dự kiến vượt quá giờ làm việc của phòng khám (12:00 hoặc 17:30)'
    );
  }

  const targetDate = new Date(`${date}T00:00:00.000Z`);

  // Thực thi ACID Transaction với Advisory Lock
  const newAppointment = await prisma.$transaction(async (tx) => {
    // 1. Kiểm tra ca làm việc thực tế, khóa Advisory Lock và chọn Bác sĩ (Random nếu không chọn)
    const { chosenDoctorId, shift } = await validateAndFindShiftWithLock({
      tx,
      dateStr: date,
      startMinutes,
      endMinutes,
      dentistId: dentistId || null,
    });

    // 2. Kiểm tra xung đột lịch của chính Bệnh nhân
    const patientAppointments = await tx.lichHen.findMany({
      where: {
        benhNhanId,
        ngayHen: targetDate,
        trangThai: { notIn: ['huy', 'da_huy'] },
      },
    });

    const isPatientConflict = patientAppointments.some((app) => {
      const appStart = extractMinutesFromDbTime(app.gioHen);
      const appEnd = extractMinutesFromDbTime(app.gioKetThucDuKien);
      return isTimeOverlapping(startMinutes, endMinutes, appStart, appEnd);
    });

    if (isPatientConflict) {
      throw new ApiError(
        400,
        'Bạn đã có một lịch hẹn khác trong khoảng thời gian này. Vui lòng chọn ca khám khác.'
      );
    }

    // 3. Sinh mã lịch hẹn duy nhất
    const appointmentCode = await generateUniqueAppointmentCode(tx, date);

    // 4. Tạo bản ghi lịch hẹn gán trực tiếp vào ca làm việc thực tế
    const created = await tx.lichHen.create({
      data: {
        maLichHen: appointmentCode,
        benhNhanId,
        caLamViecId: shift.id,
        dichVuId: service.id,
        ngayHen: targetDate,
        gioHen: createTimeDateFromMinutes(startMinutes),
        gioKetThucDuKien: createTimeDateFromMinutes(endMinutes),
        trangThai: 'cho_xac_nhan',
        ghiChu: notes ? notes.trim() : null,
      },
      include: {
        benhNhan: true,
        dichVu: true,
        caLamViec: {
          include: {
            nhaSi: true,
            phongDieuTri: true,
          },
        },
      },
    });

    return created;
  });

  return formatAppointmentDetailResponse(newAppointment);
};

// ============================================================================
// 3. rescheduleAppointmentService
// Dời lịch hẹn: Dùng chung bộ kiểm tra ca trực thực tế và xung đột (loại trừ lịch hiện tại)
// ============================================================================
export const rescheduleAppointmentService = async (appointmentId, benhNhanId, payload) => {
  const { date, timeSlot } = payload;

  // 1. Tìm lịch hẹn hiện tại
  const appointment = await prisma.lichHen.findUnique({
    where: { id: appointmentId },
    include: {
      dichVu: true,
      caLamViec: {
        include: {
          nhaSi: true,
          phongDieuTri: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new ApiError(404, 'Không tìm thấy thông tin lịch hẹn');
  }

  // 2. Kiểm tra quyền sở hữu
  if (appointment.benhNhanId !== benhNhanId) {
    throw new ApiError(403, 'Bạn không có quyền thay đổi lịch hẹn của bệnh nhân khác');
  }

  // 3. Kiểm tra trạng thái: chỉ cho phép dời lịch khi còn là cho_xac_nhan hoặc da_xac_nhan
  if (!['cho_xac_nhan', 'da_xac_nhan'].includes(appointment.trangThai)) {
    throw new ApiError(
      400,
      `Không thể thay đổi lịch hẹn ở trạng thái hiện tại (${appointment.trangThai}). Lịch chỉ có thể dời khi chưa tiếp nhận hoặc chưa hoàn tất/hủy.`
    );
  }

  // 4. Kiểm tra ngày và giờ mới
  const todayStr = getVietnamTodayDateString();
  if (date < todayStr) {
    throw new ApiError(400, 'Không thể dời lịch hẹn sang ngày trong quá khứ');
  }
  const isToday = date === todayStr;
  const currentMinutes = getVietnamCurrentMinutes();
  const startMinutes = timeStringToMinutes(timeSlot);

  if (isToday && startMinutes <= currentMinutes) {
    throw new ApiError(400, 'Khung giờ mới đã trôi qua. Vui lòng chọn ca khám tiếp theo.');
  }

  const durationMinutes = appointment.dichVu?.thoiGianDuKienPhut || 30;
  const endMinutes = startMinutes + durationMinutes;

  if (!checkShiftBoundary(startMinutes, endMinutes)) {
    throw new ApiError(
      400,
      'Thời gian điều trị dự kiến vượt quá giờ làm việc của phòng khám (12:00 hoặc 17:30)'
    );
  }

  const targetDate = new Date(`${date}T00:00:00.000Z`);
  const doctorId = appointment.caLamViec.nhaSiId;

  // 5. ACID Transaction dời lịch với Advisory Lock và tìm ca trực thực tế
  const updatedAppointment = await prisma.$transaction(async (tx) => {
    const { shift } = await validateAndFindShiftWithLock({
      tx,
      dateStr: date,
      startMinutes,
      endMinutes,
      dentistId: doctorId,
      excludeAppointmentId: appointment.id,
    });

    // Kiểm tra xung đột lịch của chính Bệnh nhân tại ngày mới (loại trừ chính bản ghi này)
    const patientAppointments = await tx.lichHen.findMany({
      where: {
        id: { not: appointment.id },
        benhNhanId,
        ngayHen: targetDate,
        trangThai: { notIn: ['huy', 'da_huy'] },
      },
    });

    const isPatientConflict = patientAppointments.some((app) => {
      const appStart = extractMinutesFromDbTime(app.gioHen);
      const appEnd = extractMinutesFromDbTime(app.gioKetThucDuKien);
      return isTimeOverlapping(startMinutes, endMinutes, appStart, appEnd);
    });

    if (isPatientConflict) {
      throw new ApiError(400, 'Bạn đã có một lịch hẹn khác trong khoảng thời gian này.');
    }

    // Cập nhật ngày, giờ và ca trực mới
    const updated = await tx.lichHen.update({
      where: { id: appointment.id },
      data: {
        caLamViecId: shift.id,
        ngayHen: targetDate,
        gioHen: createTimeDateFromMinutes(startMinutes),
        gioKetThucDuKien: createTimeDateFromMinutes(endMinutes),
        trangThai: 'cho_xac_nhan',
      },
      include: {
        benhNhan: true,
        dichVu: true,
        caLamViec: {
          include: {
            nhaSi: true,
            phongDieuTri: true,
          },
        },
      },
    });

    return updated;
  });

  return formatAppointmentDetailResponse(updatedAppointment);
};

// ============================================================================
// 4. cancelAppointmentService
// Hủy lịch hẹn
// ============================================================================
export const cancelAppointmentService = async (appointmentId, benhNhanId, userId, payload) => {
  const { reason } = payload;

  const appointment = await prisma.lichHen.findUnique({
    where: { id: appointmentId },
    include: {
      dichVu: true,
      caLamViec: {
        include: {
          nhaSi: true,
          phongDieuTri: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new ApiError(404, 'Không tìm thấy thông tin lịch hẹn');
  }

  if (appointment.benhNhanId !== benhNhanId) {
    throw new ApiError(403, 'Bạn không có quyền hủy lịch hẹn của bệnh nhân khác');
  }

  if (['huy', 'da_huy'].includes(appointment.trangThai)) {
    throw new ApiError(400, 'Lịch hẹn này đã được hủy trước đó');
  }

  if (['da_tiep_nhan', 'cho_kham', 'dang_kham', 'cho_thanh_toan', 'da_kham'].includes(appointment.trangThai)) {
    throw new ApiError(400, 'Không thể hủy lịch hẹn đã tiếp nhận hoặc đã hoàn tất khám');
  }

  const cancelledAppointment = await prisma.lichHen.update({
    where: { id: appointment.id },
    data: {
      trangThai: 'huy',
      lyDoHuy: reason.trim(),
      nguoiHuyId: userId,
      ngayHuy: new Date(),
    },
    include: {
      benhNhan: true,
      dichVu: true,
      caLamViec: {
        include: {
          nhaSi: true,
          phongDieuTri: true,
        },
      },
    },
  });

  return formatAppointmentDetailResponse(cancelledAppointment);
};

// ============================================================================
// 5. getClientServicesService
// Lấy danh sách dịch vụ nha khoa đang mở cho Client lựa chọn đặt lịch
// ============================================================================
export const getClientServicesService = async () => {
  const services = await prisma.dichVu.findMany({
    where: { trangThai: 'hoat_dong' },
    orderBy: { tenDichVu: 'asc' },
  });

  return services.map(formatClientServiceItem);
};

// ============================================================================
// 6. getClientDoctorsService
// Lấy danh sách Bác sĩ nha khoa đang làm việc cho Client lựa chọn đặt lịch
// ============================================================================
export const getClientDoctorsService = async () => {
  const doctors = await prisma.nhaSi.findMany({
    where: { trangThai: 'dang_lam_viec' },
    select: {
      id: true,
      maNhaSi: true,
      hoTen: true,
      hocVi: true,
      gioiTinh: true,
      chuyenKhoa: true,
      gioiThieu: true,
      hinhAnhUrl: true,
    },
    orderBy: { hoTen: 'asc' },
  });

  return doctors.map(formatClientDoctorItem);
};

// ============================================================================
// 7. getClientAppointmentsService
// Lấy danh sách lịch hẹn của bệnh nhân kèm phân trang và lọc trạng thái
// ============================================================================
export const getClientAppointmentsService = async (benhNhanId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(50, parseInt(query.limit, 10) || 10));
  const status = query.status || 'all';
  const skip = (page - 1) * limit;

  // Xây dựng điều kiện lọc theo status
  const whereCondition = {
    benhNhanId,
  };

  if (status === 'upcoming') {
    whereCondition.trangThai = {
      in: ['cho_xac_nhan', 'da_xac_nhan', 'da_tiep_nhan', 'cho_kham', 'dang_kham'],
    };
  } else if (status === 'completed') {
    whereCondition.trangThai = 'da_kham';
  } else if (status === 'cancelled') {
    whereCondition.trangThai = { in: ['huy', 'da_huy'] };
  } else if (status !== 'all') {
    whereCondition.trangThai = status;
  }

  const [totalRecords, appointments] = await Promise.all([
    prisma.lichHen.count({ where: whereCondition }),
    prisma.lichHen.findMany({
      where: whereCondition,
      include: {
        dichVu: true,
        caLamViec: {
          include: {
            nhaSi: true,
            phongDieuTri: true,
          },
        },
      },
      orderBy: [{ ngayHen: 'desc' }, { gioHen: 'desc' }],
      skip,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(totalRecords / limit) || 1;

  return {
    appointments: appointments.map(formatClientAppointmentListItem),
    pagination: {
      currentPage: page,
      limit,
      totalRecords,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

export default {
  getAvailableSlotsService,
  createAppointmentService,
  rescheduleAppointmentService,
  cancelAppointmentService,
  getClientServicesService,
  getClientDoctorsService,
  getClientAppointmentsService,
};
