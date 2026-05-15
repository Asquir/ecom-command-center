"use client";
import { useState } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { eur, cx } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { downloadCSV } from "@/lib/export";
import { TrendingDown, Download, Plus, Trash2, Receipt } from "lucide-react";

interface FixedCost {
  id: string;
  cat: string;
  name: string;
  monthly: number;
}

interface ExpenseSummary {
  revenue: number;
  adSpend: number;
}

const CATEGORIES = ["Shopify", "Apps", "Dominio", "Software", "IA/Creativos", "Gestoría", "Marketing", "Otros"];

function NewCostModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (c: FixedCost) => void }) {
  const [cat, setCat] = useState("Apps");
  const [name, setName] = useState("");
  const [monthly, setMonthly] = useState("");

  const add = () => {
    if (!name.trim() || !parseFloat(monthly)) return;
    onAdd({ id: `fc${Date.now()}`, cat, name: name.trim(), monthly: parseFloat(monthly) });
    setName(""); setMonthly(""); setCat("Apps");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo gasto fijo">
      <div className="space-y-3">
        <div>
          <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Categoría</label>
          <select value={cat} onChange={e => setCat(e.target.value)}
            className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none bg-white">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Servicio *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Shopify Basic, Trustoo, dominio..."
            className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
        </div>
        <div>
          <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Coste mensual (€) *</label>
          <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="29"
            className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={add} disabled={!name.trim() || !parseFloat(monthly)}
            className="flex-1 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black disabled:opacity-40">
            Añadir gasto
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--ink-3)] text-[13px]">
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function Expenses() {
  const { success, warning } = useToast();
  const [costs, setCosts] = useLocalStorage<FixedCost[]>("ecc-expenses", []);
  const [summary, setSummary] = useLocalStorage<ExpenseSummary>("ecc-expense-summary", { revenue: 0, adSpend: 0 });
  const [newModal, setNewModal] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [revenueInput, setRevenueInput] = useState("");
  const [adSpendInput, setAdSpendInput] = useState("");

  const total = costs.reduce((s, c) => s + c.monthly, 0);
  const totalAll = total + summary.adSpend;
  const netProfit = summary.revenue - totalAll;
  const netMargin = summary.revenue > 0 ? (netProfit / summary.revenue) * 100 : 0;

  const cats = Array.from(new Set(costs.map(c => c.cat)));
  const catTotals = cats.map(cat => ({
    cat,
    total: costs.filter(c => c.cat === cat).reduce((s, c) => s + c.monthly, 0),
    items: costs.filter(c => c.cat === cat),
  })).sort((a, b) => b.total - a.total);
  const maxCat = catTotals.length > 0 ? Math.max(...catTotals.map(c => c.total)) : 1;

  const deleteCost = (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    setCosts(prev => prev.filter(c => c.id !== id));
    warning("Gasto eliminado");
  };

  const startEditSummary = () => {
    setRevenueInput(summary.revenue > 0 ? String(summary.revenue) : "");
    setAdSpendInput(summary.adSpend > 0 ? String(summary.adSpend) : "");
    setEditingSummary(true);
  };

  const saveSummary = () => {
    setSummary({
      revenue: parseFloat(revenueInput) || 0,
      adSpend: parseFloat(adSpendInput) || 0,
    });
    setEditingSummary(false);
    success("Resumen del mes actualizado");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Gastos fijos · estimado mensual</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Gastos fijos</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Infraestructura mensual, impacto en margen y análisis por categoría.</p>
        </div>
        <div className="flex gap-2">
          {costs.length > 0 && (
            <button onClick={() => {
              downloadCSV("gastos-fijos.csv", costs.map(c => ({ categoria: c.cat, servicio: c.name, mensual: c.monthly, anual: c.monthly * 12 })));
              success("CSV exportado", "gastos-fijos.csv descargado.");
            }} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white shadow-sm hover:bg-[var(--bg-inset)] flex items-center gap-1.5">
              <Download size={12} /> CSV
            </button>
          )}
          <button onClick={() => setNewModal(true)}
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black flex items-center gap-1.5">
            <Plus size={12} /> Nuevo gasto
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="text-[13px] font-semibold text-[var(--ink-1)]">Resumen del mes</div>
          {editingSummary ? (
            <div className="flex gap-2">
              <button onClick={saveSummary} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[var(--success)] text-white">Guardar</button>
              <button onClick={() => setEditingSummary(false)} className="text-[11px] px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--ink-3)]">Cancelar</button>
            </div>
          ) : (
            <button onClick={startEditSummary} className="text-[11px] font-medium text-[var(--ink-3)] hover:text-[var(--ink-1)]">Editar valores</button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-[var(--border)]">
          {editingSummary ? (
            <>
              <div className="p-4">
                <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wider mb-1">Ingresos del mes</div>
                <input value={revenueInput} onChange={e => setRevenueInput(e.target.value)} type="number" placeholder="0"
                  className="w-full h-9 px-2 text-[14px] font-mono font-bold border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
              </div>
              <div className="p-4">
                <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wider mb-1">Gasto en ads</div>
                <input value={adSpendInput} onChange={e => setAdSpendInput(e.target.value)} type="number" placeholder="0"
                  className="w-full h-9 px-2 text-[14px] font-mono font-bold border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
              </div>
              <div className="p-4">
                <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wider mb-1">Gastos fijos</div>
                <div className="font-mono font-bold text-[18px] text-[var(--ink-1)]">{eur(total)}</div>
                <div className="text-[11px] text-[var(--ink-4)] mt-0.5">{costs.length} líneas</div>
              </div>
              <div className="p-4">
                <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wider mb-1">Beneficio neto</div>
                <div className="font-mono font-bold text-[18px] text-[var(--ink-4)]">—</div>
              </div>
            </>
          ) : (
            [
              { label: "Ingresos del mes", value: eur(summary.revenue) },
              { label: "Gasto en ads",     value: eur(summary.adSpend), sub: "variable" },
              { label: "Gastos fijos",     value: eur(total),           sub: `${costs.length} líneas` },
              { label: "Beneficio neto",   value: summary.revenue > 0 ? eur(netProfit) : "—",
                sub: summary.revenue > 0 ? `${netMargin.toFixed(1)}% margen` : "Sin datos",
                ok: summary.revenue > 0 ? netProfit > 0 : undefined },
            ].map(s => (
              <div key={s.label} className="p-4">
                <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wider mb-1">{s.label}</div>
                <div className={`font-mono font-bold text-[18px] ${s.ok === true ? "text-[var(--success)]" : s.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>{s.value}</div>
                {s.sub && <div className="text-[11px] text-[var(--ink-4)] mt-0.5">{s.sub}</div>}
              </div>
            ))
          )}
        </div>
      </div>

      {costs.length === 0 ? (
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-inset)] flex items-center justify-center">
            <Receipt size={22} className="text-[var(--ink-4)]" />
          </div>
          <div className="text-center">
            <h3 className="text-[15px] font-semibold text-[var(--ink-1)] mb-1">Sin gastos fijos todavía</h3>
            <p className="text-[13px] text-[var(--ink-4)] max-w-xs">Añade los servicios que pagas mensualmente (Shopify, apps, dominio…) para ver el impacto en tu margen.</p>
          </div>
          <button onClick={() => setNewModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black flex items-center gap-2">
            <Plus size={14} /> Añadir primer gasto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[var(--border)]">
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">Detalle de gastos fijos</div>
              <div className="text-[12px] text-[var(--ink-3)] mt-0.5">Renovación mensual · {costs.length} servicio{costs.length > 1 ? "s" : ""}</div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-inset)]">
                  {["Categoría", "Servicio", "Mensual", "Anual", "% del total", ""].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {costs.map(c => (
                  <tr key={c.id} className="hover:bg-[var(--bg-inset)] transition-colors">
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
                    <td className="px-4 py-3">
                      <button onClick={() => deleteCost(c.id)} className="text-[var(--ink-4)] hover:text-[var(--danger)]" title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--border-strong)] bg-[var(--bg-inset)]">
                  <td className="px-4 py-3 text-[12px] font-semibold text-[var(--ink-2)]" colSpan={2}>Total gastos fijos</td>
                  <td className="px-4 py-3 font-mono font-bold text-[14px] text-[var(--ink-1)]">{eur(total)}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-[var(--ink-4)]">{eur(total * 12)}</td>
                  <td /><td />
                </tr>
              </tfoot>
            </table>
          </div>

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

            {summary.revenue > 0 && (
              <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
                <div className="text-[13px] font-semibold text-[var(--ink-1)] mb-3">Impacto en margen</div>
                <div className="space-y-2">
                  {[
                    { label: "Ingresos brutos",  value: summary.revenue, pct: 100 },
                    { label: "− Gasto en ads",   value: -summary.adSpend, pct: -(summary.adSpend / summary.revenue) * 100 },
                    { label: "− Gastos fijos",   value: -total, pct: -(total / summary.revenue) * 100 },
                    { label: "= Beneficio neto", value: netProfit, pct: netMargin, bold: true },
                  ].map(r => (
                    <div key={r.label} className={`flex items-center justify-between text-[12px] ${r.bold ? "border-t border-[var(--border)] pt-2 mt-1" : ""}`}>
                      <span className={r.bold ? "font-semibold text-[var(--ink-1)]" : "text-[var(--ink-3)]"}>{r.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[var(--ink-4)] font-mono">{r.pct.toFixed(1)}%</span>
                        <span className={cx("font-mono font-semibold", r.bold ? (r.value >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]") : r.value < 0 ? "text-[var(--danger)]" : "text-[var(--ink-1)]")}>
                          {r.value >= 0 ? eur(r.value) : `−${eur(Math.abs(r.value))}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.revenue === 0 && (
              <div className="bg-[var(--warning-soft)] border border-[rgba(245,158,11,0.2)] rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <TrendingDown size={13} className="text-[var(--warning)] mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-[12px] font-semibold text-[var(--ink-1)] mb-1">Sin ingresos registrados</div>
                    <div className="text-[11px] text-[var(--ink-3)]">Edita el resumen del mes con ingresos y gasto en ads para ver el impacto real en tu margen.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <NewCostModal open={newModal} onClose={() => setNewModal(false)} onAdd={(c) => { setCosts(prev => [...prev, c]); success("Gasto añadido", c.name); }} />
    </div>
  );
}
