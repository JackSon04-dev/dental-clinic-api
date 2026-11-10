import multer from 'multer';
import { ApiError } from '../common/errorMiddleware.js';

// Cấu hình lưu trữ bộ nhớ RAM (Buffer) để đẩy trực tiếp lên Cloudinary
const storage = multer.memoryStorage();

// Bộ lọc định dạng file: Chỉ chấp nhận ảnh (jpeg, jpg, png, webp, gif)
const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Định dạng tệp không được hỗ trợ (${file.mimetype}). Vui lòng chỉ tải lên file ảnh có định dạng JPG, PNG, WEBP hoặc GIF.`
      ),
      false
    );
  }
};

// Middleware upload avatar: field 'avatar', giới hạn dung lượng 5MB
export const uploadAvatarMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFileFilter,
});

export default {
  uploadAvatarMiddleware,
};

