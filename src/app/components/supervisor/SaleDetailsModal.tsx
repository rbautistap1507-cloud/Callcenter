import { X, Printer, Plus, Download } from "lucide-react";
import Barcode from "react-barcode";
import QRCode from "react-qr-code";
import { SUCURSALES } from "../../shared";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

interface SaleDetailsModalProps {
  sale: any;
  allProducts: any[];
  onClose: () => void;
}

export default function SaleDetailsModal({ sale, allProducts, onClose }: SaleDetailsModalProps) {
  const sucursal = SUCURSALES.find(s => s.id === sale.sucursalId);
  
  // Calculate totals
  const items = sale.productos?.map((p: any) => {
    const productInfo = allProducts.find((prod: any) => prod.codigoBarras === p.productoId || prod.id === p.productoId);
    return {
      ...p,
      productInfo,
      subtotal: (p.cantidad || 0) * (p.precio || 0),
      impuestos: (p.cantidad || 0) * (p.precio || 0) * 0.16 // Assuming 16% tax for display purposes if not in data
    };
  }) || [];

  const subtotal = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
  const totalImpuestos = items.reduce((sum: number, item: any) => sum + item.impuestos, 0);
  // If sale.total exists, use it, otherwise calculate
  const total = sale.total || subtotal; 
  
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('sale-ticket');
    if (!element) return;

    try {
      // Use html-to-image which handles modern CSS colors better than html2canvas
      const dataUrl = await toPng(element, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`ticket-${sale.id || 'venta'}.pdf`);
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Error al generar el PDF. Por favor intente de nuevo.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-start bg-white rounded-t-lg print:hidden">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800">Detalles de Venta</h2>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Printable Content - Using inline styles for colors to avoid oklch issues with html2canvas */}
        <div 
          className="p-8 overflow-y-auto flex-1 print:p-0" 
          id="sale-ticket"
          style={{ backgroundColor: '#ffffff', color: '#000000' }}
        >
          {/* Logo Section */}
          <div className="flex justify-center mb-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#000000' }}>Call Center</h1>
                <div className="p-1 rounded-sm" style={{ backgroundColor: '#000000', color: '#ffffff' }}>
                  <Plus className="w-6 h-6" strokeWidth={4} />
                </div>
              </div>
              <p className="text-sm font-medium tracking-wide uppercase" style={{ color: '#000000' }}>Cuidando tu salud</p>
            </div>
          </div>

          {/* Meta Data & Codes */}
          <div 
            className="border p-4 mb-8 flex justify-between items-start"
            style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}
          >
            <div className="space-y-1 text-sm" style={{ color: '#1f2937' }}>
              <p><span className="font-bold">Fecha:</span> {new Date(sale.fecha).toLocaleString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              <p><span className="font-bold">Referencia:</span> {sale.id ? `/${sale.id}` : "/POS--"}</p>
              <p><span className="font-bold">Estado de la venta:</span> Completado</p>
              <p><span className="font-bold">Estado del pago:</span> Pagado</p>
            </div>
            <div className="flex gap-4 items-center p-2 rounded border" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
              <div className="h-12 flex items-center overflow-hidden">
                <Barcode value={sale.id || "POS-000"} height={40} width={1} displayValue={false} margin={0} />
              </div>
              <div className="h-12 w-12">
                <QRCode value={JSON.stringify({id: sale.id, total: total})} size={48} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="mb-8">
            <div>
              <p className="mb-2" style={{ color: '#4b5563' }}>De:</p>
              <h3 className="font-bold text-lg mb-1" style={{ color: '#000000' }}>{sucursal?.nombre || "Sucursal"}</h3>
              <div className="text-sm space-y-1" style={{ color: '#4b5563' }}>
                <p>{sucursal?.direccion || "Dirección no disponible"}</p>
                <p>Tel: {sucursal?.telefono || "pendiente"}</p>
                <p>Email: {sucursal?.email || "lym@outlook.com"}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#2c7be5', color: '#ffffff' }}>
                  <th className="py-2 px-3 text-left w-12">no.</th>
                  <th className="py-2 px-3 text-left">Descripción</th>
                  <th className="py-2 px-3 text-center">Cantidad</th>
                  <th className="py-2 px-3 text-right">Precio Unitario</th>
                  <th className="py-2 px-3 text-right">Impuestos</th>
                  <th className="py-2 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#e5e7eb' }}>
                {items.map((item: any, index: number) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9fafb' : '#ffffff' }}>
                    <td className="py-3 px-3 text-center" style={{ color: '#111827' }}>{index + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-medium" style={{ color: '#111827' }}>
                        {item.productInfo?.nombre || "Producto desconocido"}
                      </div>
                      <div className="text-xs" style={{ color: '#6b7280' }}>
                        {item.productoId} 
                        {item.productInfo?.lote && ` (LOTE${item.productInfo.lote})`}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div style={{ color: '#111827' }}>{item.cantidad.toFixed(2)}</div>
                      <div className="text-xs" style={{ color: '#6b7280' }}>{item.productInfo?.presentacion || "Pieza"}</div>
                    </td>
                    <td className="py-3 px-3 text-right" style={{ color: '#111827' }}>${item.precio.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right" style={{ color: '#6b7280' }}>(IVA) ${(item.impuestos || 0).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-medium" style={{ color: '#111827' }}>${item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex flex-col items-end space-y-2 border-t pt-4" style={{ borderColor: '#e5e7eb' }}>
            <div className="w-64 flex justify-between text-sm">
              <span style={{ color: '#4b5563' }}>Total (MXN)</span>
              <span style={{ color: '#111827' }}>${totalImpuestos.toFixed(2)}</span>
            </div>
            
            <div className="w-full border-t my-2" style={{ borderColor: '#e5e7eb' }}></div>
            
            <div className="w-64 flex justify-between font-bold text-lg">
              <span style={{ color: '#111827' }}>Cantidad Total (MXN)</span>
              <span style={{ color: '#111827' }}>${total.toFixed(2)}</span>
            </div>
            
            <div className="w-64 flex justify-between font-bold text-lg border-t pt-2" style={{ borderColor: '#f3f4f6' }}>
              <span style={{ color: '#111827' }}>Pagado (MXN)</span>
              <span style={{ color: '#111827' }}>${total.toFixed(2)}</span>
            </div>
            
            <div className="w-64 flex justify-between font-bold text-lg pt-2">
              <span style={{ color: '#111827' }}>Balance (MXN)</span>
              <span style={{ color: '#111827' }}>0.00</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="p-4 rounded-b-lg border-t text-right text-sm" 
          style={{ backgroundColor: '#f3f4f6', borderColor: '#e5e7eb', color: '#4b5563' }}
        >
          Creado por: {sale.usuarioNombre || sale.usuario || "Sistema"}
        </div>
      </div>
    </div>
  );
}