import express from 'express';
import {
  getPayrolls,
  calculatePayroll,
  getPayslipDetail,
  lockPayroll,
  updatePayrollAdjustment,
} from '../../../controllers/departments/admins/adminPayroll.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';
import { validate } from '../../../common/validateMiddleware.js';
import {
  adminGetPayrollsQuerySchema,
  adminCalculatePayrollBodySchema,
  adminLockPayrollBodySchema,
  adminUpdatePayrollAdjustmentBodySchema,
} from '../../../dtos/departments/admins/adminPayrollDto.js';

const router = express.Router();

// Tất cả endpoints Admin Payrolls yêu cầu xác thực Admin
router.use(verifyToken, restrictToRoles('ADMIN'));

router.get('/', validate(adminGetPayrollsQuerySchema, 'query'), getPayrolls);
router.post('/calculate', validate(adminCalculatePayrollBodySchema, 'body'), calculatePayroll);
router.post('/lock', validate(adminLockPayrollBodySchema, 'body'), lockPayroll);
router.get('/:id', getPayslipDetail);
router.patch('/:id/adjustment', validate(adminUpdatePayrollAdjustmentBodySchema, 'body'), updatePayrollAdjustment);

export default router;
