import prisma from '../../../config/prisma.js';
import { getDoctorDegreeSurcharge, formatDoctorFullName } from '../../../constants/academicDegree.js';

/**
 * getDoctorSalaryBonusesService
 * Tổng hợp động tiền phụ thu học vị (Bonus) của các bác sĩ theo kỳ kế toán
 * @param {Object} params { month, year, doctorId }
 */
export const getDoctorSalaryBonusesService = async ({ month, year, doctorId } = {}) => {
  const now = new Date();
  const currentYear = year ? parseInt(year, 10) : now.getFullYear();
  const currentMonth = month ? parseInt(month, 10) : now.getMonth() + 1;

  const startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));

  // Lấy danh sách bác sĩ cần tính
  const doctorWhere = {
    ...(doctorId ? { id: doctorId } : {}),
  };

  const doctors = await prisma.nhaSi.findMany({
    where: doctorWhere,
    orderBy: { maNhaSi: 'asc' },
  });

  const reports = await Promise.all(
    doctors.map(async (doc) => {
      const degree = doc.hocVi || 'BS';
      const surchargePerCase = getDoctorDegreeSurcharge(degree);
      const titleFullName = formatDoctorFullName(degree, doc.hoTen);

      // Aggregate các hóa đơn đã thanh toán thành công trong tháng của bác sĩ
      const paidInvoices = await prisma.hoaDon.findMany({
        where: {
          trangThaiThanhToan: 'da_thanh_toan',
          lichHen: {
            caLamViec: {
              nhaSiId: doc.id,
            },
          },
          OR: [
            { ngayThanhToan: { gte: startDate, lte: endDate } },
            {
              ngayThanhToan: null,
              ngayLap: { gte: startDate, lte: endDate },
            },
          ],
        },
        select: {
          id: true,
          maHoaDon: true,
          phuThuChuyenGia: true,
          loaiHoaDon: true,
          dotThanhToan: true,
          soTienThanhToan: true,
          ngayThanhToan: true,
          ngayLap: true,
        },
      });

      const totalPaidCases = paidInvoices.length;
      // Tổng bonus tính theo trường phuThuChuyenGia (hóa đơn phát sinh đợt 2+ không cộng)
      const totalDegreeBonus = paidInvoices.reduce((sum, inv) => {
        if (inv.loaiHoaDon === 'phat_sinh' || (inv.dotThanhToan && inv.dotThanhToan > 1)) {
          return sum;
        }
        const recorded = Number(inv.phuThuChuyenGia) || 0;
        return sum + (recorded > 0 ? recorded : surchargePerCase);
      }, 0);

      return {
        doctorId: doc.id,
        doctorCode: doc.maNhaSi,
        fullName: doc.hoTen,
        academicDegree: degree,
        titleFullName,
        specialty: doc.chuyenKhoa,
        surchargeRatePerCase: surchargePerCase,
        totalPaidCases,
        totalDegreeBonus,
      };
    })
  );

  return {
    period: {
      month: currentMonth,
      year: currentYear,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    totalDoctors: reports.length,
    totalBonusPaid: reports.reduce((sum, r) => sum + r.totalDegreeBonus, 0),
    reports,
  };
};
