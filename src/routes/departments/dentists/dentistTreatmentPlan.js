import express from 'express';
import {
  getTreatmentPlans,
  getTreatmentPlanDetail,
  createTreatmentPlan,
  updatePhaseStatus,
} from '../../../controllers/departments/dentists/dentistTreatmentPlanController.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  createDentistTreatmentPlanRequestSchema,
  updateDentistPhaseStatusRequestSchema,
} from '../../../dtos/departments/dentists/dentistTreatmentPlanDto.js';

const router = express.Router();

router.use(verifyToken, restrictToRoles('BAC_SI', 'ADMIN'));

/**
 * [GET] /api/v1/dentist/treatment-plans
 * Danh sách phác đồ điều trị
 */
router.get('/', getTreatmentPlans);

/**
 * [GET] /api/v1/dentist/treatment-plans/:id
 * Chi tiết phác đồ điều trị
 */
router.get('/:id', getTreatmentPlanDetail);

/**
 * [POST] /api/v1/dentist/treatment-plans
 * Tạo mới phác đồ điều trị
 */
router.post(
  '/',
  validate(createDentistTreatmentPlanRequestSchema, 'body'),
  createTreatmentPlan
);

/**
 * [PATCH] /api/v1/dentist/treatment-plans/:id/phases/:phaseId
 * Cập nhật tiến độ giai đoạn phác đồ
 */
router.patch(
  '/:id/phases/:phaseId',
  validate(updateDentistPhaseStatusRequestSchema, 'body'),
  updatePhaseStatus
);

export default router;
