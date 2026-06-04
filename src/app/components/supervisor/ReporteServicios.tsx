import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { SUCURSALES } from "../../shared";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { inicioDiaCDMX, finDiaCDMX } from "/utils/timezone";
import { supabase } from "/utils/supabase/client";
import {
  ArrowLeft, Download, Search, Calendar, Building, Filter,
  ChevronDown, ChevronUp, User, Stethoscope, DollarSign,
  Clock, CheckCircle, XCircle, AlertCircle,
} from "lucide-react";

interface ReporteServiciosProps {
  sucursalId: string;
  todasLasSucursales: boolean;
  onVolver: () => void;
}

const TIPOS_SERVICIO: Record<string, string> = {
  consulta: "Consulta Médica",
  inyeccion: "Aplicación de Inyección",
  presion: "Toma de Presión",
  glucemia: "Toma de Glucemia",
  certificado: "Certificado Médico Laboral",
  "certificado-escolar": "Certificado Médico Escolar",
  "lavado-otico": "Lavado Ótico",
  "revision-diu": "Revisión o Retiro de DIU",
  "colocacion-diu": "Colocación o Cambio de DIU",
  "retiro-implante": "Retiro de Implante",
  "retiro-puntos": "Retiro de Puntos",
  sutura: "Sutura Básica",
  "cambio-sonda": "Cambio de Sonda",
  "curacion-menor": "Curación Menor",
  "curacion-mayor": "Curación Mayor",
  "otros-servicios": "Otros Servicios",
  Consulta: "Consulta Médica",
  "Aplicación de Inyección": "Aplicación de Inyección",
  "Toma de Presión": "Toma de Presión",
  "Toma de Glucemia": "Toma de Glucemia",
};

export default function ReporteServicios({ sucursalId, todasLasSucursales, onVolver }: ReporteServiciosProps) {
  const [loading, setLoading] = useState(true);
  const [servicios, setServicios] = useState<any[]>([]);
  const [medicos, setMedicos] = useState<Record<string, string>>({});
  const [farmaceuticos, setFarmaceuticos] = useState<Record<string, string>>({});
  const [expandedServicio, setExpandedServicio] = useState<string | null>(null);

  // Filtros
  const [fechaInicio, setFechaInicio] = useState(
    new Date(new Date().setDate(1)).toISOString().split("T")[0]
  );
  const [fechaFin, setFechaFin] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [filtroSucursal, setFiltroSucursal] = useState(
    todasLasSucursales ? "todas" : sucursalId
  );
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [searchPaciente, setSearchPaciente] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar consultas y servicios simples
      const [consRes, servRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/consultas`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/servicios-medicos`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
      ]);

      const [consData, servData] = await Promise.all([consRes.json(), servRes.json()]);

      // Combinar consultas + servicios simples
      const consultas = (consData.consultas || []).map((c: any) => ({
        id: c.id,
        tipo: c.servicio || "Consulta",
        paciente: c.nombrePaciente || "Sin nombre",
        fecha: c.fecha,
        estado: c.estado || "pendiente",
        sucursalId: c.sucursalId,
        medicoId: c.medicoId,
        farmaceuticoId: c.farmaceuticoId,
        monto: c.monto || 0,
        fechaAtencion: c.fechaAtencion,
        motivoCancelacion: c.motivoCancelacion,
        fuente: "consulta",
      }));

      const serviciosSimples = (servData.servicios || []).map((s: any) => ({
        id: s.id || `srv-${Math.random()}`,
        tipo: s.tipo || "otros-servicios",
        paciente: s.paciente || "Sin nombre",
        fecha: s.fecha,
        estado: "atendido",
        sucursalId: s.sucursalId,
        medicoId: s.medicoId,
        farmaceuticoId: s.farmaceuticoId,
        monto: s.monto || 0,
        detalles: s.detalles,
        fuente: "servicio",
      }));

      setServicios([...consultas, ...serviciosSimples]);

      // Cargar médicos y farmacéuticos desde Supabase
      const { data: perfiles } = await supabase
        .from("perfiles")
        .select("id, nombre_completo, rol");

      const medicosMap: Record<string, string> = {};
      const farmacMap: Record<string, string> = {};
      (perfiles || []).forEach((p: any) => {
        if (p.rol === "medico") medicosMap[p.id] = p.nombre_completo;
        if (p.rol === "farmaceutico") farmacMap[p.id] = p.nombre_completo;
      });
      setMedicos(medicosMap);
      setFarmaceuticos(farmacMap);
    } catch (error) {
      console.error("Error cargando servicios:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar servicios
  const serviciosFiltrados = servicios.filter((s) => {
    const fecha = new Date(s.fecha);
    const inicio = new Date(inicioDiaCDMX(fechaInicio));
    const fin = new Date(finDiaCDMX(fechaFin));
    if (fecha < inicio || fecha > fin) return false;
    if (filtroSucursal !== "todas" && s.sucursalId !== filtroSucursal) return false;
    if (filtroEstado !== "todos" && s.estado !== filtroEstado) return false;
    if (searchPaciente && !(s.paciente || "").toLowerCase().includes(searchPaciente.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  // KPIs
  const totalServicios = serviciosFiltrados.length;
  const totalAtendidos = serviciosFiltrados.filter(s => s.estado === "atendida" || s.estado === "atendido").length;
  const totalCancelados = serviciosFiltrados.filter(s => s.estado === "cancelado").length;
  const totalMonto = serviciosFiltrados.reduce((sum, s) => sum + (s.monto || 0), 0);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "atendida":
      case "atendido":
        return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold"><CheckCircle className="w-3 h-3" />Atendido</span>;
      case "pendiente":
        return <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold"><Clock className="w-3 h-3" />Pendiente</span>;
      case "cancelado":
        return <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold"><XCircle className="w-3 h-3" />Cancelado</span>;
      default:
        return <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold"><AlertCircle className="w-3 h-3" />{estado}</span>;
    }
  };

  const handleExportar = () => {
    const data = serviciosFiltrados.map((s) => ({
      Fecha: new Date(s.fecha).toLocaleDateString("es-MX"),
      Paciente: s.paciente,
      "Tipo de Servicio": TIPOS_SERVICIO[s.tipo] || s.tipo,
      Estado: s.estado,
      Médico: medicos[s.medicoId] || "N/A",
      Farmacéutico: farmaceuticos[s.farmaceuticoId] || "N/A",
      Sucursal: SUCURSALES.find(suc => suc.id === s.sucursalId)?.nombre || s.sucursalId,
      Monto: s.monto || 0,
      "Motivo Cancelación": s.motivoCancelacion || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Servicios");
    XLSX.writeFile(wb, `Reporte_Servicios_${fechaInicio}_${fechaFin}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando reporte de servicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button onClick={onVolver} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-2">
              <ArrowLeft className="w-4 h-4" />Volver a reportes
            </button>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Stethoscope className="w-7 h-7 text-teal-600" />
              Reporte de Servicios Médicos
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {todasLasSucursales ? "Todas las Sucursales" : SUCURSALES.find(s => s.id === sucursalId)?.nombre}
            </p>
          </div>
          <button onClick={handleExportar} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" />Exportar Excel
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />Fecha Inicio
            </label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />Fecha Fin
            </label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          {todasLasSucursales && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                <Building className="w-3 h-3" />Sucursal
              </label>
              <select value={filtroSucursal} onChange={e => setFiltroSucursal(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="todas">Todas</option>
                {SUCURSALES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />Estado
            </label>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
              <option value="todos">Todos</option>
              <option value="atendida">Atendido</option>
              <option value="pendiente">Pendiente</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Search className="w-3 h-3" />Buscar Paciente
            </label>
            <input type="text" value={searchPaciente} onChange={e => setSearchPaciente(e.target.value)}
              placeholder="Nombre del paciente..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-teal-500">
          <p className="text-xs text-gray-500 mb-1">Total Servicios</p>
          <p className="text-2xl font-bold text-teal-600">{totalServicios}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-xs text-gray-500 mb-1">Atendidos</p>
          <p className="text-2xl font-bold text-green-600">{totalAtendidos}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-xs text-gray-500 mb-1">Cancelados</p>
          <p className="text-2xl font-bold text-red-600">{totalCancelados}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-xs text-gray-500 mb-1">Total Cobrado</p>
          <p className="text-2xl font-bold text-blue-600">${totalMonto.toFixed(2)}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{serviciosFiltrados.length}</span> registros encontrados
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sucursal</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {serviciosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No se encontraron servicios en el período seleccionado</p>
                  </td>
                </tr>
              ) : (
                serviciosFiltrados.map((s, i) => (
                  <>
                    <tr key={s.id || i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(s.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{s.paciente}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {TIPOS_SERVICIO[s.tipo] || s.tipo}
                      </td>
                      <td className="px-4 py-3 text-sm">{getEstadoBadge(s.estado)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {SUCURSALES.find(suc => suc.id === s.sucursalId)?.nombre || s.sucursalId || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setExpandedServicio(expandedServicio === (s.id || i.toString()) ? null : (s.id || i.toString()))}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors text-xs font-medium"
                        >
                          {expandedServicio === (s.id || i.toString()) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {expandedServicio === (s.id || i.toString()) ? "Ocultar" : "Ver"}
                        </button>
                      </td>
                    </tr>
                    {expandedServicio === (s.id || i.toString()) && (
                      <tr key={`detail-${s.id || i}`} className="bg-teal-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="flex items-start gap-2">
                              <Stethoscope className="w-4 h-4 text-teal-500 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase">Médico</p>
                                <p className="text-sm font-medium text-gray-800">
                                  {medicos[s.medicoId] || "No asignado"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <User className="w-4 h-4 text-teal-500 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase">Farmacéutico</p>
                                <p className="text-sm font-medium text-gray-800">
                                  {farmaceuticos[s.farmaceuticoId] || "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <DollarSign className="w-4 h-4 text-teal-500 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase">Monto</p>
                                <p className="text-sm font-bold text-teal-600">${(s.monto || 0).toFixed(2)}</p>
                              </div>
                            </div>
                            {s.fechaAtencion && (
                              <div className="flex items-start gap-2">
                                <Clock className="w-4 h-4 text-teal-500 mt-0.5" />
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase">Fecha Atención</p>
                                  <p className="text-sm text-gray-800">
                                    {new Date(s.fechaAtencion).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                            )}
                            {s.detalles && Object.keys(s.detalles).length > 0 && (
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-teal-500 mt-0.5" />
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase">Detalles del Servicio</p>
                                  {Object.entries(s.detalles).map(([k, v]) => (
                                    <p key={k} className="text-sm text-gray-800">{String(v)}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                            {s.motivoCancelacion && (
                              <div className="flex items-start gap-2 md:col-span-2">
                                <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                                <div>
                                  <p className="text-xs font-semibold text-red-500 uppercase">Motivo de Cancelación</p>
                                  <p className="text-sm text-red-700 font-medium">{s.motivoCancelacion}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
