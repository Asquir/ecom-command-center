"use client";
import { useState } from "react";
import { KILL_RULES, SCALE_RULES } from "@/lib/data";
import { cx } from "@/lib/utils";
import { MoreHorizontal, TrendingUp, TrendingDown } from "lucide-react";

type RuleKind = "kill" | "scale";

function RuleCard({ rule, kind }: { rule: typeof KILL_RULES[0]; kind: RuleKind }) {
  const isKill = kind === "kill";
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={cx(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
          isKill
            ? "bg-[var(--danger-soft)] text-[var(--danger)] border-[rgba(220,38,38,0.2)]"
            : "bg-[var(--success-soft)] text-[var(--success)] border-[rgba(22,163,74,0.2)]"
        )}>
          {isKill ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
          {isKill ? "Apagar" : "Escalar"}
        </span>
        <button className="p-1 rounded hover:bg-[var(--bg-inset)]">
          <MoreHorizontal size={14} className="text-[var(--ink-4)]" />
        </button>
      </div>

      <div className="font-semibold text-[14px] text-[var(--ink-1)]">{rule.title}</div>

      <div className="bg-[var(--bg-inset)] border border-dashed border-[var(--border-strong)] rounded-lg p-3">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "auto 1fr" }}>
          <span className="text-[11px] font-semibold text-[var(--ink-4)] uppercase">SI</span>
          <span className="text-[12px] text-[var(--ink-1)] font-mono">{rule.when}</span>
          {"cond" in rule && rule.cond && (
            <>
              <span className="text-[11px] font-semibold text-[var(--ink-4)] uppercase">Y</span>
              <span className="text-[12px] text-[var(--ink-1)] font-mono">{rule.cond}</span>
            </>
          )}
          <span className="text-[11px] font-semibold text-[var(--ink-4)] uppercase">ENTONCES</span>
          <span className={cx("text-[12px] font-bold", isKill ? "text-[var(--danger)]" : "text-[var(--success)]")}>
            {rule.action}
          </span>
        </div>
      </div>

      <p className="text-[12px] text-[var(--ink-3)] leading-relaxed">{rule.why}</p>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-mono text-[var(--ink-4)] bg-[var(--bg-inset)] px-2 py-0.5 rounded">aplicada 0 veces hoy</span>
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--ink-3)] cursor-pointer">
          <input type="checkbox" defaultChecked className="accent-[var(--ink-1)]" />
          Activa
        </label>
      </div>
    </div>
  );
}

const SOFT_METRICS = [
  {
    metric: "Hook Rate",
    bands: [
      { range: "> 35%", label: "Hook fuerte", status: "good" },
      { range: "25–35%", label: "Aceptable", status: "warn" },
      { range: "< 25%", label: "Reescribir hook o primer segundo", status: "bad" },
    ],
  },
  {
    metric: "CTR",
    bands: [
      { range: "> 3%", label: "Muy bueno", status: "good" },
      { range: "2–3%", label: "Bueno", status: "good" },
      { range: "1.5–2%", label: "Aceptable", status: "warn" },
      { range: "< 1.5%", label: "Débil — revisar hook y ángulo", status: "bad" },
    ],
  },
  {
    metric: "CPC",
    bands: [
      { range: "Bajo (< 0.5 €)", label: "Tráfico barato — buen anuncio", status: "good" },
      { range: "Alto (> 1 €)", label: "Revisar hook, audiencia o ángulo", status: "bad" },
    ],
  },
  {
    metric: "CPM",
    bands: [
      { range: "Bajo (< 12 €)", label: "Meta acepta el creativo y la audiencia", status: "good" },
      { range: "Alto (> 18 €)", label: "Probar audiencia más amplia o creativo menos agresivo", status: "warn" },
    ],
  },
  {
    metric: "ATC vs Funnel",
    bands: [
      { range: "CTR alto + ATC bajo", label: "Revisar landing / oferta — no convierte", status: "warn" },
      { range: "ATC alto + IC bajo", label: "Revisar carrito / envío / precio final", status: "warn" },
      { range: "IC alto + Compra baja", label: "Revisar métodos de pago / confianza", status: "warn" },
    ],
  },
];

const TREE_NODES = {
  root: "¿Hay ventas?",
  no: {
    q: "¿Hay ATC?",
    no: { label: "Sin ATC", action: "Revisar creativo y hook", color: "danger" },
    yes: {
      q: "¿Hay checkout?",
      no: { label: "ATC sin IC", action: "Revisar landing / carrito / oferta", color: "warning" },
      yes: { label: "IC sin compra", action: "Revisar pagos, confianza, precio final", color: "warning" },
    },
  },
  yes: {
    q: "¿ROAS ≥ BE ROAS?",
    yes: { label: "ROAS ≥ BE", action: "Mantener activo o escalar +25%", color: "success" },
    no: { label: "ROAS < BE", action: "Optimizar creativos u oferta antes de apagar", color: "warning" },
  },
};

function TreeNode({ q, badge, color }: { q: string; badge?: string; color?: string }) {
  const borderColor = color === "success" ? "var(--success)" : color === "danger" ? "var(--danger)" : color === "warning" ? "var(--warning)" : "var(--border-strong)";
  return (
    <div className="inline-flex flex-col gap-1 px-3 py-2.5 bg-white border rounded-xl shadow-sm min-w-[180px]" style={{ borderColor }}>
      <div className="text-[12px] font-semibold text-[var(--ink-1)]">{q}</div>
      {badge && <div className={cx("text-[11px]", color === "success" ? "text-[var(--success)]" : color === "danger" ? "text-[var(--danger)]" : "text-[var(--warning)]")}>→ {badge}</div>}
    </div>
  );
}

export function Rules() {
  const [tab, setTab] = useState<"kill" | "scale" | "metrics" | "tree">("kill");

  const TABS = [
    { id: "kill" as const,    label: "Apagado",     count: KILL_RULES.length  },
    { id: "scale" as const,   label: "Escalado",    count: SCALE_RULES.length },
    { id: "metrics" as const, label: "Métricas blandas" },
    { id: "tree" as const,    label: "Árbol de decisión" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Decisión automatizada · 8 reglas</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Reglas de decisión</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">No apagues por miedo — apaga cuando una regla objetiva se cumpla.</p>
        </div>
        <button className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black">
          + Nueva regla
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-[var(--border)]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "text-[var(--ink-1)] border-[var(--ink-1)] font-semibold"
                : "text-[var(--ink-3)] border-transparent hover:text-[var(--ink-1)]"
            )}
          >
            {t.label}
            {t.count != null && (
              <span className={cx("ml-1.5 text-[10px] px-1.5 py-0.5 rounded", tab === t.id ? "bg-[var(--bg-inset)]" : "bg-[var(--bg-inset)] opacity-60")}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "kill" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {KILL_RULES.map(r => <RuleCard key={r.id} rule={r} kind="kill" />)}
        </div>
      )}

      {tab === "scale" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SCALE_RULES.map(r => <RuleCard key={r.id} rule={r as any} kind="scale" />)}
        </div>
      )}

      {tab === "metrics" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SOFT_METRICS.map(rm => (
            <div key={rm.metric} className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
              <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-3">{rm.metric}</div>
              <div className="space-y-2">
                {rm.bands.map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="font-mono text-[11px] bg-[var(--bg-inset)] px-2 py-1 rounded border border-[var(--border)] min-w-[100px] text-center">{b.range}</span>
                    <span className="text-[12px] text-[var(--ink-1)] flex-1">{b.label}</span>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${b.status === "good" ? "bg-[var(--success)]" : b.status === "warn" ? "bg-[var(--warning)]" : "bg-[var(--danger)]"}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "tree" && (
        <div className="bg-white border border-[var(--border)] rounded-xl p-6 shadow-sm">
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-5">Árbol de decisión rápida</div>
          <div className="space-y-4">
            <TreeNode q={TREE_NODES.root} />
            <div className="grid grid-cols-2 gap-6 pl-6 relative">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-[var(--border-strong)] opacity-40" />
              {/* NO branch */}
              <div className="space-y-3">
                <div className="text-[11px] font-mono bg-[var(--bg-inset)] border border-[var(--border)] rounded px-2 py-0.5 inline-block">NO</div>
                <TreeNode q={TREE_NODES.no.q} />
                <div className="pl-5 space-y-2 border-l border-dashed border-[var(--border-strong)]">
                  <TreeNode q={TREE_NODES.no.no.label} badge={TREE_NODES.no.no.action} color={TREE_NODES.no.no.color} />
                  <TreeNode q={TREE_NODES.no.yes.q} />
                  <div className="pl-5 space-y-2 border-l border-dashed border-[var(--border-strong)]">
                    <TreeNode q={TREE_NODES.no.yes.no.label} badge={TREE_NODES.no.yes.no.action} color={TREE_NODES.no.yes.no.color} />
                    <TreeNode q={TREE_NODES.no.yes.yes.label} badge={TREE_NODES.no.yes.yes.action} color={TREE_NODES.no.yes.yes.color} />
                  </div>
                </div>
              </div>
              {/* YES branch */}
              <div className="space-y-3">
                <div className="text-[11px] font-mono bg-[var(--ink-1)] text-white rounded px-2 py-0.5 inline-block">SÍ</div>
                <TreeNode q={TREE_NODES.yes.q} />
                <div className="pl-5 space-y-2 border-l border-dashed border-[var(--border-strong)]">
                  <TreeNode q={TREE_NODES.yes.yes.label} badge={TREE_NODES.yes.yes.action} color={TREE_NODES.yes.yes.color} />
                  <TreeNode q={TREE_NODES.yes.no.label} badge={TREE_NODES.yes.no.action} color={TREE_NODES.yes.no.color} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
