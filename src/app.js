import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authDepartmentRoutes from './routes/auth/authDepartment.js';
import { errorHandler, ApiError } from './common/errorMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Global Middlewares
app.use(cors());
app.use(express.json());

// Health check / Root route
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Dental Clinic API Server is running' });
});

// Module Routes - Phân biệt rõ rệt giữa department (phòng ban) và client (bệnh nhân)
app.use('/api/v1/auth/department', authDepartmentRoutes);

// 404 Not Found Handler (bắt các đường dẫn không tồn tại)
app.use((req, res, next) => {
  next(new ApiError(404, `Không tìm thấy đường dẫn: ${req.method} ${req.originalUrl}`));
});

// Centralized Error Handling Middleware (luôn ở cuối cùng)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
