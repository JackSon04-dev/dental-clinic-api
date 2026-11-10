import { asyncHandler } from '../../common/errorMiddleware.js';
import * as clientProfileService from '../../services/clients/clientProfileService.js';

/**
 * getProfile
 * [GET] /api/v1/client/profile
 * Lấy toàn bộ thông tin hồ sơ của bệnh nhân hiện tại
 */
export const getProfile = asyncHandler(async (req, res) => {
  const profileId = req.user.profileId;
  const userId = req.user.userId;

  const data = await clientProfileService.getProfileService(profileId, userId);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Lấy thông tin hồ sơ bệnh nhân thành công',
    data,
  });
});

/**
 * updateProfile
 * [PUT] /api/v1/client/profile
 * Bệnh nhân tự cập nhật thông tin cá nhân của mình (fullName, phone, gender, dateOfBirth, address)
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const profileId = req.user.profileId;
  const userId = req.user.userId;

  const data = await clientProfileService.updateProfileService(profileId, userId, req.body);

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Cập nhật thông tin hồ sơ cá nhân thành công',
    data,
  });
});

/**
 * uploadAvatar
 * [POST] & [PATCH] /api/v1/client/profile/avatar
 * Tải lên ảnh đại diện cá nhân lưu trữ trên Cloudinary (hỗ trợ BENH_NHAN, BAC_SI, LE_TAN)
 */
export const uploadAvatar = asyncHandler(async (req, res) => {
  const profileId = req.user.profileId;
  const userId = req.user.userId;
  const role = req.user.role;
  const targetId = req.body?.targetId || req.query?.targetId;

  const data = await clientProfileService.uploadAvatarService(
    { role, profileId, userId, targetId },
    req.file
  );

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Tải lên ảnh đại diện thành công',
    data,
  });
});

export default {
  getProfile,
  updateProfile,
  uploadAvatar,
};

