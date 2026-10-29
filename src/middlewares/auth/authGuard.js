import { ApiError } from '../../common/errorMiddleware.js';
import { verifyAccessToken } from '../../utils/jwt.js';

/**
 * verifyToken - Giai ma va kiem tra tinh hop le cua Access Token
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return next(new ApiError(401, 'Truy cap bi tu choi. Khong tim thay Access Token!'));
  }

  // Tach token linh hoat: ho tro 'Bearer <token>', 'Bearer<token>', hoac chi truyen moi token 'ey...'
  let token = authHeader.trim();
  if (token.toLowerCase().startsWith('bearer')) {
    token = token.slice(6).trim();
  }

  if (!token) {
    return next(new ApiError(401, 'Truy cap bi tu choi. Khong tim thay Access Token!'));
  }

  try {
    const decoded = verifyAccessToken(token);
    if (!decoded || typeof decoded === 'string') {
      return next(new ApiError(401, 'Access Token khong hop le hoac da bi chinh sua.'));
    }
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Access Token da het han. Vui long cap lai token moi.'));
    }
    return next(new ApiError(401, 'Access Token khong hop le hoac da bi chinh sua.'));
  }
};

/**
 * restrictToRoles - Kiểm tra phân quyền RBAC dựa trên duy nhất 1 trường `role`:
 * Chuẩn hóa 4 vai trò hệ thống: 'ADMIN', 'BAC_SI', 'LE_TAN', 'BENH_NHAN'
 */
export const restrictToRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ApiError(401, 'Khong tim thay thong tin nguoi dung!'));
    }

    const userRole = String(req.user.role).toUpperCase();
    const allowedRoles = roles.flat().map((r) => String(r).toUpperCase());

    if (!allowedRoles.includes(userRole)) {
      return next(new ApiError(403, 'Ban khong co quyen thuc hien hanh dong nay!'));
    }

    next();
  };
};

export default {
  verifyToken,
  restrictToRoles,
};
