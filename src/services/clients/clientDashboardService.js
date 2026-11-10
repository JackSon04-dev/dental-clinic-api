import prisma from '../../config/prisma.js';
import { ApiError } from '../../common/errorMiddleware.js';
import {
  formatDashboardStatsResponse,
  formatFeaturedAppointment,
  formatTreatmentPlanDetail,
} from '../../dtos/clients/clientDashboardDto.js';

const ACTIVE_APPOINTMENT_STATUSES = [
  'cho_xac_nhan',
  'da_xac_nhan',
  'da_tiep_nhan',
  'cho_kham',
  'dang_kham',
  'cho_thanh_toan',
  'dang_dieu_tri',
];

class ClientDashboardService {
  /**
   * Lấy dữ liệu cho 4 Card thống kê chính trên trang Dashboard của bệnh nhân
   * @param {string} benhNhanId - UUID của bệnh nhân (profileId từ Access Token)
   */
  async getDashboardStats(benhNhanId) {
    if (!benhNhanId) {
      throw new ApiError(400, 'Không tìm thấy mã hồ sơ bệnh nhân trong phiên làm việc.');
    }

    // Xác định mốc thời gian ngày hôm nay (00:00:00) theo giờ địa phương
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Thực thi song song 4 luồng truy vấn độc lập trên CSDL
    const [benhNhan, nextAppointment, latestPlan, visitCount] = await Promise.all([
      // 1. Lấy thông tin điểm sức khỏe & ghi chú của bệnh nhân
      prisma.benhNhan.findUnique({
        where: { id: benhNhanId },
        select: {
          id: true,
          hoTen: true,
          ghiChu: true,
          diemSucKhoeBanDau: true,
          diemSucKhoeHienTai: true,
        },
      }),

      // 2. Lấy lịch hẹn sắp tới hoặc đang diễn ra trong ngày
      prisma.lichHen.findFirst({
        where: {
          benhNhanId,
          ngayHen: { gte: startOfToday },
          trangThai: { in: ACTIVE_APPOINTMENT_STATUSES },
        },
        orderBy: [{ ngayHen: 'asc' }, { gioHen: 'asc' }],
        select: {
          id: true,
          maLichHen: true,
          ngayHen: true,
          gioHen: true,
          gioKetThucDuKien: true,
          trangThai: true,
          dichVu: {
            select: {
              tenDichVu: true,
            },
          },
        },
      }),

      // 3. Lấy phác đồ mới nhất của bệnh nhân (dù đang điều trị hay đã hoàn thành)
      prisma.phacDoDieuTri.findFirst({
        where: { benhNhanId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tenPhacDo: true,
          ghiChu: true,
          giaiDoanPhacDo: {
            select: {
              buocSo: true,
              tenGiaiDoan: true,
              trangThai: true,
              ghiChu: true,
            },
            orderBy: { buocSo: 'asc' },
          },
        },
      }),

      // 4. Đếm số lượng hồ sơ bệnh án đã khám xong của bệnh nhân
      prisma.hoSoBenhAn.count({
        where: {
          lichHen: {
            benhNhanId,
          },
        },
      }),
    ]);

    if (!benhNhan) {
      throw new ApiError(404, 'Không tìm thấy hồ sơ bệnh nhân trong hệ thống.');
    }

    // Format dữ liệu qua DTO và trả về
    return formatDashboardStatsResponse({
      appointment: nextAppointment,
      benhNhan,
      latestPlan,
      visitCount,
    });
  }

  /**
   * Lấy thông tin chi tiết cuộc hẹn gần nhất (Featured Appointment)
   * Ưu tiên lịch tương lai gần nhất; nếu không có thì lấy lịch gần nhất trước đó đã hoàn thành
   * @param {string} benhNhanId - UUID của bệnh nhân
   */
  async getFeaturedAppointment(benhNhanId) {
    if (!benhNhanId) {
      throw new ApiError(400, 'Không tìm thấy mã hồ sơ bệnh nhân trong phiên làm việc.');
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const selectFields = {
      id: true,
      maLichHen: true,
      ngayHen: true,
      gioHen: true,
      gioKetThucDuKien: true,
      trangThai: true,
      ghiChu: true,
      dichVu: {
        select: {
          tenDichVu: true,
        },
      },
      caLamViec: {
        select: {
          nhaSi: {
            select: {
              hoTen: true,
              chuyenKhoa: true,
              hinhAnhUrl: true,
            },
          },
          phongDieuTri: {
            select: {
              tenPhong: true,
            },
          },
        },
      },
      giaiDoanPhacDo: {
        select: {
          tenGiaiDoan: true,
          buocSo: true,
        },
      },
      hoSoBenhAn: {
        select: {
          ketQua: true,
          chanDoan: true,
          loiDan: true,
        },
      },
    };

    // 1. Thử tìm cuộc hẹn sắp tới hoặc đang diễn ra (ngayHen >= hôm nay, trạng thái hợp lệ)
    const upcomingAppointment = await prisma.lichHen.findFirst({
      where: {
        benhNhanId,
        ngayHen: { gte: startOfToday },
        trangThai: { in: ACTIVE_APPOINTMENT_STATUSES },
      },
      orderBy: [{ ngayHen: 'asc' }, { gioHen: 'asc' }],
      select: selectFields,
    });

    if (upcomingAppointment) {
      return formatFeaturedAppointment(upcomingAppointment, true);
    }

    // 2. Nếu không có lịch tương lai/đang diễn ra, lấy cuộc hẹn gần nhất trong quá khứ đã hoàn thành
    const pastAppointment = await prisma.lichHen.findFirst({
      where: {
        benhNhanId,
        trangThai: { in: ['da_kham', 'hoan_thanh'] },
      },
      orderBy: [{ ngayHen: 'desc' }, { gioHen: 'desc' }],
      select: selectFields,
    });

    if (pastAppointment) {
      return formatFeaturedAppointment(pastAppointment, false);
    }

    // 3. Nếu chưa từng có lịch hẹn nào
    return formatFeaturedAppointment(null, false);
  }

  /**
   * Lấy thông tin phác đồ điều trị gần nhất kèm danh sách các giai đoạn (Treatment Plan Component)
   * Phục vụ hiển thị phác đồ tổng quát và dropdown chi tiết các giai đoạn
   * @param {string} benhNhanId - UUID của bệnh nhân (profileId từ Access Token)
   */
  async getTreatmentPlan(benhNhanId) {
    if (!benhNhanId) {
      throw new ApiError(400, 'Không tìm thấy mã hồ sơ bệnh nhân trong phiên làm việc.');
    }

    const latestPlan = await prisma.phacDoDieuTri.findFirst({
      where: { benhNhanId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        maPhacDo: true,
        tenPhacDo: true,
        chanDoanBanDau: true,
        trangThai: true,
        ngayBatDau: true,
        ngayDuKienHoanThanh: true,
        ngayHoanThanhThucTe: true,
        ghiChu: true,
        nhaSi: {
          select: {
            hoTen: true,
            chuyenKhoa: true,
          },
        },
        giaiDoanPhacDo: {
          orderBy: { buocSo: 'asc' },
          select: {
            id: true,
            buocSo: true,
            tenGiaiDoan: true,
            moTa: true,
            trangThai: true,
            ngayDuKien: true,
            ngayThucHien: true,
            ghiChu: true,
          },
        },
      },
    });

    return formatTreatmentPlanDetail(latestPlan);
  }
}

export default new ClientDashboardService();

