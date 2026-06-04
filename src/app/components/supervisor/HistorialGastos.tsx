import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Download, Plus, Eye, Edit, Trash2, MoreVertical } from "lucide-react";
import { SUCURSALES, User } from "../../shared";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import GastoDetallesModal from "./GastoDetallesModal";
import EditarGastoModal from "./EditarGastoModal";
import * as XLSX from "xlsx";

interface HistorialGastosProps {
  user: User;
  selectedSucursal: string;
  refreshTrigger?: number;
  onNavigateToAddGasto?: () => void;
}

export default function HistorialGastos({ 
  user, 
  selectedSucursal, 
  refreshTrigger, 
  onNavigateToAddGasto 
}: HistorialGastosProps) {
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGastoDetalle, setSelectedGastoDetalle] = useState<any>(null);
  const [selectedGastoEdit, setSelectedGastoEdit] = useState<any>(null);
  const [gastoToDelete, setGastoToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [motivoEliminacion, setMotivoEliminacion] = useState("");
  
  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState("todos");

  const CATEGORIAS_GASTOS = [
    "Retiros administrativos",
    "Insumos de limpieza",
    "Rollos",
    "Publicidad",
    "Donaciones",
    "Comida",
    "Transporte",
    "Insumos de Papelería",
    "Otros"
  ];

  const sucursal = SUCURSALES.find((s) => s.id === selectedSucursal);

  useEffect(() => {
    fetchGastos();
  }, [refreshTrigger]);

  const fetchGastos = async () => {
    setLoading(true);
    try {
      console.log("🔍 Obteniendo gastos del backend...");
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/gastos`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );

      const data = await response.json();
      console.log("📥 Respuesta del backend:", data);

      if (!response.ok) {
        throw new Error(data.error || "Error al cargar gastos");
      }

      console.log("✅ Gastos recibidos:", data.gastos?.length || 0);
      setGastos(data.gastos || []);
    } catch (error: any) {
      console.error("❌ Error al cargar gastos:", error);
      toast.error(error.message || "Error al cargar los gastos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!gastoToDelete) return;

    if (!motivoEliminacion.trim()) {
      toast.error("Debes proporcionar un motivo de eliminación");
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/gastos/${gastoToDelete.id}`,
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
        throw new Error(data.error || "Error al eliminar gasto");
      }

      toast.success("Gasto eliminado exitosamente");
      setGastoToDelete(null);
      setMotivoEliminacion("");
      fetchGastos();
    } catch (error: any) {
      console.error("Error al eliminar gasto:", error);
      toast.error(error.message || "Error al eliminar el gasto");
    } finally {
      setDeleting(false);
    }
  };

  const exportToExcel = () => {
    if (gastosFiltrados.length === 0) {
      toast.error("No hay gastos para exportar");
      return;
    }

    const dataToExport = gastosFiltrados.map((gasto) => ({
      Fecha: new Date(gasto.fecha).toLocaleDateString("es-MX"),
      Categoría: gasto.categoria,
      Sucursal: SUCURSALES.find((s) => s.id === gasto.sucursalId)?.nombre || gasto.sucursalId,
      Monto: `$${(gasto.monto || 0).toFixed(2)}`,
      Descripción: gasto.nota,
      "Creado Por": gasto.creadoPorNombre || gasto.creadoPor,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gastos");
    XLSX.writeFile(wb, `Gastos_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Exportación exitosa");
  };

  // Filtrar gastos
  const gastosFiltrados = gastos.filter((gasto) => {
    const pasaSucursal = selectedSucursal === "todas" ? true : gasto.sucursalId === selectedSucursal;
    const pasaCategoria = filtroCategoria === "todos" ? true : gasto.categoria === filtroCategoria;
    return pasaSucursal && pasaCategoria;
  });

  // Calcular total de gastos filtrados
  const totalGastos = gastosFiltrados.reduce((sum, gasto) => sum + (gasto.monto || 0), 0);

  const canDelete = user.role === "administrador" || user.role === "gerente";

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h3 className="font-bold text-xl mb-4">
          Historial de Gastos - {selectedSucursal === "todas" ? "Todas las Sucursales" : sucursal?.nombre}
        </h3>

        {/* Filtro por categoría */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por categoría:</label>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="todos">Todas las categorías</option>
            {CATEGORIAS_GASTOS.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {onNavigateToAddGasto && selectedSucursal !== "todas" && (
          <button
            onClick={onNavigateToAddGasto}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Agregar Gasto
          </button>
        )}
      </div>

      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            Mostrando {gastosFiltrados.length} de {gastos.length} gastos
          </p>
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar a Excel
          </button>
        </div>

        {/* Resumen */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-800">Total de Gastos:</p>
              <p className="text-2xl font-bold text-blue-900">
                ${totalGastos.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-800">Cantidad de Registros:</p>
              <p className="text-2xl font-bold text-blue-900">{gastosFiltrados.length}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado Por</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {gastosFiltrados.map((gasto) => (
                <tr key={gasto.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(gasto.fecha).toLocaleDateString("es-MX")}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                      {gasto.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">
                      {SUCURSALES.find((s) => s.id === gasto.sucursalId)?.nombre || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-red-600">
                    -${(gasto.monto || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {gasto.creadoPorNombre || gasto.creadoPor}
                  </td>
                  <td className="px-6 py-4 text-sm text-center relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === gasto.id ? null : gasto.id)}
                      className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {openDropdown === gasto.id && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <button
                          onClick={() => {
                            setSelectedGastoDetalle(gasto);
                            setOpenDropdown(null);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Detalles del gasto
                        </button>

                        <button
                          onClick={() => {
                            setSelectedGastoEdit(gasto);
                            setOpenDropdown(null);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                          Editar Gasto
                        </button>

                        {canDelete && (
                          <button
                            onClick={() => {
                              setGastoToDelete(gasto);
                              setOpenDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                            Eliminar gasto
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {gastosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay gastos registrados</p>
          </div>
        )}
      </div>

      {/* Modal Detalles */}
      {selectedGastoDetalle && (
        <GastoDetallesModal
          gasto={selectedGastoDetalle}
          onClose={() => setSelectedGastoDetalle(null)}
        />
      )}

      {/* Modal Editar */}
      {selectedGastoEdit && (
        <EditarGastoModal
          gasto={selectedGastoEdit}
          onClose={() => setSelectedGastoEdit(null)}
          onSuccess={() => {
            setSelectedGastoEdit(null);
            fetchGastos();
          }}
        />
      )}

      {/* Modal Confirmar Eliminación */}
      {gastoToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Eliminación</h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar este gasto?
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">
                <strong>Categoría:</strong> {gastoToDelete.categoria}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Monto:</strong> ${(gastoToDelete.monto || 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Fecha:</strong> {new Date(gastoToDelete.fecha).toLocaleDateString("es-MX")}
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de eliminación:
              </label>
              <input
                type="text"
                value={motivoEliminacion}
                onChange={(e) => setMotivoEliminacion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Escribe el motivo de eliminación"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setGastoToDelete(null);
                  setMotivoEliminacion("");
                }}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
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