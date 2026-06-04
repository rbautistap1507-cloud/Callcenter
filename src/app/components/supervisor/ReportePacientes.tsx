import { supabase } from "/utils/supabase/client";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { SUCURSALES } from "../../shared";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { inicioDiaCDMX, finDiaCDMX } from "/utils/timezone";
import {
  Users,
  Search,
  Download,
  ArrowLeft,
  Stethoscope,
  Building,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";

interface ReportePacientesProps {
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
};

export default function ReportePacientes({
  sucursalId,
  todasLasSucursales,
  onVolver,
}: ReportePacientesProps) {
  const [loading, setLoading] = useState(true);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [serviciosMedicos, setServiciosMedicos] = useState<any[]>([]);
  const [medicos, setMedicos] = useState<any[]>([]);

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
  const [filtroTipoServicio, setFiltroTipoServicio] = useState("todos");
  const [filtroMedico, setFiltroMedico] = useState("todos");
  const [searchPaciente, setSearchPaciente] = useState("");
  const [expandedSucursal, setExpandedSucursal] = useState<string | null>(null);
  const [pestanaActiva, setPestanaActiva] = useState<"resumen" | "servicios" | "detalle">("resumen");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pacRes, servRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/pacientes`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/consultas`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
      ]);

      const [pacData, servData] = await Promise.all([pacRes.json(), servRes.json()]);

      if (pacData.success) setPacientes(pacData.pacientes || []);
      if (servData.success) setServiciosMedicos(servData.consultas || servData.servicios || []);

      // Cargar médicos desde Supabase
      const { data: perfiles } = await supabase
        .from("perfiles")
        .select("id, nombre_completo")
        .eq("rol", "medico");

      const medicosMap: Record<string, string> = {};
      (perfiles || []).forEach((m: any) => {
        medicosMap[m.id] = m.nombre_completo;
      });

      // También extraer de servicios médicos como fallback
      (servData.servicios || []).forEach((s: any) => {
        if (s.medicoId && s.medicoNombre && !medicosMap[s.medicoId]) {
          medicosMap[s.medicoId] = s.medicoNombre;
        }
      });

      setMedicos(Object.entries(medicosMap).map(([id, nombre]) => ({ id, nombre })));
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar servicios según los filtros activos
  const serviciosFiltrados = serviciosMedicos.filter((s) => {
    const fecha = new Date(s.fecha);
    const inicio = new Date(inicioDiaCDMX(fechaInicio));
    const fin = new Date(finDiaCDMX(fechaFin));
    if (fecha < inicio || fecha > fin) return false;
    if (filtroSucursal !== "todas" && s.sucursalId !== filtroSucursal) return false;
    if (filtroTipoServicio !== "todos" && s.tipo !== filtroTipoServicio) return false;
    if (filtroMedico !== "todos" && s.medicoId !== filtroMedico) return false;
    if (searchPaciente && !(s.paciente || "").toLowerCase().includes(searchPaciente.toLowerCase())) return false;
    return true;
  });

  // Pacientes filtrados (consultas médicas con receta)
  const pacientesFiltrados = pacientes.filter((p) => {
    const fecha = new Date(p.fecha || p.createdAt || Date.now());
    const inicio = new Date(inicioDiaCDMX(fechaInicio));
    const fin = new Date(finDiaCDMX(fechaFin));
    if (fecha < inicio || fecha > fin) return false;
    if (filtroSucursal !== "todas" && p.sucursalId !== filtroSucursal) return false;
    if (filtroMedico !== "todos" && p.medicoId !== filtroMedico) return false;
    if (searchPaciente && !(p.nombre || "").toLowerCase().includes(searchPaciente.toLowerCase())) return false;
    return true;
  });

  // Resumen por sucursal
  const resumenPorSucursal = SUCURSALES.map((suc) => {
    const serviciosSuc = serviciosFiltrados.filter((s) => s.sucursalId === suc.id);
    const pacientesSuc = pacientesFiltrados.filter((p) => p.sucursalId === suc.id);
    const totalAtendidos = new Set([
      ...serviciosSuc.map((s) => s.paciente),
      ...pacientesSuc.map((p) => p.nombre),
    ]).size;

    return {
      sucursal: suc,
      totalServicios: serviciosSuc.length,
      totalConsultas: pacientesSuc.length,
      totalAtendidos,
    };
  }).filter((r) => filtroSucursal === "todas" || r.sucursal.id === filtroSucursal);

  const totalGeneral = {
    servicios: serviciosFiltrados.length,
    consultas: pacientesFiltrados.length,
    atendidos: new Set([
      ...serviciosFiltrados.map((s) => s.paciente),
      ...pacientesFiltrados.map((p) => p.nombre),
    ]).size,
  };

  // Desglose por tipo de servicio
  const desgloseTipos: Record<string, number> = {};
  serviciosFiltrados.forEach((s) => {
    const tipo = s.tipo || "otros-servicios";
    desgloseTipos[tipo] = (desgloseTipos[tipo] || 0) + 1;
  });
  // Agregar consultas médicas
  desgloseTipos["consulta"] = (desgloseTipos["consulta"] || 0) + pacientesFiltrados.length;

  const totalTipos = Object.values(desgloseTipos).reduce((a, b) => a + b, 0);

  // Lista detallada combinada
  const listaDetallada = [
    ...serviciosFiltrados.map((s) => ({
      paciente: s.paciente || s.nombrePaciente || "Sin nombre",
      tipo: s.tipo || s.servicio || "otros-servicios",
      medicoId: s.medicoId,
      medicoNombre: medicos.find((m) => m.id === s.medicoId)?.nombre || s.medicoNombre || "N/A",
      sucursalId: s.sucursalId,
      fecha: s.fecha,
    })),
    ...pacientesFiltrados.map((p) => ({
      paciente: p.nombre || "Sin nombre",
      tipo: "consulta",
      medicoId: p.medicoId,
      medicoNombre: medicos.find((m) => m.id === p.medicoId)?.nombre || p.medicoNombre || p.medicoId || "N/A",
      sucursalId: p.sucursalId,
      fecha: p.fecha || p.createdAt,
    })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const handleExportarExcel = () => {
    const dataExport = listaDetallada.map((item) => ({
      Fecha: new Date(item.fecha).toLocaleDateString("es-MX"),
      Paciente: item.paciente,
      "Tipo de Servicio": TIPOS_SERVICIO[item.tipo] || item.tipo,
      Médico: item.medicoNombre,
      Sucursal: SUCURSALES.find((s) => s.id === item.sucursalId)?.nombre || item.sucursalId,
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pacientes");
    XLSX.writeFile(wb, `Reporte_Pacientes_${fechaInicio}_${fechaFin}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando reporte de pacientes...</p>
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
            <button
              onClick={onVolver}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a reportes
            </button>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Stethoscope className="w-7 h-7 text-teal-600" />
              Reporte de Atención Médica
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {todasLasSucursales ? "Todas las Sucursales" : SUCURSALES.find((s) => s.id === sucursalId)?.nombre}
            </p>
          </div>
          <button
            onClick={handleExportarExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4 pt-4 border-t">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Fecha Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          {todasLasSucursales && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                <Building className="w-3 h-3" /> Sucursal
              </label>
              <select
                value={filtroSucursal}
                onChange={(e) => setFiltroSucursal(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="todas">Todas</option>
                {SUCURSALES.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Tipo de Servicio
            </label>
            <select
              value={filtroTipoServicio}
              onChange={(e) => setFiltroTipoServicio(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="todos">Todos</option>
              {Object.entries(TIPOS_SERVICIO).map(([id, nombre]) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Search className="w-3 h-3" /> Buscar Paciente
            </label>
            <input
              type="text"
              value={searchPaciente}
              onChange={(e) => setSearchPaciente(e.target.value)}
              placeholder="Nombre del paciente..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-500">
          <p className="text-sm text-gray-500 mb-1">Total Pacientes Atendidos</p>
          <p className="text-3xl font-bold text-teal-600">{totalGeneral.atendidos}</p>
          <p className="text-xs text-gray-400 mt-1">Pacientes únicos en el período</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 mb-1">Consultas Médicas</p>
          <p className="text-3xl font-bold text-blue-600">{totalGeneral.consultas}</p>
          <p className="text-xs text-gray-400 mt-1">Con receta médica generada</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm text-gray-500 mb-1">Otros Servicios</p>
          <p className="text-3xl font-bold text-purple-600">{totalGeneral.servicios}</p>
          <p className="text-xs text-gray-400 mt-1">Inyecciones, curaciones, etc.</p>
        </div>
      </div>

      {/* Pestañas */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b">
          {[
            { id: "resumen", label: "Resumen por Sucursal" },
            { id: "servicios", label: "Desglose por Servicio" },
            { id: "detalle", label: "Lista Detallada" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPestanaActiva(tab.id as any)}
              className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                pestanaActiva === tab.id
                  ? "border-teal-600 text-teal-600 bg-teal-50"
                  : "border-transparent text-gray-600 hover:text-teal-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* PESTAÑA: RESUMEN POR SUCURSAL */}
        {pestanaActiva === "resumen" && (
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sucursal</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pacientes Atendidos</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Consultas c/Receta</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Otros Servicios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {resumenPorSucursal.map((row) => (
                  <tr key={row.sucursal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-800">{row.sucursal.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-bold">
                        {row.totalAtendidos}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {row.totalConsultas}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {row.totalServicios}
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Fila de totales */}
                <tr className="bg-gray-100 font-bold">
                  <td className="px-4 py-3 text-gray-700">TOTAL</td>
                  <td className="px-4 py-3 text-center text-teal-700 text-lg">{totalGeneral.atendidos}</td>
                  <td className="px-4 py-3 text-center text-blue-700 text-lg">{totalGeneral.consultas}</td>
                  <td className="px-4 py-3 text-center text-purple-700 text-lg">{totalGeneral.servicios}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* PESTAÑA: DESGLOSE POR SERVICIO */}
        {pestanaActiva === "servicios" && (
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo de Servicio</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Porcentaje</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proporción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(desgloseTipos)
                  .sort(([, a], [, b]) => b - a)
                  .map(([tipo, cantidad]) => {
                    const porcentaje = totalTipos > 0 ? ((cantidad / totalTipos) * 100).toFixed(1) : "0";
                    return (
                      <tr key={tipo} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-800">
                            {TIPOS_SERVICIO[tipo] || tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-gray-700">{cantidad}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-teal-600 font-semibold">{porcentaje}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-teal-500 h-2 rounded-full transition-all"
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                <tr className="bg-gray-100 font-bold">
                  <td className="px-4 py-3 text-gray-700">TOTAL</td>
                  <td className="px-4 py-3 text-center text-gray-700 text-lg">{totalTipos}</td>
                  <td className="px-4 py-3 text-center text-gray-700">100%</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* PESTAÑA: LISTA DETALLADA */}
        {pestanaActiva === "detalle" && (
          <div>
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">{listaDetallada.length}</span> registros encontrados
              </p>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo de Servicio</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Médico</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sucursal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {listaDetallada.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No se encontraron registros en el período seleccionado</p>
                      </td>
                    </tr>
                  ) : (
                    listaDetallada.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(item.fecha).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {item.paciente}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.tipo === "consulta"
                              ? "bg-teal-100 text-teal-700"
                              : "bg-purple-100 text-purple-700"
                          }`}>
                            {TIPOS_SERVICIO[item.tipo] || item.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.medicoNombre}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {SUCURSALES.find((s) => s.id === item.sucursalId)?.nombre || item.sucursalId || "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
