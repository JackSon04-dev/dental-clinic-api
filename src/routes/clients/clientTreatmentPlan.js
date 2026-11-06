import express from 'express';
import { getTreatmentPlansList } from '../../controllers/clients/clientTreatmentPlanController.js';
import { verifyToken, restrictToRoles } from '../../middlewares/auth/authGuard.js';
import { validate } from '../../common/validateMiddleware.js';
import { clientGetTreatmentPlansQuerySchema } from '../../dtos/clients/clientTreatmentPlanDto.js';

const router = express.Router();

// Tất cả các endpoints phác đồ điều trị yêu cầu xác thực JWT và vai trò BENH_NHAN
router.use(verifyToken, restrictToRoles('BENH_NHAN'));

/**
 * [GET] /api/v1/client/treatment-plans
 * Lấy danh sách các phác đồ điều trị phân trang (page, limit) kèm các giai đoạn
 */
router.get('/', validate(clientGetTreatmentPlansQuerySchema, 'query'), getTreatmentPlansList);

export default router;

