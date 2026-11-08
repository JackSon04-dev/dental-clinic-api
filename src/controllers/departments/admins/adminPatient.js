import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminPatientService from '../../../services/departments/admins/adminPatientService.js';

/**
 * getPatients
 * [GET] /api/v1/admin/patients
 * Lấy danh sách hồ sơ bệnh nhân (hỗ trợ phân trang và tìm kiếm theo mã BN hoặc SĐT)
 */
export const getPatients = asyncHandler(async (req, res) => {
  const data = await adminPatientService.getPatientsListService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách hồ sơ bệnh nhân thành công',
    data,
  });
});

/**
 * getPatientDetail
 * [GET] /api/v1/admin/patients/:id
 * Lấy thông tin chi tiết hồ sơ bệnh nhân theo UUID
 */
export const getPatientDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await adminPatientService.getPatientDetailService(id);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy chi tiết hồ sơ bệnh nhân thành công',
    data,
  });
});

/**
 * updatePatient
 * [PUT] /api/v1/admin/patients/:id
 * Cập nhật thông tin hồ sơ bệnh nhân theo UUID
 */
export const updatePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await adminPatientService.updatePatientService(id, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật hồ sơ bệnh nhân thành công',
    data,
  });
});

/**
 * createPatient
 * [POST] /api/v1/admin/patients
 * Tạo mới hồ sơ bệnh nhân
 */
export const createPatient = asyncHandler(async (req, res) => {
  const data = await adminPatientService.createPatientService(req.body);

  return res.status(201).json({
    success: true,
    status: 201,
    message: 'Tạo mới hồ sơ bệnh nhân thành công',
    data: {
      patient: data,
      ...data,
    },
  });
});
