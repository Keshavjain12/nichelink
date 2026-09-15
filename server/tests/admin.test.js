import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuditLog, Comment, Notification, Post, Report, User } from '../src/models/index.js';
import { createComment, createPost } from './fixtures.js';
import {
  CSRF_HEADERS,
  TEST_PASSWORD,
  bearer,
  buildApp,
  createAdmin,
  createCommunity,
  createFreeUser,
  createProUser,
  extractRefreshCookie,
} from './helpers.js';

const ADMIN_ENDPOINTS = [
  ['get', '/api/v1/admin/stats'],
  ['get', '/api/v1/admin/users'],
  ['get', '/api/v1/admin/communities'],
  ['get', '/api/v1/admin/reports'],
  ['get', '/api/v1/admin/audit-logs'],
  ['patch', '/api/v1/admin/users/64b7f0f0f0f0f0f0f0f0f0f0/status'],
  ['patch', '/api/v1/admin/reports/64b7f0f0f0f0f0f0f0f0f0f0'],
];

describe('admin API', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  it('denies guests, FreeMembers and ProMembers on every admin endpoint', async () => {
    const free = await createFreeUser();
    const pro = await createProUser();

    for (const [method, url] of ADMIN_ENDPOINTS) {
      await request(app)[method](url).expect(401);
      await request(app)[method](url).set(bearer(free)).send({ status: 'suspended' }).expect(403);
      await request(app)[method](url).set(bearer(pro)).send({ status: 'suspended' }).expect(403);
    }
  });

  it('returns dashboard metrics for admins', async () => {
    const admin = await createAdmin();
    const pro = await createProUser();
    await createFreeUser();
    const community = await createCommunity({ createdBy: admin });
    await createPost({ author: pro, community });

    const res = await request(app).get('/api/v1/admin/stats').set(bearer(admin)).expect(200);
    expect(res.body.data.totals).toMatchObject({ users: 3, proUsers: 1, freeUsers: 1, adminUsers: 1, communities: 1, posts: 1 });
    expect(res.body.data.series.signups).toHaveLength(30);
    expect(res.body.data.series.signups.at(-1).count).toBe(3);
    expect(res.body.data.recentUsers[0].email).toBeDefined();
  });

  it('lists and filters users', async () => {
    const admin = await createAdmin();
    await createProUser({ username: 'maya_ops' });
    await createFreeUser({ username: 'liam_docs' });

    const byPrefix = await request(app).get('/api/v1/admin/users?q=maya').set(bearer(admin)).expect(200);
    expect(byPrefix.body.data.map((user) => user.username)).toEqual(['maya_ops']);

    const byRole = await request(app).get('/api/v1/admin/users?role=FreeMember').set(bearer(admin)).expect(200);
    expect(byRole.body.data.map((user) => user.username)).toEqual(['liam_docs']);
    expect(byRole.body.meta.total).toBe(1);
  });

  describe('account management', () => {
    it('suspends a member, revoking sessions and access immediately', async () => {
      const admin = await createAdmin();
      const member = await createFreeUser();
      const login = await request(app).post('/api/v1/auth/login').send({ email: member.email, password: TEST_PASSWORD }).expect(200);
      const cookie = extractRefreshCookie(login);

      await request(app)
        .patch(`/api/v1/admin/users/${member._id}/status`)
        .set(bearer(admin))
        .send({ status: 'suspended', reason: 'Spam' })
        .expect(200);

      await request(app).get('/api/v1/auth/me').set(bearer(member)).expect(403);
      await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).set(CSRF_HEADERS).expect(401);
      expect(await AuditLog.countDocuments({ action: 'user.suspend' })).toBe(1);

      await request(app).patch(`/api/v1/admin/users/${member._id}/status`).set(bearer(admin)).send({ status: 'active' }).expect(200);
      await request(app).get('/api/v1/auth/me').set(bearer(member)).expect(200);
    });

    it('prevents admins from changing their own account or suspending other admins', async () => {
      const admin = await createAdmin();
      const otherAdmin = await createAdmin();
      await request(app).patch(`/api/v1/admin/users/${admin._id}/status`).set(bearer(admin)).send({ status: 'suspended' }).expect(400);
      await request(app).patch(`/api/v1/admin/users/${otherAdmin._id}/status`).set(bearer(admin)).send({ status: 'suspended' }).expect(403);
    });

    it('grants and revokes admin access, restoring the subscription-derived role', async () => {
      const admin = await createAdmin();
      const pro = await createProUser();

      await request(app).patch(`/api/v1/admin/users/${pro._id}/admin`).set(bearer(admin)).send({ isAdmin: true }).expect(200);
      await request(app).get('/api/v1/admin/stats').set(bearer(pro)).expect(200);

      const revoked = await request(app).patch(`/api/v1/admin/users/${pro._id}/admin`).set(bearer(admin)).send({ isAdmin: false }).expect(200);
      expect(revoked.body.data.role).toBe('ProMember');
      await request(app).get('/api/v1/admin/stats').set(bearer(pro)).expect(403);
    });
  });

  describe('reports & moderation', () => {
    let author;
    let reporter;
    let admin;
    let post;

    beforeEach(async () => {
      author = await createProUser();
      reporter = await createFreeUser();
      admin = await createAdmin();
      post = await createPost({ author, community: await createCommunity({ createdBy: admin }) });
    });

    const report = (user, body) => request(app).post('/api/v1/reports').set(bearer(user)).send(body);

    it('validates report targets and prevents duplicates and self-reports', async () => {
      await report(reporter, { targetType: 'Post', targetId: String(post._id), reason: 'spam' }).expect(201);
      await report(reporter, { targetType: 'Post', targetId: String(post._id), reason: 'spam' }).expect(409);
      await report(author, { targetType: 'Post', targetId: String(post._id), reason: 'spam' }).expect(400);
      await report(author, { targetType: 'User', targetId: String(author._id), reason: 'spam' }).expect(400);
      await report(reporter, { targetType: 'Post', targetId: '64b7f0f0f0f0f0f0f0f0f0f0', reason: 'spam' }).expect(404);
      await report(reporter, { targetType: 'Post', targetId: String(post._id), reason: 'not-a-reason' }).expect(400);
      await request(app).post('/api/v1/reports').send({ targetType: 'Post', targetId: String(post._id), reason: 'spam' }).expect(401);
    });

    it('lets admins remove reported content, settling every open report on it', async () => {
      const secondReporter = await createFreeUser();
      const first = await report(reporter, { targetType: 'Post', targetId: String(post._id), reason: 'spam', details: 'Affiliate links' }).expect(201);
      await report(secondReporter, { targetType: 'Post', targetId: String(post._id), reason: 'off-topic' }).expect(201);

      const queue = await request(app).get('/api/v1/admin/reports').set(bearer(admin)).expect(200);
      expect(queue.body.data).toHaveLength(2);
      expect(queue.body.data[0]).toMatchObject({ targetType: 'Post', target: { title: post.title }, targetOwner: { username: author.username } });

      const res = await request(app)
        .patch(`/api/v1/admin/reports/${first.body.data.id}`)
        .set(bearer(admin))
        .send({ action: 'remove_content', note: 'Spam links' })
        .expect(200);
      expect(res.body.data.resolvedCount).toBe(2);

      expect((await Post.findById(post._id).lean()).status).toBe('removed');
      expect(await Report.countDocuments({ status: 'open' })).toBe(0);
      expect(await Notification.countDocuments({ type: 'moderation', entityType: 'Report' })).toBe(2);

      await request(app).patch(`/api/v1/admin/reports/${first.body.data.id}`).set(bearer(admin)).send({ action: 'dismiss' }).expect(409);
    });

    it('removes reported comments and suspends reported users', async () => {
      const comment = await createComment({ post, author });
      const commentReport = await report(reporter, { targetType: 'Comment', targetId: String(comment._id), reason: 'harassment' }).expect(201);
      await request(app).patch(`/api/v1/admin/reports/${commentReport.body.data.id}`).set(bearer(admin)).send({ action: 'remove_content' }).expect(200);
      expect((await Comment.findById(comment._id).lean()).status).toBe('removed');

      const userReport = await report(reporter, { targetType: 'User', targetId: String(author._id), reason: 'harassment' }).expect(201);
      await request(app).patch(`/api/v1/admin/reports/${userReport.body.data.id}`).set(bearer(admin)).send({ action: 'suspend_user' }).expect(200);
      expect((await User.findById(author._id).lean()).status).toBe('suspended');
    });

    it('dismisses reports without touching content', async () => {
      const created = await report(reporter, { targetType: 'Post', targetId: String(post._id), reason: 'misinformation' }).expect(201);
      await request(app).patch(`/api/v1/admin/reports/${created.body.data.id}`).set(bearer(admin)).send({ action: 'dismiss' }).expect(200);
      expect((await Post.findById(post._id).lean()).status).toBe('published');
      expect((await Report.findById(created.body.data.id).lean()).status).toBe('dismissed');
    });
  });
});
