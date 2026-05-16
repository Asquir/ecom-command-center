/**
 * Cloudflare Worker: Shopify Admin API proxy for ECC
 *
 * Why this exists: Shopify Admin API does not send CORS headers,
 * so browser fetch is blocked. This worker forwards requests
 * server-side and never stores the user's token.
 *
 * POST /proxy
 *   Body: { shopDomain, adminToken, path, method?, body? }
 *   Returns: JSON from Shopify Admin API
 */

interface Env {
  ALLOWED_ORIGIN?: string;
}

interface ProxyRequest {
  shopDomain: string;
  adminToken: string;
  path: string;
  method?: string;
  body?: unknown;
}

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
});

function json(body: unknown, status = 200, origin = "*") {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function validateDomain(domain: string): boolean {
  // Must be a valid Shopify domain
  return /^[a-z0-9-]+\.myshopify\.com$/.test(domain) ||
         /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain);
}

function sanitizePath(path: string): string {
  // Only allow /admin/api/ paths
  if (!path.startsWith("/admin/api/")) {
    throw new Error("Only /admin/api/ paths are allowed");
  }
  // Strip any attempt to escape
  return path.replace(/\.\./g, "");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, origin);
    }

    let body: ProxyRequest;
    try {
      body = await request.json() as ProxyRequest;
    } catch {
      return json({ error: "Invalid JSON" }, 400, origin);
    }

    const { shopDomain, adminToken, path, method = "GET" } = body;

    if (!shopDomain || !adminToken || !path) {
      return json({ error: "Missing shopDomain, adminToken, or path" }, 400, origin);
    }

    if (!validateDomain(shopDomain)) {
      return json({ error: "Invalid shop domain" }, 400, origin);
    }

    let safePath: string;
    try {
      safePath = sanitizePath(path);
    } catch (e) {
      return json({ error: (e as Error).message }, 400, origin);
    }

    const shopifyUrl = `https://${shopDomain}${safePath}`;

    try {
      const shopifyRes = await fetch(shopifyUrl, {
        method,
        headers: {
          "X-Shopify-Access-Token": adminToken,
          "Content-Type": "application/json",
        },
        body: body.body ? JSON.stringify(body.body) : undefined,
      });

      const data = await shopifyRes.json();
      return json(data, shopifyRes.status, origin);
    } catch (e) {
      return json({ error: "Failed to reach Shopify" }, 502, origin);
    }
  },
};
