import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dental_clinic_jwt_super_secret_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dental_clinic_jwt_refresh_super_secret_key_2026';
const ACCESS_TOKEN_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

/**
 * Sinh Access Token cho người dùng
 * @param {{ userId: number, profileId: number|null, role: string }} payload
 * @returns {string}
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

/**
 * Sinh Refresh Token cho phiên làm việc
 * @param {{ userId: number, profileId: number|null, role: string }} payload
 * @returns {string}
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};

/**
 * Xác thực và giải mã Access Token
 * @param {string} token
 * @returns {object}
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Xác thực và giải mã Refresh Token
 * @param {string} token
 * @returns {object}
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
