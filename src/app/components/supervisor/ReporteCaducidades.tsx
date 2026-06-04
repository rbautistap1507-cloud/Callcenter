import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import { Download, AlertTriangle, AlertCircle, Calendar, Package } from "lucide-react";
import * as XLSX from "xlsx";

interface ReporteCaducidadesProps {
  sucursalId?: string;
  todasLasSucursales?: boolean;
  onVolver: () => void;
}

const CATEGORIAS = [
  "Antibióticos", "Bebés", "Botica y material de curación", "Cuidado de la piel",
  "Cuidado del cabello", "Fracción IV", "Fracción V", "Fracción VI",
  "Higiene personal", "Pareja", "Productos de venta libre", "Vitaminas y suplementos"
];

export default function ReporteCaducidades({ sucursalId, todasLasSucursales = false, onVolver }: ReporteCaducidadesProps) {
  const [cargando, setCargando] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");

  const [vencidos, setVencidos] = useState<any[]>([]);
  const [criticos, setCriticos] = useState<any[]>([]);
  const [proximosVencer, setProximosVencer] = useState<any[]>([]);
  const [monitoreo, setMonitoreo] = useState<any[]>([]);
  const [sinFecha, setSinFecha] = useState<any[]>([]);
  const [resumenSucursales, setResumenSucursales] = useState<any[]>([]);

  useEffect(() => {
    cargarDatos();
  }, [sucursalId]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({
        todas: todasLasSucursales.toString(),
      });

      if (!todasLasSucursales && sucursalId) {
        params.append("sucursal", sucursalId);
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/api/reportes/caducidades?${params}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Backend error:", errorData);
        throw new Error(errorData.error || "Error al cargar reporte");
      }

      const data = await response.json();
      procesarDatos(data);
    } catch (error) {
      console.error("Error cargando reporte:", error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCargando(false);
    }
  };

  const procesarDatos = (data: any) => {
  const { productos = [] } = data || {};
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const nuevosVencidos: any[] = [];
  const nuevosCriticos: any[] = [];
  const nuevosProximos: any[] = [];
  const nuevosMonitoreo: any[] = [];
  const nuevosSinFecha: any[] = [];

  productos.forEach((item: any) => {
    if (!item.fechaVencimiento || item.fechaVencimiento === "") {
      nuevosSinFecha.push(item);
      return;
    }
    const fechaVenc = new Date(item.fechaVencimiento + "T00:00:00");
    if (isNaN(fechaVenc.getTime())) {
      nuevosSinFecha.push(item);
      return;
    }
    const diasRestantes = Math.floor(
      (fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
    );
    const itemConDias = { ...item, diasRestantes };
    if (diasRestantes < 0) nuevosVencidos.push(itemConDias);
    else if (diasRestantes <= 7) nuevosCriticos.push(itemConDias);
    else if (diasRestantes <= 30) nuevosProximos.push(itemConDias);
    else nuevosMonitoreo.push(itemConDias);
  });

  const sucursalesMap: any = {};
  productos.forEach((item: any) => {
    const suc = item.sucursalId || "sin-sucursal";
    if (!sucursalesMap[suc]) {
      sucursalesMap[suc] = { sucursalId: suc, vencidos: 0, criticos: 0, monitoreo: 0 };
    }
    const dias = item.diasRestantes ?? 999;
    if (dias < 0) sucursalesMap[suc].vencidos++;
    else if (dias <= 7) sucursalesMap[suc].criticos++;
    else sucursalesMap[suc].monitoreo++;
  });

  setVencidos(nuevosVencidos);
  setCriticos(nuevosCriticos);
  setProximosVencer(nuevosProximos);
  setMonitoreo(nuevosMonitoreo);
  setSinFecha(nuevosSinFecha);
  setResumenSucursales(Object.values(sucursalesMap));
};
  
  

  const productosFiltrados = (lista: any[]) => {
    if (categoriaFiltro === "todas") return lista;
    return lista.filter((p) => p.categoria === categoriaFiltro);
  };

  const descargarExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Vencidos
    const wsVencidos = XLSX.utils.json_to_sheet(
      vencidos.map((p) => ({
        Código: p.codigoBarras || "",
        Nombre: p.nombre,
        Categoría: p.categoria || "",
        Stock: p.stockTotal,
        "Fecha Vencimiento": p.fechaVencimiento,
        "Días Restantes": p.diasRestantes,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsVencidos, "Vencidos");

    // Hoja 2: Críticos
    const wsCriticos = XLSX.utils.json_to_sheet(
      criticos.map((p) => ({
        Código: p.codigoBarras || "",
        Nombre: p.nombre,
        Categoría: p.categoria || "",
        Stock: p.stockTotal,
        "Fecha Vencimiento": p.fechaVencimiento,
        "Días Restantes": p.diasRestantes,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsCriticos, "Críticos");

    XLSX.writeFile(wb, "reporte-caducidades.xlsx");
    toast.success("Excel descargado");
  };

  const renderTabla = (lista: any[], titulo: string, colorFondo: string, icono: any) => {
    const listaFiltrada = productosFiltrados(lista);
    if (listaFiltrada.length === 0) return null;

    return (
      <div className={`bg-white rounded-lg shadow-sm border-2 ${colorFondo} p-6`}>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          {icono}
          {titulo}
          <span className="ml-auto text-sm font-normal text-gray-600">({listaFiltrada.length} productos)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fecha Vencimiento</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Días Restantes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {listaFiltrada.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{p.codigoBarras || "-"}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.categoria || "Sin categoría"}</td>
                  <td className="px-4 py-3 text-sm text-right">{p.cantidad || p.stockTotal || 0}</td>
                  <td className="px-4 py-3 text-sm text-right">{new Date(p.fechaVencimiento).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      p.diasRestantes < 0 ? "bg-red-100 text-red-800" :
                      p.diasRestantes <= 7 ? "bg-orange-100 text-orange-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {p.diasRestantes} días
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalVencidos = vencidos.length;
  const totalCriticos = criticos.length;
  const montoEstimadoPerdida = vencidos.reduce((sum, p) => sum + (p.precioVenta || 0) * p.stockTotal, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button onClick={onVolver} className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 block">← Volver a reportes</button>
            <h2 className="text-2xl font-bold text-gray-900">Reporte de Caducidades</h2>
            <p className="text-sm text-gray-600 mt-1">
              {todasLasSucursales ? "Todas las Sucursales" : SUCURSALES.find((s) => s.id === sucursalId)?.nombre}
            </p>
          </div>
          <button onClick={descargarExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" />
            Descargar Excel
          </button>
        </div>

        {/* Filtro */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Categoría</label>
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="todas">Todas las Categorías</option>
            {CATEGORIAS.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-red-900">Productos Vencidos</p>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-900">{totalVencidos}</p>
          <p className="text-xs text-red-700 mt-1">Pérdida estimada: ${montoEstimadoPerdida.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-orange-900">Productos Críticos</p>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-900">{totalCriticos}</p>
          <p className="text-xs text-orange-700 mt-1">Vencen en menos de 7 días</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-yellow-900">En Monitoreo</p>
            <Calendar className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-900">{proximosVencer.length + monitoreo.length}</p>
          <p className="text-xs text-yellow-700 mt-1">Próximos 90 días</p>
        </div>
      </div>

      {/* SECCIÓN 1: Vencidos */}
      {renderTabla(vencidos, "Productos Vencidos (URGENTE)", "border-red-300", <AlertTriangle className="w-6 h-6 text-red-600" />)}

      {/* SECCIÓN 2: Críticos */}
      {renderTabla(criticos, "Productos Críticos (< 7 días)", "border-orange-300", <AlertCircle className="w-6 h-6 text-orange-600" />)}

      {/* SECCIÓN 3: Próximos a vencer */}
      {renderTabla(proximosVencer, "Próximos a Vencer (8-30 días)", "border-yellow-300", <Calendar className="w-6 h-6 text-yellow-600" />)}

      {/* SECCIÓN 4: Monitoreo */}
      {renderTabla(monitoreo, "En Monitoreo (31-90 días)", "border-green-300", <Package className="w-6 h-6 text-green-600" />)}

      {/* Resumen por sucursal */}
      {todasLasSucursales && resumenSucursales.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Resumen por Sucursal</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sucursal</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vencidos</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Críticos</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">En Monitoreo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {resumenSucursales.map((s: any) => (
                  <tr key={s.nombre}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
  {SUCURSALES.find(suc => suc.id === s.sucursalId)?.nombre || s.sucursalId}
</td>
                    <td className="px-4 py-3 text-sm text-right text-red-600 font-semibold">{s.vencidos}</td>
                    <td className="px-4 py-3 text-sm text-right text-orange-600 font-semibold">{s.criticos}</td>
                    <td className="px-4 py-3 text-sm text-right text-yellow-600 font-semibold">{s.monitoreo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sin fecha de caducidad */}
      {sinFecha.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Productos sin Fecha de Caducidad Registrada ({sinFecha.length})
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Estos productos tienen stock pero no tienen fecha de caducidad registrada en las compras.
          </p>
          <div className="flex flex-wrap gap-2">
            {sinFecha.slice(0, 20).map((p) => (
              <span key={p.id} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                {p.nombre}
              </span>
            ))}
            {sinFecha.length > 20 && (
              <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs">
                +{sinFecha.length - 20} más
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
