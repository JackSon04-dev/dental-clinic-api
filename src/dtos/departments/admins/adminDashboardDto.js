import Joi from 'joi';

/**
 * ============================================================================
 * 1. KPI STATS SCHEMAS
 * ============================================================================
 */

/**
 * adminDashboardStatsQuerySchema
 * Kiểm thực query parameters cho API lấy thống kê Dashboard Stats
 */
export const adminDashboardStatsQuerySchema = Joi.object({
  period: Joi.string()
    .valid('today', 'this_week', 'this_month', 'this_quarter', 'this_year')
    .default('this_month')
    .messages({
      'any.only': 'Tham số period phải là một trong các giá trị: today, this_week, this_month, this_quarter, this_year',
    }),
});

/**
 * adminDashboardStatsResponseSchema
 * Chuẩn hóa dữ liệu đầu ra 100% camelCase cho 4 chỉ số KPI cốt lõi
 */
export const adminDashboardStatsResponseSchema = ({
  period,
  revenue,
  completedExaminations,
  todayAppointments,
  todayNewPatients,
}) => {
  return {
    period,
    revenue: {
      current: Number(revenue.current || 0),
      previous: Number(revenue.previous || 0),
      growthRatePercentage: Number(revenue.growthRatePercentage || 0),
    },
    completedExaminations: {
      current: Number(completedExaminations.current || 0),
      previous: Number(completedExaminations.previous || 0),
      growthRatePercentage: Number(completedExaminations.growthRatePercentage || 0),
    },
    todayAppointments: {
      total: Number(todayAppointments.total || 0),
      confirmed: Number(todayAppointments.confirmed || 0),
      inProgress: Number(todayAppointments.inProgress || 0),
      completed: Number(todayAppointments.completed || 0),
      cancelled: Number(todayAppointments.cancelled || 0),
    },
    todayNewPatients: {
      current: Number(todayNewPatients.current || 0),
      yesterday: Number(todayNewPatients.yesterday || 0),
      growthRatePercentage: Number(todayNewPatients.growthRatePercentage || 0),
    },
  };
};

/**
 * ============================================================================
 * 2. TOP SERVICES SCHEMAS
 * ============================================================================
 */

/**
 * adminTopServicesQuerySchema
 * Kiểm thực query parameters cho API lấy danh sách Top dịch vụ
 */
export const adminTopServicesQuerySchema = Joi.object({
  period: Joi.string()
    .valid('today', 'this_week', 'this_month', 'this_quarter', 'this_year')
    .default('this_month')
    .messages({
      'any.only': 'Tham số period phải là một trong các giá trị: today, this_week, this_month, this_quarter, this_year',
    }),
  limit: Joi.number().integer().min(1).max(50).default(5).messages({
    'number.base': 'Tham số limit phải là một số nguyên',
    'number.min': 'Tham số limit tối thiểu là 1',
    'number.max': 'Tham số limit tối đa là 50',
  }),
});

/**
 * adminTopServicesResponseSchema
 * Chuẩn hóa dữ liệu trả về cho danh sách Top dịch vụ
 */
export const adminTopServicesResponseSchema = ({
  period,
  totalRevenuePeriod = 0,
  services = [],
}) => {
  return {
    period,
    totalRevenuePeriod: Number(totalRevenuePeriod || 0),
    totalServicesCount: services.length,
    services: services.map((svc, index) => ({
      rank: index + 1,
      serviceId: svc.serviceId || svc.dich_vu_id,
      serviceCode: svc.serviceCode || svc.ma_dich_vu,
      serviceName: svc.serviceName || svc.ten_dich_vu,
      executionCount: Number(svc.executionCount ?? svc.execution_count ?? 0),
      totalRevenue: Number(svc.totalRevenue ?? svc.total_revenue ?? 0),
      percentageContribution: Number(svc.percentageContribution ?? 0),
    })),
  };
};

/**
 * ============================================================================
 * 3. INVENTORY ALERTS SCHEMAS
 * ============================================================================
 */

/**
 * adminAlertsQuerySchema
 * Kiểm thực query parameters cho API lấy danh sách cảnh báo tồn kho
 */
export const adminAlertsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'Tham số limit phải là một số nguyên',
    'number.min': 'Tham số limit tối thiểu là 1',
    'number.max': 'Tham số limit tối đa là 100',
  }),
});

/**
 * adminAlertsResponseSchema
 * Chuẩn hóa dữ liệu trả về cho danh sách cảnh báo tồn kho
 */
export const adminAlertsResponseSchema = ({ summary, alerts = [] }) => {
  return {
    summary: {
      totalAlerts: Number(summary?.totalAlerts ?? alerts.length),
      criticalCount: Number(summary?.criticalCount ?? 0),
      warningCount: Number(summary?.warningCount ?? 0),
    },
    alerts: alerts.map((item) => ({
      id: item.id,
      productCode: item.productCode || item.ma_san_pham,
      productName: item.productName || item.ten_san_pham,
      category: item.category || item.loai,
      unit: item.unit || item.don_vi_tinh,
      stockQuantity: Number(item.stockQuantity ?? item.so_luong_ton ?? 0),
      minStockThreshold: Number(item.minStockThreshold ?? item.muc_ton_toi_thieu ?? 0),
      alertLevel: item.alertLevel,
      message: item.message,
    })),
  };
};

export default {
  adminDashboardStatsQuerySchema,
  adminDashboardStatsResponseSchema,
  adminTopServicesQuerySchema,
  adminTopServicesResponseSchema,
  adminAlertsQuerySchema,
  adminAlertsResponseSchema,
};
