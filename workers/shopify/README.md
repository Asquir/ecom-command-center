# ECC Shopify Proxy Worker

Forwards Shopify Admin API requests from the browser (CORS workaround).
The user's admin token is passed per-request — never stored.

## Setup

```bash
cd workers/shopify
npm install -g wrangler
wrangler login
wrangler deploy
```

After deploy, set the endpoint in the app:

```
NEXT_PUBLIC_SHOPIFY_PROXY=https://ecc-shopify-proxy.<your-account>.workers.dev/proxy
```

## Security

- Only `/admin/api/` paths are forwarded
- `..` path traversal is stripped
- Shop domain is validated (must match Shopify domain pattern)
- Token never stored server-side

## Test

```bash
curl -X POST https://ecc-shopify-proxy.<your-account>.workers.dev/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "shopDomain": "your-store.myshopify.com",
    "adminToken": "shpat_xxx",
    "path": "/admin/api/2025-01/shop.json"
  }'
```

## Shopify app setup (Custom App)

1. Go to Shopify Admin → Settings → Apps and sales channels → Develop apps
2. Create app → Configure Admin API scopes: `read_orders`, `read_products`
3. Install app → copy the Admin API access token
4. Paste token + shop domain in ECC Settings → Integraciones → Shopify
