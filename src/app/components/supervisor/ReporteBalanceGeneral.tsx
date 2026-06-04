import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { inicioDiaCDMX, finDiaCDMX } from "/utils/timezone";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import { Download, DollarSign, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

interface ReporteBalanceGeneralProps {
  sucursalId?: string;
  todasLasSucursales?: boolean;
  onVolver: () => void;
}

export default function ReporteBalanceGeneral({ sucursalId, todasLasSucursales = false, onVolver }: ReporteBalanceGeneralProps) {
  const [cargando, setCargando] = useState(true);

  const [periodo, setPeriodo] = useState("mes");
  const [fechaInicio, setFechaInicio] = useState(() => {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() - 1);
    return fecha.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split("T")[0]);

  const [ingresos, setIngresos] = useState<any>(null);
  const [egresos, setEgresos] = useState<any>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [flujoEfectivo, setFlujoEfectivo] = useState<any>(null);
  const [comparativo, setComparativo] = useState<any>(null);
  const [grafica, setGrafica] = useState<any[]>([]);

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
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/api/reportes/balance-general?${params}`,
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
    const { ventas = [], servicios = [], compras = [], gastos = [] } = data || {};

    // INGRESOS
    const totalVentas = ventas.reduce((sum: number, v: any) => sum + (v.total || 0), 0);
    const totalServicios = servicios.reduce((sum: number, s: any) => sum + (s.monto || 0), 0);

    const ingresosPorSucursal: any = {};
    SUCURSALES.forEach(s => {
      ingresosPorSucursal[s.id] = { nombre: s.nombre, ventas: 0, servicios: 0, total: 0 };
    });

    ventas.forEach((v: any) => {
      if (ingresosPorSucursal[v.sucursalId]) {
        ingresosPorSucursal[v.sucursalId].ventas += v.total || 0;
      }
    });

    servicios.forEach((s: any) => {
      if (ingresosPorSucursal[s.sucursalId]) {
        ingresosPorSucursal[s.sucursalId].servicios += s.monto || 0;
      }
    });

    Object.values(ingresosPorSucursal).forEach((s: any) => {
      s.total = s.ventas + s.servicios;
    });

    setIngresos({
      totalVentas,
      totalServicios,
      total: totalVentas + totalServicios,
      porSucursal: Object.values(ingresosPorSucursal).filter((s: any) => s.total > 0),
    });

    // EGRESOS
    const totalCompras = compras.reduce((sum: number, c: any) => sum + (c.total || 0), 0);
    const totalGastos = gastos.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);

    const gastosPorCategoria: any = {};
    gastos.forEach((g: any) => {
      const cat = g.categoria || "Otros";
      if (!gastosPorCategoria[cat]) gastosPorCategoria[cat] = 0;
      gastosPorCategoria[cat] += g.monto || 0;
    });

    const egresosPorSucursal: any = {};
    SUCURSALES.forEach(s => {
      egresosPorSucursal[s.id] = { nombre: s.nombre, compras: 0, gastos: 0, total: 0 };
    });

    compras.forEach((c: any) => {
      if (egresosPorSucursal[c.sucursalId]) {
        egresosPorSucursal[c.sucursalId].compras += c.total || 0;
      }
    });

    gastos.forEach((g: any) => {
      if (egresosPorSucursal[g.sucursalId]) {
        egresosPorSucursal[g.sucursalId].gastos += g.monto || 0;
      }
    });

    Object.values(egresosPorSucursal).forEach((s: any) => {
      s.total = s.compras + s.gastos;
    });

    setEgresos({
      totalCompras,
      totalGastos,
      total: totalCompras + totalGastos,
      gastosPorCategoria,
      porSucursal: Object.values(egresosPorSucursal).filter((s: any) => s.total > 0),
    });

    // RESULTADO
    const ingresosTotal = totalVentas + totalServicios;
    const egresosTotal = totalCompras + totalGastos;
    const utilidadBruta = ingresosTotal - egresosTotal;
    const margenUtilidad = ingresosTotal > 0 ? (utilidadBruta / ingresosTotal) * 100 : 0;

    setResultado({
      utilidadBruta,
      margenUtilidad,
      positivo: utilidadBruta >= 0,
    });

    // FLUJO DE EFECTIVO
    const efectivoVentas = ventas.filter((v: any) => v.forma_pago === "Efectivo").reduce((sum: number, v: any) => sum + (v.total || 0), 0);
    const tarjetaVentas = ventas.filter((v: any) => v.forma_pago === "Tarjeta").reduce((sum: number, v: any) => sum + (v.total || 0), 0);
    const transferenciasVentas = ventas.filter((v: any) => v.forma_pago === "Transferencia").reduce((sum: number, v: any) => sum + (v.total || 0), 0);
    const efectivoServicios = servicios.reduce((sum: number, s: any) => sum + (s.monto || 0), 0);

    setFlujoEfectivo({
      efectivo: efectivoVentas + efectivoServicios,
      tarjeta: tarjetaVentas,
      transferencias: transferenciasVentas,
      total: efectivoVentas + efectivoServicios + tarjetaVentas + transferenciasVentas,
    });

    // GRÁFICA
    const graficaData = [
      { id: "ingresos", concepto: "Ingresos", monto: ingresosTotal },
      { id: "egresos", concepto: "Egresos", monto: egresosTotal },
    ];
    setGrafica(graficaData);
  };

  const aplicarPeriodo = (per: string) => {
    const hoy = new Date();
    let inicio = new Date();

    if (per === "semana") {
      inicio.setDate(hoy.getDate() - 7);
    } else if (per === "mes") {
      inicio.setMonth(hoy.getMonth() - 1);
    } else if (per === "trimestre") {
      inicio.setMonth(hoy.getMonth() - 3);
    } else if (per === "año") {
      inicio.setFullYear(hoy.getFullYear() - 1);
    }

    setFechaInicio(inicio.toISOString().split("T")[0]);
    setFechaFin(hoy.toISOString().split("T")[0]);
    setPeriodo(per);
  };

  const descargarExcel = () => {
    const wb = XLSX.utils.book_new();

    const wsData = [
      ["BALANCE GENERAL"],
      ["Período:", `${fechaInicio} al ${fechaFin}`],
      [],
      ["INGRESOS"],
      ["Ventas", ingresos?.totalVentas || 0],
      ["Servicios Médicos", ingresos?.totalServicios || 0],
      ["Total Ingresos", ingresos?.total || 0],
      [],
      ["EGRESOS"],
      ["Compras", egresos?.totalCompras || 0],
      ["Gastos Operativos", egresos?.totalGastos || 0],
      ["Total Egresos", egresos?.total || 0],
      [],
      ["RESULTADO"],
      ["Utilidad Bruta", resultado?.utilidadBruta || 0],
      ["Margen de Utilidad %", resultado?.margenUtilidad || 0],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Balance General");
    XLSX.writeFile(wb, "balance-general.xlsx");
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button onClick={onVolver} className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 block">← Volver a reportes</button>
            <h2 className="text-2xl font-bold text-gray-900">Balance General</h2>
            <p className="text-sm text-gray-600 mt-1">
              {todasLasSucursales ? "Todas las Sucursales" : SUCURSALES.find((s) => s.id === sucursalId)?.nombre}
            </p>
          </div>
          <button onClick={descargarExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" />
            Descargar Excel
          </button>
        </div>

        {/* Período */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={() => aplicarPeriodo("semana")} className={`px-3 py-1 rounded-lg text-sm ${periodo === "semana" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
              Semana
            </button>
            <button onClick={() => aplicarPeriodo("mes")} className={`px-3 py-1 rounded-lg text-sm ${periodo === "mes" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
              Mes
            </button>
            <button onClick={() => aplicarPeriodo("trimestre")} className={`px-3 py-1 rounded-lg text-sm ${periodo === "trimestre" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
              Trimestre
            </button>
            <button onClick={() => aplicarPeriodo("año")} className={`px-3 py-1 rounded-lg text-sm ${periodo === "año" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
              Año
            </button>
            <button onClick={() => setPeriodo("personalizado")} className={`px-3 py-1 rounded-lg text-sm ${periodo === "personalizado" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
              Personalizado
            </button>
          </div>

          {periodo === "personalizado" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          )}
        </div>
      </div>

      {/* Resultado Principal */}
      {resultado && (
        <div className={`rounded-lg shadow-lg p-8 border-2 ${resultado.positivo ? "bg-gradient-to-br from-green-50 to-green-100 border-green-300" : "bg-gradient-to-br from-red-50 to-red-100 border-red-300"}`}>
          <div className="text-center">
            <p className={`text-sm font-medium ${resultado.positivo ? "text-green-900" : "text-red-900"}`}>RESULTADO DEL PERÍODO</p>
            <p className={`text-5xl font-bold mt-2 ${resultado.positivo ? "text-green-900" : "text-red-900"}`}>
              ${Math.abs(resultado.utilidadBruta).toLocaleString()}
            </p>
            <p className={`text-lg mt-2 ${resultado.positivo ? "text-green-700" : "text-red-700"}`}>
              {resultado.positivo ? "Utilidad" : "Pérdida"} | Margen: {resultado.margenUtilidad.toFixed(2)}%
            </p>
            <div className="flex justify-center mt-4">
              {resultado.positivo ? <TrendingUp className="w-12 h-12 text-green-600" /> : <TrendingDown className="w-12 h-12 text-red-600" />}
            </div>
          </div>
        </div>
      )}

      {/* Ingresos y Egresos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ingresos */}
        {ingresos && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              INGRESOS
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-700">Ventas Farmacia</span>
                <span className="font-semibold text-gray-900">${ingresos.totalVentas.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-700">Servicios Médicos</span>
                <span className="font-semibold text-gray-900">${ingresos.totalServicios.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-3 bg-green-50 rounded-lg px-3 mt-2">
                <span className="font-bold text-green-900">TOTAL INGRESOS</span>
                <span className="font-bold text-green-900 text-lg">${ingresos.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Egresos */}
        {egresos && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-red-600" />
              EGRESOS
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-700">Compras de Producto</span>
                <span className="font-semibold text-gray-900">${egresos.totalCompras.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-700">Gastos Operativos</span>
                <span className="font-semibold text-gray-900">${egresos.totalGastos.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-3 bg-red-50 rounded-lg px-3 mt-2">
                <span className="font-bold text-red-900">TOTAL EGRESOS</span>
                <span className="font-bold text-red-900 text-lg">${egresos.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Flujo de Efectivo */}
      {flujoEfectivo && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Flujo de Caja por Método de Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-900 font-medium">Efectivo</p>
              <p className="text-2xl font-bold text-green-900">${flujoEfectivo.efectivo.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-900 font-medium">Tarjeta</p>
              <p className="text-2xl font-bold text-blue-900">${flujoEfectivo.tarjeta.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm text-purple-900 font-medium">Transferencias</p>
              <p className="text-2xl font-bold text-purple-900">${flujoEfectivo.transferencias.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-300">
              <p className="text-sm text-gray-900 font-medium">Total Entradas</p>
              <p className="text-2xl font-bold text-gray-900">${flujoEfectivo.total.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Gráfica */}
      {grafica.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Comparativo Ingresos vs Egresos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={grafica}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="concepto" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="monto" fill="#3b82f6" name="Monto" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
