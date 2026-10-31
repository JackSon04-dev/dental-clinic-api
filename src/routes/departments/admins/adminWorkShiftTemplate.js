import express from 'express';
import {
  getWorkShiftTemplatesMatrix,
  updateWorkShiftTemplateDoctor,
} from '../../../controllers/departments/admins/adminWorkShiftTemplate.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetWorkShiftTemplatesQuerySchema,
  adminWorkShiftTemplateIdParamSchema,
  adminUpdateWorkShiftTemplateDoctorRequestSchema,
} from '../../../dtos/departments/admins/adminWorkShiftTemplateDto.js';

const router = express.Router();

// Tất cả endpoints quản lý khung ca mẫu yêu cầu xác thực Admin
router.use(verifyToken, restrictToRoles('ADMIN'));

/**
 * [GET] /api/v1/admin/work-shift-templates
 * Lấy ma trận khung ca làm việc mẫu 1 tuần (theo 4 phòng x 7 ngày)
 */
router.get(
  '/',
  validate(adminGetWorkShiftTemplatesQuerySchema, 'query'),
  getWorkShiftTemplatesMatrix
);

/**
 * [PUT] /api/v1/admin/work-shift-templates/:id
 * Cập nhật / thay đổi bác sĩ phụ trách ca mẫu
 */
router.put(
  '/:id',
  validate(adminWorkShiftTemplateIdParamSchema, 'params'),
  validate(adminUpdateWorkShiftTemplateDoctorRequestSchema, 'body'),
  updateWorkShiftTemplateDoctor
);

export default router;
