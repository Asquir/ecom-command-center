"use client";

export function ScoreRing({ value, max = 100, size = 56 }: { value: number; max?: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(value, max)) / max;
  const color = pct >= 0.7 ? "var(--success)" : pct >= 0.45 ? "var(--warning)" : "var(--danger)";
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--bg-inset)" strokeWidth="5" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="5" fill="none"
          strokeDasharray={c} strokeDashoffset={c - c * pct} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-[var(--ink-1)]"
        style={{ fontSize: size < 48 ? 10 : size < 64 ? 12 : 16 }}>
        {value}
      </div>
    </div>
  );
}
