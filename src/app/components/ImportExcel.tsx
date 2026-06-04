import { useState } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

interface ImportExcelProps {
  sucursalId: string;
  onImportComplete: () => void;
  onClose: () => void;
}

export default function ImportExcel({ sucursalId, onImportComplete, onClose }: ImportExcelProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        setPreview(jsonData.slice(0, 5)); // Mostrar solo las primeras 5 filas
        toast.success(`Archivo cargado: ${jsonData.length} productos detectados`);
      } catch (error) {
        console.error("Error leyendo archivo:", error);
        toast.error("Error al leer el archivo Excel");
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      toast.error("No hay datos para importar");
      return;
    }

    setLoading(true);

    try {
      const file = (document.querySelector('input[type="file"]') as HTMLInputElement)?.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos/import-excel`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify({
                data: jsonData,
                sucursalActual: sucursalId,
              }),
            }
          );

          const result = await response.json();

          if (result.success) {
            toast.success(
              `✓ ${result.importados} productos importados correctamente` +
                (result.errores > 0 ? ` (${result.errores} errores)` : "")
            );
            setPreview([]);
            setFileName("");
            onImportComplete();
          } else {
            toast.error(result.error || "Error al importar productos");
          }
        } catch (error) {
          console.error("Error importando productos:", error);
          toast.error("Error al procesar la importación");
        } finally {
          setLoading(false);
        }
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("Error en importación:", error);
      toast.error("Error al importar productos");
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        "lugar de compra": "Distribuidora Farmacéutica SA",
        "nuevo grupo": "Analgésicos",
        "codigo de barras": "7501234567890",
        "stock carrera": 100,
        "stock porvenir": 80,
        "stock muzquiz": 90,
        "stock la villa": 70,
        "stock san felipe": 85,
        "stock zaragoza": 95,
        "sustancia activa del producto": "Paracetamol",
        "cantidad": "10 tabletas",
        "presentación": "Tableta",
        "nombre del producto": "Paracetamol 500mg Caja 10 Tabletas",
        "precio publico": 15.50,
        "descripción": "Analgésico y antipirético de uso general",
        "agrupación": "Medicamentos OTC",
        "clave sat": "51121700",
      },
      {
        "lugar de compra": "Laboratorios Unidos",
        "nuevo grupo": "Antibióticos",
        "codigo de barras": "7501234567891",
        "stock carrera": 60,
        "stock porvenir": 50,
        "stock muzquiz": 55,
        "stock la villa": 45,
        "stock san felipe": 50,
        "stock zaragoza": 65,
        "sustancia activa del producto": "Amoxicilina",
        "cantidad": "12 cápsulas",
        "presentación": "Cápsula",
        "nombre del producto": "Amoxicilina 500mg Caja 12 Cápsulas",
        "precio publico": 85.00,
        "descripción": "Antibiótico de amplio espectro",
        "agrupación": "Medicamentos Controlados",
        "clave sat": "51121700",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");

    // Ajustar anchos de columna
    worksheet["!cols"] = [
      { wch: 25 }, // lugar de compra
      { wch: 20 }, // nuevo grupo
      { wch: 18 }, // codigo de barras
      { wch: 15 }, // stock carrera
      { wch: 15 }, // stock porvenir
      { wch: 15 }, // stock muzquiz
      { wch: 15 }, // stock la villa
      { wch: 15 }, // stock san felipe
      { wch: 15 }, // stock zaragoza
      { wch: 30 }, // sustancia activa del producto
      { wch: 15 }, // cantidad
      { wch: 15 }, // presentación
      { wch: 40 }, // nombre del producto
      { wch: 15 }, // precio publico
      { wch: 40 }, // descripción
      { wch: 20 }, // agrupación
      { wch: 15 }, // clave sat
    ];

    XLSX.writeFile(workbook, "Plantilla_Productos_LYMPOS.xlsx");
    toast.success("Plantilla descargada correctamente");
  };

  return (
    <div className="space-y-6">
      {/* Download Template Button */}
      <div className="flex justify-end">
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Descargar Plantilla
        </button>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="excel-upload"
          />
          <label htmlFor="excel-upload" className="cursor-pointer">
            <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            {fileName ? (
              <div className="space-y-2">
                <p className="text-green-600 flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {fileName}
                </p>
                <p className="text-sm text-gray-500">
                  Haz clic aquí para seleccionar otro archivo
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-700">
                  Haz clic aquí o arrastra un archivo Excel
                </p>
                <p className="text-sm text-gray-500">
                  Formatos soportados: .xlsx, .xls
                </p>
              </div>
            )}
          </label>
        </div>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg mb-4">Vista Previa (primeras 5 filas)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Código Barras</th>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Grupo</th>
                  <th className="px-3 py-2 text-right">Precio</th>
                  <th className="px-3 py-2 text-right">Stock Total</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row: any, index) => {
                  const codigoBarras = row["codigo de barras"] || row["Codigo de barras"] || row["Código de Barras"];
                  const nombre = row["nombre del producto"] || row["Nombre del producto"] || row["Nombre del Producto"];
                  const grupo = row["nuevo grupo"] || row["Nuevo grupo"] || row["Grupo"];
                  const precio = row["precio publico"] || row["Precio publico"] || row["Precio Publico"];
                  const stockTotal = 
                    (parseInt(row["stock carrera"]) || 0) +
                    (parseInt(row["stock porvenir"]) || 0) +
                    (parseInt(row["stock muzquiz"]) || 0) +
                    (parseInt(row["stock la villa"]) || 0) +
                    (parseInt(row["stock san felipe"]) || 0) +
                    (parseInt(row["stock zaragoza"]) || 0);
                  
                  return (
                    <tr key={index} className="border-t">
                      <td className="px-3 py-2">{codigoBarras}</td>
                      <td className="px-3 py-2">{nombre}</td>
                      <td className="px-3 py-2">{grupo}</td>
                      <td className="px-3 py-2 text-right">
                        ${Number(precio || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">{stockTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertCircle className="w-4 h-4" />
              El stock inicial se asignará solo a la sucursal actual
            </div>
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Upload className="w-5 h-5" />
              {loading ? "Importando..." : "Importar Productos"}
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg mb-3 text-blue-900">Instrucciones</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">1.</span>
            <span>
              Descarga la plantilla de Excel haciendo clic en "Descargar Plantilla"
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">2.</span>
            <span>
              Llena la plantilla con tus productos. Los campos obligatorios son:{" "}
              <strong>Código de Barras, Nombre del Producto y Precio Venta</strong>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">3.</span>
            <span>
              El campo "Stock Inicial" es opcional. Si lo incluyes, se asignará solo a
              la sucursal actual
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">4.</span>
            <span>
              El campo "Descripción" tiene un límite de 69 caracteres
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">5.</span>
            <span>
              Guarda tu archivo y súbelo usando el área de carga
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">6.</span>
            <span>
              Revisa la vista previa y haz clic en "Importar Productos"
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}