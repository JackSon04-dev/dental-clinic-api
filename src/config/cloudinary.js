import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { ApiError } from '../common/errorMiddleware.js';

dotenv.config();

const cloudName = process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

/**
 * Upload buffer ảnh lên Cloudinary sử dụng upload_stream
 * @param {Buffer} buffer - Buffer file ảnh từ multer memoryStorage
 * @param {object} options - Các tùy chọn bổ sung cho Cloudinary
 * @returns {Promise<object>} Kết quả upload từ Cloudinary (chứa secure_url, public_id...)
 */
export const uploadBufferToCloudinary = (buffer, options = {}) => {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(
      500,
      'Dịch vụ lưu trữ Cloudinary chưa được cấu hình đầy đủ trong file .env (cần CLOUDINARY_NAME/CLOUDINARY_CLOUD_NAME, CLOUDINARY_KEY/CLOUDINARY_API_KEY, CLOUDINARY_SECRET/CLOUDINARY_API_SECRET)'
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'dental_clinic/patients/avatars',
        resource_type: 'image',
        transformation: [
          { width: 500, height: 500, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
        ...options,
      },
      (error, result) => {
        if (error) {
          return reject(
            new ApiError(500, `Lỗi khi upload ảnh lên Cloudinary: ${error.message || error}`)
          );
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

export default cloudinary;

