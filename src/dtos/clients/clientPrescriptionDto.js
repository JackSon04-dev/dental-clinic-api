import Joi from 'joi';
import { formatDayMonthYear } from '../../utils/dateFormatter.js';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

/**
 * clientGetPrescriptionsQuerySchema
 * Kiểm thực tham số phân trang danh sách đơn thuốc của bệnh nhân
 */
export const clientGetPrescriptionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Tham số page phải là số nguyên',
    'number.min': 'Tham số page tối thiểu là 1',
  }),
  limit: Joi.number().integer().min(1).max(50).default(10).messages({
    'number.base': 'Tham số limit phải là số nguyên',
    'number.min': 'Tham số limit tối thiểu là 1',
    'number.max': 'Tham số limit tối đa là 50',
  }),
});

// ============================================================================
// 2. RESPONSE SCHEMAS & FORMATTERS (Chuẩn 100% camelCase cho Client)
// ============================================================================

/**
 * clientPrescriptionItemResponseSchema
 * Format một bản ghi đơn thuốc kèm danh sách chi tiết các loại thuốc
 * @param {object} donThuoc Bản ghi don_thuoc từ Prisma kèm relation nhaSi, hoSoBenhAn.lichHen, chiTietDonThuoc
 */
export const clientPrescriptionItemResponseSchema = (donThuoc) => {
  if (!donThuoc) return null;

  const dateInfo = formatDayMonthYear(donThuoc.ngayKe);
  const items = donThuoc.chiTietDonThuoc || [];

  return {
    id: donThuoc.id,
    prescriptionCode: donThuoc.maDonThuoc || null,
    prescribedDate: dateInfo.formattedDate,
    prescribedDayOfWeek: dateInfo.dayOfWeek,
    dosageDays: donThuoc.soNgayDung || null,
    dosageDaysText: donThuoc.soNgayDung
      ? `Dùng trong ${donThuoc.soNgayDung} ngày`
      : 'Theo chỉ định của bác sĩ',
    doctor: {
      id: donThuoc.nhaSi?.id || null,
      name: donThuoc.nhaSi?.hoTen || 'Bác sĩ phụ trách',
      specialty: donThuoc.nhaSi?.chuyenKhoa || 'Nha khoa tổng quát',
      avatarUrl: donThuoc.nhaSi?.hinhAnhUrl || null,
    },
    diagnosis: donThuoc.chanDoan || null,
    doctorAdvice: donThuoc.loiDan || null,
    notes: donThuoc.ghiChu || null,
    relatedAppointment: {
      appointmentCode: donThuoc.hoSoBenhAn?.lichHen?.maLichHen || null,
      recordCode: donThuoc.hoSoBenhAn?.maHoSo || null,
    },
    summary: {
      totalMedicines: items.length,
      summaryText: `${items.length} loại thuốc`,
    },
    medicines: items.map((item) => ({
      id: item.id,
      medicineId: item.thuocId || null,
      medicineName: item.tenThuoc,
      activeIngredient: item.hoatChat || null,
      content: item.hamLuong || null,
      dosageForm: item.dangBaoChe || null,
      quantity: item.soLuong,
      unit: item.donViTinh || 'Viên',
      dosage: item.lieuDung || null,
      timesPerDay: item.soLanNgay || null,
      drinkingTime: item.thoiDiemUong || null,
      instructions: item.huongDan || null,
      notes: item.ghiChu || null,
    })),
  };
};

export default {
  clientGetPrescriptionsQuerySchema,
  clientPrescriptionItemResponseSchema,
};

