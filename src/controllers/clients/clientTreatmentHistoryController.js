import { asyncHandler } from '../../common/errorMiddleware.js';
import * as clientTreatmentHistoryService from '../../services/clients/clientTreatmentHistoryService.js';

/**
 * getTreatmentHistoryList
 * [GET] /api/v1/client/treatment-history
 * Lấy danh sách hồ sơ bệnh án phân trang của bệnh nhân đang đăng nhập
 */
export const getTreatmentHistoryList = asyncHandler(async (req, res) => {
  const patientId = req.user.profileId;
  const { page, limit } = req.query;

  const data = await clientTreatmentHistoryService.getTreatmentHistoryListService(patientId, {
    page,
    limit,
  });

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách lịch sử điều trị thành công',
    data,
  });
});

/**
 * getTreatmentHistoryDetail
 * [GET] /api/v1/client/treatment-history/:id
 * Lấy toàn bộ chi tiết của một hồ sơ bệnh án (dịch vụ, vật tư, viện phí/hóa đơn)
 */
export const getTreatmentHistoryDetail = asyncHandler(async (req, res) => {
  const patientId = req.user.profileId;
  const { id: recordId } = req.params;

  const data = await clientTreatmentHistoryService.getTreatmentHistoryDetailService(
    patientId,
    recordId
  );

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy chi tiết hồ sơ bệnh án thành công',
    data,
  });
});

export default {
  getTreatmentHistoryList,
  getTreatmentHistoryDetail,
};

