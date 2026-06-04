import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { inicioDiaCDMX, finDiaCDMX } from "/utils/timezone";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import { Download, ShoppingCart, TrendingDown } from "lucide-react";
import * as XLSX from "xlsx";

interface ReporteComprasProps {
  sucursalId?: string;
  todasLasSucursales?: boolean;
  onVolver: () => void;
}

export default function ReporteCompras({ sucursalId, todasLasSucursales = false, onVolver }: ReporteComprasProps) {
  const [cargando, setCargando] = useState(true);
  const [compras, setCompras] = useState<any[]>([]);
  const [fechaInicio, setFechaInicio] = useState(() => {
    const f = new Date(); f.setMonth(f.getMonth() - 1);
    return f.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => { cargarDatos(); }, [fechaInicio, fechaFin, sucursalId]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({
        fechaInicio: inicioDiaCDMX(fechaInicio), fechaFin: finDiaCDMX(fechaFin),
        todas: todasLasSucursales.toString(),
      });
      if (!todasLasSucursales && sucursalId) params.append("sucursal", sucursalId);

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/api/reportes/compras?${params}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await res.json();
      if (data.success) setCompras(data.compras || []);
      else throw new Error(data.error);
    } catch (error) {
      toast.error("Error al cargar reporte de compras");
    } finally {
      setCargando(false);
    }
  };

  const totalCompras = compras.reduce((sum, c) => sum + (c.total || 0), 0);
  const totalUnidades = compras.reduce((sum, c) => sum + (c.cantidad || 0), 0);

  const descargarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(compras.map(c => ({
      Fecha: c.fecha ? new Date(c.fecha).toLocaleDateString() : "-",
      Producto: c.nombreProducto || "-",
      Proveedor: c.proveedor || "-",
      Sucursal: SUCURSALES.find(s => s.id === c.sucursalId)?.nombre || c.sucursalId,
      Cantidad: c.cantidad || 0,
      "Precio Unitario": c.precioCompra || 0,
      Total: c.total || 0,
      Estatus: c.estatus || "-",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compras");
    XLSX.writeFile(wb, "reporte-compras.xlsx");
    toast.success("Excel descargado");
  };

  if (cargando) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button onClick={onVolver} className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 block">
              ← Volver a reportes
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Reporte de Compras</h2>
            <p className="text-sm text-gray-600">
              {todasLasSucursales ? "Todas las Sucursales" : SUCURSALES.find(s => s.id === sucursalId)?.nombre}
            </p>
          </div>
          <button onClick={descargarExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" /> Descargar Excel
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <p className="text-sm font-medium text-red-900">Total Invertido</p>
          </div>
          <p className="text-2xl font-bold text-red-900">${totalCompras.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-900">Órdenes de Compra</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">{compras.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm font-medium text-purple-900 mb-2">Total Unidades</p>
          <p className="text-2xl font-bold text-purple-900">{totalUnidades.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-900">Detalle de Compras ({compras.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {["Fecha", "Producto", "Proveedor", "Sucursal", "Cantidad", "Precio Unit.", "Total", "Estatus"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {compras.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No hay compras en el período seleccionado
                  </td>
                </tr>
              ) : (
                compras.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{c.fecha ? new Date(c.fecha).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.nombreProducto || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.proveedor || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{SUCURSALES.find(s => s.id === c.sucursalId)?.nombre || c.sucursalId}</td>
                    <td className="px-4 py-3 text-sm text-center">{c.cantidad || 0}</td>
                    <td className="px-4 py-3 text-sm">${(c.precioCompra || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">${(c.total || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        c.estatus === "recibido" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }`}>{c.estatus || "pendiente"}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}