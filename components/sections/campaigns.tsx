"use client";
import { useState } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { CAMPAIGNS, type Campaign, type DecisionKind } from "@/lib/data";
import { DecisionBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { eur, pct } from "@/lib/utils";
import { downloadCSV } from "@/lib/export";
import { TrendingUp, TrendingDown, Eye, X, ChevronRight, Zap, Download, Plus } from "lucide-react";

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
      <div className={`absolute h-full rounded transition-all ${ok ? "bg-[var(--success)]" : "bg-[var(--danger)]"}`} style={{ width: `${valPct}%`, opacity: 0.8 }} />
      <div className="absolute top-0 h-full w-[2px] bg-[var(--ink-2)]" style={{ left: `${bePct}%` }} />
    </div>
  );
}

interface CampaignState extends Campaign {
  budget: number;
  status: string;
  decision: DecisionKind;
}

export function Campaigns() {
  const { success, warning, info } = useToast();
  const [campaigns, setCampaigns] = useLocalStorage<CampaignState[]>("ecc-campaigns", []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [newModal, setNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("");

  const filters = [
    { id: "all",   label: "Todas" },
    { id: "scale", label: "Escalar" },
    { id: "watch", label: "Vigilar" },
    { id: "kill",  label: "Apagar" },
    { id: "data",  label: "Datos" },
  ];

  const visible = filter === "all" ? campaigns : campaigns.filter(c => c.decision === filter);
  const selected = campaigns.find(c => c.id === selectedId);

  const scale = (id: string) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, budget: Math.round(c.budget * 1.25), status: "Activa" } : c));
    const c = campaigns.find(c => c.id === id);
    success("Campaña escalada +25%", `Nuevo presupuesto: ${eur(Math.round((c?.budget ?? 0) * 1.25))}/día`);
  };

  const pause = (id: string) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: "Pausada", decision: "paused" as DecisionKind } : c));
    warning("Campaña pausada", "Puedes reactivarla cuando quieras.");
    setSelectedId(null);
  };

  const markReviewed = (id: string) => {
    info("Marcada como revisada", "Se registró la revisión en el log.");
    setSelectedId(null);
  };

  const applyAll = () => {
    let scaled = 0, paused = 0;
    setCampaigns(prev => prev.map(c => {
      if (c.decision === "scale") { scaled++; return { ...c, budget: Math.round(c.budget * 1.25) }; }
      if (c.decision === "kill")  { paused++; return { ...c, status: "Pausada", decision: "paused" as DecisionKind }; }
      return c;
    }));
    success("Decisiones aplicadas", `${scaled} escaladas · ${paused} pausadas`);
  };

  const exportCSV = () => {
    downloadCSV("campanas.csv", campaigns.map(c => ({
      nombre: c.name, tipo: c.type, pais: c.country,
      presupuesto: c.budget, gasto: c.spend, ingresos: c.revenue,
      roas: c.roas, cpa: c.cpa, ctr: c.ctr, compras: c.purchases,
      estado: c.status, decision: c.decision,
    })));
    success("CSV descargado", "campanas.csv guardado en tu carpeta de descargas.");
  };

  const createCampaign = () => {
    if (!newName.trim()) return;
    const id = `c${Date.now()}`;
    setCampaigns(prev => [...prev, {
      id, name: newName, product: "p1", objective: "Compras",
      type: "SBO", country: "🇲🇽 MX", budget: parseFloat(newBudget) || 15,
      started: "Hoy", status: "Activa",
      spend: 0, revenue: 0, roas: 0, cpa: 0, cpm: 0, cpc: 0,
      ctr: 0, hookRate: 0, holdRate: 0, atc: 0, ic: 0, purchases: 0, creatives: 0,
      decision: "data" as DecisionKind,
      diag: "Campaña recién creada. Espera datos antes de tomar decisiones.",
    }]);
    success("Campaña creada", newName);
    setNewName(""); setNewBudget(""); setNewModal(false);
  };

  const totalSpend   = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalRoas    = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const activeCamps  = campaigns.filter(c => c.status === "Activa").length;

  if (campaigns.length === 0 && !newModal) {
    return (
      <div className="space-y-5">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Meta Ads</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Campañas activas</h1>
        </div>
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-inset)] flex items-center justify-center">
            <TrendingUp size={22} className="text-[var(--ink-4)]" />
          </div>
          <div className="text-center">
            <h3 className="text-[15px] font-semibold text-[var(--ink-1)] mb-1">Sin campañas todavía</h3>
            <p className="text-[13px] text-[var(--ink-4)] max-w-xs">Añade tu primera campaña para empezar el tracking de decisiones de kill/scale.</p>
          </div>
          <button onClick={() => setNewModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black transition-colors flex items-center gap-2">
            <Plus size={14} /> Crear primera campaña
          </button>
        </div>
        <Modal open={newModal} onClose={() => setNewModal(false)} title="Nueva campaña">
          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Nombre de la campaña</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="PRODUCTO · OBJETIVO · TIPO"
                className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Presupuesto diario</label>
              <input value={newBudget} onChange={e => setNewBudget(e.target.value)} placeholder="15" type="number"
                className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={createCampaign} className="flex-1 py-2 rounded-lg bg-[var(--ink-1)] text-white text-[13px] font-medium hover:bg-black">Crear campaña</button>
              <button onClick={() => setNewModal(false)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--ink-3)] text-[13px] hover:bg-[var(--bg-inset)]">Cancelar</button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Meta Ads · {campaigns.length} campañas</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Campañas activas</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Semáforo de decisión por campaña. Clic para diagnóstico completo.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink-1)] shadow-sm hover:bg-[var(--bg-inset)] flex items-center gap-1.5">
            <Download size={12} /> Exportar CSV
          </button>
          <button onClick={applyAll} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black transition-colors flex items-center gap-1.5">
            <Zap size={12} /> Aplicar decisiones
          </button>
          <button onClick={() => setNewModal(true)} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)] flex items-center gap-1.5">
            <Plus size={12} /> Nueva
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Campañas activas", value: String(activeCamps), sub: `${campaigns.length} total` },
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

      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${filter === f.id ? "bg-[var(--ink-1)] text-white" : "bg-white border border-[var(--border)] text-[var(--ink-3)] hover:text-[var(--ink-1)]"}`}>
            {f.label}
            {f.id !== "all" && <span className="ml-1.5 opacity-60">{campaigns.filter(c => c.decision === f.id).length}</span>}
          </button>
        ))}
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0 bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-inset)]">
                {["", "Campaña", "Tipo", "Presup.", "Gasto", "ROAS", "CPA", "CTR", "Compras", "Decisión", ""].map((h, i) => (
                  <th key={i} className="text-left text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visible.map(c => {
                const isSelected = c.id === selectedId;
                return (
                  <tr key={c.id} onClick={() => setSelectedId(isSelected ? null : c.id)}
                    className={`cursor-pointer transition-colors ${isSelected ? "bg-[var(--gold-soft)]" : "hover:bg-[var(--bg-inset)]"}`}>
                    <td className="px-4 py-3"><div className={`w-2.5 h-2.5 rounded-full ${semaphoreColor(c.decision)}`} /></td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium text-[var(--ink-1)] max-w-[180px] truncate">{c.name}</div>
                      <div className="text-[11px] text-[var(--ink-4)]">{c.country} · {c.status}</div>
                    </td>
                    <td className="px-4 py-3"><span className="text-[11px] font-mono bg-[var(--bg-inset)] px-1.5 py-0.5 rounded text-[var(--ink-3)]">{c.type}</span></td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-2)]">{eur(c.budget)}/d</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-1)]">{eur(c.spend)}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-[13px] font-semibold text-[var(--ink-1)] mb-1">{c.roas.toFixed(2)}×</div>
                      <RoasBar value={c.roas} be={2.3} />
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-2)]">{eur(c.cpa)}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-2)]">{pct(c.ctr)}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-2)]">{c.purchases}</td>
                    <td className="px-4 py-3"><DecisionBadge kind={c.decision} /></td>
                    <td className="px-4 py-3"><ChevronRight size={14} className={`text-[var(--ink-4)] transition-transform ${isSelected ? "rotate-90" : ""}`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="w-[300px] flex-shrink-0 bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <div>
                <div className="text-[11px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-0.5">Diagnóstico</div>
                <div className="text-[13px] font-semibold text-[var(--ink-1)] leading-snug max-w-[200px]">{selected.name}</div>
              </div>
              <button onClick={() => setSelectedId(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-inset)] text-[var(--ink-4)]"><X size={14} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${semaphoreColor(selected.decision)}`} />
                <DecisionBadge kind={selected.decision} />
              </div>
              <div className="bg-[var(--bg-inset)] rounded-lg p-3 text-[12px] leading-relaxed text-[var(--ink-2)]">{selected.diag}</div>
              <div className="space-y-1.5">
                {([
                  { label: "Gasto",    value: eur(selected.spend) },
                  { label: "Ingresos", value: eur(selected.revenue) },
                  { label: "ROAS",     value: `${selected.roas.toFixed(2)}×`, ok: selected.roas >= 2.3 },
                  { label: "CPA",      value: eur(selected.cpa) },
                  { label: "CTR",      value: pct(selected.ctr), ok: selected.ctr >= 2 },
                  { label: "CPC",      value: eur(selected.cpc), ok: selected.cpc <= 0.6 },
                  { label: "Compras",  value: String(selected.purchases) },
                  { label: "Presup.",  value: `${eur(selected.budget)}/día` },
                ] as { label: string; value: string; ok?: boolean }[]).map(r => (
                  <div key={r.label} className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--ink-3)]">{r.label}</span>
                    <span className={`font-mono font-semibold ${r.ok === true ? "text-[var(--success)]" : r.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-[var(--border)] space-y-2">
                {selected.decision === "scale" && (
                  <button onClick={() => scale(selected.id)} className="w-full text-[12px] font-medium py-2 rounded-lg bg-[var(--success)] text-white flex items-center justify-center gap-1.5 hover:opacity-90">
                    <TrendingUp size={12} /> Escalar +25% presupuesto
                  </button>
                )}
                {(selected.decision === "kill" || selected.status === "Activa") && (
                  <button onClick={() => pause(selected.id)} className="w-full text-[12px] font-medium py-2 rounded-lg bg-[var(--danger)] text-white flex items-center justify-center gap-1.5 hover:opacity-90">
                    <TrendingDown size={12} /> Pausar campaña
                  </button>
                )}
                <button onClick={() => markReviewed(selected.id)} className="w-full text-[12px] font-medium py-2 rounded-lg border border-[var(--border)] text-[var(--ink-2)] flex items-center justify-center gap-1.5 hover:bg-[var(--bg-inset)]">
                  <Eye size={12} /> Marcar revisada
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={newModal} onClose={() => setNewModal(false)} title="Nueva campaña">
        <div className="space-y-4">
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Nombre de la campaña</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="PRODUCTO · OBJETIVO · TIPO"
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[rgba(200,169,106,0.15)]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Presupuesto diario (€)</label>
            <input value={newBudget} onChange={e => setNewBudget(e.target.value)} placeholder="15" type="number"
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[rgba(200,169,106,0.15)]" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={createCampaign} className="flex-1 py-2 rounded-lg bg-[var(--ink-1)] text-white text-[13px] font-medium hover:bg-black">Crear campaña</button>
            <button onClick={() => setNewModal(false)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--ink-3)] text-[13px] hover:bg-[var(--bg-inset)]">Cancelar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
