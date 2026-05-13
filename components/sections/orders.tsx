"use client";
import { useState } from "react";
import { ORDERS, SUPPLIERS, type Order, type Supplier } from "@/lib/data";
import { eur } from "@/lib/utils";
import { downloadCSV } from "@/lib/export";
import { useToast } from "@/components/ui/toast";
import { Package, AlertTriangle, CheckCircle, Clock, Truck, RotateCcw, Star, Download } from "lucide-react";

function statusIcon(s: Order["status"]) {
  const cls = "flex-shrink-0";
  if (s === "Procesando")  return <Clock size={13} className={`${cls} text-[var(--info)]`} />;
  if (s === "Enviado")     return <Package size={13} className={`${cls} text-[var(--ink-3)]`} />;
  if (s === "En tránsito") return <Truck size={13} className={`${cls} text-[var(--warning)]`} />;
  if (s === "Entregado")   return <CheckCircle size={13} className={`${cls} text-[var(--success)]`} />;
  if (s === "Incidencia")  return <AlertTriangle size={13} className={`${cls} text-[var(--danger)]`} />;
  if (s === "Reembolso")   return <RotateCcw size={13} className={`${cls} text-[var(--danger)]`} />;
  return null;
}

function statusColor(s: Order["status"]) {
  if (s === "Entregado")   return "text-[var(--success)] bg-[var(--success-soft)]";
  if (s === "Incidencia")  return "text-[var(--danger)] bg-[var(--danger-soft)]";
  if (s === "Reembolso")   return "text-[var(--danger)] bg-[var(--danger-soft)]";
  if (s === "En tránsito") return "text-[var(--warning)] bg-[var(--warning-soft)]";
  if (s === "Enviado")     return "text-[var(--ink-2)] bg-[var(--bg-inset)]";
  return "text-[var(--info)] bg-[var(--info-soft)]";
}

function riskBadge(r: Order["risk"]) {
  if (r === "high") return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--danger-soft)] text-[var(--danger)]">Alto</span>;
  if (r === "med")  return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--warning-soft)] text-[var(--warning)]">Medio</span>;
  return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--success-soft)] text-[var(--success)]">Bajo</span>;
}

function SupplierScore({ score }: { score: number }) {
  const color = score >= 80 ? "text-[var(--success)]" : score >= 50 ? "text-[var(--warning)]" : "text-[var(--danger)]";
  return <span className={`font-mono font-bold text-[14px] ${color}`}>{score}</span>;
}

function SupplierCard({ s }: { s: Supplier }) {
  const riskColor = s.risk === "low" ? "bg-[var(--success-soft)] text-[var(--success)]" : s.risk === "med" ? "bg-[var(--warning-soft)] text-[var(--warning)]" : "bg-[var(--danger-soft)] text-[var(--danger)]";
  const riskLabel = s.risk === "low" ? "Bajo riesgo" : s.risk === "med" ? "Riesgo medio" : "Alto riesgo";
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold text-[var(--ink-1)]">{s.name}</div>
          <div className="text-[11px] text-[var(--ink-4)]">{s.country}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Star size={11} className="text-[var(--gold)]" fill="currentColor" />
          <SupplierScore score={s.score} />
        </div>
      </div>
      <div className="text-[11px] text-[var(--ink-3)]">{s.products}</div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {[
          { l: "Coste", v: eur(s.cost) },
          { l: "Envío", v: s.shipping > 0 ? eur(s.shipping) : "Gratis" },
          { l: "Procesado", v: s.processing },
          { l: "Entrega", v: s.delivery },
        ].map(r => (
          <div key={r.l}>
            <div className="text-[var(--ink-4)] uppercase tracking-wide text-[10px]">{r.l}</div>
            <div className="font-medium text-[var(--ink-2)]">{r.v}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${riskColor}`}>{riskLabel}</span>
        <span className="text-[10px] text-[var(--ink-4)]">{s.refundPolicy.slice(0, 28)}…</span>
      </div>
      <div className="text-[11px] text-[var(--ink-4)] border-t border-[var(--border)] pt-2">{s.contact}</div>
    </div>
  );
}

export function Orders() {
  const [tab, setTab] = useState<"orders" | "suppliers">("orders");
  const { success, info } = useToast();

  const incidents = ORDERS.filter(o => o.status === "Incidencia" || o.status === "Reembolso");
  const totalMargin = ORDERS.reduce((s, o) => s + o.margin, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Shopify · últimas 24h</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Pedidos y Proveedores</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Estado de pedidos, incidencias y ficha de proveedores.</p>
        </div>
        <button onClick={() => {
          downloadCSV("pedidos.csv", ORDERS.map(o => ({
            id: o.id, cliente: o.customer, producto: o.product, pack: o.pack,
            fecha: o.date, estado: o.status, tracking: o.track, coste: o.cost, margen: o.margin,
          })));
          success("CSV exportado", "pedidos.csv descargado.");
        }} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white shadow-sm hover:bg-[var(--bg-inset)] flex items-center gap-1.5">
          <Download size={12} /> Exportar CSV
        </button>
      </div>

      {incidents.length > 0 && (
        <div className="bg-[var(--danger-soft)] border border-[rgba(220,38,38,0.2)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-[var(--danger)]" />
            <span className="text-[13px] font-semibold text-[var(--ink-1)]">{incidents.length} incidencia{incidents.length > 1 ? "s" : ""} activa{incidents.length > 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-1">
            {incidents.map(o => (
              <div key={o.id} className="flex items-center gap-2 text-[12px]">
                {statusIcon(o.status)}
                <span className="font-medium text-[var(--ink-1)]">{o.id}</span>
                <span className="text-[var(--ink-3)]">{o.customer} · {o.product}</span>
                <span className={`ml-auto font-semibold ${o.margin < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{eur(o.margin)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Pedidos hoy",  value: String(ORDERS.length) },
          { label: "Margen neto",  value: eur(totalMargin), ok: totalMargin > 0 },
          { label: "Incidencias",  value: String(incidents.length), ok: incidents.length === 0 },
          { label: "Proveedores",  value: String(SUPPLIERS.length) },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`font-mono font-bold text-[20px] ${s.ok === true ? "text-[var(--success)]" : s.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-inset)] rounded-lg p-1 w-fit">
        {(["orders", "suppliers"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${tab === t ? "bg-white text-[var(--ink-1)] shadow-sm" : "text-[var(--ink-3)] hover:text-[var(--ink-1)]"}`}
          >
            {t === "orders" ? `Pedidos (${ORDERS.length})` : `Proveedores (${SUPPLIERS.length})`}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-inset)]">
                {["ID", "Cliente", "Producto", "Pack", "Fecha", "Estado", "Tracking", "Coste", "Margen", "Riesgo"].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {ORDERS.map(o => (
                <tr key={o.id} className="hover:bg-[var(--bg-inset)] transition-colors">
                  <td className="px-4 py-3 font-mono text-[12px] text-[var(--ink-3)]">{o.id}</td>
                  <td className="px-4 py-3 text-[13px] font-medium text-[var(--ink-1)]">{o.customer}</td>
                  <td className="px-4 py-3 text-[12px] text-[var(--ink-2)]">{o.product}</td>
                  <td className="px-4 py-3 text-[12px] text-[var(--ink-3)]">{o.pack}</td>
                  <td className="px-4 py-3 text-[11px] text-[var(--ink-4)] whitespace-nowrap">{o.date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColor(o.status)}`}>
                      {statusIcon(o.status)}
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[var(--ink-4)]">{o.track}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-2)]">{eur(o.cost)}</td>
                  <td className={`px-4 py-3 font-mono text-[13px] font-semibold ${o.margin >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{eur(o.margin)}</td>
                  <td className="px-4 py-3">{riskBadge(o.risk)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "suppliers" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {SUPPLIERS.map(s => <SupplierCard key={s.name} s={s} />)}
        </div>
      )}
    </div>
  );
}
