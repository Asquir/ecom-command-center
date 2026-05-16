"use client";
import { useState } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { cx } from "@/lib/utils";
import { ArrowLeft, Trash2, Flame, Search, AlertTriangle, X, Microscope } from "lucide-react";

// ─── Data model ───────────────────────────────────────────────────────────────

type CriterionId = "margin" | "problem" | "creative" | "competition" | "trend" | "price" | "supplier" | "impulse" | "audience";

interface ProductEval {
  id: string;
  productName: string;
  createdAt: number;
  scores: Record<CriterionId, number>;
  notes: string;
}

// ─── Criteria config ──────────────────────────────────────────────────────────

interface Criterion {
  id: CriterionId;
  label: string;
  weight: number; // as decimal, e.g. 0.25
  weightLabel: string;
  description: string;
  hints: Record<number, string>;
}

const CRITERIA: Criterion[] = [
  {
    id: "margin",
    label: "Margen bruto",
    weight: 0.25,
    weightLabel: "25%",
    description: "¿Qué margen bruto tiene el producto después de costes?",
    hints: {
      1: "< 20% — prácticamente inviable con paid ads",
      2: "20–30% — muy ajustado, difícil escalar",
      3: "30–40% — margen aceptable con control",
      4: "40–50% — buen margen para escalar",
      5: "> 50% — margen excelente, mucho para ads",
    },
  },
  {
    id: "problem",
    label: "Problema urgente",
    weight: 0.20,
    weightLabel: "20%",
    description: "¿Resuelve un problema real, urgente y cotidiano?",
    hints: {
      1: "No hay problema claro — es nice-to-have",
      2: "Problema vago que no duele mucho",
      3: "Problema real pero no urgente",
      4: "Dolor frecuente con motivación de compra alta",
      5: "Dolor agudo y cotidiano — la gente lo busca activamente",
    },
  },
  {
    id: "creative",
    label: "Potencial creativo",
    weight: 0.15,
    weightLabel: "15%",
    description: "¿Qué tan fácil es crear anuncios virales para este producto?",
    hints: {
      1: "Muy difícil de mostrar visualmente",
      2: "Requiere mucha edición para que funcione",
      3: "Funciona con texto o demostración básica",
      4: "Fácil de demostrar con buen potencial visual",
      5: "Demo viral natural — el producto se vende solo en video",
    },
  },
  {
    id: "competition",
    label: "Competencia",
    weight: 0.15,
    weightLabel: "15%",
    description: "¿Cuánta competencia hay en el mercado objetivo?",
    hints: {
      1: "Saturado / océano rojo — demasiados players grandes",
      2: "Alta competencia, difícil diferenciarse",
      3: "Competencia media — hay espacio con buena ejecución",
      4: "Poca competencia directa con oportunidad clara",
      5: "Poca competencia — océano azul o nicho poco explotado",
    },
  },
  {
    id: "trend",
    label: "Tendencia demanda",
    weight: 0.10,
    weightLabel: "10%",
    description: "¿La demanda del producto está creciendo, estable o cayendo?",
    hints: {
      1: "Bajando — el mercado se está enfriando",
      2: "Ligero descenso o muy estacional",
      3: "Estable — demanda constante sin picos",
      4: "Crecimiento moderado sostenido",
      5: "Creciendo fuerte — tendencia alcista clara",
    },
  },
  {
    id: "price",
    label: "Precio de venta",
    weight: 0.05,
    weightLabel: "5%",
    description: "¿El precio está en el sweet spot para compra impulsiva con margen?",
    hints: {
      1: "< €15 (margen nulo) o > €120 (demasiado reflexivo)",
      2: "€15–20 o €100–120 — en el límite",
      3: "€15–25 o €80–120 — aceptable",
      4: "€25–45 o €65–80 — buen rango",
      5: "€25–80 — sweet spot ideal para impulso + margen",
    },
  },
  {
    id: "supplier",
    label: "Proveedor confiable",
    weight: 0.05,
    weightLabel: "5%",
    description: "¿Tienes un proveedor probado con buenas reviews y tiempos de envío?",
    hints: {
      1: "Desconocido sin reviews ni historial",
      2: "Pocas reviews, historial corto",
      3: "Reviews mixtas o tiempos de envío variables",
      4: "Buenas reviews con tiempos razonables",
      5: "Probado, rápido y con buenas reviews — proveedor de confianza",
    },
  },
  {
    id: "impulse",
    label: "Factor impulso",
    weight: 0.03,
    weightLabel: "3%",
    description: "¿Es una compra impulsiva o requiere mucha reflexión?",
    hints: {
      1: "Compra muy reflexiva — necesita mucho research",
      2: "Algo reflexiva con comparación de precios",
      3: "Algo impulsiva según el contexto",
      4: "Bastante impulsiva con el anuncio correcto",
      5: "Compra impulsiva total — se decide en segundos",
    },
  },
  {
    id: "audience",
    label: "Público claro",
    weight: 0.02,
    weightLabel: "2%",
    description: "¿Tienes claro a quién venderlo y cómo segmentarlo en Meta?",
    hints: {
      1: "No sabes a quién venderlo",
      2: "Target muy amplio y difuso",
      3: "Target vago pero segmentable",
      4: "Audiencia bastante clara con intereses definidos",
      5: "Público muy claro — sabes exactamente cómo segmentar",
    },
  },
];

// ─── Score calculation ─────────────────────────────────────────────────────────

function calcScore(scores: Partial<Record<CriterionId, number>>): number {
  return CRITERIA.reduce((sum, c) => {
    const s = scores[c.id] ?? 0;
    return sum + (s * c.weight / 5) * 100;
  }, 0);
}

// ─── Recommendation logic ──────────────────────────────────────────────────────

interface Recommendation {
  label: string;
  color: string;
  barColor: string;
  bg: string;
  Icon: React.FC<{ size?: number; className?: string }>;
}

function getRecommendation(score: number): Recommendation {
  if (score >= 75) return { label: "Testear ahora", color: "text-[var(--success)]", barColor: "bg-[var(--success)]", bg: "bg-[var(--success-soft)] border-[rgba(34,197,94,0.2)]", Icon: Flame };
  if (score >= 55) return { label: "Investigar más", color: "text-[var(--warning)]", barColor: "bg-[var(--warning)]", bg: "bg-[var(--warning-soft)] border-[rgba(245,158,11,0.2)]", Icon: Search };
  if (score >= 35) return { label: "Riesgo alto", color: "text-orange-500", barColor: "bg-orange-500", bg: "bg-orange-50 border-orange-200", Icon: AlertTriangle };
  return { label: "Descartar", color: "text-[var(--danger)]", barColor: "bg-[var(--danger)]", bg: "bg-[var(--danger-soft)] border-[rgba(239,68,68,0.2)]", Icon: X };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function allScoresSet(scores: Partial<Record<CriterionId, number>>): boolean {
  return CRITERIA.every(c => (scores[c.id] ?? 0) > 0);
}

// ─── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score, className }: { score: number; className?: string }) {
  const rec = getRecommendation(score);
  return (
    <div className={cx("h-2 bg-[var(--bg-inset)] rounded-full overflow-hidden", className)}>
      <div
        className={cx("h-full rounded-full transition-all duration-500", rec.barColor)}
        style={{ width: `${Math.min(100, score)}%` }}
      />
    </div>
  );
}

// ─── Eval card ─────────────────────────────────────────────────────────────────

function EvalCard({
  ev,
  onEdit,
  onDelete,
}: {
  ev: ProductEval;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const score = calcScore(ev.scores);
  const rec = getRecommendation(score);
  const RecIcon = rec.Icon;

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-[14px] text-[var(--ink-1)] leading-snug">{ev.productName}</div>
        <button
          onClick={e => { e.stopPropagation(); if (confirm(`¿Eliminar evaluación de "${ev.productName}"?`)) onDelete(); }}
          className="flex-shrink-0 p-1.5 rounded-lg text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
          title="Eliminar"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="space-y-1.5">
        <ScoreBar score={score} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RecIcon size={12} className={rec.color} />
            <span className={cx("text-[12px] font-semibold", rec.color)}>{rec.label}</span>
          </div>
          <span className="font-mono font-bold text-[15px] text-[var(--ink-1)]">{Math.round(score)}<span className="text-[11px] text-[var(--ink-4)] font-normal">/100</span></span>
        </div>
      </div>

      <div className="text-[11px] text-[var(--ink-4)]">{formatDate(ev.createdAt)}</div>

      <button
        onClick={onEdit}
        className="w-full py-2 rounded-xl border border-[var(--border)] text-[12px] font-medium text-[var(--ink-2)] hover:bg-[var(--bg-inset)] transition-colors"
      >
        Ver / Editar
      </button>
    </div>
  );
}

// ─── Live score sidebar ────────────────────────────────────────────────────────

function LiveScore({ scores }: { scores: Partial<Record<CriterionId, number>> }) {
  const score = calcScore(scores);
  const rec = getRecommendation(score);
  const RecIcon = rec.Icon;

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] space-y-4">
      <div className="text-[11px] font-semibold text-[var(--ink-4)] uppercase tracking-wider">Puntuación en vivo</div>

      <div className="text-center space-y-2">
        <div className={cx("text-[48px] font-mono font-bold leading-none", rec.color)}>
          {Math.round(score)}
        </div>
        <div className="text-[12px] text-[var(--ink-4)]">sobre 100</div>
        <ScoreBar score={score} />
        <div className={cx("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold mt-1", rec.bg, rec.color)}>
          <RecIcon size={12} />
          {rec.label}
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-2">Desglose</div>
        {CRITERIA.map(c => {
          const s = scores[c.id] ?? 0;
          const contribution = s > 0 ? (s * c.weight / 5) * 100 : 0;
          return (
            <div key={c.id} className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-[var(--ink-3)] truncate flex-1">{c.label}</span>
              <span className="text-[10px] text-[var(--ink-4)] font-mono flex-shrink-0 w-10 text-right">
                {s > 0 ? `+${contribution.toFixed(1)}` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Form view ─────────────────────────────────────────────────────────────────

function EvalForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ProductEval;
  onSave: (ev: ProductEval) => void;
  onCancel: () => void;
}) {
  const [productName, setProductName] = useState(initial?.productName ?? "");
  const [scores, setScores] = useState<Partial<Record<CriterionId, number>>>(initial?.scores ?? {});
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [hoveredHints, setHoveredHints] = useState<Partial<Record<CriterionId, number>>>({});

  const canSave = productName.trim().length > 0 && allScoresSet(scores);

  const handleSave = () => {
    if (!canSave) return;
    const ev: ProductEval = {
      id: initial?.id ?? `eval-${Date.now()}`,
      productName: productName.trim(),
      createdAt: initial?.createdAt ?? Date.now(),
      scores: scores as Record<CriterionId, number>,
      notes,
    };
    onSave(ev);
  };

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-[12px] text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors"
      >
        <ArrowLeft size={13} /> Volver a evaluaciones
      </button>

      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">
          {initial ? "Editar evaluación" : "Nueva evaluación"}
        </h1>
        <p className="text-[13px] text-[var(--ink-3)] mt-1">
          Puntúa cada criterio del 1 al 5 para obtener una recomendación instantánea.
        </p>
      </div>

      {/* Layout: form + sticky sidebar */}
      <div className="flex gap-6 items-start">
        {/* Main form */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Product name */}
          <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <label className="text-[12px] font-semibold text-[var(--ink-2)] block mb-2">
              Nombre del producto <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="Ej: Masajeador cervical eléctrico"
              className="w-full h-10 px-3 text-[14px] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[rgba(200,169,106,0.15)] transition-all"
            />
          </div>

          {/* Criteria */}
          {CRITERIA.map(c => {
            const selected = scores[c.id] ?? 0;
            const hovered = hoveredHints[c.id] ?? 0;
            const activeHint = hovered > 0 ? hovered : selected;

            return (
              <div
                key={c.id}
                className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-[14px] text-[var(--ink-1)]">{c.label}</div>
                    <div className="text-[12px] text-[var(--ink-3)] mt-0.5">{c.description}</div>
                  </div>
                  <span className="flex-shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg bg-[var(--gold-soft)] text-[var(--gold-deep)]">
                    {c.weightLabel}
                  </span>
                </div>

                {/* Score buttons */}
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setScores(prev => ({ ...prev, [c.id]: n }))}
                      onMouseEnter={() => setHoveredHints(prev => ({ ...prev, [c.id]: n }))}
                      onMouseLeave={() => setHoveredHints(prev => ({ ...prev, [c.id]: 0 }))}
                      className={cx(
                        "flex-1 h-10 rounded-xl text-[14px] font-bold border transition-all",
                        selected === n
                          ? "bg-[var(--gold)] border-[var(--gold)] text-[var(--ink-1)] shadow-sm"
                          : "bg-white border-[var(--border)] text-[var(--ink-3)] hover:border-[var(--gold)] hover:text-[var(--gold-deep)]"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                {/* Hint */}
                {activeHint > 0 && (
                  <div className={cx(
                    "text-[12px] px-3 py-2 rounded-lg border leading-relaxed transition-all",
                    selected === activeHint && hovered === 0
                      ? "bg-[var(--gold-soft)] border-[rgba(200,169,106,0.3)] text-[var(--gold-deep)]"
                      : "bg-[var(--bg-inset)] border-[var(--border)] text-[var(--ink-3)]"
                  )}>
                    <span className="font-semibold">{activeHint}:</span> {c.hints[activeHint]}
                  </div>
                )}
              </div>
            );
          })}

          {/* Notes */}
          <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] space-y-2">
            <label className="text-[12px] font-semibold text-[var(--ink-2)] block">
              Notas adicionales <span className="text-[11px] text-[var(--ink-4)] font-normal">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Observaciones, links de proveedores, análisis de competencia..."
              className="w-full px-3 py-2.5 text-[13px] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[rgba(200,169,106,0.15)] resize-y leading-relaxed transition-all"
            />
          </div>

          {/* Mobile: score sidebar */}
          <div className="lg:hidden">
            <LiveScore scores={scores} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-6">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={cx(
                "flex-1 py-3 rounded-xl text-[14px] font-semibold transition-all",
                canSave
                  ? "bg-[var(--ink-1)] text-white hover:bg-black"
                  : "bg-[var(--bg-inset)] text-[var(--ink-4)] cursor-not-allowed"
              )}
            >
              Guardar evaluación
            </button>
            <button
              onClick={onCancel}
              className="px-5 py-3 rounded-xl border border-[var(--border)] text-[13px] text-[var(--ink-3)] hover:bg-[var(--bg-inset)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>

        {/* Sticky sidebar (desktop) */}
        <div className="hidden lg:block w-64 flex-shrink-0 sticky top-6">
          <LiveScore scores={scores} />
        </div>
      </div>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function Research() {
  const { success, warning } = useToast();
  const [evals, setEvals] = useLocalStorage<ProductEval[]>("ecc-product-evals", []);
  const [view, setView] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingEval = evals.find(e => e.id === editingId);

  const handleSave = (ev: ProductEval) => {
    setEvals(prev => {
      const exists = prev.find(e => e.id === ev.id);
      if (exists) return prev.map(e => e.id === ev.id ? ev : e);
      return [...prev, ev];
    });
    success(
      editingId ? "Evaluación actualizada" : "Evaluación guardada",
      ev.productName
    );
    setView("list");
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const ev = evals.find(e => e.id === id);
    setEvals(prev => prev.filter(e => e.id !== id));
    warning("Evaluación eliminada", ev?.productName);
  };

  const openNew = () => {
    setEditingId(null);
    setView("form");
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setView("form");
  };

  const goBack = () => {
    setView("list");
    setEditingId(null);
  };

  if (view === "form") {
    return (
      <EvalForm
        initial={editingEval}
        onSave={handleSave}
        onCancel={goBack}
      />
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">
            Pre-testing · {evals.length} evaluación{evals.length !== 1 ? "es" : ""}
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">
            Investigación de producto
          </h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">
            Evalúa antes de gastar en ads. Puntúa cada criterio y obtén una recomendación instantánea.
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-[var(--ink-1)] text-white text-[13px] font-semibold px-4 py-2 rounded-xl hover:bg-black transition-colors flex items-center gap-2"
        >
          <Microscope size={14} /> Nueva evaluación
        </button>
      </div>

      {/* Empty state */}
      {evals.length === 0 && (
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-inset)] flex items-center justify-center">
            <Microscope size={22} className="text-[var(--ink-4)]" />
          </div>
          <div className="text-center">
            <h3 className="text-[15px] font-semibold text-[var(--ink-1)] mb-1">Sin evaluaciones todavía</h3>
            <p className="text-[13px] text-[var(--ink-4)] max-w-xs leading-relaxed">
              Evalúa un producto antes de gastar dinero en ads y descubre si vale la pena testearlo.
            </p>
          </div>
          <button
            onClick={openNew}
            className="bg-[var(--ink-1)] text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl hover:bg-black transition-colors flex items-center gap-2"
          >
            <Microscope size={14} /> Evaluar primer producto
          </button>
        </div>
      )}

      {/* Grid of cards */}
      {evals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {evals
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(ev => (
              <EvalCard
                key={ev.id}
                ev={ev}
                onEdit={() => openEdit(ev.id)}
                onDelete={() => handleDelete(ev.id)}
              />
            ))}
        </div>
      )}
    </div>
  );
}
