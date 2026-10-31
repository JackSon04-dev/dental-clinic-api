import express from 'express';
import {
  getRooms,
  getRoomDetail,
  createRoom,
  updateRoom,
  updateRoomStatus,
} from '../../../controllers/departments/admins/adminRoom.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetRoomsQuerySchema,
  adminGetRoomDetailParamsSchema,
  adminCreateRoomRequestSchema,
  adminUpdateRoomRequestSchema,
  adminUpdateRoomStatusRequestSchema,
} from '../../../dtos/departments/admins/adminRoomDto.js';

const router = express.Router();

// Tất cả các endpoints quản lý phòng khám yêu cầu xác thực JWT và vai trò ADMIN
router.use(verifyToken, restrictToRoles('ADMIN'));

/**
 * [GET] /api/v1/admin/rooms
 * Lấy danh sách phòng khám / phòng điều trị (Level 0) có phân trang, bộ lọc và tìm kiếm
 */
router.get(
  '/',
  validate(adminGetRoomsQuerySchema, 'query'),
  getRooms
);

/**
 * [POST] /api/v1/admin/rooms
 * Thêm mới phòng khám (Level 0)
 */
router.post(
  '/',
  validate(adminCreateRoomRequestSchema, 'body'),
  createRoom
);

/**
 * [GET] /api/v1/admin/rooms/:id
 * Lấy chi tiết thông tin phòng khám theo UUID
 */
router.get(
  '/:id',
  validate(adminGetRoomDetailParamsSchema, 'params'),
  getRoomDetail
);

/**
 * [PUT] /api/v1/admin/rooms/:id
 * Cập nhật thông tin phòng khám
 */
router.put(
  '/:id',
  validate(adminGetRoomDetailParamsSchema, 'params'),
  validate(adminUpdateRoomRequestSchema, 'body'),
  updateRoom
);

/**
 * [PATCH] /api/v1/admin/rooms/:id/status
 * Bật / tắt trạng thái hoạt động của phòng khám (hoat_dong <-> ngung_hoat_dong)
 */
router.patch(
  '/:id/status',
  validate(adminGetRoomDetailParamsSchema, 'params'),
  validate(adminUpdateRoomStatusRequestSchema, 'body'),
  updateRoomStatus
);

export default router;
