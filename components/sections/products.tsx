"use client";
import { useState } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { type Product, type ProductStatus, type Creative, type Campaign } from "@/lib/data";
import { DecisionBadge, Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { KpiCard } from "@/components/ui/kpi-card";
import { useToast } from "@/components/ui/toast";
import { eur, pct, cx } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { ChevronRight, Copy, ExternalLink, Zap, ArrowLeft, Save, CheckCircle, Package, AlertTriangle, BookOpen, Trash2, TrendingUp } from "lucide-react";

interface Autopsy {
  productId: string;
  productName: string;
  date: string;
  totalSpend: number;
  worked: string;
  didntWork: string;
  killReason: string;
  learnings: string;
}

const STATUS_BADGE: Record<ProductStatus, { variant: "success" | "warning" | "danger" | "info" | "neutral" | "gold"; label: string }> = {
  testing:   { variant: "info",    label: "En testing"       },
  validated: { variant: "success", label: "Validado"         },
  paused:    { variant: "neutral", label: "Pausado"          },
  dead:      { variant: "danger",  label: "Muerto"           },
  research:  { variant: "gold",    label: "En investigación" },
  webprep:   { variant: "warning", label: "Preparando web"   },
};

const TONE_BG: Record<string, [string, string]> = {
  neutral: ["#1a1a1a", "#3a3a3a"],
  gold:    ["#5a4827", "#c8a96a"],
  blue:    ["#1f3a6b", "#3a6db5"],
  green:   ["#1a4a2b", "#2f7a4a"],
  rose:    ["#5a2b2b", "#9c4646"],
};

function ProductThumb({ tone, label, w = 56, h = 72 }: { tone: string; label: string; w?: number; h?: number }) {
  const [a, b] = TONE_BG[tone] ?? TONE_BG.neutral;
  return (
    <div
      className="relative rounded-lg overflow-hidden flex-shrink-0"
      style={{ width: w, height: h, background: `repeating-linear-gradient(135deg, ${a} 0 12px, ${b} 12px 14px)` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
      <div className="absolute bottom-1.5 left-1.5 right-1.5 text-[8px] text-white font-mono uppercase tracking-wide leading-tight">{label}</div>
    </div>
  );
}

function ProductCard({ p, onOpen }: { p: Product; onOpen: () => void }) {
  const s = STATUS_BADGE[p.status];
  return (
    <div onClick={onOpen} className="bg-white border border-[var(--border)] rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow flex flex-col">
      <div className="flex gap-3.5 p-4">
        <ProductThumb tone={p.tone} label={p.name.split(" ")[0]} w={56} h={72} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant={s.variant}>{s.label}</Badge>
            <span className="text-[11px] text-[var(--ink-4)]">{p.country}</span>
          </div>
          <div className="font-semibold text-[14px] text-[var(--ink-1)] leading-snug mb-1">{p.name}</div>
          <div className="text-[11px] text-[var(--ink-3)]">{p.niche} · inicio {p.started}</div>
        </div>
        <ScoreRing value={p.score} size={56} />
      </div>
      <div className="px-4 pb-3 pt-0 border-t border-[var(--border-soft)] mt-0 grid grid-cols-3 gap-2">
        {[
          { l: "ROAS", v: p.roas ? `${p.roas.toFixed(2)}×` : "—", ok: p.roas ? p.roas >= p.breRoas : null },
          { l: "Gasto", v: p.spend ? eur(p.spend, 0) : "—", ok: null },
          { l: "Beneficio", v: p.profit !== 0 ? eur(p.profit, 0) : "—", ok: p.profit !== 0 ? p.profit > 0 : null },
        ].map(({ l, v, ok }) => (
          <div key={l} className="pt-2.5">
            <div className="text-[9px] font-semibold text-[var(--ink-4)] uppercase tracking-wide mb-0.5">{l}</div>
            <div className={cx("font-mono font-semibold text-[13px]", ok === true ? "text-[var(--success)]" : ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]")}>{v}</div>
          </div>
        ))}
      </div>
      <div className="mx-3.5 mb-3.5 bg-[var(--bg-inset)] border border-dashed border-[var(--border-strong)] rounded-lg px-3 py-2">
        <div className="text-[9px] font-semibold text-[var(--ink-4)] uppercase tracking-wide mb-0.5">Diagnóstico</div>
        <div className="text-[12px] text-[var(--ink-2)]">{p.diagnosis}</div>
      </div>
    </div>
  );
}

const AUTOPSY_QUESTIONS = [
  { key: "worked",     label: "¿Qué funcionó?",                    hint: "Creativos, ángulos, audiencias, precio, oferta que generó interés..." },
  { key: "didntWork",  label: "¿Qué no funcionó y por qué?",       hint: "Coste del producto, fricción en checkout, targeting equivocado..." },
  { key: "killReason", label: "¿Razón principal de muerte?",       hint: "ROAS insostenible, problema con el proveedor, saturación de mercado..." },
  { key: "learnings",  label: "¿Qué aprendizaje llevas al siguiente?", hint: "El insight más valioso que aplicarás directamente en el próximo producto" },
];

function AutopsyModal({ product, onClose, onSave }: {
  product: Product;
  onClose: () => void;
  onSave: (a: Autopsy) => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({
    worked: "", didntWork: "", killReason: "", learnings: "",
  });

  const q = AUTOPSY_QUESTIONS[step];
  const isLast = step === AUTOPSY_QUESTIONS.length - 1;
  const current = answers[q.key] ?? "";

  const save = () => {
    onSave({
      productId: product.id,
      productName: product.name,
      date: new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }),
      totalSpend: product.spend,
      worked: answers.worked,
      didntWork: answers.didntWork,
      killReason: answers.killReason,
      learnings: answers.learnings,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--danger)] px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-white/80" />
            <div className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">Autopsia de producto</div>
          </div>
          <div className="text-[17px] font-bold text-white">{product.name}</div>
          <div className="text-[12px] text-white/70 mt-0.5">
            {product.spend > 0 ? `Gasto total: ${eur(product.spend)}` : "Sin gasto registrado"} · {new Date().toLocaleDateString("es-MX")}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 px-5 pt-4">
          {AUTOPSY_QUESTIONS.map((_, i) => (
            <div key={i} className={cx("h-1.5 flex-1 rounded-full transition-all",
              i < step ? "bg-[var(--danger)]" :
              i === step ? "bg-[rgba(239,68,68,0.5)]" :
              "bg-[var(--bg-inset)]")} />
          ))}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-2">
              Pregunta {step + 1} de {AUTOPSY_QUESTIONS.length}
            </div>
            <div className="text-[16px] font-bold text-[var(--ink-1)] leading-snug">{q.label}</div>
          </div>

          <textarea
            value={current}
            onChange={e => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
            rows={4}
            placeholder={q.hint}
            autoFocus
            className="w-full px-3 py-2.5 text-[13px] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--danger)] focus:ring-2 focus:ring-[rgba(239,68,68,0.15)] resize-none leading-relaxed"
          />

          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--ink-2)] text-[13px] hover:bg-[var(--bg-inset)]">
                ← Atrás
              </button>
            )}
            <button
              onClick={() => isLast ? save() : setStep(s => s + 1)}
              disabled={!current.trim()}
              className={cx("flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                isLast
                  ? "bg-[var(--danger)] text-white hover:opacity-90"
                  : "bg-[var(--ink-1)] text-white hover:bg-black")}>
              {isLast ? "Guardar autopsia" : "Siguiente →"}
            </button>
          </div>

          <button onClick={onClose}
            className="w-full text-center text-[11px] text-[var(--ink-4)] hover:text-[var(--ink-2)] transition-colors py-1">
            Saltar autopsia (no recomendado — pierdes el aprendizaje)
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductDetail({ p: initialP, onBack, onStatusChange, onDelete }: {
  p: Product;
  onBack: () => void;
  onStatusChange: (id: string, status: ProductStatus) => void;
  onDelete: (id: string) => void;
}) {
  const { success, info } = useToast();
  const [p, setP] = useState(initialP);
  const [tab, setTab] = useState("summary");
  const [notes, setNotes] = useState(p.notes ?? "");
  const [notesSaved, setNotesSaved] = useState(false);
  const [showAutopsy, setShowAutopsy] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ProductStatus | null>(null);
  const [autopsies, setAutopsies] = useLocalStorage<Autopsy[]>("ecc-autopsies", []);

  const [allCampaigns] = useLocalStorage<Campaign[]>("ecc-campaigns", []);
  const [allCreatives] = useLocalStorage<Creative[]>("ecc-creatives", []);
  const productCampaigns = allCampaigns.filter(c => c.product === p.id);
  const productCreatives = allCreatives;
  const s = STATUS_BADGE[p.status];
  const existingAutopsy = autopsies.find(a => a.productId === p.id);

  const hasMetrics = p.spend > 0 || p.revenue > 0 || p.sales > 0;
  const baseTabs = ["summary","métricas","creativos","rentabilidad","proveedor","notas"];
  const allTabs = existingAutopsy ? [...baseTabs, "autopsia"] : baseTabs;
  const TABS = allTabs.map(k => ({ id: k, label: k.charAt(0).toUpperCase() + k.slice(1) }));

  const applyStatusChange = (newStatus: ProductStatus) => {
    setP(prev => ({ ...prev, status: newStatus, statusLabel: STATUS_BADGE[newStatus].label }));
    onStatusChange(p.id, newStatus);
    success("Estado actualizado", `${p.name} → ${STATUS_BADGE[newStatus].label}`);
  };

  const changeStatus = (newStatus: ProductStatus) => {
    if (newStatus === "dead") {
      setPendingStatus(newStatus);
      setShowAutopsy(true);
    } else {
      applyStatusChange(newStatus);
    }
  };

  const handleAutopsySave = (autopsy: Autopsy) => {
    setAutopsies(prev => [...prev.filter(a => a.productId !== autopsy.productId), autopsy]);
    if (pendingStatus) {
      applyStatusChange(pendingStatus);
      setPendingStatus(null);
    }
    setShowAutopsy(false);
    setTab("autopsia");
    success("Autopsia guardada", "Los aprendizajes están registrados. Aplícalos en tu próximo producto.");
  };

  const handleAutopsySkip = () => {
    setShowAutopsy(false);
    if (pendingStatus) {
      applyStatusChange(pendingStatus);
      setPendingStatus(null);
    }
  };

  const saveNotes = () => {
    setNotesSaved(true);
    success("Notas guardadas", p.name);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      {showAutopsy && (
        <AutopsyModal
          product={p}
          onClose={handleAutopsySkip}
          onSave={handleAutopsySave}
        />
      )}

      <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors">
        <ArrowLeft size={13} /> Volver a Productos
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex gap-4 items-center">
          <ProductThumb tone={p.tone} label={p.name.split(" ")[0]} w={72} h={96} />
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant={s.variant}>{s.label}</Badge>
              <span className="text-[12px] text-[var(--ink-3)]">{p.country} · {p.niche} · inicio {p.started}</span>
              <select value={p.status} onChange={e => changeStatus(e.target.value as ProductStatus)}
                className="h-7 px-2 text-[11px] font-medium border border-[var(--border)] rounded-lg bg-white outline-none focus:border-[var(--gold)] cursor-pointer">
                {(Object.keys(STATUS_BADGE) as ProductStatus[]).map(st => (
                  <option key={st} value={st}>{STATUS_BADGE[st].label}</option>
                ))}
              </select>
            </div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">{p.name}</h1>
            <p className="text-[13px] text-[var(--ink-3)] mt-1">{p.diagnosis}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { info("Duplicar test", "Crea un nuevo producto basado en este configuración."); }} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)]"><Copy size={13}/> Duplicar test</button>
          <button onClick={() => window.open("https://admin.shopify.com", "_blank")} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)]"><ExternalLink size={13}/> Ver en Shopify</button>
          <button onClick={() => { success("Recomendación aplicada", p.diagnosis); setTab("notas"); }} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black"><Zap size={13}/> Aplicar recomendación</button>
          <button onClick={() => { if (confirm(`¿Eliminar definitivamente "${p.name}"? Esta acción no se puede deshacer.`)) { onDelete(p.id); onBack(); } }}
            title="Eliminar producto" className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"><Trash2 size={13}/> Eliminar</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-[var(--border)] overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cx("px-3.5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1.5",
              tab === t.id ? "text-[var(--ink-1)] border-[var(--ink-1)] font-semibold" : "text-[var(--ink-3)] border-transparent hover:text-[var(--ink-1)]"
            )}>
            {t.id === "autopsia" && <BookOpen size={12} className="text-[var(--danger)]" />}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Gasto total" value={eur(p.spend)} note={`${productCampaigns.length} campañas · ${productCreatives.length} creativos`} />
            <KpiCard label="Ingresos" value={eur(p.revenue)} />
            <KpiCard label="ROAS" value={p.roas ? `${p.roas.toFixed(2)}×` : "—"} note={`BE ${p.breRoas.toFixed(2)}×`} color={p.roas >= p.breRoas ? "success" : "danger"} />
            <KpiCard label="Beneficio" value={eur(p.profit)} color={p.profit >= 0 ? "success" : "danger"} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-[var(--border)] rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[16px] text-[var(--ink-1)]">Recomendación del sistema</h2>
                <DecisionBadge kind={p.score >= 70 ? "scale" : p.score >= 45 ? "watch" : "kill"} />
              </div>
              <p className="text-[14px] text-[var(--ink-1)] leading-relaxed">
                {p.score >= 70
                  ? "El producto ya tiene tracción consistente. Mantén activos los creativos rentables, escala +25% el conjunto ganador y prepara 3 variaciones del ángulo principal."
                  : p.score >= 45
                    ? "Buen interés inicial pero faltan datos. Espera 50–70 clics por creativo antes de actuar. No apagues por miedo."
                    : "Margen ajustado y conversión débil. Revisa oferta, packs y carrito. Si tras 0.5× BE CPA sigue sin ATC, apaga."}
              </p>
              <div className="h-px bg-[var(--border)] my-4" />
              <div className="grid grid-cols-2 gap-2">
                {[
                  { ok: true,  t: "Pixel + CAPI funcionando" },
                  { ok: true,  t: "Bundles activos" },
                  { ok: false, t: "Reviews ≥ 25" },
                  { ok: false, t: "UGC con afiliada" },
                  { ok: true,  t: "Tracking proveedor OK" },
                  { ok: true,  t: "Métodos de pago locales" },
                ].map(({ ok, t }) => (
                  <div key={t} className="flex items-center gap-2">
                    <div className={cx("w-4 h-4 rounded flex items-center justify-center text-[10px]", ok ? "bg-[var(--success)] text-white" : "bg-[var(--bg-inset)] border border-[var(--border-strong)]")}>{ok ? "✓" : ""}</div>
                    <span className={cx("text-[12px]", ok ? "text-[var(--ink-1)]" : "text-[var(--ink-3)]")}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <div className="font-semibold text-[13px] text-[var(--ink-1)]">Score · {p.score}/100</div>
              </div>
              <div className="p-4 flex flex-col items-center gap-4">
                <ScoreRing value={p.score} size={100} />
                <div className="w-full space-y-2">
                  {[
                    { l: "CTR creativos", v: Math.min(100, p.score + 10) },
                    { l: "CPC promedio",  v: Math.max(20, p.score - 5) },
                    { l: "ATC rate",      v: Math.min(100, p.score) },
                    { l: "Checkout rate", v: Math.max(10, p.score - 20) },
                  ].map(({ l, v }) => (
                    <div key={l}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[var(--ink-3)]">{l}</span>
                        <span className="font-mono text-[var(--ink-1)]">{Math.round(v)}</span>
                      </div>
                      <div className="h-1.5 bg-[var(--bg-inset)] rounded-full overflow-hidden">
                        <div className={cx("h-full rounded-full", v >= 70 ? "bg-[var(--success)]" : v >= 45 ? "bg-[var(--warning)]" : "bg-[var(--danger)]")} style={{ width: `${v}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "métricas" && (
        hasMetrics ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Gasto"     value={eur(p.spend)} />
              <KpiCard label="Ingresos"  value={eur(p.revenue)} />
              <KpiCard label="ROAS"      value={p.roas ? `${p.roas.toFixed(2)}×` : "—"} color={p.roas >= p.breRoas ? "success" : "danger"} />
              <KpiCard label="Ventas"    value={String(p.sales)} />
            </div>
            <div className="bg-[var(--bg-inset)] border border-dashed border-[var(--border-strong)] rounded-xl p-6 text-center text-[12px] text-[var(--ink-3)]">
              <TrendingUp size={20} className="mx-auto mb-2 text-[var(--ink-4)]" />
              <div className="text-[13px] text-[var(--ink-2)] font-medium mb-1">Métricas reales del producto</div>
              <div>Las gráficas diarias detalladas se generarán cuando registres entradas diarias en el <strong className="text-[var(--ink-1)]">Dashboard</strong>. Conecta también tus campañas en la pestaña Campañas para enlazar el rendimiento.</div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm flex flex-col items-center justify-center py-14 gap-3">
            <TrendingUp size={28} className="text-[var(--ink-4)]" />
            <div className="text-[14px] font-semibold text-[var(--ink-1)]">Sin métricas todavía</div>
            <div className="text-[12px] text-[var(--ink-4)] text-center max-w-md leading-relaxed">
              Este producto aún no tiene gasto ni ventas registradas. Las métricas reales aparecerán automáticamente cuando empieces a registrar datos diarios en el Dashboard y conectes campañas.
            </div>
          </div>
        )
      )}

      {tab === "creativos" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {productCreatives.length === 0
            ? <div className="col-span-full bg-[var(--bg-inset)] border border-dashed border-[var(--border-strong)] rounded-xl p-10 text-center text-[var(--ink-3)] text-[13px]">Aún no hay creativos para este producto.</div>
            : productCreatives.map(c => (
              <div key={c.id} className="bg-white border border-[var(--border)] rounded-xl p-3.5 shadow-sm flex gap-3">
                <div className="relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: `repeating-linear-gradient(135deg, ${TONE_BG[c.tone]?.[0] ?? "#1a1a1a"} 0 12px, ${TONE_BG[c.tone]?.[1] ?? "#3a3a3a"} 12px 14px)` }}>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                  <div className="absolute bottom-1 left-1 right-1 text-[7px] text-white font-mono uppercase">{c.angle}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5"><DecisionBadge kind={c.decision} /><span className="text-[10px] text-[var(--ink-3)]">{c.status}</span></div>
                  <div className="font-semibold text-[12px] text-[var(--ink-1)] mb-0.5">{c.name}</div>
                  <div className="text-[10px] text-[var(--ink-3)] mb-2">{c.angle} · {c.voice} · {c.duration}</div>
                  <div className="flex gap-3 text-[11px] font-mono">
                    <span><strong className="text-[var(--ink-1)]">{pct(c.ctr)}</strong> <span className="text-[var(--ink-3)]">CTR</span></span>
                    <span><strong className="text-[var(--ink-1)]">{eur(c.cpc)}</strong> <span className="text-[var(--ink-3)]">CPC</span></span>
                    <span><strong className="text-[var(--ink-1)]">{c.score}</strong> <span className="text-[var(--ink-3)]">score</span></span>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === "rentabilidad" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: "Break-even", items: [["BE CPA", eur(p.breCpa)],["BE ROAS", `${p.breRoas.toFixed(2)}×`],["BE CPATC", eur(p.breCpa * 0.3)],["BE CPIC", eur(p.breCpa * 0.55)]] },
            { title: "Margen por pack", items: [["Pack 1 (39 €)", eur(39 - p.cogs - 39*0.07 - 0.25)],["Pack 2 (69 €)", eur(69 - p.cogs*1.9 - 69*0.07 - 0.25)],["Pack 3 (94 €)", eur(94 - p.cogs*2.7 - 94*0.07 - 0.25)]] },
            { title: "Gastos asignados", items: [["Coste producto", eur(p.cogs)],["Coste envío", eur(p.shippingCost)],["Comisión pago", "7% + 0,25 €"],["Apps por venta", eur(p.appsCost)],["Margen real", eur(p.margin)]] },
          ].map(({ title, items }) => (
            <div key={title} className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
              <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-3">{title}</div>
              <div className="space-y-3">
                {items.map(([l, v]) => (
                  <div key={l}>
                    <div className="text-[10px] text-[var(--ink-4)] mb-0.5">{l}</div>
                    <div className="font-mono font-bold text-[14px] text-[var(--gold-deep)]">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "proveedor" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-[var(--border)] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[16px] text-[var(--ink-1)]">{p.supplier}</h2>
              <Badge variant="success">Operativo</Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[["Coste unitario", eur(p.cogs)],["Coste envío", eur(p.shippingCost)],["Tiempo entrega", p.shipTime],["País origen", "CN"],["Método", "ePacket / SF"],["Aduanas", "Bajo"]].map(([l, v]) => (
                <div key={l}><div className="text-[10px] text-[var(--ink-4)] mb-0.5 uppercase tracking-wide">{l}</div><div className="font-mono font-semibold text-[13px] text-[var(--ink-1)]">{v}</div></div>
              ))}
            </div>
            <div className="h-px bg-[var(--border)] mb-3" />
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-[var(--ink-3)]">Contacto:</span>
              <code className="text-[11px] bg-[var(--bg-inset)] border border-[var(--border)] px-2 py-0.5 rounded">{p.supplierContact || "—"}</code>
              <button className="ml-auto flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)]"><Copy size={12}/> Copiar plantilla</button>
            </div>
          </div>
          <div className="bg-white border border-[var(--border)] rounded-xl p-5 shadow-sm">
            <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-3">Política de fulfillment</div>
            <ul className="space-y-2 text-[13px] text-[var(--ink-2)] list-disc pl-4">
              <li>Reenvío gratuito si excede 25 días sin movimiento.</li>
              <li>Refund parcial si entrega &gt;30 días.</li>
              <li>Pedidos antes de 14:00 CST = mismo día.</li>
              <li>Alternativa: <strong className="text-[var(--ink-1)]">Zendrop USA</strong> (+1.50 €).</li>
            </ul>
            {p.issues && p.issues.length > 0 && (
              <div className="mt-4 bg-[var(--warning-soft)] border border-[rgba(245,158,11,0.25)] rounded-lg p-3">
                <div className="text-[10px] font-semibold text-[var(--warning)] uppercase mb-2">Incidencias detectadas</div>
                <ul className="text-[12px] text-[var(--ink-2)] list-disc pl-4 space-y-1">
                  {p.issues.map((it, i) => <li key={i}>{it}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "notas" && (
        <div className="bg-white border border-[var(--border)] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold text-[var(--ink-1)]">Notas del producto</div>
            <button onClick={saveNotes} className={cx("flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all", notesSaved ? "bg-[var(--success)] text-white" : "bg-[var(--ink-1)] text-white hover:bg-black")}>
              {notesSaved ? <><CheckCircle size={12} /> Guardado</> : <><Save size={12} /> Guardar notas</>}
            </button>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full h-52 text-[13px] text-[var(--ink-1)] border border-[var(--border-strong)] rounded-lg p-3 bg-white outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[rgba(200,169,106,0.15)] resize-y"
            placeholder="Escribe aquí tus notas, observaciones y próximas acciones para este producto..."
          />
          <div className="text-[11px] text-[var(--ink-4)]">Las notas se guardan localmente en esta sesión.</div>
        </div>
      )}

      {tab === "autopsia" && existingAutopsy && (
        <div className="space-y-4">
          <div className="bg-[var(--danger-soft)] border border-[rgba(239,68,68,0.2)] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-[var(--danger)]" />
              <div className="text-[13px] font-bold text-[var(--danger)]">Autopsia del producto</div>
              <span className="ml-auto text-[11px] text-[var(--ink-4)]">{existingAutopsy.date}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Gasto total", value: eur(existingAutopsy.totalSpend) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/60 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wide mb-0.5">{label}</div>
                  <div className="font-mono font-bold text-[14px] text-[var(--ink-1)]">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {[
            { label: "✅ Qué funcionó", value: existingAutopsy.worked, color: "border-[rgba(34,197,94,0.2)] bg-[var(--success-soft)]" },
            { label: "❌ Qué no funcionó", value: existingAutopsy.didntWork, color: "border-[rgba(239,68,68,0.2)] bg-[var(--danger-soft)]" },
            { label: "💀 Razón de muerte", value: existingAutopsy.killReason, color: "border-[var(--border)] bg-white" },
            { label: "🧠 Aprendizajes para el próximo", value: existingAutopsy.learnings, color: "border-[rgba(200,169,106,0.3)] bg-[var(--gold-soft)]" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`border rounded-xl p-4 ${color}`}>
              <div className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-2">{label}</div>
              <div className="text-[14px] text-[var(--ink-1)] leading-relaxed">{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_FILTERS = [
  { id: "all",       label: "Todos" },
  { id: "research",  label: "Investigación" },
  { id: "webprep",   label: "Preparando web" },
  { id: "testing",   label: "En testing" },
  { id: "validated", label: "Validado" },
  { id: "paused",    label: "Pausado" },
  { id: "dead",      label: "Muerto" },
];

function NewProductModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (p: Product) => void }) {
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const [country, setCountry] = useState("🇲🇽 MX");
  const [price, setPrice] = useState("");
  const [cogs, setCogs] = useState("");
  const [shipping, setShipping] = useState("0");
  const [supplier, setSupplier] = useState("");
  const [shipTime, setShipTime] = useState("9–14 días");
  const [status, setStatus] = useState<ProductStatus>("research");

  const p = parseFloat(price) || 0;
  const c = parseFloat(cogs) || 0;
  const s = parseFloat(shipping) || 0;
  const margin = p > 0 ? Math.max(0, ((p - c - s) / p) * 100) : 0;
  const beCpa = p > 0 ? +(p - c - s).toFixed(2) : 0;
  const beRoas = margin > 0 ? +(100 / margin).toFixed(2) : 0;

  const add = () => {
    if (!name.trim() || !p) return;
    const product: Product = {
      id: `p${Date.now()}`, name: name.trim(), niche: niche.trim() || "Sin nicho",
      country, status, statusLabel: STATUS_BADGE[status].label,
      started: new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long" }),
      spend: 0, sales: 0, revenue: 0, profit: 0,
      roas: 0, cpa: 0, breCpa: beCpa, breRoas: beRoas,
      margin: +margin.toFixed(1), cogs: c, shippingCost: s, appsCost: 0,
      supplier: supplier.trim() || "Por definir", shipTime,
      score: 50, diagnosis: "Producto recién añadido. Configura tu primera campaña para empezar el testing.",
      creativesCount: 0, campaignsCount: 0, tone: "neutral",
    };
    onAdd(product);
    setName(""); setNiche(""); setPrice(""); setCogs(""); setShipping("0"); setSupplier(""); setStatus("research");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo producto">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Nombre del producto *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Masajeador eléctrico cuello"
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Nicho</label>
              <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Ej: Hogar / Salud"
                className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">País</label>
              <select value={country} onChange={e => setCountry(e.target.value)}
                className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)] appearance-none bg-white">
                <option value="🇲🇽 MX">🇲🇽 México</option>
                <option value="🇪🇸 ES">🇪🇸 España</option>
                <option value="🇺🇸 US">🇺🇸 EE.UU.</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Precio venta *</label>
              <input value={price} onChange={e => setPrice(e.target.value)} placeholder="39" type="number"
                className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Coste producto</label>
              <input value={cogs} onChange={e => setCogs(e.target.value)} placeholder="12" type="number"
                className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Coste envío</label>
              <input value={shipping} onChange={e => setShipping(e.target.value)} placeholder="0" type="number"
                className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
            </div>
          </div>
          {p > 0 && (
            <div className="grid grid-cols-3 gap-2 bg-[var(--bg-inset)] rounded-xl p-3">
              <div><div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wide mb-0.5">Margen</div><div className="font-mono font-bold text-[14px]">{margin.toFixed(1)}%</div></div>
              <div><div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wide mb-0.5">BE CPA</div><div className="font-mono font-bold text-[14px]">{beCpa}€</div></div>
              <div><div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wide mb-0.5">BE ROAS</div><div className="font-mono font-bold text-[14px]">{beRoas}×</div></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Proveedor</label>
              <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="CJ Dropshipping, AliExpress..."
                className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Tiempo envío</label>
              <input value={shipTime} onChange={e => setShipTime(e.target.value)} placeholder="9–14 días"
                className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Estado inicial</label>
            <select value={status} onChange={e => setStatus(e.target.value as ProductStatus)}
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)] appearance-none bg-white">
              <option value="research">En investigación</option>
              <option value="webprep">Preparando web</option>
              <option value="testing">En testing</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={add} disabled={!name.trim() || !p}
            className="flex-1 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed">
            Añadir producto
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--ink-3)] text-[13px] hover:bg-[var(--bg-inset)]">
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function Products() {
  const { success, warning } = useToast();
  const [products, setProducts] = useLocalStorage<Product[]>("ecc-products", []);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newModal, setNewModal] = useState(false);

  const handleStatusChange = (id: string, status: ProductStatus) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status, statusLabel: STATUS_BADGE[status].label } : p));
  };

  const handleDelete = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    warning("Producto eliminado");
  };

  const addProduct = (p: Product) => {
    setProducts(prev => [...prev, p]);
    success("Producto añadido", p.name);
  };

  const filtered = products.filter(p => filter === "all" || p.status === filter);
  const selected = products.find(p => p.id === selectedId);

  if (selected) return <ProductDetail p={selected} onBack={() => setSelectedId(null)} onStatusChange={handleStatusChange} onDelete={handleDelete} />;

  if (products.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Catálogo</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Productos</h1>
        </div>
        <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-inset)] flex items-center justify-center">
            <Package size={22} className="text-[var(--ink-4)]" />
          </div>
          <div className="text-center">
            <h3 className="text-[15px] font-semibold text-[var(--ink-1)] mb-1">Sin productos todavía</h3>
            <p className="text-[13px] text-[var(--ink-4)] max-w-xs">Añade el producto que estás testeando para trackear su rentabilidad, fases y decisiones.</p>
          </div>
          <button onClick={() => setNewModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black transition-colors flex items-center gap-2">
            <Package size={14} /> Añadir primer producto
          </button>
        </div>
        <NewProductModal open={newModal} onClose={() => setNewModal(false)} onAdd={addProduct} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Catálogo · {products.length} productos</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Productos</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Gestiona cada producto en su fase de testeo y validación.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-[var(--bg-inset)] border border-[var(--border)] rounded-lg p-0.5 gap-0.5">
            {(["cards","table"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={cx("text-[12px] px-3 py-1.5 rounded-md font-medium transition-colors", view === v ? "bg-white text-[var(--ink-1)] shadow-sm" : "text-[var(--ink-3)] hover:text-[var(--ink-1)]")}>
                {v === "cards" ? "Tarjetas" : "Tabla"}
              </button>
            ))}
          </div>
          <button onClick={() => setNewModal(true)} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black">+ Nuevo producto</button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map(s => {
          const count = s.id === "all" ? products.length : products.filter(p => p.status === s.id).length;
          return (
            <button key={s.id} onClick={() => setFilter(s.id)}
              className={cx("text-[12px] px-3 py-1.5 rounded-lg border font-medium transition-colors",
                filter === s.id ? "bg-[var(--ink-1)] text-white border-[var(--ink-1)]" : "bg-white text-[var(--ink-2)] border-[var(--border)] hover:bg-[var(--bg-inset)]"
              )}>
              {s.label} <span className="opacity-60 ml-1">{count}</span>
            </button>
          );
        })}
      </div>

      {view === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => <ProductCard key={p.id} p={p} onOpen={() => setSelectedId(p.id)} />)}
        </div>
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-inset)]">
                {["Producto","Estado","Score","Gasto","Ingresos","ROAS","CPA / BE","Margen","Proveedor",""].map(h => (
                  <th key={h} className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const s = STATUS_BADGE[p.status];
                return (
                  <tr key={p.id} onClick={() => setSelectedId(p.id)} className="border-b border-[var(--border-soft)] hover:bg-[var(--bg-inset)] cursor-pointer">
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        <ProductThumb tone={p.tone} label={p.name.split(" ")[0]} w={32} h={32} />
                        <div>
                          <div className="font-medium text-[var(--ink-1)]">{p.name}</div>
                          <div className="text-[10px] text-[var(--ink-3)]">{p.niche} · {p.country}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3"><Badge variant={s.variant}>{s.label}</Badge></td>
                    <td className="px-3.5 py-3"><ScoreRing value={p.score} size={32} /></td>
                    <td className="px-3.5 py-3 font-mono text-[var(--ink-1)]">{eur(p.spend)}</td>
                    <td className="px-3.5 py-3 font-mono text-[var(--ink-1)]">{eur(p.revenue)}</td>
                    <td className={cx("px-3.5 py-3 font-mono font-semibold", p.roas >= p.breRoas ? "text-[var(--success)]" : p.roas > 0 ? "text-[var(--danger)]" : "text-[var(--ink-4)]")}>{p.roas ? `${p.roas.toFixed(2)}×` : "—"}</td>
                    <td className="px-3.5 py-3 font-mono text-[var(--ink-1)]">{p.cpa ? eur(p.cpa) : "—"} <span className="text-[var(--ink-3)]">/ {p.breCpa ? eur(p.breCpa) : "—"}</span></td>
                    <td className="px-3.5 py-3 font-mono text-[var(--ink-1)]">{p.margin ? eur(p.margin) : "—"}</td>
                    <td className="px-3.5 py-3 text-[var(--ink-3)]">{p.supplier}</td>
                    <td className="px-3.5 py-3 text-[var(--ink-3)]"><ChevronRight size={14} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <NewProductModal open={newModal} onClose={() => setNewModal(false)} onAdd={addProduct} />
    </div>
  );
}
