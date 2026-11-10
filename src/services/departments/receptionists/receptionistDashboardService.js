import prisma from '../../../config/prisma.js';
import { getVietnamTodayDateString } from '../../../dtos/departments/admins/adminWorkShiftDto.js';
import {
  receptionistDashboardStatsResponseSchema,
  receptionistRoomChairStatusResponseSchema,
} from '../../../dtos/departments/receptionists/receptionistDashboardDto.js';

/**
 * Lấy 4 chỉ số KPI tổng quan ca trực cho Dashboard Lễ tân (chuẩn theo ngày hiện tại)
 */
export const getReceptionistDashboardStatsService = async () => {
  const todayStr = getVietnamTodayDateString();
  const todayDateOnly = new Date(`${todayStr}T00:00:00.000Z`);
  const startOfToday = new Date(`${todayStr}T00:00:00+07:00`);
  const endOfToday = new Date(`${todayStr}T23:59:59.999+07:00`);

  const [waitingCount, inProgressCount, todayAppointments, invoices] = await Promise.all([
    // 1. Chờ khám tại sảnh: Đã tiếp nhận hoặc Chờ khám
    prisma.lichHen.count({
      where: {
        ngayHen: todayDateOnly,
        trangThai: { in: ['da_tiep_nhan', 'cho_kham', 'da_xac_nhan'] },
      },
    }),

    // 2. Đang trong phòng khám: Đang khám hoặc Đang điều trị
    prisma.lichHen.count({
      where: {
        ngayHen: todayDateOnly,
        trangThai: { in: ['dang_kham', 'dang_dieu_tri'] },
      },
    }),

    // 3. Tổng lịch hẹn hôm nay (không tính các ca đã hủy)
    prisma.lichHen.count({
      where: {
        ngayHen: todayDateOnly,
        trangThai: { not: 'da_huy' },
      },
    }),

    // 4. Doanh thu hôm nay: Các hóa đơn đã thanh toán đúng trong ngày hôm nay theo giờ VN
    prisma.hoaDon.findMany({
      where: {
        OR: [
          { ngayThanhToan: { gte: startOfToday, lte: endOfToday } },
          { AND: [{ ngayThanhToan: null }, { ngayLap: { gte: startOfToday, lte: endOfToday } }] },
        ],
        trangThaiThanhToan: { in: ['da_thanh_toan', 'hoan_thanh', 'DA_THANH_TOAN'] },
      },
      include: {
        lichHen: {
          include: {
            hoSoBenhAn: {
              include: {
                dichVuDieuTri: true,
                vatTuSuDung: true,
              },
            },
            giaiDoanPhacDo: true,
          },
        },
        khuyenMai: true,
      },
    }),
  ]);

  // Tính tổng doanh thu thực thu hôm nay
  let todayRevenue = 0;
  for (const inv of invoices) {
    if (Number(inv.soTienThanhToan) > 0) {
      todayRevenue += Number(inv.soTienThanhToan);
    } else {
      let subtotal = 0;
      const services = inv.lichHen?.hoSoBenhAn?.dichVuDieuTri || [];
      const materials = inv.lichHen?.hoSoBenhAn?.vatTuSuDung || [];
      const sTotal = services.reduce(
        (sum, s) => sum + Number(s.soLuong || 1) * Number(s.donGia || 0),
        0
      );
      const mTotal = materials.reduce(
        (sum, m) => sum + Number(m.soLuong || 1) * Number(m.donGia || 0),
        0
      );
      subtotal = sTotal + mTotal;

      let discount = 0;
      if (inv.khuyenMai) {
        const val = Number(inv.khuyenMai.giaTriGiam || 0);
        discount =
          inv.khuyenMai.loaiGiam === 'phan_tram'
            ? Math.round((subtotal * val) / 100)
            : val;
      }

      todayRevenue += Math.max(0, subtotal - discount);
    }
  }

  return receptionistDashboardStatsResponseSchema({
    waitingCount,
    inProgressCount,
    todayAppointments,
    todayRevenue,
  });
};

/**
 * Lấy trạng thái Ghế & Phòng khám động theo thời gian thực (check ca sáng/chiều & điểm danh)
 */
export const getClinicChairsStatusService = async () => {
  const todayStr = getVietnamTodayDateString();
  const todayDateOnly = new Date(`${todayStr}T00:00:00.000Z`);

  // Xác định giờ hiện tại theo giờ Việt Nam
  const nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const currentHour = nowVN.getHours();
  const currentMinute = nowVN.getMinutes();
  const nowMinutes = currentHour * 60 + currentMinute;
  const currentSession = currentHour < 12 || (currentHour === 12 && currentMinute < 30) ? 'SANG' : 'CHIEU';

  // 1. Lấy toàn bộ phòng điều trị
  const rooms = await prisma.phongDieuTri.findMany({
    orderBy: { maPhong: 'asc' },
  });

  // 2. Lấy toàn bộ ca trực hôm nay kèm bác sĩ và lịch hẹn
  const todayShifts = await prisma.caLamViec.findMany({
    where: { ngay: todayDateOnly },
    include: {
      nhaSi: true,
      phongDieuTri: true,
      lichHen: {
        include: { benhNhan: true },
        orderBy: { gioHen: 'asc' },
      },
    },
  });

  const roomChairs = rooms.map((room) => {
    const roomCode = room.maPhong || 'P-01';
    const roomName = room.tenPhong || 'Phòng khám';

    if (room.trangThai === 'ngung_hoat_dong') {
      return {
        id: room.id,
        roomCode,
        roomName,
        dentistName: '—',
        dentistAvatarUrl: null,
        specialty: room.ghiChu || 'Phòng khám nha khoa',
        status: 'BAO_TRI',
        statusTitle: 'Bảo trì',
        active: false,
      };
    }

    // Tìm các ca làm việc của phòng hôm nay
    const shiftsInRoom = todayShifts.filter((s) => s.phongDieuTriId === room.id);

    // Lọc ca làm việc của phòng khớp với phiên hiện tại (Sáng: bắt đầu < 13:00; Chiều: bắt đầu >= 13:00)
    const activeShift = shiftsInRoom.find((s) => {
      if (!s.gioBatDau) return false;
      const sHours = s.gioBatDau instanceof Date
        ? s.gioBatDau.getUTCHours()
        : parseInt(String(s.gioBatDau).slice(0, 2), 10);
      const sSession = sHours < 13 ? 'SANG' : 'CHIEU';
      return sSession === currentSession;
    }) || (shiftsInRoom.length === 1 ? shiftsInRoom[0] : null);

    // 1. Nếu phòng không có ca làm việc trong phiên hiện tại
    if (!activeShift) {
      return {
        id: room.id,
        roomCode,
        roomName,
        dentistName: 'Chưa phân ca',
        dentistAvatarUrl: null,
        specialty: room.ghiChu || 'Phòng điều trị nha khoa',
        status: 'KHONG_CO_CA',
        statusTitle: 'Phòng không có ca làm',
        active: false,
      };
    }

    // 2. Phòng có ca làm việc trong phiên hiện tại:
    const dentistName = activeShift.nhaSi?.hoTen || 'Bác sĩ trực ca';
    const dentistAvatarUrl = activeShift.nhaSi?.hinhAnhUrl || null;

    // Tính thời gian bắt đầu ca trực
    const startH = activeShift.gioBatDau instanceof Date
      ? activeShift.gioBatDau.getUTCHours()
      : parseInt(String(activeShift.gioBatDau).slice(0, 2), 10);
    const startM = activeShift.gioBatDau instanceof Date
      ? activeShift.gioBatDau.getUTCMinutes()
      : parseInt(String(activeShift.gioBatDau).slice(3, 5), 10);
    const shiftStartMinutes = startH * 60 + startM;
    const isBeforeShift = nowMinutes < shiftStartMinutes;

    const shiftStatus = activeShift.trangThai || 'chua_dien_ra';

    // 2.1 Bác sĩ chưa điểm danh (trangThai === 'chua_dien_ra')
    if (shiftStatus === 'chua_dien_ra') {
      if (isBeforeShift) {
        return {
          id: room.id,
          roomCode,
          roomName,
          dentistName,
          dentistAvatarUrl,
          specialty: room.ghiChu || 'Phòng điều trị nha khoa',
          status: 'CHUA_SAN_SANG',
          statusTitle: 'Chưa sẵn sàng',
          active: false,
        };
      } else {
        // Đã đến thời gian bắt đầu ca mà bác sĩ chưa điểm danh
        return {
          id: room.id,
          roomCode,
          roomName,
          dentistName,
          dentistAvatarUrl,
          specialty: room.ghiChu || 'Phòng điều trị nha khoa',
          status: 'BAC_SI_CHUA_TOI',
          statusTitle: 'Bác sĩ chưa tới',
          active: false,
        };
      }
    }

    // 2.2 Bác sĩ vắng mặt
    if (shiftStatus === 'vang_mat') {
      return {
        id: room.id,
        roomCode,
        roomName,
        dentistName,
        dentistAvatarUrl,
        specialty: room.ghiChu || 'Phòng điều trị nha khoa',
        status: 'BAC_SI_CHUA_TOI',
        statusTitle: 'Bác sĩ chưa tới',
        active: false,
      };
    }

    // 2.3 Bác sĩ đã điểm danh có mặt (trangThai === 'co_mat' hoặc 'dang_dien_ra' / 'hoan_thanh')
    const roomAppointments = activeShift.lichHen || [];

    // Kiểm tra xem có ca nào đang khám trên ghế không
    const inProgressApt = roomAppointments.find((a) => a.trangThai === 'dang_kham');

    if (inProgressApt) {
      return {
        id: room.id,
        roomCode,
        roomName,
        dentistName,
        dentistAvatarUrl,
        specialty: room.ghiChu || 'Phòng điều trị nha khoa',
        status: 'DANG_KHAM',
        statusTitle: 'Đang khám',
        active: true,
        currentPatient: inProgressApt.benhNhan?.hoTen || 'Bệnh nhân',
      };
    }

    // Ghế trống -> Sẵn sàng
    const nextApt = roomAppointments.find((a) =>
      ['da_xac_nhan', 'da_tiep_nhan', 'cho_kham'].includes(a.trangThai)
    );

    return {
      id: room.id,
      roomCode,
      roomName,
      dentistName,
      dentistAvatarUrl,
      specialty: room.ghiChu || 'Phòng điều trị nha khoa',
      status: 'SAN_SANG',
      statusTitle: 'Sẵn sàng',
      active: true,
      nextAppointment: nextApt
        ? {
            time: nextApt.gioHen
              ? (typeof nextApt.gioHen === 'string'
                  ? nextApt.gioHen.slice(11, 16)
                  : nextApt.gioHen.toISOString().slice(11, 16))
              : '09:00',
            patientName: nextApt.benhNhan?.hoTen || 'Bệnh nhân',
          }
        : undefined,
    };
  });

  return receptionistRoomChairStatusResponseSchema(roomChairs);
};

export default {
  getReceptionistDashboardStatsService,
  getClinicChairsStatusService,
};
