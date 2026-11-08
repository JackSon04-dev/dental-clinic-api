import Joi from 'joi';
import { formatDateYYYYMMDD } from '../admins/adminWorkShiftDto.js';

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

  diagnosis: Joi.string().allow('', null).optional(),
  treatmentMethod: Joi.string().allow('', null).optional(),
  doctorAdvice: Joi.string().allow('', null).optional(),
  reExamDate: Joi.string().allow('', null).optional(),
  notes: Joi.string().allow('', null).optional(),
  oralHealthStatus: Joi.string().allow('', null).optional(),

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
      })
    )
    .default([]),

  // Danh sách đơn thuốc (cho phép dosage & instructions optional để tự động điền từ Thuoc)
  prescription: Joi.array()
    .items(
      Joi.object({
        medicineId: Joi.string().uuid().allow('', null).optional(),
        thuocId: Joi.string().uuid().allow('', null).optional(),
        id: Joi.string().uuid().allow('', null).optional(),
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

  // Map treatments
  const treatments = (record.dichVuDieuTri || []).map((t) => ({
    id: t.id,
    serviceId: t.dichVuId || t.dichVu?.id || t.chiTietDichVu?.dichVuId || null,
    serviceDetailId: t.dichVuId || t.chiTietDichVuId || null,
    serviceName:
      t.dichVu?.tenDichVu || t.chiTietDichVu?.tenChiTiet || t.chiTietDichVu?.dichVu?.tenDichVu || 'Dịch vụ điều trị',
    toothNumber: t.viTriRang || '',
    price: Number(t.donGia),
    quantity: t.soLuong,
    notes: t.ghiChu,
  }));

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

  // Map materials (vatTuSuDung)
  const materials = (record.vatTuSuDung || []).map((vt) => {
    let toothNumber = '';
    let notes = vt.ghiChu || '';
    if (notes.startsWith('Răng:')) {
      const parts = notes.split(' - ');
      toothNumber = parts[0].replace('Răng:', '').trim();
      notes = parts.slice(1).join(' - ');
    }
    return {
      id: vt.id,
      productId: vt.sanPhamId,
      productName: vt.sanPham?.tenSanPham || 'Vật tư nha khoa',
      productCode: vt.sanPham?.maSanPham || '',
      unit: vt.sanPham?.donViTinh || 'Cái',
      quantity: vt.soLuong,
      price: Number(vt.donGia),
      toothNumber,
      notes,
    };
  });

  return {
    id: record.id,
    code: record.maHoSo,
    slipId: record.lichHenId,
    patientId: benhNhan.id,
    patientName: benhNhan.hoTen,
    dentistId: nhaSi.id,
    dentistName: nhaSi.hoTen,
    chiefComplaint: lichHen.ghiChu || '',
    diagnosis: record.chanDoan || '',
    treatmentMethod: record.phuongPhapDieuTri || '',
    doctorAdvice: record.loiDan || '',
    result: record.ketQua || '',
    oralHealthStatus: record.tinhTrangRangMieng || '',
    notes: record.ghiChu || '',
    examDate: record.ngayKham ? formatDateYYYYMMDD(record.ngayKham) : '',
    reExamDate: record.ngayTaiKham ? formatDateYYYYMMDD(record.ngayTaiKham) : null,
    treatments,
    materials,
    prescription,
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
