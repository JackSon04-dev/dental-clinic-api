import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import { getVietnamTodayDateString } from '../../../dtos/departments/admins/adminWorkShiftDto.js';
import { getAvailableSlotsService as clientGetAvailableSlotsService } from '../../clients/clientAppointmentService.js';
import {
  mapStatusToDatabase,
  receptionistAppointmentItemResponseSchema,
} from '../../../dtos/departments/receptionists/receptionistAppointmentDto.js';

/**
 * Trích xuất chuỗi ngày YYYY-MM-DD an toàn từ nhiều định dạng (ISO, Date, null)
 */
const toCleanDateStr = (dateInput) => {
  if (!dateInput) return getVietnamTodayDateString();
  if (typeof dateInput === 'string') return dateInput.slice(0, 10);
  if (dateInput instanceof Date) return dateInput.toISOString().slice(0, 10);
  return getVietnamTodayDateString();
};

const parseToDateOnly = (dateInput) => {
  const cleanStr = toCleanDateStr(dateInput);
  return new Date(`${cleanStr}T00:00:00.000Z`);
};

async function resolveRoomIdByName(roomName) {
  if (!roomName) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(roomName);
  if (isUuid) return roomName;

  const matched = await prisma.phongDieuTri.findFirst({
    where: {
      OR: [
        { tenPhong: { contains: roomName, mode: 'insensitive' } },
        { maPhong: { contains: roomName, mode: 'insensitive' } },
      ],
    },
  });
  return matched?.id || null;
}

/**
 * Tìm và kiểm tra ca làm việc thực tế ĐANG CÓ VÀ CÒN TRỐNG của Bác sĩ trong ngày và khung giờ hẹn
 * TUÂN THỦ 100% CSDL 22 BẢNG - KHÔNG TỰ SINH CA GIẢ HOẶC ĐỔI ĐÈ PHÒNG CỦA CA LÀM VIỆC
 */
async function findValidShiftForDoctor({ dentistId, dateStr, timeSlot, customRoomId = null, excludeAppointmentId = null }) {
  const targetDate = parseToDateOnly(dateStr);

  // 1. Tính toán giờ hẹn (UTC Date 1970)
  const [hours, minutes] = (timeSlot || '08:30').split(':').map(Number);
  const startTime = new Date('1970-01-01T00:00:00.000Z');
  startTime.setUTCHours(hours || 8, minutes || 30, 0, 0);
  const appointmentTotalMinutes = (hours || 8) * 60 + (minutes || 30);

  // Trực tiếp xử lý trường hợp Lễ tân chọn "Tùy chọn bác sĩ" (hoặc không chỉ định bác sĩ)
  const isAnyDoctor = !dentistId || dentistId === 'ALL' || dentistId === 'ANY' || dentistId === '';

  if (isAnyDoctor) {
    // Tìm tất cả ca trực thực tế trên DB trong ngày
    const shifts = await prisma.caLamViec.findMany({
      where: {
        ngay: targetDate,
        trangThai: { notIn: ['vang_mat', 'da_huy', 'huy'] },
        nhaSi: { trangThai: 'dang_lam_viec' },
        ...(customRoomId ? { phongDieuTriId: customRoomId } : {}),
      },
      include: { phongDieuTri: true, nhaSi: true },
    });

    if (shifts.length === 0) {
      throw new ApiError(
        400,
        `Không có ca trực nào của bác sĩ ${customRoomId ? 'tại phòng khám được chỉ định ' : ''}vào ngày ${dateStr}. Vui lòng kiểm tra lại lịch trực.`
      );
    }

    // Lọc các ca trực bao trọn khung giờ hẹn
    const coveringShifts = shifts.filter((s) => {
      const sStartHour = s.gioBatDau.getUTCHours();
      const sStartMin = s.gioBatDau.getUTCMinutes();
      const sEndHour = s.gioKetThuc.getUTCHours();
      const sEndMin = s.gioKetThuc.getUTCMinutes();
      const sStartTotalMin = sStartHour * 60 + sStartMin;
      const sEndTotalMin = sEndHour * 60 + sEndMin;
      return appointmentTotalMinutes >= sStartTotalMin && appointmentTotalMinutes < sEndTotalMin;
    });

    if (coveringShifts.length === 0) {
      throw new ApiError(
        400,
        `Khung giờ hẹn ${timeSlot} ngày ${dateStr} không có ca làm việc nào của bác sĩ đang trực.`
      );
    }

    // Kiểm tra lịch hẹn bận để tìm ca còn trống
    const candidateShiftIds = coveringShifts.map((s) => s.id);
    const candidateDoctorIds = coveringShifts.map((s) => s.nhaSiId);
    const candidateRoomIds = coveringShifts.map((s) => s.phongDieuTriId).filter(Boolean);

    const busyAppointments = await prisma.lichHen.findMany({
      where: {
        ngayHen: targetDate,
        gioHen: startTime,
        trangThai: { notIn: ['huy', 'da_huy'] },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
        OR: [
          { caLamViecId: { in: candidateShiftIds } },
          { caLamViec: { nhaSiId: { in: candidateDoctorIds } } },
          { caLamViec: { phongDieuTriId: { in: candidateRoomIds } } },
        ],
      },
      include: { caLamViec: true },
    });

    const freeShifts = coveringShifts.filter((shift) => {
      const hasConflict = busyAppointments.some(
        (app) =>
          app.caLamViecId === shift.id ||
          app.caLamViec?.nhaSiId === shift.nhaSiId ||
          (shift.phongDieuTriId && app.caLamViec?.phongDieuTriId === shift.phongDieuTriId)
      );
      return !hasConflict;
    });

    if (freeShifts.length === 0) {
      throw new ApiError(
        409,
        `Tất cả các bác sĩ/phòng trực vào khung giờ ${timeSlot} ngày ${dateStr} đều đã có lịch hẹn. Vui lòng chọn khung giờ trống khác.`
      );
    }

    return freeShifts[0];
  }

  // Trường hợp Lễ tân chỉ định đích danh Bác sĩ:
  // 0. Resolve dentistId (hỗ trợ cả nhaSi.id lẫn taiKhoanId từ frontend)
  const doctor = await prisma.nhaSi.findFirst({
    where: {
      OR: [
        { id: dentistId },
        { taiKhoanId: dentistId },
      ],
    },
  });

  if (!doctor || doctor.trangThai === 'nghi_viec') {
    throw new ApiError(404, 'Không tìm thấy thông tin bác sĩ hoặc bác sĩ đã nghỉ việc');
  }

  // 1. Tìm các ca làm việc thực tế đã được xếp của bác sĩ vào ngày này
  const shifts = await prisma.caLamViec.findMany({
    where: {
      nhaSiId: doctor.id,
      ngay: targetDate,
      trangThai: { notIn: ['vang_mat', 'da_huy', 'huy'] },
      ...(customRoomId ? { phongDieuTriId: customRoomId } : {}),
    },
    include: { phongDieuTri: true, nhaSi: true },
  });

  if (shifts.length === 0) {
    throw new ApiError(
      400,
      `Bác sĩ ${doctor.hoTen} không có ca làm việc nào ${customRoomId ? 'tại phòng khám được chỉ định ' : ''}vào ngày ${dateStr}. Vui lòng kiểm tra lại lịch trực của phòng khám.`
    );
  }

  // 2. Khớp khung giờ hẹn với ca trực thực tế
  const matchedShift = shifts.find((s) => {
    const sStartHour = s.gioBatDau.getUTCHours();
    const sStartMin = s.gioBatDau.getUTCMinutes();
    const sEndHour = s.gioKetThuc.getUTCHours();
    const sEndMin = s.gioKetThuc.getUTCMinutes();
    const sStartTotalMin = sStartHour * 60 + sStartMin;
    const sEndTotalMin = sEndHour * 60 + sEndMin;

    return appointmentTotalMinutes >= sStartTotalMin && appointmentTotalMinutes < sEndTotalMin;
  });

  if (!matchedShift) {
    throw new ApiError(
      400,
      `Khung giờ hẹn ${timeSlot} không nằm trong bất kỳ ca làm việc nào của Bác sĩ ${doctor.hoTen} vào ngày ${dateStr}. Vui lòng chọn khung giờ khám phù hợp với ca trực.`
    );
  }

  // 3. Kiểm tra chống trùng lịch hẹn của bác sĩ hoặc phòng trong khung giờ này
  const conflict = await prisma.lichHen.findFirst({
    where: {
      ngayHen: targetDate,
      gioHen: startTime,
      trangThai: { notIn: ['huy', 'da_huy'] },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      OR: [
        { caLamViecId: matchedShift.id },
        { caLamViec: { nhaSiId: doctor.id } },
        { caLamViec: { phongDieuTriId: matchedShift.phongDieuTriId } },
      ],
    },
    include: { benhNhan: true },
  });

  if (conflict) {
    throw new ApiError(
      409,
      `Bác sĩ ${doctor.hoTen} hoặc phòng ${matchedShift.phongDieuTri?.tenPhong} đã có lịch hẹn vào khung giờ ${timeSlot} ngày ${dateStr} (Bệnh nhân: ${conflict.benhNhan?.hoTen || 'Đã đặt'}). Vui lòng chọn khung giờ trống khác.`
    );
  }

  return matchedShift;
}

/**
 * Tra cứu danh sách lịch hẹn (mặc định lấy ca hôm nay)
 */
export const getReceptionistAppointmentsService = async ({
  date,
  status,
  dentistId,
  roomId,
  search,
} = {}) => {
  const where = {};

  // Lọc ngày (mặc định hôm nay nếu không truyền)
  where.ngayHen = parseToDateOnly(date);

  // Lọc theo trạng thái
  if (status && status !== 'ALL') {
    if (status === 'NEED_CHECKIN') {
      where.trangThai = { in: ['cho_xac_nhan', 'da_xac_nhan'] };
    } else if (status === 'AT_CLINIC') {
      where.trangThai = { in: ['da_tiep_nhan', 'cho_kham', 'dang_kham', 'cho_thanh_toan', 'dang_dieu_tri'] };
    } else if (status === 'PENDING_PAYMENT') {
      where.trangThai = 'cho_thanh_toan';
    } else {
      where.trangThai = mapStatusToDatabase(status);
    }
  }

  // Lọc theo Bác sĩ
  if (dentistId && dentistId !== 'ALL') {
    where.caLamViec = { nhaSiId: dentistId };
  }

  // Lọc theo Phòng
  if (roomId && roomId !== 'ALL') {
    where.caLamViec = {
      ...(where.caLamViec || {}),
      phongDieuTriId: roomId,
    };
  }

  // Tìm kiếm từ khóa
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { benhNhan: { hoTen: { contains: q, mode: 'insensitive' } } },
      { benhNhan: { sdt: { contains: q } } },
      { maLichHen: { contains: q, mode: 'insensitive' } },
      { dichVu: { tenDichVu: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const appointments = await prisma.lichHen.findMany({
    where,
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
    orderBy: [{ gioHen: 'asc' }],
  });

  return appointments.map(receptionistAppointmentItemResponseSchema);
};

/**
 * Đặt lịch hẹn mới
 */
export const createAppointmentService = async (payload) => {
  const {
    patientId,
    patientName,
    patientPhone,
    dentistId,
    serviceId,
    date,
    timeSlot,
    roomId,
    notes,
  } = payload;

  // 1. Resolve Bệnh nhân
  let resolvedPatientId = patientId;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    patientId || ''
  );

  if (!resolvedPatientId || !isUuid) {
    // Tìm theo số điện thoại
    let patient = await prisma.benhNhan.findFirst({
      where: { sdt: patientPhone },
    });

    if (!patient) {
      // Tạo mới hồ sơ bệnh nhân nhanh
      const patientCode = `BN${String(Math.floor(1000 + Math.random() * 9000))}`;
      patient = await prisma.benhNhan.create({
        data: {
          maBenhNhan: patientCode,
          hoTen: patientName,
          sdt: patientPhone,
          gioiTinh: 'nu',
          tienSuBenh: 'Không có tiền sử đặc biệt',
          diUng: 'Không có dị ứng thuốc đã biết',
        },
      });
    }
    resolvedPatientId = patient.id;
  }

  // 2. Resolve Dịch vụ
  let resolvedServiceId = serviceId;
  if (!resolvedServiceId) {
    const defaultService = await prisma.dichVu.findFirst({
      where: { trangThai: 'hoat_dong' },
      orderBy: { createdAt: 'asc' },
    });
    resolvedServiceId = defaultService?.id;
  }

  if (!resolvedServiceId) {
    throw new ApiError(400, 'Không tìm thấy dịch vụ nha khoa phù hợp để đặt lịch');
  }

  // 3. Resolve Ca làm việc của Bác sĩ (Bắt buộc phải là ca làm việc thực tế đang tồn tại và còn trống)
  const cleanDate = toCleanDateStr(date);
  const shift = await findValidShiftForDoctor({
    dentistId,
    dateStr: cleanDate,
    timeSlot: timeSlot || '08:30',
    customRoomId: roomId,
  });

  // 4. Xử lý giờ hẹn
  const [hours, minutes] = (timeSlot || '08:30').split(':').map(Number);
  const startTime = new Date('1970-01-01T00:00:00.000Z');
  startTime.setUTCHours(hours || 8, minutes || 30, 0, 0);

  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 phút sau

  // 5. Sinh mã lịch hẹn
  const dateFormatted = cleanDate.replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const maLichHen = `LH-${dateFormatted}-${randomSuffix}`;

  const newAppointment = await prisma.lichHen.create({
    data: {
      maLichHen,
      benhNhanId: resolvedPatientId,
      caLamViecId: shift.id,
      dichVuId: resolvedServiceId,
      ngayHen: parseToDateOnly(cleanDate),
      gioHen: startTime,
      gioKetThucDuKien: endTime,
      trangThai: 'da_xac_nhan',
      ghiChu: notes || '',
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

  return receptionistAppointmentItemResponseSchema(newAppointment);
};

/**
 * Cập nhật trạng thái lịch hẹn (RÀNG BUỘC TỊNH TIẾN NGHIÊM NGẶT THEO PHÂN QUYỀN RBAC)
 * Quy trình: cho_xac_nhan -> da_xac_nhan -> da_tiep_nhan -> cho_kham
 * Tại cho_kham: KHÓA CỨNG Lễ tân, chỉ Bác sĩ mới được chuyển sang dang_kham
 */
export const updateAppointmentStatusService = async (id, status) => {
  const appointment = await prisma.lichHen.findUnique({
    where: { id },
  });

  if (!appointment) {
    throw new ApiError(404, 'Không tìm thấy lịch hẹn');
  }

  const currentStatus = appointment.trangThai;
  const dbStatus = mapStatusToDatabase(status);

  // Nếu trạng thái mới trùng với trạng thái hiện tại -> giữ nguyên
  if (currentStatus === dbStatus) {
    return receptionistAppointmentItemResponseSchema(appointment);
  }

  // 1. Khóa ca hẹn đã đóng (hoàn thành)
  if (currentStatus === 'hoan_thanh') {
    throw new ApiError(400, 'Ca hẹn này đã hoàn tất khám và đóng ca, không thể thay đổi trạng thái.');
  }

  // 2. Khóa cứng Lễ tân khi ca hẹn đã vào phòng Bác sĩ hoặc đang xử lý chuyên môn
  const DENTIST_LOCKED_STATUSES = ['cho_kham', 'dang_kham', 'cho_thanh_toan', 'dang_dieu_tri'];
  if (DENTIST_LOCKED_STATUSES.includes(currentStatus)) {
    throw new ApiError(
      403,
      `Bệnh nhân đã được mời vào phòng khám (${currentStatus === 'cho_kham' ? 'Đang chờ khám' : 'Đang trong quy trình chuyên môn'}). Lễ tân không có quyền cập nhật trạng thái ở bước này.`
    );
  }

  // 3. Ma trận tịnh tiến bắt buộc dành cho Lễ tân
  const RECEPTIONIST_ALLOWED_TRANSITIONS = {
    cho_xac_nhan: ['da_xac_nhan', 'da_huy'],
    da_xac_nhan: ['da_tiep_nhan', 'da_huy'],
    da_tiep_nhan: ['cho_kham', 'da_huy'],
  };

  const allowedNext = RECEPTIONIST_ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(dbStatus)) {
    throw new ApiError(
      400,
      `Không thể chuyển trạng thái từ "${currentStatus}" sang "${dbStatus}". Quy trình yêu cầu tịnh tiến tuần tự: Chờ xác nhận ➔ Đã xác nhận ➔ Đã đến phòng khám (Tiếp nhận) ➔ Đang chờ khám.`
    );
  }

  const data = {
    trangThai: dbStatus,
    updatedAt: new Date(),
  };

  if (dbStatus === 'da_huy') {
    data.ngayHuy = new Date();
    data.lyDoHuy = 'Lễ tân hủy ca hẹn';
  }

  const updated = await prisma.lichHen.update({
    where: { id },
    data,
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

  return receptionistAppointmentItemResponseSchema(updated);
};

/**
 * Điều phối lại Bác sĩ hoặc Phòng khám
 */
export const reassignAppointmentService = async (id, { dentistId, doctorRoom, roomId, notes }) => {
  const appointment = await prisma.lichHen.findUnique({
    where: { id },
    include: { caLamViec: true },
  });

  if (!appointment) {
    throw new ApiError(404, 'Không tìm thấy lịch hẹn');
  }

  // Khóa điều phối nếu bệnh nhân đã check-in / vào phòng khám
  const CHECKED_IN_STATUSES = ['da_tiep_nhan', 'cho_kham', 'dang_kham', 'cho_thanh_toan', 'dang_dieu_tri', 'hoan_thanh'];
  if (CHECKED_IN_STATUSES.includes(appointment.trangThai)) {
    throw new ApiError(400, 'Bệnh nhân đã check-in / vào phòng khám, không thể đổi bác sĩ hoặc phòng điều trị.');
  }

  const targetDoctorId = dentistId || appointment.caLamViec?.nhaSiId;
  const targetRoomId = roomId || (doctorRoom ? await resolveRoomIdByName(doctorRoom) : null);
  const dateStr = appointment.ngayHen.toISOString().slice(0, 10);
  const timeSlot = appointment.gioHen.toISOString().slice(11, 16);

  // Tìm ca làm việc thực tế hợp lệ của bác sĩ và phòng được chọn
  const validShift = await findValidShiftForDoctor({
    dentistId: targetDoctorId,
    dateStr,
    timeSlot,
    customRoomId: targetRoomId,
    excludeAppointmentId: id,
  });

  const updated = await prisma.lichHen.update({
    where: { id },
    data: {
      caLamViecId: validShift.id,
      ghiChu: notes
        ? `${appointment.ghiChu || ''} [Điều phối: ${notes}]`.trim()
        : appointment.ghiChu,
      updatedAt: new Date(),
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

  return receptionistAppointmentItemResponseSchema(updated);
};

/**
 * Dời lịch hẹn sang ngày/khung giờ mới (cho phép đổi luôn Bác sĩ & Phòng khám theo ca trực thực tế)
 */
export const rescheduleAppointmentService = async (
  id,
  { date, timeSlot, dentistId, roomId, doctorRoom, notes }
) => {
  const appointment = await prisma.lichHen.findUnique({
    where: { id },
    include: { caLamViec: true },
  });

  if (!appointment) {
    throw new ApiError(404, 'Không tìm thấy lịch hẹn');
  }

  // Khóa dời lịch nếu bệnh nhân đã check-in / vào phòng khám
  const CHECKED_IN_STATUSES = [
    'da_tiep_nhan',
    'cho_kham',
    'dang_kham',
    'cho_thanh_toan',
    'dang_dieu_tri',
    'hoan_thanh',
  ];
  if (CHECKED_IN_STATUSES.includes(appointment.trangThai)) {
    throw new ApiError(
      400,
      'Bệnh nhân đã check-in / vào phòng khám, không thể dời lịch hẹn.'
    );
  }

  const targetDoctorId = dentistId || appointment.caLamViec?.nhaSiId;
  const targetRoomId = roomId || (doctorRoom ? await resolveRoomIdByName(doctorRoom) : undefined);
  const cleanDate = toCleanDateStr(date);
  const newShift = await findValidShiftForDoctor({
    dentistId: targetDoctorId,
    dateStr: cleanDate,
    timeSlot: timeSlot || '08:30',
    customRoomId: targetRoomId,
    excludeAppointmentId: id,
  });

  const [hours, minutes] = (timeSlot || '08:30').split(':').map(Number);
  const startTime = new Date('1970-01-01T00:00:00.000Z');
  startTime.setUTCHours(hours || 8, minutes || 30, 0, 0);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

  const updated = await prisma.lichHen.update({
    where: { id },
    data: {
      caLamViecId: newShift.id,
      ngayHen: parseToDateOnly(cleanDate),
      gioHen: startTime,
      gioKetThucDuKien: endTime,
      trangThai: 'da_xac_nhan',
      ghiChu: notes
        ? `${appointment.ghiChu || ''} [Dời lịch: ${notes}]`.trim()
        : appointment.ghiChu,
      updatedAt: new Date(),
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

  return receptionistAppointmentItemResponseSchema(updated);
};

/**
 * Tra cứu ca khám khả dụng (cho phép lọc theo phòng khám và trả về danh sách phòng khám có ca trực)
 */
export const getReceptionistAvailableSlotsService = async (params) => {
  const cleanDate = toCleanDateStr(params.date || getVietnamTodayDateString());
  const targetDate = parseToDateOnly(cleanDate);

  // Chuẩn hóa dentistId (hỗ trợ cả nhaSi.id và taiKhoan.id)
  let cleanDentistId = params.dentistId;
  if (cleanDentistId && cleanDentistId !== 'ALL' && cleanDentistId !== '') {
    const doc = await prisma.nhaSi.findFirst({
      where: {
        OR: [{ id: cleanDentistId }, { taiKhoanId: cleanDentistId }],
      },
    });
    if (doc) cleanDentistId = doc.id;
  } else {
    cleanDentistId = undefined;
  }

  const cleanRoomId =
    params.roomId && params.roomId !== 'ALL' && params.roomId !== ''
      ? params.roomId
      : undefined;

  // 1. Lấy danh sách các ca trực thực tế trên DB vào ngày này
  const shiftsOnDate = await prisma.caLamViec.findMany({
    where: {
      ngay: targetDate,
      trangThai: { notIn: ['vang_mat', 'da_huy', 'huy'] },
      ...(cleanDentistId ? { nhaSiId: cleanDentistId } : {}),
      ...(cleanRoomId ? { phongDieuTriId: cleanRoomId } : {}),
    },
    include: {
      phongDieuTri: {
        select: { id: true, tenPhong: true, maPhong: true },
      },
      nhaSi: {
        select: { id: true, hoTen: true, chuyenKhoa: true, hinhAnhUrl: true },
      },
    },
  });

  // 2. Thu thập danh sách các phòng khám có ca trực thực tế trong ngày
  const roomMap = new Map();
  shiftsOnDate.forEach((s) => {
    if (s.phongDieuTri && !roomMap.has(s.phongDieuTri.id)) {
      roomMap.set(s.phongDieuTri.id, {
        id: s.phongDieuTri.id,
        name: s.phongDieuTri.tenPhong,
        code: s.phongDieuTri.maPhong,
      });
    }
  });
  const availableRooms = Array.from(roomMap.values());

  // 3. Lấy 16 slot chuẩn từ client appointment service
  const result = await clientGetAvailableSlotsService({
    ...params,
    dentistId: cleanDentistId,
    roomId: cleanRoomId,
  });

  // 4. Gán thông tin phòng khám và ca trực tương ứng cho từng slot
  let slots = (result.slots || []).map((slot) => {
    const [h, m] = slot.time.split(':').map(Number);
    const slotMin = (h || 0) * 60 + (m || 0);

    const matchedShift = shiftsOnDate.find((s) => {
      const sStartMin = s.gioBatDau.getUTCHours() * 60 + s.gioBatDau.getUTCMinutes();
      const sEndMin = s.gioKetThuc.getUTCHours() * 60 + s.gioKetThuc.getUTCMinutes();
      return slotMin >= sStartMin && slotMin < sEndMin;
    });

    if (cleanRoomId && (!matchedShift || matchedShift.phongDieuTriId !== cleanRoomId)) {
      return {
        ...slot,
        isAvailable: false,
        reason: 'NO_SHIFT_IN_ROOM',
        reasonLabel: 'Không có ca trực nào tại phòng này vào khung giờ đã chọn',
      };
    }

    if (matchedShift) {
      return {
        ...slot,
        roomId: matchedShift.phongDieuTri?.id,
        roomName: matchedShift.phongDieuTri?.tenPhong,
        shiftId: matchedShift.id,
        dentistId: matchedShift.nhaSi?.id,
        dentistName: matchedShift.nhaSi?.hoTen,
      };
    }

    return slot;
  });

  const hasShiftOnDate = shiftsOnDate.length > 0;

  return {
    ...result,
    slots,
    availableRooms,
    hasShiftOnDate,
  };
};

/**
 * Lấy danh sách các ca làm việc thực tế đang trống và khả dụng để Lễ tân điều phối đổi Bác sĩ / Phòng
 */
export const getAvailableReassignShiftsService = async ({ appointmentId, date, timeSlot }) => {
  let targetDateStr = date;
  let targetTimeSlot = timeSlot;
  let excludeAppointmentId = appointmentId;

  if (appointmentId && (!targetDateStr || !targetTimeSlot)) {
    const apt = await prisma.lichHen.findUnique({
      where: { id: appointmentId },
      include: { caLamViec: true },
    });
    if (apt) {
      targetDateStr = apt.ngayHen.toISOString().slice(0, 10);
      targetTimeSlot = apt.gioHen.toISOString().slice(11, 16);
    }
  }

  if (!targetDateStr) {
    targetDateStr = getVietnamTodayDateString();
  }
  if (!targetTimeSlot) {
    targetTimeSlot = '08:30';
  }

  const targetDate = parseToDateOnly(targetDateStr);
  const [hours, minutes] = targetTimeSlot.split(':').map(Number);
  const appointmentTotalMinutes = (hours || 8) * 60 + (minutes || 30);
  const startTime = new Date('1970-01-01T00:00:00.000Z');
  startTime.setUTCHours(hours || 8, minutes || 30, 0, 0);

  // Tìm tất cả các ca làm việc thực tế trong ngày
  const allShifts = await prisma.caLamViec.findMany({
    where: {
      ngay: targetDate,
      trangThai: { notIn: ['vang_mat', 'da_huy', 'huy'] },
    },
    include: {
      nhaSi: { select: { id: true, hoTen: true, chuyenKhoa: true, hinhAnhUrl: true, trangThai: true } },
      phongDieuTri: { select: { id: true, tenPhong: true, maPhong: true } },
    },
  });

  // Lọc các ca bao phủ khung giờ này
  const coveringShifts = allShifts.filter((s) => {
    if (s.nhaSi?.trangThai === 'nghi_viec') return false;
    const sStartHour = s.gioBatDau.getUTCHours();
    const sStartMin = s.gioBatDau.getUTCMinutes();
    const sEndHour = s.gioKetThuc.getUTCHours();
    const sEndMin = s.gioKetThuc.getUTCMinutes();
    const sStartTotalMin = sStartHour * 60 + sStartMin;
    const sEndTotalMin = sEndHour * 60 + sEndMin;
    return appointmentTotalMinutes >= sStartTotalMin && appointmentTotalMinutes < sEndTotalMin;
  });

  // Lấy các lịch hẹn trùng giờ để loại trừ ca bận
  const busyAppointments = await prisma.lichHen.findMany({
    where: {
      ngayHen: targetDate,
      gioHen: startTime,
      trangThai: { notIn: ['huy', 'da_huy'] },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: {
      caLamViecId: true,
      caLamViec: { select: { nhaSiId: true, phongDieuTriId: true } },
    },
  });

  const busyDoctorIds = new Set(busyAppointments.map((a) => a.caLamViec?.nhaSiId).filter(Boolean));
  const busyRoomIds = new Set(busyAppointments.map((a) => a.caLamViec?.phongDieuTriId).filter(Boolean));

  return coveringShifts.map((shift) => {
    const isDoctorBusy = busyDoctorIds.has(shift.nhaSiId);
    const isRoomBusy = busyRoomIds.has(shift.phongDieuTriId);
    const isAvailable = !isDoctorBusy && !isRoomBusy;

    const startH = String(shift.gioBatDau.getUTCHours()).padStart(2, '0');
    const startM = String(shift.gioBatDau.getUTCMinutes()).padStart(2, '0');
    const endH = String(shift.gioKetThuc.getUTCHours()).padStart(2, '0');
    const endM = String(shift.gioKetThuc.getUTCMinutes()).padStart(2, '0');
    const timeSlotStr = `${startH}:${startM} - ${endH}:${endM}`;
    const shiftName = parseInt(startH, 10) < 12 ? 'Ca sáng' : 'Ca chiều';

    return {
      shiftId: shift.id,
      dentistId: shift.nhaSi?.id,
      dentistName: shift.nhaSi?.hoTen,
      dentistSpecialty: shift.nhaSi?.chuyenKhoa,
      dentistAvatar: shift.nhaSi?.hinhAnhUrl,
      roomId: shift.phongDieuTri?.id,
      roomName: shift.phongDieuTri?.tenPhong,
      timeSlot: timeSlotStr,
      shiftName,
      isAvailable,
      reason: isDoctorBusy ? 'Bác sĩ bận' : isRoomBusy ? 'Phòng bận' : null,
    };
  });
};

export default {
  getReceptionistAppointmentsService,
  createAppointmentService,
  updateAppointmentStatusService,
  reassignAppointmentService,
  rescheduleAppointmentService,
  getReceptionistAvailableSlotsService,
  getAvailableReassignShiftsService,
};
