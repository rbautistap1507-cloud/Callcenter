import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { formatearFechaHoraCDMX } from "/utils/timezone";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import { Download, Search, ShieldCheck, ArrowUp, ArrowDown, Package, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

interface ReporteMovimientosProps {
  sucursalId?: string;
  todasLasSucursales?: boolean;
  onVolver: () => void;
}

export default function ReporteMovimientos({ sucursalId, todasLasSucursales = false, onVolver }: ReporteMovimientosProps) {
  const [productos, setProductos] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [productoSel, setProductoSel] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [infoProducto, setInfoProducto] = useState<any>(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoProductos, setCargandoProductos] = useState(true);

  const sucursalNombre = todasLasSucursales
    ? "Todas las Sucursales"
    : (SUCURSALES.find(s => s.id === sucursalId)?.nombre || sucursalId);

  useEffect(() => { cargarProductos(); }, []);

  const cargarProductos = async () => {
    setCargandoProductos(true);
    try {
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos?limit=10000`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await resp.json();
      if (data.success) setProductos(data.productos || []);
    } catch (e) {
      toast.error("Error al cargar productos");
    } finally {
      setCargandoProductos(false);
    }
  };

  const seleccionarProducto = async (p: any) => {
    setProductoSel(p);
    setBusqueda("");
    await cargarMovimientos(p);
  };

  const cargarMovimientos = async (p: any) => {
    const codigo = p.codigoBarras || p.id;
    setCargando(true);
    try {
      const suc = todasLasSucursales ? "" : (sucursalId || "");
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos/${encodeURIComponent(codigo)}/movimientos${suc ? `?sucursal=${suc}` : ""}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await resp.json();
      if (data.success) {
        setMovimientos(data.movimientos || []);
        setInfoProducto(data.producto || null);
      } else {
        toast.error(data.error || "Error al cargar movimientos");
      }
    } catch (e) {
      toast.error("Error al cargar movimientos");
    } finally {
      setCargando(false);
    }
  };

  // Resumen
  const totalEntradas = movimientos.filter(m => m.direccion === "entrada").reduce((s, m) => s + (m.cantidad || 0), 0);
  const totalSalidas = movimientos.filter(m => m.direccion === "salida").reduce((s, m) => s + (m.cantidad || 0), 0);
  const auditorias = movimientos.filter(m => m.tipo === "auditoria");
  const ultimaAuditoria = auditorias.length > 0 ? auditorias[auditorias.length - 1] : null;
  const stockActual = infoProducto
    ? (todasLasSucursales
        ? Object.values(infoProducto.stockBySucursal || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
        : (infoProducto.stockBySucursal || {})[sucursalId || ""] || 0)
    : 0;

  const exportarExcel = () => {
    if (movimientos.length === 0) { toast.error("No hay movimientos para exportar"); return; }
    const data = movimientos.map(m => ({
      Fecha: formatearFechaHoraCDMX(m.fecha),
      Tipo: m.tipo,
      Direccion: m.direccion,
      Cantidad: m.cantidad,
      Sucursal: m.sucursalId,
      Usuario: m.usuario,
      Detalle: m.nota,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    XLSX.writeFile(wb, `Movimientos_${(productoSel?.nombre || "producto").substring(0, 20)}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const productosFiltrados = busqueda
    ? productos.filter(p => {
        const t = busqueda.toLowerCase();
        return p.nombre?.toLowerCase().includes(t) || p.codigoBarras?.toLowerCase().includes(t);
      }).slice(0, 20)
    : [];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <button onClick={onVolver} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-3">
          ← Volver a reportes
        </button>
        <h3 className="font-bold text-xl flex items-center gap-2">
          <Package className="w-6 h-6 text-indigo-600" />
          Reporte de Movimientos por Producto
        </h3>
        <p className="text-sm text-gray-500 mt-1">{sucursalNombre}</p>

        {/* Buscador */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto por nombre o código..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {productosFiltrados.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {productosFiltrados.map((p) => (
                <div
                  key={p.id}
                  onClick={() => seleccionarProducto(p)}
                  className="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0"
                >
                  <p className="font-medium text-sm">{p.nombre}</p>
                  <p className="text-xs text-gray-500">{p.codigoBarras}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!productoSel ? (
        <div className="py-16 text-center text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Busca y selecciona un producto para ver su trazabilidad completa</p>
        </div>
      ) : (
        <div className="p-6">
          {/* Cabecera producto */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h4 className="font-bold text-lg">{productoSel.nombre}</h4>
              <p className="text-sm text-gray-500">{productoSel.codigoBarras}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => cargarMovimientos(productoSel)} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm border px-3 py-2 rounded-lg">
                <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} /> Recargar
              </button>
              <button onClick={exportarExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> Exportar Excel
              </button>
            </div>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-gray-600">Total Entradas</p>
              <p className="text-xl font-bold text-green-700">{totalEntradas}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-gray-600">Total Salidas</p>
              <p className="text-xl font-bold text-red-700">{totalSalidas}</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="text-xs text-gray-600">Stock Actual</p>
              <p className="text-xl font-bold text-indigo-700">{stockActual}</p>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
              <p className="text-xs text-gray-600">Última Auditoría</p>
              <p className="text-sm font-bold text-teal-700">
                {ultimaAuditoria ? formatearFechaHoraCDMX(ultimaAuditoria.fecha) : "Sin auditar"}
              </p>
            </div>
          </div>

          {/* Tabla */}
          {cargando ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : movimientos.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Sin movimientos registrados para este producto{!todasLasSucursales ? " en esta sucursal" : ""}</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sucursal</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movimientos.map((m, i) => (
                    <tr key={i} className={`hover:bg-gray-50 ${m.tipo === "auditoria" ? "bg-teal-50" : ""}`}>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{formatearFechaHoraCDMX(m.fecha)}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1 capitalize text-xs font-medium">
                          {m.tipo === "auditoria" && <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />}
                          {m.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center gap-0.5 font-semibold text-xs ${
                          m.direccion === "entrada" ? "text-green-600" : m.direccion === "salida" ? "text-red-600" : "text-gray-600"
                        }`}>
                          {m.direccion === "entrada" && <ArrowUp className="w-3 h-3" />}
                          {m.direccion === "salida" && <ArrowDown className="w-3 h-3" />}
                          {m.cantidad}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{m.sucursalId}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{m.usuario}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{m.nota}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
