import { useState } from "react";
import { X, Trash2 } from "lucide-react";

interface DeleteProductModalProps {
  product: any;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  isDeleting: boolean;
}

export default function DeleteProductModal({ product, onClose, onConfirm, isDeleting }: DeleteProductModalProps) {
  const [motivo, setMotivo] = useState("");

  const handleSubmit = () => {
    if (!motivo.trim()) return;
    onConfirm(motivo);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Trash2 className="w-6 h-6" />
              Eliminar Producto
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <p className="text-gray-500 text-sm mb-6">
            Por favor ingrese los motivos de eliminación del producto
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
              <div className="relative">
                <input
                  type="text"
                  value={product.nombre}
                  readOnly
                  className="w-full px-3 py-2 bg-blue-50 border-2 border-blue-400 text-blue-800 rounded-lg focus:outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Código</label>
              <input
                type="text"
                value={product.codigoBarras}
                readOnly
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Motivos de Eliminación <span className="text-red-500">*</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ingrese los motivos de la eliminación del producto"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px] resize-none"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!motivo.trim() || isDeleting}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all
              ${!motivo.trim() || isDeleting 
                ? "bg-red-300 cursor-not-allowed" 
                : "bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg transform active:scale-95"}
            `}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Eliminar Producto
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}