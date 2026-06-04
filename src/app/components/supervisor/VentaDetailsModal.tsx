import { X, Calendar, User, Building2, CreditCard, Receipt } from "lucide-react";

interface VentaDetailsModalProps {
  venta: any;
  onClose: () => void;
}

export default function VentaDetailsModal({ venta, onClose }: VentaDetailsModalProps) {
  const getEstadoBadge = (estado: string) => {
    if (estado === "completado") {
      return <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">Completado</span>;
    }
    return <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">Devuelto</span>;
  };

 return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Detalles de Venta</h3>
            <p className="text-sm text-gray-500">ID: {venta.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-gray-500">Fecha</p>
                <p className="font-semibold">{new Date(venta.fecha).toLocaleString('es-MX')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-gray-500">Vendedor</p>
                <p className="font-semibold">{venta.usuario || venta.vendedor || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-gray-500">Sucursal</p>
                <p className="font-semibold capitalize">{venta.sucursalId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Receipt className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-gray-500">Estado</p>
                <div className="mt-1">{getEstadoBadge(venta.estado || "completado")}</div>
              </div>
            </div>
          </div>

          {venta.metodoPago && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Método de Pago</h4>
              </div>
              {venta.metodoPago === "dividido" ? (
                <div className="space-y-2">
                  <p className="text-sm text-blue-800"><strong>Pago Dividido:</strong></p>
                  {venta.pagosDivididos?.map((pago: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm bg-white p-2 rounded">
                      <span className="capitalize">{pago.metodo}</span>
                      <span className="font-semibold">${pago.monto.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-blue-800 capitalize">{venta.metodoPago}</p>
              )}
            </div>
          )}

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Productos</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {venta.productos?.map((producto: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{producto.nombre}</td>
                      <td className="px-4 py-3 text-sm text-right">{producto.cantidad}</td>
                      <td className="px-4 py-3 text-sm text-right">${producto.precio?.toFixed(2) || "0.00"}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        ${((producto.cantidad || 0) * (producto.precio || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total:</span>
              <span className="text-2xl font-bold text-indigo-600">
                ${venta.total?.toFixed(2) || "0.00"}
              </span>
            </div>
          </div>

          {(venta.cedulaMedico || venta.codigoControlAntibioticos) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">Información Médica</h4>
              {venta.cedulaMedico && (
                <p className="text-sm text-yellow-800"><strong>Cédula Médico:</strong> {venta.cedulaMedico}</p>
              )}
              {venta.codigoControlAntibioticos && (
                <p className="text-sm text-yellow-800"><strong>Código Control Antibióticos:</strong> {venta.codigoControlAntibioticos}</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t rounded-b-lg">
          <button onClick={onClose} className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
