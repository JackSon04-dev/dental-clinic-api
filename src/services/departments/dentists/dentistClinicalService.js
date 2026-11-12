import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  getVietnamTodayDateString,
  formatDateYYYYMMDD,
} from '../../../dtos/departments/admins/adminWorkShiftDto.js';
import {
  dentistQueueItemResponseSchema,
  mapLichHenStatusToSlipStatus,
} from '../../../dtos/departments/dentists/dentistDashboardDto.js';
import {
  clinicalRecordResponseSchema,
} from '../../../dtos/departments/dentists/dentistClinicalDto.js';
import {
  adminPatientDetailResponseSchema,
} from '../../../dtos/departments/admins/adminPatientDto.js';
import { getDoctorDegreeSurcharge } from '../../../constants/academicDegree.js';

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
 * Sinh mã hóa đơn viện phí ngẫu nhiên không trùng lặp
 */
const generateUniqueInvoiceCode = async (tx) => {
  const dateStr = getVietnamTodayDateString().replace(/-/g, '');
  for (let i = 0; i < 5; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `HD-${dateStr}-${randomSuffix}`;
    const existing = await tx.hoaDon.findUnique({
      where: { maHoaDon: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return `HD-${dateStr}-${Date.now().toString(36).toUpperCase()}`;
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
    'dang_dieu_tri',
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
      dbStatus = 'cho_kham';
      break;
    case 'DANG_KHAM':
      dbStatus = 'dang_kham';
      break;
    case 'DANG_DIEU_TRI':
      dbStatus = 'dang_dieu_tri';
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
      dbStatus = status ? String(status).toLowerCase() : 'cho_kham';
  }

  const existing = await prisma.lichHen.findUnique({
    where: { id: slipId },
  });

  if (!existing) {
    throw new ApiError(404, 'Không tìm thấy phiếu khám / lịch hẹn tương ứng');
  }

  // RÀNG BUỘC TỊNH TIẾN DÀNH CHO BÁC SĨ:
  // 1. Chỉ được bấm "Vào khám" (DANG_KHAM) khi bệnh nhân đã được Lễ tân mời vào phòng (CHO_KHAM)
  if (dbStatus === 'dang_kham' && existing.trangThai !== 'dang_kham') {
    if (existing.trangThai === 'cho_xac_nhan' || existing.trangThai === 'da_xac_nhan') {
      throw new ApiError(400, 'Bệnh nhân chưa có mặt tại phòng khám và chưa check-in. Không thể bắt đầu khám.');
    }
    if (existing.trangThai === 'da_tiep_nhan') {
      throw new ApiError(400, 'Bệnh nhân đang ở sảnh chờ lễ tân, chưa được mời vào phòng khám (chưa ở trạng thái Đang chờ khám).');
    }
    if (existing.trangThai === 'cho_thanh_toan') {
      throw new ApiError(400, 'Bệnh nhân đang chờ thanh toán viện phí tại quầy thu ngân.');
    }
    if (existing.trangThai === 'hoan_thanh') {
      throw new ApiError(400, 'Ca khám này đã hoàn tất và đóng ca.');
    }
  }

  // 2. Ràng buộc đóng ca (HOAN_THANH): Phải thanh toán sạch nợ và không trong trạng thái chờ thanh toán
  if (dbStatus === 'hoan_thanh') {
    if (existing.trangThai === 'cho_thanh_toan') {
      throw new ApiError(400, 'Bệnh nhân đang có hóa đơn chưa thanh toán tại quầy thu ngân. Vui lòng thanh toán trước khi đóng ca!');
    }
    const unpaidInvoices = await prisma.hoaDon.findMany({
      where: {
        lichHenId: slipId,
        trangThaiThanhToan: 'chua_thanh_toan',
      },
    });
    if (unpaidInvoices.length > 0) {
      throw new ApiError(400, 'Không thể đóng ca khám: Bệnh nhân vẫn còn hóa đơn chưa thanh toán tại quầy thu ngân!');
    }
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
        hoaDon: {
          include: {
            chiTietHoaDon: true,
          },
          orderBy: { dotThanhToan: 'asc' },
        },
      },
    },
    dichVuDieuTri: {
      include: {
        dichVu: true,
      },
    },
    donThuoc: {
      include: {
        chiTietDonThuoc: true,
      },
    },
    vatTuSuDung: {
      include: {
        sanPham: true,
      },
    },
  };

  if (slipId) {
    record = await prisma.hoSoBenhAn.findUnique({
      where: { lichHenId: slipId },
      include: includeRelations,
    });

    if (record) {
      return clinicalRecordResponseSchema(record);
    }

    // Nếu chỉ định slipId cụ thể nhưng ca hẹn này mới toanh chưa có hồ sơ bệnh án
    // -> Truy vấn thông tin lịch hẹn để trả về khung khám mới sạch sẽ, KHÔNG fallback sang ca khám cũ của bệnh nhân!
    const targetLichHen = await prisma.lichHen.findUnique({
      where: { id: slipId },
      include: {
        benhNhan: true,
        caLamViec: {
          include: { nhaSi: true, phongDieuTri: true },
        },
        dichVu: true,
      },
    });

    if (targetLichHen) {
      const bn = targetLichHen.benhNhan || {};
      const ns = targetLichHen.caLamViec?.nhaSi || {};
      const phong = targetLichHen.caLamViec?.phongDieuTri || {};

      return {
        id: null,
        code: null,
        slipId: targetLichHen.id,
        patientId: targetLichHen.benhNhanId,
        patientName: bn.hoTen || 'Bệnh nhân',
        patientPhone: bn.sdt || '',
        dentistId: ns.id || '',
        dentistName: ns.hoTen || '',
        roomName: phong.tenPhong || 'Phòng khám',
        serviceName: targetLichHen.dichVu?.tenDichVu || 'Khám răng miệng',
        chiefComplaint: targetLichHen.ghiChu || targetLichHen.dichVu?.tenDichVu || 'Khám theo lịch hẹn',
        appointmentCode: targetLichHen.maLichHen || null,
        appointmentDate: targetLichHen.ngayHen ? formatDateYYYYMMDD(targetLichHen.ngayHen) : null,
        status: mapLichHenStatusToSlipStatus(targetLichHen.trangThai),
        rawStatus: targetLichHen.trangThai,
        appointmentStatus: targetLichHen.trangThai,

        // Trạng thái sạch cho ca khám mới
        diagnosis: '',
        chanDoan: '',
        treatmentMethod: '',
        phuongPhapDieuTri: '',
        doctorAdvice: '',
        loiDan: '',
        result: '',
        ketQua: '',
        oralHealthStatus: '',
        tinhTrangRangMieng: '',
        notes: '',
        ghiChu: '',
        examDate: targetLichHen.ngayHen ? formatDateYYYYMMDD(targetLichHen.ngayHen) : formatDateYYYYMMDD(new Date()),
        reExamDate: null,
        initialSmileScore: 85,
        currentSmileScore: 95,
        isInitialScoreLocked: false,
        treatments: [],
        prescription: [],
        materials: [],
        paidServices: [],
        paidMaterials: [],
        totalInvoicedAmount: 0,
        totalPaidAmount: 0,
        totalUnpaidAmount: 0,
      };
    }

    return null;
  }

  if (patientId) {
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
    chanDoan,
    treatmentMethod,
    phuongPhapDieuTri,
    doctorAdvice,
    loiDan,
    result,
    ketQua,
    reExamDate,
    ngayTaiKham,
    notes,
    ghiChu,
    oralHealthStatus,
    tinhTrangRangMieng,
    initialSmileScore,
    currentSmileScore,
    diemSucKhoeBanDau,
    diemSucKhoeHienTai,
    medicalHistory,
    tienSuBenh,
    allergies,
    diUng,
    treatments = [],
    materials = [],
    prescription = [],
    medicines = [],
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
        include: { caLamViec: { include: { nhaSi: true } } },
      });

      if (targetLichHen && targetLichHen.trangThai === 'hoan_thanh') {
        throw new ApiError(400, 'Ca khám này đã hoàn tất và thanh toán xong, không thể chỉnh sửa.');
      }
    }

    if (!targetLichHen && patientId) {
      // Tìm lịch hẹn hôm nay của bệnh nhân
      targetLichHen = await tx.lichHen.findFirst({
        where: {
          benhNhanId: patientId,
          ngayHen: todayDate,
          trangThai: { in: ['da_tiep_nhan', 'cho_kham', 'dang_kham', 'dang_dieu_tri', 'cho_thanh_toan'] },
        },
        include: { caLamViec: { include: { nhaSi: true } } },
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
        include: { caLamViec: { include: { nhaSi: true } } },
      });
    }

    // 1.1. Cập nhật thông tin tiền sử bệnh, dị ứng & Điểm sức khỏe nụ cười của bệnh nhân
    const targetPatientId = patientId || targetLichHen.benhNhanId;

    if (targetPatientId) {
      const existingPatient = await tx.benhNhan.findUnique({
        where: { id: targetPatientId },
      });

      const patientUpdateData = {};
      const medHistoryVal = medicalHistory !== undefined ? medicalHistory : tienSuBenh;
      const allergiesVal = allergies !== undefined ? allergies : diUng;

      if (medHistoryVal !== undefined) {
        patientUpdateData.tienSuBenh = Array.isArray(medHistoryVal)
          ? medHistoryVal.join(', ')
          : (medHistoryVal ? String(medHistoryVal).trim() : null);
      }
      if (allergiesVal !== undefined) {
        patientUpdateData.diUng = Array.isArray(allergiesVal)
          ? allergiesVal.join(', ')
          : (allergiesVal ? String(allergiesVal).trim() : null);
      }

      // Nghiệp vụ Điểm sức khỏe nụ cười:
      // - Điểm ban đầu: Nếu chưa có trong DB thì set lần đầu. Nếu đã có thì KHÓA CỨNG, không được update nữa!
      // - Điểm hiện tại: Cho phép cập nhật sau mỗi đợt khám/điều trị.
      const initialScoreVal = initialSmileScore !== undefined ? initialSmileScore : diemSucKhoeBanDau;
      const currentScoreVal = currentSmileScore !== undefined ? currentSmileScore : diemSucKhoeHienTai;

      if (existingPatient) {
        if (existingPatient.diemSucKhoeBanDau === null || existingPatient.diemSucKhoeBanDau === undefined) {
          if (initialScoreVal !== undefined && initialScoreVal !== null) {
            patientUpdateData.diemSucKhoeBanDau = Number(initialScoreVal);
          } else if (currentScoreVal !== undefined && currentScoreVal !== null) {
            patientUpdateData.diemSucKhoeBanDau = Number(currentScoreVal);
          }
        }
        if (currentScoreVal !== undefined && currentScoreVal !== null) {
          patientUpdateData.diemSucKhoeHienTai = Number(currentScoreVal);
        }
      }

      if (Object.keys(patientUpdateData).length > 0) {
        await tx.benhNhan.update({
          where: { id: targetPatientId },
          data: patientUpdateData,
        });
      }
    }

    // 2. Tạo hoặc Cập nhật Hồ Sơ Bệnh Án (HoSoBenhAn) khớp 100% schema
    let hoSo = await tx.hoSoBenhAn.findUnique({
      where: { lichHenId: targetLichHen.id },
    });

    const parsedReExamDate = (reExamDate || ngayTaiKham) ? new Date(reExamDate || ngayTaiKham) : null;
    const finalChanDoan = diagnosis !== undefined ? diagnosis : (chanDoan !== undefined ? chanDoan : 'Khám răng miệng');
    const finalPhuongPhap = treatmentMethod !== undefined ? treatmentMethod : (phuongPhapDieuTri !== undefined ? phuongPhapDieuTri : 'Điều trị theo chỉ định');
    const finalLoiDan = doctorAdvice !== undefined ? doctorAdvice : (loiDan !== undefined ? loiDan : 'Vệ sinh răng miệng sạch sẽ');
    const finalKetQua = result !== undefined ? result : (ketQua !== undefined ? ketQua : null);
    const finalTinhTrang = oralHealthStatus !== undefined ? oralHealthStatus : (tinhTrangRangMieng !== undefined ? tinhTrangRangMieng : null);
    const finalGhiChu = notes !== undefined ? notes : (ghiChu !== undefined ? ghiChu : null);

    if (hoSo) {
      hoSo = await tx.hoSoBenhAn.update({
        where: { id: hoSo.id },
        data: {
          chanDoan: finalChanDoan,
          phuongPhapDieuTri: finalPhuongPhap,
          loiDan: finalLoiDan,
          ketQua: finalKetQua,
          ngayTaiKham: parsedReExamDate,
          tinhTrangRangMieng: finalTinhTrang,
          ghiChu: finalGhiChu,
          updatedAt: new Date(),
        },
      });
    } else {
      const maHoSo = await generateUniqueRecordCode();
      hoSo = await tx.hoSoBenhAn.create({
        data: {
          maHoSo,
          lichHenId: targetLichHen.id,
          chanDoan: finalChanDoan,
          phuongPhapDieuTri: finalPhuongPhap,
          loiDan: finalLoiDan,
          ketQua: finalKetQua,
          ngayKham: todayDate,
          ngayTaiKham: parsedReExamDate,
          tinhTrangRangMieng: finalTinhTrang,
          ghiChu: finalGhiChu,
        },
      });
    }

    // 3. Xử lý Dịch Vụ Điều Trị (DichVuDieuTri)
    await tx.dichVuDieuTri.deleteMany({
      where: { hoSoId: hoSo.id },
    });

    if (treatments.length > 0) {
      for (const t of treatments) {
        const targetServiceId = t.serviceId || t.dichVuId || t.serviceDetailId;
        if (targetServiceId) {
          const serviceRecord = await tx.dichVu.findUnique({
            where: { id: targetServiceId },
          });

          if (serviceRecord) {
            await tx.dichVuDieuTri.create({
              data: {
                hoSoId: hoSo.id,
                dichVuId: serviceRecord.id,
                soLuong: Number(t.quantity) || 1,
                donGia: t.price !== undefined ? Number(t.price) : Number(serviceRecord.gia),
                viTriRang: t.toothNumber ? String(t.toothNumber) : null,
                ghiChu: t.notes || null,
              },
            });
          }
        }
      }
    }

    // 3.1. Xử lý Vật Tư / Sản Phẩm Sử Dụng (VatTuSuDung)
    await tx.vatTuSuDung.deleteMany({
      where: { hoSoId: hoSo.id },
    });

    if (materials.length > 0) {
      for (const m of materials) {
        if (m.productId) {
          const toothNote = m.toothNumber ? `Răng: ${m.toothNumber}` : null;
          const fullNote = [toothNote, m.notes].filter(Boolean).join(' - ') || null;
          await tx.vatTuSuDung.create({
            data: {
              hoSoId: hoSo.id,
              sanPhamId: m.productId,
              soLuong: Number(m.quantity) || 1,
              donGia: Number(m.price) || 0,
              ghiChu: fullNote,
            },
          });
        }
      }
    }

    // 4. RÀNG BUỘC R2: Xử lý Đơn Thuốc tự động điền liều dùng & hướng dẫn mặc định từ bảng Thuoc
    const rawPrescriptions = prescription.length > 0 ? prescription : medicines;

    if (rawPrescriptions.length > 0) {
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
          chanDoan: finalChanDoan || 'Kê đơn sau điều trị',
          loiDan: finalLoiDan || 'Uống thuốc đúng liều lượng',
        },
      });

      const isUuid = (str) =>
        typeof str === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      const thuocIds = rawPrescriptions
        .map((m) => m.medicineId || m.thuocId || (isUuid(m.id) ? m.id : null))
        .filter(Boolean);

      const defaultThuocMap = new Map();
      if (thuocIds.length > 0) {
        const foundThuocs = await tx.thuoc.findMany({
          where: { id: { in: thuocIds } },
        });
        foundThuocs.forEach((t) => defaultThuocMap.set(t.id, t));
      }

      for (const med of rawPrescriptions) {
        const medId = med.medicineId || med.thuocId || (isUuid(med.id) ? med.id : null);
        const defaultThuoc = medId ? defaultThuocMap.get(medId) : null;

        const tenThuoc = med.medicineName || med.tenThuoc || defaultThuoc?.tenThuoc || 'Thuốc điều trị';
        const hoatChat = med.activeIngredient || med.hoatChat || defaultThuoc?.hoatChat || null;
        const hamLuong = med.hamLuong || defaultThuoc?.hamLuong || null;
        const dangBaoChe = med.dangBaoChe || defaultThuoc?.dangBaoChe || null;
        const donViTinh = med.unit || med.donViTinh || defaultThuoc?.donViTinh || 'Viên';

        const lieuDung = med.dosage || med.lieuDung || defaultThuoc?.lieuDungMacDinh || null;
        const huongDan = med.usageInstruction || med.instructions || med.huongDan || defaultThuoc?.huongDanMacDinh || null;
        const soLanNgay = med.soLanNgay !== undefined ? Number(med.soLanNgay) : (defaultThuoc?.soLanNgayMacDinh ?? null);
        const thoiDiemUong = med.thoiDiemUong || defaultThuoc?.thoiDiemUongMacDinh || null;

        await tx.chiTietDonThuoc.create({
          data: {
            donThuocId: newDonThuoc.id,
            thuocId: medId,
            tenThuoc,
            hoatChat,
            hamLuong,
            dangBaoChe,
            lieuDung,
            soLuong: Number(med.quantity || med.soLuong) || 1,
            donViTinh,
            soLanNgay,
            thoiDiemUong,
            huongDan,
          },
        });
      }
    }

    // 5. Xử lý Hóa đơn viện phí theo đợt & Khóa dịch vụ đã thanh toán (Tránh trùng lặp hóa đơn đợt 2)
    const existingInvoices = await tx.hoaDon.findMany({
      where: { lichHenId: targetLichHen.id },
      include: { chiTietHoaDon: true },
      orderBy: { dotThanhToan: 'asc' },
    });

    const paidInvoices = existingInvoices.filter((inv) => inv.trangThaiThanhToan === 'da_thanh_toan');

    // Thu thập ID/Tên các mục đã thanh toán trong các hóa đơn trước đó
    const paidServiceIds = new Set();
    const paidProductIds = new Set();
    paidInvoices.forEach((inv) => {
      (inv.chiTietHoaDon || []).forEach((ct) => {
        if (ct.dichVuId) paidServiceIds.add(ct.dichVuId);
        if (ct.sanPhamId) paidProductIds.add(ct.sanPhamId);
      });
    });

    // Lọc ra các dịch vụ & vật tư MỚI PHÁT SINH chưa từng được thanh toán
    const newTreatmentsToBill = treatments.filter((t) => {
      const sId = t.serviceId || t.dichVuId || t.serviceDetailId;
      return !t.isPaid && (!sId || !paidServiceIds.has(sId));
    });

    const newMaterialsToBill = materials.filter((m) => {
      return !m.isPaid && (!m.productId || !paidProductIds.has(m.productId));
    });

    let currentInvoice = existingInvoices.find((inv) => inv.trangThaiThanhToan === 'chua_thanh_toan');
    const dotThanhToan = currentInvoice ? currentInvoice.dotThanhToan : (existingInvoices.length + 1);
    const loaiHoaDon = dotThanhToan === 1 ? 'thanh_toan_truoc' : 'phat_sinh';

    // Xác định học vị của bác sĩ ca trực để tính phụ thu học vị (chỉ cộng ở hóa đơn đợt 1 / thanh toán trước)
    let doctorDegree = 'BS';
    if (targetLichHen.caLamViec?.nhaSi?.hocVi) {
      doctorDegree = targetLichHen.caLamViec.nhaSi.hocVi;
    } else if (dentistId) {
      const doc = await tx.nhaSi.findUnique({ where: { id: dentistId }, select: { hocVi: true } });
      if (doc?.hocVi) doctorDegree = doc.hocVi;
    } else if (targetLichHen.caLamViec?.nhaSiId) {
      const doc = await tx.nhaSi.findUnique({ where: { id: targetLichHen.caLamViec.nhaSiId }, select: { hocVi: true } });
      if (doc?.hocVi) doctorDegree = doc.hocVi;
    }
    const phuThuChuyenGia = loaiHoaDon === 'thanh_toan_truoc' ? getDoctorDegreeSurcharge(doctorDegree) : 0;

    const defaultStaff =
      (await tx.nhanVien.findFirst({
        where: { trangThai: 'dang_lam_viec' },
      })) || (await tx.nhanVien.findFirst());

    if (newTreatmentsToBill.length > 0 || newMaterialsToBill.length > 0) {
      if (!currentInvoice) {
        const maHoaDon = await generateUniqueInvoiceCode(tx);
        currentInvoice = await tx.hoaDon.create({
          data: {
            maHoaDon,
            lichHenId: targetLichHen.id,
            nhanVienId: defaultStaff.id,
            dotThanhToan,
            loaiHoaDon,
            trangThaiThanhToan: 'chua_thanh_toan',
            phuThuChuyenGia,
            ghiChu: finalGhiChu || (dotThanhToan === 1 ? 'Hóa đơn chỉ định thủ thuật đợt 1' : `Hóa đơn phát sinh đợt ${dotThanhToan}`),
            ngayLap: new Date(),
          },
        });
      }

      // Làm mới chi tiết bảng kê của hóa đơn chưa thanh toán
      await tx.chiTietHoaDon.deleteMany({
        where: { hoaDonId: currentInvoice.id },
      });

      let invoiceSubtotal = 0;

      // Chi tiết dịch vụ mới
      for (const t of newTreatmentsToBill) {
        const targetServiceId = t.serviceId || t.dichVuId || t.serviceDetailId;
        let serviceRecord = null;
        if (targetServiceId) {
          serviceRecord = await tx.dichVu.findUnique({
            where: { id: targetServiceId },
          });
        }
        const qty = Number(t.quantity) || 1;
        const unitPrice = t.price !== undefined ? Number(t.price) : Number(serviceRecord?.gia ?? 0);
        const lineTotal = qty * unitPrice;
        invoiceSubtotal += lineTotal;

        await tx.chiTietHoaDon.create({
          data: {
            hoaDonId: currentInvoice.id,
            dichVuId: serviceRecord ? serviceRecord.id : null,
            loaiMuc: 'dich_vu',
            tenMuc: t.serviceName || serviceRecord?.tenDichVu || 'Dịch vụ điều trị',
            donViTinh: serviceRecord?.donViTinh || 'Lần',
            soLuong: qty,
            donGia: unitPrice,
            thanhTien: lineTotal,
            viTriRang: t.toothNumber ? String(t.toothNumber) : null,
            ghiChu: t.notes || null,
          },
        });
      }

      // Chi tiết vật tư mới
      for (const m of newMaterialsToBill) {
        if (m.productId) {
          const qty = Number(m.quantity) || 1;
          const unitPrice = Number(m.price) || 0;
          const lineTotal = qty * unitPrice;
          invoiceSubtotal += lineTotal;

          await tx.chiTietHoaDon.create({
            data: {
              hoaDonId: currentInvoice.id,
              sanPhamId: m.productId,
              loaiMuc: 'vat_tu',
              tenMuc: m.productName || 'Vật tư nha khoa',
              donViTinh: m.unit || 'Cái',
              soLuong: qty,
              donGia: unitPrice,
              thanhTien: lineTotal,
              viTriRang: m.toothNumber ? String(m.toothNumber) : null,
              ghiChu: m.notes || null,
            },
          });
        }
      }

      const finalAmount = Math.max(0, invoiceSubtotal + phuThuChuyenGia);
      await tx.hoaDon.update({
        where: { id: currentInvoice.id },
        data: {
          tongTien: invoiceSubtotal,
          phuThuChuyenGia,
          giamGia: 0,
          soTienThanhToan: finalAmount,
        },
      });

      // Có chi phí phát sinh cần thanh toán -> chuyển sang 'cho_thanh_toan' (Quầy Thu Ngân)
      await tx.lichHen.update({
        where: { id: targetLichHen.id },
        data: {
          trangThai: 'cho_thanh_toan',
          updatedAt: new Date(),
        },
      });
    } else {
      // Không có dịch vụ/vật tư mới phát sinh
      if (currentInvoice) {
        await tx.chiTietHoaDon.deleteMany({ where: { hoaDonId: currentInvoice.id } });
        await tx.hoaDon.delete({ where: { id: currentInvoice.id } });
      }

      // Nếu đã thanh toán đợt 1 -> giữ trạng thái dang_dieu_tri (hoặc hoan_thanh nếu bác sĩ chọn hoàn tất buổi khám)
      let nextStatus = paidInvoices.length > 0 ? 'dang_dieu_tri' : targetLichHen.trangThai;
      if (payload.status === 'HOAN_THANH' || payload.isCompleted) {
        nextStatus = 'hoan_thanh';
      }
      await tx.lichHen.update({
        where: { id: targetLichHen.id },
        data: {
          trangThai: nextStatus,
          updatedAt: new Date(),
        },
      });
    }

    // 7. Trả về kết quả đầy đủ
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
            hoaDon: {
              include: {
                chiTietHoaDon: true,
              },
              orderBy: { dotThanhToan: 'asc' },
            },
          },
        },
        dichVuDieuTri: {
          include: {
            dichVu: true,
          },
        },
        donThuoc: {
          include: {
            chiTietDonThuoc: true,
          },
        },
        vatTuSuDung: {
          include: {
            sanPham: true,
          },
        },
      },
    });

    return clinicalRecordResponseSchema(fullRecord);
  });
};

/**
 * getPatientExamHistoryService
 * Lấy toàn bộ lịch sử chi tiết các lần khám và điều trị của bệnh nhân dành cho Bác sĩ
 */
export const getPatientExamHistoryService = async (patientId) => {
  const patient = await prisma.benhNhan.findUnique({
    where: { id: patientId },
    include: {
      lichHen: {
        orderBy: { ngayHen: 'desc' },
        include: {
          dichVu: true,
          caLamViec: {
            include: { nhaSi: true, phongDieuTri: true },
          },
          hoSoBenhAn: {
            include: {
              dichVuDieuTri: {
                include: {
                  dichVu: true,
                },
              },
              donThuoc: {
                include: {
                  chiTietDonThuoc: {
                    include: {
                      thuoc: true,
                    },
                  },
                },
              },
              vatTuSuDung: {
                include: {
                  sanPham: true,
                },
              },
            },
          },
        },
      },
      phacDoDieuTri: {
        orderBy: { createdAt: 'desc' },
        include: {
          nhaSi: true,
          giaiDoanPhacDo: {
            orderBy: { buocSo: 'asc' },
          },
        },
      },
    },
  });

  if (!patient) {
    throw new ApiError(404, 'Không tìm thấy hồ sơ bệnh nhân yêu cầu');
  }

  return adminPatientDetailResponseSchema(patient);
};

export default {
  getClinicalQueueService,
  updateSlipStatusService,
  getClinicalRecordService,
  saveClinicalRecordService,
  getPatientExamHistoryService,
};
