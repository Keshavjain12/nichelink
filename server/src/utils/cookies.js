import { env } from '../config/env.js';
import { API_PREFIX } from '../constants/api.js';

export const REFRESH_COOKIE_NAME = 'nl_refresh';
const REFRESH_COOKIE_PATH = `${API_PREFIX}/auth`;

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.COOKIE_SAMESITE,
    path: REFRESH_COOKIE_PATH,
  };
}

export function setRefreshCookie(res, token, expiresAt) {
  res.cookie(REFRESH_COOKIE_NAME, token, { ...baseCookieOptions(), expires: expiresAt });
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
}

export function readRefreshCookie(req) {
  const value = req.cookies?.[REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
