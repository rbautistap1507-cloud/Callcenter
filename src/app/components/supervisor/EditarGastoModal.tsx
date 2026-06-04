import { useState } from "react";
import { toast } from "sonner";
import { X, Save, DollarSign, FileText } from "lucide-react";
import { SUCURSALES } from "../../shared";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

interface EditarGastoModalProps {
  gasto: any;
  onClose: () => void;
  onSuccess: () => void;
}

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

export default function EditarGastoModal({ gasto, onClose, onSuccess }: EditarGastoModalProps) {
  const [formData, setFormData] = useState({
    categoria: gasto.categoria,
    sucursalId: gasto.sucursalId,
    monto: (gasto.monto || 0).toString(),
    nota: gasto.nota
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.categoria || !formData.sucursalId || !formData.monto || !formData.nota.trim()) {
      toast.error("Por favor, completa todos los campos");
      return;
    }

    const montoNum = parseFloat(formData.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error("El monto debe ser un número positivo");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/gastos/${gasto.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            categoria: formData.categoria,
            sucursalId: formData.sucursalId,
            monto: montoNum,
            nota: formData.nota.trim()
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar el gasto");
      }

      toast.success("Gasto actualizado exitosamente");
      onSuccess();
    } catch (error: any) {
      console.error("Error al actualizar gasto:", error);
      toast.error(error.message || "Error al actualizar el gasto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Editar Gasto</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar categoría...</option>
                {CATEGORIAS_GASTOS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Sucursal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sucursal <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.sucursalId}
                onChange={(e) => setFormData({ ...formData, sucursalId: e.target.value })}
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

            {/* Monto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto del Gasto <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Nota/Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nota/Descripción <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  value={formData.nota}
                  onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Escribe una descripción del gasto..."
                  rows={4}
                  required
                />
              </div>
            </div>
          </div>

          {/* Información original */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Información Original</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Creado por:</strong> {gasto.creadoPorNombre || gasto.creadoPor}</p>
              <p><strong>Fecha de creación:</strong> {new Date(gasto.fecha).toLocaleString("es-MX")}</p>
              {gasto.editadoPor && (
                <p><strong>Última modificación:</strong> {gasto.editadoPorNombre || gasto.editadoPor}</p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}