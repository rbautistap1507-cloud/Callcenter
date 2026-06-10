import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { toast } from "sonner";
import { Search, Plus, Trash2, FileText, Printer, Save, List, ShoppingCart, RefreshCw } from "lucide-react";

interface CotizacionesProps {
  user: any;
}

interface ItemCot {
  productoId: string;
  producto: any;
  cantidad: number;
  precioElegido: number;
}

export default function Cotizaciones({ user }: CotizacionesProps) {
  const [tab, setTab] = useState<"cotizar" | "consultar">("cotizar");

  // --- Datos de productos ---
  const [productos, setProductos] = useState<any[]>([]);
  const [cargandoProd, setCargandoProd] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // --- Cotizacion en curso ---
  const [items, setItems] = useState<ItemCot[]>([]);
  const [cliente, setCliente] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  // Nivel de descuento global: "ninguno" | "precio1" | "precio2" | "precio3" | "precio4"
  const [nivelDescuento, setNivelDescuento] = useState<"ninguno" | "precio1" | "precio2" | "precio3" | "precio4">("ninguno");

  // --- Consulta ---
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [cargandoCot, setCargandoCot] = useState(false);

  const base = `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19`;
  const headers = { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" };

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = async () => {
    setCargandoProd(true);
    try {
      const r = await fetch(`${base}/productos?limit=10000`, { headers });
      const d = await r.json();
      if (d.success) setProductos(d.productos || []);
    } catch {
      toast.error("Error al cargar productos");
    } finally {
      setCargandoProd(false);
    }
  };

  const loadCotizaciones = async () => {
    setCargandoCot(true);
    try {
      const r = await fetch(`${base}/cotizaciones`, { headers });
      const d = await r.json();
      if (d.success) setCotizaciones(d.cotizaciones || []);
    } catch {
      toast.error("Error al cargar cotizaciones");
    } finally {
      setCargandoCot(false);
    }
  };

  useEffect(() => {
    if (tab === "consultar") loadCotizaciones();
  }, [tab]);

  // --- Helpers de precios ---
  const preciosDisponibles = (p: any) => {
    const lista = [
      { label: "Precio 1", valor: parseFloat(p?.precioVenta) || 0 },
      { label: "Precio 2", valor: parseFloat(p?.precio2) || 0 },
      { label: "Precio 3", valor: parseFloat(p?.precio3) || 0 },
      { label: "Precio 4", valor: parseFloat(p?.precio4) || 0 },
    ];
    return lista.filter((x) => x.valor > 0);
  };

  const productosFiltrados = busqueda.trim()
    ? productos.filter((p) => {
        const q = busqueda.toLowerCase();
        return (
          p.nombre?.toLowerCase().includes(q) ||
          p.codigoBarras?.toLowerCase().includes(q)
        );
      }).slice(0, 20)
    : [];

  const agregar = (p: any) => {
    const existe = items.find((it) => it.productoId === p.id);
    if (existe) {
      setItems(items.map((it) => it.productoId === p.id ? { ...it, cantidad: it.cantidad + 1 } : it));
    } else {
      const precio = parseFloat(p.precioVenta) || 0;
      setItems([...items, { productoId: p.id, producto: p, cantidad: 1, precioElegido: precio }]);
    }
    setBusqueda("");
  };

  const quitar = (id: string) => setItems(items.filter((it) => it.productoId !== id));
  const cambiarCantidad = (id: string, delta: number) =>
    setItems(items.map((it) => it.productoId === id ? { ...it, cantidad: Math.max(1, it.cantidad + delta) } : it));
  const cambiarPrecio = (id: string, precio: number) =>
    setItems(items.map((it) => it.productoId === id ? { ...it, precioElegido: precio } : it));

  // Precio del nivel de descuento para un producto (0 si no tiene ese nivel)
  const precioNivel = (p: any, nivel: string): number => {
    switch (nivel) {
      case "precio1": return parseFloat(p?.precioVenta) || 0;
      case "precio2": return parseFloat(p?.precio2) || 0;
      case "precio3": return parseFloat(p?.precio3) || 0;
      case "precio4": return parseFloat(p?.precio4) || 0;
      default: return 0;
    }
  };

  // Descuento unitario de un item: (precio base elegido - precio del nivel), minimo 0.
  // Si el producto no tiene ese nivel de precio (0), no se le aplica descuento.
  const descuentoUnitario = (it: ItemCot): number => {
    if (nivelDescuento === "ninguno") return 0;
    const pNivel = precioNivel(it.producto, nivelDescuento);
    if (pNivel <= 0) return 0; // no tiene ese nivel -> sin descuento
    const desc = it.precioElegido - pNivel;
    return desc > 0 ? desc : 0;
  };

  // Importe por item = precio base x cantidad (sin restar descuento)
  const importeItem = (it: ItemCot): number => it.precioElegido * it.cantidad;
  // Descuento por item (ya x cantidad)
  const descuentoItem = (it: ItemCot): number => descuentoUnitario(it) * it.cantidad;

  const subtotal = items.reduce((acc, it) => acc + importeItem(it), 0);
  const descuentoTotal = items.reduce((acc, it) => acc + descuentoItem(it), 0);
  const total = subtotal - descuentoTotal;

  const limpiar = () => {
    setItems([]);
    setCliente("");
    setNotas("");
    setNivelDescuento("ninguno");
  };

  const guardar = async () => {
    if (items.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    setGuardando(true);
    try {
      const nivelLabel = nivelDescuento === "ninguno" ? "" :
        nivelDescuento === "precio1" ? "Precio 1" :
        nivelDescuento === "precio2" ? "Precio 2" :
        nivelDescuento === "precio3" ? "Precio 3" : "Precio 4";
      const payload = {
        cliente,
        notas,
        sucursalId: "principal",
        creadoPor: user?.name || user?.username || "",
        vendedor: user?.name || user?.username || "",
        subtotal,
        descuentoTotal,
        nivelDescuento: nivelLabel,
        total,
        productos: items.map((it) => ({
          productoId: it.productoId,
          codigoBarras: it.producto.codigoBarras,
          nombre: it.producto.nombre,
          unidad: it.producto.unidad || it.producto.presentacion || "Pieza",
          cantidad: it.cantidad,
          precio: it.precioElegido,
          descuento: descuentoItem(it),
          importe: importeItem(it),
          subtotal: importeItem(it),
        })),
      };
      const r = await fetch(`${base}/cotizaciones`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`Cotización ${d.cotizacion.folio} guardada`);
        imprimirPDF(d.cotizacion);
        limpiar();
      } else {
        toast.error(d.error || "Error al guardar");
      }
    } catch {
      toast.error("Error de conexión al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const imprimirPDF = (cot: any) => {
    const fecha = new Date(cot.fecha).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", year: "numeric", month: "long", day: "numeric" });
    const filas = (cot.productos || []).map((p: any) => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px">${p.codigoBarras || ""}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:center">${p.cantidad}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:center">${p.unidad || "Pieza"}</td>
        <td style="padding:6px;border-bottom:1px solid #eee">${p.nombre || ""}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">$${Number(p.precio || 0).toFixed(2)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">$${Number(p.descuento || 0).toFixed(2)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">$${Number(p.importe ?? p.subtotal ?? 0).toFixed(2)}</td>
      </tr>`).join("");
    const subtotalPDF = Number(cot.subtotal || 0);
    const descuentoPDF = Number(cot.descuentoTotal || 0);
    const totalPDF = Number(cot.total || 0);
    const vendedor = cot.vendedor || cot.creadoPor || "";
    const html = `
      <html><head><title>Cotización ${cot.folio}</title></head>
      <body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#1f2937">
        <div style="border-bottom:2px solid #4f46e5;padding-bottom:12px">
          <table style="width:100%">
            <tr>
              <td style="vertical-align:top">
                <h1 style="margin:0;color:#4f46e5;font-size:20px">Grupo Farmaceutico LYM</h1>
                <p style="margin:2px 0;color:#6b7280;font-size:12px">RFC: GFL2206038U5</p>
                <p style="margin:2px 0;color:#6b7280;font-size:12px">Avenida Martin Carrera 97, Col. Martin Carrera</p>
                <p style="margin:2px 0;color:#6b7280;font-size:12px">CP 07070, GAM, CDMX</p>
                <p style="margin:2px 0;color:#6b7280;font-size:12px">Tel: 5522117964 · Cel: 5520460474</p>
                <p style="margin:2px 0;color:#6b7280;font-size:12px">lymecommerce@gmail.com</p>
              </td>
              <td style="vertical-align:top;text-align:right">
                <p style="margin:0;font-size:16px;font-weight:bold">COTIZACIÓN</p>
                <p style="margin:2px 0;font-size:15px;font-weight:bold;color:#4f46e5">${cot.folio || ""}</p>
                <p style="margin:2px 0;color:#6b7280;font-size:12px">Fecha: ${fecha}</p>
                <p style="margin:2px 0;color:#6b7280;font-size:12px">Moneda: MXN</p>
              </td>
            </tr>
          </table>
        </div>
        ${cot.cliente ? `<p style="margin:12px 0"><strong>Cliente:</strong> ${cot.cliente}</p>` : ""}
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px">
          <thead><tr style="background:#f3f4f6">
            <th style="padding:8px;text-align:left">Código</th>
            <th style="padding:8px;text-align:center">Cantidad</th>
            <th style="padding:8px;text-align:center">Unidad</th>
            <th style="padding:8px;text-align:left">Descripción</th>
            <th style="padding:8px;text-align:right">P. Unitario</th>
            <th style="padding:8px;text-align:right">Descuento</th>
            <th style="padding:8px;text-align:right">Importe</th>
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <table style="width:100%;margin-top:16px;font-size:14px">
          <tr>
            <td style="width:60%;vertical-align:bottom">
              <p style="margin:32px 0 4px 0">_______________________________</p>
              <p style="margin:0;color:#6b7280;font-size:12px">Vendedor: ${vendedor}</p>
            </td>
            <td style="width:40%">
              <table style="width:100%;font-size:14px">
                <tr><td style="padding:4px 8px;text-align:right;color:#6b7280">Subtotal:</td><td style="padding:4px 8px;text-align:right;font-weight:bold">$${subtotalPDF.toFixed(2)}</td></tr>
                <tr><td style="padding:4px 8px;text-align:right;color:#6b7280">Descuento:</td><td style="padding:4px 8px;text-align:right;font-weight:bold">$${descuentoPDF.toFixed(2)}</td></tr>
                <tr style="border-top:2px solid #4f46e5"><td style="padding:6px 8px;text-align:right;font-weight:bold;font-size:16px">Total:</td><td style="padding:6px 8px;text-align:right;font-weight:bold;font-size:16px;color:#4f46e5">$${totalPDF.toFixed(2)}</td></tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin-top:8px;color:#6b7280;font-size:12px;font-style:italic">Todos los precios incluyen IVA.</p>
        ${cot.notas ? `<p style="margin-top:16px;color:#6b7280"><strong>Notas:</strong> ${cot.notas}</p>` : ""}
        <p style="margin-top:24px;color:#9ca3af;font-size:11px">Cotización válida por ${cot.vigenciaDias || 15} días. Precios sujetos a cambio sin previo aviso.</p>
      </body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 300);
    }
  };


  const eliminarCotizacion = async (id: string) => {
    if (!confirm("¿Eliminar esta cotización?")) return;
    try {
      const r = await fetch(`${base}/cotizaciones/${encodeURIComponent(id)}`, { method: "DELETE", headers });
      const d = await r.json();
      if (d.success) {
        toast.success("Cotización eliminada");
        loadCotizaciones();
      } else {
        toast.error("Error al eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <FileText className="w-6 h-6" /> Cotizaciones
      </h2>

      {/* Pestañas */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setTab("cotizar")}
          className={`px-4 py-2 font-medium text-sm border-b-2 ${tab === "cotizar" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500"}`}
        >
          <ShoppingCart className="w-4 h-4 inline mr-1" /> Nueva Cotización
        </button>
        <button
          onClick={() => setTab("consultar")}
          className={`px-4 py-2 font-medium text-sm border-b-2 ${tab === "consultar" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500"}`}
        >
          <List className="w-4 h-4 inline mr-1" /> Consultar
        </button>
      </div>

      {tab === "cotizar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Buscador + lista */}
          <div className="lg:col-span-2">
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto por nombre o código..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {busqueda.trim() && (
              <div className="bg-white rounded-lg shadow mb-4 max-h-64 overflow-y-auto">
                {productosFiltrados.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400 text-center">Sin resultados</p>
                ) : (
                  productosFiltrados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => agregar(p)}
                      className="w-full text-left px-4 py-2 hover:bg-indigo-50 border-b last:border-0 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{p.nombre}</p>
                        <p className="text-xs text-gray-400 font-mono">{p.codigoBarras}</p>
                      </div>
                      <span className="text-indigo-600"><Plus className="w-4 h-4" /></span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Items de la cotizacion */}
            <div className="bg-white rounded-lg shadow p-4">
              {items.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Busca y agrega productos a la cotización</p>
              ) : (
                items.map((it) => (
                  <div key={it.productoId} className="mb-4 pb-4 border-b last:border-0">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-semibold flex-1">{it.producto.nombre}</p>
                      <button onClick={() => quitar(it.productoId)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => cambiarCantidad(it.productoId, -1)} className="bg-gray-200 px-2 rounded">-</button>
                        <span className="w-8 text-center text-sm font-semibold">{it.cantidad}</span>
                        <button onClick={() => cambiarCantidad(it.productoId, 1)} className="bg-gray-200 px-2 rounded">+</button>
                      </div>
                      <p className="font-bold text-indigo-600">${(it.precioElegido * it.cantidad).toFixed(2)}</p>
                    </div>
                    {preciosDisponibles(it.producto).length > 1 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {preciosDisponibles(it.producto).map((pr, i) => (
                          <button
                            key={i}
                            onClick={() => cambiarPrecio(it.productoId, pr.valor)}
                            className={`px-2 py-1 rounded text-xs font-medium ${it.precioElegido === pr.valor ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                          >
                            {pr.label}: ${pr.valor.toFixed(2)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Resumen y datos */}
          <div className="bg-white rounded-lg shadow p-4 h-fit">
            <h3 className="font-semibold text-gray-700 mb-3">Datos de la cotización</h3>
            <label className="block text-xs text-gray-600 mb-1">Cliente (opcional)</label>
            <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3 focus:ring-2 focus:ring-indigo-500" placeholder="Nombre del cliente" />
            <label className="block text-xs text-gray-600 mb-1">Notas (opcional)</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3 focus:ring-2 focus:ring-indigo-500" rows={3} placeholder="Observaciones..." />
            <label className="block text-xs text-gray-600 mb-1">Descuento</label>
            <select
              value={nivelDescuento}
              onChange={(e) => setNivelDescuento(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ninguno">Sin descuento</option>
              <option value="precio1">Precio 1</option>
              <option value="precio2">Precio 2</option>
              <option value="precio3">Precio 3</option>
              <option value="precio4">Precio 4</option>
            </select>
            <div className="border-t pt-3 mb-4 space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold text-gray-800">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Descuento:</span>
                <span className="font-semibold text-red-600">-${descuentoTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t">
                <span className="text-gray-700 font-semibold">Total:</span>
                <span className="text-2xl font-bold text-indigo-600">${total.toFixed(2)}</span>
              </div>
            </div>
            <button onClick={guardar} disabled={guardando || items.length === 0}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium mb-2">
              <Save className="w-4 h-4" /> {guardando ? "Guardando..." : "Guardar y generar PDF"}
            </button>
            <button onClick={limpiar} className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 text-sm">Limpiar</button>
          </div>
        </div>
      ) : (
        /* Consultar */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Cotizaciones guardadas</h3>
            <button onClick={loadCotizaciones} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm">
              <RefreshCw className={`w-4 h-4 ${cargandoCot ? "animate-spin" : ""}`} /> Actualizar
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Folio</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Cliente</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargandoCot ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              ) : cotizaciones.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No hay cotizaciones guardadas</td></tr>
              ) : (
                cotizaciones.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono">{c.folio}</td>
                    <td className="px-4 py-2 text-gray-600">{new Date(c.fecha).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}</td>
                    <td className="px-4 py-2">{c.cliente || "—"}</td>
                    <td className="px-4 py-2 text-right font-semibold">${Number(c.total).toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => imprimirPDF(c)} className="text-indigo-600 hover:text-indigo-800 p-1" title="Imprimir / PDF"><Printer className="w-4 h-4" /></button>
                        <button onClick={() => eliminarCotizacion(c.id)} className="text-red-500 hover:text-red-700 p-1" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
