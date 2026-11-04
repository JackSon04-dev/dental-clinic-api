import { formatDayMonthYear, formatTimeHHmm } from '../../../utils/dateFormatter.js';
import {
  getWeekRangeFromDateString,
  getVietnamTodayDateString,
  formatDateYYYYMMDD,
  DAY_NAMES,
} from '../admins/adminWorkShiftDto.js';

/**
 * Ánh xạ trạng thái Lịch Hẹn sang trạng thái Phiếu khám Frontend
 */
export const mapLichHenStatusToSlipStatus = (dbStatus) => {
  switch (dbStatus) {
    case 'da_xac_nhan':
    case 'da_tiep_nhan':
    case 'cho_kham':
      return 'CHO_KHAM';
    case 'dang_kham':
      return 'DANG_KHAM';
    case 'cho_thanh_toan':
      return 'CHO_THANH_TOAN';
    case 'da_kham':
    case 'hoan_thanh':
      return 'HOAN_THANH';
    case 'huy':
      return 'HUY';
    default:
      return 'CHO_KHAM';
  }
};

/**
 * Format 1 item trong hàng đợi khám của Bác sĩ
 */
export const dentistQueueItemResponseSchema = (lichHen) => {
  const bn = lichHen.benhNhan || {};
  const ca = lichHen.caLamViec || {};
  const phong = ca.phongDieuTri || {};
  const dv = lichHen.dichVu || {};

  // Trích xuất huyết áp nếu có lưu trong ghi chú dạng [HA: xxx] hoặc lưu thẳng
  let bloodPressure = null;
  if (lichHen.ghiChu && lichHen.ghiChu.includes('HA:')) {
    const match = lichHen.ghiChu.match(/HA:\s*([^|;\n]+)/i);
    if (match) bloodPressure = match[1].trim();
  }

  const chiefComplaint =
    lichHen.ghiChu?.replace(/HA:\s*[^|;\n]+/i, '').trim() ||
    dv.tenDichVu ||
    'Khám tổng quát';

  return {
    id: lichHen.id,
    code: lichHen.maLichHen || `PK-${lichHen.id.slice(0, 8)}`,
    patientId: bn.id,
    patientCode: bn.maBenhNhan,
    patientName: bn.hoTen,
    patientPhone: bn.sdt,
    patientGender: bn.gioiTinh === 'nam' ? 'MALE' : bn.gioiTinh === 'nu' ? 'FEMALE' : 'OTHER',
    patientBirthDate: bn.ngaySinh ? formatDateYYYYMMDD(bn.ngaySinh) : '',
    roomName: phong.tenPhong || 'Phòng khám',
    serviceName: dv.tenDichVu,
    chiefComplaint,
    bloodPressure,
    allergiesAlert: bn.diUng ? `Dị ứng: ${bn.diUng}` : null,
    allergies: bn.diUng ? [bn.diUng] : [],
    medicalHistory: bn.tienSuBenh,
    status: mapLichHenStatusToSlipStatus(lichHen.trangThai),
    rawStatus: lichHen.trangThai,
    time: formatTimeHHmm(lichHen.gioHen),
    createdAt: lichHen.createdAt,
  };
};

/**
 * Format 5 thẻ KPI Bác sĩ
 */
export const dentistDashboardStatsResponseSchema = ({
  waitingCount = 0,
  inProgressCount = 0,
  activePlansCount = 0,
  totalPlansCount = 0,
  todayRecordsCount = 0,
  completedCount = 0,
}) => {
  return {
    waitingCount,
    inProgressCount,
    treatmentPlans: {
      active: activePlansCount,
      total: totalPlansCount,
      display: `${activePlansCount} / ${totalPlansCount}`,
    },
    todayRecordsCount,
    completedCount,
  };
};

/**
 * Format lịch tuần của Bác sĩ (7 ngày từ Thứ Hai đến Chủ Nhật)
 */
export const dentistWeeklyShiftsResponseSchema = (weekRange, shifts = []) => {
  const todayStr = getVietnamTodayDateString();

  return weekRange.days.map((dayItem) => {
    const [y, m, d] = dayItem.date.split('-');
    const formattedDate = `${d}/${m}/${y}`;

    // Tìm các ca làm việc trong ngày này
    const dayShifts = shifts.filter(
      (s) => formatDateYYYYMMDD(s.ngay) === dayItem.date
    );

    if (dayShifts.length === 0) {
      return {
        dayOfWeek: dayItem.dayName,
        date: formattedDate,
        dateIso: dayItem.date,
        shiftId: null,
        shiftName: 'Nghỉ ca trực',
        timeSlot: '',
        roomName: '—',
        patientCount: 0,
        status: 'off',
        isToday: dayItem.date === todayStr,
      };
    }

    // Nếu có 1 hoặc nhiều ca, tổng hợp thông tin
    const firstShift = dayShifts[0];
    const isMultiple = dayShifts.length > 1;

    let shiftName = '';
    let timeSlot = '';

    if (isMultiple) {
      shiftName = 'Cả ngày';
      const start = formatTimeHHmm(dayShifts[0].gioBatDau);
      const end = formatTimeHHmm(dayShifts[dayShifts.length - 1].gioKetThuc);
      timeSlot = `${start} - ${end}`;
    } else {
      const start = formatTimeHHmm(firstShift.gioBatDau);
      const end = formatTimeHHmm(firstShift.gioKetThuc);
      const startHour = parseInt(start.split(':')[0], 10);
      shiftName = startHour < 12 ? 'Ca sáng' : 'Ca chiều';
      timeSlot = `${start} - ${end}`;
    }

    if (dayItem.date === todayStr) {
      shiftName += ' (Hôm nay)';
    }

    // Đếm tổng số bệnh nhân đặt hẹn trong ngày
    const totalPatients = dayShifts.reduce(
      (sum, s) => sum + (s.lichHen ? s.lichHen.length : 0),
      0
    );

    // Điểm danh
    const hasPresent = dayShifts.some(
      (s) => s.trangThai === 'co_mat' || s.trangThai === 'dang_dien_ra' || s.trangThai === 'da_ket_thuc'
    );
    const hasAbsent = dayShifts.some((s) => s.trangThai === 'vang_mat');

    let status = 'not_present';
    if (hasPresent) status = 'present';
    else if (hasAbsent) status = 'absent';

    return {
      dayOfWeek: dayItem.dayName,
      date: formattedDate,
      dateIso: dayItem.date,
      shiftId: firstShift.id,
      shiftName,
      timeSlot,
      roomName: firstShift.phongDieuTri?.tenPhong || '',
      patientCount: totalPatients,
      status,
      isToday: dayItem.date === todayStr,
      shifts: dayShifts.map((s) => ({
        id: s.id,
        startTime: formatTimeHHmm(s.gioBatDau),
        endTime: formatTimeHHmm(s.gioKetThuc),
        status: s.trangThai,
        room: s.phongDieuTri?.tenPhong,
        patientCount: s.lichHen ? s.lichHen.length : 0,
      })),
    };
  });
};

export default {
  mapLichHenStatusToSlipStatus,
  dentistQueueItemResponseSchema,
  dentistDashboardStatsResponseSchema,
  dentistWeeklyShiftsResponseSchema,
};
