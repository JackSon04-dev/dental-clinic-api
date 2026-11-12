import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import { getDoctorDegreeSurcharge } from '../../../constants/academicDegree.js';
import {
  adminPayrollListResponseSchema,
  adminPayslipDetailResponseSchema,
} from '../../../dtos/departments/admins/adminPayrollDto.js';

/**
 * Tính toán và lưu trữ/cập nhật bảng lương cho 1 nhân sự
 */
const calculateSingleStaffPayroll = async (tx, user, month, year, forceRecalculate = false) => {
  const isDoctor = user.loaiTaiKhoan === 'nha_si' && user.nhaSi;
  const isStaff = user.loaiTaiKhoan === 'nhan_vien' && user.nhanVien;

  if (!isDoctor && !isStaff) return null;

  // Kiểm tra xem đã có bản ghi bảng lương chưa
  const existing = await tx.bangLuong.findUnique({
    where: {
      uq_bang_luong_nhan_su_thang_nam: {
        taiKhoanId: user.id,
        thang: month,
        nam: year,
      },
    },
  });

  // Nếu bảng lương đã chốt hoặc đã chi trả và không ép tính lại -> giữ nguyên
  if (existing && (existing.trangThai === 'da_chot' || existing.trangThai === 'da_chi_tra') && !forceRecalculate) {
    return existing;
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // 1. Lương cơ bản theo hợp đồng
  const baseSalary = isDoctor
    ? Number(user.nhaSi.luongCoBan) || 15000000
    : Number(user.nhanVien.luongCoBan) || 8000000;

  const soCaTieuChuan = 26; // Chuẩn 26 ca/tháng
  const donGiaCa = Math.round(baseSalary / soCaTieuChuan);

  let soCaVang = 0;
  let soCaThucTe = soCaTieuChuan;
  let tienBonusHocVi = 0;

  // 2. Chấm ca làm việc và tính vắng ca
  if (isDoctor) {
    const shifts = await tx.caLamViec.findMany({
      where: {
        nhaSiId: user.nhaSi.id,
        ngay: { gte: startDate, lte: endDate },
      },
    });

    if (shifts.length > 0) {
      soCaVang = shifts.filter((s) => s.trangThai === 'vang_mat').length;
      soCaThucTe = Math.max(0, shifts.length - soCaVang);
    }

    // 3. Tính Bonus học vị kế thừa trực tiếp từ cột phuThuChuyenGia của HoaDon đã thanh toán
    const paidInvoices = await tx.hoaDon.findMany({
      where: {
        trangThaiThanhToan: 'da_thanh_toan',
        lichHen: {
          caLamViec: { nhaSiId: user.nhaSi.id },
        },
        OR: [
          { ngayThanhToan: { gte: startDate, lte: endDate } },
          { ngayThanhToan: null, ngayLap: { gte: startDate, lte: endDate } },
        ],
      },
      select: { phuThuChuyenGia: true, loaiHoaDon: true, dotThanhToan: true },
    });

    const degreeSurchargeRate = getDoctorDegreeSurcharge(user.nhaSi.hocVi || 'BS');
    tienBonusHocVi = paidInvoices.reduce((sum, inv) => {
      if (inv.loaiHoaDon === 'phat_sinh' || (inv.dotThanhToan && inv.dotThanhToan > 1)) {
        return sum;
      }
      const rec = Number(inv.phuThuChuyenGia) || 0;
      return sum + (rec > 0 ? rec : degreeSurchargeRate);
    }, 0);
  }

  // Tiền công tính theo số ca thực tế
  const tienLuongCa = Math.round(soCaThucTe * donGiaCa);
  // Tiền phạt trừ vắng ca
  const tienPhatVang = Math.round(soCaVang * donGiaCa);
  const phuCapKhac = existing ? Number(existing.phuCapKhac) : 0;

  // Lương thực nhận = Tiền công ca + Bonus học vị + Phụ cấp - Phạt vắng
  const tongLuongThucNhan = Math.max(0, tienLuongCa + tienBonusHocVi + phuCapKhac - tienPhatVang);

  // Lưu hoặc cập nhật vào bảng bang_luong
  return await tx.bangLuong.upsert({
    where: {
      uq_bang_luong_nhan_su_thang_nam: {
        taiKhoanId: user.id,
        thang: month,
        nam: year,
      },
    },
    update: {
      luongCoBan: baseSalary,
      soCaTieuChuan,
      soCaThucTe,
      soCaVang,
      donGiaCa,
      tienLuongCa,
      tienBonusHocVi,
      tienPhatVang,
      phuCapKhac,
      tongLuongThucNhan,
    },
    create: {
      taiKhoanId: user.id,
      thang: month,
      nam: year,
      luongCoBan: baseSalary,
      soCaTieuChuan,
      soCaThucTe,
      soCaVang,
      donGiaCa,
      tienLuongCa,
      tienBonusHocVi,
      tienPhatVang,
      phuCapKhac: 0,
      tongLuongThucNhan,
      trangThai: 'chua_chot',
    },
    include: {
      taiKhoan: {
        include: { nhaSi: true, nhanVien: true },
      },
    },
  });
};

/**
 * 1. getMonthlyPayrollService
 * Lấy danh sách bảng lương tháng của tất cả nhân sự có bộ lọc & tìm kiếm
 */
export const getMonthlyPayrollService = async ({
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  role = 'ALL',
  status = 'ALL',
  search = '',
}) => {
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  // 1. Tự động kiểm tra và tính toán bảng lương cho các nhân sự chưa có record trong tháng
  const activeStaffUsers = await prisma.taiKhoan.findMany({
    where: {
      trangThai: 'hoat_dong',
      loaiTaiKhoan: { in: ['nha_si', 'nhan_vien'] },
    },
    include: { nhaSi: true, nhanVien: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const u of activeStaffUsers) {
      await calculateSingleStaffPayroll(tx, u, monthNum, yearNum, false);
    }
  });

  // 2. Xây dựng điều kiện truy vấn
  const andConditions = [
    { thang: monthNum },
    { nam: yearNum },
    { taiKhoan: { loaiTaiKhoan: { in: ['nha_si', 'nhan_vien'] } } },
  ];

  if (role === 'BAC_SI') {
    andConditions.push({ taiKhoan: { loaiTaiKhoan: 'nha_si' } });
  } else if (role === 'LE_TAN') {
    andConditions.push({ taiKhoan: { loaiTaiKhoan: 'nhan_vien' } });
  }

  if (status !== 'ALL') {
    andConditions.push({ trangThai: status });
  }

  const cleanSearch = String(search).trim();
  if (cleanSearch) {
    andConditions.push({
      OR: [
        { taiKhoan: { nhaSi: { hoTen: { contains: cleanSearch, mode: 'insensitive' } } } },
        { taiKhoan: { nhanVien: { hoTen: { contains: cleanSearch, mode: 'insensitive' } } } },
        { taiKhoan: { nhaSi: { maNhaSi: { contains: cleanSearch, mode: 'insensitive' } } } },
        { taiKhoan: { nhanVien: { maNhanVien: { contains: cleanSearch, mode: 'insensitive' } } } },
      ],
    });
  }

  const payrolls = await prisma.bangLuong.findMany({
    where: { AND: andConditions },
    include: {
      taiKhoan: {
        include: { nhaSi: true, nhanVien: true },
      },
    },
    orderBy: [
      { taiKhoan: { loaiTaiKhoan: 'asc' } },
      { createdAt: 'desc' },
    ],
  });

  return adminPayrollListResponseSchema({
    month: monthNum,
    year: yearNum,
    payrolls,
  });
};

/**
 * 2. calculateAndGenerateMonthlyPayrollService
 * Chủ động tính toán lại toàn bộ bảng lương tháng cho toàn bộ nhân sự
 */
export const calculateAndGenerateMonthlyPayrollService = async ({ month, year }) => {
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  const activeStaffUsers = await prisma.taiKhoan.findMany({
    where: {
      trangThai: 'hoat_dong',
      loaiTaiKhoan: { in: ['nha_si', 'nhan_vien'] },
    },
    include: { nhaSi: true, nhanVien: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const u of activeStaffUsers) {
      await calculateSingleStaffPayroll(tx, u, monthNum, yearNum, true);
    }
  });

  return getMonthlyPayrollService({ month: monthNum, year: yearNum });
};

/**
 * 3. getPayslipDetailService
 * Lấy chi tiết phiếu lương của 1 nhân sự kèm đối soát hóa đơn và ca trực
 */
export const getPayslipDetailService = async (payrollId) => {
  const payroll = await prisma.bangLuong.findUnique({
    where: { id: payrollId },
    include: {
      taiKhoan: {
        include: { nhaSi: true, nhanVien: true },
      },
    },
  });

  if (!payroll) {
    throw new ApiError(404, 'Không tìm thấy thông tin phiếu lương yêu cầu!');
  }

  const startDate = new Date(Date.UTC(payroll.nam, payroll.thang - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(payroll.nam, payroll.thang, 0, 23, 59, 59, 999));

  let invoices = [];
  let shifts = [];

  const user = payroll.taiKhoan;
  if (user?.loaiTaiKhoan === 'nha_si' && user?.nhaSi) {
    // 1. Danh sách hóa đơn đóng góp phụ thu học vị
    invoices = await prisma.hoaDon.findMany({
      where: {
        trangThaiThanhToan: 'da_thanh_toan',
        lichHen: {
          caLamViec: { nhaSiId: user.nhaSi.id },
        },
        OR: [
          { ngayThanhToan: { gte: startDate, lte: endDate } },
          { ngayThanhToan: null, ngayLap: { gte: startDate, lte: endDate } },
        ],
      },
      include: {
        lichHen: {
          include: { benhNhan: true },
        },
      },
      orderBy: { ngayLap: 'desc' },
      take: 50,
    });

    // 2. Danh sách ca làm việc trong tháng
    shifts = await prisma.caLamViec.findMany({
      where: {
        nhaSiId: user.nhaSi.id,
        ngay: { gte: startDate, lte: endDate },
      },
      include: {
        phongDieuTri: true,
      },
      orderBy: { ngay: 'desc' },
      take: 50,
    });
  }

  return adminPayslipDetailResponseSchema({ payroll, invoices, shifts });
};

/**
 * 4. lockMonthlyPayrollService
 * Khóa/chốt bảng lương tháng (chuyển trạng thái da_chot)
 */
export const lockMonthlyPayrollService = async ({ month, year }) => {
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  const updated = await prisma.bangLuong.updateMany({
    where: {
      thang: monthNum,
      nam: yearNum,
      trangThai: 'chua_chot',
    },
    data: {
      trangThai: 'da_chot',
      ngayChot: new Date(),
    },
  });

  return {
    success: true,
    message: `Đã khóa và chốt thành công ${updated.count} bảng lương của Tháng ${monthNum}/${yearNum}.`,
    month: monthNum,
    year: yearNum,
    lockedCount: updated.count,
  };
};

/**
 * 5. updatePayrollAdjustmentService
 * Điều chỉnh phụ cấp hoặc tiền phạt trừ cho 1 phiếu lương
 */
export const updatePayrollAdjustmentService = async (payrollId, updateData) => {
  const payroll = await prisma.bangLuong.findUnique({
    where: { id: payrollId },
  });

  if (!payroll) {
    throw new ApiError(404, 'Không tìm thấy phiếu lương yêu cầu!');
  }

  if (payroll.trangThai === 'da_chi_tra') {
    throw new ApiError(400, 'Không thể chỉnh sửa phiếu lương đã chi trả!');
  }

  const { phuCapKhac, tienPhatVang, ghiChu } = updateData;

  const newPhuCap = phuCapKhac !== undefined ? Number(phuCapKhac) : Number(payroll.phuCapKhac);
  const newPhat = tienPhatVang !== undefined ? Number(tienPhatVang) : Number(payroll.tienPhatVang);
  const newNetSalary = Math.max(
    0,
    Number(payroll.tienLuongCa) + Number(payroll.tienBonusHocVi) + newPhuCap - newPhat
  );

  const updated = await prisma.bangLuong.update({
    where: { id: payrollId },
    data: {
      phuCapKhac: newPhuCap,
      tienPhatVang: newPhat,
      tongLuongThucNhan: newNetSalary,
      ...(ghiChu !== undefined && { ghiChu: ghiChu ? ghiChu.trim() : null }),
    },
    include: {
      taiKhoan: {
        include: { nhaSi: true, nhanVien: true },
      },
    },
  });

  return getPayslipDetailService(updated.id);
};
