import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { inicioDiaCDMX, finDiaCDMX } from "/utils/timezone";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import { Download, Package, TrendingUp, DollarSign } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";

interface ReporteCategoriasProps {
  sucursalId?: string;
  todasLasSucursales?: boolean;
  onVolver: () => void;
}

const CATEGORIAS = [
  "Antibióticos", "Bebés", "Botica y material de curación", "Cuidado de la piel",
  "Cuidado del cabello", "Fracción IV", "Fracción V", "Fracción VI",
  "Higiene personal", "Pareja", "Productos de venta libre", "Vitaminas y suplementos"
];

const COLORES = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16", "#a855f7", "#6366f1"
];

export default function ReporteCategorias({ sucursalId, todasLasSucursales = false, onVolver }: ReporteCategoriasProps) {
  const [cargando, setCargando] = useState(true);

  const [fechaInicio, setFechaInicio] = useState(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 30);
    return fecha.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split("T")[0]);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>(CATEGORIAS);

  const [datosCategorias, setDatosCategorias] = useState<any[]>([]);
  const [top3PorCategoria, setTop3PorCategoria] = useState<any>({});
  const [stockPorCategoria, setStockPorCategoria] = useState<any[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);

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
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/api/reportes/categorias?${params}`,
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
      toast.error(`Error al cargar el reporte: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCargando(false);
    }
  };

  const procesarDatos = (data: any) => {
    const { ventas = [], productos = [] } = data || {};

    // Mapa de categorías
    const categoriasMap: any = {};
    const todasCategorias = [...CATEGORIAS, "Sin categoría"];
        todasCategorias.forEach(cat => {
        categoriasMap[cat] = {
        categoria: cat,
        productosActivos: 0,
        unidadesVendidas: 0,
        montoVendido: 0,
        cantidadTickets: 0,
      };
    });

    // Contar productos activos por categoría
    productos.forEach((p: any) => {
      const cat = p.categoria || p.grupo || p.agrupacion || "Sin categoría";
      if (categoriasMap[cat]) {
        categoriasMap[cat].productosActivos++;
      }
    });

    // Analizar ventas por categoría
    const productosVendidos: any = {};

    ventas.forEach((v: any) => {
      v.productos?.forEach((p: any) => {
        const producto = productos.find((pr: any) => pr.id === p.productoId || pr.nombre === p.nombre);
        const cat = producto?.categoria || producto?.grupo || producto?.agrupacion || "Sin categoría";

        if (categoriasMap[cat]) {
          categoriasMap[cat].unidadesVendidas += p.cantidad || 0;
          categoriasMap[cat].montoVendido += (p.cantidad || 0) * (p.precio || 0);
          categoriasMap[cat].cantidadTickets++;
        }

        // Para top 3 por categoría
        const key = `${cat}|${p.nombre}`;
        if (!productosVendidos[key]) {
          productosVendidos[key] = {
            categoria: cat,
            nombre: p.nombre,
            unidades: 0,
            monto: 0,
          };
        }
        productosVendidos[key].unidades += p.cantidad || 0;
        productosVendidos[key].monto += (p.cantidad || 0) * (p.precio || 0);
      });
    });

    // Calcular porcentajes y ticket promedio
    const totalVentas = Object.values(categoriasMap).reduce((sum: number, c: any) => sum + c.montoVendido, 0);
    Object.values(categoriasMap).forEach((c: any) => {
      c.porcentaje = totalVentas > 0 ? (c.montoVendido / totalVentas) * 100 : 0;
      c.ticketPromedio = c.cantidadTickets > 0 ? c.montoVendido / c.cantidadTickets : 0;
    });

    setDatosCategorias(Object.values(categoriasMap).sort((a: any, b: any) => b.montoVendido - a.montoVendido));

    // Top 3 por categoría
    const top3Map: any = {};
    Object.values(productosVendidos).forEach((p: any) => {
      if (!top3Map[p.categoria]) {
        top3Map[p.categoria] = [];
      }
      top3Map[p.categoria].push(p);
    });

    Object.keys(top3Map).forEach(cat => {
      top3Map[cat] = top3Map[cat]
        .sort((a: any, b: any) => b.monto - a.monto)
        .slice(0, 3);
    });

    setTop3PorCategoria(top3Map);

    // Stock por categoría
    const stockMap: any = {};
        todasCategorias.forEach(cat => {
        stockMap[cat] = {
        categoria: cat,
        stockTotal: 0,
        stockValorVenta: 0,
        stockValorCosto: 0,
      };
    });

    productos.forEach((p: any) => {
      const cat = p.categoria || p.grupo || p.agrupacion || "Sin categoría";
      if (stockMap[cat]) {
        const stock = p.stockBySucursal || {};
        const stockTotal = Object.values(stock).reduce((sum: number, val: any) => sum + (val || 0), 0) as number;

        stockMap[cat].stockTotal += stockTotal;
        stockMap[cat].stockValorVenta += stockTotal * (p.precioVenta || 0);
        stockMap[cat].stockValorCosto += stockTotal * (p.costo || 0);
      }
    });

    setStockPorCategoria(Object.values(stockMap).filter((s: any) => s.stockTotal > 0));
  };

  const toggleCategoria = (cat: string) => {
    if (categoriasSeleccionadas.includes(cat)) {
      setCategoriasSeleccionadas(categoriasSeleccionadas.filter(c => c !== cat));
    } else {
      setCategoriasSeleccionadas([...categoriasSeleccionadas, cat]);
    }
  };

  const datosFiltrados = () => {
    return datosCategorias.filter(c => categoriasSeleccionadas.includes(c.categoria));
  };

  const datosParaGrafica = () => {
    const filtrados = datosFiltrados();
    return filtrados.map((c) => ({
      id: `cat-${c.categoria}`,
      name: c.categoria,
      value: c.montoVendido,
    }));
  };

  const descargarExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const wsData1 = [
      ["Categoría", "Productos Activos", "Unidades Vendidas", "Monto Vendido", "% del Total", "Ticket Promedio"],
      ...datosFiltrados().map(c => [
        c.categoria,
        c.productosActivos,
        c.unidadesVendidas,
        c.montoVendido,
        c.porcentaje.toFixed(2),
        c.ticketPromedio.toFixed(2),
      ]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(wsData1);
    XLSX.utils.book_append_sheet(wb, ws1, "Resumen");

    // Hoja 2: Stock
    const wsData2 = [
      ["Categoría", "Stock Total", "Valor Venta", "Valor Costo"],
      ...stockPorCategoria.map(s => [
        s.categoria,
        s.stockTotal,
        s.stockValorVenta,
        s.stockValorCosto,
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(wsData2);
    XLSX.utils.book_append_sheet(wb, ws2, "Stock");

    XLSX.writeFile(wb, "reporte-categorias.xlsx");
    toast.success("Excel descargado");
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filtrados = datosFiltrados();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button onClick={onVolver} className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 block">← Volver a reportes</button>
            <h2 className="text-2xl font-bold text-gray-900">Reporte por Categorías</h2>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
        </div>

        {/* Selector de categorías */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Categorías a Incluir</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((cat, idx) => (
              <button
                key={cat}
                onClick={() => toggleCategoria(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  categoriasSeleccionadas.includes(cat)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sección 1: Tabla de categorías */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Desempeño por Categoría</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Productos Activos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unidades Vendidas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto Vendido</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% del Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ticket Promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtrados.map((c, idx) => (
                <tr
                  key={c.categoria}
                  className={`hover:bg-gray-50 cursor-pointer ${categoriaSeleccionada === c.categoria ? "bg-blue-50" : ""}`}
                  onClick={() => setCategoriaSeleccionada(c.categoria)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORES[idx % COLORES.length] }}></div>
                    {c.categoria}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{c.productosActivos}</td>
                  <td className="px-4 py-3 text-sm text-right">{c.unidadesVendidas}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">${c.montoVendido.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right">{c.porcentaje.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-sm text-right">${c.ticketPromedio.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección 2: Gráfica de pastel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Distribución de Ventas por Categoría</h3>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            {(() => {
  const graficaData = datosParaGrafica();
  return (
    <Pie
      data={graficaData}
      dataKey="value"
      nameKey="name"
      cx="50%"
      cy="50%"
      outerRadius={120}
      label={(entry) => `${entry.name}: ${((entry.value / filtrados.reduce((sum, c) => sum + c.montoVendido, 0)) * 100).toFixed(1)}%`}
    >
      {graficaData.map((entry, index) => (
        <Cell key={`cell-categoria-${index}`} fill={COLORES[index % COLORES.length]} />
      ))}
    </Pie>
  );
})()}
            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Sección 3: Top 3 por categoría */}
      {categoriaSeleccionada && top3PorCategoria[categoriaSeleccionada] && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Top 3 Productos en {categoriaSeleccionada}</h3>
          <div className="space-y-3">
            {top3PorCategoria[categoriaSeleccionada].map((p: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{p.nombre}</p>
                    <p className="text-sm text-gray-600">{p.unidades} unidades vendidas</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">${p.monto.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sección 4: Stock por categoría */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Stock Valorado por Categoría</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Venta</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stockPorCategoria.map((s) => (
                <tr key={s.categoria} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.categoria}</td>
                  <td className="px-4 py-3 text-sm text-right">{s.stockTotal}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">${s.stockValorVenta.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">${s.stockValorCosto.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
