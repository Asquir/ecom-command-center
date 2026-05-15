"use client";
import { cx } from "@/lib/utils";
import type { Section } from "./sidebar";
import { LayoutDashboard, Megaphone, Play, BarChart2, Settings } from "lucide-react";

const ITEMS = [
  { id: "dashboard" as Section, icon: LayoutDashboard, label: "Inicio" },
  { id: "campaigns" as Section, icon: Megaphone, label: "Campañas" },
  { id: "creatives" as Section, icon: Play, label: "Creativos" },
  { id: "reports"  as Section, icon: BarChart2,   label: "Reportes" },
  { id: "settings" as Section, icon: Settings,    label: "Ajustes" },
];

export function MobileBottomNav({ active, onNavigate }: {
  active: Section;
  onNavigate: (s: Section) => void;
}) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0C0C0A]/96 backdrop-blur-md border-t border-[rgba(255,255,255,0.07)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-[60px]">
        {ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cx(
                "flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-90",
                isActive ? "text-[var(--gold)]" : "text-[rgba(255,255,255,0.38)]"
              )}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                {isActive && (
                  <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--gold)] shadow-[0_0_4px_var(--gold)]" />
                )}
              </div>
              <span className={cx("text-[9px] font-semibold tracking-wide mt-0.5", isActive ? "text-[var(--gold)]" : "text-[rgba(255,255,255,0.32)]")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
