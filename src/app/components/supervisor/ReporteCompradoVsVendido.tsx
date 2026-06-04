import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { inicioDiaCDMX, finDiaCDMX } from "/utils/timezone";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import { Download, TrendingUp, TrendingDown, DollarSign, BarChart3, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";

interface ReporteCompradoVsVendidoProps {
  sucursalId?: string;
  todasLasSucursales?: boolean;
  onVolver: () => void;

}

const CATEGORIAS = [
  "Antibióticos", "Bebés", "Botica y material de curación", "Cuidado de la piel",
  "Cuidado del cabello", "Fracción IV", "Fracción V", "Fracción VI",
  "Higiene personal", "Pareja", "Productos de venta libre", "Vitaminas y suplementos"
];

export default function ReporteCompradoVsVendido({ sucursalId, todasLasSucursales = false, onVolver }: ReporteCompradoVsVendidoProps) {
  const [cargando, setCargando] = useState(true);

  const [fechaInicio, setFechaInicio] = useState(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 30);
    return fecha.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split("T")[0]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [soloBajaRotacion, setSoloBajaRotacion] = useState(false);

  const [productos, setProductos] = useState<any[]>([]);
  const [metricas, setMetricas] = useState<any>(null);

  useEffect(() => {
    cargarDatos();
  }, [fechaInicio, fechaFin, sucursalId]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({
        fechaInicio: inicioDiaCDMX(fechaInicio),
        fechaFin: finDiaCDMX(fechaFin),
        todas: todasLasSucursales.toString(),
      });

      if (!todasLasSucursales && sucursalId) {
        params.append("sucursal", sucursalId);
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/api/reportes/comprado-vs-vendido?${params}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Backend error:", errorData);
        throw new Error(errorData.error || "Error al cargar reporte");
      }

      const data = await response.json();
      procesarDatos(data);
    } catch (error) {
      console.error("Error cargando reporte:", error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCargando(false);
    }
  };

  const procesarDatos = (data: any) => {
    const { ventas = [], compras = [], productos: productosData = [] } = data || {};

    // Mapear compras por producto
    const comprasMap: any = {};
    compras.forEach((c: any) => {
      c.productos?.forEach((p: any) => {
        const key = p.productoId || p.nombre;
        if (!comprasMap[key]) {
          comprasMap[key] = { unidades: 0, pesos: 0 };
        }
        comprasMap[key].unidades += p.cantidad || 0;
        comprasMap[key].pesos += (p.cantidad || 0) * (p.precioUnitario || 0);
      });
    });

    // Mapear ventas por producto
    const ventasMap: any = {};
    ventas.forEach((v: any) => {
      v.productos?.forEach((p: any) => {
        const key = p.productoId || p.nombre;
        if (!ventasMap[key]) {
          ventasMap[key] = { unidades: 0, pesos: 0 };
        }
        ventasMap[key].unidades += p.cantidad || 0;
        ventasMap[key].pesos += (p.cantidad || 0) * (p.precio || 0);
      });
    });

    // Crear lista de productos con análisis
    const productosArray: any[] = [];
    let totalInvertido = 0;
    let totalRecuperado = 0;

    productosData.forEach((p: any) => {
      const comprado = comprasMap[p.id] || comprasMap[p.nombre] || { unidades: 0, pesos: 0 };
      const vendido = ventasMap[p.id] || ventasMap[p.nombre] || { unidades: 0, pesos: 0 };

      if (comprado.unidades === 0 && vendido.unidades === 0) return;

      const diferenciaUnidades = comprado.unidades - vendido.unidades;
      const diferenciaPesos = comprado.pesos - vendido.pesos;
      const rotacion = comprado.unidades > 0 ? (vendido.unidades / comprado.unidades) * 100 : 0;

      let nivelRotacion = "baja";
      if (rotacion >= 90) nivelRotacion = "excelente";
      else if (rotacion >= 50) nivelRotacion = "media";

      productosArray.push({
        id: p.id,
        codigo: p.codigoBarras || "",
        nombre: p.nombre,
        categoria: p.categoria || "Sin categoría",
        compradoPesos: comprado.pesos,
        compradoUnidades: comprado.unidades,
        vendidoPesos: vendido.pesos,
        vendidoUnidades: vendido.unidades,
        diferenciaPesos,
        diferenciaUnidades,
        rotacion,
        nivelRotacion,
      });

      totalInvertido += comprado.pesos;
      totalRecuperado += vendido.pesos;
    });

    // Ordenar por rotación
    productosArray.sort((a, b) => b.rotacion - a.rotacion);

    const margenBruto = totalRecuperado - totalInvertido;
    const productoMejorRotacion = productosArray[0];
    const productoPeorRotacion = productosArray[productosArray.length - 1];

    setProductos(productosArray);
    setMetricas({
      totalInvertido,
      totalRecuperado,
      margenBruto,
      productoMejorRotacion,
      productoPeorRotacion,
    });
  };

  const productosFiltrados = () => {
    return productos.filter((p) => {
      const cumpleCategoria = categoriaFiltro === "todas" || p.categoria === categoriaFiltro;
      const cumpleRotacion = !soloBajaRotacion || p.rotacion < 50;
      return cumpleCategoria && cumpleRotacion;
    });
  };

  const descargarExcel = () => {
    const wb = XLSX.utils.book_new();
    const lista = productosFiltrados();

    const wsData = [
      ["Código", "Nombre", "Categoría", "Comprado ($)", "Comprado (Unid.)", "Vendido ($)", "Vendido (Unid.)", "Diferencia ($)", "Diferencia (Unid.)", "% Rotación"],
      ...lista.map((p) => [
        p.codigo,
        p.nombre,
        p.categoria,
        p.compradoPesos,
        p.compradoUnidades,
        p.vendidoPesos,
        p.vendidoUnidades,
        p.diferenciaPesos,
        p.diferenciaUnidades,
        p.rotacion.toFixed(2),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Comprado vs Vendido");
    XLSX.writeFile(wb, "reporte-comprado-vs-vendido.xlsx");
    toast.success("Excel descargado");
  };

  const getIndicadorColor = (nivel: string) => {
    if (nivel === "excelente") return "bg-green-500";
    if (nivel === "media") return "bg-yellow-500";
    return "bg-red-500";
  };

  const getIndicadorIcono = (nivel: string) => {
    if (nivel === "excelente") return <TrendingUp className="w-4 h-4" />;
    if (nivel === "media") return <AlertCircle className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const listaFiltrada = productosFiltrados();
  const top10 = listaFiltrada.slice(0, 10).map((p, index) => ({
    id: `producto-${p.id}-${index}`,
    nombre: `${index + 1}. ${p.nombre.substring(0, 20)}${p.nombre.length > 20 ? "..." : ""}`,
    Comprado: p.compradoUnidades,
    Vendido: p.vendidoUnidades,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button onClick={onVolver} className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 block">← Volver a reportes</button>
            <h2 className="text-2xl font-bold text-gray-900">Reporte Comprado vs Vendido</h2>
            <p className="text-sm text-gray-600 mt-1">
              {todasLasSucursales ? "Todas las Sucursales" : SUCURSALES.find((s) => s.id === sucursalId)?.nombre}
            </p>
          </div>
          <button onClick={descargarExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" />
            Descargar Excel
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="todas">Todas</option>
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={soloBajaRotacion}
                onChange={(e) => setSoloBajaRotacion(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Solo baja rotación (&lt;50%)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Métricas */}
      {metricas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-900">Total Invertido</p>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900">${metricas.totalInvertido.toLocaleString()}</p>
            <p className="text-xs text-blue-700 mt-1">En compras del período</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-green-900">Total Recuperado</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-900">${metricas.totalRecuperado.toLocaleString()}</p>
            <p className="text-xs text-green-700 mt-1">En ventas del período</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-purple-900">Margen Bruto Estimado</p>
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <p className={`text-2xl font-bold ${metricas.margenBruto >= 0 ? "text-purple-900" : "text-red-900"}`}>
              ${metricas.margenBruto.toLocaleString()}
            </p>
            <p className="text-xs text-purple-700 mt-1">{metricas.margenBruto >= 0 ? "Ganancia" : "Pérdida"} estimada</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-amber-900">Mejor Rotación</p>
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-sm font-bold text-amber-900 truncate">{metricas.productoMejorRotacion?.nombre || "N/A"}</p>
            <p className="text-xs text-amber-700 mt-1">{metricas.productoMejorRotacion?.rotacion.toFixed(1)}% rotación</p>
          </div>
        </div>
      )}

      {/* Gráfica Top 10 */}
      {top10.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Top 10 Productos - Comprado vs Vendido (Unidades)
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={top10}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={120} interval={0} style={{ fontSize: "12px" }} />
              <YAxis label={{ value: "Unidades", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Comprado" fill="#3b82f6" name="Comprado" />
              <Bar dataKey="Vendido" fill="#10b981" name="Vendido" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Análisis Detallado por Producto</h3>
          <p className="text-sm text-gray-600 mt-1">Mostrando {listaFiltrada.length} productos</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comprado ($)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comprado (Unid.)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendido ($)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendido (Unid.)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diferencia</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Rotación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {listaFiltrada.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{p.codigo}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.categoria}</td>
                  <td className="px-4 py-3 text-sm text-right">${p.compradoPesos.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right">{p.compradoUnidades}</td>
                  <td className="px-4 py-3 text-sm text-right">${p.vendidoPesos.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right">{p.vendidoUnidades}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`font-semibold ${p.diferenciaUnidades > 0 ? "text-orange-600" : "text-green-600"}`}>
                      {p.diferenciaUnidades > 0 ? "+" : ""}{p.diferenciaUnidades}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className={`w-2 h-2 rounded-full ${getIndicadorColor(p.nivelRotacion)}`}></div>
                      <span className="font-semibold">{p.rotacion.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
