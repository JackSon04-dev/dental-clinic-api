import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as dentistCatalogService from '../../../services/departments/dentists/dentistCatalogService.js';

/**
 * getDentistServices
 * [GET] /api/v1/dentist/catalogs/services
 */
export const getDentistServices = asyncHandler(async (req, res) => {
  const data = await dentistCatalogService.getDentistServicesService();

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh mục dịch vụ điều trị thành công',
    data,
  });
});

/**
 * getDentistMedicines
 * [GET] /api/v1/dentist/catalogs/medicines
 */
export const getDentistMedicines = asyncHandler(async (req, res) => {
  const data = await dentistCatalogService.getDentistMedicinesService();

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh mục thuốc kê đơn thành công',
    data,
  });
});

/**
 * getDentistSamplePlans
 * [GET] /api/v1/dentist/catalogs/sample-plans
 */
export const getDentistSamplePlans = asyncHandler(async (req, res) => {
  const data = await dentistCatalogService.getDentistSamplePlansService();

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh mục phác đồ mẫu thành công',
    data,
  });
});

/**
 * getDentistProducts
 * [GET] /api/v1/dentist/catalogs/products
 */
export const getDentistProducts = asyncHandler(async (req, res) => {
  const data = await dentistCatalogService.getDentistProductsService();

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh mục sản phẩm và vật tư thành công',
    data,
  });
});

export default {
  getDentistServices,
  getDentistMedicines,
  getDentistSamplePlans,
  getDentistProducts,
};
