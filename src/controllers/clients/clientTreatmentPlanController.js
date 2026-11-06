import { asyncHandler } from '../../common/errorMiddleware.js';
import * as clientTreatmentPlanService from '../../services/clients/clientTreatmentPlanService.js';

/**
 * getTreatmentPlansList
 * [GET] /api/v1/client/treatment-plans
 * Lấy danh sách phác đồ điều trị có phân trang kèm danh sách giai đoạn của bệnh nhân
 */
export const getTreatmentPlansList = asyncHandler(async (req, res) => {
  const patientId = req.user.profileId;
  const { page, limit } = req.query;

  const data = await clientTreatmentPlanService.getTreatmentPlansListService(patientId, {
    page,
    limit,
  });

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách phác đồ điều trị thành công',
    data,
  });
});

export default {
  getTreatmentPlansList,
};

