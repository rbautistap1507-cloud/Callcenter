import React, { useState } from "react";
import { X, Trash2, AlertTriangle } from "lucide-react";

interface DeletePurchaseModalProps {
  compra: any;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  isDeleting?: boolean;
}

const MOTIVOS_ELIMINACION = [
  "Registro duplicado",
  "Error en la captura de datos",
  "Compra cancelada por proveedor",
  "Precio incorrecto",
  "Producto incorrecto",
  "Solicitud del gerente",
  "Otro",
];

export default function DeletePurchaseModal({
  compra,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeletePurchaseModalProps) {
  const [motivo, setMotivo] = useState("");
  const [otroMotivo, setOtroMotivo] = useState("");

  const handleConfirm = () => {
    const motivoFinal = motivo === "Otro" ? otroMotivo : motivo;
    if (!motivoFinal.trim()) {
      alert("Por favor selecciona o escribe un motivo");
      return;
    }
    onConfirm(motivoFinal);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold">Eliminar Compra</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isDeleting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Información de la compra */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Producto:</span>
              <span className="text-sm font-medium">{compra.nombreProducto}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Cantidad:</span>
              <span className="text-sm font-medium">{compra.cantidad}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-sm font-medium text-green-600">
                ${compra.total?.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Fecha:</span>
              <span className="text-sm font-medium">
                {new Date(compra.fecha).toLocaleDateString('es-MX')}
              </span>
            </div>
          </div>

          {/* Selector de motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de la eliminación *
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={isDeleting}
            >
              <option value="">Selecciona un motivo</option>
              {MOTIVOS_ELIMINACION.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Campo de texto si selecciona "Otro" */}
          {motivo === "Otro" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especifica el motivo *
              </label>
              <textarea
                value={otroMotivo}
                onChange={(e) => setOtroMotivo(e.target.value)}
                placeholder="Describe el motivo de la eliminación..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={3}
                disabled={isDeleting}
              />
            </div>
          )}

          {/* Advertencia */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-medium">
                Esta acción no se puede deshacer
              </p>
              <p className="text-sm text-red-700 mt-1">
                Se eliminará permanentemente el registro de esta compra del sistema.
                El stock del producto será ajustado automáticamente.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Eliminando..." : "Eliminar Compra"}
          </button>
        </div>
      </div>
    </div>
  );
}
