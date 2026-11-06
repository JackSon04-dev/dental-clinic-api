import express from 'express';
import {
  getTreatmentHistoryList,
  getTreatmentHistoryDetail,
} from '../../controllers/clients/clientTreatmentHistoryController.js';
import { verifyToken, restrictToRoles } from '../../middlewares/auth/authGuard.js';
import { validate } from '../../common/validateMiddleware.js';
import {
  clientGetTreatmentHistoryQuerySchema,
  clientGetTreatmentHistoryDetailParamsSchema,
} from '../../dtos/clients/clientTreatmentHistoryDto.js';

const router = express.Router();

// Tất cả các endpoints lịch sử điều trị yêu cầu xác thực JWT và vai trò BENH_NHAN
router.use(verifyToken, restrictToRoles('BENH_NHAN'));

/**
 * [GET] /api/v1/client/treatment-history
 * Lấy danh sách hồ sơ bệnh án có phân trang (page, limit)
 */
router.get('/', validate(clientGetTreatmentHistoryQuerySchema, 'query'), getTreatmentHistoryList);

/**
 * [GET] /api/v1/client/treatment-history/:id
 * Lấy toàn bộ chi tiết một hồ sơ bệnh án cụ thể (dịch vụ, vật tư điều trị, tiền hóa đơn)
 */
router.get(
  '/:id',
  validate(clientGetTreatmentHistoryDetailParamsSchema, 'params'),
  getTreatmentHistoryDetail
);

export default router;

