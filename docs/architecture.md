# Architecture

NicheLink is a MERN monorepo: a React SPA, an Express 5 REST API with a Socket.io gateway, and
MongoDB, plus Stripe and Cloudinary as external services.

```
                     ┌──────────────────────────────────────────┐
                     │  React 19 SPA (Vite)                     │
                     │  Redux Toolkit · RTK Query · Socket.io   │
                     └───────┬─────────────────┬────────────────┘
       REST /api/v1 (Bearer) │                 │ WSS (access token in handshake)
       refresh cookie ───────┤                 │
                             ▼                 ▼
                     ┌──────────────────────────────────────────┐
                     │  Express 5 API                           │
                     │  routes → middleware → controllers →     │
                     │  services → models                       │
                     │  sockets/ (gateway, presence)            │
                     │  jobs/ (subscription expiry)             │
                     └───┬──────────────┬───────────────┬───────┘
                         │              │               │
                     MongoDB        Cloudinary        Stripe
                    (Mongoose)       (images)     (webhooks in ⇄ API out)
```

## Backend layers

| Layer | Responsibility | Never does |
| --- | --- | --- |
| `routes/` | URL → middleware chain → controller | business logic |
| `middleware/` | authentication, permissions, validation, rate limits, uploads, errors | resource-level authorization |
| `validators/` | Zod schemas for `params`, `query`, `body` | database access |
| `controllers/` | HTTP ↔ service translation, response shaping | Mongoose queries for business rules |
| `services/` | business rules, resource authorization, side effects | touch `req` / `res` |
| `serializers/` | explicit field whitelists per audience (summary, profile, session, admin) | leak private fields |
| `models/` | schema, indexes, hooks | cross-entity rules |
| `sockets/` | authenticated gateway, rooms, presence | duplicate service logic |
| `jobs/` | periodic maintenance | request handling |

A request flows straight down and back:

```
POST /api/v1/posts
  pino-http (request id)
  helmet · cors · compression · cookie-parser
  express.json (200 kb) → sanitizeInput (strip $ and dotted keys)
  rate limiter (global, then per-route class)
  authenticate            → verifies JWT, loads the user, derives the effective role
  requirePermission(...)  → central permission map
  validate({ body })      → Zod parses and whitelists
  postController.create   → postService.createPost
                              ├─ community exists and is readable
                              ├─ membership check (MEMBERSHIP_REQUIRED)
                              ├─ sanitize HTML, derive text + excerpt
                              ├─ verify image ownership
                              └─ create post, bump counters
  sendCreated → { success, data, message }
  errorHandler (on throw)  → { success: false, message, code, errors }
```

## Frontend layers

- `app/` — store and the RTK Query API (single `createApi` instance, feature files inject endpoints).
- `features/<domain>/` — endpoints, slices and domain hooks. Only session, UI, and realtime state live in
  slices; **all server state lives in RTK Query caches**.
- `components/common/` — the design system (Button, Field, Card, Dialog, Menu, Tabs, feedback states).
- `components/<domain>/` — domain components (post card, comment thread, chat panel, community widgets).
- `pages/` — route screens, each lazily loaded so the initial bundle stays small.
- `routes/` — route table plus `RequireAuth`, `RequireGuest`, `RequirePermission`.

### Session lifecycle

1. On boot the SPA calls `POST /auth/refresh` with the httpOnly cookie (`bootstrapSession`).
2. Success stores `{ accessToken, user }` in memory (Redux). Nothing sensitive touches `localStorage`.
3. Every request adds `Authorization: Bearer …` and `X-Requested-With: XMLHttpRequest`.
4. A 401 triggers one single-flight refresh, then retries the original request; a failed refresh ends the
   session. Network failures keep the session and surface the original error (offline ≠ signed out).
5. `session_updated` over the socket (e.g. after a Stripe webhook) re-reads `/auth/me` and invalidates
   permission-dependent caches, so a plan change applies without a reload.

## Real-time

- One Socket.io connection per tab, authenticated with the access token in the handshake.
- Each socket joins `user:<id>`. Conversation rooms (`conversation:<id>`) are joined only after a
  membership check and carry typing indicators.
- Messages are **persisted first**, then emitted to both participants' user rooms, so delivery works
  across tabs and offline recipients simply load history later.
- Presence is reference-counted in memory per instance. Running more than one instance requires the
  Socket.io Redis adapter and a shared presence store — see [socket-events.md](socket-events.md).

## Cross-cutting decisions

- **Backend is the single source of truth** for roles, entitlements, ownership and membership. The client
  receives a permission list purely to shape the UI.
- **No transactions** (MongoDB standalone): correctness comes from unique compound indexes, atomic `$inc`
  counters and idempotent operations rather than multi-document transactions.
- **Consistent envelopes**: `{ success, data, message?, meta? }` and `{ success: false, message, code, errors }`.
- **Feature flags from the environment**: Stripe and Cloudinary are optional; `/config` tells the client
  which features exist so the UI never offers a dead button.

Related: [database.md](database.md) · [security.md](security.md) · [api.md](api.md) ·
[subscription-flow.md](subscription-flow.md) · [implementation-plan.md](implementation-plan.md)
