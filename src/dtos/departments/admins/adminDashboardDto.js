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

/**
 * ============================================================================
 * 4. PATIENT FLOW SCHEMAS
 * ============================================================================
 */

/**
 * adminPatientFlowQuerySchema
 * Kiểm thực query parameters cho API lấy lưu lượng bệnh nhân
 */
export const adminPatientFlowQuerySchema = Joi.object({
  timeRange: Joi.string().valid('7D', '30D', 'TODAY').default('7D').messages({
    'any.only': 'Tham số timeRange phải là một trong: 7D, 30D, TODAY',
  }),
  date: Joi.string().isoDate().allow('', null).optional().messages({
    'string.isoDate': 'Tham số date phải đúng định dạng ngày ISO (YYYY-MM-DD)',
  }),
});

/**
 * adminPatientFlowResponseSchema
 * Chuẩn hóa dữ liệu trả về cho biểu đồ lưu lượng bệnh nhân
 */
export const adminPatientFlowResponseSchema = ({
  timeRange,
  growthRatePercentage = 0,
  points = [],
}) => {
  return {
    timeRange,
    growthRatePercentage: Number(growthRatePercentage || 0),
    points: points.map((p) => ({
      label: p.label,
      date: p.date || p.label, // Cung cấp cả label và date để tương thích 100% với Recharts XAxis dataKey="date"
      newPatients: Number(p.newPatients || 0),
      followUp: Number(p.followUp || 0),
      total: Number((p.newPatients || 0) + (p.followUp || 0)),
    })),
  };
};

/**
 * ============================================================================
 * 5. CHAIR UTILIZATION SCHEMAS
 * ============================================================================
 */

/**
 * adminChairUtilizationQuerySchema
 * Kiểm thực query parameters cho API công suất sử dụng phòng / ghế khám
 */
export const adminChairUtilizationQuerySchema = Joi.object({
  date: Joi.string().isoDate().allow('', null).optional().messages({
    'string.isoDate': 'Tham số date phải đúng định dạng ngày ISO (YYYY-MM-DD)',
  }),
});

/**
 * adminChairUtilizationResponseSchema
 * Chuẩn hóa dữ liệu trả về cho biểu đồ công suất ghế khám
 */
export const adminChairUtilizationResponseSchema = ({
  date,
  totalActiveRooms = 0,
  overallOccupancyRate = 0,
  timeSlots = [],
}) => {
  return {
    date,
    totalActiveRooms: Number(totalActiveRooms || 0),
    overallOccupancyRate: Number(overallOccupancyRate || 0),
    timeSlots: timeSlots.map((ts) => ({
      slot: ts.slot,
      label: ts.label,
      rate: Number(ts.rate || 0),
      activeRooms: Number(ts.activeRooms || 0),
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
  adminPatientFlowQuerySchema,
  adminPatientFlowResponseSchema,
  adminChairUtilizationQuerySchema,
  adminChairUtilizationResponseSchema,
};

