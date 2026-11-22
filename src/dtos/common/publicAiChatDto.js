import Joi from 'joi';

/**
 * Schema kiểm thực dữ liệu gửi vào Trợ lý AI phòng khám (Public AI Chat)
 */
export const publicAiChatRequestSchema = Joi.object({
  message: Joi.string().trim().min(1).max(1000).required().messages({
    'any.required': 'Vui lòng nhập nội dung câu hỏi.',
    'string.empty': 'Nội dung câu hỏi không được để trống.',
    'string.max': 'Nội dung câu hỏi tối đa 1.000 ký tự.',
  }),
  history: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid('user', 'model').required().messages({
          'any.only': 'Vai trò tin nhắn lịch sử chỉ chấp nhận user hoặc model.',
        }),
        text: Joi.string().trim().min(1).max(2000).required().messages({
          'string.empty': 'Nội dung tin nhắn lịch sử không được để trống.',
        }),
      })
    )
    .max(12)
    .optional()
    .default([]),
});
