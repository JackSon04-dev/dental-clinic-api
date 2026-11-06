import { asyncHandler } from '../../common/errorMiddleware.js';
import * as clientPrescriptionService from '../../services/clients/clientPrescriptionService.js';

/**
 * getPrescriptionsList
 * [GET] /api/v1/client/prescriptions
 * Lấy danh sách đơn thuốc có phân trang và kèm chi tiết các loại thuốc của bệnh nhân
 */
export const getPrescriptionsList = asyncHandler(async (req, res) => {
  const patientId = req.user.profileId;
  const { page, limit } = req.query;

  const data = await clientPrescriptionService.getPrescriptionsListService(patientId, {
    page,
    limit,
  });

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách đơn thuốc thành công',
    data,
  });
});

export default {
  getPrescriptionsList,
};

