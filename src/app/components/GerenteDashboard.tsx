import { useState, useEffect, useMemo } from "react";
import { SUCURSALES, User } from "../shared";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import ModuleGuard from "./ModuleGuard";
import { inicioDiaCDMX, finDiaCDMX, formatearFechaHoraCDMX } from "/utils/timezone";
import {
  LayoutDashboard, Building, TrendingUp, Package, ShoppingCart,
  LogOut, FileText, DollarSign, BarChart3, UserCheck, Download,
  ArrowUpRight, ArrowDownRight, Pill, AlertTriangle, ChevronRight,
  Activity, Users, ClipboardList, Truck, Receipt, Scale, CreditCard,
  RefreshCw, Search,
} from "lucide-react";
import SupervisorDashboard from "./SupervisorDashboard";

interface GerenteDashboardProps {
  user: User;
  onLogout: () => void;
}

type ActiveView = "dashboard" | "bitacora" | "reportes" | "supervisor";
type ReporteActivo = null | "ventas" | "personal" | "inventario" | "compras" | "gastos" | "balance" | "cortes" | "comparativo" | "antibioticos";
type SucursalFilter = "todas" | string;

interface SucursalMetrics {
  sucursal: string;
  ventasCount: number;
  ventasTotal: number;
  productosStock: number;
  productosActivos: number;
}

const COLORS = ["#8B5CF6","#EC4899","#10B981","#F59E0B","#3B82F6","#EF4444"];
const SUCURSAL_COLORES: Record<string,string> = {
  carrera:"#8B5CF6", muzquiz:"#EC4899", porvenir:"#10B981",
  zaragoza:"#F59E0B", lavilla:"#3B82F6", sanfelipe:"#EF4444",
};
const SUCURSAL_MAP: Record<string,string> = {
  carrera:"Carrera", muzquiz:"Muzquiz", porvenir:"Porvenir",
  zaragoza:"Zaragoza", lavilla:"La Villa", sanfelipe:"San Felipe",
};

const fmt = (n: number) => `$${n.toLocaleString("es-MX",{minimumFractionDigits:0,maximumFractionDigits:0})}`;
const fmtDec = (n: number) => `$${n.toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function GerenteDashboard({ user, onLogout }: GerenteDashboardProps) {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [selectedSucursal, setSelectedSucursal] = useState<SucursalFilter>("todas");
  const [sucursalMetrics, setSucursalMetrics] = useState<SucursalMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState<any[]>([]);

  // Reportes state
  const [reporteActivo, setReporteActivo] = useState<ReporteActivo>(null);
  const [reporteLoading, setReporteLoading] = useState(false);
  const [ventas, setVentas] = useState<any[]>([]);
  const [compras, setCompras] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [personal, setPersonal] = useState<any[]>([]);
  const [antibioticos, setAntibioticos] = useState<any[]>([]);
  const [cajas, setCajas] = useState<any[]>([]);
  const [filtroSucursal, setFiltroSucursal] = useState("todas");
  const [fechaInicio, setFechaInicio] = useState(() => { const f=new Date(); f.setMonth(f.getMonth()-1); return f.toISOString().split("T")[0]; });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split("T")[0]);

  // Bitácora state
  const [busquedaBitacora, setBusquedaBitacora] = useState("");
  const [filtroBitacoraSucursal, setFiltroBitacoraSucursal] = useState("todas");
  const [filtroBitacoraTipo, setFiltroBitacoraTipo] = useState("todos");
  const [bitacoraItems, setBitacoraItems] = useState<any[]>([]);
  const [bitacoraLoading, setBitacoraLoading] = useState(false);

  useEffect(() => {
    if (activeView === "dashboard") loadAllData();
    if (activeView === "bitacora") cargarBitacora();
    if (activeView === "reportes") cargarDatosReportes();
  }, [selectedSucursal, activeView]);

  // ── DASHBOARD ────────────────────────────────────────────────────────────────
  const loadAllData = async () => {
    setLoading(true);
    try { await Promise.all([loadMetrics(), loadMovimientos()]); }
    catch (e) { toast.error("Error al cargar datos"); }
    finally { setLoading(false); }
  };

  const loadMetrics = async () => {
    const list = selectedSucursal === "todas" ? SUCURSALES : SUCURSALES.filter(s => s.nombre === selectedSucursal);
    const results = await Promise.all(list.map(s => loadSucursalData(s.nombre)));
    setSucursalMetrics(results);
  };

  const loadSucursalData = async (sucursal: string): Promise<SucursalMetrics> => {
    try {
      const h = { Authorization: `Bearer ${publicAnonKey}` };
      const [ir, vr] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/inventory?sucursal=${sucursal}`, {headers:h}),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ventas?sucursal=${sucursal}`, {headers:h}),
      ]);
      const id = ir.ok ? await ir.json() : []; const vd = vr.ok ? await vr.json() : [];
      const inv = Array.isArray(id) ? id : [];
      const ven = vd.success ? (vd.ventas||[]) : (Array.isArray(vd)?vd:[]);
      const act = ven.filter((v:any) => v.estado !== "cancelada");
      return { sucursal, ventasCount:act.length, ventasTotal:act.reduce((s:number,v:any)=>s+(v.total||0),0), productosStock:inv.reduce((s:number,p:any)=>s+(p.cantidad||0),0), productosActivos:inv.filter((p:any)=>p.cantidad>0).length };
    } catch { return { sucursal, ventasCount:0, ventasTotal:0, productosStock:0, productosActivos:0 }; }
  };

  const loadMovimientos = async () => {
    try {
      const h = { Authorization: `Bearer ${publicAnonKey}` };
      const [vr, cr] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ventas`,{headers:h}),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/compras`,{headers:h}),
      ]);
      const vd = vr.ok?await vr.json():[]; const cd = cr.ok?await cr.json():[];
      const va = vd.success?(vd.ventas||[]):(Array.isArray(vd)?vd:[]);
      const ca = cd.compras||(Array.isArray(cd)?cd:[]);
      const movs = [
        ...va.map((v:any)=>({id:v.id||Math.random().toString(),tipo:"Venta",sucursal:SUCURSAL_MAP[v.sucursalId]||v.sucursalId||"N/A",fecha:v.fecha||"",monto:v.total||0,productos:v.productos?.length||0,usuario:v.usuario||"Sistema"})),
        ...ca.map((c:any)=>({id:c.id||Math.random().toString(),tipo:"Compra",sucursal:SUCURSAL_MAP[c.sucursalId]||c.sucursalId||"N/A",fecha:c.fecha||"",monto:c.total||0,productos:c.items?.length||0,usuario:c.creadoPorNombre||"Sistema"})),
      ];
      movs.sort((a,b)=>new Date(b.fecha).getTime()-new Date(a.fecha).getTime());
      setMovimientos(movs);
    } catch(e){console.error(e);}
  };

  // ── BITÁCORA ─────────────────────────────────────────────────────────────────
  const cargarBitacora = async () => {
    setBitacoraLoading(true);
    try {
      const h = { Authorization: `Bearer ${publicAnonKey}` };
      const base = `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19`;
      const [vr,cr,gr,tr,cor,cajr] = await Promise.all([
        fetch(`${base}/ventas`,{headers:h}), fetch(`${base}/compras`,{headers:h}),
        fetch(`${base}/gastos`,{headers:h}), fetch(`${base}/traslados`,{headers:h}),
        fetch(`${base}/consultas`,{headers:h}), fetch(`${base}/cajas`,{headers:h}),
      ]);
      const [vd,cd,gd,td,cod,cajd] = await Promise.all([vr.json(),cr.json(),gr.json(),tr.json(),cor.json(),cajr.json()]);
      const va = vd.success?(vd.ventas||[]):(Array.isArray(vd)?vd:[]);
      const ca = cd.compras||(Array.isArray(cd)?cd:[]);
      const ga = gd.gastos||(Array.isArray(gd)?gd:[]);
      const ta = td.traslados||(Array.isArray(td)?td:[]);
      const coa = cod.consultas||(Array.isArray(cod)?cod:[]);
      const caja = (cajd.cajas||(Array.isArray(cajd)?cajd:[])).filter((c:any)=>c.estado==="cerrada");

      const items: any[] = [
        ...va.map((v:any)=>({ id:v.id||v.fecha, tipo:"Venta", accion:"Venta registrada", usuario:v.usuario||v.farmaceuticoId?.replace("user:","") ||"Sistema", sucursalId:v.sucursalId, fecha:v.fecha, monto:v.total||0, detalle:`${(v.productos||[]).length} producto(s) · ${v.metodoPago||"efectivo"}${v.codigoReceta?` · Receta: ${v.codigoReceta}`:""}` })),
        ...ca.map((c:any)=>({ id:c.id||c.fechaCreacion, tipo:"Compra", accion:"Compra registrada", usuario:c.creadoPorNombre||"Sistema", sucursalId:c.sucursalId, fecha:c.fechaCreacion||c.fecha, monto:c.total||0, detalle:`${c.nombreProducto||"-"} · Proveedor: ${c.proveedor||"-"}` })),
        ...ga.map((g:any)=>({ id:g.id||g.fecha, tipo:"Gasto", accion:"Gasto registrado", usuario:g.creadoPorNombre||"Sistema", sucursalId:g.sucursalId, fecha:g.fecha||g.creadoEn, monto:parseFloat(g.monto)||0, detalle:`${g.categoria||"Sin categoría"} · ${g.nota||g.descripcion||"-"}` })),
        ...ta.map((t:any)=>({ id:t.id||t.fecha, tipo:"Traslado", accion:`Traslado ${t.estado||"registrado"}`, usuario:t.creadoPorNombre||t.editadoPorNombre||"Sistema", sucursalId:t.sucursalOrigenId, fecha:t.fecha, monto:t.total||0, detalle:`${SUCURSAL_MAP[t.sucursalOrigenId]||t.sucursalOrigenId} → ${SUCURSAL_MAP[t.sucursalDestinoId]||t.sucursalDestinoId} · ${(t.productos||[]).length} prod.` })),
        ...coa.map((c:any)=>({ id:c.id||c.fecha, tipo:"Consulta", accion:`Consulta ${c.estado||"registrada"}`, usuario:c.medicoId?.replace("user:","") ||"Médico", sucursalId:c.sucursalId, fecha:c.fecha, monto:c.monto||0, detalle:`${c.servicio||"Servicio médico"} · Paciente: ${c.nombrePaciente||"-"}` })),
        ...caja.map((c:any)=>({ id:c.id||c.fechaCierre, tipo:"Corte de Caja", accion:"Corte de caja realizado", usuario:c.farmaceuticoId?.replace("user:","") ||"Farmacéutico", sucursalId:c.sucursalId, fecha:c.fechaCierre, monto:c.efectivoAEntregar||0, detalle:`Caja #${c.numeroCaja||1} · Suman: ${fmtDec(c.totalSuman||0)} · Restan: ${fmtDec(c.totalRestan||0)}` })),
      ];
      items.sort((a,b)=>new Date(b.fecha).getTime()-new Date(a.fecha).getTime());
      setBitacoraItems(items);
    } catch(e){ toast.error("Error cargando bitácora"); }
    finally { setBitacoraLoading(false); }
  };

  // ── REPORTES ──────────────────────────────────────────────────────────────────
  const cargarDatosReportes = async () => {
    setReporteLoading(true);
    try {
      const h = { Authorization: `Bearer ${publicAnonKey}` };
      const base = `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19`;
      const [vr,cr,gr,pr,cor,abr,cajr] = await Promise.all([
        fetch(`${base}/ventas`,{headers:h}), fetch(`${base}/compras`,{headers:h}),
        fetch(`${base}/gastos`,{headers:h}), fetch(`${base}/productos`,{headers:h}),
        fetch(`${base}/consultas`,{headers:h}), fetch(`${base}/antibioticos`,{headers:h}),
        fetch(`${base}/cajas`,{headers:h}),
      ]);
      const [vd,cd,gd,pd,cod,abd,cajd] = await Promise.all([vr.json(),cr.json(),gr.json(),pr.json(),cor.json(),abr.json(),cajr.json()]);
      setVentas(vd.ventas||(Array.isArray(vd)?vd:[]));
      setCompras(cd.compras||(Array.isArray(cd)?cd:[]));
      setGastos(gd.gastos||(Array.isArray(gd)?gd:[]));
      setProductos(pd.productos||(Array.isArray(pd)?pd:[]));
      setConsultas(cod.consultas||(Array.isArray(cod)?cod:[]));
      setAntibioticos(abd.antibioticos||(Array.isArray(abd)?abd:[]));
      setCajas(cajd.cajas||(Array.isArray(cajd)?cajd:[]));
    } catch(e){ toast.error("Error cargando reportes"); }
    finally { setReporteLoading(false); }
  };

  const cargarPersonal = async () => {
    try {
      const params = new URLSearchParams({fechaInicio, fechaFin:fechaFin+"T23:59:59", todas:"true"});
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/api/reportes/personal?${params}`,{headers:{Authorization:`Bearer ${publicAnonKey}`}});
      const d = await res.json(); if (d.success) setPersonal(d.personal||[]);
    } catch(e){ console.error(e); }
  };

  const abrirReporte = async (r: ReporteActivo) => {
    setReporteActivo(r);
    if (r === "personal") { setReporteLoading(true); await cargarPersonal(); setReporteLoading(false); }
  };

  const filtrar = (arr: any[], campo="fecha") =>
    arr.filter(item => {
      const f = new Date(item[campo]||item.fechaCreacion||item.createdAt||"");
      const ok = f >= new Date(inicioDiaCDMX(fechaInicio)) && f <= new Date(finDiaCDMX(fechaFin));
      const s = filtroSucursal==="todas" || item.sucursalId===filtroSucursal;
      return ok && s;
    });

  // ── DASHBOARD MÉTRICAS ────────────────────────────────────────────────────────
  const totals = {
    totalProductos: sucursalMetrics.reduce((s,m)=>s+m.productosActivos,0),
    totalStock: sucursalMetrics.reduce((s,m)=>s+m.productosStock,0),
    totalVentas: sucursalMetrics.reduce((s,m)=>s+m.ventasCount,0),
    totalIngresos: sucursalMetrics.reduce((s,m)=>s+m.ventasTotal,0),
    sucursalesActivas: selectedSucursal==="todas"?SUCURSALES.length:1,
  };
  const ingresosData = sucursalMetrics.map(m=>({sucursal:m.sucursal,ingresos:m.ventasTotal}));
  const distribucionData = (() => { const t=sucursalMetrics.reduce((s,m)=>s+m.ventasCount,0); return sucursalMetrics.map(m=>({name:m.sucursal,value:t>0?Math.round((m.ventasCount/t)*100):0})); })();
  const inventarioData = (() => { const t=sucursalMetrics.reduce((s,m)=>s+m.productosStock,0); return sucursalMetrics.map(m=>({sucursal:m.sucursal,stock:m.productosStock,porcentaje:t>0?((m.productosStock/t)*100).toFixed(1):"0.0"})); })();
  const ventasUltimos7Dias = useMemo(() => Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(6-i)); const k=d.toISOString().split("T")[0];
    const del = movimientos.filter(m => m.tipo==="Venta" && (selectedSucursal==="todas"||m.sucursal===selectedSucursal) && new Date(m.fecha).toISOString().split("T")[0]===k);
    return {fecha:k, cantidad:del.length, ingresos:del.reduce((s,v)=>s+(v.monto||0),0)};
  }), [movimientos, selectedSucursal]);
  const promedioIngresos = totals.totalVentas>0?(totals.totalIngresos/totals.totalVentas).toFixed(2):"0.00";

  // ── RENDER FILTROS ────────────────────────────────────────────────────────────
  const renderFiltros = () => (
    <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 text-gray-800">
      <div><label className="block text-xs font-semibold text-gray-600 mb-1">Sucursal</label>
        <select value={filtroSucursal} onChange={e=>setFiltroSucursal(e.target.value)} className="px-3 py-2 rounded-lg text-sm bg-white text-gray-800 border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none [color-scheme:light]" style={{colorScheme:"light"}}>
          <option value="todas" className="text-gray-800">Todas</option>
          {SUCURSALES.map(s=><option key={s.id} value={s.id} className="text-gray-800">{s.nombre}</option>)}
        </select>
      </div>
      <div><label className="block text-xs font-semibold text-gray-600 mb-1">Desde</label>
        <input type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)} className="px-3 py-2 rounded-lg text-sm bg-white text-gray-800 border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"style={{colorScheme:"light"}} />
      </div>
      <div><label className="block text-xs font-semibold text-gray-600 mb-1">Hasta</label>
        <input type="date" value={fechaFin} onChange={e=>setFechaFin(e.target.value)} className="px-3 py-2 rounded-lg text-sm bg-white text-gray-800 border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"style={{colorScheme:"light"}} />
      </div>
      <div className="flex items-end">
        <button onClick={cargarDatosReportes} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold">
          <RefreshCw className="w-4 h-4"/>Actualizar
        </button>
      </div>
    </div>
  );

  // ── REPORTES RENDER ───────────────────────────────────────────────────────────
  const card = (children: React.ReactNode, extra="") => (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 ${extra}`}>{children}</div>
  );

  const statCard = (label:string, value:string, sub:string, colorClass:string) => (
    <div className={`rounded-xl p-5 border ${colorClass}`}>
      <p className="text-sm font-semibold text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-xs text-gray-500 mt-2">{sub}</p>
    </div>
  );

  const barChart = (items: {label:string,value:number,total:number}[], color="bg-purple-500") => (
    <div className="space-y-3">
      {items.sort((a,b)=>b.value-a.value).map((item,i)=>(
        <div key={i}><div className="flex justify-between text-sm mb-1"><span className="text-gray-700">{item.label}</span><span className="text-gray-900 font-bold">{fmtDec(item.value)}</span></div>
        <div className="h-2 bg-gray-100 rounded-full"><div className={`h-2 rounded-full ${color}`} style={{width:`${item.total>0?(item.value/item.total)*100:0}%`}}/></div></div>
      ))}
    </div>
  );

  const tableWrapper = (headers:string[], rows:React.ReactNode) => (
    <div className="overflow-x-auto max-h-72">
      <table className="w-full text-sm"><thead className="bg-gray-50"><tr className="border-b border-gray-200">{headers.map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-gray-100">{rows}</tbody></table>
    </div>
  );

  const dlBtn = (onClick:()=>void) => (
    <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-semibold"><Download className="w-4 h-4"/>Excel</button>
  );

  const renderReporteVentas = () => {
    const data = filtrar(ventas); const tv = data.reduce((s,v)=>s+(v.total||0),0);
    const pm: Record<string,number>={}, ps: Record<string,number>={};
    data.forEach(v=>{ pm[v.metodoPago||"efectivo"]=(pm[v.metodoPago||"efectivo"]||0)+(v.total||0); ps[v.sucursalId]=(ps[v.sucursalId]||0)+(v.total||0); });

    // ── DIFERENCIADOR 1: Comparación con período anterior ──
    // Calcular la duración del período actual y desplazarlo hacia atrás
    const msInicio = new Date(inicioDiaCDMX(fechaInicio)).getTime();
    const msFin = new Date(finDiaCDMX(fechaFin)).getTime();
    const duracion = msFin - msInicio;
    const msInicioPrev = msInicio - duracion;
    const msFinPrev = msInicio;
    const dataPrev = ventas.filter(v => {
      const f = new Date(v.fecha || "").getTime();
      const s = filtroSucursal === "todas" || v.sucursalId === filtroSucursal;
      return f >= msInicioPrev && f < msFinPrev && s;
    });
    const tvPrev = dataPrev.reduce((s,v)=>s+(v.total||0),0);
    const crecimiento = tvPrev > 0 ? ((tv - tvPrev) / tvPrev) * 100 : (tv > 0 ? 100 : 0);

    // ── DIFERENCIADOR 2: Ventas por día de la semana (en CDMX) ──
    const diasNombre = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
    const porDia: Record<number,number> = {0:0,1:0,2:0,3:0,4:0,5:0,6:0};
    data.forEach(v => {
      // Convertir a hora CDMX restando 6h, luego obtener día
      const local = new Date(new Date(v.fecha).getTime() - 6*60*60*1000);
      porDia[local.getUTCDay()] += v.total || 0;
    });
    const diasData = diasNombre.map((nombre, idx) => ({ label: nombre, value: porDia[idx], total: tv }));

    // ── DIFERENCIADOR 3: Top 5 productos más vendidos ──
    const prodMap: Record<string,{nombre:string,cantidad:number,monto:number}> = {};
    data.forEach(v => {
      (v.productos || []).forEach((p: any) => {
        const key = p.productoId || p.nombre;
        if (!prodMap[key]) prodMap[key] = { nombre: p.nombre || "Desconocido", cantidad: 0, monto: 0 };
        prodMap[key].cantidad += p.cantidad || 0;
        prodMap[key].monto += (p.cantidad || 0) * (p.precio || 0);
      });
    });
    const topProductos = Object.values(prodMap).sort((a,b)=>b.monto-a.monto).slice(0,5);

    const dl=()=>{ const ws=XLSX.utils.json_to_sheet(data.map(v=>({Fecha:formatearFechaHoraCDMX(v.fecha),Sucursal:SUCURSALES.find(s=>s.id===v.sucursalId)?.nombre||v.sucursalId,Farmacéutico:v.usuario||"-",Método:v.metodoPago||"efectivo",Total:v.total||0}))); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Ventas"); XLSX.writeFile(wb,"ventas-gerencia.xlsx"); toast.success("Descargado"); };
    return (<div className="space-y-6">
      {renderFiltros()}
      <div className="flex justify-between items-center"><div><h3 className="text-xl font-bold text-gray-800">Reporte de Ventas</h3><p className="text-gray-500 text-sm">{data.length} transacciones</p></div>{dlBtn(dl)}</div>
      <div className="grid grid-cols-4 gap-4">
        {statCard("Total Vendido",fmt(tv),`${data.length} ventas`,"bg-emerald-50 border-emerald-200")}
        {statCard("Ticket Promedio",data.length>0?fmtDec(tv/data.length):"$0","por transacción","bg-blue-50 border-blue-200")}
        {statCard("vs Período Anterior",`${crecimiento>=0?"+":""}${crecimiento.toFixed(1)}%`,`Antes: ${fmt(tvPrev)}`,crecimiento>=0?"bg-green-50 border-green-200":"bg-red-50 border-red-200")}
        {statCard("Sucursales",`${Object.keys(ps).length}`,`de ${SUCURSALES.length} activas`,"bg-violet-50 border-violet-200")}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {card(<><h4 className="font-bold text-gray-800 mb-4">Por Método de Pago</h4>{barChart(Object.entries(pm).map(([l,v])=>({label:l,value:v,total:tv})))}</>)}
        {card(<><h4 className="font-bold text-gray-800 mb-4">Por Sucursal</h4>{barChart(Object.entries(ps).map(([id,v])=>({label:SUCURSALES.find(s=>s.id===id)?.nombre||id,value:v,total:tv})),"bg-pink-400")}</>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {card(<><h4 className="font-bold text-gray-800 mb-4">Ventas por Día de la Semana</h4>{barChart(diasData,"bg-indigo-400")}</>)}
        {card(<><h4 className="font-bold text-gray-800 mb-4">Top 5 Productos Más Vendidos</h4>{topProductos.length>0?tableWrapper(["#","Producto","Cantidad","Monto"],topProductos.map((p,i)=>(<tr key={i} className="hover:bg-gray-50"><td className="px-4 py-3 font-bold text-gray-400">{i+1}</td><td className="px-4 py-3 text-gray-800 font-medium">{p.nombre}</td><td className="px-4 py-3"><span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">{p.cantidad}</span></td><td className="px-4 py-3 font-bold text-emerald-600">{fmtDec(p.monto)}</td></tr>))):<p className="text-gray-400 text-sm py-4 text-center">Sin datos de productos en el período</p>}</>)}
      </div>
      {card(<><h4 className="font-bold text-gray-800 mb-3">Detalle</h4>{tableWrapper(["Fecha","Sucursal","Farmacéutico","Método","Total"],data.sort((a,b)=>new Date(b.fecha).getTime()-new Date(a.fecha).getTime()).slice(0,50).map((v,i)=>(<tr key={i} className="hover:bg-gray-50"><td className="px-4 py-3 text-gray-500 text-xs">{formatearFechaHoraCDMX(v.fecha)}</td><td className="px-4 py-3 text-gray-800">{SUCURSALES.find(s=>s.id===v.sucursalId)?.nombre||v.sucursalId}</td><td className="px-4 py-3 text-gray-700">{v.usuario||"-"}</td><td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800 font-semibold capitalize">{v.metodoPago||"efectivo"}</span></td><td className="px-4 py-3 font-bold text-emerald-600">{fmtDec(v.total||0)}</td></tr>)))}</>)}
    </div>);
  };

  const renderReportePersonal = () => {
    const fa=personal.filter(p=>p.role==="farmaceutico"), me=personal.filter(p=>p.role==="medico");
    const dl=()=>{ const ws=XLSX.utils.json_to_sheet(personal.map(p=>({Nombre:p.name||p.username,Rol:p.role,Sucursal:SUCURSALES.find(s=>s.id===p.sucursalId)?.nombre||"-",Ventas:p.ventasCount||0,"Total":p.ventasTotal||0,Consultas:p.consultasCount||0}))); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Personal"); XLSX.writeFile(wb,"personal-gerencia.xlsx"); toast.success("Descargado"); };
    return (<div className="space-y-6">
      {renderFiltros()}
      <div className="flex justify-between items-center"><div><h3 className="text-xl font-bold text-gray-800">Reporte de Personal</h3><p className="text-gray-500 text-sm">{personal.length} colaboradores</p></div>{dlBtn(dl)}</div>
      {reporteLoading?<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div></div>:(<>
        {fa.length>0&&card(<><div className="flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-blue-300"/><h4 className="font-bold text-gray-800">Farmacéuticos ({fa.length})</h4></div>{tableWrapper(["Nombre","Sucursal","Ventas","Total Vendido","Ticket","Devoluciones"],fa.sort((a,b)=>(b.ventasTotal||0)-(a.ventasTotal||0)).map((p,i)=>(<tr key={i} className="hover:bg-gray-50"><td className="px-4 py-3 font-semibold text-gray-800">{p.name||p.username}</td><td className="px-4 py-3 text-gray-600">{SUCURSALES.find(s=>s.id===p.sucursalId)?.nombre||"-"}</td><td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{p.ventasCount||0}</span></td><td className="px-4 py-3 font-bold text-emerald-600">{fmtDec(p.ventasTotal||0)}</td><td className="px-4 py-3 text-gray-600">{fmtDec(p.ticketPromedio||0)}</td><td className="px-4 py-3">{(p.devolucionesCount||0)>0?<span className="text-red-600 font-semibold">{p.devolucionesCount}</span>:<span className="text-gray-400 text-xs">—</span>}</td></tr>)))}</>)}
        {me.length>0&&card(<><div className="flex items-center gap-2 mb-4"><Activity className="w-5 h-5 text-teal-600"/><h4 className="font-bold text-gray-800">Médicos ({me.length})</h4></div>{tableWrapper(["Nombre","Sucursal","Consultas","Total Servicios","Recetas","Monto Recetas"],me.sort((a,b)=>(b.consultasCount||0)-(a.consultasCount||0)).map((p,i)=>(<tr key={i} className="hover:bg-gray-50"><td className="px-4 py-3 font-semibold text-gray-800">{p.name||p.username}</td><td className="px-4 py-3 text-gray-600">{SUCURSALES.find(s=>s.id===p.sucursalId)?.nombre||"-"}</td><td className="px-4 py-3"><span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full text-xs font-bold">{p.consultasCount||0}</span></td><td className="px-4 py-3 font-bold text-teal-600">{fmtDec(p.consultasTotal||0)}</td><td className="px-4 py-3"><span className="g-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold">{p.recetasCount||0}</span></td><td className="px-4 py-3 font-bold text-purple-600">{fmtDec(p.recetasMontoGenerado||0)}</td></tr>)))}</>)}
      </>)}
    </div>);
  };

  const renderReporteBalance = () => {
    const vd=filtrar(ventas), cd=filtrar(compras), gd=filtrar(gastos,"fecha"), cod=filtrar(consultas);
    const tV=vd.reduce((s,v)=>s+(v.total||0),0), tC=cd.reduce((s,c)=>s+(c.total||0),0), tG=gd.reduce((s,g)=>s+(parseFloat(g.monto)||0),0), tS=cod.reduce((s,c)=>s+(c.monto||0),0);
    const ing=tV+tS, egr=tC+tG, util=ing-egr;
    const dl=()=>{ const ws=XLSX.utils.aoa_to_sheet([["Balance General"],["Ventas",tV],["Servicios",tS],["INGRESOS",ing],[],["Compras",tC],["Gastos",tG],["EGRESOS",egr],[],["UTILIDAD",util]]); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Balance"); XLSX.writeFile(wb,"balance-gerencia.xlsx"); toast.success("Descargado"); };
    return (<div className="space-y-6">
      {renderFiltros()}
      <div className="flex justify-between items-center"><div><h3 className="text-xl font-bold text-gray-800">Balance General</h3><p className="text-gray-500 text-sm">Resumen financiero del período</p></div>{dlBtn(dl)}</div>
      <div className="grid grid-cols-3 gap-4">
        {statCard("INGRESOS TOTALES",fmt(ing),`Ventas ${fmt(tV)} · Servicios ${fmt(tS)}`,"bg-emerald-500/30 border-emerald-400/40")}
        {statCard("EGRESOS TOTALES",fmt(egr),`Compras ${fmt(tC)} · Gastos ${fmt(tG)}`,"bg-red-500/30 border-red-400/40")}
        {statCard("UTILIDAD NETA",fmt(util),`Margen: ${ing>0?((util/ing)*100).toFixed(1):0}%`,util>=0?"bg-purple-500/30 border-purple-400/40":"bg-red-800/30 border-red-700/40")}
      </div>
      {card(<><h4 className="font-bold text-gray-800 mb-4">Distribución</h4>{barChart([{label:"Ventas Farmacia",value:tV,total:ing},{label:"Servicios Médicos",value:tS,total:ing}],"bg-emerald-400")}<div className="mt-4 pt-4 border-t border-gray-200">{barChart([{label:"Compras",value:tC,total:egr},{label:"Gastos",value:tG,total:egr}],"bg-red-400")}</div></>)}
    </div>);
  };

  const renderReporteComparativo = () => {
    const vd=filtrar(ventas), cod=filtrar(consultas);
    const comp=SUCURSALES.map(s=>{ const vs=vd.filter(v=>v.sucursalId===s.id); const cs=cod.filter(c=>c.sucursalId===s.id); const vT=vs.reduce((a,v)=>a+(v.total||0),0); const sT=cs.reduce((a,c)=>a+(c.monto||0),0); const gT=filtrar(gastos,"fecha").filter(g=>g.sucursalId===s.id).reduce((a,g)=>a+(parseFloat(g.monto)||0),0); const cT=filtrar(compras).filter(c=>c.sucursalId===s.id).reduce((a,c)=>a+(c.total||0),0); return {...s,ventas:vT,servicios:sT,egresos:gT+cT,utilidad:vT+sT-gT-cT,nv:vs.length}; }).sort((a,b)=>b.ventas-a.ventas);
    const maxV=Math.max(...comp.map(s=>s.ventas),1);
    const dl=()=>{ const ws=XLSX.utils.json_to_sheet(comp.map(s=>({Sucursal:s.nombre,Ventas:s.ventas,Servicios:s.servicios,Egresos:s.egresos,Utilidad:s.utilidad,"#Ventas":s.nv}))); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Comparativo"); XLSX.writeFile(wb,"comparativo-gerencia.xlsx"); toast.success("Descargado"); };
    return (<div className="space-y-6">
      {renderFiltros()}
      <div className="flex justify-between items-center"><div><h3 className="text-xl font-bold text-gray-800">Comparativo Sucursales</h3><p className="text-gray-500 text-sm">Ranking de desempeño</p></div>{dlBtn(dl)}</div>
      <div className="space-y-4">{comp.map((s,idx)=>(
        <div key={s.id} className="bg-white backdrop-blur rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm" style={{backgroundColor:SUCURSAL_COLORES[s.id]||"#8B5CF6"}}>#{idx+1}</div>
            <h4 className="font-bold text-gray-800 text-lg">{s.nombre}</h4>
            <span className="ml-auto font-black text-2xl text-gray-800">{fmt(s.ventas)}</span>
          </div>
          <div className="mb-3 h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full" style={{width:`${(s.ventas/maxV)*100}%`,backgroundColor:SUCURSAL_COLORES[s.id]||"#8B5CF6"}}/></div>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[{l:"Ventas",v:s.nv,c:"text-gray-800"},{l:"Servicios",v:fmt(s.servicios),c:"text-teal-600"},{l:"Egresos",v:fmt(s.egresos),c:"text-red-600"},{l:"Utilidad",v:fmt(s.utilidad),c:s.utilidad>=0?"text-emerald-600":"text-red-600"}].map(k=>(
              <div key={k.l} className="bg-white rounded-lg p-2"><p className="text-xs text-gray-400">{k.l}</p><p className={`font-bold ${k.c}`}>{k.v}</p></div>
            ))}
          </div>
        </div>
      ))}</div>
    </div>);
  };

  const renderReporteInventario = () => {
    const ss=productos.filter(p=>Object.values(p.stockBySucursal||{}).reduce((s:number,v:any)=>s+(v||0),0)===0);
    const sb=productos.filter(p=>{ const t=Object.values(p.stockBySucursal||{}).reduce((s:number,v:any)=>s+(v||0),0); return t>0&&t<10; });
    const dl=()=>{ const ws=XLSX.utils.json_to_sheet(productos.map(p=>({Nombre:p.nombre,Código:p.codigoBarras,"Stock":Object.values(p.stockBySucursal||{}).reduce((s:number,v:any)=>s+(v||0),0),Precio:parseFloat(p.precioVenta||p.precio)||0}))); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Inventario"); XLSX.writeFile(wb,"inventario-gerencia.xlsx"); toast.success("Descargado"); };
    return (<div className="space-y-6">
      <div className="flex justify-between items-center"><div><h3 className="text-xl font-bold text-gray-800">Inventario General</h3><p className="text-gray-500 text-sm">{productos.length} productos</p></div>{dlBtn(dl)}</div>
      <div className="grid grid-cols-3 gap-4">
        {statCard("Con Stock",`${productos.length-ss.length}`,"productos disponibles","bg-emerald-500/30 border-emerald-400/40")}
        {statCard("Stock Bajo",`${sb.length}`,"menos de 10 unidades","bg-yellow-500/30 border-yellow-400/40")}
        {statCard("Sin Stock",`${ss.length}`,"requieren reabastecimiento","bg-red-500/30 border-red-400/40")}
      </div>
      {sb.length>0&&card(<><div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-yellow-300"/><h4 className="font-bold text-gray-800">Productos con Stock Bajo</h4></div>{tableWrapper(["Producto","Código","Stock","Precio"],sb.map((p,i)=>{ const st=Object.values(p.stockBySucursal||{}).reduce((s:number,v:any)=>s+(v||0),0); return(<tr key={i} className="hover:bg-gray-50"><td className="px-4 py-3 text-gray-800">{p.nombre}</td><td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.codigoBarras}</td><td className="px-4 py-3"><span className="bg-yellow-500/30 text-yellow-200 px-2 py-0.5 rounded-full text-xs font-bold">{st}</span></td><td className="px-4 py-3 text-gray-700">{fmtDec(parseFloat(p.precioVenta||p.precio)||0)}</td></tr>); }))}</>)}
    </div>);
  };

  const renderReporteCompras = () => {
    const data=filtrar(compras,"fechaCreacion"), tv=data.reduce((s,c)=>s+(c.total||0),0);
    const pp: Record<string,number>={}; data.forEach(c=>{ const p=c.proveedor||"Sin proveedor"; pp[p]=(pp[p]||0)+(c.total||0); });
    const dl=()=>{ const ws=XLSX.utils.json_to_sheet(data.map(c=>({Fecha:new Date(c.fechaCreacion||c.fecha).toLocaleString("es-MX"),Sucursal:SUCURSALES.find(s=>s.id===c.sucursalId)?.nombre||c.sucursalId,Proveedor:c.proveedor||"-",Producto:c.nombreProducto||"-",Total:c.total||0}))); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Compras"); XLSX.writeFile(wb,"compras-gerencia.xlsx"); toast.success("Descargado"); };
    return (<div className="space-y-6">
      {renderFiltros()}
      <div className="flex justify-between items-center"><div><h3 className="text-xl font-bold text-gray-800">Histórico de Compras</h3><p className="text-gray-500 text-sm">{data.length} órdenes</p></div>{dlBtn(dl)}</div>
      <div className="grid grid-cols-2 gap-4">
        {statCard("Total Comprado",fmt(tv),`${data.length} órdenes`,"bg-blue-500/30 border-blue-400/40")}
        {statCard("Promedio",data.length>0?fmtDec(tv/data.length):"$0","por orden","bg-gray-50 border-gray-200")}
      </div>
      {card(<><h4 className="font-bold text-gray-800 mb-4">Por Proveedor</h4>{barChart(Object.entries(pp).map(([l,v])=>({label:l,value:v,total:tv})),"bg-blue-400")}</>)}
    </div>);
  };

  const renderReporteGastos = () => {
    const data=filtrar(gastos,"fecha"), tv=data.reduce((s,g)=>s+(parseFloat(g.monto)||0),0);
    const pc: Record<string,number>={}; data.forEach(g=>{ const c=g.categoria||"Otros"; pc[c]=(pc[c]||0)+(parseFloat(g.monto)||0); });
    const dl=()=>{ const ws=XLSX.utils.json_to_sheet(data.map(g=>({Fecha:new Date(g.fecha||g.creadoEn).toLocaleString("es-MX"),Sucursal:SUCURSALES.find(s=>s.id===g.sucursalId)?.nombre||g.sucursalId,Categoría:g.categoria||"-",Nota:g.nota||"-",Monto:parseFloat(g.monto)||0,Usuario:g.creadoPorNombre||"-"}))); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Gastos"); XLSX.writeFile(wb,"gastos-gerencia.xlsx"); toast.success("Descargado"); };
    return (<div className="space-y-6">
      {renderFiltros()}
      <div className="flex justify-between items-center"><div><h3 className="text-xl font-bold text-gray-800">Gastos Operativos</h3><p className="text-gray-500 text-sm">{data.length} registros</p></div>{dlBtn(dl)}</div>
      <div className="grid grid-cols-2 gap-4">
        {statCard("Total Gastos",fmt(tv),`${data.length} registros`,"bg-red-500/30 border-red-400/40")}
        {statCard("Promedio",data.length>0?fmtDec(tv/data.length):"$0","por registro","bg-gray-50 border-gray-200")}
      </div>
      {card(<><h4 className="font-bold text-gray-800 mb-4">Por Categoría</h4>{barChart(Object.entries(pc).map(([l,v])=>({label:l,value:v,total:tv})),"bg-red-400")}</>)}
    </div>);
  };

  const renderReporteCortes = () => {
    const data=(cajas||[]).filter(c=>{ if(c.estado!=="cerrada")return false; if(filtroSucursal!=="todas"&&c.sucursalId!==filtroSucursal)return false; const f=new Date(c.fechaCierre||""); return f>=new Date(fechaInicio)&&f<=new Date(fechaFin+"T23:59:59"); });
    const te=data.reduce((s,c)=>s+(c.efectivoAEntregar||0),0);
    const dl=()=>{ const ws=XLSX.utils.json_to_sheet(data.map(c=>({Sucursal:SUCURSALES.find(s=>s.id===c.sucursalId)?.nombre||c.sucursalId,Caja:c.numeroCaja||1,"Fecha Cierre":new Date(c.fechaCierre).toLocaleString("es-MX"),Suman:c.totalSuman||0,Restan:c.totalRestan||0,Efectivo:c.efectivoAEntregar||0}))); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Cortes"); XLSX.writeFile(wb,"cortes-gerencia.xlsx"); toast.success("Descargado"); };
    return (<div className="space-y-6">
      {renderFiltros()}
      <div className="flex justify-between items-center"><div><h3 className="text-xl font-bold text-gray-800">Cortes de Caja</h3><p className="text-gray-500 text-sm">{data.length} cortes</p></div>{dlBtn(dl)}</div>
      <div className="grid grid-cols-2 gap-4">
        {statCard("Efectivo Entregado",fmt(te),`${data.length} cortes`,"bg-gray-50 border-gray-200")}
        {statCard("Promedio",data.length>0?fmtDec(te/data.length):"$0","por corte","bg-gray-50 border-gray-200")}
      </div>
      {card(tableWrapper(["Sucursal","Caja","Fecha Cierre","Suman","Restan","Efectivo"],data.sort((a,b)=>new Date(b.fechaCierre).getTime()-new Date(a.fechaCierre).getTime()).map((c,i)=>(<tr key={i} className="hover:bg-gray-50"><td className="px-4 py-3 text-gray-800">{SUCURSALES.find(s=>s.id===c.sucursalId)?.nombre||c.sucursalId}</td><td className="px-4 py-3 text-gray-600">Caja {c.numeroCaja||1}</td><td className="px-4 py-3 text-gray-500 text-xs">{new Date(c.fechaCierre).toLocaleString("es-MX")}</td><td className="px-4 py-3 text-emerald-600 font-semibold">{fmtDec(c.totalSuman||0)}</td><td className="px-4 py-3 text-red-600 font-semibold">{fmtDec(c.totalRestan||0)}</td><td className="px-4 py-3 text-gray-900 font-bold">{fmtDec(c.efectivoAEntregar||0)}</td></tr>))))}
    </div>);
  };

  const renderReporteAntibioticos = () => {
    const data=filtrar(antibioticos);
    const dl=()=>{ const ws=XLSX.utils.json_to_sheet(data.map(a=>({Fecha:new Date(a.fecha||a.createdAt).toLocaleString("es-MX"),Sucursal:SUCURSALES.find(s=>s.id===a.sucursalId)?.nombre||a.sucursalId,Medicamento:a.medicamento||a.nombre||"-",Paciente:a.paciente||"-","Código Receta":a.codigoReceta||"-",Cantidad:a.cantidad||1}))); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Antibióticos"); XLSX.writeFile(wb,"antibioticos-gerencia.xlsx"); toast.success("Descargado"); };
    return (<div className="space-y-6">
      {renderFiltros()}
      <div className="flex justify-between items-center"><div><h3 className="text-xl font-bold text-gray-800">Control de Antibióticos</h3><p className="text-gray-500 text-sm">{data.length} registros</p></div>{dlBtn(dl)}</div>
      <div className="grid grid-cols-2 gap-4">
        {statCard("Total Registros",`${data.length}`,"en el período","bg-orange-500/30 border-orange-400/40")}
        {statCard("Con Receta Médica",`${data.filter(a=>a.codigoReceta).length}`,"registros con receta","bg-gray-50 border-gray-200")}
      </div>
      {card(tableWrapper(["Fecha","Sucursal","Medicamento","Paciente","Código Receta","Cant."],data.sort((a,b)=>new Date(b.fecha||b.createdAt).getTime()-new Date(a.fecha||a.createdAt).getTime()).map((a,i)=>(<tr key={i} className="hover:bg-gray-50"><td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.fecha||a.createdAt).toLocaleDateString("es-MX")}</td><td className="px-4 py-3 text-gray-800">{SUCURSALES.find(s=>s.id===a.sucursalId)?.nombre||a.sucursalId}</td><td className="px-4 py-3 text-gray-700">{a.medicamento||a.nombre||"-"}</td><td className="px-4 py-3 text-gray-600">{a.paciente||"-"}</td><td className="px-4 py-3 font-mono text-purple-600 text-xs">{a.codigoReceta||"—"}</td><td className="px-4 py-3 text-center text-gray-800 font-semibold">{a.cantidad||1}</td></tr>))))}
    </div>);
  };

  const REPORTES_CONFIG = [
    {id:"ventas",label:"Reporte de Ventas",icon:ShoppingCart,desc:"Análisis de ventas por período y sucursal"},
    {id:"comparativo",label:"Comparativo Sucursales",icon:Building,desc:"Ranking y desempeño de cada sucursal"},
    {id:"balance",label:"Balance General",icon:Scale,desc:"Ingresos, egresos y utilidad neta"},
    {id:"personal",label:"Reporte de Personal",icon:Users,desc:"Farmacéuticos y médicos de todas las sucursales"},
    {id:"inventario",label:"Inventario General",icon:Package,desc:"Stock, alertas y valoración"},
    {id:"compras",label:"Histórico de Compras",icon:Truck,desc:"Órdenes de compra y proveedores"},
    {id:"gastos",label:"Gastos Operativos",icon:Receipt,desc:"Gastos por categoría y sucursal"},
    {id:"cortes",label:"Cortes de Caja",icon:CreditCard,desc:"Historial de cortes y cierres"},
    {id:"antibioticos",label:"Control Antibióticos",icon:Pill,desc:"Registro de venta controlada"},
  ];

  const renderReporteActivo = () => {
    const map: Record<string,()=>JSX.Element> = {
      ventas:renderReporteVentas, personal:renderReportePersonal, inventario:renderReporteInventario,
      compras:renderReporteCompras, gastos:renderReporteGastos, balance:renderReporteBalance,
      cortes:renderReporteCortes, comparativo:renderReporteComparativo, antibioticos:renderReporteAntibioticos,
    };
    return reporteActivo && map[reporteActivo] ? map[reporteActivo]() : null;
  };

  // ── BITÁCORA ──────────────────────────────────────────────────────────────────
  const TIPO_CFG: Record<string,{color:string,bg:string}> = {
    "Venta":{color:"text-emerald-800",bg:"bg-emerald-100"},
    "Compra":{color:"text-blue-800",bg:"bg-blue-100"},
    "Gasto":{color:"text-red-800",bg:"bg-red-100"},
    "Traslado":{color:"text-orange-800",bg:"bg-orange-100"},
    "Consulta":{color:"text-teal-800",bg:"bg-teal-100"},
    "Corte de Caja":{color:"text-purple-800",bg:"bg-purple-100"},
  };

  const bitacoraFiltrada = useMemo(()=>bitacoraItems.filter(item=>{
    const s=filtroBitacoraSucursal==="todas"||item.sucursalId===filtroBitacoraSucursal;
    const t=filtroBitacoraTipo==="todos"||item.tipo===filtroBitacoraTipo;
    const b=!busquedaBitacora||[item.usuario,item.tipo,item.detalle,item.accion].some(x=>x?.toLowerCase().includes(busquedaBitacora.toLowerCase()));
    return s&&t&&b;
  }),[bitacoraItems,filtroBitacoraSucursal,filtroBitacoraTipo,busquedaBitacora]);

  const renderBitacora = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bitácora de Movimientos</h2>
        <p className="text-gray-500 mt-1">Registro completo de auditoría — ventas, compras, gastos, traslados, consultas y cortes de caja</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={busquedaBitacora} onChange={e=>setBusquedaBitacora(e.target.value)} placeholder="Buscar por usuario, tipo, detalle..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"/></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Sucursal</label><select value={filtroBitacoraSucursal} onChange={e=>setFiltroBitacoraSucursal(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"><option value="todas">Todas</option>{SUCURSALES.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label><select value={filtroBitacoraTipo} onChange={e=>setFiltroBitacoraTipo(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500">{["todos","Venta","Compra","Gasto","Traslado","Consulta","Corte de Caja"].map(t=><option key={t} value={t}>{t==="todos"?"Todos los tipos":t}</option>)}</select></div>
        <button onClick={cargarBitacora} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold"><RefreshCw className="w-4 h-4"/>Actualizar</button>
        <span className="text-sm text-gray-500 font-medium">{bitacoraFiltrada.length} registros</span>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {Object.entries(TIPO_CFG).map(([tipo,cfg])=>{
          const count=bitacoraItems.filter(i=>i.tipo===tipo).length;
          return (<button key={tipo} onClick={()=>setFiltroBitacoraTipo(filtroBitacoraTipo===tipo?"todos":tipo)} className={`p-3 rounded-xl text-center transition-all ${cfg.bg} ${filtroBitacoraTipo===tipo?"ring-2 ring-purple-500 shadow-md":""}`}><p className={`text-2xl font-black ${cfg.color}`}>{count}</p><p className={`text-xs font-semibold ${cfg.color} mt-0.5`}>{tipo}</p></button>);
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">{["Tipo","Acción","Usuario","Sucursal","Fecha","Monto","Detalle"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {bitacoraLoading?(
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500"><div className="flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div><span>Cargando bitácora...</span></div></td></tr>
              ):bitacoraFiltrada.length===0?(
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No hay movimientos que coincidan con los filtros</td></tr>
              ):bitacoraFiltrada.map((item,i)=>{
                const cfg=TIPO_CFG[item.tipo]||{color:"text-gray-800",bg:"bg-gray-100"};
                return (<tr key={i} className="hover:bg-gray-50 transition-colors"><td className="px-4 py-3"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cfg.bg} ${cfg.color}`}>{item.tipo}</span></td><td className="px-4 py-3 text-gray-700 text-xs">{item.accion}</td><td className="px-4 py-3 text-gray-800 font-semibold text-xs">{item.usuario}</td><td className="px-4 py-3 text-gray-600 text-xs">{SUCURSAL_MAP[item.sucursalId]||item.sucursalId||"N/A"}</td><td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{item.fecha?new Date(item.fecha).toLocaleString("es-MX"):"-"}</td><td className="px-4 py-3 font-bold text-gray-900 text-xs">{item.monto>0?fmtDec(item.monto):"-"}</td><td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{item.detalle}</td></tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ── DASHBOARD PRINCIPAL ───────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><Building className="w-5 h-5 text-purple-600"/>Vista de Sucursales</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button onClick={()=>setSelectedSucursal("todas")} className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all whitespace-nowrap ${selectedSucursal==="todas"?"border-purple-600 bg-purple-50 text-purple-700":"border-gray-200 bg-white text-gray-600 hover:border-purple-300"}`}><Building className="w-4 h-4"/><span className="font-medium">Todas las Sucursales</span></button>
          {SUCURSALES.map(suc=><button key={suc.id} onClick={()=>setSelectedSucursal(suc.nombre)} className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all whitespace-nowrap ${selectedSucursal===suc.nombre?"border-purple-600 bg-purple-50 text-purple-700":"border-gray-200 bg-white text-gray-600 hover:border-purple-300"}`}><Building className="w-4 h-4"/><span className="font-medium">{suc.nombre}</span></button>)}
        </div>
      </div>

      {loading?<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div></div>:(<>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[{label:"Total Productos",value:totals.totalProductos,sub:`${totals.totalStock} unidades en stock`,icon:Package,c:"blue"},{label:"Ventas Totales",value:totals.totalVentas,sub:selectedSucursal==="todas"?"Todas las sucursales":selectedSucursal,icon:ShoppingCart,c:"green"},{label:"Ingresos Totales",value:`$${totals.totalIngresos.toFixed(0)}`,sub:`$${promedioIngresos} promedio`,icon:DollarSign,c:"purple"},{label:"Sucursales Activas",value:totals.sucursalesActivas,sub:"Vista consolidada",icon:TrendingUp,c:"orange"}].map((m,i)=>(
            <div key={i} className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3"><div className={`bg-${m.c}-100 p-3 rounded-lg`}><m.icon className={`w-6 h-6 text-${m.c}-600`}/></div><p className={`text-3xl font-bold text-${m.c}-600`}>{m.value}</p></div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">{m.label}</h4><p className="text-xs text-gray-500">{m.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-600"/>Ingresos por Sucursal</h3>
            <div className="space-y-3">{ingresosData.length>0?ingresosData.map((item,idx)=>{ const mx=Math.max(...ingresosData.map(d=>d.ingresos),1); const pct=(item.ingresos/mx)*100; return(<div key={idx}><div className="flex items-center justify-between mb-1"><span className="text-sm font-semibold text-gray-700">{item.sucursal}</span><span className="text-sm font-bold text-purple-600">${item.ingresos.toFixed(2)}</span></div><div className="w-full bg-gray-200 rounded-full h-6"><div className="h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-end pr-2" style={{width:`${pct}%`}}><span className="text-xs text-gray-800 font-semibold">{pct.toFixed(0)}%</span></div></div></div>); }):<p className="text-gray-500 text-center py-8">No hay datos</p>}</div>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-600"/>Distribución de Ventas</h3>
            <div className="space-y-2">{distribucionData.map((item,idx)=>(<div key={idx} className="flex items-center gap-3"><div className="w-4 h-4 rounded-full flex-shrink-0" style={{backgroundColor:COLORS[idx%COLORS.length]}}></div><div className="flex-1"><div className="flex items-center justify-between mb-1"><span className="text-sm font-medium text-gray-700">{item.name}</span><span className="text-sm font-bold text-gray-900">{item.value}%</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full" style={{width:`${item.value}%`,backgroundColor:COLORS[idx%COLORS.length]}}></div></div></div></div>))}</div>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-purple-600"/>Inventario por Sucursal</h3>
            <div className="space-y-4">{inventarioData.map((item,idx)=>(<div key={idx}><div className="flex items-center justify-between mb-1"><span className="text-sm font-semibold text-gray-700">{item.sucursal}</span><span className="text-sm text-gray-600">{item.stock} uds ({item.porcentaje}%)</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full" style={{width:`${item.porcentaje}%`,backgroundColor:COLORS[idx%COLORS.length]}}></div></div></div>))}</div>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-600"/>Ventas Últimos 7 Días</h3>
            <div className="relative h-40">
              <svg viewBox="0 0 1000 260" className="w-full h-full">{(()=>{ const mC=Math.max(...ventasUltimos7Dias.map(d=>d.cantidad),1); const mI=Math.max(...ventasUltimos7Dias.map(d=>d.ingresos),1); const pC=ventasUltimos7Dias.map((d,i)=>({x:50+(i*(900/(ventasUltimos7Dias.length-1||1))),y:230-((d.cantidad/mC)*200)})); const pI=ventasUltimos7Dias.map((d,i)=>({x:50+(i*(900/(ventasUltimos7Dias.length-1||1))),y:230-((d.ingresos/mI)*200)})); const pathC=pC.map((p,i)=>`${i===0?"M":"L"} ${p.x} ${p.y}`).join(" "); const pathI=pI.map((p,i)=>`${i===0?"M":"L"} ${p.x} ${p.y}`).join(" "); return(<><path d={pathI} fill="none" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round"/>{pI.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="5" fill="#14b8a6" stroke="white" strokeWidth="2"/>)}<path d={pathC} fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round"/>{pC.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="5" fill="#8b5cf6" stroke="white" strokeWidth="2"/>)}{ventasUltimos7Dias.map((d,i)=>{ const x=50+(i*(900/(ventasUltimos7Dias.length-1||1))); const f=new Date(d.fecha); return(<text key={i} x={x} y="250" textAnchor="middle" fontSize="12" fill="#6b7280">{(f.getMonth()+1)}/{f.getDate()}</text>); })}</>); })()}</svg>
            </div>
            <div className="flex items-center justify-center gap-6 mt-1"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span className="text-xs text-gray-600">Cantidad</span></div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-teal-500"></div><span className="text-xs text-gray-600">Ingresos</span></div></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Acceso Rápido a Reportes Ejecutivos</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {REPORTES_CONFIG.slice(0,5).map(r=>(
              <button key={r.id} onClick={()=>{setActiveView("reportes");abrirReporte(r.id as ReporteActivo);}} className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all group">
                <r.icon className="w-6 h-6 text-purple-600"/><span className="text-xs font-semibold text-gray-700 text-center group-hover:text-purple-700">{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      </>)}
    </div>
  );

  // ── VISTA REPORTES ────────────────────────────────────────────────────────────
  const renderReportes = () => (
    <div className="min-h-[600px]">
      {reporteActivo?(
        <div>
          <button onClick={()=>setReporteActivo(null)} className="flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm font-semibold mb-6">← Volver a todos los reportes</button>
          {reporteLoading?<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>:renderReporteActivo()}
        </div>
      ):(
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Reportes Ejecutivos</h2>
<p className="text-gray-500 mb-8">Informes detallados para toma de decisiones gerenciales</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORTES_CONFIG.map(r=>(
              <button key={r.id} onClick={()=>abrirReporte(r.id as ReporteActivo)}
  className="flex items-center gap-4 p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:shadow-lg transition-all text-left group">
  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-100 transition-colors">
    <r.icon className="w-6 h-6 text-purple-600"/>
  </div>
  <div className="flex-1">
    <p className="font-bold text-gray-800 group-hover:text-purple-700">{r.label}</p>
    <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
  </div>
  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 flex-shrink-0"/>
</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div><h1 className="text-xl font-bold">LYMPOS - Panel Gerencial</h1><p className="text-xs text-purple-100">{user.name} | Gerente General</p></div>
            <div className="flex items-center gap-2">
              {[{id:"dashboard",label:"Dashboard",icon:LayoutDashboard},{id:"bitacora",label:"Bitácora",icon:FileText},{id:"reportes",label:"Reportes",icon:BarChart3},{id:"supervisor",label:"Supervisor",icon:UserCheck}].map(v=>(
                <button key={v.id} onClick={()=>setActiveView(v.id as ActiveView)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm ${activeView===v.id?"bg-white text-purple-600 font-semibold":"bg-white/20 text-white hover:bg-white/30"}`}><v.icon className="w-4 h-4"/>{v.label}</button>
              ))}
              <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all text-sm"><LogOut className="w-4 h-4"/>Cerrar Sesión</button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView==="dashboard"&&renderDashboard()}
        {activeView==="bitacora"&&renderBitacora()}
        {activeView==="reportes"&&renderReportes()}
        {activeView==="supervisor"&&<SupervisorDashboard user={user} onLogout={onLogout} isAdmin={true}/>}
      </main>
    </div>
  );
}

