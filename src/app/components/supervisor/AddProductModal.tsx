import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

interface AddProductModalProps {
  onClose: () => void;
  onSuccess: () => void;
  sucursalId: string;
  codigoInicial?: string;
}

const CATEGORIAS = [
  "Antibioticos",
  "Bebes",
  "Botica y material de curacion",
  "Cuidado de la piel",
  "Cuidado del cabello",
  "Fraccion IV",
  "Fraccion V",
  "Fraccion VI",
  "Higiene Personal",
  "Pareja",
  "Productos de Venta libre",
  "Vitaminas y suplementos"
];

const UNIDADES = ["Pieza", "Paquete"];
const FORMAS_FARMACEUTICAS = [
  { value: "tableta", label: "Tableta" },
  { value: "capsula", label: "Cápsula" },
  { value: "suspension", label: "Suspensión" },
  { value: "jarabe", label: "Jarabe" },
  { value: "inyectable", label: "Inyectable" },
  { value: "crema", label: "Crema" },
  { value: "ungüento", label: "Ungüento" },
  { value: "gotas", label: "Gotas" },
  { value: "ovulo", label: "Óvulo" },
  { value: "supositorio", label: "Supositorio" },
  { value: "parche", label: "Parche" },
  { value: "polvo", label: "Polvo" },
];

export default function AddProductModal({ onClose, onSuccess, sucursalId, codigoInicial }: AddProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    codigoBarras: codigoInicial || "",
    marca: "",
    categoria: "",
    subcategoria: "",
    unidad: "Pieza",
    sustanciaActiva: "",
    concentracion: "",
    forma: "",
    lote: "",
    caducidad: "",
    costo: "",
    precio: "",
    precio2: "",
    precio3: "",
    precio4: "",
    promocion: false,
    impuestoProducto: "",
    metodoImpuesto: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.nombre.trim()) {
      toast.error("El nombre del producto es requerido");
      return;
    }
    
    if (!formData.codigoBarras.trim()) {
      toast.error("El código del producto es requerido");
      return;
    }
    
    if (!formData.categoria) {
      toast.error("La categoría es requerida");
      return;
    }
    
    if (!formData.costo || parseFloat(formData.costo) <= 0) {
      toast.error("El costo debe ser mayor a 0");
      return;
    }
    
    if (!formData.precio || parseFloat(formData.precio) <= 0) {
      toast.error("El precio debe ser mayor a 0");
      return;
    }
    
    if (parseFloat(formData.precio) < parseFloat(formData.costo)) {
      toast.error("El precio de venta no puede ser menor al costo");
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            nombre: formData.nombre.trim(),
            codigoBarras: formData.codigoBarras.trim(),
            marca: formData.marca.trim() || undefined,
            categoria: formData.categoria,
            subcategoria: formData.subcategoria.trim() || undefined,
            presentacion: formData.unidad,
            sustanciaActiva: formData.sustanciaActiva.trim() || undefined,
            concentracion: formData.concentracion.trim() || undefined,
            forma: formData.forma || undefined,
            lote: formData.lote.trim() || undefined,
            caducidad: formData.caducidad || undefined,
            costo: parseFloat(formData.costo),
            precioVenta: parseFloat(formData.precio),
            precio2: formData.precio2 ? parseFloat(formData.precio2) : undefined,
            precio3: formData.precio3 ? parseFloat(formData.precio3) : undefined,
            precio4: formData.precio4 ? parseFloat(formData.precio4) : undefined,
            promocion: formData.promocion,
            impuestoProducto: formData.impuestoProducto || undefined,
            metodoImpuesto: formData.metodoImpuesto || undefined,
            sucursalId: sucursalId,
            stockInicial: 0 // El stock se agregará mediante compras
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al agregar el producto");
      }

      toast.success("Producto agregado exitosamente");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error al agregar producto:", error);
      toast.error(error.message || "Error al agregar el producto");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Añadir Producto</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Producto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Paracetamol 500mg"
                required
                disabled={loading}
              />
            </div>

            {/* Código de Barras */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código de Producto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.codigoBarras}
                onChange={(e) => handleChange("codigoBarras", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: 7501234567890"
                required
                disabled={loading}
              />
            </div>

            {/* Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <input
                type="text"
                value={formData.marca}
                onChange={(e) => handleChange("marca", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Genérico"
                disabled={loading}
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.categoria}
                onChange={(e) => handleChange("categoria", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                disabled={loading}
              >
                <option value="">Seleccionar categoría</option>
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subcategoría
              </label>
              <input
                type="text"
                value={formData.subcategoria}
                onChange={(e) => handleChange("subcategoria", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Analgésicos"
                disabled={loading}
              />
            </div>

            {/* Unidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidad del Producto <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.unidad}
                onChange={(e) => handleChange("unidad", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                disabled={loading}
              >
                {UNIDADES.map((unidad) => (
                  <option key={unidad} value={unidad}>
                    {unidad}
                  </option>
                ))}
              </select>
            </div>
            {/* Sustancia Activa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sustancia Activa
              </label>
              <input
                type="text"
                value={formData.sustanciaActiva}
                onChange={(e) => handleChange("sustanciaActiva", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Paracetamol"
                disabled={loading}
              />
            </div>
            {/* Concentración */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Concentración
              </label>
              <input
                type="text"
                value={formData.concentracion}
                onChange={(e) => handleChange("concentracion", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: 500 mg"
                disabled={loading}
              />
            </div>
            {/* Forma */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma
              </label>
              <select
                value={formData.forma}
                onChange={(e) => handleChange("forma", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              >
                <option value="">Seleccionar forma...</option>
                {FORMAS_FARMACEUTICAS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            {/* Lote */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lote
              </label>
              <input
                type="text"
                value={formData.lote}
                onChange={(e) => handleChange("lote", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: LOT2026A"
                disabled={loading}
              />
            </div>
            {/* Caducidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caducidad
              </label>
              <input
                type="date"
                value={formData.caducidad}
                onChange={(e) => handleChange("caducidad", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>
            {/* Costo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Costo del Producto <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.costo}
                  onChange={(e) => handleChange("costo", e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Precio 1 (principal) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio 1 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input type="number" step="0.01" min="0.01" value={formData.precio}
                  onChange={(e) => handleChange("precio", e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00" required disabled={loading} />
              </div>
            </div>

            {/* Precio 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio 2</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input type="number" step="0.01" min="0" value={formData.precio2}
                  onChange={(e) => handleChange("precio2", e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00" disabled={loading} />
              </div>
            </div>

            {/* Precio 3 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio 3</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input type="number" step="0.01" min="0" value={formData.precio3}
                  onChange={(e) => handleChange("precio3", e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00" disabled={loading} />
              </div>
            </div>

            {/* Precio 4 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio 4</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input type="number" step="0.01" min="0" value={formData.precio4}
                  onChange={(e) => handleChange("precio4", e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00" disabled={loading} />
              </div>
            </div>

            {/* Promoción */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.promocion}
                  onChange={(e) => handleChange("promocion", e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  disabled={loading}
                />
                <span className="text-sm font-medium text-gray-700">
                  Producto en Promoción
                </span>
              </label>
              {formData.promocion && (
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  El producto se marcará como disponible en promociones especiales
                </p>
              )}
            </div>

            {/* Impuesto sobre producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Impuesto sobre producto</label>
              <select
                value={formData.impuestoProducto}
                onChange={(e) => handleChange("impuestoProducto", e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
              >
                <option value="">Seleccionar...</option>
                <option value="sin_impuesto">Sin impuesto</option>
                <option value="iva">IVA</option>
              </select>
            </div>

            {/* Metodo de impuestos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de impuestos</label>
              <select
                value={formData.metodoImpuesto}
                onChange={(e) => handleChange("metodoImpuesto", e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
              >
                <option value="">Seleccionar...</option>
                <option value="inclusivo">Inclusivo</option>
                <option value="exclusivo">Exclusivo</option>
              </select>
            </div>

            {/* Nota sobre el stock */}
            <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> El producto se creará con stock inicial en 0. 
                Para agregar inventario, deberá realizar una compra desde el módulo de Compras.
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Agregando..." : "Agregar Producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}