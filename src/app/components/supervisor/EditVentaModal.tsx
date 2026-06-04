import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface EditVentaModalProps {
  venta: any;
  onClose: () => void;
  onSave: (ventaId: string, updates: any) => Promise<void>;
  isLoading: boolean;
}

export default function EditVentaModal({ venta, onClose, onSave, isLoading }: EditVentaModalProps) {
  const [formData, setFormData] = useState({
    estado: venta.estado || "completado",
    productos: venta.productos || []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (formData.productos.length === 0) {
      toast.error("La venta debe tener al menos un producto");
      return;
    }

    // Calcular nuevo total
    const nuevoTotal = formData.productos.reduce((sum: number, p: any) => 
      sum + (p.cantidad * p.precio), 0
    );

    await onSave(venta.id, {
      estado: formData.estado,
      productos: formData.productos,
      total: nuevoTotal
    });
  };

  const handleProductoChange = (index: number, field: string, value: any) => {
    const newProductos = [...formData.productos];
    newProductos[index] = {
      ...newProductos[index],
      [field]: field === "cantidad" || field === "precio" ? parseFloat(value) || 0 : value
    };
    setFormData({ ...formData, productos: newProductos });
  };

  const handleRemoveProducto = (index: number) => {
    const newProductos = formData.productos.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, productos: newProductos });
  };

  const total = formData.productos.reduce((sum: number, p: any) => 
    sum + (p.cantidad * p.precio), 0
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Editar Venta</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Advertencia */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>Advertencia:</strong> Editar esta venta afectará los registros contables y el inventario. 
              Use esta función con precaución.
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado de la Venta
            </label>
            <select
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            >
              <option value="completado">Completado</option>
              <option value="devuelto">Devuelto</option>
            </select>
          </div>

          {/* Productos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Productos
            </label>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Precio</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {formData.productos.map((producto: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm">{producto.nombre}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={producto.cantidad}
                          onChange={(e) => handleProductoChange(index, "cantidad", e.target.value)}
                          className="w-20 px-2 py-1 border rounded text-center text-sm"
                          disabled={isLoading}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={producto.precio}
                          onChange={(e) => handleProductoChange(index, "precio", e.target.value)}
                          className="w-24 px-2 py-1 border rounded text-center text-sm"
                          disabled={isLoading}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        ${((producto.cantidad || 0) * (producto.precio || 0)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveProducto(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                          disabled={isLoading || formData.productos.length === 1}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Nuevo Total:</span>
              <span className="text-2xl font-bold text-indigo-600">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300"
              disabled={isLoading}
            >
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
