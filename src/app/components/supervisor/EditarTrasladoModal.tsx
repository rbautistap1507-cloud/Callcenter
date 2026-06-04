import { useState } from "react";
import { X, Save } from "lucide-react";
import { toast } from "sonner";
import { SUCURSALES, User } from "../../shared";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

interface EditarTrasladoModalProps {
  traslado: any;
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditarTrasladoModal({
  traslado,
  user,
  onClose,
  onSuccess,
}: EditarTrasladoModalProps) {
  const [formData, setFormData] = useState({
    descripcion: traslado.descripcion || "",
    sucursalOrigenId: traslado.sucursalOrigenId || "",
    sucursalDestinoId: traslado.sucursalDestinoId || "",
    estado: traslado.estado || "pendiente",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.descripcion.trim()) {
      toast.error("La descripción es requerida");
      return;
    }

    if (!formData.sucursalOrigenId || !formData.sucursalDestinoId) {
      toast.error("Debes seleccionar ambas sucursales");
      return;
    }

    if (formData.sucursalOrigenId === formData.sucursalDestinoId) {
      toast.error("La sucursal de origen y destino no pueden ser iguales");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        descripcion: formData.descripcion.trim(),
        sucursalOrigenId: formData.sucursalOrigenId,
        sucursalDestinoId: formData.sucursalDestinoId,
        estado: formData.estado,
        productos: traslado.productos, // Mantenemos los productos originales
        total: traslado.total, // Mantenemos el total original
        editadoPor: user.email,
        editadoPorNombre: user.nombre,
      };

      console.log("📤 Actualizando traslado con ID:", traslado.id);
      console.log("📤 Payload:", payload);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/traslados/${traslado.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      console.log("📥 Respuesta del backend:", data);

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar el traslado");
      }

      toast.success("Traslado actualizado exitosamente");
      onSuccess();
    } catch (error: any) {
      console.error("❌ Error al actualizar traslado:", error);
      toast.error(error.message || "Error al actualizar el traslado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Editar Traslado</h2>
            <p className="text-sm text-gray-600 mt-1">Modifica la información del traslado</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descripción del traslado..."
                rows={3}
                required
              />
            </div>

            {/* Sucursales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  De Sucursal (Origen) <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.sucursalOrigenId}
                  onChange={(e) =>
                    setFormData({ ...formData, sucursalOrigenId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar sucursal...</option>
                  {SUCURSALES.map((suc) => (
                    <option key={suc.id} value={suc.id}>
                      {suc.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Para Sucursal (Destino) <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.sucursalDestinoId}
                  onChange={(e) =>
                    setFormData({ ...formData, sucursalDestinoId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar sucursal...</option>
                  {SUCURSALES.map((suc) => (
                    <option key={suc.id} value={suc.id}>
                      {suc.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.estado}
                onChange={(e) =>
                  setFormData({ ...formData, estado: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="pendiente">Pendiente</option>
                <option value="completado">Completado</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Cambiar el estado a "Completado" indica que el traslado ya fue recibido
              </p>
            </div>

            {/* Información de productos (solo lectura) */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">Productos</h3>
              <p className="text-sm text-gray-600">
                {traslado.productos?.length || 0} producto(s) - Total: ${(traslado.total || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Para modificar productos, debes crear un nuevo traslado
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}