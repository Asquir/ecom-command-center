import { linearTrend } from "./stats";

type DM = { spend: number; revenue: number; clicks: number; impressions: number; atc: number; checkouts: number; purchases: number };

export interface ProductContext {
  productName?: string;
  campaignType?: "ABO" | "CBO" | "SBO" | "ASC";
  country?: string;
  aov?: number;
  margin?: number;
}

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
  ctx: ProductContext = {},
): AIAnalysis {
  const prod = ctx.productName ? `**${ctx.productName}**` : "tu producto";
  const camp = ctx.campaignType ?? null;
  const campLabel = camp === "ABO" ? "ABO" : camp === "CBO" ? "CBO" : camp === "SBO" ? "SBO" : camp === "ASC" ? "Advantage+ Shopping" : null;
  const countryLabel = ctx.country === "ES" ? "España" : ctx.country === "US" ? "EE.UU." : ctx.country === "MX" ? "México" : null;
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

  const campCtx = campLabel ? ` (campaña ${campLabel})` : "";
  const countryCtx = countryLabel ? ` en ${countryLabel}` : "";

  if (phase === "launch") {
    decision = "wait";
    whyMessage = `Día 1 testeando ${prod}${campCtx}${countryCtx}. Meta necesita 24-48h de fase de aprendizaje antes de dar señales fiables. NO toques nada — solo verifica que las ads están entregando y que el pixel registra View Content, ATC y Purchase correctamente.`;
    score = 50;
  }
  else if (phase === "signals") {
    if (beCpa > 0 && totalSpend >= beCpa * 1.5 && totalPurchases === 0 && totalAtc < 2) {
      decision = "kill";
      whyMessage = `Llevas ${eurFmt(totalSpend)} en ${prod} (${(totalSpend / beCpa).toFixed(1)}× tu BE CPA de ${eurFmt(beCpa)}) sin ventas y con solo ${totalAtc} ATC${campCtx}. Con 1.5× BE CPA gastado sin ATC, el creativo o la oferta no están funcionando. Pausa y prueba un hook completamente distinto.`;
      score = 18;
    } else if (ctr > 0 && ctr < (ctrTarget || 2) * 0.4 && todayData.impressions > 1500) {
      decision = "optimize";
      whyMessage = `CTR ${ctr.toFixed(2)}% con ${todayData.impressions.toLocaleString()} impresiones en ${prod} — el hook no engancha. El primer segundo del vídeo o la imagen no captura la atención. Cambia el hook antes de seguir gastando.`;
      score = 30;
    } else if (totalPurchases >= 1 && beRoas > 0 && aggRoas >= beRoas) {
      decision = "watch";
      whyMessage = `Primera señal positiva en ${prod}: ${totalPurchases} compra${totalPurchases !== 1 ? "s" : ""} y ROAS ${aggRoas.toFixed(2)}×${campCtx}. PERO con solo ${testingDay} días NO es suficiente — un winner real necesita mínimo 3 días rentables y 5 compras. Sigue acumulando datos, no escales todavía.`;
      score = 60;
    } else {
      decision = "watch";
      whyMessage = `Día ${testingDay} testeando ${prod}${campCtx}. Demasiado pronto para cualquier decisión importante. Espera al menos 3 días con datos completos.${campLabel === "ABO" ? " En ABO, cada ad set necesita ~50 eventos para que el algoritmo optimice bien." : campLabel === "CBO" ? " En CBO, deja que el algoritmo distribuya el presupuesto al menos 48h antes de intervenir." : ""}`;
      score = 45;
    }
  }
  else if (phase === "validation") {
    if (beRoas > 0 && aggRoas < beRoas * 0.5 && totalSpend >= minSpend) {
      decision = "kill";
      whyMessage = `Tras ${testingDay} días y ${eurFmt(totalSpend)} en ${prod}, ROAS acumulado ${aggRoas.toFixed(2)}× está muy por debajo del BE (${beRoas}×)${campCtx}. No es viable con esta estructura. Registra autopsia — los creativos con mejor CTR se pueden reciclar para tu próximo producto.`;
      score = 18;
    } else if (beCpa > 0 && aggCpa > beCpa * 2 && totalPurchases >= 3) {
      decision = "kill";
      whyMessage = `CPA acumulado en ${prod} es ${eurFmt(aggCpa)} — más del doble de tu BE de ${eurFmt(beCpa)}${campCtx}. Cada venta genera pérdida. Necesitas subir precio, añadir bundle, o cambiar el producto.`;
      score = 22;
    } else if (allGatesPass) {
      decision = "scale";
      whyMessage = `Todos los criterios cumplidos para ${prod}: ${profitableDays} días rentables, ${totalPurchases} compras, ${eurFmt(totalSpend)} testados${campCtx}. ${campLabel === "ABO" ? "En ABO: sube +20% el presupuesto diario SOLO del ad set ganador. No toques los demás." : campLabel === "CBO" ? "En CBO: sube +20% el presupuesto de la campaña entera. El algoritmo redistribuye solo." : "Empieza con +20% al conjunto ganador únicamente."}`;
      score = 80;
    } else if (beRoas > 0 && aggRoas >= beRoas) {
      decision = "watch";
      const missingPurchases = Math.max(0, 5 - totalPurchases);
      const missingProfDays  = Math.max(0, 2 - profitableDays);
      const missing = [
        missingPurchases > 0 ? `${missingPurchases} venta${missingPurchases !== 1 ? "s" : ""} más` : null,
        missingProfDays > 0  ? `${missingProfDays} día${missingProfDays !== 1 ? "s" : ""} rentable${missingProfDays !== 1 ? "s" : ""} más` : null,
      ].filter(Boolean).join(" y ");
      whyMessage = `${prod} va bien (ROAS ${aggRoas.toFixed(2)}× ≥ BE ${beRoas}×)${campCtx}. Faltan ${missing || "1-2 días más"} para confirmar el patrón. La paciencia ahora evita escalar un falso winner.`;
      score = 62;
    } else {
      decision = "optimize";
      whyMessage = `Resultados mixtos en ${prod} tras ${testingDay} días${campCtx}. Identifica el creativo con mejor CTR + más compras, pausa los demás, y lanza 1-2 variaciones del hook ganador. Cambia UNA variable a la vez.`;
      score = 40;
    }
  }
  else if (phase === "decision") {
    if (allGatesPass && profitableDays >= 3) {
      decision = "scale";
      whyMessage = `${prod} validado tras ${testingDay} días: ${profitableDays} días rentables, ${totalPurchases} compras${campCtx}${countryCtx}. ${campLabel === "ABO" ? "Escala vertical: +20% cada 72h al ad set ganador. Tras 5-7 días estable, duplica el ad set." : campLabel === "CBO" ? "Sube budget de campaña +20% cada 72h. CBO distribuye solo. No toques los ad sets." : "Escala +20% cada 72h solo al conjunto ganador."}`;
      score = 86;
    } else if (beRoas > 0 && aggRoas < beRoas * 0.7) {
      decision = "kill";
      whyMessage = `Tras ${testingDay} días, ROAS de ${prod} (${aggRoas.toFixed(2)}×) está por debajo del 70% del BE (${beRoas}×)${campCtx}. No hay potencial. Registra la autopsia con lo que aprendiste — especialmente qué creativo tuvo mejor CTR, te puede servir para el próximo.`;
      score = 20;
    } else if (beRoas > 0 && aggRoas >= beRoas * 0.85) {
      decision = "optimize";
      whyMessage = `Borderline en ${prod} tras ${testingDay} días: ROAS ${aggRoas.toFixed(2)}× vs BE ${beRoas}×${campCtx}. Antes de matar: prueba subir el precio ${ctx.aov ? `(de ${eurFmt(ctx.aov)} a ${eurFmt(ctx.aov * 1.1)})` : ""}, añadir bundle 2x1, o cambiar el ángulo del creativo. Si en 3 días más no mejora, ejecuta autopsia.`;
      score = 42;
    } else {
      decision = "optimize";
      whyMessage = `Sin dirección clara para ${prod} tras ${testingDay} días${campCtx}. Cambia UNA variable: nuevo hook, nuevo precio, o nueva audiencia. Nunca las tres a la vez o no sabrás qué funcionó.`;
      score = 38;
    }
  }
  else {
    if (allGatesPass && profitableDays >= 5 && roasTrend.dir !== "down") {
      decision = "scale";
      whyMessage = `${prod} en escalado estable${campCtx}${countryCtx}: ${profitableDays} días rentables. Mantén el ritmo: +20% cada 72h. ${totalPurchases >= 100 ? "Con 100+ compras, ya puedes abrir LAL 1% de compradores (Purchase event, no ATC)." : `Con ${totalPurchases} compras acumuladas, en ${Math.max(0, 100 - totalPurchases)} compras más podrás abrir LAL de compradores.`}`;
      score = 88;
    } else if (roasTrend.dir === "down" && testingDay >= 10) {
      decision = "optimize";
      whyMessage = `ROAS de ${prod} en declive tras ${testingDay} días${campCtx} — saturación de audiencia o fatiga de creativo. Pausa los aumentos de budget, lanza 2-3 creativos nuevos y prueba ${campLabel === "CBO" ? "abrir una nueva campaña CBO con audiencia LAL 2-3%" : "audiencia LAL 2-3% en un ad set nuevo"} para refrescar.`;
      score = 50;
    } else if (beRoas > 0 && aggRoas < beRoas) {
      decision = "kill";
      whyMessage = `La ventana de ${prod} se ha cerrado${campCtx}: ROAS cae por debajo del BE tras ${testingDay} días. Aterriza presupuestos gradualmente (-20%/día). Fideliza a los compradores existentes con email/SMS antes de pivotar.`;
      score = 28;
    } else {
      decision = "watch";
      whyMessage = `${prod} estable sin señal clara de mayor escalado${campCtx}. Mantén los creativos rentables, prueba 1 variación nueva por semana, y vigila el CPM — si sube >20% es señal de saturación de audiencia.`;
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
