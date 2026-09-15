import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Community, Membership, Post } from '../src/models/index.js';
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

const newCommunity = {
  name: 'Platform Engineers',
  tagline: 'Internal developer platforms, golden paths and paved roads',
  description: 'For engineers building self-service infrastructure.',
  category: 'Engineering',
  tags: ['Kubernetes', 'Backstage', 'platform'],
  icon: '🛠️',
};

describe('communities API', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  describe('creation', () => {
    it('lets an Admin create a community and become its owner', async () => {
      const admin = await createAdmin();
      const res = await request(app).post('/api/v1/communities').set(bearer(admin)).send(newCommunity).expect(201);

      expect(res.body.data).toMatchObject({
        name: 'Platform Engineers',
        slug: 'platform-engineers',
        accessType: 'public',
        memberCount: 1,
        tags: ['kubernetes', 'backstage', 'platform'],
      });
      expect(res.body.data.viewer).toMatchObject({ isMember: true, role: 'owner', canModerate: true });

      const membership = await Membership.findOne({ user: admin._id }).lean();
      expect(membership.role).toBe('owner');
    });

    it('forbids non-admins from creating communities', async () => {
      const pro = await createProUser();
      const free = await createFreeUser();
      await request(app).post('/api/v1/communities').send(newCommunity).expect(401);
      await request(app).post('/api/v1/communities').set(bearer(free)).send(newCommunity).expect(403);
      await request(app).post('/api/v1/communities').set(bearer(pro)).send(newCommunity).expect(403);
    });

    it('rejects duplicate slugs', async () => {
      const admin = await createAdmin();
      await request(app).post('/api/v1/communities').set(bearer(admin)).send(newCommunity).expect(201);
      await request(app).post('/api/v1/communities').set(bearer(admin)).send(newCommunity).expect(409);
    });
  });

  describe('browsing', () => {
    it('lets guests list communities and view public details', async () => {
      const community = await createCommunity({ isFeatured: true });
      await createCommunity({ accessType: 'pro' });

      const list = await request(app).get('/api/v1/communities').expect(200);
      expect(list.body.data).toHaveLength(2);
      expect(list.body.meta).toMatchObject({ total: 2, page: 1 });

      const featured = await request(app).get('/api/v1/communities?featured=true').expect(200);
      expect(featured.body.data).toHaveLength(1);

      const detail = await request(app).get(`/api/v1/communities/${community.slug}`).expect(200);
      expect(detail.body.data.viewer).toMatchObject({ isAuthenticated: false, canJoin: false });

      const byId = await request(app).get(`/api/v1/communities/${community._id}`).expect(200);
      expect(byId.body.data.slug).toBe(community.slug);
    });

    it('supports text search and returns 404 for unknown slugs', async () => {
      await createCommunity({ name: 'Technical Writers Guild', tags: ['docs'] });
      await createCommunity({ name: 'Digital Nomads' });

      const res = await request(app).get('/api/v1/communities?q=writers').expect(200);
      expect(res.body.data.map((community) => community.name)).toEqual(['Technical Writers Guild']);

      await request(app).get('/api/v1/communities/does-not-exist').expect(404);
    });
  });

  describe('membership', () => {
    it('creates a membership when a user joins, and is idempotent', async () => {
      const community = await createCommunity();
      const user = await createFreeUser();

      const first = await request(app).post(`/api/v1/communities/${community.slug}/join`).set(bearer(user)).expect(201);
      expect(first.body.data.viewer).toMatchObject({ isMember: true, role: 'member' });

      await request(app).post(`/api/v1/communities/${community.slug}/join`).set(bearer(user)).expect(200);

      expect(await Membership.countDocuments({ user: user._id, community: community._id })).toBe(1);
      expect((await Community.findById(community._id).lean()).memberCount).toBe(1);
    });

    it('requires authentication to join', async () => {
      const community = await createCommunity();
      await request(app).post(`/api/v1/communities/${community.slug}/join`).expect(401);
    });

    it('keeps FreeMembers out of Pro communities and lets Pro members in', async () => {
      const community = await createCommunity({ accessType: 'pro' });
      const free = await createFreeUser();
      const pro = await createProUser();

      const denied = await request(app).post(`/api/v1/communities/${community.slug}/join`).set(bearer(free)).expect(403);
      expect(denied.body.code).toBe('PRO_REQUIRED');

      await request(app).post(`/api/v1/communities/${community.slug}/join`).set(bearer(pro)).expect(201);
    });

    it('lets members leave but not owners', async () => {
      const admin = await createAdmin();
      const community = await createCommunity({ createdBy: admin });
      await joinCommunity(admin, community, 'owner');
      const member = await createFreeUser();
      await joinCommunity(member, community);

      await request(app).delete(`/api/v1/communities/${community.slug}/membership`).set(bearer(member)).expect(200);
      await request(app).delete(`/api/v1/communities/${community.slug}/membership`).set(bearer(admin)).expect(409);
      expect((await Community.findById(community._id).lean()).memberCount).toBe(1);
    });

    it('lists the viewer communities and community members', async () => {
      const community = await createCommunity();
      const user = await createFreeUser();
      await joinCommunity(user, community);

      const mine = await request(app).get('/api/v1/memberships/me').set(bearer(user)).expect(200);
      expect(mine.body.data.map((item) => item.slug)).toEqual([community.slug]);

      const members = await request(app).get(`/api/v1/communities/${community.slug}/members`).set(bearer(user)).expect(200);
      expect(members.body.data[0]).toMatchObject({ username: user.username, communityRole: 'member' });
    });
  });

  describe('administration', () => {
    it('propagates access type changes to existing posts', async () => {
      const admin = await createAdmin();
      const community = await createCommunity({ createdBy: admin });
      await createPost({ author: admin, community });

      await request(app)
        .patch(`/api/v1/communities/${community.slug}`)
        .set(bearer(admin))
        .send({ accessType: 'pro' })
        .expect(200);

      expect((await Post.findOne({ community: community._id }).lean()).communityAccess).toBe('pro');
    });

    it('does not reset unspecified fields on partial updates', async () => {
      const admin = await createAdmin();
      const community = await createCommunity({ createdBy: admin, accessType: 'pro', isFeatured: true });
      await request(app)
        .patch(`/api/v1/communities/${community.slug}`)
        .set(bearer(admin))
        .send({ tagline: 'Updated tagline' })
        .expect(200);

      const updated = await Community.findById(community._id).lean();
      expect(updated).toMatchObject({ accessType: 'pro', isFeatured: true, tagline: 'Updated tagline' });
    });
  });

  describe('discovery', () => {
    it('returns trending and recommended communities', async () => {
      const user = await createFreeUser({ skills: ['React'], interests: ['design systems'] });
      const react = await createCommunity({ name: 'Frontend Engineers', tags: ['react'] });
      const other = await createCommunity({ name: 'Digital Nomads', memberCount: 50 });
      await createPost({ author: user, community: react });

      const trending = await request(app).get('/api/v1/communities/trending').expect(200);
      expect(trending.body.data[0]).toMatchObject({ slug: react.slug, recentPostCount: 1 });

      const recommended = await request(app).get('/api/v1/communities/recommended').set(bearer(user)).expect(200);
      expect(recommended.body.data[0].slug).toBe(react.slug);
      expect(recommended.body.data.map((community) => community.slug)).toContain(other.slug);
    });
  });
});
