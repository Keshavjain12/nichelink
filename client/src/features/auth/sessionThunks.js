import { api } from '../../app/api';
import { disconnectSocket } from '../../services/socket';
import { refreshSession } from '../../services/session';
import { authApi } from './authApi';
import { sessionEnded, sessionLoading, sessionStarted } from './authSlice';

/** Restores a session from the refresh cookie on app start. */
export const bootstrapSession = () => async (dispatch) => {
  dispatch(sessionLoading());
  try {
    const session = await refreshSession();
    dispatch(session ? sessionStarted(session) : sessionEnded());
  } catch {
    dispatch(sessionEnded({ bootError: 'We could not reach NicheLink. Some features may be unavailable.' }));
  }
};

export const signOut = () => async (dispatch) => {
  try {
    await dispatch(authApi.endpoints.logout.initiate()).unwrap();
  } finally {
    // Clear local state even if the server call fails; the refresh cookie expires on its own.
    disconnectSocket();
    dispatch(sessionEnded());
    dispatch(api.util.resetApiState());
  }
};

/** Re-reads the session user (after plan changes, profile edits, etc.). */
export const refreshCurrentUser = () => (dispatch) =>
  dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true, subscribe: false }));
