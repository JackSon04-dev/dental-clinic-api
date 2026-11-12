import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  getWeekRangeFromDateString,
  getMonthRangeFromDateString,
  adminWorkShiftDetailResponseSchema,
  adminWorkShiftsMatrixResponseSchema,
  adminGenerateWorkShiftsResponseSchema,
  formatDateYYYYMMDD,
  formatTimeHHMM,
  getSessionFromTime,
  DAY_NAMES,
} from '../../../dtos/departments/admins/adminWorkShiftDto.js';

/**
 * autoUpdateExpiredPendingShifts
 * Tự động quét và cập nhật các ca quá 15 phút từ giờ bắt đầu nhưng chưa điểm danh thành 'vang_mat'
 * Cơ chế: Just-In-Time (JIT) / Lazy Evaluation
 */
export const autoUpdateExpiredPendingShifts = async () => {
  return await prisma.$executeRaw`
    UPDATE ca_lam_viec
    SET trang_thai = 'vang_mat', updated_at = NOW()
    WHERE trang_thai = 'chua_dien_ra'
      AND (ngay + gio_bat_dau + interval '15 minutes') < (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh');
  `;
};

/**
 * getWorkShiftsMatrixService
 * Lấy danh sách ca làm việc theo tuần (mặc định tuần hiện tại), tổ chức dạng Ma trận 4 phòng x 7 ngày
 * @param {Object} query { date, roomId }
 */
export const getWorkShiftsMatrixService = async ({
  date = null,
  roomId = null,
} = {}) => {
  // 1. Tự động quét và cập nhật các ca quá 15 phút chưa điểm danh thành vắng mặt
  await autoUpdateExpiredPendingShifts();

  // 2. Tính khoảng tuần Thứ Hai -> Chủ Nhật
  const week = getWeekRangeFromDateString(date);

  // 3. Chuẩn bị điều kiện lọc
  const roomWhere = { trangThai: 'hoat_dong' };
  if (roomId) roomWhere.id = roomId;

  const shiftWhere = {
    ngay: {
      gte: new Date(week.startDate),
      lte: new Date(week.endDate),
    },
  };
  if (roomId) shiftWhere.phongDieuTriId = roomId;

  // 4. Lấy đồng thời danh mục phòng, bác sĩ và danh sách ca làm việc trong tuần
  const [rooms, doctors, shifts] = await Promise.all([
    prisma.phongDieuTri.findMany({
      where: roomWhere,
      orderBy: { maPhong: 'asc' },
    }),
    prisma.nhaSi.findMany({
      where: { trangThai: 'dang_lam_viec' },
      orderBy: { maNhaSi: 'asc' },
    }),
    prisma.caLamViec.findMany({
      where: shiftWhere,
      include: {
        phongDieuTri: true,
        nhaSi: true,
      },
      orderBy: [
        { ngay: 'asc' },
        { gioBatDau: 'asc' },
      ],
    }),
  ]);

  return adminWorkShiftsMatrixResponseSchema({
    week,
    shifts,
    rooms,
    doctors,
  });
};

/**
 * updateWorkShiftStatusService
 * Cập nhật trạng thái có mặt / vắng mặt cho ca làm việc
 * Hỗ trợ cập nhật luân phiên linh hoạt (bác sĩ xin nghỉ trước hoặc đi làm bù)
 * @param {string} id UUID ca làm việc
 * @param {Object} body { status, notes }
 */
export const updateWorkShiftStatusService = async (id, { status, doctorId = undefined, notes = undefined }) => {
  // 1. Kiểm tra ca làm việc có tồn tại
  const shift = await prisma.caLamViec.findUnique({
    where: { id },
    include: {
      phongDieuTri: true,
      nhaSi: true,
    },
  });

  if (!shift) {
    throw new ApiError(404, 'Không tìm thấy ca làm việc trong hệ thống');
  }

  // 2. Tìm bác sĩ được chỉ định (hỗ trợ cả nhaSi.id và taiKhoan.id)
  let targetDoc = shift.nhaSi;
  const updateData = {};

  if (doctorId) {
    targetDoc = await prisma.nhaSi.findFirst({
      where: {
        OR: [
          { id: doctorId },
          { taiKhoanId: doctorId }
        ]
      }
    });
    if (!targetDoc) throw new ApiError(404, 'Bác sĩ không tồn tại trong hệ thống');
    if (targetDoc.trangThai === 'nghi_viec') throw new ApiError(400, 'Bác sĩ đã nghỉ việc');
    updateData.nhaSiId = targetDoc.id;
  }

  const normalizedStatus = status === 'hoan_thanh' ? 'da_dien_ra' : status;
  if (normalizedStatus) {
    updateData.trangThai = normalizedStatus;
  }
  if (notes !== undefined) {
    updateData.ghiChu = notes;
  }

  // 3. Kiểm tra chống trùng lịch: Bác sĩ không thể được phân công 2 ca cùng ngày và cùng buổi tại 2 phòng khác nhau (trừ khi ca kia đã đánh dấu 'vang_mat')
  const finalStatus = normalizedStatus || shift.trangThai;
  if (targetDoc && finalStatus !== 'vang_mat') {
    const conflictShift = await prisma.caLamViec.findFirst({
      where: {
        id: { not: id },
        nhaSiId: targetDoc.id,
        ngay: shift.ngay,
        gioBatDau: shift.gioBatDau,
        trangThai: { not: 'vang_mat' },
      },
      include: {
        phongDieuTri: true,
      },
    });

    if (conflictShift) {
      const roomName = conflictShift.phongDieuTri?.tenPhong || conflictShift.phongDieuTri?.maPhong || 'phòng khác';
      const timeStr = formatTimeHHMM(shift.gioBatDau);
      const sessionLabel = String(timeStr).startsWith('08') ? 'Ca Sáng' : 'Ca Chiều';
      throw new ApiError(
        409,
        `Trùng lịch trực: Bác sĩ ${targetDoc.hoTen} đã được phân công ${sessionLabel} (${timeStr}) tại ${roomName}. Không thể phân công 2 phòng cùng một khung giờ!`
      );
    }
  }

  const updatedShift = await prisma.caLamViec.update({
    where: { id },
    data: updateData,
    include: {
      phongDieuTri: true,
      nhaSi: true,
    },
  });

  return adminWorkShiftDetailResponseSchema(updatedShift);
};

/**
 * generateWorkShiftsFromTemplateService
 * Tự động khởi tạo nhanh 56 ca làm việc cho 1 tuần mới dựa trên Khung mẫu tuần (KhungCaLamViec)
 * @param {Object} param { startDate } YYYY-MM-DD (phải là ngày Thứ Hai)
 */
export const generateWorkShiftsFromTemplateService = async ({ startDate }) => {
  const week = getWeekRangeFromDateString(startDate);

  // 1. Xác thực ngày truyền vào bắt buộc là ngày Thứ Hai
  if (startDate !== week.startDate) {
    throw new ApiError(
      400,
      `Ngày bắt đầu tuần (${startDate}) không phải là ngày Thứ Hai. Thứ Hai của tuần này là ngày ${week.startDate}.`
    );
  }

  // 2. Kiểm tra xem tuần này đã có ca làm việc nào chưa để tránh tạo trùng lặp
  const existingCount = await prisma.caLamViec.count({
    where: {
      ngay: {
        gte: new Date(week.startDate),
        lte: new Date(week.endDate),
      },
    },
  });

  if (existingCount > 0) {
    throw new ApiError(
      400,
      `Tuần từ ${week.startDate} đến ${week.endDate} đã tồn tại ${existingCount} ca làm việc. Vui lòng không tạo trùng lặp!`
    );
  }

  // 3. Lấy toàn bộ 56 ca mẫu từ Khung ca làm việc (KhungCaLamViec)
  const templates = await prisma.khungCaLamViec.findMany({
    orderBy: [
      { thuTrongTuan: 'asc' },
      { gioBatDau: 'asc' },
    ],
  });

  if (templates.length === 0) {
    throw new ApiError(
      400,
      'Chưa có dữ liệu Khung ca mẫu (KhungCaLamViec). Vui lòng thiết lập Khung mẫu trước khi tạo lịch tuần!'
    );
  }

  // 4. Map 56 ca mẫu sang 56 ca thực tế của tuần
  // thuTrongTuan: 2 (Thứ Hai) -> week.days[0], ..., 8 (Chủ Nhật) -> week.days[6]
  const newShifts = templates.map((t) => {
    const dayIndex = t.thuTrongTuan - 2;
    const targetDay = week.days[dayIndex];

    return {
      nhaSiId: t.nhaSiId,
      phongDieuTriId: t.phongDieuTriId,
      ngay: new Date(targetDay.date),
      gioBatDau: t.gioBatDau,
      gioKetThuc: t.gioKetThuc,
      trangThai: 'chua_dien_ra',
      ghiChu: t.ghiChu,
    };
  });

  // 5. Thực hiện lưu batch vào CSDL
  await prisma.caLamViec.createMany({
    data: newShifts,
  });

  return adminGenerateWorkShiftsResponseSchema({
    startDate: week.startDate,
    endDate: week.endDate,
    totalCreated: newShifts.length,
  });
};

/**
 * getDoctorsWorkShiftsOverviewService
 * Lấy danh sách toàn bộ bác sĩ đang làm việc kèm KPI ca trực:
 * - dailyShiftsCount: số ca trong ngày được chỉ định (hoặc ngày hôm nay)
 * - weeklyShiftsCount: tổng số ca trong tuần chứa ngày đó (Thứ Hai -> Chủ Nhật)
 * - shifts: danh sách ca trực trong tuần
 */
export const getDoctorsWorkShiftsOverviewService = async ({ date = null } = {}) => {
  // 1. Tự động cập nhật các ca quá hạn chưa điểm danh thành vắng mặt
  await autoUpdateExpiredPendingShifts();

  // 2. Tính toán khoảng tuần Thứ Hai -> Chủ Nhật và khoảng tháng dương lịch
  const week = getWeekRangeFromDateString(date);
  const monthRange = getMonthRangeFromDateString(date);
  const targetDateStr = date || week.currentDate;

  // 3. Lấy danh sách tất cả bác sĩ đang làm việc
  const doctors = await prisma.nhaSi.findMany({
    where: { trangThai: 'dang_lam_viec' },
    orderBy: { maNhaSi: 'asc' },
  });

  // 4. Lấy tất cả ca làm việc trong tuần và trong tháng của các bác sĩ
  const [shifts, monthShifts] = await Promise.all([
    prisma.caLamViec.findMany({
      where: {
        ngay: {
          gte: new Date(week.startDate),
          lte: new Date(week.endDate),
        },
      },
      include: {
        phongDieuTri: true,
      },
      orderBy: [
        { ngay: 'asc' },
        { gioBatDau: 'asc' },
      ],
    }),
    prisma.caLamViec.findMany({
      where: {
        ngay: {
          gte: new Date(monthRange.startDate),
          lte: new Date(monthRange.endDate),
        },
      },
      select: {
        id: true,
        nhaSiId: true,
        trangThai: true,
      },
    }),
  ]);

  // 5. Gom nhóm ca theo nhaSiId cho cả tuần và tháng
  const shiftsByDoctor = new Map();
  for (const s of shifts) {
    if (!shiftsByDoctor.has(s.nhaSiId)) {
      shiftsByDoctor.set(s.nhaSiId, []);
    }
    shiftsByDoctor.get(s.nhaSiId).push(s);
  }

  const COMPLETED_STATUSES = new Set(['da_dien_ra', 'co_mat', 'hoan_thanh', 'COMPLETED']);
  const monthShiftsByDoctor = new Map();
  for (const s of monthShifts) {
    if (!monthShiftsByDoctor.has(s.nhaSiId)) {
      monthShiftsByDoctor.set(s.nhaSiId, []);
    }
    monthShiftsByDoctor.get(s.nhaSiId).push(s);
  }

  // 6. Tính toán KPI và tổng hợp kết quả cho từng bác sĩ
  const result = doctors.map((doc) => {
    const docShifts = shiftsByDoctor.get(doc.id) || [];
    const docMonthShifts = monthShiftsByDoctor.get(doc.id) || [];

    // Đếm số ca trong ngày được chọn
    const dailyShifts = docShifts.filter((s) => formatDateYYYYMMDD(s.ngay) === targetDateStr);
    const dailyShiftsCount = dailyShifts.length;

    // Tổng số ca trong tuần
    const weeklyShiftsCount = docShifts.length;

    // Thống kê ca trong tháng dương lịch
    const monthlyShiftsCount = docMonthShifts.length;
    const monthlyCompletedShiftsCount = docMonthShifts.filter((s) => COMPLETED_STATUSES.has(s.trangThai)).length;
    const monthlyPendingShiftsCount = monthlyShiftsCount - monthlyCompletedShiftsCount;

    // Format danh sách ca trực trong tuần
    const formattedShifts = docShifts.map((s) => ({
      id: s.id,
      shiftDate: formatDateYYYYMMDD(s.ngay),
      date: formatDateYYYYMMDD(s.ngay),
      startTime: formatTimeHHMM(s.gioBatDau),
      endTime: formatTimeHHMM(s.gioKetThuc),
      session: getSessionFromTime(s.gioBatDau),
      roomId: s.phongDieuTriId,
      roomName: s.phongDieuTri?.tenPhong || s.phongDieuTri?.maPhong || 'Phòng khám',
      status: s.trangThai,
      notes: s.ghiChu,
    }));

    return {
      doctorId: doc.id,
      doctorCode: doc.maNhaSi,
      doctorName: doc.hoTen,
      email: doc.email,
      phone: doc.sdt,
      specialty: doc.chuyenKhoa,
      dailyShiftsCount,
      weeklyShiftsCount,
      monthlyShiftsCount,
      monthlyCompletedShiftsCount,
      monthlyPendingShiftsCount,
      month: monthRange.month,
      year: monthRange.year,
      shifts: formattedShifts,
    };
  });

  return result;
};

/**
 * getShiftAppointmentsService
 * Lấy thông tin chi tiết một ca làm việc kèm danh sách cuộc hẹn khám và bệnh nhân
 */
export const getShiftAppointmentsService = async ({ shiftId }) => {
  const shift = await prisma.caLamViec.findUnique({
    where: { id: shiftId },
    include: {
      nhaSi: {
        select: {
          id: true,
          maNhaSi: true,
          hoTen: true,
          sdt: true,
          chuyenKhoa: true,
        },
      },
      phongDieuTri: {
        select: {
          id: true,
          maPhong: true,
          tenPhong: true,
        },
      },
      lichHen: {
        include: {
          benhNhan: {
            select: {
              id: true,
              maBenhNhan: true,
              hoTen: true,
              sdt: true,
              ngaySinh: true,
              gioiTinh: true,
            },
          },
          dichVu: {
            select: {
              id: true,
              maDichVu: true,
              tenDichVu: true,
              gia: true,
            },
          },
          hoSoBenhAn: {
            select: {
              id: true,
              maHoSo: true,
              chanDoan: true,
              ketQua: true,
            },
          },
        },
        orderBy: { gioHen: 'asc' },
      },
    },
  });

  if (!shift) {
    throw new ApiError(404, 'Không tìm thấy ca làm việc trong hệ thống');
  }

  const shiftDate = formatDateYYYYMMDD(shift.ngay);
  const startTime = formatTimeHHMM(shift.gioBatDau);
  const endTime = formatTimeHHMM(shift.gioKetThuc);
  const doctorName = shift.nhaSi?.hoTen || '';
  const roomName = shift.phongDieuTri?.tenPhong || shift.phongDieuTri?.maPhong || '';

  const appointments = (shift.lichHen || []).map((app) => ({
    id: app.id,
    appointmentCode: app.maLichHen || '',
    patientId: app.benhNhanId,
    patientName: app.benhNhan?.hoTen || '',
    patientPhone: app.benhNhan?.sdt || '',
    patientCode: app.benhNhan?.maBenhNhan || '',
    patientGender: app.benhNhan?.gioiTinh || '',
    patientDob: app.benhNhan?.ngaySinh ? formatDateYYYYMMDD(app.benhNhan.ngaySinh) : null,
    appointmentTime: formatTimeHHMM(app.gioHen),
    serviceId: app.dichVuId,
    serviceName: app.dichVu?.tenDichVu || '',
    serviceCode: app.dichVu?.maDichVu || '',
    servicePrice: app.dichVu?.gia ? Number(app.dichVu.gia) : 0,
    status: app.trangThai,
    notes: app.ghiChu || '',
    medicalRecord: app.hoSoBenhAn
      ? {
          id: app.hoSoBenhAn.id,
          recordCode: app.hoSoBenhAn.maHoSo || '',
          diagnosis: app.hoSoBenhAn.chanDoan || '',
          result: app.hoSoBenhAn.ketQua || '',
        }
      : null,
  }));

  return {
    shiftId: shift.id,
    doctorId: shift.nhaSiId,
    doctorName,
    doctorCode: shift.nhaSi?.maNhaSi || '',
    roomId: shift.phongDieuTriId,
    roomName,
    shiftDate,
    startTime,
    endTime,
    status: shift.trangThai,
    notes: shift.ghiChu || '',
    appointmentsCount: appointments.length,
    appointments,
  };
};

