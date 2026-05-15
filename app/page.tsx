"use client";
import { useState, useRef, useEffect } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { Onboarding } from "@/components/onboarding";
import { Sidebar, type Section } from "@/components/sidebar";
import { SectionHint } from "@/components/section-hint";
import { Dashboard } from "@/components/sections/dashboard";
import { Calculator } from "@/components/sections/calculator";
import { Creatives } from "@/components/sections/creatives";
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
import { Bell, Moon, Sun, Plus, Search, X } from "lucide-react";

const SECTION_LABELS: Record<Section, string> = {
  dashboard:  "Dashboard · IA",
  calculator: "Calculadora",
  creatives:  "Creativos",
  rules:      "Reglas de decisión",
  checklist:  "Checklist",
  products:   "Productos",
  campaigns:  "Campañas",
  planner:    "Testing Plan",
  orders:     "Pedidos",
  expenses:   "Gastos fijos",
  reports:    "Reportes",
  settings:   "Ajustes",
  cashflow:   "Flujo de caja",
  lab:        "Laboratorio A/B",
};

const SEARCH_INDEX: { label: string; section: Section; hint: string }[] = [
  { label: "Dashboard IA",         section: "dashboard",  hint: "Score, señales, análisis IA, decisión" },
  { label: "Campañas",             section: "campaigns",  hint: "Kill/scale, protocolo de escala" },
  { label: "Creativos",            section: "creatives",  hint: "Fatiga de creativo, hook rate, CTR" },
  { label: "Reglas kill/scale",    section: "rules",      hint: "Kill rules, scale rules, árbol de decisión" },
  { label: "Lab A/B",              section: "lab",        hint: "Test estadístico, significancia, lift" },
  { label: "Flujo de caja",        section: "cashflow",   hint: "Proyección 90 días, riesgo de liquidez" },
  { label: "Calculadora",          section: "calculator", hint: "Break-even, CPA, ROAS, escenarios" },
  { label: "Productos",            section: "products",   hint: "Gestión, autopsia, status" },
  { label: "Testing Plan",         section: "planner",    hint: "7 días, checklist diario" },
  { label: "Pedidos",              section: "orders",     hint: "Shopify, proveedores" },
  { label: "Gastos fijos",         section: "expenses",   hint: "Shopify, apps, margen" },
  { label: "Reportes",             section: "reports",    hint: "Reporte diario y semanal" },
  { label: "Ajustes",              section: "settings",   hint: "Benchmarks, moneda, producto" },
  { label: "Checklist",            section: "checklist",  hint: "Lanzamiento de producto" },
];

export default function Home() {
  const { settings } = useSettings();
  const [section, setSection] = useLocalStorage<Section>("ecc-section", "dashboard");
  const [dark, setDark] = useLocalStorage<boolean>("ecc-dark", false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!settings.onboarded) return <Onboarding />;

  const searchResults = searchQ.length > 0
    ? SEARCH_INDEX.filter(s => s.label.toLowerCase().includes(searchQ.toLowerCase()) || s.hint.toLowerCase().includes(searchQ.toLowerCase()))
    : [];

  const navigate = (s: Section) => { setSection(s); setSearchQ(""); setSearchOpen(false); };

  const sectionBody: Record<Section, React.ReactNode> = {
    dashboard:  <Dashboard />,
    calculator: <Calculator />,
    creatives:  <Creatives />,
    rules:      <Rules />,
    checklist:  <Checklist />,
    products:   <Products />,
    campaigns:  <Campaigns />,
    planner:    <Planner />,
    orders:     <Orders />,
    expenses:   <Expenses />,
    reports:    <Reports />,
    settings:   <Settings />,
    cashflow:   <CashFlow />,
    lab:        <Lab />,
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar active={section} onNavigate={navigate} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[58px] border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur sticky top-0 z-20 flex items-center gap-4 px-6">
          <div className="flex items-center gap-2 text-[13px] text-[var(--ink-3)]">
            <span className="hidden sm:block font-medium">Ecom Command Center</span>
            <span className="text-[var(--ink-5)] hidden sm:block">/</span>
            <strong className="text-[var(--ink-1)] font-semibold">{SECTION_LABELS[section]}</strong>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <div ref={searchRef} className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-[var(--ink-4)] pointer-events-none" />
              <input value={searchQ} onChange={e => { setSearchQ(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)}
                placeholder="Buscar…" className="pl-8 pr-3 h-8 w-36 sm:w-44 text-[13px] border border-[var(--border)] rounded-lg bg-white outline-none focus:border-[var(--gold)] focus:w-52 placeholder:text-[var(--ink-4)] transition-all" />
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full mt-1 right-0 w-72 bg-white border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-30">
                  {searchResults.map(r => (
                    <button key={r.section} onClick={() => navigate(r.section)}
                      className="w-full flex flex-col px-3 py-2.5 hover:bg-[var(--bg-inset)] text-left transition-colors border-b border-[var(--border)] last:border-0">
                      <div className="text-[12px] font-semibold text-[var(--ink-1)]">{r.label}</div>
                      <div className="text-[11px] text-[var(--ink-4)]">{r.hint}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bell */}
            <div ref={bellRef} className="relative">
              <button onClick={() => setBellOpen(o => !o)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)] transition-colors">
                <Bell size={14} className="text-[var(--ink-3)]" />
              </button>
              {bellOpen && (
                <div className="absolute top-full mt-1 right-0 w-72 bg-white border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-30">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                    <div className="text-[13px] font-semibold text-[var(--ink-1)]">Notificaciones</div>
                    <button onClick={() => setBellOpen(false)}><X size={13} className="text-[var(--ink-4)]" /></button>
                  </div>
                  <div className="px-4 py-8 text-center">
                    <Bell size={20} className="text-[var(--ink-5)] mx-auto mb-2" />
                    <div className="text-[12px] text-[var(--ink-4)]">Sin alertas activas</div>
                    <div className="text-[11px] text-[var(--ink-5)] mt-0.5">Actívalas en Ajustes</div>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setDark(d => !d)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)] transition-colors">
              {dark ? <Sun size={14} className="text-[var(--ink-3)]" /> : <Moon size={14} className="text-[var(--ink-3)]" />}
            </button>

            <button onClick={() => navigate("campaigns")}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[var(--ink-1)] text-white text-[12px] font-medium hover:bg-black transition-colors">
              <Plus size={13} /> Nueva
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto space-y-4">
          <SectionHint section={section} />
          {sectionBody[section]}
        </main>
      </div>
    </div>
  );
}
