import express from 'express';
import {
  getTreatmentPlans,
  getTreatmentPlanDetail,
  createTreatmentPlan,
  updateTreatmentPlan,
  updateTreatmentPlanStatus,
  createTreatmentStage,
  updateTreatmentStage,
  deleteTreatmentStage,
} from '../../../controllers/departments/admins/adminTreatmentPlan.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetTreatmentPlansQuerySchema,
  adminGetTreatmentPlanDetailParamsSchema,
  adminCreateTreatmentPlanRequestSchema,
  adminUpdateTreatmentPlanRequestSchema,
  adminUpdateTreatmentPlanStatusRequestSchema,
  adminCreateTreatmentStageParamsSchema,
  adminCreateTreatmentStageRequestSchema,
  adminTreatmentStageParamsSchema,
  adminUpdateTreatmentStageRequestSchema,
} from '../../../dtos/departments/admins/adminTreatmentPlanDto.js';

const router = express.Router();

// Tất cả các endpoints quản lý phác đồ mẫu yêu cầu xác thực JWT và vai trò ADMIN
router.use(verifyToken, restrictToRoles('ADMIN'));

// ============================================================================
// 1. CÁC ENDPOINT QUẢN LÝ GIAI ĐOẠN ĐIỀU TRỊ MẪU (STAGE-LEVEL)
// ============================================================================

/**
 * [PUT] /api/v1/admin/treatment-plans/stages/:stageId
 * Chỉnh sửa thông tin một giai đoạn điều trị mẫu
 */
router.put(
  '/stages/:stageId',
  validate(adminTreatmentStageParamsSchema, 'params'),
  validate(adminUpdateTreatmentStageRequestSchema, 'body'),
  updateTreatmentStage
);

/**
 * [DELETE] /api/v1/admin/treatment-plans/stages/:stageId
 * Xóa một bước điều trị mẫu (chỉ cho phép khi chưa áp dụng cho bệnh nhân)
 */
router.delete(
  '/stages/:stageId',
  validate(adminTreatmentStageParamsSchema, 'params'),
  deleteTreatmentStage
);

// ============================================================================
// 2. CÁC ENDPOINT QUẢN LÝ PHÁC ĐỒ MẪU CHA (PLAN-LEVEL)
// ============================================================================

/**
 * [GET] /api/v1/admin/treatment-plans
 * Lấy danh sách phác đồ mẫu (Level 0) có phân trang, bộ lọc và tìm kiếm
 */
router.get(
  '/',
  validate(adminGetTreatmentPlansQuerySchema, 'query'),
  getTreatmentPlans
);

/**
 * [POST] /api/v1/admin/treatment-plans
 * Tạo mới phác đồ mẫu (Level 0) kèm danh sách giai đoạn ban đầu nếu có
 */
router.post(
  '/',
  validate(adminCreateTreatmentPlanRequestSchema, 'body'),
  createTreatmentPlan
);

/**
 * [GET] /api/v1/admin/treatment-plans/:id
 * Lấy chi tiết thông tin phác đồ mẫu kèm toàn bộ danh sách giai đoạn con
 */
router.get(
  '/:id',
  validate(adminGetTreatmentPlanDetailParamsSchema, 'params'),
  getTreatmentPlanDetail
);

/**
 * [PUT] /api/v1/admin/treatment-plans/:id
 * Cập nhật thông tin phác đồ mẫu cha
 */
router.put(
  '/:id',
  validate(adminGetTreatmentPlanDetailParamsSchema, 'params'),
  validate(adminUpdateTreatmentPlanRequestSchema, 'body'),
  updateTreatmentPlan
);

/**
 * [PATCH] /api/v1/admin/treatment-plans/:id/status
 * Bật / tắt trạng thái hoạt động của phác đồ mẫu (hoat_dong <-> ngung_hoat_dong)
 */
router.patch(
  '/:id/status',
  validate(adminGetTreatmentPlanDetailParamsSchema, 'params'),
  validate(adminUpdateTreatmentPlanStatusRequestSchema, 'body'),
  updateTreatmentPlanStatus
);

/**
 * [POST] /api/v1/admin/treatment-plans/:planId/stages
 * Thêm một giai đoạn / bước điều trị mới vào phác đồ mẫu
 */
router.post(
  '/:planId/stages',
  validate(adminCreateTreatmentStageParamsSchema, 'params'),
  validate(adminCreateTreatmentStageRequestSchema, 'body'),
  createTreatmentStage
);

export default router;
