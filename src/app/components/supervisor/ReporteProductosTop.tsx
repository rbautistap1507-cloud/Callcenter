import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { inicioDiaCDMX, finDiaCDMX } from "/utils/timezone";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import { Download, TrendingUp, TrendingDown, Calendar, Package, Search, Filter, Award, Medal } from "lucide-react";
import * as XLSX from "xlsx";

interface ReporteProductosTopProps {
  sucursalId?: string;
  todasLasSucursales?: boolean;
  onVolver: () => void;
}

const CATEGORIAS = [
  "Antibióticos", "Bebés", "Botica y material de curación", "Cuidado de la piel",
  "Cuidado del cabello", "Fracción IV", "Fracción V", "Fracción VI",
  "Higiene personal", "Pareja", "Productos de venta libre", "Vitaminas y suplementos"
];

export default function ReporteProductosTop({ sucursalId, todasLasSucursales = false, onVolver }: ReporteProductosTopProps) {
  const [pestañaActiva, setPestañaActiva] = useState<"top" | "bottom">("top");
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [fechaInicio, setFechaInicio] = useState(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 30);
    return fecha.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split("T")[0]);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState("");

  // Datos
  const [productosTop, setProductosTop] = useState<any[]>([]);
  const [productosBottom, setProductosBottom] = useState<any[]>([]);
  const [totalVentas, setTotalVentas] = useState(0);

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
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/api/reportes/productos-top?${params}`,
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
    const { ventas = [], productos = [] } = data || {};

    // Mapear ventas por producto
    const ventasMap: any = {};
    let total = 0;

    ventas.forEach((v: any) => {
      v.productos?.forEach((p: any) => {
        const key = p.productoId || p.nombre;
        if (!ventasMap[key]) {
          ventasMap[key] = {
            id: key,
            codigo: p.codigoBarras || "",
            nombre: p.nombre,
            categoria: "",
            unidadesVendidas: 0,
            montoTotal: 0,
            ultimaVenta: v.fecha,
          };
        }
        ventasMap[key].unidadesVendidas += p.cantidad || 0;
        ventasMap[key].montoTotal += (p.cantidad || 0) * (p.precio || 0);
        ventasMap[key].ultimaVenta = v.fecha;
      });
    });

    // Enriquecer con datos de productos
    Object.keys(ventasMap).forEach((key) => {
      const producto = productos.find((p: any) => p.id === key || p.nombre === ventasMap[key].nombre);
      if (producto) {
        ventasMap[key].codigo = producto.codigoBarras || ventasMap[key].codigo;
        ventasMap[key].categoria = producto.categoria || "Sin categoría";
        ventasMap[key].stock = producto.stockBySucursal || {};
      }
      total += ventasMap[key].montoTotal;
    });

    // Calcular % del total de ventas
    Object.values(ventasMap).forEach((p: any) => {
      p.porcentajeVentas = total > 0 ? (p.montoTotal / total) * 100 : 0;
    });

    setTotalVentas(total);

    // Ordenar por unidades vendidas
    const productosArray = Object.values(ventasMap);
    setProductosTop(productosArray.sort((a: any, b: any) => b.unidadesVendidas - a.unidadesVendidas));

    // Bottom: productos con stock pero bajas ventas
    const productosConStock = productos.filter((p: any) => {
      const stock = p.stockBySucursal || {};
      const stockTotal = Object.values(stock).reduce((sum: number, val: any) => sum + (val || 0), 0);
      return stockTotal > 0;
    });

    const productosBottomArray = productosConStock.map((p: any) => {
      const venta = ventasMap[p.id] || ventasMap[p.nombre];
      const ultimaVenta = venta?.ultimaVenta || null;
      const diasSinVenta = ultimaVenta ? Math.floor((new Date().getTime() - new Date(ultimaVenta).getTime()) / (1000 * 60 * 60 * 24)) : 999;

      return {
        id: p.id,
        codigo: p.codigoBarras || "",
        nombre: p.nombre,
        categoria: p.categoria || "Sin categoría",
        unidadesVendidas: venta?.unidadesVendidas || 0,
        montoTotal: venta?.montoTotal || 0,
        porcentajeVentas: venta?.porcentajeVentas || 0,
        stock: p.stockBySucursal || {},
        diasSinVenta,
        ultimaVenta,
      };
    });

    setProductosBottom(productosBottomArray.sort((a, b) => a.unidadesVendidas - b.unidadesVendidas));
  };

  const productosFiltrados = () => {
    const lista = pestañaActiva === "top" ? productosTop : productosBottom;
    return lista.filter((p) => {
      const cumpleCategoria = categoriaFiltro === "todas" || p.categoria === categoriaFiltro;
      const cumpleBusqueda = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo.toLowerCase().includes(busqueda.toLowerCase());
      return cumpleCategoria && cumpleBusqueda;
    });
  };

  const descargarExcel = () => {
    const wb = XLSX.utils.book_new();
    const lista = productosFiltrados();

    const wsData = [
      ["Código", "Nombre", "Categoría", "Unidades Vendidas", "Monto Total", "% del Total"],
      ...lista.map((p) => [p.codigo, p.nombre, p.categoria, p.unidadesVendidas, p.montoTotal, p.porcentajeVentas.toFixed(2)]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, pestañaActiva === "top" ? "TOP Ventas" : "BOTTOM Ventas");
    XLSX.writeFile(wb, `reporte-productos-${pestañaActiva}.xlsx`);
    toast.success("Excel descargado");
  };

  const getBadge = (index: number) => {
    if (index === 0) return <Award className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return null;
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const listaFiltrada = productosFiltrados();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button onClick={onVolver} className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 block">← Volver a reportes</button>
            <h2 className="text-2xl font-bold text-gray-900">Reporte Productos TOP</h2>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Código o nombre..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setPestañaActiva("top")}
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              pestañaActiva === "top"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Productos con Altas Ventas
            </div>
          </button>
          <button
            onClick={() => setPestañaActiva("bottom")}
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              pestañaActiva === "bottom"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Productos con Bajas Ventas
            </div>
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unidades Vendidas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% del Total</th>
                {pestañaActiva === "bottom" && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Días sin Venta</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {listaFiltrada.map((producto, index) => (
                <tr
                  key={producto.id}
                  className={`hover:bg-gray-50 ${
                    pestañaActiva === "bottom" && producto.diasSinVenta > 30 ? "bg-red-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      {pestañaActiva === "top" && getBadge(index)}
                      <span>{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{producto.codigo}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{producto.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{producto.categoria}</td>
                  <td className="px-4 py-3 text-sm text-right">{producto.unidadesVendidas}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">${producto.montoTotal.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{producto.porcentajeVentas.toFixed(2)}%</td>
                  {pestañaActiva === "bottom" && (
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        producto.diasSinVenta > 30 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {producto.diasSinVenta === 999 ? "Nunca" : `${producto.diasSinVenta} días`}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            Mostrando {listaFiltrada.length} productos | Total ventas en período: ${totalVentas.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
