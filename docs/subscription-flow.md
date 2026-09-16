# Subscription flow (Stripe)

Pro membership is an **entitlement derived from verified Stripe state**, never something a client request
can set. `user.role` is only ever written to `ProMember` by `subscriptionService.refreshUserEntitlement`.

## Upgrade

```
Client                      API                          Stripe
  │  POST /subscriptions/checkout                          │
  ├───────────────────────────►│                           │
  │                            │ ensure customer ─────────►│
  │                            │ create Checkout Session ─►│
  │  { url }                   │                           │
  │◄───────────────────────────┤                           │
  │  redirect to Stripe ──────────────────────────────────►│
  │                            │                           │  (payment)
  │  redirect /billing/success?session_id=cs_…             │
  │                            │◄── webhook: checkout.session.completed
  │                            │ retrieve subscription ───►│
  │                            │ upsert Subscription       │
  │                            │ refreshUserEntitlement    │
  │                            │ emit session_updated ────►│ (socket)
  │  POST /subscriptions/checkout/confirm { sessionId }    │
  ├───────────────────────────►│ retrieve session ────────►│
  │  { checkoutStatus, subscription }                      │
  │◄───────────────────────────┤                           │
```

Two independent paths reach the same state:

- **Webhooks are authoritative** for the whole lifecycle (created, updated, canceled, payment failures).
- **`/checkout/confirm`** is a fast path for the success page. The server retrieves the session *from
  Stripe* and checks `client_reference_id === req.user.id`. A `?success=true` query parameter proves
  nothing and is never read.

The success page polls `/subscriptions/me` while the webhook lands, and honestly reports "still
processing" rather than pretending the upgrade happened.

## Webhook handling

`POST /api/v1/subscriptions/webhook` is mounted **before** `express.json()` with a raw body parser,
because Stripe signs the exact bytes.

1. `stripe.webhooks.constructEvent(rawBody, signature, secret)` — an invalid signature is rejected with
   400 and logged.
2. Unhandled event types return `{ received: true, ignored: true }`.
3. `StripeEvent.create({ eventId })` — the unique index makes processing **idempotent**; duplicates return
   early (Stripe retries aggressively).
4. The handler **re-fetches the subscription from Stripe** rather than trusting the event payload, so
   out-of-order deliveries cannot resurrect a cancelled subscription.
5. On failure the `StripeEvent` row is deleted and a 500 returned, so Stripe retries.

Handled events: `checkout.session.completed`, `customer.subscription.created|updated|deleted|paused|resumed`,
`invoice.paid`, `invoice.payment_failed`.

## Deriving entitlement

`refreshUserEntitlement(userId)`:

1. Loads every `Subscription` for the user and picks the authoritative one (an entitled record with the
   furthest period end, otherwise the most recently updated).
2. Writes the snapshot onto the user: `{ plan, status, currentPeriodEnd, cancelAtPeriodEnd }`.
3. Sets `role` to `ProMember` or `FreeMember` — never touching `Admin` accounts.
4. Notifies the member and emits `session_updated` when the effective role changed.

Entitled statuses: `active`, `trialing`, `past_due` (Stripe is retrying the card). Everything else is Free.

Two safety nets protect against missed webhooks:

- **Per request**: `resolveEffectiveRole` re-derives the role on every authenticated request and refuses
  Pro access once `currentPeriodEnd` is more than 48 hours in the past, even if the stored status still
  says `active`.
- **Hourly job**: `jobs/subscriptionExpiry.js` persists those downgrades so admin metrics stay truthful.

## Cancellation

`POST /subscriptions/cancel` sets `cancel_at_period_end` on Stripe and applies the returned object, so the
member keeps Pro until the paid period ends. `POST /subscriptions/resume` reverses it. The billing portal
(`POST /subscriptions/portal`) handles payment methods and invoices.

## Testing locally

```bash
stripe login
stripe listen --forward-to localhost:5000/api/v1/subscriptions/webhook   # prints whsec_… → STRIPE_WEBHOOK_SECRET
stripe trigger checkout.session.completed
```

Test card `4242 4242 4242 4242`, any future expiry and CVC. Without Stripe keys the endpoints return
`503 FEATURE_NOT_CONFIGURED` and the UI explains that payments are not configured.

The automated suite (`server/tests/subscriptions.test.js`) mocks only Stripe's network calls: webhook
signatures are generated and verified with the real SDK.
