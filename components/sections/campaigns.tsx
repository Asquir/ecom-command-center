"use client";
import { useState } from "react";
import { CAMPAIGNS, type Campaign, type DecisionKind } from "@/lib/data";
import { DecisionBadge } from "@/components/ui/badge";
import { eur, pct } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, X, ChevronRight, AlertTriangle, Zap, Eye } from "lucide-react";

function semaphoreColor(d: DecisionKind) {
  if (d === "scale") return "bg-[var(--success)]";
  if (d === "kill")  return "bg-[var(--danger)]";
  if (d === "watch") return "bg-[var(--warning)]";
  return "bg-[var(--ink-4)]";
}

function RoasBar({ value, be }: { value: number; be: number }) {
  const max = Math.max(value, be, 4);
  const valPct = Math.min((value / max) * 100, 100);
  const bePct = Math.min((be / max) * 100, 100);
  const ok = value >= be;
  return (
    <div className="relative h-4 bg-[var(--bg-inset)] rounded overflow-hidden w-full min-w-[80px]">
      <div
        className={`absolute h-full rounded transition-all ${ok ? "bg-[var(--success)]" : "bg-[var(--danger)]"}`}
        style={{ width: `${valPct}%`, opacity: 0.8 }}
      />
      <div className="absolute top-0 h-full w-[2px] bg-[var(--ink-2)]" style={{ left: `${bePct}%` }} />
    </div>
  );
}

function DiagPanel({ c, onClose }: { c: Campaign; onClose: () => void }) {
  const beRoas = c.roas > 0 ? (c.revenue / c.spend) * 0.7 : 2.3;
  const rows = [
    { label: "Gasto total",  value: eur(c.spend) },
    { label: "Ingresos",     value: eur(c.revenue) },
    { label: "ROAS",         value: `${c.roas.toFixed(2)}×`, ok: c.roas >= beRoas },
    { label: "CPA",          value: eur(c.cpa) },
    { label: "CTR",          value: pct(c.ctr), ok: c.ctr >= 2 },
    { label: "CPC",          value: eur(c.cpc), ok: c.cpc <= 0.6 },
    { label: "CPM",          value: eur(c.cpm) },
    { label: "Hook rate",    value: pct(c.hookRate), ok: c.hookRate >= 35 },
    { label: "Hold rate",    value: pct(c.holdRate), ok: c.holdRate >= 25 },
    { label: "ATC",          value: String(c.atc) },
    { label: "Checkouts",    value: String(c.ic) },
    { label: "Compras",      value: String(c.purchases) },
  ];

  return (
    <div className="w-[300px] flex-shrink-0 bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <div>
          <div className="text-[11px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-0.5">Diagnóstico</div>
          <div className="text-[13px] font-semibold text-[var(--ink-1)] leading-snug max-w-[200px]">{c.name}</div>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-inset)] text-[var(--ink-4)]">
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${semaphoreColor(c.decision)}`} />
          <DecisionBadge kind={c.decision} />
        </div>

        <div className="bg-[var(--bg-inset)] rounded-lg p-3">
          <div className="text-[12px] leading-relaxed text-[var(--ink-2)]">{c.diag}</div>
        </div>

        <div className="space-y-1.5">
          {rows.map(r => (
            <div key={r.label} className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--ink-3)]">{r.label}</span>
              <span className={`font-mono font-semibold ${r.ok === true ? "text-[var(--success)]" : r.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>
                {r.value}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-[var(--border)] space-y-2">
          {c.decision === "scale" && (
            <button className="w-full text-[12px] font-medium py-2 rounded-lg bg-[var(--success)] text-white flex items-center justify-center gap-1.5">
              <TrendingUp size={12} /> Escalar +25% presupuesto
            </button>
          )}
          {c.decision === "kill" && (
            <button className="w-full text-[12px] font-medium py-2 rounded-lg bg-[var(--danger)] text-white flex items-center justify-center gap-1.5">
              <TrendingDown size={12} /> Pausar campaña
            </button>
          )}
          {(c.decision === "watch" || c.decision === "data") && (
            <button className="w-full text-[12px] font-medium py-2 rounded-lg border border-[var(--border)] text-[var(--ink-2)] flex items-center justify-center gap-1.5">
              <Eye size={12} /> Marcar revisada
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Campaigns() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const filters = [
    { id: "all",   label: "Todas" },
    { id: "scale", label: "Escalar" },
    { id: "watch", label: "Vigilar" },
    { id: "kill",  label: "Apagar" },
    { id: "data",  label: "Datos" },
  ];

  const visible = filter === "all" ? CAMPAIGNS : CAMPAIGNS.filter(c => c.decision === filter);
  const selected = CAMPAIGNS.find(c => c.id === selectedId);

  const totalSpend   = CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = CAMPAIGNS.reduce((s, c) => s + c.revenue, 0);
  const totalRoas    = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const activeCamps  = CAMPAIGNS.filter(c => c.status === "Activa").length;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Meta Ads · {CAMPAIGNS.length} campañas</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Campañas activas</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Semáforo de decisión por campaña. Clic para diagnóstico completo.</p>
        </div>
        <button className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black transition-colors flex items-center gap-1.5">
          <Zap size={12} /> Aplicar decisiones
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Campañas activas", value: String(activeCamps), sub: `${CAMPAIGNS.length} total` },
          { label: "Gasto total",      value: eur(totalSpend),     sub: "todas las campañas" },
          { label: "Ingresos total",   value: eur(totalRevenue),   sub: "atribuidos" },
          { label: "ROAS agregado",    value: `${totalRoas.toFixed(2)}×`, sub: "consolidado", ok: totalRoas >= 2.3 },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`font-mono font-bold text-[18px] ${s.ok === true ? "text-[var(--success)]" : s.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>{s.value}</div>
            <div className="text-[11px] text-[var(--ink-4)] mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
              filter === f.id
                ? "bg-[var(--ink-1)] text-white"
                : "bg-white border border-[var(--border)] text-[var(--ink-3)] hover:text-[var(--ink-1)]"
            }`}
          >
            {f.label}
            {f.id !== "all" && (
              <span className="ml-1.5 opacity-60">{CAMPAIGNS.filter(c => c.decision === f.id).length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-4 items-start">
        {/* Table */}
        <div className="flex-1 min-w-0 bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-inset)]">
                {["", "Campaña", "Tipo", "Presup.", "Gasto", "ROAS", "CPA", "CTR", "Compras", "Decisión", ""].map((h, i) => (
                  <th key={i} className="text-left text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider px-4 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visible.map(c => {
                const isSelected = c.id === selectedId;
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(isSelected ? null : c.id)}
                    className={`cursor-pointer transition-colors ${isSelected ? "bg-[var(--gold-soft)]" : "hover:bg-[var(--bg-inset)]"}`}
                  >
                    <td className="px-4 py-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${semaphoreColor(c.decision)}`} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium text-[var(--ink-1)] max-w-[180px] truncate">{c.name}</div>
                      <div className="text-[11px] text-[var(--ink-4)]">{c.country} · {c.status}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono bg-[var(--bg-inset)] px-1.5 py-0.5 rounded text-[var(--ink-3)]">{c.type}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-2)]">{eur(c.budget)}/d</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-1)]">{eur(c.spend)}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-[13px] font-semibold text-[var(--ink-1)] mb-1">{c.roas.toFixed(2)}×</div>
                      <RoasBar value={c.roas} be={2.3} />
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-2)]">{eur(c.cpa)}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-2)]">{pct(c.ctr)}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-2)]">{c.purchases}</td>
                    <td className="px-4 py-3">
                      <DecisionBadge kind={c.decision} />
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight size={14} className={`text-[var(--ink-4)] transition-transform ${isSelected ? "rotate-90" : ""}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Diagnosis panel */}
        {selected && <DiagPanel c={selected} onClose={() => setSelectedId(null)} />}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[11px] text-[var(--ink-3)]">
        {[
          { color: "bg-[var(--success)]", label: "Escalar" },
          { color: "bg-[var(--warning)]", label: "Vigilar" },
          { color: "bg-[var(--danger)]",  label: "Apagar" },
          { color: "bg-[var(--ink-4)]",   label: "Sin datos suficientes" },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${l.color}`} />
            {l.label}
          </span>
        ))}
        <span className="ml-2 flex items-center gap-1.5">
          <span className="inline-block w-3 h-[2px] bg-[var(--ink-2)]" /> BE ROAS (barra)
        </span>
      </div>
    </div>
  );
}
