"use client";
import { useState, useMemo } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { eur, pct } from "@/lib/utils";
import { downloadCSV } from "@/lib/export";
import { useToast } from "@/components/ui/toast";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import {
  FileText, Download, Copy, TrendingUp, TrendingDown,
  ShoppingCart, Eye, MousePointer, Package, CreditCard,
  CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight,
  BarChart2,
} from "lucide-react";

interface DailyMetrics {
  spend: number;
  revenue: number;
  clicks: number;
  impressions: number;
  atc: number;
  checkouts: number;
  purchases: number;
  source?: "manual" | "meta";
}
type DailyRecord = Record<string, DailyMetrics>;

type Tab = "diario" | "semanal" | "mensual";

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function weekLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const monday = new Date(d);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(d.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${monday.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`;
}

function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function deltaVs(curr: number, prev: number | undefined): number | null {
  if (prev === undefined || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

interface DeltaPillProps { delta: number | null; invert?: boolean }
function DeltaPill({ delta, invert = false }: DeltaPillProps) {
  if (delta === null) return null;
  const positive = invert ? delta < 0 : delta > 0;
  const cls = positive
    ? "bg-[var(--success-soft)] text-[var(--success)]"
    : delta === 0
    ? "bg-[var(--bg-inset)] text-[var(--ink-4)]"
    : "bg-[var(--danger-soft)] text-[var(--danger)]";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
    </span>
  );
}

interface EmptyStateProps { message: string }
function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm flex flex-col items-center justify-center py-16 gap-3">
      <BarChart2 size={28} className="text-[var(--ink-5)]" />
      <div className="text-[14px] font-semibold text-[var(--ink-1)]">Sin datos suficientes</div>
      <p className="text-[12px] text-[var(--ink-4)] text-center max-w-xs leading-relaxed">{message}</p>
    </div>
  );
}

// ─── DIARIO TAB ──────────────────────────────────────────────────────────────

interface DiarioTabProps {
  today: string;
  todayM: DailyMetrics;
  yesterdayM: DailyMetrics | null;
  settings: { beRoas: number; beCpa: number; margin: number; productName: string };
}

function DiarioTab({ today, todayM, yesterdayM, settings }: DiarioTabProps) {
  const roas = todayM.spend > 0 ? todayM.revenue / todayM.spend : 0;
  const cpa = todayM.purchases > 0 ? todayM.spend / todayM.purchases : 0;
  const ctr = todayM.impressions > 0 ? (todayM.clicks / todayM.impressions) * 100 : 0;
  const profit = todayM.revenue - todayM.spend;

  const yRoas = yesterdayM && yesterdayM.spend > 0 ? yesterdayM.revenue / yesterdayM.spend : undefined;
  const yProfit = yesterdayM ? yesterdayM.revenue - yesterdayM.spend : undefined;
  const yCtr = yesterdayM && yesterdayM.impressions > 0 ? (yesterdayM.clicks / yesterdayM.impressions) * 100 : undefined;
  const yCpa = yesterdayM && yesterdayM.purchases > 0 ? yesterdayM.spend / yesterdayM.purchases : undefined;

  const roasOk = settings.beRoas > 0 ? (roas >= settings.beRoas ? true : false) : undefined;
  const cpaOk = settings.beCpa > 0 && cpa > 0 ? (cpa <= settings.beCpa ? true : false) : undefined;

  const kpis = [
    {
      label: "Ingresos",
      value: eur(todayM.revenue),
      delta: deltaVs(todayM.revenue, yesterdayM?.revenue),
      invert: false,
      ok: undefined as boolean | undefined,
    },
    {
      label: "Gasto",
      value: eur(todayM.spend),
      delta: deltaVs(todayM.spend, yesterdayM?.spend),
      invert: true,
      ok: undefined as boolean | undefined,
    },
    {
      label: "Beneficio",
      value: eur(profit),
      delta: deltaVs(profit, yProfit),
      invert: false,
      ok: profit > 0 ? true : profit < 0 ? false : undefined,
    },
    {
      label: "ROAS",
      value: roas > 0 ? `${roas.toFixed(2)}×` : "—",
      delta: deltaVs(roas, yRoas),
      invert: false,
      ok: roasOk,
    },
    {
      label: "CPA",
      value: cpa > 0 ? eur(cpa) : "—",
      delta: deltaVs(cpa, yCpa),
      invert: true,
      ok: cpaOk,
    },
    {
      label: "CTR",
      value: ctr > 0 ? pct(ctr, 2) : "—",
      delta: deltaVs(ctr, yCtr),
      invert: false,
      ok: undefined as boolean | undefined,
    },
  ];

  // Narrative generation
  const narrativeLines: { text: React.ReactNode; kind: "neutral" | "good" | "bad" | "warn" }[] = [];

  if (todayM.spend === 0) {
    narrativeLines.push({ text: "Aún no hay gasto registrado para hoy.", kind: "neutral" });
  } else {
    narrativeLines.push({
      text: <>Gastaste <strong>{eur(todayM.spend)}</strong> y generaste <strong>{eur(todayM.revenue)}</strong> con <strong>{todayM.purchases}</strong> compra{todayM.purchases !== 1 ? "s" : ""}.</>,
      kind: "neutral",
    });

    if (settings.beRoas > 0) {
      if (roas >= settings.beRoas) {
        narrativeLines.push({ text: <>ROAS de <strong>{roas.toFixed(2)}×</strong> — por encima del break-even ({settings.beRoas.toFixed(2)}×). Campaña rentable.</>, kind: "good" });
      } else {
        narrativeLines.push({ text: <>ROAS de <strong>{roas.toFixed(2)}×</strong> — por debajo del break-even ({settings.beRoas.toFixed(2)}×). Estás perdiendo dinero.</>, kind: "bad" });
      }
    }

    if (settings.beCpa > 0 && cpa > 0) {
      if (cpa <= settings.beCpa) {
        narrativeLines.push({ text: <>CPA de <strong>{eur(cpa)}</strong> — dentro del objetivo ({eur(settings.beCpa)}). Adquisición eficiente.</>, kind: "good" });
      } else {
        narrativeLines.push({ text: <>CPA de <strong>{eur(cpa)}</strong> — supera el objetivo ({eur(settings.beCpa)}). Revisa audiencias o creativos.</>, kind: "bad" });
      }
    }

    if (todayM.atc > 0 && todayM.purchases === 0) {
      narrativeLines.push({ text: <><strong>{todayM.atc} personas añadieron al carrito</strong> pero nadie compró. Revisa el checkout urgentemente.</>, kind: "warn" });
    } else if (todayM.atc > 0 && todayM.purchases > 0) {
      const atcConv = (todayM.purchases / todayM.atc) * 100;
      narrativeLines.push({
        text: <>Conversión ATC → Compra: <strong>{atcConv.toFixed(1)}%</strong> ({todayM.purchases}/{todayM.atc}).</>,
        kind: atcConv >= 40 ? "good" : atcConv >= 20 ? "neutral" : "warn",
      });
    }

    if (todayM.checkouts > 0 && todayM.purchases === 0) {
      narrativeLines.push({ text: <><strong>{todayM.checkouts} checkouts iniciados</strong> sin ninguna compra. Posible problema de pago.</>, kind: "warn" });
    }

    if (ctr > 0) {
      narrativeLines.push({
        text: <>CTR del <strong>{pct(ctr, 2)}</strong> sobre {todayM.impressions.toLocaleString("es-ES")} impresiones.</>,
        kind: ctr >= 2 ? "good" : ctr >= 1 ? "neutral" : "bad",
      });
    }

    if (profit > 0 && settings.margin > 0) {
      const netMargin = (profit / todayM.revenue) * 100;
      narrativeLines.push({
        text: <>Margen neto estimado: <strong>{pct(netMargin)}</strong>.</>,
        kind: netMargin >= settings.margin ? "good" : "neutral",
      });
    }
  }

  const kindIcon: Record<string, React.ReactNode> = {
    good: <CheckCircle size={13} className="text-[var(--success)] flex-shrink-0 mt-0.5" />,
    bad: <XCircle size={13} className="text-[var(--danger)] flex-shrink-0 mt-0.5" />,
    warn: <AlertTriangle size={13} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />,
    neutral: <div className="w-1.5 h-1.5 rounded-full bg-[var(--ink-4)] flex-shrink-0 mt-1.5" />,
  };

  const funnelSteps = [
    { label: "Impresiones", icon: <Eye size={12} />, value: todayM.impressions, prev: null },
    { label: "Clics", icon: <MousePointer size={12} />, value: todayM.clicks, prev: todayM.impressions },
    { label: "ATC", icon: <ShoppingCart size={12} />, value: todayM.atc, prev: todayM.clicks },
    { label: "Checkout", icon: <CreditCard size={12} />, value: todayM.checkouts, prev: todayM.atc },
    { label: "Compras", icon: <Package size={12} />, value: todayM.purchases, prev: todayM.checkouts },
  ];

  return (
    <div className="space-y-4">
      {/* Date header */}
      <div className="flex items-center gap-3 px-1">
        <div className="text-[12px] text-[var(--ink-3)]">
          Datos del <strong className="text-[var(--ink-1)]">{formatDate(today)}</strong>
          {yesterdayM && <span className="ml-2 text-[var(--ink-5)]">· comparado con ayer</span>}
        </div>
        {todayM.source && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            todayM.source === "meta"
              ? "bg-[#e8eaf6] text-[#3949ab]"
              : "bg-[var(--bg-inset)] text-[var(--ink-4)]"
          }`}>
            {todayM.source === "meta" ? "Auto · Meta" : "Manual"}
          </span>
        )}
      </div>

      {/* 6 KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
            <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-2">{k.label}</div>
            <div className={`font-mono font-bold text-[16px] leading-none mb-2 ${
              k.ok === true ? "text-[var(--success)]"
              : k.ok === false ? "text-[var(--danger)]"
              : "text-[var(--ink-1)]"
            }`}>{k.value}</div>
            <DeltaPill delta={k.delta} invert={k.invert} />
          </div>
        ))}
      </div>

      {/* Narrative block */}
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-[var(--ink-3)]" />
          <span className="text-[13px] font-semibold text-[var(--ink-1)]">¿Qué pasó hoy?</span>
        </div>
        <div className="space-y-2">
          {narrativeLines.map((line, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[12px] text-[var(--ink-2)] leading-relaxed">
              {kindIcon[line.kind]}
              <span>{line.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Funnel mini-table */}
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-5">
        <div className="text-[13px] font-semibold text-[var(--ink-1)] mb-4">Embudo de conversión</div>
        <div className="space-y-0 divide-y divide-[var(--border)]">
          {funnelSteps.map((step, i) => {
            const convRate = step.prev && step.prev > 0 ? (step.value / step.prev) * 100 : null;
            return (
              <div key={step.label} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 text-[12px] text-[var(--ink-3)]">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 0 ? "bg-[var(--bg-inset)] text-[var(--ink-3)]"
                    : "bg-[var(--gold-soft)] text-[var(--gold-deep)]"
                  }`}>{i + 1}</span>
                  <span className="text-[var(--ink-2)]">{step.icon}</span>
                  <span className="font-medium text-[var(--ink-1)]">{step.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  {convRate !== null && (
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                      convRate >= 50 ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : convRate >= 20 ? "bg-[var(--gold-soft)] text-[var(--gold-deep)]"
                      : "bg-[var(--danger-soft)] text-[var(--danger)]"
                    }`}>{pct(convRate)}</span>
                  )}
                  <span className="font-mono font-bold text-[14px] text-[var(--ink-1)] w-20 text-right">
                    {step.value.toLocaleString("es-ES")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── SEMANAL TAB ─────────────────────────────────────────────────────────────

interface SemanalTabProps {
  days: { date: string; metrics: DailyMetrics }[];
  settings: { beRoas: number; beCpa: number; margin: number; productName: string };
  onCopy: () => void;
}

function SemanalTab({ days, settings, onCopy }: SemanalTabProps) {
  const chartData = days.map((d) => ({
    day: formatDateShort(d.date),
    ingresos: d.metrics.revenue,
    gasto: d.metrics.spend,
    beneficio: d.metrics.revenue - d.metrics.spend,
  }));

  const totalRevenue = days.reduce((s, d) => s + d.metrics.revenue, 0);
  const totalSpend = days.reduce((s, d) => s + d.metrics.spend, 0);
  const totalProfit = totalRevenue - totalSpend;
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const summaryKpis = [
    { label: "Total ingresos", value: eur(totalRevenue), ok: undefined as boolean | undefined },
    { label: "Total gasto", value: eur(totalSpend), ok: undefined as boolean | undefined },
    {
      label: "ROAS promedio",
      value: avgRoas > 0 ? `${avgRoas.toFixed(2)}×` : "—",
      ok: settings.beRoas > 0 ? (avgRoas >= settings.beRoas ? true : false) : undefined,
    },
    {
      label: "Beneficio neto",
      value: eur(totalProfit),
      ok: totalProfit > 0 ? true : totalProfit < 0 ? false : undefined,
    },
  ];

  const { success } = useToast();

  const handleCopyWeekly = () => {
    const product = settings.productName || "Producto";
    const dateRange = days.length > 0
      ? `${formatDate(days[0].date)} – ${formatDate(days[days.length - 1].date)}`
      : "";

    const lines = [
      `📊 *Reporte semanal — ${product}*`,
      `📅 ${dateRange}`,
      ``,
      ...days.map((d) => {
        const roas = d.metrics.spend > 0 ? d.metrics.revenue / d.metrics.spend : 0;
        const profit = d.metrics.revenue - d.metrics.spend;
        const roasIcon = settings.beRoas > 0 ? (roas >= settings.beRoas ? "✅" : "🔴") : "📈";
        return [
          `📆 *${formatDate(d.date)}*`,
          `  💸 Gasto: ${eur(d.metrics.spend)}`,
          `  💰 Ingresos: ${eur(d.metrics.revenue)}`,
          `  ${roasIcon} ROAS: ${roas.toFixed(2)}×`,
          `  🛒 Compras: ${d.metrics.purchases}`,
          `  ${profit >= 0 ? "📈" : "📉"} Beneficio: ${eur(profit)}`,
        ].join("\n");
      }),
      ``,
      `━━━━━━━━━━━━━━━━`,
      `📊 *Totales*`,
      `  💰 Ingresos: ${eur(totalRevenue)}`,
      `  💸 Gasto: ${eur(totalSpend)}`,
      `  📈 ROAS: ${avgRoas.toFixed(2)}×`,
      `  ${totalProfit >= 0 ? "✅" : "🔴"} Beneficio: ${eur(totalProfit)}`,
    ];

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      success("Informe copiado", "Listo para pegar en Telegram o WhatsApp.");
    }).catch(() => {
      success("Error", "No se pudo copiar al portapapeles.");
    });
  };

  if (days.length === 0) {
    return <EmptyState message="Registra al menos un día de métricas para ver el reporte semanal." />;
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="text-[13px] font-semibold text-[var(--ink-1)]">Ingresos vs Gasto</div>
            <div className="text-[11px] text-[var(--ink-4)] mt-0.5">
              {days.length > 0 ? `${formatDate(days[0].date)} – ${formatDate(days[days.length - 1].date)}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[var(--ink-4)]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[var(--success)] opacity-70" />
              Ingresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[var(--gold)] opacity-70" />
              Gasto
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradIngr7" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradGasto7" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--ink-4)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--ink-4)" }} axisLine={false} tickLine={false} width={44}
              tickFormatter={(v) => `${v}€`} />
            <Tooltip
              contentStyle={{ background: "white", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
              formatter={(v, name) => [eur(Number(v)), name === "ingresos" ? "Ingresos" : "Gasto"] as [string, string]}
            />
            <Area type="monotone" dataKey="ingresos" stroke="var(--success)" strokeWidth={2}
              fill="url(#gradIngr7)" dot={false} activeDot={{ r: 4, fill: "var(--success)" }} />
            <Area type="monotone" dataKey="gasto" stroke="var(--gold)" strokeWidth={2}
              fill="url(#gradGasto7)" dot={false} activeDot={{ r: 4, fill: "var(--gold)" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 4 summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryKpis.map((k) => (
          <div key={k.label} className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
            <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-2">{k.label}</div>
            <div className={`font-mono font-bold text-[17px] ${
              k.ok === true ? "text-[var(--success)]"
              : k.ok === false ? "text-[var(--danger)]"
              : "text-[var(--ink-1)]"
            }`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Per-day table */}
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="text-[13px] font-semibold text-[var(--ink-1)]">Detalle por día</div>
          <button
            onClick={handleCopyWeekly}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-2)] hover:text-[var(--ink-1)] border border-[var(--border)] rounded-lg px-3 py-1.5 bg-white shadow-sm hover:bg-[var(--bg-inset)] transition-colors"
          >
            <Copy size={11} />
            Copiar informe semanal
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[var(--bg-inset)] text-[var(--ink-4)] text-[10px] uppercase tracking-wider">
                <th className="text-left px-5 py-2.5 font-semibold">Fecha</th>
                <th className="text-right px-4 py-2.5 font-semibold">Gasto</th>
                <th className="text-right px-4 py-2.5 font-semibold">Ingresos</th>
                <th className="text-right px-4 py-2.5 font-semibold">ROAS</th>
                <th className="text-right px-4 py-2.5 font-semibold">Compras</th>
                <th className="text-right px-4 py-2.5 font-semibold">Beneficio</th>
                <th className="text-right px-5 py-2.5 font-semibold">Fuente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {days.map((d) => {
                const roas = d.metrics.spend > 0 ? d.metrics.revenue / d.metrics.spend : 0;
                const profit = d.metrics.revenue - d.metrics.spend;
                const roasOk = settings.beRoas > 0 ? roas >= settings.beRoas : null;
                return (
                  <tr key={d.date} className="hover:bg-[var(--bg-inset)] transition-colors">
                    <td className="px-5 py-3 font-medium text-[var(--ink-1)]">{formatDate(d.date)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--ink-2)]">{eur(d.metrics.spend)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--ink-2)]">{eur(d.metrics.revenue)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                        roasOk === true ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : roasOk === false ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                        : "text-[var(--ink-2)]"
                      }`}>{roas > 0 ? `${roas.toFixed(2)}×` : "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[var(--ink-1)]">{d.metrics.purchases}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${profit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                      {eur(profit)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {d.metrics.source && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          d.metrics.source === "meta"
                            ? "bg-[#e8eaf6] text-[#3949ab]"
                            : "bg-[var(--bg-inset)] text-[var(--ink-4)]"
                        }`}>
                          {d.metrics.source === "meta" ? "auto" : "manual"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── MENSUAL TAB ─────────────────────────────────────────────────────────────

interface MensualTabProps {
  days: { date: string; metrics: DailyMetrics }[];
  settings: { beRoas: number; beCpa: number; margin: number; productName: string };
  onExportCSV: () => void;
}

function MensualTab({ days, settings, onExportCSV }: MensualTabProps) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const totalRevenue = days.reduce((s, d) => s + d.metrics.revenue, 0);
  const totalSpend = days.reduce((s, d) => s + d.metrics.spend, 0);
  const totalProfit = totalRevenue - totalSpend;
  const totalPurchases = days.reduce((s, d) => s + d.metrics.purchases, 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const profitableDays = days.filter((d) => d.metrics.revenue > d.metrics.spend).length;

  // Week grouping
  function getWeekKey(iso: string): string {
    const d = new Date(iso + "T00:00:00");
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    return monday.toISOString().split("T")[0];
  }

  const weekGroups: Record<string, { revenue: number; spend: number; days: number }> = {};
  days.forEach((d) => {
    const k = getWeekKey(d.date);
    if (!weekGroups[k]) weekGroups[k] = { revenue: 0, spend: 0, days: 0 };
    weekGroups[k].revenue += d.metrics.revenue;
    weekGroups[k].spend += d.metrics.spend;
    weekGroups[k].days += 1;
  });

  const weekKeys = Object.keys(weekGroups).sort();
  const weekRoas = (k: string) => weekGroups[k].spend > 0 ? weekGroups[k].revenue / weekGroups[k].spend : 0;

  const bestWeekKey = weekKeys.length > 0 ? weekKeys.reduce((b, k) => weekRoas(k) > weekRoas(b) ? k : b, weekKeys[0]) : null;
  const worstWeekKey = weekKeys.length > 0 ? weekKeys.reduce((b, k) => weekRoas(k) < weekRoas(b) ? k : b, weekKeys[0]) : null;

  // Chart data
  const chartData = days.map((d) => ({
    day: new Date(d.date + "T00:00:00").getDate(),
    ingresos: d.metrics.revenue,
    gasto: d.metrics.spend,
  }));

  // Paginated table
  const pageCount = Math.ceil(days.length / PAGE_SIZE);
  const pageRows = days.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const bigStats = [
    {
      label: "Ingresos totales",
      value: eur(totalRevenue),
      icon: <TrendingUp size={16} />,
      ok: undefined as boolean | undefined,
    },
    {
      label: "Gasto total",
      value: eur(totalSpend),
      icon: <TrendingDown size={16} />,
      ok: undefined as boolean | undefined,
    },
    {
      label: "Beneficio neto",
      value: eur(totalProfit),
      icon: <CheckCircle size={16} />,
      ok: totalProfit > 0 ? true : totalProfit < 0 ? false : undefined,
    },
    {
      label: "ROAS promedio",
      value: avgRoas > 0 ? `${avgRoas.toFixed(2)}×` : "—",
      icon: <BarChart2 size={16} />,
      ok: settings.beRoas > 0 ? (avgRoas >= settings.beRoas ? true : false) : undefined,
    },
    {
      label: "Total compras",
      value: totalPurchases.toLocaleString("es-ES"),
      icon: <ShoppingCart size={16} />,
      ok: undefined as boolean | undefined,
    },
    {
      label: "Días rentables",
      value: `${profitableDays} / ${days.length}`,
      icon: <Package size={16} />,
      ok: profitableDays > days.length / 2 ? true : profitableDays === 0 ? false : undefined,
    },
  ];

  if (days.length === 0) {
    return <EmptyState message="Registra al menos un día de métricas para ver el reporte mensual." />;
  }

  return (
    <div className="space-y-4">
      {/* Big stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {bigStats.map((s) => (
          <div key={s.label} className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
            <div className={`mb-2 ${
              s.ok === true ? "text-[var(--success)]"
              : s.ok === false ? "text-[var(--danger)]"
              : "text-[var(--ink-4)]"
            }`}>{s.icon}</div>
            <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-1.5">{s.label}</div>
            <div className={`font-mono font-bold text-[16px] leading-tight ${
              s.ok === true ? "text-[var(--success)]"
              : s.ok === false ? "text-[var(--danger)]"
              : "text-[var(--ink-1)]"
            }`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="text-[13px] font-semibold text-[var(--ink-1)]">Gasto vs Ingresos diarios</div>
            <div className="text-[11px] text-[var(--ink-4)] mt-0.5">Últimos {days.length} días</div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[var(--ink-4)]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[var(--gold)] opacity-80" />
              Gasto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[var(--success)] opacity-80" />
              Ingresos
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={6} barGap={2} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--ink-5)" }} axisLine={false} tickLine={false}
              interval={Math.floor(days.length / 8)} />
            <YAxis tick={{ fontSize: 9, fill: "var(--ink-5)" }} axisLine={false} tickLine={false} width={40}
              tickFormatter={(v) => `${v}€`} />
            <Tooltip
              contentStyle={{ background: "white", border: "1px solid var(--border)", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
              formatter={(v, name) => [eur(Number(v)), name === "gasto" ? "Gasto" : "Ingresos"] as [string, string]}
              labelFormatter={(l) => `Día ${l}`}
            />
            <Bar dataKey="gasto" fill="var(--gold)" radius={[2, 2, 0, 0]} opacity={0.85} />
            <Bar dataKey="ingresos" fill="var(--success)" radius={[2, 2, 0, 0]} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Best / worst week */}
      {weekKeys.length >= 2 && bestWeekKey && worstWeekKey && bestWeekKey !== worstWeekKey && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-5 border-l-4 border-l-[var(--success)]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-[var(--success)]" />
              <span className="text-[11px] font-bold text-[var(--success)] uppercase tracking-wider">Mejor semana</span>
            </div>
            <div className="text-[12px] text-[var(--ink-3)] mb-1">{weekLabel(bestWeekKey)}</div>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <div className="text-[10px] text-[var(--ink-4)] uppercase">ROAS</div>
                <div className="font-mono font-bold text-[20px] text-[var(--success)]">{weekRoas(bestWeekKey).toFixed(2)}×</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--ink-4)] uppercase">Ingresos</div>
                <div className="font-mono font-bold text-[14px] text-[var(--ink-1)]">{eur(weekGroups[bestWeekKey].revenue)}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--ink-4)] uppercase">Gasto</div>
                <div className="font-mono font-bold text-[14px] text-[var(--ink-1)]">{eur(weekGroups[bestWeekKey].spend)}</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-5 border-l-4 border-l-[var(--danger)]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={14} className="text-[var(--danger)]" />
              <span className="text-[11px] font-bold text-[var(--danger)] uppercase tracking-wider">Peor semana</span>
            </div>
            <div className="text-[12px] text-[var(--ink-3)] mb-1">{weekLabel(worstWeekKey)}</div>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <div className="text-[10px] text-[var(--ink-4)] uppercase">ROAS</div>
                <div className="font-mono font-bold text-[20px] text-[var(--danger)]">{weekRoas(worstWeekKey).toFixed(2)}×</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--ink-4)] uppercase">Ingresos</div>
                <div className="font-mono font-bold text-[14px] text-[var(--ink-1)]">{eur(weekGroups[worstWeekKey].revenue)}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--ink-4)] uppercase">Gasto</div>
                <div className="font-mono font-bold text-[14px] text-[var(--ink-1)]">{eur(weekGroups[worstWeekKey].spend)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 30-day table with pagination */}
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-wrap gap-2">
          <div className="text-[13px] font-semibold text-[var(--ink-1)]">Detalle 30 días</div>
          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-2)] hover:text-[var(--ink-1)] border border-[var(--border)] rounded-lg px-3 py-1.5 bg-white shadow-sm hover:bg-[var(--bg-inset)] transition-colors"
          >
            <Download size={11} />
            Exportar CSV 30 días
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[var(--bg-inset)] text-[var(--ink-4)] text-[10px] uppercase tracking-wider">
                <th className="text-left px-5 py-2.5 font-semibold">Fecha</th>
                <th className="text-right px-4 py-2.5 font-semibold">Gasto</th>
                <th className="text-right px-4 py-2.5 font-semibold">Ingresos</th>
                <th className="text-right px-4 py-2.5 font-semibold">ROAS</th>
                <th className="text-right px-4 py-2.5 font-semibold">Compras</th>
                <th className="text-right px-4 py-2.5 font-semibold">Beneficio</th>
                <th className="text-right px-5 py-2.5 font-semibold">Fuente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {pageRows.map((d) => {
                const roas = d.metrics.spend > 0 ? d.metrics.revenue / d.metrics.spend : 0;
                const profit = d.metrics.revenue - d.metrics.spend;
                const roasOk = settings.beRoas > 0 ? roas >= settings.beRoas : null;
                return (
                  <tr key={d.date} className="hover:bg-[var(--bg-inset)] transition-colors">
                    <td className="px-5 py-3 font-medium text-[var(--ink-1)]">{formatDate(d.date)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--ink-2)]">{eur(d.metrics.spend)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--ink-2)]">{eur(d.metrics.revenue)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                        roasOk === true ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : roasOk === false ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                        : "text-[var(--ink-2)]"
                      }`}>{roas > 0 ? `${roas.toFixed(2)}×` : "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[var(--ink-1)]">{d.metrics.purchases}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${profit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                      {eur(profit)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {d.metrics.source && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          d.metrics.source === "meta"
                            ? "bg-[#e8eaf6] text-[#3949ab]"
                            : "bg-[var(--bg-inset)] text-[var(--ink-4)]"
                        }`}>
                          {d.metrics.source === "meta" ? "auto" : "manual"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-inset)]">
            <span className="text-[11px] text-[var(--ink-4)]">
              Página {page + 1} de {pageCount} · {days.length} días
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-2)] hover:text-[var(--ink-1)] disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded-md hover:bg-white transition-colors"
              >
                <ChevronLeft size={13} /> Anterior
              </button>
              <button
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-2)] hover:text-[var(--ink-1)] disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded-md hover:bg-white transition-colors"
              >
                Siguiente <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────

export function Reports() {
  const { settings } = useSettings();
  const [allMetrics] = useLocalStorage<DailyRecord>("ecc-daily-metrics", {});
  const [tab, setTab] = useState<Tab>("diario");
  const { success } = useToast();

  const sortedDates = useMemo(() => Object.keys(allMetrics).sort(), [allMetrics]);

  const todayISO = getTodayISO();
  const todayM = allMetrics[todayISO] ?? null;

  // Yesterday: the most recent date before today with data
  const yesterday = useMemo(() => {
    const candidates = sortedDates.filter((d) => d < todayISO);
    return candidates.length > 0 ? candidates[candidates.length - 1] : null;
  }, [sortedDates, todayISO]);
  const yesterdayM = yesterday ? allMetrics[yesterday] : null;

  // Last 7 days (today and 6 before) that have data
  const last7Days = useMemo(() => {
    const cutoff = new Date(todayISO);
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffISO = cutoff.toISOString().split("T")[0];
    return sortedDates
      .filter((d) => d >= cutoffISO && d <= todayISO)
      .map((d) => ({ date: d, metrics: allMetrics[d] }));
  }, [sortedDates, allMetrics, todayISO]);

  // Last 30 days
  const last30Days = useMemo(() => {
    const cutoff = new Date(todayISO);
    cutoff.setDate(cutoff.getDate() - 29);
    const cutoffISO = cutoff.toISOString().split("T")[0];
    return sortedDates
      .filter((d) => d >= cutoffISO && d <= todayISO)
      .map((d) => ({ date: d, metrics: allMetrics[d] }));
  }, [sortedDates, allMetrics, todayISO]);

  // Copy report (generic for tab context)
  const handleCopyReport = () => {
    const product = settings.productName || "Producto";
    let text = "";

    if (tab === "diario" && todayM) {
      const roas = todayM.spend > 0 ? todayM.revenue / todayM.spend : 0;
      const profit = todayM.revenue - todayM.spend;
      const ctr = todayM.impressions > 0 ? (todayM.clicks / todayM.impressions) * 100 : 0;
      const roasIcon = settings.beRoas > 0 ? (roas >= settings.beRoas ? "✅" : "🔴") : "📊";
      text = [
        `📊 *Reporte diario — ${product}*`,
        `📅 ${formatDate(todayISO)}`,
        ``,
        `💸 Gasto: ${eur(todayM.spend)}`,
        `💰 Ingresos: ${eur(todayM.revenue)}`,
        `${roasIcon} ROAS: ${roas.toFixed(2)}×`,
        `🛒 Compras: ${todayM.purchases}`,
        `${profit >= 0 ? "📈" : "📉"} Beneficio: ${eur(profit)}`,
        ctr > 0 ? `👁 CTR: ${pct(ctr, 2)}` : "",
        todayM.impressions > 0 ? `👥 Impresiones: ${todayM.impressions.toLocaleString("es-ES")}` : "",
      ].filter(Boolean).join("\n");
    } else if (tab === "mensual") {
      const totalRevenue = last30Days.reduce((s, d) => s + d.metrics.revenue, 0);
      const totalSpend = last30Days.reduce((s, d) => s + d.metrics.spend, 0);
      const totalProfit = totalRevenue - totalSpend;
      const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      const totalPurchases = last30Days.reduce((s, d) => s + d.metrics.purchases, 0);
      const profitableDays = last30Days.filter((d) => d.metrics.revenue > d.metrics.spend).length;
      const roasIcon = settings.beRoas > 0 ? (avgRoas >= settings.beRoas ? "✅" : "🔴") : "📊";
      text = [
        `📊 *Reporte mensual — ${product}*`,
        `📅 Últimos ${last30Days.length} días`,
        ``,
        `💸 Gasto total: ${eur(totalSpend)}`,
        `💰 Ingresos totales: ${eur(totalRevenue)}`,
        `${roasIcon} ROAS promedio: ${avgRoas.toFixed(2)}×`,
        `🛒 Total compras: ${totalPurchases}`,
        `${totalProfit >= 0 ? "📈" : "📉"} Beneficio neto: ${eur(totalProfit)}`,
        `✅ Días rentables: ${profitableDays}/${last30Days.length}`,
      ].join("\n");
    }

    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        success("Informe copiado", "Listo para pegar en Telegram o WhatsApp.");
      }).catch(() => {
        success("Error al copiar", "No se pudo copiar al portapapeles.");
      });
    }
  };

  const handleExportCSV30 = () => {
    downloadCSV(`reporte-30-dias-${todayISO}.csv`, last30Days.map((d) => {
      const roas = d.metrics.spend > 0 ? d.metrics.revenue / d.metrics.spend : 0;
      const profit = d.metrics.revenue - d.metrics.spend;
      return {
        fecha: d.date,
        gasto: d.metrics.spend.toFixed(2),
        ingresos: d.metrics.revenue.toFixed(2),
        beneficio: profit.toFixed(2),
        roas: roas.toFixed(4),
        compras: d.metrics.purchases,
        impresiones: d.metrics.impressions,
        clics: d.metrics.clicks,
        atc: d.metrics.atc,
        checkouts: d.metrics.checkouts,
        fuente: d.metrics.source ?? "",
      };
    }));
    success("CSV exportado", `reporte-30-dias-${todayISO}.csv descargado.`);
  };

  if (sortedDates.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Reportes</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Reportes</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">
            Resumen diario, semanal y mensual generado a partir de tus métricas reales.
          </p>
        </div>
        <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm flex flex-col items-center justify-center py-20 gap-4">
          <FileText size={32} className="text-[var(--ink-5)]" />
          <div className="text-center">
            <div className="text-[15px] font-semibold text-[var(--ink-1)] mb-1">Sin métricas todavía</div>
            <p className="text-[12px] text-[var(--ink-4)] max-w-sm leading-relaxed">
              Cuando registres tu primer día en el <strong className="text-[var(--ink-1)]">Dashboard</strong>,
              los reportes se generarán automáticamente con tus datos reales.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "diario", label: "Diario" },
    { id: "semanal", label: "Semanal" },
    { id: "mensual", label: "Mensual" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">
            Reportes{settings.productName ? ` · ${settings.productName}` : ""}
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Reportes</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">
            {sortedDates.length} día{sortedDates.length !== 1 ? "s" : ""} con datos · análisis automático
          </p>
        </div>
        <button
          onClick={handleCopyReport}
          className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink-1)] shadow-sm hover:bg-[var(--bg-inset)] transition-colors"
        >
          <Copy size={12} /> Copiar informe
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[var(--bg-inset)] rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${
              tab === t.id
                ? "bg-white text-[var(--ink-1)] shadow-sm"
                : "text-[var(--ink-3)] hover:text-[var(--ink-1)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "diario" && (
        todayM ? (
          <DiarioTab
            today={todayISO}
            todayM={todayM}
            yesterdayM={yesterdayM}
            settings={settings}
          />
        ) : (
          <EmptyState message="No hay datos registrados para hoy. Introduce las métricas del día en el Dashboard." />
        )
      )}

      {tab === "semanal" && (
        <SemanalTab
          days={last7Days}
          settings={settings}
          onCopy={() => {}}
        />
      )}

      {tab === "mensual" && (
        <MensualTab
          days={last30Days}
          settings={settings}
          onExportCSV={handleExportCSV30}
        />
      )}
    </div>
  );
}
