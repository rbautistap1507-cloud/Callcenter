import { X, CreditCard, Banknote, Building2, Smartphone } from "lucide-react";

interface PaymentMethodModalProps {
  venta: any;
  onClose: () => void;
}

export default function PaymentMethodModal({ venta, onClose }: PaymentMethodModalProps) {
  const getPaymentIcon = (metodo: string) => {
    switch (metodo.toLowerCase()) {
      case "efectivo":
        return <Banknote className="w-5 h-5 text-green-600" />;
      case "tarjeta":
      case "tarjeta debito":
      case "tarjeta credito":
        return <CreditCard className="w-5 h-5 text-blue-600" />;
      case "transferencia":
        return <Building2 className="w-5 h-5 text-purple-600" />;
      case "digital":
      case "mercado pago":
        return <Smartphone className="w-5 h-5 text-indigo-600" />;
      default:
        return <CreditCard className="w-5 h-5 text-gray-600" />;
    }
  };

  const renderMetodoPago = () => {
    if (!venta.metodoPago) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No se registró método de pago para esta venta</p>
        </div>
      );
    }

    if (venta.metodoPago === "dividido" && venta.pagosDivididos) {
      return (
        <div className="space-y-3">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
            <p className="text-sm font-semibold text-indigo-900">Pago Dividido</p>
            <p className="text-xs text-indigo-700">La venta se pagó con múltiples métodos</p>
          </div>

          {venta.pagosDivididos.map((pago: any, index: number) => (
            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getPaymentIcon(pago.metodo)}
                  <span className="font-semibold text-gray-900 capitalize">{pago.metodo}</span>
                </div>
                <span className="text-lg font-bold text-indigo-600">
                  ${pago.monto.toFixed(2)}
                </span>
              </div>
              {pago.referencia && (
                <div className="text-xs text-gray-600">
                  <strong>Referencia:</strong> {pago.referencia}
                </div>
              )}
            </div>
          ))}

          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between text-white">
              <span className="font-semibold">Total Pagado:</span>
              <span className="text-xl font-bold">
                ${venta.pagosDivididos.reduce((sum: number, p: any) => sum + p.monto, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Pago simple
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {getPaymentIcon(venta.metodoPago)}
              <div>
                <p className="text-sm text-gray-600">Método de Pago</p>
                <p className="text-xl font-bold text-gray-900 capitalize">{venta.metodoPago}</p>
              </div>
            </div>
          </div>

          {venta.referenciaPago && (
            <div className="pt-3 border-t">
              <p className="text-sm text-gray-600">Referencia</p>
              <p className="font-semibold text-gray-900">{venta.referenciaPago}</p>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg p-6">
          <div className="flex items-center justify-between text-white">
            <span className="text-lg font-semibold">Total Pagado:</span>
            <span className="text-3xl font-bold">${venta.total?.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-white" />
            <h3 className="text-xl font-bold text-white">Forma de Pago</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Información de la Venta */}
          <div className="mb-6 pb-4 border-b">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">ID Venta</p>
                <p className="font-semibold">{venta.id}</p>
              </div>
              <div>
                <p className="text-gray-600">Fecha</p>
                <p className="font-semibold">{new Date(venta.fecha).toLocaleString('es-MX')}</p>
              </div>
            </div>
          </div>

          {/* Método de Pago */}
          {renderMetodoPago()}
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
