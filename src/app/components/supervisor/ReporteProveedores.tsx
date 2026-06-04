import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import { Download, Truck, ChevronDown, ChevronUp } from "lucide-react";
import * as XLSX from "xlsx";

interface ReporteProveedoresProps {
  sucursalId?: string;
  todasLasSucursales?: boolean;
  onVolver: () => void;
}

export default function ReporteProveedores({ sucursalId, todasLasSucursales = false, onVolver }: ReporteProveedoresProps) {
  const [cargando, setCargando] = useState(true);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => { cargarDatos(); }, [sucursalId]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ todas: todasLasSucursales.toString() });
      if (!todasLasSucursales && sucursalId) params.append("sucursal", sucursalId);
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/api/reportes/proveedores?${params}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await res.json();
      if (data.success) setProveedores(data.proveedores || []);
      else throw new Error(data.error);
    } catch (error) {
      toast.error("Error al cargar reporte de proveedores");
    } finally {
      setCargando(false);
    }
  };

  const totalInvertido = proveedores.reduce((sum, p) => sum + (p.totalCompras || 0), 0);

  const descargarExcel = () => {
    const wsData = [
      ["Proveedor", "Órdenes", "Total Comprado", "Última Compra"],
      ...proveedores.map(p => [
        p.nombre, p.cantidadOrdenes, p.totalCompras,
        p.ultimaCompra ? new Date(p.ultimaCompra).toLocaleDateString() : "-"
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Proveedores");
    XLSX.writeFile(wb, "reporte-proveedores.xlsx");
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
        <div className="flex items-center justify-between">
          <div>
            <button onClick={onVolver} className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 block">← Volver a reportes</button>
            <h2 className="text-2xl font-bold text-gray-900">Reporte de Proveedores</h2>
            <p className="text-sm text-gray-600">{todasLasSucursales ? "Todas las Sucursales" : SUCURSALES.find(s => s.id === sucursalId)?.nombre}</p>
          </div>
          <button onClick={descargarExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" /> Descargar Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            <p className="text-sm font-medium text-indigo-900">Total Proveedores</p>
          </div>
          <p className="text-2xl font-bold text-indigo-900">{proveedores.length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-900 mb-2">Total Invertido</p>
          <p className="text-2xl font-bold text-red-900">${totalInvertido.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-900 mb-2">Proveedor Principal</p>
          <p className="text-lg font-bold text-green-900">{proveedores[0]?.nombre || "-"}</p>
          <p className="text-xs text-green-700">${(proveedores[0]?.totalCompras || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-3">
        {proveedores.map((p, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandido(expandido === p.nombre ? null : p.nombre)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-700 font-bold text-sm">{i + 1}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{p.nombre}</p>
                  <p className="text-xs text-gray-500">{p.cantidadOrdenes} órdenes · Última: {p.ultimaCompra ? new Date(p.ultimaCompra).toLocaleDateString() : "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-lg font-bold text-red-600">${(p.totalCompras || 0).toLocaleString()}</p>
                {expandido === p.nombre ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>
            </div>
            {expandido === p.nombre && (
              <div className="border-t bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Productos comprados:</p>
                <div className="space-y-2">
                  {Object.values(p.productos || {}).sort((a: any, b: any) => b.totalGastado - a.totalGastado).map((prod: any, j: number) => (
                    <div key={j} className="flex justify-between items-center bg-white rounded p-3 border">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{prod.nombre}</p>
                        <p className="text-xs text-gray-500">{prod.cantidad} unidades · ${prod.precioUnitario?.toFixed(2)} c/u</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">${(prod.totalGastado || 0).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}