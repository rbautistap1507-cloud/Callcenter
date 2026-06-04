import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import {
  Stethoscope,
  Calendar,
  Clock,
  Check,
  Download,
  RefreshCw,
  DollarSign,
  Users,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ServiciosMedicosViewProps {
  selectedSucursal: string;
}

const TIPOS_SERVICIO: Record<string, { color: string; bg: string }> = {
  "Consulta": { color: "text-teal-700", bg: "bg-teal-50 border-teal-200" },
  "Aplicación de Inyección": { color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  "Toma de Presión": { color: "text-red-700", bg: "bg-red-50 border-red-200" },
  "Toma de Glucemia": { color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  "Certificado Médico Laboral": { color: "text-green-700", bg: "bg-green-50 border-green-200" },
  "Lavado Ótico": { color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-200" },
  "Sutura Básica": { color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  "Curación Menor": { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  "Curación Mayor": { color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
};

export default function ServiciosMedicosView({ selectedSucursal }: ServiciosMedicosViewProps) {
  const [consultas, setConsultas] = useState<any[]>([]);
  const [medicos, setMedicos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Filtros
  const [filtroFecha, setFiltroFecha] = useState<"hoy" | "semana" | "mes" | "rango">("hoy");
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split("T")[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split("T")[0]);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendiente" | "atendida">("todos");
  const [filtroServicio, setFiltroServicio] = useState("todos");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showFiltros, setShowFiltros] = useState(false);

  useEffect(() => {
    loadConsultas();
    loadMedicos();

    const interval = setInterval(loadConsultas, 15000); // refresh cada 15s
    return () => clearInterval(interval);
  }, [selectedSucursal]);

  const loadMedicos = async () => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/medicos`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await res.json();
      if (data.success) setMedicos(data.medicos || []);
    } catch (e) {
      console.error("Error cargando médicos:", e);
    }
  };

  const loadConsultas = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/consultas`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await res.json();
      if (data.success) {
        setConsultas(data.consultas || []);
      }
    } catch (e) {
      console.error("Error cargando consultas:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarAtendida = async (consultaId: string) => {
    setMarkingId(consultaId);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/consultas/${consultaId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ estado: "atendida" }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Servicio marcado como atendido");
        loadConsultas();
      } else {
        toast.error(data.error || "Error al actualizar servicio");
      }
    } catch (e) {
      console.error("Error marcando consulta:", e);
      toast.error("Error al actualizar servicio");
    } finally {
      setMarkingId(null);
    }
  };

  // Filtrar por rango de fecha
  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    switch (filtroFecha) {
      case "hoy": {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case "semana": {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      }
      case "mes": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end: now };
      }
      case "rango": {
        const start = new Date(fechaInicio + "T00:00:00");
        const end = new Date(fechaFin + "T23:59:59");
        return { start, end };
      }
    }
  };

  const { start: dateStart, end: dateEnd } = getDateRange();

  const consultasFiltradas = consultas.filter((c) => {
    const fecha = new Date(c.fecha);
    if (fecha < dateStart || fecha > dateEnd) return false;
    if (selectedSucursal !== "todas" && c.sucursalId !== selectedSucursal) return false;
    if (filtroEstado !== "todos" && c.estado !== filtroEstado) return false;
    if (filtroServicio !== "todos" && c.servicio !== filtroServicio) return false;
    return true;
  });

  // Stats
  const totalPendientes = consultasFiltradas.filter((c) => c.estado === "pendiente").length;
  const totalAtendidas = consultasFiltradas.filter((c) => c.estado === "atendida").length;
  const totalMonto = consultasFiltradas.reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0);

  // Tipos de servicio únicos
  const tiposServicio = [...new Set(consultas.map((c) => c.servicio).filter(Boolean))];

  const getMedicoNombre = (medicoId: string) => {
    const medico = medicos.find((m) => m.id === medicoId);
    return medico ? `Dr(a). ${medico.nombre}` : null;
  };

  const exportToExcel = () => {
    if (consultasFiltradas.length === 0) {
      toast.error("No hay registros para exportar");
      return;
    }
    const rows = consultasFiltradas.map((c) => ({
      Fecha: new Date(c.fecha).toLocaleString("es-MX"),
      Paciente: c.nombrePaciente,
      Servicio: c.servicio,
      Médico: getMedicoNombre(c.medicoId) || "N/A",
      Sucursal: SUCURSALES.find((s) => s.id === c.sucursalId)?.nombre || c.sucursalId,
      Monto: `$${(parseFloat(c.monto) || 0).toFixed(2)}`,
      Estado: c.estado === "atendida" ? "Atendida" : "Pendiente",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Servicios Médicos");
    XLSX.writeFile(wb, `Servicios_Medicos_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Exportado exitosamente");
  };

  const sucursal = SUCURSALES.find((s) => s.id === selectedSucursal);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Stethoscope className="w-7 h-7" />
              Servicios Médicos
            </h2>
            <p className="text-teal-100 text-sm mt-1">
              {selectedSucursal === "todas" ? "Todas las Sucursales" : sucursal?.nombre} ·{" "}
              {filtroFecha === "hoy"
                ? "Hoy"
                : filtroFecha === "semana"
                ? "Últimos 7 días"
                : filtroFecha === "mes"
                ? "Este mes"
                : `${fechaInicio} → ${fechaFin}`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={loadConsultas}
              disabled={loading}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Servicios</p>
              <p className="text-2xl font-bold text-gray-800">{consultasFiltradas.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pendientes</p>
              <p className="text-2xl font-bold text-amber-700">{totalPendientes}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-green-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Atendidas</p>
              <p className="text-2xl font-bold text-green-700">{totalAtendidas}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-purple-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Facturado</p>
              <p className="text-2xl font-bold text-purple-700">${totalMonto.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <button
          onClick={() => setShowFiltros(!showFiltros)}
          className="w-full flex items-center justify-between p-4 text-gray-700 hover:bg-gray-50 transition-colors rounded-xl"
        >
          <span className="flex items-center gap-2 font-semibold text-sm">
            <Filter className="w-4 h-4" />
            Filtros y Búsqueda
          </span>
          {showFiltros ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFiltros && (
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Filtro Fecha */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                  Período
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["hoy", "semana", "mes", "rango"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFiltroFecha(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        filtroFecha === f
                          ? "bg-teal-600 text-white shadow"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {f === "hoy" ? "Hoy" : f === "semana" ? "7 días" : f === "mes" ? "Mes" : "Rango"}
                    </button>
                  ))}
                </div>
                {filtroFecha === "rango" && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="flex-1 px-2 py-1.5 border rounded-lg text-xs"
                    />
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="flex-1 px-2 py-1.5 border rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Filtro Estado */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                  Estado
                </label>
                <div className="flex gap-2">
                  {(["todos", "pendiente", "atendida"] as const).map((e) => (
                    <button
                      key={e}
                      onClick={() => setFiltroEstado(e)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        filtroEstado === e
                          ? e === "pendiente"
                            ? "bg-amber-500 text-white shadow"
                            : e === "atendida"
                            ? "bg-green-600 text-white shadow"
                            : "bg-gray-700 text-white shadow"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {e === "todos" ? "Todos" : e === "pendiente" ? "Pendiente" : "Atendida"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro Tipo de Servicio */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                  Tipo de Servicio
                </label>
                <select
                  value={filtroServicio}
                  onChange={(e) => setFiltroServicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="todos">Todos los servicios</option>
                  {tiposServicio.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de Servicios */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">
            Registros de Servicios ({consultasFiltradas.length})
          </h3>
          {totalPendientes > 0 && (
            <span className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg font-semibold">
              <AlertCircle className="w-4 h-4" />
              {totalPendientes} pendiente{totalPendientes !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-500" />
            <p>Cargando servicios...</p>
          </div>
        ) : consultasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold">No hay servicios en este período</p>
            <p className="text-sm mt-1">Ajusta los filtros o espera nuevos registros</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {consultasFiltradas
              .slice()
              .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
              .map((consulta) => {
                const esAtendida = consulta.estado === "atendida";
                const tipoStyle =
                  TIPOS_SERVICIO[consulta.servicio] ||
                  { color: "text-gray-700", bg: "bg-gray-50 border-gray-200" };
                const medicoNombre = getMedicoNombre(consulta.medicoId);
                const sucursalNombre =
                  SUCURSALES.find((s) => s.id === consulta.sucursalId)?.nombre || consulta.sucursalId;
                const isExpanded = expandedRow === consulta.id;

                return (
                  <div key={consulta.id} className={`transition-colors ${esAtendida ? "bg-white" : "bg-amber-50/30"}`}>
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedRow(isExpanded ? null : consulta.id)}
                    >
                      {/* Estado badge */}
                      <div
                        className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${
                          esAtendida ? "bg-green-500" : "bg-amber-400"
                        }`}
                      />

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900 truncate">
                            {consulta.nombrePaciente}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${tipoStyle.bg} ${tipoStyle.color}`}
                          >
                            {consulta.servicio}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(consulta.fecha).toLocaleTimeString("es-MX", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {selectedSucursal === "todas" && (
                            <span className="flex items-center gap-1">🏥 {sucursalNombre}</span>
                          )}
                          {medicoNombre && (
                            <span className="flex items-center gap-1">
                              <Stethoscope className="w-3 h-3" />
                              {medicoNombre}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Monto */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-teal-700 text-lg">
                          ${(parseFloat(consulta.monto) || 0).toFixed(2)}
                        </p>
                        <p
                          className={`text-xs font-semibold ${
                            esAtendida ? "text-green-600" : "text-amber-600"
                          }`}
                        >
                          {esAtendida ? "✓ Atendida" : "⏳ Pendiente"}
                        </p>
                      </div>

                      {/* Expand icon */}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50">
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Paciente</p>
                            <p className="font-semibold text-gray-800">{consulta.nombrePaciente}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Servicio</p>
                            <p className="font-semibold text-gray-800">{consulta.servicio}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Fecha y Hora</p>
                            <p className="font-semibold text-gray-800">
                              {new Date(consulta.fecha).toLocaleString("es-MX")}
                            </p>
                          </div>
                          {medicoNombre && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Médico</p>
                              <p className="font-semibold text-gray-800">{medicoNombre}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Sucursal</p>
                            <p className="font-semibold text-gray-800">{sucursalNombre}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Monto</p>
                            <p className="font-bold text-teal-700 text-base">
                              ${(parseFloat(consulta.monto) || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {!esAtendida && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarcarAtendida(consulta.id);
                            }}
                            disabled={markingId === consulta.id}
                            className="mt-4 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            {markingId === consulta.id ? "Procesando..." : "Marcar como Atendida"}
                          </button>
                        )}
                        {esAtendida && (
                          <div className="mt-3 flex items-center gap-2 text-green-600 text-sm font-semibold">
                            <Check className="w-4 h-4" />
                            Servicio completado
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Footer con totales */}
        {consultasFiltradas.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{consultasFiltradas.length}</span> servicios ·{" "}
              <span className="text-amber-600 font-semibold">{totalPendientes} pendientes</span> ·{" "}
              <span className="text-green-600 font-semibold">{totalAtendidas} atendidas</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Facturado</p>
              <p className="text-xl font-bold text-teal-700">${totalMonto.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Resumen por tipo de servicio */}
      {consultasFiltradas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            Resumen por Tipo de Servicio
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tiposServicio
              .filter((tipo) => {
                if (filtroServicio !== "todos" && tipo !== filtroServicio) return false;
                return consultasFiltradas.some((c) => c.servicio === tipo);
              })
              .map((tipo) => {
                const deEsteType = consultasFiltradas.filter((c) => c.servicio === tipo);
                const montoTipo = deEsteType.reduce(
                  (sum, c) => sum + (parseFloat(c.monto) || 0),
                  0
                );
                const pendientesTipo = deEsteType.filter((c) => c.estado === "pendiente").length;
                const tipoStyle =
                  TIPOS_SERVICIO[tipo] || { color: "text-gray-700", bg: "bg-gray-50 border-gray-200" };

                return (
                  <div
                    key={tipo}
                    className={`p-4 rounded-lg border ${tipoStyle.bg} flex justify-between items-center`}
                  >
                    <div>
                      <p className={`font-semibold text-sm ${tipoStyle.color}`}>{tipo}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {deEsteType.length} registro{deEsteType.length !== 1 ? "s" : ""}
                        {pendientesTipo > 0 && (
                          <span className="text-amber-600 font-semibold ml-2">
                            · {pendientesTipo} pend.
                          </span>
                        )}
                      </p>
                    </div>
                    <p className={`text-lg font-bold ${tipoStyle.color}`}>${montoTipo.toFixed(2)}</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
