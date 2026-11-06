import express from 'express';
import { getPrescriptionsList } from '../../controllers/clients/clientPrescriptionController.js';
import { verifyToken, restrictToRoles } from '../../middlewares/auth/authGuard.js';
import { validate } from '../../common/validateMiddleware.js';
import { clientGetPrescriptionsQuerySchema } from '../../dtos/clients/clientPrescriptionDto.js';

const router = express.Router();

// Tất cả các endpoints đơn thuốc yêu cầu xác thực JWT và vai trò BENH_NHAN
router.use(verifyToken, restrictToRoles('BENH_NHAN'));

/**
 * [GET] /api/v1/client/prescriptions
 * Lấy danh sách các đơn thuốc phân trang (page, limit), sắp xếp mới nhất
 */
router.get('/', validate(clientGetPrescriptionsQuerySchema, 'query'), getPrescriptionsList);

export default router;

