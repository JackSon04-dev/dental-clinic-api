import express from 'express';
import {
  getDentistServices,
  getDentistMedicines,
  getDentistSamplePlans,
  getDentistProducts,
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

/**
 * [GET] /api/v1/dentist/catalogs/products
 */
router.get('/products', getDentistProducts);

export default router;
