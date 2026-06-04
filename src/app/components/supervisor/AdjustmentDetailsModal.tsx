import { useRef, useState } from "react";
import { X, Printer, Download, FileText, Building, Calendar, ClipboardList } from "lucide-react";
import { SUCURSALES } from "../../shared";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

interface AdjustmentDetailsModalProps {
  ajuste: any;
  onClose: () => void;
}

export default function AdjustmentDetailsModal({ ajuste, onClose }: AdjustmentDetailsModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const sucursal = SUCURSALES.find(s => s.id === ajuste.sucursalId);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    
    try {
      setIsGenerating(true);
      
      // Esperar un momento para asegurar que el renderizado esté completo
      await newQP(100);

      const dataUrl = await toPng(contentRef.current, {
        quality: 0.95,
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
      pdf.save(`ajuste-${ajuste.id || 'sin-id'}.pdf`);
    } catch (error) {
      console.error("Error generando PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const newQP = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  if (!ajuste) return null;

  return (
    <div className="fixed inset-0 bg-[#000000]/50 flex items-center justify-center z-[60] p-4 overflow-y-auto print:p-0 print:bg-[#ffffff] print:static">
      <div className="bg-[#ffffff] rounded-2xl shadow-2xl max-w-4xl w-full my-8 print:shadow-none print:w-full print:max-w-none print:my-0 print:rounded-none">
        {/* Header con botones de acción (oculto al imprimir) */}
        <div className="flex justify-between items-center p-4 border-b border-[#e5e7eb] print:hidden">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[#1f2937]">
            <ClipboardList className="w-5 h-5 text-[#4f46e5]" />
            Detalle de Ajuste
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-[#4b5563] hover:bg-[#f3f4f6] rounded-lg transition-colors flex items-center gap-2"
              title="Imprimir"
            >
              <Printer className="w-5 h-5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="p-2 text-[#16a34a] hover:bg-[#f0fdf4] rounded-lg transition-colors flex items-center gap-2"
              title="Descargar PDF"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">
                {isGenerating ? "Generando..." : "PDF"}
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#9ca3af] hover:text-[#4b5563] rounded-lg transition-colors ml-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenido del Documento */}
        <div className="p-8 print:p-8 bg-[#ffffff]" ref={contentRef}>
          {/* Encabezado del Documento */}
          <div className="flex justify-between items-start mb-8 border-b border-[#e5e7eb] pb-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1f2937] mb-2">Call Center</h1>
              <p className="text-[#6b7280] text-sm">Sistema de Gestión Farmacéutica</p>
              <p className="text-[#6b7280] text-sm mt-2 font-medium">Comprobante de Ajuste de Inventario</p>
            </div>
            <div className="text-right">
              <div className="bg-[#f3f4f6] px-4 py-2 rounded-lg inline-block mb-2">
                <p className="text-xs text-[#6b7280] uppercase font-bold">Folio</p>
                <p className="text-lg font-mono font-bold text-[#1f2937]">
                  #{ajuste.id ? ajuste.id.replace("ajuste:", "") : "S/F"}
                </p>
              </div>
              <p className="text-sm text-[#4b5563] mt-2">
                Fecha: {new Date(ajuste.fecha).toLocaleDateString("es-MX", { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>

          {/* Información General */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-[#f9fafb] p-4 rounded-lg border border-[#f3f4f6]">
              <h3 className="text-xs font-bold text-[#9ca3af] uppercase mb-2 flex items-center gap-1">
                <Building className="w-3 h-3" />
                Sucursal Afectada
              </h3>
              <p className="font-bold text-[#1f2937] text-lg">{sucursal?.nombre || ajuste.sucursalNombre || "Sucursal Desconocida"}</p>
              <p className="text-sm text-[#4b5563] mt-1">{sucursal?.direccion || "Dirección no registrada"}</p>
            </div>
            <div className="bg-[#f9fafb] p-4 rounded-lg border border-[#f3f4f6]">
              <h3 className="text-xs font-bold text-[#9ca3af] uppercase mb-2 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Motivo del Ajuste
              </h3>
              <p className="font-bold text-[#1f2937] text-lg capitalize">{ajuste.motivo || "No especificado"}</p>
              <p className="text-sm text-[#4b5563] mt-1">
                Tipo: {ajuste.motivo === "inventario_fisico" ? "Corrección de Stock" : "Incidencia"}
              </p>
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#1f2937] text-[#ffffff]">
                  <th className="px-4 py-3 text-left text-sm font-semibold rounded-tl-lg">Código</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Producto</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold rounded-tr-lg">Nuevo Stock</th>
                </tr>
              </thead>
              <tbody className="border border-[#e5e7eb]">
                <tr>
                  <td className="px-4 py-4 border-b border-[#f3f4f6] font-mono text-sm text-[#4b5563]">
                    {ajuste.productoId}
                  </td>
                  <td className="px-4 py-4 border-b border-[#f3f4f6]">
                    <p className="font-bold text-[#1f2937]">{ajuste.nombreProducto}</p>
                    {ajuste.notas && (
                      <p className="text-xs text-[#6b7280] italic mt-1">Nota: {ajuste.notas}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right border-b border-[#f3f4f6] font-bold text-xl text-[#4f46e5]">
                    {ajuste.nuevoStock}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Información Adicional Footer */}
          <div className="border-t-2 border-dashed border-[#e5e7eb] pt-6 mt-12 flex justify-between items-end">
            <div className="max-w-md">
               <p className="text-xs text-[#9ca3af] uppercase font-bold mb-1">Observaciones</p>
               <p className="text-sm text-[#374151] italic bg-[#fefce8] p-3 rounded border border-[#fef9c3]">
                 {ajuste.notas || "Sin observaciones adicionales."}
               </p>
            </div>

            <div className="text-right space-y-1">
              <p className="text-sm text-[#4b5563]">
                <span className="font-bold text-[#1f2937]">Realizado por:</span> {ajuste.referencia || "Usuario del Sistema"}
              </p>
              <p className="text-sm text-[#4b5563]">
                <span className="font-bold text-[#1f2937]">Registrado por:</span> {ajuste.creadoPor || "Sistema"}
              </p>
              <p className="text-sm text-[#4b5563]">
                <span className="font-bold text-[#1f2937]">Fecha y Hora:</span> {new Date(ajuste.fecha).toLocaleString("es-MX")}
              </p>
            </div>
          </div>
          
          <div className="mt-8 text-center text-xs text-[#9ca3af] print:mt-16">
            <p>Documento generado electrónicamente por Call Center</p>
            <p>Este documento ampara un movimiento de inventario en el sistema.</p>
          </div>
        </div>
      </div>
    </div>
  );
}