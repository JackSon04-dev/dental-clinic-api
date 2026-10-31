import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminWorkShiftService from '../../../services/departments/admins/adminWorkShiftService.js';

/**
 * getWorkShiftsMatrix
 * [GET] /api/v1/admin/work-shifts
 * Lấy ma trận ca làm việc tuần (mặc định tuần hiện tại), tự động cập nhật vắng mặt sau 15 phút
 */
export const getWorkShiftsMatrix = asyncHandler(async (req, res) => {
  const data = await adminWorkShiftService.getWorkShiftsMatrixService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách ca làm việc tuần thành công',
    data,
  });
});

/**
 * updateWorkShiftStatus
 * [PATCH] /api/v1/admin/work-shifts/:id/status
 * Cập nhật trạng thái có mặt / vắng mặt cho ca làm việc
 */
export const updateWorkShiftStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminWorkShiftService.updateWorkShiftStatusService(id, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật trạng thái ca làm việc thành công',
    data,
  });
});

/**
 * generateWorkShiftsFromTemplate
 * [POST] /api/v1/admin/work-shifts/generate
 * Tự động khởi tạo 56 ca làm việc tuần từ Khung mẫu
 */
export const generateWorkShiftsFromTemplate = asyncHandler(async (req, res) => {
  const data = await adminWorkShiftService.generateWorkShiftsFromTemplateService(req.body);

  return res.status(201).json({
    success: true,
    status: 201,
    message: data.message,
    data,
  });
});
