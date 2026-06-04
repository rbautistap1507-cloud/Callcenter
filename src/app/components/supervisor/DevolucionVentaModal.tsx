import { useState } from "react";
import { X, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface DevolucionVentaModalProps {
  venta: any;
  onClose: () => void;
  onConfirm: (ventaId: string, motivo: string) => Promise<void>;
  isLoading: boolean;
}

export default function DevolucionVentaModal({ venta, onClose, onConfirm, isLoading }: DevolucionVentaModalProps) {
  const [motivo, setMotivo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!motivo.trim()) {
      toast.error("Debe proporcionar un motivo para la devolución");
      return;
    }

    await onConfirm(venta.id, motivo.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-6 h-6 text-white" />
            <h3 className="text-xl font-bold text-white">Procesar Devolución</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Advertencia */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong>Advertencia:</strong> Esta acción marcará la venta como "Devuelto" y revertirá 
              el inventario de los productos. Esta operación no se puede deshacer fácilmente.
            </div>
          </div>

          {/* Información de la Venta */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-gray-900 mb-3">Información de la Venta</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">ID Venta:</span>
                <p className="font-semibold">{venta.id}</p>
              </div>
              <div>
                <span className="text-gray-600">Fecha:</span>
                <p className="font-semibold">{new Date(venta.fecha).toLocaleDateString('es-MX')}</p>
              </div>
              <div>
                <span className="text-gray-600">Sucursal:</span>
                <p className="font-semibold capitalize">{venta.sucursalId}</p>
              </div>
              <div>
                <span className="text-gray-600">Total:</span>
                <p className="font-semibold text-indigo-600">${venta.total?.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Productos a devolver</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {venta.productos?.map((producto: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-2">{producto.nombre}</td>
                      <td className="px-4 py-2 text-right">{producto.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de la Devolución <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="Describa el motivo de la devolución..."
              required
              disabled={isLoading}
            />
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
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? "Procesando..." : "Procesar Devolución"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
