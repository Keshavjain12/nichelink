import { API_URL } from '../constants/app';

let inflightRefresh = null;

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Concurrent callers share a single
 * request so parallel 401s never trigger refresh-token reuse detection.
 *
 * Resolves to `{ accessToken, user }`, or `null` when there is no valid session.
 * Rejects on network failures so callers can distinguish "signed out" from "offline".
 */
export function refreshSession() {
  if (!inflightRefresh) {
    inflightRefresh = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = await response.json();
        return body.data;
      })
      .finally(() => {
        inflightRefresh = null;
      });
  }
  return inflightRefresh;
}
