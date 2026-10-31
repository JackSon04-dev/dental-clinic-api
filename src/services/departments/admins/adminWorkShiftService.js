import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  getWeekRangeFromDateString,
  adminWorkShiftDetailResponseSchema,
  adminWorkShiftsMatrixResponseSchema,
  adminGenerateWorkShiftsResponseSchema,
  formatTimeHHMM,
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
export const updateWorkShiftStatusService = async (id, { status, notes = undefined }) => {
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

  // 2. Nếu chuyển sang 'co_mat', kiểm tra xem bác sĩ này đã điểm danh 'co_mat' ở phòng khác cùng khung giờ chưa
  if (status === 'co_mat') {
    const conflictShift = await prisma.caLamViec.findFirst({
      where: {
        id: { not: id },
        nhaSiId: shift.nhaSiId,
        ngay: shift.ngay,
        gioBatDau: shift.gioBatDau,
        trangThai: 'co_mat',
      },
      include: {
        phongDieuTri: true,
      },
    });

    if (conflictShift) {
      const roomName = conflictShift.phongDieuTri?.tenPhong || conflictShift.phongDieuTri?.maPhong || 'phòng khác';
      const timeStr = formatTimeHHMM(shift.gioBatDau);
      throw new ApiError(
        409,
        `Trùng lịch: Bác sĩ ${shift.nhaSi?.hoTen} đã được điểm danh Có mặt tại ${roomName} lúc ${timeStr}. Vui lòng kiểm tra lại!`
      );
    }
  }

  // 3. Thực hiện cập nhật
  const updateData = {
    trangThai: status,
  };
  if (notes !== undefined) {
    updateData.ghiChu = notes;
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
