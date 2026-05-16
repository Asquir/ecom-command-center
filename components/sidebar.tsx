"use client";
import { cx } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import {
  LayoutDashboard, Calculator, Play, Shield, CheckSquare,
  Package, Megaphone, Calendar, ShoppingBag, Receipt,
  FileBarChart, Settings, FlaskConical, Wallet, TrendingUp, X, Sparkles
} from "lucide-react";

export type Section =
  | "dashboard" | "calculator" | "creatives" | "rules" | "checklist"
  | "products" | "campaigns" | "planner" | "orders" | "expenses"
  | "reports" | "settings" | "cashflow" | "lab" | "creative-studio";

const NAV_GROUPS: {
  label: string;
  items: { id: Section; label: string; icon: React.ElementType; badge?: string }[];
}[] = [
  {
    label: "Decisiones",
    items: [
      { id: "dashboard",        label: "Dashboard",         icon: LayoutDashboard },
      { id: "campaigns",        label: "Campañas",          icon: Megaphone },
      { id: "creatives",        label: "Creativos",         icon: Play },
      { id: "creative-studio",  label: "Creative Studio",   icon: Sparkles, badge: "PRO" },
      { id: "rules",            label: "Reglas kill/scale", icon: Shield },
      { id: "lab",              label: "Lab A/B",           icon: FlaskConical, badge: "BETA" },
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
      {mobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside className={cx(
        "flex flex-col h-screen px-2.5 py-3 gap-0.5 w-[216px] flex-shrink-0 overflow-y-auto transition-transform duration-200",
        "bg-[#0C0C0A] border-r border-[rgba(255,255,255,0.06)]",
        "lg:sticky lg:top-0 lg:translate-x-0 lg:z-auto",
        "fixed top-0 left-0 z-50",
        mobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2 pb-3 mb-0.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-deep)] flex items-center justify-center flex-shrink-0 shadow-[0_0_14px_rgba(200,169,106,0.4)]">
            <span className="font-mono font-black text-[11px] text-[#0C0C0A] tracking-tight">EC</span>
          </div>
          <div className="flex-1">
            <div className="font-bold text-[13px] text-white leading-tight tracking-tight">Command Center</div>
            <div className="text-[9px] text-[rgba(255,255,255,0.28)] uppercase tracking-widest font-semibold">Dropshipping OS</div>
          </div>
          <button onClick={onMobileClose} className="lg:hidden p-1 rounded-lg hover:bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.35)]">
            <X size={15} />
          </button>
        </div>

        {/* Search / Cmd+K */}
        {onOpenPalette && (
          <button
            onClick={onOpenPalette}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dashed border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.32)] hover:text-[rgba(255,255,255,0.7)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)] transition-all mb-1.5 group"
          >
            <SearchIcon size={12} className="group-hover:text-[var(--gold)] transition-colors" />
            <span className="flex-1 text-[11px] text-left">Buscar…</span>
            <kbd className="text-[9px] font-mono bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded px-1 py-0.5 leading-none text-[rgba(255,255,255,0.28)] hidden sm:block">⌘K</kbd>
          </button>
        )}

        {/* Nav groups */}
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-0.5">
            <div className="text-[9px] font-bold text-[rgba(255,255,255,0.2)] uppercase tracking-[0.12em] px-2 py-2">{group.label}</div>
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
                      ? "bg-[rgba(200,169,106,0.13)] text-[var(--gold)] font-semibold border border-[rgba(200,169,106,0.2)]"
                      : "text-[rgba(255,255,255,0.42)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.85)]"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--gold)] rounded-r-full shadow-[0_0_8px_rgba(200,169,106,0.7)]" />
                  )}
                  <Icon size={13} className={isActive ? "text-[var(--gold)]" : "text-[rgba(255,255,255,0.28)]"} />
                  <span className="flex-1">{n.label}</span>
                  {n.badge && !isActive && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-[rgba(200,169,106,0.12)] text-[var(--gold)] uppercase tracking-wide border border-[rgba(200,169,106,0.18)]">
                      {n.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Bottom widgets */}
        <div className="mt-auto pt-2 border-t border-[rgba(255,255,255,0.06)] space-y-1.5">
          {settings.productName ? (
            <button
              onClick={() => handleNav("products")}
              className="w-full rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] p-3 relative overflow-hidden text-left hover:bg-[rgba(255,255,255,0.07)] transition-colors"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,169,106,0.1),transparent_65%)] pointer-events-none" />
              <div className="text-[9px] font-bold text-[var(--gold)] uppercase tracking-widest mb-1">Producto activo</div>
              <div className="text-[12px] font-semibold text-white mb-0.5 truncate">{settings.productName}</div>
              <div className="text-[10px] text-[rgba(255,255,255,0.35)]">
                {settings.aov > 0 ? `${settings.aov}€ · ` : ""}
                {settings.beRoas > 0 ? `BE ROAS ${settings.beRoas}×` : "Configura benchmarks"}
              </div>
            </button>
          ) : (
            <button
              onClick={() => handleNav("settings")}
              className="w-full rounded-xl border border-dashed border-[rgba(255,255,255,0.1)] p-3 text-center hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            >
              <TrendingUp size={13} className="text-[rgba(255,255,255,0.28)] mx-auto mb-1" />
              <div className="text-[10px] text-[rgba(255,255,255,0.28)]">Sin producto activo</div>
            </button>
          )}

          <button
            onClick={() => handleNav("settings")}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg w-full hover:bg-[rgba(255,255,255,0.05)] transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-deep)] flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_rgba(200,169,106,0.3)]">
              <span className="text-[10px] font-bold text-[#0C0C0A] leading-none">{initials}</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[11.5px] font-semibold text-white truncate leading-tight">
                {settings.userName || settings.storeName || "Mi cuenta"}
              </div>
              <div className="text-[10px] text-[rgba(255,255,255,0.32)] truncate leading-tight">
                {settings.userEmail || "Configurar perfil →"}
              </div>
            </div>
            <Settings size={11} className="text-[rgba(255,255,255,0.22)] group-hover:text-[rgba(255,255,255,0.5)] transition-colors flex-shrink-0" />
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
