import dotenv from 'dotenv';
dotenv.config();
import app from './src/app.js';
import prisma from './src/config/prisma.js';
import jwt from 'jsonwebtoken';
import * as adminInvoiceService from './src/services/departments/admins/adminInvoiceService.js';
import * as adminPromotionService from './src/services/departments/admins/adminPromotionService.js';
import * as adminServiceService from './src/services/departments/admins/adminServiceService.js';
import * as adminWorkShiftService from './src/services/departments/admins/adminWorkShiftService.js';
import { ApiError } from './src/common/errorMiddleware.js';

const PORT = 5098;
const JWT_SECRET = process.env.JWT_SECRET || 'dental_clinic_jwt_super_secret_key_2026';

function makeToken(role, username = 'adversarial_tester') {
  return jwt.sign(
    {
      userId: '00000000-0000-0000-0000-000000000001',
      username,
      role,
      profileId: '00000000-0000-0000-0000-000000000001',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

let passedChecks = 0;
let totalChecks = 0;
const failureList = [];

function check(cond, description, details = '') {
  totalChecks++;
  if (!cond) {
    const msg = `❌ [FAIL] ${description} ${details ? `(${details})` : ''}`;
    console.error(msg);
    failureList.push(msg);
    throw new Error(msg);
  }
  passedChecks++;
  console.log(`✅ [PASS] ${description}`);
}

let server;

async function runAdversarialHarness() {
  console.log('================================================================');
  console.log('⚔️  STARTING EMPIRICAL ADVERSARIAL CHALLENGE HARNESS (MILESTONE 1)');
  console.log('================================================================\n');

  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Adversarial HTTP harness running on port ${PORT}\n`);
      resolve();
    });
  });

  const adminToken = makeToken('ADMIN', 'admin_challenger');
  const receptionistToken = makeToken('LE_TAN', 'letan_challenger');
  const patientToken = makeToken('BENH_NHAN', 'patient_challenger');

  // Track created entities for guaranteed cleanup
  const cleanupServiceIds = [];
  const cleanupPromoIds = [];

  try {
    // ========================================================================
    // CHALLENGE 1: Cancelling PAID Invoice Immutability
    // ========================================================================
    console.log('--- CHALLENGE 1: CANCEL PAID INVOICE IMMUTABILITY ---');

    let paidInvoice = await prisma.hoaDon.findFirst({
      where: { trangThaiThanhToan: 'da_thanh_toan' },
    });

    if (!paidInvoice) {
      console.log('No existing paid invoice found, creating a test paid invoice...');
      const patient = await prisma.benhNhan.findFirst();
      const shift = await prisma.caLamViec.findFirst();
      const svc = await prisma.dichVu.findFirst();

      const testApp = await prisma.lichHen.create({
        data: {
          maLichHen: `LH-ADV-${Date.now().toString().slice(-6)}`,
          benhNhanId: patient.id,
          caLamViecId: shift.id,
          dichVuId: svc.id,
          ngayHen: new Date(),
          gioHen: new Date(),
          gioKetThucDuKien: new Date(Date.now() + 30 * 60000),
          trangThai: 'hoan_thanh',
        },
      });

      paidInvoice = await prisma.hoaDon.create({
        data: {
          maHoaDon: `HD-ADV-${Date.now().toString().slice(-6)}`,
          lichHenId: testApp.id,
          tongTien: 500000,
          soTienGiam: 0,
          thanhTien: 500000,
          trangThaiThanhToan: 'da_thanh_toan',
          phuongThucThanhToan: 'tien_mat',
          ngayThanhToan: new Date(),
        },
      });
    }

    check(paidInvoice && paidInvoice.trangThaiThanhToan === 'da_thanh_toan', 'Found/created a PAID invoice', `ID: ${paidInvoice.id}`);

    // 1.1 Direct service call: cancelInvoiceService on PAID invoice
    let serviceThrew = false;
    let serviceErrorCode = 0;
    let serviceErrorMsg = '';
    try {
      await adminInvoiceService.cancelInvoiceService(paidInvoice.id, {
        cancelReason: 'Adversarial cancellation attempt',
      });
    } catch (err) {
      serviceThrew = true;
      serviceErrorCode = err.statusCode || err.status || 500;
      serviceErrorMsg = err.message || '';
    }

    check(serviceThrew, 'cancelInvoiceService strictly threw an exception when cancelling PAID invoice');
    check(serviceErrorCode === 400, `cancelInvoiceService error code is HTTP 400 Bad Request (got ${serviceErrorCode})`);
    check(
      serviceErrorMsg.includes('Không thể hủy hóa đơn đã'),
      `Error message explicitly mentions cannot cancel paid invoice: "${serviceErrorMsg}"`
    );

    // 1.2 Direct DB Check: Status MUST NOT be mutated
    const postServiceCheck = await prisma.hoaDon.findUnique({
      where: { id: paidInvoice.id },
      select: { id: true, trangThaiThanhToan: true, lyDoHuy: true },
    });
    check(
      postServiceCheck.trangThaiThanhToan === 'da_thanh_toan',
      'Database Invariant: hoaDon.trangThaiThanhToan remains da_thanh_toan after service call',
      `got ${postServiceCheck.trangThaiThanhToan}`
    );
    check(
      postServiceCheck.trangThaiThanhToan !== 'da_huy',
      'Database Invariant: hoaDon.trangThaiThanhToan is NOT mutated to da_huy'
    );

    // 1.3 HTTP API call: PATCH /api/v1/admin/invoices/:id/cancel
    const httpCancelRes = await fetch(`http://localhost:${PORT}/api/v1/admin/invoices/${paidInvoice.id}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        cancelReason: 'HTTP Adversarial cancellation attempt',
      }),
    });

    const httpCancelData = await httpCancelRes.json();
    check(httpCancelRes.status === 400, `HTTP PATCH /api/v1/admin/invoices/:id/cancel returns HTTP 400 (got ${httpCancelRes.status})`);
    check(
      httpCancelData.message && httpCancelData.message.includes('Không thể hủy hóa đơn đã'),
      `HTTP error message indicates cannot cancel paid invoice: "${httpCancelData.message}"`
    );

    // 1.4 Post-HTTP DB verification: status STILL strictly da_thanh_toan
    const postHttpCheck = await prisma.hoaDon.findUnique({
      where: { id: paidInvoice.id },
      select: { id: true, trangThaiThanhToan: true, lyDoHuy: true },
    });
    check(
      postHttpCheck.trangThaiThanhToan === 'da_thanh_toan',
      'Database Invariant: hoaDon.trangThaiThanhToan strictly preserved as da_thanh_toan after HTTP attack'
    );
    check(
      postHttpCheck.lyDoHuy === null || postHttpCheck.lyDoHuy !== 'HTTP Adversarial cancellation attempt',
      'Database Invariant: lyDoHuy was not written on failed cancellation'
    );

    // 1.5 Edge case: Cancel an invoice already cancelled (da_huy)
    let cancelledInvoice = await prisma.hoaDon.findFirst({
      where: { trangThaiThanhToan: 'da_huy' },
    });

    if (!cancelledInvoice) {
      // Find an unpaid invoice and cancel it
      const unpaidInvoice = await prisma.hoaDon.findFirst({
        where: { trangThaiThanhToan: 'chua_thanh_toan' },
      });
      if (unpaidInvoice) {
        await adminInvoiceService.cancelInvoiceService(unpaidInvoice.id, {
          cancelReason: 'First legitimate cancellation',
        });
        cancelledInvoice = unpaidInvoice;
      }
    }

    if (cancelledInvoice) {
      // Now try to cancel it again (double cancellation attack)
      let doubleCancelThrew = false;
      let doubleCancelCode = 0;
      let doubleCancelMsg = '';
      try {
        await adminInvoiceService.cancelInvoiceService(cancelledInvoice.id, {
          cancelReason: 'Attempt double cancellation',
        });
      } catch (err) {
        doubleCancelThrew = true;
        doubleCancelCode = err.statusCode || err.status || 500;
        doubleCancelMsg = err.message || '';
      }
      check(doubleCancelThrew, 'Cancelling an already-cancelled invoice throws an exception');
      check(doubleCancelCode === 400, `Double cancel throws HTTP 400 (got ${doubleCancelCode})`);
      check(doubleCancelMsg.includes('đã được hủy trước đó'), `Double cancel message: "${doubleCancelMsg}"`);
    } else {
      console.log('Skipping double cancel check: no cancellable invoice in DB');
    }

    // 1.6 Edge case: Cancel non-existent invoice UUID
    let nonExistentThrew = false;
    let nonExistentCode = 0;
    try {
      await adminInvoiceService.cancelInvoiceService('00000000-0000-0000-0000-000000000099', {
        cancelReason: 'Ghost invoice',
      });
    } catch (err) {
      nonExistentThrew = true;
      nonExistentCode = err.statusCode || err.status || 500;
    }
    check(nonExistentThrew, 'Cancelling non-existent invoice throws 404');
    check(nonExistentCode === 404, `Ghost invoice returns HTTP 404 (got ${nonExistentCode})`);

    // 1.7 Edge case: Non-UUID invoice ID parameter in HTTP API
    const resBadUuid = await fetch(`http://localhost:${PORT}/api/v1/admin/invoices/not-a-valid-uuid/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ cancelReason: 'Valid reason' }),
    });
    check(resBadUuid.status === 400, `Non-UUID invoice ID in HTTP cancel returns 400 (got ${resBadUuid.status})`);

    // 1.8 Edge case: Short cancelReason (< 3 chars) in HTTP API
    const resShortReason = await fetch(`http://localhost:${PORT}/api/v1/admin/invoices/${paidInvoice.id}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ cancelReason: 'no' }),
    });
    check(resShortReason.status === 400, `Short cancelReason (< 3 chars) returns HTTP 400 (got ${resShortReason.status})`);

    // ========================================================================
    // CHALLENGE 2: Validate Vouchers with Edge Cases
    // ========================================================================
    console.log('\n--- CHALLENGE 2: VALIDATE VOUCHERS EDGE CASES ---');

    // 2.1 Expired voucher (ngayKetThuc in the past)
    const expiredPromoCode = `EXP_${Date.now().toString().slice(-6)}`;
    const expiredPromo = await prisma.khuyenMai.create({
      data: {
        maKhuyenMai: expiredPromoCode,
        tenChuongTrinh: 'Voucher Hết Hạn Adversarial',
        loaiGiam: 'so_tien',
        giaTriGiam: 100000,
        ngayBatDau: new Date('2020-01-01'),
        ngayKetThuc: new Date('2021-01-01'),
        trangThai: 'hoat_dong',
      },
    });
    cleanupPromoIds.push(expiredPromo.id);

    const valExpired = await adminPromotionService.validatePromotionService({
      code: expiredPromoCode,
      subtotal: 500000,
    });
    check(valExpired.valid === false, 'Expired voucher is invalid (valid === false)');
    check(valExpired.discountAmount === 0, 'Expired voucher discountAmount is 0');
    check(valExpired.finalAmount === 500000, 'Expired voucher retains full subtotal as finalAmount');
    check(valExpired.message.includes('hết hạn'), `Expired message says: "${valExpired.message}"`);

    // 2.2 Future start date voucher (ngayBatDau in the future)
    const futurePromoCode = `FUT_${Date.now().toString().slice(-6)}`;
    const futurePromo = await prisma.khuyenMai.create({
      data: {
        maKhuyenMai: futurePromoCode,
        tenChuongTrinh: 'Voucher Tương Lai Adversarial',
        loaiGiam: 'phan_tram',
        giaTriGiam: 20,
        ngayBatDau: new Date('2035-01-01'),
        ngayKetThuc: new Date('2035-12-31'),
        trangThai: 'hoat_dong',
      },
    });
    cleanupPromoIds.push(futurePromo.id);

    const valFuture = await adminPromotionService.validatePromotionService({
      code: futurePromoCode,
      subtotal: 1000000,
    });
    check(valFuture.valid === false, 'Future start date voucher is invalid (valid === false)');
    check(valFuture.discountAmount === 0, 'Future voucher discountAmount is 0');
    check(valFuture.finalAmount === 1000000, 'Future voucher retains full subtotal');
    check(valFuture.message.includes('chưa đến thời gian'), `Future message says: "${valFuture.message}"`);

    // 2.3 Usage count >= max usage
    const exhaustedPromoCode = `EXH_${Date.now().toString().slice(-6)}`;
    const exhaustedPromo = await prisma.khuyenMai.create({
      data: {
        maKhuyenMai: exhaustedPromoCode,
        tenChuongTrinh: 'Voucher Hết Lượt Dùng',
        loaiGiam: 'so_tien',
        giaTriGiam: 50000,
        ngayBatDau: new Date('2026-01-01'),
        ngayKetThuc: new Date('2026-12-31'),
        soLanSuDungToiDa: 10,
        soLanDaSuDung: 10, // equal to max!
        trangThai: 'hoat_dong',
      },
    });
    cleanupPromoIds.push(exhaustedPromo.id);

    const valExhausted = await adminPromotionService.validatePromotionService({
      code: exhaustedPromoCode,
      subtotal: 300000,
    });
    check(valExhausted.valid === false, 'Exhausted voucher (used == max) is invalid');
    check(valExhausted.discountAmount === 0, 'Exhausted voucher discountAmount is 0');
    check(valExhausted.message.includes('hết số lượt sử dụng'), `Exhausted message says: "${valExhausted.message}"`);

    // Also test overflow: used > max
    await prisma.khuyenMai.update({
      where: { id: exhaustedPromo.id },
      data: { soLanDaSuDung: 15 },
    });
    const valOverflow = await adminPromotionService.validatePromotionService({
      code: exhaustedPromoCode,
      subtotal: 300000,
    });
    check(valOverflow.valid === false, 'Overflow voucher (used > max) is invalid');

    // 2.4 Inactive voucher status
    const inactivePromoCode = `INA_${Date.now().toString().slice(-6)}`;
    const inactivePromo = await prisma.khuyenMai.create({
      data: {
        maKhuyenMai: inactivePromoCode,
        tenChuongTrinh: 'Voucher Bị Hủy',
        loaiGiam: 'so_tien',
        giaTriGiam: 50000,
        ngayBatDau: new Date('2026-01-01'),
        ngayKetThuc: new Date('2026-12-31'),
        trangThai: 'da_huy',
      },
    });
    cleanupPromoIds.push(inactivePromo.id);

    const valInactive = await adminPromotionService.validatePromotionService({
      code: inactivePromoCode,
      subtotal: 500000,
    });
    check(valInactive.valid === false, 'Inactive voucher (da_huy) is invalid');

    // 2.5 Discount > subtotal: Must cap at subtotal and NEVER negative final amount
    const giantPromoCode = `GIANT_${Date.now().toString().slice(-6)}`;
    const giantPromo = await prisma.khuyenMai.create({
      data: {
        maKhuyenMai: giantPromoCode,
        tenChuongTrinh: 'Voucher Khủng 2 Triệu',
        loaiGiam: 'so_tien',
        giaTriGiam: 2000000, // 2,000,000 VNĐ
        ngayBatDau: new Date('2026-01-01'),
        ngayKetThuc: new Date('2026-12-31'),
        trangThai: 'hoat_dong',
      },
    });
    cleanupPromoIds.push(giantPromo.id);

    // Apply 2,000,000 discount to small subtotal 400,000 VNĐ
    const valGiant = await adminPromotionService.validatePromotionService({
      code: giantPromoCode,
      subtotal: 400000,
    });
    check(valGiant.valid === true, 'Giant voucher on smaller subtotal is valid');
    check(valGiant.discountAmount === 400000, `discountAmount is capped at subtotal 400000 (got ${valGiant.discountAmount})`);
    check(valGiant.finalAmount === 0, `finalAmount is strictly 0 and NOT negative (got ${valGiant.finalAmount})`);
    check(valGiant.finalTotal === 0, `finalTotal is strictly 0 (got ${valGiant.finalTotal})`);

    // Extreme edge: Subtotal 0 on voucher
    const valZeroSubtotal = await adminPromotionService.validatePromotionService({
      code: giantPromoCode,
      subtotal: 0,
    });
    check(valZeroSubtotal.valid === true, 'Voucher on subtotal 0 is handled cleanly');
    check(valZeroSubtotal.discountAmount === 0, 'Discount amount on subtotal 0 is 0');
    check(valZeroSubtotal.finalAmount === 0, 'Final amount on subtotal 0 is 0');

    // Extreme edge: Negative subtotal (adversarial payload)
    const valNegSubtotal = await adminPromotionService.validatePromotionService({
      code: giantPromoCode,
      subtotal: -100000,
    });
    check(valNegSubtotal.finalAmount === 0, `Negative subtotal is clamped to 0 finalAmount (got ${valNegSubtotal.finalAmount})`);
    check(valNegSubtotal.discountAmount === 0, 'Negative subtotal discountAmount is 0');

    // 2.6 Percentage discount edge: 150% discount on 500,000 VNĐ
    const over100PromoCode = `PCT150_${Date.now().toString().slice(-6)}`;
    const over100Promo = await prisma.khuyenMai.create({
      data: {
        maKhuyenMai: over100PromoCode,
        tenChuongTrinh: 'Voucher 150%',
        loaiGiam: 'phan_tram',
        giaTriGiam: 150,
        ngayBatDau: new Date('2026-01-01'),
        ngayKetThuc: new Date('2026-12-31'),
        trangThai: 'hoat_dong',
      },
    });
    cleanupPromoIds.push(over100Promo.id);

    const val150 = await adminPromotionService.validatePromotionService({
      code: over100PromoCode,
      subtotal: 600000,
    });
    check(val150.valid === true, '150% voucher evaluates successfully');
    check(val150.discountAmount === 600000, `150% discount capped at subtotal 600000 (got ${val150.discountAmount})`);
    check(val150.finalAmount === 0, `150% discount finalAmount is strictly 0 (got ${val150.finalAmount})`);

    // 2.7 Case and whitespace insensitivity
    const valWhitespace = await adminPromotionService.validatePromotionService({
      code: `  ${giantPromoCode.toLowerCase()}  `,
      subtotal: 500000,
    });
    check(valWhitespace.valid === true, 'Voucher code validation is case and whitespace insensitive');

    // 2.8 HTTP validation endpoint for Receptionist
    const httpValRes = await fetch(`http://localhost:${PORT}/api/v1/receptionist/promotions/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receptionistToken}`,
      },
      body: JSON.stringify({
        code: giantPromoCode,
        subtotal: 350000,
      }),
    });
    const httpValData = await httpValRes.json();
    check(httpValRes.status === 200, 'POST /api/v1/receptionist/promotions/validate returns 200');
    check(httpValData.data.valid === true, 'HTTP response valid === true');
    check(httpValData.data.discountAmount === 350000, 'HTTP response discount capped at subtotal 350000');
    check(httpValData.data.finalAmount === 0, 'HTTP response finalAmount === 0');

    // 2.9 Edge case: Empty voucher code
    const valEmptyCode = await adminPromotionService.validatePromotionService({
      code: '',
      subtotal: 500000,
    });
    check(valEmptyCode.valid === false, 'Empty voucher code returns valid === false');
    check(valEmptyCode.discountAmount === 0, 'Empty voucher code discount is 0');
    check(valEmptyCode.finalAmount === 500000, 'Empty voucher code preserves full subtotal');

    // 2.10 Edge case: Fractional percentage discount (e.g. 12.5% on 800,000 = 100,000)
    const floatPromoCode = `PCT_FLOAT_${Date.now().toString().slice(-6)}`;
    const floatPromo = await prisma.khuyenMai.create({
      data: {
        maKhuyenMai: floatPromoCode,
        tenChuongTrinh: 'Voucher 12.5% Float Test',
        loaiGiam: 'phan_tram',
        giaTriGiam: 12.5,
        ngayBatDau: new Date('2026-01-01'),
        ngayKetThuc: new Date('2026-12-31'),
        trangThai: 'hoat_dong',
      },
    });
    cleanupPromoIds.push(floatPromo.id);

    const valFloat = await adminPromotionService.validatePromotionService({
      code: floatPromoCode,
      subtotal: 800000,
    });
    check(valFloat.valid === true, 'Fractional percentage voucher valid === true');
    check(valFloat.discountAmount === 100000, `Fractional percentage calculated accurately: 100000 (got ${valFloat.discountAmount})`);
    check(valFloat.finalAmount === 700000, `Fractional percentage finalAmount: 700000 (got ${valFloat.finalAmount})`);

    // ========================================================================
    // CHALLENGE 3: Deleted Variant Item Endpoints Strictly 404
    // ========================================================================
    console.log('\n--- CHALLENGE 3: DELETED VARIANT ITEM ENDPOINTS RETURN 404 ---');

    const testSvc = await prisma.dichVu.findFirst();
    const svcId = testSvc ? testSvc.id : '00000000-0000-0000-0000-000000000001';
    const fakeItemId = '00000000-0000-0000-0000-000000000002';

    // 3.1 POST /api/v1/admin/services/:id/items
    const resPostItem = await fetch(`http://localhost:${PORT}/api/v1/admin/services/${svcId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        tenChiTiet: 'Biến thể thử nghiệm',
        gia: 150000,
        donViTinh: 'Răng',
      }),
    });
    check(resPostItem.status === 404, `POST /api/v1/admin/services/:id/items strictly returns 404 Not Found (got ${resPostItem.status})`);

    // 3.2 PUT /api/v1/admin/services/items/:itemId
    const resPutItem = await fetch(`http://localhost:${PORT}/api/v1/admin/services/items/${fakeItemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        tenChiTiet: 'Cập nhật biến thể',
        gia: 200000,
      }),
    });
    check(resPutItem.status === 404, `PUT /api/v1/admin/services/items/:itemId strictly returns 404 Not Found (got ${resPutItem.status})`);

    // 3.3 PATCH /api/v1/admin/services/items/:itemId/status
    const resPatchItem = await fetch(`http://localhost:${PORT}/api/v1/admin/services/items/${fakeItemId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'ngung_hoat_dong',
      }),
    });
    check(resPatchItem.status === 404, `PATCH /api/v1/admin/services/items/:itemId/status strictly returns 404 Not Found (got ${resPatchItem.status})`);

    // 3.4 GET /api/v1/admin/services/:id/items
    const resGetItems = await fetch(`http://localhost:${PORT}/api/v1/admin/services/${svcId}/items`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    check(resGetItems.status === 404, `GET /api/v1/admin/services/:id/items strictly returns 404 Not Found (got ${resGetItems.status})`);

    // 3.5 DELETE /api/v1/admin/services/items/:itemId
    const resDeleteItem = await fetch(`http://localhost:${PORT}/api/v1/admin/services/items/${fakeItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    check(resDeleteItem.status === 404, `DELETE /api/v1/admin/services/items/:itemId strictly returns 404 Not Found (got ${resDeleteItem.status})`);

    // ========================================================================
    // CHALLENGE 4: Direct Service Creation Edge Cases
    // ========================================================================
    console.log('\n--- CHALLENGE 4: DIRECT SERVICE CREATION EDGE CASES ---');

    // 4.1 Create direct service with price 0 (promotional / free consultation)
    const resZeroPrice = await fetch(`http://localhost:${PORT}/api/v1/admin/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Khám tư vấn miễn phí ${Date.now()}`,
        price: 0,
        unit: 'Lượt',
        description: 'Dịch vụ giá 0đ hợp lệ',
      }),
    });
    const dataZeroPrice = await resZeroPrice.json();
    check(resZeroPrice.status === 201 || resZeroPrice.status === 200, `Create service with price 0 returns 200/201 (got ${resZeroPrice.status})`);
    check(dataZeroPrice.data && dataZeroPrice.data.price === 0, 'Created service has price === 0');
    check(dataZeroPrice.data.gia === 0, 'Created service has gia === 0');
    if (dataZeroPrice.data?.id) cleanupServiceIds.push(dataZeroPrice.data.id);

    // 4.2 Extreme price (large number: 999,999,999 VNĐ)
    const resExtremePrice = await fetch(`http://localhost:${PORT}/api/v1/admin/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Trồng Răng Kim Cương Tỷ Phú ${Date.now()}`,
        price: 999999999,
        unit: 'Bộ',
      }),
    });
    const dataExtremePrice = await resExtremePrice.json();
    check(resExtremePrice.status === 201 || resExtremePrice.status === 200, `Create service with extreme price 999999999 succeeds (got ${resExtremePrice.status})`);
    check(dataExtremePrice.data && dataExtremePrice.data.price === 999999999, 'Extreme price preserved accurately without numeric distortion');
    if (dataExtremePrice.data?.id) cleanupServiceIds.push(dataExtremePrice.data.id);

    // 4.3 Negative price: MUST be rejected with HTTP 400
    const resNegPrice = await fetch(`http://localhost:${PORT}/api/v1/admin/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Dịch vụ Giá Âm ${Date.now()}`,
        price: -50000,
        unit: 'Lần',
      }),
    });
    check(resNegPrice.status === 400, `Create service with negative price returns HTTP 400 (got ${resNegPrice.status})`);

    // 4.4 Missing name: neither name nor tenDichVu provided
    const resMissingName = await fetch(`http://localhost:${PORT}/api/v1/admin/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        price: 200000,
        unit: 'Lần',
      }),
    });
    check(resMissingName.status === 400, `Create service missing name returns HTTP 400 (got ${resMissingName.status})`);

    // 4.5 Empty/whitespace name: name with only spaces
    const resBlankName = await fetch(`http://localhost:${PORT}/api/v1/admin/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: '     ',
        price: 200000,
        unit: 'Lần',
      }),
    });
    check(resBlankName.status === 400, `Create service with whitespace name returns HTTP 400 (got ${resBlankName.status})`);

    // 4.6 Duplicate service code
    const dupCode = `DV_DUP_${Date.now().toString().slice(-6)}`;
    const resCreateFirst = await fetch(`http://localhost:${PORT}/api/v1/admin/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: dupCode,
        name: `Service Original ${Date.now()}`,
        price: 150000,
      }),
    });
    const dataFirst = await resCreateFirst.json();
    check(resCreateFirst.status === 201 || resCreateFirst.status === 200, 'Created base service for duplicate code test');
    if (dataFirst.data?.id) cleanupServiceIds.push(dataFirst.data.id);

    // Attempt second service with SAME code
    const resCreateSecond = await fetch(`http://localhost:${PORT}/api/v1/admin/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: dupCode,
        name: `Service Duplicate ${Date.now()}`,
        price: 350000,
      }),
    });
    check(
      resCreateSecond.status === 409,
      `Creating service with duplicate code returns HTTP 409 Conflict (got ${resCreateSecond.status})`
    );

    // Attempt to update a third service to use the duplicate code
    const resCreateThird = await fetch(`http://localhost:${PORT}/api/v1/admin/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Service Third ${Date.now()}`,
        price: 200000,
      }),
    });
    const dataThird = await resCreateThird.json();
    if (dataThird.data?.id) cleanupServiceIds.push(dataThird.data.id);

    const resUpdateDup = await fetch(`http://localhost:${PORT}/api/v1/admin/services/${dataThird.data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: dupCode,
      }),
    });
    check(
      resUpdateDup.status === 409,
      `Updating service to existing duplicate code returns HTTP 409 Conflict (got ${resUpdateDup.status})`
    );

    // 4.7 Invalid status
    const resBadStatus = await fetch(`http://localhost:${PORT}/api/v1/admin/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Dịch vụ trạng thái bậy',
        status: 'bi_xoa_vinh_vien',
      }),
    });
    check(resBadStatus.status === 400, `Invalid service status returns HTTP 400 (got ${resBadStatus.status})`);

    // 4.8 Negative duration
    const resNegDuration = await fetch(`http://localhost:${PORT}/api/v1/admin/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Dịch vụ thời lượng âm',
        estimatedDurationMinutes: -20,
      }),
    });
    check(resNegDuration.status === 400, `Negative duration returns HTTP 400 (got ${resNegDuration.status})`);

    // 4.9 Duration exceeding 1440 minutes (24 hours)
    const resExcessDuration = await fetch(`http://localhost:${PORT}/api/v1/admin/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Dịch vụ thời lượng quá 24h',
        estimatedDurationMinutes: 5000,
      }),
    });
    check(resExcessDuration.status === 400, `Excessive duration (>1440 min) returns HTTP 400 (got ${resExcessDuration.status})`);

    // ========================================================================
    // CHALLENGE 5: Doctors Overview Date Boundaries & Edge Cases
    // ========================================================================
    console.log('\n--- CHALLENGE 5: DOCTORS OVERVIEW BOUNDARIES & STRESS ---');

    // 5.1 Invalid date format string
    const resInvalidDate = await fetch(`http://localhost:${PORT}/api/v1/admin/work-shifts/doctors-overview?date=not-a-valid-date`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    check(resInvalidDate.status === 400, `Query with 'not-a-valid-date' returns HTTP 400 (got ${resInvalidDate.status})`);

    const resInvalidFormat = await fetch(`http://localhost:${PORT}/api/v1/admin/work-shifts/doctors-overview?date=08-11-2026`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    check(resInvalidFormat.status === 400, `Query with DD-MM-YYYY format returns HTTP 400 (got ${resInvalidFormat.status})`);

    // 5.2 Past date query (e.g. 2015-05-10)
    const resPastDate = await fetch(`http://localhost:${PORT}/api/v1/admin/work-shifts/doctors-overview?date=2015-05-10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataPastDate = await resPastDate.json();
    check(resPastDate.status === 200, `Query with past date 2015-05-10 returns HTTP 200 (got ${resPastDate.status})`);
    check(Array.isArray(dataPastDate.data), 'Past date returns doctor array');
    if (dataPastDate.data.length > 0) {
      const pastDoc = dataPastDate.data[0];
      check(pastDoc.dailyShiftsCount === 0, `Past date 2015-05-10 dailyShiftsCount is 0 (got ${pastDoc.dailyShiftsCount})`);
      check(pastDoc.weeklyShiftsCount === 0, `Past date weeklyShiftsCount is 0 (got ${pastDoc.weeklyShiftsCount})`);
      check(pastDoc.shifts.length === 0, 'Past date shifts array is empty');
    }

    // 5.3 Sunday vs Monday week boundaries
    // Test known week: 2026-11-02 (Monday) to 2026-11-08 (Sunday)
    const resMonday = await fetch(`http://localhost:${PORT}/api/v1/admin/work-shifts/doctors-overview?date=2026-11-02`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataMonday = await resMonday.json();
    check(resMonday.status === 200, 'Query on Monday 2026-11-02 returns HTTP 200');

    const resSunday = await fetch(`http://localhost:${PORT}/api/v1/admin/work-shifts/doctors-overview?date=2026-11-08`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataSunday = await resSunday.json();
    check(resSunday.status === 200, 'Query on Sunday 2026-11-08 returns HTTP 200');

    const resWednesday = await fetch(`http://localhost:${PORT}/api/v1/admin/work-shifts/doctors-overview?date=2026-11-04`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataWednesday = await resWednesday.json();
    check(resWednesday.status === 200, 'Query on Wednesday 2026-11-04 returns HTTP 200');

    // Invariant: weeklyShiftsCount must be identical across Monday, Wednesday, and Sunday for EVERY doctor!
    check(dataMonday.data.length === dataSunday.data.length, 'Doctor count identical between Monday and Sunday query');
    check(dataMonday.data.length === dataWednesday.data.length, 'Doctor count identical on Wednesday query');

    let allWeeklyCountsMatched = true;
    let allWeeklyShiftIdsMatched = true;
    for (let i = 0; i < dataMonday.data.length; i++) {
      const docMon = dataMonday.data[i];
      const docSun = dataSunday.data.find((d) => d.doctorId === docMon.doctorId);
      const docWed = dataWednesday.data.find((d) => d.doctorId === docMon.doctorId);

      if (!docSun || !docWed) {
        allWeeklyCountsMatched = false;
        break;
      }

      if (docMon.weeklyShiftsCount !== docSun.weeklyShiftsCount || docMon.weeklyShiftsCount !== docWed.weeklyShiftsCount) {
        console.error(`Mismatch for doctor ${docMon.doctorName}: Mon=${docMon.weeklyShiftsCount}, Wed=${docWed.weeklyShiftsCount}, Sun=${docSun.weeklyShiftsCount}`);
        allWeeklyCountsMatched = false;
      }

      const monShiftIds = docMon.shifts.map((s) => s.id).sort().join(',');
      const sunShiftIds = docSun.shifts.map((s) => s.id).sort().join(',');
      const wedShiftIds = docWed.shifts.map((s) => s.id).sort().join(',');
      if (monShiftIds !== sunShiftIds || monShiftIds !== wedShiftIds) {
        allWeeklyShiftIdsMatched = false;
      }
    }

    check(allWeeklyCountsMatched, 'Week Invariant: weeklyShiftsCount strictly IDENTICAL across Monday, Wednesday, and Sunday');
    check(allWeeklyShiftIdsMatched, 'Week Invariant: weekly shift ID sets strictly IDENTICAL across Monday, Wednesday, and Sunday');

    // 5.4 Cross-month week boundary: Saturday 2026-10-31 vs Sunday 2026-11-01
    // Week: Monday 2026-10-26 to Sunday 2026-11-01
    const resOct31 = await fetch(`http://localhost:${PORT}/api/v1/admin/work-shifts/doctors-overview?date=2026-10-31`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const resNov01 = await fetch(`http://localhost:${PORT}/api/v1/admin/work-shifts/doctors-overview?date=2026-11-01`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    check(resOct31.status === 200, 'Cross-month Saturday 2026-10-31 returns 200');
    check(resNov01.status === 200, 'Cross-month Sunday 2026-11-01 returns 200');

    const dataOct31 = await resOct31.json();
    const dataNov01 = await resNov01.json();
    let crossMonthMatched = true;
    for (let i = 0; i < dataOct31.data.length; i++) {
      const docOct = dataOct31.data[i];
      const docNov = dataNov01.data.find((d) => d.doctorId === docOct.doctorId);
      if (!docNov || docOct.weeklyShiftsCount !== docNov.weeklyShiftsCount) {
        crossMonthMatched = false;
        break;
      }
    }
    check(crossMonthMatched, 'Cross-month boundary (2026-10-31 vs 2026-11-01) produces identical weekly shift counts');

    // 5.5 Leap Day boundary (2024-02-29)
    const resLeapDay = await fetch(`http://localhost:${PORT}/api/v1/admin/work-shifts/doctors-overview?date=2024-02-29`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    check(resLeapDay.status === 200, `Leap day query (2024-02-29) returns HTTP 200 (got ${resLeapDay.status})`);
    const dataLeapDay = await resLeapDay.json();
    check(Array.isArray(dataLeapDay.data), 'Leap day query successfully returned doctors array without date parse errors');

    // 5.6 Omitted date query (defaults to current date in Asia/Ho_Chi_Minh)
    const resNoDate = await fetch(`http://localhost:${PORT}/api/v1/admin/work-shifts/doctors-overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    check(resNoDate.status === 200, `Omitted date query defaults to current week and returns HTTP 200 (got ${resNoDate.status})`);
    const dataNoDate = await resNoDate.json();
    check(Array.isArray(dataNoDate.data), 'Omitted date query returns doctors array');

    // ========================================================================
    // CHALLENGE 6: Database 3NF Integrity & View Verification
    // ========================================================================
    console.log('\n--- CHALLENGE 6: DATABASE 3NF INTEGRITY & VIEW VERIFICATION ---');

    // 6.1 Check for orphaned records in dich_vu_dieu_tri
    const orphanDichVuDieuTri = await prisma.$queryRaw`
      SELECT count(*)::int as count
      FROM dich_vu_dieu_tri dvdt
      LEFT JOIN dich_vu dv ON dvdt.dich_vu_id = dv.id
      WHERE dv.id IS NULL;
    `;
    check(orphanDichVuDieuTri[0].count === 0, 'No orphaned records in dich_vu_dieu_tri (0 rows without valid dich_vu_id)');

    // 6.2 Check for orphaned records in chi_tiet_hoa_don (where dich_vu_id is populated)
    const orphanChiTietHoaDon = await prisma.$queryRaw`
      SELECT count(*)::int as count
      FROM chi_tiet_hoa_don cthd
      LEFT JOIN dich_vu dv ON cthd.dich_vu_id = dv.id
      WHERE cthd.dich_vu_id IS NOT NULL AND dv.id IS NULL;
    `;
    check(orphanChiTietHoaDon[0].count === 0, 'No orphaned records in chi_tiet_hoa_don (0 rows with invalid dich_vu_id)');

    // 6.3 Check for orphaned records in hoa_don
    const orphanHoaDon = await prisma.$queryRaw`
      SELECT count(*)::int as count
      FROM hoa_don hd
      LEFT JOIN lich_hen lh ON hd.lich_hen_id = lh.id
      WHERE lh.id IS NULL;
    `;
    check(orphanHoaDon[0].count === 0, 'No orphaned records in hoa_don (0 rows with invalid lich_hen_id)');

    // 6.4 Check for orphaned records in ca_lam_viec
    const orphanCaLamViec = await prisma.$queryRaw`
      SELECT count(*)::int as count
      FROM ca_lam_viec clv
      LEFT JOIN nha_si ns ON clv.nha_si_id = ns.id
      WHERE ns.id IS NULL;
    `;
    check(orphanCaLamViec[0].count === 0, 'No orphaned records in ca_lam_viec (0 rows with invalid nha_si_id)');

    // 6.5 Verify view v_dich_vu_da_thanh_toan
    const viewMetrics = await prisma.$queryRaw`
      SELECT 
        count(*)::int as total_rows,
        count(DISTINCT dich_vu_id)::int as distinct_services,
        COALESCE(sum(thanh_tien), 0)::numeric as total_revenue
      FROM v_dich_vu_da_thanh_toan;
    `;
    const viewSummary = viewMetrics[0];
    check(viewSummary.total_rows > 0, `View v_dich_vu_da_thanh_toan returns active data (${viewSummary.total_rows} rows)`);
    check(Number(viewSummary.total_revenue) > 0, `View v_dich_vu_da_thanh_toan reports revenue: ${Number(viewSummary.total_revenue).toLocaleString()} VNĐ`);

    // Verify view has ZERO unpaid invoice rows
    const unpaidInView = await prisma.$queryRaw`
      SELECT count(*)::int as count
      FROM v_dich_vu_da_thanh_toan v
      JOIN hoa_don hd ON v.hoa_don_id = hd.id
      WHERE hd.trang_thai_thanh_toan != 'da_thanh_toan';
    `;
    check(unpaidInView[0].count === 0, 'View Invariant: 0 rows in v_dich_vu_da_thanh_toan from unpaid invoices');

    // Verify all services in view exist in dich_vu
    const invalidServicesInView = await prisma.$queryRaw`
      SELECT count(*)::int as count
      FROM v_dich_vu_da_thanh_toan v
      LEFT JOIN dich_vu dv ON v.dich_vu_id = dv.id
      WHERE dv.id IS NULL;
    `;
    check(invalidServicesInView[0].count === 0, 'View Invariant: 0 rows in v_dich_vu_da_thanh_toan referencing missing dich_vu');

    // Verify arithmetic consistency in view: thanh_tien = so_luong * don_gia
    const mathMismatchInView = await prisma.$queryRaw`
      SELECT count(*)::int as count
      FROM (
        SELECT 
          dvdt.so_luong,
          dvdt.don_gia,
          (dvdt.don_gia * dvdt.so_luong)::NUMERIC(18, 2) AS calc_tien,
          v.thanh_tien
        FROM dich_vu_dieu_tri dvdt
        JOIN ho_so_benh_an hsba ON dvdt.ho_so_id = hsba.id
        JOIN hoa_don hd ON hsba.lich_hen_id = hd.lich_hen_id
        JOIN v_dich_vu_da_thanh_toan v ON v.hoa_don_id = hd.id AND v.dich_vu_id = dvdt.dich_vu_id
        WHERE hd.trang_thai_thanh_toan = 'da_thanh_toan'
          AND (dvdt.don_gia * dvdt.so_luong)::NUMERIC(18, 2) != v.thanh_tien
      ) mismatches;
    `;
    check(mathMismatchInView[0].count === 0, 'View Invariant: All treatment services branch calculations match so_luong * don_gia exactly');

    // 6.6 Check for dangling dich_vu_id in san_pham (products mapped to services)
    const danglingProductServiceFk = await prisma.$queryRaw`
      SELECT count(*)::int as count
      FROM san_pham sp
      LEFT JOIN dich_vu dv ON sp.dich_vu_id = dv.id
      WHERE sp.dich_vu_id IS NOT NULL AND dv.id IS NULL;
    `;
    check(danglingProductServiceFk[0].count === 0, 'No dangling dich_vu_id references in san_pham (0 orphaned product links)');

    // 6.7 Verify mathematical conservation law across both view branches
    const b1Metrics = await prisma.$queryRaw`
      SELECT count(*)::int as c, sum((dvdt.don_gia * dvdt.so_luong)::numeric) as s 
      FROM dich_vu_dieu_tri dvdt 
      JOIN dich_vu dv ON dvdt.dich_vu_id = dv.id 
      JOIN ho_so_benh_an hsba ON dvdt.ho_so_id = hsba.id 
      JOIN hoa_don hd ON hsba.lich_hen_id = hd.lich_hen_id 
      WHERE hd.trang_thai_thanh_toan = 'da_thanh_toan';
    `;

    const b2Metrics = await prisma.$queryRaw`
      SELECT count(*)::int as c, sum((vtsd.don_gia * vtsd.so_luong)::numeric) as s 
      FROM vat_tu_su_dung vtsd 
      JOIN san_pham sp ON vtsd.san_pham_id = sp.id 
      JOIN dich_vu dv ON sp.dich_vu_id = dv.id 
      JOIN ho_so_benh_an hsba ON vtsd.ho_so_id = hsba.id 
      JOIN hoa_don hd ON hsba.lich_hen_id = hd.lich_hen_id 
      WHERE hd.trang_thai_thanh_toan = 'da_thanh_toan' AND sp.dich_vu_id IS NOT NULL;
    `;

    const branch1Count = b1Metrics[0].c;
    const branch2Count = b2Metrics[0].c;
    const branch1Revenue = Number(b1Metrics[0].s);
    const branch2Revenue = Number(b2Metrics[0].s);
    const viewTotalCount = viewSummary.total_rows;
    const viewTotalRevenue = Number(viewSummary.total_revenue);

    check(
      branch1Count + branch2Count === viewTotalCount,
      `View Conservation Law (Rows): Branch 1 (${branch1Count}) + Branch 2 (${branch2Count}) == View (${viewTotalCount})`
    );
    check(
      branch1Revenue + branch2Revenue === viewTotalRevenue,
      `View Conservation Law (Revenue): Branch 1 (${branch1Revenue.toLocaleString()}đ) + Branch 2 (${branch2Revenue.toLocaleString()}đ) == View (${viewTotalRevenue.toLocaleString()}đ)`
    );

    console.log('\n================================================================');
    console.log(`🎉 ALL EMPIRICAL CHALLENGES PASSED: ${passedChecks}/${totalChecks}`);
    console.log('================================================================');
  } finally {
    // Teardown: Clean up test promotions
    if (cleanupPromoIds.length > 0) {
      await prisma.khuyenMai.deleteMany({
        where: { id: { in: cleanupPromoIds } },
      });
      console.log(`Cleaned up ${cleanupPromoIds.length} test promotions.`);
    }

    // Teardown: Clean up test services
    if (cleanupServiceIds.length > 0) {
      await prisma.dichVu.deleteMany({
        where: { id: { in: cleanupServiceIds } },
      });
      console.log(`Cleaned up ${cleanupServiceIds.length} test services.`);
    }

    if (server) {
      server.close();
    }
    await prisma.$disconnect();
  }
}

runAdversarialHarness()
  .then(() => {
    console.log('Adversarial Harness Completed Successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('ADVERSARIAL HARNESS FAILURE DETECTED:', err);
    process.exit(1);
  });
