import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authDepartmentRoutes from './routes/auth/authDepartment.js';
import authClientRoutes from './routes/auth/authClient.js';
import adminDashboardRoutes from './routes/departments/admins/adminDashboard.js';
import adminUserRoutes from './routes/departments/admins/adminUser.js';
import adminServiceRoutes from './routes/departments/admins/adminService.js';
import adminProductRoutes from './routes/departments/admins/adminProduct.js';
import adminPromotionRoutes from './routes/departments/admins/adminPromotion.js';
import adminRoomRoutes from './routes/departments/admins/adminRoom.js';
import adminTreatmentPlanRoutes from './routes/departments/admins/adminTreatmentPlan.js';
import adminInvoiceRoutes from './routes/departments/admins/adminInvoice.js';
import adminWorkShiftTemplateRoutes from './routes/departments/admins/adminWorkShiftTemplate.js';
import adminWorkShiftRoutes from './routes/departments/admins/adminWorkShift.js';
import { errorHandler, ApiError } from './common/errorMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check / Root route
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Dental Clinic API Server is running' });
});

// Module Routes - Phân biệt rõ rệt giữa department (phòng ban) và client (bệnh nhân)
app.use('/api/v1/auth/department', authDepartmentRoutes);
app.use('/api/v1/auth/client', authClientRoutes);

// Admin Routes - Toàn bộ API phân hệ quản trị thống nhất dưới tiền tố /api/v1/admin/...
app.use('/api/v1/admin', adminDashboardRoutes);
app.use('/api/v1/admin/users', adminUserRoutes);
app.use('/api/v1/admin/services', adminServiceRoutes);
app.use('/api/v1/admin/products', adminProductRoutes);
app.use('/api/v1/admin/promotions', adminPromotionRoutes);
app.use('/api/v1/admin/rooms', adminRoomRoutes);
app.use('/api/v1/admin/treatment-plans', adminTreatmentPlanRoutes);
app.use('/api/v1/admin/invoices', adminInvoiceRoutes);
app.use('/api/v1/admin/work-shift-templates', adminWorkShiftTemplateRoutes);
app.use('/api/v1/admin/work-shifts', adminWorkShiftRoutes);

// 404 Not Found Handler (bắt các đường dẫn không tồn tại)
app.use((req, res, next) => {
  next(new ApiError(404, `Không tìm thấy đường dẫn: ${req.method} ${req.originalUrl}`));
});

// Centralized Error Handling Middleware (luôn ở cuối cùng)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
