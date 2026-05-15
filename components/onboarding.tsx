"use client";
import { useState } from "react";
import { useSettings } from "@/lib/settings-context";
import { ArrowRight, Package, Target, CheckCircle, Zap, TrendingUp, User } from "lucide-react";

type Step = 1 | 2 | 3 | 4 | 5;

function StepDot({ n, current, total }: { n: number; current: number; total: number }) {
  const done = current > n;
  const active = current === n;
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
      ${done ? "bg-[var(--ink-1)] text-white" : active ? "bg-[var(--gold)] text-[var(--ink-1)]" : "bg-[var(--border)] text-[var(--ink-4)]"}`}>
      {done ? <CheckCircle size={12} /> : n}
    </div>
  );
}

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="mb-1.5">
      <div className="text-[12px] font-semibold text-[var(--ink-2)]">{text}</div>
      {hint && <div className="text-[11px] text-[var(--ink-4)] mt-0.5">{hint}</div>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", prefix, suffix, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; prefix?: string; suffix?: string; autoFocus?: boolean;
}) {
  return (
    <div className="flex items-center h-11 border border-[var(--border)] rounded-xl overflow-hidden bg-white focus-within:border-[var(--gold)] focus-within:ring-2 focus-within:ring-[rgba(200,169,106,0.2)] transition-all">
      {prefix && <span className="px-3 text-[12px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-r border-[var(--border)] h-full flex items-center font-medium">{prefix}</span>}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} autoFocus={autoFocus}
        className="flex-1 px-3 text-[13px] text-[var(--ink-1)] outline-none bg-transparent placeholder:text-[var(--ink-4)]" />
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

const TOTAL_STEPS = 4;

export function Onboarding() {
  const { setSettings } = useSettings();
  const [step, setStep] = useState<Step>(1);

  // Profile
  const [userName, setUserName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // Product
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");

  // Market
  const [currency, setCurrency] = useState("EUR");
  const [country, setCountry] = useState("ES");

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
      userName: userName.trim(),
      storeName: storeName.trim(),
      userEmail: userEmail.trim(),
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
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg)] via-[var(--bg)] to-[var(--gold-soft)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[480px]">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[var(--ink-1)] flex items-center justify-center shadow-lg">
            <span className="font-mono font-black text-[13px] text-[var(--gold)]">EC</span>
          </div>
          <div className="text-[15px] font-bold text-[var(--ink-1)]">Ecom Command Center</div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
            <div key={n} className="flex items-center gap-2">
              <StepDot n={n} current={step} total={TOTAL_STEPS} />
              {n < TOTAL_STEPS && (
                <div className={`w-10 h-0.5 rounded-full transition-all ${step > n ? "bg-[var(--ink-1)]" : "bg-[var(--border)]"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Bienvenida */}
        {step === 1 && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/5">
            <div className="w-14 h-14 rounded-2xl bg-[var(--ink-1)] flex items-center justify-center mb-6 shadow-lg">
              <Zap size={24} className="text-[var(--gold)]" />
            </div>
            <h1 className="text-[26px] font-black text-[var(--ink-1)] mb-2 leading-tight tracking-tight">
              Tu OS de dropshipping
            </h1>
            <p className="text-[14px] text-[var(--ink-3)] mb-7 leading-relaxed">
              Configúralo en 2 minutos y toma decisiones con datos reales cada día.
            </p>
            <div className="space-y-3 mb-8">
              {[
                { icon: TrendingUp, text: "Kill/scale rules automáticas para tus campañas de Meta" },
                { icon: Target,     text: "Dashboard con análisis IA y veredicto diario" },
                { icon: Package,    text: "Gestión completa: creativos, productos, tesorería" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--gold-soft)] flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-[var(--gold-deep)]" />
                  </div>
                  <span className="text-[13px] text-[var(--ink-2)]">{text}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)}
              className="w-full py-3.5 rounded-xl bg-[var(--ink-1)] text-white font-bold text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm">
              Empezar configuración <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2 — Perfil */}
        {step === 2 && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-[var(--bg-inset)] flex items-center justify-center">
                <User size={19} className="text-[var(--ink-3)]" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-[var(--ink-4)] uppercase tracking-widest">Paso 1 de 3</div>
                <h2 className="text-[19px] font-bold text-[var(--ink-1)] leading-tight">Tu perfil</h2>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <Label text="Tu nombre" hint="Para personalizar la app" />
                <Input value={userName} onChange={setUserName} placeholder="Ej: Carlos Martínez" autoFocus />
              </div>
              <div>
                <Label text="Nombre de tu tienda" hint="Tu marca o nombre de negocio" />
                <Input value={storeName} onChange={setStoreName} placeholder="Ej: TechGadgets MX" />
              </div>
              <div>
                <Label text="Email (opcional)" hint="Para identificar tu cuenta" />
                <Input value={userEmail} onChange={setUserEmail} placeholder="tu@email.com" type="email" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="px-4 py-3 rounded-xl border border-[var(--border)] text-[var(--ink-3)] text-[13px] hover:bg-[var(--bg-inset)] transition-colors">
                Atrás
              </button>
              <button onClick={() => setStep(3)} disabled={!userName.trim()}
                className="flex-1 py-3 rounded-xl bg-[var(--ink-1)] text-white font-bold text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                Continuar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Producto */}
        {step === 3 && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-[var(--bg-inset)] flex items-center justify-center">
                <Package size={19} className="text-[var(--ink-3)]" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-[var(--ink-4)] uppercase tracking-widest">Paso 2 de 3</div>
                <h2 className="text-[19px] font-bold text-[var(--ink-1)] leading-tight">Tu producto activo</h2>
              </div>
            </div>
            <div className="space-y-4 mb-5">
              <div>
                <Label text="Nombre del producto" hint="¿Qué estás testeando ahora mismo?" />
                <Input value={productName} onChange={setProductName} placeholder="Ej: Masajeador eléctrico cuello" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label text="Precio de venta" hint="Lo que paga el cliente" />
                  <Input value={price} onChange={setPrice} type="number" placeholder="39" suffix={sym} />
                </div>
                <div>
                  <Label text="Coste producto + envío" hint="Lo que te cuesta a ti" />
                  <Input value={cost} onChange={setCost} type="number" placeholder="12" suffix={sym} />
                </div>
              </div>
            </div>
            {p > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-5 p-4 bg-[var(--gold-soft)] rounded-xl border border-[rgba(200,169,106,0.2)]">
                <Stat label="Margen" value={`${margin.toFixed(1)}%`} sub="sin ads" />
                <Stat label="BE CPA" value={`${beCpa}${sym}`} sub="máx rentable" />
                <Stat label="BE ROAS" value={`${beRoas}×`} sub="mín rentable" />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="px-4 py-3 rounded-xl border border-[var(--border)] text-[var(--ink-3)] text-[13px] hover:bg-[var(--bg-inset)] transition-colors">
                Atrás
              </button>
              <button onClick={() => setStep(4)} disabled={!productName.trim() || !p}
                className="flex-1 py-3 rounded-xl bg-[var(--ink-1)] text-white font-bold text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                Continuar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Mercado */}
        {step === 4 && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-[var(--bg-inset)] flex items-center justify-center">
                <Globe size={19} className="text-[var(--ink-3)]" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-[var(--ink-4)] uppercase tracking-widest">Paso 3 de 3</div>
                <h2 className="text-[19px] font-bold text-[var(--ink-1)] leading-tight">Tu mercado</h2>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <Label text="País principal" hint="Tu mercado objetivo de ventas" />
                <select value={country} onChange={e => setCountry(e.target.value)}
                  className="w-full h-11 px-3 text-[13px] text-[var(--ink-1)] border border-[var(--border)] rounded-xl bg-white outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[rgba(200,169,106,0.2)] appearance-none transition-all">
                  <option value="ES">🇪🇸 España</option>
                  <option value="MX">🇲🇽 México</option>
                  <option value="US">🇺🇸 Estados Unidos</option>
                </select>
              </div>
              <div>
                <Label text="Moneda" hint="Para todas las métricas y cálculos" />
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="w-full h-11 px-3 text-[13px] text-[var(--ink-1)] border border-[var(--border)] rounded-xl bg-white outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[rgba(200,169,106,0.2)] appearance-none transition-all">
                  <option value="EUR">EUR — Euro €</option>
                  <option value="USD">USD — Dólar $</option>
                  <option value="MXN">MXN — Peso mexicano $</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(3)} className="px-4 py-3 rounded-xl border border-[var(--border)] text-[var(--ink-3)] text-[13px] hover:bg-[var(--bg-inset)] transition-colors">
                Atrás
              </button>
              <button onClick={() => { setStep(5); finish(); }}
                className="flex-1 py-3 rounded-xl bg-[var(--ink-1)] text-white font-bold text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2">
                Finalizar configuración <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 5 — Listo */}
        {step === 5 && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--ink-1)] flex items-center justify-center mx-auto mb-5 shadow-lg">
              <CheckCircle size={28} className="text-[var(--gold)]" />
            </div>
            <h2 className="text-[24px] font-black text-[var(--ink-1)] mb-2 tracking-tight">
              ¡Todo listo{userName ? `, ${userName.split(" ")[0]}` : ""}!
            </h2>
            <p className="text-[13px] text-[var(--ink-3)] mb-6 leading-relaxed max-w-sm mx-auto">
              Registra las métricas de hoy desde Meta Ads Manager y la IA te dirá exactamente qué hacer.
            </p>
            <div className="grid grid-cols-2 gap-2.5 mb-6 text-left">
              {[
                { label: "Perfil", value: userName || "—" },
                { label: "Tienda", value: storeName || "—" },
                { label: "Producto", value: productName || "—" },
                { label: "BE ROAS", value: beRoas ? `${beRoas}×` : "—" },
              ].map(s => (
                <div key={s.label} className="bg-[var(--bg-inset)] rounded-xl p-3">
                  <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-0.5">{s.label}</div>
                  <div className="text-[12px] font-semibold text-[var(--ink-1)] truncate">{s.value}</div>
                </div>
              ))}
            </div>
            <button onClick={finish}
              className="w-full py-3.5 rounded-xl bg-[var(--ink-1)] text-white font-bold text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm">
              Abrir el Dashboard <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Globe({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}
