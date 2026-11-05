// [DEV-ONLY / DEMO TEST TOOL] - Sẽ bị xóa khi dọn dẹp TopDemoBar
import express from 'express';
import { resetClean, seedMock } from '../../controllers/dev/devDatabaseController.js';
import { ApiError } from '../../common/errorMiddleware.js';

const router = express.Router();

// Middleware bảo vệ an toàn: Chặn tuyệt đối nếu chạy trên môi trường production
router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return next(new ApiError(403, 'Công cụ Dev Database Reset bị cấm trên môi trường Production!'));
  }
  next();
});

// POST /api/v1/dev/database/reset-clean - Xóa trắng DB, bảo lưu 3 tài khoản cốt lõi
router.post('/reset-clean', resetClean);

// POST /api/v1/dev/database/seed-mock - Làm sạch và nạp lại full mock data 22 bảng
router.post('/seed-mock', seedMock);

export default router;
