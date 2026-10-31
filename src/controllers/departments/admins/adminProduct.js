import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminProductService from '../../../services/departments/admins/adminProductService.js';

/**
 * getProducts
 * [GET] /api/v1/admin/products
 * Lấy danh sách sản phẩm / vật tư có phân trang, bộ lọc (loại, trạng thái, tồn kho, dịch vụ) và tìm kiếm
 */
export const getProducts = asyncHandler(async (req, res) => {
  const data = await adminProductService.getProductsListService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách sản phẩm thành công',
    data,
  });
});

/**
 * getProductDetail
 * [GET] /api/v1/admin/products/:id
 * Lấy thông tin chi tiết một sản phẩm / vật tư theo UUID
 */
export const getProductDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminProductService.getProductDetailService(id);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy chi tiết sản phẩm thành công',
    data,
  });
});

/**
 * createProduct
 * [POST] /api/v1/admin/products
 * Thêm mới một sản phẩm / vật tư y tế
 */
export const createProduct = asyncHandler(async (req, res) => {
  const data = await adminProductService.createProductService(req.body);

  return res.status(201).json({
    success: true,
    status: 201,
    message: 'Thêm mới sản phẩm thành công',
    data,
  });
});

/**
 * updateProduct
 * [PUT] /api/v1/admin/products/:id
 * Cập nhật thông tin hoặc số lượng tồn kho của sản phẩm
 */
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminProductService.updateProductService(id, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật sản phẩm thành công',
    data,
  });
});

/**
 * updateProductStatus
 * [PATCH] /api/v1/admin/products/:id/status
 * Bật / tắt trạng thái hoạt động của sản phẩm (hoat_dong <-> ngung_hoat_dong)
 */
export const updateProductStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const data = await adminProductService.updateProductStatusService(id, status);

  return res.status(200).json({
    success: true,
    status: 200,
    message: `Đã cập nhật trạng thái sản phẩm sang '${status}'`,
    data,
  });
});
