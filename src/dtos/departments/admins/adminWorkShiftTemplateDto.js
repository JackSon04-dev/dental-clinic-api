import Joi from 'joi';

// ============================================================================
// 1. CONSTANTS & HELPER FORMATTERS
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
 * Xác định ca sáng hoặc chiều dựa vào giờ bắt đầu
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
 * adminGetWorkShiftTemplatesQuerySchema
 * Lọc danh sách khung ca mẫu
 */
export const adminGetWorkShiftTemplatesQuerySchema = Joi.object({
  roomId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Mã phòng điều trị (roomId) phải là UUID hợp lệ',
    }),
});

/**
 * adminWorkShiftTemplateIdParamSchema
 * Kiểm thực param id của ca mẫu
 */
export const adminWorkShiftTemplateIdParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'ID ca mẫu phải là UUID hợp lệ',
      'any.required': 'Vui lòng cung cấp ID của ca mẫu',
    }),
});

/**
 * adminUpdateWorkShiftTemplateDoctorRequestSchema
 * Kiểm thực dữ liệu khi đổi bác sĩ phụ trách ca mẫu
 */
export const adminUpdateWorkShiftTemplateDoctorRequestSchema = Joi.object({
  doctorId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Mã bác sĩ mới (doctorId) phải là UUID hợp lệ',
      'any.required': 'Vui lòng cung cấp mã bác sĩ phụ trách (doctorId)',
    }),
  notes: Joi.string()
    .trim()
    .allow('', null)
    .max(255)
    .messages({
      'string.max': 'Ghi chú không được vượt quá 255 ký tự',
    }),
});

// ============================================================================
// 3. RESPONSE SCHEMAS (Data Sanitizers & Formatters)
// ============================================================================

/**
 * adminWorkShiftTemplateDetailResponseSchema
 * Format chi tiết 1 ca mẫu
 */
export const adminWorkShiftTemplateDetailResponseSchema = (template) => {
  if (!template) return null;

  return {
    id: template.id,
    dayOfWeek: template.thuTrongTuan,
    dayName: DAY_NAMES[template.thuTrongTuan] || `Thứ ${template.thuTrongTuan}`,
    session: getSessionFromTime(template.gioBatDau),
    startTime: formatTimeHHMM(template.gioBatDau),
    endTime: formatTimeHHMM(template.gioKetThuc),
    room: template.phongDieuTri
      ? {
          id: template.phongDieuTri.id,
          code: template.phongDieuTri.maPhong,
          name: template.phongDieuTri.tenPhong,
        }
      : null,
    doctor: template.nhaSi
      ? {
          id: template.nhaSi.id,
          code: template.nhaSi.maNhaSi,
          fullName: template.nhaSi.hoTen,
          specialty: template.nhaSi.chuyenKhoa,
          phone: template.nhaSi.sdt,
        }
      : null,
    notes: template.ghiChu,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
};

/**
 * adminWorkShiftTemplatesMatrixResponseSchema
 * Tổ chức 56 ca mẫu thành cấu trúc Ma trận 4 Phòng điều trị x 7 Ngày tuần
 */
export const adminWorkShiftTemplatesMatrixResponseSchema = ({
  templates = [],
  rooms = [],
  doctors = [],
}) => {
  // Gom nhóm template theo phòng điều trị
  const templateByRoomAndDay = new Map();

  for (const t of templates) {
    const key = `${t.phongDieuTriId}_${t.thuTrongTuan}`;
    if (!templateByRoomAndDay.has(key)) {
      templateByRoomAndDay.set(key, []);
    }
    templateByRoomAndDay.get(key).push(adminWorkShiftTemplateDetailResponseSchema(t));
  }

  // Sắp xếp ca trong mỗi ngày: Ca Sáng (08:00) trước, Ca Chiều (13:30) sau
  for (const list of templateByRoomAndDay.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const daysList = [
    { dayOfWeek: 2, dayName: 'Thứ Hai' },
    { dayOfWeek: 3, dayName: 'Thứ Ba' },
    { dayOfWeek: 4, dayName: 'Thứ Tư' },
    { dayOfWeek: 5, dayName: 'Thứ Năm' },
    { dayOfWeek: 6, dayName: 'Thứ Sáu' },
    { dayOfWeek: 7, dayName: 'Thứ Bảy' },
    { dayOfWeek: 8, dayName: 'Chủ Nhật' },
  ];

  const matrix = rooms.map((room) => {
    const scheduleByDays = daysList.map((day) => {
      const key = `${room.id}_${day.dayOfWeek}`;
      const dayTemplates = templateByRoomAndDay.get(key) || [];
      return {
        dayOfWeek: day.dayOfWeek,
        dayName: day.dayName,
        shifts: dayTemplates,
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
    totalTemplates: templates.length,
    days: daysList,
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
