import { ApiError } from './errorMiddleware.js';

/**
 * Generic Validation Middleware sử dụng Joi Schema
 * Hỗ trợ các trường hợp:
 * 1. validate(schema) -> mặc định validate req.body
 * 2. validate(schema, 'query' | 'params' | 'body') -> validate một phần cụ thể
 * 3. validate({ body: schema1, query: schema2, params: schema3 }) -> validate nhiều phần cùng lúc
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    // Trường hợp 1: Truyền object đa thành phần { body, query, params }
    if (schema && typeof schema === 'object' && typeof schema.validate !== 'function') {
      const parts = ['params', 'query', 'body'];
      for (const part of parts) {
        if (schema[part]) {
          const { error, value } = schema[part].validate(req[part], {
            abortEarly: false,
            stripUnknown: true,
          });
          if (error) {
            const msgs = error.details.map((d) => d.message);
            return next(new ApiError(400, `Dữ liệu ${part} không hợp lệ`, msgs));
          }
          req[part] = value;
        }
      }
      return next();
    }

    // Trường hợp 2: Truyền một Joi schema đơn lẻ
    if (!schema || typeof schema.validate !== 'function') {
      return next();
    }

    // Chuẩn bị dữ liệu để validate
    const dataToValidate = req[source] || {};

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const msgs = error.details.map((d) => d.message);
      return next(new ApiError(400, 'Dữ liệu đầu vào không hợp lệ', msgs));
    }

    req[source] = value;
    next();
  };
};

export default validate;
