/**
 * Cloudflare Worker: License verification for Ecom Command Center
 *
 * Routes:
 *   POST /verify    { key }                         → { valid, plan, expiresAt }
 *   POST /webhook   (Stripe / Lemon Squeezy)        → stores/revokes keys
 *
 * Bindings required (wrangler.toml):
 *   - LICENSES (KV namespace): stores license records
 *   - STRIPE_WEBHOOK_SECRET (env var, optional)
 *   - LEMON_WEBHOOK_SECRET (env var, optional)
 */

interface Env {
  LICENSES: KVNamespace;
  STRIPE_WEBHOOK_SECRET?: string;
  LEMON_WEBHOOK_SECRET?: string;
  ALLOWED_ORIGIN?: string;
}

interface LicenseRecord {
  plan: "pro";
  customerId: string;
  customerEmail?: string;
  createdAt: number;
  expiresAt: number | null; // null = lifetime
  status: "active" | "cancelled" | "past_due";
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

async function handleVerify(request: Request, env: Env, origin: string) {
  let body: { key?: string };
  try { body = await request.json(); } catch { return json({ valid: false, error: "Invalid JSON" }, 400, origin); }
  const key = (body.key ?? "").trim();
  if (!key) return json({ valid: false }, 200, origin);

  const raw = await env.LICENSES.get(key);
  if (!raw) return json({ valid: false }, 200, origin);

  let rec: LicenseRecord;
  try { rec = JSON.parse(raw); } catch { return json({ valid: false }, 200, origin); }

  const now = Date.now();
  const expired = rec.expiresAt !== null && rec.expiresAt < now;
  const valid = rec.status === "active" && !expired;

  return json({
    valid,
    plan: valid ? rec.plan : "free",
    expiresAt: rec.expiresAt,
    status: rec.status,
  }, 200, origin);
}

async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  // TODO: validate Stripe signature with env.STRIPE_WEBHOOK_SECRET
  const event = await request.json() as {
    type: string;
    data: { object: Record<string, unknown> };
  };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { customer: string; customer_email: string; id: string };
    const key = `ECC-${crypto.randomUUID().slice(0, 18).toUpperCase()}`;
    const record: LicenseRecord = {
      plan: "pro",
      customerId: session.customer,
      customerEmail: session.customer_email,
      createdAt: Date.now(),
      expiresAt: null, // billing handled by Stripe subscription state
      status: "active",
    };
    await env.LICENSES.put(key, JSON.stringify(record));
    // TODO: email the key to customer_email via Resend/Postmark
    return json({ ok: true, key });
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as { customer: string };
    // Find license by customerId — requires reverse index (skipped for MVP)
    // Mark status = "cancelled"
    return json({ ok: true });
  }

  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);

    if (url.pathname === "/verify" && request.method === "POST") {
      return handleVerify(request, env, origin);
    }

    if (url.pathname === "/webhook/stripe" && request.method === "POST") {
      return handleStripeWebhook(request, env);
    }

    return json({ error: "Not found" }, 404, origin);
  },
};
