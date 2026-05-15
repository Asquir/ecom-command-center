"use client";
import { useState } from "react";
import { zTestProportions, samplesNeeded } from "@/lib/stats";
import { FlaskConical, CheckCircle, XCircle, Clock, Info, TrendingUp } from "lucide-react";

type TestType = "ctr" | "conversion" | "hookrate";

const TEST_TYPES: { id: TestType; label: string; hint: string; metricA: string; metricB: string }[] = [
  { id: "ctr",        label: "CTR del anuncio",   hint: "¿Qué anuncio tiene mejor click-through rate?", metricA: "Impresiones", metricB: "Clics" },
  { id: "conversion", label: "Tasa de conversión", hint: "¿Qué landing page o precio convierte mejor?",  metricA: "Visitantes",   metricB: "Compras" },
  { id: "hookrate",   label: "Hook rate (retención)", hint: "¿Qué hook retiene más en los primeros 3 segundos?", metricA: "Reproducciones", metricB: "Retenciones 3s" },
];

function NumInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-[var(--ink-3)] mb-1.5">{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? "0"} type="number" min="0"
        className="w-full h-9 px-3 text-[13px] font-mono text-[var(--ink-1)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[rgba(200,169,106,0.15)] bg-white transition-all" />
    </div>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const color = confidence >= 95 ? "bg-[var(--success)]"
               : confidence >= 80 ? "bg-[var(--gold)]"
               : "bg-[var(--ink-3)]";
  return (
    <div>
      <div className="flex justify-between items-end mb-1.5">
        <div className="text-[12px] font-semibold text-[var(--ink-2)]">Confianza estadística</div>
        <div className={`text-[20px] font-mono font-bold ${confidence >= 95 ? "text-[var(--success)]" : confidence >= 80 ? "text-[var(--gold-deep)]" : "text-[var(--ink-3)]"}`}>
          {confidence.toFixed(1)}%
        </div>
      </div>
      <div className="h-3 bg-[var(--bg-inset)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, confidence)}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--ink-5)] mt-1">
        <span>0%</span>
        <span className="text-[var(--warning)]">80% aceptable</span>
        <span className="text-[var(--success)]">95% significativo</span>
      </div>
    </div>
  );
}

function VariantPanel({ name, color, exposure: exposureLabel, conversion: convLabel, exposureVal, convVal, onExposure, onConv, rate }: {
  name: string; color: string; exposure: string; conversion: string;
  exposureVal: string; convVal: string; onExposure: (v: string) => void; onConv: (v: string) => void;
  rate: number | null;
}) {
  return (
    <div className={`bg-white border-2 rounded-2xl p-5 space-y-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-bold text-[var(--ink-1)]">{name}</div>
        {rate !== null && (
          <div className="bg-[var(--bg-inset)] px-2.5 py-1 rounded-lg">
            <div className="text-[10px] text-[var(--ink-4)]">Tasa actual</div>
            <div className="font-mono font-bold text-[16px] text-[var(--ink-1)]">{(rate * 100).toFixed(2)}%</div>
          </div>
        )}
      </div>
      <NumInput label={exposureLabel} value={exposureVal} onChange={onExposure} />
      <NumInput label={convLabel} value={convVal} onChange={onConv} />
    </div>
  );
}

export function Lab() {
  const [testType, setTestType] = useState<TestType>("ctr");
  const [a_exp, setA_exp] = useState("");
  const [a_conv, setA_conv] = useState("");
  const [b_exp, setB_exp] = useState("");
  const [b_conv, setB_conv] = useState("");

  const t = TEST_TYPES.find(x => x.id === testType)!;
  const n = (v: string) => Math.max(0, parseInt(v) || 0);

  const n1 = n(a_exp), c1 = n(a_conv), n2 = n(b_exp), c2 = n(b_conv);
  const hasData = n1 > 0 && n2 > 0;
  const result = hasData ? zTestProportions(n1, c1, n2, c2) : null;
  const p1 = n1 > 0 ? c1 / n1 : null;
  const p2 = n2 > 0 ? c2 / n2 : null;
  const needed = p1 && p1 > 0 ? samplesNeeded(p1, 0.2) : null;
  const moreNeeded = needed && n1 > 0 ? Math.max(0, needed - n1) : null;

  const getVerdict = () => {
    if (!result) return null;
    if (!result.significant) {
      if (result.confidence >= 80) return { icon: Clock, color: "text-[var(--warning)]", bg: "bg-[var(--warning-soft)] border-[rgba(245,158,11,0.2)]", title: "Prometedor, pero necesitas más datos", body: `Confianza del ${result.confidence.toFixed(1)}% — necesitas al menos 95% para tomar decisiones. Sigue acumulando datos.` };
      return { icon: Clock, color: "text-[var(--ink-3)]", bg: "bg-[var(--bg-inset)] border-[var(--border)]", title: "Sigue testeando — aún no hay veredicto", body: `Solo ${result.confidence.toFixed(1)}% de confianza. Los resultados actuales podrían ser pura casualidad.` };
    }
    if (result.winner === "B" && result.lift > 0) {
      return { icon: CheckCircle, color: "text-[var(--success)]", bg: "bg-[var(--success-soft)] border-[rgba(34,197,94,0.2)]", title: `Variante B GANA (+${result.lift.toFixed(1)}% de lift)`, body: `Con ${result.confidence.toFixed(1)}% de confianza estadística, la Variante B supera al Control de forma significativa. Puedes pausar A y escalar B.` };
    }
    if (result.winner === "A" && result.lift < 0) {
      return { icon: XCircle, color: "text-[var(--danger)]", bg: "bg-[var(--danger-soft)] border-[rgba(239,68,68,0.2)]", title: `Control A es mejor (B −${Math.abs(result.lift).toFixed(1)}%)`, body: `Con ${result.confidence.toFixed(1)}% de confianza, la Variante B es significativamente inferior. Descarta B y prueba una nueva hipótesis.` };
    }
    return { icon: CheckCircle, color: "text-[var(--ink-3)]", bg: "bg-[var(--bg-inset)] border-[var(--border)]", title: "Sin diferencia significativa", body: "Ambas versiones rinden igual. Quédate con A (el control) y prueba un cambio mayor." };
  };

  const verdict = getVerdict();

  const clearAll = () => { setA_exp(""); setA_conv(""); setB_exp(""); setB_conv(""); };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Decisiones · Estadística real</div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Laboratorio de tests A/B</h1>
        <p className="text-[13px] text-[var(--ink-3)] mt-1">
          ¿Tus resultados son reales o pura suerte? Aquí usas estadística real para saber si tu variante gana de verdad.
        </p>
      </div>

      {/* Test type selector */}
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4">
        <div className="text-[11px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-3">¿Qué estás testando?</div>
        <div className="grid grid-cols-3 gap-2">
          {TEST_TYPES.map(tt => (
            <button key={tt.id} onClick={() => { setTestType(tt.id); clearAll(); }}
              className={`p-3 rounded-xl border text-left transition-all ${testType === tt.id ? "border-[var(--ink-1)] bg-[var(--ink-1)] text-white" : "border-[var(--border)] hover:border-[var(--ink-3)] hover:bg-[var(--bg-inset)]"}`}>
              <div className={`text-[12px] font-semibold mb-0.5 ${testType === tt.id ? "text-white" : "text-[var(--ink-1)]"}`}>{tt.label}</div>
              <div className={`text-[10px] ${testType === tt.id ? "text-white/70" : "text-[var(--ink-4)]"}`}>{tt.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <VariantPanel name="Control (A) — versión actual" color="border-[var(--border)]"
          exposure={t.metricA} conversion={t.metricB}
          exposureVal={a_exp} convVal={a_conv} onExposure={setA_exp} onConv={setA_conv}
          rate={p1} />
        <VariantPanel name="Variante (B) — versión nueva" color="border-[var(--gold)]"
          exposure={t.metricA} conversion={t.metricB}
          exposureVal={b_exp} convVal={b_conv} onExposure={setB_exp} onConv={setB_conv}
          rate={p2} />
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm p-6 space-y-5">
          <ConfidenceBar confidence={result.confidence} />

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Tasa Control (A)", value: `${(result.p1 * 100).toFixed(2)}%` },
              { label: "Tasa Variante (B)", value: `${(result.p2 * 100).toFixed(2)}%` },
              { label: "Lift relativo", value: `${result.lift >= 0 ? "+" : ""}${result.lift.toFixed(1)}%`, ok: result.lift > 0 },
            ].map(k => (
              <div key={k.label} className="bg-[var(--bg-inset)] rounded-xl p-3 text-center">
                <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wide mb-1">{k.label}</div>
                <div className={`font-mono font-bold text-[18px] ${k.ok === true ? "text-[var(--success)]" : k.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>{k.value}</div>
              </div>
            ))}
          </div>

          {verdict && (() => {
            const { icon: Icon, color, bg, title, body } = verdict;
            return (
              <div className={`border rounded-xl p-4 flex gap-3 ${bg}`}>
                <Icon size={18} className={`${color} flex-shrink-0 mt-0.5`} />
                <div>
                  <div className="text-[13px] font-semibold text-[var(--ink-1)] mb-0.5">{title}</div>
                  <div className="text-[12px] text-[var(--ink-3)] leading-relaxed">{body}</div>
                </div>
              </div>
            );
          })()}

          {moreNeeded !== null && moreNeeded > 0 && (
            <div className="flex items-start gap-2 bg-[var(--bg-inset)] rounded-xl p-3">
              <TrendingUp size={14} className="text-[var(--ink-4)] mt-0.5 flex-shrink-0" />
              <div className="text-[12px] text-[var(--ink-3)]">
                Necesitas aproximadamente <strong>{moreNeeded.toLocaleString()} {t.metricA.toLowerCase()} más por versión</strong> para tener significancia estadística con un MDE del 20%.
              </div>
            </div>
          )}
        </div>
      )}

      {!hasData && (
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm p-8 text-center">
          <FlaskConical size={28} className="text-[var(--ink-4)] mx-auto mb-3" />
          <div className="text-[14px] font-semibold text-[var(--ink-2)] mb-1">Introduce los datos de tu test</div>
          <div className="text-[12px] text-[var(--ink-4)] max-w-sm mx-auto leading-relaxed">
            Copia los números de Meta Ads Manager o Shopify y el laboratorio te dirá si tu variante gana de verdad o fue suerte.
          </div>
        </div>
      )}

      <div className="bg-[var(--bg-inset)] border border-[var(--border)] rounded-xl p-4 flex gap-2">
        <Info size={13} className="text-[var(--ink-4)] flex-shrink-0 mt-0.5" />
        <div className="text-[11px] text-[var(--ink-3)] leading-relaxed">
          <strong>¿Qué es significancia estadística?</strong> Que el 95% de las veces, si repites el experimento, obtendrás el mismo resultado. Por debajo del 95% de confianza, los resultados podrían ser pura casualidad. La mayoría de media buyers toman decisiones sin comprobarlo — aquí tienes la ventaja.
        </div>
      </div>
    </div>
  );
}
