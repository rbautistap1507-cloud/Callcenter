import { useState } from "react";
import { toast } from "sonner";
import { Upload, Download, Check, X, AlertCircle } from "lucide-react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import * as XLSX from "xlsx";

interface AjusteMasivoProps {
  selectedSucursal: string;
  onBack: () => void;
  onSuccess: () => void;
}

interface AjusteRow {
  codigoBarras: string;
  nuevoStock: number;
  motivo: string;
}

export default function AjusteMasivo({ selectedSucursal, onBack, onSuccess }: AjusteMasivoProps) {
  const [excelData, setExcelData] = useState<AjusteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);

  const handleDownloadTemplate = () => {
    const templateData = [
      { "Código de Barras": "7501001234567", "Nuevo Stock": 50, "Motivo": "Conteo físico" },
      { "Código de Barras": "7501002345678", "Nuevo Stock": 30, "Motivo": "Merma" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ajustes");
    XLSX.writeFile(wb, "Plantilla_Ajustes_LYMPOS.xlsx");
    toast.success("Plantilla descargada");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
        const ajustes: AjusteRow[] = jsonData.map((row) => ({
          codigoBarras: String(row["Código de Barras"] || row["Codigo de Barras"] || row["codigoBarras"] || "").trim(),
          nuevoStock: Number(row["Nuevo Stock"] || row["nuevoStock"] || 0),
          motivo: String(row["Motivo"] || row["motivo"] || "Ajuste masivo").trim(),
        })).filter(r => r.codigoBarras);
        setExcelData(ajustes);
        setShowPreview(true);
        toast.success(`${ajustes.length} productos listos para ajuste`);
      } catch {
        toast.error("Error al leer el archivo");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCargar = async () => {
    if (!excelData.length) return;
    if (selectedSucursal === "todas") {
      toast.error("Selecciona una sucursal específica para el ajuste masivo");
      return;
    }
    setLoading(true);
    const resultadosTemp: any[] = [];
    try {
      const prodRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const prodData = await prodRes.json();
      const productos = prodData.productos || [];

      for (const ajuste of excelData) {
        const producto = productos.find((p: any) => p.codigoBarras === ajuste.codigoBarras);
        if (!producto) {
          resultadosTemp.push({ codigoBarras: ajuste.codigoBarras, status: "error", mensaje: "Producto no encontrado" });
          continue;
        }
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ajustes`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              productoId: producto.codigoBarras,
              sucursalId: selectedSucursal,
              nuevoStock: ajuste.nuevoStock,
              motivo: ajuste.motivo,
              referencia: "Ajuste Masivo",
            }),
          }
        );
        const data = await res.json();
        resultadosTemp.push({
          codigoBarras: ajuste.codigoBarras,
          nombre: producto.nombre,
          status: data.success ? "ok" : "error",
          mensaje: data.success ? `Stock → ${ajuste.nuevoStock}` : "Error al ajustar",
        });
      }
      setResultados(resultadosTemp);
      const exitosos = resultadosTemp.filter(r => r.status === "ok").length;
      toast.success(`${exitosos} de ${resultadosTemp.length} ajustes aplicados`);
      if (exitosos === resultadosTemp.length) setTimeout(onSuccess, 1500);
    } catch {
      toast.error("Error procesando ajustes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <button onClick={onBack} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-6">
        ← Volver
      </button>
      <h3 className="text-xl font-bold text-gray-800 mb-6">Ajuste Masivo de Inventario</h3>

      <div className="flex gap-4 mb-6">
        <button onClick={handleDownloadTemplate}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
          <Download className="w-4 h-4" /> Descargar Plantilla
        </button>
        <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
          <Upload className="w-4 h-4" /> Cargar Excel
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {showPreview && excelData.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Vista previa — {excelData.length} ajustes</h4>
          <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">Código</th>
                  <th className="px-4 py-2 text-left">Nuevo Stock</th>
                  <th className="px-4 py-2 text-left">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {excelData.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono">{r.codigoBarras}</td>
                    <td className="px-4 py-2">{r.nuevoStock}</td>
                    <td className="px-4 py-2">{r.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={handleCargar} disabled={loading}
            className="mt-4 w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            {loading ? "Aplicando ajustes..." : `Aplicar ${excelData.length} ajustes`}
          </button>
        </div>
      )}

      {resultados.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <h4 className="font-semibold p-4 bg-gray-50">Resultados</h4>
          <div className="max-h-64 overflow-y-auto">
            {resultados.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-2 border-b ${r.status === "ok" ? "bg-green-50" : "bg-red-50"}`}>
                {r.status === "ok" ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />}
                <span className="font-mono text-sm">{r.codigoBarras}</span>
                <span className="text-sm text-gray-600">{r.nombre || ""}</span>
                <span className="text-sm ml-auto">{r.mensaje}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}