"use client";
import { useState, useRef, useEffect } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { Onboarding } from "@/components/onboarding";
import { Sidebar, type Section } from "@/components/sidebar";
import { SectionHint } from "@/components/section-hint";
import { CommandPalette } from "@/components/command-palette";
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
import { Bell, Moon, Sun, Plus, X, Command } from "lucide-react";

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

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <div className="w-[216px] flex-shrink-0 border-r border-[var(--border)] bg-[var(--sidebar)]" />
      <div className="flex-1 flex flex-col">
        <div className="h-[58px] border-b border-[var(--border)] bg-[var(--bg)]" />
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

export default function Home() {
  const { settings } = useSettings();
  const [section, setSection] = useLocalStorage<Section>("ecc-section", "dashboard");
  const [dark, setDark] = useLocalStorage<boolean>("ecc-dark", false);
  const [mounted, setMounted] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark, mounted]);

  // Cmd+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
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

  const navigate = (s: Section) => { setSection(s); };

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
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigate} />

      <div className="flex min-h-screen bg-[var(--bg)]">
        <Sidebar active={section} onNavigate={navigate} onOpenPalette={() => setPaletteOpen(true)} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-[54px] border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur sticky top-0 z-20 flex items-center gap-4 px-5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[13px] min-w-0">
              <span className="text-[var(--ink-4)] hidden sm:block font-medium text-[12px] truncate">
                {settings.storeName || "Ecom Command Center"}
              </span>
              <span className="text-[var(--ink-5)] hidden sm:block">/</span>
              <strong className="text-[var(--ink-1)] font-semibold truncate">{SECTION_LABELS[section]}</strong>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              {/* Command palette trigger */}
              <button
                onClick={() => setPaletteOpen(true)}
                className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)] text-[var(--ink-4)] text-[12px] transition-colors"
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

              {/* New campaign CTA */}
              <button onClick={() => navigate("campaigns")}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[var(--ink-1)] text-white text-[12px] font-semibold hover:bg-black transition-colors shadow-sm">
                <Plus size={13} /> Nueva
              </button>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-5 sm:p-6 max-w-[1440px] w-full mx-auto space-y-4">
            <SectionHint section={section} />
            {sectionBody[section]}
          </main>
        </div>
      </div>
    </>
  );
}
