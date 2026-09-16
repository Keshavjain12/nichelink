# Deployment

Target topology: **Vercel** (React SPA) → **Render** (API + Socket.io) → **MongoDB Atlas**, with Stripe and
Cloudinary as external services.

```
   Browser ──► Vercel (static SPA)
                 │  /api/*  rewrite  ──► Render (Express)  ──► MongoDB Atlas
                 └─ wss://api…/socket.io ─┘                └──► Cloudinary / Stripe
```

Routing `/api/*` through Vercel keeps the refresh cookie first-party (`SameSite=Lax`) and avoids CORS for
REST calls. WebSockets connect directly to Render via `VITE_SOCKET_URL`.

## 1. MongoDB Atlas

1. Create a free M0 cluster and a database user.
2. Network access: allow Render's egress, or `0.0.0.0/0` for a demo.
3. Copy the connection string into `MONGODB_URI` (include the database name, e.g. `…/nichelink`).

## 2. Backend on Render

`render.yaml` in the repository root is a Blueprint — "New → Blueprint" and point Render at the repo. Or
configure manually:

| Setting | Value |
| --- | --- |
| Root directory | repository root (npm workspaces) |
| Build command | `npm ci` |
| Start command | `npm start --workspace server` |
| Health check path | `/api/v1/health` |

Environment variables (see [`server/.env.example`](../server/.env.example)):

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://…
JWT_ACCESS_SECRET=<node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))">
CLIENT_URL=https://nichelink.vercel.app
TRUST_PROXY=1
COOKIE_SAMESITE=lax          # 'none' + COOKIE_SECURE=true if the SPA calls the API cross-site
CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRO_PRICE_ID
```

Render's free tier sleeps after inactivity; the first request wakes it and may take ~30 s.

## 3. Frontend on Vercel

| Setting | Value |
| --- | --- |
| Root directory | `client` |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

Edit `client/vercel.json` so the `/api/:path*` rewrite points at your Render URL, then set:

```
VITE_API_URL=/api/v1
VITE_SOCKET_URL=https://nichelink-api.onrender.com
```

`vercel.json` also rewrites unknown paths to `index.html` (SPA routing), caches hashed assets immutably
and adds security headers.

## 4. Stripe (test mode)

1. Create a recurring **Price** for Pro and copy its id into `STRIPE_PRO_PRICE_ID`.
2. Add a webhook endpoint: `https://<api-host>/api/v1/subscriptions/webhook`, subscribed to
   `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid`,
   `invoice.payment_failed`.
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Verify with card `4242 4242 4242 4242`. Details: [subscription-flow.md](subscription-flow.md).

## 5. Cloudinary

Create an account and copy the cloud name, API key and secret. Without them the API still boots; upload
endpoints return `503 FEATURE_NOT_CONFIGURED` and the UI hides upload controls.

## 6. Seed demo data (optional)

```bash
MONGODB_URI="mongodb+srv://…" SEED_DEMO_PASSWORD='<strong-password>' npm run seed
```

The script refuses to run against `NODE_ENV=production` unless `ALLOW_PRODUCTION_SEED=true`, because it
**clears every collection** first.

## Docker (local or self-hosted)

```bash
docker compose up --build      # API on :5000 with a MongoDB 8 container
```

`Dockerfile` builds a production image of the API only (the SPA is static hosting).

## Post-deploy checklist

- [ ] `GET /api/v1/health` returns `{ status: "ok", database: "up" }`
- [ ] Register, sign out, sign back in — the session survives a page reload (refresh cookie works)
- [ ] The socket connects (no `connect_error` in the console) and a message arrives in a second browser
- [ ] Stripe test checkout upgrades the account, and the webhook shows 200 in the Stripe dashboard
- [ ] An image upload succeeds and renders over HTTPS
- [ ] `CLIENT_URL` matches the deployed SPA origin exactly (CORS and cookies depend on it)
- [ ] No secrets in the repository: `git grep -nE "sk_(live|test)_|whsec_|mongodb\+srv://"`
