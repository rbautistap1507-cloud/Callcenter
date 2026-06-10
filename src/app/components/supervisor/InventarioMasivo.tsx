import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Download, Package } from "lucide-react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import * as XLSX from "xlsx";

interface InventarioMasivoProps {
  selectedSucursal: string;
  sucursalNombre: string;
  onBack: () => void;
  onSuccess: () => void;
}

interface ProductoExcelRow {
  codigoBarras: string;
  nombre: string;
  sustanciaActiva: string;
  concentracion: string;
  forma: string;
  categoria: string;
  departamento: string;
  precioCompra: number;
  precioVenta: number;
  precio2: number;
  precio3: number;
  precio4: number;
  stockInicial: number;
  stockMinimo: number;
  piezasPorCaja: number;
  lote: string;
  caducidad: string;
}

export default function InventarioMasivo({
  selectedSucursal,
  sucursalNombre,
  onBack,
  onSuccess,
}: InventarioMasivoProps) {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ProductoExcelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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

        const productosData: ProductoExcelRow[] = jsonData.map((row) => ({
          codigoBarras: String(
            row["Código de Barras"] || row["Codigo de Barras"] ||
            row["codigoBarras"] || row["Código"] || row["Codigo"] || ""
          ).trim(),
          nombre: String(
            row["Nombre"] || row["nombre"] || ""
          ).trim(),
          sustanciaActiva: String(
            row["Sustancia Activa"] || row["Sustancia"] ||
            row["sustanciaActiva"] || ""
          ).trim(),
          concentracion: String(
            row["Concentración"] || row["Concentracion"] ||
            row["concentracion"] || ""
          ).trim(),
          forma: String(
            row["Forma"] || row["forma"] ||
            row["Forma Farmacéutica"] || ""
          ).trim(),
          categoria: String(
            row["Categoría"] || row["Categoria"] ||
            row["categoria"] || ""
          ).trim(),
          departamento: String(
            row["Departamento"] || row["departamento"] || ""
          ).trim(),
          precioCompra: Number(
            row["Precio Compra"] || row["Costo"] ||
            row["precioCompra"] || 0
          ),
          precioVenta: Number(
            row["Precio Venta 1"] || row["Precio 1"] || row["Precio Venta"] || row["Precio"] ||
            row["precioVenta"] || 0
          ),
          precio2: Number(row["Precio Venta 2"] || row["Precio 2"] || row["precio2"] || 0),
          precio3: Number(row["Precio Venta 3"] || row["Precio 3"] || row["precio3"] || 0),
          precio4: Number(row["Precio Venta 4"] || row["Precio 4"] || row["precio4"] || 0),
          stockInicial: Number(
            row["Stock Inicial"] || row["Stock"] ||
            row["stockInicial"] || 0
          ),
          stockMinimo: Number(
            row["Stock Mínimo"] || row["Stock Minimo"] ||
            row["stockMinimo"] || 10
          ),
          piezasPorCaja: Number(
            row["Piezas por Caja"] || row["Piezas"] ||
            row["piezasPorCaja"] || 1
          ),
          lote: String(
            row["Lote"] || row["lote"] || ""
          ).trim(),
          caducidad: String(
            row["Caducidad"] || row["caducidad"] ||
            row["Fecha de Caducidad"] || ""
          ).trim(),
        }));

        const validData = productosData.filter(
          (item) => item.codigoBarras && item.nombre && item.precioVenta > 0
        );

        if (validData.length === 0) {
          toast.error("El archivo no contiene datos válidos. Verifica las columnas requeridas.");
          setExcelData([]);
          setExcelFile(null);
          return;
        }

        setExcelData(validData);
        setShowPreview(true);
        toast.success(`${validData.length} productos listos para cargar`);
      } catch (error) {
        console.error("Error al leer el archivo Excel:", error);
        toast.error("Error al procesar el archivo Excel");
        setExcelData([]);
        setExcelFile(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async () => {
    if (excelData.length === 0) {
      toast.error("Debes cargar un archivo Excel con los productos");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/inventario/masivo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sucursalId: selectedSucursal,
            productos: excelData,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(data.mensaje || "Inventario cargado exitosamente");
        if (data.errores && data.errores.length > 0) {
          toast.warning(`${data.errores.length} productos con errores`);
        }
        onSuccess();
        onBack();
      } else {
        toast.error(data.error || "Error al procesar el inventario");
      }
    } catch (error) {
      console.error("Error al guardar inventario masivo:", error);
      toast.error("Error al procesar el inventario");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Código de Barras": "7501001234567",
        "Nombre": "Amoxicilina 500mg c/12 Caps",
        "Departamento": "Medicamentos",
        "Categoría": "Antibióticos",
        "Precio Compra": 25.50,
        "Precio Venta 1": 45.00,
        "Precio Venta 2": 42.00,
        "Precio Venta 3": 40.00,
        "Precio Venta 4": 38.00,
        "Stock Inicial": 50,
        "Lote": "LOT-001",
        "Caducidad": "2026-12-31",
      },
      {
        "Código de Barras": "7501002345678",
        "Nombre": "Ibuprofeno 400mg c/20 Tab",
        "Departamento": "Medicamentos",
        "Categoría": "Analgésicos",
        "Precio Compra": 18.00,
        "Precio Venta 1": 35.00,
        "Precio Venta 2": 33.00,
        "Precio Venta 3": 31.00,
        "Precio Venta 4": 29.00,
        "Stock Inicial": 100,
        "Lote": "LOT-002",
        "Caducidad": "2027-06-30",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Ajustar ancho de columnas
    ws["!cols"] = [
      { wch: 18 }, { wch: 30 }, { wch: 18 }, { wch: 20 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "Plantilla_Inventario_CallCenter.xlsx");
    toast.success("Plantilla descargada exitosamente");
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-4"
        >
          ← Volver al inventario
        </button>
        <h3 className="font-bold text-xl flex items-center gap-2">
          <Package className="w-6 h-6 text-indigo-600" />
          Carga Masiva de Inventario — {sucursalNombre}
        </h3>
        <p className="text-gray-600 text-sm mt-1">
          Crea o actualiza múltiples productos desde un archivo Excel
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda */}
        <div className="space-y-4">

          {/* Info de columnas */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Columnas del archivo Excel
                </p>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>Obligatorias:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li>Código de Barras</li>
                    <li>Nombre</li>
                    <li>Precio Venta 1</li>
                  </ul>
                  <p className="mt-2"><strong>Opcionales:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li>Departamento</li>
                    <li>Categoría</li>
                    <li>Precio Compra</li>
                    <li>Precio Venta 2</li>
                    <li>Precio Venta 3</li>
                    <li>Precio Venta 4</li>
                    <li>Stock Inicial</li>
                    <li>Lote</li>
                    <li>Caducidad</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Info comportamiento */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs text-amber-800">
              <strong>⚡ Comportamiento:</strong><br/>
              Si el código de barras ya existe → actualiza el producto y suma el stock inicial.<br/>
              Si es nuevo → crea el producto con el stock indicado para <strong>{sucursalNombre}</strong>.
            </p>
          </div>

          {/* Carga de archivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo Excel *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="inventario-upload"
              />
              <label htmlFor="inventario-upload" className="cursor-pointer flex flex-col items-center gap-2">
                {excelFile ? (
                  <>
                    <FileSpreadsheet className="w-12 h-12 text-green-500" />
                    <p className="text-sm font-medium text-gray-700">{excelFile.name}</p>
                    <p className="text-xs text-gray-500">{excelData.length} productos cargados</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setExcelFile(null);
                        setExcelData([]);
                        setShowPreview(false);
                      }}
                      className="mt-2 text-red-600 hover:text-red-800 text-xs flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Eliminar archivo
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">Click para seleccionar archivo Excel</p>
                    <p className="text-xs text-gray-500">Formatos: .xlsx, .xls</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Descargar plantilla */}
          <button
            onClick={handleDownloadTemplate}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Descargar Plantilla Excel
          </button>
        </div>

        {/* Vista previa */}
        <div>
          {showPreview && excelData.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                <h4 className="font-semibold text-gray-900">
                  Vista Previa ({excelData.length} productos)
                </h4>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Código</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nombre</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Precio</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {excelData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-mono text-gray-700">
                          {item.codigoBarras}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <p className="font-medium text-gray-900">{item.nombre}</p>
                          {item.sustanciaActiva && (
                            <p className="text-gray-400">{item.sustanciaActiva}</p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <p className="font-semibold text-green-600">${item.precioVenta.toFixed(2)}</p>
                          {item.precioCompra > 0 && (
                            <p className="text-gray-400">Costo: ${item.precioCompra.toFixed(2)}</p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-center">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                            {item.stockInicial}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Carga un archivo Excel para ver la vista previa</p>
            </div>
          )}

          {excelData.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
            >
              <Check className="w-5 h-5" />
              {loading ? "Procesando..." : `Cargar ${excelData.length} Productos`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
