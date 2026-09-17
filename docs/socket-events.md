# Socket.io events

The gateway lives in `server/src/sockets/`. `index.js` authenticates connections,
`connectionHandler.js` registers event handlers, `presence.js` tracks who is online and
`realtime.js` is the facade services use to emit without importing Socket.io.

## Connecting

```js
const socket = io(SOCKET_URL, { auth: (cb) => cb({ token: accessToken }) });
```

- The handshake middleware verifies the **access token** and loads the user. Identity is never taken from
  query parameters or the client payload.
- Failures reject with `error.data.code` = `UNAUTHENTICATED`, `TOKEN_EXPIRED` or `ACCOUNT_SUSPENDED`.
  Socket.io does not retry handshake rejections, so the client refreshes its token and reconnects
  (`useRealtimeBridge`).
- Passing `auth` as a callback means every reconnect picks up the freshest token.

Rooms: every socket joins `user:<userId>`. Conversation rooms (`conversation:<conversationId>`) are joined
explicitly and only after a membership check.

## Client → server

All of these take an acknowledgement callback and resolve to `{ ok: true, data }` or
`{ ok: false, error: { code, message, status } }`.

| Event                          | Payload                               | Behaviour                                                                                                                           |
| ------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `join_conversation`            | `{ conversationId }`                  | Verifies membership, then joins the room. 404 for non-participants.                                                                 |
| `leave_conversation`           | `{ conversationId }`                  | Leaves the room.                                                                                                                    |
| `send_message`                 | `{ conversationId, body, clientId? }` | Re-reads the sender's authorization, enforces the Free-tier quota, persists, then fans out. Rate limited to 20 per 10 s per socket. |
| `message_read`                 | `{ conversationId }`                  | Zeroes the viewer's unread count and clears message notifications.                                                                  |
| `typing_start` / `typing_stop` | `{ conversationId }`                  | Relayed only if the socket has joined that room. No acknowledgement. Rate limited to 30 per 10 s.                                   |
| `presence_query`               | `{ userIds: [...] }` (max 200)        | Returns `{ online: [...] }`.                                                                                                        |

## Server → client

| Event                          | Payload                                                                      | Sent to                                                              |
| ------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `receive_message`              | `{ message, conversation: { id, lastMessage, lastMessageAt, unreadCount } }` | Both participants' user rooms (sender included, so every tab syncs). |
| `conversation_read`            | `{ conversationId, userId, lastReadAt }`                                     | Both participants — drives the "Seen" indicator.                     |
| `user_typing`                  | `{ conversationId, userId, isTyping }`                                       | The conversation room, except the sender.                            |
| `user_online` / `user_offline` | `{ userId, at }`                                                             | Users who share a conversation with that person.                     |
| `notification_new`             | serialized notification                                                      | The recipient's user room.                                           |
| `notification_count`           | `{ unreadCount }`                                                            | The recipient's user room.                                           |
| `session_updated`              | `{ reason, role }`                                                           | The affected user — triggers a session refresh after plan changes.   |

## Delivery guarantees

- **Persist, then emit.** A message exists in MongoDB before any socket event is sent, so an offline
  recipient finds it in history. Sockets are an accelerator, never the system of record.
- **Idempotent retries.** `clientId` is unique per sender (partial unique index); replaying a send returns
  the original message instead of creating a duplicate.
- **REST fallback.** Every real-time action has an HTTP equivalent
  (`POST /conversations/:id/messages`, `PATCH /conversations/:id/read`). The chat UI uses it whenever the
  socket is disconnected, and the server emits the same events either way.

## Security

- Authentication happens once in the handshake and is **re-checked on every privileged action** with
  `loadRequestUser`, so suspensions and plan changes apply without reconnecting.
- Typing events cannot be broadcast into arbitrary rooms: the socket must have joined, which required a
  membership check.
- Payloads are validated with the same Zod schemas as the REST endpoints.
- Suspending a member calls `disconnectUser`, closing all their sockets immediately.

## Scaling beyond one instance

Presence and rooms live in the process memory of a single API instance. Horizontal scaling requires:

1. `@socket.io/redis-adapter` so rooms span instances.
2. A shared presence store (Redis counters keyed by user id) replacing `sockets/presence.js`.
3. Sticky sessions, or `transports: ['websocket']` only.

This is deliberately out of scope for the current deployment (one Render instance).
