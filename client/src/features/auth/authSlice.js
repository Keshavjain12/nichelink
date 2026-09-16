import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  /** idle → loading → authenticated | unauthenticated */
  status: 'idle',
  user: null,
  accessToken: null,
  bootError: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionLoading(state) {
      state.status = 'loading';
      state.bootError = null;
    },
    sessionStarted(state, { payload }) {
      state.status = 'authenticated';
      state.accessToken = payload.accessToken;
      state.user = payload.user;
      state.bootError = null;
    },
    userUpdated(state, { payload }) {
      if (state.user) state.user = { ...state.user, ...payload };
    },
    sessionEnded(state, { payload }) {
      state.status = 'unauthenticated';
      state.accessToken = null;
      state.user = null;
      state.bootError = payload?.bootError ?? null;
    },
  },
});

export const { sessionLoading, sessionStarted, userUpdated, sessionEnded } = authSlice.actions;
export default authSlice.reducer;

export const selectAuth = (state) => state.auth;
export const selectCurrentUser = (state) => state.auth.user;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectIsAuthenticated = (state) => state.auth.status === 'authenticated';
