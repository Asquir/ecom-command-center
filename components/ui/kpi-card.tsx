"use client";
import { cx } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  note?: string;
  delta?: number;
  deltaLabel?: string;
  color?: "default" | "success" | "danger" | "warning" | "gold";
  trend?: number[];
}

const colorMap = {
  default: "text-[var(--ink-1)]",
  success: "text-[var(--success)]",
  danger:  "text-[var(--danger)]",
  warning: "text-[var(--warning)]",
  gold:    "text-[var(--gold-deep)]",
};

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 60, h = 22;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg className="absolute right-2 bottom-2 opacity-50" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiCard({ label, value, note, delta, deltaLabel, color = "default", trend }: KpiCardProps) {
  const dir = delta == null ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return (
    <div className="relative bg-white border border-[var(--border)] rounded-xl p-4 shadow-[0_1px_3px_rgba(17,17,17,0.05)] overflow-hidden flex flex-col gap-2">
      <div className="text-[11px] font-medium text-[var(--ink-3)] uppercase tracking-wider">{label}</div>
      <div className={cx("text-[22px] font-bold tracking-tight leading-tight", colorMap[color])}>{value}</div>
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-3)] font-mono">
        {dir && delta != null && (
          <span className={cx("font-semibold", dir === "up" ? "text-[var(--success)]" : dir === "down" ? "text-[var(--danger)]" : "text-[var(--ink-3)]")}>
            {dir === "up" ? "▲" : dir === "down" ? "▼" : "—"} {delta > 0 ? "+" : ""}{delta}%
          </span>
        )}
        {deltaLabel && <span>{deltaLabel}</span>}
        {note && <span>{note}</span>}
      </div>
      {trend && <Sparkline points={trend} />}
    </div>
  );
}
