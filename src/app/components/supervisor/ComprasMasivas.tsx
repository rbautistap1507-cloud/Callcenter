import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Download, RefreshCw, AlertTriangle, Plus } from "lucide-react";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { hoyCDMX } from "../../../../utils/timezone";
import { SUCURSALES } from "../../shared";
import AddProductModal from "./AddProductModal";
import * as XLSX from "xlsx";

interface ComprasMasivasProps {
  selectedSucursal: string;
  sucursalNombre: string;
  user?: any;
  onBack: () => void;
  onSuccess: () => void;
}

interface CompraExcelRow {
  cantidad: number;
  codigoBarras: string;
  unidad: string;
  precio: number;
  lote: string;
  caducidad: string;
  claveSAT: string;
  laboratorio: string;
  descripcion: string;
  tasa: number;
  balance: number;
  factura: string;
  sucursal: string;
  fechaFactura: string;
  proveedor: string;
  // estado del producto en inventario
  _encontrado?: boolean;
  _nombre?: string;
}

export default function ComprasMasivas({ selectedSucursal, sucursalNombre, user, onBack, onSuccess }: ComprasMasivasProps) {
  const [fecha, setFecha] = useState(hoyCDMX());
  const [referencia, setReferencia] = useState("");
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState(selectedSucursal === "todas" ? "" : selectedSucursal);
  const [estatus, setEstatus] = useState<"pendiente" | "recibido">("recibido");
  const [proveedor, setProveedor] = useState("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [codigoParaAlta, setCodigoParaAlta] = useState<string | null>(null);
  const [productosValidos, setProductosValidos] = useState<CompraExcelRow[]>([]);
  const [productosNoEncontrados, setProductosNoEncontrados] = useState<CompraExcelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [revalidando, setRevalidando] = useState<string | null>(null);

  const parsearFecha = (valor: any): string => {
    if (!valor) return "";
    const str = String(valor).trim();
    const num = Number(str);
    if (!isNaN(num) && num > 1000 && num < 100000) {
      const d = new Date((num - 25569) * 86400 * 1000);
      return d.toISOString().split("T")[0];
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const [d, m, a] = str.split("/");
      return `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return str;
  };

  const validarContraInventario = async (filas: CompraExcelRow[]) => {
    try {
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos?limit=10000`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await resp.json();
      const inventario: any[] = data.productos || [];

      const validos: CompraExcelRow[] = [];
      const noEncontrados: CompraExcelRow[] = [];

      filas.forEach((fila) => {
        const prod = inventario.find(
          (p) => String(p.codigoBarras).trim() === String(fila.codigoBarras).trim()
        );
        if (prod) {
          validos.push({ ...fila, _encontrado: true, _nombre: prod.nombre });
        } else {
          noEncontrados.push({ ...fila, _encontrado: false });
        }
      });

      setProductosValidos(validos);
      setProductosNoEncontrados(noEncontrados);
    } catch (e) {
      toast.error("Error al validar contra inventario");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const filas: CompraExcelRow[] = jsonData.map((row) => ({
          cantidad: Number(row["Cantidad"] || row["cantidad"] || 0),
          codigoBarras: String(row["Codigo de barras"] || row["Código de barras"] || row["CODIGO DE BARRAS"] || row["codigoBarras"] || "").trim(),
          unidad: String(row["Unidad"] || row["unidad"] || "PZA"),
          precio: Number(row["Precio"] || row["precio"] || row["Costo"] || row["costo"] || 0),
          lote: String(row["Lote"] || row["lote"] || ""),
          caducidad: parsearFecha(row["Caducidad"] || row["caducidad"] || row["Fecha de vencimiento"] || ""),
          claveSAT: String(row["Clave SAT"] || row["clave sat"] || row["ClaveSAT"] || ""),
          laboratorio: String(row["Laboratorio"] || row["laboratorio"] || ""),
          descripcion: String(row["Descripcion"] || row["descripción"] || row["Descripción"] || ""),
          tasa: Number(row["Tasa"] || row["tasa"] || 0),
          balance: Number(row["Balance"] || row["balance"] || 0),
          factura: String(row["Factura"] || row["factura"] || ""),
          sucursal: String(row["Sucursal"] || row["sucursal"] || ""),
          fechaFactura: parsearFecha(row["Fecha factura"] || row["fecha factura"] || ""),
          proveedor: String(row["Proveedor"] || row["proveedor"] || ""),
        })).filter((r) => r.codigoBarras && r.cantidad > 0);

        if (filas.length === 0) {
          toast.error("No se encontraron datos válidos. Verifica las columnas.");
          return;
        }

        toast.info(`Validando ${filas.length} productos contra inventario...`);
        await validarContraInventario(filas);
        toast.success(`Archivo procesado: ${filas.length} líneas`);
      } catch (err) {
        toast.error("Error al procesar el archivo Excel");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRevalidar = async (codigo: string) => {
    setRevalidando(codigo);
    try {
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos?limit=10000`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await resp.json();
      const inventario: any[] = data.productos || [];
      const prod = inventario.find((p) => String(p.codigoBarras).trim() === String(codigo).trim());

      if (prod) {
        // Usar callback para obtener el estado más reciente de productosNoEncontrados
        setProductosNoEncontrados((prev) => {
          const item = prev.find((p) => p.codigoBarras === codigo);
          if (item) {
            setProductosValidos((vPrev) => [...vPrev, { ...item, _encontrado: true, _nombre: prod.nombre }]);
            toast.success(`✅ ${prod.nombre} encontrado y agregado a la lista`);
            return prev.filter((p) => p.codigoBarras !== codigo);
          }
          return prev;
        });
      } else {
        toast.error(`Producto ${codigo} aún no está en inventario`);
      }
    } catch (e) {
      toast.error("Error al revalidar");
    } finally {
      setRevalidando(null);
    }
  };

  const handleSubmit = async () => {
    if (!proveedor.trim()) { toast.error("El proveedor es obligatorio"); return; }
    if (!sucursalSeleccionada) { toast.error("Selecciona una sucursal"); return; }
    if (productosValidos.length === 0) { toast.error("No hay productos válidos para registrar"); return; }

    setLoading(true);
    try {
      const compras = productosValidos.map((p) => ({
        codigoProducto: p.codigoBarras,
        costo: p.precio,
        cantidad: p.cantidad,
        variante: p.unidad,
        descuento: 0,
        fechaVencimiento: p.caducidad,
        lote: p.lote,
        claveSAT: p.claveSAT,
        laboratorio: p.laboratorio,
        descripcion: p.descripcion,
        tasa: p.tasa,
        balance: p.balance,
        factura: p.factura || "",
        fechaFactura: p.fechaFactura,
        referencia,
      }));

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/compras/masivas`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            sucursalId: sucursalSeleccionada,
            fecha,
            estatus,
            proveedor,
            referencia,
            creadoPor: user?.name || user?.username || "Sistema",
            compras,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast.success(`${data.registrosCreados} compras registradas exitosamente`);
        onSuccess();
        onBack();
      } else {
        toast.error(data.error || "Error al procesar las compras");
      }
    } catch (err) {
      toast.error("Error al procesar las compras");
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiar = () => {
    setExcelFile(null);
    setProductosValidos([]);
    setProductosNoEncontrados([]);
    setReferencia("");
    setProveedor("");
    setFileInputKey((k) => k + 1);
  };

  const handleDownloadTemplate = () => {
    const template = [{
      "Cantidad": 10, "Codigo de barras": "7501001234567", "Unidad": "PZA",
      "Precio": 45.50, "Lote": "LOT001", "Caducidad": "2027-12-31",
      "Clave SAT": "51101500", "Laboratorio": "Laboratorio Ejemplo",
      "Descripcion": "Descripción del producto", "Tasa": 0, "Balance": 0,
      "Factura": "FAC-001", "Sucursal": "muzquiz", "Fecha factura": "2026-05-01", "Proveedor": "Proveedor SA"
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compras");
    XLSX.writeFile(wb, "Plantilla_Compras_Masivas.xlsx");
    toast.success("Plantilla descargada");
  };

  const totalValidos = productosValidos.reduce((sum, p) => sum + p.precio * p.cantidad, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <button onClick={onBack} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-4 text-sm">
          ← Volver a lista de compras
        </button>
        <h3 className="font-bold text-xl">Agregar Compra Masiva — {sucursalNombre}</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Formulario */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia / Factura</label>
            <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej. FAC-2026-001"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal *</label>
            <select value={sucursalSeleccionada} onChange={(e) => setSucursalSeleccionada(e.target.value)}
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

          {/* Carga Excel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Archivo Excel *</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-indigo-400 transition-colors">
              <input key={fileInputKey} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="excel-masivo" />
              <label htmlFor="excel-masivo" className="cursor-pointer flex flex-col items-center gap-2">
                {excelFile ? (
                  <>
                    <FileSpreadsheet className="w-10 h-10 text-green-500" />
                    <p className="text-sm font-medium text-gray-700">{excelFile.name}</p>
                    <p className="text-xs text-gray-500">{productosValidos.length + productosNoEncontrados.length} líneas procesadas</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400" />
                    <p className="text-sm text-gray-600">Click para cargar Excel</p>
                    <p className="text-xs text-gray-400">.xlsx, .xls</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <button onClick={handleDownloadTemplate}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Descargar Plantilla Excel
          </button>

          {/* Info columnas */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-700">
                <p className="font-semibold mb-1">Columnas del Excel:</p>
                <p>Cantidad, Codigo de barras, Unidad, Precio, Lote, Caducidad, Clave SAT, Laboratorio, Descripcion, Tasa, Balance, Factura, Sucursal, Fecha factura, Proveedor</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vista previa */}
        <div className="lg:col-span-2 space-y-4">
          {/* Productos NO encontrados */}
          {productosNoEncontrados.length > 0 && (
            <div className="border-2 border-red-300 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h4 className="font-semibold text-red-800">
                  {productosNoEncontrados.length} producto(s) no encontrados en inventario
                </h4>
              </div>
              <div className="divide-y divide-red-100">
                {productosNoEncontrados.map((p, idx) => (
                  <div key={idx} className="px-4 py-3 bg-red-50 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-mono font-semibold text-red-800">{p.codigoBarras}</p>
                      <p className="text-xs text-red-600">Cant: {p.cantidad} | ${p.precio.toFixed(2)}/u</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRevalidar(p.codigoBarras)}
                        disabled={revalidando === p.codigoBarras}
                        className="flex items-center gap-1 text-xs bg-white border border-green-400 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${revalidando === p.codigoBarras ? "animate-spin" : ""}`} />
                        Ya está dado de alta
                      </button>
                      <button
                        onClick={() => setCodigoParaAlta(p.codigoBarras)}
                        className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
                      >
                        <Plus className="w-3 h-3" /> Dar de alta en Inventario
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Productos válidos */}
          {productosValidos.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-green-50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-800">{productosValidos.length} productos listos para registrar</h4>
                </div>
                <span className="text-sm font-bold text-green-700">Total: ${totalValidos.toFixed(2)}</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Código</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nombre</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Cant</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Precio</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productosValidos.map((p, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-mono text-gray-600">{p.codigoBarras}</td>
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">{p._nombre}</td>
                        <td className="px-3 py-2 text-xs text-right">{p.cantidad}</td>
                        <td className="px-3 py-2 text-xs text-right">${p.precio.toFixed(2)}</td>
                        <td className="px-3 py-2 text-xs text-right font-semibold text-green-600">${(p.precio * p.cantidad).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!excelFile && (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center">
              <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Carga un archivo Excel para ver la vista previa</p>
            </div>
          )}

          {/* Botones */}
          {productosValidos.length > 0 && (
            <div className="flex gap-3">
              <button onClick={handleLimpiar}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-sm">
                <X className="w-4 h-4" /> Limpiar
              </button>
              <button onClick={handleSubmit} disabled={loading || !proveedor.trim() || !sucursalSeleccionada}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium">
                <Check className="w-4 h-4" />
                {loading ? "Procesando..." : `Registrar ${productosValidos.length} compras`}
              </button>
            </div>
          )}
        </div>
      </div>
      {codigoParaAlta && (
        <AddProductModal
          sucursalId={sucursalSeleccionada}
          codigoInicial={codigoParaAlta}
          onClose={() => setCodigoParaAlta(null)}
          onSuccess={() => {
            const cod = codigoParaAlta;
            setCodigoParaAlta(null);
            if (cod) handleRevalidar(cod);
          }}
        />
      )}
    </div>
  );
}
