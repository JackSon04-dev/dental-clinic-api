import express from 'express';
import { postPublicAiChat } from '../../controllers/common/publicAiChatController.js';
import { validate } from '../../common/validateMiddleware.js';
import { publicAiChatRequestSchema } from '../../dtos/common/publicAiChatDto.js';

const router = express.Router();

// Rate-limiter gọn trong RAM theo IP (tối đa 20 requests / 60 giây)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const ipRequestLog = new Map();

const aiChatRateLimiter = (req, res, next) => {
  const now = Date.now();
  const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';

  // Dọn định kỳ các mục hết hạn tránh rò rỉ bộ nhớ
  if (ipRequestLog.size > 500) {
    for (const [ip, timestamps] of ipRequestLog.entries()) {
      const fresh = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (fresh.length === 0) ipRequestLog.delete(ip);
      else ipRequestLog.set(ip, fresh);
    }
  }

  const recent = (ipRequestLog.get(clientIp) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      status: 429,
      message: 'Bạn gửi tin nhắn hơi nhanh. Vui lòng chờ khoảng 1 phút rồi thử lại hoặc gọi 1900 1234.',
    });
  }

  recent.push(now);
  ipRequestLog.set(clientIp, recent);
  return next();
};

/**
 * [POST] /api/v1/public/ai/chat
 */
router.post(
  '/chat',
  aiChatRateLimiter,
  validate(publicAiChatRequestSchema, 'body'),
  postPublicAiChat
);

export default router;
