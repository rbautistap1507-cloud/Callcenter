import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import { Download, DollarSign, TrendingUp, CreditCard, Eye, X, Search } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import {
  inicioDiaCDMX,
  finDiaCDMX,
  hoyCDMX,
  hoyCDMXMenosDias,
  hoyCDMXMenosMeses,
  formatearFechaHoraCDMX,
  horaCDMX,
} from "/utils/timezone";

interface ReporteVentasProps {
  sucursalId?: string;
  todasLasSucursales?: boolean;
  onVolver: () => void;
}

export default function ReporteVentas({ sucursalId, todasLasSucursales = false, onVolver }: ReporteVentasProps) {
  const [cargando, setCargando] = useState(true);

  const [rangoFecha, setRangoFecha] = useState("mes");
  const [fechaInicio, setFechaInicio] = useState(() => hoyCDMXMenosMeses(1));
  const [fechaFin, setFechaFin] = useState(() => hoyCDMX());
  const [metodoPagoFiltro, setMetodoPagoFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");

  const [ventas, setVentas] = useState<any[]>([]);
  const [metricas, setMetricas] = useState<any>(null);
  const [ventasPorHora, setVentasPorHora] = useState<any[]>([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<any>(null);

  useEffect(() => {
    cargarDatos();
  }, [fechaInicio, fechaFin, sucursalId]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Convertir el rango local (CDMX) elegido por el usuario a su equivalente UTC.
      // Así "29 de mayo" filtra desde medianoche CDMX (06:00Z) hasta 23:59:59 CDMX (05:59:59Z del día siguiente).
      const params = new URLSearchParams({
        fechaInicio: inicioDiaCDMX(fechaInicio),
        fechaFin: finDiaCDMX(fechaFin),
        todas: todasLasSucursales.toString(),
      });

      if (!todasLasSucursales && sucursalId) {
        params.append("sucursal", sucursalId);
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/api/reportes/ventas?${params}`,
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
    const { ventas: ventasData = [] } = data || {};

    const ventasEnriquecidas = ventasData.map((v: any) => ({
      ...v,
      sucursalNombre: SUCURSALES.find(s => s.id === v.sucursalId)?.nombre || v.sucursalId,
    }));

    setVentas(ventasEnriquecidas);

    // Métricas
    const devoluciones = ventasEnriquecidas.filter((v: any) => v.estado === "devuelto");
    const ventasActivas = ventasEnriquecidas.filter((v: any) => v.estado !== "devuelto");
    const totalTickets = ventasActivas.length;
    const montoTotal = ventasActivas.reduce((sum: number, v: any) => sum + (v.total || 0), 0);
    const ticketPromedio = totalTickets > 0 ? montoTotal / totalTickets : 0;
    const porMetodo: any = {};
    const montoDevoluciones = devoluciones.reduce((sum: number, v: any) => sum + (v.total || 0), 0);
    ventasActivas.forEach((v: any) => {
      const metodo = v.forma_pago || "Efectivo";
      if (!porMetodo[metodo]) porMetodo[metodo] = 0;
      porMetodo[metodo] += v.total || 0;
    });
    const ventasNetas = montoTotal - montoDevoluciones;

    setMetricas({
      totalTickets,
      montoTotal,
      ticketPromedio,
      porMetodo,
      montoDevoluciones,
      cantidadDevoluciones: devoluciones.length,
      ventasNetas,
    });

    // Ventas por hora (en horario CDMX)
    const ventasPorHoraMap: any = {};
    for (let i = 0; i < 24; i++) {
      ventasPorHoraMap[i] = { hora: `${i}:00`, monto: 0, tickets: 0 };
    }

    ventasEnriquecidas.forEach((v: any) => {
      const hora = horaCDMX(v.fecha);
      ventasPorHoraMap[hora].monto += v.total || 0;
      ventasPorHoraMap[hora].tickets += 1;
    });

    setVentasPorHora(Object.values(ventasPorHoraMap).filter((h: any) => h.monto > 0));
  };

  const ventasFiltradas = () => {
    return ventas.filter((v) => {
      const cumpleMetodo = metodoPagoFiltro === "todos" || v.forma_pago === metodoPagoFiltro;
      const cumpleEstado = estadoFiltro === "todas" || v.estado === estadoFiltro;
      const cumpleBusqueda = !busqueda || v.folio?.toLowerCase().includes(busqueda.toLowerCase());
      return cumpleMetodo && cumpleEstado && cumpleBusqueda;
    });
  };

  const aplicarAtajoFecha = (atajo: string) => {
    if (atajo === "hoy") {
      setFechaInicio(hoyCDMX());
      setFechaFin(hoyCDMX());
    } else if (atajo === "semana") {
      setFechaInicio(hoyCDMXMenosDias(7));
      setFechaFin(hoyCDMX());
    } else if (atajo === "mes") {
      setFechaInicio(hoyCDMXMenosMeses(1));
      setFechaFin(hoyCDMX());
    }
    setRangoFecha(atajo);
  };

  const descargarExcel = () => {
    const wb = XLSX.utils.book_new();
    const lista = ventasFiltradas();

    const wsData = [
      ["Fecha/Hora", "Folio", "Sucursal", "Farmacéutico", "Método de Pago", "Subtotal", "Descuento", "Total", "Estado"],
      ...lista.map((v) => [
        formatearFechaHoraCDMX(v.fecha),
        v.folio || "-",
        v.sucursalNombre,
        v.usuario || v.farmaceutico || "-",
        v.forma_pago || "Efectivo",
        v.subtotal || 0,
        v.descuento || 0,
        v.total || 0,
        v.estado || "completado",
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, "reporte-ventas.xlsx");
    toast.success("Excel descargado");
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const listaFiltrada = ventasFiltradas();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button onClick={onVolver} className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 block">← Volver a reportes</button>
            <h2 className="text-2xl font-bold text-gray-900">Reporte de Ventas</h2>
            <p className="text-sm text-gray-600 mt-1">
              {todasLasSucursales ? "Todas las Sucursales" : SUCURSALES.find((s) => s.id === sucursalId)?.nombre}
            </p>
          </div>
          <button onClick={descargarExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" />
            Descargar Excel
          </button>
        </div>

        {/* Atajos y filtros */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => aplicarAtajoFecha("hoy")}
              className={`px-3 py-1 rounded-lg text-sm ${rangoFecha === "hoy" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            >
              Hoy
            </button>
            <button
              onClick={() => aplicarAtajoFecha("semana")}
              className={`px-3 py-1 rounded-lg text-sm ${rangoFecha === "semana" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => aplicarAtajoFecha("mes")}
              className={`px-3 py-1 rounded-lg text-sm ${rangoFecha === "mes" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            >
              Este Mes
            </button>
            <button
              onClick={() => setRangoFecha("personalizado")}
              className={`px-3 py-1 rounded-lg text-sm ${rangoFecha === "personalizado" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            >
              Personalizado
            </button>
          </div>

          {rangoFecha === "personalizado" && (
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                <select
                  value={metodoPagoFiltro}
                  onChange={(e) => setMetodoPagoFiltro(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="todos">Todos</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Pago Dividido">Pago Dividido</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="todas">Todas</option>
                  <option value="completado">Completadas</option>
                  <option value="devuelto">Devueltas</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Folio</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Folio..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Métricas */}
      {metricas && (() => {
        const filtradas = ventasFiltradas();
        const devolucionesFiltradas = filtradas.filter((v) => v.estado === "devuelto");
        const activasFiltradas = filtradas.filter((v) => v.estado !== "devuelto");
        const montoTotalFiltrado = activasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0);
        const montoDevolFiltrado = devolucionesFiltradas.reduce((sum, v) => sum + (v.total || 0), 0);
        const ticketPromedioFiltrado = activasFiltradas.length > 0 ? montoTotalFiltrado / activasFiltradas.length : 0;
        const ventasNetasFiltradas = montoTotalFiltrado - montoDevolFiltrado;
        return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-900">Total Ventas</p>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900">${montoTotalFiltrado.toLocaleString()}</p>
            <p className="text-xs text-blue-700 mt-1">{activasFiltradas.length} tickets</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-green-900">Ticket Promedio</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-900">${ticketPromedioFiltrado.toFixed(2)}</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-red-900">Devoluciones</p>
              <CreditCard className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-900">${montoDevolFiltrado.toLocaleString()}</p>
            <p className="text-xs text-red-700 mt-1">{devolucionesFiltradas.length} tickets</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-purple-900">Ventas Netas</p>
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-900">${ventasNetasFiltradas.toLocaleString()}</p>
          </div>
        </div>
        );
      })()}
      {/* Gráfica horarios pico */}
      {ventasPorHora.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Ventas por Hora del Día</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ventasPorHora}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hora" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="monto" stroke="#3b82f6" name="Monto" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla de ventas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Historial de Ventas</h3>
          <p className="text-sm text-gray-600 mt-1">Mostrando {listaFiltrada.length} ventas</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha/Hora</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sucursal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método de Pago</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {listaFiltrada.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{formatearFechaHoraCDMX(v.fecha)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.folio || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{v.sucursalNombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{v.forma_pago || "Efectivo"}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">${v.total?.toLocaleString() || 0}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      v.estado === "devuelto" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                    }`}>
                      {v.estado || "completado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <button
                      onClick={() => setVentaSeleccionada(v)}
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
      {ventaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">Detalle de Venta</h3>
              <button onClick={() => setVentaSeleccionada(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Folio</p>
                  <p className="font-semibold">{ventaSeleccionada.folio || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha</p>
                  <p className="font-semibold">{formatearFechaHoraCDMX(ventaSeleccionada.fecha)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sucursal</p>
                  <p className="font-semibold">{ventaSeleccionada.sucursalNombre}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Método de Pago</p>
                  <p className="font-semibold">{ventaSeleccionada.forma_pago || "Efectivo"}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold mb-2">Productos</p>
                <div className="space-y-2">
                  {ventaSeleccionada.productos?.map((p: any, idx: number) => (
                    <div key={idx} className="flex justify-between bg-gray-50 p-2 rounded">
                      <span>{p.nombre} x{p.cantidad}</span>
                      <span className="font-semibold">${((p.cantidad || 0) * (p.precio || 0)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${ventaSeleccionada.subtotal?.toLocaleString() || 0}</span>
                </div>
                {ventaSeleccionada.descuento > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuento:</span>
                    <span className="font-semibold">-${ventaSeleccionada.descuento?.toLocaleString() || 0}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${ventaSeleccionada.total?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
