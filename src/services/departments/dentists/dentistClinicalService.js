import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  getVietnamTodayDateString,
  formatDateYYYYMMDD,
} from '../../../dtos/departments/admins/adminWorkShiftDto.js';
import {
  dentistQueueItemResponseSchema,
} from '../../../dtos/departments/dentists/dentistDashboardDto.js';
import {
  clinicalRecordResponseSchema,
} from '../../../dtos/departments/dentists/dentistClinicalDto.js';

/**
 * Sinh mã hồ sơ bệnh án ngẫu nhiên không trùng lặp
 */
const generateUniqueRecordCode = async () => {
  const dateStr = getVietnamTodayDateString().replace(/-/g, '');
  for (let i = 0; i < 5; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `BA-${dateStr}-${randomSuffix}`;
    const existing = await prisma.hoSoBenhAn.findUnique({
      where: { maHoSo: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return `BA-${dateStr}-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * Sinh mã đơn thuốc ngẫu nhiên không trùng lặp
 */
const generateUniquePrescriptionCode = async () => {
  const dateStr = getVietnamTodayDateString().replace(/-/g, '');
  for (let i = 0; i < 5; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `DT-${dateStr}-${randomSuffix}`;
    const existing = await prisma.donThuoc.findUnique({
      where: { maDonThuoc: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return `DT-${dateStr}-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * Lấy hàng đợi khám cho trang Bàn khám lâm sàng
 */
export const getClinicalQueueService = async (dentistId) => {
  const todayStr = getVietnamTodayDateString();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  const baseStatuses = [
    'da_xac_nhan',
    'da_tiep_nhan',
    'cho_kham',
    'dang_kham',
    'cho_thanh_toan',
    'da_kham',
    'hoan_thanh',
  ];

  let where = {
    ngayHen: todayDate,
    trangThai: { in: baseStatuses },
  };

  if (dentistId) {
    where.caLamViec = { nhaSiId: dentistId };
  }

  let slips = await prisma.lichHen.findMany({
    where,
    include: {
      benhNhan: true,
      caLamViec: {
        include: {
          phongDieuTri: true,
        },
      },
      dichVu: true,
    },
    orderBy: [
      { gioHen: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  if (slips.length === 0 && dentistId) {
    slips = await prisma.lichHen.findMany({
      where: {
        ngayHen: todayDate,
        trangThai: { in: baseStatuses },
      },
      include: {
        benhNhan: true,
        caLamViec: {
          include: {
            phongDieuTri: true,
          },
        },
        dichVu: true,
      },
      orderBy: [
        { gioHen: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  return slips.map(dentistQueueItemResponseSchema);
};

/**
 * Cập nhật trạng thái phiếu tiếp nhận khám (Bắt đầu khám -> DANG_KHAM, v.v.)
 */
export const updateSlipStatusService = async (slipId, status) => {
  let dbStatus = 'cho_kham';
  switch (status) {
    case 'CHO_KHAM':
      dbStatus = 'da_tiep_nhan';
      break;
    case 'DANG_KHAM':
      dbStatus = 'dang_kham';
      break;
    case 'CHO_THANH_TOAN':
      dbStatus = 'cho_thanh_toan';
      break;
    case 'HOAN_THANH':
      dbStatus = 'hoan_thanh';
      break;
    case 'HUY':
      dbStatus = 'huy';
      break;
    default:
      dbStatus = 'da_tiep_nhan';
  }

  const existing = await prisma.lichHen.findUnique({
    where: { id: slipId },
  });

  if (!existing) {
    throw new ApiError(404, 'Không tìm thấy phiếu khám / lịch hẹn tương ứng');
  }

  const updated = await prisma.lichHen.update({
    where: { id: slipId },
    data: {
      trangThai: dbStatus,
      updatedAt: new Date(),
    },
    include: {
      benhNhan: true,
      caLamViec: {
        include: {
          phongDieuTri: true,
        },
      },
      dichVu: true,
    },
  });

  return dentistQueueItemResponseSchema(updated);
};

/**
 * Lấy thông tin hồ sơ bệnh án lâm sàng theo patientId hoặc slipId (lichHenId)
 */
export const getClinicalRecordService = async ({ patientId, slipId }) => {
  let record = null;

  const includeRelations = {
    lichHen: {
      include: {
        benhNhan: true,
        caLamViec: {
          include: {
            nhaSi: true,
          },
        },
      },
    },
    dichVuDieuTri: {
      include: {
        chiTietDichVu: {
          include: {
            dichVu: true,
          },
        },
      },
    },
    donThuoc: {
      include: {
        chiTietDonThuoc: true,
      },
    },
  };

  if (slipId) {
    record = await prisma.hoSoBenhAn.findUnique({
      where: { lichHenId: slipId },
      include: includeRelations,
    });
  }

  if (!record && patientId) {
    record = await prisma.hoSoBenhAn.findFirst({
      where: {
        lichHen: {
          benhNhanId: patientId,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: includeRelations,
    });
  }

  return clinicalRecordResponseSchema(record);
};

/**
 * Lưu kết quả khám lâm sàng, chỉ định dịch vụ, kê đơn thuốc và chuyển quầy thu ngân
 */
export const saveClinicalRecordService = async (dentistId, payload) => {
  const {
    slipId,
    patientId,
    diagnosis,
    treatmentMethod,
    doctorAdvice,
    reExamDate,
    notes,
    oralHealthStatus,
    treatments = [],
    prescription = [],
    daysOfSupply = 3,
  } = payload;

  const todayStr = getVietnamTodayDateString();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  return await prisma.$transaction(async (tx) => {
    // 1. Xác định Lịch Hẹn (LichHen) mục tiêu
    let targetLichHen = null;

    if (slipId) {
      targetLichHen = await tx.lichHen.findUnique({
        where: { id: slipId },
        include: { caLamViec: true },
      });
    }

    if (!targetLichHen && patientId) {
      // Tìm lịch hẹn hôm nay của bệnh nhân
      targetLichHen = await tx.lichHen.findFirst({
        where: {
          benhNhanId: patientId,
          ngayHen: todayDate,
          trangThai: { in: ['da_tiep_nhan', 'cho_kham', 'dang_kham'] },
        },
        include: { caLamViec: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Nếu vẫn không có lịch hẹn (ví dụ khám đột xuất vãng lai), tìm ca trực hôm nay của bác sĩ để tạo lịch hẹn
    if (!targetLichHen) {
      let activeShift = await tx.caLamViec.findFirst({
        where: {
          ...(dentistId ? { nhaSiId: dentistId } : {}),
          ngay: todayDate,
        },
      });

      if (!activeShift) {
        // Lấy phòng khám đầu tiên
        const firstRoom = await tx.phongDieuTri.findFirst({
          where: { trangThai: 'hoat_dong' },
        });

        activeShift = await tx.caLamViec.create({
          data: {
            nhaSiId: dentistId || (await tx.nhaSi.findFirst()).id,
            phongDieuTriId: firstRoom?.id || (await tx.phongDieuTri.findFirst()).id,
            ngay: todayDate,
            gioBatDau: new Date('1970-01-01T08:00:00.000Z'),
            gioKetThuc: new Date('1970-01-01T17:30:00.000Z'),
            trangThai: 'dang_dien_ra',
          },
        });
      }

      // Lấy dịch vụ khám tổng quát
      const defaultService =
        (await tx.dichVu.findFirst({
          where: { trangThai: 'hoat_dong' },
        })) || (await tx.dichVu.findFirst());

      const candidateCode = `LH-${todayStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      targetLichHen = await tx.lichHen.create({
        data: {
          maLichHen: candidateCode,
          benhNhanId: patientId,
          caLamViecId: activeShift.id,
          dichVuId: defaultService.id,
          ngayHen: todayDate,
          gioHen: new Date(),
          gioKetThucDuKien: new Date(Date.now() + 30 * 60 * 1000),
          trangThai: 'dang_kham',
          ghiChu: 'Khám lâm sàng tại phòng',
        },
        include: { caLamViec: true },
      });
    }

    // 2. Tạo hoặc Cập nhật Hồ Sơ Bệnh Án (HoSoBenhAn)
    let hoSo = await tx.hoSoBenhAn.findUnique({
      where: { lichHenId: targetLichHen.id },
    });

    const parsedReExamDate = reExamDate ? new Date(reExamDate) : null;

    if (hoSo) {
      hoSo = await tx.hoSoBenhAn.update({
        where: { id: hoSo.id },
        data: {
          chanDoan: diagnosis || hoSo.chanDoan,
          phuongPhapDieuTri: treatmentMethod || hoSo.phuongPhapDieuTri,
          loiDan: doctorAdvice || hoSo.loiDan,
          ngayTaiKham: parsedReExamDate,
          tinhTrangRangMieng: oralHealthStatus || hoSo.tinhTrangRangMieng,
          ghiChu: notes || hoSo.ghiChu,
          updatedAt: new Date(),
        },
      });
    } else {
      const maHoSo = await generateUniqueRecordCode();
      hoSo = await tx.hoSoBenhAn.create({
        data: {
          maHoSo,
          lichHenId: targetLichHen.id,
          chanDoan: diagnosis || 'Khám răng miệng',
          phuongPhapDieuTri: treatmentMethod || 'Điều trị theo chỉ định',
          loiDan: doctorAdvice || 'Vệ sinh răng miệng sạch sẽ',
          ngayKham: todayDate,
          ngayTaiKham: parsedReExamDate,
          tinhTrangRangMieng: oralHealthStatus || null,
          ghiChu: notes || null,
        },
      });
    }

    // 3. Xử lý Dịch Vụ Điều Trị (DichVuDieuTri)
    // Xóa các dịch vụ điều trị cũ của hồ sơ để ghi đè cập nhật
    await tx.dichVuDieuTri.deleteMany({
      where: { hoSoId: hoSo.id },
    });

    if (treatments.length > 0) {
      for (const t of treatments) {
        let chiTietId = t.serviceDetailId;

        // Nếu chỉ truyền serviceId (dịch vụ cha), lấy chi tiết dịch vụ con đầu tiên
        if (!chiTietId && t.serviceId) {
          const detail = await tx.chiTietDichVu.findFirst({
            where: { dichVuId: t.serviceId, trangThai: 'hoat_dong' },
          });
          if (detail) {
            chiTietId = detail.id;
          } else {
            // Tự động tạo một chi tiết dịch vụ mặc định nếu chưa có
            const parentService = await tx.dichVu.findUnique({
              where: { id: t.serviceId },
            });
            if (parentService) {
              const newDetail = await tx.chiTietDichVu.create({
                data: {
                  dichVuId: parentService.id,
                  tenChiTiet: parentService.tenDichVu,
                  gia: t.price || 0,
                  donViTinh: 'Lần',
                },
              });
              chiTietId = newDetail.id;
            }
          }
        }

        if (chiTietId) {
          await tx.dichVuDieuTri.create({
            data: {
              hoSoId: hoSo.id,
              chiTietDichVuId: chiTietId,
              soLuong: Number(t.quantity) || 1,
              donGia: Number(t.price) || 0,
              viTriRang: t.toothNumber ? String(t.toothNumber) : null,
              ghiChu: t.notes || null,
            },
          });
        }
      }
    }

    // 4. Xử lý Đơn Thuốc (DonThuoc & ChiTietDonThuoc)
    if (prescription.length > 0) {
      // Xóa các đơn thuốc cũ của hồ sơ này
      const oldPrescriptions = await tx.donThuoc.findMany({
        where: { hoSoId: hoSo.id },
        select: { id: true },
      });
      for (const oldP of oldPrescriptions) {
        await tx.chiTietDonThuoc.deleteMany({ where: { donThuocId: oldP.id } });
        await tx.donThuoc.delete({ where: { id: oldP.id } });
      }

      const maDonThuoc = await generateUniquePrescriptionCode();
      const currentDoctorId =
        dentistId ||
        targetLichHen.caLamViec?.nhaSiId ||
        (await tx.nhaSi.findFirst()).id;

      const newDonThuoc = await tx.donThuoc.create({
        data: {
          maDonThuoc,
          hoSoId: hoSo.id,
          nhaSiId: currentDoctorId,
          ngayKe: todayDate,
          soNgayDung: Number(daysOfSupply) || 3,
          chanDoan: diagnosis || 'Kê đơn sau điều trị',
          loiDan: doctorAdvice || 'Uống thuốc đúng liều lượng',
        },
      });

      for (const med of prescription) {
        await tx.chiTietDonThuoc.create({
          data: {
            donThuocId: newDonThuoc.id,
            thuocId: med.medicineId || null,
            tenThuoc: med.medicineName,
            hoatChat: med.activeIngredient || null,
            lieuDung: med.dosage || null,
            soLuong: Number(med.quantity) || 1,
            donViTinh: med.unit || 'Viên',
            huongDan: med.usageInstruction || null,
          },
        });
      }
    }

    // 5. Cập nhật trạng thái Lịch Hẹn sang 'cho_thanh_toan' (Chuyển sang Quầy Thu Ngân)
    await tx.lichHen.update({
      where: { id: targetLichHen.id },
      data: {
        trangThai: 'cho_thanh_toan',
        updatedAt: new Date(),
      },
    });

    // 6. Trả về kết quả đầy đủ
    const fullRecord = await tx.hoSoBenhAn.findUnique({
      where: { id: hoSo.id },
      include: {
        lichHen: {
          include: {
            benhNhan: true,
            caLamViec: {
              include: {
                nhaSi: true,
              },
            },
          },
        },
        dichVuDieuTri: {
          include: {
            chiTietDichVu: {
              include: {
                dichVu: true,
              },
            },
          },
        },
        donThuoc: {
          include: {
            chiTietDonThuoc: true,
          },
        },
      },
    });

    return clinicalRecordResponseSchema(fullRecord);
  });
};

export default {
  getClinicalQueueService,
  updateSlipStatusService,
  getClinicalRecordService,
  saveClinicalRecordService,
};
