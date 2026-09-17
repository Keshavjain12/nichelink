import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { RefreshToken, User } from '../src/models/index.js';
import {
  CSRF_HEADERS,
  TEST_PASSWORD,
  bearer,
  bearerWithClaims,
  buildApp,
  createFreeUser,
  extractRefreshCookie,
} from './helpers.js';

const validRegistration = {
  name: 'Ada Lovelace',
  username: 'ada_l',
  email: 'ada@example.com',
  password: 'Analytical1',
};

describe('auth API', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  describe('POST /auth/register', () => {
    it('creates a FreeMember, returns an access token and sets a scoped httpOnly refresh cookie', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(validRegistration).expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.user).toMatchObject({ username: 'ada_l', email: 'ada@example.com', role: 'FreeMember' });
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.permissions).not.toContain('post:create');

      const cookie = res.headers['set-cookie'].find((value) => value.startsWith('nl_refresh='));
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
      expect(cookie).toMatch(/SameSite=Lax/i);

      const stored = await User.findOne({ email: 'ada@example.com' }).select('+password').lean();
      expect(stored.password).not.toBe(validRegistration.password);
      expect(stored.password).toMatch(/^\$2[aby]\$/);
    });

    it('ignores privileged fields sent by the client', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validRegistration, role: 'Admin', subscription: { status: 'active' } })
        .expect(201);

      expect(res.body.data.user.role).toBe('FreeMember');
      const stored = await User.findOne({ email: validRegistration.email }).lean();
      expect(stored.role).toBe('FreeMember');
      expect(stored.subscription.status).toBe('none');
    });

    it('rejects weak passwords with field-level errors', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validRegistration, password: 'short' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.errors.some((error) => error.field === 'password')).toBe(true);
    });

    it('rejects duplicate emails and usernames', async () => {
      await request(app).post('/api/v1/auth/register').send(validRegistration).expect(201);
      await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validRegistration, username: 'someone_else' })
        .expect(409);
      await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validRegistration, email: 'other@example.com' })
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    it('signs in with valid credentials', async () => {
      const user = await createFreeUser();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);

      expect(res.body.data.user.id).toBe(String(user._id));
      expect(extractRefreshCookie(res)).toBeTruthy();
    });

    it('returns the same generic error for unknown emails and wrong passwords', async () => {
      const user = await createFreeUser();
      const wrongPassword = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'WrongPassw0rd' })
        .expect(401);
      const unknownEmail = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'WrongPassw0rd' })
        .expect(401);

      expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
      expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('blocks suspended accounts', async () => {
      const user = await createFreeUser({ status: 'suspended' });
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(403);
      expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('rejects NoSQL operator injection payloads', async () => {
      await createFreeUser();
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: { $ne: null }, password: { $ne: null } })
        .expect(400);
    });

    it('rate limits repeated failed attempts', async () => {
      const limitedApp = buildApp({ rateLimitEnabled: true });
      const attempt = () =>
        request(limitedApp).post('/api/v1/auth/login').send({ email: 'x@example.com', password: 'Wrong1234' });

      for (let i = 0; i < 10; i += 1) {
        await attempt().expect(401);
      }
      const blocked = await attempt().expect(429);
      expect(blocked.body.code).toBe('RATE_LIMITED');
    });
  });

  describe('GET /auth/me', () => {
    it('requires a token', async () => {
      const res = await request(app).get('/api/v1/auth/me').expect(401);
      expect(res.body).toMatchObject({ success: false, code: 'UNAUTHENTICATED' });
    });

    it('returns the session user', async () => {
      const user = await createFreeUser();
      const res = await request(app).get('/api/v1/auth/me').set(bearer(user)).expect(200);
      expect(res.body.data.user).toMatchObject({ id: String(user._id), role: 'FreeMember' });
      expect(res.body.data.user.stripeCustomerId).toBeUndefined();
    });

    it('rejects tampered and expired tokens', async () => {
      const user = await createFreeUser();
      const { Authorization } = bearer(user);
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `${Authorization.slice(0, -2)}xx`)
        .expect(401);

      const expired = await request(app)
        .get('/api/v1/auth/me')
        .set(bearerWithClaims(user, { issuedSecondsAgo: 120, expiresIn: '-60s' }))
        .expect(401);
      expect(expired.body.code).toBe('TOKEN_EXPIRED');
    });

    it('rejects tokens of suspended users immediately', async () => {
      const user = await createFreeUser();
      const headers = bearer(user);
      await User.updateOne({ _id: user._id }, { status: 'suspended' });
      await request(app).get('/api/v1/auth/me').set(headers).expect(403);
    });
  });

  describe('refresh token rotation', () => {
    async function signIn() {
      const user = await createFreeUser();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
      return { user, cookie: extractRefreshCookie(res) };
    }

    it('issues a new access token and rotates the refresh cookie', async () => {
      const { user, cookie } = await signIn();
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie)
        .set(CSRF_HEADERS)
        .expect(200);

      expect(res.body.data.user.id).toBe(String(user._id));
      const rotated = extractRefreshCookie(res);
      expect(rotated).toBeTruthy();
      expect(rotated).not.toBe(cookie);
    });

    it('answers "no session" without an error when there is no refresh cookie', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').set(CSRF_HEADERS).expect(200);
      expect(res.body).toEqual({ success: true, data: null });
    });

    it('still rejects a present but invalid refresh cookie', async () => {
      await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'nl_refresh=forged-token-value')
        .set(CSRF_HEADERS)
        .expect(401);
    });

    it('requires the anti-CSRF header and a trusted origin', async () => {
      const { cookie } = await signIn();
      await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).expect(403);
      await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie)
        .set({ ...CSRF_HEADERS, Origin: 'https://evil.example' })
        .expect(403);
    });

    it('tolerates a concurrent replay inside the grace window without rotating again', async () => {
      const { cookie } = await signIn();
      await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).set(CSRF_HEADERS).expect(200);
      const replay = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie)
        .set(CSRF_HEADERS)
        .expect(200);
      expect(extractRefreshCookie(replay)).toBeNull();
    });

    it('revokes the whole token family when a rotated token is reused later', async () => {
      const { cookie } = await signIn();
      const first = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie)
        .set(CSRF_HEADERS)
        .expect(200);
      const latestCookie = extractRefreshCookie(first);

      await RefreshToken.updateMany(
        { revokedReason: 'rotated' },
        { $set: { revokedAt: new Date(Date.now() - 60_000) } },
      );

      await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).set(CSRF_HEADERS).expect(401);
      await request(app).post('/api/v1/auth/refresh').set('Cookie', latestCookie).set(CSRF_HEADERS).expect(401);
    });

    it('logout revokes the session', async () => {
      const { cookie } = await signIn();
      await request(app).post('/api/v1/auth/logout').set('Cookie', cookie).set(CSRF_HEADERS).expect(200);
      await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).set(CSRF_HEADERS).expect(401);
    });
  });

  describe('PATCH /auth/password', () => {
    it('requires the correct current password', async () => {
      const user = await createFreeUser();
      await request(app)
        .patch('/api/v1/auth/password')
        .set(bearer(user))
        .send({ currentPassword: 'WrongPassw0rd', newPassword: 'NewPassw0rd!' })
        .expect(400);
    });

    it('changes the password, revokes old sessions and invalidates older access tokens', async () => {
      const user = await createFreeUser();
      const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
      const oldCookie = extractRefreshCookie(login);
      const oldAccess = bearerWithClaims(user, { issuedSecondsAgo: 60 });

      await request(app)
        .patch('/api/v1/auth/password')
        .set(bearer(user))
        .send({ currentPassword: TEST_PASSWORD, newPassword: 'NewPassw0rd!' })
        .expect(200);

      await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie).set(CSRF_HEADERS).expect(401);
      await request(app).get('/api/v1/auth/me').set(oldAccess).expect(401);
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'NewPassw0rd!' })
        .expect(200);
    });
  });
});

describe('platform endpoints', () => {
  it('reports health, feature config and structured 404s', async () => {
    const app = buildApp();
    const health = await request(app).get('/api/v1/health').expect(200);
    expect(health.body.data.database).toBe('up');

    const config = await request(app).get('/api/v1/config').expect(200);
    expect(config.body.data.features).toEqual({ payments: true, uploads: true });

    const missing = await request(app).get('/api/v1/does-not-exist').expect(404);
    expect(missing.body).toMatchObject({ success: false, code: 'NOT_FOUND' });
  });

  it('returns 400 for malformed JSON', async () => {
    const app = buildApp();
    await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
  });
});
