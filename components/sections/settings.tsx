"use client";
import { useState } from "react";
import { eur } from "@/lib/utils";
import { CheckCircle, Settings2, Globe, Target, Zap, Link } from "lucide-react";

type SettingsState = {
  currency: string;
  country: string;
  timezone: string;
  aov: string;
  margin: string;
  beCpa: string;
  beRoas: string;
  ctrTarget: string;
  cpcMax: string;
  hookTarget: string;
  pixelId: string;
  shopifyUrl: string;
  notifyKill: boolean;
  notifyScale: boolean;
  notifyPrimeTime: boolean;
  autoReport: boolean;
};

const DEFAULT: SettingsState = {
  currency: "EUR",
  country: "MX",
  timezone: "America/Mexico_City",
  aov: "39",
  margin: "22.5",
  beCpa: "17",
  beRoas: "2.3",
  ctrTarget: "2",
  cpcMax: "0.6",
  hookTarget: "35",
  pixelId: "4827391048",
  shopifyUrl: "reviari.myshopify.com",
  notifyKill: true,
  notifyScale: true,
  notifyPrimeTime: true,
  autoReport: false,
};

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

function Input({ value, onChange, prefix, suffix }: { value: string; onChange: (v: string) => void; prefix?: string; suffix?: string }) {
  return (
    <div className="flex items-center h-8 border border-[var(--border)] rounded-lg overflow-hidden bg-white focus-within:border-[var(--gold)] focus-within:ring-2 focus-within:ring-[rgba(200,169,106,0.15)] transition-all">
      {prefix && <span className="px-2 text-[11px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-r border-[var(--border)] h-full flex items-center">{prefix}</span>}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 px-2.5 text-[13px] text-[var(--ink-1)] outline-none bg-transparent min-w-[80px]"
      />
      {suffix && <span className="px-2 text-[11px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-l border-[var(--border)] h-full flex items-center">{suffix}</span>}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-[var(--ink-1)]" : "bg-[var(--bg-inset)] border border-[var(--border)]"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-8 px-2.5 pr-7 text-[13px] text-[var(--ink-1)] border border-[var(--border)] rounded-lg bg-white outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[rgba(200,169,106,0.15)] transition-all appearance-none"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Settings() {
  const [s, setS] = useState<SettingsState>(DEFAULT);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof SettingsState>(key: K, val: SettingsState[K]) =>
    setS(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const beRoasCalc = s.aov && s.margin ? (100 / parseFloat(s.margin)).toFixed(2) : "—";

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Configuración · REVIARI</div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Ajustes</h1>
        <p className="text-[13px] text-[var(--ink-3)] mt-1">Parámetros de cuenta, benchmarks y preferencias de notificación.</p>
      </div>

      <Section title="General" icon={<Globe size={14} />}>
        <Field label="Moneda" hint="Moneda para todas las métricas">
          <Select value={s.currency} onChange={v => set("currency", v)} options={[
            { label: "EUR €", value: "EUR" },
            { label: "USD $", value: "USD" },
            { label: "MXN $", value: "MXN" },
          ]} />
        </Field>
        <Field label="País principal" hint="Mercado objetivo para cálculo de prime time">
          <Select value={s.country} onChange={v => set("country", v)} options={[
            { label: "🇲🇽 México", value: "MX" },
            { label: "🇪🇸 España", value: "ES" },
            { label: "🇺🇸 EE.UU.", value: "US" },
          ]} />
        </Field>
        <Field label="Zona horaria">
          <Select value={s.timezone} onChange={v => set("timezone", v)} options={[
            { label: "México (UTC−6)", value: "America/Mexico_City" },
            { label: "Madrid (UTC+1)", value: "Europe/Madrid" },
            { label: "New York (UTC−5)", value: "America/New_York" },
          ]} />
        </Field>
      </Section>

      <Section title="Producto activo" icon={<Settings2 size={14} />}>
        <Field label="AOV (ticket medio)" hint="Precio de venta promedio en el mercado objetivo">
          <Input value={s.aov} onChange={v => set("aov", v)} suffix="€" />
        </Field>
        <Field label="Margen neto" hint="Margen tras COGS, envío y apps (sin ads)">
          <Input value={s.margin} onChange={v => set("margin", v)} suffix="%" />
        </Field>
        <Field label="BE CPA manual" hint="Coste por adquisición máximo para ser rentable">
          <Input value={s.beCpa} onChange={v => set("beCpa", v)} suffix="€" />
        </Field>
        <Field label="BE ROAS manual" hint={`Calculado: ${beRoasCalc}× basado en margen`}>
          <Input value={s.beRoas} onChange={v => set("beRoas", v)} suffix="×" />
        </Field>
      </Section>

      <Section title="Benchmarks de decisión" icon={<Target size={14} />}>
        <Field label="CTR objetivo" hint="Por debajo → problema de creativo o audiencia">
          <Input value={s.ctrTarget} onChange={v => set("ctrTarget", v)} suffix="%" />
        </Field>
        <Field label="CPC máximo" hint="Por encima → revisar hook, creativo o puja">
          <Input value={s.cpcMax} onChange={v => set("cpcMax", v)} suffix="€" />
        </Field>
        <Field label="Hook rate objetivo" hint="% de personas que ven ≥3 segundos del vídeo">
          <Input value={s.hookTarget} onChange={v => set("hookTarget", v)} suffix="%" />
        </Field>
      </Section>

      <Section title="Integraciones" icon={<Link size={14} />}>
        <Field label="Meta Pixel ID" hint="ID del pixel configurado en Meta Business Suite">
          <Input value={s.pixelId} onChange={v => set("pixelId", v)} prefix="ID" />
        </Field>
        <Field label="Shopify URL" hint="URL de tu tienda Shopify">
          <Input value={s.shopifyUrl} onChange={v => set("shopifyUrl", v)} />
        </Field>
      </Section>

      <Section title="Notificaciones" icon={<Zap size={14} />}>
        {[
          { key: "notifyKill"      as const, label: "Alertas de kill rules", hint: "Notificar cuando una campaña cumple criterio de pausa" },
          { key: "notifyScale"     as const, label: "Alertas de scale",      hint: "Notificar cuando una campaña supera ROAS ×1.2" },
          { key: "notifyPrimeTime" as const, label: "Recordatorio prime time", hint: "Recordar revisar métricas antes del prime time del mercado" },
          { key: "autoReport"     as const, label: "Reporte diario automático", hint: "Generar reporte de día a las 23:59 hora local" },
        ].map(n => (
          <Field key={n.key} label={n.label} hint={n.hint}>
            <Toggle value={s[n.key] as boolean} onChange={v => set(n.key, v)} />
          </Field>
        ))}
      </Section>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-lg bg-[var(--ink-1)] text-white text-[13px] font-medium hover:bg-black transition-colors flex items-center gap-2"
        >
          {saved ? <CheckCircle size={13} /> : <Settings2 size={13} />}
          {saved ? "Guardado" : "Guardar cambios"}
        </button>
        <button
          onClick={() => setS(DEFAULT)}
          className="px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--ink-3)] text-[13px] hover:bg-[var(--bg-inset)] transition-colors"
        >
          Restablecer
        </button>
        {saved && (
          <span className="text-[12px] text-[var(--success)] flex items-center gap-1.5">
            <CheckCircle size={12} /> Configuración aplicada correctamente
          </span>
        )}
      </div>
    </div>
  );
}
