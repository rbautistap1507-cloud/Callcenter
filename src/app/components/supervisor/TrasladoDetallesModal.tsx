import { X, Calendar, MapPin, ArrowRightLeft, Package, DollarSign, User } from "lucide-react";
import { SUCURSALES } from "../../shared";

interface TrasladoDetallesModalProps {
  traslado: any;
  onClose: () => void;
  onCompletar?: () => void;
  onCancelar?: () => void;
}

export default function TrasladoDetallesModal({ 
  traslado, 
  onClose, 
  onCompletar,
  onCancelar 
}: TrasladoDetallesModalProps) {
  const sucursalOrigen = SUCURSALES.find((s) => s.id === traslado.sucursalOrigenId);
  const sucursalDestino = SUCURSALES.find((s) => s.id === traslado.sucursalDestinoId);
  
  // Calcular el total dinámicamente si no existe o es 0
  let totalCalculado = parseFloat(traslado.total || 0);
  if (totalCalculado === 0 && Array.isArray(traslado.productos) && traslado.productos.length > 0) {
    totalCalculado = traslado.productos.reduce((sum: number, item: any) => {
      const cantidad = parseFloat(item.cantidad || 0);
      const precioUnitario = parseFloat(item.precioUnitario || 0);
      return sum + (cantidad * precioUnitario);
    }, 0);
    console.log("🔍 Total recalculado en modal:", totalCalculado);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Detalles del Traslado</h2>
            <p className="text-sm text-gray-600 mt-1">Información completa del traslado</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Información General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Fecha</h3>
              </div>
              <p className="text-gray-700">
                {new Date(traslado.fecha).toLocaleDateString("es-MX", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(traslado.fecha).toLocaleTimeString("es-MX")}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Estado</h3>
              </div>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  traslado.estado === "completado"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {traslado.estado === "completado" ? "Completado" : "Pendiente"}
              </span>
            </div>
          </div>

          {/* Sucursales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-gray-900">De Sucursal (Origen)</h3>
              </div>
              <p className="text-gray-900 font-medium">{sucursalOrigen?.nombre || traslado.sucursalOrigenId}</p>
              <p className="text-sm text-gray-600">{sucursalOrigen?.direccion}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRightLeft className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Para Sucursal (Destino)</h3>
              </div>
              <p className="text-gray-900 font-medium">{sucursalDestino?.nombre || traslado.sucursalDestinoId}</p>
              <p className="text-sm text-gray-600">{sucursalDestino?.direccion}</p>
            </div>
          </div>

          {/* Descripción */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Descripción</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{traslado.descripcion}</p>
          </div>

          {/* Productos */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Productos Trasladados ({traslado.productos?.length || 0})
            </h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Producto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Cantidad
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Precio Unit.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {traslado.productos?.map((item: any, index: number) => {
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{item.productoNombre || item.nombre || "Producto"}</div>
                              {item.sustanciaActiva && (
                                <div className="text-xs text-gray-500">{item.sustanciaActiva}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                            {item.cantidad}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            ${(item.precioUnitario || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                            ${((item.cantidad || 0) * (item.precioUnitario || 0)).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-900">
                        Total:
                      </td>
                      <td className="px-4 py-3 font-bold text-lg text-blue-600">
                        ${totalCalculado.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Información del Creador */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Información de Registro</h3>
            </div>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Creado por:</span> {traslado.creadoPorNombre || traslado.creadoPor}
            </p>
            {traslado.fechaEdicion && (
              <p className="text-sm text-gray-700 mt-1">
                <span className="font-medium">Última edición:</span>{" "}
                {new Date(traslado.fechaEdicion).toLocaleDateString("es-MX")} por{" "}
                {traslado.editadoPorNombre || traslado.editadoPor}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Cerrar
            </button>
            {traslado.estado === "pendiente" && (
              <>
                <button
                  onClick={onCompletar}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors ml-2"
                >
                  Completar Traslado
                </button>
                <button
                  onClick={onCancelar}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors ml-2"
                >
                  Cancelar Traslado
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}