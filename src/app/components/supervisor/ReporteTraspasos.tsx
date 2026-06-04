import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { inicioDiaCDMX, finDiaCDMX } from "/utils/timezone";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import { Download, ArrowRightLeft, Package, DollarSign, Calendar, Eye, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";

interface ReporteTraspasosProps {
  sucursalId?: string;
  todasLasSucursales?: boolean;
  onVolver: () => void;

}

export default function ReporteTraspasos({ sucursalId, todasLasSucursales = false, onVolver }: ReporteTraspasosProps) {
  const [cargando, setCargando] = useState(true);

  const [fechaInicio, setFechaInicio] = useState(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 30);
    return fecha.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split("T")[0]);
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [origenFiltro, setOrigenFiltro] = useState("todas");
  const [destinoFiltro, setDestinoFiltro] = useState("todas");

  const [traslados, setTraslados] = useState<any[]>([]);
  const [metricas, setMetricas] = useState<any>(null);
  const [flujoData, setFlujoData] = useState<any[]>([]);
  const [trasladoSeleccionado, setTrasladoSeleccionado] = useState<any>(null);

  useEffect(() => {
    cargarDatos();
  }, [fechaInicio, fechaFin, sucursalId]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({
        fechaInicio: inicioDiaCDMX(fechaInicio),
        fechaFin: finDiaCDMX(fechaFin),
        todas: todasLasSucursales.toString(),
      });

      if (!todasLasSucursales && sucursalId) {
        params.append("sucursal", sucursalId);
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/api/reportes/traspasos?${params}`,
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
    const { traslados: trasladosData = [], productos = [] } = data || {};

    // Enriquecer traslados con información de productos
    const trasladosEnriquecidos = trasladosData.map((t: any) => {
      const productosDetalle = t.productos?.map((p: any) => {
        const prod = productos.find((pr: any) => pr.id === p.productoId || pr.nombre === p.nombre);
        return {
          ...p,
          nombreProducto: prod?.nombre || p.nombre,
          codigoBarras: prod?.codigoBarras || "",
        };
      }) || [];

      const total = productosDetalle.reduce((sum: number, p: any) => sum + ((p.cantidad || 0) * (p.precioUnitario || 0)), 0);

      return {
        ...t,
        productosDetalle,
        total,
        sucursalOrigenNombre: SUCURSALES.find(s => s.id === t.sucursalOrigenId)?.nombre || t.sucursalOrigenId,
        sucursalDestinoNombre: SUCURSALES.find(s => s.id === t.sucursalDestinoId)?.nombre || t.sucursalDestinoId,
      };
    });

    setTraslados(trasladosEnriquecidos);

    // Calcular métricas
    const totalTraslados = trasladosEnriquecidos.length;
    const totalCompletados = trasladosEnriquecidos.filter((t: any) => t.estado === "completado").length;
    const totalPendientes = trasladosEnriquecidos.filter((t: any) => t.estado === "pendiente").length;
    const valorTotal = trasladosEnriquecidos
      .filter((t: any) => t.estado === "completado")
      .reduce((sum: number, t: any) => sum + t.total, 0);

    // Análisis de flujo por sucursal
    const flujoMap: any = {};
    SUCURSALES.forEach(s => {
      flujoMap[s.id] = { id: `sucursal-${s.id}`, sucursal: s.nombre, salidas: 0, entradas: 0 };
    });

    trasladosEnriquecidos
      .filter((t: any) => t.estado === "completado")
      .forEach((t: any) => {
        if (flujoMap[t.sucursalOrigenId]) {
          flujoMap[t.sucursalOrigenId].salidas += t.total;
        }
        if (flujoMap[t.sucursalDestinoId]) {
          flujoMap[t.sucursalDestinoId].entradas += t.total;
        }
      });

    const flujo = Object.values(flujoMap).filter((f: any) => f.salidas > 0 || f.entradas > 0);

    // Sucursales que más envían/reciben
    const sucursalMasEnvia = Object.values(flujoMap).sort((a: any, b: any) => b.salidas - a.salidas)[0] as any;
    const sucursalMasRecibe = Object.values(flujoMap).sort((a: any, b: any) => b.entradas - a.entradas)[0] as any;

    setMetricas({
      totalTraslados,
      totalCompletados,
      totalPendientes,
      valorTotal,
      sucursalMasEnvia,
      sucursalMasRecibe,
    });

    setFlujoData(flujo);
  };

  const trasladosFiltrados = () => {
    return traslados.filter((t) => {
      const cumpleEstado = estadoFiltro === "todos" || t.estado === estadoFiltro;
      const cumpleOrigen = origenFiltro === "todas" || t.sucursalOrigenId === origenFiltro;
      const cumpleDestino = destinoFiltro === "todas" || t.sucursalDestinoId === destinoFiltro;
      return cumpleEstado && cumpleOrigen && cumpleDestino;
    });
  };

  const descargarExcel = () => {
    const wb = XLSX.utils.book_new();
    const lista = trasladosFiltrados();

    const wsData = [
      ["Fecha", "Folio", "Descripción", "Origen", "Destino", "Productos", "Total", "Estado", "Creado Por"],
      ...lista.map((t) => [
        new Date(t.fecha).toLocaleDateString(),
        t.folio || "-",
        t.descripcion || "-",
        t.sucursalOrigenNombre,
        t.sucursalDestinoNombre,
        t.productosDetalle?.length || 0,
        t.total,
        t.estado,
        t.creadoPorNombre || "-",
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Traspasos");
    XLSX.writeFile(wb, "reporte-traspasos.xlsx");
    toast.success("Excel descargado");
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const listaFiltrada = trasladosFiltrados();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button onClick={onVolver} className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 block">← Volver a reportes</button>
            <h2 className="text-2xl font-bold text-gray-900">Reporte de Traspasos</h2>
            <p className="text-sm text-gray-600 mt-1">
              {todasLasSucursales ? "Todas las Sucursales" : SUCURSALES.find((s) => s.id === sucursalId)?.nombre}
            </p>
          </div>
          <button onClick={descargarExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" />
            Descargar Excel
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origen</label>
            <select
              value={origenFiltro}
              onChange={(e) => setOrigenFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="todas">Todas</option>
              {SUCURSALES.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
            <select
              value={destinoFiltro}
              onChange={(e) => setDestinoFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="todas">Todas</option>
              {SUCURSALES.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="todos">Todos</option>
              <option value="completado">Completado</option>
              <option value="pendiente">Pendiente</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Métricas */}
      {metricas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-900">Total Traspasos</p>
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900">{metricas.totalTraslados}</p>
            <p className="text-xs text-blue-700 mt-1">{metricas.totalCompletados} completados, {metricas.totalPendientes} pendientes</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-green-900">Valor Trasladado</p>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-900">${metricas.valorTotal.toLocaleString()}</p>
            <p className="text-xs text-green-700 mt-1">A precio de costo</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-purple-900">Más Envía</p>
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm font-bold text-purple-900 truncate">{metricas.sucursalMasEnvia?.sucursal || "N/A"}</p>
            <p className="text-xs text-purple-700 mt-1">${metricas.sucursalMasEnvia?.salidas.toLocaleString() || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-amber-900">Más Recibe</p>
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-sm font-bold text-amber-900 truncate">{metricas.sucursalMasRecibe?.sucursal || "N/A"}</p>
            <p className="text-xs text-amber-700 mt-1">${metricas.sucursalMasRecibe?.entradas.toLocaleString() || 0}</p>
          </div>
        </div>
      )}

      {/* Gráfica de flujo */}
      {flujoData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Análisis de Flujo por Sucursal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={flujoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sucursal" />
              <YAxis label={{ value: "Valor ($)", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="salidas" fill="#ef4444" name="Salidas" />
              <Bar dataKey="entradas" fill="#10b981" name="Entradas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Historial de Traspasos</h3>
          <p className="text-sm text-gray-600 mt-1">Mostrando {listaFiltrada.length} traspasos</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origen</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destino</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Productos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {listaFiltrada.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(t.fecha).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{t.folio || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.descripcion || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.sucursalOrigenNombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.sucursalDestinoNombre}</td>
                  <td className="px-4 py-3 text-sm text-right">{t.productosDetalle?.length || 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">${t.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      t.estado === "completado" ? "bg-green-100 text-green-800" :
                      t.estado === "pendiente" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {t.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <button
                      onClick={() => setTrasladoSeleccionado(t)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalle */}
      {trasladoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">Detalle del Traspaso</h3>
              <button onClick={() => setTrasladoSeleccionado(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Folio</p>
                  <p className="font-semibold">{trasladoSeleccionado.folio || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha</p>
                  <p className="font-semibold">{new Date(trasladoSeleccionado.fecha).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Origen</p>
                  <p className="font-semibold">{trasladoSeleccionado.sucursalOrigenNombre}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Destino</p>
                  <p className="font-semibold">{trasladoSeleccionado.sucursalDestinoNombre}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Descripción</p>
                  <p className="font-semibold">{trasladoSeleccionado.descripcion || "-"}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold mb-2">Productos</p>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Cantidad</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">P. Unitario</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {trasladoSeleccionado.productosDetalle?.map((p: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-sm">{p.nombreProducto}</td>
                        <td className="px-3 py-2 text-sm text-right">{p.cantidad}</td>
                        <td className="px-3 py-2 text-sm text-right">${p.precioUnitario?.toLocaleString() || 0}</td>
                        <td className="px-3 py-2 text-sm text-right font-semibold">${((p.cantidad || 0) * (p.precioUnitario || 0)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-sm font-semibold text-right">Total:</td>
                      <td className="px-3 py-2 text-sm font-bold text-right">${trasladoSeleccionado.total.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
