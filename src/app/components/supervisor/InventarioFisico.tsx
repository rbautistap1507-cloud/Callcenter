import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, Check, X, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { SUCURSALES } from "../../shared";

interface InventarioFisicoProps {
  selectedSucursal: string;
  user: any;
  onBack: () => void;
  onSuccess: () => void;
}

export default function InventarioFisico({ selectedSucursal, user, onBack, onSuccess }: InventarioFisicoProps) {
  const [productos, setProductos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [conteos, setConteos] = useState<Record<string, string>>({});
  const [procesando, setProcesando] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const sucursalNombre = SUCURSALES.find(s => s.id === selectedSucursal)?.nombre || selectedSucursal;

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    setCargando(true);
    try {
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos?limit=10000`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await resp.json();
      if (data.success) {
        setProductos(data.productos || []);
      } else {
        toast.error("Error al cargar productos");
      }
    } catch (e) {
      toast.error("Error al cargar productos");
    } finally {
      setCargando(false);
    }
  };

  const getStock = (p: any) => (p.stockBySucursal || {})[selectedSucursal] || 0;

  const productosFiltrados = productos.filter((p) => {
    const t = busqueda.toLowerCase();
    return !t || p.nombre?.toLowerCase().includes(t) || p.codigoBarras?.toLowerCase().includes(t);
  });

  // Items capturados (con conteo no vacío)
  const itemsCapturados = productos
    .filter((p) => {
      const codigo = p.codigoBarras || p.id;
      const val = conteos[codigo];
      return val !== undefined && val !== "" && !isNaN(parseInt(val));
    })
    .map((p) => {
      const codigo = p.codigoBarras || p.id;
      const fisico = parseInt(conteos[codigo]);
      const sistema = getStock(p);
      return {
        productoId: codigo,
        nombre: p.nombre,
        stockSistema: sistema,
        stockFisico: fisico,
        diferencia: fisico - sistema,
      };
    });

  const conDiferencia = itemsCapturados.filter((i) => i.diferencia !== 0);
  const sinDiferencia = itemsCapturados.filter((i) => i.diferencia === 0);

  const handleConfirmar = async () => {
    if (itemsCapturados.length === 0) {
      toast.error("No has capturado ningún conteo");
      return;
    }
    setProcesando(true);
    try {
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/auditorias/masiva`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            sucursalId: selectedSucursal,
            items: itemsCapturados.map((i) => ({ productoId: i.productoId, stockFisico: i.stockFisico })),
            confirmadoPor: user?.name || user?.username || "Inventario Físico",
          }),
        }
      );
      const data = await resp.json();
      if (data.success) {
        setResultado(data);
        setMostrarResumen(false);
        toast.success(`Inventario procesado: ${data.confirmados} confirmados, ${data.ajustados} ajustados`);
        setConteos({});
        cargarProductos();
        onSuccess();
      } else {
        toast.error(data.error || "Error al procesar inventario");
      }
    } catch (e) {
      toast.error("Error al procesar inventario");
    } finally {
      setProcesando(false);
    }
  };

  if (selectedSucursal === "todas") {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <button onClick={onBack} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-4">
          ← Volver al menú de ajustes
        </button>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          Selecciona una sucursal específica (en el menú superior) para realizar el inventario físico.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <button onClick={onBack} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-3">
          ← Volver al menú de ajustes
        </button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-xl flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-teal-600" />
              Inventario Físico — {sucursalNombre}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Captura el conteo físico. Los productos en blanco no se modifican.
            </p>
          </div>
          <button onClick={cargarProductos} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm">
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} /> Recargar
          </button>
        </div>

        {/* Resumen de captura */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-xs text-gray-600">Capturados</span>
            <p className="font-bold text-blue-700">{itemsCapturados.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            <span className="text-xs text-gray-600">Sin diferencia</span>
            <p className="font-bold text-green-700">{sinDiferencia.length}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <span className="text-xs text-gray-600">Con diferencia</span>
            <p className="font-bold text-red-700">{conDiferencia.length}</p>
          </div>
          <button
            onClick={() => setMostrarResumen(true)}
            disabled={itemsCapturados.length === 0}
            className="ml-auto bg-teal-600 text-white px-5 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            <Check className="w-5 h-5" /> Revisar y Confirmar
          </button>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto por nombre o código..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock Sistema</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Conteo Físico</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productosFiltrados.map((p) => {
                const codigo = p.codigoBarras || p.id;
                const sistema = getStock(p);
                const val = conteos[codigo] ?? "";
                const dif = val !== "" && !isNaN(parseInt(val)) ? parseInt(val) - sistema : null;
                return (
                  <tr key={codigo} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-600">{p.codigoBarras}</td>
                    <td className="px-4 py-2 text-sm font-medium">{p.nombre}</td>
                    <td className="px-4 py-2 text-center text-sm font-semibold">{sistema}</td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => setConteos((prev) => ({ ...prev, [codigo]: e.target.value }))}
                        className="w-24 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-teal-500"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      {dif === null ? (
                        <span className="text-gray-300">—</span>
                      ) : dif === 0 ? (
                        <span className="text-green-600 font-semibold text-sm">0</span>
                      ) : (
                        <span className="text-red-600 font-bold text-sm">{dif > 0 ? `+${dif}` : dif}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de resumen antes de aplicar */}
      {mostrarResumen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Confirmar Inventario Físico
              </h3>
              <button onClick={() => setMostrarResumen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <p className="text-sm text-gray-700 mb-4">
                Se procesarán <strong>{itemsCapturados.length}</strong> productos en <strong>{sucursalNombre}</strong>:
                <br />
                <span className="text-green-700">{sinDiferencia.length} se confirmarán como correctos</span>,{" "}
                <span className="text-red-700">{conDiferencia.length} se ajustarán automáticamente</span>.
              </p>
              {conDiferencia.length > 0 && (
                <div className="border rounded-lg overflow-hidden mb-3">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs text-gray-500">Producto</th>
                        <th className="px-3 py-2 text-center text-xs text-gray-500">Sistema</th>
                        <th className="px-3 py-2 text-center text-xs text-gray-500">Físico</th>
                        <th className="px-3 py-2 text-center text-xs text-gray-500">Ajuste</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {conDiferencia.map((i) => (
                        <tr key={i.productoId}>
                          <td className="px-3 py-2 text-xs">{i.nombre}</td>
                          <td className="px-3 py-2 text-center text-xs">{i.stockSistema}</td>
                          <td className="px-3 py-2 text-center text-xs font-semibold">{i.stockFisico}</td>
                          <td className="px-3 py-2 text-center text-xs font-bold text-red-600">
                            {i.diferencia > 0 ? `+${i.diferencia}` : i.diferencia}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setMostrarResumen(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={procesando}
                className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                {procesando ? "Procesando..." : "Aplicar Inventario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="p-5 border-t bg-green-50">
          <p className="font-semibold text-green-800">
            ✓ Inventario aplicado: {resultado.confirmados} confirmados, {resultado.ajustados} ajustados ({resultado.total} total)
          </p>
        </div>
      )}
    </div>
  );
}
