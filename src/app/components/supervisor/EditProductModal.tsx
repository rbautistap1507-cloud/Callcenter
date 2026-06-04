import { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { SUCURSALES } from "../../shared";

interface EditProductModalProps {
  product: any;
  onClose: () => void;
  onSave: (updatedProduct: any) => Promise<void>;
  isLoading: boolean;
}

export default function EditProductModal({ product, onClose, onSave, isLoading }: EditProductModalProps) {
  const [formData, setFormData] = useState({
  tipo: product.tipo || "Estandar",
  nombre: product.nombre || "",
  codigoBarras: product.codigoBarras || "",
  slug: product.slug || product.codigoBarras || "",
  etiquetas: product.etiquetas || "",
  barcodeType: product.barcodeType || "Code128",
  categoria: product.categoria || "",
  subCategoria: product.subCategoria || "",
  sustanciaActiva: product.sustanciaActiva || "",
  concentracion: product.concentracion || "",
  forma: product.forma || "",
  lote: product.lote || "",
  caducidad: product.caducidad || "",
  stockMinimo: product.stockMinimo || 10,
  unidad: product.unidad || "Pieza (Pieza)",
  unidadVenta: product.unidadVenta || "Pieza",
  piezasPorCaja: product.piezasPorCaja || 1,
  precioCompra: product.precioCompra || 0,
  precioVenta: product.precioVenta || 0,
  impuestoProducto: product.impuestoProducto || "",
  metodoImpuesto: product.metodoImpuesto || "",
});

  // Generar slug automático si cambia el nombre y no ha sido editado manualmente
  useEffect(() => {
    if (!product.slug && !formData.slug && formData.nombre) {
      const generatedSlug = formData.nombre
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.nombre]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ["precioCompra", "precioVenta", "stockMinimo", "piezasPorCaja"].includes(name) 
  ? parseFloat(value) || 0 
  : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...product, ...formData });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Editar producto</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 bg-blue-50 border-b border-blue-100 text-sm text-blue-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Por favor, actualice la siguiente información. Las etiquetas de los campos marcados con * son obligatorios.</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="edit-product-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Form Fields */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Tipo de Producto */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de producto *</label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Estandar">Estandar</option>
                  <option value="Servicio">Servicio</option>
                  <option value="Kit">Kit</option>
                </select>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Código de producto */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Código de producto *</label>
                <input
                  type="text"
                  name="codigoBarras"
                  value={formData.codigoBarras}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Se puede escanear su código de barras y escáner también</p>
              </div>

              {/* Codigo automatico (slug) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Codigo automatico *</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
              </div>
              {/* Sustancia Activa */}
<div>
  <label className="block text-sm font-bold text-gray-700 mb-1">
    Sustancia Activa *
    <span className="text-xs font-normal text-gray-500 ml-2">
      (Nombre genérico — agrupa productos equivalentes)
    </span>
  </label>
  <input
    type="text"
    name="sustanciaActiva"
    value={formData.sustanciaActiva}
    onChange={handleChange}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="Ej: ibuprofeno, amoxicilina, metformina"
  />
  <p className="text-xs text-gray-500 mt-1">
    Escribe en minúsculas sin acentos. Productos con la misma sustancia se agruparán en el POS.
  </p>
</div>

{/* Concentración y Forma */}
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1">Concentración</label>
    <input
      type="text"
      name="concentracion"
      value={formData.concentracion}
      onChange={handleChange}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Ej: 400mg, 500mg, 10ml"
    />
  </div>
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1">Forma Farmacéutica</label>
    <select
      name="forma"
      value={formData.forma}
      onChange={handleChange}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      <option value="">Seleccionar</option>
      <option value="tableta">Tableta</option>
      <option value="capsula">Cápsula</option>
      <option value="suspension">Suspensión</option>
      <option value="jarabe">Jarabe</option>
      <option value="inyectable">Inyectable</option>
      <option value="crema">Crema</option>
      <option value="ungüento">Ungüento</option>
      <option value="gotas">Gotas</option>
      <option value="ovulo">Óvulo</option>
      <option value="supositorio">Supositorio</option>
      <option value="parche">Parche</option>
     <option value="polvo">Polvo</option>
    </select>
  </div>
</div>
{/* Lote y Caducidad */}
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1">Lote</label>
    <input
      type="text"
      name="lote"
      value={formData.lote}
      onChange={handleChange}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Ej: LOT2026A"
    />
  </div>
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1">Caducidad</label>
    <input
      type="date"
      name="caducidad"
      value={formData.caducidad}
      onChange={handleChange}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    />
  </div>
</div>
{/* Stock Mínimo y Piezas por Caja */}
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1">
      Stock Mínimo
      <span className="text-xs font-normal text-gray-500 ml-2">(Alerta cuando baje de este número)</span>
    </label>
    <input
      type="number"
      name="stockMinimo"
      value={formData.stockMinimo}
      onChange={handleChange}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      min="0"
      placeholder="10"
    />
  </div>
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1">
      Piezas por Caja
      <span className="text-xs font-normal text-gray-500 ml-2">(Para cálculo de dosis)</span>
    </label>
    <input
      type="number"
      name="piezasPorCaja"
      value={formData.piezasPorCaja}
      onChange={handleChange}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      min="1"
      placeholder="10"
    />
  </div>
</div>

              {/* Etiquetas */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Etiquetas de Busqueda</label>
                <input
                  type="text"
                  name="etiquetas"
                  value={formData.etiquetas}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Separadas por comas"
                />
              </div>

              {/* Clase de Código de barras */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Clase de Código de barras *</label>
                <select
                  name="barcodeType"
                  value={formData.barcodeType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Code128">Code128</option>
                  <option value="Code39">Code39</option>
                  <option value="EAN13">EAN13</option>
                  <option value="EAN8">EAN8</option>
                  <option value="UPC">UPC</option>
                </select>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Categoría *</label>
                <select
  name="categoria"
  value={formData.categoria}
  onChange={handleChange}
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
>
  <option value="">Seleccionar Categoría</option>
  <option value="Antibióticos">Antibióticos</option>
  <option value="Bebés">Bebés</option>
  <option value="Botica y material de curación">Botica y material de curación</option>
  <option value="Cuidado de la piel">Cuidado de la piel</option>
  <option value="Cuidado del cabello">Cuidado del cabello</option>
  <option value="Fracción IV">Fracción IV</option>
  <option value="Fracción V">Fracción V</option>
  <option value="Fracción VI">Fracción VI</option>
  <option value="Higiene personal">Higiene personal</option>
  <option value="Pareja">Pareja</option>
  <option value="Productos de venta libre">Productos de venta libre</option>
  <option value="Vitaminas y suplementos">Vitaminas y suplementos</option>
</select>
              </div>

              {/* Sub Categoría */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Sub Categoría</label>
                <select
                  name="subCategoria"
                  value={formData.subCategoria}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">no subcategory</option>
                  {/* Opciones adicionales si hubieran */}
                </select>
              </div>

              {/* Unidad de Producto */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Unidad de Producto *</label>
                <select
                  name="unidad"
                  value={formData.unidad}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Pieza (Pieza)">Pieza (Pieza)</option>
                  <option value="Caja (Caja)">Caja (Caja)</option>
                  <option value="Litro (Litro)">Litro (Litro)</option>
                  <option value="Metro (Metro)">Metro (Metro)</option>
                  <option value="Kg (Kilogramo)">Kg (Kilogramo)</option>
                </select>
              </div>

              {/* Unidad de venta predeterminada */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Unidad de venta predeterminada</label>
                <select
                  name="unidadVenta"
                  value={formData.unidadVenta}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Pieza">Pieza</option>
                  <option value="Caja">Caja</option>
                </select>
              </div>

              {/* Costo y Precio (Agregados al final como solicitado) */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Costo del Producto</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      name="precioCompra"
                      value={formData.precioCompra}
                      onChange={handleChange}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Precio del Producto</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      name="precioVenta"
                      value={formData.precioVenta}
                      onChange={handleChange}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Impuesto sobre producto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Impuesto sobre producto</label>
                <select
                  name="impuestoProducto"
                  value={formData.impuestoProducto}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Seleccionar...</option>
                  <option value="sin_impuesto">Sin impuesto</option>
                  <option value="iva">IVA</option>
                </select>
              </div>

              {/* Metodo de impuestos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de impuestos</label>
                <select
                  name="metodoImpuesto"
                  value={formData.metodoImpuesto}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Seleccionar...</option>
                  <option value="inclusivo">Inclusivo</option>
                  <option value="exclusivo">Exclusivo</option>
                </select>
              </div>

            </div>

            {/* Right Column: Stock Info & Variants */}
            <div className="space-y-8">
              {/* Cantidades en Sucursal */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2">Cantidades en Sucursal</h3>
                <div className="space-y-2 text-sm">
                  {SUCURSALES.map(sucursal => (
                    <div key={sucursal.id} className="flex justify-between items-center">
                      <span className="font-medium text-gray-600">{sucursal.nombre}:</span>
                      <span className={`font-bold ${
                        (product.stockBySucursal?.[sucursal.id] || 0) > 0 ? "text-blue-600" : "text-gray-400"
                      }`}>
                        {(product.stockBySucursal?.[sucursal.id] || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Variants Table (Simulated based on image) */}
              <div>
                <table className="w-full text-sm border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-[#2c7be5] text-white">
                      <th className="px-3 py-2 text-left">Nombre</th>
                      <th className="px-3 py-2 text-left">Sucursal</th>
                      <th className="px-3 py-2 text-right">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-50">
                    {/* Simulando datos de variantes basados en stock */}
                    {SUCURSALES.map((sucursal, idx) => {
                      const stock = product.stockBySucursal?.[sucursal.id] || 0;
                      if (stock <= 0) return null;
                      return (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className="px-3 py-2">LOTE00{idx + 1}</td>
                          <td className="px-3 py-2">{sucursal.nombre}</td>
                          <td className="px-3 py-2 text-right font-medium">{stock.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    {SUCURSALES.every(s => (product.stockBySucursal?.[s.id] || 0) <= 0) && (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-gray-500 italic">
                          No hay variantes / lotes activos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Update Variants Section */}
              <div>
                <h3 className="font-bold text-gray-700 mb-2">Actualizacion de Variantes</h3>
                <div className="border border-gray-200 rounded overflow-hidden">
                  <div className="bg-[#2c7be5] text-white px-3 py-2 grid grid-cols-2 text-sm font-semibold">
                    <div>Nombre</div>
                    <div className="text-right">Precio</div>
                  </div>
                  <div className="p-3 bg-gray-50 space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          placeholder="Variant Name"
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input 
                          type="number" 
                          placeholder="0.0000"
                          className="px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input type="checkbox" id="more-variants" className="rounded border-gray-300" />
                  <label htmlFor="more-variants" className="text-sm text-gray-600">
                    <span className="font-bold">Agregar más variantes</span> Por ejemplo, múltiples tamaños y / o colores
                  </label>
                </div>
              </div>

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
          >
            Cerrar
          </button>
          <button
            type="submit"
            form="edit-product-form"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isLoading ? "Guardando..." : "Actualizar Producto"}
          </button>
        </div>
      </div>
    </div>
  );
}