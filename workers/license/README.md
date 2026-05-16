# ECC License Worker

Cloudflare Worker for verifying ECC Pro licenses.

## Endpoints

- `POST /verify` — body: `{ key }` → `{ valid, plan, expiresAt, status }`
- `POST /webhook/stripe` — Stripe webhook for new subscriptions

## Setup

```bash
cd workers/license
npm install -g wrangler
wrangler login
wrangler kv:namespace create LICENSES
# Copy the namespace id into wrangler.toml
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler deploy
```

After deploy, set the endpoint in the app:

```
NEXT_PUBLIC_LICENSE_ENDPOINT=https://ecc-license.<your-account>.workers.dev/verify
```

## Test

```bash
# Insert a test license manually
wrangler kv:key put --binding=LICENSES "TEST-KEY-001" '{"plan":"pro","customerId":"test","createdAt":1700000000000,"expiresAt":null,"status":"active"}'

# Verify
curl -X POST https://ecc-license.<your-account>.workers.dev/verify \
  -H "Content-Type: application/json" \
  -d '{"key":"TEST-KEY-001"}'
# → {"valid":true,"plan":"pro","expiresAt":null,"status":"active"}
```

## Stripe integration

1. Create a subscription product in Stripe (€19/mes recurring)
2. Set up a webhook to `https://ecc-license.<your-account>.workers.dev/webhook/stripe`
3. Listen for `checkout.session.completed` (creates license)
4. Listen for `customer.subscription.deleted` (revokes license)

The Worker generates an opaque `ECC-XXXXXXXXXXXXXXXXXX` key per subscription. Currently it logs the key to the response — you must implement emailing this key to `customer_email` via Resend/Postmark/your provider.
