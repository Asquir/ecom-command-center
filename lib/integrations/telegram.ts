export interface TgCfg {
  botToken: string;
  chatId: string;
}

export const DEFAULT_TG_CFG: TgCfg = { botToken: "", chatId: "" };

export async function sendTelegram(msg: string, cfg: TgCfg): Promise<void> {
  if (!cfg.botToken || !cfg.chatId) return;
  const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: cfg.chatId, text: msg, parse_mode: "HTML" }),
  });
}

export async function testTelegram(cfg: TgCfg): Promise<{ ok: boolean; error?: string }> {
  if (!cfg.botToken || !cfg.chatId) return { ok: false, error: "Faltan token o chat ID" };
  try {
    const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text: "✅ <b>Ecom Command Center</b>\n\nConexión Telegram configurada correctamente. Recibirás alertas críticas de tus campañas aquí.",
        parse_mode: "HTML",
      }),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    if (!data.ok) return { ok: false, error: data.description ?? "Error de Telegram" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de red" };
  }
}
