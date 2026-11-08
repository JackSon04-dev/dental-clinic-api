import prisma from '../../../config/prisma.js';
import { getVietnamTodayDateString } from '../../../dtos/departments/admins/adminWorkShiftDto.js';
import { receptionistCheckInSlipResponseSchema } from '../../../dtos/departments/receptionists/receptionistCheckInDto.js';
import { createAppointmentService, updateAppointmentStatusService } from './receptionistAppointmentService.js';

/**
 * Lấy danh sách phiếu khám / hàng đợi tiếp nhận hôm nay
 */
export const getCheckInQueueService = async (status) => {
  const todayStr = getVietnamTodayDateString();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  const where = {
    ngayHen: todayDate,
  };

  if (status && status !== 'ALL') {
    if (status === 'CHO_KHAM') {
      where.trangThai = { in: ['da_tiep_nhan', 'cho_kham'] };
    } else if (status === 'DANG_KHAM') {
      where.trangThai = { in: ['dang_kham', 'dang_dieu_tri'] };
    } else if (status === 'HOAN_THANH') {
      where.trangThai = { in: ['da_kham', 'cho_thanh_toan'] };
    }
  } else {
    // Mặc định lấy tất cả các ca đang ở phòng khám
    where.trangThai = { in: ['da_tiep_nhan', 'cho_kham', 'dang_kham', 'dang_dieu_tri', 'cho_thanh_toan'] };
  }

  const items = await prisma.lichHen.findMany({
    where,
    include: {
      benhNhan: true,
      dichVu: true,
      caLamViec: {
        include: {
          nhaSi: true,
          phongDieuTri: true,
        },
      },
    },
    orderBy: { gioHen: 'asc' },
  });

  return items.map(receptionistCheckInSlipResponseSchema);
};

/**
 * Tiếp nhận nhanh bệnh nhân tại sảnh (Check-in / Walk-in)
 * Sinh trực tiếp bản ghi LichHen trong ngày hôm nay với trạng thái da_tiep_nhan
 */
export const createCheckInSlipService = async (payload) => {
  const todayStr = getVietnamTodayDateString();
  const now = new Date();
  const currentHour = String(now.getHours()).padStart(2, '0');
  const currentMinute = String(now.getMinutes()).padStart(2, '0');
  const currentTimeSlot = `${currentHour}:${currentMinute}`;

  // 1. Tạo lịch hẹn hôm nay
  const createdApt = await createAppointmentService({
    patientId: payload.patientId,
    patientName: payload.patientName,
    patientPhone: payload.patientPhone,
    dentistId: payload.dentistId,
    dentistName: payload.dentistName,
    doctorRoom: payload.roomName,
    date: todayStr,
    timeSlot: currentTimeSlot,
    notes: payload.chiefComplaint,
  });

  // 2. Chuyển trạng thái sang "da_tiep_nhan"
  await updateAppointmentStatusService(createdApt.id, 'DA_TIEP_NHAN');

  // 3. Lấy lại dữ liệu đầy đủ trả về format phiếu khám
  const item = await prisma.lichHen.findUnique({
    where: { id: createdApt.id },
    include: {
      benhNhan: true,
      dichVu: true,
      caLamViec: {
        include: {
          nhaSi: true,
          phongDieuTri: true,
        },
      },
    },
  });

  return receptionistCheckInSlipResponseSchema(item);
};

export default {
  getCheckInQueueService,
  createCheckInSlipService,
};
