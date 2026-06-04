import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, Edit, Trash2, Download, Plus, ArrowRightLeft, Package } from "lucide-react";
import { SUCURSALES, User } from "../../shared";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import TrasladoDetallesModal from "./TrasladoDetallesModal";
import EditarTrasladoModal from "./EditarTrasladoModal";
import * as XLSX from "xlsx";

interface HistorialTrasladosProps {
  user: User;
  selectedSucursal: string;
  refreshTrigger?: number;
  onNavigateToAddTraslado?: () => void;
  onNavigateToAddTrasladoMasivo?: () => void;
}

export default function HistorialTraslados({ 
  user, 
  selectedSucursal, 
  refreshTrigger, 
  onNavigateToAddTraslado,
  onNavigateToAddTrasladoMasivo 
}: HistorialTrasladosProps) {
  const [traslados, setTraslados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrasladoDetalle, setSelectedTrasladoDetalle] = useState<any>(null);
  const [selectedTrasladoEdit, setSelectedTrasladoEdit] = useState<any>(null);
  const [trasladoToDelete, setTrasladoToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [motivoEliminacion, setMotivoEliminacion] = useState("");
  
  // Filtros
  const [filtroEstado, setFiltroEstado] = useState("");

  const ESTADOS = ["pendiente", "completado"];

  useEffect(() => {
    fetchTraslados();
  }, [refreshTrigger]);

  const fetchTraslados = async () => {
    setLoading(true);
    try {
      console.log("🔍 Obteniendo traslados del backend...");
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/traslados`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );

      const data = await response.json();
      console.log("📥 Respuesta del backend:", data);

      if (!response.ok) {
        throw new Error(data.error || "Error al cargar traslados");
      }

      console.log("✅ Traslados recibidos:", data.traslados?.length || 0);
      
      // Debug: Revisar formato de fecha de los traslados
      if (data.traslados && data.traslados.length > 0) {
        console.log("🔍 Ejemplo de traslado (para debug de fecha):", {
          fecha: data.traslados[0].fecha,
          fechaType: typeof data.traslados[0].fecha,
          fechaParsed: data.traslados[0].fecha ? new Date(data.traslados[0].fecha) : null
        });
      }
      
      setTraslados(data.traslados || []);
    } catch (error: any) {
      console.error("❌ Error al cargar traslados:", error);
      toast.error(error.message || "Error al cargar los traslados");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!trasladoToDelete) return;

    if (!motivoEliminacion.trim()) {
      toast.error("Debes proporcionar un motivo de eliminación");
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/traslados/${trasladoToDelete.id}`,
        {
          method: "DELETE",
          headers: { 
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ motivo: motivoEliminacion }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar traslado");
      }

      toast.success("Traslado eliminado exitosamente");
      setTrasladoToDelete(null);
      setMotivoEliminacion("");
      fetchTraslados();
    } catch (error: any) {
      console.error("Error eliminando traslado:", error);
      toast.error(error.message || "Error al eliminar el traslado");
    } finally {
      setDeleting(false);
    }
  };

  const handleCompletarTraslado = async (trasladoId: string) => {
    try {
      toast.info("Completando traslado y actualizando inventario...");
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/traslados/${trasladoId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            estado: "completado",
            editadoPor: user.email,
            editadoPorNombre: user.nombre || user.name,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al completar traslado");
      }

      toast.success("✅ Traslado completado e inventario actualizado");
      setSelectedTrasladoDetalle(null);
      fetchTraslados();
    } catch (error: any) {
      console.error("Error completando traslado:", error);
      toast.error(error.message || "Error al completar el traslado");
    }
  };

  const handleCancelarTraslado = async (trasladoId: string) => {
    try {
      toast.info("Cancelando traslado...");
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/traslados/${trasladoId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            estado: "cancelado",
            editadoPor: user.email,
            editadoPorNombre: user.nombre || user.name,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al cancelar traslado");
      }

      toast.success("Traslado cancelado exitosamente");
      setSelectedTrasladoDetalle(null);
      fetchTraslados();
    } catch (error: any) {
      console.error("Error cancelando traslado:", error);
      toast.error(error.message || "Error al cancelar el traslado");
    }
  };

  const exportToExcel = () => {
    const dataToExport = trasladosFiltrados.map((traslado) => {
      // Manejo robusto de fecha
      const fecha = traslado.fecha ? new Date(traslado.fecha) : null;
      const fechaValida = fecha && !isNaN(fecha.getTime());
      
      // Calcular total dinámicamente si no existe o es 0
      let totalCalculado = parseFloat(traslado.total || 0);
      if (totalCalculado === 0 && Array.isArray(traslado.productos) && traslado.productos.length > 0) {
        totalCalculado = traslado.productos.reduce((sum: number, item: any) => {
          const cantidad = parseFloat(item.cantidad || 0);
          const precioUnitario = parseFloat(item.precioUnitario || 0);
          return sum + (cantidad * precioUnitario);
        }, 0);
      }
      
      return {
        Fecha: fechaValida ? fecha.toLocaleDateString("es-MX") : "N/A",
        Descripción: traslado.descripcion,
        "De Sucursal": SUCURSALES.find((s) => s.id === traslado.sucursalOrigenId)?.nombre || traslado.sucursalOrigenId,
        "Para Sucursal": SUCURSALES.find((s) => s.id === traslado.sucursalDestinoId)?.nombre || traslado.sucursalDestinoId,
        Total: `$${totalCalculado.toFixed(2)}`,
        Estado: traslado.estado === "completado" ? "Completado" : "Pendiente",
        "Creado Por": traslado.creadoPorNombre || traslado.creadoPor,
        "Productos": traslado.productos?.length || 0,
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Traslados");
    XLSX.writeFile(wb, `Traslados_${new Date().toLocaleDateString("es-MX")}.xlsx`);
    toast.success("Excel exportado exitosamente");
  };

  // Filtrar traslados
  const trasladosFiltrados = traslados.filter((traslado) => {
    // Filtro por sucursal seleccionada (origen o destino)
    if (selectedSucursal !== "todas") {
      if (traslado.sucursalOrigenId !== selectedSucursal && traslado.sucursalDestinoId !== selectedSucursal) {
        return false;
      }
    }

    // Filtro por estado
    if (filtroEstado && traslado.estado !== filtroEstado) {
      return false;
    }

    return true;
  });

  // Calcular total de traslados filtrados con recálculo dinámico
  const totalTraslados = trasladosFiltrados.reduce((sum, traslado) => {
    let totalCalculado = parseFloat(traslado.total || 0);
    
    // Si el total es 0, calcular dinámicamente desde los productos
    if (totalCalculado === 0 && Array.isArray(traslado.productos) && traslado.productos.length > 0) {
      totalCalculado = traslado.productos.reduce((sumProd: number, item: any) => {
        const cantidad = parseFloat(item.cantidad || 0);
        const precioUnitario = parseFloat(item.precioUnitario || 0);
        return sumProd + (cantidad * precioUnitario);
      }, 0);
    }
    
    return sum + totalCalculado;
  }, 0);

  const canDelete = user.role === "administrador" || user.role === "gerente";
  const canViewDetails = user.role === "supervisor" || user.role === "gerente" || user.role === "administrador";

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Historial de Traslados</h2>
          <p className="text-gray-600 mt-1">Consulta y administra todos los traslados entre sucursales</p>
        </div>
        <div className="flex gap-2">
          {onNavigateToAddTraslado && selectedSucursal !== "todas" && (
            <button
              onClick={onNavigateToAddTraslado}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar Individual
            </button>
          )}
          {onNavigateToAddTrasladoMasivo && selectedSucursal !== "todas" && (
            <button
              onClick={onNavigateToAddTrasladoMasivo}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              <Package className="w-4 h-4" />
              Agregar Masivo
            </button>
          )}
          <button
            onClick={exportToExcel}
            disabled={trasladosFiltrados.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar a Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Estado */}
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado === "completado" ? "Completado" : "Pendiente"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-blue-800">Total de traslados:</p>
            <p className="text-2xl font-bold text-blue-900">
              ${totalTraslados.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-800">Cantidad de registros:</p>
            <p className="text-2xl font-bold text-blue-900">{trasladosFiltrados.length}</p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando traslados...</div>
        ) : trasladosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron traslados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    De Sucursal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Para Sucursal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trasladosFiltrados.map((traslado) => {
                  // Manejo robusto de fecha para cada fila
                  const fecha = traslado.fecha ? new Date(traslado.fecha) : null;
                  const fechaValida = fecha && !isNaN(fecha.getTime());
                  
                  // Calcular total dinámicamente si no existe o es 0
                  let totalCalculado = parseFloat(traslado.total || 0);
                  if (totalCalculado === 0 && Array.isArray(traslado.productos) && traslado.productos.length > 0) {
                    totalCalculado = traslado.productos.reduce((sum: number, item: any) => {
                      const cantidad = parseFloat(item.cantidad || 0);
                      const precioUnitario = parseFloat(item.precioUnitario || 0);
                      return sum + (cantidad * precioUnitario);
                    }, 0);
                  }
                  
                  return (
                    <tr key={traslado.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fechaValida ? (
                          fecha.toLocaleDateString("es-MX", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        ) : (
                          <span className="text-gray-400">Sin fecha</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate">{traslado.descripcion}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {SUCURSALES.find((s) => s.id === traslado.sucursalOrigenId)?.nombre || traslado.sucursalOrigenId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                          {SUCURSALES.find((s) => s.id === traslado.sucursalDestinoId)?.nombre || traslado.sucursalDestinoId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${totalCalculado.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            traslado.estado === "completado"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {traslado.estado === "completado" ? "Completado" : "Pendiente"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {canViewDetails && (
                            <button
                              onClick={() => setSelectedTrasladoDetalle(traslado)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedTrasladoEdit(traslado)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Editar traslado"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => setTrasladoToDelete(traslado)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Eliminar traslado"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detalles */}
      {selectedTrasladoDetalle && (
        <TrasladoDetallesModal
          traslado={selectedTrasladoDetalle}
          onClose={() => setSelectedTrasladoDetalle(null)}
          onCompletar={() => handleCompletarTraslado(selectedTrasladoDetalle.id)}
          onCancelar={() => handleCancelarTraslado(selectedTrasladoDetalle.id)}
        />
      )}

      {/* Modal Editar */}
      {selectedTrasladoEdit && (
        <EditarTrasladoModal
          traslado={selectedTrasladoEdit}
          user={user}
          onClose={() => setSelectedTrasladoEdit(null)}
          onSuccess={() => {
            setSelectedTrasladoEdit(null);
            fetchTraslados();
          }}
        />
      )}

      {/* Modal Confirmación Eliminar */}
      {trasladoToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Eliminación</h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar este traslado? Esta acción no se puede deshacer.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Motivo de eliminación:</label>
              <input
                type="text"
                value={motivoEliminacion}
                onChange={(e) => setMotivoEliminacion(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Escribe el motivo de eliminación"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setTrasladoToDelete(null);
                  setMotivoEliminacion("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}