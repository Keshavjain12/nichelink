# API reference

Base URL: `/api/v1`

## Conventions

**Success**

```json
{ "success": true, "data": { }, "message": "optional", "meta": { "page": 1, "limit": 20, "hasMore": true } }
```

List endpoints return `data` as an array with `meta`. Counted lists add `total` and `totalPages`;
cursor lists (messages) add `nextCursor`.

**Error**

```json
{ "success": false, "message": "Validation failed", "code": "VALIDATION_ERROR",
  "errors": [{ "location": "body", "field": "password", "message": "Password must include a number" }] }
```

| Status | Typical `code` |
| --- | --- |
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN`, `PRO_REQUIRED`, `MEMBERSHIP_REQUIRED`, `DM_LIMIT_REACHED`, `ACCOUNT_SUSPENDED`, `CSRF_REJECTED` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 429 | `RATE_LIMITED` |
| 502/503 | `PAYMENT_PROVIDER_ERROR`, `UPLOAD_ERROR`, `FEATURE_NOT_CONFIGURED` |

**Authentication** — send `Authorization: Bearer <accessToken>`. Cookie-authenticated endpoints
(`/auth/refresh`, `/auth/logout`) additionally require `X-Requested-With: XMLHttpRequest` and an allowed
`Origin`.

**Roles** — `Guest` (unauthenticated), `FreeMember`, `ProMember`, `Admin`. "Pro" below also means Admin.

## Platform

| Method | Endpoint | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/health` | — | `{ status, database, uptime }`; 503 when the database is down |
| GET | `/config` | — | Feature flags, plan catalogue, plan limits |

## Authentication — `/auth`

| Method | Endpoint | Auth | Body / notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | `{ name, username, email, password }` → `{ accessToken, user }`, sets refresh cookie |
| POST | `/auth/login` | — | `{ email, password }` → `{ accessToken, user }`. Generic error on failure |
| POST | `/auth/refresh` | cookie | Rotates the refresh token → `{ accessToken, user }` |
| POST | `/auth/logout` | cookie | Revokes the token family and clears the cookie |
| GET | `/auth/me` | member | Current session user with `permissions` |
| PATCH | `/auth/password` | member | `{ currentPassword, newPassword }`; revokes all other sessions |

## Users — `/users`

| Method | Endpoint | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/users/:username` | member | Public profile plus `stats` |
| GET | `/users/:username/communities` | member | Communities the member belongs to |
| PATCH | `/users/me` | member | `name, headline, bio, location, website, skills, interests` only |
| POST | `/users/me/avatar` | member | `multipart/form-data`, field `image`, ≤ 5 MB |
| DELETE | `/users/me/avatar` | member | Removes the avatar |
| POST | `/uploads/images` | **Pro** | Post image upload, field `image` |

## Communities — `/communities`

| Method | Endpoint | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/communities` | optional | `?q&category&access&featured&sort=popular\|newest\|active\|name&page&limit` |
| GET | `/communities/trending` | optional | Most active in the last 7 days |
| GET | `/communities/recommended` | member | Based on skills and interests |
| POST | `/communities` | **Admin** | `{ name, slug?, tagline, description, icon, accentColor, category, tags, accessType, rules, isFeatured }` |
| GET | `/communities/:idOrSlug` | optional | Detail with `viewer` capability flags and moderators |
| PATCH | `/communities/:idOrSlug` | **Admin** | Partial update; changing `accessType` re-tags existing posts |
| POST | `/communities/:idOrSlug/join` | member | 201 on join, 200 if already a member; Pro communities need Pro |
| DELETE | `/communities/:idOrSlug/membership` | member | Leave (owners cannot) |
| GET | `/communities/:idOrSlug/members` | member | Paginated members with community roles |
| GET | `/communities/:idOrSlug/posts` | optional | Same filters as `/posts`; guests get a 5-post preview |
| GET | `/memberships/me` | member | The viewer's communities |

## Posts & comments

| Method | Endpoint | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/posts` | optional | `?community&author&tag&q&sort=latest\|trending\|top&scope=all\|joined&page&limit` |
| POST | `/posts` | **Pro** + member of the community | `{ community, title, content, tags, images }` |
| GET | `/posts/:id` | member | Full post with `permissions` |
| PATCH | `/posts/:id` | author (Pro) | `{ title?, content?, tags?, images? }` |
| DELETE | `/posts/:id` | author, community moderator or Admin | Moderators may send `{ reason }` |
| PUT | `/posts/:id/reactions` | member | Idempotent like → `{ liked, reactionCount }` |
| DELETE | `/posts/:id/reactions` | member | Idempotent unlike |
| GET | `/posts/:id/comments` | member | Nested tree; `?sort=oldest\|newest&page&limit` |
| POST | `/posts/:id/comments` | **Pro** | `{ content, parentId? }`, max depth 4 |
| PATCH | `/comments/:id` | author (Pro) | `{ content }` |
| DELETE | `/comments/:id` | author, community moderator or Admin | Soft delete |

## Messaging

| Method | Endpoint | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/conversations` | member | Inbox with unread counts and last message |
| POST | `/conversations` | member | `{ recipientId }`; returns the existing conversation if any |
| GET | `/conversations/unread-count` | member | Total unread messages |
| GET | `/conversations/quota` | member | `{ unlimited, limit, used, remaining }` |
| GET | `/conversations/:id` | participant | Non-participants get 404 |
| GET | `/conversations/:id/messages` | participant | `?before=<messageId>&limit` (newest first, chronological within a page) |
| POST | `/conversations/:id/messages` | participant | `{ body, clientId? }`; Free tier limited to 10 per day |
| PATCH | `/conversations/:id/read` | participant | Clears unread and message notifications |
| POST | `/messages` | member | `{ recipientId, body, clientId? }` — opens (or reuses) a conversation and sends |

Real-time equivalents: [socket-events.md](socket-events.md).

## Project Match — `/projects`

| Method | Endpoint | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/projects` | member | `?q&skills=a,b&projectType&commitment&compensation&remote&status&mine&author&page` |
| POST | `/projects` | **Pro** | `{ title, summary?, description, requiredSkills, projectType, commitment, compensation, remote, location? }` |
| GET | `/projects/:id` | member | Detail with `viewer` flags |
| PATCH | `/projects/:id` | author (Pro) | Partial update, including `status` |
| DELETE | `/projects/:id` | author or Admin | Soft delete |
| POST | `/projects/:id/interests` | member | `{ message }`; one per member; not on your own project |
| DELETE | `/projects/:id/interests/me` | member | Withdraw |
| GET | `/projects/:id/interests` | **author only** | Applicants with messages |
| PATCH | `/projects/:id/interests/:interestId` | **author only** | `{ status: "accepted" \| "declined" }` |

## Subscriptions — `/subscriptions`

| Method | Endpoint | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/subscriptions/me` | member | Plan, status, period end, billing capabilities |
| POST | `/subscriptions/checkout` | member | Creates a Stripe Checkout Session → `{ url }` |
| POST | `/subscriptions/checkout/confirm` | member | `{ sessionId }`; server verifies with Stripe and ownership |
| POST | `/subscriptions/portal` | member with a customer | Billing portal URL |
| POST | `/subscriptions/cancel` / `/resume` | Pro | Toggles `cancel_at_period_end` |
| POST | `/subscriptions/webhook` | Stripe signature | Raw body; idempotent; see [subscription-flow.md](subscription-flow.md) |

## Search & notifications

| Method | Endpoint | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/search` | optional | `?q&type=all\|communities\|users\|posts\|projects&page`; guests may search communities only |
| GET | `/search/suggestions` | optional | Prefix suggestions for the search bar |
| GET | `/notifications` | member | `?unread=true&page&limit`; `meta.unreadCount` included |
| GET | `/notifications/unread-count` | member | `{ unreadCount }` |
| PATCH | `/notifications/:id/read` | recipient | 404 for other users' notifications |
| PATCH | `/notifications/read-all` | member | Marks everything read |

## Moderation & admin

| Method | Endpoint | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/reports` | member | `{ targetType: Post\|Comment\|User, targetId, reason, details? }` |
| GET | `/admin/stats` | **Admin** | Totals, 30/14-day series, recent users, top communities |
| GET | `/admin/users` | **Admin** | `?q&role&status&page` |
| PATCH | `/admin/users/:id/status` | **Admin** | `{ status, reason? }`; revokes sessions and sockets |
| PATCH | `/admin/users/:id/admin` | **Admin** | `{ isAdmin }`; demotion restores the subscription-derived role |
| GET | `/admin/communities` | **Admin** | Includes archived communities |
| GET | `/admin/reports` | **Admin** | `?status=open\|resolved\|dismissed\|all&targetType&page` |
| PATCH | `/admin/reports/:id` | **Admin** | `{ action: dismiss\|remove_content\|suspend_user, note? }` |
| GET | `/admin/audit-logs` | **Admin** | Paginated admin action log |

## Rate limits

| Class | Limit |
| --- | --- |
| Global (`/api/v1`) | 600 requests / 15 min per IP |
| Login | 10 failed attempts / 15 min |
| Registration | 10 / hour |
| Sensitive (password, billing) | 10 / 15 min |
| Writes (posts, comments, projects) | 60 / 10 min per user |
| Messages | 40 / min per user (plus the Free daily quota) |
| Uploads | 40 / hour per user |

Responses carry `RateLimit-*` headers (draft-8).
