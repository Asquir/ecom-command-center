"use client";
import { useSettings } from "@/lib/settings-context";
import { useLocalStorage } from "@/lib/hooks";
import { CheckCircle, Circle, ArrowRight, Zap } from "lucide-react";
import { cx } from "@/lib/utils";
import type { Section } from "./sidebar";

interface Step {
  id: string;
  label: string;
  hint: string;
  section: Section;
  done: boolean;
}

interface Props {
  onNavigate: (s: Section) => void;
}

export function SetupProgress({ onNavigate }: Props) {
  const { settings } = useSettings();
  const [campaigns] = useLocalStorage<unknown[]>("ecc-campaigns", []);
  const [creatives] = useLocalStorage<unknown[]>("ecc-creatives", []);
  const [metrics] = useLocalStorage<Record<string, unknown>>("ecc-daily-metrics", {});

  const steps: Step[] = [
    { id: "profile",    label: "Completa tu perfil",          hint: "Nombre y tienda en Ajustes",      section: "settings",  done: !!settings.userName },
    { id: "product",    label: "Añade tu producto activo",    hint: "Nombre, precio y COGS",            section: "settings",  done: !!settings.productName && settings.aov > 0 },
    { id: "benchmarks", label: "Configura tu break-even",     hint: "BE ROAS y BE CPA calculados",      section: "settings",  done: settings.beRoas > 0 && settings.beCpa > 0 },
    { id: "campaign",   label: "Crea tu primera campaña",     hint: "Tracking kill/scale en Meta Ads", section: "campaigns", done: (campaigns as unknown[]).length > 0 },
    { id: "creative",   label: "Añade un creativo",           hint: "Hook, ángulo y métricas",          section: "creatives", done: (creatives as unknown[]).length > 0 },
    { id: "metrics",    label: "Registra métricas del día",   hint: "Gasto, ingresos y compras",        section: "dashboard", done: Object.keys(metrics).length > 0 },
    { id: "pixel",      label: "Configura tu Pixel ID",       hint: "Para verificación técnica",        section: "settings",  done: !!settings.pixelId },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const nextStep = steps.find(s => !s.done);

  if (pct === 100) return null;

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[var(--border)] bg-gradient-to-r from-white to-[var(--gold-soft)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-bold text-[var(--gold-deep)] uppercase tracking-widest mb-0.5">Configuración inicial</div>
            <div className="text-[16px] font-bold text-[var(--ink-1)]">Activa tu Command Center</div>
            <div className="text-[12px] text-[var(--ink-3)] mt-0.5">
              {doneCount < steps.length
                ? `${steps.length - doneCount} paso${steps.length - doneCount > 1 ? "s" : ""} para tener todo listo`
                : "¡Todo configurado!"}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono font-black text-[28px] text-[var(--gold-deep)] leading-none">{pct}%</div>
            <div className="text-[10px] text-[var(--ink-4)] mt-0.5">{doneCount}/{steps.length} pasos</div>
          </div>
        </div>
        <div className="h-2 bg-[var(--bg-inset)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--gold-deep)] to-[var(--gold)] rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="p-3 space-y-1">
        {steps.map(step => (
          <button
            key={step.id}
            onClick={() => !step.done && onNavigate(step.section)}
            disabled={step.done}
            className={cx(
              "flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl transition-all",
              step.done ? "opacity-40 cursor-default" : "hover:bg-[var(--bg-inset)] cursor-pointer group"
            )}
          >
            {step.done
              ? <CheckCircle size={16} className="text-[var(--success)] flex-shrink-0" />
              : <Circle size={16} className="text-[var(--border-strong)] flex-shrink-0 group-hover:text-[var(--gold-deep)] transition-colors" />
            }
            <div className="flex-1 min-w-0">
              <div className={cx(
                "text-[12.5px] font-medium",
                step.done ? "line-through text-[var(--ink-4)]" : "text-[var(--ink-1)]"
              )}>
                {step.label}
              </div>
              <div className="text-[11px] text-[var(--ink-4)]">{step.hint}</div>
            </div>
            {!step.done && (
              <ArrowRight size={12} className="text-[var(--ink-4)] flex-shrink-0 group-hover:text-[var(--gold-deep)] group-hover:translate-x-0.5 transition-all" />
            )}
          </button>
        ))}
      </div>

      {/* CTA */}
      {nextStep && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onNavigate(nextStep.section)}
            className="w-full py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Zap size={13} className="text-[var(--gold)]" />
            Siguiente: {nextStep.label}
          </button>
        </div>
      )}
    </div>
  );
}
