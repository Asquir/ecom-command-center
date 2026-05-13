"use client";
import { cx } from "@/lib/utils";
import type { DecisionKind } from "@/lib/data";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral" | "gold";

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-[#E7F6EC] text-[#16A34A] border-[rgba(22,163,74,0.2)]",
  warning: "bg-[#FDF3DE] text-[#A8660A] border-[rgba(245,158,11,0.2)]",
  danger:  "bg-[#FBE5E5] text-[#B91C1C] border-[rgba(220,38,38,0.2)]",
  info:    "bg-[#E1ECFE] text-[#1D4ED8] border-[rgba(37,99,235,0.2)]",
  neutral: "bg-[#EEEEE9] text-[#4B4B44] border-[var(--border)]",
  gold:    "bg-[#F5EFE0] text-[#A8884A] border-[rgba(200,169,106,0.3)]",
};

export function Badge({ variant = "neutral", children, className }: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cx(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
      variantStyles[variant],
      className
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

const decisionMap: Record<DecisionKind, { variant: BadgeVariant; label: string }> = {
  scale:  { variant: "success", label: "Escalar" },
  watch:  { variant: "warning", label: "Vigilar" },
  kill:   { variant: "danger",  label: "Apagar" },
  data:   { variant: "info",    label: "Más datos" },
  paused: { variant: "neutral", label: "Pausado" },
};

export function DecisionBadge({ kind, children }: { kind: DecisionKind; children?: React.ReactNode }) {
  const { variant, label } = decisionMap[kind];
  return <Badge variant={variant}>{children ?? label}</Badge>;
}
