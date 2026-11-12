export const ACADEMIC_DEGREES = {
  BS: { code: 'BS', label: 'Bác sĩ', prefix: 'BS.', surcharge: 0 },
  ThS: { code: 'ThS', label: 'Thạc sĩ', prefix: 'ThS.', surcharge: 100000 },
  BSCKI: { code: 'BSCKI', label: 'Bác sĩ CKI', prefix: 'BSCKI.', surcharge: 100000 },
  BSCKII: { code: 'BSCKII', label: 'Bác sĩ CKII', prefix: 'BSCKII.', surcharge: 200000 },
  TS: { code: 'TS', label: 'Tiến sĩ', prefix: 'TS.', surcharge: 200000 },
  PGS: { code: 'PGS', label: 'Phó Giáo sư', prefix: 'PGS.TS.', surcharge: 300000 },
  GS: { code: 'GS', label: 'Giáo sư', prefix: 'GS.TS.', surcharge: 300000 },
};

export const VALID_DEGREE_CODES = Object.keys(ACADEMIC_DEGREES);

/**
 * Lấy số tiền phụ thu theo học vị bác sĩ
 * @param {string} degreeCode
 * @returns {number}
 */
export const getDoctorDegreeSurcharge = (degreeCode) => {
  return ACADEMIC_DEGREES[degreeCode]?.surcharge || 0;
};

/**
 * Ghép danh xưng học vị và họ tên chuẩn hóa
 * @param {string} degreeCode
 * @param {string} fullName
 * @returns {string}
 */
export const formatDoctorFullName = (degreeCode, fullName) => {
  if (!fullName) return '';
  const cleanName = fullName.trim();
  const config = ACADEMIC_DEGREES[degreeCode] || ACADEMIC_DEGREES.BS;
  const prefixRegex = /^(BS\.|ThS\.|BSCKI\.|BSCKII\.|TS\.|PGS\.TS\.|GS\.TS\.|PGS\.|GS\.|BS|ThS|TS)\s+/i;
  const bareName = cleanName.replace(prefixRegex, '').trim();
  return `${config.prefix} ${bareName}`.trim();
};

/**
 * Tách tiền tố học vị và họ tên nếu người dùng nhập gộp
 * @param {string} inputName
 * @returns {{ degree: string, name: string }}
 */
export const extractDegreeAndName = (inputName) => {
  if (!inputName) return { degree: 'BS', name: '' };
  const str = inputName.trim();
  const patterns = [
    { regex: /^(PGS\.TS\.|PGS\.)\s*/i, degree: 'PGS' },
    { regex: /^(GS\.TS\.|GS\.)\s*/i, degree: 'GS' },
    { regex: /^BSCKII\.\s*/i, degree: 'BSCKII' },
    { regex: /^BSCKI\.\s*/i, degree: 'BSCKI' },
    { regex: /^(ThS\.BS\.|ThS\.)\s*/i, degree: 'ThS' },
    { regex: /^(TS\.BS\.|TS\.)\s*/i, degree: 'TS' },
    { regex: /^BS\.\s*/i, degree: 'BS' },
  ];

  for (const p of patterns) {
    if (p.regex.test(str)) {
      return {
        degree: p.degree,
        name: str.replace(p.regex, '').trim(),
      };
    }
  }

  return { degree: 'BS', name: str };
};
