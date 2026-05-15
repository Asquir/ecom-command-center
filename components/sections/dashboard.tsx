"use client";
import { useState, useEffect } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { useToast } from "@/components/ui/toast";
import { DecisionBadge } from "@/components/ui/badge";
import { downloadCSV } from "@/lib/export";
import { eur, pct } from "@/lib/utils";
import { Zap, AlertTriangle, CheckCircle, Clock, Edit3, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

interface DailyMetrics {
  spend: number;
  revenue: number;
  clicks: number;
  impressions: number;
  atc: number;
  checkouts: number;
  purchases: number;
}

type DailyRecord = Record<string, DailyMetrics>;

type DecisionKind = "scale" | "watch" | "kill" | "data" | "paused";

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function usePrimeTimeCountdown(country: string) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tz = country === "ES" ? "Europe/Madrid" : country === "US" ? "America/New_York" : "America/Mexico_City";
    const primeHour = 20;
    const update = () => {
      const now = new Date();
      const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
      const h = local.getHours(), m = local.getMinutes();
      const isPrime = h >= primeHour && h < 23;
      if (isPrime) { setLabel("¡Prime time activo ahora!"); return; }
      const mins = h < primeHour ? (primeHour - h) * 60 - m : (primeHour + 24 - h) * 60 - m;
      setLabel(`Prime time en ${Math.floor(mins / 60)}h ${mins % 60}m`);
    };
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [country]);
  return label;
}

function getDecision(spend: number, revenue: number, cpa: number, roas: number, ctr: number, beCpa: number, beRoas: number): { kind: DecisionKind; headline: string; detail: string } {
  if (spend === 0) return { kind: "data", headline: "Registra tus métricas para ver la recomendación.", detail: "Introduce los datos de hoy desde Meta Ads Manager." };
  if (roas >= beRoas * 1.2) return {
    kind: "scale",
    headline: `ROAS ${roas.toFixed(2)}× — Escalar +25% el presupuesto.`,
    detail: `Tu ROAS supera BE×1.2 (${(beRoas * 1.2).toFixed(2)}×). Sube el presupuesto sin tocar audiencias ni creativos.`,
  };
  if (cpa > 0 && cpa <= beCpa) return {
    kind: "scale",
    headline: `CPA ${eur(cpa)} dentro del break-even. Mantener activo.`,
    detail: `Coste por compra por debajo de BE CPA (${eur(beCpa)}). El producto es rentable — no toques nada.`,
  };
  if (spend >= beCpa * 3 && cpa === 0) return {
    kind: "kill",
    headline: `Gasto ${eur(spend)} sin compras. Considera pausar.`,
    detail: `Has gastado 3× tu BE CPA sin conseguir ninguna venta. Revisa el creativo, la página de producto o el público.`,
  };
  if (cpa > beCpa * 1.5 && revenue > 0) return {
    kind: "kill",
    headline: `CPA ${eur(cpa)} supera 1.5× BE. Pausar o corregir.`,
    detail: `El coste por compra es demasiado alto. Revisa el hook del anuncio, la landing y el precio.`,
  };
  if (ctr > 0 && ctr < 1 && spend > 5) return {
    kind: "watch",
    headline: `CTR ${pct(ctr)} muy bajo. Probar otro hook.`,
    detail: `CTR bajo indica que el anuncio no llama la atención. Crea 2-3 variaciones con distintos hooks.`,
  };
  return {
    kind: "watch",
    headline: "Acumulando datos. No toques nada todavía.",
    detail: `Con ${eur(spend)} gastados, espera a tener al menos 50 clics o 1 compra antes de tomar una decisión.`,
  };
}

function NumInput({ label, hint, value, onChange, prefix, suffix }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; prefix?: string; suffix?: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-[var(--ink-3)] mb-1">{label}
        {hint && <span className="font-normal text-[var(--ink-5)] ml-1">· {hint}</span>}
      </div>
      <div className="flex items-center h-9 border border-[var(--border)] rounded-lg overflow-hidden bg-white focus-within:border-[var(--gold)] focus-within:ring-2 focus-within:ring-[rgba(200,169,106,0.15)] transition-all">
        {prefix && <span className="px-2 text-[11px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-r border-[var(--border)] h-full flex items-center">{prefix}</span>}
        <input value={value} onChange={e => onChange(e.target.value)} type="number" min="0" step="0.01"
          className="flex-1 px-2.5 text-[13px] text-[var(--ink-1)] outline-none bg-transparent font-mono" />
        {suffix && <span className="px-2 text-[11px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-l border-[var(--border)] h-full flex items-center">{suffix}</span>}
      </div>
    </div>
  );
}

function MetricsForm({ initial, onSave }: { initial?: DailyMetrics; onSave: (m: DailyMetrics) => void }) {
  const [spend, setSpend] = useState(initial ? String(initial.spend) : "");
  const [revenue, setRevenue] = useState(initial ? String(initial.revenue) : "");
  const [clicks, setClicks] = useState(initial ? String(initial.clicks) : "");
  const [impressions, setImpressions] = useState(initial ? String(initial.impressions) : "");
  const [atc, setAtc] = useState(initial ? String(initial.atc) : "");
  const [checkouts, setCheckouts] = useState(initial ? String(initial.checkouts) : "");
  const [purchases, setPurchases] = useState(initial ? String(initial.purchases) : "");

  const n = (v: string) => parseFloat(v) || 0;
  const ready = n(spend) > 0;

  const save = () => {
    if (!ready) return;
    onSave({ spend: n(spend), revenue: n(revenue), clicks: n(clicks), impressions: n(impressions), atc: n(atc), checkouts: n(checkouts), purchases: n(purchases) });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Dashboard · Métricas de hoy</div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">¿Qué pasó hoy?</h1>
        <p className="text-[13px] text-[var(--ink-3)] mt-1">Introduce los datos de Meta Ads Manager para ver el análisis y la recomendación.</p>
      </div>

      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-5">
        <div className="text-[12px] font-semibold text-[var(--ink-3)] uppercase tracking-wider">Inversión e ingresos</div>
        <div className="grid grid-cols-2 gap-4">
          <NumInput label="Gasto en ads" hint="Total Meta Ads hoy" value={spend} onChange={setSpend} suffix="€" />
          <NumInput label="Ingresos" hint="Ventas atribuidas" value={revenue} onChange={setRevenue} suffix="€" />
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <div className="text-[12px] font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-4">Tráfico</div>
          <div className="grid grid-cols-2 gap-4">
            <NumInput label="Impresiones" value={impressions} onChange={setImpressions} />
            <NumInput label="Clics al link" value={clicks} onChange={setClicks} />
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <div className="text-[12px] font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-4">Funnel de conversión</div>
          <div className="grid grid-cols-3 gap-4">
            <NumInput label="Add to Cart" hint="ATC" value={atc} onChange={setAtc} />
            <NumInput label="Inicio pago" hint="Checkouts" value={checkouts} onChange={setCheckouts} />
            <NumInput label="Compras" hint="Pedidos" value={purchases} onChange={setPurchases} />
          </div>
        </div>

        <button onClick={save} disabled={!ready}
          className="w-full py-3 rounded-xl bg-[var(--ink-1)] text-white font-semibold text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
          <BarChart2 size={16} /> Ver análisis del día
        </button>
      </div>
    </div>
  );
}

function FunnelBar({ label, value, max, prev, conv, target, status }: {
  label: string; value: number; max: number; prev: number | null; conv: number | null; target: number | null; status: "good" | "warn" | "bad" | "normal";
}) {
  const colors = { good: "bg-[var(--success)]", warn: "bg-[var(--warning)]", bad: "bg-[var(--danger)]", normal: "bg-[var(--ink-2)]" };
  const dotColors = { good: "bg-[var(--success)]", warn: "bg-[var(--warning)]", bad: "bg-[var(--danger)]", normal: "bg-[var(--ink-4)]" };
  return (
    <div className="grid gap-2 items-center" style={{ gridTemplateColumns: "110px 1fr 50px 60px" }}>
      <div className="text-[12px] text-[var(--ink-2)] font-medium flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[status]}`} />
        {label}
      </div>
      <div className="h-5 bg-[var(--bg-inset)] rounded overflow-hidden">
        <div className={`h-full rounded transition-all ${colors[status]}`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, opacity: status === "normal" ? 0.7 : 1 }} />
      </div>
      <div className="font-mono text-[13px] font-semibold text-right text-[var(--ink-1)]">{value.toLocaleString()}</div>
      <div className={`font-mono text-[11px] text-right ${status === "bad" ? "text-[var(--danger)]" : status === "warn" ? "text-[var(--warning)]" : status === "good" ? "text-[var(--success)]" : "text-[var(--ink-4)]"}`}>
        {conv != null ? `${conv.toFixed(1)}%` : "—"}
        {target != null && <span className="text-[var(--ink-5)]"> /{target}%</span>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { settings } = useSettings();
  const { success, info } = useToast();
  const today = todayKey();
  const [allMetrics, setAllMetrics] = useLocalStorage<DailyRecord>("ecc-daily-metrics", {});
  const [editing, setEditing] = useState(false);
  const primeTime = usePrimeTimeCountdown(settings.country);
  const todayLabel = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const todayData = allMetrics[today] ?? null;

  const saveMetrics = (m: DailyMetrics) => {
    setAllMetrics(prev => ({ ...prev, [today]: m }));
    setEditing(false);
  };

  if (!todayData || editing) {
    return (
      <div>
        <MetricsForm initial={todayData ?? undefined} onSave={saveMetrics} />
      </div>
    );
  }

  const m = todayData;
  const roas = m.spend > 0 ? m.revenue / m.spend : 0;
  const cpa = m.purchases > 0 ? m.spend / m.purchases : 0;
  const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
  const cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
  const cpm = m.impressions > 0 ? (m.spend / m.impressions) * 1000 : 0;
  const profit = m.revenue * (settings.margin / 100) - m.spend;
  const atcRate = m.clicks > 0 ? (m.atc / m.clicks) * 100 : 0;
  const checkoutRate = m.atc > 0 ? (m.checkouts / m.atc) * 100 : 0;
  const purchaseRate = m.checkouts > 0 ? (m.purchases / m.checkouts) * 100 : 0;

  const rec = getDecision(m.spend, m.revenue, cpa, roas, ctr, settings.beCpa, settings.beRoas);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = d.toISOString().split("T")[0];
    const day = allMetrics[k];
    return {
      day: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
      ingresos: day?.revenue ?? 0,
      gasto: day?.spend ?? 0,
    };
  });

  const funnelMax = Math.max(m.clicks, 1);
  const funnelItems = [
    { label: "Clics", value: m.clicks, prev: null, conv: null, target: null, status: "normal" as const },
    { label: "Add to Cart", value: m.atc, prev: m.clicks, conv: atcRate, target: 10, status: (atcRate >= 10 ? "good" : atcRate >= 7 ? "warn" : "bad") as "good" | "warn" | "bad" },
    { label: "Checkouts", value: m.checkouts, prev: m.atc, conv: checkoutRate, target: 50, status: (checkoutRate >= 50 ? "good" : checkoutRate >= 30 ? "warn" : m.atc > 0 ? "bad" : "normal") as "good" | "warn" | "bad" | "normal" },
    { label: "Compras", value: m.purchases, prev: m.checkouts, conv: purchaseRate, target: 50, status: (purchaseRate >= 50 ? "good" : purchaseRate >= 25 ? "warn" : m.checkouts > 0 ? "bad" : "normal") as "good" | "warn" | "bad" | "normal" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1 flex items-center gap-2">
            <span>Hoy · {todayLabel}</span>
            <span className="text-[var(--border-strong)]">·</span>
            <span className="flex items-center gap-1"><Clock size={10} />{primeTime}</span>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">
            {settings.productName ? `¿Qué hago con ${settings.productName}?` : "¿Qué hago ahora con mis campañas?"}
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)}
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink-2)] hover:bg-[var(--bg-inset)] flex items-center gap-1.5 transition-colors">
            <Edit3 size={12} /> Editar métricas
          </button>
          <button onClick={() => {
            downloadCSV("dashboard-hoy.csv", [{ fecha: todayLabel, gasto: m.spend, ingresos: m.revenue, roas: roas.toFixed(2), cpa: cpa.toFixed(2), ctr: ctr.toFixed(2), cpc: cpc.toFixed(2), cpm: cpm.toFixed(2), atc: m.atc, checkouts: m.checkouts, compras: m.purchases, beneficio: profit.toFixed(2) }]);
            success("CSV exportado", "dashboard-hoy.csv descargado.");
          }} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink-2)] hover:bg-[var(--bg-inset)] transition-colors">
            Exportar
          </button>
        </div>
      </div>

      {/* Decision card */}
      <div className="relative bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-[radial-gradient(ellipse_at_top_right,rgba(200,169,106,0.12),transparent_70%)] pointer-events-none" />
        <div className="flex gap-4 relative">
          <div className="w-11 h-11 rounded-xl bg-[var(--ink-1)] flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-[var(--gold)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest">Qué hacer ahora</span>
              <DecisionBadge kind={rec.kind} />
            </div>
            <div className="text-[17px] font-semibold text-[var(--ink-1)] leading-snug mb-1.5">{rec.headline}</div>
            <p className="text-[13px] text-[var(--ink-3)] leading-relaxed max-w-2xl">{rec.detail}</p>
            <div className="flex gap-2 mt-4 flex-wrap">
              <button onClick={() => success("Decisión aplicada", rec.headline)}
                className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black transition-colors flex items-center gap-1.5">
                <Zap size={12} /> Aplicar decisión
              </button>
              <button onClick={() => info("Reglas activas", "Ve a Reglas de decisión para ver el árbol completo.")}
                className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink-1)] hover:bg-[var(--bg-inset)] transition-colors">
                Ver reglas
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ingresos", value: eur(m.revenue), sub: `${m.purchases} pedidos`, icon: TrendingUp, ok: m.revenue > m.spend },
          { label: "Gasto en ads", value: eur(m.spend), sub: `CPM ${eur(cpm)}`, icon: BarChart2, ok: null },
          { label: "ROAS", value: `${roas.toFixed(2)}×`, sub: `BE: ${settings.beRoas}×`, icon: TrendingUp, ok: settings.beRoas > 0 ? roas >= settings.beRoas : null },
          { label: "CPA", value: cpa > 0 ? eur(cpa) : "—", sub: `BE: ${settings.beCpa > 0 ? eur(settings.beCpa) : "—"}`, icon: TrendingDown, ok: cpa > 0 && settings.beCpa > 0 ? cpa <= settings.beCpa : null },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-2">{k.label}</div>
            <div className={`font-mono font-bold text-[20px] ${k.ok === true ? "text-[var(--success)]" : k.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>
              {k.value}
            </div>
            <div className="text-[11px] text-[var(--ink-4)] mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "CTR", value: pct(ctr), ok: ctr >= settings.ctrTarget ? true : ctr > 0 ? false : null },
          { label: "CPC", value: eur(cpc), ok: settings.cpcMax > 0 ? cpc <= settings.cpcMax : null },
          { label: "CPM", value: eur(cpm), ok: null },
          { label: "Add to Cart", value: String(m.atc), ok: atcRate >= 10 ? true : atcRate > 0 ? false : null },
          { label: "Checkouts", value: String(m.checkouts), ok: null },
          { label: "Beneficio", value: eur(profit), ok: profit > 0 },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[var(--border)] rounded-xl p-3 shadow-sm">
            <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-1">{k.label}</div>
            <div className={`font-mono font-bold text-[15px] ${k.ok === true ? "text-[var(--success)]" : k.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Funnel + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white border border-[var(--border)] rounded-xl shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
            <div>
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">Salud del funnel · hoy</div>
              <div className="text-[11px] text-[var(--ink-4)]">ATC ≥10% · Checkout ≥50% · Compra ≥50%</div>
            </div>
          </div>
          <div className="p-4 space-y-2.5">
            {funnelItems.map(f => (
              <FunnelBar key={f.label} {...f} max={funnelMax} />
            ))}
            {m.checkouts > 0 && m.purchases === 0 && (
              <div className="mt-3 bg-[var(--warning-soft)] border border-[rgba(245,158,11,0.2)] rounded-lg p-3 flex gap-2">
                <AlertTriangle size={14} className="text-[var(--warning)] mt-0.5 flex-shrink-0" />
                <div className="text-[12px] text-[var(--ink-2)]">
                  <strong>Checkouts sin compras</strong> — Revisa precio, gastos de envío o checkout de Shopify.
                </div>
              </div>
            )}
            {m.atc > 0 && m.checkouts === 0 && (
              <div className="mt-3 bg-[var(--warning-soft)] border border-[rgba(245,158,11,0.2)] rounded-lg p-3 flex gap-2">
                <AlertTriangle size={14} className="text-[var(--warning)] mt-0.5 flex-shrink-0" />
                <div className="text-[12px] text-[var(--ink-2)]">
                  <strong>ATC sin checkouts</strong> — Problema en el carrito o gastos de envío muy altos.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">Tendencia 7 días</div>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={last7}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--ink-4)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--ink-4)" }} width={35} />
                  <Tooltip contentStyle={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v, name) => [`${v} €`, name === "ingresos" ? "Ingresos" : "Gasto"]} />
                  <Line dataKey="ingresos" stroke="var(--ink-1)" strokeWidth={2} dot={false} />
                  <Line dataKey="gasto" stroke="var(--gold)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 text-[11px] text-[var(--ink-3)] mt-1">
                <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-[var(--ink-1)]" /> Ingresos</span>
                <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-[var(--gold)]" /> Gasto</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-3">Break-even · referencia</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "BE CPA", value: settings.beCpa > 0 ? eur(settings.beCpa) : "—" },
                { label: "BE ROAS", value: settings.beRoas > 0 ? `${settings.beRoas}×` : "—" },
                { label: "CPA hoy", value: cpa > 0 ? eur(cpa) : "—", ok: cpa > 0 && settings.beCpa > 0 ? cpa <= settings.beCpa : undefined },
                { label: "ROAS hoy", value: roas > 0 ? `${roas.toFixed(2)}×` : "—", ok: roas > 0 && settings.beRoas > 0 ? roas >= settings.beRoas : undefined },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-[10px] text-[var(--ink-4)] mb-0.5 uppercase tracking-wide">{s.label}</div>
                  <div className={`font-mono font-bold text-[15px] ${s.ok === true ? "text-[var(--success)]" : s.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
            {settings.beCpa === 0 && (
              <div className="mt-3 text-[11px] text-[var(--ink-4)] flex items-center gap-1.5">
                <AlertTriangle size={11} className="text-[var(--warning)]" />
                Configura tu BE CPA en Ajustes para ver comparativas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
