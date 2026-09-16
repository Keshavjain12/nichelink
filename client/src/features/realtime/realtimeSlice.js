import { createSlice } from '@reduxjs/toolkit';

const realtimeSlice = createSlice({
  name: 'realtime',
  initialState: {
    connected: false,
    onlineUserIds: {},
    /** conversationId → userId currently typing */
    typing: {},
    unreadNotifications: null,
  },
  reducers: {
    connectionChanged(state, { payload }) {
      state.connected = payload;
    },
    presenceChanged(state, { payload: { userId, online } }) {
      if (online) state.onlineUserIds[userId] = true;
      else delete state.onlineUserIds[userId];
    },
    presenceSynced(state, { payload: { userIds, online } }) {
      userIds.forEach((userId) => {
        if (online.includes(userId)) state.onlineUserIds[userId] = true;
        else delete state.onlineUserIds[userId];
      });
    },
    typingChanged(state, { payload: { conversationId, userId, isTyping } }) {
      if (isTyping) state.typing[conversationId] = userId;
      else if (state.typing[conversationId] === userId) delete state.typing[conversationId];
    },
    unreadNotificationsChanged(state, { payload }) {
      state.unreadNotifications = payload;
    },
    realtimeReset() {
      return { connected: false, onlineUserIds: {}, typing: {}, unreadNotifications: null };
    },
  },
});

export const {
  connectionChanged,
  presenceChanged,
  presenceSynced,
  typingChanged,
  unreadNotificationsChanged,
  realtimeReset,
} = realtimeSlice.actions;
export default realtimeSlice.reducer;

export const selectSocketConnected = (state) => state.realtime.connected;
export const selectIsOnline = (userId) => (state) => Boolean(userId && state.realtime.onlineUserIds[userId]);
export const selectTypingUser = (conversationId) => (state) => state.realtime.typing[conversationId] ?? null;
