import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { COMMUNITY_ACCESS, COMMUNITY_ROLES, ROLES } from '../src/constants/roles.js';
import { Community, Membership, User } from '../src/models/index.js';
import { signAccessToken } from '../src/utils/tokens.js';

export const TEST_PASSWORD = 'Str0ngPassw0rd';
export const CLIENT_ORIGIN = 'http://localhost:5173';
export const CSRF_HEADERS = Object.freeze({ 'X-Requested-With': 'XMLHttpRequest', Origin: CLIENT_ORIGIN });

const DAY_MS = 24 * 60 * 60 * 1000;
let sequence = 0;

export function buildApp(options) {
  return createApp(options);
}

export function uniqueSuffix() {
  sequence += 1;
  return `${Date.now().toString(36)}${sequence}`;
}

/** Creates a user directly in the database. `plan: 'pro'` attaches an active subscription snapshot. */
export async function createUser({ plan = 'free', admin = false, ...overrides } = {}) {
  const suffix = uniqueSuffix();
  const data = {
    name: `Test Member ${sequence}`,
    username: `member_${suffix}`,
    email: `member_${suffix}@example.com`,
    password: TEST_PASSWORD,
    ...overrides,
  };

  if (admin) data.role = ROLES.ADMIN;
  if (plan === 'pro') {
    data.role = data.role ?? ROLES.PRO;
    data.subscription = { plan: 'pro', status: 'active', currentPeriodEnd: new Date(Date.now() + 30 * DAY_MS) };
  }
  return User.create(data);
}

export const createFreeUser = (overrides) => createUser(overrides);
export const createProUser = (overrides) => createUser({ plan: 'pro', ...overrides });
export const createAdmin = (overrides) => createUser({ admin: true, ...overrides });

export function bearer(user) {
  return { Authorization: `Bearer ${signAccessToken(user._id)}` };
}

export function bearerWithClaims(user, { issuedSecondsAgo = 0, expiresIn = '15m' } = {}) {
  const token = jwt.sign(
    { sub: String(user._id), typ: 'access', iat: Math.floor(Date.now() / 1000) - issuedSecondsAgo },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn, issuer: 'nichelink-api', audience: 'nichelink-client', algorithm: 'HS256' },
  );
  return { Authorization: `Bearer ${token}` };
}

export function extractRefreshCookie(response) {
  const cookies = response.headers['set-cookie'] ?? [];
  const cookie = cookies.find((value) => value.startsWith('nl_refresh=') && !value.startsWith('nl_refresh=;'));
  return cookie ? cookie.split(';')[0] : null;
}

export async function createCommunity({ createdBy, accessType = COMMUNITY_ACCESS.PUBLIC, ...overrides } = {}) {
  const suffix = uniqueSuffix();
  const owner = createdBy ?? (await createAdmin());
  return Community.create({
    name: `Community ${suffix}`,
    slug: `community-${suffix}`,
    tagline: 'A place for testing',
    description: 'Community used by the automated test-suite.',
    category: 'Engineering',
    accessType,
    createdBy: owner._id,
    ...overrides,
  });
}

export async function joinCommunity(user, community, role = COMMUNITY_ROLES.MEMBER) {
  await Membership.create({ user: user._id, community: community._id, role });
  await Community.updateOne({ _id: community._id }, { $inc: { memberCount: 1 } });
}
