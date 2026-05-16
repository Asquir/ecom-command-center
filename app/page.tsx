"use client";
import { useState, useRef, useEffect } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { Onboarding } from "@/components/onboarding";
import { Sidebar, type Section } from "@/components/sidebar";
import { SectionHint } from "@/components/section-hint";
import { CommandPalette } from "@/components/command-palette";
import { QuickActionsPanel } from "@/components/quick-actions-panel";
import { Dashboard } from "@/components/sections/dashboard";
import { Calculator } from "@/components/sections/calculator";
import { Creatives } from "@/components/sections/creatives";
import { CreativeStudio } from "@/components/sections/creative-studio";
import { Rules } from "@/components/sections/rules";
import { Checklist } from "@/components/sections/checklist";
import { Products } from "@/components/sections/products";
import { Campaigns } from "@/components/sections/campaigns";
import { Planner } from "@/components/sections/planner";
import { Orders } from "@/components/sections/orders";
import { Expenses } from "@/components/sections/expenses";
import { Reports } from "@/components/sections/reports";
import { Settings } from "@/components/sections/settings";
import { CashFlow } from "@/components/sections/cashflow";
import { Lab } from "@/components/sections/lab";
import { Research } from "@/components/sections/research";
import { Bell, Moon, Sun, Plus, X, Command, Menu, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { SetupProgress } from "@/components/setup-progress";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

const SECTION_LABELS: Record<Section, string> = {
  dashboard:         "Dashboard · IA",
  calculator:        "Calculadora",
  creatives:         "Creativos",
  "creative-studio": "Creative Studio · IA",
  rules:             "Reglas de decisión",
  checklist:         "Checklist",
  products:          "Productos",
  campaigns:         "Campañas",
  planner:           "Testing Plan",
  orders:            "Pedidos",
  expenses:          "Gastos fijos",
  reports:           "Reportes",
  settings:          "Ajustes",
  cashflow:          "Flujo de caja",
  lab:               "Laboratorio A/B",
  research:          "Investigación de producto",
};

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <div className="hidden lg:block w-[216px] flex-shrink-0 border-r border-[rgba(255,255,255,0.06)] bg-[#0C0C0A]" />
      <div className="flex-1 flex flex-col">
        <div className="h-[54px] border-b border-[var(--border)] bg-[var(--bg)]" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 rounded-full border-2 border-[var(--gold)] border-t-transparent animate-spin" />
            <span className="text-[12px] text-[var(--ink-4)] font-medium">Cargando…</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DailyMetrics {
  spend: number; revenue: number; purchases: number;
  clicks?: number; impressions?: number; atc?: number; checkouts?: number;
}
type DailyRecord = Record<string, DailyMetrics>;

function todayKey() { return new Date().toISOString().split("T")[0]; }

function TodayStatusPill({ beRoas, beCpa, onGoToDashboard }: { beRoas: number; beCpa: number; onGoToDashboard: () => void }) {
  const [allMetrics] = useLocalStorage<DailyRecord>("ecc-daily-metrics", {});
  const [plannerStart] = useLocalStorage<string | null>("ecc-planner-start", null);
  const today = todayKey();
  const m = allMetrics[today];
  if (!m || m.spend === 0) return (
    <button onClick={onGoToDashboard}
      className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-dashed border-[var(--border)] text-[11px] text-[var(--ink-4)] hover:text-[var(--ink-1)] hover:border-[var(--ink-3)] transition-all">
      <Plus size={10} /> Métricas de hoy
    </button>
  );
  const roas = m.spend > 0 ? m.revenue / m.spend : 0;
  const testingDay = plannerStart ? Math.floor((Date.now() - new Date(plannerStart).getTime()) / 86_400_000) + 1 : null;
  const isGood = beRoas > 0 ? roas >= beRoas : roas > 1;
  const isBad = beRoas > 0 ? roas < beRoas * 0.7 : false;
  const color = isGood ? "border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.08)] text-[var(--success)]"
              : isBad  ? "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)] text-[var(--danger)]"
              : "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.06)] text-[var(--warning)]";
  const Icon = isGood ? TrendingUp : isBad ? TrendingDown : Minus;
  return (
    <button onClick={onGoToDashboard}
      className={`hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-semibold transition-all hover:opacity-80 ${color}`}>
      <Icon size={10} />
      {testingDay && testingDay > 0 && testingDay <= 60 && <span className="font-mono opacity-70">D{testingDay}</span>}
      <span className="font-mono">{roas.toFixed(1)}×</span>
      <span className="opacity-70">·</span>
      <span>€{m.spend.toFixed(0)}</span>
      {m.purchases > 0 && <><span className="opacity-70">·</span><span>{m.purchases} 📦</span></>}
    </button>
  );
}

function QuickMetricsModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const { settings } = useSettings();
  const [allMetrics, setAllMetrics] = useLocalStorage<DailyRecord>("ecc-daily-metrics", {});
  const today = todayKey();
  const existing = allMetrics[today];
  const [spend, setSpend] = useState(existing?.spend ? String(existing.spend) : "");
  const [revenue, setRevenue] = useState(existing?.revenue ? String(existing.revenue) : "");
  const [purchases, setPurchases] = useState(existing?.purchases ? String(existing.purchases) : "");
  const n = (v: string) => parseFloat(v) || 0;
  const spendN = n(spend), revenueN = n(revenue), purchasesN = n(purchases);
  const roas = spendN > 0 ? revenueN / spendN : 0;
  const cpa = purchasesN > 0 ? spendN / purchasesN : 0;
  const isGood = settings.beRoas > 0 ? roas >= settings.beRoas : roas > 1;

  const save = () => {
    if (!spendN) return;
    setAllMetrics(prev => ({
      ...prev,
      [today]: { ...(prev[today] ?? {}), spend: spendN, revenue: revenueN, purchases: purchasesN },
    }));
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div className="bg-white border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--border)]">
          <div>
            <div className="text-[13px] font-bold text-[var(--ink-1)]">Métricas de hoy</div>
            <div className="text-[11px] text-[var(--ink-4)]">{new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-inset)]"><X size={14} /></button>
        </div>
        <div className="p-4 space-y-3">
          {[
            { label: "Gasto en ads", value: spend, set: setSpend, suffix: "€", hint: "Importe gastado hoy" },
            { label: "Ingresos", value: revenue, set: setRevenue, suffix: "€", hint: "Valor de conv. de compra" },
            { label: "Compras", value: purchases, set: setPurchases, suffix: "", hint: "Número de pedidos" },
          ].map(f => (
            <div key={f.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold text-[var(--ink-2)]">{f.label}</span>
                <span className="text-[10px] text-[var(--ink-4)]">{f.hint}</span>
              </div>
              <div className="flex items-center h-9 border border-[var(--border)] rounded-lg overflow-hidden bg-white focus-within:border-[var(--gold)] focus-within:ring-2 focus-within:ring-[rgba(200,169,106,0.15)] transition-all">
                <input value={f.value} onChange={e => f.set(e.target.value)} type="number" min="0" step="0.01"
                  className="flex-1 px-2.5 text-[13px] font-mono text-[var(--ink-1)] outline-none bg-transparent" />
                {f.suffix && <span className="px-2 text-[11px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-l border-[var(--border)] h-full flex items-center">{f.suffix}</span>}
              </div>
            </div>
          ))}
          {spendN > 0 && (
            <div className={`rounded-xl p-3 flex items-center justify-between ${isGood ? "bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)]" : "bg-[var(--warning-soft)] border border-[rgba(245,158,11,0.2)]"}`}>
              <div className="text-[12px] font-semibold text-[var(--ink-1)]">ROAS en tiempo real</div>
              <div className={`font-mono font-bold text-[18px] ${isGood ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>{roas.toFixed(2)}×</div>
              {purchasesN > 0 && settings.beCpa > 0 && (
                <div className={`text-[11px] font-semibold ${cpa <= settings.beCpa ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>CPA €{cpa.toFixed(2)}</div>
              )}
            </div>
          )}
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={save} disabled={!spendN}
            className="flex-1 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black transition-colors disabled:opacity-40">
            Guardar
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[13px] text-[var(--ink-3)] hover:bg-[var(--bg-inset)]">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { settings } = useSettings();
  const [section, setSection] = useLocalStorage<Section>("ecc-section", "dashboard");
  const [dark, setDark] = useLocalStorage<boolean>("ecc-dark", false);
  const [mounted, setMounted] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [quickMetrics, setQuickMetrics] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark, mounted]);

  // Cmd+K = command palette / Cmd+M = quick metrics entry
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setPaletteOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === "m") { e.preventDefault(); setQuickMetrics(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!mounted) return <LoadingSkeleton />;
  if (!settings.onboarded) return <Onboarding />;

  const navigate = (s: Section) => { setSection(s); setSidebarOpen(false); };

  const sectionBody: Record<Section, React.ReactNode> = {
    dashboard:         <Dashboard />,
    calculator:        <Calculator />,
    creatives:         <Creatives />,
    "creative-studio": <CreativeStudio />,
    rules:             <Rules />,
    checklist:         <Checklist />,
    products:          <Products />,
    campaigns:         <Campaigns />,
    planner:           <Planner />,
    orders:            <Orders />,
    expenses:          <Expenses />,
    reports:           <Reports />,
    settings:          <Settings />,
    cashflow:          <CashFlow />,
    lab:               <Lab />,
    research:          <Research />,
  };

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigate} />
      {quickMetrics && (
        <QuickMetricsModal
          onClose={() => setQuickMetrics(false)}
          onSave={() => { setQuickMetrics(false); if (section !== "dashboard") navigate("dashboard"); }}
        />
      )}

      <div className="flex min-h-screen bg-[var(--bg)]">
        <Sidebar
          active={section}
          onNavigate={navigate}
          onOpenPalette={() => setPaletteOpen(true)}
          mobile={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-[54px] border-b border-[var(--border)] bg-white/85 backdrop-blur-md sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-5 shadow-[0_1px_0_var(--border)]">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)] transition-colors flex-shrink-0"
            >
              <Menu size={15} className="text-[var(--ink-3)]" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[13px] min-w-0 flex-1">
              <strong className="text-[var(--ink-1)] font-semibold truncate text-[13px]">{SECTION_LABELS[section]}</strong>
            </div>

            {/* Global today status — visible from any section */}
            <TodayStatusPill
              beRoas={settings.beRoas}
              beCpa={settings.beCpa}
              onGoToDashboard={() => navigate("dashboard")}
            />

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Command palette trigger - hidden on small mobile */}
              <button
                onClick={() => setPaletteOpen(true)}
                className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)] text-[var(--ink-4)] text-[12px] transition-colors"
              >
                <Command size={12} />
                <span>Buscar</span>
                <kbd className="text-[9px] font-mono bg-[var(--bg-inset)] border border-[var(--border)] rounded px-1 py-0.5 leading-none ml-0.5">⌘K</kbd>
              </button>

              {/* Bell */}
              <div ref={bellRef} className="relative">
                <button onClick={() => setBellOpen(o => !o)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)] transition-colors">
                  <Bell size={13} className="text-[var(--ink-3)]" />
                </button>
                {bellOpen && (
                  <div className="absolute top-full mt-1.5 right-0 w-72 bg-white border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-30">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                      <div className="text-[13px] font-semibold text-[var(--ink-1)]">Notificaciones</div>
                      <button onClick={() => setBellOpen(false)}><X size={13} className="text-[var(--ink-4)]" /></button>
                    </div>
                    <div className="px-4 py-8 text-center">
                      <Bell size={18} className="text-[var(--ink-5)] mx-auto mb-2" />
                      <div className="text-[12px] text-[var(--ink-3)] font-medium">Sin alertas activas</div>
                      <div className="text-[11px] text-[var(--ink-5)] mt-0.5">Actívalas en Ajustes →</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Dark mode */}
              <button onClick={() => setDark(d => !d)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)] transition-colors">
                {dark ? <Sun size={13} className="text-[var(--gold)]" /> : <Moon size={13} className="text-[var(--ink-3)]" />}
              </button>

              {/* Quick metrics entry — the #1 daily action */}
              <button onClick={() => setQuickMetrics(true)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-gradient-to-b from-[#1a1a18] to-[#0c0c0a] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity shadow-sm border border-[rgba(255,255,255,0.08)]">
                <Plus size={13} /> <span className="hidden sm:inline">Métricas</span>
              </button>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-4 sm:p-5 lg:p-6 max-w-[1440px] w-full mx-auto pb-24 lg:pb-6">
            <div key={section} className="animate-section-enter space-y-4">
              <SectionHint section={section} />
              {section === "dashboard" && <SetupProgress onNavigate={navigate} />}
              {sectionBody[section]}
            </div>
          </main>
        </div>
      </div>

      {/* Quick actions floating panel */}
      <QuickActionsPanel onNavigate={navigate} />
      <MobileBottomNav active={section} onNavigate={navigate} />
    </>
  );
}
