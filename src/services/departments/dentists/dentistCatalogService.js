import prisma from '../../../config/prisma.js';

/**
 * Lấy danh mục dịch vụ điều trị (kèm chi tiết dịch vụ và giá)
 */
export const getDentistServicesService = async () => {
  const services = await prisma.dichVu.findMany({
    where: { trangThai: 'hoat_dong' },
    include: {
      chiTietDichVu: {
        where: { trangThai: 'hoat_dong' },
        orderBy: { gia: 'asc' },
      },
    },
    orderBy: { tenDichVu: 'asc' },
  });

  return services.map((s) => ({
    id: s.id,
    code: s.maDichVu,
    name: s.tenDichVu,
    description: s.moTa,
    expectedDurationMinutes: s.thoiGianDuKienPhut,
    unitPrice: s.chiTietDichVu?.[0] ? Number(s.chiTietDichVu[0].gia) : 0,
    unit: s.chiTietDichVu?.[0]?.donViTinh || 'Lần',
    variants: s.chiTietDichVu.map((v) => ({
      id: v.id,
      code: v.maChiTiet,
      name: v.tenChiTiet,
      price: Number(v.gia),
      unit: v.donViTinh,
    })),
  }));
};

/**
 * Lấy danh mục thuốc kê đơn
 */
export const getDentistMedicinesService = async () => {
  const medicines = await prisma.thuoc.findMany({
    where: { trangThai: 'hoat_dong' },
    orderBy: { tenThuoc: 'asc' },
  });

  return medicines.map((m) => ({
    id: m.id,
    code: m.maThuoc,
    name: m.tenThuoc,
    brandName: m.tenBietDuoc,
    activeIngredient: m.hoatChat,
    dosageForm: m.dangBaoChe,
    strength: m.hamLuong,
    route: m.duongDung,
    unit: m.donViTinh,
    defaultDosage: m.lieuDungMacDinh,
    defaultUsageInstruction: m.huongDanMacDinh,
    contraindications: m.chongChiDinh,
    price: m.giaThamKhao ? Number(m.giaThamKhao) : 0,
  }));
};

/**
 * Lấy danh mục phác đồ mẫu
 */
export const getDentistSamplePlansService = async () => {
  const templates = await prisma.phacDoMau.findMany({
    where: { trangThai: 'hoat_dong' },
    include: {
      giaiDoanMau: {
        orderBy: { buocSo: 'asc' },
      },
    },
    orderBy: { tenPhacDoMau: 'asc' },
  });

  return templates.map((t) => ({
    id: t.id,
    code: t.maPhacDoMau,
    name: t.tenPhacDoMau,
    description: t.moTa,
    stages: t.giaiDoanMau.map((g) => ({
      stepNumber: g.buocSo,
      name: g.tenGiaiDoan,
      serviceName: g.tenDichVu,
      description: g.moTa,
      restingTime: g.thoiGianNghiGiuaBuoc,
    })),
  }));
};

export default {
  getDentistServicesService,
  getDentistMedicinesService,
  getDentistSamplePlansService,
};
