import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import { getVietnamTodayDateString } from '../../../dtos/departments/admins/adminWorkShiftDto.js';
import {
  mapStatusToDatabase,
  receptionistAppointmentItemResponseSchema,
} from '../../../dtos/departments/receptionists/receptionistAppointmentDto.js';

/**
 * Tìm hoặc tạo tự động ca làm việc của Bác sĩ trong ngày để gán cho Lịch hẹn
 */
async function findOrCreateShiftForDoctor(dentistId, dateStr, customRoomId = null) {
  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

  // 0. Resolve dentistId (hỗ trợ cả nhaSi.id lẫn taiKhoanId từ frontend)
  let resolvedDoctorId = dentistId;
  const doctor = await prisma.nhaSi.findFirst({
    where: {
      OR: [
        { id: dentistId },
        { taiKhoanId: dentistId },
      ],
    },
  });
  if (doctor) {
    resolvedDoctorId = doctor.id;
  }

  // 1. Tìm ca làm việc đã có của bác sĩ vào ngày này
  let shift = await prisma.caLamViec.findFirst({
    where: {
      nhaSiId: resolvedDoctorId,
      ngay: targetDate,
    },
    include: { phongDieuTri: true, nhaSi: true },
  });

  if (shift) {
    // Nếu có chỉ định đổi phòng và khác phòng hiện tại của ca
    if (customRoomId && shift.phongDieuTriId !== customRoomId) {
      shift = await prisma.caLamViec.update({
        where: { id: shift.id },
        data: { phongDieuTriId: customRoomId },
        include: { phongDieuTri: true, nhaSi: true },
      });
    }
    return shift;
  }

  // 2. Nếu bác sĩ chưa có ca trực nào ngày này -> Chọn phòng điều trị khả dụng
  let targetRoomId = customRoomId;
  if (!targetRoomId) {
    const defaultRoom = await prisma.phongDieuTri.findFirst({
      where: { trangThai: 'hoat_dong' },
      orderBy: { maPhong: 'asc' },
    });
    if (!defaultRoom) {
      throw new ApiError(500, 'Không tìm thấy phòng điều trị nào đang hoạt động trong hệ thống');
    }
    targetRoomId = defaultRoom.id;
  }

  // Tạo ca làm việc mới tự động cho ngày này (08:00 - 17:30)
  shift = await prisma.caLamViec.create({
    data: {
      nhaSiId: resolvedDoctorId,
      phongDieuTriId: targetRoomId,
      ngay: targetDate,
      gioBatDau: new Date('1970-01-01T08:00:00.000Z'),
      gioKetThuc: new Date('1970-01-01T17:30:00.000Z'),
      trangThai: 'chua_dien_ra',
      ghiChu: 'Tự động tạo từ lịch hẹn của Lễ tân',
    },
    include: { phongDieuTri: true, nhaSi: true },
  });

  return shift;
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

  // Mặc định lấy ngày hôm nay nếu không truyền date
  const targetDateStr = date || getVietnamTodayDateString();
  where.ngayHen = new Date(`${targetDateStr}T00:00:00.000Z`);

  // Lọc theo trạng thái
  if (status && status !== 'ALL') {
    if (status === 'NEED_CHECKIN') {
      where.trangThai = { in: ['cho_xac_nhan', 'da_xac_nhan'] };
    } else if (status === 'AT_CLINIC') {
      where.trangThai = { in: ['da_tiep_nhan', 'cho_kham', 'dang_kham', 'cho_thanh_toan'] };
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

  // 3. Resolve Ca làm việc của Bác sĩ
  const shift = await findOrCreateShiftForDoctor(dentistId, date, roomId);

  // 4. Xử lý giờ hẹn
  const [hours, minutes] = (timeSlot || '08:30').split(':').map(Number);
  const startTime = new Date('1970-01-01T00:00:00.000Z');
  startTime.setUTCHours(hours || 8, minutes || 30, 0, 0);

  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 phút sau

  // 5. Sinh mã lịch hẹn
  const dateFormatted = (date || '').replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const maLichHen = `LH-${dateFormatted}-${randomSuffix}`;

  const newAppointment = await prisma.lichHen.create({
    data: {
      maLichHen,
      benhNhanId: resolvedPatientId,
      caLamViecId: shift.id,
      dichVuId: resolvedServiceId,
      ngayHen: new Date(`${date}T00:00:00.000Z`),
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
 * Cập nhật trạng thái lịch hẹn (Check-in, Vào phòng, Hủy ca...)
 */
export const updateAppointmentStatusService = async (id, status) => {
  const appointment = await prisma.lichHen.findUnique({
    where: { id },
  });

  if (!appointment) {
    throw new ApiError(404, 'Không tìm thấy lịch hẹn');
  }

  const dbStatus = mapStatusToDatabase(status);
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

  const targetDoctorId = dentistId || appointment.caLamViec?.nhaSiId;

  // Resolve room ID nếu truyền tên phòng (ví dụ "Phòng 01")
  let targetRoomId = roomId;
  if (!targetRoomId && doctorRoom) {
    const matchedRoom = await prisma.phongDieuTri.findFirst({
      where: {
        OR: [
          { tenPhong: { contains: doctorRoom, mode: 'insensitive' } },
          { maPhong: { contains: doctorRoom, mode: 'insensitive' } },
        ],
      },
    });
    if (matchedRoom) {
      targetRoomId = matchedRoom.id;
    }
  }

  const dateStr = appointment.ngayHen.toISOString().slice(0, 10);
  const newShift = await findOrCreateShiftForDoctor(targetDoctorId, dateStr, targetRoomId);

  const updated = await prisma.lichHen.update({
    where: { id },
    data: {
      caLamViecId: newShift.id,
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
 * Dời lịch hẹn sang ngày/khung giờ mới
 */
export const rescheduleAppointmentService = async (id, { date, timeSlot, notes }) => {
  const appointment = await prisma.lichHen.findUnique({
    where: { id },
    include: { caLamViec: true },
  });

  if (!appointment) {
    throw new ApiError(404, 'Không tìm thấy lịch hẹn');
  }

  const doctorId = appointment.caLamViec?.nhaSiId;
  const newShift = await findOrCreateShiftForDoctor(doctorId, date);

  const [hours, minutes] = (timeSlot || '08:30').split(':').map(Number);
  const startTime = new Date('1970-01-01T00:00:00.000Z');
  startTime.setUTCHours(hours || 8, minutes || 30, 0, 0);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

  const updated = await prisma.lichHen.update({
    where: { id },
    data: {
      caLamViecId: newShift.id,
      ngayHen: new Date(`${date}T00:00:00.000Z`),
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

export default {
  getReceptionistAppointmentsService,
  createAppointmentService,
  updateAppointmentStatusService,
  reassignAppointmentService,
  rescheduleAppointmentService,
};
