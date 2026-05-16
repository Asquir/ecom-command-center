import { linearTrend } from "./stats";

type DM = { spend: number; revenue: number; clicks: number; impressions: number; atc: number; checkouts: number; purchases: number };

export interface Signal {
  label: string; value: string; status: "green" | "yellow" | "red"; detail: string; weight: number;
}

export interface AIAction {
  priority: "now" | "today" | "week"; text: string;
}

export interface ScaleGate {
  label: string;
  required: string;
  current: string;
  passed: boolean;
}

export type AIDecision = "scale" | "optimize" | "watch" | "kill" | "wait";
export type TestingPhase = "launch" | "signals" | "validation" | "decision" | "scaling";

export interface AIAnalysis {
  score: number;
  decision: AIDecision;
  confidence: "Alta" | "Media" | "Baja";
  phase: TestingPhase;
  phaseLabel: string;
  testingDay: number;
  headline: string;
  whyMessage: string;
  signals: Signal[];
  actions: AIAction[];
  pattern: string | null;
  daysWithData: number;
  scaleGates: ScaleGate[];
}

const PHASE_LABELS: Record<TestingPhase, string> = {
  launch:     "Día de lanzamiento",
  signals:    "Buscando señales iniciales",
  validation: "Validación temprana",
  decision:   "Momento de decisión",
  scaling:    "Fase de escalado",
};

function getPhase(testingDay: number): TestingPhase {
  if (testingDay <= 1) return "launch";
  if (testingDay <= 3) return "signals";
  if (testingDay <= 5) return "validation";
  if (testingDay <= 7) return "decision";
  return "scaling";
}

function eurFmt(n: number) { return `${n.toFixed(0)}€`; }

export function analyzeMetrics(
  allMetrics: Record<string, DM>,
  beCpa: number,
  beRoas: number,
  ctrTarget: number,
): AIAnalysis {
  const today = new Date().toISOString().split("T")[0];

  // Collect last 14 days of data
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    return allMetrics[d.toISOString().split("T")[0]] ?? null;
  });
  const daysOfData = last14.filter(Boolean) as DM[];
  const daysWithData = daysOfData.length;
  const todayData = allMetrics[today];

  // No data → wait state
  if (!todayData || daysWithData === 0) {
    return {
      score: 0, decision: "wait", confidence: "Baja",
      phase: "launch", phaseLabel: "Sin datos", testingDay: 0,
      daysWithData: 0,
      headline: "Registra las métricas de hoy para activar la IA",
      whyMessage: "Sin datos no se puede dar recomendación. Introduce los números de Meta Ads Manager para empezar.",
      signals: [],
      actions: [
        { priority: "now",   text: "Introduce gasto, ingresos, clics, ATC y compras desde Meta Ads Manager" },
        { priority: "today", text: "Asegúrate de que el pixel está enviando eventos (Test Events en Meta Events Manager)" },
      ],
      pattern: null,
      scaleGates: [],
    };
  }

  const testingDay = daysWithData;
  const phase = getPhase(testingDay);

  // Aggregates over recent days
  const totalSpend     = daysOfData.reduce((s, d) => s + d.spend, 0);
  const totalRevenue   = daysOfData.reduce((s, d) => s + d.revenue, 0);
  const totalPurchases = daysOfData.reduce((s, d) => s + d.purchases, 0);
  const totalAtc       = daysOfData.reduce((s, d) => s + d.atc, 0);
  const aggRoas        = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const aggCpa         = totalPurchases > 0 ? totalSpend / totalPurchases : 0;

  const profitableDays = beRoas > 0
    ? daysOfData.filter(d => d.spend > 0 && d.revenue / d.spend >= beRoas).length
    : 0;

  // Today's metrics
  const roas         = todayData.spend > 0       ? todayData.revenue / todayData.spend             : 0;
  const cpa          = todayData.purchases > 0   ? todayData.spend / todayData.purchases           : 0;
  const ctr          = todayData.impressions > 0 ? (todayData.clicks / todayData.impressions) * 100 : 0;
  const atcRate      = todayData.clicks > 0      ? (todayData.atc / todayData.clicks) * 100        : 0;
  const checkoutRate = todayData.atc > 0         ? (todayData.checkouts / todayData.atc) * 100     : 0;

  const roasTrend = linearTrend(daysOfData.map(d => d.spend > 0 ? d.revenue / d.spend : 0));
  const ctrTrend  = linearTrend(daysOfData.map(d => d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0));

  // SCALE GATES — ALL must pass before "scale" is allowed
  const minSpend = beCpa > 0 ? beCpa * 2 : 50;
  const scaleGates: ScaleGate[] = [
    {
      label: "Días de testing",
      required: "≥ 3 días con datos",
      current: `${testingDay} día${testingDay !== 1 ? "s" : ""}`,
      passed: testingDay >= 3,
    },
    {
      label: "Compras acumuladas",
      required: "≥ 5 ventas totales",
      current: `${totalPurchases} compra${totalPurchases !== 1 ? "s" : ""}`,
      passed: totalPurchases >= 5,
    },
    {
      label: "Gasto mínimo",
      required: `≥ ${eurFmt(minSpend)} (2× BE CPA)`,
      current: eurFmt(totalSpend),
      passed: totalSpend >= minSpend,
    },
    {
      label: "Rentabilidad sostenida",
      required: beRoas > 0 ? `ROAS ≥ ${beRoas}× en 2+ días` : "BE ROAS no configurado",
      current: `${profitableDays} día${profitableDays !== 1 ? "s" : ""} rentables`,
      passed: beRoas > 0 && profitableDays >= 2,
    },
  ];
  const allGatesPass = scaleGates.every(g => g.passed);

  // SIGNALS (informational)
  const signals: Signal[] = [];

  // Signal: ROAS vs BE
  if (beRoas > 0) {
    const ratio = roas / beRoas;
    const status: Signal["status"] = ratio >= 1.2 ? "green" : ratio >= 0.85 ? "yellow" : "red";
    signals.push({
      label: "ROAS vs Break-even", weight: 30,
      value: roas > 0 ? `${roas.toFixed(2)}× (BE: ${beRoas}×)` : `Sin ventas con ${eurFmt(todayData.spend)} gastados`,
      status,
      detail: status === "green" ? `ROAS supera BE — esta campaña genera margen positivo HOY`
            : status === "yellow" ? `ROAS cerca del break-even — válido pero sin margen para escalar`
            : `ROAS por debajo del BE — pérdida por venta. NO escalar`,
    });
  }

  // Signal: CPA vs BE
  if (beCpa > 0) {
    let status: Signal["status"], value: string, detail: string;
    if (cpa > 0) {
      const ratio = cpa / beCpa;
      status = ratio <= 1 ? "green" : ratio <= 1.5 ? "yellow" : "red";
      value = `${cpa.toFixed(2)}€ (BE: ${beCpa}€)`;
      detail = status === "green" ? `CPA por debajo del break-even — cada venta deja beneficio`
             : status === "yellow" ? `CPA un poco alto — optimizar antes de escalar`
             : `CPA muy alto — pierdes dinero en cada venta`;
    } else {
      const ratio = todayData.spend / beCpa;
      status = ratio < 1 ? "yellow" : "red";
      value = `0 compras · ${eurFmt(todayData.spend)} gastados`;
      detail = ratio < 1 ? `Normal con gasto bajo. Necesitas mínimo 1.5× BE CPA antes de juzgar.`
             : `${ratio.toFixed(1)}× tu BE CPA gastado sin ventas — señal de alerta`;
    }
    signals.push({ label: "CPA vs Break-even", weight: 25, value, status, detail });
  }

  // Signal: CTR
  {
    const trendArrow = ctrTrend.dir === "up" ? " ↑" : ctrTrend.dir === "down" ? " ↓" : "";
    const target = ctrTarget || 2;
    const status: Signal["status"] = ctr >= target ? "green" : ctr >= target * 0.65 ? "yellow" : "red";
    signals.push({
      label: "CTR del anuncio", weight: 20,
      value: ctr > 0 ? `${ctr.toFixed(2)}%${trendArrow} (obj: ${target}%)` : "Sin impresiones registradas",
      status,
      detail: status === "green" ? `CTR sano — el hook engancha`
             : status === "yellow" ? `CTR bajo — el creativo no destaca, probar variación de hook`
             : `CTR crítico — el anuncio no engancha. Cambiar creativo antes de seguir gastando`,
    });
  }

  // Signal: Funnel
  {
    const noData = todayData.atc === 0 && todayData.clicks < 10;
    const status: Signal["status"] = noData ? "yellow"
      : atcRate >= 8 && checkoutRate >= 40 ? "green"
      : atcRate >= 4 ? "yellow" : "red";
    signals.push({
      label: "Salud del funnel", weight: 15,
      value: noData ? "Pocos datos todavía" : `ATC ${atcRate.toFixed(0)}% · Checkout ${checkoutRate.toFixed(0)}%`,
      status,
      detail: status === "green" ? `Funnel sano — los clics avanzan hacia compra`
             : atcRate < 4 ? `ATC bajo — landing no convence o precio percibido alto`
             : `Mucho abandono en checkout — revisar gastos de envío, métodos de pago, urgencia`,
    });
  }

  // Signal: Trend (only meaningful with 3+ days)
  if (daysWithData >= 3) {
    const status: Signal["status"] = roasTrend.dir === "up" ? "green" : roasTrend.dir === "flat" ? "yellow" : "red";
    signals.push({
      label: `Tendencia ROAS (${daysWithData}d)`, weight: 10,
      value: roasTrend.dir === "up" ? "↑ Mejorando" : roasTrend.dir === "flat" ? "→ Estable" : "↓ Declinando",
      status,
      detail: status === "green" ? `ROAS mejora día a día — Meta está optimizando bien`
             : status === "yellow" ? `ROAS estable — normal en primeros 5-10 días`
             : `ROAS en declive — posible fatiga de creativo o saturación de audiencia`,
    });
  }

  // DECISION LOGIC — Phase-aware with hard gates
  let decision: AIDecision = "watch";
  let whyMessage = "";
  let score = 50;

  if (phase === "launch") {
    // Day 1: never recommend scale or kill, just wait
    decision = "wait";
    whyMessage = `Día 1 de testing. El algoritmo de Meta necesita 24-48h de fase de aprendizaje antes de dar señales fiables. NO tomes decisiones todavía — solo verifica que las ads están entregando y el pixel funciona.`;
    score = 50;
  }
  else if (phase === "signals") {
    // Day 2-3: look for kill signals or wait
    if (beCpa > 0 && totalSpend >= beCpa * 1.5 && totalPurchases === 0 && totalAtc < 2) {
      decision = "kill";
      whyMessage = `Llevas ${eurFmt(totalSpend)} (${(totalSpend / beCpa).toFixed(1)}× tu BE CPA) sin ventas y con apenas ${totalAtc} ATC. Si tras 1.5× BE CPA el producto no genera ATC, el creativo o la oferta no funcionan. Pausa y prueba otro ángulo.`;
      score = 18;
    } else if (ctr > 0 && ctr < (ctrTarget || 2) * 0.4 && todayData.impressions > 1500) {
      decision = "optimize";
      whyMessage = `CTR ${ctr.toFixed(2)}% con ${todayData.impressions} impresiones — el creativo no engancha. Cambia el hook (primer segundo) antes de seguir gastando.`;
      score = 30;
    } else if (totalPurchases >= 1 && beRoas > 0 && aggRoas >= beRoas) {
      decision = "watch";
      whyMessage = `Primera señal positiva (${totalPurchases} compra${totalPurchases !== 1 ? "s" : ""}, ROAS ${aggRoas.toFixed(2)}×). PERO con solo ${testingDay} días NO es suficiente para escalar — un winner se valida con 3+ días rentables y 5+ compras. Sigue acumulando data.`;
      score = 60;
    } else {
      decision = "watch";
      whyMessage = `Día ${testingDay}: todavía es muy pronto para decidir. Espera al menos a tener 3 días con datos completos antes de tomar acción importante.`;
      score = 45;
    }
  }
  else if (phase === "validation") {
    // Day 4-5: harder calls
    if (beRoas > 0 && aggRoas < beRoas * 0.5 && totalSpend >= minSpend) {
      decision = "kill";
      whyMessage = `Tras ${testingDay} días y ${eurFmt(totalSpend)} gastados, ROAS acumulado ${aggRoas.toFixed(2)}× está muy por debajo de tu BE (${beRoas}×). No es viable — pausa, registra autopsia y pasa al siguiente producto.`;
      score = 18;
    } else if (beCpa > 0 && aggCpa > beCpa * 2 && totalPurchases >= 3) {
      decision = "kill";
      whyMessage = `CPA acumulado ${aggCpa.toFixed(2)}€ es más del doble que tu BE (${beCpa}€). Cada venta te cuesta dinero. Necesitas cambiar precio, oferta o producto.`;
      score = 22;
    } else if (allGatesPass) {
      decision = "scale";
      whyMessage = `Todos los criterios cumplidos: ${profitableDays} días rentables de ${testingDay}, ${totalPurchases} compras, ${eurFmt(totalSpend)} gastados. Empieza con +20% al conjunto ganador (no toques los demás).`;
      score = 80;
    } else if (beRoas > 0 && aggRoas >= beRoas) {
      decision = "watch";
      const missingPurchases = Math.max(0, 5 - totalPurchases);
      const missingProfDays  = Math.max(0, 2 - profitableDays);
      const missing = [
        missingPurchases > 0 ? `${missingPurchases} venta${missingPurchases !== 1 ? "s" : ""} más` : null,
        missingProfDays > 0  ? `${missingProfDays} día${missingProfDays !== 1 ? "s" : ""} rentable${missingProfDays !== 1 ? "s" : ""} más` : null,
      ].filter(Boolean).join(" y ");
      whyMessage = `Vas bien (ROAS ${aggRoas.toFixed(2)}× ≥ BE ${beRoas}×). Necesitas ${missing || "1-2 días más"} antes de escalar. La paciencia evita escalar productos falsos winners.`;
      score = 62;
    } else {
      decision = "optimize";
      whyMessage = `Resultados mixtos tras ${testingDay} días. Identifica el creativo con mejor CTR + más ventas, pausa los demás y duplícalo con 1-2 variaciones del hook.`;
      score = 40;
    }
  }
  else if (phase === "decision") {
    // Day 6-7: final verdict
    if (allGatesPass && profitableDays >= 3) {
      decision = "scale";
      whyMessage = `Producto validado: ${profitableDays} de ${testingDay} días rentables con ${totalPurchases} compras. Inicia escalado vertical: +20% cada 72h SOLO al conjunto ganador. Si usas CBO, escala la campaña entera.`;
      score = 86;
    } else if (beRoas > 0 && aggRoas < beRoas * 0.7) {
      decision = "kill";
      whyMessage = `Tras ${testingDay} días, ROAS acumulado ${aggRoas.toFixed(2)}× < 70% del BE (${beRoas}×). No hay potencial — escalar haría perder más dinero. Registra autopsia y aprende para el siguiente.`;
      score = 20;
    } else if (beRoas > 0 && aggRoas >= beRoas * 0.85) {
      decision = "optimize";
      whyMessage = `Borderline tras ${testingDay} días (ROAS ${aggRoas.toFixed(2)}× vs BE ${beRoas}×). Antes de matar: prueba nuevo ángulo, oferta 2x1, o sube AOV con bundle. Si tras 3 días más no mejora, mata.`;
      score = 42;
    } else {
      decision = "optimize";
      whyMessage = `Sin clara dirección tras ${testingDay} días. Cambia 1 variable a la vez: creativo, audiencia o precio. No cambies todo — pierdes la trazabilidad.`;
      score = 38;
    }
  }
  else {
    // Day 8+: scaling phase
    if (allGatesPass && profitableDays >= 5 && roasTrend.dir !== "down") {
      decision = "scale";
      whyMessage = `Producto en escalado estable. Continúa +20% cada 72h. Si tienes 100+ compras, abre LAL 1% de compradores (no de ATC, que es ruido).`;
      score = 88;
    } else if (roasTrend.dir === "down" && testingDay >= 10) {
      decision = "optimize";
      whyMessage = `ROAS en declive tras ${testingDay} días — saturación de audiencia o fatiga de creativo. Pausa los aumentos, lanza 2-3 creativos nuevos y considera audiencia LAL 2-3% para refrescar.`;
      score = 50;
    } else if (beRoas > 0 && aggRoas < beRoas) {
      decision = "kill";
      whyMessage = `Tras ${testingDay} días de escalado, ROAS cae por debajo del BE. La ventana del producto se cerró. Aterriza presupuestos, fideliza compradores con email/SMS y pasa al siguiente.`;
      score = 28;
    } else {
      decision = "watch";
      whyMessage = `Producto estable sin señal clara de mayor escalado. Mantén creativos rentables, prueba 1 variación nueva por semana, vigila CPM (subida = saturación).`;
      score = 58;
    }
  }

  const confidence: "Alta" | "Media" | "Baja" =
    testingDay >= 7 && totalPurchases >= 10 ? "Alta" :
    testingDay >= 4 && totalPurchases >= 3  ? "Media" : "Baja";

  // ACTIONS — phase-specific
  const actions: AIAction[] = [];

  if (phase === "launch") {
    actions.push({ priority: "now",   text: "Abre Meta Events Manager → Test Events. Comprueba que View Content, ATC y Purchase llegan correctamente." });
    actions.push({ priority: "now",   text: "Verifica que cada ad set ha empezado a entregar (al menos 100 impresiones) en las primeras 2-3h." });
    actions.push({ priority: "today", text: "NO toques nada durante las primeras 24h. El algoritmo necesita estabilidad para salir de la fase de aprendizaje." });
    actions.push({ priority: "today", text: "Documenta el setup inicial: presupuesto por ad set, audiencias usadas, creativos activos. Te servirá para futuras autopsias." });
  }
  else if (phase === "signals") {
    if (decision === "kill") {
      actions.push({ priority: "now", text: "Pausa los creativos con CTR < 0.5% (con 1000+ impresiones). No esperes más." });
      actions.push({ priority: "today", text: "Antes de matar el producto entero, prueba 2 ángulos nuevos del hook (problema/solución vs deseo/aspiración)." });
    } else {
      actions.push({ priority: "now",   text: `Revisa CTR y hook rate por creativo. Si CTR < ${((ctrTarget || 2) * 0.5).toFixed(1)}% con 1k+ impresiones, pausa ese creativo concreto.` });
      actions.push({ priority: "today", text: `Espera mínimo ${eurFmt(beCpa > 0 ? beCpa * 1.5 : 30)} gastados por ad set antes de juzgar si funciona.` });
      actions.push({ priority: "today", text: "AUNQUE TENGAS VENTAS, no escales. Una venta en día 1-2 no valida nada. Necesitas 3 días + 5 compras mínimo." });
      actions.push({ priority: "week",  text: "Prepara 2-3 variaciones del creativo principal (mismo hook, distinto ángulo) para tener listo cuando empieces scale." });
    }
  }
  else if (phase === "validation") {
    if (decision === "scale") {
      actions.push({ priority: "now",   text: "Sube +20% el presupuesto SOLO del ad set ganador. No el +50%, no varios a la vez." });
      actions.push({ priority: "today", text: "Si es ABO: escala solo el ad set ganador. Si es CBO: deja que el algoritmo redistribuya, sube budget de campaña." });
      actions.push({ priority: "week",  text: "Lanza 2-3 variaciones del creativo ganador (mismo hook, distinto ángulo) para evitar fatiga al escalar." });
    } else if (decision === "kill") {
      actions.push({ priority: "now",   text: "Pausa los ad sets/creativos no rentables. Mantén solo lo que tenga datos cerca del BE." });
      actions.push({ priority: "today", text: "Antes de matar el producto entero: 1 último intento con nuevo ángulo o pack 2x1. Si no mejora en 2 días, autopsia." });
    } else {
      actions.push({ priority: "now",   text: "Identifica el creativo ganador (mejor CTR + más compras). Pausa los demás." });
      actions.push({ priority: "today", text: "Crea 1-2 variaciones del ganador. Mismo hook, distinto B-roll o frase final." });
      actions.push({ priority: "today", text: "NO cambies audiencia, presupuesto y creativo a la vez. Una variable cada vez para saber qué funciona." });
    }
  }
  else if (phase === "decision") {
    if (decision === "scale") {
      actions.push({ priority: "now",   text: "Verifica que cumples los 4 scale gates antes de escalar — abre el panel de gates abajo." });
      actions.push({ priority: "today", text: "Sube +20% (no más). Vigila las próximas 48h: si ROAS cae >15%, vuelve al presupuesto anterior." });
      actions.push({ priority: "week",  text: "Si aguanta, sube otro +20% cada 72h. Tras 5-7 días de scale, abre LAL 1% de compradores." });
    } else if (decision === "kill") {
      actions.push({ priority: "now",   text: "Pausa todas las campañas de este producto." });
      actions.push({ priority: "today", text: "Abre el modal de autopsia desde Productos. Documenta qué falló para no repetirlo." });
      actions.push({ priority: "week",  text: "Guarda los creativos con mejor CTR — los podrás reciclar adaptando hooks para tu próximo producto." });
    } else {
      actions.push({ priority: "now",   text: "Cambia UNA variable a la vez: nuevo creativo, nuevo precio, o nueva audiencia. Nunca todo." });
      actions.push({ priority: "today", text: "Si tras 3 días más no hay mejora, ejecuta autopsia. No alargues productos sin tracción." });
    }
  }
  else {
    if (decision === "scale") {
      actions.push({ priority: "now",   text: "Mantén el ritmo de scale: +20% cada 72h al ad set ganador. No te aceleres." });
      actions.push({ priority: "today", text: "Lanza creativos nuevos cada 5-7 días para combatir la fatiga. Mantén 3-4 creativos activos rotando." });
      actions.push({ priority: "week",  text: "Con 100+ compras, abre LAL 1% de compradores (purchase event). LAL de ATC es ruido, evítala." });
    } else if (decision === "optimize") {
      actions.push({ priority: "now",   text: "Pausa los aumentos de budget. Estabiliza antes de seguir escalando." });
      actions.push({ priority: "today", text: "Lanza 2-3 creativos nuevos (mismo producto, ángulos distintos: precio, social proof, urgencia)." });
      actions.push({ priority: "week",  text: "Considera LAL 2-3% o intereses nuevos para refrescar audiencia saturada." });
    } else if (decision === "kill") {
      actions.push({ priority: "now",   text: "Aterriza budgets gradualmente (-20% cada día). No pauses todo de golpe — pierdes data del algoritmo." });
      actions.push({ priority: "today", text: "Lanza secuencia de email/SMS a compradores para maximizar LTV antes de cerrar." });
    }
  }

  // PATTERN RECOGNITION
  let pattern: string | null = null;
  const zeroBuyDays = daysOfData.filter(d => d.spend >= (beCpa || 15) && d.purchases === 0).length;
  if (profitableDays >= 4 && score >= 65) {
    pattern = `${profitableDays} de los últimos ${daysWithData} días por encima del break-even. Este patrón consistente indica un winner real — el riesgo de escalar es BAJO si vas paso a paso.`;
  } else if (zeroBuyDays >= 3 && daysWithData >= 5 && totalPurchases <= 2) {
    pattern = `${zeroBuyDays} días con gasto significativo y sin compras. Patrón típico de problema de creativo o landing — no necesariamente del producto. Antes de matar, cambia el hook completamente.`;
  } else if (roasTrend.dir === "down" && daysWithData >= 5 && profitableDays >= 2) {
    pattern = `ROAS en declive ${daysWithData} días consecutivos pese a haber tenido días rentables. Señal clara de saturación de audiencia o fatiga de creativo. Refresca creativos YA.`;
  } else if (totalPurchases >= 1 && totalPurchases < 5 && testingDay <= 3) {
    pattern = `Tienes ${totalPurchases} venta${totalPurchases !== 1 ? "s" : ""} en ${testingDay} día${testingDay !== 1 ? "s" : ""}. ES MUY PRONTO para considerar winner. El 70% de productos con 1-2 ventas en día 1-2 mueren tras 7 días. Sigue acumulando datos.`;
  }

  const headlines: Record<AIDecision, string> = {
    wait:     "Día 1: el algoritmo está aprendiendo, espera 24-48h",
    scale:    "Validado — empieza el escalado paso a paso",
    optimize: "Hay problemas corregibles — actúa antes de escalar",
    watch:    "En observación — acumulando data antes de decidir",
    kill:     "Señales claras: no es viable",
  };

  return {
    score,
    decision,
    confidence,
    phase,
    phaseLabel: PHASE_LABELS[phase],
    testingDay,
    headline: headlines[decision],
    whyMessage,
    signals,
    actions,
    pattern,
    daysWithData,
    scaleGates,
  };
}
