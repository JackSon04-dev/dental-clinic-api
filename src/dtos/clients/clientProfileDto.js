import Joi from 'joi';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation for Incoming Request Payload)
// ============================================================================

/**
 * clientUpdateProfileRequestSchema
 * Kiểm thực dữ liệu bệnh nhân tự cập nhật thông tin cá nhân của mình
 * CHỈ CHO PHÉP: fullName, phone, gender, dateOfBirth, address
 * CÁC TRƯỜNG Y TẾ & ĐỊNH DANH (tienSuBenh, diUng, maBenhNhan, scores...): Tự động loại bỏ (stripUnknown: true)
 */
export const clientUpdateProfileRequestSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(150).optional().messages({
    'string.empty': 'Họ và tên không được để trống',
    'string.min': 'Họ và tên phải có tối thiểu 2 ký tự',
    'string.max': 'Họ và tên tối đa 150 ký tự',
  }),
  phone: Joi.string()
    .trim()
    .pattern(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/)
    .optional()
    .messages({
      'string.empty': 'Số điện thoại không được để trống',
      'string.pattern.base': 'Số điện thoại không hợp lệ (yêu cầu định dạng 10 chữ số của Việt Nam, ví dụ 0901234567 hoặc +84901234567)',
    }),
  gender: Joi.string()
    .valid('nam', 'nu', 'khac', 'MALE', 'FEMALE', 'OTHER')
    .optional()
    .messages({
      'any.only': 'Giới tính chỉ chấp nhận: nam, nu hoặc khac (MALE, FEMALE, OTHER)',
    }),
  dateOfBirth: Joi.date()
    .iso()
    .max('now')
    .allow(null, '')
    .optional()
    .messages({
      'date.format': 'Ngày sinh không đúng định dạng chuẩn (YYYY-MM-DD)',
      'date.max': 'Ngày sinh không thể lớn hơn ngày hiện tại',
    }),
  address: Joi.string().trim().max(500).allow(null, '').optional().messages({
    'string.max': 'Địa chỉ tối đa 500 ký tự',
  }),
  avatarUrl: Joi.string().uri().allow(null, '').optional().messages({
    'string.uri': 'Đường dẫn ảnh đại diện không hợp lệ',
  }),
})
  .min(1)
  .messages({
    'object.min': 'Vui lòng cung cấp ít nhất một trường thông tin cần cập nhật (fullName, phone, gender, dateOfBirth, address, avatarUrl)',
  })
  .options({ stripUnknown: true });

// ============================================================================
// 2. HELPER FUNCTIONS & FORMATTERS
// ============================================================================

const formatGenderTitle = (gender) => {
  if (!gender) return 'Chưa xác định';
  const g = String(gender).toLowerCase();
  if (g === 'nam' || g === 'male') return 'Nam';
  if (g === 'nu' || g === 'female') return 'Nữ';
  return 'Khác';
};

const normalizeGenderForDb = (gender) => {
  if (!gender) return null;
  const g = String(gender).toLowerCase();
  if (g === 'male' || g === 'nam') return 'nam';
  if (g === 'female' || g === 'nu') return 'nu';
  return 'khac';
};

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

// ============================================================================
// 3. RESPONSE SCHEMAS & SANITIZERS (Chuẩn 100% camelCase cho Frontend)
// ============================================================================

/**
 * clientProfileDetailResponseSchema
 * Format toàn bộ thông tin bệnh nhân cho màn hình Hồ sơ cá nhân (Client Profile)
 * Phân tách rõ ràng giữa thông tin cá nhân, thông tin lâm sàng (Read-only) và tài khoản
 */
export const clientProfileDetailResponseSchema = (patient) => {
  if (!patient) return null;

  const initialScore = patient.diemSucKhoeBanDau ?? 85;
  const currentScore = patient.diemSucKhoeHienTai ?? 95;
  const scoreDiff = currentScore - initialScore;
  const progressText = scoreDiff >= 0 ? `+${scoreDiff} điểm` : `${scoreDiff} điểm`;

  return {
    id: patient.id,
    patientCode: patient.maBenhNhan || null,
    fullName: patient.hoTen,
    phone: patient.sdt || '',
    email: patient.email || '',
    gender: patient.gioiTinh || 'khac',
    genderTitle: formatGenderTitle(patient.gioiTinh),
    dateOfBirth: patient.ngaySinh ? patient.ngaySinh.toISOString().slice(0, 10) : null,
    age: calculateAge(patient.ngaySinh),
    address: patient.diaChi || '',
    avatarUrl: patient.hinhAnhUrl || null,

    // Hồ sơ lâm sàng & Y tế (Do Bác sĩ / Hệ thống quản lý, Bệnh nhân chỉ xem)
    clinicalProfile: {
      medicalHistory: patient.tienSuBenh || null,
      allergies: patient.diUng || null,
      notes: patient.ghiChu || null,
      initialHealthScore: initialScore,
      currentHealthScore: currentScore,
      healthScoreProgress: progressText,
    },

    // Thông tin tài khoản định danh
    account: patient.taiKhoan
      ? {
          username: patient.taiKhoan.username,
          status: patient.taiKhoan.trangThai,
          statusTitle: patient.taiKhoan.trangThai === 'hoat_dong' ? 'Hoạt động' : 'Bị khóa',
        }
      : null,

    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
};

export { normalizeGenderForDb };

export default {
  clientUpdateProfileRequestSchema,
  clientProfileDetailResponseSchema,
  normalizeGenderForDb,
};

