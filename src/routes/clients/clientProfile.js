import express from 'express';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
} from '../../controllers/clients/clientProfileController.js';
import { verifyToken, restrictToRoles } from '../../middlewares/auth/authGuard.js';
import { validate } from '../../common/validateMiddleware.js';
import { clientUpdateProfileRequestSchema } from '../../dtos/clients/clientProfileDto.js';
import { uploadAvatarMiddleware } from '../../middlewares/uploadMiddleware.js';

const router = express.Router();

// Xác thực Access Token chung cho router
router.use(verifyToken);

/**
 * [GET] /api/v1/client/profile
 * Lấy toàn bộ thông tin hồ sơ của bệnh nhân hiện tại
 */
router.get('/', restrictToRoles('BENH_NHAN'), getProfile);

/**
 * [PUT] /api/v1/client/profile
 * Bệnh nhân tự cập nhật thông tin cá nhân (fullName, phone, gender, dateOfBirth, address)
 */
router.put('/', restrictToRoles('BENH_NHAN'), validate(clientUpdateProfileRequestSchema, 'body'), updateProfile);

/**
 * [POST] & [PATCH] /api/v1/client/profile/avatar
 * Tải lên ảnh đại diện cá nhân lưu trữ trên Cloudinary (Multipart Form-Data, trường 'avatar')
 * Hỗ trợ toàn bộ user trừ ADMIN (BENH_NHAN, BAC_SI, LE_TAN) với UUID token khớp UUID record
 */
router.post('/avatar', restrictToRoles('BENH_NHAN', 'BAC_SI', 'LE_TAN'), uploadAvatarMiddleware.single('avatar'), uploadAvatar);
router.patch('/avatar', restrictToRoles('BENH_NHAN', 'BAC_SI', 'LE_TAN'), uploadAvatarMiddleware.single('avatar'), uploadAvatar);

export default router;

