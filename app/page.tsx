"use client";
import { useState } from "react";
import { Sidebar, type Section } from "@/components/sidebar";
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
import { Bell, Moon, Sun, Plus, Search } from "lucide-react";

const SECTION_LABELS: Record<Section, string> = {
  dashboard:  "Dashboard",
  calculator: "Calculadora de rentabilidad",
  creatives:  "Creativos",
  rules:      "Reglas de decisión",
  checklist:  "Checklist de lanzamiento",
  products:   "Productos",
  campaigns:  "Campañas",
  planner:    "Planner de testing",
  orders:     "Pedidos y Proveedores",
  expenses:   "Gastos fijos",
  reports:    "Reportes",
  settings:   "Ajustes",
};

export default function Home() {
  const [section, setSection] = useState<Section>("dashboard");
  const [dark, setDark] = useState(false);

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
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)]" data-theme={dark ? "dark" : "light"}>
      <Sidebar active={section} onNavigate={setSection} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-[58px] border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur sticky top-0 z-20 flex items-center gap-4 px-6">
          <div className="flex items-center gap-2 text-[13px] text-[var(--ink-3)]">
            <span>Command Center</span>
            <span className="text-[var(--ink-5)]">/</span>
            <strong className="text-[var(--ink-1)] font-semibold">{SECTION_LABELS[section]}</strong>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2 text-[var(--ink-4)]" />
              <input
                placeholder="Buscar…"
                className="pl-8 pr-3 h-8 w-52 text-[13px] border border-[var(--border)] rounded-lg bg-white outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[rgba(200,169,106,0.15)] placeholder:text-[var(--ink-4)] transition-all"
              />
            </div>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)] transition-colors">
              <Bell size={14} className="text-[var(--ink-3)]" />
            </button>
            <button
              onClick={() => setDark(d => !d)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)] transition-colors"
            >
              {dark ? <Sun size={14} className="text-[var(--ink-3)]" /> : <Moon size={14} className="text-[var(--ink-3)]" />}
            </button>
            <button className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[var(--ink-1)] text-white text-[12px] font-medium hover:bg-black transition-colors">
              <Plus size={13} /> Nuevo
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {sectionBody[section]}
        </main>
      </div>
    </div>
  );
}
