"use client";
import { useState } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { eur, pct, cx } from "@/lib/utils";
import { downloadCSV } from "@/lib/export";
import { useToast } from "@/components/ui/toast";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { FileText, Download, TrendingUp } from "lucide-react";

interface DailyMetrics {
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  atc: number;
  checkouts: number;
  purchases: number;
}
type DailyRecord = Record<string, DailyMetrics>;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function Reports() {
  const { settings } = useSettings();
  const [allMetrics] = useLocalStorage<DailyRecord>("ecc-daily-metrics", {});
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const { success } = useToast();

  const sortedDates = Object.keys(allMetrics).sort();
  const today = sortedDates[sortedDates.length - 1];
  const todayMetrics = today ? allMetrics[today] : null;
  const yesterday = sortedDates[sortedDates.length - 2];
  const yesterdayMetrics = yesterday ? allMetrics[yesterday] : null;

  const last7 = sortedDates.slice(-7).map(d => {
    const m = allMetrics[d];
    return {
      date: d,
      day: formatDate(d),
      ingresos: m.revenue,
      gasto: m.spend,
      roas: m.spend > 0 ? m.revenue / m.spend : 0,
      beneficio: m.revenue - m.spend,
    };
  });

  const todayROAS = todayMetrics && todayMetrics.spend > 0 ? todayMetrics.revenue / todayMetrics.spend : 0;
  const todayCPA = todayMetrics && todayMetrics.purchases > 0 ? todayMetrics.spend / todayMetrics.purchases : 0;
  const todayCTR = todayMetrics && todayMetrics.impressions > 0 ? (todayMetrics.clicks / todayMetrics.impressions) * 100 : 0;
  const todayProfit = todayMetrics ? todayMetrics.revenue - todayMetrics.spend : 0;
  const todayMargin = todayMetrics && todayMetrics.revenue > 0 ? (todayProfit / todayMetrics.revenue) * 100 : 0;

  const deltaVs = (curr: number, prev: number | undefined) => {
    if (prev === undefined || prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  };

  const weekRevenue = last7.reduce((s, d) => s + d.ingresos, 0);
  const weekSpend = last7.reduce((s, d) => s + d.gasto, 0);
  const weekROAS = weekSpend > 0 ? weekRevenue / weekSpend : 0;
  const bestDay = last7.length > 0 ? last7.reduce((b, d) => d.roas > b.roas ? d : b, last7[0]) : null;

  if (sortedDates.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Reportes</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Reportes</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Resumen diario y semanal generado a partir de tus métricas reales.</p>
        </div>
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm flex flex-col items-center justify-center py-16 gap-3">
          <FileText size={28} className="text-[var(--ink-4)]" />
          <div className="text-[14px] font-semibold text-[var(--ink-1)]">Sin métricas todavía</div>
          <p className="text-[12px] text-[var(--ink-4)] text-center max-w-md leading-relaxed">
            Cuando registres tu primer día de métricas en el <strong className="text-[var(--ink-1)]">Dashboard</strong>, los reportes diarios y semanales se generarán automáticamente con tus datos reales.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Reportes{settings.productName ? ` · ${settings.productName}` : ""}</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Reportes</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Resumen diario y semanal generado desde tus métricas reales.</p>
        </div>
        <button onClick={() => {
          downloadCSV(`reporte-${tab}.csv`, tab === "daily" && todayMetrics
            ? [{ fecha: today, ingresos: todayMetrics.revenue, gasto: todayMetrics.spend, beneficio: todayProfit, roas: todayROAS, cpa: todayCPA }]
            : last7.map(d => ({ dia: d.day, ingresos: d.ingresos, gasto: d.gasto, roas: d.roas, beneficio: d.beneficio }))
          );
          success("Reporte exportado", `reporte-${tab}.csv descargado.`);
        }} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink-1)] shadow-sm hover:bg-[var(--bg-inset)] flex items-center gap-1.5">
          <Download size={12} /> Exportar CSV
        </button>
      </div>

      <div className="flex gap-1 bg-[var(--bg-inset)] rounded-lg p-1 w-fit">
        {(["daily", "weekly"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${tab === t ? "bg-white text-[var(--ink-1)] shadow-sm" : "text-[var(--ink-3)] hover:text-[var(--ink-1)]"}`}>
            {t === "daily" ? "Reporte diario" : "Reporte semanal"}
          </button>
        ))}
      </div>

      {tab === "daily" && todayMetrics && (
        <div className="space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-1">{today}</div>
                <div className="text-[18px] font-bold text-[var(--ink-1)]">Reporte del día{settings.productName ? ` — ${settings.productName}` : ""}</div>
                <div className="text-[13px] text-[var(--ink-3)] mt-1">{sortedDates.length} día{sortedDates.length > 1 ? "s" : ""} con datos registrados</div>
              </div>
              <FileText size={20} className="text-[var(--ink-5)] flex-shrink-0" />
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: "Ingresos",  value: eur(todayMetrics.revenue),   delta: deltaVs(todayMetrics.revenue, yesterdayMetrics?.revenue), ok: true },
              { label: "Gasto",     value: eur(todayMetrics.spend),     delta: deltaVs(todayMetrics.spend, yesterdayMetrics?.spend) },
              { label: "Beneficio", value: eur(todayProfit),            delta: deltaVs(todayProfit, yesterdayMetrics ? yesterdayMetrics.revenue - yesterdayMetrics.spend : undefined), ok: todayProfit > 0 },
              { label: "ROAS",      value: `${todayROAS.toFixed(2)}×`,  delta: deltaVs(todayROAS, yesterdayMetrics && yesterdayMetrics.spend > 0 ? yesterdayMetrics.revenue / yesterdayMetrics.spend : undefined), ok: settings.beRoas > 0 ? todayROAS >= settings.beRoas : undefined },
              { label: "CPA",       value: todayCPA > 0 ? eur(todayCPA) : "—", delta: null, ok: settings.beCpa > 0 && todayCPA > 0 ? todayCPA <= settings.beCpa : undefined },
              { label: "Margen",    value: pct(todayMargin),            delta: null, ok: todayMargin > 0 },
            ].map(s => (
              <div key={s.label} className="bg-white border border-[var(--border)] rounded-xl p-3 shadow-sm">
                <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wider mb-1">{s.label}</div>
                <div className={`font-mono font-bold text-[15px] ${s.ok === true ? "text-[var(--success)]" : s.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>{s.value}</div>
                {s.delta !== null && (
                  <div className={`text-[10px] font-semibold mt-0.5 ${s.delta > 0 ? "text-[var(--success)]" : s.delta < 0 ? "text-[var(--danger)]" : "text-[var(--ink-4)]"}`}>
                    {s.delta > 0 ? "+" : ""}{s.delta.toFixed(0)}% vs ayer
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4 space-y-3">
            <div className="text-[13px] font-semibold text-[var(--ink-1)]">¿Qué pasó hoy?</div>
            <div className="space-y-2 text-[12px] text-[var(--ink-2)]">
              {todayMetrics.spend === 0 ? (
                <div className="text-[var(--ink-4)]">Aún no hay gasto registrado para hoy.</div>
              ) : (
                <>
                  <div>· Gastaste <strong>{eur(todayMetrics.spend)}</strong> y generaste <strong>{eur(todayMetrics.revenue)}</strong> ({todayMetrics.purchases} compra{todayMetrics.purchases !== 1 ? "s" : ""}).</div>
                  {settings.beRoas > 0 && (
                    <div>· ROAS {todayROAS.toFixed(2)}× — {todayROAS >= settings.beRoas ? <span className="text-[var(--success)] font-semibold">por encima del break-even ({settings.beRoas.toFixed(2)}×)</span> : <span className="text-[var(--danger)] font-semibold">por debajo del break-even ({settings.beRoas.toFixed(2)}×)</span>}.</div>
                  )}
                  {todayCTR > 0 && <div>· CTR {todayCTR.toFixed(2)}% sobre {todayMetrics.impressions.toLocaleString()} impresiones.</div>}
                  {todayMetrics.atc > 0 && todayMetrics.purchases > 0 && (
                    <div>· Conversión ATC→Compra: <strong>{((todayMetrics.purchases / todayMetrics.atc) * 100).toFixed(1)}%</strong>.</div>
                  )}
                  {todayMetrics.atc > 0 && todayMetrics.purchases === 0 && (
                    <div className="text-[var(--warning)]">· <strong>{todayMetrics.atc} ATC sin ninguna compra</strong>. Revisa el checkout urgentemente.</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "weekly" && last7.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[13px] font-semibold text-[var(--ink-1)]">Tendencia {last7.length} día{last7.length > 1 ? "s" : ""} — Ingresos vs Gasto</div>
                <div className="text-[12px] text-[var(--ink-3)]">{last7[0].day} – {last7[last7.length - 1].day}</div>
              </div>
              <div className="flex gap-4 text-[11px] text-[var(--ink-3)]">
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-[var(--ink-1)]" /> Ingresos</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-[2px] bg-[var(--gold)]" /> Gasto</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-[var(--success)]" /> Beneficio</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={last7}>
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Ingresos periodo", value: eur(weekRevenue) },
              { label: "Gasto periodo",    value: eur(weekSpend) },
              { label: "ROAS promedio",    value: `${weekROAS.toFixed(2)}×`, ok: settings.beRoas > 0 ? weekROAS >= settings.beRoas : undefined },
              { label: "Mejor día",        value: bestDay ? `${bestDay.day} · ${bestDay.roas.toFixed(2)}×` : "—", sub: bestDay ? "ROAS máx" : "" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
                <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wider mb-1">{s.label}</div>
                <div className={`font-mono font-bold text-[16px] ${s.ok === true ? "text-[var(--success)]" : s.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>{s.value}</div>
                {s.sub && <div className="text-[11px] text-[var(--ink-4)] mt-0.5">{s.sub}</div>}
              </div>
            ))}
          </div>

          <div className="bg-[var(--bg-inset)] border border-dashed border-[var(--border-strong)] rounded-xl p-5 flex items-start gap-3">
            <TrendingUp size={16} className="text-[var(--ink-4)] mt-0.5" />
            <div className="text-[12px] text-[var(--ink-3)] leading-relaxed">
              <strong className="text-[var(--ink-1)]">Tip:</strong> Registra al menos 7 días seguidos de métricas en el Dashboard para que la IA detecte tendencias, calcule confianza estadística y recomiende decisiones con peso real.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
