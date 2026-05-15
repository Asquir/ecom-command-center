"use client";
import { useState } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { type Order, type Supplier } from "@/lib/data";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { eur } from "@/lib/utils";
import { downloadCSV } from "@/lib/export";
import { Package, AlertTriangle, CheckCircle, Clock, Truck, RotateCcw, Star, Download, Plus, Trash2, ShoppingBag } from "lucide-react";

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

function SupplierCard({ s, onDelete }: { s: Supplier; onDelete: () => void }) {
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
          <span className={`font-mono font-bold text-[14px] ${s.score >= 80 ? "text-[var(--success)]" : s.score >= 50 ? "text-[var(--warning)]" : "text-[var(--danger)]"}`}>{s.score}</span>
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
        <button onClick={onDelete} className="text-[var(--ink-4)] hover:text-[var(--danger)]" title="Eliminar proveedor">
          <Trash2 size={12} />
        </button>
      </div>
      <div className="text-[11px] text-[var(--ink-4)] border-t border-[var(--border)] pt-2 truncate">{s.contact}</div>
    </div>
  );
}

const ORDER_STATUSES: Order["status"][] = ["Procesando", "Enviado", "En tránsito", "Entregado", "Incidencia", "Reembolso"];

function NewOrderModal({ open, onClose, onAdd, defaultProduct }: {
  open: boolean; onClose: () => void; onAdd: (o: Order) => void; defaultProduct: string;
}) {
  const [customer, setCustomer] = useState("");
  const [product, setProduct] = useState(defaultProduct);
  const [pack, setPack] = useState("Pack 1");
  const [cost, setCost] = useState("");
  const [margin, setMargin] = useState("");
  const [status, setStatus] = useState<Order["status"]>("Procesando");
  const [track, setTrack] = useState("");

  const add = () => {
    if (!customer.trim() || !product.trim()) return;
    const newOrder: Order = {
      id: `#${Date.now().toString().slice(-6)}`,
      customer: customer.trim(),
      product: product.trim(),
      pack: pack.trim() || "Pack 1",
      date: new Date().toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      status,
      track: track.trim() || "—",
      cost: parseFloat(cost) || 0,
      margin: parseFloat(margin) || 0,
      risk: parseFloat(margin) < 0 ? "high" : status === "Incidencia" || status === "Reembolso" ? "high" : "low",
    };
    onAdd(newOrder);
    setCustomer(""); setProduct(defaultProduct); setPack("Pack 1");
    setCost(""); setMargin(""); setStatus("Procesando"); setTrack("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo pedido">
      <div className="space-y-3">
        <div>
          <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Cliente *</label>
          <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Nombre del cliente"
            className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Producto *</label>
            <input value={product} onChange={e => setProduct(e.target.value)} placeholder="Nombre del producto"
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Pack</label>
            <input value={pack} onChange={e => setPack(e.target.value)} placeholder="Pack 1, 2, 3..."
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Coste (€)</label>
            <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="8.50"
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Margen (€)</label>
            <input type="number" value={margin} onChange={e => setMargin(e.target.value)} placeholder="14.40"
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Estado</label>
            <select value={status} onChange={e => setStatus(e.target.value as Order["status"])}
              className="w-full h-9 px-2 text-[13px] border border-[var(--border)] rounded-lg outline-none bg-white">
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Tracking</label>
            <input value={track} onChange={e => setTrack(e.target.value)} placeholder="LX1234..."
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={add} disabled={!customer.trim() || !product.trim()}
            className="flex-1 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black disabled:opacity-40">
            Añadir pedido
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--ink-3)] text-[13px]">
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function NewSupplierModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (s: Supplier) => void }) {
  const [name, setName] = useState("");
  const [products, setProducts] = useState("");
  const [country, setCountry] = useState("🇨🇳 China");
  const [cost, setCost] = useState("");
  const [shipping, setShipping] = useState("0");
  const [delivery, setDelivery] = useState("9–14 días");
  const [risk, setRisk] = useState<Supplier["risk"]>("low");
  const [contact, setContact] = useState("");

  const add = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      products: products.trim() || "—",
      country,
      cost: parseFloat(cost) || 0,
      shipping: parseFloat(shipping) || 0,
      processing: "24–48h",
      delivery,
      method: "ePacket",
      risk,
      refundPolicy: "Por definir",
      contact: contact.trim() || "—",
      score: risk === "low" ? 80 : risk === "med" ? 55 : 30,
    });
    setName(""); setProducts(""); setCost(""); setShipping("0"); setDelivery("9–14 días"); setRisk("low"); setContact("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo proveedor">
      <div className="space-y-3">
        <div>
          <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Nombre *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="CJ Dropshipping, AliExpress..."
            className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
        </div>
        <div>
          <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Productos que vende</label>
          <input value={products} onChange={e => setProducts(e.target.value)} placeholder="Producto A, Producto B..."
            className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">País</label>
            <input value={country} onChange={e => setCountry(e.target.value)} placeholder="🇨🇳 China"
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Entrega</label>
            <input value={delivery} onChange={e => setDelivery(e.target.value)} placeholder="9–14 días"
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Coste unitario</label>
            <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="8.50"
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Envío</label>
            <input type="number" value={shipping} onChange={e => setShipping(e.target.value)} placeholder="0"
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Riesgo</label>
            <select value={risk} onChange={e => setRisk(e.target.value as Supplier["risk"])}
              className="w-full h-9 px-2 text-[13px] border border-[var(--border)] rounded-lg outline-none bg-white">
              <option value="low">Bajo</option>
              <option value="med">Medio</option>
              <option value="high">Alto</option>
            </select>
          </div>
          <div>
            <label className="text-[12px] font-medium text-[var(--ink-2)] block mb-1.5">Contacto</label>
            <input value={contact} onChange={e => setContact(e.target.value)} placeholder="email@..."
              className="w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--gold)]" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={add} disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black disabled:opacity-40">
            Añadir proveedor
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--ink-3)] text-[13px]">
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function Orders() {
  const { settings } = useSettings();
  const [orders, setOrders] = useLocalStorage<Order[]>("ecc-orders", []);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>("ecc-suppliers", []);
  const [tab, setTab] = useState<"orders" | "suppliers">("orders");
  const [newOrderModal, setNewOrderModal] = useState(false);
  const [newSupplierModal, setNewSupplierModal] = useState(false);
  const { success, warning } = useToast();

  const incidents = orders.filter(o => o.status === "Incidencia" || o.status === "Reembolso");
  const totalMargin = orders.reduce((s, o) => s + o.margin, 0);

  const deleteOrder = (id: string) => {
    if (!confirm("¿Eliminar este pedido?")) return;
    setOrders(prev => prev.filter(o => o.id !== id));
    warning("Pedido eliminado");
  };

  const deleteSupplier = (name: string) => {
    if (!confirm(`¿Eliminar el proveedor ${name}?`)) return;
    setSuppliers(prev => prev.filter(s => s.name !== name));
    warning("Proveedor eliminado");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-widest mb-1">Pedidos · proveedores</div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-1)]">Pedidos y Proveedores</h1>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">Registra pedidos manualmente o conecta Shopify (próximamente). Lleva el control de incidencias y márgenes.</p>
        </div>
        <div className="flex gap-2">
          {orders.length > 0 && (
            <button onClick={() => {
              downloadCSV("pedidos.csv", orders.map(o => ({
                id: o.id, cliente: o.customer, producto: o.product, pack: o.pack,
                fecha: o.date, estado: o.status, tracking: o.track, coste: o.cost, margen: o.margin,
              })));
              success("CSV exportado", "pedidos.csv descargado.");
            }} className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white shadow-sm hover:bg-[var(--bg-inset)] flex items-center gap-1.5">
              <Download size={12} /> CSV
            </button>
          )}
          <button onClick={() => tab === "orders" ? setNewOrderModal(true) : setNewSupplierModal(true)}
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[var(--ink-1)] text-white hover:bg-black flex items-center gap-1.5">
            <Plus size={12} /> {tab === "orders" ? "Nuevo pedido" : "Nuevo proveedor"}
          </button>
        </div>
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

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Pedidos",      value: String(orders.length) },
          { label: "Margen neto",  value: eur(totalMargin), ok: orders.length === 0 ? undefined : totalMargin > 0 },
          { label: "Incidencias",  value: String(incidents.length), ok: incidents.length === 0 },
          { label: "Proveedores",  value: String(suppliers.length) },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <div className="text-[10px] text-[var(--ink-4)] uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`font-mono font-bold text-[20px] ${s.ok === true ? "text-[var(--success)]" : s.ok === false ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-[var(--bg-inset)] rounded-lg p-1 w-fit">
        {(["orders", "suppliers"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${tab === t ? "bg-white text-[var(--ink-1)] shadow-sm" : "text-[var(--ink-3)] hover:text-[var(--ink-1)]"}`}>
            {t === "orders" ? `Pedidos (${orders.length})` : `Proveedores (${suppliers.length})`}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        orders.length === 0 ? (
          <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-inset)] flex items-center justify-center">
              <ShoppingBag size={22} className="text-[var(--ink-4)]" />
            </div>
            <div className="text-center">
              <h3 className="text-[15px] font-semibold text-[var(--ink-1)] mb-1">Sin pedidos todavía</h3>
              <p className="text-[13px] text-[var(--ink-4)] max-w-xs">Añade pedidos manualmente para registrar márgenes, incidencias y tracking.</p>
            </div>
            <button onClick={() => setNewOrderModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black flex items-center gap-2">
              <Plus size={14} /> Añadir primer pedido
            </button>
          </div>
        ) : (
          <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-inset)]">
                  {["ID", "Cliente", "Producto", "Pack", "Fecha", "Estado", "Tracking", "Coste", "Margen", "Riesgo", ""].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-[var(--ink-4)] uppercase tracking-wider px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-[var(--bg-inset)] transition-colors">
                    <td className="px-4 py-3 font-mono text-[12px] text-[var(--ink-3)]">{o.id}</td>
                    <td className="px-4 py-3 text-[13px] font-medium text-[var(--ink-1)]">{o.customer}</td>
                    <td className="px-4 py-3 text-[12px] text-[var(--ink-2)]">{o.product}</td>
                    <td className="px-4 py-3 text-[12px] text-[var(--ink-3)]">{o.pack}</td>
                    <td className="px-4 py-3 text-[11px] text-[var(--ink-4)] whitespace-nowrap">{o.date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColor(o.status)}`}>
                        {statusIcon(o.status)} {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[var(--ink-4)]">{o.track}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[var(--ink-2)]">{eur(o.cost)}</td>
                    <td className={`px-4 py-3 font-mono text-[13px] font-semibold ${o.margin >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{eur(o.margin)}</td>
                    <td className="px-4 py-3">{riskBadge(o.risk)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteOrder(o.id)} className="text-[var(--ink-4)] hover:text-[var(--danger)]" title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "suppliers" && (
        suppliers.length === 0 ? (
          <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-inset)] flex items-center justify-center">
              <Package size={22} className="text-[var(--ink-4)]" />
            </div>
            <div className="text-center">
              <h3 className="text-[15px] font-semibold text-[var(--ink-1)] mb-1">Sin proveedores todavía</h3>
              <p className="text-[13px] text-[var(--ink-4)] max-w-xs">Añade tus proveedores para llevar el control de costes, tiempos y riesgos.</p>
            </div>
            <button onClick={() => setNewSupplierModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[var(--ink-1)] text-white text-[13px] font-semibold hover:bg-black flex items-center gap-2">
              <Plus size={14} /> Añadir primer proveedor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {suppliers.map(s => <SupplierCard key={s.name} s={s} onDelete={() => deleteSupplier(s.name)} />)}
          </div>
        )
      )}

      <NewOrderModal open={newOrderModal} onClose={() => setNewOrderModal(false)} onAdd={(o) => { setOrders(prev => [o, ...prev]); success("Pedido añadido", o.customer); }} defaultProduct={settings.productName || ""} />
      <NewSupplierModal open={newSupplierModal} onClose={() => setNewSupplierModal(false)} onAdd={(s) => { setSuppliers(prev => [...prev, s]); success("Proveedor añadido", s.name); }} />
    </div>
  );
}
