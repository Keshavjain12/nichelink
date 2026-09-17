import { User } from '../models/index.js';
import { toSessionUser } from '../serializers/userSerializer.js';
import * as authService from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '../utils/cookies.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

const requestMeta = (req) => ({ userAgent: req.get('user-agent'), ip: req.ip });

function sessionPayload(res, session) {
  if (session.refresh) setRefreshCookie(res, session.refresh.token, session.refresh.expiresAt);
  return { accessToken: session.accessToken, user: toSessionUser(session.user) };
}

export async function register(req, res) {
  const session = await authService.register(req.body, requestMeta(req));
  sendCreated(res, { data: sessionPayload(res, session), message: 'Welcome to NicheLink!' });
}

export async function login(req, res) {
  const session = await authService.login(req.body, requestMeta(req));
  sendSuccess(res, { data: sessionPayload(res, session), message: 'Signed in' });
}

export async function refresh(req, res) {
  const rawToken = readRefreshCookie(req);
  // No cookie simply means "not signed in" (every guest page load asks). That is not an
  // authentication failure, so it must not surface as a 401 in the browser console.
  // A cookie that is present but invalid, expired or reused still returns 401.
  if (!rawToken) return sendSuccess(res, { data: null });

  try {
    const session = await authService.refreshSession(rawToken, requestMeta(req));
    sendSuccess(res, { data: sessionPayload(res, session) });
  } catch (error) {
    clearRefreshCookie(res);
    throw error;
  }
}

export async function logout(req, res) {
  await authService.logout(readRefreshCookie(req));
  clearRefreshCookie(res);
  sendSuccess(res, { message: 'Signed out' });
}

export async function me(req, res) {
  const user = await User.findById(req.user.id).lean();
  if (!user) throw ApiError.unauthorized();
  sendSuccess(res, { data: { user: toSessionUser(user) } });
}

export async function changePassword(req, res) {
  const session = await authService.changePassword(req.user.id, req.body, requestMeta(req));
  sendSuccess(res, { data: sessionPayload(res, session), message: 'Password updated' });
}
