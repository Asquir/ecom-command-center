"use client";
import { useState } from "react";
import { useSettings } from "@/lib/settings-context";
import { ArrowRight, Package, Target, Globe, CheckCircle, Zap, TrendingUp } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

function StepDot({ n, current }: { n: number; current: number }) {
  const done = current > n;
  const active = current === n;
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all
      ${done ? "bg-[var(--ink-1)] text-white" : active ? "bg-[var(--gold)] text-[var(--ink-1)]" : "bg-[var(--bg-inset)] text-[var(--ink-4)]"}`}>
      {done ? <CheckCircle size={14} /> : n}
    </div>
  );
}

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="mb-1.5">
      <div className="text-[12px] font-semibold text-[var(--ink-2)]">{text}</div>
      {hint && <div className="text-[11px] text-[var(--ink-4)]">{hint}</div>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", prefix, suffix }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; prefix?: string; suffix?: string;
}) {
  return (
    <div className="flex items-center h-10 border border-[var(--border)] rounded-xl overflow-hidden bg-white focus-within:border-[var(--gold)] focus-within:ring-2 focus-within:ring-[rgba(200,169,106,0.2)] transition-all">
      {prefix && <span className="px-3 text-[12px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-r border-[var(--border)] h-full flex items-center font-medium">{prefix}</span>}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
        className="flex-1 px-3 text-[13px] text-[var(--ink-1)] outline-none bg-transparent placeholder:text-[var(--ink-5)]" />
      {suffix && <span className="px-3 text-[12px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-l border-[var(--border)] h-full flex items-center font-medium">{suffix}</span>}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--bg-inset)] rounded-xl p-3">
      <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-0.5">{label}</div>
      <div className="font-mono font-bold text-[16px] text-[var(--ink-1)]">{value}</div>
      {sub && <div className="text-[10px] text-[var(--ink-4)] mt-0.5">{sub}</div>}
    </div>
  );
}

export function Onboarding() {
  const { setSettings } = useSettings();
  const [step, setStep] = useState<Step>(1);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [country, setCountry] = useState("MX");

  const p = parseFloat(price) || 0;
  const c = parseFloat(cost) || 0;
  const margin = p > 0 ? Math.max(0, ((p - c) / p) * 100) : 0;
  const beCpa = p > c ? +(p - c).toFixed(2) : 0;
  const beRoas = margin > 0 ? +(100 / margin).toFixed(2) : 0;

  const currencySymbol: Record<string, string> = { EUR: "€", USD: "$", MXN: "$" };
  const sym = currencySymbol[currency] ?? "€";

  const finish = () => {
    setSettings(prev => ({
      ...prev,
      productName: productName.trim(),
      aov: p || 0,
      productCost: c,
      margin: +margin.toFixed(1),
      beCpa,
      beRoas,
      currency,
      country,
      timezone: country === "MX" ? "America/Mexico_City" : country === "ES" ? "Europe/Madrid" : "America/New_York",
      onboarded: true,
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="flex items-center gap-2">
              <StepDot n={n} current={step} />
              {n < 4 && <div className={`w-8 h-0.5 rounded ${step > n ? "bg-[var(--ink-1)]" : "bg-[var(--border)]"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Bienvenida */}
        {step === 1 && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[var(--ink-1)] flex items-center justify-center mb-5">
              <Zap size={22} className="text-[var(--gold)]" />
            </div>
            <h1 className="text-[24px] font-bold text-[var(--ink-1)] mb-2 leading-tight">Tu Command Center de dropshipping</h1>
            <p className="text-[14px] text-[var(--ink-3)] mb-7 leading-relaxed">
              Configúralo una vez y toma mejores decisiones cada día con datos reales, no plantillas.
            </p>
            <div className="space-y-3 mb-7">
              {[
                { icon: TrendingUp, text: "Análisis de campañas con kill/scale rules automáticas" },
                { icon: Target, text: "Dashboard con tus métricas reales del día" },
                { icon: Package, text: "Gestión de productos, creativos y gastos fijos" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-[var(--ink-3)]" />
                  </div>
                  <span className="text-[13px] text-[var(--ink-2)]">{text}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-[var(--ink-1)] text-white font-semibold text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2">
              Configurar mi negocio <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2 — Producto */}
        {step === 2 && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-inset)] flex items-center justify-center">
                <Package size={18} className="text-[var(--ink-3)]" />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest">Paso 2 de 3</div>
                <h2 className="text-[18px] font-bold text-[var(--ink-1)]">Tu producto activo</h2>
              </div>
            </div>
            <div className="space-y-4 mb-5">
              <div>
                <Label text="Nombre del producto" hint="¿Cómo se llama el producto que estás testeando?" />
                <Input value={productName} onChange={setProductName} placeholder="Ej: Masajeador eléctrico cuello" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label text="Precio de venta" hint="AOV — precio que paga el cliente" />
                  <Input value={price} onChange={setPrice} type="number" placeholder="39" suffix={sym} />
                </div>
                <div>
                  <Label text="Coste producto + envío" hint="Lo que te cuesta a ti en total" />
                  <Input value={cost} onChange={setCost} type="number" placeholder="12" suffix={sym} />
                </div>
              </div>
            </div>
            {p > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-5 p-4 bg-[var(--bg-inset)] rounded-xl">
                <Stat label="Margen neto" value={`${margin.toFixed(1)}%`} sub="sin ads" />
                <Stat label="BE CPA" value={`${beCpa}${sym}`} sub="máximo rentable" />
                <Stat label="BE ROAS" value={`${beRoas}×`} sub="mínimo rentable" />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--ink-3)] text-[13px] hover:bg-[var(--bg-inset)]">
                Atrás
              </button>
              <button onClick={() => setStep(3)} disabled={!productName.trim() || !p}
                className="flex-1 py-2.5 rounded-xl bg-[var(--ink-1)] text-white font-semibold text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                Continuar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Mercado */}
        {step === 3 && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-inset)] flex items-center justify-center">
                <Globe size={18} className="text-[var(--ink-3)]" />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest">Paso 3 de 3</div>
                <h2 className="text-[18px] font-bold text-[var(--ink-1)]">Tu mercado</h2>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <Label text="País principal" hint="Tu mercado objetivo" />
                <select value={country} onChange={e => setCountry(e.target.value)}
                  className="w-full h-10 px-3 text-[13px] text-[var(--ink-1)] border border-[var(--border)] rounded-xl bg-white outline-none focus:border-[var(--gold)] appearance-none">
                  <option value="MX">🇲🇽 México</option>
                  <option value="ES">🇪🇸 España</option>
                  <option value="US">🇺🇸 Estados Unidos</option>
                </select>
              </div>
              <div>
                <Label text="Moneda" hint="Para todas las métricas" />
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="w-full h-10 px-3 text-[13px] text-[var(--ink-1)] border border-[var(--border)] rounded-xl bg-white outline-none focus:border-[var(--gold)] appearance-none">
                  <option value="EUR">EUR — Euro €</option>
                  <option value="USD">USD — Dólar $</option>
                  <option value="MXN">MXN — Peso mexicano $</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--ink-3)] text-[13px] hover:bg-[var(--bg-inset)]">
                Atrás
              </button>
              <button onClick={() => { setStep(4); finish(); }}
                className="flex-1 py-2.5 rounded-xl bg-[var(--ink-1)] text-white font-semibold text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2">
                Finalizar configuración <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Listo */}
        {step === 4 && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--ink-1)] flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={28} className="text-[var(--gold)]" />
            </div>
            <h2 className="text-[22px] font-bold text-[var(--ink-1)] mb-2">¡Listo! Todo configurado.</h2>
            <p className="text-[13px] text-[var(--ink-3)] mb-6 leading-relaxed">
              Ahora registra las métricas de hoy desde Meta Ads Manager y el sistema te dirá qué hacer.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6 text-left">
              {[
                { label: "Producto", value: productName || "—" },
                { label: "Precio venta", value: p ? `${p}${sym}` : "—" },
                { label: "BE CPA", value: beCpa ? `${beCpa}${sym}` : "—" },
                { label: "BE ROAS", value: beRoas ? `${beRoas}×` : "—" },
              ].map(s => (
                <div key={s.label} className="bg-[var(--bg-inset)] rounded-xl p-3">
                  <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-0.5">{s.label}</div>
                  <div className="text-[13px] font-semibold text-[var(--ink-1)] truncate">{s.value}</div>
                </div>
              ))}
            </div>
            <button onClick={finish}
              className="w-full py-3 rounded-xl bg-[var(--ink-1)] text-white font-semibold text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2">
              Abrir el Dashboard <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
