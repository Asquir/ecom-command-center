"use client";
import { useState } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { PLANNER_TEMPLATE, DAILY_CHECKLIST } from "@/lib/data";
import { cx, eur } from "@/lib/utils";
import {
  CheckCircle, Circle, Clock, ChevronRight, Calendar, Play, RotateCcw,
  ChevronLeft, ChevronRight as ChevronRightIcon, TrendingUp, ShoppingCart,
  DollarSign, Target
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyMetrics {
  spend: number; revenue: number; clicks: number; impressions: number;
  atc: number; checkouts: number; purchases: number;
  source?: "manual" | "meta";
}
type DailyRecord = Record<string, DailyMetrics>;
type CheckItem = { id: string; label: string; done: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayDiff(fromISO: string): number {
  const start = new Date(fromISO);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - start.getTime()) / 86400000);
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

const WEEK_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

function roasColor(roas: number, beRoas: number): "green" | "yellow" | "red" {
  if (roas >= beRoas) return "green";
  if (roas >= beRoas * 0.7) return "yellow";
  return "red";
}

function getPhaseLabel(testingDay: number): string {
  if (testingDay <= 2) return "Lanzamiento";
  if (testingDay <= 4) return "Aprendizaje";
  if (testingDay <= 7) return "Decisión";
  if (testingDay <= 14) return "Optimización";
  return "Escalado";
}

interface CalendarDayPopoverProps {
  iso: string;
  data: DailyMetrics | undefined;
  startDate: string | null;
  beRoas: number;
  beCpa: number;
}

function CalendarDayPopover({ iso, data, startDate, beRoas, beCpa }: CalendarDayPopoverProps) {
  if (!data) {
    return (
      <div className="text-center py-4">
        <div className="text-[13px] text-[var(--ink-4)]">Sin datos para este día.</div>
      </div>
    );
  }

  const roas = data.spend > 0 ? data.revenue / data.spend : 0;
  const cpa = data.purchases > 0 ? data.spend / data.purchases : null;
  const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;

  let testingDay: number | null = null;
  if (startDate) {
    const diff = Math.floor((new Date(iso).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
    if (diff >= 1 && diff <= 30) testingDay = diff;
  }

  const phase = testingDay ? getPhaseLabel(testingDay) : null;
  const color = data.spend > 0 ? roasColor(roas, beRoas) : null;

  const colorStyles = {
    green: { badge: "bg-[var(--success-soft)] text-[var(--success)]", label: "Rentable" },
    yellow: { badge: "bg-[var(--warning-soft)] text-[var(--warning)]", label: "Cerca BE" },
    red: { badge: "bg-[var(--danger-soft)] text-[var(--danger)]", label: "Pérdidas" },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {color && (
          <span className={cx("text-[11px] font-semibold px-2 py-0.5 rounded-full", colorStyles[color].badge)}>
            {colorStyles[color].label}
          </span>
        )}
        {testingDay && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-inset)] text-[var(--ink-3)]">
            D{testingDay}{phase ? ` · ${phase}` : ""}
          </span>
        )}
        {data.source && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-inset)] text-[var(--ink-4)]">
            {data.source === "meta" ? "Meta Ads" : "Manual"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Gasto", value: eur(data.spend) },
          { label: "Revenue", value: eur(data.revenue) },
          { label: "ROAS", value: data.spend > 0 ? `${roas.toFixed(2)}×` : "—" },
          { label: "Compras", value: String(data.purchases) },
          { label: "CPA", value: cpa !== null ? eur(cpa) : "—" },
          { label: "BE CPA", value: eur(beCpa) },
          { label: "Clicks", value: String(data.clicks) },
          { label: "CTR", value: `${ctr.toFixed(2)}%` },
          { label: "ATC", value: String(data.atc) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[var(--bg-inset)] rounded-lg p-2 text-center">
            <div className="text-[10px] text-[var(--ink-4)] mb-0.5">{label}</div>
            <div className="text-[13px] font-semibold text-[var(--ink-1)]">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MetricsCalendarProps {
  allMetrics: DailyRecord;
  startDate: string | null;
  beRoas: number;
  beCpa: number;
}

function MetricsCalendar({ allMetrics, startDate, beRoas, beCpa }: MetricsCalendarProps) {
  const todayStr = todayISO();
  const todayDate = new Date(todayStr + "T00:00:00");

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { year, month } = calendarMonth;

  // Navigate months, clamped to 3 months back
  const minDate = new Date();
  minDate.setMonth(minDate.getMonth() - 3);
  minDate.setDate(1);

  const canGoPrev = new Date(year, month, 1) > minDate;
  const canGoNext = new Date(year, month, 1) < new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);

  const goPrev = () => {
    if (!canGoPrev) return;
    setCalendarMonth(prev => {
      const d = new Date(prev.year, prev.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setSelectedDay(null);
  };

  const goNext = () => {
    if (!canGoNext) return;
    setCalendarMonth(prev => {
      const d = new Date(prev.year, prev.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setSelectedDay(null);
  };

  // Build calendar grid (Mon-first)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Monday=0 offset
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const cells: Array<{ day: number; iso: string } | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, iso: toISO(year, month, d) });
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  // Month summary stats
  const monthMetrics = Object.entries(allMetrics).filter(([iso]) => {
    const d = new Date(iso + "T00:00:00");
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const totalSpend = monthMetrics.reduce((s, [, m]) => s + (m.spend || 0), 0);
  const totalRevenue = monthMetrics.reduce((s, [, m]) => s + (m.revenue || 0), 0);
  const totalPurchases = monthMetrics.reduce((s, [, m]) => s + (m.purchases || 0), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const profitableDays = monthMetrics.filter(([, m]) => m.spend > 0 && m.revenue / m.spend >= beRoas).length;
  const bestDayEntry = monthMetrics.reduce<[string, number] | null>((best, [iso, m]) => {
    if (m.spend === 0) return best;
    const r = m.revenue / m.spend;
    if (!best || r > best[1]) return [iso, r];
    return best;
  }, null);

  const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return (
    <div className="space-y-4">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={!canGoPrev}
          className={cx(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            canGoPrev
              ? "hover:bg-[var(--bg-inset)] text-[var(--ink-2)]"
              : "text-[var(--ink-5)] cursor-not-allowed"
          )}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-[14px] font-semibold text-[var(--ink-1)]">
          {MONTH_NAMES[month]} {year}
        </div>
        <button
          onClick={goNext}
          disabled={!canGoNext}
          className={cx(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            canGoNext
              ? "hover:bg-[var(--bg-inset)] text-[var(--ink-2)]"
              : "text-[var(--ink-5)] cursor-not-allowed"
          )}
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>

      {/* Week labels */}
      <div className="grid grid-cols-7 gap-1">
        {WEEK_LABELS.map(label => (
          <div key={label} className="text-center text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wide py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`empty-${i}`} className="h-[52px]" />;
          }

          const { day, iso } = cell;
          const data = allMetrics[iso];
          const isToday = iso === todayStr;
          const isFuture = iso > todayStr;
          const isSelected = selectedDay === iso;

          let dotColor: string | null = null;
          let roasLabel: string | null = null;
          let testingDay: number | null = null;

          if (data) {
            if (data.spend > 0) {
              const roas = data.revenue / data.spend;
              roasLabel = `${roas.toFixed(1)}×`;
              const color = roasColor(roas, beRoas);
              dotColor = color === "green" ? "var(--success)" : color === "yellow" ? "var(--warning)" : "var(--danger)";
            } else {
              dotColor = "var(--ink-5)";
              roasLabel = "0×";
            }
          }

          if (startDate && data) {
            const diff = Math.floor((new Date(iso).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
            if (diff >= 1 && diff <= 30) testingDay = diff;
          }

          return (
            <button
              key={iso}
              onClick={() => setSelectedDay(isSelected ? null : iso)}
              disabled={isFuture}
              className={cx(
                "relative h-[52px] rounded-xl border transition-all text-left px-1.5 pt-1 pb-1 flex flex-col justify-between",
                isFuture
                  ? "border-[var(--border)] bg-white opacity-30 cursor-default"
                  : isSelected
                    ? "border-[var(--ink-2)] bg-[var(--bg-inset)] shadow-sm"
                    : isToday
                      ? "border-[var(--ink-1)] bg-white shadow-sm ring-1 ring-[var(--ink-1)]"
                      : data
                        ? "border-[var(--border)] bg-white hover:border-[var(--ink-4)] hover:shadow-sm"
                        : "border-[var(--border)] bg-[var(--bg-inset)] hover:border-[var(--ink-4)]"
              )}
            >
              {/* Day number */}
              <div className={cx(
                "text-[11px] font-semibold leading-none",
                isToday ? "text-[var(--ink-1)]" : "text-[var(--ink-3)]"
              )}>
                {isToday ? (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--ink-1)] text-white text-[9px] font-bold">
                    {day}
                  </span>
                ) : day}
              </div>

              {/* Bottom area: dot + ROAS or testing badge */}
              <div className="flex items-end justify-between gap-0.5">
                {dotColor ? (
                  <div className="flex items-center gap-0.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    {roasLabel && (
                      <span className="text-[9px] font-mono text-[var(--ink-3)] leading-none">{roasLabel}</span>
                    )}
                  </div>
                ) : <div />}
                {testingDay && (
                  <span className="text-[8px] font-bold text-[var(--ink-4)] leading-none bg-[var(--bg-inset)] px-0.5 rounded">
                    D{testingDay}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day popover */}
      {selectedDay && (
        <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-semibold text-[var(--ink-1)]">
              {new Date(selectedDay + "T00:00:00").toLocaleDateString("es-ES", {
                weekday: "long", day: "numeric", month: "long"
              })}
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-[11px] text-[var(--ink-4)] hover:text-[var(--ink-2)] px-2 py-1 rounded-lg hover:bg-[var(--bg-inset)]"
            >
              Cerrar
            </button>
          </div>
          <CalendarDayPopover
            iso={selectedDay}
            data={allMetrics[selectedDay]}
            startDate={startDate}
            beRoas={beRoas}
            beCpa={beCpa}
          />
        </div>
      )}

      {/* Month summary */}
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
        <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-3">
          Resumen de {MONTH_NAMES[month]}
        </div>
        {monthMetrics.length === 0 ? (
          <div className="text-[12px] text-[var(--ink-4)] text-center py-2">Sin datos este mes.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="bg-[var(--bg-inset)] rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign size={11} className="text-[var(--ink-4)]" />
                <span className="text-[10px] text-[var(--ink-4)]">Gasto total</span>
              </div>
              <div className="text-[14px] font-bold text-[var(--ink-1)]">{eur(totalSpend)}</div>
            </div>
            <div className="bg-[var(--bg-inset)] rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={11} className="text-[var(--ink-4)]" />
                <span className="text-[10px] text-[var(--ink-4)]">Revenue total</span>
              </div>
              <div className="text-[14px] font-bold text-[var(--ink-1)]">{eur(totalRevenue)}</div>
            </div>
            <div className="bg-[var(--bg-inset)] rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Target size={11} className="text-[var(--ink-4)]" />
                <span className="text-[10px] text-[var(--ink-4)]">ROAS medio</span>
              </div>
              <div className={cx(
                "text-[14px] font-bold",
                avgRoas >= beRoas ? "text-[var(--success)]" : avgRoas >= beRoas * 0.7 ? "text-[var(--warning)]" : "text-[var(--danger)]"
              )}>
                {avgRoas > 0 ? `${avgRoas.toFixed(2)}×` : "—"}
              </div>
            </div>
            <div className="bg-[var(--bg-inset)] rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <ShoppingCart size={11} className="text-[var(--ink-4)]" />
                <span className="text-[10px] text-[var(--ink-4)]">Compras</span>
              </div>
              <div className="text-[14px] font-bold text-[var(--ink-1)]">{totalPurchases}</div>
            </div>
            <div className="bg-[var(--bg-inset)] rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle size={11} className="text-[var(--success)]" />
                <span className="text-[10px] text-[var(--ink-4)]">Días rentables</span>
              </div>
              <div className="text-[14px] font-bold text-[var(--success)]">{profitableDays}</div>
            </div>
            <div className="bg-[var(--bg-inset)] rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={11} className="text-[var(--gold-deep)]" />
                <span className="text-[10px] text-[var(--ink-4)]">Mejor día</span>
              </div>
              <div className="text-[12px] font-bold text-[var(--gold-deep)]">
                {bestDayEntry
                  ? `${new Date(bestDayEntry[0] + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })} (${bestDayEntry[1].toFixed(2)}×)`
                  : "—"
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] text-[var(--ink-4)]">Leyenda:</span>
        {[
          { color: "var(--success)", label: `Rentable (ROAS ≥ ${beRoas}×)` },
          { color: "var(--warning)", label: "Cerca BE" },
          { color: "var(--danger)", label: "Pérdidas" },
          { color: "var(--ink-5)", label: "Sin gasto" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-[var(--ink-4)]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Planner Component ───────────────────────────────────────────────────

export function Planner() {
  const { settings } = useSettings();
  const [startDate, setStartDate] = useLocalStorage<string | null>("ecc-planner-start", null);
  const [completedDays, setCompletedDays] = useLocalStorage<number[]>("ecc-planner-completed", []);
  const [checks, setChecks] = useLocalStorage<CheckItem[]>("ecc-planner-checks", DAILY_CHECKLIST);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [allMetrics] = useLocalStorage<DailyRecord>("ecc-daily-metrics", {});
  const [activeTab, setActiveTab] = useState<"calendario" | "plan">("calendario");

  const toggle = (id: string) =>
    setChecks(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));

  const toggleDayComplete = (day: number) =>
    setCompletedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const reset = () => {
    setStartDate(null);
    setCompletedDays([]);
    setChecks(prev => prev.map(c => ({ ...c, done: false })));
    setExpandedDay(null);
  };

  const start = () => {
    setStartDate(new Date().toISOString());
    setExpandedDay(1);
  };

  const currentDay = startDate ? Math.min(7, dayDiff(startDate) + 1) : null;
  const doneCount = checks.filter(c => c.done).length;
  const totalCount = checks.length;

  const dayState = (day: number): "done" | "today" | "next" => {
    if (completedDays.includes(day)) return "done";
    if (currentDay === day) return "today";
    return "next";
  };

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

  const beRoas = settings.beRoas ?? 2;
  const beCpa = settings.beCpa ?? 0;

  // ── No-start state ─────────────────────────────────────────────────────────
  if (!startDate && activeTab === "plan") {
    return (
      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Testing plan</div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Planner</h1>
            <p className="text-[13px] text-[var(--ink-3)] mt-1">Calendario de métricas y plan de testing de 7 días.</p>
          </div>
        </div>

        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--gold-soft)] flex items-center justify-center mx-auto mb-4">
            <Calendar size={22} className="text-[var(--gold-deep)]" />
          </div>
          <h3 className="text-[16px] font-semibold text-[var(--ink-1)] mb-2">Aún no has empezado el plan</h3>
          <p className="text-[13px] text-[var(--ink-3)] max-w-md mx-auto leading-relaxed mb-5">
            Cuando arranques con un producto nuevo, pulsa "Iniciar plan" y la app te guiará durante los 7 primeros días de validación.
            Cada día tendrás tareas específicas y un árbol de decisión para no quedarte bloqueado.
          </p>
          <button onClick={start}
            className="px-5 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black transition-colors inline-flex items-center gap-2">
            <Play size={14} /> Iniciar plan de testing
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {PLANNER_TEMPLATE.map(d => (
            <div key={d.day} className="bg-white border border-[var(--border)] rounded-xl p-3 opacity-60">
              <div className="text-[10px] font-mono text-[var(--ink-4)] mb-1">Día {d.day}</div>
              <div className="text-[12px] font-semibold text-[var(--ink-1)]">{d.title}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">
            {settings.productName ? `${settings.productName} · ` : ""}Planner
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Planner</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Calendario de métricas y plan de testing de 7 días.</p>
        </div>
        {startDate && activeTab === "plan" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[13px] text-[var(--ink-3)]">
              <Calendar size={14} />
              <span>{currentDay && currentDay <= 7 ? `Día ${currentDay} de 7 · hoy` : "Plan completado"}</span>
            </div>
            <button onClick={reset}
              title="Reiniciar plan"
              className="text-[11px] px-2 py-1.5 rounded-lg border border-[var(--border)] text-[var(--ink-3)] hover:bg-[var(--bg-inset)] flex items-center gap-1">
              <RotateCcw size={11} /> Reiniciar
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* ── Calendario tab ─────────────────────────────────────────────────── */}
      {activeTab === "calendario" && (
        <MetricsCalendar
          allMetrics={allMetrics}
          startDate={startDate}
          beRoas={beRoas}
          beCpa={beCpa}
        />
      )}

      {/* ── Plan 7 días tab ────────────────────────────────────────────────── */}
      {activeTab === "plan" && (
        <>
          {!startDate ? (
            <>
              <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--gold-soft)] flex items-center justify-center mx-auto mb-4">
                  <Calendar size={22} className="text-[var(--gold-deep)]" />
                </div>
                <h3 className="text-[16px] font-semibold text-[var(--ink-1)] mb-2">Aún no has empezado el plan</h3>
                <p className="text-[13px] text-[var(--ink-3)] max-w-md mx-auto leading-relaxed mb-5">
                  Cuando arranques con un producto nuevo, pulsa "Iniciar plan" y la app te guiará durante los 7 primeros días de validación.
                  Cada día tendrás tareas específicas y un árbol de decisión para no quedarte bloqueado.
                </p>
                <button onClick={start}
                  className="px-5 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black transition-colors inline-flex items-center gap-2">
                  <Play size={14} /> Iniciar plan de testing
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-2">
                {PLANNER_TEMPLATE.map(d => (
                  <div key={d.day} className="bg-white border border-[var(--border)] rounded-xl p-3 opacity-60">
                    <div className="text-[10px] font-mono text-[var(--ink-4)] mb-1">Día {d.day}</div>
                    <div className="text-[12px] font-semibold text-[var(--ink-1)]">{d.title}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold text-[var(--ink-2)]">Progreso de la semana</span>
                  <span className="text-[12px] font-mono text-[var(--ink-3)]">{completedDays.length}/7</span>
                </div>
                <div className="flex gap-1.5">
                  {PLANNER_TEMPLATE.map(d => {
                    const st = dayState(d.day);
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`h-2 w-full rounded-full ${st === "done" ? "bg-[var(--success)]" : st === "today" ? "bg-[var(--gold)]" : "bg-[var(--bg-inset)]"}`} />
                        <span className={`text-[10px] font-mono ${dayStateText(st)}`}>{d.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-2">
                  {PLANNER_TEMPLATE.map(d => {
                    const st = dayState(d.day);
                    const isExpanded = expandedDay === d.day;
                    const isDone = completedDays.includes(d.day);
                    return (
                      <div key={d.day}
                        className={`border rounded-xl transition-all overflow-hidden ${dayStateColor(st)} ${st === "today" ? "shadow-sm" : ""}`}>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 text-left"
                          onClick={() => setExpandedDay(isExpanded ? null : d.day)}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[12px] text-white ${dayStateDot(st)}`}>
                            {isDone ? "✓" : d.day}
                          </div>
                          <div className="flex-1">
                            <div className="text-[13px] font-semibold text-[var(--ink-1)]">Día {d.day} — {d.title}</div>
                            {st === "today" && <div className="text-[11px] font-semibold text-[var(--gold-deep)] uppercase tracking-wide">Hoy</div>}
                            {isDone && <div className="text-[11px] text-[var(--success)]">Completado</div>}
                            {st === "next" && !isDone && <div className="text-[11px] text-[var(--ink-4)]">{d.items.length} tareas pendientes</div>}
                          </div>
                          <ChevronRight size={14} className={`text-[var(--ink-4)] transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-3 space-y-1.5 border-t border-[rgba(0,0,0,0.06)] pt-3">
                            {d.items.map((item, i) => (
                              <div key={i} className="flex items-start gap-2.5">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${st === "done" ? "bg-[var(--success)]" : st === "today" ? "bg-[var(--gold)]" : "bg-[var(--ink-5)]"}`} />
                                <span className="text-[12px] text-[var(--ink-2)] leading-relaxed">{item}</span>
                              </div>
                            ))}
                            <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)] flex gap-2">
                              <button onClick={() => toggleDayComplete(d.day)}
                                className={cx("text-[12px] font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5",
                                  isDone
                                    ? "bg-[var(--bg-inset)] text-[var(--ink-3)] hover:bg-[var(--border)]"
                                    : "bg-[var(--success)] text-white hover:opacity-90")}>
                                <CheckCircle size={12} /> {isDone ? "Marcar como pendiente" : "Marcar día completado"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-4">
                  <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm">
                    <div className="p-4 border-b border-[var(--border)]">
                      <div className="flex items-center justify-between">
                        <div className="text-[13px] font-semibold text-[var(--ink-1)]">Checklist diario</div>
                        <span className="text-[11px] font-mono text-[var(--ink-4)]">{doneCount}/{totalCount}</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-[var(--bg-inset)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--success)] rounded-full transition-all"
                          style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div className="p-2 space-y-0.5">
                      {checks.map(item => (
                        <button key={item.id} onClick={() => toggle(item.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-inset)] transition-colors text-left">
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

                  <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
                    <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-3">Árbol de decisión rápido</div>
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

                  <div className="bg-[var(--gold-soft)] border border-[rgba(200,169,106,0.3)] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Clock size={13} className="text-[var(--gold-deep)]" />
                      <div className="text-[12px] font-semibold text-[var(--gold-deep)]">Recuerda el prime time</div>
                    </div>
                    <div className="text-[11px] text-[var(--ink-3)]">
                      La mayoría de mercados tienen una ventana nocturna (20–23h hora local) donde la conversión sube. No apagues antes.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({
  activeTab,
  setActiveTab,
}: {
  activeTab: "calendario" | "plan";
  setActiveTab: (t: "calendario" | "plan") => void;
}) {
  return (
    <div className="flex gap-1 p-1 bg-[var(--bg-inset)] rounded-xl w-fit">
      {(["calendario", "plan"] as const).map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={cx(
            "px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all",
            activeTab === tab
              ? "bg-white text-[var(--ink-1)] shadow-sm"
              : "text-[var(--ink-4)] hover:text-[var(--ink-2)]"
          )}
        >
          {tab === "calendario" ? "Calendario" : "Plan 7 días"}
        </button>
      ))}
    </div>
  );
}
