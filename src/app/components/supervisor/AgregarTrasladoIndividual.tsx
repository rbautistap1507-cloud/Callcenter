import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, Plus, ArrowRightLeft, Check, Info, Trash2, Package } from "lucide-react";
import { SUCURSALES, User } from "../../shared";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

interface AgregarTrasladoIndividualProps {
  user: User;
  selectedSucursal: string;
  onBack: () => void;
  onSuccess: () => void;
}

interface ProductoCarrito {
  productoId: string;
  productoNombre: string;
  codigoBarras: string;
  cantidad: number;
  precioUnitario: number;
  stockActual: number;
}

export default function AgregarTrasladoIndividual({
  user,
  selectedSucursal,
  onBack,
  onSuccess,
}: AgregarTrasladoIndividualProps) {
  const [productos, setProductos] = useState<any[]>([]);
  const [searchProducto, setSearchProducto] = useState("");
  const [carrito, setCarrito] = useState<ProductoCarrito[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    descripcion: "",
    sucursalDestinoId: "",
  });

  useEffect(() => {
    loadProductos();
  }, [selectedSucursal]);

  const loadProductos = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setProductos(data.productos || []);
      }
    } catch (error) {
      console.error("Error cargando productos:", error);
      toast.error("Error al cargar productos");
    }
  };

  const agregarProductoCarrito = (producto: any) => {
    const yaEnCarrito = carrito.find((item) => item.productoId === producto.id);
    
    if (yaEnCarrito) {
      toast.error("Este producto ya está en el carrito");
      return;
    }

    const stockActual = producto.stockBySucursal?.[selectedSucursal] || 0;
    
    if (stockActual <= 0) {
      toast.error("No hay stock disponible en esta sucursal para trasladar");
      return;
    }

    const nuevoItem: ProductoCarrito = {
      productoId: producto.id,
      productoNombre: producto.nombre,
      codigoBarras: producto.codigoBarras,
      cantidad: 1,
      precioUnitario: parseFloat(producto.costo || producto.precioVenta || 0),
      stockActual: stockActual,
    };

    setCarrito([...carrito, nuevoItem]);
    setSearchProducto("");
    toast.success("Producto agregado al traslado");
  };

  const actualizarCantidad = (index: number, cantidad: number) => {
    const nuevoCarrito = [...carrito];
    const item = nuevoCarrito[index];
    
    if (cantidad > item.stockActual) {
      toast.error(`Stock insuficiente. Máximo: ${item.stockActual}`);
      return;
    }
    
    if (cantidad <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }
    
    nuevoCarrito[index].cantidad = cantidad;
    setCarrito(nuevoCarrito);
  };

  const eliminarProducto = (index: number) => {
    const nuevoCarrito = carrito.filter((_, i) => i !== index);
    setCarrito(nuevoCarrito);
    toast.success("Producto eliminado del traslado");
  };

  const calcularTotal = () => {
    return carrito.reduce((sum, item) => sum + item.cantidad * item.precioUnitario, 0);
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.descripcion.trim()) {
      toast.error("La descripción es requerida");
      return;
    }

    if (!formData.sucursalDestinoId) {
      toast.error("Debes seleccionar la sucursal de destino");
      return;
    }

    if (formData.sucursalDestinoId === selectedSucursal) {
      toast.error("La sucursal de origen y destino no pueden ser iguales");
      return;
    }

    if (carrito.length === 0) {
      toast.error("Debes agregar al menos un producto al traslado");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        descripcion: formData.descripcion.trim(),
        sucursalOrigenId: selectedSucursal,
        sucursalDestinoId: formData.sucursalDestinoId,
        productos: carrito.map((item) => ({
          productoId: item.productoId,
          productoNombre: item.productoNombre,
          codigoBarras: item.codigoBarras,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
        })),
        total: calcularTotal(),
        estado: "pendiente",
        creadoPor: user.email,
        creadoPorNombre: user.nombre || user.name,
      };

      console.log("📤 Creando traslado:", payload);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/traslados`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      console.log("📥 Respuesta del backend:", data);

      if (!response.ok) {
        throw new Error(data.error || "Error al crear el traslado");
      }

      toast.success("Traslado creado exitosamente");
      onSuccess();
      onBack();
    } catch (error: any) {
      console.error("❌ Error al crear traslado:", error);
      toast.error(error.message || "Error al crear el traslado");
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(searchProducto.toLowerCase()) ||
      p.codigoBarras?.includes(searchProducto)
  );

  const sucursalOrigen = SUCURSALES.find((s) => s.id === selectedSucursal);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-4"
        >
          ← Volver a lista de traslados
        </button>
        <h3 className="font-bold text-xl">Agregar Traslado Individual</h3>
        <p className="text-gray-600 text-sm mt-2">
          Traslado desde: <span className="font-semibold">{sucursalOrigen?.nombre}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sección de Productos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar Producto *
          </label>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchProducto}
              onChange={(e) => setSearchProducto(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {searchProducto && (
            <div className="max-h-64 overflow-y-auto border rounded-lg mb-4">
              {productosFiltrados.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No se encontraron productos</div>
              ) : (
                productosFiltrados.map((producto) => {
                  const stockActual = producto.stockBySucursal?.[selectedSucursal] || 0;
                  return (
                    <div
                      key={producto.id}
                      onClick={() => agregarProductoCarrito(producto)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">{producto.nombre}</p>
                          <p className="text-xs text-gray-500">{producto.codigoBarras}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Stock</p>
                          <p className={`text-sm font-bold ${stockActual > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stockActual}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Carrito de Productos */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Productos a Trasladar ({carrito.length})
            </h4>
            
            {carrito.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay productos agregados
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {carrito.map((item, index) => (
                  <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.productoNombre}</p>
                        <p className="text-xs text-gray-500">{item.codigoBarras}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Stock disponible: <span className="font-semibold">{item.stockActual}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => eliminarProducto(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-600">Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          max={item.stockActual}
                          value={item.cantidad}
                          onChange={(e) => actualizarCantidad(index, Number(e.target.value))}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Subtotal</label>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          ${(item.cantidad * item.precioUnitario).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {carrito.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-indigo-600">
                    ${calcularTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sección de Información del Traslado */}
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sucursal Destino *
            </label>
            <select
              value={formData.sucursalDestinoId}
              onChange={(e) =>
                setFormData({ ...formData, sucursalDestinoId: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Seleccionar sucursal...</option>
              {SUCURSALES.filter((s) => s.id !== selectedSucursal).map((suc) => (
                <option key={suc.id} value={suc.id}>
                  {suc.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción *
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32"
              placeholder="Describe el motivo del traslado..."
              required
            />
          </div>

          {/* Resumen del Traslado */}
          {formData.sucursalDestinoId && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                Resumen del Traslado
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-800">Origen:</span>
                  <span className="font-semibold text-blue-900">
                    {SUCURSALES.find((s) => s.id === selectedSucursal)?.nombre}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800">Destino:</span>
                  <span className="font-semibold text-blue-900">
                    {SUCURSALES.find((s) => s.id === formData.sucursalDestinoId)?.nombre}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800">Productos:</span>
                  <span className="font-semibold text-blue-900">{carrito.length}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-300">
                  <span className="text-blue-800">Total:</span>
                  <span className="font-bold text-lg text-blue-900">
                    ${calcularTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 mb-4">
            <p className="text-xs text-yellow-800 flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                El inventario de la sucursal origen se reducirá y el de la sucursal destino se
                incrementará cuando el traslado sea marcado como "Completado".
              </span>
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || carrito.length === 0 || !formData.sucursalDestinoId || !formData.descripcion.trim()}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            {loading ? "Guardando..." : "Guardar Traslado"}
          </button>
        </div>
      </div>
    </div>
  );
}