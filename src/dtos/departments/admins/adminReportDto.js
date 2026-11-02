import Joi from 'joi';

// ============================================================================
// 1. REQUEST SCHEMAS (Joi Validation)
// ============================================================================

/**
 * adminRevenueTrendQuerySchema
 * Kiểm thực query parameters cho API xu hướng doanh thu
 */
export const adminRevenueTrendQuerySchema = Joi.object({
  preset: Joi.string()
    .valid('TODAY', '7_DAYS', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR', 'CUSTOM')
    .default('7_DAYS')
    .messages({
      'any.only': 'Tham số preset phải là một trong: TODAY, 7_DAYS, THIS_MONTH, THIS_QUARTER, THIS_YEAR, CUSTOM',
    }),
  startDate: Joi.string()
    .isoDate()
    .allow('', null)
    .optional()
    .messages({
      'string.isoDate': 'Tham số startDate phải đúng định dạng ngày ISO (YYYY-MM-DD)',
    }),
  endDate: Joi.string()
    .isoDate()
    .allow('', null)
    .optional()
    .messages({
      'string.isoDate': 'Tham số endDate phải đúng định dạng ngày ISO (YYYY-MM-DD)',
    }),
});

/**
 * adminPaymentMethodsQuerySchema
 * Kiểm thực query parameters cho API cơ cấu phương thức thanh toán
 */
export const adminPaymentMethodsQuerySchema = Joi.object({
  preset: Joi.string()
    .valid('TODAY', '7_DAYS', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR', 'CUSTOM')
    .default('7_DAYS')
    .messages({
      'any.only': 'Tham số preset phải là một trong: TODAY, 7_DAYS, THIS_MONTH, THIS_QUARTER, THIS_YEAR, CUSTOM',
    }),
  startDate: Joi.string().isoDate().allow('', null).optional(),
  endDate: Joi.string().isoDate().allow('', null).optional(),
});

/**
 * adminTopPerformanceQuerySchema
 * Kiểm thực query parameters cho API Top hiệu suất Bác sĩ & Dịch vụ
 */
export const adminTopPerformanceQuerySchema = Joi.object({
  preset: Joi.string()
    .valid('TODAY', '7_DAYS', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR', 'CUSTOM')
    .default('THIS_MONTH')
    .messages({
      'any.only': 'Tham số preset phải là một trong: TODAY, 7_DAYS, THIS_MONTH, THIS_QUARTER, THIS_YEAR, CUSTOM',
    }),
  startDate: Joi.string().isoDate().allow('', null).optional(),
  endDate: Joi.string().isoDate().allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(50).default(5).messages({
    'number.base': 'Tham số limit phải là số nguyên',
    'number.min': 'Tham số limit tối thiểu là 1',
    'number.max': 'Tham số limit tối đa là 50',
  }),
});

/**
 * adminInventoryMovementQuerySchema
 * Kiểm thực query parameters cho API báo cáo biến động xuất/nhập/tồn kho
 */
export const adminInventoryMovementQuerySchema = Joi.object({
  preset: Joi.string()
    .valid('TODAY', '7_DAYS', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR', 'CUSTOM')
    .default('CUSTOM')
    .messages({
      'any.only': 'Tham số preset phải là một trong: TODAY, 7_DAYS, THIS_MONTH, THIS_QUARTER, THIS_YEAR, CUSTOM',
    }),
  startDate: Joi.string().isoDate().allow('', null).optional(),
  endDate: Joi.string().isoDate().allow('', null).optional(),
});

/**
 * adminInventoryCategoriesQuerySchema
 * Kiểm thực query parameters cho API cơ cấu tồn kho theo danh mục
 */
export const adminInventoryCategoriesQuerySchema = Joi.object({});

// ============================================================================
// 2. RESPONSE SCHEMAS (Sanitizers & Formatters)
// ============================================================================

/**
 * adminRevenueTrendResponseSchema
 * Chuẩn hóa dữ liệu trả về cho biểu đồ xu hướng doanh thu
 */
export const adminRevenueTrendResponseSchema = ({
  preset,
  startDate,
  endDate,
  comparisonLabel,
  kpi,
  timeline = [],
}) => {
  return {
    preset,
    startDate,
    endDate,
    comparisonLabel,
    kpi: {
      netRevenue: Number(kpi?.netRevenue || 0),
      previousNetRevenue: Number(kpi?.previousNetRevenue || 0),
      growthRate: Number(kpi?.growthRate || 0),
      totalPaidInvoices: Number(kpi?.totalPaidInvoices || 0),
      averageOrderValue: Number(kpi?.averageOrderValue || 0),
    },
    timeline: timeline.map((t) => ({
      label: t.label,
      date: t.date,
      currentRevenue: Number(t.currentRevenue || 0),
      previousRevenue: Number(t.previousRevenue || 0),
      invoiceCount: Number(t.invoiceCount || 0),
    })),
  };
};

/**
 * adminPaymentMethodsResponseSchema
 * Chuẩn hóa dữ liệu trả về cho biểu đồ phân bổ phương thức thanh toán
 */
export const adminPaymentMethodsResponseSchema = (methods = []) => {
  return methods.map((m) => ({
    method: m.method,
    label: m.label,
    amount: Number(m.amount || 0),
    count: Number(m.count || 0),
    percent: Number(m.percent || 0),
    color: m.color,
  }));
};

/**
 * adminTopPerformanceResponseSchema
 * Chuẩn hóa dữ liệu trả về cho danh sách Top Bác sĩ & Top Dịch vụ
 */
export const adminTopPerformanceResponseSchema = ({ dentists = [], services = [] }) => {
  return {
    dentists: dentists.map((d) => ({
      dentistId: d.dentistId,
      dentistName: d.dentistName,
      specialty: d.specialty,
      treatmentsCount: Number(d.treatmentsCount || 0),
      revenue: Number(d.revenue || 0),
      sharePercent: Number(d.sharePercent || 0),
    })),
    services: services.map((s) => ({
      serviceName: s.serviceName,
      count: Number(s.count || 0),
      revenue: Number(s.revenue || 0),
      sharePercent: Number(s.sharePercent || 0),
    })),
  };
};

/**
 * adminInventoryCategoriesResponseSchema
 * Chuẩn hóa dữ liệu trả về cho biểu đồ cơ cấu vốn tồn kho
 */
export const adminInventoryCategoriesResponseSchema = (categories = []) => {
  return categories.map((c) => ({
    category: c.category,
    label: c.label,
    totalValue: Number(c.totalValue || 0),
    totalQuantity: Number(c.totalQuantity || 0),
    skuCount: Number(c.skuCount || 0),
    sharePercent: Number(c.sharePercent || 0),
    color: c.color,
  }));
};

export default {
  adminRevenueTrendQuerySchema,
  adminRevenueTrendResponseSchema,
  adminPaymentMethodsQuerySchema,
  adminPaymentMethodsResponseSchema,
  adminTopPerformanceQuerySchema,
  adminTopPerformanceResponseSchema,
  adminInventoryCategoriesQuerySchema,
  adminInventoryCategoriesResponseSchema,
  adminInventoryMovementQuerySchema,
};
