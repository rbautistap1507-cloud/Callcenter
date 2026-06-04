import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, Check, X, RefreshCw, AlertTriangle, Plus, Package } from "lucide-react";
import { SUCURSALES } from "../../shared";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { hoyCDMX } from "../../../../utils/timezone";

interface AgregarCompraIndividualProps {
  selectedSucursal: string;
  editingCompra?: any;
  user: any;
  onBack: () => void;
  onSuccess: () => void;
}

interface ProductoCarrito {
  compraId?: string;
  productoId: string;
  codigoBarras: string;
  nombre: string;
  cantidad: number;
  precioCompra: number;
  stockActual: number;
  fechaVencimiento: string;
  lote: string;
}

export default function AgregarCompraIndividual({
  selectedSucursal,
  editingCompra,
  user,
  onBack,
  onSuccess,
}: AgregarCompraIndividualProps) {
  const [fecha, setFecha] = useState(hoyCDMX());
  const [referencia, setReferencia] = useState("");
  const [sucursalId, setSucursalId] = useState(selectedSucursal === "todas" ? "" : selectedSucursal);
  const [estatus, setEstatus] = useState<"pendiente" | "recibido">("recibido");
  const [proveedor, setProveedor] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [productos, setProductos] = useState<any[]>([]);
  const [productoNoEncontrado, setProductoNoEncontrado] = useState<string | null>(null);
  const [carrito, setCarrito] = useState<ProductoCarrito[]>([]);
  const [loading, setLoading] = useState(false);
  const [revalidando, setRevalidando] = useState(false);

  useEffect(() => {
    cargarProductos().then((prods) => {
      if (editingCompra) {
        setFecha(editingCompra.fecha ? editingCompra.fecha.split("T")[0] : hoyCDMX());
        setReferencia(editingCompra.referencia || "");
        setSucursalId(editingCompra.sucursalId || "");
        setEstatus(editingCompra.estatus || "recibido");
        setProveedor(editingCompra.proveedor || "");
        // Cargar TODOS los productos del grupo al carrito (factura completa)
        const itemsAEditar = editingCompra._grupo || [editingCompra];
        const nuevoCarrito = itemsAEditar.map((item: any) => {
          const prod = prods.find(
            (p: any) => p.codigoBarras === item.productoId || p.id === item.productoId
          );
          if (!prod) return null;
          return {
            compraId: item.id,
            productoId: prod.id,
            codigoBarras: prod.codigoBarras,
            nombre: prod.nombre,
            cantidad: item.cantidad || 1,
            precioCompra: parseFloat(item.precioCompra || 0),
            stockActual: prod.stockBySucursal?.[item.sucursalId] || 0,
            fechaVencimiento: item.fechaVencimiento || "",
            lote: item.lote || "",
          };
        }).filter(Boolean);
        setCarrito(nuevoCarrito as any);
      }
    });
  }, []);

  const cargarProductos = async (): Promise<any[]> => {
    try {
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos?limit=10000`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await resp.json();
      const prods = data.productos || [];
      setProductos(prods);
      return prods;
    } catch (e) {
      console.error("Error cargando productos:", e);
      return [];
    }
  };

  const productosFiltrados = searchTerm.length >= 2
    ? productos.filter((p) =>
        p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigoBarras?.includes(searchTerm)
      ).slice(0, 10)
    : [];

  const handleSeleccionarProducto = (producto: any) => {
    const stockActual = producto.stockBySucursal?.[sucursalId] || 0;
    const yaEnCarrito = carrito.find((c) => c.productoId === producto.id);
    if (yaEnCarrito) {
      toast.info("Este producto ya está en la lista");
      setSearchTerm("");
      return;
    }
    setCarrito((prev) => [...prev, {
      productoId: producto.id,
      codigoBarras: producto.codigoBarras,
      nombre: producto.nombre,
      cantidad: 1,
      precioCompra: parseFloat(producto.precioCompra || producto.costo || 0),
      stockActual,
      fechaVencimiento: "",
      lote: "",
    }]);
    setSearchTerm("");
    setProductoNoEncontrado(null);
  };

  const handleBuscarCodigo = () => {
    if (!searchTerm.trim()) return;
    const prod = productos.find(
      (p) => p.codigoBarras === searchTerm.trim() ||
             p.nombre?.toLowerCase() === searchTerm.toLowerCase()
    );
    if (prod) {
      handleSeleccionarProducto(prod);
    } else {
      setProductoNoEncontrado(searchTerm.trim());
    }
  };

  const handleRevalidar = async () => {
    if (!productoNoEncontrado) return;
    setRevalidando(true);
    try {
      const prods = await cargarProductos();
      const prod = prods.find((p: any) => p.codigoBarras === productoNoEncontrado);
      if (prod) {
        handleSeleccionarProducto(prod);
        setProductoNoEncontrado(null);
        toast.success("Producto encontrado y agregado");
      } else {
        toast.error("El producto aún no está en inventario");
      }
    } finally {
      setRevalidando(false);
    }
  };

  const actualizarItem = (idx: number, campo: keyof ProductoCarrito, valor: any) => {
    setCarrito((prev) => prev.map((item, i) => i === idx ? { ...item, [campo]: valor } : item));
  };

  const eliminarItem = (idx: number) => {
    setCarrito((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalCompra = carrito.reduce((sum, item) => sum + item.cantidad * item.precioCompra, 0);

  const handleGuardar = async () => {
    if (!proveedor.trim()) { toast.error("El proveedor es obligatorio"); return; }
    if (!sucursalId) { toast.error("Selecciona una sucursal"); return; }
    if (carrito.length === 0) { toast.error("Agrega al menos un producto"); return; }
    if (carrito.some((i) => i.cantidad <= 0 || i.precioCompra <= 0)) {
      toast.error("Verifica cantidad y precio en todos los productos");
      return;
    }

    setLoading(true);
    try {
      // Guardar cada producto como compra individual
      for (const item of carrito) {
        // Si el item ya existe (tiene compraId), se actualiza (PUT); si es nuevo, se crea (POST)
        const esExistente = !!item.compraId;
        const url = esExistente
          ? `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/compras/${item.compraId}`
          : `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/compras`;

        await fetch(url, {
          method: esExistente ? "PUT" : "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            sucursalId,
            productoId: item.codigoBarras,
            nombreProducto: item.nombre,
            cantidad: item.cantidad,
            precioCompra: item.precioCompra,
            total: item.cantidad * item.precioCompra,
            proveedor,
            referencia,
            creadoPor: user?.name || user?.username || "Sistema",
            estatus,
            fecha,
            fechaVencimiento: item.fechaVencimiento || "",
            lote: item.lote || "",
          }),
        });
      }

      toast.success(editingCompra ? "Compra actualizada" : `${carrito.length} compras registradas correctamente`);
      onSuccess();
      onBack();
    } catch (e) {
      toast.error("Error al guardar la compra");
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiar = () => {
    setCarrito([]);
    setSearchTerm("");
    setProductoNoEncontrado(null);
    setReferencia("");
    setProveedor("");
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <button onClick={onBack} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-4 text-sm">
          ← Volver a lista de compras
        </button>
        <h3 className="font-bold text-xl">{editingCompra ? "Editar Compra" : "Agregar Compra Individual"}</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario izquierda */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
            <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej. FAC-2026-001"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal *</label>
            <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white">
              <option value="">Seleccionar sucursal...</option>
              {SUCURSALES.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
            <select value={estatus} onChange={(e) => setEstatus(e.target.value as "pendiente" | "recibido")}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white">
              <option value="recibido">Recibido</option>
              <option value="pendiente">Pendiente</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
            <input type="text" value={proveedor} onChange={(e) => setProveedor(e.target.value)}
              placeholder="Nombre del proveedor"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>

          {/* Buscador de productos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Producto</label>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBuscarCodigo()}
                  placeholder="Nombre o código de barras..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <button onClick={handleBuscarCodigo}
                className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 text-sm">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Resultados búsqueda */}
            {productosFiltrados.length > 0 && (
              <div className="border rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg z-10 bg-white">
                {productosFiltrados.map((prod) => {
                  const stock = prod.stockBySucursal?.[sucursalId] || 0;
                  return (
                    <div key={prod.id} onClick={() => handleSeleccionarProducto(prod)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0">
                      <p className="text-sm font-medium">{prod.nombre}</p>
                      <p className="text-xs text-gray-500">{prod.codigoBarras} · Stock: {stock}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Producto no encontrado */}
            {productoNoEncontrado && (
              <div className="mt-2 border-2 border-red-300 rounded-lg p-3 bg-red-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-semibold text-red-800">Producto no encontrado en inventario</p>
                </div>
                <p className="text-xs text-red-600 font-mono mb-3">{productoNoEncontrado}</p>
                <div className="flex gap-2">
                  <button onClick={handleRevalidar} disabled={revalidando}
                    className="flex-1 flex items-center justify-center gap-1 text-xs bg-white border border-green-400 text-green-700 px-2 py-1.5 rounded-lg hover:bg-green-50 disabled:opacity-50">
                    <RefreshCw className={`w-3 h-3 ${revalidando ? "animate-spin" : ""}`} />
                    Ya está dado de alta
                  </button>
                  <button onClick={() => setProductoNoEncontrado(null)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-200">
                    <X className="w-3 h-3" /> Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vista previa derecha */}
        <div className="lg:col-span-2">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <h4 className="font-semibold text-gray-800">Productos a comprar ({carrito.length})</h4>
              </div>
              {carrito.length > 0 && (
                <span className="text-sm font-bold text-green-600">Total: ${totalCompra.toFixed(2)}</span>
              )}
            </div>

            {carrito.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Busca y agrega productos</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {carrito.map((item, idx) => (
                  <div key={idx} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{item.nombre}</p>
                        <p className="text-xs text-gray-500 font-mono">{item.codigoBarras}</p>
                        {sucursalId && (
                          <p className="text-xs text-gray-400 mt-0.5">Stock actual: {item.stockActual}</p>
                        )}
                      </div>
                      <button onClick={() => eliminarItem(idx)}
                        className="text-red-400 hover:text-red-600 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Cantidad *</label>
                        <input type="number" min="1" value={item.cantidad}
                          onChange={(e) => actualizarItem(idx, "cantidad", Number(e.target.value))}
                          className="w-full px-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Precio Compra *</label>
                        <input type="number" min="0" step="0.01" value={item.precioCompra}
                          onChange={(e) => actualizarItem(idx, "precioCompra", Number(e.target.value))}
                          className="w-full px-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Lote</label>
                        <input type="text" value={item.lote}
                          onChange={(e) => actualizarItem(idx, "lote", e.target.value)}
                          className="w-full px-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-indigo-500"
                          placeholder="Opcional" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Caducidad</label>
                        <input type="date" value={item.fechaVencimiento}
                          onChange={(e) => actualizarItem(idx, "fechaVencimiento", e.target.value)}
                          className="w-full px-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-indigo-500" />
                      </div>
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-xs text-gray-500">Subtotal: </span>
                      <span className="text-sm font-semibold text-green-600">
                        ${(item.cantidad * item.precioCompra).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {carrito.length > 0 && (
              <div className="bg-gray-50 px-4 py-3 border-t flex gap-3">
                <button onClick={handleLimpiar}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2 text-sm">
                  <X className="w-4 h-4" /> Limpiar
                </button>
                <button onClick={handleGuardar} disabled={loading}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium">
                  <Check className="w-4 h-4" />
                  {loading ? "Guardando..." : editingCompra ? "Actualizar Compra" : `Registrar ${carrito.length} compra(s)`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
