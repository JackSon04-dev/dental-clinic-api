import prisma from '../../../config/prisma.js';
import { getVietnamTodayDateString } from '../../../dtos/departments/admins/adminWorkShiftDto.js';
import {
  receptionistDashboardStatsResponseSchema,
  receptionistRoomChairStatusResponseSchema,
} from '../../../dtos/departments/receptionists/receptionistDashboardDto.js';

/**
 * Lấy 4 chỉ số KPI tổng quan ca trực cho Dashboard Lễ tân
 */
export const getReceptionistDashboardStatsService = async () => {
  const todayStr = getVietnamTodayDateString();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
  const tomorrowDate = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000);

  const [waitingCount, inProgressCount, todayAppointments, invoices] = await Promise.all([
    // 1. Chờ khám tại sảnh: Đã tiếp nhận hoặc Chờ khám
    prisma.lichHen.count({
      where: {
        ngayHen: todayDate,
        trangThai: { in: ['da_tiep_nhan', 'cho_kham', 'da_xac_nhan'] },
      },
    }),

    // 2. Đang trong phòng khám: Đang khám
    prisma.lichHen.count({
      where: {
        ngayHen: todayDate,
        trangThai: 'dang_kham',
      },
    }),

    // 3. Tổng lịch hẹn hôm nay (không tính các ca đã hủy)
    prisma.lichHen.count({
      where: {
        ngayHen: todayDate,
        trangThai: { not: 'da_huy' },
      },
    }),

    // 4. Doanh thu ca trực: Các hóa đơn đã thanh toán hôm nay
    prisma.hoaDon.findMany({
      where: {
        OR: [
          { ngayThanhToan: { gte: todayDate, lt: tomorrowDate } },
          { ngayLap: { gte: todayDate, lt: tomorrowDate } },
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

  // Tính tổng doanh thu: cộng tiền thực thu từ hóa đơn (dịch vụ điều trị + vật tư)
  let todayRevenue = 0;
  for (const inv of invoices) {
    let subtotal = 0;
    const stageFee = Number(inv.lichHen?.giaiDoanPhacDo?.chiPhi || 0);
    if (stageFee > 0) {
      subtotal = stageFee;
    } else {
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
    }

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

  return receptionistDashboardStatsResponseSchema({
    waitingCount,
    inProgressCount,
    todayAppointments,
    todayRevenue,
  });
};

/**
 * Lấy trạng thái Ghế & Phòng khám động theo thời gian thực
 */
export const getClinicChairsStatusService = async () => {
  const todayStr = getVietnamTodayDateString();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  // 1. Lấy toàn bộ phòng điều trị
  const rooms = await prisma.phongDieuTri.findMany({
    orderBy: { maPhong: 'asc' },
  });

  // 2. Lấy toàn bộ ca trực hôm nay kèm bác sĩ và lịch hẹn
  const todayShifts = await prisma.caLamViec.findMany({
    where: { ngay: todayDate },
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
        specialty: room.ghiChu || 'Phòng khám nha khoa',
        status: 'BAO_TRI',
        active: false,
      };
    }

    // Tìm ca làm việc của phòng hôm nay
    const shiftsInRoom = todayShifts.filter((s) => s.phongDieuTriId === room.id);

    if (shiftsInRoom.length === 0) {
      return {
        id: room.id,
        roomCode,
        roomName,
        dentistName: 'Chưa phân ca',
        specialty: room.ghiChu || 'Phòng điều trị nha khoa',
        status: 'TRONG_SLOT',
        active: true,
      };
    }

    // Lấy bác sĩ phụ trách ca
    const activeShift = shiftsInRoom[0];
    const dentistName = activeShift.nhaSi?.hoTen || 'Bác sĩ trực ca';

    // Gom toàn bộ ca hẹn của phòng hôm nay
    const roomAppointments = shiftsInRoom.flatMap((s) => s.lichHen || []);

    // 1. Kiểm tra xem có ca nào đang khám trên ghế không
    const inProgressApt = roomAppointments.find(
      (a) => a.trangThai === 'dang_kham'
    );

    if (inProgressApt) {
      return {
        id: room.id,
        roomCode,
        roomName,
        dentistName,
        specialty: room.ghiChu || 'Phòng điều trị nha khoa',
        status: 'DANG_KHAM',
        active: true,
        currentPatient: inProgressApt.benhNhan?.hoTen || 'Bệnh nhân',
      };
    }

    // 2. Nếu không có ca đang khám -> Phòng ở trạng thái Sẵn sàng
    const nextApt = roomAppointments.find((a) =>
      ['da_xac_nhan', 'da_tiep_nhan', 'cho_kham'].includes(a.trangThai)
    );

    return {
      id: room.id,
      roomCode,
      roomName,
      dentistName,
      specialty: room.ghiChu || 'Phòng điều trị nha khoa',
      status: 'SAN_SANG',
      active: true,
      nextAppointment: nextApt
        ? {
            time: nextApt.gioHen
              ? nextApt.gioHen.toISOString().slice(11, 16)
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
