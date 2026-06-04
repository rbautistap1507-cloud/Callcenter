import { useState } from "react";
import { toast } from "sonner";
import { Save, DollarSign, FileText, ArrowLeft } from "lucide-react";
import { SUCURSALES, User } from "../../shared";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

interface AgregarGastoProps {
  user: User;
  selectedSucursal: string;
  onGastoCreated: () => void;
  onBack?: () => void;
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

export default function AgregarGasto({ user, selectedSucursal, onGastoCreated, onBack }: AgregarGastoProps) {
  const [formData, setFormData] = useState({
    categoria: "",
    monto: "",
    nota: ""
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.categoria || !formData.monto || !formData.nota.trim()) {
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
      const payload = {
        categoria: formData.categoria,
        sucursalId: selectedSucursal,
        monto: montoNum,
        nota: formData.nota.trim(),
        creadoPor: user.email,
        creadoPorNombre: user.nombre
      };

      console.log("📤 Enviando gasto al backend:", payload);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/gastos`,
        {
          method: "POST",
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
        throw new Error(data.error || "Error al crear el gasto");
      }

      toast.success("Gasto registrado exitosamente");
      
      // Limpiar formulario
      setFormData({
        categoria: "",
        monto: "",
        nota: ""
      });

      onGastoCreated();
    } catch (error: any) {
      console.error("❌ Error al crear gasto:", error);
      toast.error(error.message || "Error al registrar el gasto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Agregar Gasto</h2>
        <p className="text-gray-600 mt-1">
          Registra un nuevo gasto en {SUCURSALES.find(s => s.id === selectedSucursal)?.nombre || "la sucursal seleccionada"}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 gap-6">
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

          {/* Botones */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  categoria: "",
                  monto: "",
                  nota: ""
                });
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Limpiar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar Gasto"}
            </button>
          </div>
        </form>
      </div>

      {/* Información adicional */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Información</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Todos los campos son obligatorios</li>
          <li>• El monto debe ser un valor numérico positivo</li>
          <li>• La descripción debe ser clara y detallada</li>
          <li>• El gasto quedará registrado con tu usuario: <strong>{user.email}</strong></li>
        </ul>
      </div>
    </div>
  );
}