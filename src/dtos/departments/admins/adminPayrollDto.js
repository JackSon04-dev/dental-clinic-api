import Joi from 'joi';
import { formatDoctorFullName } from '../../../constants/academicDegree.js';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

export const adminGetPayrollsQuerySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).default(() => new Date().getMonth() + 1),
  year: Joi.number().integer().min(2020).max(2050).default(() => new Date().getFullYear()),
  role: Joi.string().valid('ALL', 'BAC_SI', 'LE_TAN').default('ALL'),
  status: Joi.string().valid('ALL', 'chua_chot', 'da_chot', 'da_chi_tra').default('ALL'),
  search: Joi.string().trim().allow('').default(''),
});

export const adminCalculatePayrollBodySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required().messages({
    'any.required': 'Tháng tính lương không được để trống',
    'number.min': 'Tháng phải từ 1 đến 12',
    'number.max': 'Tháng phải từ 1 đến 12',
  }),
  year: Joi.number().integer().min(2020).max(2050).required().messages({
    'any.required': 'Năm tính lương không được để trống',
  }),
});

export const adminLockPayrollBodySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2020).max(2050).required(),
});

export const adminUpdatePayrollAdjustmentBodySchema = Joi.object({
  phuCapKhac: Joi.number().min(0).optional().messages({
    'number.min': 'Phụ cấp khác không được là số âm',
  }),
  tienPhatVang: Joi.number().min(0).optional().messages({
    'number.min': 'Tiền phạt trừ không được là số âm',
  }),
  ghiChu: Joi.string().trim().allow('', null).optional(),
});

// ============================================================================
// 2. RESPONSE FORMATTERS & SANITIZERS
// ============================================================================

export const adminPayrollItemResponseSchema = (payroll) => {
  if (!payroll) return null;

  const user = payroll.taiKhoan;
  const isDoctor = user?.loaiTaiKhoan === 'nha_si' && user?.nhaSi;
  const isStaff = user?.loaiTaiKhoan === 'nhan_vien' && user?.nhanVien;

  const profile = isDoctor ? user.nhaSi : isStaff ? user.nhanVien : null;
  const role = isDoctor ? 'BAC_SI' : 'LE_TAN';
  const roleTitle = isDoctor ? 'Nha sĩ điều trị' : 'Lễ tân & Thu ngân';
  const academicDegree = isDoctor ? (profile?.hocVi || 'BS') : null;
  const fullName = profile?.hoTen || user?.username || 'Nhân sự';
  const titleFullName = isDoctor ? formatDoctorFullName(academicDegree, fullName) : fullName;

  return {
    id: payroll.id,
    userId: user?.id,
    code: profile?.maNhaSi || profile?.maNhanVien || 'NS-00',
    fullName,
    academicDegree,
    titleFullName,
    role,
    roleTitle,
    specialty: isDoctor ? profile?.chuyenKhoa : null,
    avatarUrl: profile?.hinhAnhUrl || null,
    phone: profile?.sdt || null,
    month: payroll.thang,
    year: payroll.nam,
    baseSalary: Number(payroll.luongCoBan) || 0,
    standardShifts: payroll.soCaTieuChuan || 26,
    actualShifts: payroll.soCaThucTe || 0,
    absentShifts: payroll.soCaVang || 0,
    shiftRate: Number(payroll.donGiaCa) || 0,
    shiftSalary: Number(payroll.tienLuongCa) || 0,
    degreeBonus: Number(payroll.tienBonusHocVi) || 0,
    absencePenalty: Number(payroll.tienPhatVang) || 0,
    otherAllowance: Number(payroll.phuCapKhac) || 0,
    netSalary: Number(payroll.tongLuongThucNhan) || 0,
    status: payroll.trangThai || 'chua_chot',
    notes: payroll.ghiChu || null,
    lockedAt: payroll.ngayChot || null,
    paidAt: payroll.ngayChiTra || null,
    createdAt: payroll.createdAt,
    updatedAt: payroll.updatedAt,
  };
};

export const adminPayrollListResponseSchema = ({ month, year, payrolls }) => {
  const items = payrolls.map(adminPayrollItemResponseSchema);

  const totalBaseSalary = items.reduce((sum, p) => sum + p.baseSalary, 0);
  const totalDegreeBonus = items.reduce((sum, p) => sum + p.degreeBonus, 0);
  const totalPenalty = items.reduce((sum, p) => sum + p.absencePenalty, 0);
  const totalPayroll = items.reduce((sum, p) => sum + p.netSalary, 0);
  const lockedCount = items.filter((p) => p.status === 'da_chot' || p.status === 'da_chi_tra').length;

  return {
    period: {
      month: Number(month),
      year: Number(year),
    },
    summary: {
      totalStaffCount: items.length,
      lockedCount,
      totalBaseSalary,
      totalDegreeBonus,
      totalPenalty,
      totalPayroll,
    },
    payrolls: items,
  };
};

export const adminPayslipDetailResponseSchema = ({ payroll, invoices = [], shifts = [] }) => {
  const item = adminPayrollItemResponseSchema(payroll);

  return {
    ...item,
    invoices: invoices.map((inv) => ({
      id: inv.id,
      code: inv.maHoaDon,
      paidAt: inv.ngayThanhToan || inv.ngayLap,
      patientName: inv.lichHen?.benhNhan?.hoTen || 'Bệnh nhân',
      surchargeAmount: Number(inv.phuThuChuyenGia) || 0,
      totalAmount: Number(inv.soTienThanhToan) || 0,
    })),
    shifts: shifts.map((sh) => ({
      id: sh.id,
      date: sh.ngay,
      startTime: sh.gioBatDau,
      endTime: sh.gioKetThuc,
      roomName: sh.phongDieuTri?.tenPhong || 'Phòng điều trị',
      status: sh.trangThai,
    })),
  };
};
