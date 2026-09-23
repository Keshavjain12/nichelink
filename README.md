# NicheLink

**Find your people. Build your niche.**

**[Live demo →](https://nichelink-sigma.vercel.app)** · sign in with `pro@nichelink.demo` / `NicheLink-Demo-2026!`

> Hosted on free tiers: the API sleeps after 15 minutes idle, so the first request may take ~50 seconds to
> wake it. Payments run in Stripe **test mode** — upgrade with card `4242 4242 4242 4242`, any future expiry
> and any CVC. No real money moves.

NicheLink is a community platform for remote professionals: persistent, high-quality micro-communities
("SaaS Developers", "AI Engineers", "Technical Writers") with threaded discussions, real-time direct
messaging, a collaboration board, and a Pro tier backed by Stripe.

A full-stack MERN application built as a portfolio project — with the parts that usually get skipped:
rotating refresh tokens, server-derived entitlements, webhook-verified subscriptions, moderation tooling,
and 140+ automated tests.

```
React 19 + Vite + Redux Toolkit  ⇄  Express 5 + Socket.io + Mongoose  ⇄  MongoDB
                                         ├─ Stripe (subscriptions)
                                         └─ Cloudinary (images)
```

## Contents

- [Features](#features) · [Tech stack](#tech-stack) · [Architecture](#architecture)
- [Getting started](#getting-started) · [Environment variables](#environment-variables)
- [Demo accounts](#demo-accounts) · [Testing](#testing) · [Deployment](#deployment)
- [Project structure](#project-structure) · [Security](#security) · [Future improvements](#future-improvements)

## Features

**Communities & content**

- Public and Pro-only communities with categories, tags, rules, moderators and featured placement
- Memberships with community roles (member / moderator / owner) and atomic member counts
- Posts with a rich text editor (Quill), sanitized HTML, image attachments, tags and soft deletion
- Nested comments (4 levels) loaded with two queries, plus idempotent likes with optimistic UI
- Feed with Latest / Trending / Top sorting, "my communities" scope, infinite scroll and search

**Real-time messaging**

- 1-to-1 conversations with instant delivery, presence, typing indicators and read receipts
- Optimistic sending with `clientId` de-duplication and an automatic REST fallback when the socket drops
- Message history with cursor pagination; unread badges across the app

**Project Match**

- Pro members post collaboration requests (type, commitment, compensation, skills, remote)
- Anyone can express interest with a message; authors accept or decline and message applicants

**Membership & monetization**

- Free vs Pro plans, Stripe Checkout, billing portal, cancel/resume at period end
- Pro access derived exclusively from signature-verified, idempotent Stripe webhooks

**Platform**

- Role-based access control (Guest / FreeMember / ProMember / Admin) enforced server-side
- Notifications (in-app + real-time) for replies, reactions, messages, project interest and account events
- Global search across communities, people, posts and projects, with type-ahead suggestions
- Admin dashboard: metrics and charts, user management, community management, moderation queue, audit log
- Reporting for posts, comments and members
- Responsive design, light/dark themes, skeleton loaders, empty and error states, keyboard-accessible UI

## Tech stack

| Layer           | Choices                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend        | React 19, Vite, React Router 7, Redux Toolkit + RTK Query, Tailwind CSS 4, React Hook Form + Zod, Socket.io client, Quill, DOMPurify, Recharts, Lucide, Sonner |
| Backend         | Node 24, Express 5, Mongoose 9, Socket.io, JWT, bcrypt, Zod, Helmet, express-rate-limit, sanitize-html, multer, pino                                           |
| Data & services | MongoDB, Stripe, Cloudinary                                                                                                                                    |
| Tooling         | npm workspaces, Vitest, Supertest, Testing Library, ESLint 9/10 flat config, Prettier, GitHub Actions, Docker                                                  |

## Architecture

- **Layered backend**: `routes → middleware → controllers → services → models`, with serializers that
  whitelist fields per audience. No business logic in routes; no `req`/`res` in services.
- **Auth**: 15-minute access tokens held in memory + rotating httpOnly refresh cookies with token-family
  reuse detection. Identity comes from the token; authority always from the database.
- **Entitlements**: `ProMember` is derived per request from stored Stripe state and expires automatically —
  no client request can grant it.
- **Real-time**: authenticated Socket.io gateway; messages are persisted before fan-out, so delivery is
  never the source of truth.

Deep dives: [architecture](docs/architecture.md) · [database & ER diagram](docs/database.md) ·
[API reference](docs/api.md) · [security](docs/security.md) · [socket events](docs/socket-events.md) ·
[subscription flow](docs/subscription-flow.md) · [testing](docs/testing.md) ·
[deployment](docs/deployment.md) · [implementation plan](docs/implementation-plan.md)

## Screenshots

> Run `npm run dev` and `npm run seed` to explore the seeded demo content.

| Screen                          | Path                            |
| ------------------------------- | ------------------------------- |
| Landing page                    | `/`                             |
| Feed with trending communities  | `/feed`                         |
| Community board                 | `/communities/saas-developers`  |
| Discussion with nested comments | `/posts/:id`                    |
| Real-time messages              | `/messages`                     |
| Project Match                   | `/projects`                     |
| Pricing & billing               | `/pricing`, `/settings/billing` |
| Admin dashboard                 | `/admin`                        |

## Getting started

### Prerequisites

- Node.js **20.19+** (developed on 24) and npm 10+
- MongoDB 6+ running locally, or a MongoDB Atlas connection string
- Optional: Stripe test keys (payments) and a Cloudinary account (image uploads) — the app runs without
  them and disables those features explicitly

### Installation

```bash
git clone <repository-url> nichelink
cd nichelink
npm install                      # installs both workspaces

cp server/.env.example server/.env
cp client/.env.example client/.env   # optional; defaults work for local development

# generate a strong secret and put it in server/.env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Database setup

Point `MONGODB_URI` at your instance (default `mongodb://127.0.0.1:27017/nichelink`), then load the demo
content:

```bash
npm run seed
```

This **clears the target database** and inserts 15 members, 10 communities, 23 posts, threaded comments,
reactions, projects, conversations, notifications and two open reports.

### Running locally

```bash
npm run dev        # API on http://localhost:5000, SPA on http://localhost:5173
npm run server     # API only
npm run client     # SPA only
```

The Vite dev server proxies `/api` and `/socket.io` to the API, so cookies stay first-party and there is no
CORS in development.

### Cloudinary setup (optional)

Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` to `server/.env`. Uploads are
validated by magic bytes and stored under `nichelink/users/<userId>/`.

### Stripe setup (optional)

1. Create a recurring price for Pro → `STRIPE_PRO_PRICE_ID`
2. `stripe listen --forward-to localhost:5000/api/v1/subscriptions/webhook` → `STRIPE_WEBHOOK_SECRET`
3. Upgrade with test card `4242 4242 4242 4242`

## Environment variables

Full documentation in [`server/.env.example`](server/.env.example) and [`client/.env.example`](client/.env.example).

| Variable                                                            | Required         | Purpose                                        |
| ------------------------------------------------------------------- | ---------------- | ---------------------------------------------- |
| `MONGODB_URI`                                                       | ✅               | MongoDB connection string                      |
| `JWT_ACCESS_SECRET`                                                 | ✅               | Access-token signing key (≥ 32 chars)          |
| `CLIENT_URL`                                                        | ✅ in production | SPA origin for CORS and Stripe redirects       |
| `JWT_ACCESS_EXPIRES_IN`, `REFRESH_TOKEN_TTL_DAYS`                   | —                | Token lifetimes (15m / 30 days)                |
| `COOKIE_SAMESITE`, `COOKIE_SECURE`, `TRUST_PROXY`                   | —                | Cookie and proxy behaviour                     |
| `RATE_LIMIT_ENABLED`, `LOG_LEVEL`, `PORT`                           | —                | Operational tuning                             |
| `CLOUDINARY_*`                                                      | —                | Enables image uploads                          |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` | —                | Enables payments                               |
| `SEED_DEMO_PASSWORD`                                                | —                | Overrides the seeded demo password             |
| `VITE_API_URL`, `VITE_SOCKET_URL`                                   | —                | Client endpoints (defaults suit the dev proxy) |

## Demo accounts

On the [live demo](https://nichelink-sigma.vercel.app), or locally after `npm run seed`:

| Role        | Email                  | Password               |
| ----------- | ---------------------- | ---------------------- |
| Admin       | `admin@nichelink.demo` | `NicheLink-Demo-2026!` |
| Pro member  | `pro@nichelink.demo`   | `NicheLink-Demo-2026!` |
| Free member | `free@nichelink.demo`  | `NicheLink-Demo-2026!` |

Set `SEED_DEMO_PASSWORD` to use your own. These credentials exist only in seeded demo data.

Try: sign in as the Free member and attempt to post (blocked with an upgrade path), then as the Pro member
to publish, message and post a project; sign in as the Admin to review the moderation queue.

## Testing

```bash
npm test                          # server + client
npm test --workspace server
npm test --workspace client
npm run lint
npm run build
```

Backend suites run against a real MongoDB (in-memory by default, or `TEST_MONGODB_URI`) through the real
Express app. Frontend suites drive real components with a real store and a stubbed `fetch`. Coverage and
the verified workflows are listed in [docs/testing.md](docs/testing.md).

## API documentation

Every endpoint, with authentication, roles, parameters and error codes:
**[docs/api.md](docs/api.md)**. Real-time events: **[docs/socket-events.md](docs/socket-events.md)**.

## Deployment

Frontend on Vercel, API on Render, data on MongoDB Atlas — step by step in
[docs/deployment.md](docs/deployment.md). The repository includes `render.yaml`, `client/vercel.json`, a
production `Dockerfile`, `docker-compose.yml` and a GitHub Actions workflow that lints, tests, builds and
scans for committed secrets.

> **If you fork this:** the `/api/:path*` rewrite in `client/vercel.json` points at
> `https://nichelink-api.onrender.com`, this deployment's API. `vercel.json` cannot read environment
> variables, so replace that `destination` with your own API URL, or your client will call this one.

## Project structure

```
nichelink/
├── client/                     # React SPA
│   └── src/
│       ├── app/                # store + RTK Query API
│       ├── components/         # common design system + domain components
│       ├── features/           # endpoints, slices and realtime bridge per domain
│       ├── hooks/ pages/ routes/ services/ styles/ utils/
├── server/                     # Express API
│   └── src/
│       ├── config/ constants/ controllers/ jobs/ middleware/
│       ├── models/ routes/ scripts/ serializers/ services/ sockets/ utils/ validators/
│   └── tests/                  # Vitest + Supertest suites
├── docs/                       # architecture, API, database, security, deployment…
├── .github/workflows/ci.yml
├── Dockerfile · docker-compose.yml · render.yaml
```

## Security

Highlights (full write-up in [docs/security.md](docs/security.md)):

- bcrypt hashing, strong password policy, generic sign-in errors, constant-time comparison for unknown emails
- Rotating refresh tokens with theft detection; suspension takes effect immediately across HTTP and sockets
- Permissions enforced server-side; Pro status derived from verified Stripe state only
- Zod whitelisting plus operator-key stripping (NoSQL injection), escaped regex search
- Server-side HTML sanitization + DOMPurify on render; uploads verified by magic bytes; SVG rejected
- Signature-verified, idempotent Stripe webhooks; secrets never reach the client
- Helmet, strict CORS, layered rate limiting, redacted structured logs, no stack traces in production

## Future improvements

- Email delivery for verification, password reset and digests
- Redis adapter + shared presence store for multi-instance scaling
- Group conversations and message attachments
- Community-level analytics for moderators
- Full-text relevance tuning (or Atlas Search) and saved posts
- E2E tests (Playwright) covering the Stripe sandbox flow end to end

---

Built by [Keshav Jain](https://github.com/Keshavjain12). Demo data and member stories are fictional.
