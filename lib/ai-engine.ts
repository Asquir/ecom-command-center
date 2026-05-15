import { linearTrend } from "./stats";

type DM = { spend: number; revenue: number; clicks: number; impressions: number; atc: number; checkouts: number; purchases: number };

export interface Signal {
  label: string; value: string; status: "green" | "yellow" | "red"; detail: string; weight: number;
}

export interface AIAction {
  priority: "now" | "today" | "week"; text: string;
}

export interface AIAnalysis {
  score: number;
  decision: "scale" | "optimize" | "watch" | "kill";
  confidence: "Alta" | "Media" | "Baja";
  headline: string;
  signals: Signal[];
  actions: AIAction[];
  pattern: string | null;
  daysWithData: number;
}

export function analyzeMetrics(
  allMetrics: Record<string, DM>,
  beCpa: number,
  beRoas: number,
  ctrTarget: number,
): AIAnalysis {
  const today = new Date().toISOString().split("T")[0];
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return allMetrics[d.toISOString().split("T")[0]] ?? null;
  });
  const days = last7.filter(Boolean) as DM[];
  const todayData = allMetrics[today];

  if (!todayData || days.length === 0) {
    return {
      score: 0, decision: "watch", confidence: "Baja", daysWithData: 0,
      headline: "Registra métricas de hoy para ver el análisis IA",
      signals: [], actions: [{ priority: "now", text: "Introduce los datos de hoy desde Meta Ads Manager" }],
      pattern: null,
    };
  }

  const roas = todayData.spend > 0 ? todayData.revenue / todayData.spend : 0;
  const cpa = todayData.purchases > 0 ? todayData.spend / todayData.purchases : 0;
  const ctr = todayData.impressions > 0 ? (todayData.clicks / todayData.impressions) * 100 : 0;
  const atcRate = todayData.clicks > 0 ? (todayData.atc / todayData.clicks) * 100 : 0;
  const checkoutRate = todayData.atc > 0 ? (todayData.checkouts / todayData.atc) * 100 : 0;

  const roasTrend = linearTrend(days.map(d => d.spend > 0 ? d.revenue / d.spend : 0));
  const ctrTrend = linearTrend(days.map(d => d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0));

  const signals: Signal[] = [];
  let scoreSum = 0;

  // Signal 1: ROAS vs BE (30 pts)
  if (beRoas > 0) {
    const ratio = roas / beRoas;
    const status: Signal["status"] = ratio >= 1.2 ? "green" : ratio >= 0.85 ? "yellow" : "red";
    scoreSum += status === "green" ? 30 : status === "yellow" ? 14 : 0;
    signals.push({
      label: "ROAS vs Break-even", weight: 30,
      value: roas > 0 ? `${roas.toFixed(2)}× (BE: ${beRoas}×)` : `Sin ventas · gastado ${todayData.spend.toFixed(0)}€`,
      status,
      detail: status === "green" ? `ROAS supera BE×1.2 — producto rentable con margen de escala`
             : status === "yellow" ? `ROAS cerca del break-even — mantener, esperar datos de prime time`
             : `ROAS por debajo del BE — no escalar, revisar hook o precio`,
    });
  }

  // Signal 2: CPA vs BE (25 pts)
  if (beCpa > 0) {
    let status: Signal["status"];
    let pts: number;
    let value: string;
    let detail: string;
    if (cpa > 0) {
      const ratio = cpa / beCpa;
      status = ratio <= 1 ? "green" : ratio <= 1.5 ? "yellow" : "red";
      pts = status === "green" ? 25 : status === "yellow" ? 10 : 0;
      value = `${cpa.toFixed(2)}€ (BE: ${beCpa}€)`;
      detail = status === "green" ? `CPA por debajo del break-even — cada venta genera beneficio real`
             : status === "yellow" ? `CPA ligeramente alto — optimizar creativo o reducir CPC`
             : `CPA muy alto — pausar y revisar. Estás perdiendo dinero por venta`;
    } else {
      const ratio = todayData.spend / beCpa;
      status = ratio < 1 ? "yellow" : ratio < 2 ? "yellow" : "red";
      pts = ratio < 1 ? 12 : 0;
      value = `0 compras con ${todayData.spend.toFixed(0)}€ gastados`;
      detail = ratio < 1 ? `Normal con gasto menor al BE CPA. Sigue acumulando datos.`
             : `Gasto de ${ratio.toFixed(1)}× el BE CPA sin compras — revisar funnel urgente`;
    }
    scoreSum += pts;
    signals.push({ label: "CPA vs Break-even", weight: 25, value, status, detail });
  }

  // Signal 3: CTR del creativo (20 pts)
  {
    const trendArrow = ctrTrend.dir === "up" ? " ↑" : ctrTrend.dir === "down" ? " ↓" : "";
    const target = ctrTarget || 2;
    const status: Signal["status"] = ctr >= target ? "green" : ctr >= target * 0.65 ? "yellow" : "red";
    scoreSum += status === "green" ? 20 : status === "yellow" ? 8 : 0;
    signals.push({
      label: "CTR del anuncio", weight: 20,
      value: ctr > 0 ? `${ctr.toFixed(2)}%${trendArrow} (obj: ${target}%)` : "Sin impresiones registradas",
      status,
      detail: status === "green" ? `CTR bueno — el hook engancha y atrae clics baratos`
             : status === "yellow" ? `CTR bajo — probar un hook más directo o disruptivo`
             : `CTR crítico — el anuncio no funciona. Cambiar creativo antes de seguir gastando`,
    });
  }

  // Signal 4: Salud del funnel (15 pts)
  {
    const noData = todayData.atc === 0 && todayData.clicks < 10;
    const status: Signal["status"] = noData ? "yellow"
      : atcRate >= 8 && checkoutRate >= 40 ? "green"
      : atcRate >= 4 ? "yellow" : "red";
    scoreSum += status === "green" ? 15 : status === "yellow" ? 6 : 0;
    signals.push({
      label: "Salud del funnel", weight: 15,
      value: noData ? "Pocos datos todavía" : `ATC ${atcRate.toFixed(0)}% · Checkout ${checkoutRate.toFixed(0)}%`,
      status,
      detail: status === "green" ? `Funnel sano — los visitantes avanzan bien hacia la compra`
             : atcRate < 4 ? `ATC muy bajo — landing page poco convincente o precio alto`
             : `Alto abandono en checkout — revisar envío, precio final o proceso de pago`,
    });
  }

  // Signal 5: Tendencia ROAS 7 días (10 pts)
  {
    const status: Signal["status"] = roasTrend.dir === "up" ? "green" : roasTrend.dir === "flat" ? "yellow" : "red";
    scoreSum += status === "green" ? 10 : status === "yellow" ? 5 : 0;
    signals.push({
      label: `Tendencia ROAS (${days.length}d)`, weight: 10,
      value: roasTrend.dir === "up" ? "↑ Mejorando" : roasTrend.dir === "flat" ? "→ Estable" : "↓ Declinando",
      status,
      detail: status === "green" ? `ROAS en mejora — el algoritmo de Meta está aprendiendo y optimizando`
             : status === "yellow" ? `ROAS estable — normal en primeros 7–14 días de una campaña`
             : `ROAS en declive — posible saturación de audiencia o fatiga de creativo`,
    });
  }

  const score = Math.min(100, Math.round(scoreSum));
  const daysWithData = days.length;
  const confidence: "Alta" | "Media" | "Baja" = daysWithData >= 6 ? "Alta" : daysWithData >= 3 ? "Media" : "Baja";
  const decision: "scale" | "optimize" | "watch" | "kill" = score >= 65 ? "scale" : score >= 42 ? "watch" : score >= 22 ? "optimize" : "kill";

  const headlines: Record<string, string> = {
    scale: "Señales positivas — el producto está funcionando, es momento de escalar",
    watch: "Resultados mixtos — acumular más datos antes de tomar decisiones importantes",
    optimize: "Hay problemas corregibles — actúa antes de escalar o pausar",
    kill: "Múltiples señales negativas — diagnóstico urgente",
  };

  const actions: AIAction[] = [];
  if (decision === "scale") {
    actions.push({ priority: "now", text: "Sube presupuesto +20% en la campaña con mejor ROAS. No más de eso." });
    actions.push({ priority: "today", text: "Crea 2 variaciones del hook ganador con ángulos distintos." });
    actions.push({ priority: "week", text: "Si el ROAS aguanta 7 días, abre una audiencia LAL 1%." });
  } else if (decision === "optimize") {
    if (ctr < (ctrTarget || 2)) actions.push({ priority: "now", text: "Cambia el hook del anuncio — CTR crítico, el creativo no funciona." });
    if (todayData.atc > 0 && checkoutRate < 35) actions.push({ priority: "now", text: "Audita el checkout: precio, envío y proceso de pago." });
    actions.push({ priority: "today", text: "No subas presupuesto hasta resolver los problemas detectados." });
  } else if (decision === "kill") {
    actions.push({ priority: "now", text: "Pausa campañas con CPA mayor a 2× tu break-even." });
    actions.push({ priority: "now", text: "Registra la autopsia del producto para no repetir errores." });
    actions.push({ priority: "week", text: "Guarda los creativos con mejor CTR para el siguiente producto." });
  } else {
    actions.push({ priority: "today", text: "Espera a tener 50+ clics y datos de prime time (20h–23h) antes de decidir." });
    actions.push({ priority: "today", text: "No modifiques campañas activas. El algoritmo necesita estabilidad." });
  }

  // Pattern recognition
  let pattern: string | null = null;
  const goodDays = days.filter(d => beRoas > 0 && d.spend > 0 && d.revenue / d.spend >= beRoas).length;
  const zeroBuyDays = days.filter(d => d.spend >= (beCpa || 15) && d.purchases === 0).length;
  if (goodDays >= 4 && score >= 60) {
    pattern = `${goodDays} de los últimos ${daysWithData} días por encima del break-even. Este patrón indica un producto en fase de validación real. El riesgo de escalar ahora es bajo.`;
  } else if (zeroBuyDays >= 4 && daysWithData >= 5) {
    pattern = `${zeroBuyDays} días con gasto sin ninguna compra. Este patrón suele indicar un problema de creativo o landing, no necesariamente del producto. Antes de matar, cambia el hook completamente.`;
  } else if (roasTrend.dir === "down" && daysWithData >= 5) {
    pattern = `ROAS en declive ${daysWithData} días consecutivos. Señal clara de saturación de audiencia o fatiga de creativo. Introduce variaciones de anuncio ya.`;
  }

  return { score, decision, confidence, headline: headlines[decision], signals, actions, pattern, daysWithData };
}
