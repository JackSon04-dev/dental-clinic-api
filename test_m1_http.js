import dotenv from 'dotenv';
dotenv.config();
import app from './src/app.js';
import prisma from './src/config/prisma.js';
import jwt from 'jsonwebtoken';

const PORT = 5099;
const JWT_SECRET = process.env.JWT_SECRET || 'dental_clinic_jwt_super_secret_key_2026';

function makeToken(role, username = 'testuser', profileId = null) {
  return jwt.sign(
    {
      userId: '00000000-0000-0000-0000-000000000001',
      username,
      role,
      profileId: profileId || '00000000-0000-0000-0000-000000000001',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

let server;

async function runHttpTests() {
  console.log('--- STARTING HTTP API INTEGRATION TESTS ---');
  
  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Test server running on port ${PORT}`);
      resolve();
    });
  });

  const adminToken = makeToken('ADMIN', 'admin');
  const receptionistToken = makeToken('LE_TAN', 'letan');
  const patientToken = makeToken('BENH_NHAN', 'benhnhan');

  let passed = 0;
  let total = 0;

  function check(cond, desc) {
    total++;
    if (!cond) {
      console.error(`❌ HTTP TEST FAILED: ${desc}`);
      throw new Error(desc);
    }
    passed++;
    console.log(`✅ HTTP TEST PASSED: ${desc}`);
  }

  try {
    // 1. GET /api/v1/admin/services
    const resServices = await fetch(`http://localhost:${PORT}/api/v1/admin/services`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataServices = await resServices.json();
    check(resServices.status === 200, 'GET /api/v1/admin/services status 200');
    check(Array.isArray(dataServices.data.services), 'Returned services array');
    const firstService = dataServices.data.services[0];
    check(firstService && typeof firstService.gia === 'number', 'Service has direct gia property');

    // 2. POST /api/v1/admin/promotions/validate (Accessible by ADMIN & LE_TAN)
    const resPromoAdmin = await fetch(`http://localhost:${PORT}/api/v1/admin/promotions/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ code: 'KM_HE2026', subtotal: 1000000 }),
    });
    const dataPromoAdmin = await resPromoAdmin.json();
    check(resPromoAdmin.status === 200, 'POST /api/v1/admin/promotions/validate (ADMIN) status 200');
    check(dataPromoAdmin.data.valid === true, 'KM_HE2026 is valid for Admin');

    // Receptionist access
    const resPromoReception = await fetch(`http://localhost:${PORT}/api/v1/receptionist/promotions/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receptionistToken}`,
      },
      body: JSON.stringify({ code: 'KM_HE2026', subtotal: 1000000 }),
    });
    const dataPromoReception = await resPromoReception.json();
    check(resPromoReception.status === 200, 'POST /api/v1/receptionist/promotions/validate (LE_TAN) status 200');
    check(dataPromoReception.data.valid === true, 'KM_HE2026 is valid for Receptionist');

    // Patient access rejected (RBAC)
    const resPromoPatient = await fetch(`http://localhost:${PORT}/api/v1/admin/promotions/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({ code: 'KM_HE2026', subtotal: 1000000 }),
    });
    check(resPromoPatient.status === 403, 'POST /api/v1/admin/promotions/validate (BENH_NHAN) status 403 Forbidden');

    // 3. GET /api/v1/admin/work-shifts/doctors-overview
    const resShifts = await fetch(`http://localhost:${PORT}/api/v1/admin/work-shifts/doctors-overview?date=2026-11-08`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataShifts = await resShifts.json();
    check(resShifts.status === 200, 'GET /api/v1/admin/work-shifts/doctors-overview status 200');
    check(Array.isArray(dataShifts.data), 'Doctors overview data is an array');

    // 4. GET /api/v1/admin/work-shifts/:id/appointments
    const shift = await prisma.caLamViec.findFirst();
    if (shift) {
      const resShiftApp = await fetch(`http://localhost:${PORT}/api/v1/admin/work-shifts/${shift.id}/appointments`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const dataShiftApp = await resShiftApp.json();
      check(resShiftApp.status === 200, 'GET /api/v1/admin/work-shifts/:id/appointments status 200');
      check(dataShiftApp.data.shiftId === shift.id, 'Shift drill-down returned matching shiftId');
    }

    // 5. Variant routes return 404
    const resVariant = await fetch(`http://localhost:${PORT}/api/v1/admin/services/00000000-0000-0000-0000-000000000001/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'Variant Item', price: 100000 }),
    });
    check(resVariant.status === 404, 'Variant route POST /items returns 404 Not Found');

    console.log(`\n🎉 ALL HTTP TESTS PASSED: ${passed}/${total}`);
  } finally {
    if (server) {
      server.close();
    }
  }
}

runHttpTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
