"use client";
import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { useToast } from "@/components/ui/toast";
import { downloadCSV } from "@/lib/export";
import { eur, pct } from "@/lib/utils";
import { analyzeMetrics, type AIAnalysis } from "@/lib/ai-engine";
import { notify } from "@/lib/notifications";
import {
  Zap, AlertTriangle, Clock, Edit3, TrendingUp, TrendingDown,
  BarChart2, CheckCircle, XCircle, Brain, ChevronRight
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

interface DailyMetrics {
  spend: number; revenue: number; clicks: number; impressions: number;
  atc: number; checkouts: number; purchases: number;
}
type DailyRecord = Record<string, DailyMetrics>;

function todayKey() { return new Date().toISOString().split("T")[0]; }

function usePrimeTimeCountdown(country: string) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tz = country === "ES" ? "Europe/Madrid" : country === "US" ? "America/New_York" : "America/Mexico_City";
    const update = () => {
      const now = new Date();
      const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
      const h = local.getHours(), m = local.getMinutes();
      const isPrime = h >= 20 && h < 23;
      if (isPrime) { setLabel("¡Prime time activo ahora!"); return; }
      const mins = h < 20 ? (20 - h) * 60 - m : (44 - h) * 60 - m;
      setLabel(`Prime time en ${Math.floor(mins / 60)}h ${mins % 60}m`);
    };
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [country]);
  return label;
}

function ScoreBar({ score, decision }: { score: number; decision: string }) {
  const color = score >= 65 ? "bg-[var(--success)]"
              : score >= 42 ? "bg-[var(--gold)]"
              : score >= 22 ? "bg-[var(--warning)]"
              : "bg-[var(--danger)]";
  const textColor = score >= 65 ? "text-[var(--success)]"
                  : score >= 42 ? "text-[var(--gold-deep)]"
                  : score >= 22 ? "text-[var(--warning)]"
                  : "text-[var(--danger)]";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px] font-semibold text-[var(--ink-4)] uppercase tracking-wider">Score de salud</div>
        <div className={`font-mono font-bold text-[22px] ${textColor}`}>{score}<span className="text-[13px] font-normal text-[var(--ink-4)]">/100</span></div>
      </div>
      <div className="h-2.5 bg-[var(--bg-inset)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function SignalRow({ signal }: { signal: AIAnalysis["signals"][0] }) {
  const icon = signal.status === "green" ? <CheckCircle size={13} className="text-[var(--success)] flex-shrink-0" />
             : signal.status === "red" ? <XCircle size={13} className="text-[var(--danger)] flex-shrink-0" />
             : <AlertTriangle size={13} className="text-[var(--warning)] flex-shrink-0" />;
  const bg = signal.status === "green" ? "border-[rgba(34,197,94,0.2)] bg-[var(--success-soft)]"
           : signal.status === "red" ? "border-[rgba(239,68,68,0.2)] bg-[var(--danger-soft)]"
           : "border-[rgba(245,158,11,0.2)] bg-[var(--warning-soft)]";
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${bg}`}>
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="text-[11px] font-semibold text-[var(--ink-2)]">{signal.label}</div>
          <div className="text-[11px] font-mono font-semibold text-[var(--ink-1)] flex-shrink-0">{signal.value}</div>
        </div>
        <div className="text-[11px] text-[var(--ink-3)] leading-relaxed">{signal.detail}</div>
      </div>
    </div>
  );
}

function AIPanel({ analysis }: { analysis: AIAnalysis }) {
  const [expanded, setExpanded] = useState(true);
  const decisionColors = {
    scale:    "text-[var(--success)] bg-[var(--success-soft)] border-[rgba(34,197,94,0.2)]",
    watch:    "text-[var(--gold-deep)] bg-[var(--gold-soft)] border-[rgba(200,169,106,0.3)]",
    optimize: "text-[var(--warning)] bg-[var(--warning-soft)] border-[rgba(245,158,11,0.2)]",
    kill:     "text-[var(--danger)] bg-[var(--danger-soft)] border-[rgba(239,68,68,0.2)]",
    wait:     "text-[var(--ink-3)] bg-[var(--bg-inset)] border-[var(--border)]",
  };
  const decisionLabels: Record<string, string> = { scale: "ESCALAR", watch: "VIGILAR", optimize: "OPTIMIZAR", kill: "PAUSAR", wait: "ESPERAR" };
  const priorityColors = { now: "bg-[var(--danger)] text-white", today: "bg-[var(--gold-soft)] text-[var(--gold-deep)]", week: "bg-[var(--bg-inset)] text-[var(--ink-3)]" };
  const priorityLabels = { now: "AHORA", today: "HOY", week: "SEMANA" };

  const phaseColors: Record<string, string> = {
    launch:     "bg-[var(--ink-1)] text-[var(--gold)]",
    signals:    "bg-[#3a3a78] text-white",
    validation: "bg-[var(--warning)] text-white",
    decision:   "bg-[var(--gold)] text-[var(--ink-1)]",
    scaling:    "bg-[var(--success)] text-white",
  };

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
      {/* Phase ribbon */}
      <div className={`flex items-center justify-between px-5 py-2 ${phaseColors[analysis.phase] ?? phaseColors.launch}`}>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Día {analysis.testingDay} · {analysis.phaseLabel}</span>
        </div>
        <span className="text-[9px] font-mono opacity-70">Confianza {analysis.confidence}</span>
      </div>

      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-[var(--bg-inset)] transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--ink-1)] flex items-center justify-center">
            <Brain size={16} className="text-[var(--gold)]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-[13px] font-bold text-[var(--ink-1)]">Análisis IA</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${decisionColors[analysis.decision]}`}>
                {decisionLabels[analysis.decision]}
              </span>
            </div>
            <div className="text-[12px] text-[var(--ink-3)]">{analysis.headline}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className={`font-mono font-bold text-[20px] ${analysis.score >= 65 ? "text-[var(--success)]" : analysis.score >= 42 ? "text-[var(--gold-deep)]" : analysis.score >= 22 ? "text-[var(--warning)]" : "text-[var(--danger)]"}`}>
              {analysis.score}
            </div>
            <div className="text-[10px] text-[var(--ink-4)]">/ 100</div>
          </div>
          <ChevronRight size={16} className={`text-[var(--ink-4)] transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-[var(--border)]">
          {/* WHY message */}
          <div className="pt-4 bg-[var(--bg-inset)] -mx-5 px-5 py-4 -mb-1">
            <div className="flex items-start gap-2">
              <div className="text-[14px] mt-0.5">💡</div>
              <div>
                <div className="text-[10px] font-bold text-[var(--ink-4)] uppercase tracking-wider mb-1">Por qué esta decisión</div>
                <div className="text-[13px] text-[var(--ink-1)] leading-relaxed">{analysis.whyMessage}</div>
              </div>
            </div>
          </div>

          <div>
            <ScoreBar score={analysis.score} decision={analysis.decision} />
          </div>

          {/* SCALE GATES */}
          {analysis.scaleGates.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-2">
                Criterios para escalar {analysis.scaleGates.every(g => g.passed) ? "✓" : `· ${analysis.scaleGates.filter(g => g.passed).length} de ${analysis.scaleGates.length}`}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {analysis.scaleGates.map(g => (
                  <div key={g.label} className={`p-2.5 rounded-lg border ${g.passed ? "border-[rgba(34,197,94,0.2)] bg-[var(--success-soft)]" : "border-[var(--border)] bg-white"}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {g.passed
                        ? <CheckCircle size={12} className="text-[var(--success)]" />
                        : <XCircle size={12} className="text-[var(--ink-4)]" />}
                      <span className="text-[11px] font-semibold text-[var(--ink-1)]">{g.label}</span>
                    </div>
                    <div className="text-[10px] text-[var(--ink-3)] leading-tight">
                      <span className="font-mono">{g.current}</span>
                      <span className="text-[var(--ink-5)]"> · necesario: {g.required}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.signals.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-[var(--ink-4)] uppercase tracking-wider">Señales analizadas</div>
              {analysis.signals.map(s => <SignalRow key={s.label} signal={s} />)}
            </div>
          )}

          {analysis.pattern && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--gold-soft)] border border-[rgba(200,169,106,0.25)]">
              <Zap size={13} className="text-[var(--gold-deep)] flex-shrink-0 mt-0.5" />
              <div className="text-[12px] text-[var(--ink-2)] leading-relaxed">
                <strong>Patrón detectado:</strong> {analysis.pattern}
              </div>
            </div>
          )}

          {analysis.actions.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-2">Acciones recomendadas</div>
              <div className="space-y-2">
                {analysis.actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${priorityColors[a.priority]}`}>
                      {priorityLabels[a.priority]}
                    </span>
                    <span className="text-[12px] text-[var(--ink-2)] leading-relaxed">{a.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NumInput({ label, hint, value, onChange, suffix }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; suffix?: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-[var(--ink-3)] mb-1">{label}
        {hint && <span className="font-normal text-[var(--ink-5)] ml-1">· {hint}</span>}
      </div>
      <div className="flex items-center h-9 border border-[var(--border)] rounded-lg overflow-hidden bg-white focus-within:border-[var(--gold)] focus-within:ring-2 focus-within:ring-[rgba(200,169,106,0.15)] transition-all">
        <input value={value} onChange={e => onChange(e.target.value)} type="number" min="0" step="0.01"
          className="flex-1 px-2.5 text-[13px] text-[var(--ink-1)] outline-none bg-transparent font-mono" />
        {suffix && <span className="px-2 text-[11px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-l border-[var(--border)] h-full flex items-center">{suffix}</span>}
      </div>
    </div>
  );
}

function MetricsForm({ initial, onSave }: { initial?: DailyMetrics; onSave: (m: DailyMetrics) => void }) {
  const { settings } = useSettings();
  const [spend, setSpend] = useState(initial ? String(initial.spend) : "");
  const [revenue, setRevenue] = useState(initial ? String(initial.revenue) : "");
  const [clicks, setClicks] = useState(initial ? String(initial.clicks) : "");
  const [impressions, setImpressions] = useState(initial ? String(initial.impressions) : "");
  const [atc, setAtc] = useState(initial ? String(initial.atc) : "");
  const [checkouts, setCheckouts] = useState(initial ? String(initial.checkouts) : "");
  const [purchases, setPurchases] = useState(initial ? String(initial.purchases) : "");
  const n = (v: string) => parseFloat(v) || 0;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Dashboard · Métricas de hoy</div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">¿Qué pasó hoy?</h1>
        <p className="text-[13px] text-[var(--ink-3)] mt-1">
          Introduce los datos de Meta Ads Manager. La IA analizará tus resultados y te dirá exactamente qué hacer.
        </p>
      </div>

      {/* Product context */}
      {settings.productName && (
        <div className="flex items-center justify-between p-3 bg-[var(--gold-soft)] border border-[rgba(200,169,106,0.2)] rounded-xl">
          <div>
            <div className="text-[9px] font-bold text-[var(--ink-4)] uppercase tracking-wider mb-0.5">Producto activo</div>
            <div className="text-[13px] font-semibold text-[var(--ink-1)]">{settings.productName}</div>
          </div>
          <div className="flex gap-4">
            {settings.beRoas > 0 && (
              <div className="text-right">
                <div className="text-[9px] text-[var(--ink-4)]">BE ROAS</div>
                <div className="font-mono font-bold text-[13px] text-[var(--gold-deep)]">{settings.beRoas}×</div>
              </div>
            )}
            {settings.beCpa > 0 && (
              <div className="text-right">
                <div className="text-[9px] text-[var(--ink-4)]">BE CPA</div>
                <div className="font-mono font-bold text-[13px] text-[var(--gold-deep)]">{eur(settings.beCpa)}</div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <div className="text-[12px] font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-3">💸 Inversión e ingresos</div>
          <div className="grid grid-cols-2 gap-4">
            <NumInput label="Gasto en ads" hint="Total en Meta hoy" value={spend} onChange={setSpend} suffix="€" />
            <NumInput label="Ingresos" hint="Ventas atribuidas" value={revenue} onChange={setRevenue} suffix="€" />
          </div>
        </div>
        <div className="border-t border-[var(--border)] pt-4">
          <div className="text-[12px] font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-3">📊 Tráfico</div>
          <div className="grid grid-cols-2 gap-4">
            <NumInput label="Impresiones" value={impressions} onChange={setImpressions} />
            <NumInput label="Clics al link" value={clicks} onChange={setClicks} />
          </div>
        </div>
        <div className="border-t border-[var(--border)] pt-4">
          <div className="text-[12px] font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-3">🛒 Funnel de conversión</div>
          <div className="grid grid-cols-3 gap-4">
            <NumInput label="Add to Cart" value={atc} onChange={setAtc} />
            <NumInput label="Inicio de pago" value={checkouts} onChange={setCheckouts} />
            <NumInput label="Compras" value={purchases} onChange={setPurchases} />
          </div>
        </div>
        <button onClick={() => { if (n(spend) > 0) onSave({ spend: n(spend), revenue: n(revenue), clicks: n(clicks), impressions: n(impressions), atc: n(atc), checkouts: n(checkouts), purchases: n(purchases) }); }}
          disabled={!n(spend)}
          className="w-full py-3 rounded-xl bg-[var(--ink-1)] text-white font-semibold text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
          <Brain size={16} /> Ver análisis IA
        </button>
      </div>
    </div>
  );
}

function RoasHeatmap({ allMetrics, beRoas }: { allMetrics: DailyRecord; beRoas: number }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const k = d.toISOString().split("T")[0];
    const m = allMetrics[k];
    const roas = m && m.spend > 0 ? m.revenue / m.spend : null;
    return {
      label: d.toLocaleDateString("es-MX", { weekday: "short" }),
      date: d.getDate(),
      roas,
    };
  });

  const getColor = (roas: number | null) => {
    if (roas === null) return "bg-[var(--bg-inset)] border-[var(--border)]";
    if (beRoas <= 0) return "bg-[var(--gold-soft)] border-[rgba(200,169,106,0.3)]";
    if (roas >= beRoas * 1.3) return "bg-[var(--success)] border-[rgba(34,197,94,0.3)] shadow-[0_0_8px_rgba(34,197,94,0.25)]";
    if (roas >= beRoas) return "bg-[rgba(34,197,94,0.4)] border-[rgba(34,197,94,0.25)]";
    if (roas >= beRoas * 0.75) return "bg-[var(--warning-soft)] border-[rgba(245,158,11,0.3)]";
    return "bg-[var(--danger-soft)] border-[rgba(239,68,68,0.3)]";
  };
  const getTextColor = (roas: number | null) => {
    if (roas === null) return "text-[var(--ink-5)]";
    if (beRoas <= 0) return "text-[var(--gold-deep)]";
    if (roas >= beRoas) return "text-[var(--success)]";
    if (roas >= beRoas * 0.75) return "text-[var(--warning)]";
    return "text-[var(--danger)]";
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] p-4">
      <div className="text-[10px] font-bold text-[var(--ink-4)] uppercase tracking-widest mb-3">ROAS · Últimos 7 días</div>
      <div className="flex gap-1.5">
        {days.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div title={d.roas !== null ? `${d.roas.toFixed(2)}×` : "Sin datos"}
              className={`w-full rounded-lg border flex flex-col items-center justify-center py-2.5 transition-all ${getColor(d.roas)}`}>
              <span className={`font-mono font-bold text-[11px] leading-none ${getTextColor(d.roas)}`}>
                {d.roas !== null ? `${d.roas.toFixed(1)}×` : "—"}
              </span>
            </div>
            <span className="text-[9px] font-medium text-[var(--ink-4)] capitalize">{d.label}</span>
          </div>
        ))}
      </div>
      {beRoas > 0 && (
        <div className="flex gap-3 mt-2.5 text-[9px] text-[var(--ink-4)]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--success)] inline-block" /> Encima BE</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--warning-soft)] border border-[rgba(245,158,11,0.3)] inline-block" /> Cerca</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--danger-soft)] border border-[rgba(239,68,68,0.3)] inline-block" /> Por debajo</span>
        </div>
      )}
    </div>
  );
}

function FunnelBar({ label, value, max, conv, target, status }: {
  label: string; value: number; max: number; conv: number | null; target: number | null;
  status: "good" | "warn" | "bad" | "normal";
}) {
  const bg = { good: "bg-[var(--success)]", warn: "bg-[var(--warning)]", bad: "bg-[var(--danger)]", normal: "bg-[var(--ink-2)]" };
  const dot = { good: "bg-[var(--success)]", warn: "bg-[var(--warning)]", bad: "bg-[var(--danger)]", normal: "bg-[var(--ink-4)]" };
  return (
    <div className="grid gap-2 items-center" style={{ gridTemplateColumns: "110px 1fr 50px 60px" }}>
      <div className="text-[12px] text-[var(--ink-2)] font-medium flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot[status]}`} />
        {label}
      </div>
      <div className="h-5 bg-[var(--bg-inset)] rounded overflow-hidden">
        <div className={`h-full rounded transition-all ${bg[status]}`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, opacity: status === "normal" ? 0.7 : 1 }} />
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
  const { success } = useToast();
  const today = todayKey();
  const [allMetrics, setAllMetrics] = useLocalStorage<DailyRecord>("ecc-daily-metrics", {});
  const [editing, setEditing] = useState(false);
  const primeTime = usePrimeTimeCountdown(settings.country);
  const todayLabel = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const notifiedRef = useRef(false);

  const todayData = allMetrics[today] ?? null;
  const saveMetrics = (m: DailyMetrics) => { setAllMetrics(prev => ({ ...prev, [today]: m })); setEditing(false); };

  // Compute for notification check (needed before early return)
  const todayRoas = todayData && todayData.spend > 0 ? todayData.revenue / todayData.spend : 0;

  useEffect(() => {
    if (notifiedRef.current || !todayData || !settings.notifyKill) return;
    if (settings.beRoas > 0 && todayRoas > 0 && todayRoas < settings.beRoas * 0.8) {
      notify("⚠️ ROAS por debajo del break-even", `ROAS actual: ${todayRoas.toFixed(2)}× · BE: ${settings.beRoas}× — Revisa tus campañas.`);
      notifiedRef.current = true;
    }
  }, [todayData]);

  if (!todayData || editing) return <MetricsForm initial={todayData ?? undefined} onSave={saveMetrics} />;

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

  // Yesterday comparison
  const sortedKeys = Object.keys(allMetrics).sort();
  const yesterdayKey = sortedKeys.filter(k => k < today).slice(-1)[0];
  const yd = yesterdayKey ? allMetrics[yesterdayKey] : null;
  const ydRoas = yd && yd.spend > 0 ? yd.revenue / yd.spend : null;
  const ydCpa = yd && yd.purchases > 0 ? yd.spend / yd.purchases : null;
  const pctDelta = (curr: number, prev: number | null) => prev && prev > 0 ? ((curr - prev) / prev) * 100 : null;
  const roasDelta = pctDelta(roas, ydRoas);
  const cpaDelta = pctDelta(cpa, ydCpa);

  const aiAnalysis = analyzeMetrics(allMetrics, settings.beCpa, settings.beRoas, settings.ctrTarget);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const k = d.toISOString().split("T")[0];
    const day = allMetrics[k];
    return { day: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }), ingresos: day?.revenue ?? 0, gasto: day?.spend ?? 0 };
  });

  const funnelMax = Math.max(m.clicks, 1);
  const funnelItems = [
    { label: "Clics", value: m.clicks, conv: null, target: null, status: "normal" as const },
    { label: "Add to Cart", value: m.atc, conv: atcRate, target: 10, status: (atcRate >= 10 ? "good" : atcRate >= 5 ? "warn" : m.clicks > 10 ? "bad" : "normal") as "good" | "warn" | "bad" | "normal" },
    { label: "Checkouts", value: m.checkouts, conv: checkoutRate, target: 50, status: (checkoutRate >= 50 ? "good" : checkoutRate >= 30 ? "warn" : m.atc > 0 ? "bad" : "normal") as "good" | "warn" | "bad" | "normal" },
    { label: "Compras", value: m.purchases, conv: purchaseRate, target: 50, status: (purchaseRate >= 50 ? "good" : purchaseRate >= 25 ? "warn" : m.checkouts > 0 ? "bad" : "normal") as "good" | "warn" | "bad" | "normal" },
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
            {settings.productName ? `${settings.productName} · ¿Qué hago ahora?` : "¿Qué hago ahora con mis campañas?"}
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)}
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink-2)] hover:bg-[var(--bg-inset)] flex items-center gap-1.5 transition-colors">
            <Edit3 size={12} /> Editar métricas
          </button>
          <button onClick={() => {
            downloadCSV("dashboard-hoy.csv", [{ fecha: todayLabel, gasto: m.spend, ingresos: m.revenue, roas: roas.toFixed(2), cpa: cpa.toFixed(2), ctr: ctr.toFixed(2), cpc: cpc.toFixed(2), cpm: cpm.toFixed(2), atc: m.atc, checkouts: m.checkouts, compras: m.purchases, beneficio: profit.toFixed(2), score_ia: aiAnalysis.score }]);
            success("CSV exportado", "dashboard-hoy.csv descargado.");
          }} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink-2)] hover:bg-[var(--bg-inset)] transition-colors">
            Exportar
          </button>
        </div>
      </div>

      {/* Alert banner for critical thresholds */}
      {(settings.beRoas > 0 && roas > 0 && roas < settings.beRoas * 0.8) && (
        <div className="bg-[var(--danger-soft)] border border-[rgba(239,68,68,0.25)] rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={15} className="text-[var(--danger)] flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-[13px] font-bold text-[var(--danger)] mb-0.5">ROAS por debajo del break-even</div>
            <div className="text-[12px] text-[var(--ink-2)]">
              ROAS actual {roas.toFixed(2)}× vs BE {settings.beRoas}×. No escales hasta resolver el creativo o el precio.
            </div>
          </div>
        </div>
      )}
      {(settings.beCpa > 0 && cpa > 0 && cpa > settings.beCpa * 1.5) && (
        <div className="bg-[var(--warning-soft)] border border-[rgba(245,158,11,0.25)] rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={15} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-[13px] font-bold text-[var(--warning)] mb-0.5">CPA por encima del límite</div>
            <div className="text-[12px] text-[var(--ink-2)]">
              CPA {eur(cpa)} · BE máx {eur(settings.beCpa)}. Cada venta genera pérdida. Revisa el funnel antes de seguir.
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Panel */}
      <AIPanel analysis={aiAnalysis} />

      {/* Main KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Ingresos", value: eur(m.revenue), sub: `${m.purchases} pedidos`, delta: null, ok: m.revenue > m.spend },
          { label: "Gasto en ads", value: eur(m.spend), sub: `CPM ${eur(cpm)}`, delta: null, ok: null },
          { label: "ROAS", value: `${roas.toFixed(2)}×`, sub: `BE: ${settings.beRoas > 0 ? settings.beRoas + "×" : "—"}`, delta: roasDelta, ok: settings.beRoas > 0 ? roas >= settings.beRoas : null },
          { label: "CPA", value: cpa > 0 ? eur(cpa) : "—", sub: `BE: ${settings.beCpa > 0 ? eur(settings.beCpa) : "—"}`, delta: cpa > 0 ? cpaDelta : null, ok: cpa > 0 && settings.beCpa > 0 ? cpa <= settings.beCpa : null },
        ].map(k => (
          <div key={k.label} className="card-lift bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className={`h-[3px] w-full ${k.ok === true ? "bg-gradient-to-r from-[var(--success)] to-[#22c55e]" : k.ok === false ? "bg-gradient-to-r from-[var(--danger)] to-[#ef4444]" : "bg-gradient-to-r from-[var(--gold-deep)] to-[var(--gold)]"}`} />
            <div className="p-5">
              <div className="text-[10px] font-bold text-[var(--ink-4)] uppercase tracking-widest mb-3">{k.label}</div>
              <div className={`animate-count-up font-mono font-black text-[28px] leading-none mb-3 tracking-tight ${k.ok === true ? "text-[var(--success)]" : k.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>{k.value}</div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--ink-4)]">{k.sub}</span>
                {k.delta !== null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${k.delta > 0 ? "bg-[var(--success-soft)] text-[var(--success)]" : k.delta < 0 ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--bg-inset)] text-[var(--ink-4)]"}`}>
                    {k.delta > 0 ? "▲" : "▼"} {Math.abs(k.delta).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "CTR", value: pct(ctr), ok: settings.ctrTarget > 0 ? ctr >= settings.ctrTarget : null },
          { label: "CPC", value: eur(cpc), ok: settings.cpcMax > 0 ? cpc <= settings.cpcMax : null },
          { label: "CPM", value: eur(cpm), ok: null },
          { label: "ATC", value: String(m.atc), ok: atcRate >= 10 ? true : atcRate > 0 && m.clicks > 10 ? false : null },
          { label: "Checkouts", value: String(m.checkouts), ok: null },
          { label: "Beneficio", value: eur(profit), ok: profit > 0 },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.03)] p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[9px] font-bold text-[var(--ink-4)] uppercase tracking-wider">{k.label}</div>
              {k.ok !== null && (
                <div className={`w-1.5 h-1.5 rounded-full ${k.ok === true ? "bg-[var(--success)] shadow-[0_0_4px_var(--success)]" : "bg-[var(--danger)] shadow-[0_0_4px_var(--danger)]"}`} />
              )}
            </div>
            <div className={`font-mono font-bold text-[18px] ${k.ok === true ? "text-[var(--success)]" : k.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Funnel + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="text-[13px] font-semibold text-[var(--ink-1)]">Salud del funnel · hoy</div>
            <div className="text-[11px] text-[var(--ink-4)]">ATC ≥10% · Checkout ≥50% · Compra ≥50%</div>
          </div>
          <div className="p-4 space-y-2.5">
            {funnelItems.map(f => <FunnelBar key={f.label} {...f} max={funnelMax} />)}
            {m.checkouts > 0 && m.purchases === 0 && (
              <div className="mt-3 bg-[var(--warning-soft)] border border-[rgba(245,158,11,0.2)] rounded-lg p-3 flex gap-2">
                <AlertTriangle size={13} className="text-[var(--warning)] mt-0.5 flex-shrink-0" />
                <div className="text-[12px] text-[var(--ink-2)]"><strong>Checkouts sin compras</strong> — Revisa precio final, gastos de envío o método de pago.</div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <RoasHeatmap allMetrics={allMetrics} beRoas={settings.beRoas} />
          <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]">
            <div className="p-4 border-b border-[var(--border)]">
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">Tendencia 7 días</div>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={last7}>
                  <defs>
                    <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#111111" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#111111" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradGasto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C8A96A" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#C8A96A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--ink-4)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--ink-4)" }} width={35} />
                  <Tooltip contentStyle={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                    formatter={(v, name) => [`${v} €`, name === "ingresos" ? "Ingresos" : "Gasto"]} />
                  <Area type="monotone" dataKey="ingresos" stroke="var(--ink-1)" strokeWidth={2} fill="url(#gradIngresos)" dot={false} />
                  <Area type="monotone" dataKey="gasto" stroke="var(--gold)" strokeWidth={2} fill="url(#gradGasto)" dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-4 text-[11px] text-[var(--ink-3)] mt-1">
                <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-[var(--ink-1)] inline-block" /> Ingresos</span>
                <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-[var(--gold)] inline-block" /> Gasto</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
