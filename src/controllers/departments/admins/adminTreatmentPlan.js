import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminTreatmentPlanService from '../../../services/departments/admins/adminTreatmentPlanService.js';

/**
 * getTreatmentPlans
 * [GET] /api/v1/admin/treatment-plans
 * Lấy danh sách phác đồ mẫu (Level 0) có phân trang, bộ lọc và tìm kiếm
 */
export const getTreatmentPlans = asyncHandler(async (req, res) => {
  const data = await adminTreatmentPlanService.getTreatmentPlansListService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách phác đồ mẫu thành công',
    data,
  });
});

/**
 * getTreatmentPlanDetail
 * [GET] /api/v1/admin/treatment-plans/:id
 * Lấy chi tiết thông tin phác đồ mẫu kèm toàn bộ danh sách các giai đoạn con
 */
export const getTreatmentPlanDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminTreatmentPlanService.getTreatmentPlanDetailService(id);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy chi tiết phác đồ mẫu thành công',
    data,
  });
});

/**
 * createTreatmentPlan
 * [POST] /api/v1/admin/treatment-plans
 * Tạo mới phác đồ mẫu (Level 0) kèm danh sách giai đoạn ban đầu nếu có
 */
export const createTreatmentPlan = asyncHandler(async (req, res) => {
  const data = await adminTreatmentPlanService.createTreatmentPlanService(req.body);

  return res.status(201).json({
    success: true,
    status: 201,
    message: 'Tạo mới phác đồ mẫu thành công',
    data,
  });
});

/**
 * updateTreatmentPlan
 * [PUT] /api/v1/admin/treatment-plans/:id
 * Cập nhật thông tin phác đồ mẫu cha
 */
export const updateTreatmentPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminTreatmentPlanService.updateTreatmentPlanService(id, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật phác đồ mẫu thành công',
    data,
  });
});

/**
 * updateTreatmentPlanStatus
 * [PATCH] /api/v1/admin/treatment-plans/:id/status
 * Bật / tắt trạng thái hoạt động của phác đồ mẫu (hoat_dong <-> ngung_hoat_dong)
 */
export const updateTreatmentPlanStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const data = await adminTreatmentPlanService.updateTreatmentPlanStatusService(id, status);

  return res.status(200).json({
    success: true,
    status: 200,
    message: `Đã cập nhật trạng thái phác đồ sang '${status}'`,
    data,
  });
});

/**
 * createTreatmentStage
 * [POST] /api/v1/admin/treatment-plans/:planId/stages
 * Thêm một giai đoạn / bước điều trị mới vào phác đồ mẫu
 */
export const createTreatmentStage = asyncHandler(async (req, res) => {
  const { planId } = req.params;

  const data = await adminTreatmentPlanService.createTreatmentStageService(planId, req.body);

  return res.status(201).json({
    success: true,
    status: 201,
    message: 'Thêm mới giai đoạn điều trị thành công',
    data,
  });
});

/**
 * updateTreatmentStage
 * [PUT] /api/v1/admin/treatment-plans/stages/:stageId
 * Chỉnh sửa thông tin một giai đoạn điều trị mẫu
 */
export const updateTreatmentStage = asyncHandler(async (req, res) => {
  const { stageId } = req.params;

  const data = await adminTreatmentPlanService.updateTreatmentStageService(stageId, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật giai đoạn điều trị thành công',
    data,
  });
});

/**
 * deleteTreatmentStage
 * [DELETE] /api/v1/admin/treatment-plans/stages/:stageId
 * Xóa một bước điều trị mẫu (chỉ cho phép khi chưa áp dụng cho bệnh nhân)
 */
export const deleteTreatmentStage = asyncHandler(async (req, res) => {
  const { stageId } = req.params;

  const result = await adminTreatmentPlanService.deleteTreatmentStageService(stageId);

  return res.status(200).json({
    success: true,
    status: 200,
    message: `Đã xóa giai đoạn '${result.deletedName}' thành công`,
    data: result,
  });
});
