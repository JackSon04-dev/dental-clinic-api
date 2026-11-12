import prisma from '../src/config/prisma.js';
import { extractDegreeAndName, formatDoctorFullName } from '../src/constants/academicDegree.js';

async function migrateDoctorDegrees() {
  console.log('--- STARTING DOCTOR DEGREE MIGRATION ---');
  const doctors = await prisma.nhaSi.findMany();
  console.log(`Tìm thấy ${doctors.length} bác sĩ trong CSDL.`);

  let updatedCount = 0;
  for (const doc of doctors) {
    const { degree, name } = extractDegreeAndName(doc.hoTen);
    if (degree !== doc.hocVi || name !== doc.hoTen) {
      console.log(`Cập nhật bác sĩ [${doc.maNhaSi}]:`);
      console.log(`  Trước: hoTen="${doc.hoTen}", hocVi="${doc.hocVi}"`);
      console.log(`  Sau  : hoTen="${name}", hocVi="${degree}" (Hiển thị: "${formatDoctorFullName(degree, name)}")`);

      await prisma.nhaSi.update({
        where: { id: doc.id },
        data: {
          hoTen: name,
          hocVi: degree,
        },
      });
      updatedCount++;
    }
  }

  console.log(`--- HOÀN TẤT: Đã chuẩn hóa ${updatedCount}/${doctors.length} bác sĩ ---`);
}

migrateDoctorDegrees()
  .catch((err) => {
    console.error('Lỗi khi migrate học vị bác sĩ:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
