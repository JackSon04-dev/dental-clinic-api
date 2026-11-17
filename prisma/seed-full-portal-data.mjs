import prisma from '../src/config/prisma.js';

async function seed() {
  console.log('🌱 Starting Full Sample Data Seeding for Patient Portal...');

  // 1. Tìm bệnh nhân BN_TEST01
  const patient = await prisma.benhNhan.findFirst({
    where: { maBenhNhan: 'BN_TEST01' },
    include: { taiKhoan: true }
  });

  if (!patient) {
    console.error('❌ Không tìm thấy BN_TEST01!');
    process.exit(1);
  }

  console.log('✅ Tìm thấy bệnh nhân:', patient.hoTen, patient.id);

  // 2. Tìm bác sĩ điều trị mẫu (BS. Trần Minh Quang)
  const dentist = await prisma.nhaSi.findFirst({
    where: { maNhaSi: 'NS001' }
  }) || await prisma.nhaSi.findFirst();

  console.log('✅ Bác sĩ phụ trách:', dentist.hoTen, dentist.id);

  // 3. Tìm hoặc tạo hồ sơ bệnh án cho cuộc hẹn LH_TEST01
  let appt = await prisma.lichHen.findFirst({
    where: { benhNhanId: patient.id },
    include: { hoSoBenhAn: true }
  });

  if (!appt) {
    console.log('Creating sample appointment...');
    const service = await prisma.dichVu.findFirst();
    const shift = await prisma.caLamViec.findFirst();
    appt = await prisma.lichHen.create({
      data: {
        maLichHen: 'LH_TEST01',
        benhNhanId: patient.id,
        dichVuId: service.id,
        caLamViecId: shift.id,
        ngayHen: new Date(),
        gioHen: '14:00:00',
        gioKetThucDuKien: '14:45:00',
        trangThai: 'hoan_thanh',
        ghiChu: 'Bệnh nhân kiểm tra định kỳ và lấy cao răng'
      },
      include: { hoSoBenhAn: true }
    });
  } else {
    await prisma.lichHen.update({
      where: { id: appt.id },
      data: { trangThai: 'hoan_thanh' }
    });
  }

  let hoSo = appt.hoSoBenhAn;
  if (!hoSo) {
    console.log('Creating sample medical record (HoSoBenhAn)...');
    hoSo = await prisma.hoSoBenhAn.create({
      data: {
        maHoSo: 'HS-20261111-001',
        lichHenId: appt.id,
        ngayKham: new Date('2026-11-11'),
        chanDoan: 'Viêm lợi nhẹ do mảng bám vôi răng độ 1. Men răng còn chắc khỏe.',
        phuongPhapDieuTri: 'Cạo vôi răng sóng siêu âm Piezotome không đau, đánh bóng men răng.',
        ketQua: 'Răng miệng sạch mảng bám, nướu hết chảy máu, hơi thở thơm mát.',
        loiDan: 'Chải răng 2 lần/ngày với bàn chải lông mềm, dùng chỉ nha khoa sau bữa ăn.',
        tinhTrangRangMieng: 'Không phát hiện sâu răng mới, răng 38 mọc lệch nhẹ cần theo dõi.'
      }
    });
  }

  // 4. Tạo Đơn thuốc mẫu (DonThuoc) nếu chưa có
  const existingRx = await prisma.donThuoc.findFirst({
    where: { hoSoId: hoSo.id }
  });

  if (!existingRx) {
    console.log('Creating sample prescription (DonThuoc)...');
    const allThuoc = await prisma.thuoc.findMany({ take: 2 });
    const thuoc1 = allThuoc[0] || { id: null, tenThuoc: 'Amoxicillin 500mg' };
    const thuoc2 = allThuoc[1] || { id: null, tenThuoc: 'Paracetamol 500mg' };

    await prisma.donThuoc.create({
      data: {
        maDonThuoc: 'DT-20261111-8891',
        hoSoId: hoSo.id,
        nhaSiId: dentist.id,
        ngayKe: new Date('2026-11-11'),
        soNgayDung: 5,
        chanDoan: 'Viêm lợi nhẹ sau lấy cao răng',
        loiDan: 'Uống thuốc sau bữa ăn no 15 phút. Uống nhiều nước lọc (2 lít/ngày).',
        ghiChu: 'Không dùng đồ uống có cồn, cay nóng trong thời gian dùng thuốc.',
        chiTietDonThuoc: {
          create: [
            {
              thuocId: thuoc1.id,
              tenThuoc: thuoc1.tenThuoc || 'Amoxicillin 500mg',
              soLuong: 10,
              lieuDung: 'Uống 1 viên / lần, ngày 2 lần sau ăn sáng và tối.',
              donViTinh: 'Viên',
              soLanNgay: 2,
              huongDan: 'Uống trực tiếp với nước ấm'
            },
            {
              thuocId: thuoc2.id,
              tenThuoc: thuoc2.tenThuoc || 'Paracetamol 500mg',
              soLuong: 6,
              lieuDung: 'Uống 1 viên khi có cảm giác đau hoặc ê buốt (cách tối thiểu 6 tiếng).',
              donViTinh: 'Viên',
              soLanNgay: 2,
              huongDan: 'Uống sau ăn khi đau'
            }
          ]
        }
      }
    });
    console.log('✅ Đã tạo đơn thuốc mẫu thành công!');
  }

  // 5. Tạo Phác đồ điều trị mẫu (PhacDoDieuTri) nếu chưa có
  const existingPlan = await prisma.phacDoDieuTri.findFirst({
    where: { benhNhanId: patient.id }
  });

  if (!existingPlan) {
    console.log('Creating sample treatment plan (PhacDoDieuTri)...');
    await prisma.phacDoDieuTri.create({
      data: {
        maPhacDo: 'PD-202611-002',
        tenPhacDo: 'Phác đồ Trồng răng Implant & Phục hình thẩm mỹ',
        benhNhanId: patient.id,
        nhaSiId: dentist.id,
        chanDoanBanDau: 'Phục hình thẩm mỹ răng hàm & Cấy ghép Implant chuyên sâu',
        ngayBatDau: new Date('2026-11-01'),
        ngayDuKienHoanThanh: new Date('2027-02-28'),
        trangThai: 'dang_dieu_tri',
        giaiDoanPhacDo: {
          create: [
            {
              buocSo: 1,
              tenGiaiDoan: 'Khám tổng quát & Vô trùng khoang miệng',
              moTa: 'Chụp phim CT Cone Beam 3D, lấy dấu hàm, cạo vôi răng siêu âm và điều trị viêm nướu.',
              moTaVatTuDichVu: 'Chi phí dự kiến: 1.500.000 đ',
              trangThai: 'hoan_thanh',
              ngayThucHien: new Date('2026-11-05')
            },
            {
              buocSo: 2,
              tenGiaiDoan: 'Cấy ghép trụ Implant Straumann Thụy Sĩ',
              moTa: 'Phẫu thuật đặt trụ Implant với máng hướng dẫn kỹ thuật số 3D không đau.',
              moTaVatTuDichVu: 'Chi phí dự kiến: 28.000.000 đ',
              trangThai: 'dang_thuc_hien',
              ngayDuKien: new Date('2026-11-12')
            },
            {
              buocSo: 3,
              tenGiaiDoan: 'Phục hình mão răng toàn sứ Cercon HT',
              moTa: 'Gắn khớp nối Abutment và phục hình răng sứ thẩm mỹ trên trụ Implant.',
              moTaVatTuDichVu: 'Chi phí dự kiến: 8.500.000 đ',
              trangThai: 'chua_thuc_hien',
              ngayDuKien: new Date('2027-01-10')
            }
          ]
        }
      }
    });
    console.log('✅ Đã tạo phác đồ điều trị mẫu thành công!');
  }

  console.log('🎉 TOÀN BỘ DỮ LIỆU MẪU ĐÃ SẴN SÀNG CHO CỔNG BỆNH NHÂN!');
}

seed()
  .catch((e) => {
    console.error('❌ Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
