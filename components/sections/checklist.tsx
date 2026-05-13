"use client";
import { CHECKLIST_ITEMS } from "@/lib/data";
import { useLocalStorage } from "@/lib/hooks";
import { cx } from "@/lib/utils";
import { Check, AlertCircle } from "lucide-react";

export function Checklist() {
  const [items, setItems] = useLocalStorage("ecc-checklist", CHECKLIST_ITEMS);

  const toggle = (id: string) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, done: !it.done } : it));

  const done = items.filter(i => i.done).length;
  const total = items.length;
  const pct = Math.round((done / total) * 100);
  const isReady = done === total;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Lanzamiento seguro</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Checklist de lanzamiento</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Antes de gastar un euro en ads, revisa que cada punto esté en verde.</p>
        </div>
        <div className="flex gap-2">
          <button className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink-1)] shadow-sm hover:bg-[var(--bg-inset)]">
            Duplicar para nuevo producto
          </button>
          <button className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black">
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Progress header */}
      <div className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--gold-soft)] flex items-center justify-center">
                  <span className="font-mono text-[11px] font-bold text-[var(--gold-deep)]">RG</span>
                </div>
                <div>
                  <div className="font-semibold text-[14px] text-[var(--ink-1)]">Regadera Anti-Sarro Premium</div>
                  <div className="text-[12px] text-[var(--ink-3)]">
                    {isReady ? "✓ Listo para lanzar" : `Faltan ${total - done} puntos para estar listo`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={cx("font-mono font-bold text-[22px]", isReady ? "text-[var(--success)]" : "text-[var(--ink-1)]")}>{done}/{total}</div>
                <div className="text-[11px] text-[var(--ink-3)]">{pct}%</div>
              </div>
            </div>
            <div className="h-2 bg-[var(--bg-inset)] rounded-full overflow-hidden">
              <div
                className={cx("h-full rounded-full transition-all duration-500", isReady ? "bg-[var(--success)]" : "bg-[var(--gold)]")}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Checklist items */}
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="font-semibold text-[13px] text-[var(--ink-1)]">Todos los puntos</div>
          <div className="flex gap-2 text-[11px]">
            <span className="flex items-center gap-1 text-[var(--success)]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" /> {done} completos</span>
            <span className="flex items-center gap-1 text-[var(--ink-3)]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-4)]" /> {total - done} pendientes</span>
          </div>
        </div>
        <div className="divide-y divide-[var(--border-soft)]">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => toggle(item.id)}
              className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[var(--bg-inset)] transition-colors group"
            >
              <div className={cx(
                "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
                item.done
                  ? "bg-[var(--success)] border-[var(--success)]"
                  : "border-[var(--border-strong)] group-hover:border-[var(--ink-3)]"
              )}>
                {item.done && <Check size={12} className="text-white" strokeWidth={2.5} />}
              </div>
              <span className={cx(
                "text-[13px] flex-1 transition-colors",
                item.done ? "text-[var(--ink-3)] line-through" : "text-[var(--ink-1)]"
              )}>
                {item.label}
              </span>
              {!item.done && (
                <AlertCircle size={13} className="text-[var(--ink-5)] opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          ))}
        </div>
      </div>

      {!isReady && (
        <div className="bg-[var(--warning-soft)] border border-[rgba(245,158,11,0.25)] rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="text-[var(--warning)] mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-[13px] text-[var(--ink-1)] mb-1">No lances hasta completar todos los puntos</div>
              <p className="text-[12px] text-[var(--ink-3)] leading-relaxed">
                Los puntos pendientes aumentan el riesgo de perder dinero por problemas técnicos. Especialmente el checkout, el pixel y el break-even calculado.
              </p>
            </div>
          </div>
        </div>
      )}

      {isReady && (
        <div className="bg-[var(--success-soft)] border border-[rgba(22,163,74,0.25)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Check size={18} className="text-[var(--success)]" strokeWidth={2.5} />
            <div>
              <div className="font-semibold text-[13px] text-[var(--success)]">¡Todo listo para lanzar!</div>
              <p className="text-[12px] text-[var(--ink-3)] mt-0.5">Todos los puntos confirmados. Puedes lanzar con confianza.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
