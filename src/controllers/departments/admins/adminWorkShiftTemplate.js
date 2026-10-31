import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminWorkShiftTemplateService from '../../../services/departments/admins/adminWorkShiftTemplateService.js';

/**
 * getWorkShiftTemplatesMatrix
 * [GET] /api/v1/admin/work-shift-templates
 * Lấy ma trận khung ca làm việc mẫu 1 tuần
 */
export const getWorkShiftTemplatesMatrix = asyncHandler(async (req, res) => {
  const data = await adminWorkShiftTemplateService.getWorkShiftTemplatesMatrixService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy ma trận khung ca làm việc mẫu thành công',
    data,
  });
});


/**
 * updateWorkShiftTemplateDoctor
 * [PUT] /api/v1/admin/work-shift-templates/:id
 * Thay đổi bác sĩ phụ trách một ca trong khung ca mẫu
 */
export const updateWorkShiftTemplateDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminWorkShiftTemplateService.updateWorkShiftTemplateDoctorService(id, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Thay đổi bác sĩ phụ trách ca mẫu thành công',
    data,
  });
});
