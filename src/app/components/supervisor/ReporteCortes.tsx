import { useState, useEffect, useRef, Fragment } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { SUCURSALES } from "../../shared";
import { toast } from "sonner";
import {
  Download,
  Calendar,
  Clock,
  DollarSign,
  User,
  TrendingUp,
  Monitor,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ReporteCortesProps {
  selectedSucursal: string;
  onBack: () => void;
}

interface CorteIndividual {
  cajaId: string;
  numeroCaja: number;
  farmaceuticoId: string;
  fechaApertura: string;
  fechaCierre: string;
  duracionMinutos: number;
  montoInicial: number;
  efectivoAEntregar: number;
  totalSuman: number;
  totalRestan: number;
  tipoCierre: string;
}

interface CorteConsolidado {
  id: string;
  sucursalId: string;
  fecha: string;
  fechaApertura: string;
  fechaCierre: string;
  duracion: string;
  numeroCortes: number;
  usuarios: string;
  cajas: number[];
  cortesIndividuales: CorteIndividual[];
  // Totales
  montoInicialTotal: number;
  efectivoAEntregarTotal: number;
  totalSumanTotal: number;
  totalRestanTotal: number;
}

export default function ReporteCortes({ selectedSucursal, onBack }: ReporteCortesProps) {
  const [cortes, setCortes] = useState<CorteConsolidado[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCortes();
  }, [selectedSucursal]);

  const loadCortes = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas/reporte-cortes?sucursalId=${selectedSucursal}`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setCortes(data.cortes || []);
      } else {
        toast.error("Error al cargar cortes");
      }
    } catch (error) {
      console.error("Error cargando cortes:", error);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const filtrarCortes = () => {
    if (filtroFecha === "todos") return cortes;

    const ahora = new Date();
    return cortes.filter((corte) => {
      const fechaCierre = new Date(corte.fechaCierre);
      const diff = ahora.getTime() - fechaCierre.getTime();
      const dias = diff / (1000 * 60 * 60 * 24);

      if (filtroFecha === "hoy") return dias < 1;
      if (filtroFecha === "semana") return dias < 7;
      if (filtroFecha === "mes") return dias < 30;
      return true;
    });
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleExportPDF = () => {
    const sucursal = SUCURSALES.find((s) => s.id === selectedSucursal);
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      toast.error("Permite las ventanas emergentes para imprimir");
      return;
    }

    const fechaActual = new Date().toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte de Cortes - ${sucursal?.nombre || "Todas las Sucursales"}</title>
          <style>
            @page { margin: 20mm; }
            body { 
              font-family: 'Arial', sans-serif; 
              font-size: 11px;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #4F46E5;
              padding-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              color: #4F46E5;
              font-size: 24px;
            }
            .header h2 {
              margin: 10px 0 5px 0;
              font-size: 18px;
              color: #666;
            }
            .header p {
              margin: 5px 0;
              color: #888;
            }
            .totales {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px;
              border-radius: 10px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-around;
            }
            .totales div {
              text-align: center;
            }
            .totales .label {
              font-size: 12px;
              opacity: 0.9;
              margin-bottom: 5px;
            }
            .totales .value {
              font-size: 24px;
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            thead {
              background: #4F46E5;
              color: white;
            }
            th {
              padding: 12px 8px;
              text-align: left;
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
            }
            td {
              padding: 10px 8px;
              border-bottom: 1px solid #e5e7eb;
            }
            tr:hover {
              background: #f9fafb;
            }
            .detalle-row {
              background: #f3f4f6;
            }
            .detalle-corte {
              padding: 8px;
              margin: 5px 0;
              background: white;
              border-left: 3px solid #10b981;
              border-radius: 4px;
            }
            .badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 9px;
              font-weight: bold;
            }
            .badge-success {
              background: #d1fae5;
              color: #065f46;
            }
            .badge-primary {
              background: #dbeafe;
              color: #1e40af;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              font-size: 10px;
              color: #888;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Call Center</h1>
            <h2>REPORTE DE CORTES DE CAJA</h2>
            <p><strong>Sucursal:</strong> ${sucursal?.nombre.toUpperCase() || "TODAS LAS SUCURSALES"}</p>
            <p><strong>Fecha de Generación:</strong> ${fechaActual}</p>
            <p><strong>Filtro:</strong> ${filtroFecha === "todos" ? "Todos los registros" : filtroFecha === "hoy" ? "Hoy" : filtroFecha === "semana" ? "Última semana" : "Último mes"}</p>
          </div>

          <div class="totales">
            <div>
              <div class="label">Total Registros</div>
              <div class="value">${cortesFiltrados.length}</div>
            </div>
            <div>
              <div class="label">Cortes Realizados</div>
              <div class="value">${cortesFiltrados.reduce((acc, c) => acc + c.numeroCortes, 0)}</div>
            </div>
            <div>
              <div class="label">Total Efectivo</div>
              <div class="value">$${totales.efectivoTotal.toFixed(2)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cajas</th>
                <th>Usuarios</th>
                <th>Apertura</th>
                <th>Cierre</th>
                <th>Duración</th>
                <th>Cortes</th>
                <th>Efectivo Inicial</th>
                <th>Total Efectivo</th>
              </tr>
            </thead>
            <tbody>
              ${cortesFiltrados.map((corte) => `
                <tr>
                  <td style="font-weight: bold;">${new Date(corte.fecha).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}</td>
                  <td>
                    ${corte.cajas.map((c) => `<span class="badge badge-primary">Caja ${c}</span>`).join(" ")}
                  </td>
                  <td style="font-size: 9px;">${corte.usuarios}</td>
                  <td style="font-size: 9px;">${new Date(corte.fechaApertura).toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</td>
                  <td style="font-size: 9px;">${new Date(corte.fechaCierre).toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</td>
                  <td>${corte.duracion}</td>
                  <td style="text-align: center; font-weight: bold;">${corte.numeroCortes}</td>
                  <td style="font-weight: bold;">$${corte.montoInicialTotal.toFixed(2)}</td>
                  <td style="font-weight: bold; color: #059669;">$${corte.efectivoAEntregarTotal.toFixed(2)}</td>
                </tr>
                <tr class="detalle-row">
                  <td colspan="9" style="padding: 10px 20px;">
                    <strong style="display: block; margin-bottom: 8px;">Desglose de Cortes Parciales:</strong>
                    ${corte.cortesIndividuales.map((ci) => {
                      const duracionH = Math.floor(ci.duracionMinutos / 60);
                      const duracionM = Math.floor(ci.duracionMinutos % 60);
                      return `
                        <div class="detalle-corte">
                          <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                              <span class="badge badge-primary">Caja ${ci.numeroCaja}</span>
                              <span style="margin-left: 10px; font-weight: bold;">
                                ${new Date(ci.fechaApertura).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} - 
                                ${new Date(ci.fechaCierre).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <span style="margin-left: 10px; color: #6b7280;">(${duracionH}h ${duracionM}m)</span>
                            </div>
                            <div style="text-align: right;">
                              <span style="color: #10b981; margin-right: 10px;">+$${ci.totalSuman.toFixed(2)}</span>
                              <span style="color: #ef4444; margin-right: 10px;">-$${ci.totalRestan.toFixed(2)}</span>
                              <strong style="color: #059669;">= $${ci.efectivoAEntregar.toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>
                      `;
                    }).join("")}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="footer">
            <p>Call Center</p>
            <p>Generado el ${new Date().toLocaleString("es-MX")}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const cortesFiltrados = filtrarCortes();

  const calcularTotales = () => {
    return cortesFiltrados.reduce(
      (acc, corte) => ({
        efectivoTotal: acc.efectivoTotal + (corte.efectivoAEntregarTotal || 0),
        cortesRealizados: acc.cortesRealizados + corte.numeroCortes,
      }),
      { efectivoTotal: 0, cortesRealizados: 0 }
    );
  };

  const totales = calcularTotales();
  const sucursal = SUCURSALES.find((s) => s.id === selectedSucursal);

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b">
        <button
          onClick={onBack}
          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-4"
        >
          ← Volver a reportes
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-2xl text-gray-800 flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-green-600" />
              Reporte de Cortes de Caja (Consolidado)
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {selectedSucursal === "todas"
                ? "Todas las Sucursales"
                : sucursal?.nombre}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Los cortes del mismo día están consolidados en un solo registro
            </p>
          </div>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            onClick={handleExportPDF}
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-6 bg-gray-50 border-b">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
          <div className="flex gap-2">
            {[
              { id: "todos", label: "Todos" },
              { id: "hoy", label: "Hoy" },
              { id: "semana", label: "Última Semana" },
              { id: "mes", label: "Último Mes" },
            ].map((filtro) => (
              <button
                key={filtro.id}
                onClick={() => setFiltroFecha(filtro.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroFecha === filtro.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resumen de totales */}
      <div className="p-6 bg-gradient-to-r from-green-50 to-teal-50 border-b">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Días</p>
                <p className="text-2xl font-bold text-gray-800">
                  {cortesFiltrados.length}
                </p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-full">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cortes</p>
                <p className="text-2xl font-bold text-gray-800">
                  {totales.cortesRealizados}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Efectivo</p>
                <p className="text-2xl font-bold text-green-600">
                  ${totales.efectivoTotal.toFixed(2)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de cortes */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-gray-600 mt-4">Cargando cortes...</p>
          </div>
        ) : cortesFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              No hay cortes registrados
            </h4>
            <p className="text-gray-600">
              No se encontraron cortes con los filtros seleccionados
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fecha
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Cajas
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Usuarios
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Duración
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Cortes
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Suman/Restan
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Total
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cortesFiltrados.map((corte) => {
                const isExpanded = expandedRows.has(corte.id);
                
                return (
                  <Fragment key={corte.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleRow(corte.id)}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {new Date(corte.fecha).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(corte.fechaApertura).toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {new Date(corte.fechaCierre).toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1 flex-wrap">
                          {corte.cajas.map((caja) => (
                            <span
                              key={caja}
                              className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold"
                            >
                              Caja {caja}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {corte.usuarios}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                          {corte.duracion}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold">
                          {corte.numeroCortes}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="space-y-1">
                          <div className="text-green-600 font-semibold">
                            +${corte.totalSumanTotal.toFixed(2)}
                          </div>
                          <div className="text-red-600 font-semibold">
                            -${corte.totalRestanTotal.toFixed(2)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-lg">
                        ${corte.efectivoAEntregarTotal.toFixed(2)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                              <Monitor className="w-4 h-4 text-indigo-600" />
                              Desglose de Cortes Parciales ({corte.numeroCortes})
                            </h4>
                            <div className="space-y-2">
                              {corte.cortesIndividuales.map((ci, idx) => {
                                const duracionH = Math.floor(ci.duracionMinutos / 60);
                                const duracionM = Math.floor(ci.duracionMinutos % 60);
                                
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                                  >
                                    <div className="flex items-center gap-4">
                                      <span className="px-2 py-1 bg-indigo-600 text-white rounded text-xs font-bold">
                                        Caja {ci.numeroCaja}
                                      </span>
                                      <div className="text-sm">
                                        <div className="font-medium text-gray-900">
                                          {new Date(ci.fechaApertura).toLocaleTimeString("es-MX", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}{" "}
                                          -{" "}
                                          {new Date(ci.fechaCierre).toLocaleTimeString("es-MX", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {duracionH}h {duracionM}m
                                        </div>
                                      </div>
                                      <span
                                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                          ci.tipoCierre === "diario"
                                            ? "bg-purple-100 text-purple-700"
                                            : "bg-gray-200 text-gray-700"
                                        }`}
                                      >
                                        {ci.tipoCierre === "diario" ? "Diario" : "Parcial"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                      <span className="text-gray-600">
                                        Inicial: <strong>${ci.montoInicial.toFixed(2)}</strong>
                                      </span>
                                      <span className="text-green-600">
                                        +${ci.totalSuman.toFixed(2)}
                                      </span>
                                      <span className="text-red-600">
                                        -${ci.totalRestan.toFixed(2)}
                                      </span>
                                      <span className="font-bold text-green-600 text-base">
                                        = ${ci.efectivoAEntregar.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}