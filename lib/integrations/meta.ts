export interface MetaCfg {
  accessToken: string;
  adAccountId: string;
  lastSync: number | null;
}

export const DEFAULT_META_CFG: MetaCfg = { accessToken: "", adAccountId: "", lastSync: null };

export interface DailyMetricPatch {
  spend: number;
  revenue: number;
  clicks: number;
  impressions: number;
  purchases: number;
  atc: number;
  checkouts: number;
  source: "meta";
}

interface MetaInsight {
  spend: string;
  impressions: string;
  clicks: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
}

function sumAction(actions: MetaInsight["actions"], type: string): number {
  const entry = actions?.find(a => a.action_type === type);
  return entry ? parseFloat(entry.value) : 0;
}

export async function testMetaConnection(cfg: MetaCfg): Promise<{ ok: boolean; accountName?: string; error?: string }> {
  if (!cfg.accessToken || !cfg.adAccountId) return { ok: false, error: "Faltan token o Ad Account ID" };
  try {
    const accountId = cfg.adAccountId.startsWith("act_") ? cfg.adAccountId : `act_${cfg.adAccountId}`;
    const url = `https://graph.facebook.com/v21.0/${accountId}?fields=name,account_status&access_token=${cfg.accessToken}`;
    const res = await fetch(url);
    const data = await res.json() as { name?: string; error?: { message: string }; account_status?: number };
    if (data.error) return { ok: false, error: data.error.message };
    if (data.account_status && data.account_status !== 1) return { ok: false, error: "La cuenta de anuncios no está activa" };
    return { ok: true, accountName: data.name };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de red" };
  }
}

export async function syncMetaToday(cfg: MetaCfg): Promise<{ patch: DailyMetricPatch; date: string } | { error: string }> {
  if (!cfg.accessToken || !cfg.adAccountId) return { error: "Meta no configurado" };
  try {
    const accountId = cfg.adAccountId.startsWith("act_") ? cfg.adAccountId : `act_${cfg.adAccountId}`;
    const fields = "spend,impressions,clicks,actions,action_values";
    const url = `https://graph.facebook.com/v21.0/${accountId}/insights?fields=${fields}&date_preset=today&access_token=${cfg.accessToken}`;
    const res = await fetch(url);
    const data = await res.json() as {
      data?: MetaInsight[];
      error?: { message: string; code?: number };
    };

    if (data.error) {
      // Token expired detection
      if (data.error.code === 190) return { error: "TOKEN_EXPIRED" };
      return { error: data.error.message };
    }

    const insights: MetaInsight = data.data?.[0] ?? { spend: "0", impressions: "0", clicks: "0" };
    const today = new Date().toISOString().slice(0, 10);

    const patch: DailyMetricPatch = {
      spend:       parseFloat(insights.spend ?? "0"),
      revenue:     sumAction(insights.action_values, "purchase"),
      clicks:      parseInt(insights.clicks ?? "0", 10),
      impressions: parseInt(insights.impressions ?? "0", 10),
      purchases:   sumAction(insights.actions, "purchase"),
      atc:         sumAction(insights.actions, "add_to_cart"),
      checkouts:   sumAction(insights.actions, "initiate_checkout"),
      source:      "meta",
    };

    return { patch, date: today };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error de red" };
  }
}

export function isTokenExpiringSoon(cfg: MetaCfg): boolean {
  // Meta System User tokens expire after 60 days; we warn at 53 days (7 days early)
  // We can't know the exact creation date, but we track lastSync
  // If lastSync is more than 53 days ago, warn
  if (!cfg.lastSync) return false;
  const WARN_MS = 53 * 24 * 60 * 60 * 1000;
  return Date.now() - cfg.lastSync > WARN_MS;
}
