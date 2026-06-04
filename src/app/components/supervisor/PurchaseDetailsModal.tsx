import { useRef, useState } from "react";
import { X, Printer, Download, FileText, Building, Calendar, User } from "lucide-react";
import { SUCURSALES } from "../../shared";
import { formatearFechaCDMX, formatearFechaHoraCDMX } from "../../../../utils/timezone";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

interface PurchaseDetailsModalProps {
  compra: any;
  onClose: () => void;
}

export default function PurchaseDetailsModal({ compra, onClose }: PurchaseDetailsModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const sucursal = SUCURSALES.find(s => s.id === compra.sucursalId);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const items = compra._grupo || [compra];
    const sucursalNombre = SUCURSALES.find((s: any) => s.id === compra.sucursalId)?.nombre || "N/A";
    const totalGrupo = items.reduce((s: number, it: any) => s + parseFloat(it.precioCompra || 0) * parseFloat(it.cantidad || 0), 0);
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    const filas = items.map((item: any) => `
      <tr>
        <td><strong>${item.nombreProducto || ""}</strong><br><span style="color:#6b7280;font-size:10px">Codigo: ${item.productoId || "N/A"}</span></td>
        <td>${item.cantidad || 0}</td>
        <td>$${parseFloat(item.precioCompra || 0).toFixed(2)}</td>
        <td><strong>$${(parseFloat(item.precioCompra || 0) * parseFloat(item.cantidad || 0)).toFixed(2)}</strong></td>
      </tr>`).join("");
    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Compra ${compra.referencia || compra.id}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 30px; color: #1f2937; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .card { background: #f9fafb; padding: 12px; border-radius: 8px; }
  .label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #1f2937; color: white; padding: 10px; text-align: left; font-size: 11px; }
  td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  .total { text-align: right; font-size: 16px; font-weight: bold; color: #4f46e5; }
  @media print { body { padding: 10px; } }
</style></head>
<body>
<div class="header">
  <div><h1>Farmacia LYM</h1><p style="color:#6b7280">Orden de Compra</p></div>
  <div style="text-align:right">
    <div style="background:#f3f4f6;padding:8px 16px;border-radius:8px;display:inline-block">
      <div class="label">Referencia</div>
      <div style="font-size:16px;font-weight:bold;font-family:monospace">${compra.referencia || (compra.id || "").replace("compra:", "")}</div>
    </div>
    <p style="margin-top:8px;color:#4b5563">Fecha: ${formatearFechaCDMX(compra.fecha)}</p>
  </div>
</div>
<div class="grid">
  <div class="card"><div class="label">Sucursal</div><div style="font-weight:bold;font-size:14px">${sucursalNombre}</div></div>
  <div class="card"><div class="label">Proveedor</div><div style="font-weight:bold;font-size:14px">${compra.proveedor || "N/A"}</div></div>
  <div class="card"><div class="label">Creado por</div><div style="font-weight:bold">${compra.creadoPor || compra.usuarioNombre || compra.usuario || "Sistema"}</div></div>
  <div class="card"><div class="label">Estado</div><div style="font-weight:bold">${compra.estatus || "pendiente"}</div></div>
</div>
<table>
  <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio Unit.</th><th>Total</th></tr></thead>
  <tbody>${filas}</tbody>
</table>
<div class="total">Total: $${totalGrupo.toFixed(2)}</div>
<div style="margin-top:40px;border-top:2px dashed #e5e7eb;padding-top:16px;font-size:10px;color:#9ca3af;text-align:center">
  Documento generado electronicamente por Farmacia LYM
</div>
<script>window.onload=function(){window.print();setTimeout(()=>window.close(),500);}<\/script>
</body></html>`);
    printWindow.document.close();
  };

  const newQP = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  if (!compra) return null;

  return (
    <div className="fixed inset-0 bg-[#000000]/50 flex items-center justify-center z-[60] p-4 overflow-y-auto print:p-0 print:bg-[#ffffff] print:static">
      <div className="bg-[#ffffff] rounded-2xl shadow-2xl max-w-4xl w-full my-8 print:shadow-none print:w-full print:max-w-none print:my-0 print:rounded-none flex flex-col max-h-[90vh]">
        {/* Header con botones de acción (oculto al imprimir) */}
        <div className="flex justify-between items-center p-4 border-b border-[#e5e7eb] print:hidden">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[#1f2937]">
            <FileText className="w-5 h-5 text-[#4f46e5]" />
            Detalle de Compra
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
        <div className="p-8 print:p-8 bg-[#ffffff] overflow-y-auto flex-1" ref={contentRef}>
          {/* Encabezado del Documento */}
          <div className="flex justify-between items-start mb-8 border-b border-[#e5e7eb] pb-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1f2937] mb-2">Farmacia LYM</h1>
              <p className="text-[#6b7280] text-sm">Sistema de Gestión Farmacéutica</p>
              <p className="text-[#6b7280] text-sm mt-2 font-medium">Orden de Compra</p>
            </div>
            <div className="text-right">
              <div className="bg-[#f3f4f6] px-4 py-2 rounded-lg inline-block mb-2">
                <p className="text-xs text-[#6b7280] uppercase font-bold">Referencia</p>
                <p className="text-lg font-mono font-bold text-[#1f2937]">
                  {compra.referencia || (compra.id ? compra.id.replace("compra:", "") : "S/F")}
                </p>
              </div>
              <p className="text-sm text-[#4b5563] mt-2">
                Fecha: {formatearFechaCDMX(compra.fecha)}
              </p>
            </div>
          </div>

          {/* Información de Sucursal y Proveedor */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-[#f9fafb] p-4 rounded-lg border border-[#f3f4f6]">
              <h3 className="text-xs font-bold text-[#9ca3af] uppercase mb-2 flex items-center gap-1">
                <Building className="w-3 h-3" />
                Sucursal Destino
              </h3>
              <p className="font-bold text-[#1f2937] text-lg">{sucursal?.nombre || "Sucursal Desconocida"}</p>
              <p className="text-sm text-[#4b5563] mt-1">{sucursal?.direccion || "Dirección no registrada"}</p>
            </div>
            <div className="bg-[#f9fafb] p-4 rounded-lg border border-[#f3f4f6]">
              <h3 className="text-xs font-bold text-[#9ca3af] uppercase mb-2 flex items-center gap-1">
                <User className="w-3 h-3" />
                Proveedor
              </h3>
              <p className="font-bold text-[#1f2937] text-lg">{compra.proveedor || "Proveedor General"}</p>
              <p className="text-sm text-[#4b5563] mt-1">ID: {compra.proveedorId || "N/A"}</p>
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#1f2937] text-[#ffffff]">
                  <th className="px-4 py-3 text-left text-sm font-semibold rounded-tl-lg">Descripción</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Cantidad</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Precio Unit.</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold rounded-tr-lg">Total</th>
                </tr>
              </thead>
              <tbody className="border border-[#e5e7eb]">
                {(compra._grupo || [compra]).map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-4 border-b border-[#f3f4f6]">
                      <p className="font-bold text-[#1f2937]">{item.nombreProducto}</p>
                      <p className="text-xs text-[#6b7280]">ID: {item.productoId}</p>
                      {item.notas && (
                        <p className="text-xs text-[#6b7280] italic mt-1">Nota: {item.notas}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center border-b border-[#f3f4f6] font-medium">
                      {item.cantidad}
                    </td>
                    <td className="px-4 py-4 text-right border-b border-[#f3f4f6] text-[#4b5563]">
                      ${parseFloat(item.precioCompra || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-right border-b border-[#f3f4f6] font-bold text-[#1f2937]">
                      ${(parseFloat(item.precioCompra || 0) * parseFloat(item.cantidad || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-bold text-[#4b5563] border-t border-[#e5e7eb]">Total:</td>
                  <td className="px-4 py-3 text-right font-bold text-xl text-[#4f46e5] border-t border-[#e5e7eb]">
                    ${(compra._grupo ? compra._grupo.reduce((s: number, it: any) => s + parseFloat(it.precioCompra || 0) * parseFloat(it.cantidad || 0), 0) : (parseFloat(compra.total) || parseFloat(compra.precioCompra || 0) * parseFloat(compra.cantidad || 0))).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Información Adicional Footer */}
          <div className="border-t-2 border-dashed border-[#e5e7eb] pt-6 mt-12">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-xs text-[#9ca3af] uppercase font-bold mb-1">Estado</p>
                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
                  compra.estatus === "recibido"
                    ? "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]"
                    : compra.estatus === "devuelto"
                    ? "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]"
                    : compra.estatus === "eliminado"
                    ? "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]"
                    : "bg-[#fefce8] text-[#a16207] border-[#fef08a]"
                }`}>
                  {compra.estatus === "recibido" 
                    ? "RECIBIDO" 
                    : compra.estatus === "devuelto"
                    ? "DEVUELTO"
                    : compra.estatus === "eliminado"
                    ? "ELIMINADO"
                    : "PENDIENTE"}
                </span>
              </div>

              <div className="text-right space-y-1">
                <p className="text-sm text-[#4b5563]">
                  <span className="font-bold text-[#1f2937]">Creado por:</span> {compra.creadoPor || compra.usuarioNombre || compra.usuario || "Sistema"}
                </p>
                <p className="text-sm text-[#4b5563]">
                  <span className="font-bold text-[#1f2937]">Fecha de Registro:</span> {formatearFechaHoraCDMX(compra.fechaCreacion || compra.fecha)}
                </p>
              </div>
            </div>

            {/* Información de devolución o eliminación */}
            {compra.estatus === "devuelto" && (
              <div className="bg-[#fff7ed] border-l-4 border-[#fb923c] p-4 rounded-lg mt-4">
                <p className="text-sm font-bold text-[#c2410c] mb-1">Devolución de Compra</p>
                <p className="text-sm text-[#9a3412]">
                  <span className="font-semibold">Motivo:</span> {compra.motivoDevolucion}
                </p>
                <p className="text-xs text-[#9a3412] mt-1">
                  Fecha de devolución: {new Date(compra.fechaDevolucion).toLocaleString("es-MX")}
                </p>
              </div>
            )}

            {compra.estatus === "eliminado" && (
              <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] p-4 rounded-lg mt-4">
                <p className="text-sm font-bold text-[#b91c1c] mb-1">Compra Eliminada</p>
                <p className="text-sm text-[#991b1b]">
                  <span className="font-semibold">Motivo:</span> {compra.motivoEliminacion}
                </p>
                <p className="text-xs text-[#991b1b] mt-1">
                  Fecha de eliminación: {new Date(compra.fechaEliminacion).toLocaleString("es-MX")}
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-8 text-center text-xs text-[#9ca3af] print:mt-16">
            <p>Documento generado electrónicamente por Farmacia LYM</p>
          </div>
        </div>
      </div>
    </div>
  );
}