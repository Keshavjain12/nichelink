# Testing

```bash
npm test                 # server + client
npm test --workspace server
npm test --workspace client
npm run test:watch --workspace server
```

## Backend (Vitest + Supertest)

Every suite runs against a real MongoDB. By default `tests/globalSetup.js` starts an in-memory server;
set `TEST_MONGODB_URI` to reuse a running instance (faster locally, and what CI does):

```bash
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 npm test --workspace server
```

Each file connects to its own throwaway database, `syncIndexes()` runs so text and unique indexes exist,
and every collection is emptied after each test. Requests go through the real Express app
(`buildApp()`), so middleware, validation, permissions and error handling are all exercised.

Only two things are mocked: Cloudinary's SDK and Stripe's network calls. Stripe webhook **signatures are
generated and verified with the real SDK**, so signature handling is genuinely tested.

| Suite | Covers |
| --- | --- |
| `auth.test.js` | registration, login, generic errors, suspension, refresh rotation and reuse detection, CSRF headers, password change, rate limiting, malformed JSON, injection payloads |
| `rbac.test.js` | effective-role derivation, permission map, `requirePermission` semantics including `PRO_REQUIRED` |
| `communities.test.js` | admin-only creation, duplicate slugs, guest browsing, joining (idempotent, Pro-gated), leaving, members, access-type propagation, trending/recommended |
| `posts.test.js` | Pro + membership gating, HTML sanitization, image ownership, Pro-community reads, guest previews, pagination/sort/search, edit/delete permissions, moderator removal, reactions |
| `comments.test.js` | nesting and depth limit, counters, notifications, cross-post replies, edit/delete permissions, deleted-comment placeholders |
| `messaging.test.js` | conversation creation, unread counts, read state, IDOR, Free-tier quota, `clientId` idempotency, cursor pagination, suspended recipients |
| `socket.test.js` | handshake rejection, real-time delivery (socket and REST), room authorization, typing indicators, read receipts, presence |
| `projects.test.js` | Pro-only creation, filters, author-only editing, interest lifecycle and privacy |
| `subscriptions.test.js` | checkout, webhook signature rejection, end-to-end upgrade, idempotency, retry on failure, downgrade, stale events, confirmation ownership, cancel/resume, expiry job |
| `users.test.js` | profiles, privileged-field stripping, unsafe URLs, avatar and post-image uploads, magic-byte and size rejection, search, notifications |
| `admin.test.js` | admin-only access, metrics, user management rules, report lifecycle and moderation actions |

## Frontend (Vitest + Testing Library)

`jsdom`, with `global.fetch` stubbed by a small route table (`src/test/utils.jsx`). Tests drive real
components through a real Redux store, so RTK Query cache behaviour and optimistic updates are covered.

| Suite | Covers |
| --- | --- |
| `routes/guards.test.jsx` | guest redirect with return path, loading state, admin-only routes, guest-only routes, open-redirect rejection |
| `pages/auth/LoginPage.test.jsx` | client validation before any request, session storage on success, server error rendering |
| `pages/billing/PricingPage.test.jsx` | checkout redirect, current-plan state for Pro, disabled upgrade when payments are unconfigured |
| `pages/FeedPage.test.jsx` | composer vs upgrade prompt by permission, feed rendering, sort/scope requests, optimistic likes |
| `components/messaging/ChatPanel.test.jsx` | thread rendering, optimistic send with REST fallback, failed-send retry affordance, Free-tier quota blocking |

## Workflows verified end to end

- Register → session established → protected routes render.
- Free member attempts a Pro feature → `403 PRO_REQUIRED` → UI offers an upgrade.
- Pro member creates a post → `201` and community counters update.
- User A sends a message → User B's socket receives it and it is persisted.
- Admin creates a community → becomes owner.
- User joins a community → membership created exactly once.
- Stripe test checkout → signed webhook → Pro access granted → cancellation removes it.

## Manual QA checklist

Lint, build and the full suites (`npm run lint && npm test && npm run build`) plus a pass through the app
at 320 / 375 / 768 / 1024 / 1440 px, keyboard-only navigation of the nav, dialogs, menus and composer, and
both colour themes.
