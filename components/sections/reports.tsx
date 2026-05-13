"use client";
import { useState } from "react";
import { DEMO_METRICS, TREND_REVENUE, TREND_SPEND, TREND_ROAS, DECISIONS_LOG } from "@/lib/data";
import { eur, pct } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine
} from "recharts";
import { CheckCircle, Clock, ArrowUp, ArrowDown, FileText, Download } from "lucide-react";

const DAYS = ["7 may","8 may","9 may","10 may","11 may","12 may","13 may"];
const m = DEMO_METRICS;

const weeklyData = DAYS.map((d, i) => ({
  day: d,
  ingresos: TREND_REVENUE[i],
  gasto: TREND_SPEND[i],
  roas: TREND_ROAS[i],
  beneficio: TREND_REVENUE[i] - TREND_SPEND[i] - 21,
}));

function DecisionIcon({ icon }: { icon: string }) {
  if (icon === "up")    return <ArrowUp size={12} className="text-[var(--success)]" />;
  if (icon === "down")  return <ArrowDown size={12} className="text-[var(--warning)]" />;
  if (icon === "pause") return <span className="text-[10px] text-[var(--danger)]">⏸</span>;
  if (icon === "copy")  return <span className="text-[10px] text-[var(--info)]">⎘</span>;
  return <Clock size={12} className="text-[var(--ink-4)]" />;
}

export function Reports() {
  const [tab, setTab] = useState<"daily" | "weekly">("daily");

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Reportes · Regadera Anti-Sarro</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Reportes</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Resumen diario y semanal para tomar decisiones documentadas.</p>
        </div>
        <button className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink-1)] shadow-sm hover:bg-[var(--bg-inset)] flex items-center gap-1.5">
          <Download size={12} /> Exportar PDF
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-inset)] rounded-lg p-1 w-fit">
        {(["daily", "weekly"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${tab === t ? "bg-white text-[var(--ink-1)] shadow-sm" : "text-[var(--ink-3)] hover:text-[var(--ink-1)]"}`}
          >
            {t === "daily" ? "Reporte diario" : "Reporte semanal"}
          </button>
        ))}
      </div>

      {tab === "daily" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-1">13 de mayo, 2026</div>
                <div className="text-[18px] font-bold text-[var(--ink-1)]">Reporte del día — Regadera Anti-Sarro</div>
                <div className="text-[13px] text-[var(--ink-3)] mt-1">Día 3 de testing · 1 campaña activa · 3 creativos</div>
              </div>
              <FileText size={20} className="text-[var(--ink-5)] flex-shrink-0" />
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: "Ingresos",  value: eur(m.revenue),    delta: "+21%", ok: true },
              { label: "Gasto",     value: eur(m.adSpend),    delta: "−4%",  ok: true },
              { label: "Beneficio", value: eur(m.profit),     delta: "+38%", ok: true },
              { label: "ROAS",      value: `${m.roas.toFixed(2)}×`, delta: "+26%", ok: m.roas >= m.beRoas },
              { label: "CPA",       value: eur(m.cpa),        delta: "−14%", ok: m.cpa <= m.beCpa },
              { label: "Margen",    value: pct(m.netMarginPct), delta: "+3%", ok: true },
            ].map(s => (
              <div key={s.label} className="bg-white border border-[var(--border)] rounded-xl p-3 shadow-sm">
                <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wider mb-1">{s.label}</div>
                <div className={`font-mono font-bold text-[15px] ${s.ok ? "text-[var(--ink-1)]" : "text-[var(--danger)]"}`}>{s.value}</div>
                <div className={`text-[10px] font-semibold mt-0.5 ${s.delta.startsWith("+") ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>{s.delta} vs ayer</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* What happened */}
            <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4 space-y-3">
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">¿Qué pasó hoy?</div>
              <div className="space-y-2">
                {[
                  { ok: true,  text: `ROAS ${m.roas.toFixed(2)}× supera break-even (${m.beRoas.toFixed(2)}×) por primera vez.` },
                  { ok: true,  text: `CTR 2.59% — ángulo Sarro generando 3× más clics que Pelo.` },
                  { ok: false, text: `64 ATC → 32 checkouts (50% conversión). Objetivo es ≥60%.` },
                  { ok: false, text: `Creativo Pelo pausado: CPC 0.67 €, 0 ATC tras ${eur(5.37)} gastados.` },
                  { ok: true,  text: "Prime time MX (20–23h) generó el 62% de las compras del día." },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-[12px]">
                    <CheckCircle size={13} className={`mt-0.5 flex-shrink-0 ${item.ok ? "text-[var(--success)]" : "text-[var(--warning)]"}`} />
                    <span className="text-[var(--ink-2)] leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Decisions log */}
            <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4 space-y-3">
              <div className="text-[13px] font-semibold text-[var(--ink-1)]">Decisiones tomadas</div>
              <div className="space-y-2.5">
                {DECISIONS_LOG.map((d, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <DecisionIcon icon={d.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[var(--ink-2)] leading-snug">{d.action}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[var(--ink-4)]">{d.ts}</span>
                        <span className="text-[10px] font-semibold text-[var(--ink-3)] bg-[var(--bg-inset)] px-1.5 py-0.5 rounded">{d.who}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Next actions */}
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
            <div className="text-[13px] font-semibold text-[var(--ink-1)] mb-3">Plan para mañana (día 4)</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { n: "1", title: "Crear variaciones Sarro", body: "3 hooks nuevos con el ángulo ganador. Mantener creativo Presión como control." },
                { n: "2", title: "Revisar checkout en móvil", body: "Investigar por qué 50% de ATC no termina checkout. Probar en 3 dispositivos." },
                { n: "3", title: "Esperar prime time MX", body: "Revisar métricas a las 23:30 MX. No tomar decisiones antes de ese momento." },
              ].map(a => (
                <div key={a.n} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--ink-1)] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5">{a.n}</div>
                  <div>
                    <div className="text-[12px] font-semibold text-[var(--ink-1)]">{a.title}</div>
                    <div className="text-[11px] text-[var(--ink-3)] mt-0.5 leading-relaxed">{a.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "weekly" && (
        <div className="space-y-4">
          {/* Weekly chart */}
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[13px] font-semibold text-[var(--ink-1)]">Tendencia 7 días — Ingresos vs Gasto</div>
                <div className="text-[12px] text-[var(--ink-3)]">7 may – 13 may · Regadera Anti-Sarro</div>
              </div>
              <div className="flex gap-4 text-[11px] text-[var(--ink-3)]">
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-[var(--ink-1)]" /> Ingresos</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-[2px] bg-[var(--gold)]" style={{borderTop:"2px dashed var(--gold)"}} /> Gasto</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-[var(--success)]" /> Beneficio</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--ink-4)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--ink-4)" }} width={40} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v, name) => [`${v} €`, name === "ingresos" ? "Ingresos" : name === "gasto" ? "Gasto" : "Beneficio"]}
                />
                <Line dataKey="ingresos"  stroke="var(--ink-1)"   strokeWidth={2} dot={false} />
                <Line dataKey="gasto"     stroke="var(--gold)"    strokeWidth={2} dot={false} strokeDasharray="4 2" />
                <Line dataKey="beneficio" stroke="var(--success)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Ingresos semana",  value: eur(TREND_REVENUE.reduce((s, v) => s + v, 0)) },
              { label: "Gasto semana",     value: eur(TREND_SPEND.reduce((s, v) => s + v, 0)) },
              { label: "ROAS promedio",    value: `${(TREND_ROAS.reduce((s,v)=>s+v,0)/7).toFixed(2)}×`, ok: true },
              { label: "Mejor día",        value: "13 may · 2.53×", sub: "ROAS máx" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
                <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wider mb-1">{s.label}</div>
                <div className={`font-mono font-bold text-[16px] ${s.ok ? "text-[var(--success)]" : "text-[var(--ink-1)]"}`}>{s.value}</div>
                {s.sub && <div className="text-[11px] text-[var(--ink-4)] mt-0.5">{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* Learnings */}
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-5">
            <div className="text-[13px] font-semibold text-[var(--ink-1)] mb-3">Aprendizajes de la semana</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Ángulo ganador", value: "Sarro — hook visual funciona mejor que el de presión" },
                { label: "Peor creativo",   value: "Pelo — CPM muy alto, audiencia no receptiva en MX" },
                { label: "Mejor horario",   value: "Prime time MX 20–23h: +62% conversiones" },
                { label: "Punto de mejora", value: "Checkout: optimizar paso de carrito a pago" },
                { label: "Próxima acción",  value: "Escalar ángulo Sarro con 3 variaciones de hook" },
                { label: "Semana próxima",  value: "Testear LAL 1% basada en compradores actuales" },
              ].map(r => (
                <div key={r.label} className="flex gap-3">
                  <div className="w-1 flex-shrink-0 bg-[var(--gold)] rounded-full" />
                  <div>
                    <div className="text-[11px] font-semibold text-[var(--ink-4)] uppercase tracking-wide mb-0.5">{r.label}</div>
                    <div className="text-[12px] text-[var(--ink-2)]">{r.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
