"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, LayoutDashboard, Calculator, Play, Shield, CheckSquare,
  Package, Megaphone, Calendar, ShoppingBag, Receipt,
  FileBarChart, Settings, FlaskConical, Wallet, ArrowRight,
  Plus, Moon, Download, RefreshCw
} from "lucide-react";
import type { Section } from "./sidebar";
import { cx } from "@/lib/utils";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ElementType;
  section?: Section;
};

const COMMANDS: Cmd[] = [
  { id: "dashboard",  label: "Dashboard · IA",        hint: "Score, señales y análisis IA",      group: "Secciones", icon: LayoutDashboard, section: "dashboard" },
  { id: "campaigns",  label: "Campañas",               hint: "Kill/scale, protocolo de escala",   group: "Secciones", icon: Megaphone,       section: "campaigns" },
  { id: "creatives",  label: "Creativos",              hint: "Fatiga, hook rate, CTR",            group: "Secciones", icon: Play,            section: "creatives" },
  { id: "products",   label: "Productos",              hint: "Catálogo, autopsia de producto",    group: "Secciones", icon: Package,         section: "products" },
  { id: "planner",    label: "Testing Plan 7 días",    hint: "Tareas diarias, árbol de decisión", group: "Secciones", icon: Calendar,        section: "planner" },
  { id: "orders",     label: "Pedidos",                hint: "Registro y seguimiento de pedidos", group: "Secciones", icon: ShoppingBag,     section: "orders" },
  { id: "cashflow",   label: "Flujo de caja",          hint: "Proyección 90 días, liquidez",      group: "Secciones", icon: Wallet,          section: "cashflow" },
  { id: "calculator", label: "Calculadora break-even", hint: "CPA máx, ROAS BE, escenarios",      group: "Secciones", icon: Calculator,      section: "calculator" },
  { id: "expenses",   label: "Gastos fijos",           hint: "Margen neto real del mes",          group: "Secciones", icon: Receipt,         section: "expenses" },
  { id: "reports",    label: "Reportes",               hint: "Reporte diario y semanal",          group: "Secciones", icon: FileBarChart,    section: "reports" },
  { id: "rules",      label: "Reglas kill/scale",      hint: "Árbol de decisión, referencias",    group: "Secciones", icon: Shield,          section: "rules" },
  { id: "lab",        label: "Laboratorio A/B",        hint: "Significancia estadística, z-test", group: "Secciones", icon: FlaskConical,    section: "lab" },
  { id: "checklist",  label: "Checklist lanzamiento",  hint: "Pixel, checkout, métodos de pago",  group: "Secciones", icon: CheckSquare,     section: "checklist" },
  { id: "settings",   label: "Ajustes",                hint: "Benchmarks, moneda, notificaciones",group: "Secciones", icon: Settings,        section: "settings" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (s: Section) => void;
}

export function CommandPalette({ open, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim() === ""
    ? COMMANDS
    : COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        (c.hint ?? "").toLowerCase().includes(query.toLowerCase())
      );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  const pick = useCallback((cmd: Cmd) => {
    if (cmd.section) { onNavigate(cmd.section); onClose(); }
  }, [onNavigate, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && filtered[selected]) pick(filtered[selected]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selected, pick, onClose]);

  if (!open) return null;

  const groups = [...new Set(filtered.map(c => c.group))];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[14vh]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[560px] mx-4 bg-white border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-palette-in">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)] bg-white">
          <Search size={15} className="text-[var(--ink-4)] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar sección o acción…"
            className="flex-1 text-[14px] text-[var(--ink-1)] outline-none placeholder:text-[var(--ink-4)] bg-transparent"
          />
          <kbd className="text-[10px] font-mono bg-[var(--bg-inset)] border border-[var(--border)] rounded-md px-1.5 py-1 text-[var(--ink-4)] leading-none">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-[var(--ink-4)]">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          ) : (
            groups.map(group => (
              <div key={group}>
                <div className="px-4 pt-3 pb-1 text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest">{group}</div>
                {filtered.filter(c => c.group === group).map(cmd => {
                  const idx = filtered.indexOf(cmd);
                  const Icon = cmd.icon;
                  const isActive = idx === selected;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => pick(cmd)}
                      onMouseEnter={() => setSelected(idx)}
                      className={cx(
                        "flex items-center gap-3 px-4 py-2.5 w-full text-left transition-colors",
                        isActive ? "bg-[var(--bg-inset)]" : "hover:bg-[var(--bg-inset)/50]"
                      )}
                    >
                      <div className={cx(
                        "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                        isActive ? "bg-[var(--ink-1)]" : "bg-[var(--bg-inset)]"
                      )}>
                        <Icon size={14} className={isActive ? "text-[var(--gold)]" : "text-[var(--ink-3)]"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[var(--ink-1)] truncate">{cmd.label}</div>
                        {cmd.hint && <div className="text-[11px] text-[var(--ink-4)] truncate">{cmd.hint}</div>}
                      </div>
                      <ArrowRight size={13} className={cx("text-[var(--ink-4)] transition-opacity", isActive ? "opacity-100" : "opacity-0")} />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-4 py-2.5 flex items-center gap-4 text-[11px] text-[var(--ink-4)] bg-[var(--bg-inset)]">
          <span className="flex items-center gap-1.5">
            <kbd className="font-mono bg-white border border-[var(--border)] rounded px-1.5 py-0.5 leading-none">↑↓</kbd> Navegar
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="font-mono bg-white border border-[var(--border)] rounded px-1.5 py-0.5 leading-none">↵</kbd> Abrir
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="font-mono bg-white border border-[var(--border)] rounded px-1.5 py-0.5 leading-none">ESC</kbd> Cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
