"use client";
import { useState } from "react";
import { PRODUCTS, CAMPAIGNS, DEMO_CREATIVES, DECISIONS_LOG, TREND_ROAS, type Product } from "@/lib/data";
import { DecisionBadge, Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { KpiCard } from "@/components/ui/kpi-card";
import { eur, pct, cx } from "@/lib/utils";
import { ChevronRight, Copy, ExternalLink, Zap, ArrowLeft } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

type ProductStatus = Product["status"];

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

const DAYS = ["7 may","8 may","9 may","10 may","11 may","12 may","13 may"];

function ProductDetail({ p, onBack }: { p: Product; onBack: () => void }) {
  const [tab, setTab] = useState("summary");
  const productCampaigns = CAMPAIGNS.filter(c => c.product === p.id);
  const productCreatives = p.id === "p1" ? DEMO_CREATIVES : [];
  const s = STATUS_BADGE[p.status];

  const chartData = DAYS.map((d, i) => ({ day: d, roas: TREND_ROAS[i], be: p.breRoas }));

  const TABS = ["summary","métricas","creativos","rentabilidad","proveedor","notas","decisiones"].map(k => ({ id: k, label: k.charAt(0).toUpperCase() + k.slice(1) }));

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors">
        <ArrowLeft size={13} /> Volver a Productos
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex gap-4 items-center">
          <ProductThumb tone={p.tone} label={p.name.split(" ")[0]} w={72} h={96} />
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant={s.variant}>{s.label}</Badge>
              <span className="text-[12px] text-[var(--ink-3)]">{p.country} · {p.niche} · inicio {p.started}</span>
            </div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">{p.name}</h1>
            <p className="text-[13px] text-[var(--ink-3)] mt-1">{p.diagnosis}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)]"><Copy size={13}/> Duplicar test</button>
          <button className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-inset)]"><ExternalLink size={13}/> Ver en Shopify</button>
          <button className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black"><Zap size={13}/> Aplicar recomendación</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-[var(--border)]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cx("px-3.5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors",
              tab === t.id ? "text-[var(--ink-1)] border-[var(--ink-1)] font-semibold" : "text-[var(--ink-3)] border-transparent hover:text-[var(--ink-1)]"
            )}>
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="CTR" value="2,59%" delta={9} trend={[1.8,1.9,2.1,2.3,2.2,2.5,2.6]} />
            <KpiCard label="CPC" value={eur(0.42)} delta={-12} color="success" trend={[0.65,0.58,0.55,0.50,0.48,0.44,0.42]} />
            <KpiCard label="CPM" value={eur(11.83)} delta={3} trend={[10,11,11.5,12,11.8,11.4,11.8]} />
            <KpiCard label="Hook rate" value="45,6%" delta={5} trend={[38,40,42,44,43,45,46]} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
              <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-3">ROAS diario vs Break-even</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--ink-4)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--ink-4)" }} width={30} domain={[0, "auto"]} />
                  <Tooltip contentStyle={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine y={p.breRoas} stroke="var(--danger)" strokeDasharray="4 2" label={{ value: "BE", fontSize: 10, fill: "var(--danger)" }} />
                  <Line dataKey="roas" stroke="var(--info)" strokeWidth={2} dot={{ r: 3 }} name="ROAS" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-[var(--border)] font-semibold text-[13px] text-[var(--ink-1)]">Tabla diaria</div>
              <table className="w-full text-[12px]">
                <thead><tr className="border-b border-[var(--border)] bg-[var(--bg-inset)]">{["Día","Gasto","Compras","ROAS"].map(h => <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wide">{h}</th>)}</tr></thead>
                <tbody>
                  {DAYS.map((d, i) => (
                    <tr key={d} className="border-b border-[var(--border-soft)] hover:bg-[var(--bg-inset)]">
                      <td className="px-3 py-2.5 text-[var(--ink-2)]">{d}{i === 6 && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--gold-soft)] text-[var(--gold-deep)] font-semibold">HOY</span>}</td>
                      <td className="px-3 py-2.5 font-mono text-[var(--ink-1)]">{eur([78,82,80,95,88,102,98][i])}</td>
                      <td className="px-3 py-2.5 font-mono text-[var(--ink-1)]">{[3,5,4,5,4,6,9][i]}</td>
                      <td className={cx("px-3 py-2.5 font-mono font-semibold", TREND_ROAS[i] >= p.breRoas ? "text-[var(--success)]" : "text-[var(--danger)]")}>{TREND_ROAS[i].toFixed(2)}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
        <div className="bg-white border border-[var(--border)] rounded-xl p-5 shadow-sm">
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider mb-3">Notas del producto</div>
          <textarea
            className="w-full h-52 text-[13px] text-[var(--ink-1)] border border-[var(--border-strong)] rounded-lg p-3 bg-white outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[rgba(200,169,106,0.15)] resize-y"
            defaultValue={`${p.notes ?? ""}\n\n• 13/may — Sarro tiene mejor hold rate. Probar 3 hooks distintos.\n• 12/may — Pixel disparó ATC duplicado, ajustado en GTM.\n• 11/may — Cambiar copy del bundle, "ahorra 12 €" rinde más.`}
          />
        </div>
      )}

      {tab === "decisiones" && (
        <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="font-semibold text-[13px] text-[var(--ink-1)]">Historial de decisiones</div>
          </div>
          <div className="divide-y divide-[var(--border-soft)]">
            {DECISIONS_LOG.map((d, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center flex-shrink-0 text-[var(--ink-3)] text-[11px]">⊙</div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-[var(--ink-1)]">{d.action}</div>
                  <div className="text-[11px] text-[var(--ink-3)] mt-0.5">{d.ts} · <code className="bg-[var(--bg-inset)] border border-[var(--border)] px-1 rounded text-[10px]">{d.who}</code></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_FILTERS = [
  { id: "all",       label: "Todos",           count: PRODUCTS.length },
  { id: "research",  label: "Investigación",   count: 1 },
  { id: "webprep",   label: "Preparando web",  count: 1 },
  { id: "testing",   label: "En testing",      count: 1 },
  { id: "validated", label: "Validado",        count: 1 },
  { id: "paused",    label: "Pausado",         count: 1 },
  { id: "dead",      label: "Muerto",          count: 1 },
];

export function Products() {
  const [view, setView] = useState<"cards" | "table">("cards");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = PRODUCTS.filter(p => filter === "all" || p.status === filter);
  const selected = PRODUCTS.find(p => p.id === selectedId);

  if (selected) return <ProductDetail p={selected} onBack={() => setSelectedId(null)} />;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Catálogo · {PRODUCTS.length} productos</div>
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
          <button className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black">+ Nuevo producto</button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button key={s.id} onClick={() => setFilter(s.id)}
            className={cx("text-[12px] px-3 py-1.5 rounded-lg border font-medium transition-colors",
              filter === s.id ? "bg-[var(--ink-1)] text-white border-[var(--ink-1)]" : "bg-white text-[var(--ink-2)] border-[var(--border)] hover:bg-[var(--bg-inset)]"
            )}>
            {s.label} <span className="opacity-60 ml-1">{s.count}</span>
          </button>
        ))}
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
    </div>
  );
}
