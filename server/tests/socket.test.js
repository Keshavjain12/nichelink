import http from 'node:http';
import { io as connectClient } from 'socket.io-client';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SOCKET_EVENTS } from '../src/constants/socketEvents.js';
import { Message } from '../src/models/index.js';
import { createSocketServer } from '../src/sockets/index.js';
import { signAccessToken } from '../src/utils/tokens.js';
import { bearer, buildApp, createFreeUser, createProUser } from './helpers.js';

const EVENT_TIMEOUT_MS = 3000;

function waitForEvent(socket, event, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, listener);
      reject(new Error(`Timed out waiting for "${event}"`));
    }, EVENT_TIMEOUT_MS);
    function listener(payload) {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(payload);
    }
    socket.on(event, listener);
  });
}

const emitWithAck = (socket, event, payload) =>
  socket.timeout(EVENT_TIMEOUT_MS).emitWithAck(event, payload);

describe('Socket.io real-time messaging', () => {
  let app;
  let httpServer;
  let sockets;
  let baseUrl;
  const clients = [];

  beforeEach(async () => {
    app = buildApp();
    httpServer = http.createServer(app);
    sockets = createSocketServer(httpServer);
    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
  });

  afterEach(async () => {
    clients.splice(0).forEach((client) => client.disconnect());
    await sockets.close();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  function connect(auth) {
    const client = connectClient(baseUrl, {
      auth,
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    clients.push(client);
    return client;
  }

  async function connectAs(user) {
    const client = connect({ token: signAccessToken(user._id) });
    await waitForEvent(client, 'connect');
    return client;
  }

  async function openConversation(from, to) {
    const res = await request(app)
      .post('/api/v1/conversations')
      .set(bearer(from))
      .send({ recipientId: String(to._id) })
      .expect(200);
    return res.body.data.id;
  }

  it('rejects connections without a valid token', async () => {
    const anonymous = connect({});
    const error = await waitForEvent(anonymous, 'connect_error');
    expect(error.data.code).toBe('UNAUTHENTICATED');

    const forged = connect({ token: 'not-a-jwt', userId: '64b7f0f0f0f0f0f0f0f0f0f0' });
    const forgedError = await waitForEvent(forged, 'connect_error');
    expect(forgedError.data.code).toBe('UNAUTHENTICATED');
  });

  it('delivers a message from User A to User B instantly and persists it', async () => {
    const alice = await createProUser();
    const bob = await createFreeUser();
    const conversationId = await openConversation(alice, bob);
    const [aliceSocket, bobSocket] = await Promise.all([connectAs(alice), connectAs(bob)]);

    const received = waitForEvent(bobSocket, SOCKET_EVENTS.RECEIVE_MESSAGE);
    const ack = await emitWithAck(aliceSocket, SOCKET_EVENTS.SEND_MESSAGE, {
      conversationId,
      body: 'Real-time hello 👋',
      clientId: 'socket-client-0001',
    });

    expect(ack.ok).toBe(true);
    const event = await received;
    expect(event.message).toMatchObject({
      body: 'Real-time hello 👋',
      senderId: String(alice._id),
    });
    expect(event.conversation.unreadCount).toBe(1);
    expect(await Message.countDocuments({ conversation: conversationId })).toBe(1);
  });

  it('delivers REST-sent messages to connected recipients too', async () => {
    const alice = await createProUser();
    const bob = await createProUser();
    const conversationId = await openConversation(alice, bob);
    const bobSocket = await connectAs(bob);

    const received = waitForEvent(bobSocket, SOCKET_EVENTS.RECEIVE_MESSAGE);
    await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(bearer(alice))
      .send({ body: 'Sent over HTTP' })
      .expect(201);
    expect((await received).message.body).toBe('Sent over HTTP');
  });

  it('refuses to join or send into conversations the user is not part of', async () => {
    const alice = await createProUser();
    const bob = await createProUser();
    const mallory = await createProUser();
    const conversationId = await openConversation(alice, bob);
    const mallorySocket = await connectAs(mallory);

    const join = await emitWithAck(mallorySocket, SOCKET_EVENTS.JOIN_CONVERSATION, {
      conversationId,
    });
    expect(join).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });

    const sendAttempt = await emitWithAck(mallorySocket, SOCKET_EVENTS.SEND_MESSAGE, {
      conversationId,
      body: 'Injected',
    });
    expect(sendAttempt.ok).toBe(false);

    const invalid = await emitWithAck(mallorySocket, SOCKET_EVENTS.SEND_MESSAGE, {
      conversationId: { $ne: null },
      body: 'x',
    });
    expect(invalid.error.code).toBe('VALIDATION_ERROR');
    expect(await Message.countDocuments()).toBe(0);
  });

  it('relays typing indicators and read receipts between participants', async () => {
    const alice = await createProUser();
    const bob = await createProUser();
    const conversationId = await openConversation(alice, bob);
    const [aliceSocket, bobSocket] = await Promise.all([connectAs(alice), connectAs(bob)]);

    expect(
      (await emitWithAck(aliceSocket, SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId })).ok,
    ).toBe(true);
    expect(
      (await emitWithAck(bobSocket, SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId })).ok,
    ).toBe(true);

    const typing = waitForEvent(bobSocket, SOCKET_EVENTS.USER_TYPING);
    aliceSocket.emit(SOCKET_EVENTS.TYPING_START, { conversationId });
    expect(await typing).toMatchObject({
      conversationId,
      userId: String(alice._id),
      isTyping: true,
    });

    const readReceipt = waitForEvent(aliceSocket, SOCKET_EVENTS.CONVERSATION_READ);
    const ack = await emitWithAck(bobSocket, SOCKET_EVENTS.MESSAGE_READ, { conversationId });
    expect(ack.ok).toBe(true);
    expect(await readReceipt).toMatchObject({ conversationId, userId: String(bob._id) });
  });

  it('broadcasts presence to conversation partners and answers presence queries', async () => {
    const alice = await createProUser();
    const bob = await createProUser();
    await openConversation(alice, bob);
    const bobSocket = await connectAs(bob);

    const online = waitForEvent(
      bobSocket,
      SOCKET_EVENTS.USER_ONLINE,
      (payload) => payload.userId === String(alice._id),
    );
    const aliceSocket = await connectAs(alice);
    await online;

    const presence = await emitWithAck(bobSocket, SOCKET_EVENTS.PRESENCE_QUERY, {
      userIds: [String(alice._id)],
    });
    expect(presence.data.online).toEqual([String(alice._id)]);

    const offline = waitForEvent(
      bobSocket,
      SOCKET_EVENTS.USER_OFFLINE,
      (payload) => payload.userId === String(alice._id),
    );
    aliceSocket.disconnect();
    await offline;
  });
});
