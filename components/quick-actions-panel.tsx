"use client";
import { useState } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { analyzeMetrics } from "@/lib/ai-engine";
import { Zap, ChevronUp, X, ArrowRight, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import type { Section } from "./sidebar";
import { cx } from "@/lib/utils";

interface DailyMetrics {
  spend: number; revenue: number; clicks: number; impressions: number;
  atc: number; checkouts: number; purchases: number;
}

interface QuickAction {
  priority: "critical" | "high" | "medium";
  label: string;
  detail: string;
  section: Section;
  cta: string;
}

function computeActions(
  todayMetrics: DailyMetrics | null,
  allMetrics: Record<string, DailyMetrics>,
  settings: { beRoas: number; beCpa: number; ctrTarget: number; aov: number }
): QuickAction[] {
  const actions: QuickAction[] = [];

  if (!todayMetrics || todayMetrics.spend === 0) {
    actions.push({
      priority: "high",
      label: "Registra las métricas de hoy",
      detail: "Sin datos de hoy, la IA no puede analizar tus campañas",
      section: "dashboard",
      cta: "Ir al Dashboard",
    });
    return actions;
  }

  const roas = todayMetrics.spend > 0 ? todayMetrics.revenue / todayMetrics.spend : 0;
  const cpa = todayMetrics.purchases > 0 ? todayMetrics.spend / todayMetrics.purchases : 0;
  const ctr = todayMetrics.impressions > 0 ? (todayMetrics.clicks / todayMetrics.impressions) * 100 : 0;
  const checkoutRate = todayMetrics.atc > 0 ? (todayMetrics.checkouts / todayMetrics.atc) * 100 : 0;
  const analysis = analyzeMetrics(allMetrics, settings.beCpa, settings.beRoas, settings.ctrTarget);

  // Critical: ROAS way below BE
  if (settings.beRoas > 0 && roas > 0 && roas < settings.beRoas * 0.7) {
    actions.push({
      priority: "critical",
      label: "ROAS crítico — pausa campañas",
      detail: `ROAS actual ${roas.toFixed(2)}× vs BE ${settings.beRoas}×`,
      section: "campaigns",
      cta: "Ver campañas",
    });
  }

  // Critical: CPA way above BE
  if (settings.beCpa > 0 && cpa > 0 && cpa > settings.beCpa * 2) {
    actions.push({
      priority: "critical",
      label: "CPA insostenible — revisar urgente",
      detail: `CPA ${cpa.toFixed(0)}€ · BE máx ${settings.beCpa}€`,
      section: "dashboard",
      cta: "Ver análisis",
    });
  }

  // High: CTR too low
  if (settings.ctrTarget > 0 && ctr > 0 && ctr < settings.ctrTarget * 0.5) {
    actions.push({
      priority: "high",
      label: "CTR muy bajo — cambia el hook",
      detail: `CTR ${ctr.toFixed(2)}% (objetivo: ${settings.ctrTarget}%)`,
      section: "creatives",
      cta: "Ver creativos",
    });
  }

  // High: Checkouts without purchases
  if (todayMetrics.checkouts > 2 && todayMetrics.purchases === 0) {
    actions.push({
      priority: "critical",
      label: "Checkouts sin compras — audita pago",
      detail: `${todayMetrics.checkouts} checkouts, 0 compras hoy`,
      section: "checklist",
      cta: "Ver checklist",
    });
  }

  // High: checkout drop-off
  if (todayMetrics.atc > 5 && checkoutRate < 25) {
    actions.push({
      priority: "high",
      label: "Alto abandono en checkout",
      detail: `Solo ${checkoutRate.toFixed(0)}% llega al pago (obj: ≥50%)`,
      section: "orders",
      cta: "Ver pedidos",
    });
  }

  // Scale opportunity
  if (analysis.decision === "scale" && analysis.score >= 70) {
    actions.push({
      priority: "medium",
      label: "Oportunidad de escalar",
      detail: `Score IA ${analysis.score}/100 — ROAS sobre BE`,
      section: "campaigns",
      cta: "Ver protocolo escala",
    });
  }

  // Medium: no creatives set up
  if (actions.length < 2) {
    actions.push({
      priority: "medium",
      label: "Revisa el dashboard de hoy",
      detail: `Score: ${analysis.score}/100 · ${analysis.headline.slice(0, 60)}`,
      section: "dashboard",
      cta: "Ver análisis completo",
    });
  }

  return actions.slice(0, 4);
}

interface Props {
  onNavigate: (s: Section) => void;
}

export function QuickActionsPanel({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { settings } = useSettings();
  const today = new Date().toISOString().split("T")[0];
  const [allMetrics] = useLocalStorage<Record<string, DailyMetrics>>("ecc-daily-metrics", {});
  const todayMetrics = allMetrics[today] ?? null;

  const actions = computeActions(todayMetrics, allMetrics, settings);
  const criticalCount = actions.filter(a => a.priority === "critical").length;
  const hasUrgent = criticalCount > 0;

  if (dismissed) return null;

  const priorityConfig = {
    critical: { icon: AlertTriangle, color: "text-[var(--danger)]", bg: "bg-[var(--danger-soft)] border-[rgba(239,68,68,0.2)]", dot: "bg-[var(--danger)]" },
    high:     { icon: Zap,           color: "text-[var(--warning)]", bg: "bg-[var(--warning-soft)] border-[rgba(245,158,11,0.2)]", dot: "bg-[var(--warning)]" },
    medium:   { icon: TrendingUp,    color: "text-[var(--ink-3)]",   bg: "bg-white border-[var(--border)]",                         dot: "bg-[var(--ink-4)]" },
  };

  return (
    <div className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-2">
      {/* Expanded panel */}
      {open && (
        <div className="w-[320px] bg-white border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-inset)]">
            <div className="flex items-center gap-2">
              <Zap size={13} className="text-[var(--gold-deep)]" />
              <span className="text-[12px] font-bold text-[var(--ink-1)]">Acciones del día</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-[var(--ink-4)] hover:text-[var(--ink-1)]">
              <ChevronUp size={14} />
            </button>
          </div>
          <div className="p-3 space-y-2">
            {actions.map((action, i) => {
              const cfg = priorityConfig[action.priority];
              const Icon = cfg.icon;
              return (
                <div key={i} className={cx("rounded-xl border p-3", cfg.bg)}>
                  <div className="flex items-start gap-2 mb-2">
                    <Icon size={12} className={cx("mt-0.5 flex-shrink-0", cfg.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-[var(--ink-1)] leading-tight">{action.label}</div>
                      <div className="text-[11px] text-[var(--ink-3)] mt-0.5">{action.detail}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => { onNavigate(action.section); setOpen(false); }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[var(--ink-1)] hover:gap-2 transition-all"
                  >
                    {action.cta} <ArrowRight size={11} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="px-4 py-2.5 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-[10px] text-[var(--ink-4)]">Basado en datos de hoy</span>
            <button onClick={() => { setOpen(false); setDismissed(true); }} className="text-[10px] text-[var(--ink-4)] hover:text-[var(--ink-2)]">
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cx(
          "flex items-center gap-2 px-4 h-11 rounded-full shadow-lg font-semibold text-[13px] transition-all hover:scale-105 active:scale-95",
          hasUrgent
            ? "bg-[var(--danger)] text-white"
            : "bg-[var(--ink-1)] text-white"
        )}
      >
        {hasUrgent ? (
          <AlertTriangle size={14} />
        ) : (
          <Zap size={14} className="text-[var(--gold)]" />
        )}
        <span>{hasUrgent ? `${criticalCount} urgente${criticalCount > 1 ? "s" : ""}` : "Acciones"}</span>
        {actions.length > 0 && (
          <span className={cx(
            "w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0",
            hasUrgent ? "bg-white/20 text-white" : "bg-white/20 text-white"
          )}>
            {actions.length}
          </span>
        )}
      </button>
    </div>
  );
}
