import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Notification, User } from '../src/models/index.js';
import { createPost } from './fixtures.js';
import { bearer, buildApp, createCommunity, createFreeUser, createProUser, joinCommunity } from './helpers.js';

vi.mock('cloudinary', () => {
  const uploader = {
    upload_stream: vi.fn((options, callback) => ({
      end: () => callback(null, { public_id: `${options.folder}/image-${Date.now()}`, version: 1, width: 800, height: 600 }),
    })),
  };
  return {
    v2: {
      config: vi.fn(),
      uploader,
      url: vi.fn((publicId) => `https://res.cloudinary.com/nichelink-test/image/upload/f_auto,q_auto/v1/${publicId}`),
      api: { delete_resources: vi.fn(async () => ({})) },
    },
  };
});

const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 1),
]);

describe('users & profiles API', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  it('requires authentication to view profiles', async () => {
    const user = await createFreeUser();
    await request(app).get(`/api/v1/users/${user.username}`).expect(401);
  });

  it('returns a public profile with stats and no private data', async () => {
    const user = await createProUser({ headline: 'Staff engineer', skills: ['Go', 'Kubernetes'] });
    const community = await createCommunity();
    await joinCommunity(user, community);
    await createPost({ author: user, community });
    const viewer = await createFreeUser();

    const res = await request(app).get(`/api/v1/users/${user.username}`).set(bearer(viewer)).expect(200);
    expect(res.body.data).toMatchObject({
      username: user.username,
      headline: 'Staff engineer',
      isPro: true,
      stats: { postCount: 1, communityCount: 1, projectCount: 0 },
      isSelf: false,
    });
    expect(res.body.data.email).toBeUndefined();
    expect(res.body.data.subscription).toBeUndefined();

    const communities = await request(app).get(`/api/v1/users/${user.username}/communities`).set(bearer(viewer)).expect(200);
    expect(communities.body.data).toHaveLength(1);
  });

  it('updates editable profile fields and ignores privileged ones', async () => {
    const user = await createFreeUser();
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set(bearer(user))
      .send({
        headline: 'Developer advocate',
        skills: ['React', 'react', 'GraphQL'],
        role: 'Admin',
        subscription: { status: 'active' },
        email: 'hijack@example.com',
      })
      .expect(200);

    expect(res.body.data.user).toMatchObject({ headline: 'Developer advocate', skills: ['React', 'GraphQL'], role: 'FreeMember' });
    const stored = await User.findById(user._id).lean();
    expect(stored).toMatchObject({ role: 'FreeMember', email: user.email });
    expect(stored.subscription.status).toBe('none');
  });

  it('rejects unsafe website URLs', async () => {
    const user = await createFreeUser();
    await request(app).patch('/api/v1/users/me').set(bearer(user)).send({ website: 'javascript:alert(1)' }).expect(400);
  });

  describe('uploads', () => {
    it('uploads an avatar for any member', async () => {
      const user = await createFreeUser();
      const res = await request(app)
        .post('/api/v1/users/me/avatar')
        .set(bearer(user))
        .attach('image', PNG_BYTES, { filename: 'avatar.png', contentType: 'image/png' })
        .expect(200);

      expect(res.body.data.user.avatarUrl).toMatch(
        new RegExp(`^https://res.cloudinary.com/nichelink-test/.+nichelink/users/${user._id}/avatars/`),
      );
    });

    it('restricts post image uploads to Pro members', async () => {
      const free = await createFreeUser();
      const pro = await createProUser();
      const upload = (user) =>
        request(app)
          .post('/api/v1/uploads/images')
          .set(bearer(user))
          .attach('image', PNG_BYTES, { filename: 'diagram.png', contentType: 'image/png' });

      await upload(free).expect(403);
      const res = await upload(pro).expect(201);
      expect(res.body.data.publicId).toMatch(new RegExp(`^nichelink/users/${pro._id}/posts/`));
    });

    it('rejects files whose bytes are not an allowed image', async () => {
      const pro = await createProUser();
      await request(app)
        .post('/api/v1/uploads/images')
        .set(bearer(pro))
        .attach('image', Buffer.from('<svg onload="alert(1)"></svg>'.padEnd(64, ' ')), {
          filename: 'fake.png',
          contentType: 'image/png',
        })
        .expect(400);

      await request(app)
        .post('/api/v1/uploads/images')
        .set(bearer(pro))
        .attach('image', Buffer.from('<svg></svg>'), { filename: 'vector.svg', contentType: 'image/svg+xml' })
        .expect(400);
    });

    it('rejects oversized files', async () => {
      const pro = await createProUser();
      const huge = Buffer.concat([PNG_BYTES, Buffer.alloc(5 * 1024 * 1024 + 1)]);
      const res = await request(app)
        .post('/api/v1/uploads/images')
        .set(bearer(pro))
        .attach('image', huge, { filename: 'huge.png', contentType: 'image/png' })
        .expect(413);
      expect(res.body.code).toBe('PAYLOAD_TOO_LARGE');
    });
  });
});

describe('search API', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  it('lets guests search communities only', async () => {
    await createCommunity({ name: 'AI Engineers', tags: ['llm'] });
    const res = await request(app).get('/api/v1/search?q=engineers').expect(200);
    expect(Object.keys(res.body.data)).toEqual(['communities']);
    expect(res.body.data.communities.items).toHaveLength(1);

    await request(app).get('/api/v1/search?q=engineers&type=users').expect(401);
  });

  it('searches every entity type for members and returns suggestions', async () => {
    const user = await createProUser({ name: 'Grace Hopper', username: 'grace_compiler' });
    const community = await createCommunity({ name: 'Compiler Nerds', slug: 'compiler-nerds' });
    await createPost({ author: user, community, title: 'Writing a compiler in a weekend' });

    const res = await request(app).get('/api/v1/search?q=compiler').set(bearer(user)).expect(200);
    expect(res.body.data.communities.items[0].slug).toBe('compiler-nerds');
    expect(res.body.data.posts.items[0].title).toBe('Writing a compiler in a weekend');
    expect(Object.keys(res.body.data)).toEqual(['communities', 'users', 'posts', 'projects']);

    const suggestions = await request(app).get('/api/v1/search/suggestions?q=compi').set(bearer(user)).expect(200);
    expect(suggestions.body.data.communities[0].slug).toBe('compiler-nerds');

    const users = await request(app).get('/api/v1/search/suggestions?q=grace').set(bearer(user)).expect(200);
    expect(users.body.data.users[0].username).toBe('grace_compiler');
  });

  it('treats regex metacharacters in suggestions literally', async () => {
    const user = await createFreeUser();
    await request(app).get('/api/v1/search/suggestions?q=.*').set(bearer(user)).expect(200);
  });
});

describe('notifications API', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  it('lists, counts and marks notifications as read without cross-user access', async () => {
    const user = await createFreeUser();
    const other = await createFreeUser();
    const [first] = await Notification.create([
      { recipient: user._id, type: 'account', title: 'Welcome to NicheLink' },
      { recipient: user._id, type: 'account', title: 'Complete your profile' },
      { recipient: other._id, type: 'account', title: 'Private to other user' },
    ]);

    const list = await request(app).get('/api/v1/notifications').set(bearer(user)).expect(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.meta.unreadCount).toBe(2);

    await request(app).patch(`/api/v1/notifications/${first._id}/read`).set(bearer(other)).expect(404);
    const read = await request(app).patch(`/api/v1/notifications/${first._id}/read`).set(bearer(user)).expect(200);
    expect(read.body.data.unreadCount).toBe(1);

    await request(app).patch('/api/v1/notifications/read-all').set(bearer(user)).expect(200);
    const count = await request(app).get('/api/v1/notifications/unread-count').set(bearer(user)).expect(200);
    expect(count.body.data.unreadCount).toBe(0);
    expect(await Notification.countDocuments({ recipient: other._id, readAt: null })).toBe(1);
  });
});
