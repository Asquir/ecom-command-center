"use client";
import { ReactNode } from "react";
import { useSettings } from "@/lib/settings-context";
import { Lock, Sparkles } from "lucide-react";

interface ProGateProps {
  children: ReactNode;
  feature: string;
  description?: string;
  onActivate?: () => void;
}

export function ProGate({ children, feature, description, onActivate }: ProGateProps) {
  const { isPro } = useSettings();
  if (isPro) return <>{children}</>;

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="pointer-events-none select-none opacity-30 blur-[2px]" aria-hidden>
        {children}
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="bg-white border border-[var(--gold)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-6 max-w-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-deep)] flex items-center justify-center mx-auto mb-3 shadow-md">
            <Sparkles size={20} className="text-[var(--ink-1)]" />
          </div>
          <div className="text-[10px] font-bold text-[var(--gold-deep)] uppercase tracking-widest mb-1">Feature Pro</div>
          <div className="text-[16px] font-bold text-[var(--ink-1)] mb-1.5">{feature}</div>
          {description && <div className="text-[12px] text-[var(--ink-3)] leading-relaxed mb-4">{description}</div>}
          <button
            onClick={onActivate}
            className="w-full py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black flex items-center justify-center gap-2"
          >
            <Lock size={13} /> Activar Pro
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProBadge() {
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-gradient-to-r from-[var(--gold)] to-[var(--gold-deep)] text-[var(--ink-1)]">
      Pro
    </span>
  );
}
