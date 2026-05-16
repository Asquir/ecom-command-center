export interface ShopifyCfg {
  shopDomain: string;
  adminToken: string;
  lastOrderId: number | null;
  lastSync: number | null;
}

export const DEFAULT_SHOPIFY_CFG: ShopifyCfg = {
  shopDomain: "", adminToken: "", lastOrderId: null, lastSync: null,
};

export interface ShopifyOrder {
  id: number;
  name: string;
  email: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  subtotal_price: string;
  total_discounts: string;
  line_items: { title: string; quantity: number; price: string }[];
  customer?: { first_name?: string; last_name?: string };
}

const PROXY_URL = process.env.NEXT_PUBLIC_SHOPIFY_PROXY
  ?? "https://ecc-shopify-proxy.workers.dev/proxy";

async function shopifyRequest<T>(cfg: ShopifyCfg, path: string): Promise<T> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shopDomain: cfg.shopDomain, adminToken: cfg.adminToken, path }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function testShopifyConnection(cfg: ShopifyCfg): Promise<{ ok: boolean; shopName?: string; error?: string }> {
  if (!cfg.shopDomain || !cfg.adminToken) return { ok: false, error: "Faltan dominio o token" };
  try {
    const data = await shopifyRequest<{ shop?: { name: string }; errors?: string }>(cfg, "/admin/api/2025-01/shop.json");
    if (data.errors) return { ok: false, error: String(data.errors) };
    if (!data.shop) return { ok: false, error: "Respuesta inesperada de Shopify" };
    return { ok: true, shopName: data.shop.name };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de red" };
  }
}

export async function syncShopifyOrders(cfg: ShopifyCfg): Promise<{ orders: ShopifyOrder[]; error?: never } | { error: string; orders?: never }> {
  if (!cfg.shopDomain || !cfg.adminToken) return { error: "Shopify no configurado" };
  try {
    const sinceId = cfg.lastOrderId ? `&since_id=${cfg.lastOrderId}` : "";
    const path = `/admin/api/2025-01/orders.json?status=any&limit=50${sinceId}`;
    const data = await shopifyRequest<{ orders?: ShopifyOrder[]; errors?: string }>(cfg, path);
    if (data.errors) return { error: String(data.errors) };
    return { orders: data.orders ?? [] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de red" };
  }
}

export async function syncShopifyToday(cfg: ShopifyCfg): Promise<
  { revenue: number; orders: number; aov: number; error?: never } | { error: string }
> {
  if (!cfg.shopDomain || !cfg.adminToken) return { error: "Shopify no configurado" };
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const since = today.toISOString();
    const path = `/admin/api/2025-01/orders.json?status=any&created_at_min=${since}&limit=250`;
    const data = await shopifyRequest<{ orders?: ShopifyOrder[]; errors?: string }>(cfg, path);
    if (data.errors) return { error: String(data.errors) };
    const orders = (data.orders ?? []).filter(o => o.financial_status === "paid");
    const revenue = orders.reduce((s, o) => s + parseFloat(o.total_price), 0);
    return { revenue, orders: orders.length, aov: orders.length > 0 ? revenue / orders.length : 0 };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de red" };
  }
}
