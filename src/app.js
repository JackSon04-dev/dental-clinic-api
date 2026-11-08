import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authDepartmentRoutes from './routes/auth/authDepartment.js';
import authClientRoutes from './routes/auth/authClient.js';
import adminDashboardRoutes from './routes/departments/admins/adminDashboard.js';
import adminUserRoutes from './routes/departments/admins/adminUser.js';
import adminPatientRoutes from './routes/departments/admins/adminPatient.js';
import adminServiceRoutes from './routes/departments/admins/adminService.js';
import adminProductRoutes from './routes/departments/admins/adminProduct.js';
import adminMedicineRoutes from './routes/departments/admins/adminMedicine.js';
import adminPromotionRoutes from './routes/departments/admins/adminPromotion.js';
import adminRoomRoutes from './routes/departments/admins/adminRoom.js';
import adminTreatmentPlanRoutes from './routes/departments/admins/adminTreatmentPlan.js';
import adminInvoiceRoutes from './routes/departments/admins/adminInvoice.js';
import adminWorkShiftTemplateRoutes from './routes/departments/admins/adminWorkShiftTemplate.js';
import adminWorkShiftRoutes from './routes/departments/admins/adminWorkShift.js';
import adminReportRoutes from './routes/departments/admins/adminReport.js';
import dentistDashboardRoutes from './routes/departments/dentists/dentistDashboard.js';
import dentistClinicalRoutes from './routes/departments/dentists/dentistClinical.js';
import dentistTreatmentPlanRoutes from './routes/departments/dentists/dentistTreatmentPlan.js';
import dentistCatalogRoutes from './routes/departments/dentists/dentistCatalog.js';
import receptionistDashboardRoutes from './routes/departments/receptionists/receptionistDashboard.js';
import receptionistAppointmentRoutes from './routes/departments/receptionists/receptionistAppointment.js';
import receptionistCheckInRoutes from './routes/departments/receptionists/receptionistCheckIn.js';
import clientDashboardRoutes from './routes/clients/clientDashboard.js';
import clientProfileRoutes from './routes/clients/clientProfile.js';
import clientTreatmentHistoryRoutes from './routes/clients/clientTreatmentHistory.js';
import clientPrescriptionRoutes from './routes/clients/clientPrescription.js';
import clientTreatmentPlanRoutes from './routes/clients/clientTreatmentPlan.js';
import clientAppointmentRoutes from './routes/clients/clientAppointment.js';
// [DEV-ONLY / DEMO TEST TOOL] - Sẽ bị xóa khi dọn dẹp TopDemoBar
import devDatabaseRoutes from './routes/dev/devDatabase.js';
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

app.use('/api/v1/admin/users', adminUserRoutes);
app.use('/api/v1/admin/patients', adminPatientRoutes);
app.use('/api/v1/admin/services', adminServiceRoutes);
app.use('/api/v1/admin/products', adminProductRoutes);
app.use('/api/v1/admin/medicines', adminMedicineRoutes);
app.use('/api/v1/admin/promotions', adminPromotionRoutes);
app.use('/api/v1/admin/rooms', adminRoomRoutes);
app.use('/api/v1/admin/treatment-plans', adminTreatmentPlanRoutes);
app.use('/api/v1/admin/invoices', adminInvoiceRoutes);
app.use('/api/v1/admin/work-shift-templates', adminWorkShiftTemplateRoutes);
app.use('/api/v1/admin/work-shifts', adminWorkShiftRoutes);
app.use('/api/v1/admin/reports', adminReportRoutes);
app.use('/api/v1/admin/dashboard', adminDashboardRoutes);
app.use('/api/v1/admin', adminDashboardRoutes);

// Dentist Routes - Toàn bộ API phân hệ bác sĩ thống nhất dưới tiền tố /api/v1/dentist/...
app.use('/api/v1/dentist/dashboard', dentistDashboardRoutes);
app.use('/api/v1/dentist/shifts', dentistDashboardRoutes);
app.use('/api/v1/dentist/clinical', dentistClinicalRoutes);
app.use('/api/v1/dentist', dentistDashboardRoutes);
app.use('/api/v1/dentist', dentistClinicalRoutes);
app.use('/api/v1/dentist/treatment-plans', dentistTreatmentPlanRoutes);
app.use('/api/v1/dentist/catalogs', dentistCatalogRoutes);

// Receptionist Routes - Toàn bộ API phân hệ lễ tân thống nhất dưới tiền tố /api/v1/receptionist/...
app.use('/api/v1/receptionist/dashboard', receptionistDashboardRoutes);
app.use('/api/v1/receptionist/appointments', receptionistAppointmentRoutes);
app.use('/api/v1/receptionist/check-in', receptionistCheckInRoutes);
app.use('/api/v1/receptionist/invoices', adminInvoiceRoutes);
app.use('/api/v1/receptionist/promotions', adminPromotionRoutes);
app.use('/api/v1/receptionist', receptionistDashboardRoutes);
app.use('/api/v1/receptionist', receptionistAppointmentRoutes);

// Client Routes - Toàn bộ API phân hệ bệnh nhân
app.use('/api/v1/client/dashboard', clientDashboardRoutes);
app.use('/api/v1/client/profile', clientProfileRoutes);
app.use('/api/v1/client/treatment-history', clientTreatmentHistoryRoutes);
app.use('/api/v1/client/prescriptions', clientPrescriptionRoutes);
app.use('/api/v1/client/treatment-plans', clientTreatmentPlanRoutes);
app.use('/api/v1/client/appointments', clientAppointmentRoutes);

// [DEV-ONLY / DEMO TEST TOOL] - Sẽ bị xóa khi dọn dẹp TopDemoBar
app.use('/api/v1/dev/database', devDatabaseRoutes);

// 404 Not Found Handler (bắt các đường dẫn không tồn tại)
app.use((req, res, next) => {
  next(new ApiError(404, `Không tìm thấy đường dẫn: ${req.method} ${req.originalUrl}`));
});

// Centralized Error Handling Middleware (luôn ở cuối cùng)
app.use(errorHandler);

if (process.argv[1] && process.argv[1].endsWith('app.js')) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export default app;
