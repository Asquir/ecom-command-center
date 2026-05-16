"use client";
import { useState, useEffect } from "react";
import { eur } from "@/lib/utils";
import { useSettings, DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings-context";
import { useLocalStorage } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { CheckCircle, Settings2, Globe, Target, Zap, Link, Trash2, AlertTriangle, User, Download, Upload, Bell, Sparkles, ExternalLink, Key, Send, MessageCircle, BarChart2, ShoppingBag } from "lucide-react";
import { exportBackup, importBackup } from "@/lib/data-io";
import { requestPermission, getPermissionStatus } from "@/lib/notifications";
import { ProBadge } from "@/components/ui/pro-gate";
import { testAiConnection, type AiCfg, DEFAULT_AI_CFG } from "@/lib/integrations/claude";
import { testTelegram, type TgCfg, DEFAULT_TG_CFG } from "@/lib/integrations/telegram";
import { testMetaConnection, type MetaCfg, DEFAULT_META_CFG } from "@/lib/integrations/meta";
import { testShopifyConnection, type ShopifyCfg, DEFAULT_SHOPIFY_CFG } from "@/lib/integrations/shopify";
import { clearLicenseCache } from "@/lib/license";

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 p-4 border-b border-[var(--border)]">
        <div className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center text-[var(--ink-3)]">{icon}</div>
        <div className="text-[13px] font-semibold text-[var(--ink-1)]">{title}</div>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
      <div>
        <div className="text-[12px] font-medium text-[var(--ink-2)] mb-0.5">{label}</div>
        {hint && <div className="text-[11px] text-[var(--ink-4)]">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Input({ value, onChange, prefix, suffix }: { value: string | number; onChange: (v: string) => void; prefix?: string; suffix?: string }) {
  return (
    <div className="flex items-center h-8 border border-[var(--border)] rounded-lg overflow-hidden bg-white focus-within:border-[var(--gold)] focus-within:ring-2 focus-within:ring-[rgba(200,169,106,0.15)] transition-all">
      {prefix && <span className="px-2 text-[11px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-r border-[var(--border)] h-full flex items-center">{prefix}</span>}
      <input value={value} onChange={e => onChange(e.target.value)}
        className="flex-1 px-2.5 text-[13px] text-[var(--ink-1)] outline-none bg-transparent min-w-[80px]" />
      {suffix && <span className="px-2 text-[11px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-l border-[var(--border)] h-full flex items-center">{suffix}</span>}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-[var(--ink-1)]" : "bg-[var(--bg-inset)] border border-[var(--border)]"}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function SelectField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="h-8 px-2.5 pr-7 text-[13px] text-[var(--ink-1)] border border-[var(--border)] rounded-lg bg-white outline-none focus:border-[var(--gold)] appearance-none">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Settings() {
  const { settings, setSettings, isPro, plan, licenseChecking, refreshLicense } = useSettings();
  const { success, warning } = useToast();
  const [saved, setSaved] = useState(false);
  const [notifStatus, setNotifStatus] = useState<string>("default");
  const [aiCfg, setAiCfg] = useLocalStorage<AiCfg>("ecc-int-ai", DEFAULT_AI_CFG);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiStatus, setAiStatus] = useState<"idle" | "ok" | "err">("idle");
  const [aiErr, setAiErr] = useState("");
  const [tgCfg, setTgCfg] = useLocalStorage<TgCfg>("ecc-int-telegram", DEFAULT_TG_CFG);
  const [tgTesting, setTgTesting] = useState(false);
  const [tgStatus, setTgStatus] = useState<"idle" | "ok" | "err">("idle");
  const [tgErr, setTgErr] = useState("");
  const [metaCfg, setMetaCfg] = useLocalStorage<MetaCfg>("ecc-int-meta", DEFAULT_META_CFG);
  const [metaTesting, setMetaTesting] = useState(false);
  const [metaStatus, setMetaStatus] = useState<"idle" | "ok" | "err">("idle");
  const [metaErr, setMetaErr] = useState("");
  const [metaAccountName, setMetaAccountName] = useState("");
  const [shopifyCfg, setShopifyCfg] = useLocalStorage<ShopifyCfg>("ecc-int-shopify", DEFAULT_SHOPIFY_CFG);
  const [shopifyTesting, setShopifyTesting] = useState(false);
  const [shopifyStatus, setShopifyStatus] = useState<"idle" | "ok" | "err">("idle");
  const [shopifyErr, setShopifyErr] = useState("");
  const [shopifyName, setShopifyName] = useState("");

  useEffect(() => {
    setNotifStatus(getPermissionStatus());
  }, []);

  const handleTestAi = async () => {
    setAiTesting(true); setAiStatus("idle"); setAiErr("");
    const r = await testAiConnection(aiCfg);
    setAiTesting(false);
    if (r.ok) { setAiStatus("ok"); success("Anthropic conectado", "API key válida."); }
    else { setAiStatus("err"); setAiErr(r.error ?? "Error"); warning("Conexión fallida", r.error ?? ""); }
  };

  const handleTestShopify = async () => {
    setShopifyTesting(true); setShopifyStatus("idle"); setShopifyErr(""); setShopifyName("");
    const r = await testShopifyConnection(shopifyCfg);
    setShopifyTesting(false);
    if (r.ok) { setShopifyStatus("ok"); setShopifyName(r.shopName ?? ""); success("Shopify conectado", `Tienda: ${r.shopName}`); }
    else { setShopifyStatus("err"); setShopifyErr(r.error ?? "Error"); warning("Conexión fallida", r.error ?? ""); }
  };

  const handleTestMeta = async () => {
    setMetaTesting(true); setMetaStatus("idle"); setMetaErr(""); setMetaAccountName("");
    const r = await testMetaConnection(metaCfg);
    setMetaTesting(false);
    if (r.ok) { setMetaStatus("ok"); setMetaAccountName(r.accountName ?? ""); success("Meta conectado", `Cuenta: ${r.accountName ?? metaCfg.adAccountId}`); }
    else { setMetaStatus("err"); setMetaErr(r.error ?? "Error"); warning("Conexión fallida", r.error ?? ""); }
  };

  const handleTestTelegram = async () => {
    setTgTesting(true); setTgStatus("idle"); setTgErr("");
    const r = await testTelegram(tgCfg);
    setTgTesting(false);
    if (r.ok) { setTgStatus("ok"); success("Telegram conectado", "Mira tu chat — llegó el mensaje de prueba."); }
    else { setTgStatus("err"); setTgErr(r.error ?? "Error"); warning("Conexión fallida", r.error ?? ""); }
  };

  const handleVerifyLicense = async () => {
    await refreshLicense();
    success(isPro ? "Licencia válida" : "Licencia inválida", isPro ? "Pro activado." : "Revisa tu key.");
  };

  const set = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) =>
    setSettings(prev => ({ ...prev, [key]: val }));

  const setStr = (key: keyof AppSettings) => (v: string) => {
    const num = parseFloat(v);
    set(key, (isNaN(num) ? v : num) as AppSettings[typeof key]);
  };

  const handleSave = () => {
    setSaved(true);
    success("Configuración guardada", "Los nuevos benchmarks ya están activos en el Dashboard y la Calculadora.");
    setTimeout(() => setSaved(false), 2500);
  };

  const calcFromPriceCost = (price: number, cost: number) => {
    const margin = price > 0 ? Math.max(0, ((price - cost) / price) * 100) : 0;
    const beCpa  = price > cost ? +(price - cost).toFixed(2) : 0;
    const beRoas = margin > 0 ? +(100 / margin).toFixed(2) : 0;
    return { margin: +margin.toFixed(1), beCpa, beRoas };
  };

  const handlePrice = (v: string) => {
    const price = parseFloat(v) || 0;
    const { margin, beCpa, beRoas } = calcFromPriceCost(price, settings.productCost || 0);
    setSettings(prev => ({ ...prev, aov: price, margin, beCpa, beRoas }));
  };

  const handleCost = (v: string) => {
    const cost = parseFloat(v) || 0;
    const { margin, beCpa, beRoas } = calcFromPriceCost(settings.aov || 0, cost);
    setSettings(prev => ({ ...prev, productCost: cost, margin, beCpa, beRoas }));
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Configuración</div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Ajustes</h1>
        <p className="text-[13px] text-[var(--ink-3)] mt-1">Los cambios aquí se aplican en toda la app: Dashboard, Campañas y Calculadora.</p>
      </div>

      {/* Subscription */}
      <div className={`bg-white border rounded-xl shadow-sm overflow-hidden ${isPro ? "border-[var(--gold)] ring-2 ring-[rgba(200,169,106,0.15)]" : "border-[var(--border)]"}`}>
        <div className="flex items-center gap-2.5 p-4 border-b border-[var(--border)]">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isPro ? "bg-gradient-to-br from-[var(--gold)] to-[var(--gold-deep)] text-[var(--ink-1)]" : "bg-[var(--bg-inset)] text-[var(--ink-3)]"}`}>
            <Sparkles size={14} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">Suscripción</div>
              {isPro ? <ProBadge /> : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-[var(--bg-inset)] text-[var(--ink-4)]">Free</span>}
            </div>
            <div className="text-[11px] text-[var(--ink-4)]">{isPro ? "Plan Pro activo — todas las features desbloqueadas" : "Plan Free — algunas features están bloqueadas"}</div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {!isPro && (
            <div className="bg-[var(--gold-soft)] border border-[rgba(200,169,106,0.3)] rounded-xl p-4">
              <div className="text-[12px] font-semibold text-[var(--ink-1)] mb-1.5">Pro — €19/mes</div>
              <ul className="text-[12px] text-[var(--ink-2)] space-y-1 mb-3">
                <li>✓ Creative Studio IA (Claude)</li>
                <li>✓ Alertas Telegram en tiempo real</li>
                <li>✓ Sync automático de Meta Ads</li>
                <li>✓ Sync automático de Shopify</li>
              </ul>
              <a href="https://example-lemonsqueezy.com/buy/ecom-command-pro" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--ink-1)] text-white text-[12px] font-semibold hover:bg-black">
                Activar Pro <ExternalLink size={11} />
              </a>
            </div>
          )}
          <Field label="License key" hint="Pega aquí la key que recibes tras suscribirte">
            <div className="flex items-center gap-2">
              <Input value={settings.licenseKey} onChange={v => set("licenseKey", v)} prefix="K" />
            </div>
          </Field>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleVerifyLicense} disabled={licenseChecking || !settings.licenseKey}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white text-[12px] font-semibold hover:bg-black disabled:opacity-40">
              {licenseChecking ? <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Key size={11} />}
              Verificar
            </button>
            <button onClick={() => { clearLicenseCache(); set("licenseKey", ""); warning("Licencia eliminada", "Volverás a plan Free."); }}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--ink-3)] text-[12px] hover:bg-[var(--bg-inset)]">
              Eliminar
            </button>
            {isPro && (
              <a href="https://billing.stripe.com/p/login/ecom-command" target="_blank" rel="noreferrer"
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--ink-3)] text-[12px] hover:bg-[var(--bg-inset)]">
                Gestionar suscripción <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      </div>

      <Section title="Mi perfil" icon={<User size={14} />}>
        <Field label="Tu nombre" hint="Aparece en el sidebar y el onboarding">
          <Input value={settings.userName} onChange={v => set("userName", v)} />
        </Field>
        <Field label="Nombre de tienda" hint="Tu marca o nombre de negocio">
          <Input value={settings.storeName} onChange={v => set("storeName", v)} />
        </Field>
        <Field label="Email" hint="Solo para identificar tu cuenta localmente">
          <Input value={settings.userEmail} onChange={v => set("userEmail", v)} />
        </Field>
      </Section>

      <Section title="General" icon={<Globe size={14} />}>
        <Field label="Moneda" hint="Moneda para todas las métricas">
          <SelectField value={settings.currency} onChange={v => set("currency", v)} options={[
            { label: "EUR €", value: "EUR" },
            { label: "USD $", value: "USD" },
            { label: "MXN $", value: "MXN" },
          ]} />
        </Field>
        <Field label="País principal" hint="Mercado objetivo para cálculo de prime time">
          <SelectField value={settings.country} onChange={v => set("country", v)} options={[
            { label: "🇲🇽 México", value: "MX" },
            { label: "🇪🇸 España", value: "ES" },
            { label: "🇺🇸 EE.UU.", value: "US" },
          ]} />
        </Field>
        <Field label="Zona horaria">
          <SelectField value={settings.timezone} onChange={v => set("timezone", v)} options={[
            { label: "México (UTC−6)", value: "America/Mexico_City" },
            { label: "Madrid (UTC+1)", value: "Europe/Madrid" },
            { label: "New York (UTC−5)", value: "America/New_York" },
          ]} />
        </Field>
      </Section>

      <Section title="Producto activo" icon={<Settings2 size={14} />}>
        <Field label="Nombre del producto" hint="El que estás testeando actualmente">
          <Input value={settings.productName} onChange={v => set("productName", v)} />
        </Field>
        <Field label="Precio de venta" hint="Lo que paga el cliente (AOV)">
          <Input value={settings.aov || ""} onChange={handlePrice} suffix="€" />
        </Field>
        <Field label="Coste total" hint="Producto + envío + apps">
          <Input value={settings.productCost || ""} onChange={handleCost} suffix="€" />
        </Field>
        {/* Computed fields — read only */}
        {settings.aov > 0 && settings.productCost > 0 && (
          <div className="grid grid-cols-3 gap-2 p-3 bg-[var(--bg-inset)] rounded-xl border border-[var(--border)]">
            {[
              { label: "Margen",  value: settings.margin > 0 ? `${settings.margin.toFixed(1)}%` : "—" },
              { label: "BE CPA",  value: settings.beCpa > 0  ? `${settings.beCpa}€` : "—" },
              { label: "BE ROAS", value: settings.beRoas > 0 ? `${settings.beRoas}×` : "—" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-[9px] font-bold text-[var(--ink-4)] uppercase tracking-wider mb-0.5">{s.label}</div>
                <div className="font-mono font-bold text-[14px] text-[var(--ink-1)]">{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Benchmarks de decisión" icon={<Target size={14} />}>
        <Field label="Presupuesto mensual en ads" hint="Tu tope de gasto en Meta Ads por mes">
          <Input value={settings.monthlyAdsBudget || ""} onChange={setStr("monthlyAdsBudget")} suffix="€" />
        </Field>
        <Field label="CTR objetivo" hint="Por debajo → problema de creativo o audiencia">
          <Input value={settings.ctrTarget} onChange={setStr("ctrTarget")} suffix="%" />
        </Field>
        <Field label="CPC máximo" hint="Por encima → revisar hook, creativo o puja">
          <Input value={settings.cpcMax} onChange={setStr("cpcMax")} suffix="€" />
        </Field>
        <Field label="Hook rate objetivo" hint="% de personas que ven ≥3 segundos del vídeo">
          <Input value={settings.hookTarget} onChange={setStr("hookTarget")} suffix="%" />
        </Field>
      </Section>

      <Section title="Integraciones" icon={<Link size={14} />}>
        {/* Anthropic API key — for Creative Studio */}
        <div className={`rounded-xl border p-4 ${isPro ? "border-[var(--gold)] bg-[var(--gold-soft)]" : "border-[var(--border)] bg-[var(--bg-inset)] opacity-60"}`}>
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-[var(--gold-deep)]" />
              <span className="text-[12px] font-semibold text-[var(--ink-1)]">Anthropic Claude</span>
              <ProBadge />
            </div>
            {aiStatus === "ok" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success)]">Conectado</span>}
            {aiStatus === "err" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">Error</span>}
          </div>
          <div className="text-[11px] text-[var(--ink-3)] mb-3">
            Tu propia API key de Claude para generar hooks, scripts UGC y ad copy. Crea una en <a className="underline" href="https://console.anthropic.com/" target="_blank" rel="noreferrer">console.anthropic.com</a> · ~€0.003/generación.
          </div>
          <Field label="API key" hint="sk-ant-...">
            <Input value={aiCfg.apiKey} onChange={v => setAiCfg(p => ({ ...p, apiKey: v }))} prefix="K" />
          </Field>
          <Field label="Modelo" hint="Haiku 4.5 es rápido y barato (recomendado)">
            <select value={aiCfg.model} onChange={e => setAiCfg(p => ({ ...p, model: e.target.value }))}
              className="h-8 px-2.5 pr-7 text-[13px] text-[var(--ink-1)] border border-[var(--border)] rounded-lg bg-white outline-none focus:border-[var(--gold)] appearance-none">
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (rápido · barato)</option>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (mejor calidad)</option>
              <option value="claude-opus-4-7">Claude Opus 4.7 (máxima calidad)</option>
            </select>
          </Field>
          <div className="flex gap-2 flex-wrap pt-1">
            <button onClick={handleTestAi} disabled={aiTesting || !aiCfg.apiKey || !isPro}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white text-[12px] font-semibold hover:bg-black disabled:opacity-40">
              {aiTesting ? <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Zap size={11} />}
              Test connection
            </button>
            {aiCfg.apiKey && (
              <button onClick={() => { setAiCfg(DEFAULT_AI_CFG); setAiStatus("idle"); warning("API key eliminada", ""); }}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--ink-3)] text-[12px] hover:bg-[var(--bg-inset)]">
                Eliminar
              </button>
            )}
          </div>
          {aiErr && <div className="mt-2 text-[11px] text-[var(--danger)]">{aiErr}</div>}
        </div>

        {/* Telegram alerts */}
        <div className={`rounded-xl border p-4 ${isPro ? "border-[var(--gold)] bg-[var(--gold-soft)]" : "border-[var(--border)] bg-[var(--bg-inset)] opacity-60"}`}>
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <MessageCircle size={13} className="text-[var(--gold-deep)]" />
              <span className="text-[12px] font-semibold text-[var(--ink-1)]">Alertas Telegram</span>
              <ProBadge />
            </div>
            {tgStatus === "ok" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success)]">Conectado</span>}
            {tgStatus === "err" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">Error</span>}
          </div>
          <div className="text-[11px] text-[var(--ink-3)] mb-3 space-y-1">
            <div>Recibe alertas de ROAS, scale gates y resumen diario directo en Telegram. Sin abrir la app.</div>
            <div className="bg-white border border-[var(--border)] rounded-lg p-2 space-y-0.5 font-mono text-[10px] text-[var(--ink-3)]">
              <div>1. Habla con <span className="text-[var(--ink-1)] font-semibold">@BotFather</span> → /newbot → copia el token</div>
              <div>2. Habla con <span className="text-[var(--ink-1)] font-semibold">@userinfobot</span> → copia tu Chat ID</div>
              <div>3. Pega ambos aquí y pulsa <span className="text-[var(--ink-1)] font-semibold">Enviar prueba</span></div>
            </div>
          </div>
          <div className="space-y-2 mb-3">
            <Field label="Bot token" hint="123456789:AAFxxx...">
              <Input value={tgCfg.botToken} onChange={v => setTgCfg(p => ({ ...p, botToken: v }))} prefix="🤖" />
            </Field>
            <Field label="Chat ID" hint="Tu ID numérico de usuario">
              <Input value={tgCfg.chatId} onChange={v => setTgCfg(p => ({ ...p, chatId: v }))} prefix="#" />
            </Field>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleTestTelegram} disabled={tgTesting || !tgCfg.botToken || !tgCfg.chatId || !isPro}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white text-[12px] font-semibold hover:bg-black disabled:opacity-40">
              {tgTesting ? <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Send size={11} />}
              Enviar prueba
            </button>
            {(tgCfg.botToken || tgCfg.chatId) && (
              <button onClick={() => { setTgCfg(DEFAULT_TG_CFG); setTgStatus("idle"); warning("Telegram desconectado", ""); }}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--ink-3)] text-[12px] hover:bg-[var(--bg-inset)]">
                Eliminar
              </button>
            )}
          </div>
          {tgErr && <div className="mt-2 text-[11px] text-[var(--danger)]">{tgErr}</div>}
        </div>

        {/* Meta Ads sync */}
        <div className={`rounded-xl border p-4 ${isPro ? "border-[var(--gold)] bg-[var(--gold-soft)]" : "border-[var(--border)] bg-[var(--bg-inset)] opacity-60"}`}>
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <BarChart2 size={13} className="text-[var(--gold-deep)]" />
              <span className="text-[12px] font-semibold text-[var(--ink-1)]">Meta Ads</span>
              <ProBadge />
            </div>
            {metaStatus === "ok" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success)]">{metaAccountName || "Conectado"}</span>}
            {metaStatus === "err" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">Error</span>}
          </div>
          <div className="text-[11px] text-[var(--ink-3)] mb-3 space-y-1">
            <div>Sincroniza automáticamente las métricas de hoy (gasto, ingresos, clics, compras) desde tu cuenta de Meta Ads.</div>
            <div className="bg-white border border-[var(--border)] rounded-lg p-2 space-y-0.5 font-mono text-[10px] text-[var(--ink-3)]">
              <div>1. En Meta Business Suite → Configuración → <span className="text-[var(--ink-1)] font-semibold">Usuarios del sistema</span></div>
              <div>2. Crea un usuario de sistema con permisos <span className="text-[var(--ink-1)] font-semibold">ads_read</span></div>
              <div>3. Genera un token y cópialo aquí junto a tu Ad Account ID</div>
            </div>
          </div>
          <div className="space-y-2 mb-3">
            <Field label="Access token" hint="Token de usuario de sistema (60d de duración)">
              <Input value={metaCfg.accessToken} onChange={v => setMetaCfg(p => ({ ...p, accessToken: v }))} prefix="T" />
            </Field>
            <Field label="Ad Account ID" hint="act_XXXXXXXXXX (sin el act_ también vale)">
              <Input value={metaCfg.adAccountId} onChange={v => setMetaCfg(p => ({ ...p, adAccountId: v }))} prefix="@" />
            </Field>
          </div>
          {metaCfg.lastSync && (
            <div className="text-[10px] text-[var(--ink-4)] mb-2">
              Último sync: {new Date(metaCfg.lastSync).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleTestMeta} disabled={metaTesting || !metaCfg.accessToken || !metaCfg.adAccountId || !isPro}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white text-[12px] font-semibold hover:bg-black disabled:opacity-40">
              {metaTesting ? <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Zap size={11} />}
              Test connection
            </button>
            {(metaCfg.accessToken || metaCfg.adAccountId) && (
              <button onClick={() => { setMetaCfg(DEFAULT_META_CFG); setMetaStatus("idle"); warning("Meta desconectado", ""); }}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--ink-3)] text-[12px] hover:bg-[var(--bg-inset)]">
                Eliminar
              </button>
            )}
          </div>
          {metaErr && <div className="mt-2 text-[11px] text-[var(--danger)]">{metaErr}</div>}
        </div>

        {/* Shopify sync */}
        <div className={`rounded-xl border p-4 ${isPro ? "border-[var(--gold)] bg-[var(--gold-soft)]" : "border-[var(--border)] bg-[var(--bg-inset)] opacity-60"}`}>
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ShoppingBag size={13} className="text-[var(--gold-deep)]" />
              <span className="text-[12px] font-semibold text-[var(--ink-1)]">Shopify</span>
              <ProBadge />
            </div>
            {shopifyStatus === "ok" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success)]">{shopifyName || "Conectado"}</span>}
            {shopifyStatus === "err" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">Error</span>}
          </div>
          <div className="text-[11px] text-[var(--ink-3)] mb-3 space-y-1">
            <div>Importa pedidos de hoy automáticamente desde tu tienda Shopify.</div>
            <div className="bg-white border border-[var(--border)] rounded-lg p-2 space-y-0.5 font-mono text-[10px] text-[var(--ink-3)]">
              <div>1. Admin Shopify → Configuración → <span className="text-[var(--ink-1)] font-semibold">Apps y canales de venta</span> → Desarrollar apps</div>
              <div>2. Crear app → configurar permisos: <span className="text-[var(--ink-1)] font-semibold">read_orders, read_products</span></div>
              <div>3. Instalar app → copiar el <span className="text-[var(--ink-1)] font-semibold">token de API de administración</span></div>
            </div>
            <div className="text-[10px] text-[var(--warning)]">⚠ Requiere desplegar el Worker de proxy (ver workers/shopify/README.md)</div>
          </div>
          <div className="space-y-2 mb-3">
            <Field label="Dominio de tienda" hint="tu-tienda.myshopify.com">
              <Input value={shopifyCfg.shopDomain} onChange={v => setShopifyCfg(p => ({ ...p, shopDomain: v }))} prefix="🛍" />
            </Field>
            <Field label="Admin token" hint="shpat_xxxxxxxxxxxxxxxxxxxxxxxx">
              <Input value={shopifyCfg.adminToken} onChange={v => setShopifyCfg(p => ({ ...p, adminToken: v }))} prefix="T" />
            </Field>
          </div>
          {shopifyCfg.lastSync && (
            <div className="text-[10px] text-[var(--ink-4)] mb-2">
              Último sync: {new Date(shopifyCfg.lastSync).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleTestShopify} disabled={shopifyTesting || !shopifyCfg.shopDomain || !shopifyCfg.adminToken || !isPro}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white text-[12px] font-semibold hover:bg-black disabled:opacity-40">
              {shopifyTesting ? <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Zap size={11} />}
              Test connection
            </button>
            {(shopifyCfg.shopDomain || shopifyCfg.adminToken) && (
              <button onClick={() => { setShopifyCfg(DEFAULT_SHOPIFY_CFG); setShopifyStatus("idle"); warning("Shopify desconectado", ""); }}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--ink-3)] text-[12px] hover:bg-[var(--bg-inset)]">
                Eliminar
              </button>
            )}
          </div>
          {shopifyErr && <div className="mt-2 text-[11px] text-[var(--danger)]">{shopifyErr}</div>}
        </div>

        <Field label="Meta Pixel ID" hint="ID del pixel configurado en Meta Business Suite">
          <Input value={settings.pixelId} onChange={v => set("pixelId", v)} prefix="ID" />
        </Field>
        <Field label="Shopify URL" hint="URL de tu tienda Shopify">
          <Input value={settings.shopifyUrl} onChange={v => set("shopifyUrl", v)} />
        </Field>
      </Section>

      <Section title="Notificaciones" icon={<Zap size={14} />}>
        <Field label="Alertas del navegador" hint="Recibe notificaciones push en este dispositivo">
          <button
            onClick={async () => {
              const granted = await requestPermission();
              setNotifStatus(granted ? "granted" : "denied");
              if (granted) success("Notificaciones activadas", "Recibirás alertas cuando el ROAS caiga.");
              else success("Permiso denegado", "Actívalo desde la configuración del navegador.");
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
              notifStatus === "granted"
                ? "bg-[var(--success-soft)] text-[var(--success)] border-[rgba(34,197,94,0.3)]"
                : notifStatus === "denied"
                ? "bg-[var(--danger-soft)] text-[var(--danger)] border-[rgba(239,68,68,0.3)]"
                : "bg-[var(--ink-1)] text-white border-transparent hover:bg-black"
            }`}
          >
            <Bell size={12} />
            {notifStatus === "granted" ? "Activadas ✓" : notifStatus === "denied" ? "Bloqueadas" : "Activar alertas"}
          </button>
        </Field>
        {([
          { key: "notifyKill"      as const, label: "Alertas de kill rules",       hint: "Notificar cuando una campaña cumple criterio de pausa" },
          { key: "notifyScale"     as const, label: "Alertas de scale",             hint: "Notificar cuando una campaña supera ROAS ×1.2" },
          { key: "notifyPrimeTime" as const, label: "Recordatorio prime time",      hint: "Recordar revisar métricas antes del prime time del mercado" },
          { key: "autoReport"     as const,  label: "Reporte diario automático",    hint: "Generar reporte de día a las 23:59 hora local" },
        ]).map(n => (
          <Field key={n.key} label={n.label} hint={n.hint}>
            <Toggle value={settings[n.key] as boolean} onChange={v => set(n.key, v)} />
          </Field>
        ))}
      </Section>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={handleSave}
          className="px-5 py-2.5 rounded-lg bg-[var(--ink-1)] text-white text-[13px] font-medium hover:bg-black transition-colors flex items-center gap-2">
          {saved ? <CheckCircle size={13} /> : <Settings2 size={13} />}
          {saved ? "Guardado y aplicado" : "Guardar cambios"}
        </button>
        <button onClick={() => { setSettings(DEFAULT_SETTINGS); success("Ajustes restablecidos", "Valores por defecto restaurados."); }}
          className="px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--ink-3)] text-[13px] hover:bg-[var(--bg-inset)] transition-colors">
          Restablecer ajustes
        </button>
        {saved && <span className="text-[12px] text-[var(--success)] flex items-center gap-1.5"><CheckCircle size={12} /> Dashboard y Calculadora actualizados</span>}
      </div>

      {/* Datos — Export/Import */}
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 p-4 border-b border-[var(--border)]">
          <div className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center text-[var(--ink-3)]">
            <Download size={14} />
          </div>
          <div className="text-[13px] font-semibold text-[var(--ink-1)]">Datos · Backup y restauración</div>
        </div>
        <div className="p-4 space-y-4">
          <div className="text-[12px] text-[var(--ink-3)] leading-relaxed">
            Exporta todos tus datos (métricas, campañas, productos, gastos) como JSON para guardar un backup o moverlos a otro dispositivo.
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { exportBackup(); success("Backup exportado", "Archivo JSON descargado."); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--ink-1)] text-white text-[12px] font-semibold hover:bg-black transition-colors"
            >
              <Download size={13} /> Exportar backup (JSON)
            </button>
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink-2)] text-[12px] font-semibold hover:bg-[var(--bg-inset)] cursor-pointer transition-colors">
              <Upload size={13} /> Importar backup
              <input type="file" accept=".json" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  const result = importBackup(ev.target?.result as string);
                  if (result.error) {
                    success("Error", result.error);
                  } else {
                    success("Backup importado", `${result.imported} claves restauradas. Recarga la página.`);
                    setTimeout(() => window.location.reload(), 1500);
                  }
                };
                reader.readAsText(file);
                e.target.value = "";
              }} />
            </label>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-[var(--danger-soft)] border border-[rgba(239,68,68,0.2)] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2.5 p-4 border-b border-[rgba(239,68,68,0.15)]">
          <div className="w-7 h-7 rounded-lg bg-[var(--danger)] flex items-center justify-center text-white">
            <AlertTriangle size={14} />
          </div>
          <div className="text-[13px] font-semibold text-[var(--danger)]">Zona peligrosa</div>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-[12px] text-[var(--ink-3)] leading-relaxed">
            Estas acciones borran datos permanentemente y no se pueden deshacer. Úsalas solo si quieres empezar de cero o eliminar datos de prueba.
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              if (!confirm("¿Borrar TODOS los datos de la app (productos, campañas, creativos, pedidos, métricas, autopsias, planner...)? El onboarding y los ajustes se mantienen.")) return;
              const keysToKeep = ["ecc-settings", "ecc-section", "ecc-dark"];
              const allKeys = Object.keys(localStorage).filter(k => k.startsWith("ecc-") && !keysToKeep.includes(k));
              allKeys.forEach(k => localStorage.removeItem(k));
              success("Datos borrados", `${allKeys.length} claves eliminadas. Recarga la página.`);
              setTimeout(() => window.location.reload(), 1000);
            }} className="px-4 py-2.5 rounded-lg bg-white border border-[rgba(239,68,68,0.3)] text-[var(--danger)] text-[12px] font-semibold hover:bg-[var(--danger-soft)] flex items-center gap-2">
              <Trash2 size={13} /> Borrar todos los datos de la app
            </button>
            <button onClick={() => {
              if (!confirm("¿Reset completo? Esto borra TODO incluyendo onboarding y ajustes. La app volverá a la pantalla inicial.")) return;
              Object.keys(localStorage).filter(k => k.startsWith("ecc-")).forEach(k => localStorage.removeItem(k));
              setTimeout(() => window.location.reload(), 500);
            }} className="px-4 py-2.5 rounded-lg bg-[var(--danger)] text-white text-[12px] font-semibold hover:opacity-90 flex items-center gap-2">
              <Trash2 size={13} /> Reset completo (incluye onboarding)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
