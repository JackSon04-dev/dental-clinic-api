import Joi from 'joi';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

export const adminGetPatientsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(15),
  search: Joi.string().trim().allow('').default(''),
});

export const adminGetPatientDetailParamsSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const adminUpdatePatientRequestSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(150),
  hoTen: Joi.string().trim().min(2).max(150),
  avatarUrl: Joi.string().allow('', null),
  hinhAnhUrl: Joi.string().allow('', null),
  birthDate: Joi.string().isoDate().allow('', null),
  ngaySinh: Joi.string().isoDate().allow('', null),
  gender: Joi.string().valid('nam', 'nu', 'khac', 'MALE', 'FEMALE', 'OTHER'),
  gioiTinh: Joi.string().valid('nam', 'nu', 'khac', 'MALE', 'FEMALE', 'OTHER'),
  phone: Joi.string().trim().max(20).allow('', null),
  sdt: Joi.string().trim().max(20).allow('', null),
  email: Joi.string().email().trim().max(150).allow('', null),
  address: Joi.string().trim().max(500).allow('', null),
  diaChi: Joi.string().trim().max(500).allow('', null),
  medicalHistory: Joi.alternatives().try(Joi.string().allow('', null), Joi.array().items(Joi.string())),
  tienSuBenh: Joi.alternatives().try(Joi.string().allow('', null), Joi.array().items(Joi.string())),
  allergies: Joi.alternatives().try(Joi.string().allow('', null), Joi.array().items(Joi.string())),
  diUng: Joi.alternatives().try(Joi.string().allow('', null), Joi.array().items(Joi.string())),
  notes: Joi.string().allow('', null),
  ghiChu: Joi.string().allow('', null),
}).min(1);

export const adminCreatePatientRequestSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(150),
  hoTen: Joi.string().trim().min(2).max(150),
  birthDate: Joi.string().isoDate().allow('', null),
  dateOfBirth: Joi.string().isoDate().allow('', null),
  ngaySinh: Joi.string().isoDate().allow('', null),
  gender: Joi.string().allow('', null),
  gioiTinh: Joi.string().allow('', null),
  phone: Joi.string().trim().max(20).allow('', null),
  sdt: Joi.string().trim().max(20).allow('', null),
  email: Joi.string().email().trim().max(150).allow('', null),
  address: Joi.string().trim().max(500).allow('', null),
  diaChi: Joi.string().trim().max(500).allow('', null),
  medicalHistory: Joi.alternatives().try(Joi.string().allow('', null), Joi.array().items(Joi.string())),
  tienSuBenh: Joi.alternatives().try(Joi.string().allow('', null), Joi.array().items(Joi.string())),
  allergies: Joi.alternatives().try(Joi.string().allow('', null), Joi.array().items(Joi.string())),
  diUng: Joi.alternatives().try(Joi.string().allow('', null), Joi.array().items(Joi.string())),
  notes: Joi.string().allow('', null),
  ghiChu: Joi.string().allow('', null),
}).unknown(true);

// ============================================================================
// 2. RESPONSE SCHEMAS & FORMATTERS (Chuẩn camelCase cho Frontend)
// ============================================================================

const mapGender = (gender) => {
  if (!gender) return 'OTHER';
  const g = gender.toLowerCase();
  if (g === 'nam' || g === 'male') return 'MALE';
  if (g === 'nu' || g === 'female') return 'FEMALE';
  return 'OTHER';
};

const parseListString = (str) => {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  return str
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const adminPatientListItemResponseSchema = (patient) => {
  if (!patient) return null;

  return {
    id: patient.id,
    code: patient.maBenhNhan || null,
    fullName: patient.hoTen,
    avatarUrl: patient.hinhAnhUrl || null,
    hinhAnhUrl: patient.hinhAnhUrl || null,
    gender: mapGender(patient.gioiTinh),
    birthDate: patient.ngaySinh ? patient.ngaySinh.toISOString().slice(0, 10) : '',
    phone: patient.sdt || '',
    address: patient.diaChi || '',
    examCount: patient._count?.lichHen ?? (patient.lichHen ? patient.lichHen.length : 0),
    treatmentPlanCount: patient._count?.phacDoDieuTri ?? (patient.phacDoDieuTri ? patient.phacDoDieuTri.length : 0),
    createdAt: patient.createdAt,
  };
};

export const adminPatientDetailResponseSchema = (patient) => {
  if (!patient) return null;

  // Format lịch sử khám từ lịch hẹn và hồ sơ bệnh án với đầy đủ chi tiết
  const examHistory = (patient.lichHen || []).map((lh) => {
    const hoSo = lh.hoSoBenhAn;

    // 1. Danh sách răng & dịch vụ điều trị (treatedTeeth)
    let totalServicesFee = 0;
    const treatedTeeth = (hoSo?.dichVuDieuTri || []).map((dv) => {
      const qty = Number(dv.soLuong) || 1;
      const price = Number(dv.donGia) || 0;
      const lineTotal = qty * price;
      totalServicesFee += lineTotal;

      const serviceName =
        dv.dichVu?.tenDichVu ||
        dv.chiTietDichVu?.tenChiTiet ||
        dv.chiTietDichVu?.dichVu?.tenDichVu ||
        'Dịch vụ điều trị';

      return {
        id: dv.id,
        toothNumber: dv.viTriRang || '',
        serviceName,
        price,
        quantity: qty,
        totalAmount: lineTotal,
        notes: dv.ghiChu || null,
      };
    });

    // 2. Danh sách vật tư y tế đã sử dụng (materials)
    let totalMaterialsFee = 0;
    const materials = (hoSo?.vatTuSuDung || []).map((vt) => {
      const qty = Number(vt.soLuong) || 1;
      const price = Number(vt.donGia) || 0;
      const lineTotal = qty * price;
      totalMaterialsFee += lineTotal;

      return {
        id: vt.id,
        productId: vt.sanPhamId,
        productName: vt.sanPham?.tenSanPham || 'Vật tư nha khoa',
        productCode: vt.sanPham?.maSanPham || '',
        unit: vt.sanPham?.donViTinh || 'Cái',
        quantity: qty,
        price,
        totalAmount: lineTotal,
        notes: vt.ghiChu || null,
      };
    });

    // 3. Danh sách đơn thuốc và từng dòng chi tiết (prescription)
    const prescription = [];
    (hoSo?.donThuoc || []).forEach((dt) => {
      (dt.chiTietDonThuoc || []).forEach((ct) => {
        prescription.push({
          id: ct.id,
          prescriptionId: dt.id,
          prescriptionCode: dt.maDonThuoc,
          medicineId: ct.thuocId,
          medicineName: ct.tenThuoc || ct.thuoc?.tenThuoc || 'Thuốc kê đơn',
          activeIngredient: ct.hoatChat || ct.thuoc?.hoatChat || '',
          dosage: ct.lieuDung || ct.thuoc?.lieuDungMacDinh || '',
          quantity: Number(ct.soLuong) || 1,
          unit: ct.donViTinh || ct.thuoc?.donViTinh || 'Viên',
          instructions: ct.huongDan || ct.thuoc?.huongDanMacDinh || '',
          usageInstruction: ct.huongDan || ct.thuoc?.huongDanMacDinh || '',
          timesPerDay: ct.soLanNgay || ct.thuoc?.soLanNgayMacDinh || null,
          timeOfDay: ct.thoiDiemUong || ct.thuoc?.thoiDiemUongMacDinh || null,
        });
      });
    });

    const totalAmount = totalServicesFee + totalMaterialsFee;

    let status = 'DANG_KHAM';
    if (lh.trangThai === 'hoan_thanh') status = 'HOAN_THANH';
    else if (lh.trangThai === 'da_huy') status = 'DA_HUY';
    else if (lh.trangThai === 'cho_thanh_toan') status = 'CHO_THANH_TOAN';
    else if (lh.trangThai === 'dang_dieu_tri') status = 'DANG_DIEU_TRI';

    return {
      id: hoSo?.id || lh.id,
      appointmentId: lh.id,
      appointmentCode: lh.maLichHen || null,
      recordCode: hoSo?.maHoSo || null,
      date: lh.ngayHen ? lh.ngayHen.toISOString().slice(0, 10) : '',
      time: lh.gioHen
        ? typeof lh.gioHen === 'string'
          ? lh.gioHen.slice(11, 16) || lh.gioHen.slice(0, 5)
          : lh.gioHen.toISOString().slice(11, 16)
        : null,
      doctorName: lh.caLamViec?.nhaSi?.hoTen || 'Bác sĩ điều trị',
      roomName: lh.caLamViec?.phongDieuTri?.tenPhong || null,
      serviceName: lh.dichVu?.tenDichVu || 'Khám điều trị',
      status,
      rawStatus: lh.trangThai,
      totalAmount,
      diagnosis: hoSo?.chanDoan || lh.ghiChu || null,
      treatmentMethod: hoSo?.phuongPhapDieuTri || null,
      doctorAdvice: hoSo?.loiDan || null,
      reExamDate: hoSo?.ngayTaiKham ? hoSo.ngayTaiKham.toISOString().slice(0, 10) : null,
      oralHealthStatus: hoSo?.tinhTrangRangMieng || null,
      notes: hoSo?.ghiChu || null,
      // Đầy đủ 3 khối dữ liệu lâm sàng
      treatedTeeth,
      prescription,
      materials,
    };
  });

  // Format phác đồ điều trị và các giai đoạn kèm tiến độ hoàn thành (%)
  const treatmentPlans = (patient.phacDoDieuTri || []).map((pd) => {
    const stages = (pd.giaiDoanPhacDo || []).map((gd) => {
      let stageStatus = 'CHO_KHAM';
      if (
        gd.trangThai === 'da_hoan_thanh' ||
        gd.trangThai === 'hoan_thanh' ||
        (gd.ngayThucHien && gd.trangThai !== 'dang_thuc_hien')
      ) {
        stageStatus = 'HOAN_THANH';
      } else if (gd.trangThai === 'dang_thuc_hien') {
        stageStatus = 'DANG_THUC_HIEN';
      }

      return {
        step: gd.buocSo,
        title: gd.tenGiaiDoan,
        status: stageStatus,
        rawStatus: gd.trangThai,
        completedDate: gd.ngayThucHien ? gd.ngayThucHien.toISOString().slice(0, 10) : null,
        notes: gd.ghiChu || null,
      };
    });

    const totalEstimatedCost = 0;

    const completedStages = stages.filter((s) => s.status === 'HOAN_THANH').length;
    const totalStages = stages.length;
    const progressPercent = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

    let planStatus = 'DANG_DIEU_TRI';
    if (pd.trangThai === 'hoan_thanh' || (totalStages > 0 && completedStages === totalStages)) {
      planStatus = 'HOAN_THANH';
    } else if (pd.trangThai === 'tam_dung' || pd.trangThai === 'da_huy') {
      planStatus = 'TAM_DUNG';
    }

    return {
      id: pd.id,
      code: pd.maPhacDo || 'PD-000',
      title: pd.tenPhacDo,
      doctorName: pd.nhaSi?.hoTen || 'Bác sĩ phụ trách',
      status: planStatus,
      rawStatus: pd.trangThai,
      startDate: pd.ngayBatDau ? pd.ngayBatDau.toISOString().slice(0, 10) : '',
      expectedEndDate: pd.ngayDuKienHoanThanh ? pd.ngayDuKienHoanThanh.toISOString().slice(0, 10) : null,
      totalEstimatedCost,
      completedStages,
      totalStages,
      progressPercent,
      stages,
      notes: pd.ghiChu || null,
    };
  });

  // Xử lý thông tin người liên hệ khẩn cấp từ ghi chú (nếu có)
  let emergencyContact = null;
  if (patient.ghiChu && patient.ghiChu.includes(':')) {
    const parts = patient.ghiChu.split('-');
    emergencyContact = {
      name: parts[0]?.trim() || patient.ghiChu.trim(),
      phone: parts[1]?.trim() || '',
      relationship: parts[2]?.trim() || 'Người thân',
    };
  }

  return {
    ...adminPatientListItemResponseSchema(patient),
    email: patient.email || null,
    medicalHistory: patient.tienSuBenh || null,
    tienSuBenh: patient.tienSuBenh || null,
    allergies: patient.diUng || null,
    diUng: patient.diUng || null,
    emergencyContact,
    examHistory,
    treatmentPlans,
  };
};
