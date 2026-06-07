import { useState, useEffect } from "react";
import { SUCURSALES, User } from "../shared";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { toast } from "sonner";
import CortesDeCaja from "./CortesDeCaja";
import AgregarGasto from "./supervisor/AgregarGasto";
import { usePlan } from "../hooks/usePlan";
import {
  ShoppingCart, Scan, Trash2, CreditCard, Banknote, Building, LogOut,
  Search, Plus, Minus, Check, QrCode, AlertTriangle, Stethoscope, Users,
  DollarSign, Calendar, Clock, PieChart, X, Receipt, Package, Printer,
  Sparkles, Send, Loader2,
} from "lucide-react";

interface FarmaceuticoDashboardProps {
  user: User;
  onLogout: () => void;
}

interface Producto {
  id: string;
  codigoBarras: string;
  nombre: string;
  precioVenta: number;
  precio2?: number;
  precio3?: number;
  precio4?: number;
  precioCompra: number;
  laboratorio: string;
  sustanciaActiva: string;
  presentacion: string;
  descripcion: string;
  lugarCompra: string;
  grupo: string;
  agrupacion: string;
  claveSAT: string;
  stockBySucursal: Record<string, number>;
}

interface CartItem {
  productoId: string;
  producto: Producto;
  cantidad: number;
  precioElegido?: number;
  cantidadRecetada?: number;
  surtidoCompleto?: boolean;
  isService?: boolean;
  patientName?: string;
  serviceInfo?: Servicio;
  medicoAsignadoId?: string;
}

interface Medico {
  id: string;
  nombre: string;
  cedula: string;
  telefono?: string;
  email?: string;
  especialidad?: string;
}

interface Servicio {
  nombre: string;
  precio: number;
  precioFestivo?: number;
}

interface ConsultaPendiente {
  id: string;
  nombrePaciente: string;
  servicio: string;
  monto: number;
  fecha: string;
  estado: "pendiente" | "atendida";
  sucursalId: string;
  medicoId?: string;
}

const SERVICIOS: Servicio[] = [
  { nombre: "Consulta", precio: 70, precioFestivo: 80 },
  { nombre: "Aplicación de Inyección", precio: 20 },
  { nombre: "Toma de Presión", precio: 20 },
  { nombre: "Toma de Glucemia", precio: 45 },
  { nombre: "Certificado Médico Laboral", precio: 80 },
  { nombre: "Certificado Médico Escolar", precio: 70 },
  { nombre: "Lavado Ótico", precio: 160 },
  { nombre: "Revisión o Retiro de DIU", precio: 200 },
  { nombre: "Colocación o Cambio de DIU", precio: 350 },
  { nombre: "Retiro de Implante", precio: 350 },
  { nombre: "Retiro de Puntos", precio: 100 },
  { nombre: "Sutura Básica", precio: 200 },
  { nombre: "Cambio de Sonda", precio: 200 },
  { nombre: "Curación Menor", precio: 120 },
  { nombre: "Curación Mayor", precio: 150 },
];

export default function FarmaceuticoDashboard({ user, onLogout }: FarmaceuticoDashboardProps) {
  const [productos, setProductos] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [codigoReceta, setCodigoReceta] = useState("");
  const [codigoRecetaActivo, setCodigoRecetaActivo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "tarjeta" | "transferencia" | "dividido">("efectivo");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [codigoAutorizacion, setCodigoAutorizacion] = useState("");
  const [montoDividido1, setMontoDividido1] = useState("");
  const [montoDividido2, setMontoDividido2] = useState("");
  const [metodoDividido1, setMetodoDividido1] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [metodoDividido2, setMetodoDividido2] = useState<"efectivo" | "tarjeta" | "transferencia">("tarjeta");
  const [authDividido1, setAuthDividido1] = useState("");
  const [authDividido2, setAuthDividido2] = useState("");
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [cedulaMedico, setCedulaMedico] = useState("");
  const [showCedulaWarning, setShowCedulaWarning] = useState(false);
  const [nombreMedicoAntibiotico, setNombreMedicoAntibiotico] = useState("");
  const [medicoAntibioticoEncontrado, setMedicoAntibioticoEncontrado] = useState<string | null>(null);
  const [buscandoCedula, setBuscandoCedula] = useState(false);
  const [codigoControlGenerado, setCodigoControlGenerado] = useState<string | null>(null);
  const [ultimaVentaData, setUltimaVentaData] = useState<any>(null);
  const [showTicketVenta, setShowTicketVenta] = useState(false);
  const [showServiciosModal, setShowServiciosModal] = useState(false);
  const [serviciosTab, setServiciosTab] = useState<"servicios" | "gastos">("servicios");
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [nombrePaciente, setNombrePaciente] = useState("");
  const [consultasPendientes, setConsultasPendientes] = useState<ConsultaPendiente[]>([]);
  const [cajaAbierta, setCajaAbierta] = useState<any | null>(null);
  const [medicoAsignado, setMedicoAsignado] = useState<string>("");
  const [medicosDisponibles, setMedicosDisponibles] = useState<Medico[]>([]);
  const [multipleMedicos, setMultipleMedicos] = useState(false);
  const [showCortesCaja, setShowCortesCaja] = useState(false);
  const [permissions, setPermissions] = useState<any>({});
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const { isModuleActive } = usePlan();
  const [assignedSucursalId, setAssignedSucursalId] = useState("principal"); // Call Center: sucursal unica
  const [lotes, setLotes] = useState<any[]>([]);
 const [currentShift, setCurrentShift] = useState("");
  const [showCancelarServicio, setShowCancelarServicio] = useState(false);
  const [servicioCancelar, setServicioCancelar] = useState<any>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [showReimprimir, setShowReimprimir] = useState(false);
  const [ventasDelTurno, setVentasDelTurno] = useState<any[]>([]);
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [searchReimprimir, setSearchReimprimir] = useState("");

  const sucursal = SUCURSALES.find((s) => s.id === assignedSucursalId);

  useEffect(() => {
    // Call Center: una sola sucursal (principal), sin asignacion de turnos
    fetchPermissions();
  }, []);

  const checkDailyAssignment = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/staff-assignments?userId=${user.id}&start=${today}&end=${today}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success && data.assignments && data.assignments.length > 0) {
        const assignment = data.assignments[0];
        if (assignment.sucursalId !== user.sucursalId) {
          setAssignedSucursalId(assignment.sucursalId);
          setCurrentShift(assignment.shift);
          toast.info(`📅 Asignación de hoy: Sucursal ${assignment.sucursalId} - Turno ${assignment.shift}`);
        }
      }
    } catch (error) {
      console.error("Error checking assignment:", error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/permissions`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) setPermissions(data.permissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
    }
  };

  const hasPermission = (feature: string) => {
    const role = user?.role || 'farmaceutico';
    if (!permissions || !permissions[role]) return true;
    return permissions[role][feature] !== false;
  };

  useEffect(() => {
    loadProductos();
    loadLotes();
    loadMedicos();
    loadConsultasPendientes();
    checkCajaAbierta();
    const interval = setInterval(() => {
      loadConsultasPendientes();
      checkCajaAbierta();
    }, 10000);
    return () => clearInterval(interval);
  }, [assignedSucursalId]);

  useEffect(() => {
    if (!showCortesCaja) {
      checkCajaAbierta();
    }
  }, [showCortesCaja]);

  const checkCajaAbierta = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas/activa/${assignedSucursalId}?farmaceuticoId=${user.id}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success && data.caja) {
        setCajaAbierta(data.caja);
        const fechaApertura = new Date(data.caja.fechaApertura);
        const hoy = new Date();
        const esDeAyer = fechaApertura.toDateString() !== hoy.toDateString();
        if (esDeAyer) {
          setShowCortesCaja(true);
          toast.warning("Tienes una caja abierta del día anterior. Debes hacer el corte antes de continuar.");
        }
      } else {
        setCajaAbierta(null);
      }
    } catch (error) {
      console.error("Error verificando caja:", error);
    }
  };

  useEffect(() => {
    const tieneAntibioticos = cart.some((item) => {
      const campos = [
        item.producto.grupo,
        item.producto.agrupacion,
        item.producto.categoria,
        item.producto.nombre,
      ].map(s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      return campos.some(c => c.includes("antibiotico"));
    });
    setShowCedulaWarning(tieneAntibioticos);
    if (!tieneAntibioticos) setCedulaMedico("");
  }, [cart]);

  // ✅ loadLotes — nivel raíz
  const loadLotes = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/lotes?sucursal=${assignedSucursalId}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) setLotes(data.lotes || []);
    } catch (error) {
      console.error("Error cargando lotes:", error);
    }
  };

  // ✅ loadProductos — nivel raíz
  const loadProductos = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos?limit=10000`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) setProductos(data.productos || []);
    } catch (error) {
      console.error("Error cargando productos:", error);
      toast.error("Error al cargar productos");
    }
  };

  // ✅ loadMedicos — nivel raíz, sin loadLotes ni loadProductos adentro
 const loadMedicos = async () => {
  try {
    // Cargar médicos desde Supabase perfiles
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
    const { data: perfilesData } = await sb
      .from("perfiles")
      .select("*")
      .eq("rol", "medico")
      .eq("activo", true);
    const todosMedicos = (perfilesData || []).map((m: any) => ({
      id: m.id,
      nombre: m.nombre_completo,
      name: m.nombre_completo,
      cedula: m.cedula_profesional,
      especialidad: m.especialidad,
      sucursalId: m.sucursal_id,
    }));
    setMedicos(todosMedicos);
    // Médicos base de esta sucursal
    const medicosBase = todosMedicos.filter(
      (m: any) => m.sucursalId === assignedSucursalId
    );
    try {
      const today = new Date().toISOString().split("T")[0];
      const assignmentsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/staff-assignments?start=${today}&end=${today}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const assignmentsData = await assignmentsResponse.json();

      if (assignmentsData.success) {
        // Médicos asignados temporalmente a esta sucursal hoy
        const medicosTemporales = (assignmentsData.assignments || [])
          .filter((a: any) =>
            a.sucursalId === assignedSucursalId &&
            (a.role === "medico" || todosMedicos.some((m: any) => m.id === a.userId))
          )
          .map((a: any) => todosMedicos.find((m: any) => m.id === a.userId))
          .filter((m: any) => m);

        // Combinar base + temporales sin duplicados
        const combinados = [
          ...medicosBase,
          ...medicosTemporales.filter(
            (mt: any) => !medicosBase.some((mb: any) => mb.id === mt.id)
          ),
        ];

        const lista = combinados.length > 0 ? combinados : medicosBase;

        setMedicosDisponibles(lista);
        setMultipleMedicos(lista.length > 1);
        setMedicoAsignado(lista.length === 1 ? lista[0].id : "");
      } else {
        // Fallback sin asignaciones
        setMedicosDisponibles(medicosBase);
        setMultipleMedicos(medicosBase.length > 1);
        setMedicoAsignado(medicosBase.length === 1 ? medicosBase[0].id : "");
      }
    } catch (err) {
      console.error("Error cargando asignaciones:", err);
      setMedicosDisponibles(medicosBase);
      setMultipleMedicos(medicosBase.length > 1);
      setMedicoAsignado(medicosBase.length === 1 ? medicosBase[0].id : "");
    }
  } catch (error) {
    console.error("Error cargando médicos:", error);
  }
};

  const handleAIAssistant = async () => {
    if (!aiQuery.trim()) { toast.error("Escribe qué necesitas buscar"); return; }
    setAiLoading(true);
    try {
      const inventoryData = productos
        .filter(p => (p.stockBySucursal[assignedSucursalId!] || 0) > 0)
        .map(p => ({
          nombre: p.nombre, sustancia: p.sustanciaActiva, precio: p.precioVenta,
          stock: p.stockBySucursal[assignedSucursalId!] || 0,
          laboratorio: p.laboratorio, presentacion: p.presentacion, grupo: p.grupo,
        }));
      const cartData = cart.map(item => ({
        nombre: item.producto.nombre, sustancia: item.producto.sustanciaActiva,
        cantidad: item.cantidad, grupo: item.producto.grupo,
      }));
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ai-assistant`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: aiQuery, inventory: inventoryData, cart: cartData }),
        }
      );
      const data = await response.json();
      if (data.success) setAiResponse(data.response);
      else toast.error(data.error || "Error al procesar consulta");
    } catch (error) {
      console.error("Error en asistente IA:", error);
      toast.error("Error al conectar con el asistente");
    } finally {
      setAiLoading(false);
    }
  };

  // Devuelve el precio elegido del item (1-4) o el precioVenta por defecto
  const getPrecioItem = (item: any): number => {
    if (item.precioElegido != null && !isNaN(item.precioElegido)) return parseFloat(item.precioElegido);
    return parseFloat(item.producto?.precioVenta) || parseFloat(item.producto?.precio) || 0;
  };

  // Lista de precios disponibles de un producto (etiqueta + valor), solo los que tienen valor
  const getPreciosDisponibles = (producto: any) => {
    const lista = [
      { label: "Precio 1", valor: parseFloat(producto?.precioVenta) || parseFloat(producto?.precio) || 0 },
      { label: "Precio 2", valor: parseFloat(producto?.precio2) || 0 },
      { label: "Precio 3", valor: parseFloat(producto?.precio3) || 0 },
      { label: "Precio 4", valor: parseFloat(producto?.precio4) || 0 },
    ];
    return lista.filter((p) => p.valor > 0);
  };

  const cambiarPrecioItem = (productoId: string, nuevoPrecio: number) => {
    setCart(cart.map((item) => item.productoId === productoId ? { ...item, precioElegido: nuevoPrecio } : item));
  };

  const addToCart = (producto: Producto) => {
    const stock = producto.stockBySucursal[assignedSucursalId!] || 0;
    const existingItem = cart.find((item) => item.productoId === producto.id);
    if (existingItem) {
      setCart(cart.map((item) => item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCart([...cart, { productoId: producto.id, producto, cantidad: 1 }]);
    }
    if (stock <= 0) {
      toast.warning(`"${producto.nombre}" sin stock — se registrará en negativo`);
    } else {
      toast.success("Producto agregado");
    }
  };

  const removeFromCart = (productoId: string) => {
    setCart(cart.filter((item) => item.productoId !== productoId));
    toast.success("Producto eliminado");
  };
const buscarMedicoPorCedula = async (cedula: string) => {
    if (!cedula.trim()) return;
    setBuscandoCedula(true);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
      const { data } = await sb
        .from("perfiles")
        .select("id, nombre_completo, cedula_profesional")
        .eq("cedula_profesional", cedula.trim())
        .single();
      if (data) {
        setMedicoAntibioticoEncontrado(data.nombre_completo);
        setNombreMedicoAntibiotico(data.nombre_completo);
        toast.success(`Médico encontrado: ${data.nombre_completo}`);
      } else {
        setMedicoAntibioticoEncontrado(null);
        setNombreMedicoAntibiotico("");
        toast.info("Cédula no registrada — ingresa el nombre del médico");
      }
    } catch (error) {
      setMedicoAntibioticoEncontrado(null);
      setNombreMedicoAntibiotico("");
    } finally {
      setBuscandoCedula(false);
    }
  };
  const isAntibiotico = (producto: Producto): boolean => {
    console.log("🔍 Verificando antibiótico:", {
      nombre: producto.nombre,
      grupo: producto.grupo,
      agrupacion: producto.agrupacion,
      categoria: (producto as any).categoria,
      allKeys: Object.keys(producto),
    });
    const campos = [
      producto.grupo,
      producto.agrupacion,
      (producto as any).categoria,
      producto.nombre,
    ].map(s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const resultado = campos.some(c => c.includes("antibiotico"));
    console.log("🔍 Resultado:", resultado, "campos:", campos);
    return resultado;
  };

  const setSurtidoCompletoItem = (productoId: string, surtidoCompleto: boolean) => {
    setCart(cart.map((item) => item.productoId === productoId ? { ...item, surtidoCompleto } : item));
  };

  const updateQuantity = (productoId: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.productoId === productoId) {
        const newCantidad = item.cantidad + delta;
        const stock = item.producto.stockBySucursal[assignedSucursalId!] || 0;
        if (newCantidad <= 0) return item;
        if (newCantidad > stock) { toast.error("No hay suficiente stock"); return item; }
        return { ...item, cantidad: newCantidad };
      }
      return item;
    }));
  };

  const loadReceta = async () => {
    if (!codigoReceta.trim()) { toast.error("Ingresa un código de receta"); return; }
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/recetas/by-code/${codigoReceta}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success && data.receta) {
        const sinStock: string[] = [];
        const conStock: CartItem[] = [];
        for (const item of data.receta.medicamentos) {
          const producto = productos.find((p) => p.codigoBarras === item.codigo);
          if (!producto) { sinStock.push(item.nombre || item.codigo); continue; }
          const stockDisponible = producto.stockBySucursal?.[assignedSucursalId!] || 0;
          if (stockDisponible <= 0) { sinStock.push(`${producto.nombre} (sin stock)`); continue; }
          const cantidadFinal = Math.min(item.cantidad, stockDisponible);
          conStock.push({
            productoId: producto.id, producto,
            cantidad: cantidadFinal, cantidadRecetada: item.cantidad,
            surtidoCompleto: cantidadFinal >= item.cantidad,
          });
        }
        if (conStock.length === 0) { toast.error("Ningún medicamento de esta receta tiene stock disponible"); return; }
        if (sinStock.length > 0) toast.warning(`Sin stock: ${sinStock.join(", ")}`);
        setCart(conStock);
setCodigoRecetaActivo(data.receta.codigo);
toast.success("Receta cargada correctamente");
setCodigoReceta("");
      } else {
        toast.error("Receta no encontrada");
      }
    } catch (error) {
      console.error("Error cargando receta:", error);
      toast.error("Error al cargar receta");
    } finally {
      setLoading(false);
    }
  };

  const handlePagar = async () => {
    if (!cajaAbierta) { toast.error("Debes abrir una caja antes de realizar ventas"); setShowCortesCaja(true); return; }
    if (cart.length === 0) { toast.error("El carrito está vacío"); return; }
    if (metodoPago === "efectivo") {
      const recibido = parseFloat(montoRecibido);
      if (!montoRecibido || isNaN(recibido)) { toast.error("Ingresa el monto recibido"); return; }
      if (recibido < total) { toast.error("El monto recibido es insuficiente"); return; }
    }
    if ((metodoPago === "tarjeta" || metodoPago === "transferencia") && !codigoAutorizacion.trim()) {
      toast.error("Ingresa el código de autorización"); return;
    }
    if (metodoPago === "dividido") {
      const m1 = parseFloat(montoDividido1) || 0;
      const m2 = parseFloat(montoDividido2) || 0;
      if (Math.abs(m1 + m2 - total) > 0.1) { toast.error(`La suma de los pagos debe cubrir el total ($${total.toFixed(2)})`); return; }
      if (metodoDividido1 !== "efectivo" && !authDividido1.trim()) { toast.error(`Falta código de autorización para ${metodoDividido1}`); return; }
      if (metodoDividido2 !== "efectivo" && !authDividido2.trim()) { toast.error(`Falta código de autorización para ${metodoDividido2}`); return; }
    }
    // Call Center: no se requiere cedula medica para antibioticos

    setLoading(true);
    try {
      const venta = {
        sucursalId: assignedSucursalId,
        farmaceuticoId: user.id,
        usuario: user.name || user.username,
        codigoReceta: codigoRecetaActivo || "",
        productos: cart.map((item) => {
          const precio = getPrecioItem(item);
          return { productoId: item.productoId, nombre: item.producto.nombre, cantidad: item.cantidad, precio, surtidoCompleto: item.surtidoCompleto };
        }),
        total, metodoPago,
        montoRecibido: metodoPago === "efectivo" ? parseFloat(montoRecibido) : total,
        codigoAutorizacion: (metodoPago === "tarjeta" || metodoPago === "transferencia") ? codigoAutorizacion : "",
        cedulaMedico: showCedulaWarning ? cedulaMedico : "",
        nombreMedicoAntibiotico: showCedulaWarning ? (medicoAntibioticoEncontrado || nombreMedicoAntibiotico) : "",
        detallesPagoDividido: metodoPago === "dividido" ? {
          pagos: [
            { metodo: metodoDividido1, monto: parseFloat(montoDividido1), codigoAutorizacion: authDividido1 },
            { metodo: metodoDividido2, monto: parseFloat(montoDividido2), codigoAutorizacion: authDividido2 }
          ]
        } : null,
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ventas`,
        { method: "POST", headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" }, body: JSON.stringify(venta) }
      );
      const data = await response.json();
      if (data.success) {
        const servicios = cart.filter(item => item.isService);
        if (servicios.length > 0) {
          await Promise.all(servicios.map(async (item) => {
            const precio = getPrecioItem(item);
            const consulta = {
              nombrePaciente: item.patientName,
              servicio: item.serviceInfo?.nombre || item.producto.nombre,
              monto: precio * item.cantidad,
              sucursalId: assignedSucursalId,
              farmaceuticoId: user.id,
              medicoId: item.medicoAsignadoId || "",
              estado: "pendiente",
            };
            try {
              await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/consultas`,
                { method: "POST", headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" }, body: JSON.stringify(consulta) }
              );
            } catch (err) { console.error("Error registrando consulta:", err); }
          }));
          loadConsultasPendientes();
        }
        const ventaDataForTicket = {
          items: cart.map(item => ({
            nombre: item.producto.nombre, cantidad: item.cantidad,
            precio: getPrecioItem(item),
            subtotal: getPrecioItem(item) * item.cantidad,
            isService: item.isService || false, patientName: item.patientName || "",
          })),
          total, metodoPago,
          montoRecibido: metodoPago === "efectivo" ? parseFloat(montoRecibido) : total,
          cambio: metodoPago === "efectivo" ? Math.max(0, parseFloat(montoRecibido) - total) : 0,
          codigoAutorizacion: (metodoPago === "tarjeta" || metodoPago === "transferencia") ? codigoAutorizacion : "",
          fecha: new Date(), farmaceutico: user.name, sucursal: sucursal?.nombre,
          numeroCaja: cajaAbierta?.numeroCaja || 1,
          detallesPagoDividido: metodoPago === "dividido" ? {
            pagos: [
              { metodo: metodoDividido1, monto: parseFloat(montoDividido1) || 0, codigoAutorizacion: authDividido1 },
              { metodo: metodoDividido2, monto: parseFloat(montoDividido2) || 0, codigoAutorizacion: authDividido2 }
            ]
          } : null,
        };
        setUltimaVentaData(ventaDataForTicket);
        setShowTicketVenta(true);
        setCart([]);
        setCodigoRecetaActivo("");
        setShowPayment(false); setMontoRecibido(""); setCodigoAutorizacion("");
        setAuthDividido1(""); setAuthDividido2(""); setMontoDividido1(""); setMontoDividido2("");
        setNombreMedicoAntibiotico(""); setMedicoAntibioticoEncontrado(null);
        loadProductos();
        setCodigoControlGenerado(data.codigoControl || null);
      } else {
        toast.error("Error al realizar la venta");
      }
    } catch (error) {
      console.error("Error realizando venta:", error);
      toast.error("Error al procesar la venta");
    } finally {
      setLoading(false);
    }
  };

  const total = cart.reduce((sum, item) => {
    const precio = getPrecioItem(item);
    return sum + (precio * item.cantidad);
  }, 0);

  const filteredProductos = productos.filter((p) =>
    (p.nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.codigoBarras || "").includes(searchTerm)
  );

  const loadConsultasPendientes = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/consultas`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const serviciosDelDia = (data.consultas || []).filter((c: any) => {
          const fechaServicio = new Date(c.fecha); fechaServicio.setHours(0, 0, 0, 0);
          if (fechaServicio.getTime() !== hoy.getTime()) return false;
          if (c.sucursalId !== assignedSucursalId) return false;
          // Farmacéutico solo ve sus propios servicios
          if (c.farmaceuticoId && c.farmaceuticoId !== user.id) return false;
          return true;
        });
        setConsultasPendientes(serviciosDelDia);
      }
    } catch (error) {
      console.error("Error cargando consultas:", error);
    }
  };

  const esDiaFestivo = (): boolean => new Date().getDay() === 0;

const printTicketVenta = (ventaData: any) => {
    try {
      // Impresión directa sin ventana emergente

      const COLS = 26; // caracteres por línea ajustado a 11pt

      const pad = (left: string, right: string, total = COLS) => {
        const espacio = total - left.length - right.length;
        return left + (espacio > 0 ? " ".repeat(espacio) : " ") + right;
      };

      const center = (text: string, total = COLS) => {
        const spaces = Math.floor((total - text.length) / 2);
        return " ".repeat(Math.max(0, spaces)) + text;
      };

      const divider = "-".repeat(COLS);
      const dividerD = "=".repeat(COLS);

      const metodoPagoLabel: Record<string, string> = {
        efectivo: "Efectivo", tarjeta: "Tarjeta",
        transferencia: "Transferencia", dividido: "Pago Dividido",
      };

      const fecha = new Date(ventaData.fecha);
      const fechaStr = `${String(fecha.getDate()).padStart(2,"0")}/${String(fecha.getMonth()+1).padStart(2,"0")}/${fecha.getFullYear()} ${fecha.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"})}`;

      const lineas: string[] = [
        center("Call Center"),
        center("Cuidando tu salud"),
        center(`Sucursal: ${(ventaData.sucursal || "").toUpperCase()}`),
        "",
        pad("Fecha:", fechaStr),
        pad("Folio:", `/POS${ventaData.folioVenta || Date.now().toString().slice(-5)}`),
        pad("Cajero:", (ventaData.farmaceutico || "N/A").toUpperCase()),
        "",
        center("Cliente: Publico en general"),
        divider,
        ...ventaData.items.flatMap((item: any) => {
          const nombre = item.isService
            ? `${item.nombre}${item.patientName ? ` (${item.patientName})` : ""}`
            : item.nombre;
          const nombreLineas = [];
          for (let i = 0; i < nombre.length; i += COLS) {
            nombreLineas.push(nombre.substring(i, i + COLS));
          }
          return [
            ...nombreLineas,
            pad(`  ${item.cantidad}.00 Pieza x $${item.precio.toFixed(2)}`, `$${item.subtotal.toFixed(2)}`),
            "",
          ];
        }),
        divider,
        pad("Sub Total:", `$${ventaData.total.toFixed(2)}`),
        pad("Total:", `$${ventaData.total.toFixed(2)}`),
        divider,
        pad("Pagado en:", metodoPagoLabel[ventaData.metodoPago] || ventaData.metodoPago),
        ...(ventaData.metodoPago === "efectivo" ? [
          pad("Cantidad:", `$${(ventaData.montoRecibido || 0).toFixed(2)}`),
          pad("Cambio:", `${(ventaData.cambio || 0).toFixed(2)}`),
        ] : []),
        ...(ventaData.codigoAutorizacion ? [pad("Auth:", ventaData.codigoAutorizacion)] : []),
        ...(ventaData.metodoPago === "dividido" && ventaData.detallesPagoDividido
          ? ventaData.detallesPagoDividido.pagos.map((p: any) =>
              pad(`  ${metodoPagoLabel[p.metodo] || p.metodo}:`, `$${(parseFloat(p.monto)||0).toFixed(2)}`))
          : []),
        divider,
        center("Gracias por su compra"),
        center("Conserve este ticket para"),
        center("cualquier aclaracion"),
        divider,
        center("Call Center"),
      ];

      const printContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket</title>
  <style>
    @page { margin: 0; size: 58mm auto; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11pt;
      font-weight: bold;
      color: #000;
      width: 52mm;
      margin: 0;
      padding: 1mm 1mm;
      white-space: pre;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      html, body { width: 52mm; font-size: 11pt; }
      * { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>${lineas.join("\n")}</body>
</html>`;

      // Imprimir con iframe oculto — sin vista previa
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
    } catch (error) {
      console.error("Error al imprimir ticket:", error);
      toast.error("Error al imprimir el ticket");
    }
  };
  
 const loadVentasDelTurno = async () => {
    setLoadingVentas(true);
    try {
      // Obtener caja activa o última caja del turno
      const cajaResp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const cajaData = await cajaResp.json();

      // Buscar caja abierta o la última cerrada hoy de esta sucursal
      const hoyCST = new Date(Date.now() - 6 * 60 * 60 * 1000);
      hoyCST.setHours(0, 0, 0, 0);

      const cajas = (cajaData.cajas || []).filter((c: any) =>
        c.sucursalId === (assignedSucursalId || user.sucursalId) &&
        !c.id.includes("SNAPSHOT")
      );

      // Primero buscar caja abierta
      let cajaReferencia = cajas.find((c: any) => c.estado === "abierta");

      // Si no hay abierta, buscar la última cerrada hoy
      if (!cajaReferencia) {
        const cerradasHoy = cajas
          .filter((c: any) => {
            if (!c.fechaCierre) return false;
            const fechaCierreCST = new Date(new Date(c.fechaCierre).getTime() - 6 * 60 * 60 * 1000);
            fechaCierreCST.setHours(0, 0, 0, 0);
            return fechaCierreCST.getTime() === hoyCST.getTime();
          })
          .sort((a: any, b: any) =>
            new Date(b.fechaCierre).getTime() - new Date(a.fechaCierre).getTime()
          );
        cajaReferencia = cerradasHoy[0];
      }

      // Fecha de apertura como punto de inicio
      const desdeHora = cajaReferencia?.fechaApertura
        ? new Date(cajaReferencia.fechaApertura)
        : new Date(Date.now() - 12 * 60 * 60 * 1000);

      console.log("Cargando ventas desde:", desdeHora.toISOString(), "caja:", cajaReferencia?.id);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ventas`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        const ventasFiltradas = (data.ventas || [])
          .filter((v: any) => {
            if (v.sucursalId !== (assignedSucursalId || user.sucursalId)) return false;
            if (v.estado === "devuelto") return false;
            // Solo ventas de esta caja o desde apertura
            const fechaVenta = new Date(v.fecha).getTime();
            return fechaVenta >= desdeHora.getTime();
          })
          .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        setVentasDelTurno(ventasFiltradas);
      }
    } catch (error) {
      console.error("Error cargando ventas:", error);
      toast.error("Error al cargar ventas del turno");
    } finally {
      setLoadingVentas(false);
    }
  };

  const handleReimprimirVenta = (venta: any) => {
    const ventaData = {
      items: (venta.productos || []).map((p: any) => ({
        nombre: p.nombre,
        cantidad: p.cantidad,
        precio: parseFloat(p.precio) || 0,
        subtotal: (parseFloat(p.precio) || 0) * p.cantidad,
        isService: String(p.productoId || "").startsWith("SERVICE-"),
        patientName: "",
      })),
      total: parseFloat(venta.total) || 0,
      metodoPago: venta.metodoPago || "efectivo",
      montoRecibido: parseFloat(venta.montoRecibido) || parseFloat(venta.total) || 0,
      cambio: Math.max(0, (parseFloat(venta.montoRecibido) || 0) - (parseFloat(venta.total) || 0)),
      codigoAutorizacion: venta.codigoAutorizacion || "",
      fecha: new Date(venta.fecha),
      farmaceutico: user.name,
      sucursal: sucursal?.nombre,
      numeroCaja: cajaAbierta?.numeroCaja || 1,
      detallesPagoDividido: venta.detallesPagoDividido || null,
    };
    printTicketVenta(ventaData);
    toast.success("Imprimiendo ticket...");
  };

  const handleCancelarServicio = async () => {
    if (!servicioCancelar || !motivoCancelacion.trim()) {
      toast.error("Ingresa el motivo de cancelación");
      return;
    }
    setLoading(true);
    try {
      // 1. Actualizar estado de la consulta a cancelado
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/consultas/${servicioCancelar.id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            estado: "cancelado",
            motivoCancelacion: motivoCancelacion.trim(),
            fechaCancelacion: new Date().toISOString(),
          }),
        }
      );

      // 2. Registrar como devolución en la caja activa
      if (cajaAbierta && servicioCancelar.monto > 0) {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ventas`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              tipo: "devolucion_servicio",
              sucursalId: assignedSucursalId,
              cajaId: cajaAbierta.id,
              farmaceuticoId: user.id,
              total: servicioCancelar.monto,
              estado: "devuelto",
              motivoDevolucion: motivoCancelacion.trim(),
              fechaDevolucion: new Date().toISOString(),
              consultaId: servicioCancelar.id,
              nombrePaciente: servicioCancelar.nombrePaciente,
              servicio: servicioCancelar.servicio,
              productos: [{
                productoId: `SERVICE-${servicioCancelar.servicio}`,
                nombre: servicioCancelar.servicio,
                cantidad: 1,
                precio: servicioCancelar.monto,
              }],
              metodoPago: "efectivo",
              fecha: new Date().toISOString(),
            }),
          }
        );
      }

      toast.success("Servicio cancelado — devolución registrada en caja");
      setShowCancelarServicio(false);
      setServicioCancelar(null);
      setMotivoCancelacion("");
      loadConsultasPendientes();
    } catch (error) {
      console.error("Error cancelando servicio:", error);
      toast.error("Error al cancelar el servicio");
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarServicio = () => {
    if (!cajaAbierta) { toast.error("Debes abrir una caja antes de registrar servicios"); setShowCortesCaja(true); return; }
    if (!servicioSeleccionado) { toast.error("Selecciona un servicio"); return; }
    if (!nombrePaciente.trim()) { toast.error("Ingresa el nombre del paciente"); return; }
    if (multipleMedicos && !medicoAsignado) { toast.error("Selecciona el médico que atenderá al paciente"); return; }
    const esConsulta = servicioSeleccionado.nombre === "Consulta";
    const esFestivo = esDiaFestivo();
    const monto = esConsulta && esFestivo && servicioSeleccionado.precioFestivo ? servicioSeleccionado.precioFestivo : servicioSeleccionado.precio;
    const productoVirtual: any = {
      id: `SERVICE-${Date.now()}`, codigoBarras: "SERVICIO", nombre: servicioSeleccionado.nombre,
      precioVenta: monto, precioCompra: 0, laboratorio: "SERVICIO", sustanciaActiva: "",
      presentacion: "SERVICIO", descripcion: `Servicio para: ${nombrePaciente}`,
      lugarCompra: "", grupo: "Servicios", agrupacion: "", claveSAT: "",
      stockBySucursal: { [assignedSucursalId!]: 9999 },
    };
    const newItem: CartItem = {
      productoId: productoVirtual.id, producto: productoVirtual, cantidad: 1,
      isService: true, patientName: nombrePaciente.trim(), serviceInfo: servicioSeleccionado,
      medicoAsignadoId: multipleMedicos ? medicoAsignado : (medicosDisponibles[0]?.id || ""),
    };
    setCart([...cart, newItem]);
    toast.success(`${servicioSeleccionado.nombre} agregado al carrito - $${monto.toFixed(2)}`);
    setShowServiciosModal(false);
    setServicioSeleccionado(null);
    setNombrePaciente("");
    setMedicoAsignado(multipleMedicos ? "" : (medicosDisponibles[0]?.id || ""));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showCortesCaja ? (
        <div>
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 shadow-lg">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div>
                <h1 className="text-3xl mb-1">Call Center - Punto de Venta</h1>
                <div className="flex items-center gap-4 text-sm opacity-90">
                  <span className="flex items-center gap-1"><Building className="w-4 h-4" />{sucursal?.nombre}</span>
                  <span>• {user.name}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCortesCaja(false)} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors">
                  <ShoppingCart className="w-5 h-5" />Volver a Ventas
                </button>
                <button onClick={onLogout} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors">
                  <LogOut className="w-5 h-5" />Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
          <CortesDeCaja user={user} assignedSucursalId={assignedSucursalId} />
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 shadow-lg">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div>
                <h1 className="text-3xl mb-1">Call Center - Punto de Venta</h1>
                <div className="flex items-center gap-4 text-sm opacity-90">
                  <span className="flex items-center gap-1"><Building className="w-4 h-4" />{sucursal?.nombre}</span>
                  <span>• {user.name}</span>
                  {cajaAbierta ? (
                    <span className="bg-green-500/20 px-2 py-0.5 rounded flex items-center gap-1 border border-green-400/30">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>Caja #{cajaAbierta.numeroCaja || 1} Abierta
                    </span>
                  ) : (
                    <span className="bg-red-500/20 px-2 py-0.5 rounded flex items-center gap-1 border border-red-400/30">
                      <span className="w-2 h-2 bg-red-400 rounded-full"></span>Caja Cerrada
                    </span>
                  )}
                </div>
              </div>
             <div className="flex gap-2">
                <button
                  onClick={() => { setSearchReimprimir(""); loadVentasDelTurno(); setShowReimprimir(true); }}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <Printer className="w-4 h-4" />
                  Reimprimir
                </button>
                <button onClick={onLogout} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors">
                  <LogOut className="w-5 h-5" />Cerrar Sesión
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto p-6">
            {!cajaAbierta && (
              <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 p-2 rounded-full"><AlertTriangle className="w-6 h-6 text-amber-600" /></div>
                  <div>
                    <h3 className="font-bold text-amber-800">Caja Cerrada</h3>
                    <p className="text-amber-700 text-sm">Debes abrir una caja para poder registrar ventas y servicios.</p>
                  </div>
                </div>
                <button onClick={() => setShowCortesCaja(true)} className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors font-semibold shadow-sm">
                  Abrir Caja Ahora
                </button>
              </div>
            )}

            {cajaAbierta && (() => {
              const horasAbierta = (Date.now() - new Date(cajaAbierta.fechaApertura).getTime()) / (1000 * 60 * 60);
              const diasAbierta = Math.floor(horasAbierta / 24);
              if (horasAbierta < 24) return null;
              return (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-full"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
                    <div>
                      <h3 className="font-bold text-red-800">⚠️ Caja abierta hace {diasAbierta > 0 ? `${diasAbierta} día${diasAbierta > 1 ? 's' : ''}` : `${Math.floor(horasAbierta)} horas`}</h3>
                      <p className="text-red-700 text-sm">Recuerda hacer el corte de caja al terminar tu turno.</p>
                    </div>
                  </div>
                  <button onClick={() => setShowCortesCaja(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold shadow-sm whitespace-nowrap">
                    Hacer Corte Ahora
                  </button>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Call Center: recetas medicas deshabilitadas */}
                {false && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <QrCode className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold">Cargar Receta Médica</h3>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={codigoReceta} onChange={(e) => setCodigoReceta(e.target.value)}
                        placeholder="Código de receta" className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button onClick={loadReceta} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                        <Scan className="w-5 h-5" />Cargar
                      </button>
                    </div>
                  </div>
                )}

                {hasPermission("ver_inventario") ? (
                  <>
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2">
                          <Search className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold">Buscar Productos</h3>
                        </div>
                        {isModuleActive('reportes') && (
                          <button onClick={() => setShowAIAssistant(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md">
                            <Sparkles className="w-4 h-4" />Asistente IA
                          </button>
                        )}
                      </div>
                      <input 
  type="text" 
  value={searchTerm} 
  onChange={(e) => setSearchTerm(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      const exacto = productos.find(p => 
        p.codigoBarras === searchTerm.trim() ||
        p.codigoBarras === searchTerm.trim().replace(/^0+/, '')
      );
      if (exacto) {
        addToCart(exacto);
        setSearchTerm("");
      }
    }
  }}
  placeholder="Escanea código de barras o busca por nombre..."
  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  autoFocus
/>
                    </div>

                    <div className="bg-white rounded-lg shadow">
                      <div className="p-6 border-b"><h3 className="font-semibold">Productos Disponibles</h3></div>
                      <div className="max-h-96 overflow-y-auto">
                        {(() => {
                          const grupos: Record<string, any[]> = {};
                          filteredProductos.forEach((producto) => {
                            const clave = producto.sustanciaActiva && producto.concentracion
                              ? `${producto.sustanciaActiva.toLowerCase().trim()}|${producto.concentracion.toLowerCase().trim()}`
                              : `individual|${producto.codigoBarras}`;
                            if (!grupos[clave]) grupos[clave] = [];
                            grupos[clave].push(producto);
                          });
                          return Object.entries(grupos).map(([clave, productosGrupo]) => {
                            const esGrupo = !clave.startsWith("individual|");
                            const stockTotal = productosGrupo.reduce((sum, p) => sum + (p.stockBySucursal?.[assignedSucursalId!] || 0), 0);
                            const lotesGrupo = productosGrupo.flatMap((p) =>
                              lotes.filter((l: any) => l.codigoBarras === p.codigoBarras || l.productoId === p.codigoBarras)
                            ).sort((a: any, b: any) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999));
                            const loteMasCercano = lotesGrupo[0];
                            const diasVencimiento = loteMasCercano?.diasRestantes ?? null;
                            const esVencido = diasVencimiento !== null && diasVencimiento < 0;
                            const esCritico = diasVencimiento !== null && diasVencimiento >= 0 && diasVencimiento <= 7;
                            const esProximo = diasVencimiento !== null && diasVencimiento > 7 && diasVencimiento <= 30;
                            const productoPrincipal = loteMasCercano
                              ? productosGrupo.find((p) => p.codigoBarras === loteMasCercano.codigoBarras || p.codigoBarras === loteMasCercano.productoId) || productosGrupo[0]
                              : productosGrupo[0];
                            const precio = parseFloat(productoPrincipal.precioVenta) || parseFloat(productoPrincipal.precio) || 0;
                            return (
                              <div key={clave}
                                className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${esVencido ? "bg-red-50 border-l-4 border-l-red-500" : esCritico ? "bg-orange-50 border-l-4 border-l-orange-500" : esProximo ? "bg-yellow-50 border-l-4 border-l-yellow-400" : ""}`}
                                onClick={() => hasPermission("realizar_ventas") && addToCart(productoPrincipal)}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold">{productoPrincipal.nombre}</p>
                                      {esGrupo && productosGrupo.length > 1 && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{productosGrupo.length} presentaciones</span>}
                                      {esVencido && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">VENCIDO</span>}
                                      {esCritico && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">Vence en {diasVencimiento}d</span>}
                                      {esProximo && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Vence en {diasVencimiento}d</span>}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-0.5">Código: {productoPrincipal.codigoBarras}</p>
                                    {loteMasCercano && <p className="text-xs text-gray-400 mt-0.5">{loteMasCercano.proveedor || "Sin proveedor"} · Vence: {loteMasCercano.fechaVencimiento || "Sin fecha"} · Lote: {loteMasCercano.cantidadActual} uds</p>}
                                    {esGrupo && productosGrupo.length > 1 && (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {productosGrupo.map((p, i) => {
                                          const stockP = p.stockBySucursal?.[assignedSucursalId!] || 0;
                                          const lotesP = lotes.filter((l: any) => l.codigoBarras === p.codigoBarras || l.productoId === p.codigoBarras);
                                          const proveedorP = lotesP[0]?.proveedor || "Sin proveedor";
                                          return <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{proveedorP}: {stockP} uds</span>;
                                        })}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right ml-4 flex flex-col items-end gap-1">
                                    <p className="text-lg font-bold text-blue-600">${precio.toFixed(2)}</p>
                                    {hasPermission("realizar_ventas") && (
                                      <button onClick={(e) => { e.stopPropagation(); addToCart(productoPrincipal); }}
                                        className={`px-4 py-1 rounded text-sm font-semibold transition-colors text-white ${stockTotal <= 0 ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-600 hover:bg-blue-700"}`}>
                                        {stockTotal <= 0 ? "Agregar" : "Agregar"}
                                      </button>
                                    )}
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${stockTotal > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                      {stockTotal > 0 ? "Con Stock" : "Sin Stock"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-bold mb-2">Inventario Restringido</h3>
                    <p>No tienes permisos para ver el inventario de productos.</p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow sticky top-6">
                  <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                    <div className="flex items-center gap-2"><ShoppingCart className="w-6 h-6" /><h3 className="text-xl">Carrito de Compra</h3></div>
                    <p className="text-sm opacity-90 mt-1">{cart.length} productos</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-4">
                    {cart.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" /><p>El carrito está vacío</p>
                      </div>
                    ) : (
                      cart.map((item, index) => {
                        const precioUnitario = getPrecioItem(item);
                        const subtotal = precioUnitario * item.cantidad;
                        const esAntibiotico = isAntibiotico(item.producto);
                        return (
                          <div key={index} className="mb-4 pb-4 border-b last:border-0">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{item.producto.nombre}</p>
                                <p className="text-xs text-gray-500">${precioUnitario.toFixed(2)} c/u</p>
                                {item.isService && item.patientName && (
                                  <div className="flex items-center gap-1 mt-1"><Users className="w-3 h-3 text-purple-500" /><span className="text-xs text-purple-600 font-medium">Paciente: {item.patientName}</span></div>
                                )}
                                {esAntibiotico && (
                                  <div className="flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3 text-amber-500" /><span className="text-xs text-amber-600 font-medium">Antibiótico</span></div>
                                )}
                              </div>
                              <button onClick={() => removeFromCart(item.productoId)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateQuantity(item.productoId, -1)} className="bg-gray-200 hover:bg-gray-300 p-1 rounded"><Minus className="w-4 h-4" /></button>
                                <span className="w-8 text-center font-semibold">{item.cantidad}</span>
                                <button onClick={() => updateQuantity(item.productoId, 1)} className="bg-gray-200 hover:bg-gray-300 p-1 rounded"><Plus className="w-4 h-4" /></button>
                              </div>
                              <p className="font-bold text-blue-600">${subtotal.toFixed(2)}</p>
                            </div>
                            {!item.isService && getPreciosDisponibles(item.producto).length > 1 && (
                              <div className="mt-1 mb-2">
                                <p className="text-xs text-gray-600 mb-1">Precio:</p>
                                <div className="flex flex-wrap gap-1">
                                  {getPreciosDisponibles(item.producto).map((p, i) => {
                                    const activo = getPrecioItem(item) === p.valor;
                                    return (
                                      <button
                                        key={i}
                                        onClick={() => cambiarPrecioItem(item.productoId, p.valor)}
                                        className={`px-2 py-1 rounded text-xs font-medium transition-all ${activo ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                                      >
                                        {p.label}: ${p.valor.toFixed(2)}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {/* Call Center: tipo de surtido (Total/Parcial) deshabilitado */}
                            {false && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-600 mb-1">Tipo de surtido:</p>
                                <div className="flex gap-2">
                                  <button onClick={() => setSurtidoCompletoItem(item.productoId, true)} className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${item.surtidoCompleto === true ? "bg-green-500 text-white shadow" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>Total</button>
                                  <button onClick={() => setSurtidoCompletoItem(item.productoId, false)} className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${item.surtidoCompleto === false ? "bg-amber-500 text-white shadow" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>Parcial</button>
                                </div>
                                {item.surtidoCompleto === true && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check className="w-3 h-3" />Se generará código de control</p>}
                                {item.surtidoCompleto === false && <p className="text-xs text-amber-600 mt-1">No se generará código de control</p>}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {cart.length > 0 && (
                    <div className="p-6 border-t bg-gray-50">
                      <div className="flex justify-between items-center text-xl font-bold mb-4">
                        <span>Total:</span><span className="text-blue-600">${total.toFixed(2)}</span>
                      </div>
                      {!showPayment ? (
                        <button onClick={() => { if (hasPermission("realizar_ventas")) setShowPayment(true); else toast.error("No tienes permisos para realizar ventas"); }}
                          disabled={!hasPermission("realizar_ventas")}
                          className={`w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg ${!hasPermission("realizar_ventas") ? "opacity-50 cursor-not-allowed" : ""}`}>
                          {hasPermission("realizar_ventas") ? "Procesar Pago" : "Ventas Restringidas"}
                        </button>
                      ) : (
                        <div className="space-y-4">
                          <p className="font-semibold text-sm text-gray-700">Método de Pago:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: "efectivo", icon: <Banknote className="w-6 h-6 mx-auto mb-1 text-green-600" />, label: "Efectivo" },
                              { key: "tarjeta", icon: <CreditCard className="w-6 h-6 mx-auto mb-1 text-blue-600" />, label: "Tarjeta" },
                              { key: "transferencia", icon: <Building className="w-6 h-6 mx-auto mb-1 text-purple-600" />, label: "Transferencia" },
                              { key: "dividido", icon: <PieChart className="w-6 h-6 mx-auto mb-1 text-orange-600" />, label: "Pago Dividido" },
                            ].map(({ key, icon, label }) => (
                              <button key={key} onClick={() => setMetodoPago(key as any)}
                                className={`p-3 rounded-lg border-2 transition-all ${metodoPago === key ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-blue-300"}`}>
                                {icon}<span className="text-xs font-semibold">{label}</span>
                              </button>
                            ))}
                          </div>

                          {metodoPago === "dividido" && (
                            <div className="space-y-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <p className="text-xs font-bold text-gray-700 uppercase mb-2 text-center">Configurar Pagos</p>
                              {[
                                { num: "1", metodo: metodoDividido1, setMetodo: setMetodoDividido1, monto: montoDividido1, setMonto: setMontoDividido1, auth: authDividido1, setAuth: setAuthDividido1 },
                                { num: "2", metodo: metodoDividido2, setMetodo: setMetodoDividido2, monto: montoDividido2, setMonto: setMontoDividido2, auth: authDividido2, setAuth: setAuthDividido2 },
                              ].map(({ num, metodo, setMetodo, monto, setMonto, auth, setAuth }) => (
                                <div key={num} className="bg-white p-3 rounded border shadow-sm">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-gray-500">PAGO {num}</span>
                                    <select value={metodo} onChange={(e) => setMetodo(e.target.value as any)} className="text-xs border rounded p-1">
                                      <option value="efectivo">Efectivo</option>
                                      <option value="tarjeta">Tarjeta</option>
                                      <option value="transferencia">Transferencia</option>
                                    </select>
                                  </div>
                                  <div className="flex gap-2">
                                    <div className="flex-1">
                                      <label className="text-xs text-gray-600 block mb-1">Monto ($)</label>
                                      <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full px-2 py-1 border rounded text-sm font-bold text-gray-800" placeholder="0.00" />
                                    </div>
                                    {metodo !== "efectivo" && (
                                      <div className="flex-1">
                                        <label className="text-xs text-gray-600 block mb-1">Autorización</label>
                                        <input type="text" value={auth} onChange={(e) => setAuth(e.target.value)} className="w-full px-2 py-1 border rounded text-sm" placeholder="Código" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <div className="flex justify-between items-center pt-2 border-t">
                                <span className="text-xs text-gray-600">Total a Cubrir:</span>
                                <span className="font-bold text-gray-800">${total.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">Suma Actual:</span>
                                <span className={`font-bold ${(parseFloat(montoDividido1 || "0") + parseFloat(montoDividido2 || "0")) === total ? "text-green-600" : "text-red-500"}`}>
                                  ${(parseFloat(montoDividido1 || "0") + parseFloat(montoDividido2 || "0")).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}

                          {metodoPago === "efectivo" && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm text-gray-600 mb-1">Monto Recibido:</label>
                                <input type="number" step="0.01" value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} placeholder="$0.00" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg" />
                              </div>
                              {montoRecibido && parseFloat(montoRecibido) >= total && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-green-700">Cambio:</span>
                                    <span className="text-xl font-bold text-green-600">${(parseFloat(montoRecibido) - total).toFixed(2)}</span>
                                  </div>
                                </div>
                              )}
                              {montoRecibido && parseFloat(montoRecibido) < total && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <p className="text-sm text-red-600 text-center">Falta: ${(total - parseFloat(montoRecibido)).toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {(metodoPago === "tarjeta" || metodoPago === "transferencia") && (
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">Código de Autorización:</label>
                              <input type="text" value={codigoAutorizacion} onChange={(e) => setCodigoAutorizacion(e.target.value)}
                                placeholder={metodoPago === "tarjeta" ? "Ej: AUTH123456" : "Ej: TRANS123456"}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                          )}

                          {/* Call Center: cedula medica para antibioticos deshabilitada */}
                          {false && (
                            <div className="space-y-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                <p className="text-sm font-semibold text-amber-800">Antibiótico — Se requiere cédula del médico</p>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={cedulaMedico}
                                  onChange={(e) => {
                                    setCedulaMedico(e.target.value);
                                    setMedicoAntibioticoEncontrado(null);
                                    setNombreMedicoAntibiotico("");
                                  }}
                                  onBlur={(e) => buscarMedicoPorCedula(e.target.value)}
                                  placeholder="Cédula profesional del médico"
                                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                />
                                <button
                                  onClick={() => buscarMedicoPorCedula(cedulaMedico)}
                                  disabled={buscandoCedula || !cedulaMedico.trim()}
                                  className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 text-sm"
                                >
                                  {buscandoCedula ? "..." : "Buscar"}
                                </button>
                              </div>
                              {medicoAntibioticoEncontrado && (
                                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded px-3 py-2">
                                  <Check className="w-4 h-4 text-green-600" />
                                  <p className="text-sm text-green-700 font-semibold">{medicoAntibioticoEncontrado}</p>
                                </div>
                              )}
                              {cedulaMedico && !medicoAntibioticoEncontrado && !buscandoCedula && (
                                <div className="space-y-1">
                                  <p className="text-xs text-gray-600">Nombre del médico (no registrado):</p>
                                  <input
                                    type="text"
                                    value={nombreMedicoAntibiotico}
                                    onChange={(e) => setNombreMedicoAntibiotico(e.target.value)}
                                    placeholder="Escribe el nombre completo del médico"
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <button onClick={handlePagar} disabled={loading} className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            <Check className="w-5 h-5" />{loading ? "Procesando..." : "Confirmar Pago"}
                          </button>
                          <button onClick={() => setShowPayment(false)} className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm">Cancelar</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {showTicketVenta && ultimaVentaData && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><Check className="w-10 h-10 text-white" /></div>
                  <h2 className="text-2xl font-bold">¡Venta Exitosa!</h2>
                  <p className="text-green-100 text-sm mt-1">{new Date(ultimaVentaData.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} · Caja #{ultimaVentaData.numeroCaja}</p>
                </div>
                <div className="p-6 space-y-3">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{ultimaVentaData.items.length} artículo{ultimaVentaData.items.length !== 1 ? "s" : ""}</span>
                      <span className="text-2xl font-bold text-gray-900">${ultimaVentaData.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Método:</span>
                      <span className="font-semibold capitalize">{ultimaVentaData.metodoPago === "dividido" ? "Pago Dividido" : ultimaVentaData.metodoPago === "efectivo" ? "Efectivo" : ultimaVentaData.metodoPago === "tarjeta" ? "Tarjeta" : "Transferencia"}</span>
                    </div>
                    {ultimaVentaData.metodoPago === "efectivo" && ultimaVentaData.cambio > 0 && (
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-gray-500">Cambio:</span>
                        <span className="font-bold text-green-600 text-lg">${ultimaVentaData.cambio.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  {codigoControlGenerado && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">⚠️ Código de Control Antibiótico</p>
                      <p className="text-3xl font-bold text-blue-700 tracking-widest text-center py-2">{codigoControlGenerado}</p>
                      <p className="text-xs text-blue-500 text-center">Registrar en libro de antibióticos</p>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => { if (ultimaVentaData) printTicketVenta(ultimaVentaData); }} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors shadow">
                      <Printer className="w-5 h-5" />Imprimir Ticket
                    </button>
                    <button onClick={() => { setShowTicketVenta(false); setUltimaVentaData(null); setCodigoControlGenerado(null); }} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-colors">
                      <X className="w-5 h-5" />Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Modal: Reimprimir Ticket */}
          {showReimprimir && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
                
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Printer className="w-5 h-5 text-blue-600" />
                    <span className="text-lg font-bold text-gray-800">Reimprimir Ticket</span>
                    <span className="text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded-full px-3 py-0.5">
                      Turno de hoy · {ventasDelTurno.length} ventas
                    </span>
                  </div>
                  <button onClick={() => setShowReimprimir(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Buscador */}
                <div className="px-5 py-3 border-b bg-gray-50">
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchReimprimir}
                      onChange={(e) => setSearchReimprimir(e.target.value)}
                      placeholder="Buscar por producto o monto..."
                      className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
                      autoFocus
                    />
                    {searchReimprimir && (
                      <button onClick={() => setSearchReimprimir("")} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista */}
                <div className="overflow-y-auto flex-1">
                  {loadingVentas ? (
                    <div className="text-center py-12 text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                      <p className="text-sm">Cargando ventas del turno...</p>
                    </div>
                  ) : ventasDelTurno.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No hay ventas registradas en este turno</p>
                    </div>
                  ) : (() => {
                    const metodoPagoLabel: Record<string, string> = {
                      efectivo: "Efectivo", tarjeta: "Tarjeta",
                      transferencia: "Transferencia", dividido: "Dividido",
                    };
                    const metodoPagoColor: Record<string, string> = {
                      efectivo: "bg-green-100 text-green-700 border-green-200",
                      tarjeta: "bg-blue-100 text-blue-700 border-blue-200",
                      transferencia: "bg-purple-100 text-purple-700 border-purple-200",
                      dividido: "bg-amber-100 text-amber-700 border-amber-200",
                    };
                    const ventasFiltradas = ventasDelTurno.filter((v: any) => {
                      if (!searchReimprimir.trim()) return true;
                      const q = searchReimprimir.toLowerCase();
                      const montoMatch = String(v.total).includes(q);
                      const productoMatch = (v.productos || []).some((p: any) =>
                        (p.nombre || "").toLowerCase().includes(q)
                      );
                      return montoMatch || productoMatch;
                    });
                    if (ventasFiltradas.length === 0) return (
                      <div className="text-center py-12 text-gray-400">
                        <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">Sin resultados para "{searchReimprimir}"</p>
                      </div>
                    );
                    return ventasFiltradas.map((venta: any) => (
                      <div key={venta.id} className="px-5 py-4 border-b last:border-0 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-gray-800">
                                {new Date(venta.fecha).toLocaleTimeString("es-MX", {hour:"2-digit", minute:"2-digit"})}
                              </span>
                              <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${metodoPagoColor[venta.metodoPago] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                {metodoPagoLabel[venta.metodoPago] || venta.metodoPago}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              {(venta.productos || []).slice(0, 3).map((p: any, i: number) => (
                                <p key={i} className="text-sm text-gray-600 truncate">
                                  {p.cantidad}x {p.nombre}
                                </p>
                              ))}
                              {(venta.productos || []).length > 3 && (
                                <p className="text-xs text-gray-400">+{venta.productos.length - 3} producto(s) más</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 min-w-[90px]">
                            <span className="text-xl font-bold text-blue-600">
                              ${parseFloat(venta.total).toFixed(2)}
                            </span>
                            <button
                              onClick={() => handleReimprimirVenta(venta)}
                              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                              Imprimir
                            </button>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t bg-gray-50 flex justify-between items-center rounded-b-2xl">
                  <span className="text-sm text-gray-500">
                    Total del turno: <span className="font-bold text-gray-800">
                      ${ventasDelTurno.reduce((s, v) => s + (parseFloat(v.total) || 0), 0).toFixed(2)}
                    </span>
                  </span>
                  <button
                    onClick={() => setShowReimprimir(false)}
                    className="text-sm text-gray-600 border border-gray-300 rounded-lg px-4 py-1.5 hover:bg-gray-100 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>

              </div>
            </div>
          )}

{/* Modal: Cancelar Servicio */}
          {showCancelarServicio && servicioCancelar && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <X className="w-5 h-5 text-red-500" />
                  Cancelar Servicio
                </h3>
                <div className="bg-red-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-gray-800">{servicioCancelar.nombrePaciente}</p>
                  <p className="text-sm text-gray-600">{servicioCancelar.servicio}</p>
                  <p className="text-lg font-bold text-red-600 mt-1">${(servicioCancelar.monto || 0).toFixed(2)}</p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Motivo de cancelación *</label>
                  <textarea
                    value={motivoCancelacion}
                    onChange={(e) => setMotivoCancelacion(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 h-24"
                    placeholder="Describe el motivo de la cancelación..."
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowCancelarServicio(false); setServicioCancelar(null); setMotivoCancelacion(""); }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleCancelarServicio}
                    disabled={loading || !motivoCancelacion.trim()}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold"
                  >
                    {loading ? "Cancelando..." : "Confirmar Cancelación"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Call Center: servicios medicos y gastos deshabilitados */}
          {false && (
            <button onClick={() => setShowServiciosModal(true)} className="fixed bottom-8 right-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-40">
              <Stethoscope className="w-8 h-8" />
            </button>
          )}

          {showServiciosModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
                <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-2xl">
                  <div className="flex justify-between items-center">
                    <div><h2 className="text-2xl font-bold">Servicios Médicos</h2><p className="text-sm opacity-90 mt-1">Registra consultas, servicios y gastos</p></div>
                    <button onClick={() => { setShowServiciosModal(false); setServicioSeleccionado(null); setNombrePaciente(""); setMedicoAsignado(multipleMedicos ? "" : (medicosDisponibles[0]?.id || "")); setServiciosTab("servicios"); }} className="text-white/80 hover:text-white transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {[{ key: "servicios", icon: <Stethoscope className="w-4 h-4" />, label: "Servicios Médicos" }, { key: "gastos", icon: <Receipt className="w-4 h-4" />, label: "Gastos" }].map(({ key, icon, label }) => (
                      <button key={key} onClick={() => setServiciosTab(key as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${serviciosTab === key ? "bg-white text-purple-700 shadow" : "bg-white/20 text-white hover:bg-white/30"}`}>
                        {icon}{label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  {serviciosTab === "gastos" && (
                    <AgregarGasto user={user} selectedSucursal={assignedSucursalId || user.sucursalId || ""} onGastoCreated={() => toast.success("Gasto registrado.")} />
                  )}
                  {serviciosTab === "servicios" && (
                    <>
                      <div className="mb-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" />Selecciona un Servicio</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {SERVICIOS.map((servicio, index) => {
                            const esConsulta = servicio.nombre === "Consulta";
                            const esFestivo = esDiaFestivo();
                            const precioMostrar = esConsulta && esFestivo && servicio.precioFestivo ? servicio.precioFestivo : servicio.precio;
                            return (
                              <button key={index} onClick={() => setServicioSeleccionado(servicio)}
                                className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${servicioSeleccionado?.nombre === servicio.nombre ? "border-purple-600 bg-purple-50" : "border-gray-200 hover:border-purple-300"}`}>
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-800">{servicio.nombre}</p>
                                    {esConsulta && esFestivo && <p className="text-xs text-amber-600 mt-1">⚠️ Precio Domingo/Festivo</p>}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-purple-600">${precioMostrar.toFixed(2)}</p>
                                    {esConsulta && servicio.precioFestivo && <p className="text-xs text-gray-500 line-through">${servicio.precio.toFixed(2)}</p>}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {servicioSeleccionado && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-purple-600" />Datos del Paciente</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Completo del Paciente:</label>
                              <input type="text" value={nombrePaciente} onChange={(e) => setNombrePaciente(e.target.value)} placeholder="Ej: Juan Pérez García" className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            {multipleMedicos && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2"><Stethoscope className="w-4 h-4 inline mr-1" />Médico Asignado: *</label>
                                <select value={medicoAsignado} onChange={(e) => setMedicoAsignado(e.target.value)} className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                                  <option value="">-- Selecciona un médico --</option>
                                  {medicosDisponibles.map((medico) => (
                                    <option key={medico.id} value={medico.id}>Dr(a). {medico.nombre} {medico.especialidad ? `- ${medico.especialidad}` : ""}</option>
                                  ))}
                                </select>
                                <p className="text-xs text-gray-600 mt-1">Hay {medicosDisponibles.length} médicos en esta sucursal/turno</p>
                              </div>
                            )}
                            <div className="bg-white rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Servicio:</span>
                                <span className="font-semibold">{servicioSeleccionado.nombre}</span>
                              </div>
                              <div className="flex justify-between items-center text-xl">
                                <span className="font-bold text-gray-700">Total a Cobrar:</span>
                                <span className="font-bold text-purple-600">${(servicioSeleccionado.nombre === "Consulta" && esDiaFestivo() && servicioSeleccionado.precioFestivo ? servicioSeleccionado.precioFestivo : servicioSeleccionado.precio).toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <button onClick={handleRegistrarServicio} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2 font-semibold">
                                <ShoppingCart className="w-5 h-5" />Agregar al Carrito
                              </button>
                              <button onClick={() => { setServicioSeleccionado(null); setNombrePaciente(""); setMedicoAsignado(multipleMedicos ? "" : (medicosDisponibles[0]?.id || "")); }} className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {consultasPendientes.length > 0 && (
                        <div className="mt-6">
                          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-600" />Servicios de Hoy ({SUCURSALES.find(s => s.id === user.sucursalId)?.nombre || ""})</h3>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {consultasPendientes.filter(c => c.sucursalId === user.sucursalId).map((consulta) => (
                              <div key={consulta.id} className={`p-4 rounded-lg border-2 ${consulta.estado === "atendida" ? "border-green-200 bg-green-50" : consulta.estado === "cancelado" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                                <div className="flex justify-between items-center">
                                  <div className="flex-1">
                                    <p className="font-semibold">{consulta.nombrePaciente}</p>
                                    <p className="text-sm text-gray-600">{consulta.servicio} - ${consulta.monto.toFixed(2)}</p>
                                    {consulta.medicoId && (
                                      <p className="text-xs text-blue-600 mt-0.5 font-medium">
                                        Dr. {medicosDisponibles.find(m => m.id === consulta.medicoId)?.nombre || 
                                             medicos.find((m: any) => m.id === consulta.medicoId)?.nombre || 
                                             "Médico asignado"}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">
                                      Llegó: {new Date(consulta.fecha).toLocaleTimeString("es-MX", {hour:'2-digit', minute:'2-digit'})}
                                      {consulta.fechaAtencion && ` — Atendido: ${new Date(consulta.fechaAtencion).toLocaleTimeString("es-MX", {hour:'2-digit', minute:'2-digit'})} — Espera: ${Math.round((new Date(consulta.fechaAtencion).getTime() - new Date(consulta.fecha).getTime()) / 60000)} min`}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${consulta.estado === "atendida" ? "bg-green-200 text-green-800" : consulta.estado === "cancelado" ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"}`}>
                                      {consulta.estado === "atendida" ? "✓ Atendida" : consulta.estado === "cancelado" ? "✗ Cancelado" : "Pendiente"}
                                    </div>
                                    {consulta.estado === "pendiente" && (
                                      <button
                                        onClick={() => { setServicioCancelar(consulta); setShowCancelarServicio(true); }}
                                        className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors font-semibold"
                                      >
                                        Cancelar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {hasPermission("ver_reportes") && (
            <button onClick={() => setShowCortesCaja(true)} className="fixed bottom-8 left-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-40">
              <CreditCard className="w-8 h-8" />
            </button>
          )}

          {showAIAssistant && (
            <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
              <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 flex justify-between items-center">
                  <div className="flex items-center gap-3"><Sparkles className="w-6 h-6" /><div><h2 className="text-2xl font-bold">Asistente IA</h2><p className="text-purple-100 text-sm">Búsqueda inteligente de productos</p></div></div>
                  <button onClick={() => { setShowAIAssistant(false); setAiQuery(""); setAiResponse(null); }} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">¿Qué estás buscando?</label>
                    <div className="flex gap-2">
                      <input type="text" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} onKeyPress={(e) => e.key === "Enter" && !aiLoading && handleAIAssistant()}
                        placeholder="Ej: Necesito algo para el dolor de cabeza fuerte..." disabled={aiLoading}
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                      <button onClick={handleAIAssistant} disabled={aiLoading || !aiQuery.trim()} className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                        {aiLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Buscando...</> : <><Send className="w-5 h-5" />Buscar</>}
                      </button>
                    </div>
                  </div>
                  {aiResponse && (
                    <div className="space-y-4">
                      {aiResponse.products && aiResponse.products.length > 0 && (
                        <div className="bg-white border-2 border-purple-200 rounded-xl p-4">
                          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-purple-800"><Package className="w-5 h-5" />Productos Recomendados</h3>
                          <div className="space-y-3">
                            {aiResponse.products.map((product: any, index: number) => {
                              const fullProduct = productos.find(p => p.nombre.toLowerCase().includes(product.nombre.toLowerCase()));
                              return (
                                <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 cursor-pointer transition-colors"
                                  onClick={() => { if (fullProduct) { addToCart(fullProduct); toast.success(`${product.nombre} agregado al carrito`); } }}>
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-900">{product.nombre}</p>
                                      <p className="text-sm text-gray-600">{product.sustancia}</p>
                                      {product.reason && <p className="text-sm text-purple-700 mt-1">💡 {product.reason}</p>}
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="text-lg font-bold text-purple-600">${product.precio?.toFixed(2)}</p>
                                      <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {aiResponse.interactions && aiResponse.interactions.length > 0 && (
                        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4">
                          <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-yellow-800"><AlertTriangle className="w-5 h-5" />⚠️ Posibles Interacciones Medicamentosas</h3>
                          <div className="space-y-2">
                            {aiResponse.interactions.map((interaction: any, index: number) => (
                              <div key={index} className="p-3 bg-yellow-100 rounded-lg border border-yellow-300">
                                <p className="font-semibold text-yellow-900">{interaction.title}</p>
                                <p className="text-sm text-yellow-800 mt-1">{interaction.description}</p>
                                {interaction.severity && <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-bold ${interaction.severity === 'alta' ? 'bg-red-200 text-red-900' : interaction.severity === 'media' ? 'bg-yellow-200 text-yellow-900' : 'bg-blue-200 text-blue-900'}`}>Severidad: {interaction.severity}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {aiResponse.explanation && (
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                          <h3 className="font-bold text-lg mb-2 text-blue-800">📝 Información</h3>
                          <p className="text-gray-700 leading-relaxed">{aiResponse.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {!aiResponse && !aiLoading && (
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="font-semibold mb-3 text-gray-700">Ejemplos de búsqueda:</h3>
                      <div className="space-y-2">
                        {["Necesito algo para el dolor de cabeza intenso", "Antibiótico para infección de garganta", "Medicamento para bajar la fiebre en niños", "Antiinflamatorio que no afecte el estómago", "Antiácido para gastritis"].map((example, i) => (
                          <button key={i} onClick={() => setAiQuery(example)} className="block w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors text-sm text-gray-700">
                            💬 {example}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}