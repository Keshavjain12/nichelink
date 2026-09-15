# NicheLink — Architecture & Implementation Plan

> Living document. It records the decisions behind the codebase and the order it was built in.

## 0. Discovery (2026-09-16)

| Item | Finding |
| --- | --- |
| Repository | Empty — greenfield build |
| Runtime | Node 24.14, npm 11.11 (workspaces available) |
| Database | Local MongoDB 8.3 standalone (no replica set → no multi-document transactions) |
| Tooling | git 2.53, Docker 29.6, mongosh |
| Library majors | Express 5, Mongoose 9, Zod 4, Stripe SDK 22, Socket.io 4.8, Vite 8, React 19, Tailwind 4, ESLint 10, Vitest |

Consequences:

- **No transactions.** Every multi-document write is designed to be safe without them: atomic `$inc`
  counters, unique compound indexes as the source of truth for "exactly once" (memberships,
  reactions, project interests, processed Stripe events) and idempotent retries.
- **Express 5** forwards rejected promises to the error middleware, so no `asyncHandler` wrapper.
  `req.query` is a getter, so the validation middleware redefines it on the request instance.
- **Mongoose 9** middleware is written as `async` functions without `next`.

## 1. System architecture

```
┌──────────────────────────┐        HTTPS /api/v1 (REST, Bearer access token)
│  React SPA (Vite)        │ ───────────────────────────────────────────────┐
│  Redux Toolkit + RTK Q   │        HTTPS refresh cookie (httpOnly, path-scoped)│
│  Socket.io client        │ ─────── WSS (handshake auth: access token) ─────┤
└──────────────────────────┘                                                 ▼
                                                           ┌────────────────────────────┐
                                                           │ Express 5 API + Socket.io  │
                                                           │ routes → controllers →     │
                                                           │ services → models          │
                                                           │ jobs (subscription expiry) │
                                                           └──────┬────────┬──────┬─────┘
                                                                  │        │      │
                                                            MongoDB   Cloudinary  Stripe
                                                                         (webhooks ──► API)
```

### Backend layering

| Layer | Responsibility | Must not |
| --- | --- | --- |
| `routes/` | URL → middleware chain → controller | contain logic |
| `middleware/` | authentication, permissions, validation, rate limits, errors | query business data beyond auth |
| `validators/` | Zod schemas for body / query / params | — |
| `controllers/` | translate HTTP ↔ service calls, shape responses | talk to Mongoose directly for business rules |
| `services/` | business rules, authorization on resources, side effects (notifications, sockets) | know about `req`/`res` |
| `models/` | schema, indexes, serialization | — |
| `sockets/` | authenticated socket gateway, presence, event handlers (reuse services) | duplicate service logic |
| `jobs/` | periodic maintenance (expired subscriptions) | — |

Services emit real-time events through a small `realtime` facade so they stay testable without a socket server.

### Frontend layering

- `app/` store + RTK Query API definition, `features/*` hold slices, RTK Query endpoints and feature hooks.
- `components/*` presentational + small container components grouped by domain.
- `pages/` route-level screens, lazily loaded for code splitting.
- `routes/` route table and guards (`RequireAuth`, `RequireGuest`, `RequirePermission`).
- Server state lives in RTK Query caches; Redux slices keep only session, UI, presence/typing and notification badge state.

## 2. Key decisions

### 2.1 Authentication: short-lived access token + rotating refresh cookie

- **Access token**: JWT (HS256, 15 min), returned in the response body, kept **in memory** (Redux), sent as
  `Authorization: Bearer`. Bearer headers are not sent automatically by browsers, so API calls are not CSRF-able.
- **Refresh token**: 256-bit random value in an **httpOnly, Secure (prod), SameSite** cookie scoped to
  `/api/v1/auth`. Only its SHA-256 hash is stored (`RefreshToken` collection, TTL index).
  - Rotated on every use; tokens belong to a *family*. Re-use of a rotated token outside a short grace
    window (concurrent tabs) revokes the whole family (token theft detection).
  - Cookie-authenticated endpoints (`/auth/refresh`, `/auth/logout`) additionally require an allowed
    `Origin` and a custom `X-Requested-With` header → forces a CORS preflight, defeating CSRF.
- **Hydration**: on boot the SPA calls `/auth/refresh`; success returns `{ accessToken, user }`.
- **Why not a JWT in localStorage?** XSS could exfiltrate it. **Why not only an access cookie?** Socket.io
  on a different origin than the SPA and cross-site cookie restrictions make header tokens more reliable.
- `authenticate` loads the user on every request (lean projection) so suspensions and plan changes take
  effect immediately — the JWT carries identity, never authority.

### 2.2 Roles, plans and a centralized permission map

- Guest = unauthenticated. Persisted `role` is one of `FreeMember | ProMember | Admin`.
- `ProMember` is **never written from a client request**. It is derived by the subscription service from
  verified Stripe state, and the effective role is re-derived per request (`resolveEffectiveRole`) so an
  expired period downgrades access even if a webhook was missed. An hourly job persists those downgrades.
- `constants/permissions.js` maps permissions → roles (`POST_CREATE`, `COMMUNITY_JOIN_PRO`, `DM_UNLIMITED`,
  `ADMIN_ACCESS`, …). Routes use `requirePermission(...)`; resource rules (ownership, membership,
  moderator) live in services. `/auth/me` returns the computed permission list so the UI can adapt
  without hardcoding role checks — the server still enforces everything.

| Capability | Guest | Free | Pro | Admin |
| --- | :-: | :-: | :-: | :-: |
| Landing, community directory & previews | ✓ | ✓ | ✓ | ✓ |
| Read public boards, profiles, projects | — | ✓ | ✓ | ✓ |
| Join public communities, like posts, report | — | ✓ | ✓ | ✓ |
| Direct messages | — | 10 / 24h | unlimited | unlimited |
| Express interest in a project | — | ✓ | ✓ | ✓ |
| Create posts & comments, upload post images | — | — | ✓ | ✓ |
| Join / read Pro communities | — | — | ✓ | ✓ |
| Create collaboration requests | — | — | ✓ | ✓ |
| Create communities, moderation, admin dashboard | — | — | — | ✓ |

Community moderators/owners (per-community role in `Membership`) can moderate content in their community.

### 2.3 Data model (MongoDB + Mongoose references)

`User`, `RefreshToken`, `Community`, `Membership`, `Post`, `Comment`, `Reaction`, `Conversation`, `Message`,
`Notification`, `Subscription`, `StripeEvent`, `Project`, `ProjectInterest`, `Report`.

- **Membership** is its own collection (unique `user+community`) — membership lists are unbounded, so they
  are not embedded in users or communities. `Community.memberCount` is an atomic counter.
- **Comments**: adjacency list with `parent`, `root` and `depth` (max depth 4). A post page loads one page of
  root comments and then *all* descendants of those roots in a single `root ∈ [...]` query, building the
  tree in memory — two queries, no recursion.
- **Reactions**: separate collection with a unique `user+post` index; toggle is create-or-delete with an
  atomic `$inc` on the post. Feed pages fetch the viewer's reactions for the page in one `$in` query.
- **Conversations** keep `members: [{ user, unreadCount, lastReadAt }]` plus a `lastMessage` snapshot, so
  the inbox renders from one query and unread counts are O(1) updates.
- **Soft deletion** for posts, comments and projects (`status` + `deletedAt`) to keep threads and reports
  consistent.
- **Search**: one text index per searchable collection; suggestions use anchored prefix matches on
  lowercase indexed fields (`slug`, `username`) instead of unanchored regex scans.

Full schema and ER diagram: [database.md](database.md).

### 2.4 Content safety

- Post bodies come from Quill as HTML and are sanitized server-side with a strict `sanitize-html`
  allowlist (no `style`, no `img`, links forced to `rel="noopener noreferrer nofollow"`), rendered client-side
  through DOMPurify as defence in depth. Plain text is extracted for excerpts and search.
- Comments, messages and project descriptions are plain text (rendered as text nodes).
- Images are attachments uploaded through the API (multer memory storage, 5 MB, JPEG/PNG/WebP/GIF verified
  by magic bytes, SVG rejected) to Cloudinary under `nichelink/users/<userId>/`. Posts only accept image
  public IDs inside the author's folder, which prevents attaching or deleting other users' assets.

### 2.5 Real-time

- Socket.io handshake authenticates with the access token (`auth.token`); identity never comes from query
  params. Each socket joins `user:<id>`; conversation rooms are joined only after a membership check.
- Messages are persisted by `messageService.sendMessage` (used by both the REST endpoint and the socket
  handler) and then emitted to both participants' user rooms — delivery works for every open tab and
  persists for offline recipients.
- Presence is an in-memory reference count per user (single instance). Horizontal scaling requires the
  Socket.io Redis adapter — documented, intentionally not added.
- Message notifications are coalesced to one unread notification per conversation.

### 2.6 Subscriptions (Stripe, test mode)

1. `POST /subscriptions/checkout` creates/reuses the Stripe customer and a Checkout Session (`mode=subscription`, `client_reference_id=userId`).
2. Stripe calls `POST /subscriptions/webhook` (raw body, signature verified, events de-duplicated in `StripeEvent`).
3. For `checkout.session.completed` and `customer.subscription.*`, the server **re-fetches the subscription
   from Stripe** and applies it — order-independent and idempotent.
4. The success page may call `POST /subscriptions/checkout/confirm`; the server retrieves the session from
   Stripe itself and verifies it belongs to the caller. A `?success=true` query param proves nothing.
5. Entitled statuses: `active`, `trialing`, `past_due` (Stripe retry grace). Anything else → Free.

Stripe and Cloudinary are optional at boot: if keys are missing, those endpoints return
`503 FEATURE_NOT_CONFIGURED` and `/config` tells the UI — nothing is faked.

### 2.7 Security baseline

Helmet, strict CORS allowlist, `trust proxy` configurable, JSON body limit, Zod validation on every input
(types enforced → operator injection impossible), recursive stripping of `$`/`.` keys, rate limits per
route class, generic login errors with constant-time dummy hash comparison, pino logging with redaction,
no stack traces in production responses, env validation at startup. See [security.md](security.md).

## 3. Phased delivery

| # | Phase | Scope | Tests |
| --- | --- | --- | --- |
| 0 | Discovery | repo/tooling inspection, this plan | — |
| 1 | Foundation | monorepo, env config, logger, error handling, app shell, routing, lint/format | health check |
| 2 | Auth & RBAC | register/login/logout/refresh/me, password change, permissions, guards | auth + RBAC suites |
| 3 | Communities & content | communities, memberships, posts (rich text, images), comments, reactions, feed, search | community/post/comment suites |
| 4 | Real-time | conversations, messages, Socket.io gateway, presence, typing, read state, notifications | messaging + socket suites |
| 5 | Project Match | Pro-only projects, filters, interests | project suite |
| 6 | Stripe | pricing, checkout, confirm, webhooks, lifecycle, expiry job | subscription + webhook suites |
| 7 | Admin & moderation | dashboard metrics, users, communities, reports | admin suite |
| 8 | UI/UX polish | responsive, skeletons, empty/error states, a11y, dark mode, SEO | client component tests |
| 9 | Security audit | endpoint-by-endpoint authorization review, fixes | regression tests |
| 10 | QA | lint, tests, production build, dependency audit | full run |
| 11 | Deployment & docs | README, docs, Render/Vercel config, Dockerfile, CI | — |

## 4. Out of scope (deliberately)

- Email delivery (verification / password reset) — no mail provider in requirements; documented as future work.
- Group chats, message attachments, multi-instance socket scaling (Redis adapter), full-text relevance tuning.
