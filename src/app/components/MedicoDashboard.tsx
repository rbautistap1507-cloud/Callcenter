import { useState, useEffect, useRef } from "react";
import { SUCURSALES, User } from "../shared";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { toast } from "sonner";
import Barcode from "react-barcode";
import CertificadoMedicoForm from "./CertificadoMedicoForm";
import ModuleGuard from "./ModuleGuard";
import {
  Stethoscope,
  UserPlus,
  FileText,
  LogOut,
  Building,
  Plus,
  Trash2,
  Check,
  Copy,
  Users,
  Search,
  Package,
  Printer,
  ClipboardList,
  Activity,
  ChevronDown,
  ChevronUp,
  Eye,
  Syringe,
  Heart,
  Droplet,
  FileCheck,
  Ear,
  Scissors,
  Bandage,
  Menu,
  ArrowLeft,
  Clock,
  X,
  Bell,
} from "lucide-react";

interface MedicoDashboardProps {
  user: User;
  onLogout: () => void;
}

interface Paciente {
  nombre: string;
  edad: number;
  sexo: string;
  peso: number;
  talla: number;
  alergias: string;
  ta: string;
  temperatura: number;
  frecuenciaCardiaca: number;
  satO2: number;
  antecedentesPersonales: string;
  diagnostico: string;
  notas: string;
}

interface Medicamento {
  codigo: string;
  nombre: string;
  cantidad: number;
  precio: number;
  dosis: string;
  frecuencia: string;
  duracion: string;
  cantidadPorDosis?: number;
  viaAdministracion?: string;
  sinStock?: boolean;
}

type TipoServicio = 
  | "menu"
  | "inyeccion"
  | "presion"
  | "glucemia"
  | "certificado"
  | "certificado-escolar"
  | "lavado-otico"
  | "revision-diu"
  | "colocacion-diu"
  | "retiro-implante"
  | "retiro-puntos"
  | "sutura"
  | "cambio-sonda"
  | "curacion-menor"
  | "curacion-mayor"
  | "consulta"
  | "otros-servicios";

const SERVICIOS_MENU = [
  { id: "inyeccion", nombre: "Aplicación de Inyección", icon: Syringe, color: "blue" },
  { id: "presion", nombre: "Toma de Presión Arterial", icon: Heart, color: "red" },
  { id: "glucemia", nombre: "Toma de Glucemia", icon: Droplet, color: "purple" },
  { id: "certificado", nombre: "Certificado Médico Laboral", icon: FileCheck, color: "green" },
  { id: "certificado-escolar", nombre: "Certificado Médico Escolar", icon: FileCheck, color: "violet" },
  { id: "lavado-otico", nombre: "Lavado Ótico", icon: Ear, color: "teal" },
  { id: "revision-diu", nombre: "Revisión o Retiro de DIU", icon: Activity, color: "pink" },
  { id: "colocacion-diu", nombre: "Colocación o Cambio de DIU", icon: Plus, color: "indigo" },
  { id: "retiro-implante", nombre: "Retiro de Implante", icon: Scissors, color: "orange" },
  { id: "retiro-puntos", nombre: "Retiro de Puntos", icon: Scissors, color: "teal" },
  { id: "sutura", nombre: "Sutura Básica", icon: Bandage, color: "cyan" },
  { id: "cambio-sonda", nombre: "Cambio de Sonda", icon: Activity, color: "lime" },
  { id: "curacion-menor", nombre: "Curación Menor", icon: Bandage, color: "emerald" },
  { id: "curacion-mayor", nombre: "Curación Mayor", icon: Bandage, color: "rose" },
  { id: "consulta", nombre: "Consulta Médica Completa", icon: Stethoscope, color: "teal" },
  { id: "otros-servicios", nombre: "Otros Servicios", icon: Menu, color: "gray" },
];

export default function MedicoDashboard({ user, onLogout }: MedicoDashboardProps) {
  const [tipoServicio, setTipoServicio] = useState<TipoServicio>("menu");
  const [productos, setProductos] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [recetas, setRecetas] = useState<any[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [generatedCode, setGeneratedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchMedicamento, setSearchMedicamento] = useState("");
  const [pacienteReceta, setPacienteReceta] = useState<Paciente | null>(null);
  const [medicamentosReceta, setMedicamentosReceta] = useState<Medicamento[]>([]);
  const [activeTab, setActiveTab] = useState<"servicio" | "historial">("servicio");
  const [searchHistorial, setSearchHistorial] = useState("");
  const [expandedPacienteHistorial, setExpandedPacienteHistorial] = useState<string | null>(null);
  const [showPreviewReceta, setShowPreviewReceta] = useState(false);

  // Estados para servicios simples
  const [nombrePacienteServicio, setNombrePacienteServicio] = useState("");
  const [productoInyeccion, setProductoInyeccion] = useState("");
  const [searchProductoInyeccion, setSearchProductoInyeccion] = useState("");
  const [procedimientoRealizado, setProcedimientoRealizado] = useState("");
  const [valorPresion, setValorPresion] = useState("");
  const [valorGlucemia, setValorGlucemia] = useState("");
  const [certificadoGenerado, setCertificadoGenerado] = useState(false);

  // Estados para consultas pendientes
  const [consultasPendientes, setConsultasPendientes] = useState<any[]>([]);
  const prevConsultasPendientesCount = useRef(0);
  const [showConsultasPendientes, setShowConsultasPendientes] = useState(false);
  
  // Estado para la sucursal asignada
  const [assignedSucursalId, setAssignedSucursalId] = useState(user.sucursalId);
  const assignedSucursalRef = useRef(user.sucursalId);
  const [lotes, setLotes] = useState<any[]>([]);
  const [serviciosMedicos, setServiciosMedicos] = useState<any[]>([]);
  const [historiaClinica, setHistoriaClinica] = useState<any[]>([]);
  const [historiaSeleccionada, setHistoriaSeleccionada] = useState<any | null>(null);
  const [searchHistoriaClinica, setSearchHistoriaClinica] = useState("");
  const [showFormHistoria, setShowFormHistoria] = useState(false);
  const [loadingHistoria, setLoadingHistoria] = useState(false);
  const [formHistoria, setFormHistoria] = useState({
    nombrePaciente: "",
    antecedentesHeredofamiliares: "",
    antecedentesPersonalesNoPat: "",
    antecedentesPersonalesPat: "",
    antecedentesGinecoobs: "",
    padecimientoActual: "",
    exploracionFisica: "",
    resultadosLaboratorio: "",
    tratamientoResultados: "",
    notasMedicas: "",
  });
  const [notaEvolucion, setNotaEvolucion] = useState("");
  
  const sucursal = SUCURSALES.find((s) => s.id === assignedSucursalId);

  // Estado para consulta médica completa
  const [paciente, setPaciente] = useState<Paciente>({
    nombre: "",
    edad: 0,
    sexo: "M",
    peso: 0,
    talla: 0,
    alergias: "",
    ta: "",
    temperatura: 0,
    frecuenciaCardiaca: 0,
    satO2: 0,
    antecedentesPersonales: "",
    diagnostico: "",
    notas: "",
  });

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const tiempos = [0, 0.25, 0.5];
      tiempos.forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime + t);
        gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.2);
      });
    } catch (e) {
      console.warn("No se pudo reproducir sonido:", e);
    }
  };

  const checkDailyAssignment = async (): Promise<string> => {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/staff-assignments/today/${user.id}`,
      { headers: { Authorization: `Bearer ${publicAnonKey}` } }
    );
    const data = await response.json();

    if (data.success && data.assignment) {
      const assignment = data.assignment;
      const sucursalAsignada = assignment.sucursalId;
      setAssignedSucursalId(sucursalAsignada);
      assignedSucursalRef.current = sucursalAsignada;

      const sucursalNombre = SUCURSALES.find(s => s.id === sucursalAsignada)?.nombre;
      if (sucursalAsignada !== user.sucursalId) {
        toast.info(`📅 Asignación de Hoy: ${sucursalNombre} - Turno ${assignment.shift}`, { duration: 6000 });
      }
      return sucursalAsignada;
    } else {
  setAssignedSucursalId(user.sucursalId);
  assignedSucursalRef.current = user.sucursalId;
  return user.sucursalId;
}
  } catch (error) {
    console.error("Error checking assignment:", error);
    setAssignedSucursalId(user.sucursalId);
    assignedSucursalRef.current = user.sucursalId;
    return user.sucursalId;
  }
};

const loadConsultasPendientes = async (sucursalId?: string) => {
  const sucursalActual = sucursalId || assignedSucursalId;
  if (!sucursalActual) return;

  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/consultas`,
      { headers: { Authorization: `Bearer ${publicAnonKey}` } }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (data.success) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const serviciosSucursal = (data.consultas || []).filter((c: any) => {
        // Filtrar por sucursal actual
        if (c.sucursalId !== sucursalActual) return false;

        // Filtrar por día actual
        const fechaServicio = new Date(c.fecha);
        fechaServicio.setHours(0, 0, 0, 0);
        if (fechaServicio.getTime() !== hoy.getTime()) return false;

        // Mostrar si:
        // 1. No tiene medicoId asignado (compatibilidad)
        // 2. Está asignado a este médico
        // 3. El médico está cubriendo esta sucursal (asignación temporal)
        if (!c.medicoId) return true;
        if (c.medicoId === user.id) return true;

        return false;
      });

      const pendientesNuevos = serviciosSucursal.filter((c: any) => c.estado === "pendiente").length;
      if (pendientesNuevos > prevConsultasPendientesCount.current) {
        playNotificationSound();
      }
      prevConsultasPendientesCount.current = pendientesNuevos;
      setConsultasPendientes(serviciosSucursal);
    }
  } catch (error) {
    console.error("Error cargando servicios médicos:", error);
  }
};

  useEffect(() => {
  const initialize = async () => {
    // Primero obtener la sucursal asignada
    const sucursalId = await checkDailyAssignment();

    // Cargar datos usando la sucursal correcta desde el inicio
    loadProductos();
    loadLotes();
    loadPacientes();
    loadRecetas();
    // Pasar sucursal directamente para evitar condición de carrera
    loadConsultasPendientes(sucursalId);
    loadServiciosMedicos();
    loadHistoriasClinicas();
  };

  initialize();

  const interval = setInterval(() => loadConsultasPendientes(assignedSucursalRef.current), 10000);
  return () => clearInterval(interval);
}, []);

  const loadProductos = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setProductos(data.productos || []);
      }
    } catch (error) {
      console.error("Error cargando productos:", error);
    }
  };

  const loadLotes = async () => {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/lotes?sucursal=${assignedSucursalId}`,
      { headers: { Authorization: `Bearer ${publicAnonKey}` } }
    );
    const data = await response.json();
    if (data.success) {
      setLotes(data.lotes || []);
    }
  } catch (error) {
    console.error("Error cargando lotes:", error);
  }
};
  
  const loadPacientes = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/pacientes`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setPacientes(data.pacientes || []);
      }
    } catch (error) {
      console.error("Error cargando pacientes:", error);
    }
  };
const loadServiciosMedicos = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/servicios-medicos`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        const propios = (data.servicios || []).filter(
          (s: any) => s.medicoId === user.id
        );
        setServiciosMedicos(propios);
      }
    } catch (error) {
      console.error("Error cargando servicios médicos:", error);
    }
  };
const loadHistoriasClinicas = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/historias-clinicas`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        setHistoriaClinica(data.historias || []);
      }
    } catch (error) {
      console.error("Error cargando historias clínicas:", error);
    }
  };

  const loadRecetas = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/recetas`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        // Filtrar solo las recetas del médico actual
        const recetasMedico = (data.recetas || []).filter(
          (receta: any) => receta.medicoId === user.id
        );
        setRecetas(recetasMedico);
      }
    } catch (error) {
      console.error("Error cargando recetas:", error);
    }
  };

  
  
  const handleAtenderConsulta = async (consultaId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/consultas/${consultaId}/atender`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        toast.success("Servicio marcado como atendido");
        loadConsultasPendientes();
      } else {
        toast.error("Error al marcar servicio como atendido");
      }
    } catch (error) {
      console.error("Error atendiendo servicio:", error);
      toast.error("Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarServicioSimple = async (tipoServicio: string, detalles: any) => {
    if (!nombrePacienteServicio.trim()) {
      toast.error("Ingresa el nombre del paciente");
      return;
    }

    setLoading(true);
    try {
      const registro = {
        tipo: tipoServicio,
        paciente: nombrePacienteServicio,
        medicoId: user.id,
        sucursalId: assignedSucursalId,
        detalles,
        fecha: new Date().toISOString(),
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/servicios-medicos`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registro),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Servicio registrado correctamente");
        resetFormularioServicio();
        setTipoServicio("menu");
      } else {
        toast.error("Error al registrar el servicio");
      }
    } catch (error) {
      console.error("Error guardando servicio:", error);
      toast.error("Error al guardar el servicio");
    } finally {
      setLoading(false);
    }
  };

  const resetFormularioServicio = () => {
    setNombrePacienteServicio("");
    setProductoInyeccion("");
    setSearchProductoInyeccion("");
    setProcedimientoRealizado("");
    setValorPresion("");
    setValorGlucemia("");
    setCertificadoGenerado(false);
  };

  const resetPaciente = () => {
    setPaciente({
      nombre: "",
      edad: 0,
      sexo: "M",
      peso: 0,
      talla: 0,
      alergias: "",
      ta: "",
      temperatura: 0,
      frecuenciaCardiaca: 0,
      satO2: 0,
      antecedentesPersonales: "",
      diagnostico: "",
      notas: "",
    });
  };

  const handleGenerateReceta = async () => {
    if (!paciente.nombre || medicamentos.length === 0) {
      toast.error("Completa los datos del paciente y agrega medicamentos");
      return;
    }

    setLoading(true);
    try {
      const pacienteResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/pacientes`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            ...paciente, 
            medicoId: user.id,
            sucursalId: assignedSucursalId 
          }),
        }
      );

      const pacienteData = await pacienteResponse.json();

      const recetaPayload = {
        pacienteId: pacienteData.pacienteId,
        paciente,
        medicoId: user.id,
        sucursalId: assignedSucursalId,
        medicamentos: medicamentos.map((m) => ({
          codigo: m.codigo,
          cantidad: m.cantidad,
          nombre: m.nombre,
          dosis: m.dosis,
          frecuencia: m.frecuencia,
          duracion: m.duracion,
          viaAdministracion: m.viaAdministracion || "",
          cantidadPorDosis: m.cantidadPorDosis || 1,
          sinStock: m.sinStock || false,
        })),
      };

      const recetaResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/recetas`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(recetaPayload),
        }
      );

      const recetaData = await recetaResponse.json();
      if (recetaData.success) {
        setPacienteReceta({ ...paciente });
        setMedicamentosReceta([...medicamentos]);
        setGeneratedCode(recetaData.codigo);
        setShowPreviewReceta(true);
        toast.success("Receta generada correctamente");
        loadPacientes();
        loadRecetas();
        resetPaciente();
        setMedicamentos([]);
      }
    } catch (error) {
      console.error("Error generando receta:", error);
      toast.error("Error al generar receta");
    } finally {
      setLoading(false);
    }
  };

  const addMedicamento = (producto: any) => {
    const stockSucursal = producto.stockBySucursal?.[assignedSucursalId!] || 0;
    const sinStock = stockSucursal === 0;

    const exists = medicamentos.find((m) => m.codigo === producto.codigo);
    if (exists) {
      toast.error("Medicamento ya agregado");
      return;
    }

    if (sinStock) {
      toast.warning(`⚠️ "${producto.nombre}" sin stock — se agregará como referencia en la receta`);
    } else {
      toast.success("Medicamento agregado - Configure la dosificación");
    }

    setMedicamentos([
      ...medicamentos,
      {
        codigo: producto.codigo,
        nombre: producto.nombre,
        cantidad: 1,
        precio: producto.precio,
        dosis: "",
        frecuencia: "",
        duracion: "",
        cantidadPorDosis: 1,
        viaAdministracion: "",
        sinStock,
      },
    ]);
  };

  const removeMedicamento = (codigo: string) => {
    setMedicamentos(medicamentos.filter((m) => m.codigo !== codigo));
  };

  const updateMedicamento = (codigo: string, field: string, value: string | number) => {
    setMedicamentos(
      medicamentos.map((m) => (m.codigo === codigo ? { ...m, [field]: value } : m))
    );
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success("Código copiado al portapapeles");
  };

  // Función para detectar el tipo de presentación del producto
  const detectarTipoProducto = (nombre: string): string => {
    const nombreUpper = nombre.toUpperCase();
    
    // Detectar cápsulas
    if (nombreUpper.includes("CAP") || nombreUpper.includes("CAPS") || nombreUpper.includes("CAPSULA")) {
      return "capsula";
    }
    
    // Detectar tabletas
    if (nombreUpper.includes("TAB") || nombreUpper.includes("TABLETA") || nombreUpper.includes("COMPRIMIDO")) {
      return "tableta";
    }
    
    // Detectar jarabes y suspensiones
    if (nombreUpper.includes("JARABE") || nombreUpper.includes("JBE") || nombreUpper.includes("SUSP") || nombreUpper.includes("SUSPENSION")) {
      return "jarabe";
    }
    
    // Detectar inyectables
    if (nombreUpper.includes("INYECTABLE") || nombreUpper.includes("INY") || nombreUpper.includes("AMP") || nombreUpper.includes("AMPOLLA")) {
      return "inyectable";
    }
    
    // Detectar cremas/ungüentos
    if (nombreUpper.includes("CREMA") || nombreUpper.includes("UNGUENTO") || nombreUpper.includes("GEL") || nombreUpper.includes("POMADA")) {
      return "crema";
    }
    
    // Detectar gotas
    if (nombreUpper.includes("GOTAS") || nombreUpper.includes("GTS") || nombreUpper.includes("OFTALMICA") || nombreUpper.includes("OTICA")) {
      return "gotas";
    }
    
    // Detectar sobres
    if (nombreUpper.includes("SOBRE") || nombreUpper.includes("POLVO")) {
      return "sobre";
    }
    
    // Detectar soluciones
    if (nombreUpper.includes("SOLUCION") || nombreUpper.includes("SOL.")) {
      return "jarabe"; // Usar ml
    }
    
    // Por defecto
    return "unidad";
  };

  // Función para generar la indicación completa automáticamente
  const generarIndicacion = (nombre: string, cantidadPorDosis: number, frecuencia: string, duracion: string): string => {
    if (!cantidadPorDosis || !frecuencia || !duracion) {
      return "";
    }
    
    const tipo = detectarTipoProducto(nombre);
    let unidad = "";
    
    switch (tipo) {
      case "capsula":
        unidad = cantidadPorDosis === 1 ? "cápsula" : "cápsulas";
        break;
      case "tableta":
        unidad = cantidadPorDosis === 1 ? "tableta" : "tabletas";
        break;
      case "jarabe":
        unidad = "ml";
        break;
      case "inyectable":
        unidad = cantidadPorDosis === 1 ? "ampolla" : "ampollas";
        break;
      case "crema":
        return `Aplicar ${frecuencia} por ${duracion}`;
      case "gotas":
        unidad = cantidadPorDosis === 1 ? "gota" : "gotas";
        break;
      case "sobre":
        unidad = cantidadPorDosis === 1 ? "sobre" : "sobres";
        break;
      default:
        unidad = cantidadPorDosis === 1 ? "unidad" : "unidades";
    }
    
    return `${cantidadPorDosis} ${unidad} ${frecuencia} por ${duracion}`;
  };

  const handlePrintReceta = () => {
    if (!pacienteReceta || medicamentosReceta.length === 0) {
      toast.error("No hay datos de receta para imprimir");
      return;
    }

    if ((pacienteReceta.notas?.length || 0) > 200) {
      toast.error("Las notas exceden 200 caracteres — redúcelas antes de imprimir");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) { toast.error("Permite ventanas emergentes para imprimir"); return; }

    const sucursalDireccion = sucursal?.direccion || user.direccion || "";
    const sucursalNombre = sucursal?.nombre || "";
    const logoUrl = user.logoEscuela || user.logo_universidad || "";
    const fecha = new Date().toLocaleDateString("es-MX", { year:"numeric", month:"long", day:"numeric" });

    const medicamentosHtml = `
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>
          <tr style="background:#0d9488;color:white;">
            <th style="padding:4px;text-align:left;width:5%;">#</th>
            <th style="padding:4px;text-align:left;width:35%;">Medicamento</th>
            <th style="padding:4px;text-align:left;width:42%;">Instrucciones</th>
            <th style="padding:4px;text-align:left;width:18%;">Vía</th>
          </tr>
        </thead>
        <tbody>
          ${medicamentosReceta.map((med, index) => {
            const instrucciones = med.dosis || [
              med.cantidadPorDosis ? `${med.cantidadPorDosis}` : "",
              med.frecuencia || "",
              med.duracion ? `por ${med.duracion}` : ""
            ].filter(Boolean).join(" ");
            return `
            <tr style="border-bottom:1px solid #e5e7eb;background:${index % 2 === 0 ? "#f9fafb" : "#ffffff"};">
              <td style="padding:4px;font-weight:bold;color:#0d9488;">${index + 1}</td>
              <td style="padding:4px;font-weight:600;font-size:9px;">${med.nombre}</td>
              <td style="padding:4px;font-size:9px;">${instrucciones || "-"}</td>
              <td style="padding:4px;font-size:9px;">${med.viaAdministracion || "-"}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    `;

    const headerHtml = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0d9488;padding-bottom:6px;margin-bottom:6px;">
        <div style="flex:1;">
          <h1 style="font-size:13px;font-weight:bold;color:#0d9488;margin:0 0 2px 0;">${user.name}</h1>
          <p style="font-size:9px;color:#374151;margin:1px 0;">${user.escuela || user.universidad || "Universidad Autónoma de Coahuila"}</p>
          <p style="font-size:9px;color:#374151;margin:1px 0;">Cédula Profesional: ${user.cedula || ""}</p>
          ${user.especialidad ? `<p style="font-size:9px;color:#374151;margin:1px 0;">Especialidad: ${user.especialidad}</p>` : ""}
          ${sucursalNombre ? `<p style="font-size:9px;color:#374151;margin:1px 0;">Sucursal: ${sucursalNombre}</p>` : ""}
          ${sucursalDireccion ? `<p style="font-size:9px;color:#374151;margin:1px 0;">${sucursalDireccion}</p>` : ""}
          ${user.telefono ? `<p style="font-size:9px;color:#374151;margin:1px 0;">Tel: ${user.telefono}</p>` : ""}
        </div>
        <div style="display:flex;flex-direction:row;align-items:center;gap:20px;margin-left:10px;">
          <div style="text-align:center;width:140px;">
            <div style="border-top:1px solid #111;padding-top:4px;font-size:8px;color:#374151;text-align:center;line-height:1.4;">
              ${user.name}<br>Cédula: ${user.cedula || ""}
            </div>
          </div>
          ${logoUrl
            ? `<img src="${logoUrl}" style="width:100px;height:100px;object-fit:contain;" alt="Logo" />`
            : `<div style="width:100px;height:100px;background:#0d9488;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:20px;font-weight:bold;">${(user.escuela || "UAC").substring(0,3).toUpperCase()}</div>`
          }
        </div>
      </div>
    `;

    const datosHtml = (barcodeDatosId: string) => `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;padding:6px;margin-bottom:6px;font-size:10px;">
        <div style="display:flex;gap:8px;margin-bottom:3px;">
          
          <!-- Barcode lado izquierdo -->
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:130px;padding-right:8px;border-right:1px solid #e5e7eb;">
            <canvas id="${barcodeDatosId}" style="width:120px;height:40px;display:block;"></canvas>
            <p style="font-size:7px;color:#6b7280;margin:2px 0;text-align:center;">${generatedCode}</p>
          </div>

          <!-- Datos lado derecho -->
          <div style="flex:1;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:3px;">
              <div><span style="font-weight:600;color:#0d9488;">Paciente:</span> ${pacienteReceta?.nombre || ""}</div>
              <div><span style="font-weight:600;color:#0d9488;">Fecha:</span> ${fecha}</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;margin-bottom:3px;font-size:9px;">
              <div><span style="font-weight:600;color:#0d9488;">Edad:</span> ${pacienteReceta?.edad || ""} años</div>
              <div><span style="font-weight:600;color:#0d9488;">Sexo:</span> ${pacienteReceta?.sexo === "M" ? "M" : "F"}</div>
              <div><span style="font-weight:600;color:#0d9488;">Peso:</span> ${pacienteReceta?.peso || ""} kg</div>
              <div><span style="font-weight:600;color:#0d9488;">Talla:</span> ${pacienteReceta?.talla || ""} cm</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-bottom:3px;font-size:9px;">
              ${pacienteReceta?.ta ? `<div><span style="font-weight:600;color:#0d9488;">T.A.:</span> ${pacienteReceta.ta}</div>` : ""}
              ${pacienteReceta?.temperatura ? `<div><span style="font-weight:600;color:#0d9488;">Temp:</span> ${pacienteReceta.temperatura}°C</div>` : ""}
              ${(pacienteReceta as any)?.satO2 ? `<div><span style="font-weight:600;color:#0d9488;">SatO2:</span> ${(pacienteReceta as any).satO2}%</div>` : ""}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:2px;font-size:9px;">
              ${pacienteReceta?.alergias ? `<div><span style="font-weight:600;color:#0d9488;">Alergias:</span> ${pacienteReceta.alergias}</div>` : "<div></div>"}
              ${(pacienteReceta as any)?.antecedentesPersonales ? `<div><span style="font-weight:600;color:#0d9488;">Antecedentes:</span> ${(pacienteReceta as any).antecedentesPersonales}</div>` : "<div></div>"}
            </div>
            <div style="font-size:9px;margin-bottom:2px;"><span style="font-weight:600;color:#0d9488;">Diagnóstico:</span> ${pacienteReceta?.diagnostico || ""}</div>
            ${pacienteReceta?.notas ? `<div style="font-size:9px;"><span style="font-weight:600;color:#0d9488;">Notas:</span> ${pacienteReceta.notas}</div>` : ""}
          </div>
        </div>
      </div>
    `;

    const firmaHtml = ``;

    const barcodeHtml = ``;

    const recetaHtml = (barcodeId: string) => `
      <div style="width:100%;height:5.5in;padding:3mm 4mm;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;">
        <div style="width:100%;height:100%;border:2px solid #0d9488;border-radius:6px;padding:8px;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;">
          ${headerHtml}
          <div style="text-align:center;font-size:11px;font-weight:bold;color:#0d9488;text-transform:uppercase;margin-bottom:5px;">Receta Médica Individual</div>
          ${datosHtml(barcodeId === "barcodeCanvas1" ? "barcodeDatos1" : "barcodeDatos2")}
          <div style="flex:1;">
            <div style="font-weight:bold;color:#0d9488;font-size:10px;border-bottom:2px solid #0d9488;padding-bottom:2px;margin-bottom:4px;">Medicamentos Prescritos</div>
            ${medicamentosHtml}
          </div>
          ${firmaHtml}
          ${barcodeHtml.replace("BARCODE_ID", barcodeId)}
        </div>
      </div>
    `;

    const printContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receta Médica</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <style>
    @page { size: letter; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 8.5in; height: 11in; font-family: Arial, sans-serif; background: white; }
    .pagina { width: 8.5in; height: 11in; display: flex; flex-direction: column; overflow: hidden; }
    .receta-mitad { height: 5.5in; flex: 0 0 5.5in; overflow: hidden; }
    .linea-corte {
      width: 100%; border-top: 2px dashed #9ca3af;
      position: absolute; top: 5.5in; left: 0;
      flex-shrink: 0;
    }

    .linea-corte::before {
      content: '✂ Cortar aquí';
      position: absolute; left: 50%; top: -10px;
      font-size: 10px; color: #9ca3af;
      background: white; padding: 0 8px;
      transform: translateX(-50%);
      font-family: Arial, sans-serif;
    }
    @media print { body { background: white; } }
  </style>
</head>
<body>
<div class="pagina">
  <div class="receta-mitad">${recetaHtml("barcodeCanvas1")}</div>
  <div class="receta-mitad">${recetaHtml("barcodeCanvas2")}</div>
  <div class="linea-corte"></div>
</div>
<script>
  function generarBarcode(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const code = '${generatedCode}';
    if (!code) return;
    try {
      JsBarcode(canvas, code, {
        format: "CODE128",
        width: 1.4,
        height: 38,
        displayValue: false,
        margin: 0,
        background: "#ffffff",
        lineColor: "#000000"
      });
    } catch (e) {
      console.error("Error generando barcode:", e);
    }
  }
  
  window.onload = function() {
    function intentarImprimir() {
      if (typeof JsBarcode === 'undefined') {
        setTimeout(intentarImprimir, 100);
        return;
      }
      generarBarcode('barcodeDatos1');
      generarBarcode('barcodeDatos2');
      setTimeout(function() {
        window.focus();
        window.print();
        setTimeout(function() { window.close(); }, 500);
      }, 200);
    }
    intentarImprimir();
  }

</script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
  };


  const filteredPacientes = pacientes
    .filter((p) => p.medicoId === user.id)
    .filter((p) =>
      (p.nombre || "").toLowerCase().includes(searchHistorial.toLowerCase())
    );

  const renderMenuServicios = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {SERVICIOS_MENU.map((servicio) => {
        const Icon = servicio.icon;
        const colorClasses = {
          blue: "bg-blue-100 text-blue-600 hover:bg-blue-50 hover:border-blue-500",
          red: "bg-red-100 text-red-600 hover:bg-red-50 hover:border-red-500",
          purple: "bg-purple-100 text-purple-600 hover:bg-purple-50 hover:border-purple-500",
          green: "bg-green-100 text-green-600 hover:bg-green-50 hover:border-green-500",
          yellow: "bg-yellow-100 text-yellow-600 hover:bg-yellow-50 hover:border-yellow-500",
          pink: "bg-pink-100 text-pink-600 hover:bg-pink-50 hover:border-pink-500",
          indigo: "bg-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-500",
          orange: "bg-orange-100 text-orange-600 hover:bg-orange-50 hover:border-orange-500",
          teal: "bg-teal-100 text-teal-600 hover:bg-teal-50 hover:border-teal-500",
          cyan: "bg-cyan-100 text-cyan-600 hover:bg-cyan-50 hover:border-cyan-500",
          lime: "bg-lime-100 text-lime-600 hover:bg-lime-50 hover:border-lime-500",
          emerald: "bg-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500",
          rose: "bg-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-500",
          gray: "bg-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-500",
          violet: "bg-violet-100 text-violet-600 hover:bg-violet-50 hover:border-violet-500",
        };
        
        return (
          <button
            key={servicio.id}
            onClick={() => {
              if (servicio.id === "consulta") {
                setPacienteReceta(null);
                setMedicamentosReceta([]);
                setGeneratedCode("");
                setShowPreviewReceta(false);
              }
              setTipoServicio(servicio.id as TipoServicio);
            }}

            className={`p-6 rounded-lg border-2 hover:shadow-lg transition-all text-left bg-white border-gray-200 ${colorClasses[servicio.color]}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-3 rounded-lg ${servicio.color === 'blue' ? 'bg-blue-100' :
                servicio.color === 'red' ? 'bg-red-100' :
                servicio.color === 'purple' ? 'bg-purple-100' :
                servicio.color === 'green' ? 'bg-green-100' :
                servicio.color === 'yellow' ? 'bg-yellow-100' :
                servicio.color === 'pink' ? 'bg-pink-100' :
                servicio.color === 'indigo' ? 'bg-indigo-100' :
                servicio.color === 'orange' ? 'bg-orange-100' :
                servicio.color === 'teal' ? 'bg-teal-100' :
                servicio.color === 'cyan' ? 'bg-cyan-100' :
                servicio.color === 'lime' ? 'bg-lime-100' :
                servicio.color === 'emerald' ? 'bg-emerald-100' :
                servicio.color === 'violet' ? 'bg-violet-100' : 'bg-rose-100'}`}>
                <Icon className={`w-6 h-6 ${servicio.color === 'blue' ? 'text-blue-600' :
                  servicio.color === 'red' ? 'text-red-600' :
                  servicio.color === 'purple' ? 'text-purple-600' :
                  servicio.color === 'green' ? 'text-green-600' :
                  servicio.color === 'yellow' ? 'text-yellow-600' :
                  servicio.color === 'pink' ? 'text-pink-600' :
                  servicio.color === 'indigo' ? 'text-indigo-600' :
                  servicio.color === 'orange' ? 'text-orange-600' :
                  servicio.color === 'teal' ? 'text-teal-600' :
                  servicio.color === 'cyan' ? 'text-cyan-600' :
                  servicio.color === 'lime' ? 'text-lime-600' :
                  servicio.color === 'emerald' ? 'text-emerald-600' :
                  servicio.color === 'violet' ? 'text-violet-600' : 'text-rose-600'}`} />
              </div>
            </div>
            <h3 className="font-semibold">{servicio.nombre}</h3>
          </button>
        );
      })}
    </div>
  );

  const renderFormularioServicio = () => {
    const servicioActual = SERVICIOS_MENU.find((s) => s.id === tipoServicio);
    if (!servicioActual) return null;

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <button
          onClick={() => setTipoServicio("menu")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver al menú
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-lg bg-${servicioActual.color}-100`}>
            <servicioActual.icon className={`w-6 h-6 text-${servicioActual.color}-600`} />
          </div>
          <h2 className="text-2xl font-bold">{servicioActual.nombre}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2 text-gray-700">Nombre del Paciente *</label>
            <input
              type="text"
              value={nombrePacienteServicio}
              onChange={(e) => setNombrePacienteServicio(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Nombre completo del paciente"
            />
          </div>

          {tipoServicio === "inyeccion" && (
            <>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Buscar Producto a Inyectar *</label>
                <input
                  type="text"
                  value={searchProductoInyeccion}
                  onChange={(e) => setSearchProductoInyeccion(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Buscar medicamento..."
                />
              </div>
              {searchProductoInyeccion && (
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {productos
                    .filter((p) =>
                      (p.nombre || "").toLowerCase().includes(searchProductoInyeccion.toLowerCase())
                    )
                    .map((producto, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setProductoInyeccion(producto.nombre);
                          setSearchProductoInyeccion("");
                        }}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                      >
                        <p className="font-semibold text-sm">{producto.nombre}</p>
                        <p className="text-xs text-gray-500">{producto.codigoBarras}</p>
                      </div>
                    ))}
                </div>
              )}
              {productoInyeccion && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Producto seleccionado:</strong> {productoInyeccion}
                  </p>
                </div>
              )}
            </>
          )}

          {tipoServicio === "presion" && (
            <div>
              <label className="block text-sm mb-2 text-gray-700">Valor de Presión Arterial *</label>
              <input
                type="text"
                value={valorPresion}
                onChange={(e) => setValorPresion(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: 120/80"
              />
            </div>
          )}

          {tipoServicio === "glucemia" && (
            <div>
              <label className="block text-sm mb-2 text-gray-700">Valor de Glucemia (mg/dL) *</label>
              <input
                type="number"
                value={valorGlucemia}
                onChange={(e) => setValorGlucemia(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: 95"
              />
            </div>
          )}
{tipoServicio === "certificado-escolar" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-gray-700">Nombre Completo *</label>
                <input
                  type="text"
                  id="escolar-nombre"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Nombre completo del alumno"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-gray-700">Edad *</label>
                  <input type="number" id="escolar-edad"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Edad en años" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-700">Sexo *</label>
                  <select id="escolar-sexo"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-700">Peso (kg) *</label>
                  <input type="number" step="0.1" id="escolar-peso"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Ej: 45.5" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-700">Talla (cm) *</label>
                  <input type="number" step="0.1" id="escolar-talla"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Ej: 150" />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Observaciones</label>
                <textarea id="escolar-observaciones"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 h-24"
                  placeholder="Observaciones médicas relevantes..." />
              </div>
            </div>
          )}

          {tipoServicio === "certificado" && (
            <>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileCheck className="w-5 h-5 text-green-700" />
                  <p className="font-semibold text-green-800">Instrucciones</p>
                </div>
                <ol className="text-sm text-green-800 space-y-2 list-decimal list-inside">
                  <li>Ingresa el nombre completo del paciente</li>
                  <li>Descarga la plantilla de Word haciendo clic en el botón</li>
                  <li>Completa el certificado médico laboral en Word</li>
                  <li>Guarda el certificado en tu computadora</li>
                  <li>Haz clic en "Guardar Registro" para registrar el servicio</li>
                </ol>
              </div>

              <a
                href="https://docs.google.com/document/d/1PLANTILLA_EJEMPLO/export?format=doc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors mb-4"
              >
                <FileText className="w-5 h-5" />
                Abrir Plantilla de Certificado Médico (.docx)
              </a>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Nota:</strong> El archivo se abrirá en una nueva ventana. Completa el certificado con los datos del paciente y guárdalo en tu equipo.
                </p>
              </div>
            </>
          )}

          {["lavado-otico", "revision-diu", "colocacion-diu", "retiro-implante", "retiro-puntos", "sutura", "cambio-sonda", "curacion-menor", "curacion-mayor", "otros-servicios"].includes(tipoServicio) && (
            <div>
              <label className="block text-sm mb-2 text-gray-700">Procedimiento Realizado *</label>
              <textarea
                value={procedimientoRealizado}
                onChange={(e) => setProcedimientoRealizado(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 h-32"
                placeholder="Describe el procedimiento realizado..."
              />
            </div>
          )}

          <button
            onClick={() => {
              if (tipoServicio === "inyeccion") {
                handleGuardarServicioSimple("inyeccion", { producto: productoInyeccion });
              } else if (tipoServicio === "presion") {
                handleGuardarServicioSimple("presion", { valor: valorPresion });
              } else if (tipoServicio === "glucemia") {
                handleGuardarServicioSimple("glucemia", { valor: valorGlucemia });
              } else if (tipoServicio === "certificado") {
                handleGuardarServicioSimple("certificado", { certificadoGenerado: true });
              } else if (tipoServicio === "certificado-escolar") {
                handleGuardarServicioSimple("certificado-escolar", {
                  nombreCompleto: (document.getElementById("escolar-nombre") as HTMLInputElement)?.value || "",
                  edad: (document.getElementById("escolar-edad") as HTMLInputElement)?.value || "",
                  sexo: (document.getElementById("escolar-sexo") as HTMLSelectElement)?.value || "",
                  peso: (document.getElementById("escolar-peso") as HTMLInputElement)?.value || "",
                  talla: (document.getElementById("escolar-talla") as HTMLInputElement)?.value || "",
                  observaciones: (document.getElementById("escolar-observaciones") as HTMLTextAreaElement)?.value || "",
                });
              } else {
                handleGuardarServicioSimple(tipoServicio, { procedimiento: procedimientoRealizado });
              }
            }}
            disabled={loading}
            className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            {loading ? "Guardando..." : "Guardar Registro"}
          </button>
        </div>
      </div>
    );
  };

  const renderConsultaMedica = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulario de Paciente */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={() => setTipoServicio("menu")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al menú
          </button>

          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-bold">Consulta Médica Completa</h2>
          </div>

          {/* Banner de Sucursal Activa */}
          <div className={`mb-6 p-4 rounded-lg border-2 ${
            assignedSucursalId !== user.sucursalId 
              ? "bg-yellow-50 border-yellow-400" 
              : "bg-blue-50 border-blue-300"
          }`}>
            <div className="flex items-center gap-3">
              <Building className={`w-5 h-5 ${
                assignedSucursalId !== user.sucursalId ? "text-yellow-600" : "text-blue-600"
              }`} />
              <div>
                <p className={`font-semibold ${
                  assignedSucursalId !== user.sucursalId ? "text-yellow-800" : "text-blue-800"
                }`}>
                  Trabajando desde: {sucursal?.nombre}
                </p>
                <p className={`text-xs ${
                  assignedSucursalId !== user.sucursalId ? "text-yellow-700" : "text-blue-700"
                }`}>
                  {assignedSucursalId !== user.sucursalId 
                    ? "⚠️ Asignación temporal del día - Los stocks mostrados son de esta sucursal"
                    : "✓ Sucursal base - Los stocks mostrados son de esta sucursal"
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm mb-2 text-gray-700">Nombre Completo *</label>
              <input
                type="text"
                value={paciente.nombre}
                onChange={(e) => setPaciente({ ...paciente, nombre: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Nombre del paciente"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Edad</label>
              <input
                type="number"
                value={paciente.edad || ""}
                onChange={(e) => setPaciente({ ...paciente, edad: Number(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Sexo</label>
              <select
                value={paciente.sexo}
                onChange={(e) => setPaciente({ ...paciente, sexo: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                value={paciente.peso || ""}
                onChange={(e) => setPaciente({ ...paciente, peso: Number(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Talla (cm)</label>
              <input
                type="number"
                step="0.1"
                value={paciente.talla || ""}
                onChange={(e) => setPaciente({ ...paciente, talla: Number(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">T.A.</label>
              <input
                type="text"
                value={paciente.ta}
                onChange={(e) => setPaciente({ ...paciente, ta: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="120/80"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Temperatura (°C)</label>
              <input
                type="number"
                step="0.1"
                value={paciente.temperatura || ""}
                onChange={(e) => setPaciente({ ...paciente, temperatura: Number(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm mb-2 text-gray-700">Frecuencia Cardíaca (bpm)</label>
              <input
                type="number"
                value={paciente.frecuenciaCardiaca || ""}
                onChange={(e) => setPaciente({ ...paciente, frecuenciaCardiaca: Number(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Saturación O2 (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={paciente.satO2 || ""}
                onChange={(e) => setPaciente({ ...paciente, satO2: Number(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: 98"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Alergias</label>
              <input
                type="text"
                value={paciente.alergias}
                onChange={(e) => setPaciente({ ...paciente, alergias: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Alergias conocidas..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm mb-2 text-gray-700">Diagnóstico *</label>
              <input
                type="text"
                value={paciente.diagnostico}
                onChange={(e) => setPaciente({ ...paciente, diagnostico: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Diagnóstico médico..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm mb-2 text-gray-700">Antecedentes Personales</label>
              <input
                type="text"
                value={paciente.antecedentesPersonales}
                onChange={(e) => setPaciente({ ...paciente, antecedentesPersonales: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Antecedentes personales relevantes..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm mb-2 text-gray-700">
                Notas Adicionales
                <span className={`ml-2 text-xs font-normal ${(paciente.notas?.length || 0) > 180 ? "text-red-500" : "text-gray-400"}`}>
                  {paciente.notas?.length || 0}/200
                </span>
              </label>
              <textarea
                value={paciente.notas}
                onChange={(e) => {
                  if (e.target.value.length <= 200) {
                    setPaciente({ ...paciente, notas: e.target.value });
                  }
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 h-20 ${(paciente.notas?.length || 0) >= 200 ? "border-red-400" : ""}`}
                placeholder="Notas adicionales (máx 200 caracteres)..."
                maxLength={200}
              />
              {(paciente.notas?.length || 0) >= 200 && (
                <p className="text-xs text-red-500 mt-1">Límite alcanzado — reduce el texto para poder imprimir</p>
              )}
            </div>
          </div>
        </div>

        {/* Seleccionar Medicamentos */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="font-bold mb-2">Seleccionar Medicamentos</h3>
            <div className="bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <div className="bg-blue-600 text-white rounded-full p-1 mt-0.5">
                  <FileText className="w-3 h-3" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-900 mb-1">✨ Sistema de Indicaciones Inteligente</p>
                  <p className="text-xs text-blue-800">
                    Configure <strong>cantidad por dosis</strong>, <strong>frecuencia</strong> y <strong>duración</strong>. 
                    El sistema detecta automáticamente el tipo de medicamento y genera la indicación completa.
                  </p>
                  <p className="text-xs text-teal-700 mt-1">
                    Ejemplo: "1 cápsula cada 8 horas por 7 días" o "5 ml cada 6 horas por 5 días"
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchMedicamento}
                onChange={(e) => setSearchMedicamento(e.target.value)}
                placeholder="Buscar medicamento..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {productos
              .filter((producto) =>
                (producto.nombre || "").toLowerCase().includes(searchMedicamento.toLowerCase()) ||
                (producto.codigoBarras || "").includes(searchMedicamento)
              )
              .sort((a, b) => {
                const stockA = a.stockBySucursal?.[assignedSucursalId!] || 0;
                const stockB = b.stockBySucursal?.[assignedSucursalId!] || 0;
                // Sin stock va al final
                if (stockA === 0 && stockB > 0) return 1;
                if (stockB === 0 && stockA > 0) return -1;
                // Entre los que tienen stock, ordenar por precio mayor primero
                const precioA = parseFloat(a.precioVenta) || parseFloat(a.precio) || 0;
                const precioB = parseFloat(b.precioVenta) || parseFloat(b.precio) || 0;
                return precioB - precioA;
              })
              .map((producto, index) => {
  const stockSucursal = producto.stockBySucursal?.[assignedSucursalId!] || 0;
  const precio = parseFloat(producto.precioVenta) || parseFloat(producto.precio) || 0;

  // Obtener lotes FEFO de este producto
  const lotesProducto = lotes
    .filter((l: any) =>
      l.codigoBarras === producto.codigoBarras ||
      l.productoId === producto.codigoBarras
    )
    .sort((a: any, b: any) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999));

  const loteMasCercano = lotesProducto[0];
  const diasVencimiento = loteMasCercano?.diasRestantes ?? null;
  const esVencido = diasVencimiento !== null && diasVencimiento < 0;
  const esCritico = diasVencimiento !== null && diasVencimiento >= 0 && diasVencimiento <= 7;
  const esProximo = diasVencimiento !== null && diasVencimiento > 7 && diasVencimiento <= 30;

  return (
    <div
      key={index}
      className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
        esVencido ? "bg-red-50 border-l-4 border-l-red-500" :
        esCritico ? "bg-orange-50 border-l-4 border-l-orange-500" :
        esProximo ? "bg-yellow-50 border-l-4 border-l-yellow-400" : ""
      }`}
      onClick={() => addMedicamento({ ...producto, codigo: producto.codigoBarras, precio })}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{producto.nombre}</p>
            {esVencido && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                VENCIDO
              </span>
            )}
            {esCritico && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                Vence en {diasVencimiento}d
              </span>
            )}
            {esProximo && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                Vence en {diasVencimiento}d
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Código: {producto.codigoBarras}</p>
          {loteMasCercano && (
            <p className="text-xs text-gray-400 mt-0.5">
              Vence: {loteMasCercano.fechaVencimiento} · Stock lote: {loteMasCercano.cantidadActual}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
  <span className={`text-xs px-2 py-1 rounded-full ${
    stockSucursal > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
  }`}>
    {stockSucursal}
  </span>
  <span className="text-sm font-semibold text-blue-600">
    {Math.round(precio)}
  </span>
</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            addMedicamento({ ...producto, codigo: producto.codigoBarras, precio });
          }}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            stockSucursal === 0
              ? "bg-orange-500 text-white hover:bg-orange-600"
              : "bg-teal-600 text-white hover:bg-teal-700"
          }`}
        >
          {stockSucursal === 0 ? "Sin stock" : "Agregar"}
        </button>
      </div>
    </div>
  );
})}
          </div>
        </div>
      </div>

      {/* Panel de Receta */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow sticky top-6 p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Receta Médica
          </h3>

          {medicamentos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay medicamentos agregados</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
              {medicamentos.map((med, index) => {
                const tipoProducto = detectarTipoProducto(med.nombre);
                const tipoLabels: Record<string, { label: string; color: string }> = {
                  capsula: { label: "Cápsula", color: "bg-blue-100 text-blue-700" },
                  tableta: { label: "Tableta", color: "bg-purple-100 text-purple-700" },
                  jarabe: { label: "Jarabe/Sol.", color: "bg-orange-100 text-orange-700" },
                  inyectable: { label: "Inyectable", color: "bg-red-100 text-red-700" },
                  crema: { label: "Tópico", color: "bg-green-100 text-green-700" },
                  gotas: { label: "Gotas", color: "bg-cyan-100 text-cyan-700" },
                  sobre: { label: "Sobre", color: "bg-yellow-100 text-yellow-700" },
                  unidad: { label: "Otro", color: "bg-gray-100 text-gray-700" },
                };
                const tipoInfo = tipoLabels[tipoProducto] || tipoLabels.unidad;
                
                return (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{med.nombre}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${tipoInfo.color}`}>
                          {tipoInfo.label}
                        </span>
                        {med.sinStock && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                            Sin stock
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeMedicamento(med.codigo)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Cantidad por dosis *</label>
                      <input
                        type="number"
                        min="1"
                        value={med.cantidadPorDosis || 1}
                        onChange={(e) => {
                          const cantidadPorDosis = Number(e.target.value);
                          updateMedicamento(med.codigo, "cantidadPorDosis", cantidadPorDosis);
                          // Regenerar dosis automáticamente si ya hay frecuencia y duración
                          if (med.frecuencia && med.duracion) {
                            const indicacion = generarIndicacion(med.nombre, cantidadPorDosis, med.frecuencia, med.duracion);
                            updateMedicamento(med.codigo, "dosis", indicacion);
                          }
                        }}
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                        placeholder="Ej: 1, 2, 5"
                      />
                      <p className="text-xs text-gray-500 mt-1">¿Cuánto toma cada vez?</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Frecuencia *</label>
                      <input
                        type="text"
                        value={med.frecuencia}
                        onChange={(e) => {
                          updateMedicamento(med.codigo, "frecuencia", e.target.value);
                        }}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if ((med.cantidadPorDosis || 1) && val && med.duracion) {
                            const indicacion = generarIndicacion(med.nombre, med.cantidadPorDosis || 1, val, med.duracion);
                            updateMedicamento(med.codigo, "dosis", indicacion);
                          }
                        }}
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                        placeholder="Ej: cada 8 horas, cada mañana..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Duración *</label>
                      <input
                        type="text"
                        value={med.duracion}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateMedicamento(med.codigo, "duracion", val);
                        }}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if ((med.cantidadPorDosis || 1) && med.frecuencia && val) {
                            const indicacion = generarIndicacion(med.nombre, med.cantidadPorDosis || 1, med.frecuencia, val);
                            updateMedicamento(med.codigo, "dosis", indicacion);
                          }
                        }}
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                        placeholder="Ej: 7 días, 2 semanas..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Vía de Administración</label>
                      <select
                        value={med.viaAdministracion || ""}
                        onChange={(e) => updateMedicamento(med.codigo, "viaAdministracion", e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Oral">Oral</option>
                        <option value="Sublingual">Sublingual</option>
                        <option value="Tópica">Tópica</option>
                        <option value="Intramuscular">Intramuscular</option>
                        <option value="Intravenosa">Intravenosa</option>
                        <option value="Oftálmica">Oftálmica</option>
                        <option value="Ótica">Ótica</option>
                        <option value="Inhalatoria">Inhalatoria</option>
                        <option value="Rectal">Rectal</option>
                        <option value="Subcutánea">Subcutánea</option>
                      </select>
                    </div>
                    {/* Mostrar la indicación generada automáticamente */}
                    {med.dosis && (
                      <div className="mt-2 p-2 bg-teal-50 border border-teal-200 rounded">
                        <p className="text-xs text-teal-700 font-medium">Indicación generada:</p>
                        <p className="text-xs text-teal-900 mt-1">{med.dosis}</p>
                      </div>
                    )}
                    {/* Cantidad total a surtir */}
                    <div className="mt-3 pt-3 border-t">
                      <label className="block text-xs text-gray-600 mb-1">Cantidad total a surtir</label>
                      <input
                        type="number"
                        min="1"
                        value={med.cantidad}
                        onChange={(e) => updateMedicamento(med.codigo, "cantidad", Number(e.target.value))}
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Unidades que entregará el farmacéutico</p>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          <button
            onClick={handleGenerateReceta}
            disabled={loading || medicamentos.length === 0}
            className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FileText className="w-5 h-5" />
            {loading ? "Generando..." : "Generar Receta"}
          </button>

          <button
            onClick={() => {
              setFormHistoria({
                nombrePaciente: paciente.nombre,
                antecedentesHeredofamiliares: "",
                antecedentesPersonalesNoPat: "",
                antecedentesPersonalesPat: paciente.alergias ? `Alergias: ${paciente.alergias}` : "",
                antecedentesGinecoobs: "",
                padecimientoActual: paciente.diagnostico || "",
                exploracionFisica: [
                  paciente.ta ? `T.A.: ${paciente.ta}` : "",
                  paciente.temperatura ? `Temperatura: ${paciente.temperatura}°C` : "",
                  paciente.frecuenciaCardiaca ? `FC: ${paciente.frecuenciaCardiaca} bpm` : "",
                  paciente.peso ? `Peso: ${paciente.peso} kg` : "",
                  paciente.talla ? `Talla: ${paciente.talla} cm` : "",
                ].filter(Boolean).join(" | "),
                resultadosLaboratorio: "",
                tratamientoResultados: "",
                notasMedicas: paciente.notas || "",
              });
              setShowFormHistoria(true);
              setActiveTab("historia-clinica" as any);
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <Plus className="w-5 h-5" />
            Agregar Historia Clínica
          </button>

          {generatedCode && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 mb-2 font-semibold">¡Receta Generada!</p>
                <div className="flex items-center gap-2 mb-3">
                  <code className="flex-1 bg-white px-3 py-2 rounded text-sm border">
                    {generatedCode}
                  </code>
                  <button
                    onClick={copyCode}
                    className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreviewReceta(!showPreviewReceta)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {showPreviewReceta ? "Ocultar" : "Vista Previa"}
                  </button>
                  <button
                    onClick={handlePrintReceta}
                    className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
              </div>

              {/* Vista Previa de la Receta */}
              {showPreviewReceta && (
                <div className="border-2 border-gray-300 rounded-lg p-4 bg-white shadow-lg text-sm">
                  <div className="flex justify-between items-start mb-4 pb-3 border-b-2 border-teal-600">
                    <div className="flex-1">
                      <h1 className="text-base font-bold text-teal-600 mb-1">{user.name}</h1>
                      <p className="text-xs text-gray-600">{user.escuela || user.universidad || "Universidad Autónoma de Coahuila"}</p>
                      <p className="text-xs text-gray-600">Cédula: {user.cedula || ""}</p>
                      {user.especialidad && <p className="text-xs text-gray-600">Especialidad: {user.especialidad}</p>}
                      {sucursal?.nombre && <p className="text-xs text-gray-600">Sucursal: {sucursal.nombre}</p>}
                      {(sucursal?.direccion || user.direccion) && <p className="text-xs text-gray-600">{sucursal?.direccion || user.direccion}</p>}
                    </div>
                    <div className="ml-4">
                      {user.logoEscuela || user.logo_universidad ? (
                        <img src={user.logoEscuela || user.logo_universidad} alt="Logo" className="w-24 h-24 object-contain" />
                      ) : (
                        <div className="w-24 h-24 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {(user.escuela || "UAC").substring(0,3).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <h2 className="text-center text-sm font-bold text-teal-600 mb-3 uppercase">Receta Médica Individual</h2>

                  <div className="bg-gray-50 border rounded-lg p-3 mb-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 mb-1">
                      <div><span className="font-semibold text-teal-600">Paciente:</span> {pacienteReceta?.nombre}</div>
                      <div><span className="font-semibold text-teal-600">Fecha:</span> {new Date().toLocaleDateString("es-MX", { year:"numeric", month:"long", day:"numeric" })}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-1">
                      <div><span className="font-semibold text-teal-600">Edad:</span> {pacienteReceta?.edad} años</div>
                      <div><span className="font-semibold text-teal-600">Sexo:</span> {pacienteReceta?.sexo === "M" ? "M" : "F"}</div>
                      <div><span className="font-semibold text-teal-600">Peso:</span> {pacienteReceta?.peso} kg</div>
                      <div><span className="font-semibold text-teal-600">Talla:</span> {pacienteReceta?.talla} cm</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-1">
                      {pacienteReceta?.ta && <div><span className="font-semibold text-teal-600">T.A.:</span> {pacienteReceta.ta}</div>}
                      {pacienteReceta?.temperatura > 0 && <div><span className="font-semibold text-teal-600">Temp:</span> {pacienteReceta.temperatura}°C</div>}
                      {(pacienteReceta as any)?.satO2 > 0 && <div><span className="font-semibold text-teal-600">SatO2:</span> {(pacienteReceta as any).satO2}%</div>}
                    </div>
                    {pacienteReceta?.alergias && <div className="mb-1"><span className="font-semibold text-teal-600">Alergias:</span> {pacienteReceta.alergias}</div>}
                    <div className="mb-1"><span className="font-semibold text-teal-600">Diagnóstico:</span> {pacienteReceta?.diagnostico}</div>
                    {(pacienteReceta as any)?.antecedentesPersonales && <div className="mb-1"><span className="font-semibold text-teal-600">Antecedentes:</span> {(pacienteReceta as any).antecedentesPersonales}</div>}
                    {pacienteReceta?.notas && <div><span className="font-semibold text-teal-600">Notas:</span> {pacienteReceta.notas}</div>}
                  </div>

                  <div className="mb-3">
                    <h3 className="font-bold text-teal-600 text-xs mb-2 pb-1 border-b-2 border-teal-600">Medicamentos Prescritos</h3>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-teal-600 text-white">
                          <th className="p-1 text-left w-6">#</th>
                          <th className="p-1 text-left">Medicamento</th>
                          <th className="p-1 text-left">Instrucciones</th>
                          <th className="p-1 text-left">Vía</th>
                          <th className="p-1 text-center">Duración</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medicamentosReceta.map((med, index) => (
                          <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                            <td className="p-1 font-bold text-teal-600">{index + 1}</td>
                            <td className="p-1 font-semibold">
                              {med.nombre}
                              {(med as any).sinStock && <span className="ml-1 text-red-500 text-xs">(Sin stock)</span>}
                            </td>
                            <td className="p-1">
                              {[(med as any).cantidadPorDosis ? `${(med as any).cantidadPorDosis}` : "", med.frecuencia || ""].filter(Boolean).join(" ") || "-"}
                            </td>
                            <td className="p-1">{(med as any).viaAdministracion || "-"}</td>
                            <td className="p-1 text-center font-bold text-teal-600">{med.duracion || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end mt-4 mb-3">
                    <div className="text-center w-48">
                      <div className="border-t border-gray-400 pt-1 text-xs text-gray-600">
                        {user.name}<br/>Cédula: {user.cedula || ""}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <Barcode value={generatedCode} width={1.2} height={35} fontSize={10} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const handleGuardarHistoriaClinica = async (datosIniciales?: any) => {
    const datos = datosIniciales || formHistoria;
    if (!datos.nombrePaciente?.trim()) {
      toast.error("El nombre del paciente es requerido");
      return;
    }
    setLoadingHistoria(true);
    try {
      // Obtener contador global
      const contResp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/contador-historia-clinica`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const contData = await contResp.json();
      const numero = (contData.contador || 0) + 1;
      const numeroFormato = `HC-${String(numero).padStart(4, "0")}`;

      const payload = {
        numero: numeroFormato,
        numeroInt: numero,
        nombrePaciente: datos.nombrePaciente,
        antecedentesHeredofamiliares: datos.antecedentesHeredofamiliares || "",
        antecedentesPersonalesNoPat: datos.antecedentesPersonalesNoPat || "",
        antecedentesPersonalesPat: datos.antecedentesPersonalesPat || "",
        antecedentesGinecoobs: datos.antecedentesGinecoobs || "",
        padecimientoActual: datos.padecimientoActual || "",
        exploracionFisica: datos.exploracionFisica || "",
        resultadosLaboratorio: datos.resultadosLaboratorio || "",
        tratamientoResultados: datos.tratamientoResultados || "",
        notasMedicas: datos.notasMedicas || "",
        notasEvolucion: [],
        medicoCreadorId: user.id,
        medicoCreadorNombre: user.name,
        fechaCreacion: new Date().toISOString(),
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/historias-clinicas`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast.success(`Historia Clínica ${numeroFormato} creada correctamente`);
        setShowFormHistoria(false);
        setFormHistoria({
          nombrePaciente: "", antecedentesHeredofamiliares: "",
          antecedentesPersonalesNoPat: "", antecedentesPersonalesPat: "",
          antecedentesGinecoobs: "", padecimientoActual: "",
          exploracionFisica: "", resultadosLaboratorio: "",
          tratamientoResultados: "", notasMedicas: "",
        });
        loadHistoriasClinicas();
      } else {
        toast.error("Error al guardar la historia clínica");
      }
    } catch (error) {
      console.error("Error guardando historia clínica:", error);
      toast.error("Error al guardar");
    } finally {
      setLoadingHistoria(false);
    }
  };

  const handleAgregarNotaEvolucion = async () => {
    if (!historiaSeleccionada || !notaEvolucion.trim()) {
      toast.error("Escribe la nota de evolución");
      return;
    }
    setLoadingHistoria(true);
    try {
      const nuevaNota = {
        fecha: new Date().toISOString(),
        medicoId: user.id,
        medicoNombre: user.name,
        nota: notaEvolucion.trim(),
      };
      const notasActualizadas = [...(historiaSeleccionada.notasEvolucion || []), nuevaNota];
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/historias-clinicas/${historiaSeleccionada.id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...historiaSeleccionada, notasEvolucion: notasActualizadas }),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast.success("Nota de evolución agregada");
        setNotaEvolucion("");
        setHistoriaSeleccionada({ ...historiaSeleccionada, notasEvolucion: notasActualizadas });
        loadHistoriasClinicas();
      }
    } catch (error) {
      console.error("Error agregando nota:", error);
      toast.error("Error al agregar nota");
    } finally {
      setLoadingHistoria(false);
    }
  };

  const renderHistorial = () => {
    // Combinar servicios simples + consultas (recetas)
    const serviciosSimples = (serviciosMedicos || []).filter(
      (s: any) => s.medicoId === user.id
    );
    const consultasMedico = pacientes
      .filter((p) => p.medicoId === user.id)
      .map((p) => {
        const recetasPac = recetas.filter((r) => r.pacienteId === p.id);
        return recetasPac.map((r) => ({
          id: r.id || r.codigo,
          tipo: "consulta",
          paciente: p.nombre,
          fecha: r.fecha,
          medicoId: user.id,
          receta: r,
          pacienteData: p,
        }));
      })
      .flat();

    const todosServicios = [
      ...serviciosSimples.map((s: any) => ({
        id: s.id,
        tipo: s.tipo,
        paciente: s.paciente,
        fecha: s.fecha,
        medicoId: s.medicoId,
        detalles: s.detalles,
        receta: null,
        pacienteData: null,
      })),
      ...consultasMedico,
    ]
      .filter((s) =>
        (s.paciente || "").toLowerCase().includes(searchHistorial.toLowerCase())
      )
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    const tipoLabel: Record<string, string> = {
      consulta: "Consulta Médica",
      inyeccion: "Aplicación de Inyección",
      presion: "Toma de Presión",
      glucemia: "Toma de Glucemia",
      certificado: "Certificado Médico Laboral",
      "certificado-escolar": "Certificado Médico Escolar",
      "lavado-otico": "Lavado Ótico",
      "revision-diu": "Revisión o Retiro de DIU",
      "colocacion-diu": "Colocación o Cambio de DIU",
      "retiro-implante": "Retiro de Implante",
      "retiro-puntos": "Retiro de Puntos",
      sutura: "Sutura Básica",
      "cambio-sonda": "Cambio de Sonda",
      "curacion-menor": "Curación Menor",
      "curacion-mayor": "Curación Mayor",
      "otros-servicios": "Otros Servicios",
    };

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Historial de Servicios</h3>
            <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm">
              {todosServicios.length} registros
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchHistorial}
              onChange={(e) => setSearchHistorial(e.target.value)}
              placeholder="Buscar por nombre de paciente..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="divide-y max-h-[600px] overflow-y-auto">
          {todosServicios.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No hay servicios registrados</p>
            </div>
          ) : (
            todosServicios.map((servicio, index) => {
              const isExpanded = expandedPacienteHistorial === `${servicio.id}-${index}`;
              return (
                <div key={`${servicio.id}-${index}`} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(servicio.fecha).toLocaleDateString("es-MX", {
                            day: "2-digit", month: "short", year: "numeric"
                          })}
                        </span>
                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                          {tipoLabel[servicio.tipo] || servicio.tipo}
                        </span>
                        {servicio.receta && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Con Receta
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          setExpandedPacienteHistorial(
                            isExpanded ? null : `${servicio.id}-${index}`
                          )
                        }
                        className="mt-1 font-semibold text-teal-700 hover:text-teal-900 hover:underline text-left"
                      >
                        {servicio.paciente}
                      </button>
                    </div>
                    <button
                      onClick={() =>
                        setExpandedPacienteHistorial(
                          isExpanded ? null : `${servicio.id}-${index}`
                        )
                      }
                      className="p-2 hover:bg-gray-100 rounded-lg ml-2"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pl-4 border-l-2 border-teal-200 space-y-3">
                      {/* Detalles según tipo */}
                      {servicio.tipo === "consulta" && servicio.pacienteData && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-500">Edad:</span> <span className="font-semibold">{servicio.pacienteData.edad} años</span></div>
                          <div><span className="text-gray-500">Sexo:</span> <span className="font-semibold">{servicio.pacienteData.sexo === "M" ? "Masculino" : "Femenino"}</span></div>
                          <div><span className="text-gray-500">Peso:</span> <span className="font-semibold">{servicio.pacienteData.peso} kg</span></div>
                          <div><span className="text-gray-500">Talla:</span> <span className="font-semibold">{servicio.pacienteData.talla} cm</span></div>
                          {servicio.pacienteData.diagnostico && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Diagnóstico:</span>{" "}
                              <span className="font-semibold">{servicio.pacienteData.diagnostico}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {servicio.tipo !== "consulta" && servicio.detalles && (
                        <div className="text-sm space-y-1">
                          {Object.entries(servicio.detalles).map(([key, val]) => (
                            <div key={key}>
                              <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, " $1")}:</span>{" "}
                              <span className="font-semibold">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Ver receta */}
                      {servicio.receta && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-semibold text-blue-800">Receta: {servicio.receta.codigo}</p>
                            <button
                              onClick={() => {
                                setPacienteReceta(servicio.pacienteData);
                                setMedicamentosReceta(servicio.receta.medicamentos || []);
                                setGeneratedCode(servicio.receta.codigo);
                                setTimeout(() => handlePrintReceta(), 100);
                              }}
                              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Printer className="w-3 h-3" />
                              Reimprimir
                            </button>
                          </div>
                          <div className="space-y-1">
                            {(servicio.receta.medicamentos || []).map((med: any, i: number) => (
                              <p key={i} className="text-xs text-blue-700">
                                {i + 1}. {med.nombre} — {med.dosis || med.frecuencia}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };
const renderHistoriaClinica = () => {
    const historiasFiltradas = historiaClinica.filter((h) =>
      (h.nombrePaciente || "").toLowerCase().includes(searchHistoriaClinica.toLowerCase()) ||
      (h.numero || "").toLowerCase().includes(searchHistoriaClinica.toLowerCase())
    );

    if (historiaSeleccionada) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setHistoriaSeleccionada(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver a Historia Clínica
            </button>
            <span className="text-lg font-bold text-teal-700">{historiaSeleccionada.numero}</span>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="bg-teal-100 p-3 rounded-full">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{historiaSeleccionada.nombrePaciente}</h2>
                <p className="text-sm text-gray-500">
                  Creado: {new Date(historiaSeleccionada.fechaCreacion).toLocaleDateString("es-MX")} por {historiaSeleccionada.medicoCreadorNombre}
                </p>
              </div>
            </div>

            {[
              { key: "antecedentesHeredofamiliares", label: "Antecedentes Heredofamiliares" },
              { key: "antecedentesPersonalesNoPat", label: "Antecedentes Personales No Patológicos" },
              { key: "antecedentesPersonalesPat", label: "Antecedentes Personales Patológicos" },
              { key: "antecedentesGinecoobs", label: "Antecedentes Ginecoobstétricos" },
              { key: "padecimientoActual", label: "Padecimiento Actual" },
              { key: "exploracionFisica", label: "Exploración Física" },
              { key: "resultadosLaboratorio", label: "Resultados y Lecturas de Laboratorio" },
              { key: "tratamientoResultados", label: "Tratamiento Empleado y Resultados Obtenidos" },
              { key: "notasMedicas", label: "Notas Médicas" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-teal-700 mb-2">{label}</label>
                <textarea
                  value={historiaSeleccionada[key] || ""}
                  onChange={(e) =>
                    setHistoriaSeleccionada({ ...historiaSeleccionada, [key]: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 h-24 text-sm"
                  placeholder={`Registrar ${label.toLowerCase()}...`}
                />
              </div>
            ))}

            <button
              onClick={async () => {
                setLoadingHistoria(true);
                try {
                  const response = await fetch(
                    `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/historias-clinicas/${historiaSeleccionada.id}`,
                    {
                      method: "PUT",
                      headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
                      body: JSON.stringify(historiaSeleccionada),
                    }
                  );
                  const data = await response.json();
                  if (data.success) {
                    toast.success("Historia clínica actualizada");
                    loadHistoriasClinicas();
                  }
                } catch (error) {
                  toast.error("Error al actualizar");
                } finally {
                  setLoadingHistoria(false);
                }
              }}
              disabled={loadingHistoria}
              className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 disabled:opacity-50 font-semibold"
            >
              {loadingHistoria ? "Guardando..." : "Guardar Cambios"}
            </button>

            {/* Notas de Evolución */}
            <div className="border-t pt-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" />
                Notas de Evolución
              </h3>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {(historiaSeleccionada.notasEvolucion || []).length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No hay notas de evolución</p>
                ) : (
                  [...(historiaSeleccionada.notasEvolucion || [])]
                    .reverse()
                    .map((nota: any, i: number) => (
                      <div key={i} className="bg-gray-50 border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-teal-700">{nota.medicoNombre}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(nota.fecha).toLocaleDateString("es-MX", {
                              day: "2-digit", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{nota.nota}</p>
                      </div>
                    ))
                )}
              </div>
              <div className="space-y-2">
                <textarea
                  value={notaEvolucion}
                  onChange={(e) => setNotaEvolucion(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 h-20 text-sm"
                  placeholder="Escribe la nota de evolución..."
                />
                <button
                  onClick={handleAgregarNotaEvolucion}
                  disabled={loadingHistoria || !notaEvolucion.trim()}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm"
                >
                  {loadingHistoria ? "Guardando..." : "Agregar Nota de Evolución"}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Historia Clínica</h2>
            <p className="text-sm text-gray-500">{historiasFiltradas.length} expedientes en el sistema</p>
          </div>
          <button
            onClick={() => setShowFormHistoria(true)}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
          >
            <Plus className="w-4 h-4" />
            Nueva Historia Clínica
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchHistoriaClinica}
                onChange={(e) => setSearchHistoriaClinica(e.target.value)}
                placeholder="Buscar por nombre o número HC..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="divide-y max-h-[600px] overflow-y-auto">
            {historiasFiltradas.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No hay historias clínicas registradas</p>
              </div>
            ) : (
              historiasFiltradas.map((historia) => (
                <div key={historia.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-teal-700 text-sm">{historia.numero}</span>
                      <button
                        onClick={() => setHistoriaSeleccionada(historia)}
                        className="font-semibold text-gray-800 hover:text-teal-700 hover:underline"
                      >
                        {historia.nombrePaciente}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Creado: {new Date(historia.fechaCreacion).toLocaleDateString("es-MX")} •
                      {historia.notasEvolucion?.length || 0} nota(s) de evolución
                    </p>
                  </div>
                  <button
                    onClick={() => setHistoriaSeleccionada(historia)}
                    className="text-teal-600 hover:text-teal-800 p-2 hover:bg-teal-50 rounded-lg"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Nueva Historia */}
        {showFormHistoria && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
              <div className="p-6 border-b bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-t-2xl flex justify-between">
                <div>
                  <h2 className="text-xl font-bold">Nueva Historia Clínica</h2>
                  <p className="text-sm opacity-90">Se asignará número automático</p>
                </div>
                <button onClick={() => setShowFormHistoria(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-semibold mb-2">Nombre del Paciente *</label>
                  <input
                    type="text"
                    value={formHistoria.nombrePaciente}
                    onChange={(e) => setFormHistoria({ ...formHistoria, nombrePaciente: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Nombre completo del paciente"
                  />
                </div>
                {[
                  { key: "antecedentesHeredofamiliares", label: "Antecedentes Heredofamiliares" },
                  { key: "antecedentesPersonalesNoPat", label: "Antecedentes Personales No Patológicos" },
                  { key: "antecedentesPersonalesPat", label: "Antecedentes Personales Patológicos" },
                  { key: "antecedentesGinecoobs", label: "Antecedentes Ginecoobstétricos" },
                  { key: "padecimientoActual", label: "Padecimiento Actual" },
                  { key: "exploracionFisica", label: "Exploración Física" },
                  { key: "resultadosLaboratorio", label: "Resultados y Lecturas de Laboratorio" },
                  { key: "tratamientoResultados", label: "Tratamiento Empleado y Resultados Obtenidos" },
                  { key: "notasMedicas", label: "Notas Médicas" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">{label}</label>
                    <textarea
                      value={(formHistoria as any)[key]}
                      onChange={(e) => setFormHistoria({ ...formHistoria, [key]: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 h-20 text-sm"
                      placeholder={`${label}...`}
                    />
                  </div>
                ))}
              </div>
              <div className="p-6 border-t flex gap-3">
                <button
                  onClick={() => setShowFormHistoria(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleGuardarHistoriaClinica()}
                  disabled={loadingHistoria}
                  className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 font-semibold"
                >
                  {loadingHistoria ? "Guardando..." : "Crear Historia Clínica"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Vista de Impresión */}
      <div className="print-only">
        <div className="receta-medica">
          <div className="receta-header">
            <div className="doctor-info">
              <h1>{user.name}</h1>
              <p>{user.escuela || user.universidad || "Universidad Autónoma de Coahuila"}</p>
              <p>Cédula Profesional: {user.cedula || "1234567"}</p>
              {user.especialidad && <p>Especialidad: {user.especialidad}</p>}
              <p>{sucursal?.direccion || "Dirección no disponible"}</p>
              {user.telefono && <p>Tel: {user.telefono}</p>}
            </div>
            <div className="logo-container">
              {user.logoEscuela || user.logo_universidad ? (
                <img 
                  src={user.logoEscuela || user.logo_universidad} 
                  alt="Logo Escuela" 
                  style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                />
              ) : (
                <div className="logo-placeholder">
                  <svg width="80" height="80" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="#0d9488" />
                    <text x="50" y="50" textAnchor="middle" dy=".3em" fill="white" fontSize="24" fontWeight="bold">
                      {user.escuela ? user.escuela.substring(0, 3).toUpperCase() : "UAC"}
                    </text>
                  </svg>
                </div>
              )}
            </div>
          </div>

          <h2 className="receta-title">RECETA MÉDICA INDIVIDUAL</h2>

          <div className="patient-section">
            <div className="patient-row">
              <div className="patient-field">
                <strong>Paciente:</strong> {pacienteReceta?.nombre}
              </div>
              <div className="patient-field">
                <strong>Fecha:</strong>{" "}
                {new Date().toLocaleDateString("es-MX", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
            <div className="patient-row">
              <div className="patient-field">
                <strong>Edad:</strong> {pacienteReceta?.edad} años
              </div>
              <div className="patient-field">
                <strong>Sexo:</strong>{" "}
                {pacienteReceta?.sexo === "M" ? "Masculino" : "Femenino"}
              </div>
              <div className="patient-field">
                <strong>Peso:</strong> {pacienteReceta?.peso} kg
              </div>
              <div className="patient-field">
                <strong>Talla:</strong> {pacienteReceta?.talla} cm
              </div>
            </div>
            {pacienteReceta?.ta && (
              <div className="patient-row">
                <div className="patient-field">
                  <strong>T.A.:</strong> {pacienteReceta?.ta}
                </div>
                <div className="patient-field">
                  <strong>Temperatura:</strong> {pacienteReceta?.temperatura}°C
                </div>
                <div className="patient-field">
                  <strong>FC:</strong> {pacienteReceta?.frecuenciaCardiaca} bpm
                </div>
              </div>
            )}
            {pacienteReceta?.alergias && (
              <div className="patient-row">
                <div className="patient-field full-width">
                  <strong>Alergias:</strong> {pacienteReceta?.alergias}
                </div>
              </div>
            )}
            <div className="patient-row">
              <div className="patient-field full-width">
                <strong>Diagnóstico:</strong> {pacienteReceta?.diagnostico}
              </div>
            </div>
            {pacienteReceta?.notas && (
              <div className="patient-row">
                <div className="patient-field full-width">
                  <strong>Notas:</strong> {pacienteReceta?.notas}
                </div>
              </div>
            )}
          </div>

          <div className="medicamentos-section">
            <h3>Medicamentos Prescritos</h3>
            {medicamentosReceta.map((med, index) => (
              <div key={index} className="medicamento-item">
                <div className="medicamento-header">
                  <span className="medicamento-numero">{index + 1}.</span>
                  <strong>{med.nombre}</strong>
                </div>
                <div className="medicamento-detalles">
                  {/* Mostrar solo la indicación completa generada automáticamente */}
                  {med.dosis && (
                    <p>
                      <strong>Indicación:</strong> {med.dosis}
                    </p>
                  )}
                  <p>
                    <strong>Cantidad a surtir:</strong> {med.cantidad} {med.cantidad === 1 ? "unidad" : "unidades"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {generatedCode && (
            <div className="barcode-section">
              <p>
                <strong>Código de Receta:</strong>
              </p>
              <Barcode value={generatedCode} width={1.5} height={50} fontSize={14} />
            </div>
          )}

          <div className="firma-section">
            <div className="firma-line">
              <p>_________________________________</p>
              <p>
                <strong>{user.name}</strong>
              </p>
              <p>Cédula Profesional: {user.cedula || "1234567"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vista Normal (No imprimir) */}
      <div className="no-print">
        <ModuleGuard module="consultorio">
          <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 shadow-lg">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div>
                <h1 className="text-3xl mb-1">LYMPOS - Módulo Médico</h1>
                <div className="flex items-center gap-4 text-sm opacity-90">
                  <span className="flex items-center gap-1">
                    <Building className="w-4 h-4" />
                    {sucursal?.nombre}
                    {assignedSucursalId !== user.sucursalId && (
                      <span className="ml-2 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-semibold">
                        Asignación Temporal
                      </span>
                    )}
                  </span>
                  <span>• {user.name}</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </div>
          </div>

          <div className="max-w-7xl mx-auto p-6">
            {/* Tabs de Navegación */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab("servicio")}
                  className={`flex items-center gap-2 px-6 py-4 transition-colors border-b-2 ${
                    activeTab === "servicio"
                      ? "border-teal-600 text-teal-600 bg-teal-50"
                      : "border-transparent text-gray-600 hover:text-teal-600 hover:bg-gray-50"
                  }`}
                >
                  <Menu className="w-5 h-5" />
                  <span className="font-medium">Servicios Médicos</span>
                </button>
                <button
                  onClick={() => setActiveTab("historial")}
                  className={`flex items-center gap-2 px-6 py-4 transition-colors border-b-2 ${
                    activeTab === "historial"
                      ? "border-teal-600 text-teal-600 bg-teal-50"
                      : "border-transparent text-gray-600 hover:text-teal-600 hover:bg-gray-50"
                  }`}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="font-medium">Historial de Servicios</span>
                </button>
                <button
                  onClick={() => { setActiveTab("historia-clinica" as any); setHistoriaSeleccionada(null); }}
                  className={`flex items-center gap-2 px-6 py-4 transition-colors border-b-2 ${
                    activeTab === ("historia-clinica" as any)
                      ? "border-teal-600 text-teal-600 bg-teal-50"
                      : "border-transparent text-gray-600 hover:text-teal-600 hover:bg-gray-50"
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">Historia Clínica</span>
                </button>
              </div>
            </div>

            {/* Contenido */}
            {activeTab === "servicio" ? (
              tipoServicio === "menu" ? (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Selecciona el Servicio Médico</h2>
                    <p className="text-gray-600">Elige el tipo de servicio que deseas realizar con el paciente</p>
                  </div>
                  {renderMenuServicios()}
                </div>
              ) : tipoServicio === "certificado" ? (
                <CertificadoMedicoForm user={user} onBack={() => setTipoServicio("menu")} />
              ) : tipoServicio === "consulta" ? (
                renderConsultaMedica()
              ) : (
                renderFormularioServicio()
              )
            ) : activeTab === ("historia-clinica" as any) ? (
              renderHistoriaClinica()
            ) : (
              renderHistorial()
            )}
          </div>
        </div>

      <style>{`
        /* Los estilos de impresión están en /src/styles/print.css */
        
        @media screen {
          .print-only {
            display: none !important;
          }
        }
          
        /* Estilos solo para vista en pantalla */
        .receta-medica {
          max-width: 21cm;
          margin: 0 auto;
          padding: 2cm;
          background: white;
          font-family: Arial, sans-serif;
        }

        .receta-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #0d9488;
        }

        .doctor-info h1 {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #0d9488;
        }

        .doctor-info p {
          font-size: 12px;
          margin: 2px 0;
          color: #555;
        }

        .receta-title {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          margin: 20px 0;
          color: #0d9488;
          text-transform: uppercase;
        }

        .patient-section {
          margin: 20px 0;
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 8px;
          background-color: #f9fafb;
        }

        .patient-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin-bottom: 10px;
        }

        .patient-field {
          font-size: 13px;
          line-height: 1.6;
        }

        .patient-field.full-width {
          grid-column: 1 / -1;
        }

        .patient-field strong {
          color: #0d9488;
          font-weight: 600;
        }

        .medicamentos-section {
          margin: 30px 0;
        }

        .medicamentos-section h3 {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #0d9488;
          border-bottom: 2px solid #0d9488;
          padding-bottom: 8px;
        }

        .medicamento-item {
          margin-bottom: 15px;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background-color: #ffffff;
        }

        .medicamento-header {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .medicamento-numero {
          color: #0d9488;
          font-weight: bold;
        }

        .medicamento-detalles {
          font-size: 12px;
          padding-left: 20px;
          line-height: 1.6;
        }

        .medicamento-detalles p {
          margin: 4px 0;
        }

        .medicamento-detalles strong {
          color: #0d9488;
        }

        .barcode-section {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #f9fafb;
        }

        .barcode-section p {
          font-size: 13px;
          margin-bottom: 10px;
          font-weight: 600;
          color: #0d9488;
        }

        .firma-section {
          margin-top: 60px;
          display: flex;
          justify-content: center;
        }

        .firma-line {
          text-align: center;
        }

        .firma-line p {
          font-size: 13px;
          margin: 5px 0;
        }
      `}</style>

      {/* Botón flotante para consultas pendientes */}
      {consultasPendientes.filter(c => c.estado === "pendiente").length > 0 && (
        <button
          onClick={() => setShowConsultasPendientes(true)}
          className="fixed bottom-8 right-8 bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-40 flex items-center gap-2"
        >
          <Bell className="w-8 h-8" />
          <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center absolute -top-1 -right-1">
            {consultasPendientes.filter(c => c.estado === "pendiente").length}
          </span>
        </button>
      )}

      {/* Modal de Servicios Médicos Pendientes */}
      {showConsultasPendientes && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Servicios Médicos Pendientes</h2>
                  <p className="text-sm opacity-90 mt-1">
                    {sucursal?.nombre} - {consultasPendientes.filter(c => c.estado === "pendiente").length} paciente(s) en espera
                  </p>
                </div>
                <button
                  onClick={() => setShowConsultasPendientes(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-150px)]">
              {consultasPendientes.filter(c => c.estado === "pendiente").length === 0 ? (
                <div className="text-center py-12">
                  <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">¡No hay servicios pendientes!</p>
                  <p className="text-gray-400 text-sm mt-2">Todos los servicios han sido atendidos</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                    Pacientes en Espera
                  </h3>
                  {consultasPendientes
                    .filter(c => c.estado === "pendiente")
                    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                    .map((servicio, index) => {
                      // Obtener icono según el tipo de servicio
                      const getServiceIcon = (servicioNombre: string) => {
                        const nombre = servicioNombre.toLowerCase();
                        if (nombre.includes('consulta')) return <Stethoscope className="w-5 h-5" />;
                        if (nombre.includes('inyecc')) return <Syringe className="w-5 h-5" />;
                        if (nombre.includes('presión')) return <Heart className="w-5 h-5" />;
                        if (nombre.includes('glucemia')) return <Droplet className="w-5 h-5" />;
                        if (nombre.includes('certificado')) return <FileCheck className="w-5 h-5" />;
                        if (nombre.includes('lavado')) return <Ear className="w-5 h-5" />;
                        if (nombre.includes('diu') || nombre.includes('implante')) return <Activity className="w-5 h-5" />;
                        if (nombre.includes('punto') || nombre.includes('sutura')) return <Scissors className="w-5 h-5" />;
                        if (nombre.includes('curación') || nombre.includes('sonda')) return <Bandage className="w-5 h-5" />;
                        return <Activity className="w-5 h-5" />;
                      };

                      // Obtener color según el tipo de servicio
                      const getServiceColor = (servicioNombre: string) => {
                        const nombre = servicioNombre.toLowerCase();
                        if (nombre.includes('consulta')) return 'teal';
                        if (nombre.includes('inyecc')) return 'blue';
                        if (nombre.includes('presión')) return 'red';
                        if (nombre.includes('glucemia')) return 'purple';
                        if (nombre.includes('certificado')) return 'green';
                        return 'amber';
                      };

                      const color = getServiceColor(servicio.servicio);

                      return (
                        <div
                          key={servicio.id}
                          className={`p-4 rounded-lg border-2 border-${color}-200 bg-${color}-50 hover:shadow-md transition-shadow`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                                  {index + 1}
                                </span>
                                <h4 className="font-bold text-lg text-gray-800">{servicio.nombrePaciente}</h4>
                              </div>
                              <div className="ml-10 space-y-1">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                  {getServiceIcon(servicio.servicio)}
                                  <span>{servicio.servicio}</span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  <strong>Registrado:</strong> {new Date(servicio.fecha).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAtenderConsulta(servicio.id)}
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-3 rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
                          >
                            <Check className="w-5 h-5" />
                            {loading ? "Procesando..." : "Marcar como Atendido"}
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Lista de servicios atendidos */}
              {consultasPendientes.filter(c => c.estado === "atendida").length > 0 && (
                <div className="mt-8 pt-6 border-t">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    Servicios Atendidos Hoy
                  </h3>
                  <div className="space-y-2">
                    {consultasPendientes
                      .filter(c => c.estado === "atendida")
                      .sort((a, b) => new Date(b.fechaAtencion || b.fecha).getTime() - new Date(a.fechaAtencion || a.fecha).getTime())
                      .map((servicio) => (
                        <div
                          key={servicio.id}
                          className="p-3 rounded-lg border-2 border-green-200 bg-green-50"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{servicio.nombrePaciente}</p>
                              <p className="text-sm text-gray-600">{servicio.servicio}</p>
                              <p className="text-xs text-gray-500">
                                Atendido: {servicio.fechaAtencion ? new Date(servicio.fechaAtencion).toLocaleString() : "Recientemente"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-200 text-green-800 text-xs font-semibold">
                              <Check className="w-4 h-4" />
                              Atendido
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </ModuleGuard>
      </div>
    </>
  );
}