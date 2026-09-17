# Security

Every rule below is enforced on the server. The client's permission list only shapes the UI.

## Authentication

| Concern              | Implementation                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Password storage     | bcrypt, cost 12 (cost 4 in tests only), `select: false`, never serialized                                                                              |
| Password policy      | ≥ 8 characters with upper, lower and a digit; ≤ 72 bytes (bcrypt's limit)                                                                              |
| Access tokens        | HS256 JWT, 15 minutes, issuer/audience checked, kept **in memory** on the client                                                                       |
| Refresh tokens       | 256-bit random, only the SHA-256 hash stored, httpOnly cookie scoped to `/api/v1/auth`, TTL index                                                      |
| Rotation             | Every refresh rotates the token; tokens belong to a family                                                                                             |
| Theft detection      | Re-use of a rotated token outside a 20 s grace window revokes the whole family                                                                         |
| Session invalidation | Password change sets `passwordChangedAt`; older access tokens are rejected and all refresh tokens revoked                                              |
| Suspension           | `authenticate` reloads the user on every request, so a suspended account loses access immediately; sockets are disconnected and refresh tokens revoked |

**Why not a JWT in `localStorage`?** Any XSS could read it. **Why not only a cookie?** The Socket.io
gateway may live on another origin, where third-party cookie rules are unreliable. A short-lived in-memory
access token plus an httpOnly refresh cookie avoids both problems.

**Account enumeration.** Sign-in returns one generic message for both unknown emails and wrong passwords,
and compares against a dummy hash when the email is unknown so timing does not leak. Registration must
report a duplicate email; that is mitigated with rate limiting (this is the usual trade-off without an
email-verification flow).

## CSRF

API calls authenticate with a `Authorization` header, which browsers never attach automatically — so they
are not forgeable cross-site. The two cookie-authenticated endpoints (`/auth/refresh`, `/auth/logout`) are
protected by `requireTrustedOrigin`:

- `Origin`, when present, must be in the CORS allowlist.
- `X-Requested-With: XMLHttpRequest` is required. A cross-site form cannot set custom headers, and a
  cross-origin `fetch` that does must first pass a CORS preflight against our allowlist.

The refresh cookie is `SameSite=Lax` by default (first-party when the SPA proxies `/api`), configurable to
`None; Secure` for cross-site deployments.

## Authorization

- A single permission map (`constants/permissions.js`) maps permissions → roles; routes name permissions,
  never roles.
- The Pro role is **derived**, never assigned by a request: `resolveEffectiveRole` recomputes it per
  request from stored Stripe state and expires it when the period has lapsed.
- Resource rules live in services: ownership (posts, comments, projects), membership (posting),
  participation (conversations), community moderator role, and admin.
- **IDOR defences**: conversations return 404 to non-participants (not 403, which would confirm
  existence); notifications, project interests and billing actions are always scoped by the caller's id;
  `PATCH /users/me` and `PATCH /auth/password` act on the token's subject only.
- Admins cannot suspend themselves, cannot suspend another admin without demoting them first, and every
  admin action is written to `AuditLog`.

## Input handling

- Zod validates and **whitelists** `params`, `query` and `body` on every route; unknown keys are stripped,
  so `role`, `subscription` or `status` in a profile update are simply discarded.
- A recursive sanitizer removes `$`-prefixed and dotted keys from JSON bodies; together with typed
  validation this closes NoSQL operator injection (`{"email": {"$ne": null}}` is rejected as a type error).
- Object ids are regex-validated before hitting Mongoose, so invalid input returns 400 rather than a cast
  error.
- Regex search input is escaped (`escapeRegex`) and anchored; free-text search uses text indexes.
- JSON bodies are capped at 200 kB; uploads at 5 MB.

## Content safety (XSS)

- Post HTML is sanitized server-side with a strict `sanitize-html` allowlist: a fixed tag set, no `style`,
  no `img`, `http/https/mailto` only, and links rewritten to `rel="noopener noreferrer nofollow"`.
- The client sanitizes again with DOMPurify before rendering (defence in depth).
- Comments, messages and project descriptions are plain text rendered as text nodes.
- Profile websites must be `http(s)`, blocking `javascript:` URLs.
- Helmet sets the standard security headers; Vercel adds `X-Frame-Options`, `X-Content-Type-Options` and a
  referrer policy for the SPA.

## Uploads

- `multer` memory storage, 5 MB limit, one file per request, MIME allowlist.
- **Magic-byte verification** decides the real type (JPEG/PNG/WebP/GIF). SVG is rejected outright, so an
  SVG carrying script cannot be stored — a renamed `.png` fails too.
- Assets land in `nichelink/users/<userId>/…`. A post may only reference public IDs inside the author's own
  folder, which prevents attaching or deleting another member's assets.
- Cloudinary credentials stay server-side; uploads are streamed, never proxied through the client.

## Payments

- Webhook signatures are verified against the raw request body; unsigned or forged requests get 400.
- Events are de-duplicated via a unique `eventId`, and the handler re-fetches the subscription from Stripe
  rather than trusting the payload, so replayed or out-of-order events cannot grant access.
- `POST /checkout/confirm` verifies the session with Stripe **and** that `client_reference_id` matches the
  caller. A `?success=true` parameter means nothing to the server.
- Secret keys never reach the client; `/config` exposes only booleans.

## Transport, logging and configuration

- Strict CORS allowlist with credentials; `trust proxy` is explicit so rate limiting sees real client IPs.
- Rate limits per route class (see [api.md](api.md)), plus a per-socket token bucket for messages.
- Structured pino logs redact `authorization`, `cookie`, `set-cookie` and any password or token field.
  Message bodies are never logged.
- Errors return safe messages; stack traces only appear outside production.
- Environment variables are validated at boot; the server refuses to start with a short `JWT_ACCESS_SECRET`
  or a `SameSite=None` cookie without `Secure`. Secrets live only in the environment, and `.env` is ignored
  by git.

## Known dependency advisories

`npm audit` reports one advisory, reviewed and accepted:

| Package                | Advisory                                                                                                                       | Status                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `quill@2.0.3` (client) | [GHSA-v3m3-f69x-jf25](https://github.com/advisories/GHSA-v3m3-f69x-jf25) — XSS via the HTML export feature (`getSemanticHTML`) | **Mitigated; no patched release exists** |

Why it does not expose NicheLink users:

1. The editor's exported HTML is never inserted into the page. It is only sent to the API.
2. The API re-sanitizes every post body with a strict `sanitize-html` allowlist (fixed tags, only
   `href/target/rel` on links, `http/https/mailto` schemes) before storing it — any markup the export
   emits outside that allowlist is discarded.
3. Rendering sanitizes again with DOMPurify using the same allowlist.

Because an attacker can bypass Quill entirely and call `POST /posts` directly, the server-side sanitizer
is the real security boundary regardless of this advisory; `server/tests/posts.test.js` exercises it with
script tags, event handlers, `javascript:` URLs and images. The suggested `npm audit fix --force`
downgrades to 2.0.2, which is merely unlisted rather than known-safe, so it is not applied. Revisit when
Quill publishes a patched version.

## Verified by tests

`server/tests/` covers: generic login errors, suspended accounts, refresh rotation and family revocation,
CSRF header/origin enforcement, operator-injection payloads, privilege-escalation attempts through profile
and registration fields, Pro-gating of posts/comments/Pro communities/projects, cross-user post and comment
edits, conversation IDOR, notification IDOR, project interest privacy, admin-only routes, webhook signature
rejection, replay and out-of-order events, checkout confirmation for a session belonging to someone else,
and foreign Cloudinary public IDs.
