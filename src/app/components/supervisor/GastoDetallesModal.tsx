import { X, Calendar, DollarSign, FileText, User, Building } from "lucide-react";
import { SUCURSALES } from "../../shared";

interface GastoDetallesModalProps {
  gasto: any;
  onClose: () => void;
}

export default function GastoDetallesModal({ gasto, onClose }: GastoDetallesModalProps) {
  const sucursal = SUCURSALES.find((s) => s.id === gasto.sucursalId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Detalles del Gasto</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Información General */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fecha */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha</p>
                  <p className="font-medium text-gray-900">
                    {new Date(gasto.fecha).toLocaleDateString("es-MX", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(gasto.fecha).toLocaleTimeString("es-MX")}
                  </p>
                </div>
              </div>

              {/* Monto */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Monto</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(gasto.monto || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Categoría */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Categoría</p>
                  <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {gasto.categoria}
                  </span>
                </div>
              </div>

              {/* Sucursal */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Building className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sucursal</p>
                  <p className="font-medium text-gray-900">
                    {sucursal?.nombre || gasto.sucursalId}
                  </p>
                </div>
              </div>

              {/* Creado Por */}
              <div className="flex items-start gap-3 md:col-span-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Creado Por</p>
                  <p className="font-medium text-gray-900">
                    {gasto.creadoPorNombre || gasto.creadoPor}
                  </p>
                  {gasto.creadoPorNombre && (
                    <p className="text-sm text-gray-500">{gasto.creadoPor}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Descripción/Nota */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Descripción</h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap">{gasto.nota}</p>
            </div>
          </div>

          {/* Metadatos */}
          {gasto.editadoPor && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Historial de Modificaciones</h3>
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <p className="text-sm text-gray-700">
                  <strong>Última modificación:</strong> {gasto.editadoPorNombre || gasto.editadoPor}
                </p>
                {gasto.fechaEdicion && (
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(gasto.fechaEdicion).toLocaleString("es-MX")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}