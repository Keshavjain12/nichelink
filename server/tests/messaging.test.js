import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Conversation, Message, Notification, User } from '../src/models/index.js';
import { bearer, buildApp, createFreeUser, createProUser } from './helpers.js';

describe('messaging API', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  const start = (from, to) =>
    request(app).post('/api/v1/conversations').set(bearer(from)).send({ recipientId: String(to._id) });

  const send = (from, conversationId, body, extra = {}) =>
    request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(bearer(from))
      .send({ body, ...extra });

  it('requires authentication', async () => {
    await request(app).get('/api/v1/conversations').expect(401);
  });

  it('starts a single conversation per pair and validates recipients', async () => {
    const alice = await createProUser();
    const bob = await createFreeUser();

    const first = await start(alice, bob).expect(200);
    const second = await start(bob, alice).expect(200);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(first.body.data.participant.username).toBe(bob.username);

    await request(app).post('/api/v1/conversations').set(bearer(alice)).send({ recipientId: String(alice._id) }).expect(400);
    await request(app)
      .post('/api/v1/conversations')
      .set(bearer(alice))
      .send({ recipientId: '64b7f0f0f0f0f0f0f0f0f0f0' })
      .expect(404);
  });

  it('persists messages, tracks unread counts and read state', async () => {
    const alice = await createProUser();
    const bob = await createProUser();
    const { body } = await start(alice, bob).expect(200);
    const conversationId = body.data.id;

    // An empty conversation is hidden from the recipient until a message arrives.
    const beforeMessage = await request(app).get('/api/v1/conversations').set(bearer(bob)).expect(200);
    expect(beforeMessage.body.data).toHaveLength(0);

    await send(alice, conversationId, 'Hey Bob, loved your talk on event sourcing!').expect(201);
    await send(alice, conversationId, 'Would you be up for a quick call?').expect(201);

    const inbox = await request(app).get('/api/v1/conversations').set(bearer(bob)).expect(200);
    expect(inbox.body.data[0]).toMatchObject({
      id: conversationId,
      unreadCount: 2,
      lastMessage: { body: 'Would you be up for a quick call?', senderId: String(alice._id) },
    });

    const unread = await request(app).get('/api/v1/conversations/unread-count').set(bearer(bob)).expect(200);
    expect(unread.body.data.unreadCount).toBe(2);
    expect(await Notification.countDocuments({ recipient: bob._id, type: 'message' })).toBe(1);

    const history = await request(app).get(`/api/v1/conversations/${conversationId}/messages`).set(bearer(bob)).expect(200);
    expect(history.body.data.map((message) => message.body)).toEqual([
      'Hey Bob, loved your talk on event sourcing!',
      'Would you be up for a quick call?',
    ]);

    await request(app).patch(`/api/v1/conversations/${conversationId}/read`).set(bearer(bob)).expect(200);
    const afterRead = await request(app).get(`/api/v1/conversations/${conversationId}`).set(bearer(bob)).expect(200);
    expect(afterRead.body.data.unreadCount).toBe(0);
    expect(await Notification.countDocuments({ recipient: bob._id, type: 'message', readAt: null })).toBe(0);
  });

  it('prevents non-participants from reading or writing a conversation (IDOR)', async () => {
    const alice = await createProUser();
    const bob = await createProUser();
    const mallory = await createProUser();
    const { body } = await start(alice, bob).expect(200);
    const conversationId = body.data.id;
    await send(alice, conversationId, 'Private hello').expect(201);

    await request(app).get(`/api/v1/conversations/${conversationId}`).set(bearer(mallory)).expect(404);
    await request(app).get(`/api/v1/conversations/${conversationId}/messages`).set(bearer(mallory)).expect(404);
    await send(mallory, conversationId, 'Injected').expect(404);
    await request(app).patch(`/api/v1/conversations/${conversationId}/read`).set(bearer(mallory)).expect(404);
    expect(await Message.countDocuments({ conversation: conversationId })).toBe(1);
  });

  it('limits FreeMembers to a daily quota and gives Pro members unlimited messaging', async () => {
    const free = await createFreeUser();
    const pro = await createProUser();
    const { body } = await start(free, pro).expect(200);

    for (let i = 0; i < 10; i += 1) {
      await send(free, body.data.id, `Message ${i + 1}`).expect(201);
    }
    const blocked = await send(free, body.data.id, 'One too many').expect(403);
    expect(blocked.body.code).toBe('DM_LIMIT_REACHED');

    const quota = await request(app).get('/api/v1/conversations/quota').set(bearer(free)).expect(200);
    expect(quota.body.data).toMatchObject({ unlimited: false, limit: 10, remaining: 0 });

    for (let i = 0; i < 12; i += 1) {
      await send(pro, body.data.id, `Pro reply ${i + 1}`).expect(201);
    }
  });

  it('de-duplicates retries that reuse a clientId', async () => {
    const alice = await createProUser();
    const bob = await createProUser();
    const { body } = await start(alice, bob).expect(200);

    const first = await send(alice, body.data.id, 'Retry-safe message', { clientId: 'client-msg-0001' }).expect(201);
    const retry = await send(alice, body.data.id, 'Retry-safe message', { clientId: 'client-msg-0001' }).expect(200);
    expect(retry.body.data.id).toBe(first.body.data.id);
    expect(await Message.countDocuments({ conversation: body.data.id })).toBe(1);
  });

  it('paginates history with a cursor', async () => {
    const alice = await createProUser();
    const bob = await createProUser();
    const { body } = await start(alice, bob).expect(200);
    for (let i = 1; i <= 5; i += 1) {
      await send(alice, body.data.id, `Message ${i}`).expect(201);
    }

    const latest = await request(app)
      .get(`/api/v1/conversations/${body.data.id}/messages?limit=2`)
      .set(bearer(alice))
      .expect(200);
    expect(latest.body.data.map((message) => message.body)).toEqual(['Message 4', 'Message 5']);
    expect(latest.body.meta.hasMore).toBe(true);

    const older = await request(app)
      .get(`/api/v1/conversations/${body.data.id}/messages?limit=2&before=${latest.body.meta.nextCursor}`)
      .set(bearer(alice))
      .expect(200);
    expect(older.body.data.map((message) => message.body)).toEqual(['Message 2', 'Message 3']);
  });

  it('refuses delivery to suspended members', async () => {
    const alice = await createProUser();
    const bob = await createProUser();
    const { body } = await start(alice, bob).expect(200);
    await User.updateOne({ _id: bob._id }, { status: 'suspended' });
    await send(alice, body.data.id, 'Are you there?').expect(403);
  });

  it('sends a direct message by recipient id', async () => {
    const alice = await createProUser();
    const bob = await createProUser();
    const res = await request(app)
      .post('/api/v1/messages')
      .set(bearer(alice))
      .send({ recipientId: String(bob._id), body: 'Saw your project post — interested!' })
      .expect(201);

    expect(res.body.data.conversation.participant.username).toBe(bob.username);
    expect(await Conversation.countDocuments()).toBe(1);
  });
});
