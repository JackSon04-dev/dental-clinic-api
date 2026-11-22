import { asyncHandler } from '../../common/errorMiddleware.js';
import * as publicAiChatService from '../../services/common/publicAiChatService.js';

/**
 * [POST] /api/v1/public/ai/chat
 * Trợ lý AI tư vấn đặt lịch phòng khám DentalCare (công khai, không truy cập dữ liệu cá nhân)
 */
export const postPublicAiChat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;

  const data = await publicAiChatService.chatWithClinicAiService({
    message,
    history,
  });

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Phản hồi từ trợ lý AI thành công',
    data,
  });
});
