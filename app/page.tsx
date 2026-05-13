"use client";
import { useState, useRef, useEffect } from "react";
import { useLocalStorage } from "@/lib/hooks";
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
import { Bell, Moon, Sun, Plus, Search, X, TrendingUp, AlertTriangle, Clock } from "lucide-react";

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

const SEARCH_INDEX: { label: string; section: Section; hint: string }[] = [
  { label: "Dashboard",          section: "dashboard",  hint: "KPIs, funnel, recomendación" },
  { label: "Campañas",           section: "campaigns",  hint: "Escalar, pausar, diagnóstico" },
  { label: "Creativos",          section: "creatives",  hint: "Score, CTR, ángulos" },
  { label: "Reglas de decisión", section: "rules",      hint: "Kill rules, scale rules" },
  { label: "Calculadora",        section: "calculator", hint: "Break-even, CPA, ROAS" },
  { label: "Productos",          section: "products",   hint: "Regadera, Petbrush, status" },
  { label: "Planner",            section: "planner",    hint: "7 días, checklist diario" },
  { label: "Pedidos",            section: "orders",     hint: "Shopify, proveedores" },
  { label: "Gastos fijos",       section: "expenses",   hint: "Shopify, apps, margen" },
  { label: "Reportes",           section: "reports",    hint: "Reporte diario, semanal" },
  { label: "Ajustes",            section: "settings",   hint: "Moneda, benchmarks, integraciones" },
  { label: "Checklist",          section: "checklist",  hint: "Lanzamiento, requisitos" },
];

const NOTIFICATIONS = [
  { icon: TrendingUp,    color: "text-[var(--success)]", title: "Petbrush CBO — ROAS 3.02×", body: "Supera BE×1.2. Escalar +25%.", time: "hace 2h" },
  { icon: AlertTriangle, color: "text-[var(--warning)]", title: "Checkout bajo 50%",         body: "64 ATC → 32 checkouts. Revisar carrito.", time: "hace 4h" },
  { icon: Clock,         color: "text-[var(--info)]",    title: "Prime time MX en 5h",       body: "No tomes decisiones antes de las 20h.", time: "hace 1h" },
];

export default function Home() {
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

  const searchResults = searchQ.length > 0
    ? SEARCH_INDEX.filter(s => s.label.toLowerCase().includes(searchQ.toLowerCase()) || s.hint.toLowerCase().includes(searchQ.toLowerCase()))
    : [];

  const navigate = (s: Section) => {
    setSection(s);
    setSearchQ("");
    setSearchOpen(false);
  };

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
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar active={section} onNavigate={navigate} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[58px] border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur sticky top-0 z-20 flex items-center gap-4 px-6">
          <div className="flex items-center gap-2 text-[13px] text-[var(--ink-3)]">
            <span>Command Center</span>
            <span className="text-[var(--ink-5)]">/</span>
            <strong className="text-[var(--ink-1)] font-semibold">{SECTION_LABELS[section]}</strong>
          </div>
          <div className="ml-auto flex items-center gap-2">

            {/* Search */}
            <div ref={searchRef} className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-[var(--ink-4)] pointer-events-none" />
              <input
                value={searchQ}
                onChange={e => { setSearchQ(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Buscar sección…"
                className="pl-8 pr-3 h-8 w-48 text-[13px] border border-[var(--border)] rounded-lg bg-white outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[rgba(200,169,106,0.15)] placeholder:text-[var(--ink-4)] transition-all"
              />
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full mt-1 right-0 w-64 bg-white border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-30">
                  {searchResults.map(r => (
                    <button key={r.section} onClick={() => navigate(r.section)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-[var(--bg-inset)] text-left transition-colors">
                      <div>
                        <div className="text-[12px] font-semibold text-[var(--ink-1)]">{r.label}</div>
                        <div className="text-[11px] text-[var(--ink-4)]">{r.hint}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bell */}
            <div ref={bellRef} className="relative">
              <button onClick={() => setBellOpen(o => !o)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)] transition-colors relative">
                <Bell size={14} className="text-[var(--ink-3)]" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--danger)]" />
              </button>
              {bellOpen && (
                <div className="absolute top-full mt-1 right-0 w-80 bg-white border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-30">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                    <div className="text-[13px] font-semibold text-[var(--ink-1)]">Notificaciones</div>
                    <button onClick={() => setBellOpen(false)} className="text-[var(--ink-4)] hover:text-[var(--ink-2)]"><X size={13} /></button>
                  </div>
                  {NOTIFICATIONS.map((n, i) => {
                    const Icon = n.icon;
                    return (
                      <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--bg-inset)] transition-colors">
                        <Icon size={14} className={`${n.color} mt-0.5 flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-[var(--ink-1)]">{n.title}</div>
                          <div className="text-[11px] text-[var(--ink-3)] mt-0.5">{n.body}</div>
                        </div>
                        <div className="text-[10px] text-[var(--ink-5)] flex-shrink-0">{n.time}</div>
                      </div>
                    );
                  })}
                  <div className="px-4 py-2.5">
                    <button onClick={() => { navigate("reports"); setBellOpen(false); }}
                      className="text-[11px] text-[var(--ink-3)] hover:text-[var(--gold-deep)] transition-colors">
                      Ver todos en Reportes →
                    </button>
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
              <Plus size={13} /> Nuevo
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {sectionBody[section]}
        </main>
      </div>
    </div>
  );
}
