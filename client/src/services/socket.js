import { io } from 'socket.io-client';
import { SOCKET_URL } from '../constants/app';

const ACK_TIMEOUT_MS = 8000;

let socket = null;

/**
 * Creates (or returns) the singleton socket. `getToken` is evaluated on every connection attempt,
 * so reconnects automatically use the freshest access token.
 */
export function connectSocket(getToken) {
  if (socket) return socket;
  socket = io(SOCKET_URL || undefined, {
    auth: (callback) => callback({ token: getToken() }),
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

/** Emits with an acknowledgement and normalizes `{ ok, data | error }` into resolve / reject. */
export async function emitWithAck(event, payload) {
  if (!socket?.connected) throw Object.assign(new Error('Real-time connection unavailable'), { code: 'SOCKET_DISCONNECTED' });
  const response = await socket.timeout(ACK_TIMEOUT_MS).emitWithAck(event, payload);
  if (!response?.ok) {
    throw Object.assign(new Error(response?.error?.message ?? 'Request failed'), {
      code: response?.error?.code,
      data: response?.error,
    });
  }
  return response.data;
}
