/**
 * Formatter cho 4 chỉ số KPI ca trực của Lễ tân
 */
export const receptionistDashboardStatsResponseSchema = ({
  waitingCount = 0,
  inProgressCount = 0,
  todayAppointments = 0,
  todayRevenue = 0,
}) => ({
  waitingCount,
  inProgressCount,
  todayAppointments,
  todayRevenue,
});

/**
 * Formatter cho danh sách trạng thái Ghế & Phòng khám động
 */
export const receptionistRoomChairStatusResponseSchema = (roomChairs) => {
  return roomChairs.map((r) => ({
    id: r.id,
    roomCode: r.roomCode || r.maPhong || 'P-01',
    roomName: r.roomName || r.tenPhong || 'Phòng khám',
    dentistName: r.dentistName || 'Chưa phân ca',
    dentistAvatarUrl: r.dentistAvatarUrl || null,
    specialty: r.specialty || 'Phòng khám đa khoa',
    equipment: r.equipment || ['Ghế nha khoa Kavo', 'Đèn trám Halogen', 'Hút trung tâm'],
    status: r.status, // 'SAN_SANG' | 'DANG_KHAM' | 'CHUA_SAN_SANG' | 'BAC_SI_CHUA_TOI' | 'KHONG_CO_CA' | 'TRONG_SLOT' | 'BAO_TRI'
    statusTitle: r.statusTitle || r.status,
    active: r.active !== false,
    currentPatient: r.currentPatient || undefined,
    nextAppointment: r.nextAppointment
      ? {
          time: r.nextAppointment.time,
          patientName: r.nextAppointment.patientName,
        }
      : undefined,
    availableFrom: r.availableFrom || undefined,
  }));
};

export default {
  receptionistDashboardStatsResponseSchema,
  receptionistRoomChairStatusResponseSchema,
};
