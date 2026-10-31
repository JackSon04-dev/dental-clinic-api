import Joi from 'joi';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

/**
 * adminGetInvoicesQuerySchema
 * Kiểm thực query parameters cho API lấy danh sách hóa đơn viện phí
 */
export const adminGetInvoicesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Tham số page phải là số nguyên',
    'number.min': 'Tham số page tối thiểu là 1',
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Tham số limit phải là số nguyên',
    'number.min': 'Tham số limit tối thiểu là 1',
    'number.max': 'Tham số limit tối đa là 100',
  }),
  status: Joi.string()
    .valid('ALL', 'chua_thanh_toan', 'da_thanh_toan', 'da_huy')
    .default('ALL')
    .messages({
      'any.only': 'Tham số status phải là một trong: ALL, chua_thanh_toan, da_thanh_toan, da_huy',
    }),
  paymentMethod: Joi.string()
    .valid('ALL', 'tien_mat', 'chuyen_khoan')
    .default('ALL')
    .messages({
      'any.only': 'Tham số paymentMethod phải là một trong: ALL, tien_mat, chuyen_khoan',
    }),
  fromDate: Joi.string()
    .isoDate()
    .allow('', null)
    .messages({
      'string.isoDate': 'Từ ngày (fromDate) phải đúng định dạng ngày ISO (YYYY-MM-DD)',
    }),
  toDate: Joi.string()
    .isoDate()
    .allow('', null)
    .messages({
      'string.isoDate': 'Đến ngày (toDate) phải đúng định dạng ngày ISO (YYYY-MM-DD)',
    }),
  search: Joi.string().trim().allow('').default(''),
});

/**
 * adminInvoiceIdParamSchema
 * Kiểm thực params :id (UUID hóa đơn)
 */
export const adminInvoiceIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'any.required': 'ID hóa đơn không được để trống',
    'string.guid': 'ID hóa đơn phải là UUID hợp lệ',
  }),
});

/**
 * adminUpdateInvoicePaymentRequestSchema
 * Kiểm thực dữ liệu xác nhận thanh toán hóa đơn
 */
export const adminUpdateInvoicePaymentRequestSchema = Joi.object({
  paymentMethod: Joi.string()
    .valid('tien_mat', 'chuyen_khoan')
    .required()
    .messages({
      'any.required': 'Phương thức thanh toán không được để trống',
      'any.only': 'Phương thức thanh toán phải là: tien_mat hoặc chuyen_khoan',
    }),
  paymentDate: Joi.string()
    .isoDate()
    .allow(null, '')
    .messages({
      'string.isoDate': 'Ngày thanh toán phải đúng định dạng ISO',
    }),
  note: Joi.string().trim().allow('', null).max(500).messages({
    'string.max': 'Ghi chú thanh toán tối đa 500 ký tự',
  }),
});

/**
 * adminCancelInvoiceRequestSchema
 * Kiểm thực dữ liệu hủy hóa đơn
 */
export const adminCancelInvoiceRequestSchema = Joi.object({
  cancelReason: Joi.string().trim().min(3).max(500).required().messages({
    'any.required': 'Lý do hủy hóa đơn không được để trống',
    'string.min': 'Lý do hủy hóa đơn tối thiểu 3 ký tự',
    'string.max': 'Lý do hủy hóa đơn tối đa 500 ký tự',
  }),
});

// ============================================================================
// 2. HELPER FUNCTIONS TÍNH TOÁN TÀI CHÍNH (3NF Reconstructed Financials)
// ============================================================================

/**
 * Helper tính toán toàn bộ số liệu tài chính hóa đơn theo mô hình 3NF
 * @param {Object} invoice Hóa đơn kèm đầy đủ relations
 * @returns {Object} { services, materials, financialSummary }
 */
export const calculateInvoiceFinancials = (invoice) => {
  const hoSo = invoice.lichHen?.hoSoBenhAn;
  const rawServices = hoSo?.dichVuDieuTri || [];
  const rawMaterials = hoSo?.vatTuSuDung || [];
  const giaiDoan = invoice.lichHen?.giaiDoanPhacDo;
  const voucher = invoice.khuyenMai;

  // 1. Bảng kê dịch vụ điều trị
  let totalServicesAmount = 0;
  const services = rawServices.map((dv) => {
    const qty = Number(dv.soLuong) || 1;
    const price = Number(dv.donGia) || 0;
    const lineTotal = qty * price;
    totalServicesAmount += lineTotal;

    return {
      id: dv.id,
      itemCode: dv.chiTietDichVu?.maChiTiet || null,
      itemName: dv.chiTietDichVu?.tenChiTiet || dv.chiTietDichVu?.dichVu?.tenDichVu || 'Dịch vụ điều trị',
      serviceGroup: dv.chiTietDichVu?.dichVu?.tenDichVu || null,
      unit: dv.chiTietDichVu?.donViTinh || 'Lần',
      toothPosition: dv.viTriRang || null,
      quantity: qty,
      unitPrice: price,
      totalAmount: lineTotal,
      notes: dv.ghiChu || null,
    };
  });

  // 2. Bảng kê vật tư / sản phẩm tiêu hao
  let totalMaterialsAmount = 0;
  const materials = rawMaterials.map((vt) => {
    const qty = Number(vt.soLuong) || 1;
    const price = Number(vt.donGia) || 0;
    const lineTotal = qty * price;
    totalMaterialsAmount += lineTotal;

    return {
      id: vt.id,
      productCode: vt.sanPham?.maSanPham || null,
      productName: vt.sanPham?.tenSanPham || 'Vật tư nha khoa',
      category: vt.sanPham?.phanLoai || null,
      unit: vt.sanPham?.donViTinh || 'Cái',
      manufacturer: vt.sanPham?.hangSanXuat || null,
      quantity: qty,
      unitPrice: price,
      totalAmount: lineTotal,
      notes: vt.ghiChu || null,
    };
  });

  // 3. Tính tạm tính (Subtotal)
  let subtotalAmount = 0;
  const stageFee = giaiDoan?.chiPhi ? Number(giaiDoan.chiPhi) : 0;

  if (stageFee > 0) {
    // Nếu có giai đoạn phác đồ với chi phí ấn định sẵn
    subtotalAmount = stageFee;
  } else if (totalServicesAmount + totalMaterialsAmount > 0) {
    // Nếu khám lẻ hoặc giai đoạn không ấn định chi phí cố định
    subtotalAmount = totalServicesAmount + totalMaterialsAmount;
  } else if (invoice.phacDoDieuTri?.tongChiPhiDuKien) {
    // Nếu hóa đơn thanh toán toàn bộ gói phác đồ
    subtotalAmount = Number(invoice.phacDoDieuTri.tongChiPhiDuKien);
  }

  // 4. Tính tiền giảm giá (Discount) từ voucher khuyến mãi
  let discountAmount = 0;
  if (voucher && subtotalAmount > 0) {
    const discountVal = Number(voucher.giaTriGiam) || 0;
    if (voucher.loaiGiam === 'phan_tram') {
      discountAmount = Math.round((subtotalAmount * discountVal) / 100);
    } else {
      discountAmount = Math.min(subtotalAmount, discountVal);
    }
  }

  // 5. Tính thành tiền thực thu (Final)
  const finalAmount = Math.max(0, subtotalAmount - discountAmount);

  return {
    services,
    materials,
    financialSummary: {
      totalServicesAmount,
      totalMaterialsAmount,
      subtotalAmount,
      discountAmount,
      finalAmount,
    },
  };
};

// ============================================================================
// 3. RESPONSE SANITIZERS (CamelCase Clean Architecture)
// ============================================================================

/**
 * adminInvoiceListItemResponseSchema
 * Format một hóa đơn trong danh sách tra cứu
 */
export const adminInvoiceListItemResponseSchema = (invoice) => {
  if (!invoice) return null;

  const { financialSummary } = calculateInvoiceFinancials(invoice);
  const benhNhan = invoice.lichHen?.benhNhan;
  const nhaSi = invoice.lichHen?.caLamViec?.nhaSi;
  const thuNgan = invoice.nhanVien;
  const giaiDoan = invoice.lichHen?.giaiDoanPhacDo;
  const phacDo = invoice.phacDoDieuTri || giaiDoan?.phacDoDieuTri;
  const voucher = invoice.khuyenMai;

  return {
    id: invoice.id,
    code: invoice.maHoaDon,
    createdAt: invoice.ngayLap,
    paidAt: invoice.ngayThanhToan,
    paymentMethod: invoice.phuongThucThanhToan,
    status: invoice.trangThaiThanhToan,
    notes: invoice.ghiChu,
    cancelReason: invoice.lyDoHuy,
    patient: benhNhan
      ? {
          id: benhNhan.id,
          code: benhNhan.maBenhNhan,
          fullName: benhNhan.hoTen,
          phone: benhNhan.sdt,
        }
      : null,
    doctor: nhaSi
      ? {
          id: nhaSi.id,
          fullName: nhaSi.hoTen,
        }
      : null,
    cashier: thuNgan
      ? {
          id: thuNgan.id,
          fullName: thuNgan.hoTen,
        }
      : null,
    treatmentPlan: phacDo
      ? {
          id: phacDo.id,
          title: phacDo.tenPhacDo,
        }
      : null,
    treatmentStage: giaiDoan
      ? {
          id: giaiDoan.id,
          stepOrder: giaiDoan.buocSo,
          title: giaiDoan.tenGiaiDoan,
        }
      : null,
    voucher: voucher
      ? {
          id: voucher.id,
          code: voucher.maKhuyenMai,
          discountType: voucher.loaiGiam,
          discountValue: Number(voucher.giaTriGiam),
        }
      : null,
    financials: financialSummary,
  };
};

/**
 * adminInvoiceDetailResponseSchema
 * Format chi tiết toàn bộ hóa đơn viện phí kèm bảng kê dịch vụ và vật tư y tế
 */
export const adminInvoiceDetailResponseSchema = (invoice) => {
  if (!invoice) return null;

  const { services, materials, financialSummary } = calculateInvoiceFinancials(invoice);
  const benhNhan = invoice.lichHen?.benhNhan;
  const nhaSi = invoice.lichHen?.caLamViec?.nhaSi;
  const thuNgan = invoice.nhanVien;
  const lichHen = invoice.lichHen;
  const hoSo = lichHen?.hoSoBenhAn;
  const giaiDoan = lichHen?.giaiDoanPhacDo;
  const phacDo = invoice.phacDoDieuTri || giaiDoan?.phacDoDieuTri;
  const voucher = invoice.khuyenMai;

  return {
    invoice: {
      id: invoice.id,
      code: invoice.maHoaDon,
      createdAt: invoice.ngayLap,
      paidAt: invoice.ngayThanhToan,
      paymentMethod: invoice.phuongThucThanhToan,
      status: invoice.trangThaiThanhToan,
      notes: invoice.ghiChu,
      cancelReason: invoice.lyDoHuy,
    },
    patient: benhNhan
      ? {
          id: benhNhan.id,
          code: benhNhan.maBenhNhan,
          fullName: benhNhan.hoTen,
          phone: benhNhan.sdt,
          email: benhNhan.email,
          dateOfBirth: benhNhan.ngaySinh,
          gender: benhNhan.gioiTinh,
          address: benhNhan.diaChi,
          medicalHistory: benhNhan.tienSuBenh,
          allergies: benhNhan.diUng,
        }
      : null,
    doctor: nhaSi
      ? {
          id: nhaSi.id,
          code: nhaSi.maNhaSi,
          fullName: nhaSi.hoTen,
          specialty: nhaSi.chuyenKhoa,
        }
      : null,
    cashier: thuNgan
      ? {
          id: thuNgan.id,
          code: thuNgan.maNhanVien,
          fullName: thuNgan.hoTen,
          role: thuNgan.chucVu,
        }
      : null,
    appointment: lichHen
      ? {
          id: lichHen.id,
          code: lichHen.maLichHen,
          appointmentDate: lichHen.ngayHen,
          appointmentTime: lichHen.gioHen,
          primaryService: lichHen.dichVu?.tenDichVu || null,
        }
      : null,
    medicalRecord: hoSo
      ? {
          id: hoSo.id,
          code: hoSo.maHoSo,
          examDate: hoSo.ngayKham,
          diagnosis: hoSo.chanDoan,
          treatmentMethod: hoSo.phuongPhapDieuTri,
          oralCondition: hoSo.tinhTrangRangMieng,
          advice: hoSo.loiDan,
          reExaminationDate: hoSo.ngayTaiKham,
        }
      : null,
    treatmentPlan: phacDo
      ? {
          id: phacDo.id,
          code: phacDo.maPhacDo,
          title: phacDo.tenPhacDo,
          totalEstimatedFee: phacDo.tongChiPhiDuKien ? Number(phacDo.tongChiPhiDuKien) : null,
          status: phacDo.trangThai,
        }
      : null,
    treatmentStage: giaiDoan
      ? {
          id: giaiDoan.id,
          stepOrder: giaiDoan.buocSo,
          title: giaiDoan.tenGiaiDoan,
          description: giaiDoan.moTa,
          materialServiceDescription: giaiDoan.moTaVatTuDichVu,
          fee: Number(giaiDoan.chiPhi),
          paymentStatus: giaiDoan.trangThaiThanhToan,
          isIncidental: giaiDoan.coPhatSinh,
        }
      : null,
    voucher: voucher
      ? {
          id: voucher.id,
          code: voucher.maKhuyenMai,
          title: voucher.tenChuongTrinh,
          discountType: voucher.loaiGiam,
          discountValue: Number(voucher.giaTriGiam),
          discountApplied: financialSummary.discountAmount,
        }
      : null,
    services,
    materials,
    financialSummary,
  };
};
