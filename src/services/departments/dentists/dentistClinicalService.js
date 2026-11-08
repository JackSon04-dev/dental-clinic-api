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
import {
  adminPatientDetailResponseSchema,
} from '../../../dtos/departments/admins/adminPatientDto.js';

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
      dbStatus = 'da_tiep_nhan';
  }

  const existing = await prisma.lichHen.findUnique({
    where: { id: slipId },
  });

  if (!existing) {
    throw new ApiError(404, 'Không tìm thấy phiếu khám / lịch hẹn tương ứng');
  }

  // RÀNG BUỘC TOÀN VẸN: Không được đóng ca nếu còn bất kỳ hóa đơn nào chưa thanh toán
  if (status === 'HOAN_THANH') {
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
        include: { caLamViec: true },
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

    // 1.1. RÀNG BUỘC R2: Cập nhật thông tin tiền sử bệnh và dị ứng thuốc của bệnh nhân
    const medHistoryVal = medicalHistory !== undefined ? medicalHistory : tienSuBenh;
    const allergiesVal = allergies !== undefined ? allergies : diUng;
    const targetPatientId = patientId || targetLichHen.benhNhanId;

    if (targetPatientId && (medHistoryVal !== undefined || allergiesVal !== undefined)) {
      const patientUpdateData = {};
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

      await tx.benhNhan.update({
        where: { id: targetPatientId },
        data: patientUpdateData,
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

      // Lấy danh sách ID thuốc để tra cứu giá trị mặc định từ CSDL
      const thuocIds = rawPrescriptions
        .map((m) => m.medicineId || m.thuocId || m.id)
        .filter(Boolean);

      const defaultThuocMap = new Map();
      if (thuocIds.length > 0) {
        const foundThuocs = await tx.thuoc.findMany({
          where: { id: { in: thuocIds } },
        });
        foundThuocs.forEach((t) => defaultThuocMap.set(t.id, t));
      }

      for (const med of rawPrescriptions) {
        const medId = med.medicineId || med.thuocId || med.id || null;
        const defaultThuoc = medId ? defaultThuocMap.get(medId) : null;

        const tenThuoc = med.medicineName || med.tenThuoc || defaultThuoc?.tenThuoc || 'Thuốc điều trị';
        const hoatChat = med.activeIngredient || med.hoatChat || defaultThuoc?.hoatChat || null;
        const hamLuong = med.hamLuong || defaultThuoc?.hamLuong || null;
        const dangBaoChe = med.dangBaoChe || defaultThuoc?.dangBaoChe || null;
        const donViTinh = med.unit || med.donViTinh || defaultThuoc?.donViTinh || 'Viên';

        // Tự động fallback sang lieuDungMacDinh và huongDanMacDinh nếu không truyền
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

    // 5. Xử lý Hóa đơn viện phí theo đợt & Lưu bảng kê chi tiết (ChiTietHoaDon 3NF)
    const existingInvoices = await tx.hoaDon.findMany({
      where: { lichHenId: targetLichHen.id },
      include: { chiTietHoaDon: true },
      orderBy: { dotThanhToan: 'asc' },
    });

    let currentInvoice = existingInvoices.find(inv => inv.trangThaiThanhToan === 'chua_thanh_toan');

    // Xác định đợt thanh toán và phân loại hóa đơn
    const dotThanhToan = currentInvoice ? currentInvoice.dotThanhToan : (existingInvoices.length + 1);
    const loaiHoaDon = dotThanhToan === 1 ? 'thanh_toan_truoc' : 'phat_sinh';

    const defaultStaff =
      (await tx.nhanVien.findFirst({
        where: { trangThai: 'dang_lam_viec' },
      })) || (await tx.nhanVien.findFirst());

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
          ghiChu: notes || (dotThanhToan === 1 ? 'Hóa đơn chỉ định thủ thuật đợt 1' : `Hóa đơn phát sinh đợt ${dotThanhToan}`),
          ngayLap: new Date(),
        },
      });
    }

    // Làm mới chi tiết bảng kê của hóa đơn hiện hành
    await tx.chiTietHoaDon.deleteMany({
      where: { hoaDonId: currentInvoice.id },
    });

    let invoiceSubtotal = 0;

    // Chi tiết dịch vụ
    for (const t of treatments) {
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

    // Chi tiết vật tư tiêu hao
    for (const m of materials) {
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

    const finalAmount = Math.max(0, invoiceSubtotal);
    await tx.hoaDon.update({
      where: { id: currentInvoice.id },
      data: {
        tongTien: invoiceSubtotal,
        giamGia: 0,
        soTienThanhToan: finalAmount,
      },
    });

    // 6. Cập nhật trạng thái Lịch Hẹn:
    // Có chi phí cần thanh toán -> chuyển sang 'cho_thanh_toan' (Quầy Thu Ngân)
    // Nếu không có phí (chỉ khám tư vấn miễn phí) -> chuyển sang 'dang_dieu_tri'
    const nextStatus = finalAmount > 0 ? 'cho_thanh_toan' : 'dang_dieu_tri';
    await tx.lichHen.update({
      where: { id: targetLichHen.id },
      data: {
        trangThai: nextStatus,
        updatedAt: new Date(),
      },
    });

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
