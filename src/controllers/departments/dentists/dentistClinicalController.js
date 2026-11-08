import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as dentistClinicalService from '../../../services/departments/dentists/dentistClinicalService.js';

/**
 * getClinicalQueue
 * [GET] /api/v1/dentist/clinical/queue
 */
export const getClinicalQueue = asyncHandler(async (req, res) => {
  const dentistId =
    req.user.role === 'BAC_SI'
      ? req.user.profileId
      : req.query.dentistId || req.user.profileId;

  const data = await dentistClinicalService.getClinicalQueueService(dentistId);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách hàng đợi bàn khám thành công',
    data,
  });
});

/**
 * updateSlipStatus
 * [PATCH] /api/v1/dentist/clinical/queue/:id/status
 */
export const updateSlipStatus = asyncHandler(async (req, res) => {
  const { id: slipId } = req.params;
  const { status } = req.body;

  const data = await dentistClinicalService.updateSlipStatusService(slipId, status);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật trạng thái phiếu khám thành công',
    data,
  });
});

/**
 * getClinicalRecord
 * [GET] /api/v1/dentist/clinical/records
 */
export const getClinicalRecord = asyncHandler(async (req, res) => {
  const { patientId, slipId } = req.query;

  const data = await dentistClinicalService.getClinicalRecordService({
    patientId,
    slipId,
  });

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy hồ sơ bệnh án thành công',
    data,
  });
});

/**
 * saveClinicalRecord
 * [POST] /api/v1/dentist/clinical/records
 */
export const saveClinicalRecord = asyncHandler(async (req, res) => {
  const dentistId =
    req.user.role === 'BAC_SI'
      ? req.user.profileId
      : req.body.dentistId || req.user.profileId;

  const data = await dentistClinicalService.saveClinicalRecordService(
    dentistId,
    req.body
  );

  return res.status(200).json({
    success: true,
    status: 200,
    message:
      'Lưu kết quả khám lâm sàng thành công. Hồ sơ đã chuyển sang Quầy Thu Ngân.',
    data,
  });
});

/**
 * getPatientExamHistory
 * [GET] /api/v1/dentist/clinical/patients/:patientId/history
 */
export const getPatientExamHistory = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  const data = await dentistClinicalService.getPatientExamHistoryService(patientId);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy chi tiết lịch sử khám bệnh của bệnh nhân thành công',
    data,
  });
});

export default {
  getClinicalQueue,
  updateSlipStatus,
  getClinicalRecord,
  saveClinicalRecord,
  getPatientExamHistory,
};
