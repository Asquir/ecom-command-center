"use client";
import { useState } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { CAMPAIGNS, type Campaign, type DecisionKind } from "@/lib/data";
import { DecisionBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { eur, pct, cx } from "@/lib/utils";
import { downloadCSV } from "@/lib/export";
import { TrendingUp, TrendingDown, Eye, X, ChevronRight, ChevronsUpDown, Zap, Download, Plus, CheckCircle, Trash2, Edit3 } from "lucide-react";

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

const SCALE_PHASES = [
  {
    phase: 1,
    title: "Verificación previa",
    icon: "🔍",
    steps: [
      "ROAS por encima del break-even 2 días seguidos (no solo 1)",
      "CPM no ha subido más del 15% en los últimos 3 días",
      "CTR estable o mejorando — ninguna caída abrupta",
      "Frecuencia del anuncio por debajo de 2.5 en la semana",
    ],
  },
  {
    phase: 2,
    title: "Escalar presupuesto +25%",
    icon: "📈",
    steps: [
      'Abre Meta Ads Manager → Conjuntos de anuncios → campaña ganadora',
      'Haz clic en "Editar" y sube el presupuesto diario exactamente un 25%',
      "No toques la audiencia, ubicaciones ni los anuncios activos",
      "Programa el cambio para las 00:00 (evita interrumpir el aprendizaje a mitad del día)",
    ],
  },
  {
    phase: 3,
    title: "Duplica el conjunto",
    icon: "⚡",
    steps: [
      "Duplica el conjunto ganador (clic derecho → Duplicar conjunto)",
      "Asígnale un presupuesto del 50% del conjunto original",
      "Mantén la misma audiencia — no cambies intereses ni lookalike",
      "Lanza inmediatamente junto al original para repartir la entrega",
    ],
  },
  {
    phase: 4,
    title: "Monitoreo 48 horas",
    icon: "⏱",
    steps: [
      "NO hagas ningún cambio durante las primeras 48 horas tras escalar",
      "Revisa cada 24h: si el ROAS cae más del 15% vs BE, pausa solo el duplicado",
      "Si ambos conjuntos van bien tras 48h, considera un segundo +25%",
      "Documenta el resultado en las notas del producto para futuros tests",
    ],
  },
];

interface CampaignState extends Campaign {
  budget: number;
  status: string;
  decision: DecisionKind;
}

function ScaleProtocolModal({ campaign, beRoas, onClose, onConfirm }: {
  campaign: CampaignState;
  beRoas: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [checked, setChecked] = useState<boolean[][]>(
    SCALE_PHASES.map(p => p.steps.map(() => false))
  );

  const phase = SCALE_PHASES[currentPhase];
  const allChecked = checked[currentPhase]?.every(Boolean);
  const isLast = currentPhase === SCALE_PHASES.length - 1;

  const toggle = (si: number) => {
    setChecked(prev => prev.map((arr, pi) =>
      pi === currentPhase ? arr.map((v, i) => i === si ? !v : v) : arr
    ));
  };

  return (
    <Modal open onClose={onClose} title="Protocolo de escala">
      <div className="space-y-5">
        {/* Campaign info */}
        <div className="bg-[var(--success-soft)] border border-[rgba(34,197,94,0.2)] rounded-xl p-3 flex items-center gap-3">
          <TrendingUp size={16} className="text-[var(--success)] flex-shrink-0" />
          <div>
            <div className="text-[12px] font-semibold text-[var(--ink-1)]">{campaign.name}</div>
            <div className="text-[11px] text-[var(--ink-3)]">
              ROAS actual: <strong className="text-[var(--success)]">{campaign.roas.toFixed(2)}×</strong> · BE: {beRoas > 0 ? `${beRoas.toFixed(2)}×` : "no configurado"}
            </div>
          </div>
        </div>

        {/* Phase progress */}
        <div className="flex gap-1.5">
          {SCALE_PHASES.map((p, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={cx("w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold border-2 transition-all",
                i < currentPhase ? "bg-[var(--success)] border-[var(--success)] text-white" :
                i === currentPhase ? "bg-[var(--ink-1)] border-[var(--ink-1)] text-white" :
                "bg-white border-[var(--border)] text-[var(--ink-4)]")}>
                {i < currentPhase ? <CheckCircle size={14} /> : i + 1}
              </div>
              <div className={cx("text-[9px] text-center leading-tight font-medium hidden sm:block",
                i === currentPhase ? "text-[var(--ink-1)]" : "text-[var(--ink-4)]")}>
                {p.title}
              </div>
            </div>
          ))}
        </div>

        {/* Phase connector line */}
        <div className="relative -mt-2 mb-2 hidden sm:block">
          <div className="h-px bg-[var(--border)] w-full" />
        </div>

        {/* Current phase */}
        <div className="bg-[var(--gold-soft)] border border-[rgba(200,169,106,0.3)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[18px]">{phase.icon}</span>
            <div className="text-[10px] font-semibold text-[var(--gold-deep)] uppercase tracking-wider">Fase {phase.phase} de {SCALE_PHASES.length}</div>
          </div>
          <div className="text-[15px] font-bold text-[var(--ink-1)]">{phase.title}</div>
        </div>

        <div className="space-y-2">
          {phase.steps.map((step, si) => (
            <button key={si} onClick={() => toggle(si)}
              className={cx("w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                checked[currentPhase][si]
                  ? "border-[var(--success)] bg-[var(--success-soft)]"
                  : "border-[var(--border)] bg-white hover:bg-[var(--bg-inset)]")}>
              <div className={cx("w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center",
                checked[currentPhase][si]
                  ? "border-[var(--success)] bg-[var(--success)] text-white"
                  : "border-[var(--border)]")}>
                {checked[currentPhase][si] && <CheckCircle size={12} />}
              </div>
              <div className={cx("text-[12px] leading-snug flex-1",
                checked[currentPhase][si] ? "text-[var(--success)] line-through opacity-70" : "text-[var(--ink-1)]")}>
                {step}
              </div>
            </button>
          ))}
        </div>

        {!allChecked && (
          <div className="text-[11px] text-[var(--ink-4)] text-center bg-[var(--bg-inset)] rounded-lg py-2">
            Marca todos los pasos para continuar a la siguiente fase
          </div>
        )}

        <div className="flex gap-2">
          {currentPhase > 0 && (
            <button onClick={() => setCurrentPhase(p => p - 1)}
              className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--ink-2)] text-[13px] hover:bg-[var(--bg-inset)]">
              ← Atrás
            </button>
          )}
          {isLast ? (
            <button onClick={onConfirm} disabled={!allChecked}
              className="flex-1 py-2.5 rounded-xl bg-[var(--success)] text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
              <TrendingUp size={14} /> Confirmar — escalar +25% en app
            </button>
          ) : (
            <button onClick={() => setCurrentPhase(p => p + 1)} disabled={!allChecked}
              className="flex-1 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black disabled:opacity-40">
              Siguiente fase →
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

interface MetricFields { spend: string; revenue: string; purchases: string; ctr: string; }

function MetricUpdateModal({ campaign, beRoas, beCpa, onClose, onSave }: {
  campaign: CampaignState; beRoas: number; beCpa: number;
  onClose: () => void; onSave: (data: Partial<CampaignState>) => void;
}) {
  const [f, setF] = useState<MetricFields>({
    spend:     campaign.spend > 0     ? String(campaign.spend)     : "",
    revenue:   campaign.revenue > 0   ? String(campaign.revenue)   : "",
    purchases: campaign.purchases > 0 ? String(campaign.purchases) : "",
    ctr:       campaign.ctr > 0       ? String(campaign.ctr)       : "",
  });
  const upd = (k: keyof MetricFields) => (v: string) => setF(p => ({ ...p, [k]: v }));
  const n = (v: string) => parseFloat(v) || 0;
  const spend = n(f.spend), revenue = n(f.revenue), purchases = n(f.purchases), ctr = n(f.ctr);
  const roas = spend > 0 ? revenue / spend : 0;
  const cpa  = purchases > 0 ? spend / purchases : 0;
  const cpc  = ctr > 0 && spend > 0 ? (spend / ((ctr / 100) * 1000)) : 0;

  function deriveDecision(): DecisionKind {
    if (spend === 0) return "data";
    if (beRoas > 0 && roas >= beRoas * 1.2) return "scale";
    if (beRoas > 0 && roas < beRoas * 0.65) return "kill";
    if (beCpa > 0 && cpa > beCpa * 1.8) return "kill";
    if (beRoas > 0 && roas >= beRoas) return "watch";
    return "data";
  }
  const decision = deriveDecision();
  const decisionColor = { scale: "text-[var(--success)]", kill: "text-[var(--danger)]", watch: "text-[var(--gold-deep)]", data: "text-[var(--ink-3)]", paused: "text-[var(--ink-4)]" };

  const inputCls = "w-full h-9 px-2.5 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)] font-mono bg-white";

  return (
    <Modal open onClose={onClose} title={`Métricas — ${campaign.name}`}>
      <div className="space-y-4">
        <div className="text-[11px] text-[var(--ink-3)] bg-[var(--bg-inset)] rounded-lg px-3 py-2">
          Copia los datos de Meta Ads Manager para esta campaña. La decisión kill/scale se actualizará automáticamente.
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([
            { k: "spend"     as const, label: "Gasto en ads",  suffix: "€" },
            { k: "revenue"   as const, label: "Ingresos",      suffix: "€" },
            { k: "purchases" as const, label: "Compras",       suffix: "" },
            { k: "ctr"       as const, label: "CTR",           suffix: "%" },
          ] as { k: keyof MetricFields; label: string; suffix: string }[]).map(({ k, label, suffix }) => (
            <div key={k}>
              <label className="text-[11px] font-semibold text-[var(--ink-3)] block mb-1">{label}</label>
              <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden focus-within:border-[var(--gold)]">
                <input value={f[k]} onChange={e => upd(k)(e.target.value)} type="number" min="0" step="0.01"
                  className="flex-1 h-9 px-2.5 text-[13px] font-mono outline-none bg-white" />
                {suffix && <span className="px-2 text-[11px] text-[var(--ink-4)] bg-[var(--bg-inset)] border-l border-[var(--border)] h-9 flex items-center">{suffix}</span>}
              </div>
            </div>
          ))}
        </div>
        {spend > 0 && (
          <div className="grid grid-cols-3 gap-2 p-3 bg-[var(--bg-inset)] rounded-xl">
            <div>
              <div className="text-[9px] text-[var(--ink-4)] uppercase tracking-wide mb-0.5">ROAS</div>
              <div className={`font-mono font-bold text-[15px] ${beRoas > 0 ? (roas >= beRoas ? "text-[var(--success)]" : "text-[var(--danger)]") : "text-[var(--ink-1)]"}`}>{roas.toFixed(2)}×</div>
            </div>
            <div>
              <div className="text-[9px] text-[var(--ink-4)] uppercase tracking-wide mb-0.5">CPA</div>
              <div className={`font-mono font-bold text-[15px] ${beCpa > 0 ? (cpa <= beCpa ? "text-[var(--success)]" : "text-[var(--danger)]") : "text-[var(--ink-1)]"}`}>{purchases > 0 ? `€${cpa.toFixed(2)}` : "—"}</div>
            </div>
            <div>
              <div className="text-[9px] text-[var(--ink-4)] uppercase tracking-wide mb-0.5">Decisión</div>
              <div className={`font-bold text-[12px] uppercase ${decisionColor[decision]}`}>{decision}</div>
            </div>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={() => {
            onSave({
              spend, revenue, purchases, roas, cpa, ctr, cpc,
              decision,
              diag: spend > 0 ? `ROAS ${roas.toFixed(2)}× · CPA €${cpa.toFixed(2)} · CTR ${ctr.toFixed(1)}%` : campaign.diag,
            });
          }} disabled={!spend}
            className="flex-1 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black disabled:opacity-40 flex items-center justify-center gap-2">
            Guardar métricas
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--ink-3)] text-[13px] hover:bg-[var(--bg-inset)]">Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}

export function Campaigns() {
  const { settings } = useSettings();
  const { success, warning, info } = useToast();
  const [campaigns, setCampaigns] = useLocalStorage<CampaignState[]>("ecc-campaigns", []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [metricsModal, setMetricsModal] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [newModal, setNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [scaleProtocol, setScaleProtocol] = useState<CampaignState | null>(null);
  const [sortField, setSortField] = useState<"roas" | "spend" | "cpa" | "ctr" | "purchases">("roas");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const beRoas = settings.beRoas || 0;

  const filters = [
    { id: "all",   label: "Todas" },
    { id: "scale", label: "Escalar" },
    { id: "watch", label: "Vigilar" },
    { id: "kill",  label: "Apagar" },
    { id: "data",  label: "Datos" },
  ];

  const visible = filter === "all" ? campaigns : campaigns.filter(c => c.decision === filter);

  const toggleSort = (field: "roas" | "spend" | "cpa" | "ctr" | "purchases") => {
    if (sortField === field) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const sortedVisible = [...visible].sort((a, b) => {
    const dir = sortDir === "desc" ? -1 : 1;
    return (a[sortField] - b[sortField]) * dir;
  });

  const selected = campaigns.find(c => c.id === selectedId);

  const doScale = (id: string) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, budget: Math.round(c.budget * 1.25), status: "Activa" } : c));
    const c = campaigns.find(c => c.id === id);
    success("Campaña escalada +25%", `Nuevo presupuesto: ${eur(Math.round((c?.budget ?? 0) * 1.25))}/día. Sigue el protocolo en Meta Ads Manager.`);
    setScaleProtocol(null);
    setSelectedId(null);
  };

  const openScaleProtocol = (campaign: CampaignState) => {
    setScaleProtocol(campaign);
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

  const saveMetrics = (id: string, data: Partial<CampaignState>) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    success("Métricas actualizadas", data.roas != null ? `ROAS ${data.roas.toFixed(2)}× · CPA ${data.cpa != null && data.cpa > 0 ? eur(data.cpa) : "—"}` : "");
    setMetricsModal(null);
  };

  const deleteCampaign = (id: string) => {
    const c = campaigns.find(x => x.id === id);
    if (!confirm(`¿Eliminar la campaña "${c?.name}"? Esta acción no se puede deshacer.`)) return;
    setCampaigns(prev => prev.filter(x => x.id !== id));
    warning("Campaña eliminada", c?.name);
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

  const countryFlag: Record<string, string> = { MX: "🇲🇽 MX", ES: "🇪🇸 ES", US: "🇺🇸 US" };

  const createCampaign = () => {
    if (!newName.trim()) return;
    const id = `c${Date.now()}`;
    const flag = countryFlag[settings.country] ?? "🌍";
    const autoName = newName || (settings.productName ? `${settings.productName} · Compras` : "Nueva campaña");
    setCampaigns(prev => [...prev, {
      id, name: autoName, product: "p1", objective: "Compras",
      type: "SBO", country: flag, budget: parseFloat(newBudget) || 15,
      started: new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short" }), status: "Activa",
      spend: 0, revenue: 0, roas: 0, cpa: 0, cpm: 0, cpc: 0,
      ctr: 0, hookRate: 0, holdRate: 0, atc: 0, ic: 0, purchases: 0, creatives: 0,
      decision: "data" as DecisionKind,
      diag: "Campaña recién creada. Añade las métricas de Meta Ads Manager para ver la decisión.",
    }]);
    success("Campaña creada", autoName);
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
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Rendimiento <strong>acumulado</strong> por campaña. Actualiza cuando quieras — no hace falta hacerlo a diario.</p>
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

      {/* Context banner */}
      <div className="flex items-start gap-3 p-3 bg-[var(--bg-inset)] border border-[var(--border)] rounded-xl text-[12px] text-[var(--ink-3)]">
        <span className="text-[15px] leading-none mt-0.5">💡</span>
        <div>
          <strong className="text-[var(--ink-1)]">Aquí va el rendimiento acumulado de cada campaña</strong> — no los datos de hoy.
          Los totales del día van en el <strong className="text-[var(--ink-1)]">Dashboard</strong>. Aquí puedes registrar cuánto gastaste en cada campaña desde que la lanzaste, para ver cuál vale más.
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Campañas activas", value: String(activeCamps), sub: `${campaigns.length} total` },
          { label: "Gasto total",      value: eur(totalSpend),     sub: "todas las campañas" },
          { label: "Ingresos total",   value: eur(totalRevenue),   sub: "atribuidos" },
          { label: "ROAS agregado",    value: `${totalRoas.toFixed(2)}×`, sub: "consolidado", ok: beRoas > 0 ? totalRoas >= beRoas : undefined },
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

      {/* Mobile: campaign cards */}
      <div className="lg:hidden space-y-3">
        {sortedVisible.map(c => {
          const isSelected = c.id === selectedId;
          return (
            <div key={c.id} className={cx("bg-white border rounded-xl shadow-sm overflow-hidden transition-all", isSelected ? "border-[var(--gold)]" : "border-[var(--border)]")}>
              <button onClick={() => setSelectedId(isSelected ? null : c.id)} className="w-full text-left p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${semaphoreColor(c.decision)}`} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[var(--ink-1)] truncate">{c.name}</div>
                      <div className="text-[11px] text-[var(--ink-4)]">{c.country} · {c.status} · {eur(c.budget)}/d</div>
                    </div>
                  </div>
                  <DecisionBadge kind={c.decision} />
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {([
                    { label: "ROAS", value: `${c.roas.toFixed(2)}×`, ok: beRoas > 0 ? c.roas >= beRoas : undefined },
                    { label: "CPA",  value: eur(c.cpa) },
                    { label: "CTR",  value: pct(c.ctr) },
                    { label: "Gasto",value: eur(c.spend) },
                  ] as { label: string; value: string; ok?: boolean }[]).map(m => (
                    <div key={m.label}>
                      <div className="text-[9px] font-semibold text-[var(--ink-4)] uppercase tracking-wide mb-0.5">{m.label}</div>
                      <div className={cx("font-mono font-bold text-[12px]", m.ok === true ? "text-[var(--success)]" : m.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]")}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <RoasBar value={c.roas} be={beRoas || 2.3} />
              </button>
              {isSelected && (
                <div className="border-t border-[var(--border)] p-4 bg-[var(--bg-inset)] space-y-3">
                  <div className="text-[12px] text-[var(--ink-2)] bg-white border border-[var(--border)] rounded-lg p-3 leading-relaxed">{c.diag}</div>
                  <button onClick={() => setMetricsModal(c.id)}
                    className="w-full text-[12px] font-medium py-2 rounded-lg border border-[var(--gold)] text-[var(--gold-deep)] bg-[var(--gold-soft)] flex items-center justify-center gap-1.5">
                    <Edit3 size={12} /> Actualizar métricas
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {c.decision === "scale" && (
                      <button onClick={() => openScaleProtocol(c)}
                        className="flex-1 min-w-[140px] text-[12px] font-medium py-2 rounded-lg bg-[var(--success)] text-white flex items-center justify-center gap-1.5">
                        <TrendingUp size={12} /> Protocolo escala
                      </button>
                    )}
                    {(c.decision === "kill" || c.status === "Activa") && (
                      <button onClick={() => pause(c.id)}
                        className="flex-1 min-w-[120px] text-[12px] font-medium py-2 rounded-lg bg-[var(--danger)] text-white flex items-center justify-center gap-1.5">
                        <TrendingDown size={12} /> Pausar
                      </button>
                    )}
                    <button onClick={() => deleteCampaign(c.id)}
                      className="text-[12px] font-medium py-2 px-3 rounded-lg border border-[var(--border)] text-[var(--danger)] flex items-center gap-1.5">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: table + side panel */}
      <div className="hidden lg:flex gap-4 items-start">
        <div className="flex-1 min-w-0 bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-inset)]">
                <th className="text-left text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider px-4 py-2.5" />
                <th className="text-left text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider px-4 py-2.5">Campaña</th>
                <th className="text-left text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider px-4 py-2.5">Tipo</th>
                <th className="text-left text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider px-4 py-2.5">Presup.</th>
                {(["spend", "roas", "cpa", "ctr", "purchases"] as const).map(field => (
                  <th key={field} onClick={() => toggleSort(field)}
                    className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5 cursor-pointer select-none hover:text-[var(--ink-2)] text-[var(--ink-4)]">
                    <div className="flex items-center gap-1">
                      {field === "spend" ? "Gasto" : field === "roas" ? "ROAS" : field === "cpa" ? "CPA" : field === "ctr" ? "CTR" : "Compras"}
                      <ChevronsUpDown size={9} className={sortField === field ? "text-[var(--gold-deep)]" : "opacity-30"} />
                    </div>
                  </th>
                ))}
                <th className="text-left text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider px-4 py-2.5">Decisión</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sortedVisible.map(c => {
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
                      <RoasBar value={c.roas} be={beRoas || 2.3} />
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-2)]">{eur(c.cpa)}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-2)]">{pct(c.ctr)}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-2)]">{c.purchases}</td>
                    <td className="px-4 py-3"><DecisionBadge kind={c.decision} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); deleteCampaign(c.id); }}
                          className="text-[var(--ink-4)] hover:text-[var(--danger)] transition-colors" title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                        <ChevronRight size={14} className={`text-[var(--ink-4)] transition-transform ${isSelected ? "rotate-90" : ""}`} />
                      </div>
                    </td>
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
                  { label: "ROAS",     value: `${selected.roas.toFixed(2)}×`, ok: beRoas > 0 ? selected.roas >= beRoas : undefined },
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
                <button onClick={() => setMetricsModal(selected.id)}
                  className="w-full text-[12px] font-medium py-2 rounded-lg border border-[var(--gold)] text-[var(--gold-deep)] bg-[var(--gold-soft)] flex items-center justify-center gap-1.5 hover:bg-[rgba(200,169,106,0.2)]">
                  <Edit3 size={12} /> Actualizar métricas
                </button>
                {selected.decision === "scale" && (
                  <button onClick={() => openScaleProtocol(selected)}
                    className="w-full text-[12px] font-medium py-2 rounded-lg bg-[var(--success)] text-white flex items-center justify-center gap-1.5 hover:opacity-90">
                    <TrendingUp size={12} /> Protocolo de escala →
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
                <button onClick={() => deleteCampaign(selected.id)} className="w-full text-[12px] font-medium py-2 rounded-lg border border-[var(--border)] text-[var(--danger)] flex items-center justify-center gap-1.5 hover:bg-[var(--danger-soft)]">
                  <Trash2 size={12} /> Eliminar campaña
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

      {scaleProtocol && (
        <ScaleProtocolModal
          campaign={scaleProtocol}
          beRoas={beRoas}
          onClose={() => setScaleProtocol(null)}
          onConfirm={() => doScale(scaleProtocol.id)}
        />
      )}

      {metricsModal && (() => {
        const c = campaigns.find(x => x.id === metricsModal);
        if (!c) return null;
        return (
          <MetricUpdateModal
            campaign={c}
            beRoas={beRoas}
            beCpa={settings.beCpa || 0}
            onClose={() => setMetricsModal(null)}
            onSave={data => saveMetrics(c.id, data)}
          />
        );
      })()}
    </div>
  );
}
