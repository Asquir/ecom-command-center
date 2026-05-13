"use client";
import { useState, useMemo } from "react";
import { eur } from "@/lib/utils";

interface CalcInputs {
  aov: number; price1: number; price2: number; price3: number;
  cogs1: number; cogs2: number; cogs3: number;
  shipping: number; payPct: number; payFix: number; cogsAvg: number;
  monthlyShopify: number; monthlyApps: number; monthlySoftware: number; monthlyOthers: number;
  targetMarginPct: number; atcGoal: number; icGoal: number; cvrGoal: number; fx: number;
}

function Field({ label, value, onChange, step = "0.01" }: { label: string; value: number; onChange: (v: number) => void; step?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-[var(--ink-3)] uppercase tracking-wide">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="font-mono text-[13px] px-3 py-2 border border-[var(--border-strong)] rounded-lg bg-white text-[var(--ink-1)] outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[rgba(200,169,106,0.15)] transition-all"
      />
    </div>
  );
}

function Result({ label, value, big, accent }: { label: string; value: string; big?: boolean; accent?: "success" | "gold" | "danger" }) {
  const color = accent === "success" ? "text-[var(--success)]" : accent === "gold" ? "text-[var(--gold-deep)]" : accent === "danger" ? "text-[var(--danger)]" : "text-[var(--ink-1)]";
  return (
    <div className="p-3.5 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-inset)]">
      <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wide mb-1.5">{label}</div>
      <div className={`font-mono font-bold ${big ? "text-[24px]" : "text-[17px]"} tracking-tight ${color}`}>{value}</div>
    </div>
  );
}

export function Calculator() {
  const [inputs, setInputs] = useState<CalcInputs>({
    aov: 39, price1: 39, price2: 69, price3: 94,
    cogs1: 8.5, cogs2: 16.2, cogs3: 23.0,
    shipping: 0, payPct: 7, payFix: 0.25, cogsAvg: 8.5,
    monthlyShopify: 29, monthlyApps: 82.89, monthlySoftware: 22, monthlyOthers: 6.50,
    targetMarginPct: 20, atcGoal: 10, icGoal: 6, cvrGoal: 3, fx: 0.89,
  });

  const set = (k: keyof CalcInputs) => (v: number) => setInputs(p => ({ ...p, [k]: v }));

  const c = useMemo(() => {
    const daily = (inputs.monthlyShopify + inputs.monthlyApps + inputs.monthlySoftware + inputs.monthlyOthers) / 30;
    const fees = inputs.aov * (inputs.payPct / 100) + inputs.payFix;
    const beCpa = inputs.aov - inputs.cogsAvg - inputs.shipping - fees;
    const targetMarginAmt = inputs.aov * (inputs.targetMarginPct / 100);
    const targetCpa = beCpa - targetMarginAmt;
    const beRoas = inputs.aov / Math.max(0.01, beCpa);
    const targetRoas = inputs.aov / Math.max(0.01, targetCpa);
    const beCpAtc = beCpa * (inputs.atcGoal / 100);
    const beCpIc = beCpa * (inputs.icGoal / 100);
    const cpcMax = targetCpa * (inputs.cvrGoal / 100);
    const dailyBudget = beCpa * 3;
    const profitPack1 = inputs.price1 - inputs.cogs1 - inputs.shipping - (inputs.price1 * inputs.payPct / 100 + inputs.payFix);
    const profitPack2 = inputs.price2 - inputs.cogs2 - inputs.shipping - (inputs.price2 * inputs.payPct / 100 + inputs.payFix);
    const profitPack3 = inputs.price3 - inputs.cogs3 - inputs.shipping - (inputs.price3 * inputs.payPct / 100 + inputs.payFix);
    return { daily, fees, beCpa, targetCpa, beRoas, targetRoas, beCpAtc, beCpIc, cpcMax, dailyBudget, profitPack1, profitPack2, profitPack3 };
  }, [inputs]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Cálculo en vivo</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Calculadora de rentabilidad</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Define tu break-even real antes de gastar un euro en ads.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Inputs */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">Precios y costes por pack</div>
              <span className="text-[11px] text-[var(--ink-3)] font-mono">FX {inputs.fx}</span>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              <Field label="AOV / pedido (€)" value={inputs.aov} onChange={set("aov")} step="0.5" />
              <Field label="Comisión pago %" value={inputs.payPct} onChange={set("payPct")} step="0.1" />
              <Field label="Comisión fija (€)" value={inputs.payFix} onChange={set("payFix")} step="0.05" />
              <Field label="Precio Pack 1" value={inputs.price1} onChange={set("price1")} step="1" />
              <Field label="Precio Pack 2" value={inputs.price2} onChange={set("price2")} step="1" />
              <Field label="Precio Pack 3" value={inputs.price3} onChange={set("price3")} step="1" />
              <Field label="COGS Pack 1" value={inputs.cogs1} onChange={set("cogs1")} step="0.1" />
              <Field label="COGS Pack 2" value={inputs.cogs2} onChange={set("cogs2")} step="0.1" />
              <Field label="COGS Pack 3" value={inputs.cogs3} onChange={set("cogs3")} step="0.1" />
              <Field label="Coste envío" value={inputs.shipping} onChange={set("shipping")} step="0.5" />
              <Field label="COGS prom (env. incl.)" value={inputs.cogsAvg} onChange={set("cogsAvg")} step="0.1" />
              <Field label="Tipo cambio EUR/USD" value={inputs.fx} onChange={set("fx")} step="0.01" />
            </div>
          </div>

          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">Gastos mensuales</div>
              <span className="text-[11px] font-mono text-[var(--ink-1)]">Total: {eur(inputs.monthlyShopify + inputs.monthlyApps + inputs.monthlySoftware + inputs.monthlyOthers)} · Diario: {eur(c.daily)}</span>
            </div>
            <div className="p-4 grid grid-cols-4 gap-3">
              <Field label="Shopify" value={inputs.monthlyShopify} onChange={set("monthlyShopify")} step="1" />
              <Field label="Apps" value={inputs.monthlyApps} onChange={set("monthlyApps")} step="1" />
              <Field label="Software" value={inputs.monthlySoftware} onChange={set("monthlySoftware")} step="1" />
              <Field label="Otros" value={inputs.monthlyOthers} onChange={set("monthlyOthers")} step="1" />
            </div>
          </div>

          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">Objetivos del funnel</div>
            </div>
            <div className="p-4 grid grid-cols-4 gap-3">
              <Field label="Margen obj. %" value={inputs.targetMarginPct} onChange={set("targetMarginPct")} step="1" />
              <Field label="ATC obj. %" value={inputs.atcGoal} onChange={set("atcGoal")} step="0.5" />
              <Field label="Checkout obj. %" value={inputs.icGoal} onChange={set("icGoal")} step="0.5" />
              <Field label="Conversión %" value={inputs.cvrGoal} onChange={set("cvrGoal")} step="0.1" />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">Break-even</div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--gold-soft)] text-[var(--gold-deep)] font-semibold">cálculo en vivo</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <Result label="Cost Per Purchase"       value={eur(c.beCpa)}        big accent="danger" />
              <Result label="Break-even ROAS"         value={`${c.beRoas.toFixed(2)}×`} big accent="danger" />
              <Result label="Cost Per Init. Checkout" value={eur(c.beCpIc)} />
              <Result label="Cost Per Add To Cart"    value={eur(c.beCpAtc)} />
              <Result label="CPC máximo rentable"     value={eur(c.cpcMax)} />
              <Result label="Comisión pasarela"       value={eur(c.fees)} />
            </div>
          </div>

          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">KPIs objetivo ({inputs.targetMarginPct}% margen)</div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <Result label="CPA objetivo"   value={eur(c.targetCpa)}           big accent="success" />
              <Result label="ROAS objetivo"  value={`${c.targetRoas.toFixed(2)}×`} big accent="success" />
              <Result label="CPIC objetivo"  value={eur(c.targetCpa * (inputs.icGoal / 100))} />
              <Result label="CPATC objetivo" value={eur(c.targetCpa * (inputs.atcGoal / 100))} />
            </div>
          </div>

          <div className="bg-[var(--bg-inset)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-3">Presupuesto de testing recomendado</div>
            <div className="font-mono text-[30px] font-bold text-[var(--ink-1)] tracking-tight">{eur(c.dailyBudget)}</div>
            <div className="text-[12px] text-[var(--ink-3)] mt-1">/ día por conjunto (≈ 3× BE CPA)</div>
            <div className="h-px bg-[var(--border)] my-3" />
            <div className="grid grid-cols-3 gap-2">
              {[["Pack 1", c.profitPack1], ["Pack 2", c.profitPack2], ["Pack 3", c.profitPack3]].map(([l, v]) => (
                <div key={String(l)}>
                  <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wide mb-0.5">{l} margen</div>
                  <div className="font-mono font-bold text-[14px] text-[var(--gold-deep)]">{eur(Number(v))}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
