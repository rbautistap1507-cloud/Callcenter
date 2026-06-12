import { useState, useEffect } from "react";
import { User, SUCURSALES } from "../shared";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Stethoscope,
  Banknote,
  CreditCard,
  Printer,
  Check,
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  Plus,
  Minus,
  X,
} from "lucide-react";

interface CortesDeCajaProps {
  user: User;
  assignedSucursalId?: string;
}

interface Caja {
  id: string;
  sucursalId: string;
  farmaceuticoId: string;
  montoInicial: number;
  estado: "abierta" | "cerrada";
  fechaApertura: string;
  fechaCierre?: string;
  notas?: string;
  notasCierre?: string;
  numeroCaja?: number; // 1, 2, 3, 4
  // SUMAN
  totalVentasGeneradas?: number;
  recargas?: number;
  sobrante?: number;
  certificados?: number;
  serviciosMedicos?: number; // Nuevo campo explícito
  totalSuman?: number;
  // RESTAN
  cobrosConTarjeta?: number;
  valeAzul?: number;
  devoluciones?: number;
  transferencias?: number;
  totalRestan?: number;
  // RESULTADO
  efectivoAEntregar?: number;
  // Datos del sistema
  totalVentas?: number;
  totalServicios?: number;
  numeroVentas?: number;
  numeroServicios?: number;
  ventas?: any[];
  servicios?: any[];
  // Desglose administrativo
  ventasFarmacia?: number;
  ventasServicios?: number;
}

export default function CortesDeCaja({ user, assignedSucursalId }: CortesDeCajaProps) {
  const [cajaActiva, setCajaActiva] = useState<Caja | null>(null);
  const [historialCajas, setHistorialCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAbrirCaja, setShowAbrirCaja] = useState(false);
  const [showCerrarCaja, setShowCerrarCaja] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showCierreDiario, setShowCierreDiario] = useState(false);
  const [cajasAbiertasIds, setCajasAbiertasIds] = useState<number[]>([]);
  const [numeroCajasConfig, setNumeroCajasConfig] = useState(1); // Cajas configuradas para esta sucursal
  const [numeroCajasAbiertas, setNumeroCajasAbiertas] = useState(0);
  const [cajasCerradasDiario, setCajasCerradasDiario] = useState<Caja[]>([]);
  const [tienePreCorte, setTienePreCorte] = useState(false);
  const [showCorteTotal, setShowCorteTotal] = useState(false);
  const [corteTotalRealizado, setCorteTotalRealizado] = useState<any>(null);
  const [showPrintCorteTotal, setShowPrintCorteTotal] = useState(false);

  // Estados para abrir caja
  const [montoInicial, setMontoInicial] = useState("");
  const [numeroCajaSeleccionada, setNumeroCajaSeleccionada] = useState(1);
  const [notasApertura, setNotasApertura] = useState("");

  // Estados para cerrar caja - SUMAN
  const [totalVentasGeneradas, setTotalVentasGeneradas] = useState("");
  const [recargas, setRecargas] = useState("");
  const [sobrante, setSobrante] = useState("");
  const [fondo, setFondo] = useState("");
  const [certificados, setCertificados] = useState("");
  const [serviciosMedicos, setServiciosMedicos] = useState(""); // Nuevo estado para Servicios Médicos
  
  // Estados para cerrar caja - RESTAN
  const [cobrosConTarjeta, setCobrosConTarjeta] = useState("");
  const [valeAzul, setValeAzul] = useState("");
  const [devoluciones, setDevoluciones] = useState("");
  const [transferencias, setTransferencias] = useState("");
  
  const [notasCierre, setNotasCierre] = useState("");
  const [preCorteEfectivo, setPreCorteEfectivo] = useState("0");
  const [preCorteData, setPreCorteData] = useState<any>(null);
  const [preCorteRealizado, setPreCorteRealizado] = useState<any>(null);
  const [showPrintPreCorte, setShowPrintPreCorte] = useState(false);

  // Estado para el modo de visualización del historial
  const [historialMode, setHistorialMode] = useState<"cortes" | "diarios">("diarios"); // Call Center: solo cierres diarios
  const [cierreDiarioConfirmado, setCierreDiarioConfirmado] = useState(false);

  const sucursal = SUCURSALES.find((s) => s.id === (assignedSucursalId || user.sucursalId));

  // Convertir UTC a CST (México UTC-6)
  const toCST = (fecha: string | Date): Date => {
    const utc = new Date(fecha);
    return new Date(utc.getTime() - (6 * 60 * 60 * 1000));
  };

  const startOfDayCST = (fecha: string | Date): Date => {
    const cst = toCST(fecha);
    cst.setHours(0, 0, 0, 0);
    return cst;
  };

  useEffect(() => {
    loadCajaActiva();
    loadAllCajas();
    loadCajasConfig();
  }, []);

useEffect(() => {
    if (assignedSucursalId) {
      loadCajaActiva();
      loadAllCajas();
      loadCajasConfig();
    }
  }, [assignedSucursalId]);

  // Resetear estado de confirmación al abrir el modal de cierre diario
  useEffect(() => {
    if (showCierreDiario) {
      setCierreDiarioConfirmado(false);
    }
  }, [showCierreDiario]);

  // Pre-Corte: carga todos los datos de la caja activa
  useEffect(() => {
    if (showCerrarCaja && cajaActiva) {
      const stats = calcularEstadisticas(); // sin filtro = todas las ventas
      setTotalVentasGeneradas(stats.ventasFarmacia.toString());
      setServiciosMedicos(stats.ventasServicios.toString());
      setRecargas("0");
      setCertificados("0");
      setSobrante("0");
      setFondo("0");
      setCobrosConTarjeta(stats.cobrosConTarjeta.toString());
      setTransferencias(stats.transferencias.toString());
      setDevoluciones(stats.devoluciones.toString());
      setValeAzul("0");
      setNotasCierre("");
      fetchGastosParaCorte(cajaActiva.fechaApertura, false);
    }
  }, [showCerrarCaja, cajaActiva]);

  // Corte Total: solo datos desde fechaReapertura
  useEffect(() => {
    if (showCorteTotal && cajaActiva) {
      const stats = calcularEstadisticas(true); // solo vespertino
      setTotalVentasGeneradas(stats.ventasFarmacia.toString());
      setServiciosMedicos(stats.ventasServicios.toString());
      setRecargas("0");
      setCertificados("0");
      setSobrante("0");
      setFondo("0");
      setCobrosConTarjeta(stats.cobrosConTarjeta.toString());
      setTransferencias(stats.transferencias.toString());
      setDevoluciones(stats.devoluciones.toString());
      setValeAzul("0");
      setNotasCierre("");
      fetchGastosParaCorte(cajaActiva.fechaReapertura || cajaActiva.fechaApertura, true);
      // Cargar efectivo del pre-corte matutino
      if (cajaActiva.snapshotPreCorteId) {
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } }
        ).then(r => r.json()).then(data => {
          const snapshot = (data.cajas || []).find(
            (c: any) => c.id === cajaActiva.snapshotPreCorteId
          );
          if (snapshot) {
            setPreCorteData(snapshot);
            setPreCorteEfectivo((snapshot.efectivoAEntregar || 0).toString());
          }
        }).catch(console.error);
      } else {
        setPreCorteEfectivo("0");
        setPreCorteData(null);
      }
    }
  }, [showCorteTotal, cajaActiva]);
  // Gastos filtrados por período exacto (sin conversión de zona horaria)
  const fetchGastosParaCorte = async (fechaDesde: string, soloVespertino = false) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/gastos`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success && data.gastos) {
        const desde = new Date(fechaDesde).getTime();
        const total = (data.gastos as any[])
          .filter((g: any) => {
            const gastoDate = new Date(g.creadoEn || g.createdAt || g.fecha || "").getTime();
            return g.sucursalId === (assignedSucursalId || user.sucursalId) && gastoDate >= desde;
          })
          .reduce((sum: number, g: any) => sum + (parseFloat(g.monto) || 0), 0);
        setValeAzul(total.toFixed(2));
      }
    } catch (error) {
      console.error("Error cargando gastos para corte:", error);
    }
  };

  const loadCajaActiva = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas/activa/${assignedSucursalId || user.sucursalId}?farmaceuticoId=${user.id}`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setCajaActiva(data.caja);
        setTienePreCorte(data.caja?.tienePreCorte || false);
      }
    } catch (error) {
      console.error("Error cargando caja activa:", error);
    }
  };

  const loadAllCajas = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        // Historial (Cerradas)
        const cerradas = data.cajas
  .filter((c: Caja) => {
    if (c.sucursalId !== (assignedSucursalId || user.sucursalId)) return false;
    if (c.id.includes("SNAPSHOT")) return c.tipoCorte === "preCorte";
    return c.estado === "cerrada" || c.estado === "preCorte";
  })
          .sort((a: Caja, b: Caja) => {
            // Ordenar por fecha de cierre ascendente (más antiguos primero)
            if (!a.fechaCierre || !b.fechaCierre) return 0;
            return new Date(a.fechaCierre).getTime() - new Date(b.fechaCierre).getTime();
          });
        setHistorialCajas(cerradas);

        // Identificar cajas abiertas (para deshabilitar en el selector)
        const abiertas = data.cajas
          .filter((c: Caja) => 
            c.sucursalId === (assignedSucursalId || user.sucursalId) && 
            (c.estado === "abierta" || c.estado === "preCorte")
          );
        
        const abiertasIds = abiertas.map((c: Caja) => c.numeroCaja || 1);
        setCajasAbiertasIds(abiertasIds);
        setNumeroCajasAbiertas(abiertas.length); // Guardar número de cajas abiertas
      }
    } catch (error) {
      console.error("Error cargando cajas:", error);
    }
  };

  const loadCajasConfig = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas-config/${assignedSucursalId || user.sucursalId}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success && data.config) {
        setNumeroCajasConfig(data.config.numeroCajas || 1);
      }
    } catch (error) {
      console.error("Error cargando configuración de cajas:", error);
    }
  };

  const handleAbrirCaja = async () => {
    // Solo validar fondo si no es turno vespertino (sin pre-corte previo)
    const esVespertino = cajasAbiertasIds.includes(numeroCajaSeleccionada);
    // Sin validación de fondo — no aplica para esta sucursal

    // Verificar si la caja tiene pre-corte (puede reactivarse) o está genuinamente ocupada
    if (cajasAbiertasIds.includes(numeroCajaSeleccionada)) {
      // Verificar si tiene pre-corte — en ese caso permitir continuar
      const response2 = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data2 = await response2.json();
      // Usar fecha CST para comparar
      const hoyCST = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString().split("T")[0];
      const cajaPreCorte = (data2.cajas || []).find((c: any) => {
        if (c.sucursalId !== (assignedSucursalId || user.sucursalId)) return false;
        if (c.numeroCaja !== numeroCajaSeleccionada) return false;
        if (c.estado !== "preCorte") return false;
        // Verificar que el fechaCierre sea de hoy en CST
        if (!c.fechaCierre) return false;
        const fechaCierreCST = new Date(new Date(c.fechaCierre).getTime() - 6 * 60 * 60 * 1000)
          .toISOString().split("T")[0];
        return fechaCierreCST === hoyCST;
      });
      if (!cajaPreCorte) {
        toast.error(`La Caja ${numeroCajaSeleccionada} ya se encuentra abierta por otro farmacéutico.`);
        setLoading(false);
        return;
      }
      // Tiene pre-corte — continuar sin validar fondo
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sucursalId: assignedSucursalId || user.sucursalId,
            farmaceuticoId: user.id,
            montoInicial: 0,
            notas: notasApertura,
            numeroCaja: numeroCajaSeleccionada,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        if (data.tienePreCorte) {
          toast.success(`Caja ${numeroCajaSeleccionada} retomada - turno vespertino iniciado`);
        } else {
          toast.success(`Caja ${numeroCajaSeleccionada} abierta exitosamente`);
        }
        setCajaActiva(data.caja);
        setTienePreCorte(data.tienePreCorte || false);
        setShowAbrirCaja(false);
        setMontoInicial("");
        setNotasApertura("");
        loadAllCajas();
      } else {
        toast.error(data.error || "Error al abrir caja");
      }
    } catch (error) {
      console.error("Error abriendo caja:", error);
      toast.error("Error al abrir caja");
    } finally {
      setLoading(false);
    }
  };

  const handleCerrarCaja = async (esCorteTotal = false) => {
    if (!cajaActiva) return;
    const camposRequeridos = [totalVentasGeneradas, recargas, sobrante, certificados, 
                               serviciosMedicos, cobrosConTarjeta, valeAzul, devoluciones, transferencias];
    if (camposRequeridos.some(v => v === "" || v === undefined || v === null || isNaN(parseFloat(v)))) {
      toast.error("Completa todos los campos del corte");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas/${cajaActiva.id}/cerrar`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            totalVentasGeneradas: parseFloat(totalVentasGeneradas),
            recargas: parseFloat(recargas),
            sobrante: parseFloat(sobrante),
            certificados: parseFloat(certificados),
            serviciosMedicos: parseFloat(serviciosMedicos),
            cobrosConTarjeta: parseFloat(cobrosConTarjeta),
            valeAzul: parseFloat(valeAzul),
            devoluciones: parseFloat(devoluciones),
            transferencias: parseFloat(transferencias),
            fondo: parseFloat(fondo),
            notasCierre,
            tipoCorte: esCorteTotal ? "corteTotal" : "preCorte",
            cerrarOtrasCajas: esCorteTotal,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(esCorteTotal ? "Corte total realizado exitosamente" : "Pre-corte realizado exitosamente");
        if (!esCorteTotal) {
          setPreCorteRealizado(data.caja);
          setShowPrintPreCorte(true);
        }
        if (esCorteTotal) {
          // Obtener TODOS los cortes del día incluyendo pre-cortes
          const cajasResp = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas`,
            { headers: { Authorization: `Bearer ${publicAnonKey}` } }
          );
          const cajasData = await cajasResp.json();
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          const todosCortes = (cajasData.cajas || []).filter((c: any) => {
            if (!c.fechaCierre) return false;
            // Incluir snapshots de pre-cortes de esta sucursal
            const sucursalCorrecta = c.sucursalId === (assignedSucursalId || user.sucursalId);
            if (!sucursalCorrecta) return false;
            // Excluir cajas sin datos de corte (solo abiertas sin cerrar)
            if (c.estado === "abierta") return false;
            const fecha = new Date(c.fechaCierre);
            fecha.setHours(0, 0, 0, 0);
            return fecha.getTime() === hoy.getTime();
          }).sort((a: any, b: any) => 
            new Date(a.fechaCierre || "").getTime() - new Date(b.fechaCierre || "").getTime()
          );
          console.log("CORTE TOTAL CAJA:", data.caja?.serviciosMedicos, data.caja?.tipoCorte);
          console.log("TODOS CORTES:", todosCortes.map((c:any) => ({id: c.id.substring(0,20), tipo: c.tipoCorte, servicios: c.serviciosMedicos})));
          setCorteTotalRealizado({
            caja: data.caja,
            cortesDelDia: todosCortes,
            fecha: new Date(),
          });
          setShowPrintCorteTotal(true);
        }
        setCajaActiva(null);
        setShowCerrarCaja(false);
        setShowCorteTotal(false);
        setTienePreCorte(false);
        // Limpiar todos los campos
        setTotalVentasGeneradas("");
        setRecargas("");
        setSobrante("");
        setCertificados("");
        setServiciosMedicos("");
        setCobrosConTarjeta("");
        setValeAzul("");
        setDevoluciones("");
        setTransferencias("");
        setNotasCierre("");
        loadAllCajas();
      } else {
        toast.error(data.error || "Error al cerrar caja");
      }
    } catch (error) {
      console.error("Error cerrando caja:", error);
      toast.error("Error al cerrar caja");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarCierreDiario = async () => {
    // Usar el nuevo endpoint que cierra TODAS las cajas de la sucursal automáticamente
    setLoading(true);
    try {
      // Llamar al endpoint de cierre diario
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas/cierre-diario/${assignedSucursalId || user.sucursalId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      
      if (!data.success) {
        toast.error(data.error || "Error al procesar cierre diario");
        setLoading(false);
        return;
      }
      
      // Guardar las cajas cerradas para mostrarlas en el modal
      setCajasCerradasDiario(data.cajas || []);
      
      // Actualizar estado local
      setCajaActiva(null);
      
      // Recargar todas las cajas
      await loadAllCajas();
      
      // Confirmar visualmente
      setCierreDiarioConfirmado(true);
      toast.success(data.message || "Cierre diario completado exitosamente");

    } catch (error) {
      console.error("Error en cierre diario:", error);
      toast.error("Ocurrió un error al procesar el cierre diario");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCorte = (caja: Caja) => {
    try {
      // Crear ventana de impresión
      const printWindow = window.open("", "_blank", "width=800,height=600");
      if (!printWindow) {
        toast.error("Permite las ventanas emergentes para imprimir");
        return;
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Corte de Caja - ${sucursal?.nombre}</title>
            <style>
              @page { margin: 0; size: 80mm auto; }
              body { 
                font-family: 'Courier New', Courier, monospace; 
                width: 76mm;
                margin: 0 auto; 
                padding: 3mm 2mm; 
                font-size: 13px;
                font-weight: bold;
                color: #000;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .header { text-align: center; margin-bottom: 8px; }
              .header h2 { margin: 0; font-size: 18px; font-weight: bold; }
              .header p { margin: 3px 0; font-size: 13px; }
              .divider { border-top: 2px solid #000; margin: 8px 0; }
              .section-title { font-weight: bold; text-align: center; margin: 5px 0; font-size: 14px; text-decoration: underline; }
              .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
              .total-row { display: flex; justify-content: space-between; margin: 6px 0; font-weight: bold; border-top: 2px solid #000; padding-top: 5px; font-size: 14px; }
              .grand-total { 
                text-align: center; 
                font-size: 20px; 
                font-weight: bold; 
                margin: 12px 0; 
                border: 3px solid #000; 
                padding: 10px; 
              }
              .signature { text-align: center; margin-top: 40px; }
              .signature-line { border-top: 2px solid #000; width: 80%; margin: 0 auto; margin-top: 30px; }
              
              @media print {
                body { width: 76mm; padding: 2mm; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Call Center</h2>
              <p>SUCURSAL: ${sucursal?.nombre?.toUpperCase()}</p>
              <p>CORTE DE CAJA PARCIAL</p>
              <p style="font-size: 14px; font-weight: bold;">CAJA #${caja.numeroCaja || 1}</p>
              <div class="divider"></div>
              <p>Fecha: ${new Date(caja.fechaCierre!).toLocaleString("es-MX")}</p>
              <p>Farmacéutico: ${user.name}</p>
            </div>
            
            <div class="divider"></div>
            
            <div class="row">
              <span>Monto Inicial:</span>
              <span>$${caja.montoInicial.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Apertura:</span>
              <span>${new Date(caja.fechaApertura).toLocaleTimeString("es-MX")}</span>
            </div>

            <div class="divider"></div>
            <div class="section-title">SUMAN (+)</div>
            <div class="row">
              <span>Ventas Farmacia:</span>
              <span>$${(caja.totalVentasGeneradas || 0).toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Servicios Médicos:</span>
              <span>$${(caja.serviciosMedicos || 0).toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Recargas:</span>
              <span>$${(caja.recargas || 0).toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Sobrante:</span>
              <span>$${(caja.sobrante || 0).toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Otro:</span>
              <span>$${(caja.certificados || 0).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>TOTAL SUMAN:</span>
              <span>$${(caja.totalSuman || 0).toFixed(2)}</span>
            </div>

            <div class="divider"></div>
            <div class="section-title">RESTAN (-)</div>
            <div class="row">
              <span>Cobros Tarjeta:</span>
              <span>$${(caja.cobrosConTarjeta || 0).toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Gastos:</span>
              <span>$${(caja.valeAzul || 0).toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Devoluciones:</span>
              <span>$${(caja.devoluciones || 0).toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Transferencias:</span>
              <span>$${(caja.transferencias || 0).toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Serv. Médicos:</span>
              <span>$${(caja.serviciosMedicos || 0).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>TOTAL RESTAN:</span>
              <span>$${(caja.totalRestan || 0).toFixed(2)}</span>
            </div>

            <div class="grand-total">
              EFECTIVO A ENTREGAR<br>
              $${(caja.efectivoAEntregar || 0).toFixed(2)}
            </div>

            ${caja.notasCierre ? `
              <div class="divider"></div>
              <p><strong>NOTAS:</strong></p>
              <p>${caja.notasCierre}</p>
            ` : ''}

            <div class="signature">
              <div class="signature-line"></div>
              <p>Nombre</p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; font-size: 10px;">
              <p>*** FIN DEL REPORTE ***</p>
            </div>
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
    } catch (error) {
      console.error("Error al imprimir:", error);
      toast.error("Error al intentar imprimir");
    }
  };

  // Calcular estadísticas de la caja activa
  const calcularEstadisticas = (soloVespertino = false) => {
    if (!cajaActiva || !cajaActiva.ventas || !cajaActiva.servicios) {
      return {
        totalEfectivo: 0, totalTarjeta: 0, totalTransferencia: 0,
        totalVentas: 0, totalServicios: 0, numeroVentas: 0, numeroServicios: 0,
        totalVentasGeneradas: 0, recargas: 0, certificados: 0,
        cobrosConTarjeta: 0, transferencias: 0, devoluciones: 0,
        ventasFarmacia: 0, ventasServicios: 0, totalGenerado: 0,
      };
    }

    // Separador exacto: fechaReapertura para vespertino (sin conversión de zona horaria)
    const fechaFiltro = soloVespertino && cajaActiva.fechaReapertura
      ? new Date(cajaActiva.fechaReapertura).getTime()
      : new Date(cajaActiva.fechaApertura).getTime();

    // Pre-corte toma TODAS las ventas de la caja (sin filtro de fecha adicional)
    // Corte total filtra solo desde fechaReapertura
    const ventasFiltradas = soloVespertino && cajaActiva.fechaReapertura
      ? cajaActiva.ventas.filter((v: any) =>
          new Date(v.fecha).getTime() >= new Date(cajaActiva.fechaReapertura).getTime()
        )
      : cajaActiva.ventas; // Pre-corte: todas las ventas

    let totalEfectivo = 0;
    let totalTarjeta = 0;
    let totalTransferencia = 0;
    let ventasFarmacia = 0;
    let ventasServicios = 0;

    ventasFiltradas.forEach((venta: any) => {
      const monto = parseFloat(venta.total) || 0;
      const esServicio = (venta.productos || []).length > 0 &&
        (venta.productos || []).every((p: any) => String(p.productoId || "").startsWith("SERVICE-"));

      if (esServicio) {
        ventasServicios += monto;
      } else {
        ventasFarmacia += monto;
      }

      if (venta.metodoPago === "efectivo") {
        totalEfectivo += monto;
      } else if (venta.metodoPago === "tarjeta") {
        totalTarjeta += monto;
      } else if (venta.metodoPago === "transferencia") {
        totalTransferencia += monto;
      } else if (venta.metodoPago === "dividido" && venta.detallesPagoDividido?.pagos) {
        venta.detallesPagoDividido.pagos.forEach((pago: any) => {
          const m = parseFloat(pago.monto) || 0;
          if (pago.metodo === "efectivo") totalEfectivo += m;
          else if (pago.metodo === "tarjeta") totalTarjeta += m;
          else if (pago.metodo === "transferencia") totalTransferencia += m;
        });
      }
    });

    // Devoluciones filtradas por período
    const devolucionesFiltradas = (cajaActiva.devoluciones || []).filter((v: any) => {
      const fechaDev = new Date(v.fechaDevolucion || v.fecha || "").getTime();
      return fechaDev >= fechaFiltro;
    }).reduce((sum: number, v: any) => sum + (parseFloat(v.total) || 0), 0);

    return {
      totalEfectivo, totalTarjeta, totalTransferencia,
      totalVentas: ventasFarmacia + ventasServicios,
      totalServicios: ventasServicios,
      numeroVentas: ventasFiltradas.filter((v: any) =>
        !(v.productos || []).every((p: any) => String(p.productoId || "").startsWith("SERVICE-"))
      ).length,
      numeroServicios: ventasFiltradas.filter((v: any) =>
        (v.productos || []).every((p: any) => String(p.productoId || "").startsWith("SERVICE-"))
      ).length,
      totalVentasGeneradas: ventasFarmacia,
      recargas: 0,
      certificados: 0,
      cobrosConTarjeta: totalTarjeta,
      transferencias: totalTransferencia,
      devoluciones: devolucionesFiltradas,
      ventasFarmacia,
      ventasServicios,
      totalGenerado: ventasFarmacia + ventasServicios,
    };
  };
    
  const stats = calcularEstadisticas();
  
  // SUMAN: VentasFarmacia + ServiciosMedicos + Recargas + Sobrante + Otro + (PreCorte si es corteTotal)
  const totalSumanCalc = 
    (parseFloat(totalVentasGeneradas) || 0) + 
    (parseFloat(serviciosMedicos) || 0) +
    (parseFloat(recargas) || 0) + 
    (parseFloat(sobrante) || 0) +
    (parseFloat(certificados) || 0) +
    (showCorteTotal ? (parseFloat(preCorteEfectivo) || 0) : 0);
  
  // RESTAN: Tarjeta + Gastos + Devoluciones + Transferencias + ServiciosMedicos
  const totalRestanCalc = 
    (parseFloat(cobrosConTarjeta) || 0) + 
    (parseFloat(valeAzul) || 0) + 
    (parseFloat(devoluciones) || 0) + 
    (parseFloat(transferencias) || 0) +
    (parseFloat(serviciosMedicos) || 0);
  
  const efectivoAEntregarCalc = totalSumanCalc - totalRestanCalc;

  // Corte Final del Día — consolidado completo (mat + vesp)
  const calcularCorteFinaDelDia = () => {
    const snap = preCorteData;
    // SUMAN
    const ventasFarmacia  = (snap?.totalVentasGeneradas || 0) + (parseFloat(totalVentasGeneradas) || 0);
    const serviciosMed    = (snap?.serviciosMedicos || 0)     + (parseFloat(serviciosMedicos) || 0);
    const recargasTotal   = (snap?.recargas || 0)             + (parseFloat(recargas) || 0);
    const sobranteTotal   = (snap?.sobrante || 0)             + (parseFloat(sobrante) || 0);
    const otroTotal       = (snap?.certificados || 0)         + (parseFloat(certificados) || 0);
    const totalSuman      = ventasFarmacia + serviciosMed + recargasTotal + sobranteTotal + otroTotal;
    // RESTAN
    const tarjetaTotal    = (snap?.cobrosConTarjeta || 0) + (parseFloat(cobrosConTarjeta) || 0);
    const gastosTotal     = (snap?.valeAzul || 0)         + (parseFloat(valeAzul) || 0);
    const devolucionesT   = (snap?.devoluciones || 0)     + (parseFloat(devoluciones) || 0);
    const transferenciasT = (snap?.transferencias || 0)   + (parseFloat(transferencias) || 0);
    const totalRestan     = tarjetaTotal + gastosTotal + devolucionesT + transferenciasT + serviciosMed;
    return {
      ventasFarmacia, serviciosMed, recargasTotal, sobranteTotal, otroTotal, totalSuman,
      tarjetaTotal, gastosTotal, devolucionesT, transferenciasT, totalRestan,
      totalEntregado: totalSuman - totalRestan,
    };
  };

  // Obtener los cortes del día actual
  const getCortesDelDia = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    return historialCajas.filter((caja) => {
      if (!caja.fechaCierre) return false;
      const fechaCierre = new Date(caja.fechaCierre);
      fechaCierre.setHours(0, 0, 0, 0);
      return fechaCierre.getTime() === hoy.getTime();
    });
  };

  const cortesDelDia = getCortesDelDia();

  // Calcular totales del día
  const calcularTotalesDelDia = () => {
    // Ordenar cortes por fecha de cierre ascendente
    const cortesOrdenados = [...cortesDelDia].sort((a, b) => 
      new Date(a.fechaCierre || "").getTime() - new Date(b.fechaCierre || "").getTime()
    );
    
    // El efectivo final del día es el efectivoAEntregar del ÚLTIMO corte
    // Los cortes intermedios ya incluyen el fondo del corte anterior
    const ultimoCorte = cortesOrdenados[cortesOrdenados.length - 1];
    
    // Sumar solo ventas y servicios reales (sin fondos duplicados)
    const ventasReales = cortesOrdenados.reduce((sum, c) => sum + (c.totalVentasGeneradas || 0), 0);
    const serviciosReales = cortesOrdenados.reduce((sum, c) => sum + (c.serviciosMedicos || 0), 0);
    const recargasReales = cortesOrdenados.reduce((sum, c) => sum + (c.recargas || 0), 0);
    const cobrosTargeta = cortesOrdenados.reduce((sum, c) => sum + (c.cobrosConTarjeta || 0), 0);
    const transferenciasTotal = cortesOrdenados.reduce((sum, c) => sum + (c.transferencias || 0), 0);
    const devolucionesTotal = cortesOrdenados.reduce((sum, c) => sum + (c.devoluciones || 0), 0);
    const valeAzulTotal = cortesOrdenados.reduce((sum, c) => sum + (c.valeAzul || 0), 0);
    const certificadosTotal = cortesOrdenados.reduce((sum, c) => sum + (c.certificados || 0), 0);
    const sobranteTotal = cortesOrdenados.reduce((sum, c) => sum + (c.sobrante || 0), 0);
    
    // El fondo inicial del día es el montoInicial del PRIMER corte
    const fondoInicial = cortesOrdenados[0]?.montoInicial || 0;
    
    const totalRestan = cobrosTargeta + valeAzulTotal + devolucionesTotal + transferenciasTotal;
    const totalSuman = ventasReales + serviciosReales + recargasReales + 
                       certificadosTotal + sobranteTotal + fondoInicial;
    const efectivoFinal = totalSuman - totalRestan;

    return {
      totalSuman,
      totalRestan,
      efectivoTotal: efectivoFinal,
      totalVentasGeneradas: ventasReales,
      recargas: recargasReales,
      sobrante: sobranteTotal,
      certificados: certificadosTotal,
      serviciosMedicos: serviciosReales,
      cobrosConTarjeta: cobrosTargeta,
      valeAzul: valeAzulTotal,
      devoluciones: devolucionesTotal,
      transferencias: transferenciasTotal,
      fondoInicial,
    };
  };


  // Desglose de ventas de PRODUCTOS agrupadas por CUENTA.
  // Recibe una lista de cortes (cajas) y suma las ventas de sus arrays .ventas.
  // Combina los desglosePorCuenta ya guardados en cada corte (calculados por el backend al cerrar).
  const calcularDesglosePorCuenta = (cortes: Caja[]) => {
    const acum: Record<string, { cuenta: string; total: number; efectivo: number; tarjeta: number; transferencia: number }> = {};
    for (const corte of (cortes || [])) {
      const desg = (corte as any)?.desglosePorCuenta || [];
      for (const d of desg) {
        const nombre = (d.cuenta && String(d.cuenta).trim()) || "Sin cuenta";
        if (!acum[nombre]) acum[nombre] = { cuenta: nombre, total: 0, efectivo: 0, tarjeta: 0, transferencia: 0 };
        acum[nombre].total += Number(d.total) || 0;
        acum[nombre].efectivo += Number(d.efectivo) || 0;
        acum[nombre].tarjeta += Number(d.tarjeta) || 0;
        acum[nombre].transferencia += Number(d.transferencia) || 0;
      }
    }
    return Object.values(acum).sort((a, b) => b.total - a.total);
  };

  // Imprime un ticket con formato de corte, pero para UNA cuenta especifica.
  // El titulo del ticket es el nombre de la cuenta.
  const printTicketPorCuenta = (
    ct: { cuenta: string; total: number; efectivo: number; tarjeta: number; transferencia: number },
    fecha: Date
  ) => {
    try {
      const printWindow = window.open("", "_blank", "width=800,height=600");
      if (!printWindow) {
        toast.error("Permite las ventanas emergentes para imprimir");
        return;
      }
      const fechaStr = fecha.toLocaleDateString("es-MX", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      const html = `
        <html>
          <head>
            <title>${ct.cuenta}</title>
            <style>
              @page { margin: 0; }
              body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 10px; font-size: 12px; color: #000; }
              .header { text-align: center; margin-bottom: 10px; }
              .header h2 { margin: 0; font-size: 16px; font-weight: bold; }
              .header p { margin: 2px 0; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              .section-title { font-weight: bold; text-align: center; margin: 5px 0; background: #eee; }
              .row { display: flex; justify-content: space-between; margin: 3px 0; }
              .total-row { display: flex; justify-content: space-between; margin: 6px 0; font-weight: bold; border-top: 1px dashed #000; padding-top: 6px; }
              .grand-total { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0; border: 2px solid #000; padding: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${ct.cuenta}</h2>
              <p>${sucursal?.nombre || ""}</p>
              <p>${fechaStr}</p>
            </div>
            <div class="divider"></div>
            <div class="section-title">DESGLOSE POR FORMA DE PAGO</div>
            <div class="row"><span>Efectivo</span><span>$${ct.efectivo.toFixed(2)}</span></div>
            <div class="row"><span>Tarjeta</span><span>$${ct.tarjeta.toFixed(2)}</span></div>
            <div class="row"><span>Transferencia</span><span>$${ct.transferencia.toFixed(2)}</span></div>
            <div class="total-row"><span>TOTAL DE VENTAS</span><span>$${ct.total.toFixed(2)}</span></div>
            <div class="grand-total">${ct.cuenta}<br/>$${ct.total.toFixed(2)}</div>
            <div class="divider"></div>
            <p style="text-align:center;font-size:10px">Ventas de productos relacionadas a esta cuenta</p>
          </body>
        </html>`;
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); }, 300);
    } catch {
      toast.error("Error al imprimir el ticket de la cuenta");
    }
  };


  const totalesDelDia = calcularTotalesDelDia();

  const printTicketCierreDiario = (cortesIn: Caja[], fecha: Date) => {
    try {
      // Ordenar cortes por fecha ascendente (más antiguos primero)
      const cortes = [...cortesIn].sort((a, b) => {
        if (!a.fechaCierre || !b.fechaCierre) return 0;
        return new Date(a.fechaCierre).getTime() - new Date(b.fechaCierre).getTime();
      });

      const printWindow = window.open("", "_blank", "width=800,height=600");
      if (!printWindow) {
        toast.error("Permite las ventanas emergentes para imprimir");
        return;
      }

      const fechaStr = fecha.toLocaleDateString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Calcular totales para este grupo de cortes
      const totales = cortes.reduce(
        (acc, caja) => ({
          totalSuman: acc.totalSuman + (caja.totalSuman || 0),
          totalRestan: acc.totalRestan + (caja.totalRestan || 0),
          efectivoTotal: acc.efectivoTotal + (caja.efectivoAEntregar || 0),
          totalVentasGeneradas: acc.totalVentasGeneradas + (caja.totalVentasGeneradas || 0),
          recargas: acc.recargas + (caja.recargas || 0),
          sobrante: acc.sobrante + (caja.sobrante || 0),
          certificados: acc.certificados + (caja.certificados || 0),
          serviciosMedicos: acc.serviciosMedicos + (caja.serviciosMedicos || 0),
          cobrosConTarjeta: acc.cobrosConTarjeta + (caja.cobrosConTarjeta || 0),
          valeAzul: acc.valeAzul + (caja.valeAzul || 0),
          devoluciones: acc.devoluciones + (caja.devoluciones || 0),
          transferencias: acc.transferencias + (caja.transferencias || 0),
        }),
        {
          totalSuman: 0,
          totalRestan: 0,
          efectivoTotal: 0,
          totalVentasGeneradas: 0,
          recargas: 0,
          sobrante: 0,
          certificados: 0,
          serviciosMedicos: 0,
          cobrosConTarjeta: 0,
          valeAzul: 0,
          devoluciones: 0,
          transferencias: 0,
        }
      );

      // Agrupar cortes por número de caja
      const cortesPorCaja = cortes.reduce((acc, caja) => {
        const num = caja.numeroCaja || 1;
        if (!acc[num]) {
          acc[num] = {
            totalSuman: 0,
            totalRestan: 0,
            efectivo: 0,
            ventas: 0,
            servicios: 0,
            cortes: []
          };
        }
        acc[num].totalSuman += (caja.totalSuman || 0);
        acc[num].totalRestan += (caja.totalRestan || 0);
        acc[num].efectivo += (caja.efectivoAEntregar || 0);
        acc[num].ventas += (caja.totalVentas || 0);
        acc[num].servicios += (caja.totalServicios || 0);
        acc[num].cortes.push(caja);
        return acc;
      }, {} as Record<number, any>);

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cierre de Caja Diario - ${sucursal?.nombre}</title>
            <style>
              @page { margin: 0; }
              body { 
                font-family: 'Courier New', Courier, monospace; 
                width: 80mm; 
                margin: 0 auto; 
                padding: 10px; 
                font-size: 12px;
                color: #000;
              }
              .header { text-align: center; margin-bottom: 10px; }
              .header h2 { margin: 0; font-size: 16px; font-weight: bold; }
              .header p { margin: 2px 0; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              .section-title { font-weight: bold; text-align: center; margin: 5px 0; background: #eee; }
              .row { display: flex; justify-between; margin: 2px 0; }
              .total-row { display: flex; justify-between; margin: 5px 0; font-weight: bold; border-top: 1px dashed #000; padding-top: 5px; }
              .grand-total { 
                text-align: center; 
                font-size: 16px; 
                font-weight: bold; 
                margin: 15px 0; 
                border: 2px solid #000; 
                padding: 10px; 
              }
              .caja-block { margin: 10px 0; border: 1px dotted #000; padding: 5px; }
              .caja-title { font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 5px; }
              .corte-header { font-weight: bold; margin-top: 5px; border-bottom: 1px dotted #ccc; font-size: 11px; }
              .corte-row { display: flex; justify-between; margin-left: 10px; font-size: 10px; }
              .signature { text-align: center; margin-top: 40px; }
              .signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; margin-top: 30px; }
              
              @media print {
                body { width: 100%; padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Call Center</h2>
              <p>SUCURSAL: ${sucursal?.nombre?.toUpperCase()}</p>
              <p>CIERRE DIARIO GLOBAL</p>
              <div class="divider"></div>
              <p>Fecha: ${fechaStr}</p>
              <p>Farmacéutico: ${user.name}</p>
              <p>Total Cortes: ${cortes.length}</p>
            </div>
            
            <div class="grand-total">
              TOTAL GENERADO SUCURSAL<br>
              $${totales.totalSuman.toFixed(2)}
            </div>

            <div class="divider"></div>
            <div class="section-title">RESUMEN POR CAJA</div>
            ${Object.keys(cortesPorCaja).map(num => `
              <div class="caja-block">
                <div class="caja-title">CAJA #${num}</div>
                <div class="row">
                  <span>Total SUMAN:</span>
                  <span>$${cortesPorCaja[num].totalSuman.toFixed(2)}</span>
                </div>
                <div class="row">
                  <span>Total RESTAN:</span>
                  <span>$${cortesPorCaja[num].totalRestan.toFixed(2)}</span>
                </div>
                <div class="row" style="font-weight: bold;">
                  <span>EFECTIVO:</span>
                  <span>$${cortesPorCaja[num].efectivo.toFixed(2)}</span>
                </div>
              </div>
            `).join('')}

            <div class="divider"></div>
            <div class="section-title">DETALLE DE CORTES</div>
            ${cortes.map((caja, index) => `
              <div class="corte-header">
                CORTE #${index + 1} (CAJA ${caja.numeroCaja || 1}) - ${new Date(caja.fechaCierre!).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div class="corte-row">
                <span>SUMAN:</span>
                <span>$${(caja.totalSuman || 0).toFixed(2)}</span>
              </div>
              <div class="corte-row">
                <span>RESTAN:</span>
                <span>$${(caja.totalRestan || 0).toFixed(2)}</span>
              </div>
              <div class="corte-row" style="font-weight: bold;">
                <span>EFECTIVO:</span>
                <span>$${(caja.efectivoAEntregar || 0).toFixed(2)}</span>
              </div>
            `).join('')}

            <div class="divider"></div>
            <div class="section-title">TOTALES GLOBALES</div>
            
            <div style="font-weight: bold; margin-bottom: 5px;">SUMAN (+)</div>
            <div class="row">
              <span>Ventas Farmacia:</span>
              <span>$${totales.totalVentasGeneradas.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Servicios Méd.:</span>
              <span>$${totales.serviciosMedicos.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Recargas:</span>
              <span>$${totales.recargas.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Sobrante:</span>
              <span>$${totales.sobrante.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Otro:</span>
              <span>$${totales.certificados.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>TOTAL SUMAN:</span>
              <span>$${totales.totalSuman.toFixed(2)}</span>
            </div>

            <div style="font-weight: bold; margin-top: 10px; margin-bottom: 5px;">RESTAN (-)</div>
            <div class="row">
              <span>Tarjeta:</span>
              <span>$${totales.cobrosConTarjeta.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Gastos:</span>
              <span>$${totales.valeAzul.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Devoluciones:</span>
              <span>$${totales.devoluciones.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Transferencias:</span>
              <span>$${totales.transferencias.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>TOTAL RESTAN:</span>
              <span>$${totales.totalRestan.toFixed(2)}</span>
            </div>

            <div class="grand-total" style="margin-top: 20px;">
              TOTAL ENTREGADO EFECTIVO<br>
              $${totales.efectivoTotal.toFixed(2)}
            </div>

            <div class="signature">
              <div class="signature-line"></div>
              <p>Nombre</p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; font-size: 10px;">
              <p>*** FIN DEL REPORTE ***</p>
            </div>
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
    } catch (error) {
      console.error("Error al imprimir:", error);
      toast.error("Error al intentar imprimir");
    }
  };
const handlePrintCorteTotal = (datos: any) => {
    if (!datos) return;
    const { caja, cortesDelDia: cortesPrevios, fecha } = datos;
    // Call Center: impresion por iframe (sin ventana en blanco)

    const fechaStr = fecha.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // Separar pre-cortes y corte total
    const todosMap = new Map();
    [...(cortesPrevios || []), caja].filter(Boolean).forEach((c: any) => {
      todosMap.set(c.id, c);
    });
    const cortesOrdenados = Array.from(todosMap.values()).sort((a: any, b: any) =>
      new Date(a.fechaCierre || "").getTime() - new Date(b.fechaCierre || "").getTime()
    );
    const preCortes = cortesOrdenados.filter((c: any) => c.tipoCorte === "preCorte");
    const corteTotal = cortesOrdenados.find((c: any) => c.tipoCorte === "corteTotal");

    // Efectivo total = suma de todos
    const efectivoPreCortes = preCortes.reduce((sum: number, c: any) => sum + (c.efectivoAEntregar || 0), 0);
    const efectivoVespertino = corteTotal?.efectivoAEntregar || 0;
    const efectivoDia = efectivoPreCortes + efectivoVespertino;

    const COLS = 32;
    const pad = (left: string, right: string, total = COLS) => {
      const esp = total - left.length - right.length;
      return left + (esp > 0 ? " ".repeat(esp) : " ") + right;
    };
    const center = (text: string, total = COLS) => {
      const sp = Math.floor((total - text.length) / 2);
      return " ".repeat(Math.max(0, sp)) + text;
    };
    const divider = "-".repeat(COLS);
    const dividerD = "=".repeat(COLS);

    const bloqueCorte = (c: any, label: string, excluirPreCorte = false) => {
      const sumanReal = excluirPreCorte
        ? (c.totalVentasGeneradas || 0) + (c.serviciosMedicos || 0) +
          (c.recargas || 0) + (c.sobrante || 0) + (c.certificados || 0)
        : (c.totalSuman || 0);
      return [
      center(`--- ${label} ---`),
      pad("Ventas Farmacia:", `$${(c.totalVentasGeneradas || 0).toFixed(2)}`),
      pad("Servicios Medicos:", `$${(c.serviciosMedicos || 0).toFixed(2)}`),
      pad("Recargas:", `$${(c.recargas || 0).toFixed(2)}`),
      pad("Sobrante:", `$${(c.sobrante || 0).toFixed(2)}`),
      pad("Otro:", `$${(c.certificados || 0).toFixed(2)}`),
      divider,
      pad("SUMAN:", `$${sumanReal.toFixed(2)}`),
      divider,
      pad("Tarjeta:", `$${(c.cobrosConTarjeta || 0).toFixed(2)}`),
      pad("Gastos:", `$${(c.valeAzul || 0).toFixed(2)}`),
      pad("Devoluciones:", `$${(c.devoluciones || 0).toFixed(2)}`),
      pad("Transferencias:", `$${(c.transferencias || 0).toFixed(2)}`),
      pad("Serv. Medicos:", `$${(c.serviciosMedicos || 0).toFixed(2)}`),
      divider,
      pad("RESTAN:", `$${(c.totalRestan || 0).toFixed(2)}`),
      divider,
      pad("EFECTIVO:", `$${(c.efectivoAEntregar || 0).toFixed(2)}`),
      "",
    ];};

    const ct = corteTotal || caja || {};
    const totalVentasTicket = (ct.totalVentasGeneradas || 0) + (ct.serviciosMedicos || 0);
    const tarjetaTicket = ct.cobrosConTarjeta || 0;
    const transferenciaTicket = ct.transferencias || 0;
    const efectivoTicket = totalVentasTicket - tarjetaTicket - transferenciaTicket;

    const lineas: string[] = [
      center("Call Center"),
      center(`Sucursal: ${sucursal?.nombre?.toUpperCase() || ""}`),
      center("CORTE DE CAJA"),
      dividerD,
      center(fechaStr),
      dividerD,
      "",
      center("DESGLOSE POR FORMA DE PAGO"),
      divider,
      pad("Efectivo:", `$${efectivoTicket.toFixed(2)}`),
      pad("Tarjeta:", `$${tarjetaTicket.toFixed(2)}`),
      pad("Transferencia:", `$${transferenciaTicket.toFixed(2)}`),
      divider,
      pad("TOTAL DE VENTAS:", `$${totalVentasTicket.toFixed(2)}`),
      dividerD,
      "",
      center("_".repeat(20)),
      center("Firma"),
      "",
      center("*** FIN DEL REPORTE ***"),
    ];

    const printContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Corte Total</title>
  <style>
    @page { margin: 0; size: 80mm auto; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12pt;
      font-weight: bold;
      color: #000;
      width: 76mm;
      margin: 0;
      padding: 2mm 2mm;
      white-space: pre;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      html, body { width: 76mm; }
    }
  </style>
</head>
<body>${lineas.join("\n")}</body>
</html>`;

    // Imprimir con iframe oculto
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) { document.body.removeChild(iframe); return; }
    iframeDoc.open();
    iframeDoc.write(printContent);
    iframeDoc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  };

  const handlePrintCierreDiario = () => {
    printTicketCierreDiario(cortesDelDia, new Date());
  };

  const handleBorrarHistorial = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar TODO el historial de cajas? Esta acción no se puede deshacer y es solo para reiniciar el sistema.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );
      
      const data = await response.json();
      if (data.success) {
        toast.success("Historial de cajas eliminado correctamente");
        setCajaActiva(null);
        setHistorialCajas([]);
        loadAllCajas();
      } else {
        toast.error("Error al eliminar historial");
      }
    } catch (error) {
      console.error("Error eliminando historial:", error);
      toast.error("Error al eliminar historial");
    } finally {
      setLoading(false);
    }
  };

  // Función para agrupar historial por fecha
  const getHistorialPorDias = () => {
    const grupos: Record<string, Caja[]> = {};
    
    historialCajas.forEach(caja => {
      if (!caja.fechaCierre) return;
      // Usar hora CST para agrupar por día
      const fechaCST = toCST(caja.fechaCierre).toLocaleDateString('en-CA');
      if (!grupos[fechaCST]) grupos[fechaCST] = [];
      grupos[fechaCST].push(caja);
    });

    return Object.entries(grupos)
      .map(([fecha, cortes]) => {
        const cortesOrdenados = cortes.sort((a, b) =>
          new Date(a.fechaCierre!).getTime() - new Date(b.fechaCierre!).getTime()
        );
        // Separar pre-cortes y corte total
        const preCortes = cortesOrdenados.filter(c => c.tipoCorte === "preCorte");
        const corteTotal = cortesOrdenados.find(c => c.tipoCorte === "corteTotal");
        // Total efectivo = suma de pre-cortes + corte total (sin duplicar)
        const totalEfectivo = corteTotal
          ? preCortes.reduce((sum, c) => sum + (c.efectivoAEntregar || 0), 0) + (corteTotal.efectivoAEntregar || 0)
          : preCortes.reduce((sum, c) => sum + (c.efectivoAEntregar || 0), 0);
        // Total ventas = suma de todos
        const totalVentas = cortesOrdenados.reduce((sum, c) => sum + (c.totalVentasGeneradas || 0), 0);
        return {
          fecha,
          cortes: cortesOrdenados,
          preCortes,
          corteTotal,
          totales: {
            efectivo: totalEfectivo,
            ventas: totalVentas,
            numCortes: cortesOrdenados.length
          }
        };
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  };


  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Cortes de Caja</h1>
          <p className="text-gray-600">
            {sucursal?.nombre} - {user.name}
          </p>
        </div>
        <div className="flex gap-3">
          {!cajaActiva ? (
            <button
              onClick={() => setShowAbrirCaja(true)}
              className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 font-semibold"
            >
              <DollarSign className="w-5 h-5" />
              Abrir Caja
            </button>
          ) : (
            <div className="flex gap-2">
              {/* Call Center: solo Corte Total, sin pre-corte */}
              <button
                onClick={() => setShowCorteTotal(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold"
              >
                <Check className="w-5 h-5" />
                Corte Total
              </button>
            </div>
          )}
          <button
            onClick={() => setShowHistorial(!showHistorial)}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 font-semibold"
          >
            <Calendar className="w-5 h-5" />
            Historial
          </button>
          {/* Botón Cierre Diario deshabilitado - usar Corte Total */}
          {/* <button
            onClick={() => setShowCierreDiario(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold"
          >
            <Printer className="w-5 h-5" />
            Cierre Diario
          </button> */}
        </div>
      </div>

      {/* Estado de Caja Activa */}
      {cajaActiva ? (
        <div className="space-y-6">
          {/* Información de Apertura */}
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg p-6 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-2">Caja #{cajaActiva.numeroCaja || 1} Abierta</h2>
                <p className="text-teal-100">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Abierta: {new Date(cajaActiva.fechaApertura).toLocaleString("es-MX")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-teal-100">Monto Inicial</p>
                <p className="text-3xl font-bold">${cajaActiva.montoInicial.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Resumen de Transacciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Banknote className="w-6 h-6 text-green-600" />
                <p className="text-sm font-semibold text-green-700">Efectivo</p>
              </div>
              <p className="text-2xl font-bold text-green-900">${stats.totalEfectivo.toFixed(2)}</p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="w-6 h-6 text-blue-600" />
                <p className="text-sm font-semibold text-blue-700">Tarjeta</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">${stats.totalTarjeta.toFixed(2)}</p>
            </div>


            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-purple-600" />
                <p className="text-sm font-semibold text-purple-700">Venta</p>
              </div>
              <p className="text-2xl font-bold text-purple-900">${stats.ventasFarmacia.toFixed(2)}</p>
              <p className="text-xs text-purple-600 mt-1">{stats.numeroVentas} transacciones</p>
            </div>

            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-orange-600" />
                <p className="text-sm font-semibold text-orange-700">Transferencia</p>
              </div>
              <p className="text-2xl font-bold text-orange-900">${stats.totalTransferencia.toFixed(2)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 rounded-lg p-12 text-center">
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">No hay caja abierta</h2>
          <p className="text-gray-600 mb-6">Abre una nueva caja para comenzar a registrar ventas.</p>
          <button
            onClick={() => setShowAbrirCaja(true)}
            className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors font-bold shadow-lg"
          >
            Abrir Caja Nueva
          </button>
        </div>
      )}

      {/* Modal: Abrir Caja */}
      {showAbrirCaja && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Apertura de Caja
            </h3>

            {/* Indicador de sucursal */}
            <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <p className="text-sm text-teal-700 font-medium">
                {sucursal?.nombre} · {numeroCajasConfig} {numeroCajasConfig === 1 ? "caja configurada" : "cajas configuradas"}
              </p>
            </div>
            
            <div className="space-y-4">
              {/* Selector de caja: solo si hay más de 1 */}
              {numeroCajasConfig > 1 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Selecciona tu Caja</label>
                  <div className={`grid gap-2 ${numeroCajasConfig <= 3 ? "grid-cols-3" : "grid-cols-5"}`}>
                    {Array.from({ length: numeroCajasConfig }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        
                        onClick={() => setNumeroCajaSeleccionada(num)}
                        className={`py-3 rounded-lg font-bold border-2 flex flex-col items-center justify-center transition-all ${
                          numeroCajaSeleccionada === num
                            ? "bg-teal-600 text-white border-teal-600 scale-105 shadow-md"
                            : "bg-white text-gray-700 border-gray-300 hover:border-teal-400 hover:bg-teal-50"
                        }`}
                      >
                        <span className="text-lg">{num}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Si solo hay 1 caja, mostrar info sin selector */}
              {numeroCajasConfig === 1 && (
                <div className="p-3 bg-gray-50 rounded-lg border text-center">
                  <p className="text-sm font-semibold text-gray-700">Caja 1</p>
                  <p className="text-xs text-gray-500">Caja única de esta sucursal</p>
                </div>
              )}

              {!cajasAbiertasIds.includes(numeroCajaSeleccionada) && (
                <div className="p-3 bg-gray-50 rounded-lg border text-center">
                  <p className="text-xs text-gray-500">Fondo Inicial</p>
                  <p className="text-lg font-bold text-gray-700">$0.00</p>
                  <p className="text-xs text-gray-400">No aplica fondo para esta sucursal</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Notas (Opcional)</label>
                <textarea
                  value={notasApertura}
                  onChange={(e) => setNotasApertura(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Observaciones iniciales..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAbrirCaja(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAbrirCaja}
                  disabled={loading}
                  className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Abriendo..." : "Abrir Caja"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cerrar Caja / Pre-Corte */}
      {showCerrarCaja && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-800 border-b pb-4">
              <FileText className="w-6 h-6" />
              Pre-Corte — Caja #{cajaActiva?.numeroCaja || 1}
            </h3>

            {/* Cuadro Ventas Generadas */}
            <div className="bg-teal-50 border-2 border-teal-300 rounded-xl p-4 mb-6 text-center">
              <p className="text-sm font-bold text-teal-700 uppercase tracking-wider mb-3">Ventas Generadas</p>
              <p className="text-3xl font-bold text-teal-900">${((parseFloat(totalVentasGeneradas) || 0) + (parseFloat(serviciosMedicos) || 0)).toFixed(2)}</p>
            </div>

            {/* Call Center: panel SUMAN/RESTAN oculto, se usa desglose por forma de pago */}
            {false && (<>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Columna SUMAN */}
              <div className="bg-green-50 p-5 rounded-xl border border-green-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-green-500 text-white p-1 rounded-full">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-green-800 text-lg">SUMAN (+)</h4>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700 flex items-center gap-1">
                      Ventas Farmacia (Productos) *
                      <span className="text-[10px] text-gray-500 font-normal">(Automático)</span>
                    </label>
                    <input
                      type="number"
                      value={totalVentasGeneradas}
                      onChange={(e) => setTotalVentasGeneradas(e.target.value)}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white font-bold text-gray-800"
                      placeholder="0.00"
                      step="0.01"
                      readOnly // Ahora es automático/calculado
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700 flex items-center gap-1">
                      Servicios Médicos *
                      <span className="text-[10px] text-gray-500 font-normal">(Automático)</span>
                    </label>
                    <input
                      type="number"
                      value={serviciosMedicos}
                      readOnly
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 cursor-not-allowed font-semibold text-gray-700"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700 flex items-center gap-1">
                      Recargas *
                    </label>
                    <input
                      type="number"
                      value={recargas}
                      onChange={(e) => setRecargas(e.target.value)}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">
                      Sobrante *
                    </label>
                    <input
                      type="number"
                      value={sobrante}
                      onChange={(e) => setSobrante(e.target.value)}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
                      placeholder="0.00"
                      step="0.01"
                      autoFocus
                    />
                  </div>
{/* Fondo eliminado - no aplica para esta sucursal */}
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700 flex items-center gap-1">
                      Otro *
                    </label>
                    <input
                      type="number"
                      value={certificados}
                      onChange={(e) => setCertificados(e.target.value)}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div className="pt-3 border-t-2 border-green-400">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-green-900">TOTAL SUMAN:</span>
                      <span className="text-xl font-bold text-green-700">
                        ${totalSumanCalc.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna RESTAN */}
              <div className="bg-red-50 p-5 rounded-xl border border-red-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-red-500 text-white p-1 rounded-full">
                    <Minus className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-red-800 text-lg">RESTAN (-)</h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700 flex items-center gap-1">
                      Cobros con Tarjeta *
                      <span className="text-[10px] text-gray-500 font-normal">(Automático)</span>
                    </label>
                    <input
                      type="number"
                      value={cobrosConTarjeta}
                      readOnly
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 cursor-not-allowed font-semibold text-gray-700"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700 flex items-center gap-1">
                      Gastos *
                      <span className="text-[10px] text-gray-500 font-normal">(Automático)</span>
                    </label>
                    <input
                      type="number"
                      value={valeAzul}
                      readOnly
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 cursor-not-allowed font-semibold text-gray-700"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700 flex items-center gap-1">
                      Devoluciones *
                      <span className="text-[10px] text-gray-500 font-normal">(Automático)</span>
                    </label>
                    <input
                      type="number"
                      value={devoluciones}
                      readOnly
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 cursor-not-allowed font-semibold text-gray-700"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700 flex items-center gap-1">
                      Transferencias *
                      <span className="text-[10px] text-gray-500 font-normal">(Automático)</span>
                    </label>
                    <input
                      type="number"
                      value={transferencias}
                      readOnly
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 cursor-not-allowed font-semibold text-gray-700"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700 flex items-center gap-1">
                      Servicios Médicos (para médico) *
                      <span className="text-[10px] text-gray-500 font-normal">(Automático)</span>
                    </label>
                    <input
                      type="number"
                      value={serviciosMedicos}
                      readOnly
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 cursor-not-allowed font-semibold text-gray-700"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div className="pt-3 border-t-2 border-red-400">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-red-900">TOTAL RESTAN:</span>
                      <span className="text-xl font-bold text-red-700">
                        ${totalRestanCalc.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resultado Final */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 mt-6 text-center">
              <p className="text-sm mb-2 opacity-90">EFECTIVO A ENTREGAR</p>
              <p className="text-4xl font-bold">
                ${efectivoAEntregarCalc.toFixed(2)}
              </p>
              <p className="text-xs mt-2 opacity-75">
                (SUMAN - RESTAN)
              </p>
            </div>
            </>)}

            {/* Notas */}
            <div className="mt-6">
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Notas de Cierre (Opcional)
              </label>
              <textarea
                value={notasCierre}
                onChange={(e) => setNotasCierre(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                placeholder="Observaciones al cerrar la caja..."
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCerrarCaja(false);
                  setTotalVentasGeneradas("");
                  setRecargas("");
                  setSobrante("");
                  setCertificados("");
                  setServiciosMedicos("");
                  setCobrosConTarjeta("");
                  setValeAzul("");
                  setDevoluciones("");
                  setTransferencias("");
                  setNotasCierre("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleCerrarCaja(false)}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                {loading ? "Procesando..." : "Cerrar Caja y Generar Corte"}
                <Check className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historial */}
      {showHistorial && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">Historial</h2>
              {historialCajas.length > 0 && (
                <button
                    onClick={handleBorrarHistorial}
                    className="bg-red-100 text-red-700 border border-red-300 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors"
                    title="Eliminar todo el historial para reiniciar pruebas"
                  >
                    Reiniciar Historial (Dev)
                  </button>
              )}
            </div>
            {/* Call Center: toggle de cortes parciales oculto, solo cierres diarios */}
          </div>

          {historialMode === "cortes" ? (
            historialCajas.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No hay cortes de caja registrados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historialCajas.map((caja) => (
                  <div
                    key={caja.id}
                    className="bg-white rounded-lg shadow p-6 border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            CAJA #{caja.numeroCaja || 1}
                          </span>
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          {new Date(caja.fechaCierre!).toLocaleString("es-MX")}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Monto Inicial: ${caja.montoInicial.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePrintCorte(caja)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-semibold"
                      >
                        <Printer className="w-4 h-4" />
                        Imprimir Ticket
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-green-700 font-semibold">TOTAL SUMAN</p>
                        <p className="text-lg font-bold text-green-900">
                          ${(caja.totalSuman || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-xs text-red-700 font-semibold">TOTAL RESTAN</p>
                        <p className="text-lg font-bold text-red-900">
                          ${(caja.totalRestan || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg col-span-2">
                        <p className="text-xs text-blue-700 font-semibold">EFECTIVO ENTREGADO</p>
                        <p className="text-2xl font-bold text-blue-900">
                          ${(caja.efectivoAEntregar || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {caja.notasCierre && (
                      <div className="bg-gray-50 rounded-lg p-3 mt-4">
                        <p className="text-xs text-gray-600 mb-1 font-semibold">Notas:</p>
                        <p className="text-sm text-gray-800">{caja.notasCierre}</p>
                      </div>
                    )}
                    
                    {/* Desglose Detallado */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-2">
                          Ver Desglose Completo
                          <Plus className="w-4 h-4 group-open:hidden" />
                          <Minus className="w-4 h-4 hidden group-open:block" />
                        </summary>
                        <div className="mt-4 space-y-3">
                          {/* Grid Suman + Restan */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* SUMAN */}
                            <div className="bg-green-50 rounded-lg p-3">
                              <div className="flex items-center gap-1.5 mb-3">
                                <Plus className="w-3.5 h-3.5 text-green-700" />
                                <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Suman</span>
                              </div>
                              <div className="space-y-2">
                                {[
                                  { label: "Ventas Farmacia", value: caja.totalVentasGeneradas || 0 },
                                  { label: "Servicios Médicos", value: caja.serviciosMedicos || 0 },
                                  { label: "Recargas", value: caja.recargas || 0 },
                                  { label: "Fondo", value: caja.fondo || caja.montoInicial || 0 },
                                  { label: "Sobrante", value: caja.sobrante || 0 },
                                  { label: "Otro", value: caja.certificados || 0 },
                                ].map(({ label, value }) => (
                                  <div key={label} className="flex justify-between text-xs">
                                    <span className="text-green-800">{label}</span>
                                    <span className="font-semibold text-green-900">${value.toFixed(2)}</span>
                                  </div>
                                ))}
                                <div className="border-t border-green-300 pt-2 flex justify-between">
                                  <span className="text-xs font-bold text-green-800">Total Suman</span>
                                  <span className="text-sm font-bold text-green-700">${(caja.totalSuman || 0).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            {/* RESTAN */}
                            <div className="bg-red-50 rounded-lg p-3">
                              <div className="flex items-center gap-1.5 mb-3">
                                <Minus className="w-3.5 h-3.5 text-red-700" />
                                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Restan</span>
                              </div>
                              <div className="space-y-2">
                                {[
                                  { label: "Cobros con Tarjeta", value: caja.cobrosConTarjeta || 0 },
                                  { label: "Devoluciones", value: caja.devoluciones || 0 },
                                  { label: "Gastos", value: caja.valeAzul || 0 },
                                  { label: "Transferencias", value: caja.transferencias || 0 },
                                  { label: "Servicios Médicos", value: caja.serviciosMedicos || 0 },
                                ].map(({ label, value }) => (
                                  <div key={label} className="flex justify-between text-xs">
                                    <span className="text-red-800">{label}</span>
                                    <span className="font-semibold text-red-900">${value.toFixed(2)}</span>
                                  </div>
                                ))}
                                <div className="border-t border-red-300 pt-2 flex justify-between">
                                  <span className="text-xs font-bold text-red-800">Total Restan</span>
                                  <span className="text-sm font-bold text-red-700">${(caja.totalRestan || 0).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Efectivo Generado */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
                            <span className="text-sm font-semibold text-blue-800">
                              Efectivo Generado
                            </span>
                            <span className="text-xl font-bold text-blue-700">
                              ${(caja.efectivoAEntregar || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // VISTA DE CIERRES DIARIOS
            <div className="space-y-6">
              {getHistorialPorDias().length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hay registros de días anteriores</p>
                </div>
              ) : (
                getHistorialPorDias().map((grupo, idx) => {
                  const fechaObj = new Date(grupo.fecha + 'T12:00:00');
                  return (
                    <div key={idx} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 capitalize">
                            {fechaObj.toLocaleDateString("es-MX", {
                              weekday: "long", year: "numeric", month: "long", day: "numeric",
                            })}
                          </h3>
                          <p className="text-sm text-gray-500">{grupo.totales.numCortes} cortes realizados</p>
                        </div>
                        <button
                          onClick={() => handlePrintCorteTotal({ caja: grupo.corteTotal, cortesDelDia: grupo.cortes, fecha: fechaObj })}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold shadow-sm"
                        >
                          <Printer className="w-5 h-5" />
                          Imprimir Reporte Diario
                        </button>
                      </div>
                      
                      <div className="p-6 space-y-4">


                        {/* Desglose por turno */}
                        <details className="group">
                          <summary className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-2">
                            Ver desglose del día
                            <Plus className="w-4 h-4 group-open:hidden" />
                            <Minus className="w-4 h-4 hidden group-open:block" />
                          </summary>
                          <div className="mt-4 space-y-4">
                            {/* Pre-cortes */}
                            {grupo.preCortes.map((c, i) => (
                              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                  <span className="text-xs font-semibold text-gray-600">Turno matutino — Pre-Corte</span>
                                  <span className="text-xs text-gray-400">
                                    {toCST(c.fechaApertura).toLocaleTimeString("es-MX", {hour:'2-digit', minute:'2-digit'})} → {toCST(c.fechaCierre!).toLocaleTimeString("es-MX", {hour:'2-digit', minute:'2-digit'})}
                                  </span>
                                </div>
                                <div className="p-3">
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Desglose por forma de pago</div>
                                    <div className="space-y-1.5">
                                      {(() => {
                                        const totalV = (c.totalVentasGeneradas || 0) + (c.serviciosMedicos || 0);
                                        const tarjeta = c.cobrosConTarjeta || 0;
                                        const transf = c.transferencias || 0;
                                        const efectivo = totalV - tarjeta - transf;
                                        return [
                                          { label: "Efectivo", value: efectivo },
                                          { label: "Tarjeta", value: tarjeta },
                                          { label: "Transferencia", value: transf },
                                        ].map(({ label, value }) => (
                                          <div key={label} className="flex justify-between text-xs">
                                            <span className="text-gray-700">{label}</span>
                                            <span className="font-semibold text-gray-900">${value.toFixed(2)}</span>
                                          </div>
                                        ));
                                      })()}
                                      <div className="border-t border-gray-300 pt-1.5 flex justify-between">
                                        <span className="text-xs font-bold text-gray-800">Total de ventas</span>
                                        <span className="text-sm font-bold text-gray-900">${((c.totalVentasGeneradas || 0) + (c.serviciosMedicos || 0)).toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="mx-3 mb-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex justify-between items-center">
                                  <span className="text-xs font-semibold text-blue-800">Efectivo generado (Matutino)</span>
                                  <span className="text-base font-bold text-blue-700">${(c.efectivoAEntregar || 0).toFixed(2)}</span>
                                </div>
                              </div>
                            ))}

                            {/* Corte Total vespertino — sin pre-corte en suman */}
                            {grupo.corteTotal && (
                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                  <span className="text-xs font-semibold text-gray-600">Corte Total</span>
                                  <span className="text-xs text-gray-400">
                                    {grupo.corteTotal.fechaReapertura 
                                      ? toCST(grupo.corteTotal.fechaReapertura).toLocaleTimeString("es-MX", {hour:'2-digit', minute:'2-digit'})
                                      : toCST(grupo.corteTotal.fechaApertura).toLocaleTimeString("es-MX", {hour:'2-digit', minute:'2-digit'})
                                    } → {toCST(grupo.corteTotal.fechaCierre!).toLocaleTimeString("es-MX", {hour:'2-digit', minute:'2-digit'})}
                                  </span>
                                </div>
                                <div className="p-3">
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Desglose por forma de pago</div>
                                    <div className="space-y-1.5">
                                      {(() => {
                                        const totalV = (grupo.corteTotal.totalVentasGeneradas || 0) + (grupo.corteTotal.serviciosMedicos || 0);
                                        const tarjeta = grupo.corteTotal.cobrosConTarjeta || 0;
                                        const transf = grupo.corteTotal.transferencias || 0;
                                        const efectivo = totalV - tarjeta - transf;
                                        return [
                                          { label: "Efectivo", value: efectivo },
                                          { label: "Tarjeta", value: tarjeta },
                                          { label: "Transferencia", value: transf },
                                        ].map(({ label, value }) => (
                                          <div key={label} className="flex justify-between text-xs">
                                            <span className="text-gray-700">{label}</span>
                                            <span className="font-semibold text-gray-900">${value.toFixed(2)}</span>
                                          </div>
                                        ));
                                      })()}
                                      <div className="border-t border-gray-300 pt-1.5 flex justify-between">
                                        <span className="text-xs font-bold text-gray-800">Total de ventas</span>
                                        <span className="text-sm font-bold text-gray-900">${((grupo.corteTotal.totalVentasGeneradas || 0) + (grupo.corteTotal.serviciosMedicos || 0)).toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Desglose por cuenta - corte total */}
                                {(() => {
                                  const cuentas = calcularDesglosePorCuenta([grupo.corteTotal]);
                                  if (cuentas.length === 0) return null;
                                  return (
                                    <div className="mx-3 mb-3 bg-white border border-gray-200 rounded-lg p-3">
                                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Desglose por cuenta</div>
                                      <div className="space-y-2">
                                        {cuentas.map((ct) => (
                                          <div key={ct.cuenta} className="border border-gray-100 rounded-lg p-2 bg-gray-50">
                                            <div className="flex justify-between items-center mb-1">
                                              <span className="text-sm font-semibold text-gray-800">{ct.cuenta}</span>
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-900">${ct.total.toFixed(2)}</span>
                                                <button
                                                  onClick={() => printTicketPorCuenta(ct, fechaObj)}
                                                  className="text-purple-600 hover:text-purple-800 p-1 rounded hover:bg-purple-50"
                                                  title={`Imprimir ticket de ${ct.cuenta}`}
                                                >
                                                  <Printer className="w-4 h-4" />
                                                </button>
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                              <div className="flex flex-col"><span className="text-gray-500">Efectivo</span><span className="font-semibold text-gray-800">${ct.efectivo.toFixed(2)}</span></div>
                                              <div className="flex flex-col"><span className="text-gray-500">Tarjeta</span><span className="font-semibold text-gray-800">${ct.tarjeta.toFixed(2)}</span></div>
                                              <div className="flex flex-col"><span className="text-gray-500">Transferencia</span><span className="font-semibold text-gray-800">${ct.transferencia.toFixed(2)}</span></div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}

                              </div>
                            )}

                            {/* Total del día */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex justify-between items-center">
                              <div>
                                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-0.5">El total de ventas generadas en el día</p>
                              </div>
                              <span className="text-2xl font-bold text-blue-900">${grupo.totales.efectivo.toFixed(2)}</span>
                            </div>

                            {/* Desglose por cuenta - dia completo */}
                            {(() => {
                              const cuentas = calcularDesglosePorCuenta(grupo.cortes);
                              if (cuentas.length === 0) return null;
                              return (
                                <div className="bg-white border border-gray-200 rounded-lg p-3 mt-2">
                                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Desglose por cuenta</div>
                                  <div className="space-y-2">
                                    {cuentas.map((ct) => (
                                      <div key={ct.cuenta} className="border border-gray-100 rounded-lg p-2 bg-gray-50">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-sm font-semibold text-gray-800">{ct.cuenta}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-900">${ct.total.toFixed(2)}</span>
                                            <button
                                              onClick={() => printTicketPorCuenta(ct, fechaObj)}
                                              className="text-purple-600 hover:text-purple-800 p-1 rounded hover:bg-purple-50"
                                              title={`Imprimir ticket de ${ct.cuenta}`}
                                            >
                                              <Printer className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                          <div className="flex flex-col"><span className="text-gray-500">Efectivo</span><span className="font-semibold text-gray-800">${ct.efectivo.toFixed(2)}</span></div>
                                          <div className="flex flex-col"><span className="text-gray-500">Tarjeta</span><span className="font-semibold text-gray-800">${ct.tarjeta.toFixed(2)}</span></div>
                                          <div className="flex flex-col"><span className="text-gray-500">Transferencia</span><span className="font-semibold text-gray-800">${ct.transferencia.toFixed(2)}</span></div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                          </div>
                        </details>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
      {/* Modal: Confirmación Pre-Corte */}
      {showPrintPreCorte && preCorteRealizado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Pre-Corte Realizado!</h3>
            <p className="text-gray-600 mb-2">Efectivo a entregar:</p>
            <p className="text-4xl font-bold text-blue-600 mb-6">
              ${(preCorteRealizado?.efectivoAEntregar || 0).toFixed(2)}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handlePrintCorte(preCorteRealizado)}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Imprimir Ticket Pre-Corte
              </button>
              <button
                onClick={() => { setShowPrintPreCorte(false); setPreCorteRealizado(null); loadAllCajas(); }}
                className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Corte Total */}
      {showCorteTotal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-800 border-b pb-4">
              <Check className="w-6 h-6 text-green-600" />
              Corte Total — Cierre de Jornada
            </h3>

            {/* Cuadro Ventas Generadas Vespertino */}
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 mb-6 text-center">
              <p className="text-sm font-bold text-green-700 uppercase tracking-wider mb-3">Ventas Generadas</p>
              <p className="text-3xl font-bold text-green-900">${((parseFloat(totalVentasGeneradas) || 0) + (parseFloat(serviciosMedicos) || 0)).toFixed(2)}</p>
              
            </div>

            {/* Call Center: desglose por forma de pago */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="font-bold text-gray-800 text-lg mb-4">Desglose por forma de pago</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Efectivo</span>
                  <span className="font-bold text-gray-900">${(stats.totalEfectivo || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Tarjeta</span>
                  <span className="font-bold text-gray-900">${(stats.totalTarjeta || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Transferencia</span>
                  <span className="font-bold text-gray-900">${(stats.totalTransferencia || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg p-6 mt-6 text-center">
              <p className="text-sm mb-2 opacity-90">TOTAL DE VENTAS GENERADAS</p>
              <p className="text-4xl font-bold">${(stats.totalVentas || 0).toFixed(2)}</p>
              <p className="text-xs mt-2 opacity-75">{stats.numeroVentas || 0} ventas</p>
            </div>

            {/* Corte Final del Día */}
            {preCorteData && (() => {
              const corteFinal = calcularCorteFinaDelDia();
              return (
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-5 mt-6">
                  <p className="text-center font-bold text-lg mb-4 uppercase tracking-wider">Corte Final del Día</p>
                  <div className="grid grid-cols-2 gap-6">
                    {/* SUMAN */}
                    <div className="bg-white/10 rounded-xl p-4">
                      <p className="text-xs font-bold opacity-70 uppercase tracking-wider mb-3 text-center">SUMAN (+)</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="opacity-80">Ventas Farmacia:</span>
                          <span className="font-bold">${corteFinal.ventasFarmacia.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-80">Servicios Médicos:</span>
                          <span className="font-bold">${corteFinal.serviciosMed.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-80">Recargas:</span>
                          <span className="font-bold">${corteFinal.recargasTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-80">Sobrante:</span>
                          <span className="font-bold">${corteFinal.sobranteTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-80">Otro:</span>
                          <span className="font-bold">${corteFinal.otroTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-white/30 mt-2">
                          <span className="font-bold">TOTAL SUMAN:</span>
                          <span className="font-bold text-lg">${corteFinal.totalSuman.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    {/* RESTAN */}
                    <div className="bg-white/10 rounded-xl p-4">
                      <p className="text-xs font-bold opacity-70 uppercase tracking-wider mb-3 text-center">RESTAN (-)</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="opacity-80">Cobros Tarjeta:</span>
                          <span className="font-bold">${corteFinal.tarjetaTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-80">Gastos:</span>
                          <span className="font-bold">${corteFinal.gastosTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-80">Devoluciones:</span>
                          <span className="font-bold">${corteFinal.devolucionesT.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-80">Transferencias:</span>
                          <span className="font-bold">${corteFinal.transferenciasT.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-80">Serv. Médicos:</span>
                          <span className="font-bold">${corteFinal.serviciosMed.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-white/30 mt-2">
                          <span className="font-bold">TOTAL RESTAN:</span>
                          <span className="font-bold text-lg">${corteFinal.totalRestan.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/30 rounded-xl p-5 text-center mt-4">
                    <p className="text-xs opacity-80 mb-1 uppercase tracking-wider">TOTAL ENTREGADO EN EFECTIVO</p>
                    <p className="text-4xl font-bold">${corteFinal.totalEntregado.toFixed(2)}</p>
                  </div>
                  <p className="text-center text-xs opacity-60 mt-2">Mat + Vesp — SUMAN Total − RESTAN Total</p>
                </div>
              );
            })()}

            <div className="mt-6">
              <label className="block text-sm font-semibold mb-2 text-gray-700">Notas de Cierre (Opcional)</label>
              <textarea value={notasCierre} onChange={(e) => setNotasCierre(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-20"
                placeholder="Observaciones del cierre..." />
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCorteTotal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => handleCerrarCaja(true)} disabled={loading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold">
                {loading ? "Procesando..." : "Confirmar Corte Total"}
                <Check className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
{/* Modal: Confirmación Corte Total */}
      {showPrintCorteTotal && corteTotalRealizado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Corte Total Completado!</h3>
            <p className="text-gray-600 mb-2">Ventas del día:</p>
            <p className="text-4xl font-bold text-green-600 mb-6">
              ${(corteTotalRealizado.caja?.totalVentasGeneradas || 0).toFixed(2)}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handlePrintCorteTotal(corteTotalRealizado)}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Imprimir Corte Total
              </button>
              <button
                onClick={() => { setShowPrintCorteTotal(false); setCorteTotalRealizado(null); loadAllCajas(); }}
                className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cierre Diario */}
      {showCierreDiario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl my-8 max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={() => setShowCierreDiario(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex justify-between items-center mb-6 pr-12">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Cierre Diario de Caja</h3>
                <p className="text-sm text-gray-600">
                  {new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>

            {cortesDelDia.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-gray-700 mb-2">No hay cortes registrados hoy</h4>
                <p className="text-gray-600 mb-6">Realiza tu primer corte del día para generar el cierre diario</p>
                <button
                  onClick={() => setShowCierreDiario(false)}
                  className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Regresar
                </button>
              </div>
            ) : (
              <>
                {/* Información General */}
                <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm opacity-90">Total de Cortes</p>
                      <p className="text-3xl font-bold">{cortesDelDia.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm opacity-90">SUMAN Total</p>
                      <p className="text-3xl font-bold">${totalesDelDia.totalSuman.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm opacity-90">RESTAN Total</p>
                      <p className="text-3xl font-bold">${totalesDelDia.totalRestan.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Desglose de Cortes */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold mb-4 text-gray-800">Cortes Realizados Hoy</h4>
                  <div className="space-y-3">
                    {cortesDelDia.map((caja, index) => (
                      <div key={caja.id} className="bg-gray-50 border-l-4 border-blue-500 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-gray-900">
                              Corte #{index + 1} - {new Date(caja.fechaCierre!).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            <p className="text-xs text-gray-600">Monto Inicial: ${caja.montoInicial.toFixed(2)}</p>
                          </div>
                          <div className="flex gap-3">
                            <div className="text-right">
                              <p className="text-xs text-green-700">SUMAN</p>
                              <p className="font-bold text-green-900">${(caja.totalSuman || 0).toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-red-700">RESTAN</p>
                              <p className="font-bold text-red-900">${(caja.totalRestan || 0).toFixed(2)}</p>
                            </div>
                            <div className="text-right bg-blue-100 px-3 py-1 rounded">
                              <p className="text-xs text-blue-700">Efectivo</p>
                              <p className="font-bold text-blue-900">${(caja.efectivoAEntregar || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Desglose detallado del corte */}
                        <details className="group">
                          <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                            <Plus className="w-3 h-3 group-open:hidden" />
                            <Minus className="w-3 h-3 hidden group-open:block" />
                            Ver desglose
                          </summary>
                          <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-gray-600">Ventas Farmacia:</p>
                              <p className="font-semibold">${(caja.totalVentasGeneradas || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-gray-600">Servicios Méd.:</p>
                              <p className="font-semibold">${(caja.serviciosMedicos || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-gray-600">Recargas:</p>
                              <p className="font-semibold">${(caja.recargas || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-gray-600">Sobrante:</p>
                              <p className="font-semibold">${(caja.sobrante || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-gray-600">Certificados:</p>
                              <p className="font-semibold">${(caja.certificados || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-red-50 p-2 rounded">
                              <p className="text-gray-600">Tarjeta:</p>
                              <p className="font-semibold">${(caja.cobrosConTarjeta || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-red-50 p-2 rounded">
                              <p className="text-gray-600">Gastos:</p>
                              <p className="font-semibold">${(caja.valeAzul || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-red-50 p-2 rounded">
                              <p className="text-gray-600">Devoluciones:</p>
                              <p className="font-semibold">${(caja.devoluciones || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-red-50 p-2 rounded">
                              <p className="text-gray-600">Transferencias:</p>
                              <p className="font-semibold">${(caja.transferencias || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resumen Total del Día */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* SUMAN Total */}
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Plus className="w-5 h-5 text-green-700" />
                      <h4 className="font-bold text-green-900">TOTAL SUMAN DEL DÍA</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Ventas Farmacia:</span>
                        <span className="font-semibold">${totalesDelDia.totalVentasGeneradas.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Servicios Médicos:</span>
                        <span className="font-semibold">${totalesDelDia.serviciosMedicos.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Recargas:</span>
                        <span className="font-semibold">${totalesDelDia.recargas.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Sobrante:</span>
                        <span className="font-semibold">${totalesDelDia.sobrante.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Certificados:</span>
                        <span className="font-semibold">${totalesDelDia.certificados.toFixed(2)}</span>
                      </div>
                      <div className="pt-3 border-t-2 border-green-400 flex justify-between">
                        <span className="font-bold text-green-900">TOTAL:</span>
                        <span className="text-xl font-bold text-green-700">${totalesDelDia.totalSuman.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* RESTAN Total */}
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Minus className="w-5 h-5 text-red-700" />
                      <h4 className="font-bold text-red-900">TOTAL RESTAN DEL DÍA</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Cobros con Tarjeta:</span>
                        <span className="font-semibold">${totalesDelDia.cobrosConTarjeta.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Gastos:</span>
                        <span className="font-semibold">${totalesDelDia.valeAzul.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Devoluciones:</span>
                        <span className="font-semibold">${totalesDelDia.devoluciones.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Transferencias:</span>
                        <span className="font-semibold">${totalesDelDia.transferencias.toFixed(2)}</span>
                      </div>
                      <div className="pt-3 border-t-2 border-red-400 flex justify-between">
                        <span className="font-bold text-red-900">TOTAL:</span>
                        <span className="text-xl font-bold text-red-700">${totalesDelDia.totalRestan.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center flex flex-col items-center gap-4">
                  {/* Advertencia si hay múltiples cajas abiertas */}
                  {numeroCajasAbiertas > 1 && !cierreDiarioConfirmado && (
                    <div className="w-full max-w-2xl bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-left">
                          <p className="font-bold text-yellow-800 mb-1">
                            Advertencia: Hay {numeroCajasAbiertas} cajas abiertas en esta sucursal
                          </p>
                          <p className="text-sm text-yellow-700">
                            Al confirmar el cierre diario, <strong>TODAS las {numeroCajasAbiertas} cajas se cerrarán automáticamente</strong> con los totales calculados del sistema. 
                            Esta acción no se puede deshacer.
                          </p>
                          <div className="mt-2 text-xs text-yellow-600">
                            {cajasAbiertasIds.map(id => `Caja ${id}`).join(", ")}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowCierreDiario(false)}
                      className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                    >
                      Regresar
                    </button>
                    <button
                      onClick={handleConfirmarCierreDiario}
                      disabled={loading}
                      className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-lg disabled:opacity-50 text-lg"
                    >
                      {loading ? "Procesando..." : numeroCajasAbiertas > 1 ? `Cerrar ${numeroCajasAbiertas} Cajas` : "Realizar Cierre de Caja"}
                    </button>
                  </div>

                  {cierreDiarioConfirmado && (
                     <div className="mt-4 animate-fade-in w-full max-w-md bg-green-50 p-4 rounded-xl border border-green-200">
                       <p className="text-green-700 font-bold mb-3 flex items-center justify-center gap-2">
                         <Check className="w-5 h-5" />
                         ¡Cierre procesado correctamente!
                       </p>
                       <div className="flex flex-col gap-3">
                         <button
                           onClick={handlePrintCierreDiario}
                           className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-bold shadow-md flex items-center justify-center gap-2 w-full"
                         >
                           <Printer className="w-5 h-5" />
                           Imprimir Cierre Diario
                         </button>
                         <button
                           onClick={() => setShowCierreDiario(false)}
                           className="text-gray-600 hover:text-gray-800 font-semibold text-sm underline"
                         >
                           Cerrar Ventana
                         </button>
                       </div>
                     </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
