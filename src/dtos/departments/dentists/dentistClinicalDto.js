import Joi from 'joi';
import { formatDateYYYYMMDD } from '../admins/adminWorkShiftDto.js';
import { mapLichHenStatusToSlipStatus } from './dentistDashboardDto.js';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

export const saveClinicalRecordRequestSchema = Joi.object({
  slipId: Joi.string().uuid().allow('', null).optional(),
  patientId: Joi.string().uuid().required().messages({
    'any.required': 'Mã bệnh nhân là bắt buộc',
  }),
  // Bổ sung các trường cập nhật tiền sử và dị ứng
  medicalHistory: Joi.alternatives().try(Joi.string().allow('', null), Joi.array().items(Joi.string())).optional(),
  tienSuBenh: Joi.alternatives().try(Joi.string().allow('', null), Joi.array().items(Joi.string())).optional(),
  allergies: Joi.alternatives().try(Joi.string().allow('', null), Joi.array().items(Joi.string())).optional(),
  diUng: Joi.alternatives().try(Joi.string().allow('', null), Joi.array().items(Joi.string())).optional(),

  // Khớp 100% schema HoSoBenhAn
  diagnosis: Joi.string().allow('', null).optional(),
  chanDoan: Joi.string().allow('', null).optional(),
  treatmentMethod: Joi.string().allow('', null).optional(),
  phuongPhapDieuTri: Joi.string().allow('', null).optional(),
  doctorAdvice: Joi.string().allow('', null).optional(),
  loiDan: Joi.string().allow('', null).optional(),
  result: Joi.string().allow('', null).optional(),
  ketQua: Joi.string().allow('', null).optional(),
  reExamDate: Joi.string().allow('', null).optional(),
  ngayTaiKham: Joi.string().allow('', null).optional(),
  notes: Joi.string().allow('', null).optional(),
  ghiChu: Joi.string().allow('', null).optional(),
  oralHealthStatus: Joi.string().allow('', null).optional(),
  tinhTrangRangMieng: Joi.string().allow('', null).optional(),

  // Điểm sức khỏe nụ cười (Smile Score)
  initialSmileScore: Joi.number().integer().min(0).max(100).allow(null).optional(),
  currentSmileScore: Joi.number().integer().min(0).max(100).allow(null).optional(),
  diemSucKhoeBanDau: Joi.number().integer().min(0).max(100).allow(null).optional(),
  diemSucKhoeHienTai: Joi.number().integer().min(0).max(100).allow(null).optional(),

  // Danh sách dịch vụ điều trị (kèm vị trí răng)
  treatments: Joi.array()
    .items(
      Joi.object({
        serviceId: Joi.string().uuid().optional(),
        serviceDetailId: Joi.string().uuid().allow('', null).optional(),
        serviceName: Joi.string().optional(),
        quantity: Joi.number().integer().min(1).default(1),
        price: Joi.number().min(0).default(0),
        toothNumber: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null).optional(),
        notes: Joi.string().allow('', null).optional(),
        isPaid: Joi.boolean().optional(),
        paidInvoiceCode: Joi.string().allow('', null).optional(),
        paidInstallment: Joi.number().integer().optional(),
      })
    )
    .default([]),

  // Danh sách vật tư / sản phẩm sử dụng (VatTuSuDung)
  materials: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().uuid().required().messages({
          'any.required': 'Mã sản phẩm/vật tư là bắt buộc',
        }),
        productName: Joi.string().allow('', null).optional(),
        quantity: Joi.number().integer().min(1).default(1),
        price: Joi.number().min(0).default(0),
        toothNumber: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null).optional(),
        notes: Joi.string().allow('', null).optional(),
        isPaid: Joi.boolean().optional(),
        paidInvoiceCode: Joi.string().allow('', null).optional(),
        paidInstallment: Joi.number().integer().optional(),
      })
    )
    .default([]),

  // Danh sách đơn thuốc (cho phép dosage & instructions optional để tự động điền từ Thuoc)
  prescription: Joi.array()
    .items(
      Joi.object({
        medicineId: Joi.string().uuid().allow('', null).optional(),
        thuocId: Joi.string().uuid().allow('', null).optional(),
        id: Joi.string().allow('', null).optional(),
        medicineName: Joi.string().allow('', null).optional(),
        activeIngredient: Joi.string().allow('', null).optional(),
        dosage: Joi.string().allow('', null).optional(),
        quantity: Joi.number().integer().min(1).required(),
        unit: Joi.string().allow('', null).optional(),
        usageInstruction: Joi.string().allow('', null).optional(),
        instructions: Joi.string().allow('', null).optional(),
        daysOfSupply: Joi.number().integer().min(1).optional(),
      })
    )
    .default([]),

  medicines: Joi.array().items(Joi.object().unknown()).optional(),
  daysOfSupply: Joi.number().integer().min(1).default(3),
  status: Joi.string().valid('CHO_KHAM', 'DANG_KHAM', 'DANG_DIEU_TRI', 'CHO_THANH_TOAN', 'HOAN_THANH', 'HUY').optional(),
  isCompleted: Joi.boolean().optional(),
});

export const updateSlipStatusRequestSchema = Joi.object({
  status: Joi.string()
    .valid('CHO_KHAM', 'DANG_KHAM', 'DANG_DIEU_TRI', 'CHO_THANH_TOAN', 'HOAN_THANH', 'HUY')
    .required()
    .messages({
      'any.required': 'Trạng thái là bắt buộc',
      'any.only': 'Trạng thái không hợp lệ',
    }),
});

// ============================================================================
// 2. RESPONSE SCHEMAS
// ============================================================================

export const clinicalRecordResponseSchema = (record) => {
  if (!record) return null;

  const lichHen = record.lichHen || {};
  const benhNhan = lichHen.benhNhan || {};
  const ca = lichHen.caLamViec || {};
  const nhaSi = ca.nhaSi || {};

  // Thu thập danh sách dịch vụ và vật tư đã nằm trong các hóa đơn ĐÃ THANH TOÁN
  const paidInvoices = (lichHen.hoaDon || []).filter(
    (inv) => inv.trangThaiThanhToan === 'da_thanh_toan'
  );

  const paidServices = [];
  const paidMaterials = [];

  paidInvoices.forEach((inv) => {
    (inv.chiTietHoaDon || []).forEach((ct) => {
      if (ct.loaiMuc === 'dich_vu') {
        paidServices.push({
          serviceId: ct.dichVuId,
          serviceName: ct.tenMuc,
          toothNumber: ct.viTriRang || '',
          invoiceCode: inv.maHoaDon,
          installment: inv.dotThanhToan || 1,
        });
      } else {
        paidMaterials.push({
          productId: ct.sanPhamId,
          productName: ct.tenMuc,
          toothNumber: ct.viTriRang || '',
          invoiceCode: inv.maHoaDon,
          installment: inv.dotThanhToan || 1,
        });
      }
    });
  });

  // Map treatments kèm cờ isPaid nếu đã thanh toán
  const treatments = (record.dichVuDieuTri || []).map((t) => {
    const sId = t.dichVuId || t.dichVu?.id || t.chiTietDichVu?.dichVuId || null;
    const sName =
      t.dichVu?.tenDichVu || t.chiTietDichVu?.tenChiTiet || t.chiTietDichVu?.dichVu?.tenDichVu || 'Dịch vụ điều trị';
    const tooth = t.viTriRang || '';

    const matchedPaid = paidServices.find(
      (ps) =>
        (sId && ps.serviceId === sId) ||
        (sName && ps.serviceName === sName)
    );

    return {
      id: t.id,
      serviceId: sId,
      serviceDetailId: t.dichVuId || t.chiTietDichVuId || null,
      serviceName: sName,
      toothNumber: tooth,
      price: Number(t.donGia),
      quantity: t.soLuong,
      notes: t.ghiChu,
      isPaid: !!matchedPaid,
      paidInvoiceCode: matchedPaid?.invoiceCode || null,
      paidInstallment: matchedPaid?.installment || null,
    };
  });

  // Map prescriptions
  const prescription = [];
  (record.donThuoc || []).forEach((dt) => {
    (dt.chiTietDonThuoc || []).forEach((ct) => {
      prescription.push({
        id: ct.id,
        medicineId: ct.thuocId,
        medicineName: ct.tenThuoc,
        activeIngredient: ct.hoatChat || '',
        dosage: ct.lieuDung || '',
        quantity: ct.soLuong,
        unit: ct.donViTinh || 'Viên',
        usageInstruction: ct.huongDan || '',
      });
    });
  });

  // Map materials (vatTuSuDung) kèm cờ isPaid nếu đã thanh toán
  const materials = (record.vatTuSuDung || []).map((vt) => {
    let toothNumber = '';
    let notes = vt.ghiChu || '';
    if (notes.startsWith('Răng:')) {
      const parts = notes.split(' - ');
      toothNumber = parts[0].replace('Răng:', '').trim();
      notes = parts.slice(1).join(' - ');
    }

    const prodId = vt.sanPhamId;
    const prodName = vt.sanPham?.tenSanPham || 'Vật tư nha khoa';

    const matchedPaid = paidMaterials.find(
      (pm) =>
        (prodId && pm.productId === prodId) ||
        (prodName && pm.productName === prodName)
    );

    return {
      id: vt.id,
      productId: prodId,
      productName: prodName,
      productCode: vt.sanPham?.maSanPham || '',
      unit: vt.sanPham?.donViTinh || 'Cái',
      quantity: vt.soLuong,
      price: Number(vt.donGia),
      toothNumber,
      notes,
      isPaid: !!matchedPaid,
      paidInvoiceCode: matchedPaid?.invoiceCode || null,
      paidInstallment: matchedPaid?.installment || null,
    };
  });

  return {
    id: record.id,
    code: record.maHoSo,
    slipId: record.lichHenId,
    patientId: benhNhan.id,
    patientName: benhNhan.hoTen,
    patientPhone: benhNhan.sdt,
    dentistId: nhaSi.id,
    dentistName: nhaSi.hoTen,
    chiefComplaint: lichHen.ghiChu || '',

    // Khớp 100% schema HoSoBenhAn
    diagnosis: record.chanDoan || '',
    chanDoan: record.chanDoan || '',
    treatmentMethod: record.phuongPhapDieuTri || '',
    phuongPhapDieuTri: record.phuongPhapDieuTri || '',
    doctorAdvice: record.loiDan || '',
    loiDan: record.loiDan || '',
    result: record.ketQua || '',
    ketQua: record.ketQua || '',
    oralHealthStatus: record.tinhTrangRangMieng || '',
    tinhTrangRangMieng: record.tinhTrangRangMieng || '',
    notes: record.ghiChu || '',
    ghiChu: record.ghiChu || '',
    examDate: record.ngayKham ? formatDateYYYYMMDD(record.ngayKham) : '',
    ngayKham: record.ngayKham ? formatDateYYYYMMDD(record.ngayKham) : '',
    reExamDate: record.ngayTaiKham ? formatDateYYYYMMDD(record.ngayTaiKham) : null,
    ngayTaiKham: record.ngayTaiKham ? formatDateYYYYMMDD(record.ngayTaiKham) : null,

    // Điểm sức khỏe nụ cười (Smile Score)
    initialSmileScore: benhNhan.diemSucKhoeBanDau ?? 85,
    diemSucKhoeBanDau: benhNhan.diemSucKhoeBanDau ?? 85,
    currentSmileScore: benhNhan.diemSucKhoeHienTai ?? 95,
    diemSucKhoeHienTai: benhNhan.diemSucKhoeHienTai ?? 95,
    isInitialScoreLocked: benhNhan.diemSucKhoeBanDau !== null && benhNhan.diemSucKhoeBanDau !== undefined,

    treatments,
    materials,
    prescription,
    status: mapLichHenStatusToSlipStatus(lichHen.trangThai),
    rawStatus: lichHen.trangThai || 'dang_kham',
    appointmentStatus: lichHen.trangThai || 'dang_kham',
    invoices: (lichHen.hoaDon || []).map((inv) => ({
      id: inv.id,
      code: inv.maHoaDon,
      installment: inv.dotThanhToan || 1,
      invoiceType: inv.loaiHoaDon || 'thanh_toan_truoc',
      status: inv.trangThaiThanhToan,
      subtotal: Number(inv.tongTien) || 0,
      discount: Number(inv.giamGia) || 0,
      finalAmount: Number(inv.soTienThanhToan) || 0,
      paidAt: inv.ngayThanhToan,
      items: (inv.chiTietHoaDon || []).map((ct) => ({
        id: ct.id,
        name: ct.tenMuc,
        type: ct.loaiMuc,
        quantity: ct.soLuong,
        unitPrice: Number(ct.donGia),
        totalAmount: Number(ct.thanhTien),
        toothNumber: ct.viTriRang,
      })),
    })),
    createdAt: record.createdAt,
  };
};

export default {
  saveClinicalRecordRequestSchema,
  updateSlipStatusRequestSchema,
  clinicalRecordResponseSchema,
};
