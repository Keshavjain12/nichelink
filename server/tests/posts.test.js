import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Community, Notification, Post, Reaction } from '../src/models/index.js';
import { createPost } from './fixtures.js';
import {
  bearer,
  buildApp,
  createAdmin,
  createCommunity,
  createFreeUser,
  createProUser,
  joinCommunity,
} from './helpers.js';

const postBody = (community, overrides = {}) => ({
  community: community.slug,
  title: 'Lessons from migrating 40 services to OpenTelemetry',
  content: '<p>We rolled out tracing <strong>incrementally</strong> and it paid off.</p>',
  tags: ['Observability', 'otel'],
  ...overrides,
});

describe('posts API', () => {
  let app;
  let community;
  beforeEach(async () => {
    app = buildApp();
    community = await createCommunity();
  });

  describe('creation permissions', () => {
    it('rejects guests', async () => {
      await request(app).post('/api/v1/posts').send(postBody(community)).expect(401);
    });

    it('rejects FreeMembers with PRO_REQUIRED', async () => {
      const free = await createFreeUser();
      await joinCommunity(free, community);
      const res = await request(app).post('/api/v1/posts').set(bearer(free)).send(postBody(community)).expect(403);
      expect(res.body.code).toBe('PRO_REQUIRED');
    });

    it('requires Pro members to join the community first', async () => {
      const pro = await createProUser();
      const res = await request(app).post('/api/v1/posts').set(bearer(pro)).send(postBody(community)).expect(403);
      expect(res.body.code).toBe('MEMBERSHIP_REQUIRED');
    });

    it('publishes a post for a Pro member and updates community counters', async () => {
      const pro = await createProUser();
      await joinCommunity(pro, community);

      const res = await request(app).post('/api/v1/posts').set(bearer(pro)).send(postBody(community)).expect(201);
      expect(res.body.data).toMatchObject({
        title: 'Lessons from migrating 40 services to OpenTelemetry',
        tags: ['observability', 'otel'],
        author: { username: pro.username, isPro: true },
        community: { slug: community.slug },
        permissions: { canEdit: true, canDelete: true },
      });
      expect((await Community.findById(community._id).lean()).postCount).toBe(1);
    });
  });

  describe('rich text safety', () => {
    it('sanitizes HTML and derives a plain-text excerpt', async () => {
      const pro = await createProUser();
      await joinCommunity(pro, community);

      const res = await request(app)
        .post('/api/v1/posts')
        .set(bearer(pro))
        .send(
          postBody(community, {
            content:
              '<p onclick="steal()">Hello&nbsp;world <script>alert(1)</script><img src=x onerror=alert(1)>' +
              '<a href="javascript:alert(1)">bad</a> <a href="https://example.com">good</a></p>',
          }),
        )
        .expect(201);

      const { content, excerpt } = res.body.data;
      expect(content).not.toMatch(/script|onerror|onclick|javascript:|<img/i);
      expect(content).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">good</a>');
      expect(excerpt).toBe('Hello world bad good');
    });

    it('rejects posts whose content is empty after sanitization', async () => {
      const pro = await createProUser();
      await joinCommunity(pro, community);
      await request(app)
        .post('/api/v1/posts')
        .set(bearer(pro))
        .send(postBody(community, { content: '<script>alert(1)</script><p> </p>' }))
        .expect(400);
    });

    it('rejects images that were not uploaded by the author', async () => {
      const pro = await createProUser();
      await joinCommunity(pro, community);
      await request(app)
        .post('/api/v1/posts')
        .set(bearer(pro))
        .send(
          postBody(community, {
            images: [
              {
                url: 'https://res.cloudinary.com/nichelink-test/image/upload/v1/nichelink/users/someone-else/posts/x',
                publicId: 'nichelink/users/someone-else/posts/x',
              },
            ],
          }),
        )
        .expect(403);
    });
  });

  describe('reading', () => {
    it('lets FreeMembers read public posts but not Pro community posts', async () => {
      const author = await createProUser();
      const proCommunity = await createCommunity({ accessType: 'pro' });
      const publicPost = await createPost({ author, community });
      const proPost = await createPost({ author, community: proCommunity, title: 'Pro-only salary benchmarks' });
      const free = await createFreeUser();

      const feed = await request(app).get('/api/v1/posts').set(bearer(free)).expect(200);
      expect(feed.body.data.map((post) => post.id)).toEqual([String(publicPost._id)]);

      await request(app).get(`/api/v1/posts/${publicPost._id}`).set(bearer(free)).expect(200);
      const denied = await request(app).get(`/api/v1/posts/${proPost._id}`).set(bearer(free)).expect(403);
      expect(denied.body.code).toBe('PRO_REQUIRED');
      await request(app).get(`/api/v1/communities/${proCommunity.slug}/posts`).set(bearer(free)).expect(403);

      const pro = await createProUser();
      const proFeed = await request(app).get('/api/v1/posts').set(bearer(pro)).expect(200);
      expect(proFeed.body.data).toHaveLength(2);
      await request(app).get(`/api/v1/posts/${proPost._id}`).set(bearer(pro)).expect(200);
    });

    it('gives guests a limited preview and requires sign-in for full posts', async () => {
      const author = await createProUser();
      const posts = [];
      for (let i = 0; i < 7; i += 1) {
        posts.push(await createPost({ author, community, title: `Remote hiring playbook part ${i + 1}` }));
      }

      const preview = await request(app).get(`/api/v1/communities/${community.slug}/posts?limit=20`).expect(200);
      expect(preview.body.data).toHaveLength(5);
      expect(preview.body.meta).toMatchObject({ previewOnly: true, hasMore: false });
      expect(preview.body.data[0].content).toBeUndefined();

      await request(app).get(`/api/v1/posts/${posts[0]._id}`).expect(401);
    });

    it('paginates, filters by joined communities and supports trending and search', async () => {
      const author = await createProUser();
      const other = await createCommunity();
      const reader = await createFreeUser();
      await joinCommunity(reader, community);

      await createPost({ author, community, title: 'Async standups that actually work' });
      await createPost({ author, community, title: 'Designing for timezone overlap', reactionCount: 12 });
      await createPost({ author, community: other, title: 'Visa tips for digital nomads' });

      const page1 = await request(app).get('/api/v1/posts?limit=2').set(bearer(reader)).expect(200);
      expect(page1.body.meta).toMatchObject({ page: 1, limit: 2, hasMore: true });

      const joined = await request(app).get('/api/v1/posts?scope=joined').set(bearer(reader)).expect(200);
      expect(joined.body.data).toHaveLength(2);

      const trending = await request(app).get('/api/v1/posts?sort=trending').set(bearer(reader)).expect(200);
      expect(trending.body.data[0].title).toBe('Designing for timezone overlap');

      const search = await request(app).get('/api/v1/posts?q=timezone').set(bearer(reader)).expect(200);
      expect(search.body.data.map((post) => post.title)).toEqual(['Designing for timezone overlap']);
    });
  });

  describe('editing and deleting', () => {
    it('allows only the author to edit', async () => {
      const author = await createProUser();
      const otherPro = await createProUser();
      const post = await createPost({ author, community });

      await request(app).patch(`/api/v1/posts/${post._id}`).set(bearer(otherPro)).send({ title: 'Hijacked title' }).expect(403);

      const res = await request(app)
        .patch(`/api/v1/posts/${post._id}`)
        .set(bearer(author))
        .send({ title: 'Updated: CI pipeline from 20 to 5 minutes' })
        .expect(200);
      expect(res.body.data.title).toBe('Updated: CI pipeline from 20 to 5 minutes');
      expect(res.body.data.editedAt).toBeTruthy();
    });

    it('prevents other users from deleting, soft-deletes for the author', async () => {
      const author = await createProUser();
      const otherPro = await createProUser();
      const post = await createPost({ author, community });

      await request(app).delete(`/api/v1/posts/${post._id}`).set(bearer(otherPro)).expect(403);
      await request(app).delete(`/api/v1/posts/${post._id}`).set(bearer(author)).expect(200);

      expect((await Post.findById(post._id).lean()).status).toBe('deleted');
      await request(app).get(`/api/v1/posts/${post._id}`).set(bearer(author)).expect(404);
    });

    it('lets community moderators and admins remove posts and notifies the author', async () => {
      const author = await createProUser();
      const moderator = await createFreeUser();
      await joinCommunity(moderator, community, 'moderator');
      const first = await createPost({ author, community });
      const second = await createPost({ author, community });
      const admin = await createAdmin();

      await request(app).delete(`/api/v1/posts/${first._id}`).set(bearer(moderator)).send({ reason: 'Off-topic' }).expect(200);
      await request(app).delete(`/api/v1/posts/${second._id}`).set(bearer(admin)).expect(200);

      const removed = await Post.findById(first._id).lean();
      expect(removed.status).toBe('removed');
      expect(removed.moderation.reason).toBe('Off-topic');
      expect(await Notification.countDocuments({ recipient: author._id, type: 'moderation' })).toBe(2);
    });
  });

  describe('reactions', () => {
    it('likes idempotently, unlikes, and notifies the author once per unread batch', async () => {
      const author = await createProUser();
      const post = await createPost({ author, community });
      const fan = await createFreeUser();
      const secondFan = await createFreeUser();

      const liked = await request(app).put(`/api/v1/posts/${post._id}/reactions`).set(bearer(fan)).expect(200);
      expect(liked.body.data).toEqual({ liked: true, reactionCount: 1 });
      await request(app).put(`/api/v1/posts/${post._id}/reactions`).set(bearer(fan)).expect(200);
      await request(app).put(`/api/v1/posts/${post._id}/reactions`).set(bearer(secondFan)).expect(200);

      expect(await Reaction.countDocuments({ post: post._id })).toBe(2);
      const notifications = await Notification.find({ recipient: author._id, type: 'post_reaction' }).lean();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].count).toBe(2);

      const unliked = await request(app).delete(`/api/v1/posts/${post._id}/reactions`).set(bearer(fan)).expect(200);
      expect(unliked.body.data).toEqual({ liked: false, reactionCount: 1 });

      const detail = await request(app).get(`/api/v1/posts/${post._id}`).set(bearer(secondFan)).expect(200);
      expect(detail.body.data.viewerHasLiked).toBe(true);
    });

    it('does not allow reacting to posts the viewer cannot read', async () => {
      const author = await createProUser();
      const proCommunity = await createCommunity({ accessType: 'pro' });
      const post = await createPost({ author, community: proCommunity });
      const free = await createFreeUser();
      await request(app).put(`/api/v1/posts/${post._id}/reactions`).set(bearer(free)).expect(403);
    });
  });

  it('rejects malformed ids', async () => {
    const user = await createFreeUser();
    await request(app).get('/api/v1/posts/not-an-id').set(bearer(user)).expect(400);
  });
});
