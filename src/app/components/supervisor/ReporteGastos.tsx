import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { inicioDiaCDMX, finDiaCDMX } from "/utils/timezone";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import { Download, Receipt, ChevronDown, ChevronUp, User, FileText, DollarSign } from "lucide-react";
import * as XLSX from "xlsx";

interface ReporteGastosProps {
  sucursalId?: string;
  todasLasSucursales?: boolean;
  onVolver: () => void;
}

export default function ReporteGastos({ sucursalId, todasLasSucursales = false, onVolver }: ReporteGastosProps) {
  const [cargando, setCargando] = useState(true);
  const [gastos, setGastos] = useState<any[]>([]);
  const [expandedGasto, setExpandedGasto] = useState<number | null>(null);
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
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/api/reportes/gastos?${params}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await res.json();
      if (data.success) setGastos(data.gastos || []);
      else throw new Error(data.error);
    } catch (error) {
      toast.error("Error al cargar reporte de gastos");
    } finally {
      setCargando(false);
    }
  };

  const totalGastos = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);

  const gastosPorCategoria = gastos.reduce((acc: any, g) => {
    const cat = g.categoria || "Sin categoría";
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += g.monto || 0;
    return acc;
  }, {});

  const descargarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(gastos.map(g => ({
      Fecha: g.creadoEn ? new Date(g.creadoEn).toLocaleDateString() : "-",
      Descripción: g.descripcion || "-",
      Categoría: g.categoria || "-",
      Sucursal: SUCURSALES.find(s => s.id === g.sucursalId)?.nombre || g.sucursalId,
      Monto: g.monto || 0,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gastos");
    XLSX.writeFile(wb, "reporte-gastos.xlsx");
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
            <button onClick={onVolver} className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 block">← Volver a reportes</button>
            <h2 className="text-2xl font-bold text-gray-900">Reporte de Gastos</h2>
            <p className="text-sm text-gray-600">{todasLasSucursales ? "Todas las Sucursales" : SUCURSALES.find(s => s.id === sucursalId)?.nombre}</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-5 h-5 text-orange-600" />
            <p className="text-sm font-medium text-orange-900">Total Gastos</p>
          </div>
          <p className="text-2xl font-bold text-orange-900">${totalGastos.toLocaleString()}</p>
          <p className="text-xs text-orange-700 mt-1">{gastos.length} registros</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">Por Categoría</p>
          <div className="space-y-2">
            {Object.entries(gastosPorCategoria).sort((a: any, b: any) => b[1] - a[1]).map(([cat, monto]: any) => (
              <div key={cat} className="flex justify-between text-sm">
                <span className="text-gray-600">{cat}</span>
                <span className="font-semibold">${monto.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-900">Detalle de Gastos ({gastos.length})</h3>
        </div>
       <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sucursal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {gastos.map((g, i) => (
                <>
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {g.creadoEn ? new Date(g.creadoEn).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{g.categoria || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{SUCURSALES.find(s => s.id === g.sucursalId)?.nombre || g.sucursalId}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-orange-600">${(g.monto || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setExpandedGasto(expandedGasto === i ? null : i)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-medium"
                      >
                        {expandedGasto === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {expandedGasto === i ? "Ocultar" : "Ver"}
                      </button>
                    </td>
                  </tr>
                  {expandedGasto === i && (
                    <tr key={`detail-${i}`} className="bg-indigo-50">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-start gap-2">
                            <User className="w-4 h-4 text-indigo-500 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">Creado por</p>
                              <p className="text-sm font-medium text-gray-800">{g.creadoPor || g.usuario || g.farmaceutico || "N/A"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-indigo-500 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">Concepto / Descripción</p>
                              <p className="text-sm font-medium text-gray-800">{g.descripcion || g.concepto || "Sin descripción"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <DollarSign className="w-4 h-4 text-indigo-500 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">Cantidad</p>
                              <p className="text-sm font-bold text-orange-600">${(g.monto || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}