import express from 'express';
import {
  getDentistServices,
  getDentistMedicines,
  getDentistSamplePlans,
} from '../../../controllers/departments/dentists/dentistCatalogController.js';
import { verifyToken, restrictToRoles } from '../../../middlewares/auth/authGuard.js';

const router = express.Router();

router.use(verifyToken, restrictToRoles('BAC_SI', 'ADMIN'));

/**
 * [GET] /api/v1/dentist/catalogs/services
 */
router.get('/services', getDentistServices);

/**
 * [GET] /api/v1/dentist/catalogs/medicines
 */
router.get('/medicines', getDentistMedicines);

/**
 * [GET] /api/v1/dentist/catalogs/sample-plans
 */
router.get('/sample-plans', getDentistSamplePlans);

export default router;
