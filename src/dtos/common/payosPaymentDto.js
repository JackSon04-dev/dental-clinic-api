import Joi from 'joi';

/**
 * Schema kiểm thực dữ liệu tạo link thanh toán PayOS
 */
export const createPayosPaymentRequestSchema = Joi.object({
  invoiceId: Joi.string().uuid().required().messages({
    'any.required': 'ID hóa đơn (invoiceId) là bắt buộc',
    'string.guid': 'ID hóa đơn phải là UUID hợp lệ',
  }),
  customAmount: Joi.number().min(1000).optional().messages({
    'number.base': 'Số tiền thanh toán phải là số',
    'number.min': 'Số tiền thanh toán tối thiểu là 1.000 VNĐ',
  }),
  clientBaseUrl: Joi.string().uri().optional().allow('', null).messages({
    'string.uri': 'clientBaseUrl phải là định dạng URL hợp lệ',
  }),
});

/**
 * Schema kiểm thực param invoiceId
 */
export const payosInvoiceIdParamSchema = Joi.object({
  invoiceId: Joi.string().uuid().required().messages({
    'any.required': 'invoiceId là bắt buộc',
    'string.guid': 'invoiceId phải là UUID hợp lệ',
  }),
});

