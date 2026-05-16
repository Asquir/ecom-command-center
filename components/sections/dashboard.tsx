"use client";
import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { useToast } from "@/components/ui/toast";
import { downloadCSV } from "@/lib/export";
import { eur, pct } from "@/lib/utils";
import { analyzeMetrics, type AIAnalysis, type ProductContext } from "@/lib/ai-engine";
import { alert as alertFanout, scheduleDailySummary } from "@/lib/notifications";
import { type TgCfg, DEFAULT_TG_CFG } from "@/lib/integrations/telegram";
import { syncMetaToday, type MetaCfg, DEFAULT_META_CFG } from "@/lib/integrations/meta";
import { type Product, type CampaignStructure } from "@/lib/data";
import {
  Zap, AlertTriangle, Clock, Edit3, TrendingUp, TrendingDown,
  BarChart2, CheckCircle, XCircle, Brain, ChevronRight, RefreshCw, Wifi, DollarSign, Calendar
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

interface DailyMetrics {
  spend: number; revenue: number; clicks: number; impressions: number;
  atc: number; checkouts: number; purchases: number;
  source?: "manual" | "meta";
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

const SCALE_PHASES = [
  {
    day: "D+1",
    title: "Primer movimiento",
    color: "border-[rgba(34,197,94,0.3)] bg-[var(--success-soft)]",
    badge: "bg-[var(--success)] text-white",
    actions: [
      "Identifica los 2 adsets con mejor ROAS. Aumenta su presupuesto diario un +20%.",
      "NO toques los adsets perdedores todavía.",
      "Anota el nuevo spend diario total como referencia.",
    ],
  },
  {
    day: "D+2–3",
    title: "Confirmación",
    color: "border-[rgba(200,169,106,0.3)] bg-[var(--gold-soft)]",
    badge: "bg-[var(--gold)] text-[var(--ink-1)]",
    actions: [
      "Si ROAS se mantiene ≥ BE × 1.2 → sube otro +20% el presupuesto.",
      "Si ROAS cae entre BE y BE × 1.2 → mantén sin tocar 24h más.",
      "Si ROAS cae por debajo de BE → revierte el aumento y vuelve al presupuesto original.",
    ],
  },
  {
    day: "D+4–7",
    title: "Expansión controlada",
    color: "border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.05)]",
    badge: "bg-[rgba(59,130,246,0.8)] text-white",
    actions: [
      "Si sigues rentable: duplica el adset ganador en un nuevo adset con mismo creativo.",
      "Testea 1 nueva audiencia lookalike (1-3%) del mejor adset.",
      "Empieza a preparar variaciones del creativo ganador (hook diferente, mismo ángulo).",
    ],
  },
  {
    day: "D+8+",
    title: "Escalado CBO",
    color: "border-[var(--border)] bg-white",
    badge: "bg-[var(--ink-1)] text-white",
    actions: [
      "Consolida los adsets ganadores en una campaña CBO si no lo tienes ya.",
      "Presupuesto total = spend diario × 1.5. CBO lo distribuye automáticamente.",
      "Apaga los adsets que llevan 3+ días por debajo de BE. Sin piedad.",
    ],
  },
];

function ScaleProtocolModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-[var(--success)] text-white px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5">Protocolo de escalado</div>
            <div className="text-[15px] font-bold">Plan de acción — ESCALAR</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center">
            <XCircle size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="text-[12px] text-[var(--ink-3)] bg-[var(--success-soft)] border border-[rgba(34,197,94,0.2)] rounded-xl p-3 leading-relaxed">
            ✅ Todos los criterios de escalado están cumplidos. Sigue este protocolo de 4 fases para escalar sin quemar la cuenta.
          </div>
          {SCALE_PHASES.map(phase => (
            <div key={phase.day} className={`border rounded-xl p-4 ${phase.color}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${phase.badge}`}>{phase.day}</span>
                <span className="text-[13px] font-semibold text-[var(--ink-1)]">{phase.title}</span>
              </div>
              <ul className="space-y-1.5">
                {phase.actions.map((a, i) => (
                  <li key={i} className="flex gap-2 text-[12px] text-[var(--ink-2)] leading-relaxed">
                    <span className="text-[var(--ink-4)] flex-shrink-0 mt-0.5">·</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="text-[11px] text-[var(--ink-4)] text-center pt-1">
            Regla de oro: nunca más del +20% de aumento en 24h. El algoritmo necesita tiempo para re-aprender.
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetPacing({ allMetrics, monthlyBudget }: { allMetrics: DailyRecord; monthlyBudget: number }) {
  if (monthlyBudget <= 0) return null;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `${year}-${month}-`;
  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const monthSpend = Object.entries(allMetrics)
    .filter(([k]) => k.startsWith(prefix))
    .reduce((s, [, v]) => s + v.spend, 0);
  const dailyIdeal = monthlyBudget / daysInMonth;
  const projectedSpend = dayOfMonth > 0 ? (monthSpend / dayOfMonth) * daysInMonth : 0;
  const pct = Math.min(100, (monthSpend / monthlyBudget) * 100);
  const pacing = monthSpend / (dailyIdeal * dayOfMonth);
  const overBudget = monthSpend > monthlyBudget;
  const overPacing = pacing > 1.15;
  const underPacing = pacing < 0.85;
  const color = overBudget ? "bg-[var(--danger)]" : overPacing ? "bg-[var(--warning)]" : "bg-[var(--success)]";
  const status = overBudget ? "Presupuesto agotado" : overPacing ? "Gastando demasiado rápido" : underPacing ? "Por debajo del ritmo" : "En ritmo";
  const statusColor = overBudget ? "text-[var(--danger)]" : overPacing ? "text-[var(--warning)]" : underPacing ? "text-[var(--info)]" : "text-[var(--success)]";

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] font-semibold text-[var(--ink-2)]">Pacing del presupuesto mensual</div>
        <span className={`text-[10px] font-bold ${statusColor}`}>{status}</span>
      </div>
      <div className="h-2.5 bg-[var(--bg-inset)] rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          { label: "Gastado", value: `€${monthSpend.toFixed(0)}`, sub: `de €${monthlyBudget}` },
          { label: "Restante", value: `€${Math.max(0, monthlyBudget - monthSpend).toFixed(0)}`, sub: `${daysLeft}d restantes` },
          { label: "Ritmo diario", value: `€${(monthSpend / (dayOfMonth || 1)).toFixed(0)}`, sub: `ideal €${dailyIdeal.toFixed(0)}/d` },
          { label: "Proyección", value: `€${projectedSpend.toFixed(0)}`, sub: `al fin de mes`, ok: projectedSpend <= monthlyBudget },
        ].map(s => (
          <div key={s.label}>
            <div className="text-[9px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-0.5">{s.label}</div>
            <div className={`font-mono font-bold text-[13px] ${"ok" in s && s.ok === false ? "text-[var(--danger)]" : "ok" in s && s.ok === true ? "text-[var(--success)]" : "text-[var(--ink-1)]"}`}>{s.value}</div>
            <div className="text-[9px] text-[var(--ink-4)]">{s.sub}</div>
          </div>
        ))}
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
  const [showProtocol, setShowProtocol] = useState(false);
  const allGatesPass = analysis.scaleGates.length > 0 && analysis.scaleGates.every(g => g.passed);
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

          {/* Scale protocol CTA */}
          {allGatesPass && analysis.decision === "scale" && (
            <button onClick={() => setShowProtocol(true)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[var(--success)] text-white font-semibold text-[13px] hover:opacity-90 transition-opacity">
              <span className="flex items-center gap-2">
                <TrendingUp size={14} /> Ver protocolo de escalado paso a paso
              </span>
              <ChevronRight size={14} />
            </button>
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
      {showProtocol && <ScaleProtocolModal onClose={() => setShowProtocol(false)} />}
    </div>
  );
}

function TodayBrief({ productName, campaignType, country, testingDay, roas, beRoas, spend, purchases }: {
  productName: string; campaignType?: string; country: string;
  testingDay: number | null; roas: number; beRoas: number; spend: number; purchases: number;
}) {
  const phaseLabel = testingDay == null ? null
    : testingDay === 1 ? "Lanzamiento"
    : testingDay <= 3 ? "Señales tempranas"
    : testingDay <= 5 ? "Validación"
    : testingDay <= 7 ? "Decisión"
    : "Escalado activo";

  const countryFlag = country === "ES" ? "🇪🇸" : country === "US" ? "🇺🇸" : country === "MX" ? "🇲🇽" : country === "BR" ? "🇧🇷" : "🌍";
  const campColor = campaignType === "ABO" ? "text-blue-600 bg-blue-50 border-blue-200"
                  : campaignType === "CBO" ? "text-purple-600 bg-purple-50 border-purple-200"
                  : campaignType === "ASC" ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                  : "text-[var(--ink-3)] bg-[var(--bg-inset)] border-[var(--border)]";

  const phaseColor = testingDay == null ? "bg-[var(--bg-inset)] border-[var(--border)] text-[var(--ink-4)]"
    : testingDay <= 3 ? "bg-blue-50 border-blue-200 text-blue-700"
    : testingDay <= 5 ? "bg-amber-50 border-amber-200 text-amber-700"
    : testingDay <= 7 ? "bg-orange-50 border-orange-200 text-orange-700"
    : "bg-emerald-50 border-emerald-200 text-emerald-700";

  // Generate today's 3 specific actions based on day + performance
  const actions: string[] = [];
  if (testingDay === 1) {
    actions.push("No toques nada hoy. El algoritmo está en fase de aprendizaje.");
    actions.push("Verifica que el pixel está disparando correctamente en cada evento.");
    if (campaignType === "ABO") actions.push("Revisa el spend por ad set — detecta cuál recibe más presupuesto.");
    else if (campaignType === "CBO") actions.push("Confirma que la CBO está distribuyendo entre todos los ad sets.");
    else actions.push("Asegúrate de que los creativos están todos activos y aprobados.");
  } else if (testingDay === 2 || testingDay === 3) {
    if (purchases === 0 && spend > 0) {
      actions.push("0 compras. Normal hasta día 3 — no pauses todavía.");
      actions.push("Fíjate en el ATC: si hay carrito pero 0 compras, el problema es el checkout o precio.");
    } else {
      actions.push(`${purchases} compra(s). Compara CPA vs break-even antes de escalar.`);
    }
    actions.push("Identifica qué creativo tiene mejor CTR — ese es tu ganador provisional.");
    if (campaignType === "ABO") actions.push("Si un ad set tiene 0 spend en 48h, está perdido — considera pausarlo.");
  } else if (testingDay != null && testingDay >= 4 && testingDay <= 5) {
    if (beRoas > 0 && roas >= beRoas) {
      actions.push(`ROAS ${roas.toFixed(2)}× por encima del BE. Día clave para validar consistencia.`);
      actions.push("Si hoy repites ROAS ≥ BE, tienes señal verde. Prepara el plan de escala.");
    } else {
      actions.push("ROAS por debajo del BE. Identifica si el problema es creativo, copy o precio.");
      actions.push("Testea una variante de precio +10% o una oferta de urgencia.");
    }
    if (campaignType === "CBO") actions.push("No ajustes el presupuesto CBO todavía — necesita mínimo 7 días de datos.");
  } else if (testingDay === 6 || testingDay === 7) {
    actions.push("Día de decisión. Consolida los datos de toda la semana.");
    if (beRoas > 0 && roas >= beRoas) {
      actions.push("Con 2+ días rentables, tienes base para escalar. Usa el protocolo de escalado.");
    } else {
      actions.push("Sin rentabilidad consistente en 7 días, considera pausar y revisar oferta/creativo.");
    }
    actions.push("Documenta los aprendizajes en la sección Productos antes de decidir.");
  } else if (testingDay && testingDay >= 8) {
    if (beRoas > 0 && roas >= beRoas * 1.2) {
      actions.push("Rendimiento sólido. Considera +20% de presupuesto si llevas 3 días seguidos rentables.");
    } else {
      actions.push("En fase de escalado, mantén la consistencia. No escales si el ROAS baja.");
    }
    actions.push("Monitoriza la frecuencia de anuncios — si supera 3.0, renueva creativos.");
    if (campaignType === "ABO") actions.push("Escala solo el ad set ganador, +20% cada 3 días máximo.");
    else if (campaignType === "CBO") actions.push("Sube presupuesto de campaña, no de ad sets individuales.");
  } else {
    // No testing day set
    actions.push("Configura la fecha de inicio en la sección Planner para recibir guía día a día.");
  }

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={13} className="text-[var(--ink-4)] flex-shrink-0" />
          <div className="text-[10px] font-bold text-[var(--ink-4)] uppercase tracking-widest">Situación de hoy</div>
          {testingDay && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${phaseColor}`}>
              D{testingDay} · {phaseLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {campaignType && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${campColor}`}>{campaignType}</span>
          )}
          {country && <span className="text-[14px]">{countryFlag}</span>}
        </div>
      </div>
      {productName && (
        <div className="text-[15px] font-bold text-[var(--ink-1)] mb-3">
          {testingDay ? `Día ${testingDay} de testing — ` : ""}{productName}
        </div>
      )}
      <div className="space-y-2">
        {actions.map((a, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5 ${i === 0 ? "bg-[var(--ink-1)] text-white" : "bg-[var(--bg-inset)] text-[var(--ink-3)] border border-[var(--border)]"}`}>
              {i + 1}
            </span>
            <span className={`text-[12px] leading-relaxed ${i === 0 ? "font-semibold text-[var(--ink-1)]" : "text-[var(--ink-2)]"}`}>{a}</span>
          </div>
        ))}
      </div>
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
  const [showGuide, setShowGuide] = useState(false);
  const n = (v: string) => parseFloat(v) || 0;

  const GUIDE_STEPS = [
    { step: "1", text: "Abre Meta Ads Manager → columna izquierda 'Campañas'", label: "Ir a Meta →", url: "https://adsmanager.facebook.com/" },
    { step: "2", text: "En el panel de métricas, filtra por 'Hoy' en el selector de fechas", label: null, url: null },
    { step: "3", text: "Copia los totales de abajo: Importe gastado, Compras, Valor de conversión de compras, Clics en el enlace, Impresiones, Añadir al carrito, Inicio del proceso de pago", label: null, url: null },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div>
        <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Dashboard · Hoy</div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">
          {initial ? "Editar métricas de hoy" : "¿Cuánto gastaste y vendiste hoy?"}
        </h1>
      </div>

      {/* Source explainer — always visible */}
      <div className="bg-[var(--gold-soft)] border border-[rgba(200,169,106,0.25)] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-[18px] leading-none mt-0.5">📋</div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-[var(--ink-1)] mb-1">
              Copia los totales del día de Meta Ads Manager
            </div>
            <div className="text-[12px] text-[var(--ink-2)] leading-relaxed mb-2">
              Son los números de <strong>todas tus campañas combinadas</strong> para hoy. No los de una sola campaña — los totales.
              Tarda menos de 2 minutos.
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="https://adsmanager.facebook.com/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black transition-colors">
                Abrir Meta Ads Manager
              </a>
              <button onClick={() => setShowGuide(g => !g)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-[rgba(200,169,106,0.3)] text-[var(--ink-2)] hover:bg-[rgba(200,169,106,0.1)] transition-colors">
                {showGuide ? "Ocultar guía" : "¿Dónde encuentro los datos? →"}
              </button>
            </div>
          </div>
        </div>
        {showGuide && (
          <div className="mt-4 pt-4 border-t border-[rgba(200,169,106,0.2)] space-y-2.5">
            {GUIDE_STEPS.map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--ink-1)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{s.step}</div>
                <div className="text-[12px] text-[var(--ink-2)] flex-1 leading-relaxed">{s.text}
                  {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-[var(--gold-deep)] font-semibold hover:underline">{s.label}</a>}
                </div>
              </div>
            ))}
            <div className="bg-white/60 rounded-lg p-3 mt-1">
              <div className="text-[10px] font-bold text-[var(--ink-4)] uppercase mb-1.5">Campos de Meta → campos de aquí</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[11px] text-[var(--ink-2)]">
                <span>Importe gastado → <strong>Gasto</strong></span>
                <span>Valor de conv. compra → <strong>Ingresos</strong></span>
                <span>Compras → <strong>Compras</strong></span>
                <span>Clics en enlace → <strong>Clics</strong></span>
                <span>Impresiones → <strong>Impresiones</strong></span>
                <span>Añadir al carrito → <strong>ATC</strong></span>
                <span>Inicio del pago → <strong>Inicio de pago</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Disambiguation — why 3 sections */}
      <details className="group">
        <summary className="cursor-pointer list-none flex items-center gap-2 text-[12px] text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors select-none">
          <ChevronRight size={13} className="transition-transform group-open:rotate-90" />
          ¿Para qué sirven entonces Campañas y Creativos?
        </summary>
        <div className="mt-2 ml-5 space-y-2">
          {[
            { icon: "📊", title: "Dashboard (aquí)", desc: "Metes los TOTALES del día una vez. La IA te dice qué hacer. Es lo único que necesitas hacer cada día." },
            { icon: "📣", title: "Campañas (opcional)", desc: "Registra el rendimiento ACUMULADO de cada campaña por separado. Útil si tienes varias campañas y quieres ver cuál vale más. No hace falta actualizarlo a diario." },
            { icon: "🎬", title: "Creativos (opcional)", desc: "Biblioteca de tus anuncios. Guarda hooks, ángulos y resultados para saber qué creativo funciona mejor. Actualiza cuando quieras, no cada día." },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-2.5 p-3 bg-white border border-[var(--border)] rounded-xl">
              <span className="text-[16px] leading-none mt-0.5">{item.icon}</span>
              <div>
                <div className="text-[12px] font-semibold text-[var(--ink-1)]">{item.title}</div>
                <div className="text-[11px] text-[var(--ink-3)] leading-relaxed">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* Product context */}
      {settings.productName && (
        <div className="flex items-center justify-between p-3 bg-[var(--bg-inset)] border border-[var(--border)] rounded-xl">
          <div className="text-[12px] text-[var(--ink-2)]">
            Producto activo: <strong className="text-[var(--ink-1)]">{settings.productName}</strong>
          </div>
          <div className="flex gap-4 text-[11px] text-[var(--ink-4)]">
            {settings.beRoas > 0 && <span>BE ROAS <strong className="font-mono text-[var(--gold-deep)]">{settings.beRoas}×</strong></span>}
            {settings.beCpa > 0 && <span>BE CPA <strong className="font-mono text-[var(--gold-deep)]">{eur(settings.beCpa)}</strong></span>}
          </div>
        </div>
      )}

      {/* The actual form */}
      <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        {/* Row 1: the 2 most important */}
        <div className="p-5 space-y-4">
          <div className="text-[11px] font-bold text-[var(--ink-4)] uppercase tracking-widest">Lo más importante</div>
          <div className="grid grid-cols-2 gap-4">
            <NumInput label="Gasto en ads" hint="Importe gastado hoy" value={spend} onChange={setSpend} suffix="€" />
            <NumInput label="Ingresos" hint="Valor conv. de compra" value={revenue} onChange={setRevenue} suffix="€" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <NumInput label="Compras" hint="Nº de pedidos" value={purchases} onChange={setPurchases} />
            <NumInput label="Add to Cart" hint="Añadir al carrito" value={atc} onChange={setAtc} />
            <NumInput label="Inicio de pago" hint="Checkout iniciado" value={checkouts} onChange={setCheckouts} />
          </div>
        </div>

        {/* Row 2: traffic (secondary) */}
        <div className="border-t border-[var(--border)] px-5 py-4 bg-[var(--bg-inset)]">
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-3">Tráfico · opcional pero útil para el CTR</div>
          <div className="grid grid-cols-2 gap-4">
            <NumInput label="Impresiones" value={impressions} onChange={setImpressions} />
            <NumInput label="Clics al enlace" value={clicks} onChange={setClicks} />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--border)]">
          <button onClick={() => { if (n(spend) > 0) onSave({ spend: n(spend), revenue: n(revenue), clicks: n(clicks), impressions: n(impressions), atc: n(atc), checkouts: n(checkouts), purchases: n(purchases) }); }}
            disabled={!n(spend)}
            className="w-full py-3 rounded-xl bg-[var(--ink-1)] text-white font-semibold text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
            <Brain size={16} /> Analizar y ver decisión de la IA
          </button>
          {!n(spend) && (
            <div className="text-center text-[11px] text-[var(--ink-4)] mt-2">Mínimo necesario: el gasto de hoy</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TruePnL({ revenue, adSpend, purchases, margin, shopifyPlan }: {
  revenue: number; adSpend: number; purchases: number; margin: number; shopifyPlan?: "basic" | "standard" | "advanced";
}) {
  const shopifyTxPct = shopifyPlan === "advanced" ? 0.005 : shopifyPlan === "standard" ? 0.01 : 0.02;
  const shopifyFixed = 0.30;
  const shopifyFees = revenue * shopifyTxPct + purchases * shopifyFixed;
  const grossProfit = revenue * (margin / 100);
  const netProfit = grossProfit - adSpend - shopifyFees;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const cogsAndShipping = revenue - grossProfit;

  const rows = [
    { label: "Ingresos brutos", value: revenue, sign: null },
    { label: `COGS + envío (${(100 - margin).toFixed(0)}%)`, value: -cogsAndShipping, sign: "minus" },
    { label: "Gasto en ads", value: -adSpend, sign: "minus" },
    { label: `Fees Shopify (${(shopifyTxPct * 100).toFixed(1)}% + €${shopifyFixed}/pedido)`, value: -shopifyFees, sign: "minus" },
  ];

  const profitColor = netProfit > 0 ? "text-[var(--success)]" : netProfit < 0 ? "text-[var(--danger)]" : "text-[var(--ink-3)]";

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="px-4 pt-4 pb-2 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold text-[var(--ink-1)]">P&L real · hoy</div>
          <div className="text-[11px] text-[var(--ink-4)]">Beneficio neto después de todos los costes</div>
        </div>
        <div className={`text-right ${profitColor}`}>
          <div className="font-mono font-bold text-[20px]">{eur(netProfit)}</div>
          <div className="text-[10px] font-semibold">{netMargin.toFixed(1)}% margen neto</div>
        </div>
      </div>
      <div className="p-4 space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between text-[12px]">
            <span className={`${row.sign === "minus" ? "text-[var(--ink-3)]" : "font-semibold text-[var(--ink-1)]"}`}>{row.label}</span>
            <span className={`font-mono font-semibold ${row.sign === "minus" ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>
              {row.sign === "minus" ? `−${eur(Math.abs(row.value))}` : eur(row.value)}
            </span>
          </div>
        ))}
        <div className="border-t border-dashed border-[var(--border)] pt-1.5 mt-1 flex items-center justify-between text-[13px]">
          <span className="font-bold text-[var(--ink-1)]">Beneficio neto</span>
          <span className={`font-mono font-bold text-[15px] ${profitColor}`}>{eur(netProfit)}</span>
        </div>
        {margin === 0 && (
          <div className="text-[11px] text-[var(--ink-4)] pt-1">
            ⚠ Configura tu margen bruto en Ajustes → Benchmarks para un cálculo preciso.
          </div>
        )}
      </div>
    </div>
  );
}

function CpmFatigueAlert({ allMetrics, todayCpm }: { allMetrics: DailyRecord; todayCpm: number }) {
  if (todayCpm <= 0) return null;
  const days = Object.keys(allMetrics).sort().slice(-8, -1); // last 7 days excluding today
  const cpms = days.map(k => {
    const m = allMetrics[k];
    return m && m.impressions > 0 ? (m.spend / m.impressions) * 1000 : null;
  }).filter((v): v is number => v !== null);
  if (cpms.length < 3) return null;
  const avgCpm = cpms.reduce((a, b) => a + b, 0) / cpms.length;
  const pctChange = ((todayCpm - avgCpm) / avgCpm) * 100;
  if (pctChange < 20) return null;

  return (
    <div className="flex items-start gap-2.5 bg-[var(--warning-soft)] border border-[rgba(245,158,11,0.25)] rounded-xl p-3">
      <AlertTriangle size={13} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
      <div className="text-[12px] text-[var(--ink-2)]">
        <strong>CPM +{pctChange.toFixed(0)}% vs media 7d</strong> — Posible fatiga de creativos o audiencia saturando. Rota los anuncios o amplía la audiencia.
        <span className="text-[var(--ink-4)] ml-1">(Hoy {eur(todayCpm)} · Media {eur(avgCpm)})</span>
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
  const { settings, isPro } = useSettings();
  const { success, warning } = useToast();
  const today = todayKey();
  const [allMetrics, setAllMetrics] = useLocalStorage<DailyRecord>("ecc-daily-metrics", {});
  const [tgCfg] = useLocalStorage<TgCfg>("ecc-int-telegram", DEFAULT_TG_CFG);
  const [metaCfg, setMetaCfg] = useLocalStorage<MetaCfg>("ecc-int-meta", DEFAULT_META_CFG);
  const [products] = useLocalStorage<Product[]>("ecc-products", []);
  const [plannerStart] = useLocalStorage<string | null>("ecc-planner-start", null);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(false);
  const primeTime = usePrimeTimeCountdown(settings.country);
  const todayLabel = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const notifiedRef = useRef(false);
  const autoSyncedRef = useRef(false);

  const todayData = allMetrics[today] ?? null;
  const saveMetrics = (m: DailyMetrics) => { setAllMetrics(prev => ({ ...prev, [today]: m })); setEditing(false); };

  const todayRoas = todayData && todayData.spend > 0 ? todayData.revenue / todayData.spend : 0;

  useEffect(() => {
    if (notifiedRef.current || !todayData || !settings.notifyKill) return;
    if (settings.beRoas > 0 && todayRoas > 0 && todayRoas < settings.beRoas * 0.8) {
      const tg = tgCfg?.botToken ? tgCfg : null;
      alertFanout(
        "⚠️ ROAS por debajo del break-even",
        `ROAS actual: ${todayRoas.toFixed(2)}× · BE: ${settings.beRoas}× — Revisa tus campañas.`,
        tg,
        `⚠️ <b>ROAS por debajo del break-even</b>\n\nROAS actual: <b>${todayRoas.toFixed(2)}×</b>\nBreak-even: ${settings.beRoas}×\n\nRevisa tus campañas ahora.`,
      );
      notifiedRef.current = true;
    }
  }, [todayData]);

  // Daily summary at 22:00 local
  useEffect(() => {
    const tg = tgCfg?.botToken ? tgCfg : null;
    const cleanup = scheduleDailySummary(() => {
      const m = allMetrics[today];
      if (!m || m.spend === 0) return null;
      const roas = m.spend > 0 ? (m.revenue / m.spend).toFixed(2) : "0";
      const profit = (m.revenue * (settings.margin / 100) - m.spend).toFixed(2);
      const decision = parseFloat(roas) >= settings.beRoas ? "✅ Rentable" : "⚠️ Por debajo de BE";
      const text = `📊 <b>Resumen del día — ${today}</b>\n\nGasto: <b>€${m.spend.toFixed(2)}</b>\nIngresos: <b>€${m.revenue.toFixed(2)}</b>\nROAS: <b>${roas}×</b>\nCompras: <b>${m.purchases}</b>\nBeneficio neto: <b>€${profit}</b>\n\n${decision}`;
      return { text };
    }, tg);
    return cleanup;
  }, [allMetrics, tgCfg, settings.beRoas, settings.margin, today]);

  const runMetaSync = async () => {
    if (!metaCfg.accessToken || syncing) return;
    setSyncing(true);
    const result = await syncMetaToday(metaCfg);
    setSyncing(false);
    if ("error" in result) {
      if (result.error === "TOKEN_EXPIRED") warning("Token Meta expirado", "Ve a Business Manager y genera un nuevo System User token.");
      else warning("Error al sincronizar Meta", result.error);
      return;
    }
    const existing = allMetrics[result.date];
    // Don't overwrite manual entries
    if (existing?.source === "manual" || (existing && !existing.source)) {
      success("Datos manuales presentes", "No se sobreescribieron tus métricas manuales. Edítalas para actualizarlas.");
      return;
    }
    setAllMetrics(prev => ({ ...prev, [result.date]: result.patch }));
    setMetaCfg(prev => ({ ...prev, lastSync: Date.now() }));
    success("Meta sincronizado", `Gasto: €${result.patch.spend.toFixed(2)} · Ingresos: €${result.patch.revenue.toFixed(2)}`);
  };

  // Auto-sync if Meta configured, Pro, and 4h+ since last sync
  useEffect(() => {
    if (autoSyncedRef.current || !isPro || !metaCfg.accessToken) return;
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    if (!metaCfg.lastSync || Date.now() - metaCfg.lastSync > FOUR_HOURS) {
      autoSyncedRef.current = true;
      void runMetaSync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, metaCfg.accessToken]);

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

  // Derive campaign type from the testing product matching the active product name
  const activeProduct = products.find(p =>
    p.status === "testing" &&
    (settings.productName ? p.name.toLowerCase().includes(settings.productName.toLowerCase().split(" ")[0]) : true)
  ) ?? products.find(p => p.status === "testing") ?? null;
  const campaignType = activeProduct?.campaignType ?? undefined;

  // Calculate testing day from planner start date
  const testingDay = (() => {
    if (!plannerStart) return null;
    const start = new Date(plannerStart);
    const diff = Math.floor((new Date().getTime() - start.getTime()) / 86_400_000) + 1;
    return diff >= 1 && diff <= 60 ? diff : null;
  })();

  const productCtx: ProductContext = {
    productName: settings.productName || undefined,
    campaignType: campaignType as CampaignStructure | undefined,
    country: settings.country || undefined,
  };

  const aiAnalysis = analyzeMetrics(allMetrics, settings.beCpa, settings.beRoas, settings.ctrTarget, productCtx);

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
        <div className="flex gap-2 flex-wrap items-center">
          {todayData?.source === "meta" && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgba(59,130,246,0.1)] text-blue-600 border border-[rgba(59,130,246,0.2)]">
              <Wifi size={9} /> auto · Meta
            </span>
          )}
          {isPro && metaCfg.accessToken && (
            <button onClick={runMetaSync} disabled={syncing}
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink-2)] hover:bg-[var(--bg-inset)] flex items-center gap-1.5 transition-colors disabled:opacity-50">
              <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Sincronizando…" : "Sync Meta"}
            </button>
          )}
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

      {/* Situación de hoy — personalized daily brief */}
      {(testingDay || settings.productName) && (
        <TodayBrief
          productName={settings.productName}
          campaignType={campaignType}
          country={settings.country}
          testingDay={testingDay}
          roas={roas}
          beRoas={settings.beRoas}
          spend={m.spend}
          purchases={m.purchases}
        />
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

      {/* Budget pacing */}
      <BudgetPacing allMetrics={allMetrics} monthlyBudget={settings.monthlyAdsBudget ?? 0} />

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

      {/* CPM fatigue warning */}
      <CpmFatigueAlert allMetrics={allMetrics} todayCpm={cpm} />

      {/* True P&L breakdown */}
      {settings.margin > 0 || m.purchases > 0 ? (
        <TruePnL
          revenue={m.revenue}
          adSpend={m.spend}
          purchases={m.purchases}
          margin={settings.margin}
        />
      ) : null}

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
