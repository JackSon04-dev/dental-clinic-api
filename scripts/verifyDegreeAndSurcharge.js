import assert from 'assert';
import {
  extractDegreeAndName,
  getDoctorDegreeSurcharge,
  formatDoctorFullName,
  ACADEMIC_DEGREES,
} from '../src/constants/academicDegree.js';
import { getDoctorSalaryBonusesService } from '../src/services/departments/admins/doctorSalaryService.js';
import prisma from '../src/config/prisma.js';

async function runTests() {
  console.log('=== RUNNING TESTS: ACADEMIC DEGREE, SURCHARGE & BONUS ===');

  // Test 1: Surcharge Progressive Scale
  console.log('1. Testing Surcharge Progressive Scale:');
  assert.strictEqual(getDoctorDegreeSurcharge('BS'), 0, 'BS surcharge must be 0');
  assert.strictEqual(getDoctorDegreeSurcharge('ThS'), 100000, 'ThS surcharge must be 100,000');
  assert.strictEqual(getDoctorDegreeSurcharge('BSCKI'), 100000, 'BSCKI surcharge must be 100,000');
  assert.strictEqual(getDoctorDegreeSurcharge('BSCKII'), 200000, 'BSCKII surcharge must be 200,000');
  assert.strictEqual(getDoctorDegreeSurcharge('TS'), 200000, 'TS surcharge must be 200,000');
  assert.strictEqual(getDoctorDegreeSurcharge('PGS'), 300000, 'PGS surcharge must be 300,000');
  assert.strictEqual(getDoctorDegreeSurcharge('GS'), 300000, 'GS surcharge must be 300,000');
  console.log('   ✓ Progressive scale verified (BS: 0, ThS/BSCKI: 100k, BSCKII/TS: 200k, PGS/GS: 300k)');

  // Test 2: Name & Degree Extraction
  console.log('2. Testing Name & Degree Extraction:');
  const t1 = extractDegreeAndName('BSCKII. Trần Minh Quang');
  assert.strictEqual(t1.degree, 'BSCKII');
  assert.strictEqual(t1.name, 'Trần Minh Quang');

  const t2 = extractDegreeAndName('ThS.BS. Nguyễn Hoàng Nam');
  assert.strictEqual(t2.degree, 'ThS');
  assert.strictEqual(t2.name, 'Nguyễn Hoàng Nam');

  const t3 = extractDegreeAndName('PGS.TS. Lê Văn Tám');
  assert.strictEqual(t3.degree, 'PGS');
  assert.strictEqual(t3.name, 'Lê Văn Tám');

  const t4 = extractDegreeAndName('Võ Thị Sáu');
  assert.strictEqual(t4.degree, 'BS');
  assert.strictEqual(t4.name, 'Võ Thị Sáu');
  console.log('   ✓ Name and degree extraction verified');

  // Test 3: Title FullName Formatter
  console.log('3. Testing Title FullName Formatter:');
  assert.strictEqual(formatDoctorFullName('BS', 'Nguyễn Văn A'), 'BS. Nguyễn Văn A');
  assert.strictEqual(formatDoctorFullName('ThS', 'Nguyễn Văn A'), 'ThS. Nguyễn Văn A');
  assert.strictEqual(formatDoctorFullName('BSCKI', 'Nguyễn Văn A'), 'BSCKI. Nguyễn Văn A');
  assert.strictEqual(formatDoctorFullName('BSCKII', 'Nguyễn Văn A'), 'BSCKII. Nguyễn Văn A');
  assert.strictEqual(formatDoctorFullName('TS', 'Nguyễn Văn A'), 'TS. Nguyễn Văn A');
  assert.strictEqual(formatDoctorFullName('PGS', 'Nguyễn Văn A'), 'PGS.TS. Nguyễn Văn A');
  assert.strictEqual(formatDoctorFullName('GS', 'Nguyễn Văn A'), 'GS.TS. Nguyễn Văn A');
  console.log('   ✓ Formatted display names verified');

  // Test 4: Database Doctor Records Integrity
  console.log('4. Testing Database Doctor Records Integrity:');
  const doctors = await prisma.nhaSi.findMany();
  assert(doctors.length > 0, 'Database should contain doctor records');
  for (const doc of doctors) {
    assert(doc.hocVi, `Doctor ${doc.maNhaSi} must have hocVi`);
    assert(ACADEMIC_DEGREES[doc.hocVi], `Doctor ${doc.maNhaSi} has invalid hocVi: ${doc.hocVi}`);
    assert(!doc.hoTen.startsWith('BS.') && !doc.hoTen.startsWith('ThS.'), `Doctor ${doc.maNhaSi} hoTen must not have prefix`);
  }
  console.log(`   ✓ All ${doctors.length} doctors have clean hoTen and valid hocVi in PostgreSQL`);

  // Test 5: Dynamic Salary & Bonus Aggregation Service
  console.log('5. Testing Dynamic Salary & Bonus Aggregation Service:');
  const salaryReport = await getDoctorSalaryBonusesService();
  assert(salaryReport.period, 'Must have period metadata');
  assert(typeof salaryReport.totalBonusPaid === 'number', 'Total bonus must be a number');
  assert(Array.isArray(salaryReport.reports), 'Reports must be an array');
  assert.strictEqual(salaryReport.totalDoctors, doctors.length, 'Doctor count must match');
  console.log(`   ✓ Bonus aggregate calculated successfully: total bonus = ${salaryReport.totalBonusPaid.toLocaleString('vi-VN')} VNĐ`);

  console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

runTests()
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
