export const TODAY = "13 mayo";

export type DecisionKind = "scale" | "watch" | "kill" | "data" | "paused";
export type ProductStatus = "research" | "webprep" | "testing" | "validated" | "paused" | "dead";
export type CreativeStatus = "Testeando" | "Ganador potencial" | "Ganador" | "Saturado" | "Pausado" | "Perdedor";

export interface Creative {
  id: string;
  name: string;
  angle: string;
  hook: string;
  voice: string;
  music: string;
  cta: string;
  duration: string;
  launched: string;
  status: CreativeStatus;
  spend: number;
  cpm: number;
  ctr: number;
  cpc: number;
  hookRate: number;
  holdRate: number;
  atc: number;
  cpAtc: number | null;
  ic: number;
  purchases: number;
  cpa: number | null;
  roas: number;
  score: number;
  decision: DecisionKind;
  diag: string;
  tone: string;
}

export const DEMO_CREATIVES: Creative[] = [
  {
    id: "cr1",
    name: "REGADERA · Presión · v1",
    angle: "Presión",
    hook: "¿Por qué tu ducha gotea cada año?",
    voice: "Chica",
    music: "Lo-fi suave",
    cta: "Pruébala 30 días sin riesgo",
    duration: "0:24",
    launched: "10 mayo",
    status: "Testeando",
    spend: 6.56,
    cpm: 8.76,
    ctr: 2.14,
    cpc: 0.44,
    hookRate: 50.15,
    holdRate: 27.98,
    atc: 1,
    cpAtc: 6.56,
    ic: 0,
    purchases: 0,
    cpa: null,
    roas: 0,
    score: 64,
    decision: "watch",
    diag: "Único con ATC. Mantener — primera señal de intención.",
    tone: "gold",
  },
  {
    id: "cr2",
    name: "REGADERA · Sarro · v1",
    angle: "Sarro",
    hook: "Este es el sarro real de tu ducha",
    voice: "Chico",
    music: "Sin música",
    cta: "Mira lo que retiene",
    duration: "0:22",
    launched: "10 mayo",
    status: "Testeando",
    spend: 4.99,
    cpm: 8.80,
    ctr: 3.00,
    cpc: 0.29,
    hookRate: 45.04,
    holdRate: 38.56,
    atc: 0,
    cpAtc: null,
    ic: 0,
    purchases: 0,
    cpa: null,
    roas: 0,
    score: 71,
    decision: "data",
    diag: "Hook fuerte, hold alto, clics baratos. Crear 2 variaciones con CTA explícito.",
    tone: "blue",
  },
  {
    id: "cr3",
    name: "REGADERA · Pelo · v1",
    angle: "Piel/Cabello",
    hook: "El agua dura te está estropeando el pelo",
    voice: "IA",
    music: "Beat ambiental",
    cta: "Cambia el agua, no el champú",
    duration: "0:28",
    launched: "10 mayo",
    status: "Testeando",
    spend: 5.37,
    cpm: 22.56,
    ctr: 2.94,
    cpc: 0.67,
    hookRate: 41.70,
    holdRate: 30.11,
    atc: 0,
    cpAtc: null,
    ic: 0,
    purchases: 0,
    cpa: null,
    roas: 0,
    score: 38,
    decision: "kill",
    diag: "CPM alto (22.5 €) + 0 intención tras 8 clics. Apagar al alcanzar 0.5 BE CPA.",
    tone: "rose",
  },
];

export interface DashboardMetrics {
  revenue: number;
  adSpend: number;
  profit: number;
  roas: number;
  cpa: number;
  ctr: number;
  cpc: number;
  cpm: number;
  atc: number;
  checkouts: number;
  purchases: number;
  netMarginPct: number;
  beCpa: number;
  beRoas: number;
}

export const DEMO_METRICS: DashboardMetrics = {
  revenue: 248.00,
  adSpend: 98.10,
  profit: 54.30,
  roas: 2.53,
  cpa: 10.90,
  ctr: 2.59,
  cpc: 0.36,
  cpm: 11.83,
  atc: 64,
  checkouts: 32,
  purchases: 9,
  netMarginPct: 22.1,
  beCpa: 17.00,
  beRoas: 2.30,
};

export const FUNNEL_STEPS = [
  { name: "Impresiones", value: 28420 },
  { name: "Clics",       value: 612 },
  { name: "Sesiones",    value: 548 },
  { name: "Add to Cart", value: 64 },
  { name: "Checkouts",   value: 32 },
  { name: "Compras",     value: 9  },
];

export const TREND_REVENUE = [120, 145, 132, 189, 167, 205, 248];
export const TREND_SPEND   = [78,  82,  80,  95,  88,  102, 98];
export const TREND_ROAS    = [1.54,1.77,1.65,1.99,1.90,2.01,2.53];

export const CHECKLIST_ITEMS = [
  { id: "demo-visual",     label: "Producto con demo visual fuerte",    done: false },
  { id: "mobile-review",   label: "Página móvil revisada",              done: false },
  { id: "checkout-test",   label: "Checkout probado en móvil",          done: false },
  { id: "currency",        label: "Moneda correcta configurada",        done: false },
  { id: "shipping",        label: "Envío activo para país objetivo",    done: false },
  { id: "pixel",           label: "Pixel activo + CAPI",                done: false },
  { id: "events",          label: "Eventos probados (VC/ATC/IC/Purch)", done: false },
  { id: "creatives",       label: "3+ creativos preparados",            done: false },
  { id: "be-calc",         label: "Break-even calculado",               done: false },
  { id: "payment",         label: "Métodos de pago activos",            done: false },
  { id: "discounts",       label: "Descuentos funcionando",             done: false },
  { id: "bundles",         label: "Packs / bundles funcionando",        done: false },
];

export const KILL_RULES = [
  {
    id: "k1",
    title: "CPC muy alto sin tráfico de calidad",
    when: "Gasto > 10 €",
    cond: "CPC > 2.5 €",
    action: "Apagar anuncio",
    why: "Si el CPC es 1.5× superior al promedio esperado, el anuncio no atrae tráfico barato.",
  },
  {
    id: "k2",
    title: "Sin intención a mitad del BE CPA",
    when: "Gasto ≥ 0.5 × BE CPA",
    cond: "0 ATC y 0 checkouts",
    action: "Apagar anuncio",
    why: "A mitad del coste máximo, sin señal de intención: creativo u oferta fallan.",
  },
  {
    id: "k3",
    title: "BE CPA quemado sin venta",
    when: "Gasto ≥ BE CPA completo",
    cond: "0 compras",
    action: "Apagar anuncio",
    why: "Consumió el margen de una venta sin recuperar nada.",
  },
  {
    id: "k4",
    title: "100 € gastados sin rentabilidad",
    when: "Gasto > 100 €",
    cond: "ROAS < BE ROAS",
    action: "Apagar campaña",
    why: "No demuestra capacidad de ser rentable a escala.",
  },
];

export const SCALE_RULES = [
  {
    id: "s1",
    title: "Escalar verde",
    when: "ROAS ayer ≥ BE ROAS × 1.20",
    action: "Subir presupuesto +25%",
    why: "Margen real y datos consistentes. Momento de pisar el gas.",
  },
  {
    id: "s2",
    title: "Comprar más datos",
    when: "ROAS ayer ≈ BE ROAS",
    action: "Subir presupuesto +10%",
    why: "Sin perder dinero, compras más datos para confirmar la tendencia.",
  },
  {
    id: "s3",
    title: "Estabilizar",
    when: "ROAS 3 días ≈ BE ROAS",
    action: "Bajar presupuesto −25%",
    why: "Estabilizar antes de tocar creativos o audiencias.",
  },
  {
    id: "s4",
    title: "Cortar pérdida",
    when: "ROAS 3 días < BE ROAS",
    action: "Pausar / apagar campaña",
    why: "No quemar margen sin señal de recuperación.",
  },
];

// ===================== PRODUCTS =====================
export interface Product {
  id: string;
  name: string;
  niche: string;
  country: string;
  status: ProductStatus;
  statusLabel: string;
  started: string;
  spend: number;
  sales: number;
  revenue: number;
  profit: number;
  roas: number;
  cpa: number;
  breCpa: number;
  breRoas: number;
  margin: number;
  cogs: number;
  shippingCost: number;
  appsCost: number;
  supplier: string;
  supplierContact?: string;
  shipTime: string;
  issues?: string[];
  score: number;
  diagnosis: string;
  creativesCount: number;
  campaignsCount: number;
  tone: string;
  notes?: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "p1", name: "Regadera Anti-Sarro Premium", niche: "Hogar / Limpieza", country: "🇲🇽 MX",
    status: "testing", statusLabel: "En testing", started: "10 mayo",
    spend: 16.92, sales: 1, revenue: 39, profit: -8.20, roas: 2.30,
    cpa: 16.92, breCpa: 17.00, breRoas: 2.30, margin: 22.50, cogs: 8.50,
    shippingCost: 0, appsCost: 0.55, supplier: "CJ Dropshipping (CN)",
    supplierContact: "ada@cjdropshipping.com", shipTime: "9–14 días",
    issues: ["Pixel doble disparo Add to Cart"],
    score: 68, diagnosis: "Buen interés inicial. Revisar conversión carrito → checkout.",
    creativesCount: 3, campaignsCount: 1, tone: "gold",
    notes: "Comparar contra versión anti-cal en USA Q2.",
  },
  {
    id: "p2", name: "Cepillo Anti-Pelos Auto-Limpiable", niche: "Mascotas", country: "🇪🇸 ES",
    status: "validated", statusLabel: "Validado", started: "21 abr",
    spend: 482.10, sales: 38, revenue: 1482.00, profit: 312.50, roas: 3.07,
    cpa: 12.69, breCpa: 18.20, breRoas: 2.14, margin: 22.10, cogs: 9.20,
    shippingCost: 0, appsCost: 0.55, supplier: "Zendrop",
    supplierContact: "support@zendrop.com", shipTime: "6–9 días",
    score: 88, diagnosis: "Ganador estable. Escalar y desarrollar UGC.",
    creativesCount: 9, campaignsCount: 3, tone: "green",
  },
  {
    id: "p3", name: "Cargador Magnético 3-en-1", niche: "Tech / Accesorios", country: "🇪🇸 ES",
    status: "paused", statusLabel: "Pausado", started: "2 abr",
    spend: 218.80, sales: 6, revenue: 234.00, profit: -86.40, roas: 1.07,
    cpa: 36.47, breCpa: 22.40, breRoas: 1.74, margin: 18.40, cogs: 14.90,
    shippingCost: 0, appsCost: 0.55, supplier: "AliExpress (Sunsky)",
    shipTime: "12–20 días", score: 34,
    diagnosis: "Margen bajo + competencia agresiva. Reconsiderar oferta.",
    creativesCount: 5, campaignsCount: 2, tone: "rose",
  },
  {
    id: "p4", name: "Mini-Proyector Estelar 2026", niche: "Hogar / Lifestyle", country: "🇲🇽 MX",
    status: "webprep", statusLabel: "Preparando web", started: "—",
    spend: 0, sales: 0, revenue: 0, profit: 0, roas: 0,
    cpa: 0, breCpa: 21.40, breRoas: 1.82, margin: 24.10, cogs: 7.20,
    shippingCost: 0, appsCost: 0.55, supplier: "Zendrop", shipTime: "8–11 días",
    score: 0, diagnosis: "Web 70%. Faltan reviews y vídeo demo principal.",
    creativesCount: 0, campaignsCount: 0, tone: "blue",
  },
  {
    id: "p5", name: "Funda Cervical de Viaje", niche: "Travel", country: "🇲🇽 MX",
    status: "research", statusLabel: "En investigación", started: "—",
    spend: 0, sales: 0, revenue: 0, profit: 0, roas: 0,
    cpa: 0, breCpa: 0, breRoas: 0, margin: 0, cogs: 0,
    shippingCost: 0, appsCost: 0, supplier: "—", shipTime: "—",
    score: 0, diagnosis: "Validar competencia y volumen de demanda.",
    creativesCount: 0, campaignsCount: 0, tone: "neutral",
  },
  {
    id: "p6", name: "Lámpara Sunset Wall", niche: "Hogar / Lifestyle", country: "🇪🇸 ES",
    status: "dead", statusLabel: "Muerto", started: "10 feb",
    spend: 387.20, sales: 4, revenue: 124.00, profit: -298.60, roas: 0.32,
    cpa: 96.80, breCpa: 19.20, breRoas: 1.96, margin: 16.30, cogs: 8.90,
    shippingCost: 0, appsCost: 0.55, supplier: "AliExpress", shipTime: "14–22 días",
    score: 12, diagnosis: "Saturado en Reels. Margen demasiado bajo.",
    creativesCount: 7, campaignsCount: 2, tone: "neutral",
  },
];

// ===================== CAMPAIGNS =====================
export interface Campaign {
  id: string;
  name: string;
  product: string;
  objective: string;
  type: "SBO" | "CBO" | "Advantage+";
  country: string;
  budget: number;
  started: string;
  status: string;
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
  cpm: number;
  cpc: number;
  ctr: number;
  hookRate: number;
  holdRate: number;
  atc: number;
  ic: number;
  purchases: number;
  creatives: number;
  decision: DecisionKind;
  diag: string;
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: "c1", name: "REVIARI · TESTEO CREATIVOS · SBO", product: "p1",
    objective: "Compras", type: "SBO", country: "🇲🇽 MX", budget: 15,
    started: "10 mayo", status: "Activa",
    spend: 16.92, revenue: 39, roas: 2.30, cpa: 16.92, cpm: 11.83,
    cpc: 0.42, ctr: 2.59, hookRate: 45.6, holdRate: 32.0,
    atc: 1, ic: 0, purchases: 1, creatives: 3,
    decision: "data",
    diag: "Aún no toques. CTR 2.6% y CPC 0.42 € indican interés. Espera a 50–70 clics o prime time MX.",
  },
  {
    id: "c2", name: "PETBRUSH · ESCALADO · CBO", product: "p2",
    objective: "Compras", type: "CBO", country: "🇪🇸 ES", budget: 80,
    started: "1 mayo", status: "Activa",
    spend: 412.80, revenue: 1248, roas: 3.02, cpa: 12.90, cpm: 9.20,
    cpc: 0.36, ctr: 2.58, hookRate: 41.2, holdRate: 28.5,
    atc: 156, ic: 78, purchases: 32, creatives: 5,
    decision: "scale",
    diag: "ROAS supera benchmark (2.57). Escalar presupuesto +25% sin tocar audiencias.",
  },
  {
    id: "c3", name: "PETBRUSH · LOOKALIKE 1% · SBO", product: "p2",
    objective: "Compras", type: "SBO", country: "🇪🇸 ES", budget: 25,
    started: "5 mayo", status: "Activa",
    spend: 69.30, revenue: 234, roas: 3.38, cpa: 11.55, cpm: 8.40,
    cpc: 0.31, ctr: 2.71, hookRate: 44.1, holdRate: 30.2,
    atc: 28, ic: 14, purchases: 6, creatives: 2,
    decision: "scale",
    diag: "Mejor LAL. Crear LAL 2% y duplicar el conjunto a presupuesto ×1.5.",
  },
  {
    id: "c4", name: "MAGCHARGE · ADVANTAGE+", product: "p3",
    objective: "Compras", type: "Advantage+", country: "🇪🇸 ES", budget: 30,
    started: "2 abr", status: "Pausada",
    spend: 218.80, revenue: 234, roas: 1.07, cpa: 36.47, cpm: 14.10,
    cpc: 0.94, ctr: 1.50, hookRate: 27.0, holdRate: 18.4,
    atc: 21, ic: 9, purchases: 6, creatives: 5,
    decision: "kill",
    diag: "ROAS 1.07 < BE 1.74 con +100 € gastados. Apagar campaña, replantear oferta.",
  },
  {
    id: "c5", name: "PETBRUSH · INTERESES BROAD", product: "p2",
    objective: "Compras", type: "SBO", country: "🇪🇸 ES", budget: 20,
    started: "8 mayo", status: "Activa",
    spend: 73.40, revenue: 117, roas: 1.59, cpa: 24.46, cpm: 10.20,
    cpc: 0.48, ctr: 2.10, hookRate: 38.5, holdRate: 26.0,
    atc: 18, ic: 8, purchases: 3, creatives: 4,
    decision: "watch",
    diag: "Por debajo de BE ROAS pero con tracción. Esperar a 100 € antes de decidir.",
  },
];

// ===================== ORDERS =====================
export interface Order {
  id: string;
  customer: string;
  product: string;
  pack: string;
  date: string;
  status: "Procesando" | "Enviado" | "En tránsito" | "Entregado" | "Incidencia" | "Reembolso";
  track: string;
  cost: number;
  margin: number;
  risk: "low" | "med" | "high";
}

export const ORDERS: Order[] = [
  { id: "#R-1042", customer: "María L.",  product: "Regadera Anti-Sarro", pack: "Pack 1", date: "13 may 09:14", status: "Procesando",  track: "—",          cost: 8.50,  margin: 14.40, risk: "low"  },
  { id: "#R-1041", customer: "Carlos M.", product: "Petbrush",            pack: "Pack 2", date: "13 may 08:02", status: "Enviado",    track: "LX2341MX", cost: 18.10, margin: 32.50, risk: "low"  },
  { id: "#R-1040", customer: "Ana P.",    product: "Petbrush",            pack: "Pack 1", date: "12 may 23:45", status: "En tránsito",track: "LX2341MX", cost: 9.20,  margin: 13.10, risk: "med"  },
  { id: "#R-1039", customer: "José T.",   product: "Petbrush",            pack: "Pack 3", date: "12 may 20:18", status: "Entregado",  track: "LX2341MX", cost: 26.50, margin: 48.10, risk: "low"  },
  { id: "#R-1038", customer: "Lucía R.",  product: "MagCharge 3-en-1",   pack: "Pack 1", date: "12 may 14:09", status: "Incidencia", track: "LX2341MX", cost: 14.90, margin: -2.40, risk: "high" },
  { id: "#R-1037", customer: "Diego H.",  product: "Petbrush",            pack: "Pack 1", date: "12 may 12:30", status: "Reembolso",  track: "—",          cost: 9.20,  margin: -9.20, risk: "high" },
];

export interface Supplier {
  name: string;
  products: string;
  country: string;
  cost: number;
  shipping: number;
  processing: string;
  delivery: string;
  method: string;
  risk: "low" | "med" | "high";
  refundPolicy: string;
  contact: string;
  score: number;
}

export const SUPPLIERS: Supplier[] = [
  { name: "CJ Dropshipping", products: "Regadera Anti-Sarro Premium", country: "🇨🇳 China", cost: 8.50, shipping: 0, processing: "24–48h", delivery: "9–14 días", method: "ePacket / SF Express", risk: "low", refundPolicy: "Reenvío gratis >25d · refund parcial >30d", contact: "ada@cjdropshipping.com", score: 82 },
  { name: "Zendrop", products: "Petbrush · Mini-Proyector", country: "🇨🇳 China + 🇺🇸 USA fulfillment", cost: 9.20, shipping: 0, processing: "12–24h", delivery: "6–9 días", method: "ePacket priority", risk: "low", refundPolicy: "Refund automático >25 días", contact: "support@zendrop.com", score: 91 },
  { name: "AliExpress · Sunsky", products: "Cargador Magnético 3-en-1", country: "🇨🇳 China", cost: 14.90, shipping: 2.40, processing: "48–72h", delivery: "12–20 días", method: "ePacket", risk: "med", refundPolicy: "Negociar por chat — sin política clara", contact: "sunsky_store@ali.com", score: 48 },
  { name: "AliExpress · LampSunset", products: "Lámpara Sunset Wall", country: "🇨🇳 China", cost: 8.90, shipping: 3.10, processing: "72h+", delivery: "14–22 días", method: "China Post", risk: "high", refundPolicy: "Lenta · 12 disputas abiertas", contact: "—", score: 22 },
];

// ===================== FIXED COSTS =====================
export const FIXED_COSTS = [
  { cat: "Shopify",      name: "Shopify Basic",             monthly: 29    },
  { cat: "Apps",         name: "ReConvert (post-purchase)", monthly: 14.90 },
  { cat: "Apps",         name: "Trustoo Reviews",           monthly: 9.99  },
  { cat: "Apps",         name: "Zipify Pages",              monthly: 39    },
  { cat: "Apps",         name: "PageFly",                   monthly: 19    },
  { cat: "Dominio",      name: "Dominio + email pro",       monthly: 4.50  },
  { cat: "Software",     name: "Triple Whale Starter",      monthly: 12    },
  { cat: "IA/Creativos", name: "ElevenLabs + CapCut Pro",  monthly: 22    },
  { cat: "Gestoría",     name: "Quaderno",                  monthly: 10    },
];

// ===================== PLANNER =====================
export const PLANNER_TEMPLATE = [
  { day: 1, title: "Lanzamiento",         items: ["Lanzar 3 ángulos creativos distintos", "Definir KPI objetivo del día", "Verificar pixel + CAPI con compra de prueba"] },
  { day: 2, title: "Lectura de tráfico",  items: ["Revisar CTR / CPC / CPM", "No tomar decisiones todavía", "Anotar primeras hipótesis"] },
  { day: 3, title: "Decisión por reglas", items: ["Pausar el peor si cumple regla kill", "Crear 2 variaciones del mejor ángulo", "Revisar checkout si hay ATC sin pagos"] },
  { day: 4, title: "Hooks ganadores",     items: ["Testear 3 hooks del ángulo ganador", "Mantener creativo control activo"] },
  { day: 5, title: "Lectura de ROAS",     items: ["Revisar ROAS últimas 72h", "Revisar carrito si ATC sin venta"] },
  { day: 6, title: "Lote de creatividad", items: ["Nuevo lote de 4–6 creativos", "Plantear UGC con afiliada"] },
  { day: 7, title: "Decisión final",      items: ["Escalar / Seguir testeando / Pausar / Cambiar oferta", "Documentar aprendizajes en Reporte semanal"] },
];

export const DAILY_CHECKLIST = [
  { id: "spend",    label: "Revisar gasto total",        done: false },
  { id: "ctr_cpc",  label: "Revisar CTR / CPC",          done: false },
  { id: "atc",      label: "Revisar Add to Cart",        done: false },
  { id: "checkout", label: "Revisar checkouts",          done: false },
  { id: "sales",    label: "Revisar compras",            done: false },
  { id: "comments", label: "Comentarios en anuncios",   done: false },
  { id: "shopify",  label: "Revisar Shopify",            done: false },
  { id: "supplier", label: "Revisar proveedor",          done: false },
  { id: "ideas",    label: "Crear nuevas ideas",         done: false },
];

// ===================== DECISIONS LOG =====================
export const DECISIONS_LOG = [
  { ts: "13 may · 14:20", action: "No tocar, esperar prime time MX (20:00–23:00).", who: "Regla auto",  icon: "clock"  },
  { ts: "13 may · 11:00", action: "Crear 3 variaciones del ángulo Sarro.",          who: "Manual",      icon: "copy"   },
  { ts: "13 may · 09:00", action: "Pausar creativo Pelo: CPC 0,67 €, 0 ATC.",       who: "Regla k1",    icon: "pause"  },
  { ts: "12 may · 22:10", action: "Reducir presupuesto LAL 1% −10% (estabilizar).", who: "Regla s3",    icon: "down"   },
  { ts: "12 may · 09:30", action: "Escalar Petbrush CBO +25%.",                     who: "Regla s1",    icon: "up"     },
];
