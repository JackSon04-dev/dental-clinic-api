import express from 'express';
import { getProfile, updateProfile } from '../../controllers/clients/clientProfileController.js';
import { verifyToken, restrictToRoles } from '../../middlewares/auth/authGuard.js';
import { validate } from '../../common/validateMiddleware.js';
import { clientUpdateProfileRequestSchema } from '../../dtos/clients/clientProfileDto.js';

const router = express.Router();

// Tất cả các endpoints hồ sơ bệnh nhân yêu cầu xác thực JWT và vai trò BENH_NHAN
router.use(verifyToken, restrictToRoles('BENH_NHAN'));

/**
 * [GET] /api/v1/client/profile
 * Lấy toàn bộ thông tin hồ sơ của bệnh nhân hiện tại
 */
router.get('/', getProfile);

/**
 * [PUT] /api/v1/client/profile
 * Bệnh nhân tự cập nhật thông tin cá nhân (fullName, phone, gender, dateOfBirth, address)
 */
router.put('/', validate(clientUpdateProfileRequestSchema, 'body'), updateProfile);

export default router;

