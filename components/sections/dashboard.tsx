"use client";
import { KpiCard } from "@/components/ui/kpi-card";
import { DecisionBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { eur, pct } from "@/lib/utils";
import { downloadCSV } from "@/lib/export";
import {
  DEMO_METRICS, FUNNEL_STEPS, TREND_REVENUE, TREND_SPEND, TREND_ROAS,
  type DashboardMetrics
} from "@/lib/data";
import { Zap, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const DAYS = ["7 may","8 may","9 may","10 may","11 may","12 may","13 may"];

function getRecommendation(m: DashboardMetrics) {
  if (m.cpc > 2.5 && m.adSpend > 10) {
    return {
      kind: "kill" as const,
      headline: "CPC demasiado alto. Revisar hook o apagar.",
      detail: `CPC ${eur(m.cpc)} supera 2.5 € con ${eur(m.adSpend)} gastados. El anuncio no atrae tráfico barato.`,
    };
  }
  if (m.atc > 6 && m.checkouts === 0) {
    return {
      kind: "watch" as const,
      headline: "Revisar carrito o envío.",
      detail: `Tienes ${m.atc} ATC pero 0 checkouts. El problema está en el carrito, precio de envío o confianza.`,
    };
  }
  if (m.roas >= m.beRoas * 1.2) {
    return {
      kind: "scale" as const,
      headline: "ROAS supera benchmark. Escalar +25%.",
      detail: `ROAS ${m.roas.toFixed(2)}× supera BE×1.2 (${(m.beRoas * 1.2).toFixed(2)}×). Sube presupuesto sin tocar audiencias.`,
    };
  }
  if (m.cpa <= m.beCpa && m.purchases > 0) {
    return {
      kind: "scale" as const,
      headline: "CPA por debajo del break-even. Mantener activo.",
      detail: `CPA ${eur(m.cpa)} < BE CPA ${eur(m.beCpa)}. El producto demuestra rentabilidad.`,
    };
  }
  if (m.ctr >= 2.5 && m.cpc <= 0.5 && m.purchases < 2) {
    return {
      kind: "data" as const,
      headline: "No tocar todavía. El anuncio genera interés.",
      detail: `CTR ${pct(m.ctr)} y CPC ${eur(m.cpc)} son buenos. Espera 50–70 clics o prime time antes de decidir.`,
    };
  }
  return {
    kind: "watch" as const,
    headline: "Revisar datos antes de actuar.",
    detail: "Aún no hay suficientes datos para una decisión. No apagues por miedo — espera a cumplir una regla objetiva.",
  };
}

function FunnelView() {
  const max = FUNNEL_STEPS[0].value;
  return (
    <div className="space-y-2">
      {FUNNEL_STEPS.map((step, i) => {
        const pctWidth = (step.value / max) * 100;
        const convRate = i === 0 ? null : (step.value / FUNNEL_STEPS[i - 1].value) * 100;
        const targets: Record<string, number> = { "Add to Cart": 10, "Checkouts": 6, "Compras": 3 };
        const target = targets[step.name];
        const status = convRate == null ? "normal"
          : target == null ? "normal"
          : convRate >= target ? "good"
          : convRate >= target * 0.75 ? "warn" : "bad";

        return (
          <div key={step.name} className="grid gap-2 items-center" style={{ gridTemplateColumns: "110px 1fr 64px 72px" }}>
            <div className="text-[12px] text-[var(--ink-2)] font-medium flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status === "good" ? "bg-[var(--success)]" : status === "warn" ? "bg-[var(--warning)]" : status === "bad" ? "bg-[var(--danger)]" : "bg-[var(--ink-4)]"}`} />
              {step.name}
            </div>
            <div className="h-6 bg-[var(--bg-inset)] rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all ${status === "good" ? "bg-[var(--success)]" : status === "bad" ? "bg-[var(--danger)]" : status === "warn" ? "bg-[var(--warning)]" : "bg-[var(--ink-1)]"}`}
                style={{ width: `${pctWidth}%`, opacity: status === "normal" ? 0.85 : 1 }}
              />
            </div>
            <div className="font-mono text-[13px] font-semibold text-right text-[var(--ink-1)]">
              {step.value.toLocaleString()}
            </div>
            <div className={`font-mono text-[12px] text-right ${status === "bad" ? "text-[var(--danger)]" : status === "warn" ? "text-[var(--warning)]" : status === "good" ? "text-[var(--success)]" : "text-[var(--ink-4)]"}`}>
              {convRate != null ? `${convRate.toFixed(1)}%` : "—"}
              {target && <span className="text-[var(--ink-5)] text-[10px]"> /{target}%</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Dashboard() {
  const m = DEMO_METRICS;
  const rec = getRecommendation(m);
  const { success, info } = useToast();

  const chartData = DAYS.map((d, i) => ({
    day: d,
    ingresos: TREND_REVENUE[i],
    gasto: TREND_SPEND[i],
    roas: TREND_ROAS[i],
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Hoy · {"{TODAY}"} · prime time MX en 5h 22m</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">¿Qué hago ahora con mis campañas?</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Resumen del día, salud del funnel y decisión recomendada.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            downloadCSV("dashboard-hoy.csv", [{
              fecha: "13 mayo 2026", ingresos: m.revenue, gasto: m.adSpend,
              beneficio: m.profit, roas: m.roas, cpa: m.cpa, ctr: m.ctr,
              cpc: m.cpc, cpm: m.cpm, atc: m.atc, checkouts: m.checkouts, compras: m.purchases,
            }]);
            success("CSV exportado", "dashboard-hoy.csv descargado.");
          }} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink-1)] shadow-sm hover:bg-[var(--bg-inset)] transition-colors">
            Exportar
          </button>
          <button onClick={() => info("Nuevo test", "Ir a Creativos para lanzar un nuevo ángulo.")} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black transition-colors">
            + Nuevo test
          </button>
        </div>
      </div>

      {/* Callout card */}
      <div className="relative bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-[radial-gradient(ellipse_at_top_right,rgba(200,169,106,0.15),transparent_70%)] pointer-events-none" />
        <div className="flex gap-4 relative">
          <div className="w-11 h-11 rounded-xl bg-[var(--ink-1)] flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-[var(--gold)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest">Qué hacer ahora</span>
              <DecisionBadge kind={rec.kind} />
            </div>
            <div className="text-[17px] font-semibold text-[var(--ink-1)] leading-snug mb-2">{rec.headline}</div>
            <p className="text-[13px] text-[var(--ink-3)] leading-relaxed max-w-2xl">{rec.detail}</p>
            <div className="flex gap-2 mt-4 flex-wrap">
              <button onClick={() => success("Decisión aplicada", rec.headline)} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black transition-colors flex items-center gap-1.5">
                <Zap size={12} /> Aplicar decisión
              </button>
              <button onClick={() => info("Regla aplicada", rec.kind === "scale" ? "Regla s1: ROAS ≥ BE×1.2" : rec.kind === "kill" ? "Regla k1: CPC > 2.5€" : "Sin regla activa — esperando datos")} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink-1)] hover:bg-[var(--bg-inset)] transition-colors">
                Ver reglas usadas
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Ingresos hoy"    value={eur(m.revenue)}    delta={21}  deltaLabel="vs ayer" trend={TREND_REVENUE} />
        <KpiCard label="Gasto en ads"    value={eur(m.adSpend)}    delta={-4}  deltaLabel="vs ayer" trend={TREND_SPEND} />
        <KpiCard label="Beneficio est."  value={eur(m.profit)}     delta={38}  deltaLabel="vs ayer" color="success" />
        <KpiCard label="ROAS"            value={`${m.roas.toFixed(2)}×`} delta={26} deltaLabel="vs ayer" trend={TREND_ROAS} />
        <KpiCard label="CPA"             value={eur(m.cpa)}        delta={-14} deltaLabel="vs ayer" color="success" />
        <KpiCard label="Margen neto"     value={pct(m.netMarginPct)} delta={3}  deltaLabel="vs ayer" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="CPC"         value={eur(m.cpc)}  note="bajo · bueno" />
        <KpiCard label="CTR"         value={pct(m.ctr)}  note="≥2% objetivo" />
        <KpiCard label="CPM"         value={eur(m.cpm)}  note="estable" />
        <KpiCard label="Add to Cart" value={String(m.atc)}      note="ATC rate 11.7%" />
        <KpiCard label="Checkouts"   value={String(m.checkouts)} note="50% ATC→IC" />
        <KpiCard label="Compras"     value={String(m.purchases)} note="3.3× ROAS prom." />
      </div>

      {/* Funnel + trends */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white border border-[var(--border)] rounded-xl shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
            <div>
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">Salud del funnel · hoy</div>
              <div className="text-[12px] text-[var(--ink-3)]">Obj: ATC ≥10% · Checkout ≥6% · Compra ≥3%</div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[var(--ink-3)]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--success)]" /> Sano</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--warning)]" /> Vigilar</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--danger)]" /> Roto</span>
            </div>
          </div>
          <div className="p-4">
            <FunnelView />
            <div className="mt-4 bg-[var(--warning-soft)] border border-[rgba(245,158,11,0.2)] rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-[var(--warning)] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[12px] font-semibold text-[var(--ink-1)]">Checkout bajo (50% vs objetivo 60%)</div>
                  <div className="text-[12px] text-[var(--ink-3)] mt-0.5">64 ATC pero solo 32 checkouts. Revisa carrito, envío y precio final en móvil.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">Tendencia 7 días</div>
              <span className="text-[11px] font-mono text-[var(--success)]">+38% beneficio</span>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--ink-4)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--ink-4)" }} width={35} />
                  <Tooltip
                    contentStyle={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v, name) => [`${v} €`, name === "ingresos" ? "Ingresos" : name === "gasto" ? "Gasto" : String(name)]}
                  />
                  <Line dataKey="ingresos" stroke="var(--ink-1)" strokeWidth={2} dot={false} />
                  <Line dataKey="gasto" stroke="var(--gold)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 text-[11px] text-[var(--ink-3)] mt-2">
                <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-[var(--ink-1)]" /> Ingresos</span>
                <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-[var(--gold)] border-dashed" style={{borderTop:"2px dashed var(--gold)"}} /> Gasto</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
            <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-3">Break-even de referencia</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "BE CPA", value: eur(m.beCpa) },
                { label: "BE ROAS", value: `${m.beRoas.toFixed(2)}×` },
                { label: "CPA actual", value: eur(m.cpa), ok: m.cpa <= m.beCpa },
                { label: "ROAS actual", value: `${m.roas.toFixed(2)}×`, ok: m.roas >= m.beRoas },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-[10px] text-[var(--ink-4)] mb-0.5 uppercase tracking-wide">{s.label}</div>
                  <div className={`font-mono font-bold text-[15px] ${s.ok === true ? "text-[var(--success)]" : s.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
