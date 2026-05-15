"use client";
import { cx } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import {
  LayoutDashboard, Calculator, Play, Shield, CheckSquare,
  Package, Megaphone, Calendar, ShoppingBag, Receipt,
  FileBarChart, Settings, FlaskConical, Wallet, TrendingUp
} from "lucide-react";

export type Section =
  | "dashboard" | "calculator" | "creatives" | "rules" | "checklist"
  | "products" | "campaigns" | "planner" | "orders" | "expenses"
  | "reports" | "settings" | "cashflow" | "lab";

const NAV_GROUPS: {
  label: string;
  items: { id: Section; label: string; icon: React.ElementType; badge?: string }[];
}[] = [
  {
    label: "Decisiones",
    items: [
      { id: "dashboard",  label: "Dashboard",    icon: LayoutDashboard },
      { id: "campaigns",  label: "Campañas",     icon: Megaphone },
      { id: "creatives",  label: "Creativos",    icon: Play },
      { id: "rules",      label: "Reglas kill/scale", icon: Shield },
      { id: "lab",        label: "Lab A/B",      icon: FlaskConical, badge: "NUEVO" },
    ],
  },
  {
    label: "Productos",
    items: [
      { id: "products",   label: "Productos",    icon: Package },
      { id: "planner",    label: "Testing plan", icon: Calendar },
      { id: "orders",     label: "Pedidos",      icon: ShoppingBag },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { id: "cashflow",   label: "Flujo de caja", icon: Wallet, badge: "NUEVO" },
      { id: "calculator", label: "Calculadora",   icon: Calculator },
      { id: "expenses",   label: "Gastos fijos",  icon: Receipt },
      { id: "reports",    label: "Reportes",      icon: FileBarChart },
    ],
  },
  {
    label: "Config",
    items: [
      { id: "checklist",  label: "Checklist",    icon: CheckSquare },
      { id: "settings",   label: "Ajustes",      icon: Settings },
    ],
  },
];

interface SidebarProps {
  active: Section;
  onNavigate: (s: Section) => void;
}

export function Sidebar({ active, onNavigate }: SidebarProps) {
  const { settings } = useSettings();

  return (
    <aside className="flex flex-col h-screen sticky top-0 border-r border-[var(--border)] bg-[var(--sidebar)] px-3 py-4 gap-1 w-[220px] flex-shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 pb-3 mb-1">
        <div className="w-7 h-7 rounded-lg bg-[var(--ink-1)] flex items-center justify-center flex-shrink-0">
          <span className="font-mono font-bold text-[12px] text-[var(--gold)]">EC</span>
        </div>
        <div>
          <div className="font-bold text-[14px] text-[var(--ink-1)] leading-tight">Command Center</div>
          <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wide">Dropshipping OS</div>
        </div>
      </div>

      {NAV_GROUPS.map(group => (
        <div key={group.label} className="mb-1">
          <div className="text-[10px] font-semibold text-[var(--ink-5)] uppercase tracking-widest px-2 py-1.5">{group.label}</div>
          {group.items.map(n => {
            const Icon = n.icon;
            const isActive = active === n.id;
            return (
              <button
                key={n.id}
                onClick={() => onNavigate(n.id)}
                className={cx(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium w-full text-left transition-all mb-0.5",
                  isActive
                    ? "bg-white text-[var(--ink-1)] shadow-[0_1px_3px_rgba(17,17,17,0.07),inset_0_0_0_1px_var(--border)] font-semibold"
                    : "text-[var(--ink-3)] hover:bg-white/60 hover:text-[var(--ink-1)]"
                )}
              >
                <Icon size={14} className={isActive ? "text-[var(--gold-deep)]" : "text-[var(--ink-4)]"} />
                <span className="flex-1">{n.label}</span>
                {n.badge && !isActive && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--gold-soft)] text-[var(--gold-deep)] uppercase tracking-wide">
                    {n.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}

      {/* Active product widget */}
      <div className="mt-auto border-t border-[var(--border)] pt-3 px-1">
        {settings.productName ? (
          <div className="rounded-xl bg-white border border-[var(--border)] p-3 relative overflow-hidden cursor-pointer" onClick={() => onNavigate("products")}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,169,106,0.12),transparent_60%)] pointer-events-none" />
            <div className="text-[10px] font-semibold text-[var(--gold-deep)] uppercase tracking-wider mb-1">Producto activo</div>
            <div className="text-[12px] font-semibold text-[var(--ink-1)] mb-0.5 truncate">{settings.productName}</div>
            <div className="text-[11px] text-[var(--ink-3)]">
              {settings.aov > 0 ? `€${settings.aov} · ` : ""}{settings.beRoas > 0 ? `BE ROAS ${settings.beRoas}×` : "Configura benchmarks"}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-3 text-center cursor-pointer hover:bg-white/50 transition-colors" onClick={() => onNavigate("settings")}>
            <TrendingUp size={14} className="text-[var(--ink-4)] mx-auto mb-1" />
            <div className="text-[11px] text-[var(--ink-4)]">Sin producto activo</div>
          </div>
        )}
      </div>
    </aside>
  );
}
