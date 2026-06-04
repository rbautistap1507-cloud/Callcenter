import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import { Download, Users, TrendingUp, AlertTriangle, X, Eye } from "lucide-react";
import * as XLSX from "xlsx";

interface ReportePersonalProps {
  sucursalId?: string;
  todasLasSucursales?: boolean;
  onVolver: () => void;
}

export default function ReportePersonal({ sucursalId, todasLasSucursales = false, onVolver }: ReportePersonalProps) {
  const [cargando, setCargando] = useState(true);
  const [personal, setPersonal] = useState<any[]>([]);
  const [devolucionesModal, setDevolucionesModal] = useState<any>(null);
  const [detalleModal, setDetalleModal] = useState<any>(null);
  const [tipoDetalle, setTipoDetalle] = useState<"farmaceutico" | "medico">("farmaceutico");
  const [fechaInicio, setFechaInicio] = useState(() => {
    const f = new Date(); f.setMonth(f.getMonth() - 1);
    return f.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => { cargarDatos(); }, [fechaInicio, fechaFin, sucursalId]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
      let query = sb.from("perfiles").select("*").in("rol", ["farmaceutico", "medico"]);
      if (!todasLasSucursales && sucursalId) query = query.eq("sucursal_id", sucursalId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const mapped = (data || []).map((p: any) => ({
        id: p.id,
        name: p.nombre_completo,
        username: p.usuario,
        role: p.rol,
        sucursalId: p.sucursal_id,
        activo: p.activo,
        ventasCount: 0,
        ventasTotal: 0,
        ticketPromedio: 0,
        devolucionesCount: 0,
        consultasCount: 0,
        consultasTotal: 0,
        recetasCount: 0,
        recetasMontoGenerado: 0,
      }));
      setPersonal(mapped);
    } catch (error) {
      toast.error("Error al cargar reporte de personal");
    } finally {
      setCargando(false);
    }
  };

  const metodoPagoLabel: Record<string, string> = {
    efectivo: "Efectivo", tarjeta: "Tarjeta",
    transferencia: "Transferencia", dividido: "Pago Dividido",
  };

  const descargarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(personal.map(p => ({
      Nombre: p.name || p.username,
      Rol: p.role,
      Sucursal: SUCURSALES.find(s => s.id === p.sucursalId)?.nombre || "-",
      "Ventas Realizadas": p.ventasCount,
      "Total Vendido": p.ventasTotal,
      "Ticket Promedio": p.ticketPromedio?.toFixed(2),
      "Devoluciones": p.devolucionesCount,
      "Consultas Atendidas": p.consultasCount,
      "Total Consultas": p.consultasTotal,
      "Recetas Generadas": p.recetasCount,
      "Monto Recetas Generado": p.recetasMontoGenerado,
      "Monto Recetas Vendido": p.recetasMontoVendido,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Personal");
    XLSX.writeFile(wb, "reporte-personal.xlsx");
    toast.success("Excel descargado");
  };

  const descargarDetalleExcel = () => {
    if (!detalleModal) return;
    const wb = XLSX.utils.book_new();

    if (tipoDetalle === "farmaceutico") {
      const wsData = [
        ["Fecha", "Productos", "Total", "Método de Pago", "Sucursal"],
        ...(detalleModal.ventasDetalle || []).map((v: any) => [
          v.fecha ? new Date(v.fecha).toLocaleString("es-MX") : "-",
          (v.productos || []).map((p: any) => `${p.nombre} x${p.cantidad}`).join(", "),
          v.total || 0,
          metodoPagoLabel[v.metodoPago] || v.metodoPago,
          SUCURSALES.find(s => s.id === v.sucursalId)?.nombre || v.sucursalId,
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Ventas");
      XLSX.writeFile(wb, `detalle-${detalleModal.name || detalleModal.username}.xlsx`);
    } else {
      // Hoja resumen
      const wsResumen = XLSX.utils.aoa_to_sheet([
        ["Resumen del Médico"],
        ["Nombre", detalleModal.name || detalleModal.username],
        ["Sucursal", SUCURSALES.find((s: any) => s.id === detalleModal.sucursalId)?.nombre || "-"],
        [],
        ["Consultas Atendidas", detalleModal.consultasCount],
        ["Total Servicios", detalleModal.consultasTotal],
        ["Monto Recetas Generado", detalleModal.recetasMontoGenerado || 0],
        ["Monto Vendido por Recetas", detalleModal.recetasMontoVendido || 0],
      ]);
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

      // Hoja consultas
      const wsConsultas = XLSX.utils.aoa_to_sheet([
        ["Fecha", "Paciente", "Servicio", "Monto", "Estado"],
        ...(detalleModal.consultasDetalle || []).map((c: any) => [
          c.fecha ? new Date(c.fecha).toLocaleString("es-MX") : "-",
          c.nombrePaciente || "-",
          c.servicio || "-",
          c.monto || 0,
          c.estado || "-",
        ]),
      ]);
      XLSX.utils.book_append_sheet(wb, wsConsultas, "Consultas");

      // Hoja recetas
      const wsRecetas = XLSX.utils.aoa_to_sheet([
        ["Fecha", "Código", "Paciente", "Medicamento", "Cantidad", "Precio Unit.", "Subtotal", "Monto Total Receta"],
        ...(detalleModal.recetasDetalle || []).flatMap((r: any) =>
          (r.medicamentos || []).map((med: any, idx: number) => [
            idx === 0 ? (r.fecha ? new Date(r.fecha).toLocaleString("es-MX") : "-") : "",
            idx === 0 ? r.codigo : "",
            idx === 0 ? r.paciente : "",
            med.nombre,
            med.cantidad || 0,
            med.precio || 0,
            ((med.precio || 0) * (med.cantidad || 0)),
            idx === 0 ? (r.montoTotal || 0) : "",
          ])
        ),
      ]);
      XLSX.utils.book_append_sheet(wb, wsRecetas, "Recetas");

      XLSX.writeFile(wb, `detalle-${detalleModal.name || detalleModal.username}.xlsx`);
    }
    toast.success("Excel descargado");
  };

  if (cargando) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  const farmaceuticos = personal.filter(p => p.role === "farmaceutico");
  const medicos = personal.filter(p => p.role === "medico");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button onClick={onVolver} className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 block">
              ← Volver a reportes
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Reporte de Personal</h2>
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

      {/* Farmacéuticos */}
      {farmaceuticos.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Farmacéuticos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Nombre", "Sucursal", "Ventas", "Total Vendido", "Ticket Promedio", "Devoluciones", "Detalle"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {farmaceuticos.sort((a, b) => b.ventasTotal - a.ventasTotal).map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name || p.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {SUCURSALES.find(s => s.id === p.sucursalId)?.nombre || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                        {p.ventasCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      ${p.ventasTotal.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      ${p.ticketPromedio?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {p.devolucionesCount > 0 ? (
                        <button
                          onClick={() => setDevolucionesModal(p)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-800 font-semibold"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
                            {p.devolucionesCount}
                          </span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin devoluciones</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => { setDetalleModal(p); setTipoDetalle("farmaceutico"); }}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-xs">Ver detalle</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Médicos */}
      {medicos.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-bold text-gray-900">Médicos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Nombre", "Sucursal", "Consultas", "Total Servicios", "Recetas", "Monto Receta", "Monto Vendido", "Detalle"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {medicos.sort((a, b) => b.consultasCount - a.consultasCount).map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name || p.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {SUCURSALES.find(s => s.id === p.sucursalId)?.nombre || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded-full text-xs font-semibold">
                        {p.consultasCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-teal-600">
                      ${p.consultasTotal.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold">
                        {p.recetasCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-purple-600">
                      ${(p.recetasMontoGenerado || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      ${(p.recetasMontoVendido || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => { setDetalleModal(p); setTipoDetalle("medico"); }}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-xs">Ver detalle</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Detalle Farmacéutico */}
      {detalleModal && tipoDetalle === "farmaceutico" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
            <div className="p-6 border-b bg-blue-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Detalle de Ventas — {detalleModal.name || detalleModal.username}
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  {detalleModal.ventasCount} venta(s) · Total: ${detalleModal.ventasTotal.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={descargarDetalleExcel}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  <Download className="w-4 h-4" /> Excel
                </button>
                <button onClick={() => setDetalleModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              {(!detalleModal.ventasDetalle || detalleModal.ventasDetalle.length === 0) ? (
                <p className="text-center text-gray-500 py-8">No hay ventas en el período seleccionado</p>
              ) : (
                <div className="space-y-3">
                  {detalleModal.ventasDetalle
                    .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                    .map((v: any, i: number) => (
                    <div key={i} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs text-gray-500">
                            {v.fecha ? new Date(v.fecha).toLocaleString("es-MX") : "-"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {SUCURSALES.find(s => s.id === v.sucursalId)?.nombre || v.sucursalId}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">${(v.total || 0).toFixed(2)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            v.metodoPago === "efectivo" ? "bg-green-100 text-green-800" :
                            v.metodoPago === "tarjeta" ? "bg-blue-100 text-blue-800" :
                            v.metodoPago === "transferencia" ? "bg-purple-100 text-purple-800" :
                            "bg-orange-100 text-orange-800"
                          }`}>
                            {metodoPagoLabel[v.metodoPago] || v.metodoPago}
                          </span>
                        </div>
                      </div>
                      {v.productos && v.productos.length > 0 && (
                        <div className="space-y-1">
                          {v.productos.map((prod: any, j: number) => (
                            <div key={j} className="flex justify-between text-xs bg-gray-50 rounded px-3 py-1.5">
                              <span className="text-gray-700">{prod.nombre} <span className="text-gray-400">x{prod.cantidad}</span></span>
                              <span className="font-semibold text-gray-900">
                                ${((prod.precio || 0) * (prod.cantidad || 0)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Médico */}
      {/* Modal Detalle Médico */}
{detalleModal && tipoDetalle === "medico" && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
      <div className="p-6 border-b bg-teal-50 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-teal-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Detalle — {detalleModal.name || detalleModal.username}
          </h3>
          <p className="text-sm text-teal-700 mt-1">
            {detalleModal.consultasCount} consulta(s) · {detalleModal.recetasCount} receta(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={descargarDetalleExcel}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={() => setDetalleModal(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-6 space-y-6">

        {/* Consultas */}
        <div>
          <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full text-xs font-semibold">
              {detalleModal.consultasCount}
            </span>
            Consultas Atendidas
          </h4>
          {(!detalleModal.consultasDetalle || detalleModal.consultasDetalle.length === 0) ? (
            <p className="text-sm text-gray-400">Sin consultas en el período</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Fecha", "Paciente", "Servicio", "Monto", "Estado"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {detalleModal.consultasDetalle
                    .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                    .map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {c.fecha ? new Date(c.fecha).toLocaleString("es-MX") : "-"}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">{c.nombrePaciente || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{c.servicio || "-"}</td>
                      <td className="px-3 py-2 font-semibold text-teal-600">${(c.monto || 0).toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.estado === "atendida" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {c.estado === "atendida" ? "Atendida" : "Pendiente"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recetas */}
        <div>
          <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-semibold">
              {detalleModal.recetasCount}
            </span>
            Recetas Generadas
          </h4>
          {(!detalleModal.recetasDetalle || detalleModal.recetasDetalle.length === 0) ? (
            <p className="text-sm text-gray-400">Sin recetas en el período</p>
          ) : (
            <div className="space-y-3">
              {detalleModal.recetasDetalle
                .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                .map((r: any, i: number) => (
                <div key={i} className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs font-mono text-purple-700 font-semibold">{r.codigo}</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        Paciente: {r.paciente}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.fecha ? new Date(r.fecha).toLocaleString("es-MX") : "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Monto receta</p>
                      <p className="text-lg font-bold text-purple-600">
                        ${(r.montoTotal || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {r.medicamentos && r.medicamentos.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Medicamentos recetados:</p>
                      <div className="space-y-1">
                        {r.medicamentos.map((med: any, j: number) => (
                          <div key={j} className="flex justify-between items-center bg-white rounded px-3 py-1.5 text-xs border border-purple-100">
                            <div>
                              <span className="font-medium text-gray-800">{med.nombre}</span>
                              {med.dosis && <span className="text-gray-500 ml-2">— {med.dosis}</span>}
                            </div>
                            <div className="text-right">
                              <span className="text-gray-600">x{med.cantidad}</span>
                              {med.precio > 0 && (
                                <span className="ml-2 font-semibold text-purple-600">
                                  ${((med.precio || 0) * (med.cantidad || 0)).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  </div>
)}
      {/* Modal de Devoluciones */}
      {devolucionesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b bg-red-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Devoluciones — {devolucionesModal.name || devolucionesModal.username}
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {devolucionesModal.devolucionesCount} devolución(es) registrada(s)
                </p>
              </div>
              <button onClick={() => setDevolucionesModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {devolucionesModal.devolucionesDetalle.map((dev: any, i: number) => (
                <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Devolución #{i + 1}</p>
                      <p className="text-xs text-gray-500">{dev.fecha ? new Date(dev.fecha).toLocaleString("es-MX") : "-"}</p>
                      <p className="text-xs text-gray-500">Sucursal: {SUCURSALES.find(s => s.id === dev.sucursalId)?.nombre || dev.sucursalId}</p>
                    </div>
                    <span className="text-lg font-bold text-red-600">${(dev.monto || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-white rounded-lg p-3 mb-3 border border-red-100">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Motivo:</p>
                    <p className="text-sm text-gray-900">{dev.motivo || "Sin motivo registrado"}</p>
                  </div>
                  {dev.productos && dev.productos.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Productos devueltos:</p>
                      <div className="space-y-1">
                        {dev.productos.map((prod: any, j: number) => (
                          <div key={j} className="flex justify-between text-xs bg-white rounded p-2 border border-red-100">
                            <span className="text-gray-800">{prod.nombre} x{prod.cantidad}</span>
                            <span className="font-semibold text-red-600">${((prod.precio || 0) * (prod.cantidad || 0)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}