import { sendTelegram, type TgCfg } from "./integrations/telegram";

export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestPermission(): Promise<boolean> {
  if (!canNotify()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const p = await Notification.requestPermission();
  return p === "granted";
}

export function notify(title: string, body: string) {
  if (!canNotify() || Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
    });
  } catch {}
}

export function getPermissionStatus(): "granted" | "denied" | "default" | "unsupported" {
  if (!canNotify()) return "unsupported";
  return Notification.permission;
}

// Fan-out: browser push + Telegram
export async function alert(
  title: string,
  body: string,
  tgCfg?: TgCfg | null,
  tgMsg?: string,
): Promise<void> {
  notify(title, body);
  if (tgCfg?.botToken && tgCfg?.chatId) {
    const msg = tgMsg ?? `<b>${title}</b>\n${body}`;
    await sendTelegram(msg, tgCfg).catch(() => {});
  }
}

// Daily summary scheduler — call once on app mount
// Fires at 22:00 local time with today's metrics summary
export function scheduleDailySummary(
  getSummary: () => { text: string } | null,
  tgCfg: TgCfg | null,
) {
  if (typeof window === "undefined") return () => {};

  const STORAGE_KEY = "ecc-daily-summary-sent";

  const checkAndSend = () => {
    const now = new Date();
    const hour = now.getHours();
    const dateStr = now.toISOString().slice(0, 10);
    const lastSent = localStorage.getItem(STORAGE_KEY);
    if (hour < 22 || lastSent === dateStr) return;

    const summary = getSummary();
    if (!summary) return;

    localStorage.setItem(STORAGE_KEY, dateStr);
    alert("📊 Resumen del día", summary.text, tgCfg, summary.text).catch(() => {});
  };

  checkAndSend();
  const id = setInterval(checkAndSend, 60 * 1000);
  return () => clearInterval(id);
}
