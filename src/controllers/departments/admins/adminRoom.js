import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminRoomService from '../../../services/departments/admins/adminRoomService.js';

/**
 * getRooms
 * [GET] /api/v1/admin/rooms
 * Lấy danh sách phòng khám / phòng điều trị có phân trang, bộ lọc và tìm kiếm
 */
export const getRooms = asyncHandler(async (req, res) => {
  const data = await adminRoomService.getRoomsListService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách phòng khám thành công',
    data,
  });
});

/**
 * getRoomDetail
 * [GET] /api/v1/admin/rooms/:id
 * Lấy chi tiết thông tin phòng khám theo UUID
 */
export const getRoomDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminRoomService.getRoomDetailService(id);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy chi tiết phòng khám thành công',
    data,
  });
});

/**
 * createRoom
 * [POST] /api/v1/admin/rooms
 * Thêm mới một phòng khám
 */
export const createRoom = asyncHandler(async (req, res) => {
  const data = await adminRoomService.createRoomService(req.body);

  return res.status(201).json({
    success: true,
    status: 201,
    message: 'Thêm mới phòng khám thành công',
    data,
  });
});

/**
 * updateRoom
 * [PUT] /api/v1/admin/rooms/:id
 * Cập nhật thông tin phòng khám
 */
export const updateRoom = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminRoomService.updateRoomService(id, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật phòng khám thành công',
    data,
  });
});

/**
 * updateRoomStatus
 * [PATCH] /api/v1/admin/rooms/:id/status
 * Bật / tắt trạng thái hoạt động của phòng khám (hoat_dong <-> ngung_hoat_dong)
 */
export const updateRoomStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const data = await adminRoomService.updateRoomStatusService(id, status);

  return res.status(200).json({
    success: true,
    status: 200,
    message: `Đã cập nhật trạng thái phòng khám sang '${status}'`,
    data,
  });
});
