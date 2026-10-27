import jwt from 'jsonwebtoken';
import { ApiError } from '../../common/errorMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dental_clinic_jwt_super_secret_key_2026';

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
    const decoded = jwt.verify(token, JWT_SECRET);
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
 * restrictToRoles - Kiem tra phan quyen theo dung field schema:
 * - accountType ('admin', 'nha_si', 'nhan_vien', 'benh_nhan')
 * - position ('le_tan')
 * - role ('BAC_SI', 'LE_TAN', 'ADMIN')
 */
export const restrictToRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Khong tim thay thong tin nguoi dung!'));
    }

    const accountType = req.user.accountType.toLowerCase();
    const position = req.user.position ? req.user.position.toLowerCase() : null;
    const role = req.user.role.toLowerCase();
    const allowedRoles = roles.flat().map((r) => r.toLowerCase());

    const isAllowed =
      allowedRoles.includes(accountType) ||
      (position && allowedRoles.includes(position)) ||
      allowedRoles.includes(role);

    if (!isAllowed) {
      return next(new ApiError(403, 'Ban khong co quyen thuc hien hanh dong nay!'));
    }

    next();
  };
};

export default {
  verifyToken,
  restrictToRoles,
};
