import { useState } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { toast } from "sonner";
import { Download, Package, FileBarChart, Search } from "lucide-react";
import * as XLSX from "xlsx";

interface ReporteVentasPorProductoProps {
  sucursalId?: string;
  todasLasSucursales?: boolean;
  onVolver: () => void;
}

export default function ReporteVentasPorProducto({ sucursalId, todasLasSucursales = false, onVolver }: ReporteVentasPorProductoProps) {
  const [fechaInicio, setFechaInicio] = useState(() => {
    const f = new Date();
    f.setDate(f.getDate() - 30);
    return f.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split("T")[0]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [generado, setGenerado] = useState(false);
  const [filas, setFilas] = useState<any[]>([]);

  const generarReporte = async () => {
    setCargando(true);
    try {
      const sucursalQuery = todasLasSucursales ? "todas" : (sucursalId || "");
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/reportes/ventas-por-producto?inicio=${fechaInicio}&fin=${fechaFin}&sucursal=${encodeURIComponent(sucursalQuery)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
      const data = await res.json();
      if (data.success) {
        setFilas(data.filas || []);
        setGenerado(true);
        toast.success(`Reporte generado: ${data.filas?.length || 0} productos`);
      } else {
        toast.error("Error al generar el reporte");
      }
    } catch {
      toast.error("Error al generar el reporte");
    } finally {
      setCargando(false);
    }
  };

  const filasFiltradas = filas.filter((f) => {
    const t = busqueda.toLowerCase();
    return !t || (f.nombre || "").toLowerCase().includes(t) || (f.codigo || "").toLowerCase().includes(t);
  });

  const descargarExcel = () => {
    if (!filasFiltradas.length) {
      toast.error("No hay datos para descargar");
      return;
    }
    const data = filasFiltradas.map((f) => ({
      "Código": f.codigo,
      "Nombre": f.nombre,
      "Cantidad Vendida": f.cantidad,
      "Total Vendido": f.total,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 18 }, { wch: 40 }, { wch: 16 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "VentasPorProducto");
    XLSX.writeFile(wb, "Reporte_Ventas_Por_Producto.xlsx");
    toast.success("Reporte descargado");
  };

  const totalUnidades = filasFiltradas.reduce((s, f) => s + (Number(f.cantidad) || 0), 0);
  const totalVendido = filasFiltradas.reduce((s, f) => s + (Number(f.total) || 0), 0);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <button onClick={onVolver} className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 block">
          ← Volver a reportes
        </button>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FileBarChart className="w-6 h-6 text-purple-600" />
          Ventas por Producto
        </h2>
      </div>

      {/* Filtros */}
      <div className="p-6 border-b border-gray-200 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha inicio</label>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha fin</label>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <button onClick={generarReporte} disabled={cargando}
          className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 font-semibold flex items-center gap-2 disabled:opacity-50">
          <FileBarChart className="w-5 h-5" />
          {cargando ? "Generando..." : "Generar reporte"}
        </button>
      </div>

      {!generado && (
        <div className="p-12 text-center text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          Selecciona el rango de fechas y presiona "Generar reporte".
        </div>
      )}

      {generado && (
        <div>
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por código o nombre..."
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm" />
              </div>
              <span className="text-sm text-gray-600">
                {filasFiltradas.length} productos · {totalUnidades} unidades · ${totalVendido.toFixed(2)}
              </span>
            </div>
            <button onClick={descargarExcel} disabled={!filasFiltradas.length}
              className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
              <Download className="w-4 h-4" />
              Descargar Excel
            </button>
          </div>

          {filasFiltradas.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No hay ventas en el periodo seleccionado.</div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-800 text-white uppercase text-xs sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Código</th>
                    <th className="px-6 py-3 font-semibold">Nombre</th>
                    <th className="px-6 py-3 font-semibold text-right">Cantidad Vendida</th>
                    <th className="px-6 py-3 font-semibold text-right">Total Vendido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filasFiltradas.map((f, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-mono text-gray-900">{f.codigo}</td>
                      <td className="px-6 py-3 text-sm text-gray-700 font-semibold">{f.nombre}</td>
                      <td className="px-6 py-3 text-sm text-right font-bold text-gray-800">{f.cantidad}</td>
                      <td className="px-6 py-3 text-sm text-right font-bold text-green-700">${Number(f.total).toFixed(2)}</td>
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
