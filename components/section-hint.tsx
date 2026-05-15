"use client";
import { useLocalStorage } from "@/lib/hooks";
import { X, Lightbulb } from "lucide-react";

type HintKey =
  | "dashboard" | "calculator" | "creatives" | "rules" | "checklist"
  | "products" | "campaigns" | "planner" | "orders" | "expenses"
  | "reports" | "settings" | "cashflow" | "lab";

const HINTS: Record<HintKey, { title: string; body: string }> = {
  dashboard: {
    title: "Esto es tu cabina de mando",
    body: "Cada noche, mete las métricas reales del día (gasto, ingresos, clics, ATC, compras). La IA te dirá si escalar, vigilar u apagar — y por qué. Cuantos más días registres, más fiable el veredicto.",
  },
  campaigns: {
    title: "Tus campañas activas en Meta",
    body: "Cada campaña que registres aquí tendrá su semáforo (escalar / vigilar / apagar). Pulsa una para ver diagnóstico y, si toca escalar, se abrirá el protocolo de 4 fases.",
  },
  creatives: {
    title: "Banco de creativos",
    body: "Sube cada anuncio con su hook, ángulo y voz. La app calcula la fatiga del creativo (cuando un anuncio empieza a perder rendimiento) y te avisa para que crees variaciones a tiempo.",
  },
  rules: {
    title: "Reglas de decisión",
    body: "Estas son las reglas estándar para apagar/escalar campañas. Sirven como referencia rápida cuando dudas si tocar algo o esperar.",
  },
  lab: {
    title: "Laboratorio de tests A/B",
    body: "¿Es tu nuevo creativo realmente mejor o fue suerte? Mete los datos de control y variante y la app calcula significancia estadística real con z-test.",
  },
  products: {
    title: "Tu catálogo de productos",
    body: "Añade el producto que estás validando con su precio, COGS y proveedor. La app calcula automáticamente break-even, ROAS objetivo y márgenes por pack. Si lo marcas como muerto, se abre la autopsia para no perder aprendizajes.",
  },
  planner: {
    title: "Plan de testing de 7 días",
    body: "Cuando arranques con un producto nuevo, pulsa 'Iniciar plan' y cada día tendrás tareas claras y árbol de decisión. La fecha actual se calcula automáticamente.",
  },
  orders: {
    title: "Registro de pedidos",
    body: "Apunta pedidos manualmente (cliente, producto, coste, margen). La app detecta incidencias y avisa cuando un pedido pierde dinero. Próximamente: integración con Shopify.",
  },
  cashflow: {
    title: "Proyección de tesorería",
    body: "Meta cobra cada día, Shopify paga cada 7 días. Esta proyección a 90 días te enseña los valles donde te puedes quedar sin caja aunque seas rentable.",
  },
  calculator: {
    title: "Calculadora de break-even",
    body: "Mete tu precio, COGS y comisiones y la app calcula al céntimo cuánto puedes gastar por compra (CPA), tu ROAS de break-even y tu margen real.",
  },
  expenses: {
    title: "Gastos fijos mensuales",
    body: "Lista cada servicio que pagas (Shopify, apps, dominio). Mete los ingresos y gasto en ads del mes para ver tu margen neto real, no el de las campañas.",
  },
  reports: {
    title: "Reportes diario y semanal",
    body: "Genera resúmenes desde las métricas que vas registrando en el Dashboard. No necesitas hacer nada manual: se actualiza solo.",
  },
  checklist: {
    title: "Checklist de lanzamiento",
    body: "Antes de gastar un euro en ads, asegúrate de tener pixel, checkout, métodos de pago y todo lo demás verde. Una sola fricción puede tirar a la basura tu mejor creativo.",
  },
  settings: {
    title: "Ajustes y benchmarks",
    body: "Configura tus objetivos (CTR mínimo, CPC máximo, hook rate target) y la app usará esos valores para evaluar campañas y creativos. Abajo tienes la zona peligrosa para resetear datos.",
  },
};

export function SectionHint({ section }: { section: HintKey }) {
  const [dismissed, setDismissed] = useLocalStorage<Record<string, boolean>>("ecc-hints-dismissed", {});
  const hint = HINTS[section];
  if (!hint || dismissed[section]) return null;

  return (
    <div className="bg-[var(--gold-soft)] border border-[rgba(200,169,106,0.3)] rounded-xl p-4 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-[var(--gold)] flex items-center justify-center flex-shrink-0">
        <Lightbulb size={14} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold text-[var(--gold-deep)] uppercase tracking-wider mb-1">Cómo usar esto</div>
        <div className="text-[13px] font-semibold text-[var(--ink-1)] mb-0.5">{hint.title}</div>
        <div className="text-[12px] text-[var(--ink-2)] leading-relaxed">{hint.body}</div>
      </div>
      <button onClick={() => setDismissed(prev => ({ ...prev, [section]: true }))}
        className="text-[var(--ink-4)] hover:text-[var(--ink-1)] flex-shrink-0"
        title="Entendido">
        <X size={14} />
      </button>
    </div>
  );
}
