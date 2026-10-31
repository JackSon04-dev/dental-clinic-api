import { asyncHandler } from '../../../common/errorMiddleware.js';
import * as adminPromotionService from '../../../services/departments/admins/adminPromotionService.js';

/**
 * getPromotions
 * [GET] /api/v1/admin/promotions
 * Lấy danh sách chương trình khuyến mãi / voucher có phân trang, bộ lọc và tìm kiếm
 */
export const getPromotions = asyncHandler(async (req, res) => {
  const data = await adminPromotionService.getPromotionsListService(req.query);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy danh sách chương trình khuyến mãi thành công',
    data,
  });
});

/**
 * getPromotionDetail
 * [GET] /api/v1/admin/promotions/:id
 * Lấy chi tiết thông tin chương trình khuyến mãi theo UUID
 */
export const getPromotionDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminPromotionService.getPromotionDetailService(id);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy chi tiết chương trình khuyến mãi thành công',
    data,
  });
});

/**
 * createPromotion
 * [POST] /api/v1/admin/promotions
 * Thêm mới một chương trình khuyến mãi / voucher
 */
export const createPromotion = asyncHandler(async (req, res) => {
  const data = await adminPromotionService.createPromotionService(req.body);

  return res.status(201).json({
    success: true,
    status: 201,
    message: 'Tạo mới chương trình khuyến mãi thành công',
    data,
  });
});

/**
 * updatePromotion
 * [PUT] /api/v1/admin/promotions/:id
 * Cập nhật thông tin chương trình khuyến mãi
 */
export const updatePromotion = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const data = await adminPromotionService.updatePromotionService(id, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật chương trình khuyến mãi thành công',
    data,
  });
});

/**
 * updatePromotionStatus
 * [PATCH] /api/v1/admin/promotions/:id/status
 * Bật / tắt trạng thái hoạt động của khuyến mãi (hoat_dong <-> da_huy <-> het_han)
 */
export const updatePromotionStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const data = await adminPromotionService.updatePromotionStatusService(id, status);

  return res.status(200).json({
    success: true,
    status: 200,
    message: `Đã cập nhật trạng thái khuyến mãi sang '${status}'`,
    data,
  });
});
