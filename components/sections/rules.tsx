"use client";
import { useState } from "react";
import { KILL_RULES, SCALE_RULES } from "@/lib/data";
import { cx } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { MoreHorizontal, TrendingUp, TrendingDown, FlaskConical, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type RuleKind = "kill" | "scale";

function RuleCard({ rule, kind, active, onToggle }: { rule: typeof KILL_RULES[0]; kind: RuleKind; active: boolean; onToggle: () => void }) {
  const isKill = kind === "kill";
  return (
    <div className={cx("bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm flex flex-col gap-3 transition-opacity", !active && "opacity-50")}>
      <div className="flex items-center justify-between">
        <span className={cx(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
          isKill ? "bg-[var(--danger-soft)] text-[var(--danger)] border-[rgba(220,38,38,0.2)]" : "bg-[var(--success-soft)] text-[var(--success)] border-[rgba(22,163,74,0.2)]"
        )}>
          {isKill ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
          {isKill ? "Apagar" : "Escalar"}
        </span>
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
          <span className={cx("text-[12px] font-bold", isKill ? "text-[var(--danger)]" : "text-[var(--success)]")}>{rule.action}</span>
        </div>
      </div>
      <p className="text-[12px] text-[var(--ink-3)] leading-relaxed">{rule.why}</p>
      <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
        <span className="text-[10px] font-mono text-[var(--ink-4)] bg-[var(--bg-inset)] px-2 py-0.5 rounded">{active ? "activa" : "desactivada"}</span>
        <button onClick={onToggle} className={cx("relative w-10 h-5 rounded-full transition-colors", active ? "bg-[var(--ink-1)]" : "bg-[var(--bg-inset)] border border-[var(--border)]")}>
          <span className={cx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", active ? "translate-x-5" : "translate-x-0.5")} />
        </button>
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

interface TesterInputs {
  spend: number; beCpa: number; beRoas: number;
  cpc: number; atc: number; checkouts: number; purchases: number; roas: number;
}

function RulesTester() {
  const [v, setV] = useState<TesterInputs>({ spend: 8, beCpa: 17, beRoas: 2.3, cpc: 0.42, atc: 1, checkouts: 0, purchases: 0, roas: 0 });
  const set = (k: keyof TesterInputs, val: number) => setV(p => ({ ...p, [k]: val }));

  const results = [
    {
      id: "k1", kind: "kill" as const, title: "CPC muy alto sin tráfico de calidad",
      fires: v.spend > 10 && v.cpc > 2.5,
      reason: v.spend > 10 && v.cpc > 2.5 ? `Gasto ${v.spend}€ > 10€ y CPC ${v.cpc}€ > 2.5€` : `Requiere gasto > 10€ y CPC > 2.5€. Actual: ${v.spend}€ / ${v.cpc}€`,
      action: "Apagar anuncio",
    },
    {
      id: "k2", kind: "kill" as const, title: "Sin intención a mitad del BE CPA",
      fires: v.spend >= v.beCpa * 0.5 && v.atc === 0 && v.checkouts === 0,
      reason: v.spend >= v.beCpa * 0.5 && v.atc === 0 ? `Gastados ${v.spend}€ ≥ 0.5×BE CPA (${(v.beCpa*0.5).toFixed(2)}€) sin ningún ATC` : `Faltan datos: gasto ${v.spend}€ vs umbral ${(v.beCpa*0.5).toFixed(2)}€, ATC: ${v.atc}`,
      action: "Apagar anuncio",
    },
    {
      id: "k3", kind: "kill" as const, title: "BE CPA quemado sin venta",
      fires: v.spend >= v.beCpa && v.purchases === 0,
      reason: v.spend >= v.beCpa && v.purchases === 0 ? `Gasto ${v.spend}€ ≥ BE CPA ${v.beCpa}€ con 0 compras` : `Gasto ${v.spend}€ vs BE CPA ${v.beCpa}€. Compras: ${v.purchases}`,
      action: "Apagar anuncio",
    },
    {
      id: "k4", kind: "kill" as const, title: "100€ sin rentabilidad",
      fires: v.spend > 100 && v.roas < v.beRoas,
      reason: v.spend > 100 ? `Gasto ${v.spend}€ > 100€ con ROAS ${v.roas}× < BE ${v.beRoas}×` : `Gasto ${v.spend}€ — no ha alcanzado 100€ todavía`,
      action: "Apagar campaña",
    },
    {
      id: "s1", kind: "scale" as const, title: "Escalar verde",
      fires: v.roas >= v.beRoas * 1.2,
      reason: v.roas >= v.beRoas * 1.2 ? `ROAS ${v.roas}× ≥ BE×1.2 (${(v.beRoas*1.2).toFixed(2)}×)` : `ROAS ${v.roas}× < umbral ${(v.beRoas*1.2).toFixed(2)}×`,
      action: "Subir presupuesto +25%",
    },
    {
      id: "s2", kind: "scale" as const, title: "Comprar más datos",
      fires: v.roas >= v.beRoas * 0.9 && v.roas < v.beRoas * 1.2,
      reason: `ROAS ${v.roas}× ≈ BE ROAS (${v.beRoas}×). Zona de confirmación.`,
      action: "Subir presupuesto +10%",
    },
    {
      id: "s3", kind: "scale" as const, title: "Estabilizar",
      fires: v.roas >= v.beRoas * 0.7 && v.roas < v.beRoas * 0.9,
      reason: `ROAS ${v.roas}× por debajo pero sin pérdida grave.`,
      action: "Bajar presupuesto −25%",
    },
    {
      id: "s4", kind: "scale" as const, title: "Cortar pérdida",
      fires: v.purchases > 0 && v.roas < v.beRoas * 0.7,
      reason: v.roas < v.beRoas * 0.7 && v.purchases > 0 ? `ROAS ${v.roas}× muy por debajo del BE.` : `Sin datos de compras todavía.`,
      action: "Pausar campaña",
    },
  ];

  const fired = results.filter(r => r.fires);
  const killFired = fired.filter(r => r.kind === "kill");
  const scaleFired = fired.filter(r => r.kind === "scale");

  const inputField = (label: string, key: keyof TesterInputs, step = 0.01, suffix = "") => (
    <div>
      <label className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wide block mb-1">{label}</label>
      <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden h-8 focus-within:border-[var(--gold)]">
        <input type="number" step={step} value={v[key]}
          onChange={e => set(key, parseFloat(e.target.value) || 0)}
          className="flex-1 px-2.5 text-[13px] font-mono text-[var(--ink-1)] outline-none bg-white min-w-0" />
        {suffix && <span className="px-2 text-[11px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-l border-[var(--border)] h-full flex items-center">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="bg-[var(--gold-soft)] border border-[rgba(200,169,106,0.3)] rounded-xl p-4">
        <div className="text-[12px] font-semibold text-[var(--gold-deep)] mb-1">¿Cómo usar el tester?</div>
        <div className="text-[12px] text-[var(--ink-2)]">Introduce las métricas reales de tu campaña y el sistema evalúa en tiempo real qué reglas se disparan. Si una regla se activa → toma la acción indicada.</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inputs */}
        <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4 space-y-4">
          <div className="text-[13px] font-semibold text-[var(--ink-1)] mb-1">Métricas de tu campaña</div>
          <div className="grid grid-cols-2 gap-3">
            {inputField("Gasto (€)", "spend", 0.1, "€")}
            {inputField("BE CPA (€)", "beCpa", 0.5, "€")}
            {inputField("BE ROAS", "beRoas", 0.1, "×")}
            {inputField("CPC (€)", "cpc", 0.01, "€")}
            {inputField("ROAS actual", "roas", 0.1, "×")}
            {inputField("ATC", "atc", 1, "")}
            {inputField("Checkouts", "checkouts", 1, "")}
            {inputField("Compras", "purchases", 1, "")}
          </div>
          <button onClick={() => setV({ spend: 8, beCpa: 17, beRoas: 2.3, cpc: 0.42, atc: 1, checkouts: 0, purchases: 0, roas: 0 })}
            className="w-full py-2 text-[12px] text-[var(--ink-3)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-inset)]">
            Cargar datos demo
          </button>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-3">
          {/* Summary */}
          <div className={cx("rounded-xl p-4 border", killFired.length > 0 ? "bg-[var(--danger-soft)] border-[rgba(220,38,38,0.2)]" : scaleFired.length > 0 ? "bg-[var(--success-soft)] border-[rgba(22,163,74,0.2)]" : "bg-[var(--bg-inset)] border-[var(--border)]")}>
            <div className="flex items-center gap-2 mb-2">
              {killFired.length > 0 ? <XCircle size={16} className="text-[var(--danger)]" /> : scaleFired.length > 0 ? <CheckCircle size={16} className="text-[var(--success)]" /> : <AlertTriangle size={16} className="text-[var(--warning)]" />}
              <span className="font-semibold text-[14px] text-[var(--ink-1)]">
                {killFired.length > 0 ? `${killFired.length} regla${killFired.length > 1 ? "s" : ""} de APAGADO activada${killFired.length > 1 ? "s" : ""}` : scaleFired.length > 0 ? `${scaleFired.length} regla${scaleFired.length > 1 ? "s" : ""} de ESCALA activada${scaleFired.length > 1 ? "s" : ""}` : "Sin reglas activadas — espera más datos"}
              </span>
            </div>
            <p className="text-[12px] text-[var(--ink-2)]">
              {killFired.length > 0 ? killFired[0].action : scaleFired.length > 0 ? scaleFired[0].action : "Ninguna regla se dispara con los valores actuales. Continúa acumulando datos."}
            </p>
          </div>

          {/* Rule list */}
          <div className="space-y-2">
            {results.map(r => (
              <div key={r.id} className={cx("flex items-start gap-3 p-3 rounded-xl border transition-all", r.fires ? (r.kind === "kill" ? "bg-[var(--danger-soft)] border-[rgba(220,38,38,0.3)]" : "bg-[var(--success-soft)] border-[rgba(22,163,74,0.3)]") : "bg-white border-[var(--border)] opacity-60")}>
                <div className="mt-0.5 flex-shrink-0">
                  {r.fires ? (r.kind === "kill" ? <XCircle size={14} className="text-[var(--danger)]" /> : <CheckCircle size={14} className="text-[var(--success)]" />) : <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--ink-5)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12px] font-semibold text-[var(--ink-1)]">{r.title}</span>
                    {r.fires && <span className={cx("text-[10px] font-bold px-1.5 py-0.5 rounded", r.kind === "kill" ? "bg-[var(--danger)] text-white" : "bg-[var(--success)] text-white")}>{r.kind === "kill" ? "APAGAR" : "ESCALAR"}</span>}
                  </div>
                  <div className="text-[11px] text-[var(--ink-3)]">{r.reason}</div>
                  {r.fires && <div className="text-[11px] font-semibold text-[var(--ink-1)] mt-1">→ {r.action}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Rules() {
  const { info } = useToast();
  const [activeRules, setActiveRules] = useState<Set<string>>(new Set([...KILL_RULES.map(r => r.id), ...SCALE_RULES.map(r => r.id)]));
  const [tab, setTab] = useState<"kill" | "scale" | "metrics" | "tree" | "tester">("kill");

  const toggleRule = (id: string) => {
    setActiveRules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    info(activeRules.has(id) ? "Regla desactivada" : "Regla activada", `La regla ${id.toUpperCase()} ya no evaluará tus campañas.`);
  };

  const TABS = [
    { id: "kill" as const,    label: "Apagado",     count: KILL_RULES.length  },
    { id: "scale" as const,   label: "Escalado",    count: SCALE_RULES.length },
    { id: "metrics" as const, label: "Métricas blandas" },
    { id: "tree" as const,    label: "Árbol" },
    { id: "tester" as const,  label: "🧪 Tester" },
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
          {KILL_RULES.map(r => <RuleCard key={r.id} rule={r} kind="kill" active={activeRules.has(r.id)} onToggle={() => toggleRule(r.id)} />)}
        </div>
      )}

      {tab === "scale" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SCALE_RULES.map(r => <RuleCard key={r.id} rule={r as any} kind="scale" active={activeRules.has(r.id)} onToggle={() => toggleRule(r.id)} />)}
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

      {tab === "tester" && <RulesTester />}

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
