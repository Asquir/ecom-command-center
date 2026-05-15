"use client";
import { useState, useMemo } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { eur } from "@/lib/utils";
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp, DollarSign, Info } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";

interface CashFlowConfig {
  startingBalance: number;
  dailyAdSpend: number;
  avgDailyOrders: number;
  aov: number;
  cogsPerOrder: number;
  payoutCycleDays: number;
  monthlyFixed: number;
}

interface DayData {
  day: number;
  label: string;
  outflow: number;
  inflow: number;
  balance: number;
  isPayoutDay: boolean;
  danger: boolean;
}

function simulate(cfg: CashFlowConfig, days: number): DayData[] {
  const result: DayData[] = [];
  let balance = cfg.startingBalance;
  const dailyFixed = cfg.monthlyFixed / 30;

  for (let i = 1; i <= days; i++) {
    const isPayoutDay = i % cfg.payoutCycleDays === 0;
    const outflow = cfg.dailyAdSpend + cfg.cogsPerOrder * cfg.avgDailyOrders + dailyFixed;
    const inflow = isPayoutDay ? cfg.aov * cfg.avgDailyOrders * cfg.payoutCycleDays : 0;
    balance += inflow - outflow;

    const d = new Date();
    d.setDate(d.getDate() + i);
    result.push({
      day: i,
      label: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
      outflow: +(outflow.toFixed(2)),
      inflow: +(inflow.toFixed(2)),
      balance: +(balance.toFixed(2)),
      isPayoutDay,
      danger: balance < 200,
    });
  }
  return result;
}

function NumField({ label, hint, value, onChange, suffix, prefix }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; suffix?: string; prefix?: string;
}) {
  return (
    <div>
      <div className="text-[12px] font-semibold text-[var(--ink-2)] mb-0.5">{label}</div>
      {hint && <div className="text-[11px] text-[var(--ink-5)] mb-1.5">{hint}</div>}
      <div className="flex items-center h-9 border border-[var(--border)] rounded-lg overflow-hidden bg-white focus-within:border-[var(--gold)] focus-within:ring-2 focus-within:ring-[rgba(200,169,106,0.15)] transition-all">
        {prefix && <span className="px-2.5 text-[11px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-r border-[var(--border)] h-full flex items-center">{prefix}</span>}
        <input value={value} onChange={e => onChange(e.target.value)} type="number" min="0" step="0.01"
          className="flex-1 px-2.5 text-[13px] text-[var(--ink-1)] outline-none bg-transparent font-mono" />
        {suffix && <span className="px-2.5 text-[11px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-l border-[var(--border)] h-full flex items-center">{suffix}</span>}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, ok }: { label: string; value: string; sub: string; ok?: boolean | null }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
      <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-1.5">{label}</div>
      <div className={`font-mono font-bold text-[20px] ${ok === true ? "text-[var(--success)]" : ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>{value}</div>
      <div className="text-[11px] text-[var(--ink-4)] mt-1">{sub}</div>
    </div>
  );
}

const DEFAULT_CONFIG: CashFlowConfig = {
  startingBalance: 500,
  dailyAdSpend: 20,
  avgDailyOrders: 1.5,
  aov: 39,
  cogsPerOrder: 12,
  payoutCycleDays: 7,
  monthlyFixed: 80,
};

export function CashFlow() {
  const { settings } = useSettings();
  const [savedCfg, setSavedCfg] = useLocalStorage<CashFlowConfig>("ecc-cashflow-config", {
    ...DEFAULT_CONFIG,
    aov: settings.aov || DEFAULT_CONFIG.aov,
    cogsPerOrder: settings.productCost || DEFAULT_CONFIG.cogsPerOrder,
  });

  const [balance, setBalance] = useState(String(savedCfg.startingBalance));
  const [adSpend, setAdSpend] = useState(String(savedCfg.dailyAdSpend));
  const [orders, setOrders] = useState(String(savedCfg.avgDailyOrders));
  const [aov, setAov] = useState(String(savedCfg.aov));
  const [cogs, setCogs] = useState(String(savedCfg.cogsPerOrder));
  const [payout, setPayout] = useState(String(savedCfg.payoutCycleDays));
  const [fixed, setFixed] = useState(String(savedCfg.monthlyFixed));
  const [days, setDays] = useState(30);

  const n = (v: string) => Math.max(0, parseFloat(v) || 0);

  const cfg: CashFlowConfig = {
    startingBalance: n(balance), dailyAdSpend: n(adSpend), avgDailyOrders: n(orders),
    aov: n(aov), cogsPerOrder: n(cogs), payoutCycleDays: Math.max(1, n(payout)) || 7,
    monthlyFixed: n(fixed),
  };

  const data = useMemo(() => simulate(cfg, days), [
    cfg.startingBalance, cfg.dailyAdSpend, cfg.avgDailyOrders, cfg.aov,
    cfg.cogsPerOrder, cfg.payoutCycleDays, cfg.monthlyFixed, days,
  ]);

  const firstDanger = data.find(d => d.danger);
  const minBalance = Math.min(...data.map(d => d.balance));
  const finalBalance = data[data.length - 1]?.balance ?? 0;
  const totalProfit = finalBalance - cfg.startingBalance;
  const dailyNetAvg = totalProfit / days;
  const chartData = data.filter((_, i) => i % (days >= 60 ? 3 : 1) === 0 || data[i].isPayoutDay);

  const save = () => setSavedCfg(cfg);

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Finanzas · Proyección</div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Flujo de caja</h1>
        <p className="text-[13px] text-[var(--ink-3)] mt-1">
          Simula tu posición de caja real — Meta cobra cada día, Shopify paga cada semana. Aquí ves cuándo podrías quedarte sin dinero.
        </p>
      </div>

      {firstDanger && (
        <div className="bg-[var(--danger-soft)] border border-[rgba(239,68,68,0.25)] rounded-xl p-4 flex gap-3">
          <AlertTriangle size={18} className="text-[var(--danger)] flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-[13px] font-semibold text-[var(--ink-1)] mb-0.5">
              Riesgo de caja en el día {firstDanger.day} ({firstDanger.label})
            </div>
            <div className="text-[12px] text-[var(--ink-3)]">
              Tu saldo bajará por debajo de €200. Con el ritmo actual necesitas aumentar tus pedidos o reducir el gasto publicitario.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Config */}
        <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-5 space-y-4">
          <div className="text-[12px] font-semibold text-[var(--ink-3)] uppercase tracking-wider">Configuración</div>
          <NumField label="Saldo actual en cuenta" hint="Lo que tienes ahora mismo" value={balance} onChange={setBalance} suffix="€" />
          <NumField label="Presupuesto diario en ads" hint="Gasto diario total en Meta" value={adSpend} onChange={setAdSpend} suffix="€/día" />
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Pedidos/día (media)" value={orders} onChange={setOrders} />
            <NumField label="Precio venta (AOV)" value={aov} onChange={setAov} suffix="€" />
          </div>
          <NumField label="Coste por pedido" hint="COGS + envío al proveedor" value={cogs} onChange={setCogs} suffix="€" />
          <div>
            <div className="text-[12px] font-semibold text-[var(--ink-2)] mb-1.5">Ciclo de cobro Shopify</div>
            <select value={payout} onChange={e => setPayout(e.target.value)}
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none bg-white appearance-none focus:border-[var(--gold)]">
              <option value="7">Semanal (7 días)</option>
              <option value="14">Quincenal (14 días)</option>
              <option value="3">3 días (Shopify Payments ES)</option>
            </select>
          </div>
          <NumField label="Gastos fijos mensuales" hint="Shopify, apps, dominio..." value={fixed} onChange={setFixed} suffix="€/mes" />
          <div>
            <div className="text-[12px] font-semibold text-[var(--ink-2)] mb-2">Período de proyección</div>
            <div className="flex gap-2">
              {[30, 60, 90].map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${days === d ? "bg-[var(--ink-1)] text-white border-[var(--ink-1)]" : "border-[var(--border)] text-[var(--ink-3)] hover:bg-[var(--bg-inset)]"}`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <button onClick={save} className="w-full py-2 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black transition-colors">
            Guardar configuración
          </button>
        </div>

        {/* Chart + KPIs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Saldo final" value={eur(finalBalance)} sub={`en ${days} días`} ok={finalBalance > cfg.startingBalance} />
            <Kpi label="P&L total" value={eur(totalProfit)} sub="beneficio neto estimado" ok={totalProfit > 0} />
            <Kpi label="Neto diario" value={eur(dailyNetAvg)} sub="promedio por día" ok={dailyNetAvg > 0} />
            <Kpi label="Saldo mínimo" value={eur(minBalance)} sub="punto más bajo" ok={minBalance > 200} />
          </div>

          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[13px] font-semibold text-[var(--ink-1)]">Proyección de saldo · {days} días</div>
                <div className="text-[11px] text-[var(--ink-4)]">Los picos son los días de cobro de Shopify</div>
              </div>
              <div className="flex gap-3 text-[11px] text-[var(--ink-3)]">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-[var(--ink-1)] inline-block" /> Saldo</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-[var(--danger)] inline-block border-dashed" style={{borderTop:"2px dashed var(--danger)"}} /> Riesgo</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={minBalance < 0 ? "var(--danger)" : "var(--ink-1)"} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={minBalance < 0 ? "var(--danger)" : "var(--ink-1)"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--ink-4)" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "var(--ink-4)" }} width={45} tickFormatter={v => `${v}€`} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                  formatter={(v, name) => [
                    typeof v === "number" ? `${v.toFixed(2)}€` : `${v}€`,
                    name === "balance" ? "Saldo" : name === "inflow" ? "Cobro Shopify" : "Gastos",
                  ]}
                />
                <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="4 2" strokeWidth={1.5} />
                <ReferenceLine y={200} stroke="var(--warning)" strokeDasharray="3 3" strokeWidth={1} label={{ value: "buffer €200", fontSize: 9, fill: "var(--warning)" }} />
                <Area type="monotone" dataKey="balance" stroke="var(--ink-1)" strokeWidth={2} fill="url(#balGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Insight cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
              <div className="text-[11px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-2">¿Qué significa esto?</div>
              {totalProfit > 0 ? (
                <div className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-[var(--success)] mt-0.5 flex-shrink-0" />
                  <div className="text-[12px] text-[var(--ink-2)] leading-relaxed">
                    Con este ritmo <strong>generarás {eur(totalProfit)}</strong> en {days} días. Tu negocio es cash-flow positivo.
                    {!firstDanger && " Sin riesgo de quedarte sin liquidez."}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <TrendingDown size={14} className="text-[var(--danger)] mt-0.5 flex-shrink-0" />
                  <div className="text-[12px] text-[var(--ink-2)] leading-relaxed">
                    A este ritmo <strong>perderás {eur(Math.abs(totalProfit))}</strong> en {days} días.
                    Necesitas {Math.ceil(-dailyNetAvg * 30 / (cfg.aov - cfg.cogsPerOrder))} pedidos/mes extra para ser rentable.
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
              <div className="text-[11px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-2">Para ser rentable necesitas</div>
              {(() => {
                const dailyCost = cfg.dailyAdSpend + cfg.monthlyFixed / 30;
                const netPerOrder = cfg.aov - cfg.cogsPerOrder;
                const ordersNeeded = netPerOrder > 0 ? dailyCost / netPerOrder : 0;
                const roasNeeded = cfg.aov > 0 ? (cfg.cogsPerOrder + dailyCost / Math.max(0.1, cfg.avgDailyOrders)) / cfg.aov : 0;
                return (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[var(--ink-3)]">Pedidos/día mínimos</span>
                      <span className="font-mono font-semibold text-[var(--ink-1)]">{ordersNeeded.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[var(--ink-3)]">ROAS de punto muerto</span>
                      <span className="font-mono font-semibold text-[var(--ink-1)]">{roasNeeded.toFixed(2)}×</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[var(--ink-3)]">Margen bruto por pedido</span>
                      <span className="font-mono font-semibold text-[var(--ink-1)]">{eur(cfg.aov - cfg.cogsPerOrder)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="bg-[var(--bg-inset)] border border-[var(--border)] rounded-xl p-3 flex gap-2">
            <Info size={13} className="text-[var(--ink-4)] flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-[var(--ink-3)] leading-relaxed">
              Esta proyección asume pedidos constantes. En dropshipping real habrá días sin ventas y días con picos. Usa esto como guía de worst/best case. El saldo mínimo recomendado es al menos 2–3× tu presupuesto diario en ads.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
