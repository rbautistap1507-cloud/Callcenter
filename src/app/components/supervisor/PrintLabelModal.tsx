import { useState, useRef, useEffect } from "react";
import { X, Printer, Check, Copy } from "lucide-react";
import { SUCURSALES } from "../../shared";

interface PrintLabelModalProps {
  product: any;
  onClose: () => void;
}

export default function PrintLabelModal({ product, onClose }: PrintLabelModalProps) {
  const [config, setConfig] = useState({
    showBarcode: true,
    showName: true,
    showVariants: false, // Default false unless specific logic requires it
    showPrice: true,
    showCategory: false,
    showUnit: false,
    quantity: 1,
  });

  const [printMode, setPrintMode] = useState(false);

  // Determine if product has variants (batches with different locations)
  const hasVariants = product.stockBySucursal && Object.values(product.stockBySucursal).some((val: any) => val > 0);
  
  // Prepare variants list for printing if enabled
  const variants = SUCURSALES.filter(s => (product.stockBySucursal?.[s.id] || 0) > 0).map(s => ({
    sucursal: s.nombre,
    cantidad: product.stockBySucursal[s.id]
  }));

  const handlePrint = () => {
    setPrintMode(true);
    // Slight delay to allow DOM to update before printing
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 100);
  };

  // Styles for printing
  // We use a style tag to inject print-specific CSS dynamically
  const printStyles = `
    @media print {
      body * {
        visibility: hidden;
      }
      #print-area, #print-area * {
        visibility: visible;
      }
      #print-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      @page {
        size: auto;
        margin: 0mm;
      }
    }
  `;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <style>{printStyles}</style>
      
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-600" />
            Imprimir Etiquetas
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
            
            {/* Configuration Column */}
            <div className="md:col-span-4 space-y-6 border-r pr-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Configuración de Impresión</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={config.showBarcode} 
                      onChange={e => setConfig({...config, showBarcode: e.target.checked})}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-gray-700">Código de Barras</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={config.showName} 
                      onChange={e => setConfig({...config, showName: e.target.checked})}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-gray-700">Nombre de Producto</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={config.showPrice} 
                      onChange={e => setConfig({...config, showPrice: e.target.checked})}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-gray-700">Precio</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={config.showCategory} 
                      onChange={e => setConfig({...config, showCategory: e.target.checked})}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-gray-700">Categoría</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={config.showVariants} 
                      onChange={e => setConfig({...config, showVariants: e.target.checked})}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-gray-700">Variantes / Lotes</span>
                      <span className="text-xs text-gray-500">Muestra disponibilidad por sucursal</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={config.showUnit} 
                      onChange={e => setConfig({...config, showUnit: e.target.checked})}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-gray-700">Unidad</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Cantidad de Impresiones</h3>
                <input 
                  type="number" 
                  min="1" 
                  max="100"
                  value={config.quantity}
                  onChange={e => setConfig({...config, quantity: parseInt(e.target.value) || 1})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Preview Column */}
            <div className="md:col-span-8 bg-gray-100 p-6 rounded-lg border-2 border-dashed border-gray-300 overflow-y-auto flex flex-col items-center">
              <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider w-full text-center">Vista Previa de Impresión</h3>
              
              {/* This is the visual preview area that mirrors what will be printed */}
              <div className="bg-white shadow-lg p-8 min-h-[400px] w-full max-w-lg mx-auto">
                <div className="grid grid-cols-1 gap-4">
                   {/* Render a sample label */}
                   <LabelPreview product={product} config={config} />
                   
                   {config.quantity > 1 && (
                     <div className="text-center py-4 text-gray-400 italic border-t border-gray-100 mt-4">
                       + {config.quantity - 1} etiquetas idénticas adicionales
                     </div>
                   )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Cancelar
          </button>
          <button 
            onClick={handlePrint}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-5 h-5" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Hidden Print Area */}
      <div id="print-area" className="hidden">
        <div className="print-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(60mm, 1fr))', 
          gap: '2mm', 
          padding: '2mm' 
        }}>
          {Array.from({ length: config.quantity }).map((_, i) => (
            <div key={i} className="break-inside-avoid">
              <LabelPreview product={product} config={config} isPrint={true} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Subcomponent for the actual label design
function LabelPreview({ product, config, isPrint = false }: { product: any, config: any, isPrint?: boolean }) {
  // Simple barcode visual simulation using CSS stripes if no font available
  const Barcode = ({ code }: { code: string }) => (
    <div className="flex flex-col items-center">
      {/* Visual stripes */}
      <div className="h-8 flex items-end justify-center gap-[1px] w-full max-w-[150px] overflow-hidden opacity-80" aria-hidden="true">
        {code.split('').map((char, i) => (
          <div 
            key={i} 
            className="bg-black h-full" 
            style={{ 
              width: `${Math.max(1, (char.charCodeAt(0) % 4) + 1)}px`,
              height: `${80 + (char.charCodeAt(0) % 20)}%`
            }} 
          />
        ))}
        {/* Fill with random stripes to look like a full barcode */}
        {Array.from({ length: 20 }).map((_, i) => (
           <div key={`fill-${i}`} className="bg-black h-full" style={{ width: `${(i % 3) + 1}px` }} />
        ))}
      </div>
      <span className="font-mono text-xs mt-1 tracking-widest">{code}</span>
    </div>
  );

  return (
    <div className={`
      border-2 border-gray-800 rounded p-4 flex flex-col items-center justify-center text-center bg-white
      ${isPrint ? 'w-full h-auto p-2 border' : 'w-full'}
    `}>
      
      {config.showName && (
        <h3 className="font-bold text-lg mb-1 leading-tight">{product.nombre}</h3>
      )}

      {config.showCategory && (
        <p className="text-xs text-gray-500 uppercase mb-2">{product.categoria || product.grupo}</p>
      )}

      {config.showBarcode && (
        <div className="my-2">
           <Barcode code={product.codigoBarras || "00000000"} />
        </div>
      )}

      <div className="flex items-center gap-4 mt-2">
        {config.showPrice && (
          <div className="font-bold text-2xl">
            ${parseFloat(product.precioVenta || 0).toFixed(2)}
          </div>
        )}
        
        {config.showUnit && (
          <div className="text-sm border border-gray-300 rounded px-2 py-1">
            {product.presentacion || "UNIDAD"}
          </div>
        )}
      </div>

      {config.showVariants && product.stockBySucursal && (
         <div className="mt-3 w-full text-left border-t pt-2">
           <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Disponibilidad:</p>
           <div className="grid grid-cols-2 gap-1 text-xs">
             {SUCURSALES.filter(s => (product.stockBySucursal[s.id] || 0) > 0).map(s => (
               <div key={s.id} className="flex justify-between">
                 <span>{s.nombre.substring(0, 10)}</span>
                 <span className="font-mono">{product.stockBySucursal[s.id]}</span>
               </div>
             ))}
           </div>
         </div>
      )}
    </div>
  );
}