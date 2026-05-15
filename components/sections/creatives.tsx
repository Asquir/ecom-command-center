"use client";
import { useState } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { fatigueScore } from "@/lib/stats";
import { DEMO_CREATIVES, type Creative, type DecisionKind } from "@/lib/data";
import { DecisionBadge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { eur, pct, cx } from "@/lib/utils";
import { Copy, Pause, Play, Zap, SortAsc, Plus, X, CheckCircle, AlertTriangle, Flame, Trash2 } from "lucide-react";

const TONE_BG: Record<string, [string, string]> = {
  neutral: ["#1a1a1a", "#3a3a3a"],
  gold:    ["#5a4827", "#c8a96a"],
  blue:    ["#1f3a6b", "#3a6db5"],
  green:   ["#1a4a2b", "#2f7a4a"],
  rose:    ["#5a2b2b", "#9c4646"],
};

function CreativeThumb({ label, tone, size = "card" }: { label: string; tone: string; size?: "card" | "sm" }) {
  const [a, b] = TONE_BG[tone] ?? TONE_BG.neutral;
  const h = size === "card" ? "aspect-[9/11]" : "w-12 h-16";
  return (
    <div className={`relative ${size === "card" ? h : h} rounded-lg overflow-hidden flex-shrink-0`}
      style={{ background: `repeating-linear-gradient(135deg, ${a} 0 14px, ${b} 14px 17px)` }}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
      <div className="absolute bottom-2 left-2 right-2 text-[9px] text-white font-mono uppercase tracking-wider leading-tight">{label}</div>
    </div>
  );
}

function MetricPill({ label, value, good }: { label: string; value: string; good?: boolean | null }) {
  return (
    <div>
      <div className="text-[9px] font-semibold text-[var(--ink-4)] uppercase tracking-wide mb-0.5">{label}</div>
      <div className={cx("font-mono font-semibold text-[12px]",
        good === true ? "text-[var(--success)]" : good === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"
      )}>{value}</div>
    </div>
  );
}

function CreativeCard({ c, ctrTarget, hookTarget, onPause, onDuplicate, onVariation, onDelete }: {
  c: Creative & { paused?: boolean };
  ctrTarget: number;
  hookTarget: number;
  onPause: () => void;
  onDuplicate: () => void;
  onVariation: () => void;
  onDelete: () => void;
}) {
  const isPaused = c.paused || c.status === "Pausado";
  const fatigue = fatigueScore(c.hookRate, c.holdRate, c.ctr, hookTarget, ctrTarget);
  const showFatigue = c.spend > 0;

  return (
    <div className={cx("bg-white border border-[var(--border)] rounded-xl overflow-hidden shadow-sm flex flex-col transition-opacity", isPaused && "opacity-60")}>
      <div className="relative">
        <CreativeThumb label={c.angle} tone={c.tone} size="card" />
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
          <DecisionBadge kind={c.decision} />
          {isPaused && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/60 text-white">PAUSADO</span>}
        </div>
        <div className="absolute top-2.5 right-2.5">
          <ScoreRing value={c.score} size={44} />
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <div className="text-[13px] font-semibold leading-snug mb-1">&ldquo;{c.hook}&rdquo;</div>
          <div className="text-[10px] text-white/70 font-mono">{c.voice} · {c.duration} · {c.angle}</div>
        </div>
      </div>

      <div className="p-3.5 flex-1 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-[13px] text-[var(--ink-1)] leading-tight">{c.name}</div>
          <span className="text-[11px] text-[var(--ink-3)] flex-shrink-0">{c.launched}</span>
        </div>

        {/* Fatigue badge */}
        {showFatigue && (
          <div className={cx("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold", fatigue.color)}>
            {fatigue.label === "Saturado" ? <Flame size={12} /> : fatigue.label === "Fatigando" ? <AlertTriangle size={12} /> : null}
            Fatiga del creativo: {fatigue.label}
            <span className="ml-auto font-mono text-[10px] opacity-70">{fatigue.score}/100</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-x-3 gap-y-2">
          <MetricPill label="CTR"   value={pct(c.ctr)}  good={c.ctr >= ctrTarget ? true : c.ctr < ctrTarget * 0.6 ? false : null} />
          <MetricPill label="CPC"   value={eur(c.cpc)}  good={c.cpc <= 0.45 ? true : c.cpc > 0.7 ? false : null} />
          <MetricPill label="CPM"   value={eur(c.cpm)}  good={c.cpm <= 10 ? true : c.cpm > 18 ? false : null} />
          <MetricPill label="Hook"  value={pct(c.hookRate, 0)} good={c.hookRate >= hookTarget ? true : c.hookRate < hookTarget * 0.6 ? false : null} />
          <MetricPill label="Hold"  value={pct(c.holdRate, 0)} good={c.holdRate >= 30 ? true : c.holdRate < 20 ? false : null} />
          <MetricPill label="Gasto" value={eur(c.spend, 0)} />
          <MetricPill label="ATC"   value={String(c.atc)} good={c.atc > 0 ? true : null} />
          <MetricPill label="IC"    value={String(c.ic)} />
          <MetricPill label="Comp." value={String(c.purchases)} good={c.purchases > 0 ? true : null} />
        </div>
        <div className="bg-[var(--bg-inset)] border border-dashed border-[var(--border-strong)] rounded-lg p-2.5">
          <div className="text-[9px] font-semibold text-[var(--ink-4)] uppercase tracking-wide mb-1">Recomendación</div>
          <div className="text-[12px] text-[var(--ink-2)] leading-relaxed">{c.diag}</div>
        </div>
      </div>

      <div className="flex border-t border-[var(--border)]">
        <button onClick={onDuplicate} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-[var(--ink-3)] hover:bg-[var(--bg-inset)] hover:text-[var(--ink-1)] transition-colors">
          <Copy size={12} /> Duplicar
        </button>
        <button onClick={onVariation} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-[var(--ink-3)] hover:bg-[var(--bg-inset)] hover:text-[var(--ink-1)] transition-colors border-l border-[var(--border)]">
          <Zap size={12} /> Variaciones
        </button>
        <button onClick={onPause} className={cx(
          "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors border-l border-[var(--border)]",
          isPaused ? "text-[var(--success)] hover:bg-[var(--success-soft)]" : "text-[var(--danger)] hover:bg-[var(--danger-soft)]"
        )}>
          {isPaused ? <><Play size={12} /> Activar</> : <><Pause size={12} /> Pausar</>}
        </button>
        <button onClick={onDelete} title="Eliminar creativo"
          className="px-2.5 flex items-center justify-center text-[11px] text-[var(--ink-4)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors border-l border-[var(--border)]">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

type CreativeState = Creative & { paused?: boolean };

export function Creatives() {
  const { settings } = useSettings();
  const { success, warning, info } = useToast();
  const [creatives, setCreatives] = useLocalStorage<CreativeState[]>("ecc-creatives", []);
  const [sortBy, setSortBy] = useState<"score" | "ctr" | "spend">("score");
  const [filterAngle, setFilterAngle] = useState<string>("all");
  const [variationModal, setVariationModal] = useState<CreativeState | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [newHook, setNewHook] = useState("");
  const [newAngle, setNewAngle] = useState("");
  const [newVoice, setNewVoice] = useState("Chica");

  const ctrTarget = settings.ctrTarget || 2;
  const hookTarget = settings.hookTarget || 35;
  const productLabel = settings.productName ? settings.productName.split(" ")[0].toUpperCase() : "PRODUCTO";

  const angles = ["all", ...Array.from(new Set(creatives.map(c => c.angle)))];

  const sorted = creatives
    .filter(c => filterAngle === "all" || c.angle === filterAngle)
    .sort((a, b) => sortBy === "score" ? b.score - a.score : sortBy === "ctr" ? b.ctr - a.ctr : b.spend - a.spend);

  const stats = {
    ganadores:   creatives.filter(c => c.score >= 80).length,
    potenciales: creatives.filter(c => c.score >= 65 && c.score < 80).length,
    testing:     creatives.filter(c => c.score >= 40 && c.score < 65).length,
    apagar:      creatives.filter(c => c.score < 40 && !c.paused).length,
  };

  const fatigados = creatives.filter(c => {
    if (!c.spend) return false;
    const f = fatigueScore(c.hookRate, c.holdRate, c.ctr, hookTarget, ctrTarget);
    return f.label === "Fatigando" || f.label === "Saturado";
  });

  const handlePause = (id: string) => {
    const c = creatives.find(x => x.id === id);
    const isPaused = c?.paused;
    setCreatives(prev => prev.map(x => x.id === id ? { ...x, paused: !isPaused } : x));
    isPaused ? success("Creativo activado", c?.name) : warning("Creativo pausado", c?.name);
  };

  const handleDuplicate = (c: CreativeState) => {
    const copy: CreativeState = {
      ...c,
      id: `${c.id}-v${Date.now()}`,
      name: `${c.name} (copia)`,
      spend: 0, ctr: 0, cpc: 0, cpm: 0, atc: 0, ic: 0, purchases: 0,
      score: 0, roas: 0, hookRate: 0, holdRate: 0,
      launched: "Hoy", status: "Testeando", decision: "data" as DecisionKind,
      diag: "Recién duplicado. Sin datos todavía.",
      paused: false,
    };
    setCreatives(prev => [...prev, copy]);
    success("Creativo duplicado", `"${c.name}" copiado. Edita el hook antes de lanzar.`);
  };

  const handleAddVariation = (c: CreativeState) => {
    if (!newHook.trim()) return;
    const variation: CreativeState = {
      ...c,
      id: `${c.id}-var${Date.now()}`,
      name: `${c.name.replace(/ v\d+$/, "")} — ${newAngle || c.angle} v${creatives.filter(x => x.angle === (newAngle || c.angle)).length + 1}`,
      hook: newHook,
      angle: newAngle || c.angle,
      voice: newVoice,
      spend: 0, ctr: 0, cpc: 0, cpm: 0, atc: 0, ic: 0, purchases: 0,
      score: 0, roas: 0, hookRate: 0, holdRate: 0,
      launched: "Hoy", status: "Testeando", decision: "data" as DecisionKind,
      diag: "Nueva variación. Espera 30–50 clics antes de evaluar.",
      paused: false,
    };
    setCreatives(prev => [...prev, variation]);
    success("Variación creada", variation.name);
    setNewHook(""); setNewAngle(""); setVariationModal(null);
  };

  const handleDelete = (c: CreativeState) => {
    if (!confirm(`¿Eliminar el creativo "${c.name}"?`)) return;
    setCreatives(prev => prev.filter(x => x.id !== c.id));
    warning("Creativo eliminado", c.name);
  };

  const handleAddCreative = () => {
    if (!newHook.trim() || !newAngle.trim()) return;
    const newC: CreativeState = {
      id: `cr${Date.now()}`, name: `${productLabel} · ${newAngle} · v1`,
      angle: newAngle, hook: newHook, voice: newVoice,
      music: "—", cta: "—", duration: "0:20", launched: "Hoy",
      status: "Testeando", decision: "data" as DecisionKind,
      spend: 0, cpm: 0, ctr: 0, cpc: 0, hookRate: 0, holdRate: 0,
      atc: 0, cpAtc: null, ic: 0, purchases: 0, cpa: null, roas: 0,
      score: 0, diag: "Recién creado. Sin datos todavía.", tone: "gold", paused: false,
    };
    setCreatives(prev => [...prev, newC]);
    success("Creativo añadido", newC.name);
    setNewHook(""); setNewAngle(""); setNewVoice("Chica"); setAddModal(false);
  };

  if (creatives.length === 0 && !addModal) {
    return (
      <div className="space-y-5">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Creativos</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Banco de creativos</h1>
        </div>
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-inset)] flex items-center justify-center">
            <Zap size={22} className="text-[var(--ink-4)]" />
          </div>
          <div className="text-center">
            <h3 className="text-[15px] font-semibold text-[var(--ink-1)] mb-1">Sin creativos todavía</h3>
            <p className="text-[13px] text-[var(--ink-4)] max-w-xs">Añade tus anuncios activos para trackear CTR, hook rate y tomar decisiones de kill/scale.</p>
          </div>
          <button onClick={() => setAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black transition-colors flex items-center gap-2">
            <Plus size={14} /> Añadir primer creativo
          </button>
        </div>
        {addModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
              <h3 className="text-[15px] font-semibold text-[var(--ink-1)]">Nuevo creativo</h3>
              <div>
                <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Ángulo / concepto</label>
                <input value={newAngle} onChange={e => setNewAngle(e.target.value)} placeholder="Ej: Dolor de espalda, Ahorro, Viralidad..."
                  className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Hook (primera línea del anuncio)</label>
                <input value={newHook} onChange={e => setNewHook(e.target.value)} placeholder="Ej: ¿Por qué tu espalda duele cada mañana?"
                  className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Voz / presentador</label>
                <select value={newVoice} onChange={e => setNewVoice(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none bg-white appearance-none">
                  {["Chica", "Chico", "IA", "UGC", "Texto"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleAddCreative} disabled={!newHook.trim() || !newAngle.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black disabled:opacity-40">
                  Añadir creativo
                </button>
                <button onClick={() => setAddModal(false)} className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--ink-3)] text-[13px]">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">
            {creatives.length} creativos · {Array.from(new Set(creatives.map(c => c.angle))).length} ángulos
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Creativos</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Score, fatiga y diagnóstico. Duplica ganadores, apaga los que se agotan.</p>
        </div>
        <button onClick={() => setAddModal(true)} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black flex items-center gap-1.5">
          <Plus size={12} /> Subir creativo
        </button>
      </div>

      {/* Fatigue alert banner */}
      {fatigados.length > 0 && (
        <div className="bg-[var(--danger-soft)] border border-[rgba(239,68,68,0.25)] rounded-xl p-4 flex items-start gap-3">
          <Flame size={16} className="text-[var(--danger)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-[var(--danger)] mb-0.5">
              {fatigados.length} creativo{fatigados.length > 1 ? "s" : ""} con fatiga detectada
            </div>
            <div className="text-[12px] text-[var(--ink-2)]">
              {fatigados.map(c => c.name).join(", ")} — Hook rate o CTR por debajo del objetivo. Crea variaciones nuevas antes de que el rendimiento caiga más.
            </div>
          </div>
          <button onClick={() => info("Acción recomendada", "Duplica el ángulo ganador con un nuevo hook y lánzalo como variación.")}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--danger)] text-white hover:opacity-90 flex-shrink-0">
            ¿Qué hacer?
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ganadores",   count: stats.ganadores,   color: "text-[var(--success)]", bg: "bg-[var(--success-soft)]" },
          { label: "Potenciales", count: stats.potenciales, color: "text-[var(--warning)]", bg: "bg-[var(--warning-soft)]" },
          { label: "En testing",  count: stats.testing,     color: "text-[var(--info)]",    bg: "bg-[var(--info-soft)]" },
          { label: "Para apagar", count: stats.apagar,      color: "text-[var(--danger)]",  bg: "bg-[var(--danger-soft)]" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-[var(--border)] rounded-xl p-3`}>
            <div className="text-[10px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1">{s.label}</div>
            <div className={`font-mono font-bold text-[22px] ${s.color}`}>{s.count}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {angles.map(a => (
          <button key={a} onClick={() => setFilterAngle(a)}
            className={cx("text-[12px] px-3 py-1.5 rounded-lg border font-medium transition-colors",
              filterAngle === a ? "bg-[var(--ink-1)] text-white border-[var(--ink-1)]" : "bg-white text-[var(--ink-2)] border-[var(--border)] hover:bg-[var(--bg-inset)]")}>
            {a === "all" ? "Todos" : a}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-[12px] text-[var(--ink-3)]">
          <SortAsc size={13} />
          <span>Ordenar por</span>
          {(["score", "ctr", "spend"] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={cx("px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors",
                sortBy === s ? "bg-[var(--ink-1)] text-white border-[var(--ink-1)]" : "bg-white border-[var(--border)] text-[var(--ink-2)] hover:bg-[var(--bg-inset)]")}>
              {s === "score" ? "Score" : s === "ctr" ? "CTR" : "Gasto"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map(c => (
          <CreativeCard key={c.id} c={c}
            ctrTarget={ctrTarget}
            hookTarget={hookTarget}
            onPause={() => handlePause(c.id)}
            onDuplicate={() => handleDuplicate(c)}
            onVariation={() => { setVariationModal(c); setNewAngle(c.angle); }}
            onDelete={() => handleDelete(c)}
          />
        ))}
      </div>

      {/* Variation modal */}
      <Modal open={!!variationModal} onClose={() => setVariationModal(null)} title={`Nueva variación de "${variationModal?.name}"`}>
        <div className="space-y-4">
          <p className="text-[12px] text-[var(--ink-3)]">Cambia el hook manteniendo el ángulo ganador. El sistema copiará todas las demás configuraciones.</p>
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Nuevo hook (gancho de apertura)</label>
            <textarea value={newHook} onChange={e => setNewHook(e.target.value)} rows={2}
              placeholder='Ej: "¿Sabías que este problema invisible afecta a millones?"'
              className="w-full px-3 py-2 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[rgba(200,169,106,0.15)] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Ángulo</label>
              <input value={newAngle} onChange={e => setNewAngle(e.target.value)}
                placeholder={variationModal?.angle}
                className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Voz</label>
              <select value={newVoice} onChange={e => setNewVoice(e.target.value)}
                className="w-full h-9 px-2 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)] bg-white">
                {["Chica", "Chico", "IA", "Sin voz"].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => variationModal && handleAddVariation(variationModal)}
              className="flex-1 py-2 rounded-lg bg-[var(--ink-1)] text-white text-[13px] font-medium hover:bg-black">
              Crear variación
            </button>
            <button onClick={() => setVariationModal(null)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--ink-3)] text-[13px] hover:bg-[var(--bg-inset)]">Cancelar</button>
          </div>
        </div>
      </Modal>

      {/* Add creative modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Nuevo creativo">
        <div className="space-y-4">
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Hook (gancho)</label>
            <textarea value={newHook} onChange={e => setNewHook(e.target.value)} rows={2}
              placeholder='Ej: "¿Todavía sin solucionar este problema?"'
              className="w-full px-3 py-2 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Ángulo</label>
              <input value={newAngle} onChange={e => setNewAngle(e.target.value)} placeholder="Dolor, Solución, Ahorro…"
                className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Voz</label>
              <select value={newVoice} onChange={e => setNewVoice(e.target.value)}
                className="w-full h-9 px-2 text-[13px] border border-[var(--border)] rounded-lg outline-none bg-white focus:border-[var(--gold)]">
                {["Chica", "Chico", "IA", "Sin voz"].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-[var(--gold-soft)] border border-[rgba(200,169,106,0.3)] rounded-lg p-3 text-[11px] text-[var(--ink-2)]">
            <strong>Tip:</strong> Los mejores hooks abren con una pregunta, un problema visual o una estadística sorprendente. Máximo 5 segundos de impacto.
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleAddCreative} disabled={!newHook.trim() || !newAngle.trim()}
              className="flex-1 py-2 rounded-lg bg-[var(--ink-1)] text-white text-[13px] font-medium hover:bg-black disabled:opacity-40 flex items-center justify-center gap-1.5">
              <CheckCircle size={13} /> Añadir creativo
            </button>
            <button onClick={() => setAddModal(false)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--ink-3)] text-[13px] hover:bg-[var(--bg-inset)]">Cancelar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
