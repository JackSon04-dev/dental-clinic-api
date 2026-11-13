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
    case 'cho_xac_nhan':
      return 'CHO_XAC_NHAN';
    case 'da_xac_nhan':
      return 'DA_XAC_NHAN';
    case 'da_tiep_nhan':
      return 'DA_TIEP_NHAN';
    case 'cho_kham':
      return 'CHO_KHAM';
    case 'dang_kham':
      return 'DANG_KHAM';
    case 'dang_dieu_tri':
      return 'DANG_DIEU_TRI';
    case 'cho_thanh_toan':
      return 'CHO_THANH_TOAN';
    case 'da_kham':
    case 'hoan_thanh':
      return 'HOAN_THANH';
    case 'huy':
    case 'da_huy':
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
 * Hỗ trợ phân tách rõ từng ca sáng / chiều độc lập, hiển thị phòng khám,
 * và tự động nhận diện vắng mặt khi quá 15 phút sau giờ bắt đầu ca.
 */
export const dentistWeeklyShiftsResponseSchema = (weekRange, shifts = []) => {
  const todayStr = getVietnamTodayDateString();
  const nowMs = Date.now();
  const result = [];

  weekRange.days.forEach((dayItem) => {
    const [y, m, d] = dayItem.date.split('-');
    const formattedDate = `${d}/${m}/${y}`;

    // Tìm các ca làm việc trong ngày này
    const dayShifts = shifts.filter(
      (s) => formatDateYYYYMMDD(s.ngay) === dayItem.date
    );

    if (dayShifts.length === 0) {
      result.push({
        dayOfWeek: dayItem.dayName,
        date: formattedDate,
        dateIso: dayItem.date,
        shiftId: null,
        shiftName: 'Nghỉ ca trực',
        timeSlot: '',
        roomId: null,
        roomName: '—',
        patientCount: 0,
        status: 'off',
        statusText: 'Nghỉ ca',
        isAbsentDueToLate: false,
        canDoctorCheckIn: false,
        isToday: dayItem.date === todayStr,
      });
      return;
    }

    // Với mỗi ca làm việc độc lập (Ca sáng, Ca chiều)
    dayShifts.forEach((s) => {
      const start = formatTimeHHmm(s.gioBatDau);
      const end = formatTimeHHmm(s.gioKetThuc);
      const startHour = parseInt(start.split(':')[0], 10);
      const shiftName = startHour < 12 ? 'Ca sáng' : 'Ca chiều';
      const timeSlot = `${start} - ${end}`;

      // Tính toán mốc bắt đầu ca và mốc 15 phút sau khi ca bắt đầu (theo múi giờ VN +07:00)
      const shiftStartMs = new Date(`${dayItem.date}T${start}:00+07:00`).getTime();
      const isBeforeStart = nowMs < shiftStartMs;
      const isPast15Mins = nowMs > shiftStartMs + 15 * 60 * 1000;

      let status = 'not_present';
      let statusText = 'Chưa điểm danh';
      let isAbsentDueToLate = false;
      let isUpcoming = false;
      let canDoctorCheckIn = false;

      if (s.trangThai === 'co_mat' || s.trangThai === 'dang_dien_ra' || s.trangThai === 'da_ket_thuc') {
        status = 'present';
        statusText = 'Có mặt';
        canDoctorCheckIn = false;
      } else if (s.trangThai === 'vang_mat') {
        status = 'absent';
        statusText = 'Vắng mặt';
        canDoctorCheckIn = false;
      } else if (s.trangThai === 'chua_dien_ra') {
        if (isBeforeStart) {
          status = 'upcoming';
          statusText = 'Chưa tới giờ';
          isUpcoming = true;
          canDoctorCheckIn = false; // Bác sĩ không được điểm danh trước khi tới giờ bắt đầu ca
        } else if (isPast15Mins) {
          status = 'absent';
          statusText = 'Vắng mặt';
          isAbsentDueToLate = true;
          canDoctorCheckIn = false; // Bác sĩ không thể tự điểm danh nữa (quá 15p)
        } else {
          status = 'not_present';
          statusText = 'Chưa điểm danh';
          canDoctorCheckIn = true; // Đang trong khung giờ hợp lệ để điểm danh
        }
      }

      const totalPatients = s.lichHen ? s.lichHen.length : 0;

      result.push({
        dayOfWeek: dayItem.dayName,
        date: formattedDate,
        dateIso: dayItem.date,
        shiftId: s.id,
        shiftName: `${shiftName}${dayItem.date === todayStr ? ' (Hôm nay)' : ''}`,
        rawShiftName: shiftName,
        timeSlot,
        roomId: s.phongDieuTriId,
        roomName: s.phongDieuTri?.tenPhong || 'Phòng khám',
        patientCount: totalPatients,
        status,
        statusText,
        rawStatus: s.trangThai,
        isAbsentDueToLate,
        isUpcoming,
        canDoctorCheckIn,
        isToday: dayItem.date === todayStr,
      });
    });
  });

  return result;
};

export default {
  mapLichHenStatusToSlipStatus,
  dentistQueueItemResponseSchema,
  dentistDashboardStatsResponseSchema,
  dentistWeeklyShiftsResponseSchema,
};
