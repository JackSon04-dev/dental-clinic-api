import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as receptionistCheckInService from '../../../services/departments/receptionists/receptionistCheckInService.js';
import * as receptionistAppointmentService from '../../../services/departments/receptionists/receptionistAppointmentService.js';

/**
 * [GET] /api/v1/receptionist/check-in
 * Lấy hàng đợi bệnh nhân tiếp nhận hôm nay
 */
export const getCheckInQueue = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const data = await receptionistCheckInService.getCheckInQueueService(status);
  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy hàng đợi tiếp nhận thành công',
    data,
    slips: data, // Tương thích ngược với cả res.data.slips || res.data
  });
});

/**
 * [POST] /api/v1/receptionist/check-in
 * Tiếp nhận nhanh bệnh nhân tại sảnh
 */
export const createCheckInSlip = asyncHandler(async (req, res) => {
  const data = await receptionistCheckInService.createCheckInSlipService(req.body);
  return res.status(201).json({
    success: true,
    status: 201,
    message: 'Tiếp nhận bệnh nhân thành công',
    data,
  });
});

/**
 * [PATCH] /api/v1/receptionist/check-in/:id/status
 * Cập nhật trạng thái phiếu khám
 */
export const updateSlipStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const data = await receptionistAppointmentService.updateAppointmentStatusService(id, status);
  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật trạng thái phiếu khám thành công',
    data,
  });
});

export default {
  getCheckInQueue,
  createCheckInSlip,
  updateSlipStatus,
};
