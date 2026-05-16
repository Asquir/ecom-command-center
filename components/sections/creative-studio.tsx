"use client";
import { useState } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { useToast } from "@/components/ui/toast";
import { ProGate } from "@/components/ui/pro-gate";
import { generateCreativeIdeas, type AiCfg, DEFAULT_AI_CFG, type CreativeGeneration, type GeneratedHook, type GeneratedScript } from "@/lib/integrations/claude";
import { type Creative, type DecisionKind } from "@/lib/data";
import { cx } from "@/lib/utils";
import { Sparkles, Copy, Wand2, AlertTriangle, Clock, Zap, Plus, Trash2, ArrowRight, History } from "lucide-react";

type CreativeState = Creative & { paused?: boolean };

const HOOK_TYPE_LABEL: Record<GeneratedHook["type"], { label: string; color: string }> = {
  question:     { label: "Pregunta",      color: "bg-[#3a3a78] text-white" },
  shock:        { label: "Choque",        color: "bg-[var(--danger)] text-white" },
  problem:      { label: "Problema",      color: "bg-[var(--warning)] text-white" },
  social_proof: { label: "Prueba social", color: "bg-[var(--success)] text-white" },
  curiosity:    { label: "Curiosidad",    color: "bg-[var(--gold)] text-[var(--ink-1)]" },
};

function GenerationCard({ gen, onPushHook, onPushScript }: {
  gen: CreativeGeneration;
  onPushHook: (h: GeneratedHook) => void;
  onPushScript: (s: GeneratedScript) => void;
}) {
  const time = new Date(gen.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-[10px] font-bold text-[var(--ink-4)] uppercase tracking-widest mb-0.5">{time} · {gen.product}</div>
          <div className="text-[12px] text-[var(--ink-3)]">{gen.niche || "—"}{gen.angle ? ` · ${gen.angle}` : ""}</div>
        </div>
        <div className="text-[10px] text-[var(--ink-4)] font-mono">
          {gen.tokensIn}+{gen.tokensOut} tok · ~€{gen.estimatedCost.toFixed(4)}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Hooks */}
        <div>
          <div className="text-[11px] font-bold text-[var(--ink-4)] uppercase tracking-wider mb-2">Hooks</div>
          <div className="space-y-2">
            {gen.hooks.map((h, i) => {
              const typeMeta = HOOK_TYPE_LABEL[h.type] ?? HOOK_TYPE_LABEL.curiosity;
              return (
                <div key={i} className="group flex items-start gap-2 p-2.5 border border-[var(--border)] rounded-xl bg-white hover:border-[var(--gold)] transition-colors">
                  <span className={cx("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0 mt-0.5", typeMeta.color)}>{typeMeta.label}</span>
                  <div className="flex-1 text-[13px] text-[var(--ink-1)] leading-snug">&ldquo;{h.text}&rdquo;</div>
                  <button onClick={() => onPushHook(h)} title="Crear creativo con este hook"
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-[var(--gold-soft)] text-[var(--gold-deep)]">
                    <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scripts */}
        <div>
          <div className="text-[11px] font-bold text-[var(--ink-4)] uppercase tracking-wider mb-2">Scripts UGC / Voiceover</div>
          <div className="space-y-2">
            {gen.scripts.map((s, i) => (
              <div key={i} className="p-3 border border-[var(--border)] rounded-xl bg-[var(--bg-inset)]">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-[var(--ink-1)] text-[var(--gold)]">{s.format}</span>
                  <span className="text-[10px] text-[var(--ink-4)]"><Clock size={10} className="inline mb-0.5" /> {s.duration}</span>
                  <button onClick={() => onPushScript(s)} title="Crear creativo con este script"
                    className="ml-auto text-[10px] font-semibold text-[var(--gold-deep)] hover:underline">
                    Crear creativo →
                  </button>
                </div>
                <div className="text-[12px] text-[var(--ink-1)] leading-relaxed">
                  <strong>Hook:</strong> {s.hook}<br />
                  <span className="text-[var(--ink-2)]"><strong>Desarrollo:</strong> {s.body}</span><br />
                  <strong>CTA:</strong> {s.cta}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ad copy */}
        <div>
          <div className="text-[11px] font-bold text-[var(--ink-4)] uppercase tracking-wider mb-2">Texto de anuncio (Meta primary text)</div>
          <div className="space-y-2">
            {gen.adCopy.map((c, i) => (
              <div key={i} className="p-3 border border-[var(--border)] rounded-xl bg-white">
                <div className="text-[12px] font-bold text-[var(--ink-1)] mb-1">{c.headline}</div>
                <div className="text-[12px] text-[var(--ink-2)] leading-relaxed mb-2">{c.primary}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--gold-deep)] uppercase tracking-wider">CTA: {c.cta}</span>
                  <button onClick={() => navigator.clipboard.writeText(`${c.headline}\n\n${c.primary}\n\nCTA: ${c.cta}`)}
                    className="text-[10px] text-[var(--ink-4)] hover:text-[var(--ink-1)] flex items-center gap-1">
                    <Copy size={11} /> Copiar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudioInner() {
  const { settings } = useSettings();
  const { success, warning } = useToast();
  const [aiCfg] = useLocalStorage<AiCfg>("ecc-int-ai", DEFAULT_AI_CFG);
  const [history, setHistory] = useLocalStorage<CreativeGeneration[]>("ecc-ai-generations", []);
  const [, setCreatives] = useLocalStorage<CreativeState[]>("ecc-creatives", []);

  const [productName, setProductName] = useState(settings.productName ?? "");
  const [niche, setNiche] = useState("");
  const [angle, setAngle] = useState("");
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasKey = !!aiCfg.apiKey;

  const generate = async () => {
    if (!hasKey) { setError("Configura tu API key de Anthropic en Ajustes → Integraciones"); return; }
    if (!productName.trim()) { setError("Introduce el nombre del producto"); return; }
    setError(null); setLoading(true);
    try {
      const gen = await generateCreativeIdeas({
        product: productName.trim(),
        niche: niche.trim() || undefined,
        angle: angle.trim() || undefined,
        targetAudience: audience.trim() || undefined,
      }, aiCfg);
      setHistory(prev => [gen, ...prev].slice(0, 20));
      success("Creativos generados", `${gen.hooks.length} hooks · ${gen.scripts.length} scripts · ${gen.adCopy.length} copy`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      warning("Error al generar", msg);
    } finally {
      setLoading(false);
    }
  };

  const pushHookAsCreative = (h: GeneratedHook, source: CreativeGeneration) => {
    const newC: CreativeState = {
      id: `cr${Date.now()}`,
      name: `${source.product.split(" ")[0].toUpperCase()} · ${source.angle ?? h.type} · v1`,
      angle: source.angle ?? HOOK_TYPE_LABEL[h.type].label,
      hook: h.text, voice: "IA",
      music: "—", cta: "—", duration: "0:20", launched: "Hoy",
      status: "Testeando", decision: "data" as DecisionKind,
      spend: 0, cpm: 0, ctr: 0, cpc: 0, hookRate: 0, holdRate: 0,
      atc: 0, cpAtc: null, ic: 0, purchases: 0, cpa: null, roas: 0,
      score: 0, diag: "Generado por IA. Sin datos todavía.", tone: "gold", paused: false,
    };
    setCreatives(prev => [...prev, newC]);
    success("Creativo creado", newC.name);
  };

  const pushScriptAsCreative = (s: GeneratedScript, source: CreativeGeneration) => {
    const newC: CreativeState = {
      id: `cr${Date.now()}`,
      name: `${source.product.split(" ")[0].toUpperCase()} · ${s.format} · v1`,
      angle: source.angle ?? "IA",
      hook: s.hook, voice: s.format === "UGC" ? "UGC" : s.format === "voiceover" ? "IA" : "Texto",
      music: "—", cta: s.cta, duration: s.duration, launched: "Hoy",
      status: "Testeando", decision: "data" as DecisionKind,
      spend: 0, cpm: 0, ctr: 0, cpc: 0, hookRate: 0, holdRate: 0,
      atc: 0, cpAtc: null, ic: 0, purchases: 0, cpa: null, roas: 0,
      score: 0, diag: `Script IA: ${s.body.slice(0, 80)}...`, tone: "gold", paused: false,
    };
    setCreatives(prev => [...prev, newC]);
    success("Creativo creado", newC.name);
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1 flex items-center gap-2">
          <Sparkles size={11} /> Creative Studio · IA
        </div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Genera creativos en segundos</h1>
        <p className="text-[13px] text-[var(--ink-3)] mt-1">Claude crea hooks, scripts UGC y ad copy específicos para tu producto. Píde 5 ideas y aplícalas directamente a tu banco de creativos.</p>
      </div>

      {/* Generator form */}
      <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-[var(--ink-3)] block mb-1">Producto</label>
            <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Ej: Masajeador eléctrico cuello"
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[var(--ink-3)] block mb-1">Nicho</label>
            <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Salud, hogar, tech..."
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[var(--ink-3)] block mb-1">Ángulo (opcional)</label>
            <input value={angle} onChange={e => setAngle(e.target.value)} placeholder="Dolor de espalda, urgencia, regalo..."
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[var(--ink-3)] block mb-1">Público objetivo (opcional)</label>
            <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Mujeres 35-55, oficinistas..."
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--danger-soft)] border border-[rgba(239,68,68,0.25)]">
            <AlertTriangle size={14} className="text-[var(--danger)] flex-shrink-0 mt-0.5" />
            <div className="text-[12px] text-[var(--ink-1)]">{error}</div>
          </div>
        )}

        {!hasKey && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--warning-soft)] border border-[rgba(245,158,11,0.25)]">
            <AlertTriangle size={14} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
            <div className="text-[12px] text-[var(--ink-1)]">
              Necesitas pegar tu API key de Anthropic en <strong>Ajustes → Integraciones</strong> antes de generar.
            </div>
          </div>
        )}

        <button onClick={generate} disabled={loading || !productName.trim() || !hasKey}
          className="w-full py-3 rounded-xl bg-[var(--ink-1)] text-white font-semibold text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
          {loading ? (
            <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Generando ideas...</>
          ) : (
            <><Wand2 size={16} /> Generar 5 hooks + 3 scripts + 3 copy</>
          )}
        </button>
        <div className="text-[10px] text-[var(--ink-4)] text-center">Coste estimado: ~€0.003 por generación · Modelo: {aiCfg.model}</div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History size={14} className="text-[var(--ink-4)]" />
            <span className="text-[11px] font-bold text-[var(--ink-4)] uppercase tracking-wider">Historial · {history.length} generaciones</span>
          </div>
          <button onClick={() => { if (confirm("¿Borrar todo el historial?")) setHistory([]); }}
            className="text-[11px] text-[var(--ink-4)] hover:text-[var(--danger)] flex items-center gap-1">
            <Trash2 size={11} /> Limpiar
          </button>
        </div>
      )}

      {history.length === 0 ? (
        <div className="bg-white border border-dashed border-[var(--border-strong)] rounded-2xl py-16 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[var(--gold-soft)] flex items-center justify-center">
            <Zap size={22} className="text-[var(--gold-deep)]" />
          </div>
          <div className="text-[13px] font-semibold text-[var(--ink-1)]">Sin generaciones todavía</div>
          <div className="text-[12px] text-[var(--ink-4)] max-w-xs text-center">Rellena el formulario y pulsa "Generar" para crear tu primer paquete de creativos con IA.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map(gen => (
            <GenerationCard key={gen.id} gen={gen}
              onPushHook={h => pushHookAsCreative(h, gen)}
              onPushScript={s => pushScriptAsCreative(s, gen)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CreativeStudio() {
  return (
    <ProGate
      feature="Creative Studio IA"
      description="Genera hooks ganadores, scripts UGC y copy de anuncios en segundos con Claude. Pega tu API key y empieza a crear creativos validados sin partir de cero."
    >
      <StudioInner />
    </ProGate>
  );
}
