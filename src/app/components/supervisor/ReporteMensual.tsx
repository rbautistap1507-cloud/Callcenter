import { useState, useEffect, useRef } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import {
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

interface ReporteMensualProps {
  sucursalId?: string;
  todasLasSucursales?: boolean;
   onVolver: () => void;
}

const COLORES_CHART = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function ReporteMensual({
  sucursalId,
  todasLasSucursales = false,onVolver
}: ReporteMensualProps) {
  const reporteRef = useRef<HTMLDivElement>(null);

  const [mesSeleccionado, setMesSeleccionado] = useState(() => new Date().getMonth());
  const [añoSeleccionado, setAñoSeleccionado] = useState(() => new Date().getFullYear());
  const [cargando, setCargando] = useState(false);

  // Datos del reporte
  const [resumenMes, setResumenMes] = useState<any>(null);
  const [comparativo, setComparativo] = useState<any>(null);
  const [ventasDiarias, setVentasDiarias] = useState<any[]>([]);
  const [productosTop, setProductosTop] = useState<any[]>([]);
  const [diasTop, setDiasTop] = useState<any[]>([]);
  const [formasPago, setFormasPago] = useState<any[]>([]);
  const [resumenSucursales, setResumenSucursales] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const años = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    cargarDatos();
  }, [mesSeleccionado, añoSeleccionado, sucursalId]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({
        mes: mesSeleccionado.toString(),
        año: añoSeleccionado.toString(),
        todas: todasLasSucursales.toString(),
      });

      if (!todasLasSucursales && sucursalId) {
        params.append("sucursal", sucursalId);
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/api/reportes/mensual?${params}`,
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
    const {
      ventasMes = [],
      serviciosMes = [],
      comprasMes = [],
      gastosMes = [],
      ventasMesAnterior = [],
      serviciosMesAnterior = [],
      productos = [],
      medicos = []
    } = data || {};

    // SECCIÓN 1: Resumen ejecutivo
    const totalVentas = ventasMes.reduce((sum: number, v: any) => sum + (v.total || 0), 0);
    const cantidadTickets = ventasMes.length;
    const totalServicios = serviciosMes.reduce((sum: number, s: any) => sum + (s.monto || 0), 0);
    const cantidadServicios = serviciosMes.length;
    const totalCompras = comprasMes.reduce((sum: number, c: any) => sum + (c.total || 0), 0);
    const totalGastos = gastosMes.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
    const utilidadBruta = (totalVentas + totalServicios) - (totalCompras + totalGastos);

    const totalVentasAnterior = ventasMesAnterior.reduce((sum: number, v: any) => sum + (v.total || 0), 0);
    const totalServiciosAnterior = serviciosMesAnterior.reduce((sum: number, s: any) => sum + (s.monto || 0), 0);

    const ventasCambio = totalVentasAnterior > 0 ? ((totalVentas - totalVentasAnterior) / totalVentasAnterior) * 100 : 0;
    const serviciosCambio = totalServiciosAnterior > 0 ? ((totalServicios - totalServiciosAnterior) / totalServiciosAnterior) * 100 : 0;

    setResumenMes({
      totalVentas,
      cantidadTickets,
      totalServicios,
      cantidadServicios,
      totalCompras,
      totalGastos,
      utilidadBruta,
    });

    setComparativo({
      ventasCambio,
      serviciosCambio,
    });

    // SECCIÓN 2: Ventas diarias
    const diasEnMes = new Date(añoSeleccionado, mesSeleccionado + 1, 0).getDate();
    const ventasPorDia: any = {};
    for (let i = 1; i <= diasEnMes; i++) ventasPorDia[i] = 0;

    ventasMes.forEach((v: any) => {
      const dia = new Date(v.fecha).getDate();
      ventasPorDia[dia] = (ventasPorDia[dia] || 0) + (v.total || 0);
    });

    setVentasDiarias(
      Object.entries(ventasPorDia).map(([dia, monto]) => ({
        id: `dia-${mesSeleccionado}-${añoSeleccionado}-${dia}`,
        dia: parseInt(dia),
        monto,
      }))
    );

    // SECCIÓN 3: Top 5 productos
    const productosMap: any = {};
    ventasMes.forEach((v: any) => {
      v.productos?.forEach((p: any) => {
        if (!productosMap[p.nombre]) {
          productosMap[p.nombre] = { cantidad: 0, monto: 0 };
        }
        productosMap[p.nombre].cantidad += p.cantidad || 0;
        productosMap[p.nombre].monto += (p.cantidad || 0) * (p.precio || 0);
      });
    });

    setProductosTop(
      Object.entries(productosMap)
        .map(([nombre, data]: any) => ({ nombre, cantidad: data.cantidad, monto: data.monto }))
        .sort((a, b) => b.monto - a.monto)
        .slice(0, 5)
    );

    // SECCIÓN 4: Top 5 días
    const diasMap: any = {};
    ventasMes.forEach((v: any) => {
      const fecha = new Date(v.fecha).toISOString().split("T")[0];
      if (!diasMap[fecha]) diasMap[fecha] = { monto: 0, tickets: 0 };
      diasMap[fecha].monto += v.total || 0;
      diasMap[fecha].tickets += 1;
    });

    setDiasTop(
      Object.entries(diasMap)
        .map(([fecha, data]: any) => ({ fecha, monto: data.monto, tickets: data.tickets }))
        .sort((a, b) => b.monto - a.monto)
        .slice(0, 5)
    );

    // SECCIÓN 5: Formas de pago
    const formasMap: any = {};
    ventasMes.forEach((v: any) => {
      const forma = v.forma_pago || "Efectivo";
      if (!formasMap[forma]) formasMap[forma] = { monto: 0, cantidad: 0 };
      formasMap[forma].monto += v.total || 0;
      formasMap[forma].cantidad += 1;
    });

    setFormasPago(
      Object.entries(formasMap).map(([nombre, data]: any, index) => ({
        id: `forma-${mesSeleccionado}-${añoSeleccionado}-${nombre}-${index}`,
        nombre,
        monto: data.monto,
        cantidad: data.cantidad,
      }))
    );

    // SECCIÓN 6: Resumen por sucursal
    if (todasLasSucursales) {
      const sucursalesMap: any = {};
      SUCURSALES.forEach((s) => {
        sucursalesMap[s.id] = { nombre: s.nombre, ventas: 0, tickets: 0, servicios: 0 };
      });

      ventasMes.forEach((v: any) => {
        if (sucursalesMap[v.sucursalId]) {
          sucursalesMap[v.sucursalId].ventas += v.total || 0;
          sucursalesMap[v.sucursalId].tickets += 1;
        }
      });

      serviciosMes.forEach((s: any) => {
        if (sucursalesMap[s.sucursalId]) {
          sucursalesMap[s.sucursalId].servicios += s.monto || 0;
        }
      });

      setResumenSucursales(Object.values(sucursalesMap));
    }

    // SECCIÓN 7: Alertas
    const alertasArray: any = [];

    // Productos en stock 0
    productos.forEach((p: any) => {
      const stock = p.stockBySucursal || {};
      const stockTotal = Object.values(stock).reduce((sum: number, val: any) => sum + (val || 0), 0);
      if (stockTotal === 0) {
        alertasArray.push({
          tipo: "stock",
          mensaje: `${p.nombre} sin stock`,
          detalle: "Producto agotado en todas las sucursales",
        });
      }
    });

    // Médicos sin actividad
    medicos.forEach((m: any) => {
      const tieneActividad = serviciosMes.some((s: any) => s.medicoId === m.id);
      if (!tieneActividad) {
        alertasArray.push({
          tipo: "medico",
          mensaje: `Dr. ${m.nombre} sin actividad`,
          detalle: "No registró servicios médicos este mes",
        });
      }
    });

    setAlertas(alertasArray.slice(0, 10));
  };

  const descargarPDF = async () => {
    if (!reporteRef.current) return;

    try {
      const canvas = await html2canvas(reporteRef.current);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`reporte-mensual-${meses[mesSeleccionado]}-${añoSeleccionado}.pdf`);
      toast.success("PDF descargado");
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast.error("Error al generar PDF");
    }
  };

  const descargarExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const wsData: any = [
      ["Reporte Mensual", `${meses[mesSeleccionado]} ${añoSeleccionado}`],
      [],
      ["Total Ventas", resumenMes?.totalVentas || 0],
      ["Cantidad Tickets", resumenMes?.cantidadTickets || 0],
      ["Total Servicios", resumenMes?.totalServicios || 0],
      ["Total Compras", resumenMes?.totalCompras || 0],
      ["Total Gastos", resumenMes?.totalGastos || 0],
      ["Utilidad Bruta", resumenMes?.utilidadBruta || 0],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Resumen");

    XLSX.writeFile(wb, `reporte-mensual-${meses[mesSeleccionado]}-${añoSeleccionado}.xlsx`);
    toast.success("Excel descargado");
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={reporteRef}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
           <button
  onClick={onVolver}
  className="text-indigo-600 hover:text-indigo-800 text-sm mb-4 block"
>
  ← Volver a reportes
</button>
            <h2 className="text-2xl font-bold text-gray-900">Reporte Mensual</h2>
            <p className="text-sm text-gray-600 mt-1">
              {todasLasSucursales ? "Todas las Sucursales" : SUCURSALES.find(s => s.id === sucursalId)?.nombre}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={descargarPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={descargarExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>

        {/* Selectores */}
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {meses.map((mes, idx) => (
                <option key={idx} value={idx}>{mes}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
            <select
              value={añoSeleccionado}
              onChange={(e) => setAñoSeleccionado(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {años.map((año) => (
                <option key={año} value={año}>{año}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: Resumen ejecutivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-900">Total Ventas</p>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">${(resumenMes?.totalVentas || 0).toLocaleString()}</p>
          <p className="text-xs text-blue-700 mt-1">{resumenMes?.cantidadTickets || 0} tickets</p>
          {comparativo && (
            <div className="flex items-center gap-1 mt-2">
              {comparativo.ventasCambio >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-xs ${comparativo.ventasCambio >= 0 ? "text-green-600" : "text-red-600"}`}>
                {Math.abs(comparativo.ventasCambio).toFixed(1)}% vs mes anterior
              </span>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-green-900">Servicios Médicos</p>
            <FileText className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">${(resumenMes?.totalServicios || 0).toLocaleString()}</p>
          <p className="text-xs text-green-700 mt-1">{resumenMes?.cantidadServicios || 0} servicios</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-orange-900">Total Compras</p>
            <ShoppingCart className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-900">${(resumenMes?.totalCompras || 0).toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-purple-900">Utilidad Bruta</p>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className={`text-2xl font-bold ${(resumenMes?.utilidadBruta || 0) >= 0 ? "text-purple-900" : "text-red-900"}`}>
            ${(resumenMes?.utilidadBruta || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* SECCIÓN 2: Gráfica ventas diarias */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Ventas Diarias del Mes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ventasDiarias}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
            <Bar dataKey="monto" fill="#3b82f6" name="Ventas" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SECCIÓN 3: Top 5 productos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Top 5 Productos Más Vendidos</h3>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Producto</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Cantidad</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {productosTop.map((p, idx) => (
              <tr key={idx}>
                <td className="px-4 py-3 text-sm">{p.nombre}</td>
                <td className="px-4 py-3 text-sm text-right">{p.cantidad}</td>
                <td className="px-4 py-3 text-sm text-right font-semibold">${p.monto.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SECCIÓN 5: Formas de pago */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Desglose por Forma de Pago</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={formasPago}
                dataKey="monto"
                nameKey="nombre"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.nombre}: $${entry.monto.toLocaleString()}`}
              >
                {formasPago.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORES_CHART[index % COLORES_CHART.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-3">
            {formasPago.map((forma, idx) => (
              <div key={forma.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORES_CHART[idx % COLORES_CHART.length] }}></div>
                    <span className="font-medium">{forma.nombre}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${forma.monto.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">{forma.cantidad} transacciones</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECCIÓN 7: Alertas */}
      {alertas.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            Alertas del Mes
          </h3>
          <div className="space-y-2">
            {alertas.map((alerta, idx) => (
              <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="font-semibold text-amber-900">{alerta.mensaje}</p>
                <p className="text-sm text-amber-700">{alerta.detalle}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
