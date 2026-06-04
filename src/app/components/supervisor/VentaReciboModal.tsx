import { X, Download, Receipt, Building2, Calendar, User } from "lucide-react";
import { useRef } from "react";
import { SUCURSALES } from "../../shared";

interface VentaReciboModalProps {
  venta: any;
  onClose: () => void;
}

export default function VentaReciboModal({ venta, onClose }: VentaReciboModalProps) {
  const reciboRef = useRef<HTMLDivElement>(null);
  
  const sucursal = SUCURSALES.find(s => s.id === venta.sucursalId);

  const handlePrint = () => {
    const style = document.createElement('style');
    style.innerHTML = `@page { size: 80mm auto; margin: 2mm; }`;
    style.id = 'ticket-print-style';
    document.head.appendChild(style);
    window.print();
    document.getElementById('ticket-print-style')?.remove();
  };

  const handleDownloadPDF = async () => {
    try {
      // Importar dinámicamente jsPDF y html-to-image
      const { default: jsPDF } = await import('jspdf');
      const { toPng } = await import('html-to-image');

      if (reciboRef.current) {
        // Use html-to-image which handles modern CSS colors better than html2canvas
        const dataUrl = await toPng(reciboRef.current, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#ffffff'
        });
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`recibo-${venta.id}.pdf`);
      }
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, use la función de imprimir.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-lg print:hidden">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6 text-white" />
            <h3 className="text-xl font-bold text-white">Recibo de Venta</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Recibo - Área imprimible */}
        <div ref={reciboRef} className="p-8 bg-white ticket-termico">
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Farmacia LYM</h1>
            <p className="text-sm text-gray-600">{sucursal?.direccion}</p>
            <p className="text-sm text-gray-600">Tel: {sucursal?.telefono}</p>
            <p className="text-sm text-gray-600">Email: {sucursal?.email}</p>
          </div>

          {/* Información del Recibo */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-900">Información del Recibo</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p><strong>No. Venta:</strong> {venta.id}</p>
                <p><strong>Fecha:</strong> {new Date(venta.fecha).toLocaleString('es-MX', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-900">Sucursal</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p><strong>Nombre:</strong> {sucursal?.nombre}</p>
                <p><strong>Atendió:</strong> {venta.usuario || venta.vendedor || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-900 mb-3 pb-2 border-b">Productos</h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Descripción</th>
                  <th className="px-4 py-2 text-center">Cant.</th>
                  <th className="px-4 py-2 text-right">P. Unit.</th>
                  <th className="px-4 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {venta.productos?.map((producto: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-2">{producto.nombre}</td>
                    <td className="px-4 py-2 text-center">{producto.cantidad}</td>
                    <td className="px-4 py-2 text-right">${producto.precio?.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right font-semibold">
                      ${((producto.cantidad || 0) * (producto.precio || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="border-t-2 border-gray-300 pt-4 mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xl font-bold text-gray-900">TOTAL:</span>
              <span className="text-3xl font-bold text-purple-600">
                ${venta.total?.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Método de Pago */}
          {venta.metodoPago && (
            <div className="mb-8 bg-gray-50 p-4 rounded">
              <h4 className="font-semibold text-gray-900 mb-2">Método de Pago</h4>
              {venta.metodoPago === "dividido" ? (
                <div className="space-y-1 text-sm">
                  {venta.pagosDivididos?.map((pago: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span className="capitalize">{pago.metodo}:</span>
                      <span className="font-semibold">${pago.monto.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm capitalize">{venta.metodoPago}</p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-gray-600 pt-6 border-t">
            <p className="mb-1">¡Gracias por su compra!</p>
            <p>Este documento es un comprobante de venta</p>
            {venta.codigoControlAntibioticos && (
              <p className="mt-2 font-semibold text-orange-600">
                Código Control Antibióticos: {venta.codigoControlAntibioticos}
              </p>
            )}
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="bg-gray-50 px-6 py-4 border-t flex gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            <Receipt className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Descargar PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Estilos para impresión */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          ${reciboRef.current ? `#${reciboRef.current.id}` : ''}, 
          ${reciboRef.current ? `#${reciboRef.current.id}` : ''} * {
            visibility: visible;
          }
        }
      `}</style>
    </div>
  );
}