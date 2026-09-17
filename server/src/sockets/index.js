import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { resolveUserFromToken } from '../middleware/authenticate.js';
import { registerConnection } from './connectionHandler.js';
import { attachRealtime, detachRealtime } from './realtime.js';

function handshakeError(code, message) {
  const error = new Error(message);
  error.data = { code };
  return error;
}

/**
 * Authenticated Socket.io gateway. Identity is derived only from the access token supplied in the
 * handshake `auth` payload — never from query strings or client-provided user ids.
 */
export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
    maxHttpBufferSize: 64 * 1024,
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || token.length === 0) {
      return next(handshakeError(ERROR_CODES.UNAUTHENTICATED, 'Authentication required'));
    }
    try {
      socket.data.user = await resolveUserFromToken(token);
      return next();
    } catch (error) {
      return next(
        handshakeError(
          error.code ?? ERROR_CODES.UNAUTHENTICATED,
          error.message ?? 'Authentication failed',
        ),
      );
    }
  });

  io.on('connection', (socket) => {
    try {
      registerConnection(socket);
    } catch (error) {
      logger.error({ err: error }, 'Socket connection setup failed');
      socket.disconnect(true);
    }
  });

  attachRealtime(io);
  logger.info('Socket.io gateway ready');

  return {
    io,
    close: () =>
      new Promise((resolve) => {
        detachRealtime();
        io.close(() => resolve());
      }),
  };
}
