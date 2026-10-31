import Joi from 'joi';

// ============================================================================
// 1. CONSTANTS & HELPER FUNCTIONS
// ============================================================================

export const DAY_NAMES = {
  2: 'Thứ Hai',
  3: 'Thứ Ba',
  4: 'Thứ Tư',
  5: 'Thứ Năm',
  6: 'Thứ Sáu',
  7: 'Thứ Bảy',
  8: 'Chủ Nhật',
};

export const SHIFT_STATUS_TITLES = {
  chua_dien_ra: 'Chưa diễn ra',
  co_mat: 'Có mặt',
  vang_mat: 'Vắng mặt',
};

/**
 * Định dạng Date object sang chuỗi YYYY-MM-DD
 */
export const formatDateYYYYMMDD = (d) => {
  if (!d) return '';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dateObj = new Date(d);
  return dateObj.toISOString().split('T')[0];
};

/**
 * Lấy ngày hôm nay theo múi giờ Việt Nam (Asia/Ho_Chi_Minh: GMT+7)
 * Định dạng trả về: YYYY-MM-DD
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
 * Tính toán khoảng tuần (Thứ Hai -> Chủ Nhật) và danh sách 7 ngày từ 1 ngày bất kỳ (YYYY-MM-DD)
 */
export const getWeekRangeFromDateString = (dateStr) => {
  const safeDateStr = dateStr || getVietnamTodayDateString();
  const [year, month, day] = safeDateStr.split('-').map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day));

  // getUTCDay(): 0 = Chủ Nhật, 1 = Thứ Hai, ..., 6 = Thứ Bảy
  const dayOfWeek = targetDate.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const mondayDate = new Date(targetDate);
  mondayDate.setUTCDate(targetDate.getUTCDate() + diffToMonday);

  const sundayDate = new Date(mondayDate);
  sundayDate.setUTCDate(mondayDate.getUTCDate() + 6);

  const days = [];
  const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(mondayDate);
    cur.setUTCDate(mondayDate.getUTCDate() + i);
    days.push({
      date: cur.toISOString().split('T')[0],
      dayOfWeek: i + 2, // 2 = Thứ Hai ... 8 = Chủ Nhật
      dayName: dayNames[i],
    });
  }

  return {
    currentDate: safeDateStr,
    startDate: mondayDate.toISOString().split('T')[0],
    endDate: sundayDate.toISOString().split('T')[0],
    days,
  };
};

/**
 * Định dạng thời gian sang HH:mm (Ví dụ: "08:00", "13:30")
 */
export const formatTimeHHMM = (timeInput) => {
  if (!timeInput) return '';
  if (timeInput instanceof Date) {
    const hours = String(timeInput.getUTCHours()).padStart(2, '0');
    const minutes = String(timeInput.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  const str = String(timeInput);
  return str.slice(0, 5);
};

/**
 * Xác định ca sáng hoặc ca chiều dựa vào giờ bắt đầu
 */
export const getSessionFromTime = (timeInput) => {
  const timeStr = formatTimeHHMM(timeInput);
  const hour = parseInt(timeStr.split(':')[0], 10);
  return hour < 13 ? 'SANG' : 'CHIEU';
};

// ============================================================================
// 2. REQUEST SCHEMAS (Validation Joi)
// ============================================================================

/**
 * adminGetWorkShiftsQuerySchema
 * Kiểm thực query params khi lấy ma trận ca làm việc tuần
 */
export const adminGetWorkShiftsQuerySchema = Joi.object({
  date: Joi.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Ngày (date) phải theo định dạng YYYY-MM-DD (ví dụ: 2026-10-31)',
    }),
  roomId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Mã phòng điều trị (roomId) phải là UUID hợp lệ',
    }),
});

/**
 * adminWorkShiftIdParamSchema
 * Kiểm thực param id ca làm việc
 */
export const adminWorkShiftIdParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Mã ca làm việc (id) phải là UUID hợp lệ',
      'any.required': 'Vui lòng cung cấp mã ca làm việc',
    }),
});

/**
 * adminUpdateWorkShiftStatusRequestSchema
 * Kiểm thực cập nhật trạng thái có mặt / vắng mặt
 */
export const adminUpdateWorkShiftStatusRequestSchema = Joi.object({
  status: Joi.string()
    .valid('chua_dien_ra', 'co_mat', 'vang_mat')
    .required()
    .messages({
      'any.only': 'Trạng thái (status) chỉ được nhận giá trị: chua_dien_ra, co_mat, vang_mat',
      'any.required': 'Vui lòng cung cấp trạng thái mới cho ca làm việc (status)',
    }),
  notes: Joi.string()
    .trim()
    .allow('', null)
    .max(500)
    .optional()
    .messages({
      'string.max': 'Ghi chú không được vượt quá 500 ký tự',
    }),
});

/**
 * adminGenerateWorkShiftsRequestSchema
 * Kiểm thực khi khởi tạo ca tuần mới từ Khung mẫu
 */
export const adminGenerateWorkShiftsRequestSchema = Joi.object({
  startDate: Joi.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'Ngày bắt đầu tuần (startDate) phải theo định dạng YYYY-MM-DD',
      'any.required': 'Vui lòng cung cấp ngày bắt đầu tuần (startDate - Thứ Hai)',
    }),
});

// ============================================================================
// 3. RESPONSE SCHEMAS (Data Sanitizers & Formatters)
// ============================================================================

/**
 * adminWorkShiftDetailResponseSchema
 * Format chi tiết 1 ca làm việc
 */
export const adminWorkShiftDetailResponseSchema = (shift) => {
  if (!shift) return null;

  const dateStr = formatDateYYYYMMDD(shift.ngay);
  const dateObj = new Date(dateStr);
  // Tính thứ trong tuần: 2 = Thứ Hai, ..., 8 = Chủ Nhật
  const jsDay = dateObj.getUTCDay();
  const dayOfWeek = jsDay === 0 ? 8 : jsDay + 1;

  return {
    id: shift.id,
    date: dateStr,
    dayOfWeek,
    dayName: DAY_NAMES[dayOfWeek] || `Thứ ${dayOfWeek}`,
    session: getSessionFromTime(shift.gioBatDau),
    startTime: formatTimeHHMM(shift.gioBatDau),
    endTime: formatTimeHHMM(shift.gioKetThuc),
    status: shift.trangThai,
    statusTitle: SHIFT_STATUS_TITLES[shift.trangThai] || shift.trangThai,
    room: shift.phongDieuTri
      ? {
          id: shift.phongDieuTri.id,
          code: shift.phongDieuTri.maPhong,
          name: shift.phongDieuTri.tenPhong,
        }
      : null,
    doctor: shift.nhaSi
      ? {
          id: shift.nhaSi.id,
          code: shift.nhaSi.maNhaSi,
          fullName: shift.nhaSi.hoTen,
          specialty: shift.nhaSi.chuyenKhoa,
          phone: shift.nhaSi.sdt,
        }
      : null,
    notes: shift.ghiChu,
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
  };
};

/**
 * adminWorkShiftsMatrixResponseSchema
 * Tổ chức dữ liệu ca làm việc tuần thành ma trận theo phòng điều trị & 7 ngày
 */
export const adminWorkShiftsMatrixResponseSchema = ({
  week,
  shifts = [],
  rooms = [],
  doctors = [],
}) => {
  // Gom nhóm ca theo roomId_date
  const shiftsByRoomAndDate = new Map();

  let presentCount = 0;
  let absentCount = 0;
  let pendingCount = 0;

  for (const s of shifts) {
    if (s.trangThai === 'co_mat') presentCount++;
    else if (s.trangThai === 'vang_mat') absentCount++;
    else pendingCount++;

    const dateStr = formatDateYYYYMMDD(s.ngay);
    const key = `${s.phongDieuTriId}_${dateStr}`;
    if (!shiftsByRoomAndDate.has(key)) {
      shiftsByRoomAndDate.set(key, []);
    }
    shiftsByRoomAndDate.get(key).push(adminWorkShiftDetailResponseSchema(s));
  }

  // Sắp xếp ca trong mỗi ngày: Ca Sáng trước, Ca Chiều sau
  for (const list of shiftsByRoomAndDate.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const matrix = rooms.map((room) => {
    const scheduleByDays = week.days.map((day) => {
      const key = `${room.id}_${day.date}`;
      const dayShifts = shiftsByRoomAndDate.get(key) || [];
      return {
        date: day.date,
        dayOfWeek: day.dayOfWeek,
        dayName: day.dayName,
        shifts: dayShifts,
      };
    });

    return {
      room: {
        id: room.id,
        code: room.maPhong,
        name: room.tenPhong,
      },
      scheduleByDays,
    };
  });

  return {
    week: {
      currentDate: week.currentDate,
      startDate: week.startDate,
      endDate: week.endDate,
    },
    summary: {
      totalShifts: shifts.length,
      presentCount,
      absentCount,
      pendingCount,
    },
    days: week.days,
    rooms: rooms.map((r) => ({ id: r.id, code: r.maPhong, name: r.tenPhong })),
    doctors: doctors.map((d) => ({
      id: d.id,
      code: d.maNhaSi,
      fullName: d.hoTen,
      specialty: d.chuyenKhoa,
    })),
    matrix,
  };
};

/**
 * adminGenerateWorkShiftsResponseSchema
 * Format phản hồi khi tạo tuần ca mới từ Khung mẫu
 */
export const adminGenerateWorkShiftsResponseSchema = ({
  startDate,
  endDate,
  totalCreated,
}) => {
  return {
    week: {
      startDate,
      endDate,
    },
    totalCreated,
    message: `Khởi tạo thành công ${totalCreated} ca làm việc cho tuần từ ${startDate} đến ${endDate} dựa trên Khung mẫu.`,
  };
};
