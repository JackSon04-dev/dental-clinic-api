/**
 * Tiện ích định dạng ngày tháng và thứ trong tuần theo chuẩn tiếng Việt
 */

const VIETNAMESE_DAYS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

/**
 * Định dạng ngày theo chuẩn DD/MM/YYYY và tính toán thứ trong tuần tiếng Việt
 * Đảm bảo độ chính xác bất kể server chạy theo múi giờ nào (UTC hay GMT+7)
 * @param {Date|string} dateInput - Đối tượng Date hoặc chuỗi ngày
 * @returns {{ dayOfWeek: string, formattedDate: string, day: string, month: string, year: string }}
 */
export const formatDayMonthYear = (dateInput) => {
  if (!dateInput) {
    return {
      dayOfWeek: '',
      formattedDate: '',
      day: '',
      month: '',
      year: '',
    };
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return {
      dayOfWeek: '',
      formattedDate: '',
      day: '',
      month: '',
      year: '',
    };
  }

  // Nếu là Date thuần (PostgreSQL @db.Date được Prisma ánh xạ về T00:00:00.000Z), dùng UTC để không bị trôi ngày
  const isPureDate = typeof dateInput === 'string' 
    ? !dateInput.includes('T') || dateInput.includes('T00:00:00') 
    : d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;

  const dayOfWeek = isPureDate ? VIETNAMESE_DAYS[d.getUTCDay()] : VIETNAMESE_DAYS[d.getDay()];
  const day = String(isPureDate ? d.getUTCDate() : d.getDate()).padStart(2, '0');
  const month = String(isPureDate ? d.getUTCMonth() + 1 : d.getMonth() + 1).padStart(2, '0');
  const year = String(isPureDate ? d.getUTCFullYear() : d.getFullYear());
  const formattedDate = `${day}/${month}/${year}`;

  return {
    dayOfWeek,
    formattedDate,
    day,
    month,
    year,
  };
};

/**
 * Định dạng giờ HH:mm từ đối tượng Date hoặc chuỗi Time của PostgreSQL
 * @param {Date|string} timeInput 
 * @returns {string} ví dụ: "09:30"
 */
export const formatTimeHHmm = (timeInput) => {
  if (!timeInput) return '';

  if (timeInput instanceof Date) {
    // Với kiểu DateTime @db.Time của Prisma, base date luôn là 1970-01-01 UTC
    const isPrismaTime = timeInput.getUTCFullYear() === 1970 && timeInput.getUTCMonth() === 0 && timeInput.getUTCDate() === 1;
    const hours = String(isPrismaTime ? timeInput.getUTCHours() : timeInput.getHours()).padStart(2, '0');
    const minutes = String(isPrismaTime ? timeInput.getUTCMinutes() : timeInput.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  const timeStr = String(timeInput).trim();
  // Nếu là dạng HH:mm:ss hoặc HH:mm
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const hours = parts[0].slice(-2).padStart(2, '0');
    const minutes = parts[1].slice(0, 2).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  return timeStr;
};

export default {
  formatDayMonthYear,
  formatTimeHHmm,
};
