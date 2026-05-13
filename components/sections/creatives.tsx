"use client";
import { useState } from "react";
import { DEMO_CREATIVES, type Creative } from "@/lib/data";
import { DecisionBadge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { eur, pct, cx } from "@/lib/utils";
import { Copy, Pause, Zap, SortAsc } from "lucide-react";

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
    <div
      className={`relative ${size === "card" ? h : h} rounded-lg overflow-hidden flex-shrink-0`}
      style={{ background: `repeating-linear-gradient(135deg, ${a} 0 14px, ${b} 14px 17px)` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
      <div className="absolute bottom-2 left-2 right-2 text-[9px] text-white font-mono uppercase tracking-wider leading-tight">
        {label}
      </div>
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

function CreativeCard({ c }: { c: Creative }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className="relative">
        <CreativeThumb label={c.angle} tone={c.tone} size="card" />
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          <DecisionBadge kind={c.decision} />
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

        <div className="grid grid-cols-3 gap-x-3 gap-y-2">
          <MetricPill label="CTR"   value={pct(c.ctr)}  good={c.ctr >= 2.5 ? true : c.ctr < 1.5 ? false : null} />
          <MetricPill label="CPC"   value={eur(c.cpc)}  good={c.cpc <= 0.45 ? true : c.cpc > 0.7 ? false : null} />
          <MetricPill label="CPM"   value={eur(c.cpm)}  good={c.cpm <= 10 ? true : c.cpm > 18 ? false : null} />
          <MetricPill label="Hook"  value={pct(c.hookRate, 0)} />
          <MetricPill label="Hold"  value={pct(c.holdRate, 0)} />
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

      <div className="flex border-t border-[var(--border-soft)]">
        {[
          { icon: Copy, label: "Duplicar" },
          { icon: Zap, label: "Variaciones" },
          { icon: Pause, label: "Pausar" },
        ].map((btn, i) => (
          <button key={i} className={cx(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-[var(--ink-3)] hover:bg-[var(--bg-inset)] hover:text-[var(--ink-1)] transition-colors",
            i > 0 ? "border-l border-[var(--border-soft)]" : ""
          )}>
            <btn.icon size={12} /> {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Creatives() {
  const [sortBy, setSortBy] = useState<"score" | "ctr" | "spend">("score");
  const [filterAngle, setFilterAngle] = useState<string>("all");

  const angles = ["all", ...Array.from(new Set(DEMO_CREATIVES.map(c => c.angle)))];

  const sorted = DEMO_CREATIVES
    .filter(c => filterAngle === "all" || c.angle === filterAngle)
    .sort((a, b) => sortBy === "score" ? b.score - a.score : sortBy === "ctr" ? b.ctr - a.ctr : b.spend - a.spend);

  const stats = {
    ganadores: sorted.filter(c => c.score >= 80).length,
    potenciales: sorted.filter(c => c.score >= 65 && c.score < 80).length,
    testing: sorted.filter(c => c.score >= 40 && c.score < 65).length,
    apagar: sorted.filter(c => c.score < 40).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">
            {DEMO_CREATIVES.length} creativos · 3 ángulos en testing
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Creativos</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Score, decisión y diagnóstico. Duplica ganadores, apaga perdedores.</p>
        </div>
        <button className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black">
          + Subir creativo
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ganadores", count: stats.ganadores, color: "text-[var(--success)]", bg: "bg-[var(--success-soft)]" },
          { label: "Potenciales", count: stats.potenciales, color: "text-[var(--warning)]", bg: "bg-[var(--warning-soft)]" },
          { label: "En testing", count: stats.testing, color: "text-[var(--info)]", bg: "bg-[var(--info-soft)]" },
          { label: "Para apagar", count: stats.apagar, color: "text-[var(--danger)]", bg: "bg-[var(--danger-soft)]" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-[var(--border)] rounded-xl p-3`}>
            <div className="text-[10px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1">{s.label}</div>
            <div className={`font-mono font-bold text-[22px] ${s.color}`}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {angles.map(a => (
          <button
            key={a}
            onClick={() => setFilterAngle(a)}
            className={cx(
              "text-[12px] px-3 py-1.5 rounded-lg border font-medium transition-colors",
              filterAngle === a
                ? "bg-[var(--ink-1)] text-white border-[var(--ink-1)]"
                : "bg-white text-[var(--ink-2)] border-[var(--border)] hover:bg-[var(--bg-inset)]"
            )}
          >
            {a === "all" ? "Todos" : a}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-[12px] text-[var(--ink-3)]">
          <SortAsc size={13} />
          <span>Ordenar por</span>
          {(["score", "ctr", "spend"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={cx(
                "px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors",
                sortBy === s ? "bg-[var(--ink-1)] text-white border-[var(--ink-1)]" : "bg-white border-[var(--border)] text-[var(--ink-2)] hover:bg-[var(--bg-inset)]"
              )}
            >
              {s === "score" ? "Score" : s === "ctr" ? "CTR" : "Gasto"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map(c => <CreativeCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}
