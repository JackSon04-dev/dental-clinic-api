import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminServiceService from '../../../services/departments/admins/adminServiceService.js';

/**
 * getServices
 * [GET] /api/v1/admin/services
 * Lấy danh sách dịch vụ cha (Level 0) có phân trang, bộ lọc trạng thái và tìm kiếm
 */
export const getServices = asyncHandler(async (req, res) => {
  const data = await adminServiceService.getServicesListService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách dịch vụ thành công',
    data,
  });
});

/**
 * getServiceDetail
 * [GET] /api/v1/admin/services/:id
 * Lấy chi tiết thông tin dịch vụ cha kèm toàn bộ danh sách gói con
 */
export const getServiceDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminServiceService.getServiceDetailService(id);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy chi tiết dịch vụ thành công',
    data,
  });
});

/**
 * createService
 * [POST] /api/v1/admin/services
 * Tạo mới dịch vụ cha (Level 0)
 */
export const createService = asyncHandler(async (req, res) => {
  const data = await adminServiceService.createServiceService(req.body);

  return res.status(201).json({
    success: true,
    status: 201,
    message: 'Tạo mới dịch vụ thành công',
    data,
  });
});

/**
 * updateService
 * [PUT] /api/v1/admin/services/:id
 * Cập nhật thông tin dịch vụ cha
 */
export const updateService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminServiceService.updateServiceService(id, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật dịch vụ thành công',
    data,
  });
});

/**
 * updateServiceStatus
 * [PATCH] /api/v1/admin/services/:id/status
 * Bật / tắt trạng thái hoạt động dịch vụ cha (tự động cascade gói con khi ngừng)
 */
export const updateServiceStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const data = await adminServiceService.updateServiceStatusService(id, status);

  return res.status(200).json({
    success: true,
    status: 200,
    message: `Đã cập nhật trạng thái dịch vụ sang '${status}'`,
    data,
  });
});

/**
 * createServiceItem
 * [POST] /api/v1/admin/services/:serviceId/items
 * Thêm mới gói chi tiết dịch vụ vào dịch vụ cha
 */
export const createServiceItem = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;

  const data = await adminServiceService.createServiceItemService(serviceId, req.body);

  return res.status(201).json({
    success: true,
    status: 201,
    message: 'Thêm mới chi tiết dịch vụ thành công',
    data,
  });
});

/**
 * updateServiceItem
 * [PUT] /api/v1/admin/services/items/:itemId
 * Cập nhật thông tin gói chi tiết dịch vụ
 */
export const updateServiceItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const data = await adminServiceService.updateServiceItemService(itemId, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật chi tiết dịch vụ thành công',
    data,
  });
});

/**
 * updateServiceItemStatus
 * [PATCH] /api/v1/admin/services/items/:itemId/status
 * Bật / tắt trạng thái hoạt động gói chi tiết dịch vụ
 */
export const updateServiceItemStatus = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { status } = req.body;

  const data = await adminServiceService.updateServiceItemStatusService(itemId, status);

  return res.status(200).json({
    success: true,
    status: 200,
    message: `Đã cập nhật trạng thái chi tiết dịch vụ sang '${status}'`,
    data,
  });
});

