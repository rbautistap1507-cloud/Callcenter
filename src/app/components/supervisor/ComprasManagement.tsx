import { useState } from "react";
import { toast } from "sonner";
import { Download, Plus, Upload, Eye, Edit, ArrowLeftRight, Trash2, MoreVertical, FileText } from "lucide-react";
import { SUCURSALES } from "../../shared";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { inicioDiaCDMX, finDiaCDMX, formatearFechaCDMX } from "../../../../utils/timezone";
import * as XLSX from "xlsx";
import PurchaseDetailsModal from "./PurchaseDetailsModal";
import ReturnPurchaseModal from "./ReturnPurchaseModal";
import DeletePurchaseModal from "./DeletePurchaseModal";

interface ComprasManagementProps {
  selectedSucursal: string;
  isAdmin: boolean;
  compras: any[];
  productos: any[];
  loadCompras: () => void;
  loadData: () => void;
  onNavigateToAddCompra: (compra?: any) => void;
  onNavigateToAddCompraMasiva?: () => void;
}

export default function ComprasManagement({
  selectedSucursal,
  isAdmin,
  compras,
  productos,
  loadCompras,
  loadData,
  onNavigateToAddCompra,
  onNavigateToAddCompraMasiva,
}: ComprasManagementProps) {
  const [filtroEstatusCompra, setFiltroEstatusCompra] = useState<string>("todos");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");
  const [selectedCompraDetalle, setSelectedCompraDetalle] = useState<any>(null);
  const [openDropdownCompra, setOpenDropdownCompra] = useState<string | null>(null);
  const [compraToReturn, setCompraToReturn] = useState<any>(null);
  const [compraToDelete, setCompraToDelete] = useState<any>(null);
  const [deletingCompra, setDeletingCompra] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sucursal = SUCURSALES.find((s) => s.id === selectedSucursal);

  // Filtrar compras
  const comprasFiltradas = compras
    .filter((c) => {
      const pasaSucursal = selectedSucursal === "todas" ? true : c.sucursalId === selectedSucursal;
      const pasaEstatus = filtroEstatusCompra === "todos" ? true : c.estatus === filtroEstatusCompra;
      let pasaFecha = true;
      if (filtroFechaInicio) pasaFecha = pasaFecha && new Date(c.fecha) >= new Date(inicioDiaCDMX(filtroFechaInicio));
      if (filtroFechaFin) pasaFecha = pasaFecha && new Date(c.fecha) <= new Date(finDiaCDMX(filtroFechaFin));
      return pasaSucursal && pasaEstatus && pasaFecha;
    })
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  // Calcular balance acumulado por proveedor
  const calcularBalance = (compra: any) => {
    const comprasProveedor = comprasFiltradas.filter(
      (c) => c.proveedor === compra.proveedor && c.estatus !== "devuelto" && c.estatus !== "eliminado"
    );
    return comprasProveedor.reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);
  };

  // Agrupar compras por referencia (factura+sucursal). Fallback para compras viejas: proveedor|fecha
  const claveGrupo = (c: any) =>
    (c.referencia && c.referencia.trim() !== "")
      ? `ref:${c.referencia}`
      : `leg:${c.proveedor || "sin"}|${(c.fecha || "").split("T")[0]}|${c.sucursalId || ""}`;

  const gruposCompras = (() => {
    const mapa = new Map<string, any>();
    for (const c of comprasFiltradas) {
      const k = claveGrupo(c);
      if (!mapa.has(k)) {
        mapa.set(k, {
          clave: k,
          referencia: c.referencia || "",
          proveedor: c.proveedor || "",
          sucursalId: c.sucursalId || "",
          fecha: c.fecha,
          fechaCreacion: c.fechaCreacion,
          estatus: c.estatus,
          creadoPor: c.creadoPor || c.usuarioNombre || c.usuario || "",
          items: [],
          total: 0,
        });
      }
      const g = mapa.get(k);
      g.items.push(c);
      g.total += parseFloat(c.total) || 0;
      // si algun item no esta devuelto/eliminado, el grupo se considera activo
      if (c.estatus !== "devuelto" && c.estatus !== "eliminado") g.estatus = c.estatus;
    }
    return Array.from(mapa.values());
  })();

  // Balance por proveedor a nivel de grupo
  const calcularBalanceGrupo = (grupo: any) => {
    return gruposCompras
      .filter(g => g.proveedor === grupo.proveedor && g.estatus !== "devuelto" && g.estatus !== "eliminado")
      .reduce((sum, g) => sum + g.total, 0);
  };

  const handleDevolverCompra = async (motivo: string) => {
    if (!compraToReturn) return;
    setLoading(true);
    try {
      const itemsADevolver = compraToReturn._grupo || [compraToReturn];
      let okCount = 0;
      for (const item of itemsADevolver) {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/compras/${item.id}/devolver`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ motivo }),
          }
        );
        const data = await response.json();
        if (data.success) okCount++;
      }
      if (okCount > 0) {
        toast.success(`Compra devuelta correctamente (${okCount} producto(s))`);
        setCompraToReturn(null);
        loadCompras();
        loadData();
      } else {
        toast.error("Error al devolver la compra");
      }
    } catch (error) {
      toast.error("Error al devolver la compra");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompra = async (motivo: string) => {
    if (!compraToDelete) return;
    setDeletingCompra(compraToDelete.id);
    try {
      const itemsAEliminar = compraToDelete._grupo || [compraToDelete];
      let okCount = 0;
      for (const item of itemsAEliminar) {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/compras/${item.id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ motivo }),
          }
        );
        const data = await response.json();
        if (data.success) okCount++;
      }
      if (okCount > 0) {
        toast.success(`Compra eliminada correctamente (${okCount} producto(s))`);
        setCompraToDelete(null);
        loadCompras();
        loadData();
      } else {
        toast.error("Error al eliminar la compra");
      }
    } catch (error) {
      toast.error("Error al eliminar la compra");
    } finally {
      setDeletingCompra(null);
    }
  };

  const handleDescargarPDF = (compra: any) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    const sucursalNombre = SUCURSALES.find((s) => s.id === compra.sucursalId)?.nombre || "N/A";
    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Compra ${compra.id}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 30px; color: #1f2937; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .card { background: #f9fafb; padding: 12px; border-radius: 8px; }
  .label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #1f2937; color: white; padding: 10px; text-align: left; font-size: 11px; }
  td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  .total { text-align: right; font-size: 16px; font-weight: bold; color: #4f46e5; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }
  .recibido { background: #dcfce7; color: #15803d; }
  .pendiente { background: #fef9c3; color: #a16207; }
  .devuelto { background: #ffedd5; color: #c2410c; }
  @media print { body { padding: 10px; } }
</style></head>
<body>
<div class="header">
  <div><h1>Call Center</h1><p style="color:#6b7280">Orden de Compra</p></div>
  <div style="text-align:right">
    <div style="background:#f3f4f6;padding:8px 16px;border-radius:8px;display:inline-block">
      <div class="label">Referencia</div>
      <div style="font-size:16px;font-weight:bold;font-family:monospace">${compra.referencia || (compra.id || "").replace("compra:", "")}</div>
    </div>
    <p style="margin-top:8px;color:#4b5563">Fecha: ${formatearFechaCDMX(compra.fecha)}</p>
  </div>
</div>
<div class="grid">
  <div class="card"><div class="label">Sucursal</div><div style="font-weight:bold;font-size:14px">${sucursalNombre}</div></div>
  <div class="card"><div class="label">Proveedor</div><div style="font-weight:bold;font-size:14px">${compra.proveedor || "N/A"}</div></div>
  ${compra.referencia ? `<div class="card"><div class="label">Referencia / Factura</div><div style="font-weight:bold">${compra.referencia}</div></div>` : ""}
  <div class="card"><div class="label">Estado</div><span class="badge ${compra.estatus || "pendiente"}">${compra.estatus === "recibido" ? "RECIBIDO" : compra.estatus === "devuelto" ? "DEVUELTO" : compra.estatus === "eliminado" ? "ELIMINADO" : "PENDIENTE"}</span></div>
</div>
<table>
  <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio Unit.</th><th>Total</th></tr></thead>
  <tbody>
    ${(compra._grupo || [compra]).map((item) => `
    <tr>
      <td><strong>${item.nombreProducto || ""}</strong><br><span style="color:#6b7280;font-size:10px">Código: ${item.productoId || "N/A"}</span></td>
      <td>${item.cantidad || 0}</td>
      <td>$${parseFloat(item.precioCompra || 0).toFixed(2)}</td>
      <td><strong>$${(parseFloat(item.precioCompra || 0) * parseFloat(item.cantidad || 0)).toFixed(2)}</strong></td>
    </tr>`).join("")}
  </tbody>
</table>
<div class="total">Total: $${(compra._grupo ? compra._grupo.reduce((s, it) => s + parseFloat(it.precioCompra || 0) * parseFloat(it.cantidad || 0), 0) : (parseFloat(compra.total) || parseFloat(compra.precioCompra || 0) * parseFloat(compra.cantidad || 0))).toFixed(2)}</div>
<div style="margin-top:40px;border-top:2px dashed #e5e7eb;padding-top:16px;font-size:10px;color:#9ca3af;text-align:center">
  Documento generado electrónicamente por Call Center — ${new Date().toLocaleString("es-MX")}
</div>
<script>window.onload=function(){window.print();setTimeout(()=>window.close(),500);}<\/script>
</body></html>`);
    printWindow.document.close();
  };

  const handleExportComprasExcel = () => {
    if (comprasFiltradas.length === 0) { toast.error("No hay compras para exportar"); return; }
    const dataToExport = comprasFiltradas.map((compra) => ({
      Fecha: new Date(compra.fecha).toLocaleDateString("es-MX"),
      Referencia: compra.referencia || "-",
      Producto: compra.nombreProducto,
      Sucursal: SUCURSALES.find((s) => s.id === compra.sucursalId)?.nombre || "N/A",
      Proveedor: compra.proveedor || "-",
      Estado: compra.estatus === "recibido" ? "Recibido" : compra.estatus === "devuelto" ? "Devuelto" : compra.estatus === "eliminado" ? "Eliminado" : "Pendiente",
      Cantidad: compra.cantidad,
      "Precio Compra": parseFloat(compra.precioCompra || 0).toFixed(2),
      Total: parseFloat(compra.total || 0).toFixed(2),
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compras");
    XLSX.writeFile(wb, `Compras_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Exportación exitosa");
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-xl">
            Historial de Compras — {selectedSucursal === "todas" ? "Todas las Sucursales" : sucursal?.nombre}
          </h3>
          {isAdmin && selectedSucursal !== "todas" && (
            <div className="flex gap-2">
              <button onClick={() => onNavigateToAddCompra()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Agregar Individual
              </button>
              {onNavigateToAddCompraMasiva && (
                <button onClick={() => onNavigateToAddCompraMasiva()} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm">
                  <Upload className="w-4 h-4" /> Agregar Masivo
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filtroEstatusCompra}
            onChange={(e) => setFiltroEstatusCompra(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="recibido">Recibido</option>
            <option value="devuelto">Devuelto</option>
            <option value="eliminado">Eliminado</option>
          </select>
          <input type="date" value={filtroFechaInicio} onChange={(e) => setFiltroFechaInicio(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Desde" />
          <input type="date" value={filtroFechaFin} onChange={(e) => setFiltroFechaFin(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Hasta" />
          <button onClick={handleExportComprasExcel} className="ml-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
        </div>
      </div>

      <div className="p-4 text-sm text-gray-500">
        Mostrando {comprasFiltradas.length} de {compras.length} compras
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Productos</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance Proveedor</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {gruposCompras.map((grupo) => (
              <tr key={grupo.clave} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {formatearFechaCDMX(grupo.fecha)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {grupo.referencia ? (
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{grupo.referencia}</span>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <span className="inline-flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-full w-7 h-7 text-xs font-semibold">
                    {grupo.items.length}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{grupo.proveedor || "—"}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    grupo.estatus === "recibido" ? "bg-green-100 text-green-800" :
                    grupo.estatus === "devuelto" ? "bg-orange-100 text-orange-800" :
                    grupo.estatus === "eliminado" ? "bg-red-100 text-red-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>
                    {grupo.estatus === "recibido" ? "Recibido" : grupo.estatus === "devuelto" ? "Devuelto" : grupo.estatus === "eliminado" ? "Eliminado" : "Pendiente"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">
                  ${grupo.total.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <span className="font-semibold text-indigo-600">${calcularBalanceGrupo(grupo).toFixed(2)}</span>
                  <div className="text-xs text-gray-400">{grupo.proveedor || "sin proveedor"}</div>
                </td>
                <td className="px-4 py-3 text-sm text-center relative">
                  <button
                    onClick={() => setOpenDropdownCompra(openDropdownCompra === grupo.clave ? null : grupo.clave)}
                    className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {openDropdownCompra === grupo.clave && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownCompra(null)} />
                      <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                        <button onClick={() => { setSelectedCompraDetalle({ ...grupo.items[0], _grupo: grupo.items, referencia: grupo.referencia, total: grupo.total, creadoPor: grupo.creadoPor }); setOpenDropdownCompra(null); }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm">
                          <Eye className="w-4 h-4 text-blue-600" /> Detalles
                        </button>
                        <button onClick={() => { handleDescargarPDF({ ...grupo.items[0], _grupo: grupo.items, referencia: grupo.referencia, total: grupo.total, creadoPor: grupo.creadoPor }); setOpenDropdownCompra(null); }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-purple-600" /> Descargar PDF
                        </button>
                        {isAdmin && grupo.estatus !== "devuelto" && grupo.estatus !== "eliminado" && (
                          <>
                            <button onClick={() => { onNavigateToAddCompra({ ...grupo.items[0], _grupo: grupo.items }); setOpenDropdownCompra(null); }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm text-blue-600">
                              <Edit className="w-4 h-4" /> Editar Compra
                            </button>
                            <button onClick={() => { setCompraToReturn({ ...grupo.items[0], _grupo: grupo.items }); setOpenDropdownCompra(null); }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm text-orange-600">
                              <ArrowLeftRight className="w-4 h-4" /> Retornar Compra
                            </button>
                            <button onClick={() => { setCompraToDelete({ ...grupo.items[0], _grupo: grupo.items }); setOpenDropdownCompra(null); }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm text-red-600">
                              <Trash2 className="w-4 h-4" /> Eliminar Compra
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {comprasFiltradas.length === 0 && (
          <div className="text-center py-12 text-gray-500">No hay compras registradas</div>
        )}
      </div>

      {/* Totales */}
      {comprasFiltradas.length > 0 && (
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-8 text-sm">
          <span className="text-gray-600">
            Compras activas: <strong>{comprasFiltradas.filter(c => c.estatus === "recibido").length}</strong>
          </span>
          <span className="text-gray-600">
            Total general: <strong className="text-green-600">
              ${comprasFiltradas.filter(c => c.estatus !== "devuelto" && c.estatus !== "eliminado")
                .reduce((sum, c) => sum + parseFloat(c.total || 0), 0).toFixed(2)}
            </strong>
          </span>
        </div>
      )}

      {selectedCompraDetalle && <PurchaseDetailsModal compra={selectedCompraDetalle} onClose={() => setSelectedCompraDetalle(null)} />}
      {compraToReturn && <ReturnPurchaseModal compra={compraToReturn} onClose={() => setCompraToReturn(null)} onConfirm={handleDevolverCompra} />}
      {compraToDelete && <DeletePurchaseModal compra={compraToDelete} onClose={() => setCompraToDelete(null)} onConfirm={handleDeleteCompra} isDeleting={deletingCompra === compraToDelete.id} />}
    </div>
  );
}