import prisma from '../../../config/prisma.js';

/**
 * Lấy danh mục dịch vụ điều trị (kèm chi tiết dịch vụ và giá)
 */
export const getDentistServicesService = async () => {
  const services = await prisma.dichVu.findMany({
    where: { trangThai: 'hoat_dong' },
    orderBy: { tenDichVu: 'asc' },
  });

  return services.map((s) => ({
    id: s.id,
    code: s.maDichVu,
    name: s.tenDichVu,
    description: s.moTa,
    expectedDurationMinutes: s.thoiGianDuKienPhut,
    unitPrice: Number(s.gia || 0),
    price: Number(s.gia || 0),
    unit: s.donViTinh || 'Lần',
    variants: [],
  }));
};

/**
 * Lấy danh mục thuốc kê đơn
 */
export const getDentistMedicinesService = async (query = {}) => {
  const { search = '' } = query;
  const where = { trangThai: 'hoat_dong' };
  const cleanSearch = typeof search === 'string' ? search.trim() : '';
  if (cleanSearch) {
    where.OR = [
      { tenThuoc: { contains: cleanSearch, mode: 'insensitive' } },
      { hoatChat: { contains: cleanSearch, mode: 'insensitive' } },
      { tenBietDuoc: { contains: cleanSearch, mode: 'insensitive' } },
      { maThuoc: { contains: cleanSearch, mode: 'insensitive' } },
    ];
  }

  const medicines = await prisma.thuoc.findMany({
    where,
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
    lieuDungMacDinh: m.lieuDungMacDinh,
    huongDanMacDinh: m.huongDanMacDinh,
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

/**
 * Lấy danh mục sản phẩm / vật tư y tế đang hoạt động
 */
export const getDentistProductsService = async () => {
  const products = await prisma.sanPham.findMany({
    where: { trangThai: 'hoat_dong' },
    orderBy: { tenSanPham: 'asc' },
  });

  return products.map((p) => ({
    id: p.id,
    code: p.maSanPham,
    name: p.tenSanPham,
    type: p.loai,
    unit: p.donViTinh || 'Cái',
    price: Number(p.giaBan || 0),
    stockQuantity: p.soLuongTon || 0,
    minStockThreshold: p.mucTonToiThieu || 0,
    description: p.moTa,
  }));
};

export default {
  getDentistServicesService,
  getDentistMedicinesService,
  getDentistSamplePlansService,
  getDentistProductsService,
};
