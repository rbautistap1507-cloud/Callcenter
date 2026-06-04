import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Download, ArrowRightLeft, AlertTriangle, CheckCircle } from "lucide-react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { SUCURSALES, User } from "../../shared";
import * as XLSX from "xlsx";

interface TrasladosMasivosProps {
  user: User;
  selectedSucursal: string;
  sucursalNombre: string;
  onBack: () => void;
  onSuccess: () => void;
}

interface TrasladoExcelRow {
  codigoProducto: string;
  cantidad: number;
  precioUnitario: number;
  fechaVencimiento?: string; // Nueva columna opcional
}

interface ProductoError {
  codigoProducto: string;
  cantidad: number;
  precioUnitario: number;
  fechaVencimiento?: string;
  razon: string; // "no_encontrado" | "stock_insuficiente"
  stockDisponible?: number;
}

export default function TrasladosMasivos({
  user,
  selectedSucursal,
  sucursalNombre,
  onBack,
  onSuccess,
}: TrasladosMasivosProps) {
  const [descripcion, setDescripcion] = useState("");
  const [sucursalDestinoId, setSucursalDestinoId] = useState("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<TrasladoExcelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [productosConError, setProductosConError] = useState<ProductoError[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [productosValidos, setProductosValidos] = useState<any[]>([]);

  // Función para descargar plantilla
  const descargarPlantilla = () => {
    const plantilla = [
      {
        "Código del Producto": "7501061810181",
        "Precio Unitario": 25.5,
        "Cantidad": 10,
        "Fecha de Vencimiento": "2026-12-31",
      },
      {
        "Código del Producto": "7501008476680",
        "Precio Unitario": 15.0,
        "Cantidad": 5,
        "Fecha de Vencimiento": "2027-06-30",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(plantilla);
    
    // Configurar ancho de columnas
    ws['!cols'] = [
      { wch: 20 }, // Código del Producto
      { wch: 15 }, // Precio Unitario
      { wch: 10 }, // Cantidad
      { wch: 20 }, // Fecha de Vencimiento
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Traslados");
    XLSX.writeFile(wb, "Plantilla_Traslados_Masivos_LYM.xlsx");
    toast.success("Plantilla descargada exitosamente");
  };

  // Función para leer el archivo Excel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Mapear las columnas del Excel a nuestro formato
        const trasladosData: TrasladoExcelRow[] = jsonData.map((row) => {
          const codigoProducto =
            row["Código del Producto"] ||
            row["Codigo del Producto"] ||
            row["Código del producto"] ||
            row["Codigo del producto"] ||
            row["Código"] ||
            row["Codigo"] ||
            row["codigo"] ||
            row["código"] ||
            "";

          const precioUnitario = Number(
            row["Precio Unitario"] ||
              row["Precio unitario"] ||
              row["precio unitario"] ||
              row["Precio"] ||
              row["precio"] ||
              0
          );

          const cantidad = Number(row["Cantidad"] || row["cantidad"] || 0);

          // Leer fecha de vencimiento
          let fechaVencimiento = row["Fecha de Vencimiento"] || 
                                  row["Fecha de vencimiento"] || 
                                  row["fecha de vencimiento"] || 
                                  row["Fecha Vencimiento"] || 
                                  row["fecha vencimiento"] || 
                                  "";

          // Si la fecha viene como número de Excel, convertirla
          if (typeof fechaVencimiento === "number") {
            const excelEpoch = new Date(1899, 11, 30); // Excel epoch
            const excelDate = new Date(excelEpoch.getTime() + fechaVencimiento * 86400000);
            fechaVencimiento = excelDate.toISOString().split("T")[0];
          } else if (fechaVencimiento) {
            fechaVencimiento = String(fechaVencimiento).trim();
          }

          return {
            codigoProducto: String(codigoProducto).trim(),
            precioUnitario,
            cantidad,
            fechaVencimiento: fechaVencimiento || undefined,
          };
        });

        // Validar que hay datos válidos
        const validData = trasladosData.filter(
          (item) => item.codigoProducto && item.cantidad > 0 && item.precioUnitario >= 0
        );

        if (validData.length === 0) {
          toast.error("El archivo no contiene datos válidos");
          return;
        }

        setExcelData(validData);
        setShowPreview(true);
        toast.success(`${validData.length} productos cargados del Excel`);
      } catch (error) {
        console.error("Error leyendo Excel:", error);
        toast.error("Error al leer el archivo Excel");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!descripcion.trim()) {
      toast.error("La descripción es requerida");
      return;
    }

    if (!sucursalDestinoId) {
      toast.error("Debes seleccionar la sucursal de destino");
      return;
    }

    if (sucursalDestinoId === selectedSucursal) {
      toast.error("La sucursal de origen y destino no pueden ser iguales");
      return;
    }

    if (excelData.length === 0) {
      toast.error("Debes cargar un archivo Excel con productos");
      return;
    }

    setLoading(true);

    try {
      // 1. Obtener todos los productos para validar códigos
      const productosResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );

      const productosData = await productosResponse.json();
      if (!productosData.success) {
        throw new Error("Error al cargar productos");
      }

      const productos = productosData.productos || [];

      // 2. Mapear productos del Excel con la base de datos
      const productosTraslado = [];
      const errores: ProductoError[] = [];

      for (const item of excelData) {
        const producto = productos.find(
          (p: any) => p.codigoBarras === item.codigoProducto
        );

        if (!producto) {
          errores.push({
            codigoProducto: item.codigoProducto,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            fechaVencimiento: item.fechaVencimiento,
            razon: "Producto no encontrado en el sistema",
          });
          continue;
        }

        const stockActual = producto.stockBySucursal?.[selectedSucursal] || 0;

        if (stockActual < item.cantidad) {
          errores.push({
            codigoProducto: item.codigoProducto,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            fechaVencimiento: item.fechaVencimiento,
            razon: `Stock insuficiente (Disponible: ${stockActual}, Solicitado: ${item.cantidad})`,
            stockDisponible: stockActual,
          });
          continue;
        }

        productosTraslado.push({
          productoId: producto.id,
          productoNombre: producto.nombre,
          codigoBarras: producto.codigoBarras,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          fechaVencimiento: item.fechaVencimiento,
        });
      }

      // 3. Si hay errores, mostrar modal de decisión
      if (errores.length > 0) {
        setProductosConError(errores);
        setProductosValidos(productosTraslado);
        setShowErrorModal(true);
        setLoading(false);
        return;
      }

      // 4. Si no hay errores, proceder directamente
      if (productosTraslado.length === 0) {
        toast.error("No hay productos válidos para trasladar");
        setLoading(false);
        return;
      }

      await crearTraslado(productosTraslado);
    } catch (error: any) {
      console.error("❌ Error al validar productos:", error);
      toast.error(error.message || "Error al validar productos");
      setLoading(false);
    }
  };

  const crearTraslado = async (productosTraslado: any[]) => {
    try {
      const total = productosTraslado.reduce(
        (sum, item) => sum + item.cantidad * item.precioUnitario,
        0
      );

      const payload = {
        descripcion: descripcion.trim(),
        sucursalOrigenId: selectedSucursal,
        sucursalDestinoId: sucursalDestinoId,
        productos: productosTraslado,
        total: total,
        estado: "pendiente",
        creadoPor: user.email,
        creadoPorNombre: user.nombre || user.name,
      };

      console.log("📤 Creando traslado masivo:", payload);

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

      toast.success(
        `Traslado masivo creado exitosamente con ${productosTraslado.length} productos`
      );
      
      // Resetear estados
      setShowErrorModal(false);
      setProductosConError([]);
      setProductosValidos([]);
      
      onSuccess();
      onBack();
    } catch (error: any) {
      console.error("❌ Error al crear traslado masivo:", error);
      toast.error(error.message || "Error al crear el traslado masivo");
      throw error;
    }
  };

  const handleContinuarConValidos = async () => {
    if (productosValidos.length === 0) {
      toast.error("No hay productos válidos para continuar");
      return;
    }

    setLoading(true);
    try {
      await crearTraslado(productosValidos);
    } catch (error) {
      // Error ya manejado en crearTraslado
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarYCorregir = () => {
    setShowErrorModal(false);
    setProductosConError([]);
    setProductosValidos([]);
    toast.info("Corrige el archivo Excel y vuelve a cargarlo");
  };

  const calcularTotal = () => {
    return excelData.reduce((sum, item) => sum + item.cantidad * item.precioUnitario, 0);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-4"
        >
          ← Volver a lista de traslados
        </button>
        <h3 className="font-bold text-xl">Agregar Traslado Masivo</h3>
        <p className="text-gray-600 text-sm mt-2">
          Traslado desde: <span className="font-semibold">{sucursalNombre}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sección de información del traslado */}
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sucursal Destino *
            </label>
            <select
              value={sucursalDestinoId}
              onChange={(e) => setSucursalDestinoId(e.target.value)}
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
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32"
              placeholder="Describe el motivo del traslado masivo..."
              required
            />
          </div>

          {/* Resumen */}
          {sucursalDestinoId && excelData.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                Resumen del Traslado
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-800">Origen:</span>
                  <span className="font-semibold text-blue-900">{sucursalNombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800">Destino:</span>
                  <span className="font-semibold text-blue-900">
                    {SUCURSALES.find((s) => s.id === sucursalDestinoId)?.nombre}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800">Productos:</span>
                  <span className="font-semibold text-blue-900">{excelData.length}</span>
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
        </div>

        {/* Sección de carga de Excel */}
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo Excel *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    <span>Seleccionar archivo Excel</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Formatos: XLSX, XLS
                </p>
                {excelFile && (
                  <p className="text-sm text-green-600 mt-2 font-medium">
                    ✓ {excelFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={descargarPlantilla}
            className="w-full mb-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Descargar Plantilla Excel
          </button>

          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 mb-4">
            <p className="text-xs text-yellow-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                El archivo Excel debe contener las columnas: <strong>Código del Producto</strong>,{" "}
                <strong>Precio Unitario</strong>, <strong>Cantidad</strong>, y{" "}
                <strong>Fecha de Vencimiento</strong> (opcional, formato: AAAA-MM-DD)
              </span>
            </p>
          </div>

          {/* Vista previa de datos */}
          {showPreview && excelData.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  <span className="font-semibold text-gray-900">
                    Vista Previa ({excelData.length} productos)
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setExcelData([]);
                    setExcelFile(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Código
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Precio Unit.
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Cantidad
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Vencimiento
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {excelData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900 font-mono text-xs">{item.codigoProducto}</td>
                        <td className="px-3 py-2 text-gray-900">
                          ${item.precioUnitario.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-gray-900 font-medium text-center">
                          {item.cantidad}
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-xs">
                          {item.fechaVencimiento ? (
                            <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
                              {item.fechaVencimiento}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Sin fecha</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-900 font-semibold">
                          ${(item.cantidad * item.precioUnitario).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right font-bold text-gray-900">
                        Total:
                      </td>
                      <td className="px-3 py-2 font-bold text-lg text-indigo-600">
                        ${calcularTotal().toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              !descripcion.trim() ||
              !sucursalDestinoId ||
              excelData.length === 0
            }
            className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            {loading ? "Procesando..." : "Crear Traslado Masivo"}
          </button>
        </div>
      </div>

      {/* Modal de errores */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header del modal */}
            <div className="bg-red-50 border-b border-red-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-7 h-7" />
                    Productos con Errores
                  </h3>
                  <p className="text-sm text-red-600 mt-2">
                    Se encontraron <strong>{productosConError.length}</strong> productos con errores.
                    Puedes continuar con los <strong>{productosValidos.length}</strong> productos válidos o corregir el archivo Excel.
                  </p>
                </div>
                <button
                  onClick={handleCancelarYCorregir}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Cuerpo del modal - Lista de errores */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Productos con error */}
                <div>
                  <h4 className="font-semibold text-lg text-red-700 mb-3 flex items-center gap-2">
                    <X className="w-5 h-5" />
                    Productos con Errores ({productosConError.length})
                  </h4>
                  <div className="space-y-2">
                    {productosConError.map((error, index) => (
                      <div
                        key={index}
                        className="bg-red-50 border border-red-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-mono text-sm font-bold text-red-900">
                              {error.codigoProducto}
                            </p>
                            <p className="text-sm text-red-700 mt-1">
                              <strong>Error:</strong> {error.razon}
                            </p>
                            <div className="flex gap-4 mt-2 text-xs text-red-600">
                              <span>Cantidad: <strong>{error.cantidad}</strong></span>
                              <span>Precio: <strong>${error.precioUnitario.toFixed(2)}</strong></span>
                              {error.fechaVencimiento && (
                                <span>Venc: <strong>{error.fechaVencimiento}</strong></span>
                              )}
                            </div>
                          </div>
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Productos válidos */}
                {productosValidos.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-lg text-green-700 mb-3 flex items-center gap-2 mt-6">
                      <CheckCircle className="w-5 h-5" />
                      Productos Válidos ({productosValidos.length})
                    </h4>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800">
                        Estos productos <strong>sí se procesarán</strong> si decides continuar:
                      </p>
                      <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                        {productosValidos.map((prod, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-white px-3 py-2 rounded border border-green-100"
                          >
                            <div className="flex items-center gap-3">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="font-mono text-xs text-gray-700">
                                {prod.codigoBarras}
                              </span>
                              <span className="text-sm text-gray-900">
                                {prod.productoNombre}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">
                              x{prod.cantidad}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer del modal - Botones de acción */}
            <div className="bg-gray-50 border-t border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <p className="font-semibold">Opciones:</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• <strong>Cancelar y corregir:</strong> Cierra este diálogo y corrige el Excel</li>
                    <li>• <strong>Continuar con válidos:</strong> Crea el traslado solo con los {productosValidos.length} productos correctos</li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelarYCorregir}
                    disabled={loading}
                    className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                  >
                    Cancelar y Corregir
                  </button>
                  {productosValidos.length > 0 && (
                    <button
                      onClick={handleContinuarConValidos}
                      disabled={loading}
                      className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? (
                        <>Procesando...</>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Continuar con {productosValidos.length} Válidos
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}