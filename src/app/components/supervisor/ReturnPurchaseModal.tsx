import React, { useState } from "react";
import { X, ArrowLeftRight } from "lucide-react";

interface ReturnPurchaseModalProps {
  compra: any;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}

const MOTIVOS_DEVOLUCION = [
  "Producto en mal estado",
  "Producto incorrecto",
  "Producto vencido",
  "Exceso de inventario",
  "Precio incorrecto",
  "Cancelación de pedido",
  "Otro",
];

export default function ReturnPurchaseModal({
  compra,
  onClose,
  onConfirm,
}: ReturnPurchaseModalProps) {
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
            <div className="bg-orange-100 p-2 rounded-lg">
              <ArrowLeftRight className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold">Devolver Compra</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
          </div>

          {/* Selector de motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de la devolución *
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Selecciona un motivo</option>
              {MOTIVOS_DEVOLUCION.map((m) => (
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
                placeholder="Describe el motivo de la devolución..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
          )}

          {/* Advertencia */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-800">
              <strong>Advertencia:</strong> Esta acción devolverá el stock del producto
              y registrará la devolución en el historial.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            Devolver Compra
          </button>
        </div>
      </div>
    </div>
  );
}
