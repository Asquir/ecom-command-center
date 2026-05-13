"use client";
import { useState } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { PLANNER_DAYS, DAILY_CHECKLIST } from "@/lib/data";
import { CheckCircle, Circle, Clock, ChevronRight, Zap, Calendar } from "lucide-react";

type CheckItem = { id: string; label: string; done: boolean };

export function Planner() {
  const [checks, setChecks] = useLocalStorage<CheckItem[]>("ecc-planner-checks", DAILY_CHECKLIST);
  const [expandedDay, setExpandedDay] = useState<number | null>(3);

  const toggle = (id: string) =>
    setChecks(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));

  const doneCount = checks.filter(c => c.done).length;
  const totalCount = checks.length;

  const dayStateColor = (state: string) => {
    if (state === "done")  return "border-[var(--success)] bg-[var(--success-soft)]";
    if (state === "today") return "border-[var(--gold)] bg-[var(--gold-soft)]";
    return "border-[var(--border)] bg-white";
  };
  const dayStateDot = (state: string) => {
    if (state === "done")  return "bg-[var(--success)]";
    if (state === "today") return "bg-[var(--gold)]";
    return "bg-[var(--ink-5)]";
  };
  const dayStateText = (state: string) => {
    if (state === "done")  return "text-[var(--success)]";
    if (state === "today") return "text-[var(--gold-deep)]";
    return "text-[var(--ink-4)]";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Regadera Anti-Sarro · Semana 1</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Planner de testing</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">7 días estructurados para validar un producto con criterios claros.</p>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-[var(--ink-3)]">
          <Calendar size={14} />
          <span>Día 3 de 7 · hoy</span>
        </div>
      </div>

      {/* Progress strip */}
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold text-[var(--ink-2)]">Progreso de la semana</span>
          <span className="text-[12px] font-mono text-[var(--ink-3)]">Día 3 / 7</span>
        </div>
        <div className="flex gap-1.5">
          {PLANNER_DAYS.map(d => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-2 w-full rounded-full ${d.state === "done" ? "bg-[var(--success)]" : d.state === "today" ? "bg-[var(--gold)]" : "bg-[var(--bg-inset)]"}`} />
              <span className={`text-[10px] font-mono ${dayStateText(d.state)}`}>{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-day calendar */}
        <div className="lg:col-span-2 space-y-2">
          {PLANNER_DAYS.map(d => {
            const isExpanded = expandedDay === d.day;
            return (
              <div
                key={d.day}
                className={`border rounded-xl transition-all overflow-hidden ${dayStateColor(d.state)} ${d.state === "today" ? "shadow-sm" : ""}`}
              >
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setExpandedDay(isExpanded ? null : d.day)}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[12px] text-white ${dayStateDot(d.state)}`}>
                    {d.state === "done" ? "✓" : d.day}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-[var(--ink-1)]">Día {d.day} — {d.title}</div>
                    {d.state === "today" && (
                      <div className="text-[11px] font-semibold text-[var(--gold-deep)] uppercase tracking-wide">Hoy</div>
                    )}
                    {d.state === "done" && (
                      <div className="text-[11px] text-[var(--success)]">Completado</div>
                    )}
                    {d.state === "next" && (
                      <div className="text-[11px] text-[var(--ink-4)]">{d.items.length} tareas pendientes</div>
                    )}
                  </div>
                  <ChevronRight size={14} className={`text-[var(--ink-4)] transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 space-y-1.5 border-t border-[rgba(0,0,0,0.06)] pt-3">
                    {d.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${d.state === "done" ? "bg-[var(--success)]" : d.state === "today" ? "bg-[var(--gold)]" : "bg-[var(--ink-5)]"}`} />
                        <span className="text-[12px] text-[var(--ink-2)] leading-relaxed">{item}</span>
                      </div>
                    ))}
                    {d.state === "today" && (
                      <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)]">
                        <button className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white flex items-center gap-1.5">
                          <Zap size={11} /> Ir al dashboard del día
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Daily checklist */}
        <div className="space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm">
            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold text-[var(--ink-1)]">Checklist diario</div>
                <span className="text-[11px] font-mono text-[var(--ink-4)]">{doneCount}/{totalCount}</span>
              </div>
              <div className="mt-2 h-1.5 bg-[var(--bg-inset)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--success)] rounded-full transition-all"
                  style={{ width: `${(doneCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
            <div className="p-2 space-y-0.5">
              {checks.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-inset)] transition-colors text-left"
                >
                  {item.done
                    ? <CheckCircle size={15} className="text-[var(--success)] flex-shrink-0" />
                    : <Circle size={15} className="text-[var(--ink-5)] flex-shrink-0" />
                  }
                  <span className={`text-[12px] leading-snug ${item.done ? "line-through text-[var(--ink-4)]" : "text-[var(--ink-2)]"}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Decision framework */}
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
            <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-3">Árbol de decisión — Día 3</div>
            <div className="space-y-2 text-[12px] text-[var(--ink-2)]">
              {[
                { q: "¿Hay ATC sin ventas?", a: "Revisar carrito y checkout" },
                { q: "¿Algún creativo cumple regla kill?", a: "Apagar ese creativo" },
                { q: "¿Gasto ≥ 0.5× BE CPA + 0 ATC?", a: "Apagar anuncio" },
                { q: "¿CTR ≥ 2% y CPC ≤ 0.5 €?", a: "No tocar. Esperar." },
              ].map((row, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-[var(--ink-5)] flex-shrink-0">→</span>
                  <div>
                    <div className="font-medium text-[var(--ink-1)]">{row.q}</div>
                    <div className="text-[var(--ink-3)]">{row.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prime time alert */}
          <div className="bg-[var(--gold-soft)] border border-[rgba(200,169,106,0.3)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Clock size={13} className="text-[var(--gold-deep)]" />
              <div className="text-[12px] font-semibold text-[var(--gold-deep)]">Prime time MX esta noche</div>
            </div>
            <div className="text-[11px] text-[var(--ink-3)]">20:00–23:00 hora MX. Las métricas de conversión mejoran hasta un 40% en esa ventana. No apagues antes.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
