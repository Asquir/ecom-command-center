// Pure statistical functions — no React dependencies

export function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

export interface ZTestResult {
  p1: number; p2: number; z: number; pValue: number;
  confidence: number; lift: number; winner: "A" | "B" | "equal";
  significant: boolean;
}

export function zTestProportions(n1: number, c1: number, n2: number, c2: number): ZTestResult | null {
  if (n1 <= 0 || n2 <= 0 || c1 < 0 || c2 < 0) return null;
  const p1 = c1 / n1;
  const p2 = c2 / n2;
  const pooled = (c1 + c2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  if (!se) return null;
  const z = (p2 - p1) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  return {
    p1, p2, z, pValue,
    confidence: Math.min(99.9, (1 - pValue) * 100),
    lift: p1 > 0 ? ((p2 - p1) / p1) * 100 : 0,
    winner: Math.abs(p2 - p1) < 0.001 ? "equal" : p2 > p1 ? "B" : "A",
    significant: pValue < 0.05,
  };
}

export function samplesNeeded(p1: number, mdeRelative = 0.2, alpha = 0.05): number {
  const z_alpha = alpha <= 0.01 ? 2.576 : alpha <= 0.05 ? 1.96 : 1.645;
  const z_beta = 0.842; // 80% power
  const p2 = p1 * (1 + mdeRelative);
  const delta = Math.abs(p2 - p1);
  if (!delta || !p1) return 0;
  return Math.ceil(((z_alpha + z_beta) ** 2) * (p1 * (1 - p1) + p2 * (1 - p2)) / delta ** 2);
}

export function linearTrend(values: number[]): { slope: number; dir: "up" | "flat" | "down" } {
  const valid = values.filter(v => v > 0);
  if (valid.length < 2) return { slope: 0, dir: "flat" };
  const n = valid.length;
  const mx = (n - 1) / 2;
  const my = valid.reduce((a, b) => a + b) / n;
  const num = valid.reduce((s, y, i) => s + (i - mx) * (y - my), 0);
  const den = valid.reduce((s, _, i) => s + (i - mx) ** 2, 0);
  const slope = den ? num / den : 0;
  const threshold = my * 0.03;
  return { slope, dir: Math.abs(slope) < threshold ? "flat" : slope > 0 ? "up" : "down" };
}

export function fatigueScore(hookRate: number, holdRate: number, ctr: number, hookTarget: number, ctrTarget: number): {
  score: number; label: "Fresco" | "Vigilar" | "Fatigando" | "Saturado"; color: string;
} {
  let score = 0;
  if (hookTarget > 0 && hookRate >= 0) score += Math.max(0, (1 - hookRate / hookTarget) * 40);
  if (ctrTarget > 0 && ctr >= 0) score += Math.max(0, (1 - ctr / ctrTarget) * 35);
  if (holdRate >= 0) score += holdRate < 20 ? 25 : holdRate < 30 ? 12 : 0;
  const s = Math.min(100, Math.round(score));
  return s < 25 ? { score: s, label: "Fresco", color: "text-[var(--success)] bg-[var(--success-soft)]" }
       : s < 50 ? { score: s, label: "Vigilar", color: "text-[var(--warning)] bg-[var(--warning-soft)]" }
       : s < 75 ? { score: s, label: "Fatigando", color: "text-[var(--danger)] bg-[var(--danger-soft)]" }
       : { score: s, label: "Saturado", color: "text-white bg-[var(--danger)]" };
}
