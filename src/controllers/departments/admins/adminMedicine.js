import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminMedicineService from '../../../services/departments/admins/adminMedicineService.js';

/**
 * getMedicines
 * [GET] /api/v1/admin/medicines
 * Lấy danh sách thuốc có phân trang, bộ lọc (nhóm, trạng thái) và tìm kiếm
 */
export const getMedicines = asyncHandler(async (req, res) => {
  const data = await adminMedicineService.getMedicinesListService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách thuốc thành công',
    data,
  });
});

/**
 * getMedicineDetail
 * [GET] /api/v1/admin/medicines/:id
 * Lấy thông tin chi tiết một loại thuốc theo UUID
 */
export const getMedicineDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminMedicineService.getMedicineDetailService(id);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy chi tiết thuốc thành công',
    data,
  });
});

/**
 * createMedicine
 * [POST] /api/v1/admin/medicines
 * Thêm mới một loại thuốc vào thư viện
 */
export const createMedicine = asyncHandler(async (req, res) => {
  const data = await adminMedicineService.createMedicineService(req.body);

  return res.status(201).json({
    success: true,
    status: 201,
    message: 'Thêm mới thuốc vào thư viện thành công',
    data,
  });
});

/**
 * updateMedicine
 * [PUT] /api/v1/admin/medicines/:id
 * Cập nhật thông tin chi tiết của thuốc
 */
export const updateMedicine = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminMedicineService.updateMedicineService(id, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật thông tin thuốc thành công',
    data,
  });
});

/**
 * updateMedicineStatus
 * [PATCH] /api/v1/admin/medicines/:id/status
 * Bật / tắt trạng thái hoạt động của thuốc (hoat_dong <-> ngung_hoat_dong)
 */
export const updateMedicineStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const data = await adminMedicineService.updateMedicineStatusService(id, status);

  return res.status(200).json({
    success: true,
    status: 200,
    message: `Đã cập nhật trạng thái thuốc sang '${status}'`,
    data,
  });
});

