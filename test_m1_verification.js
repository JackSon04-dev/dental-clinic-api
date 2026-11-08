import prisma from './src/config/prisma.js';
import * as adminInvoiceService from './src/services/departments/admins/adminInvoiceService.js';
import * as adminPromotionService from './src/services/departments/admins/adminPromotionService.js';
import * as dentistClinicalService from './src/services/departments/dentists/dentistClinicalService.js';
import * as adminPatientService from './src/services/departments/admins/adminPatientService.js';
import * as adminServiceService from './src/services/departments/admins/adminServiceService.js';
import * as adminWorkShiftService from './src/services/departments/admins/adminWorkShiftService.js';
import { ApiError } from './src/common/errorMiddleware.js';

let passedChecks = 0;
let totalChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedChecks++;
  console.log(`✅ PASSED: ${message}`);
}

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 STARTING MILESTONE 1 BACKEND VERIFICATION');
  console.log('====================================================\n');

  // ----------------------------------------------------------------
  // 1. DATABASE SCHEMA & 3NF VERIFICATION
  // ----------------------------------------------------------------
  console.log('--- 1. DATABASE SCHEMA & 3NF VERIFICATION ---');
  
  // Verify columns on dich_vu
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'dich_vu' AND column_name IN ('gia', 'don_vi_tinh');
  `;
  assert(columns.length === 2, `dich_vu must have both gia and don_vi_tinh columns (found ${columns.length})`);

  // Verify chi_tiet_dich_vu table is dropped
  const variantTable = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'chi_tiet_dich_vu';
  `;
  assert(variantTable.length === 0, 'chi_tiet_dich_vu table must be completely dropped');

  // Verify v_dich_vu_da_thanh_toan view works
  const viewResult = await prisma.$queryRaw`
    SELECT count(*)::int as count FROM v_dich_vu_da_thanh_toan;
  `;
  assert(viewResult[0].count >= 0, `v_dich_vu_da_thanh_toan view queryable (returned ${viewResult[0].count} rows)`);

  // ----------------------------------------------------------------
  // 2. R3: DIRECT SERVICE CATALOG
  // ----------------------------------------------------------------
  console.log('\n--- 2. R3: DIRECT SERVICE CATALOG ---');
  
  // Create a service directly with price and unit
  const testServiceName = `Test M1 Service ${Date.now()}`;
  const createdService = await adminServiceService.createServiceService({
    name: testServiceName,
    price: 350000,
    unit: 'Răng',
    description: 'Dịch vụ kiểm thử M1 trực tiếp',
    estimatedDurationMinutes: 45,
  });

  assert(createdService.name === testServiceName, 'Created service name matches');
  assert(Number(createdService.price) === 350000, `Created service price is 350000 (got ${createdService.price})`);
  assert(createdService.unit === 'Răng', `Created service unit is 'Răng' (got ${createdService.unit})`);
  assert(createdService.itemsCount === 0, 'itemsCount is 0 (no variant items)');

  // Fetch service detail
  const fetchedDetail = await adminServiceService.getServiceDetailService(createdService.id);
  assert(fetchedDetail.id === createdService.id, 'Fetched service detail by ID');
  assert(Number(fetchedDetail.gia) === 350000, 'Direct gia field returned');

  // Update service price & unit
  const updatedService = await adminServiceService.updateServiceService(createdService.id, {
    gia: 420000,
    donViTinh: 'Hàm',
  });
  assert(Number(updatedService.price) === 420000, `Updated service price is 420000 (got ${updatedService.price})`);
  assert(updatedService.unit === 'Hàm', `Updated service unit is 'Hàm' (got ${updatedService.unit})`);

  // Toggle status
  const toggledService = await adminServiceService.updateServiceStatusService(createdService.id, 'ngung_hoat_dong');
  assert(toggledService.status === 'ngung_hoat_dong', 'Toggled service status to ngung_hoat_dong');

  // Cleanup test service
  await prisma.dichVu.delete({ where: { id: createdService.id } });
  console.log('Cleaned up test service.');

  // ----------------------------------------------------------------
  // 3. R1: INVOICES & PROMOTIONS
  // ----------------------------------------------------------------
  console.log('\n--- 3. R1: INVOICES & PROMOTIONS ---');

  // Test paid invoice cancellation guard
  const paidInvoice = await prisma.hoaDon.findFirst({
    where: { trangThaiThanhToan: 'da_thanh_toan' },
  });
  if (paidInvoice) {
    let cancelThrew = false;
    let errorStatus = 0;
    try {
      await adminInvoiceService.cancelInvoiceService(paidInvoice.id, { reason: 'Test cancel guard' });
    } catch (err) {
      cancelThrew = true;
      errorStatus = err.statusCode || err.status;
    }
    assert(cancelThrew, 'Attempting to cancel a paid invoice threw an error');
    assert(errorStatus === 400, `Cancel paid invoice error code is 400 Bad Request (got ${errorStatus})`);
  } else {
    console.log('Skipping paid invoice cancellation check: no paid invoice found.');
  }

  // Test promotion validation
  // Find an active promotion voucher
  const promo = await prisma.khuyenMai.findFirst({
    where: {
      trangThai: 'hoat_dong',
      ngayBatDau: { lte: new Date() },
      ngayKetThuc: { gte: new Date() },
    },
  });

  if (promo) {
    const valResult = await adminPromotionService.validatePromotionService({
      code: promo.maKhuyenMai,
      subtotal: 1000000,
    });
    assert(valResult.valid === true, `Promotion ${promo.maKhuyenMai} is valid`);
    assert(typeof valResult.discountAmount === 'number', `Discount amount calculated: ${valResult.discountAmount}`);
    assert(valResult.finalTotal <= 1000000, `Final total is correctly discounted: ${valResult.finalTotal}`);
  }

  // Test invalid promotion code
  const invalidResult = await adminPromotionService.validatePromotionService({
    code: 'NON_EXISTENT_CODE_XYZ',
    subtotal: 500000,
  });
  assert(invalidResult.valid === false, `Non-existent promotion code is invalid: ${invalidResult.message}`);
  assert(invalidResult.finalAmount === 500000, 'Invalid promo keeps full subtotal');

  // ----------------------------------------------------------------
  // 4. R2: CLINICAL EXAM & PATIENT HISTORY
  // ----------------------------------------------------------------
  console.log('\n--- 4. R2: CLINICAL EXAM & PATIENT HISTORY ---');

  // Find or create an active non-completed appointment for testing
  let appointment = await prisma.lichHen.findFirst({
    where: { trangThai: { in: ['cho_kham', 'kham_lai', 'da_tiep_nhan', 'dang_kham'] } },
    include: {
      benhNhan: true,
      caLamViec: { include: { nhaSi: true } },
      dichVu: true,
    },
  });

  if (!appointment) {
    const doc = await prisma.nhaSi.findFirst({ where: { trangThai: 'dang_lam_viec' } });
    const patient = await prisma.benhNhan.findFirst();
    const room = await prisma.phongDieuTri.findFirst({ where: { trangThai: 'hoat_dong' } });
    const svc = await prisma.dichVu.findFirst({ where: { trangThai: 'hoat_dong' } });
    const shift = await prisma.caLamViec.create({
      data: {
        nhaSiId: doc.id,
        phongDieuTriId: room.id,
        ngay: new Date(),
        gioBatDau: new Date('1970-01-01T08:00:00Z'),
        gioKetThuc: new Date('1970-01-01T17:00:00Z'),
        trangThai: 'dang_dien_ra',
      },
    });
    appointment = await prisma.lichHen.create({
      data: {
        maLichHen: `LH-TEST-${Date.now().toString().slice(-6)}`,
        benhNhanId: patient.id,
        caLamViecId: shift.id,
        dichVuId: svc.id,
        ngayHen: new Date(),
        gioHen: new Date(),
        gioKetThucDuKien: new Date(Date.now() + 30 * 60000),
        trangThai: 'cho_kham',
      },
      include: {
        benhNhan: true,
        caLamViec: { include: { nhaSi: true } },
        dichVu: true,
      },
    });
  }

  const medicine = await prisma.thuoc.findFirst({
    where: { trangThai: 'hoat_dong' },
  });

  const activeService = await prisma.dichVu.findFirst({
    where: { trangThai: 'hoat_dong' },
  });

  if (appointment && medicine && activeService) {
    const patientBefore = await prisma.benhNhan.findUnique({
      where: { id: appointment.benhNhanId },
    });

    const testAllergy = `Dị ứng penicillin test ${Date.now()}`;
    const testMedicalHistory = `Tiền sử tim mạch test ${Date.now()}`;

    // Test saveClinicalRecordService with auto-filled prescription defaults
    const clinicalRecordResult = await dentistClinicalService.saveClinicalRecordService(
      appointment.caLamViec.nhaSiId,
      {
        slipId: appointment.id,
        patientId: appointment.benhNhanId,
        diagnosis: 'Viêm tủy cấp R36',
        treatmentMethod: 'Điều trị tủy R36',
        doctorAdvice: 'Tránh nhai đồ cứng',
        medicalHistory: testMedicalHistory,
        allergies: testAllergy,
        treatments: [
          {
            serviceId: activeService.id,
            quantity: 1,
            toothNumber: '36',
            price: Number(activeService.gia),
          },
        ],
        prescription: [
          {
            medicineId: medicine.id,
            quantity: 10,
            // Omit dosage and instructions to test auto-lookup of defaults!
          },
        ],
      }
    );

    assert(clinicalRecordResult.id !== undefined, 'Clinical record created successfully');

    // Verify patient allergy & medical history were updated in BenhNhan
    const patientAfter = await prisma.benhNhan.findUnique({
      where: { id: appointment.benhNhanId },
    });
    assert(patientAfter.diUng === testAllergy, `Patient diUng updated to '${testAllergy}'`);
    assert(patientAfter.tienSuBenh === testMedicalHistory, `Patient tienSuBenh updated to '${testMedicalHistory}'`);

    // Verify auto-lookup of default dosage/instructions from Thuoc
    const prescriptionItem = await prisma.chiTietDonThuoc.findFirst({
      where: {
        donThuoc: {
          hoSoId: clinicalRecordResult.id,
        },
        thuocId: medicine.id,
      },
    });
    assert(prescriptionItem !== null, 'Prescription item created in database');
    assert(prescriptionItem.lieuDung === (medicine.lieuDungMacDinh || 'Theo chỉ định của bác sĩ'),
      `Auto-filled lieuDung: '${prescriptionItem.lieuDung}'`);
    assert(prescriptionItem.huongDan === (medicine.huongDanMacDinh || 'Uống sau bữa ăn'),
      `Auto-filled huongDan: '${prescriptionItem.huongDan}'`);

    // Test getPatientExamHistoryService
    const patientHistory = await dentistClinicalService.getPatientExamHistoryService(appointment.benhNhanId);
    assert(patientHistory.id === appointment.benhNhanId, 'Patient exam history includes patient info');
    assert(Array.isArray(patientHistory.examHistory), 'Patient exam history includes examHistory array');
    const ourRecord = patientHistory.examHistory.find((r) => r.id === clinicalRecordResult.id);
    assert(ourRecord !== undefined, 'Patient history contains the newly created record');
    assert(Array.isArray(ourRecord.treatedTeeth), 'Record includes treatedTeeth array');
    assert(ourRecord.prescription !== undefined, 'Record includes prescription');

    // Test admin patient detail includes full clinical exam history
    const adminPatientDetail = await adminPatientService.getPatientDetailService(appointment.benhNhanId);
    assert(adminPatientDetail.examHistory !== undefined, 'Admin patient detail includes examHistory');
    assert(adminPatientDetail.examHistory.length > 0, 'Admin patient examHistory is populated');
    const adminRec = adminPatientDetail.examHistory.find((r) => r.id === clinicalRecordResult.id);
    assert(adminRec !== undefined, 'Admin examHistory includes newly created record');
    assert(Array.isArray(adminRec.treatedTeeth), 'Admin examHistory record includes treatedTeeth');
    assert(adminRec.prescription !== undefined, 'Admin examHistory record includes prescription');
  } else {
    console.log('Skipping clinical record creation: missing prerequisite records in DB.');
  }

  // ----------------------------------------------------------------
  // 5. R4: DOCTOR SHIFTS & APPOINTMENTS
  // ----------------------------------------------------------------
  console.log('\n--- 5. R4: DOCTOR SHIFTS & APPOINTMENTS ---');

  // Test getDoctorsWorkShiftsOverviewService
  const doctorsOverview = await adminWorkShiftService.getDoctorsWorkShiftsOverviewService({
    date: '2026-11-08',
  });
  assert(Array.isArray(doctorsOverview), 'getDoctorsWorkShiftsOverviewService returns an array');
  assert(doctorsOverview.length > 0, `Returned ${doctorsOverview.length} active doctors`);
  const firstDoc = doctorsOverview[0];
  assert(firstDoc.doctorId !== undefined, 'Doctor overview includes doctorId');
  assert(typeof firstDoc.dailyShiftsCount === 'number', `Doctor dailyShiftsCount is a number (${firstDoc.dailyShiftsCount})`);
  assert(typeof firstDoc.weeklyShiftsCount === 'number', `Doctor weeklyShiftsCount is a number (${firstDoc.weeklyShiftsCount})`);
  assert(Array.isArray(firstDoc.shifts), 'Doctor shifts is an array');

  // Test getShiftAppointmentsService
  const aShift = await prisma.caLamViec.findFirst({
    include: { lichHen: true },
  });
  if (aShift) {
    const shiftAppointments = await adminWorkShiftService.getShiftAppointmentsService({
      shiftId: aShift.id,
    });
    assert(shiftAppointments.shiftId === aShift.id, 'getShiftAppointmentsService returns correct shiftId');
    assert(shiftAppointments.doctorName !== undefined, `Doctor name: ${shiftAppointments.doctorName}`);
    assert(shiftAppointments.roomName !== undefined, `Room name: ${shiftAppointments.roomName}`);
    assert(Array.isArray(shiftAppointments.appointments), 'Appointments is an array');
    assert(shiftAppointments.appointmentsCount === shiftAppointments.appointments.length, 'Appointments count matches array length');
  }

  console.log('\n====================================================');
  console.log(`🎉 ALL CHECKS PASSED: ${passedChecks}/${totalChecks}`);
  console.log('====================================================');
}

runVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  });
