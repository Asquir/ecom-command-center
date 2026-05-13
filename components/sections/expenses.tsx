"use client";
import { FIXED_COSTS } from "@/lib/data";
import { eur } from "@/lib/utils";
import { TrendingDown, DollarSign } from "lucide-react";

const DEMO_REVENUE_MONTH = 4200;
const DEMO_AD_SPEND_MONTH = 1850;

export function Expenses() {
  const total = FIXED_COSTS.reduce((s, c) => s + c.monthly, 0);
  const totalAll = total + DEMO_AD_SPEND_MONTH;
  const netProfit = DEMO_REVENUE_MONTH - totalAll;
  const netMargin = (netProfit / DEMO_REVENUE_MONTH) * 100;

  const cats = Array.from(new Set(FIXED_COSTS.map(c => c.cat)));
  const catTotals = cats.map(cat => ({
    cat,
    total: FIXED_COSTS.filter(c => c.cat === cat).reduce((s, c) => s + c.monthly, 0),
    items: FIXED_COSTS.filter(c => c.cat === cat),
  })).sort((a, b) => b.total - a.total);

  const maxCat = Math.max(...catTotals.map(c => c.total));

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Mayo 2026 · estimado mensual</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Gastos fijos</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Infraestructura mensual, impacto en margen y análisis por categoría.</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ingresos (mes)",    value: eur(DEMO_REVENUE_MONTH) },
          { label: "Gasto en ads",      value: eur(DEMO_AD_SPEND_MONTH), sub: "variable" },
          { label: "Gastos fijos",      value: eur(total),               sub: `${FIXED_COSTS.length} líneas` },
          { label: "Beneficio neto",    value: eur(netProfit), sub: `${netMargin.toFixed(1)}% margen`, ok: netProfit > 0 },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`font-mono font-bold text-[18px] ${s.ok === true ? "text-[var(--success)]" : s.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>{s.value}</div>
            {s.sub && <div className="text-[11px] text-[var(--ink-4)] mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Expense table */}
        <div className="lg:col-span-3 bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="text-[13px] font-semibold text-[var(--ink-1)]">Detalle de gastos fijos</div>
            <div className="text-[12px] text-[var(--ink-3)] mt-0.5">Renovación mensual · todos los servicios activos</div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-inset)]">
                {["Categoría", "Servicio", "Mensual", "Anual", "% del total"].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {FIXED_COSTS.map((c, i) => (
                <tr key={i} className="hover:bg-[var(--bg-inset)] transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--bg-inset)] text-[var(--ink-3)] uppercase tracking-wide">{c.cat}</span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--ink-1)]">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-[13px] font-semibold text-[var(--ink-1)]">{eur(c.monthly)}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-[var(--ink-4)]">{eur(c.monthly * 12)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[var(--bg-inset)] rounded overflow-hidden max-w-[80px]">
                        <div className="h-full bg-[var(--gold)] rounded" style={{ width: `${(c.monthly / total) * 100}%` }} />
                      </div>
                      <span className="text-[11px] font-mono text-[var(--ink-4)]">{((c.monthly / total) * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border-strong)] bg-[var(--bg-inset)]">
                <td className="px-4 py-3 text-[12px] font-semibold text-[var(--ink-2)]" colSpan={2}>Total gastos fijos</td>
                <td className="px-4 py-3 font-mono font-bold text-[14px] text-[var(--ink-1)]">{eur(total)}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-[var(--ink-4)]">{eur(total * 12)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Category breakdown + margin analysis */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
            <div className="text-[13px] font-semibold text-[var(--ink-1)] mb-3">Por categoría</div>
            <div className="space-y-2.5">
              {catTotals.map(({ cat, total: catTotal, items }) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium text-[var(--ink-2)]">{cat}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--ink-4)]">{items.length} línea{items.length > 1 ? "s" : ""}</span>
                      <span className="font-mono text-[12px] font-semibold text-[var(--ink-1)]">{eur(catTotal)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[var(--bg-inset)] rounded overflow-hidden">
                    <div className="h-full bg-[var(--gold)] rounded" style={{ width: `${(catTotal / maxCat) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Impact on margin */}
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
            <div className="text-[13px] font-semibold text-[var(--ink-1)] mb-3">Impacto en margen</div>
            <div className="space-y-2">
              {[
                { label: "Ingresos brutos",  value: DEMO_REVENUE_MONTH, pct: 100 },
                { label: "− Gasto en ads",   value: -DEMO_AD_SPEND_MONTH, pct: -(DEMO_AD_SPEND_MONTH / DEMO_REVENUE_MONTH) * 100 },
                { label: "− Gastos fijos",   value: -total, pct: -(total / DEMO_REVENUE_MONTH) * 100 },
                { label: "= Beneficio neto", value: netProfit, pct: netMargin, bold: true },
              ].map(r => (
                <div key={r.label} className={`flex items-center justify-between text-[12px] ${r.bold ? "border-t border-[var(--border)] pt-2 mt-1" : ""}`}>
                  <span className={r.bold ? "font-semibold text-[var(--ink-1)]" : "text-[var(--ink-3)]"}>{r.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--ink-4)] font-mono">{r.pct.toFixed(1)}%</span>
                    <span className={`font-mono font-semibold ${r.bold ? (r.value >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]") : r.value < 0 ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>
                      {r.value >= 0 ? eur(r.value) : `−${eur(Math.abs(r.value))}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--warning-soft)] border border-[rgba(245,158,11,0.2)] rounded-xl p-4">
            <div className="flex items-start gap-2">
              <TrendingDown size={13} className="text-[var(--warning)] mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-[12px] font-semibold text-[var(--ink-1)] mb-1">Oportunidad de ahorro</div>
                <div className="text-[11px] text-[var(--ink-3)]">Apps sin usar: PageFly + Zipify = 58 €/mes. Consolida en una sola solución para liberar {eur(58 * 12)}/año.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
