import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as dentistTreatmentPlanService from '../../../services/departments/dentists/dentistTreatmentPlanService.js';

/**
 * getTreatmentPlans
 * [GET] /api/v1/dentist/treatment-plans
 */
export const getTreatmentPlans = asyncHandler(async (req, res) => {
  const dentistId =
    req.user.role === 'BAC_SI'
      ? req.user.profileId
      : req.query.dentistId || undefined;

  const { patientId, status = 'ALL', search = '' } = req.query;

  const data = await dentistTreatmentPlanService.getTreatmentPlansService({
    dentistId,
    patientId,
    status,
    search,
  });

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách phác đồ điều trị thành công',
    data,
  });
});

/**
 * getTreatmentPlanDetail
 * [GET] /api/v1/dentist/treatment-plans/:id
 */
export const getTreatmentPlanDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await dentistTreatmentPlanService.getTreatmentPlanDetailService(id);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy chi tiết phác đồ điều trị thành công',
    data,
  });
});

/**
 * createTreatmentPlan
 * [POST] /api/v1/dentist/treatment-plans
 */
export const createTreatmentPlan = asyncHandler(async (req, res) => {
  const dentistId =
    req.user.role === 'BAC_SI'
      ? req.user.profileId
      : req.body.dentistId || req.user.profileId;

  const data = await dentistTreatmentPlanService.createTreatmentPlanService(
    dentistId,
    req.body
  );

  return res.status(201).json({
    success: true,
    status: 201,
    message: 'Tạo mới phác đồ điều trị thành công',
    data,
  });
});

/**
 * updatePhaseStatus
 * [PATCH] /api/v1/dentist/treatment-plans/:id/phases/:phaseId
 */
export const updatePhaseStatus = asyncHandler(async (req, res) => {
  const { id: planId, phaseId } = req.params;
  const { status, completedDate } = req.body;

  const data = await dentistTreatmentPlanService.updatePhaseStatusService(
    planId,
    phaseId,
    status,
    completedDate
  );

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật tiến độ giai đoạn điều trị thành công',
    data,
  });
});

export default {
  getTreatmentPlans,
  getTreatmentPlanDetail,
  createTreatmentPlan,
  updatePhaseStatus,
};
