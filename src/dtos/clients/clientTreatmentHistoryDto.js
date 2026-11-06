import Joi from 'joi';
import { formatDayMonthYear, formatTimeHHmm } from '../../utils/dateFormatter.js';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

/**
 * clientGetTreatmentHistoryQuerySchema
 * Kiểm thực tham số phân trang danh sách hồ sơ bệnh án của client
 */
export const clientGetTreatmentHistoryQuerySchema = Joi.object({
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

/**
 * clientGetTreatmentHistoryDetailParamsSchema
 * Kiểm thực tham số param :id (UUID của hồ sơ bệnh án)
 */
export const clientGetTreatmentHistoryDetailParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'any.required': 'ID hồ sơ bệnh án không được để trống',
    'string.guid': 'ID hồ sơ bệnh án phải là định dạng UUID hợp lệ',
  }),
});

// ============================================================================
// 2. HELPER FUNCTIONS & FORMATTERS
// ============================================================================

const formatPaymentStatusTitle = (status) => {
  if (!status) return 'Chưa xác định';
  switch (status) {
    case 'da_thanh_toan':
      return 'Đã thanh toán';
    case 'chua_thanh_toan':
      return 'Chưa thanh toán';
    case 'da_huy':
      return 'Đã hủy';
    default:
      return status;
  }
};

const formatPaymentMethodTitle = (method) => {
  if (!method) return 'Chưa chọn';
  switch (method) {
    case 'tien_mat':
      return 'Tiền mặt';
    case 'chuyen_khoan':
      return 'Chuyển khoản';
    case 'the':
      return 'Thẻ ngân hàng';
    default:
      return method;
  }
};

/**
 * Helper tính toán tài chính 3NF của hồ sơ bệnh án
 * (Tái cấu trúc tổng chi phí dịch vụ, vật tư, voucher giảm giá và số tiền thực thu)
 */
export const calculateRecordFinancials = (record) => {
  const rawServices = record.dichVuDieuTri || [];
  const rawMaterials = record.vatTuSuDung || [];
  const giaiDoan = record.lichHen?.giaiDoanPhacDo;
  const invoice = record.lichHen?.hoaDon?.[0] || null;
  const voucher = invoice?.khuyenMai || null;

  // 1. Tổng tiền dịch vụ điều trị
  let totalServicesAmount = 0;
  rawServices.forEach((dv) => {
    const qty = Number(dv.soLuong) || 1;
    const price = Number(dv.donGia) || 0;
    totalServicesAmount += qty * price;
  });

  // 2. Tổng tiền vật tư / sản phẩm tiêu hao
  let totalMaterialsAmount = 0;
  rawMaterials.forEach((vt) => {
    const qty = Number(vt.soLuong) || 1;
    const price = Number(vt.donGia) || 0;
    totalMaterialsAmount += qty * price;
  });

  // 3. Tạm tính (Subtotal)
  let subtotalAmount = 0;
  const stageFee = giaiDoan?.chiPhi ? Number(giaiDoan.chiPhi) : 0;
  if (stageFee > 0) {
    subtotalAmount = stageFee;
  } else {
    subtotalAmount = totalServicesAmount + totalMaterialsAmount;
  }

  // 4. Giảm giá từ Voucher / Khuyến mãi
  let discountAmount = 0;
  if (voucher && subtotalAmount > 0) {
    const discountVal = Number(voucher.giaTriGiam) || 0;
    if (voucher.loaiGiam === 'phan_tram') {
      discountAmount = Math.round((subtotalAmount * discountVal) / 100);
    } else {
      discountAmount = Math.min(subtotalAmount, discountVal);
    }
  }

  // 5. Thành tiền thực tế phải thanh toán
  const finalAmount = Math.max(0, subtotalAmount - discountAmount);

  return {
    invoice,
    voucher,
    totalServicesAmount,
    totalMaterialsAmount,
    subtotalAmount,
    discountAmount,
    finalAmount,
  };
};

// ============================================================================
// 3. RESPONSE SCHEMAS & SANITIZERS (Chuẩn 100% camelCase cho Client)
// ============================================================================

/**
 * clientTreatmentHistoryListItemResponseSchema
 * Format từng bản ghi hồ sơ bệnh án cho màn hình Danh sách lịch sử điều trị
 */
export const clientTreatmentHistoryListItemResponseSchema = (record) => {
  if (!record) return null;

  const examDateInfo = formatDayMonthYear(record.ngayKham);
  const reExamDateInfo = record.ngayTaiKham ? formatDayMonthYear(record.ngayTaiKham) : null;
  const financials = calculateRecordFinancials(record);
  const nhaSi = record.lichHen?.caLamViec?.nhaSi;
  const phong = record.lichHen?.caLamViec?.phongDieuTri;
  const phacDo = record.lichHen?.giaiDoanPhacDo?.phacDoDieuTri;

  return {
    id: record.id,
    recordCode: record.maHoSo || null,
    appointmentCode: record.lichHen?.maLichHen || null,
    examDate: examDateInfo.formattedDate,
    examDayOfWeek: examDateInfo.dayOfWeek,
    reExamDate: reExamDateInfo ? reExamDateInfo.formattedDate : null,
    serviceTitle: record.lichHen?.dichVu?.tenDichVu || 'Khám điều trị nha khoa',
    doctor: {
      name: nhaSi?.hoTen || 'Bác sĩ phụ trách',
      specialty: nhaSi?.chuyenKhoa || 'Nha khoa tổng quát',
    },
    room: phong?.tenPhong || 'Phòng điều trị',
    diagnosis: record.chanDoan || 'Không có ghi nhận',
    treatmentMethod: record.phuongPhapDieuTri || 'Không có ghi nhận',
    billing: {
      invoiceCode: financials.invoice?.maHoaDon || null,
      totalAmount: financials.finalAmount,
      paymentStatus: financials.invoice?.trangThaiThanhToan || 'chua_thanh_toan',
      paymentStatusTitle: formatPaymentStatusTitle(
        financials.invoice?.trangThaiThanhToan || 'chua_thanh_toan'
      ),
    },
    summaryBadges: {
      totalServices: record.dichVuDieuTri?.length || 0,
      totalSupplies: record.vatTuSuDung?.length || 0,
      isPartOfTreatmentPlan: Boolean(phacDo),
      planName: phacDo?.tenPhacDo || null,
    },
  };
};

/**
 * clientTreatmentHistoryDetailResponseSchema
 * Format toàn bộ chi tiết 1 hồ sơ bệnh án khi bệnh nhân click vào xem chi tiết
 * Bao gồm: Thông tin lịch hẹn, phác đồ, chi tiết lâm sàng, dịch vụ, vật tư, và viện phí/hóa đơn
 * (ĐÃ LOẠI BỎ THÔNG TIN ĐƠN THUỐC ĐỂ DÀNH CHO API RIÊNG THEO YÊU CẦU)
 */
export const clientTreatmentHistoryDetailResponseSchema = (record) => {
  if (!record) return null;

  const examDateInfo = formatDayMonthYear(record.ngayKham);
  const reExamDateInfo = record.ngayTaiKham ? formatDayMonthYear(record.ngayTaiKham) : null;
  const financials = calculateRecordFinancials(record);

  const lichHen = record.lichHen;
  const nhaSi = lichHen?.caLamViec?.nhaSi;
  const phong = lichHen?.caLamViec?.phongDieuTri;
  const giaiDoan = lichHen?.giaiDoanPhacDo;
  const phacDo = giaiDoan?.phacDoDieuTri;
  const invoice = financials.invoice;
  const voucher = financials.voucher;

  // Format ngày giờ lịch hẹn
  let appointmentDateTime = null;
  if (lichHen?.ngayHen) {
    const appDateInfo = formatDayMonthYear(lichHen.ngayHen);
    const appTime = formatTimeHHmm(lichHen.gioHen);
    appointmentDateTime = `${appDateInfo.formattedDate} ${appTime}`.trim();
  }

  // Format ngày lập và ngày thanh toán hóa đơn
  const billedAt = invoice?.ngayLap
    ? `${formatDayMonthYear(invoice.ngayLap).formattedDate} ${formatTimeHHmm(invoice.ngayLap)}`.trim()
    : null;
  const paidAt = invoice?.ngayThanhToan
    ? `${formatDayMonthYear(invoice.ngayThanhToan).formattedDate} ${formatTimeHHmm(invoice.ngayThanhToan)}`.trim()
    : null;

  return {
    id: record.id,
    recordCode: record.maHoSo || null,
    examDate: examDateInfo.formattedDate,
    examDayOfWeek: examDateInfo.dayOfWeek,
    reExamDate: reExamDateInfo ? reExamDateInfo.formattedDate : null,

    // Thông tin lịch hẹn & Bác sĩ phụ trách
    appointment: {
      appointmentCode: lichHen?.maLichHen || null,
      appointmentDate: appointmentDateTime,
      doctor: {
        id: nhaSi?.id || null,
        name: nhaSi?.hoTen || 'Bác sĩ phụ trách',
        specialty: nhaSi?.chuyenKhoa || 'Nha khoa tổng quát',
        licenseNumber: nhaSi?.soGiayPhep || null,
        avatarUrl: nhaSi?.hinhAnhUrl || null,
      },
      room: phong?.tenPhong || 'Phòng điều trị',
    },

    // Thông tin phác đồ điều trị (nếu thuộc phác đồ)
    treatmentPlan: phacDo
      ? {
          id: phacDo.id,
          planCode: phacDo.maPhacDo || null,
          planName: phacDo.tenPhacDo,
          currentStage: {
            id: giaiDoan?.id || null,
            stepNumber: giaiDoan?.buocSo || 1,
            stageName: giaiDoan?.tenGiaiDoan || 'Giai đoạn điều trị',
            stageCost: Number(giaiDoan?.chiPhi || 0),
            stageStatus: giaiDoan?.trangThai || 'chua_thuc_hien',
          },
        }
      : null,

    // Chi tiết lâm sàng của buổi khám
    clinicalDetails: {
      oralCondition: record.tinhTrangRangMieng || null,
      diagnosis: record.chanDoan || null,
      treatmentMethod: record.phuongPhapDieuTri || null,
      result: record.ketQua || null,
      doctorAdvice: record.loiDan || null,
      notes: record.ghiChu || null,
    },

    // Danh sách dịch vụ điều trị đã thực hiện
    servicesPerformed: (record.dichVuDieuTri || []).map((dv) => {
      const qty = Number(dv.soLuong) || 1;
      const unitPrice = Number(dv.donGia) || 0;
      return {
        id: dv.id,
        serviceName:
          dv.chiTietDichVu?.tenChiTiet ||
          dv.chiTietDichVu?.dichVu?.tenDichVu ||
          'Dịch vụ điều trị',
        toothPosition: dv.viTriRang || null,
        quantity: qty,
        unit: dv.chiTietDichVu?.donViTinh || 'Lần',
        unitPrice: unitPrice,
        totalPrice: qty * unitPrice,
        notes: dv.ghiChu || null,
      };
    }),

    // Danh sách vật tư y tế sử dụng
    suppliesUsed: (record.vatTuSuDung || []).map((vt) => {
      const qty = Number(vt.soLuong) || 1;
      const unitPrice = Number(vt.donGia) || 0;
      return {
        id: vt.id,
        supplyName: vt.sanPham?.tenSanPham || 'Vật tư nha khoa',
        category: vt.sanPham?.loai || null,
        unit: vt.sanPham?.donViTinh || 'Cái',
        quantity: qty,
        unitPrice: unitPrice,
        totalPrice: qty * unitPrice,
        notes: vt.ghiChu || null,
      };
    }),

    // Chi tiết viện phí & hóa đơn buổi khám
    billing: {
      invoiceCode: invoice?.maHoaDon || null,
      servicesSubtotal: financials.totalServicesAmount,
      suppliesSubtotal: financials.totalMaterialsAmount,
      subtotal: financials.subtotalAmount,
      discount: financials.discountAmount,
      voucher: voucher
        ? {
            voucherCode: voucher.maKhuyenMai,
            campaignName: voucher.tenChuongTrinh,
            discountType: voucher.loaiGiam,
            discountValue: Number(voucher.giaTriGiam),
          }
        : null,
      finalAmount: financials.finalAmount,
      paymentMethod: invoice?.phuongThucThanhToan || null,
      paymentMethodTitle: formatPaymentMethodTitle(invoice?.phuongThucThanhToan),
      paymentStatus: invoice?.trangThaiThanhToan || 'chua_thanh_toan',
      paymentStatusTitle: formatPaymentStatusTitle(
        invoice?.trangThaiThanhToan || 'chua_thanh_toan'
      ),
      paidAt: paidAt,
      billedAt: billedAt,
      cashierName: invoice?.nhanVien?.hoTen || null,
    },
  };
};

export default {
  clientGetTreatmentHistoryQuerySchema,
  clientGetTreatmentHistoryDetailParamsSchema,
  calculateRecordFinancials,
  clientTreatmentHistoryListItemResponseSchema,
  clientTreatmentHistoryDetailResponseSchema,
};

