/**
 * Thin facade between services and Socket.io. Services call these helpers without knowing
 * whether a socket server exists (e.g. in unit tests or seed scripts, where they are no-ops).
 */
let io = null;

export const userRoom = (userId) => `user:${userId}`;
export const conversationRoom = (conversationId) => `conversation:${conversationId}`;

export function attachRealtime(server) {
  io = server;
}

export function detachRealtime() {
  io = null;
}

export function emitToUser(userId, event, payload) {
  io?.to(userRoom(String(userId))).emit(event, payload);
}

export function emitToUsers(userIds, event, payload) {
  if (!io || userIds.length === 0) return;
  io.to(userIds.map((id) => userRoom(String(id)))).emit(event, payload);
}

/** Forcefully closes every socket of a user (e.g. after suspension). */
export function disconnectUser(userId) {
  io?.in(userRoom(String(userId))).disconnectSockets(true);
}

export function emitToConversation(conversationId, event, payload, { exceptSocket } = {}) {
  if (!io) return;
  const target = io.to(conversationRoom(String(conversationId)));
  (exceptSocket ? target.except(exceptSocket) : target).emit(event, payload);
}
