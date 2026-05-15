"use client";
import { cx } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import {
  LayoutDashboard, Calculator, Play, Shield, CheckSquare,
  Package, Megaphone, Calendar, ShoppingBag, Receipt,
  FileBarChart, Settings, FlaskConical, Wallet, TrendingUp, X
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
      { id: "dashboard",  label: "Dashboard",         icon: LayoutDashboard },
      { id: "campaigns",  label: "Campañas",          icon: Megaphone },
      { id: "creatives",  label: "Creativos",         icon: Play },
      { id: "rules",      label: "Reglas kill/scale", icon: Shield },
      { id: "lab",        label: "Lab A/B",           icon: FlaskConical, badge: "BETA" },
    ],
  },
  {
    label: "Productos",
    items: [
      { id: "products",   label: "Productos",         icon: Package },
      { id: "planner",    label: "Testing plan",      icon: Calendar },
      { id: "orders",     label: "Pedidos",           icon: ShoppingBag },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { id: "cashflow",   label: "Flujo de caja",     icon: Wallet },
      { id: "calculator", label: "Calculadora",       icon: Calculator },
      { id: "expenses",   label: "Gastos fijos",      icon: Receipt },
      { id: "reports",    label: "Reportes",          icon: FileBarChart },
    ],
  },
  {
    label: "Config",
    items: [
      { id: "checklist",  label: "Checklist",         icon: CheckSquare },
      { id: "settings",   label: "Ajustes",           icon: Settings },
    ],
  },
];

interface SidebarProps {
  active: Section;
  onNavigate: (s: Section) => void;
  onOpenPalette?: () => void;
  mobile?: boolean;
  onMobileClose?: () => void;
}

function getInitials(name: string): string {
  if (!name) return "EC";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function Sidebar({ active, onNavigate, onOpenPalette, mobile, onMobileClose }: SidebarProps) {
  const { settings } = useSettings();
  const initials = getInitials(settings.userName || settings.storeName);

  const handleNav = (s: Section) => {
    onNavigate(s);
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside className={cx(
        "flex flex-col h-screen border-r border-[var(--border)] bg-[var(--sidebar)] px-2.5 py-3 gap-0.5 w-[216px] flex-shrink-0 overflow-y-auto transition-transform duration-200",
        // Desktop: sticky, always visible
        "lg:sticky lg:top-0 lg:translate-x-0 lg:z-auto",
        // Mobile: fixed drawer
        "fixed top-0 left-0 z-50",
        mobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo + mobile close */}
        <div className="flex items-center gap-2.5 px-2 pb-3 mb-0.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--ink-1)] flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="font-mono font-black text-[11px] text-[var(--gold)] tracking-tight">EC</span>
          </div>
          <div className="flex-1">
            <div className="font-bold text-[13px] text-[var(--ink-1)] leading-tight tracking-tight">Command Center</div>
            <div className="text-[9px] text-[var(--ink-4)] uppercase tracking-widest font-semibold">Dropshipping OS</div>
          </div>
          <button onClick={onMobileClose} className="lg:hidden p-1 rounded-lg hover:bg-[var(--bg-inset)] text-[var(--ink-4)]">
            <X size={15} />
          </button>
        </div>

        {/* Cmd+K shortcut */}
        {onOpenPalette && (
          <button
            onClick={onOpenPalette}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dashed border-[var(--border)] text-[var(--ink-4)] hover:text-[var(--ink-2)] hover:border-[var(--border-strong)] hover:bg-white/40 transition-all mb-1.5 group"
          >
            <SearchIcon size={12} className="group-hover:text-[var(--gold-deep)] transition-colors" />
            <span className="flex-1 text-[11px] text-left">Buscar…</span>
            <div className="hidden sm:flex items-center gap-0.5">
              <kbd className="text-[9px] font-mono bg-[var(--bg-inset)] border border-[var(--border)] rounded px-1 py-0.5 leading-none">⌘K</kbd>
            </div>
          </button>
        )}

        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-0.5">
            <div className="text-[9px] font-bold text-[var(--ink-5)] uppercase tracking-[0.12em] px-2 py-2">{group.label}</div>
            {group.items.map(n => {
              const Icon = n.icon;
              const isActive = active === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => handleNav(n.id)}
                  className={cx(
                    "flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12.5px] font-medium w-full text-left transition-all mb-0.5 relative",
                    isActive
                      ? "bg-white text-[var(--ink-1)] shadow-[0_1px_3px_rgba(17,17,17,0.08),inset_0_0_0_1px_var(--border)] font-semibold"
                      : "text-[var(--ink-3)] hover:bg-white/50 hover:text-[var(--ink-1)]"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[var(--gold)] rounded-r-full" />
                  )}
                  <Icon size={13} className={isActive ? "text-[var(--gold-deep)]" : "text-[var(--ink-4)]"} />
                  <span className="flex-1">{n.label}</span>
                  {n.badge && !isActive && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--gold-soft)] text-[var(--gold-deep)] uppercase tracking-wide">
                      {n.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Bottom widgets */}
        <div className="mt-auto pt-2 border-t border-[var(--border)] space-y-2">
          {settings.productName ? (
            <button
              onClick={() => handleNav("products")}
              className="w-full rounded-xl bg-white border border-[var(--border)] p-3 relative overflow-hidden text-left hover:shadow-sm transition-shadow"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,169,106,0.15),transparent_60%)] pointer-events-none" />
              <div className="text-[9px] font-bold text-[var(--gold-deep)] uppercase tracking-widest mb-1">Producto activo</div>
              <div className="text-[12px] font-semibold text-[var(--ink-1)] mb-0.5 truncate">{settings.productName}</div>
              <div className="text-[10px] text-[var(--ink-3)]">
                {settings.aov > 0 ? `${settings.aov}€ · ` : ""}
                {settings.beRoas > 0 ? `BE ROAS ${settings.beRoas}×` : "Configura benchmarks"}
              </div>
            </button>
          ) : (
            <button
              onClick={() => handleNav("settings")}
              className="w-full rounded-xl border border-dashed border-[var(--border)] p-3 text-center hover:bg-white/50 transition-colors"
            >
              <TrendingUp size={13} className="text-[var(--ink-4)] mx-auto mb-1" />
              <div className="text-[10px] text-[var(--ink-4)]">Sin producto activo</div>
            </button>
          )}

          <button
            onClick={() => handleNav("settings")}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg w-full hover:bg-white/60 hover:text-[var(--ink-1)] transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-[var(--ink-1)] flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-[10px] font-bold text-[var(--gold)] leading-none">{initials}</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[11.5px] font-semibold text-[var(--ink-1)] truncate leading-tight">
                {settings.userName || settings.storeName || "Mi cuenta"}
              </div>
              <div className="text-[10px] text-[var(--ink-4)] truncate leading-tight">
                {settings.userEmail || "Configurar perfil →"}
              </div>
            </div>
            <Settings size={11} className="text-[var(--ink-5)] group-hover:text-[var(--ink-3)] transition-colors flex-shrink-0" />
          </button>
        </div>
      </aside>
    </>
  );
}

function SearchIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}
