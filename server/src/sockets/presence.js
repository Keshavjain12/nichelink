/**
 * In-memory presence: reference-counted socket connections per user, so a user with several tabs
 * only goes offline when the last one disconnects.
 *
 * Scope: a single API instance. Running multiple instances requires the Socket.io Redis adapter and
 * a shared presence store (see docs/socket-events.md).
 */
const connectionCounts = new Map();

/** @returns {boolean} true when this is the user's first active connection. */
export function addConnection(userId) {
  const count = (connectionCounts.get(userId) ?? 0) + 1;
  connectionCounts.set(userId, count);
  return count === 1;
}

/** @returns {boolean} true when the user has no remaining connections. */
export function removeConnection(userId) {
  const count = (connectionCounts.get(userId) ?? 1) - 1;
  if (count <= 0) {
    connectionCounts.delete(userId);
    return true;
  }
  connectionCounts.set(userId, count);
  return false;
}

export function isOnline(userId) {
  return connectionCounts.has(String(userId));
}

export function onlineSubset(userIds) {
  return userIds.filter((userId) => isOnline(userId));
}
