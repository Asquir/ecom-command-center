"use client";
import { useState } from "react";
import { eur } from "@/lib/utils";
import { useSettings, DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings-context";
import { useToast } from "@/components/ui/toast";
import { CheckCircle, Settings2, Globe, Target, Zap, Link, Trash2, AlertTriangle } from "lucide-react";

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
  const { settings, setSettings } = useSettings();
  const { success } = useToast();
  const [saved, setSaved] = useState(false);

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

  const beRoasCalc = settings.aov && settings.margin ? (100 / settings.margin).toFixed(2) : "—";

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Configuración · REVIARI</div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Ajustes</h1>
        <p className="text-[13px] text-[var(--ink-3)] mt-1">Los cambios aquí se aplican en toda la app: Dashboard, Campañas y Calculadora.</p>
      </div>

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
        <Field label="AOV (ticket medio)" hint="Precio de venta promedio">
          <Input value={settings.aov} onChange={setStr("aov")} suffix="€" />
        </Field>
        <Field label="Margen neto" hint="Margen tras COGS, envío y apps (sin ads)">
          <Input value={settings.margin} onChange={setStr("margin")} suffix="%" />
        </Field>
        <Field label="BE CPA" hint="Coste por adquisición máximo para ser rentable">
          <Input value={settings.beCpa} onChange={setStr("beCpa")} suffix="€" />
        </Field>
        <Field label="BE ROAS" hint={`Calculado: ${beRoasCalc}× basado en margen`}>
          <Input value={settings.beRoas} onChange={setStr("beRoas")} suffix="×" />
        </Field>
      </Section>

      <Section title="Benchmarks de decisión" icon={<Target size={14} />}>
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
        <Field label="Meta Pixel ID" hint="ID del pixel configurado en Meta Business Suite">
          <Input value={settings.pixelId} onChange={v => set("pixelId", v)} prefix="ID" />
        </Field>
        <Field label="Shopify URL" hint="URL de tu tienda Shopify">
          <Input value={settings.shopifyUrl} onChange={v => set("shopifyUrl", v)} />
        </Field>
      </Section>

      <Section title="Notificaciones" icon={<Zap size={14} />}>
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
