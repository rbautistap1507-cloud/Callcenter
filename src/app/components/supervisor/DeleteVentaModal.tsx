import { X, AlertTriangle, Trash2 } from "lucide-react";

interface DeleteVentaModalProps {
  venta: any;
  onClose: () => void;
  onConfirm: (ventaId: string) => Promise<void>;
  isDeleting: boolean;
}

export default function DeleteVentaModal({ venta, onClose, onConfirm, isDeleting }: DeleteVentaModalProps) {
  const handleConfirm = async () => {
    await onConfirm(venta.id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <Trash2 className="w-6 h-6 text-white" />
            <h3 className="text-xl font-bold text-white">Eliminar Venta</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            disabled={isDeleting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Advertencia */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong className="block mb-1">¡Advertencia Crítica!</strong>
              Esta acción eliminará permanentemente la venta del sistema. Esta operación no se puede deshacer.
            </div>
          </div>

          {/* Información de la Venta */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-gray-900 mb-3">Información de la Venta</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ID:</span>
                <span className="font-semibold">{venta.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha:</span>
                <span className="font-semibold">{new Date(venta.fecha).toLocaleDateString('es-MX')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sucursal:</span>
                <span className="font-semibold capitalize">{venta.sucursalId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold text-red-600">${venta.total?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Productos:</span>
                <span className="font-semibold">{venta.productos?.length || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> Esta acción NO revertirá el inventario. Si necesita devolver 
              el inventario, use la función "Devolución" en su lugar.
            </p>
          </div>

          {/* Pregunta de confirmación */}
          <p className="text-center text-gray-700 font-medium">
            ¿Está seguro que desea eliminar esta venta?
          </p>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isDeleting}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar Venta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
