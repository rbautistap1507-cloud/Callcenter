import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { SUCURSALES, User } from "../shared";
import {
  projectId,
  publicAnonKey,
  serviceRoleKey,
} from "../../../utils/supabase/info";
import { supabase } from "../../../utils/supabase/client";
import { formatearFechaHoraCDMX } from "../../../utils/timezone";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ArrowLeftRight,
  Receipt,
  TrendingUp,
  Users,
  FileText,
  LogOut,
  Building,
  ChevronDown,
  Menu,
  X,
  Edit,
  Printer,
  Trash2,
  Plus,
  Search,
  AlertTriangle,
  Upload,
  Calendar,
  DollarSign,
  Check,
  Eye,
  Download,
  UserPlus,
  Stethoscope,
  Truck,
  UserCheck,
  BarChart3,
  LineChart,
  ClipboardList,
  Settings,
  Info,
  FileBarChart,
  Save,
  Archive,
  Monitor,
  CreditCard,
MoreVertical,
ShieldCheck,
ArrowUp,
ArrowDown,
} from "lucide-react";
import SaleDetailsModal from "./supervisor/SaleDetailsModal";
import PurchaseDetailsModal from "./supervisor/PurchaseDetailsModal";
import AdjustmentDetailsModal from "./supervisor/AdjustmentDetailsModal";
import EditProductModal from "./supervisor/EditProductModal";
import PrintLabelModal from "./supervisor/PrintLabelModal";
import DeleteProductModal from "./supervisor/DeleteProductModal";
import AddProductModal from "./supervisor/AddProductModal";
import VentaDetailsModal from "./supervisor/VentaDetailsModal";
import EditVentaModal from "./supervisor/EditVentaModal";
import DevolucionVentaModal from "./supervisor/DevolucionVentaModal";
import DeleteVentaModal from "./supervisor/DeleteVentaModal";
import ComprasManagement from "./supervisor/ComprasManagement";
import ComprasMasivas from "./supervisor/ComprasMasivas";
import PaymentMethodModal from "./supervisor/PaymentMethodModal";
import VentaReciboModal from "./supervisor/VentaReciboModal";
import AgregarGasto from "./supervisor/AgregarGasto";
import HistorialGastos from "./supervisor/HistorialGastos";
import HistorialTraslados from "./supervisor/HistorialTraslados";
import InventarioMasivo from "./supervisor/InventarioMasivo";
import AgregarTrasladoIndividual from "./supervisor/AgregarTrasladoIndividual";
import ReporteCompras from "./supervisor/ReporteCompras";
import ReporteMovimientos from "./supervisor/ReporteMovimientos";
import ReporteGastos from "./supervisor/ReporteGastos";
import ReporteProveedores from "./supervisor/ReporteProveedores";
import ReportePersonal from "./supervisor/ReportePersonal";
import TrasladosMasivos from "./supervisor/TrasladosMasivos";
import AgregarCompraIndividual from "./supervisor/AgregarCompraIndividual";
import AjusteMasivo from "./supervisor/AjusteMasivo";
import InventarioFisico from "./supervisor/InventarioFisico";


interface SupervisorDashboardProps {
  user?: User;
  onLogout: () => void;
  isAdmin?: boolean;
}

import StaffManagement from "./supervisor/StaffManagement";
import CajasConfig from "./supervisor/CajasConfig";
import ReporteCortes from "./supervisor/ReporteCortes";
import ReportesRouter from "./supervisor/ReportesRouter";
import ReporteMensual from "./supervisor/ReporteMensual";
import ServiciosMedicosView from "./supervisor/ServiciosMedicosView";
import ReportePacientes from "./supervisor/ReportePacientes";
import ReporteServicios from "./supervisor/ReporteServicios";

type MenuPrincipal =
  | "dashboard"
  | "inventario"
  | "compras"
  | "traslados"
  | "gastos"
  | "ventas"
  | "personal"
  | "reportes"
  | "cajas"
  | "servicios";
type SubMenuInventario = "lista-productos" | "carga-masiva" | null;
type SubMenuCompras =
  | "lista-compras"
  | "agregar-individual"
  | "agregar-masivo"
  | null;
type SubMenuTraslados =
  | "lista-traslados"
  | "agregar-traslado-individual"
  | "agregar-traslado-masivo"
  | null;
type SubMenuGastos = "lista-gastos" | "agregar-gasto" | null;
type SubMenuVentas = "lista-ventas" | null;
type SubMenuPersonal =
  | "lista-medicos"
  | "agregar-medico"
  | "lista-proveedores"
  | "agregar-proveedor"
  | "lista-farmaceuticos"
  | "agregar-farmaceutico"
  | "asignacion-turnos"
  | "historico-medicos"
  | null;
type SubMenuReportes =
  | "mensual"
  | "inventario"
  | "productos-top"
  | "cortes"
  | "stock-bajo"
  | "caducidades"
  | "comprado-vs-vendido"
  | "traspasos"
  | "categorias"
  | "ventas"
  | "antibioticos"
  | "balance-general"
  | "compras"
  | "gastos"
  | "proveedores"
  | "personal"
  | "pacientes"
    | "movimientos"
  | "servicios-medicos"
  | null;

type SubMenuAjustes =
  | "nuevo-ajuste"
  | "ajuste-masivo"
  | "historial-ajustes"
  | "inventario-fisico"
  | null;

export default function SupervisorDashboard({
  user,
  onLogout,
  isAdmin = false,
}: SupervisorDashboardProps) {
  const [selectedSucursal, setSelectedSucursal] =
    useState<string>("todas");
  const [permissions, setPermissions] = useState<any>({});

  useEffect(() => {
    fetchPermissions();
  }, []);



  const fetchPermissions = async () => {
  try {
    const stored = localStorage.getItem('lympos_permissions')
    if (stored) setPermissions(JSON.parse(stored))
  } catch (error) {
    console.error('Error fetching permissions:', error)
  }
}

  const hasPermission = (feature: string) => {
    const role = user?.role || "supervisor";
    if (!permissions || !permissions[role]) return true;
    return permissions[role][feature] !== false;
  };
const cargarAuditoriaMovimientos = async () => {
    if (!productoDetalles) return;
    const codigo = productoDetalles.codigoBarras || productoDetalles.id;
    const suc = selectedSucursal === "todas" ? "" : selectedSucursal;
    setAuditoriaCargando(true);
    try {
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos/${encodeURIComponent(codigo)}/movimientos${suc ? `?sucursal=${suc}` : ""}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await resp.json();
      if (data.success) {
        setAuditoriaMovimientos(data.movimientos || []);
      } else {
        toast.error(data.error || "Error al cargar movimientos");
      }
    } catch (e) {
      toast.error("Error al cargar movimientos");
    } finally {
      setAuditoriaCargando(false);
    }
  };

  const confirmarAuditoria = async () => {
    if (!productoDetalles) return;
    if (selectedSucursal === "todas") {
      toast.error("Selecciona una sucursal específica para auditar");
      return;
    }
    if (auditoriaStockFisico === "" || isNaN(parseInt(auditoriaStockFisico))) {
      toast.error("Ingresa el conteo físico");
      return;
    }
    const codigo = productoDetalles.codigoBarras || productoDetalles.id;
    setAuditoriaConfirmando(true);
    try {
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/auditorias`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            productoId: codigo,
            sucursalId: selectedSucursal,
            stockFisico: parseInt(auditoriaStockFisico),
            notas: auditoriaNotas,
            confirmadoPor: user?.name || user?.username || "Auditoría",
          }),
        }
      );

      const data = await resp.json();
      if (data.success) {
        toast.success(data.estado === "ajustado"
          ? `Auditado y ajustado (diferencia: ${data.diferencia})`
          : "Inventario confirmado correcto");
        setAuditoriaStockFisico("");
        setAuditoriaNotas("");
        cargarAuditoriaMovimientos();
        loadData();
      } else {
        toast.error(data.error || "Error al confirmar auditoría");
      }
    } catch (e) {
      toast.error("Error al confirmar auditoría");
    } finally {
      setAuditoriaConfirmando(false);
    }
  };

  const [showSucursalDropdown, setShowSucursalDropdown] =
    useState(false);
  const [menuActivo, setMenuActivo] =
    useState<MenuPrincipal>("dashboard");
  const [subMenuInventario, setSubMenuInventario] =
    useState<SubMenuInventario>(null);
  const [subMenuCompras, setSubMenuCompras] =
    useState<SubMenuCompras>(null);
  const [subMenuTraslados, setSubMenuTraslados] =
    useState<SubMenuTraslados>(null);
  const [subMenuGastos, setSubMenuGastos] =
    useState<SubMenuGastos>(null);
  const [subMenuVentas, setSubMenuVentas] =
    useState<SubMenuVentas>(null);
  const [subMenuPersonal, setSubMenuPersonal] =
    useState<SubMenuPersonal>(null);
  const [subMenuReportes, setSubMenuReportes] =
    useState<SubMenuReportes>(null);
  const [subMenuAjustes, setSubMenuAjustes] =
    useState<SubMenuAjustes>(null);

  const [productos, setProductos] = useState<any[]>([]);
  const [ventas, setVentas] = useState<any[]>([]);
  const [compras, setCompras] = useState<any[]>([]);
  const [traslados, setTraslados] = useState<any[]>([]);
  const [ajustes, setAjustes] = useState<any[]>([]);
  const [medicos, setMedicos] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [farmaceuticos, setFarmaceuticos] = useState<any[]>([]);
  const [antibioticos, setAntibioticos] = useState<any[]>([]);
  const [historicoMedicos, setHistoricoMedicos] = useState<
    any[]
  >([]);
  const [historicoDetalle, setHistoricoDetalle] =
    useState<any>(null);
  const [searchProducto, setSearchProducto] = useState("");
  const [searchVenta, setSearchVenta] = useState("");
  const [loading, setLoading] = useState(false);

  // Estado para ver detalles del producto
  const [productoDetalles, setProductoDetalles] =
    useState<any>(null);
  const [auditoriaMovimientos, setAuditoriaMovimientos] = useState<any[]>([]);
  const [auditoriaCargando, setAuditoriaCargando] = useState(false);
  const [auditoriaStockFisico, setAuditoriaStockFisico] = useState("");
  const [auditoriaNotas, setAuditoriaNotas] = useState("");
  const [auditoriaConfirmando, setAuditoriaConfirmando] = useState(false);
  const [pestanaDetalles, setPestanaDetalles] = useState<
    | "detalle"
    | "grafica"
    | "ventas"
    | "cotizacion"
    | "compras"
    | "traslados"
    | "ajustes"
    | "auditoria"
  >("detalle");

  useEffect(() => {
    if (pestanaDetalles === "auditoria" && productoDetalles) {
      cargarAuditoriaMovimientos();
    }
  }, [pestanaDetalles, productoDetalles]);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [selectedCompraDetalle, setSelectedCompraDetalle] =
    useState<any>(null);
  const [selectedAjusteDetalle, setSelectedAjusteDetalle] =
    useState<any>(null);

  // Estado para editar producto
  const [selectedProductToEdit, setSelectedProductToEdit] =
    useState<any>(null);
  const [selectedProductToPrint, setSelectedProductToPrint] =
    useState<any>(null);
  const [selectedProductToDelete, setSelectedProductToDelete] =
    useState<any>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] =
    useState<string | null>(null);
  const [showAddProductModal, setShowAddProductModal] =
    useState(false);

  const [selectedUserToEdit, setSelectedUserToEdit] =
    useState<any>(null);
  const [showClearMedicosModal, setShowClearMedicosModal] =
    useState(false);
  const [clearingMedicos, setClearingMedicos] = useState(false);

  // Estados para modales de ventas
  const [selectedVentaDetalles, setSelectedVentaDetalles] =
    useState<any>(null);
  const [selectedVentaToEdit, setSelectedVentaToEdit] =
    useState<any>(null);
  const [selectedVentaDevolucion, setSelectedVentaDevolucion] =
    useState<any>(null);
  const [selectedVentaToDelete, setSelectedVentaToDelete] =
    useState<any>(null);
  const [selectedVentaPago, setSelectedVentaPago] =
    useState<any>(null);
  const [selectedVentaRecibo, setSelectedVentaRecibo] =
    useState<any>(null);
  const [openDropdownId, setOpenDropdownId] = useState<
    string | null
  >(null);

  // Estado para pestañas de últimos movimientos en dashboard
  const [
    ultimosMovimientosPestana,
    setUltimosMovimientosPestana,
  ] = useState<
    | "ventas"
    | "cotizacion"
    | "compras"
    | "traslados"
    | "proveedores"
  | "ajustes"
  >("ventas");

  // Estado para gastos
  const [gastosRefreshTrigger, setGastosRefreshTrigger] =
    useState(0);

  // Estado para traslados
  const [trasladosRefreshTrigger, setTrasladosRefreshTrigger] =
    useState(0);

  const [stats, setStats] = useState({
    totalProductos: 0,
    stockBajo: 0,
    totalVentas: 0,
    ventasHoy: 0,
  });

  // Estados para Ajustes
  const [nuevoAjuste, setNuevoAjuste] = useState({
    productoSeleccionado: null as any,
    sucursalId: "",
    accion: "restar" as "restar" | "agregar", // Nueva propiedad
    cantidad: 0, // Nueva propiedad para la cantidad a ajustar
    nuevoStock: 0,
    motivo: "",
    notas: "",
    referencia: "Supervisor", // Usuario por defecto
  });
  const [editingAjuste, setEditingAjuste] = useState<any>(null);
  const [deletingAjuste, setDeletingAjuste] = useState<
    string | null
  >(null);
  const [ajusteToDelete, setAjusteToDelete] =
    useState<any>(null);
  const [motivoEliminacionAjuste, setMotivoEliminacionAjuste] =
    useState("");

  // Estados para Compra Individual
  const [compraIndividual, setCompraIndividual] = useState({
    productoSeleccionado: null as any,
    cantidad: 1,
    precioCompra: 0,
    proveedor: "",
    estatus: "pendiente" as "pendiente" | "recibido",
    fecha: new Date().toISOString().split("T")[0],
    notas: "",
    fechaVencimiento: "",
  });

  // Estados para gestión de compras (movido a ComprasManagement)
  const [editingCompra, setEditingCompra] = useState<any>(null);

  // Estados para Traslado Individual
  const [trasladoIndividual, setTrasladoIndividual] = useState({
    productoSeleccionado: null as any,
    cantidad: 1,
    sucursalDestino: "",
    fecha: new Date().toISOString().split("T")[0],
    notas: "",
  });

  // Estados para Personal
  const [nuevoMedico, setNuevoMedico] = useState({
    nombre: "",
    especialidad: "",
    cedula: "",
    email: "",
    horario: "",
    direccion: "",
    escuela: "",
    logoEscuela: "",
    username: "",
    password: "",
    sucursalId: "",
  });

  const [nuevoProveedor, setNuevoProveedor] = useState({
    nombre: "",
    empresa: "",
    telefono: "",
    email: "",
    direccion: "",
    productosQueSurte: "",
    rfc: "",
  });

  const [nuevoFarmaceutico, setNuevoFarmaceutico] = useState({
    nombre: "",
    cedula: "",
    turno: "",
    sucursalId: selectedSucursal,
    username: "",
    password: "",
  });

  // Estados para Reportes
  const [filtroReporte, setFiltroReporte] = useState({
    fechaInicio: new Date(new Date().setDate(1))
      .toISOString()
      .split("T")[0],
    fechaFin: new Date().toISOString().split("T")[0],
  });

  const sucursal = SUCURSALES.find(
    (s) => s.id === selectedSucursal,
  );

  // Helper para obtener stock total o por sucursal
  const getStock = (producto: any) => {
    if (selectedSucursal === "todas") {
      return Object.values(
        producto.stockBySucursal || {},
      ).reduce(
        (acc: number, val: any) => acc + (Number(val) || 0),
        0,
      );
    }
    return producto.stockBySucursal?.[selectedSucursal] || 0;
  };

  useEffect(() => {
    calculateStats(productos, ventas);
  }, [productos, ventas, selectedSucursal]);

  useEffect(() => {
    loadData();

    // Configurar Supabase Realtime
    const channel = supabase
      .channel("db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kv_store_7d799f19",
        },
        (payload: any) => {
          handleRealtimeUpdate(payload);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Cargar datos del ajuste cuando se está editando
  useEffect(() => {
    if (editingAjuste) {
      const producto = productos.find(
        (p) =>
          p.codigoBarras === editingAjuste.productoId ||
          p.id === editingAjuste.productoId,
      );

      setNuevoAjuste({
        productoSeleccionado: producto || null,
        sucursalId: editingAjuste.sucursalId || "",
        accion: editingAjuste.accion || "restar",
        cantidad: editingAjuste.cantidad || 0,
        nuevoStock: editingAjuste.nuevoStock || 0,
        motivo: editingAjuste.motivo || "",
        notas: editingAjuste.notas || "",
        referencia: editingAjuste.referencia || user.username,
      });
    }
  }, [editingAjuste]);

  // Cargar datos de la compra cuando se está editando
  useEffect(() => {
    if (editingCompra) {
      const producto = productos.find(
        (p) =>
          p.codigoBarras === editingCompra.productoId ||
          p.id === editingCompra.productoId,
      );

      setCompraIndividual({
        productoSeleccionado: producto || null,
        cantidad: editingCompra.cantidad || 1,
        precioCompra: editingCompra.precioCompra || 0,
        proveedor: editingCompra.proveedor || "",
        estatus: editingCompra.estatus || "pendiente",
        fecha: editingCompra.fecha
          ? editingCompra.fecha.split("T")[0]
          : new Date().toISOString().split("T")[0],
        notas: editingCompra.notas || "",
      });
    }
  }, [editingCompra]);

  // Cargar histórico de médicos cuando se activa el submenú
  useEffect(() => {
    if (subMenuPersonal === "historico-medicos") {
      loadHistoricoMedicos();
    }
  }, [subMenuPersonal]);

  // Cerrar dropdown con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () =>
      document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleRealtimeUpdate = (payload: any) => {
    const {
      eventType,
      new: newRecord,
      old: oldRecord,
    } = payload;

    // Determine the type of record based on key prefix
    const key = newRecord?.key || oldRecord?.key;
    if (!key) return;

    if (key.startsWith("producto:")) {
      if (eventType === "DELETE") {
        setProductos((prev) =>
          prev.filter((p) => p.id !== key),
        );
      } else {
        const productData = { ...newRecord.value, id: key };
        setProductos((prev) => {
          const exists = prev.find((p) => p.id === key);
          if (exists) {
            return prev.map((p) =>
              p.id === key ? productData : p,
            );
          }
          return [...prev, productData];
        });

        // Update details view if open
        setProductoDetalles((prev: any) => {
          if (
            prev &&
            (prev.id === key ||
              prev.codigoBarras === productData.codigoBarras)
          ) {
            return productData;
          }
          return prev;
        });
      }
    } else if (key.startsWith("venta:")) {
      if (eventType === "DELETE") {
        setVentas((prev) => prev.filter((v) => v.id !== key));
      } else {
        const ventaData = { ...newRecord.value, id: key };
        setVentas((prev) => {
          const exists = prev.find((v) => v.id === key);
          if (exists) {
            return prev.map((v) =>
              v.id === key ? ventaData : v,
            );
          }
          return [...prev, ventaData];
        });
      }
    } else if (key.startsWith("compra:")) {
      if (eventType === "DELETE") {
        setCompras((prev) => prev.filter((c) => c.id !== key));
      } else {
        const compraData = { ...newRecord.value, id: key };
        setCompras((prev) => {
          const exists = prev.find((c) => c.id === key);
          return exists
            ? prev.map((c) => (c.id === key ? compraData : c))
            : [...prev, compraData];
        });
      }
    } else if (key.startsWith("traslado:")) {
      if (eventType === "DELETE") {
        setTraslados((prev) =>
          prev.filter((t) => t.id !== key),
        );
      } else {
        const trasladoData = { ...newRecord.value, id: key };
        setTraslados((prev) => {
          const exists = prev.find((t) => t.id === key);
          return exists
            ? prev.map((t) => (t.id === key ? trasladoData : t))
            : [...prev, trasladoData];
        });
      }
    } else if (key.startsWith("ajuste:")) {
      if (eventType === "DELETE") {
        setAjustes((prev) => prev.filter((a) => a.id !== key));
      } else {
        const ajusteData = { ...newRecord.value, id: key };
        setAjustes((prev) => {
          const exists = prev.find((a) => a.id === key);
          return exists
            ? prev.map((a) => (a.id === key ? ajusteData : a))
            : [...prev, ajusteData];
        });
      }
    }
  };

  // Efecto para mantener actualizado el detalle del producto si cambia la lista de productos (ej. tras un ajuste)
  useEffect(() => {
    if (productoDetalles) {
      const productoActualizado = productos.find(
        (p) =>
          p.id === productoDetalles.id ||
          p.codigoBarras === productoDetalles.codigoBarras,
      );
      if (productoActualizado) {
        // Verificar si el stock ha cambiado para evitar actualizaciones innecesarias
        const stockActual = JSON.stringify(
          productoDetalles.stockBySucursal,
        );
        const stockNuevo = JSON.stringify(
          productoActualizado.stockBySucursal,
        );

        if (stockActual !== stockNuevo) {
          setProductoDetalles(productoActualizado);
        }
      }
    }
  }, [productos]);

  const loadData = async () => {
    try {
      // Cargar productos
      const prodResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos?limit=10000`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      );
      const prodData = await prodResponse.json();
      if (prodData.success) {
        setProductos(prodData.productos || []);
      }

      // Cargar ventas
      const ventasResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ventas`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      );
      const ventasData = await ventasResponse.json();
      console.log("🔍 Respuesta de ventas:", ventasData);

      if (ventasData.success) {
        console.log(
          "✅ Ventas cargadas:",
          ventasData.ventas?.length || 0,
        );
        setVentas(ventasData.ventas || []);
      } else {
        console.error(
          "❌ Error en respuesta de ventas:",
          ventasData,
        );
        // Intentar cargar ventas si viene como array directo (compatibilidad)
        if (Array.isArray(ventasData)) {
          console.log(
            "⚠️ Ventas en formato array, cargando...",
          );
          setVentas(ventasData);
        } else {
          setVentas([]);
        }
      }

      // Cargar compras
      await loadCompras();

      // Cargar traslados
      await loadTraslados();

      // Cargar ajustes
      await loadAjustes();

      // Cargar personal
      await loadMedicos();
      await loadProveedores();
      await loadFarmaceuticos();

      // Cargar antibióticos
      await loadAntibioticos();
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  const loadCompras = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/compras`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      );
      const data = await response.json();
      console.log("📦 Compras cargadas:", data);

      // El backend devuelve el array directamente
      if (Array.isArray(data)) {
        // Debug: ver estructura de una compra
        if (data.length > 0) {
          console.log("🔍 DEBUG - Ejemplo de compra:", data[0]);
        }
        setCompras(data);
      } else if (data.success && data.compras) {
        if (data.compras.length > 0) {
          console.log(
            "🔍 DEBUG - Ejemplo de compra:",
            data.compras[0],
          );
        }
        setCompras(data.compras);
      } else {
        setCompras([]);
      }
    } catch (error) {
      console.error("Error cargando compras:", error);
      setCompras([]);
    }
  };

  const loadTraslados = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/traslados`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      );
      const data = await response.json();
      if (data.success) {
        // Debug: ver estructura de un traslado
        if (data.traslados && data.traslados.length > 0) {
          console.log(
            "🔍 DEBUG - Ejemplo de traslado:",
            data.traslados[0],
          );
        }
        setTraslados(data.traslados || []);
      }
    } catch (error) {
      console.error("Error cargando traslados:", error);
    }
  };

  const recalcularPreciosTraslados = async () => {
    try {
      toast.info("Recalculando precios de traslados...");

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/traslados/recalcular-precios`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      );

      const data = await response.json();

      if (data.success) {
        toast.success(
          `✅ Recálculo completado: ${data.estadisticas.actualizados} traslados actualizados`,
        );

        // Recargar los traslados
        await loadTraslados();
      } else {
        toast.error("Error al recalcular precios");
      }
    } catch (error) {
      console.error("Error recalculando precios:", error);
      toast.error("Error al recalcular precios");
    }
  };

  const loadMedicos = async () => {
    try {
      const { data, error } = await supabase
        .from("perfiles")
        .select("*")
        .eq("rol", "medico")
        .order("activo", { ascending: false })
        .order("created_at", { ascending: false });
      if (!error) {
        const medicos = (data || []).map((m: any) => ({
          ...m,
          id: m.id,
          name: m.nombre_completo,
          nombre: m.nombre_completo,
          username: m.usuario,
          role: m.rol,
          activo: m.activo !== false,
          cedula: m.cedula_profesional,
          especialidad: m.especialidad,
          escuela: m.universidad,
          horario: m.horario,
          direccion: m.direccion,
          sucursalId: m.sucursal_id,
        }));
        setMedicos(medicos);
      }
    } catch (error) {
      console.error("Error cargando médicos:", error);
    }
  };

  const loadHistoricoMedicos = async () => {
    try {
      const { data: inactivos } = await supabase
        .from("perfiles")
        .select("*")
        .eq("rol", "medico")
        .eq("activo", false)
        .order("created_at", { ascending: false })
      
      const supabaseHistorico = (inactivos || []).map((m: any) => ({
        medicoInfo: {
          nombre: m.nombre_completo,
          cedula: m.cedula_profesional || "N/A",
          especialidad: m.especialidad || "General",
        },
        fechaDesactivacion: m.created_at,
        totalConsultas: 0,
        totalRecetas: 0,
        consultas: [],
        recetas: [],
        _id: m.id,
      }))

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/historico-medicos`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } }
        )
        const data = await response.json()
        const makeHistorico = data.success ? (data.historicos || []) : []
        setHistoricoMedicos([...supabaseHistorico, ...makeHistorico])
      } catch {
        setHistoricoMedicos(supabaseHistorico)
      }
    } catch (error) {
      console.error("Error cargando histórico de médicos:", error)
    }
  };
      

  const loadProveedores = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/proveedores`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      );
      const data = await response.json();
      if (data.success) {
        setProveedores(data.proveedores || []);
      }
    } catch (error) {
      console.error("Error cargando proveedores:", error);
    }
  };

  const loadFarmaceuticos = async () => {
    try {
      const { data, error } = await supabase
        .from("perfiles")
        .select("*")
        .eq("rol", "farmaceutico")
        .order("created_at", { ascending: false });
      if (!error) {
        setFarmaceuticos((data || []).map((f: any) => ({
          ...f,
          id: f.id,
          name: f.nombre_completo,
          nombre: f.nombre_completo,
          username: f.usuario,
          role: f.rol,
          activo: f.activo !== false,
          cedula: f.cedula_profesional,
          turno: f.turno,
          sucursalId: f.sucursal_id,
        })));
      }
    } catch (error) {
      console.error("Error cargando farmacéuticos:", error);
    }
  };

  const loadAntibioticos = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/antibioticos`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      );
      const data = await response.json();
      if (data.success) {
        setAntibioticos(data.antibioticos || []);
      }
    } catch (error) {
      console.error("Error cargando antibióticos:", error);
    }
  };

  const loadAjustes = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ajustes`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      );
      const data = await response.json();
      if (data.success) {
        setAjustes(data.ajustes || []);
      }
    } catch (error) {
      console.error("Error cargando ajustes:", error);
    }
  };

  const calculateStats = (prods: any[], vents: any[]) => {
    const totalProductos = prods.length;
    const stockBajo = prods.filter(
      (p) => getStock(p) < 20,
    ).length;

    const ventasSucursal =
      selectedSucursal === "todas"
        ? vents
        : vents.filter(
            (v) => v.sucursalId === selectedSucursal,
          );

    // Filtrar solo ventas completadas (no cotizaciones ni devoluciones)
    const ventasCompletadas = ventasSucursal.filter(
      (v) =>
        (!v.tipo || v.tipo === "venta") &&
        v.estado !== "devuelta",
    );

    const totalVentas = ventasCompletadas.reduce(
      (sum, v) => sum + (parseFloat(v.total) || 0),
      0,
    );

    const hoy = new Date().toISOString().split("T")[0];
    const ventasHoy = ventasCompletadas
      .filter((v) => v.fecha?.startsWith(hoy))
      .reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);

    console.log("📊 Estadísticas de Ventas:", {
      totalVentasBD: vents.length,
      ventasSucursal: ventasSucursal.length,
      ventasCompletadas: ventasCompletadas.length,
      totalVentas,
      ventasHoy,
      sucursalSeleccionada: selectedSucursal,
    });

    setStats({
      totalProductos,
      stockBajo,
      totalVentas,
      ventasHoy,
    });
  };

  const handleMenuClick = (menu: MenuPrincipal) => {
    setMenuActivo(menu);
    // Reset submenus
    setSubMenuInventario(null);
    setSubMenuCompras(null);
    setSubMenuTraslados(null);
    setSubMenuGastos(null);
    setSubMenuVentas(null);
    setSubMenuAjustes(null);
    setSubMenuPersonal(null);
    setSubMenuReportes(null);
  };

  const handleExportToExcel = () => {
    const productosFiltrados = productos.filter((prod) => {
      const term = searchProducto.toLowerCase();
      return (
        prod.nombre?.toLowerCase().includes(term) ||
        prod.codigoBarras?.toLowerCase().includes(term)
      );
    });

    const dataToExport = productosFiltrados.map((prod) => {
      // Stock Actual (Bodega)
      const stock =
        selectedSucursal === "todas"
          ? Object.values(prod.stockBySucursal || {}).reduce(
              (a: any, b: any) => Number(a) + Number(b),
              0,
            )
          : prod.stockBySucursal?.[selectedSucursal] || 0;

      const costoActual = parseFloat(prod.precioCompra) || 0;
      const precioVenta = parseFloat(prod.precioVenta) || 0;

      // Ventas Registradas
      const relevantVentas =
        selectedSucursal === "todas"
          ? ventas
          : ventas.filter(
              (v) => v.sucursalId === selectedSucursal,
            );

      let soldQty = 0;
      let soldVal = 0;

      relevantVentas.forEach((v) => {
        const item = v.productos?.find(
          (p: any) =>
            p.productoId === prod.id ||
            p.codigoBarras === prod.codigoBarras,
        );
        if (item) {
          soldQty += item.cantidad || 0;
          soldVal +=
            (item.precio || precioVenta) * (item.cantidad || 0);
        }
      });

      // Compras Registradas (Histórico real)
      const relevantCompras =
        selectedSucursal === "todas"
          ? compras
          : compras.filter(
              (c) => c.sucursalId === selectedSucursal,
            );

      let purchasedQtyReal = 0;
      let purchasedValReal = 0;

      relevantCompras.forEach((c) => {
        if (
          c.productoId === prod.codigoBarras ||
          c.productoId === prod.id ||
          c.nombreProducto === prod.nombre
        ) {
          purchasedQtyReal += Number(c.cantidad) || 0;
          purchasedValReal +=
            Number(c.total) ||
            Number(c.cantidad) * Number(c.precioCompra) ||
            0;
        }
      });

      const stockMasVendido = Number(stock) + soldQty;

      let displayPurchasedQty = purchasedQtyReal;
      let displayPurchasedVal = purchasedValReal;

      if (stockMasVendido > purchasedQtyReal) {
        const diffQty = stockMasVendido - purchasedQtyReal;
        displayPurchasedQty += diffQty;
        displayPurchasedVal += diffQty * costoActual;
      }

      const stockVal = Number(stock) * costoActual;

      const costOfGoodsSold = soldQty * costoActual;
      const profit = soldVal - costOfGoodsSold;

      return {
        Código: prod.codigoBarras,
        Producto: prod.nombre,
        "Comprado ($)": displayPurchasedVal,
        "Comprado (Cant)": displayPurchasedQty,
        "Vendido ($)": soldVal,
        "Vendido (Cant)": soldQty,
        Ganancia: profit,
        "Valor Stock": stockVal,
        "Stock Actual": stock,
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(
      wb,
      `Reporte_Inventario_${selectedSucursal}_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const handleGuardarCompraIndividual = async () => {
    if (
      !compraIndividual.productoSeleccionado ||
      compraIndividual.cantidad <= 0 ||
      compraIndividual.precioCompra <= 0
    ) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    setLoading(true);
    try {
      const compraData = {
        sucursalId: selectedSucursal,
        productoId:
          compraIndividual.productoSeleccionado.codigoBarras,
        nombreProducto:
          compraIndividual.productoSeleccionado.nombre,
        cantidad: compraIndividual.cantidad,
        precioCompra: compraIndividual.precioCompra,
        total:
          compraIndividual.cantidad *
          compraIndividual.precioCompra,
        proveedor: compraIndividual.proveedor,
        estatus: compraIndividual.estatus,
        fecha: compraIndividual.fecha,
        notas: compraIndividual.notas,
        fechaVencimiento: compraIndividual.fechaVencimiento || "",
      };

      const isEditing = !!editingCompra;
      const url = isEditing
        ? `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/compras/${editingCompra.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/compras`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(compraData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(
          isEditing
            ? "Compra actualizada correctamente"
            : "Compra registrada correctamente. Inventario actualizado.",
        );

        // Actualizaci��n optimista del inventario
        setProductos((prevProductos) =>
          prevProductos.map((p) => {
            if (
              p.codigoBarras === compraData.productoId ||
              p.id === compraData.productoId
            ) {
              const currentStock = Number(
                p.stockBySucursal?.[compraData.sucursalId] || 0,
              );
              const updatedStock = {
                ...p.stockBySucursal,
                [compraData.sucursalId]:
                  currentStock + Number(compraData.cantidad),
              };

              // Si este es el producto que se está visualizando en detalle
              if (
                productoDetalles &&
                (productoDetalles.id === p.id ||
                  productoDetalles.codigoBarras ===
                    p.codigoBarras)
              ) {
                setProductoDetalles({
                  ...productoDetalles,
                  stockBySucursal: updatedStock,
                });
              }

              return {
                ...p,
                stockBySucursal: updatedStock,
              };
            }
            return p;
          }),
        );

        setCompraIndividual({
          productoSeleccionado: null,
          cantidad: 1,
          precioCompra: 0,
          proveedor: "",
          estatus: "pendiente",
          fecha: new Date().toISOString().split("T")[0],
          notas: "",
          fechaVencimiento: "",
        });
        setSearchProducto("");
        setEditingCompra(null);
        setSubMenuCompras("lista-compras"); // Volver a la lista después de guardar
        loadCompras();
        // loadData(); // Ya no es estrictamente necesario gracias a la actualización optimista, pero podemos dejarlo para consistencia eventual
      } else {
        toast.error("Error al registrar la compra");
      }
    } catch (error) {
      console.error("Error guardando compra:", error);
      toast.error("Error al guardar la compra");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarTrasladoIndividual = async () => {
    if (
      !trasladoIndividual.productoSeleccionado ||
      trasladoIndividual.cantidad <= 0 ||
      !trasladoIndividual.sucursalDestino
    ) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    const stockDisponible =
      trasladoIndividual.productoSeleccionado.stockBySucursal?.[
        selectedSucursal
      ] || 0;
    if (trasladoIndividual.cantidad > stockDisponible) {
      toast.error(
        `Stock insuficiente. Disponible: ${stockDisponible}`,
      );
      return;
    }

    setLoading(true);
    try {
      const trasladoData = {
        sucursalOrigen: selectedSucursal,
        sucursalDestino: trasladoIndividual.sucursalDestino,
        productoId:
          trasladoIndividual.productoSeleccionado.codigoBarras,
        nombreProducto:
          trasladoIndividual.productoSeleccionado.nombre,
        cantidad: trasladoIndividual.cantidad,
        fecha: trasladoIndividual.fecha,
        notas: trasladoIndividual.notas,
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/traslados`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(trasladoData),
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Traslado registrado correctamente");
        setTrasladoIndividual({
          productoSeleccionado: null,
          cantidad: 1,
          sucursalDestino: "",
          fecha: new Date().toISOString().split("T")[0],
          notas: "",
        });
        setSearchProducto("");
        loadTraslados();
        loadData();
      } else {
        toast.error("Error al registrar el traslado");
      }
    } catch (error) {
      console.error("Error guardando traslado:", error);
      toast.error("Error al guardar el traslado");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarMedico = async () => {
    if (
      !nuevoMedico.nombre ||
      !nuevoMedico.cedula ||
      !nuevoMedico.especialidad
    ) {
      toast.error(
        "Completa los campos obligatorios (Nombre, Cédula y Especialidad)",
      );
      return;
    }

    setLoading(true);
    try {
      // Generar username limpio (sin espacios ni caracteres especiales)
      const usernameBase = nuevoMedico.username
        ? nuevoMedico.username
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_.-]/g, "_")
        : `medico_${nuevoMedico.cedula.trim().replace(/[^a-z0-9]/gi, "_")}`;

      const userData = {
        ...nuevoMedico,
        name: nuevoMedico.nombre,
        username: usernameBase || `medico_${Date.now()}`,
        password: nuevoMedico.password || "123",
        role: "medico",
        sucursalId: nuevoMedico.sucursalId || "",
        activo: true,
      };

      const emailAuth = `${userData.username}@lympos.com`
      const adminRes = await fetch(`https://${projectId}.supabase.co/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({
          email: emailAuth,
          password: userData.password || "123",
          email_confirm: true
        })
      })
      const authResult = await adminRes.json()
      if (!authResult.id) throw new Error(authResult.message || "Error creando usuario en Auth")
    await supabase.from("perfiles").insert({
        id: authResult.id,
        nombre_completo: userData.name,
        usuario: userData.username,
        rol: "medico",
        sucursal_id: userData.sucursalId || null,
        activo: true,
        cedula_profesional: userData.cedula || null,
        especialidad: userData.especialidad || null,
        universidad: userData.escuela || null,
        logo_universidad: userData.logoEscuela || null,
        turno: userData.turno || null,
      })
      const data = { success: true }
      if (data.success) {
        toast.success("Médico agregado correctamente");
        setNuevoMedico({
          nombre: "",
          especialidad: "",
          cedula: "",
          email: "",
          horario: "",
          direccion: "",
          escuela: "",
          logoEscuela: "",
          username: "",
          password: "",
          sucursalId: "",
        });
        loadMedicos();
        setSubMenuPersonal("lista-medicos");
      } else {
        toast.error(
          "Error al agregar médico: " + (data.error || ""),
        );
      }
    } catch (error) {
      console.error("Error guardando médico:", error);
      toast.error("Error al guardar médico");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarProveedor = async () => {
    if (!nuevoProveedor.empresa || !nuevoProveedor.nombre || !nuevoProveedor.telefono) {
      toast.error("Completa los campos obligatorios")
      return
    }
    setLoading(true)
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/proveedores`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nuevoProveedor),
        }
      )
      const data = await response.json()
      if (data.success) {
        toast.success("Proveedor agregado correctamente")
        setNuevoProveedor({ nombre: "", empresa: "", telefono: "", email: "", direccion: "", productosQueSurte: "", rfc: "" })
        loadProveedores()
        setSubMenuPersonal("lista-proveedores")
      } else {
        toast.error("Error al agregar proveedor")
      }
    } catch (error) {
      toast.error("Error al guardar proveedor")
    } finally {
      setLoading(false)
    }
  }

  const handleGuardarFarmaceutico = async () => {
    if (
      !nuevoFarmaceutico.nombre ||
      !nuevoFarmaceutico.cedula
    ) {
      toast.error("Completa los campos obligatorios");
      return;
    }

    setLoading(true);
    try {
      // Generar username limpio (sin espacios ni caracteres especiales)
      const usernameBaseF = nuevoFarmaceutico.username
        ? nuevoFarmaceutico.username
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_.-]/g, "_")
        : `farm_${nuevoFarmaceutico.cedula.trim().replace(/[^a-z0-9]/gi, "_")}`;

      const userData = {
        ...nuevoFarmaceutico,
        name: nuevoFarmaceutico.nombre,
        username: usernameBaseF || `farm_${Date.now()}`,
        password: nuevoFarmaceutico.password || "123",
        role: "farmaceutico",
      };

     const emailAuthF = `${userData.username}@lympos.com`
      const adminResF = await fetch(`https://${projectId}.supabase.co/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({
          email: emailAuthF,
          password: userData.password || "123",
          email_confirm: true
        })
      })
      const authResultF = await adminResF.json()
      if (!authResultF.id) throw new Error(authResultF.message || "Error creando usuario en Auth")
      await supabase.from("perfiles").insert({
        id: authResultF.id,
        nombre_completo: userData.name,
        usuario: userData.username,
        rol: "farmaceutico",
        sucursal_id: userData.sucursalId || null,
        activo: true,
        cedula_profesional: userData.cedula || null,
        turno: userData.turno || null,
      })
      const data = { success: true }
      if (data.success) {
        toast.success("Farmacéutico agregado correctamente");
        setNuevoFarmaceutico({
          nombre: "",
          cedula: "",
          turno: "",
          sucursalId: selectedSucursal,
          username: "",
          password: "",
        });
        loadFarmaceuticos();
        setSubMenuPersonal("lista-farmaceuticos");
      } else {
        toast.error(
          "Error al agregar farmacéutico: " +
            (data.error || ""),
        );
      }
    } catch (error) {
      console.error("Error guardando farmacéutico:", error);
      toast.error("Error al guardar farmacéutico");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (
    userId: string,
    type: "medico" | "farmaceutico",
  ) => {
    if (
      !confirm(
        "¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.",
      )
    )
      return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/users/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Usuario eliminado");
        if (type === "medico") loadMedicos();
        else loadFarmaceuticos();
      } else {
        toast.error("Error al eliminar usuario");
      }
    } catch (e) {
      console.error("Error deleting user", e);
      toast.error("Error de conexión");
    }
  };

  const handleClearAllMedicos = async () => {
    setClearingMedicos(true);
    const loadingToast = toast.loading(
      "Limpiando directorio de médicos...",
    );
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/medicos/clear-all`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      );
      const data = await response.json();
      toast.dismiss(loadingToast);
      if (data.success) {
        toast.success(
          `Directorio limpiado. ${data.deletedCount} registro(s) eliminados.`,
        );
        setShowClearMedicosModal(false);
        setMedicos([]);
        setHistoricoMedicos([]);
      } else {
        toast.error(
          "Error al limpiar directorio: " + (data.error || ""),
        );
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error limpiando médicos:", error);
      toast.error("Error de conexión");
    } finally {
      setClearingMedicos(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUserToEdit) return;

    // Validar campos requeridos para médicos
    if (selectedUserToEdit.role === "medico") {
      if (
        !selectedUserToEdit.nombre &&
        !selectedUserToEdit.name
      ) {
        toast.error("El nombre es obligatorio");
        return;
      }
      if (!selectedUserToEdit.cedula) {
        toast.error("La cédula es obligatoria");
        return;
      }
      if (!selectedUserToEdit.especialidad) {
        toast.error("La especialidad es obligatoria");
        return;
      }
    }

    setLoading(true);
    try {
      // Preparar datos para enviar, asegurando consistencia de campos
      const updateData = {
        ...selectedUserToEdit,
        name:
          selectedUserToEdit.name || selectedUserToEdit.nombre,
        nombre:
          selectedUserToEdit.nombre || selectedUserToEdit.name,
      };

      // Si la contraseña está vacía o no fue modificada, no la incluimos en la actualización
      if (!updateData.password || updateData.password === "") {
        delete updateData.password;
      }

      console.log(
        "Actualizando usuario con datos:",
        updateData,
      );

    const { error: updateError } = await supabase
        .from("perfiles")
        .update({
          nombre_completo: updateData.name || updateData.nombre,
          activo: updateData.activo !== false,
          cedula_profesional: updateData.cedula || null,
          especialidad: updateData.especialidad || null,
          universidad: updateData.escuela || null,
          horario: updateData.horario || null,
          direccion: updateData.direccion || null,
          turno: updateData.turno || null,
        })
        .eq("id", selectedUserToEdit.id);
      const data = { success: !updateError };
      if (updateError) console.error("Update error:", updateError);
      if (data.success) {
          toast.success("Usuario actualizado correctamente");
        setSelectedUserToEdit(null);
        if (selectedUserToEdit.role === "medico") loadMedicos();
        else if (selectedUserToEdit.role === "farmaceutico")
          loadFarmaceuticos();
      } else {
        toast.error(
          "Error al actualizar usuario: " + (data.error || ""),
        );
      }
    } catch (e) {
      console.error("Error updating user", e);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMedicoActivo = async (medico: any) => {
    const estaActivo = medico.activo !== false
    const nuevoEstado = !estaActivo
    const mensaje = estaActivo
      ? "¿Deseas desactivar este médico?"
      : "¿Deseas reactivar este médico?"
    if (!confirm(mensaje)) return
    setLoading(true)
    try {
      // Intentar primero con Supabase (médicos nuevos)
      const { error: supabaseError } = await supabase
        .from("perfiles")
        .update({ activo: nuevoEstado })
        .eq("id", medico.id)
      
      if (!supabaseError) {
        toast.success(nuevoEstado ? "Médico reactivado" : "Médico desactivado")
        loadMedicos()
      } else {
        // Fallback al make-server (médicos del sistema original)
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/users/${encodeURIComponent(medico.id)}/toggle-active`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ activo: nuevoEstado }),
          }
        )
        const data = await response.json()
        if (data.success) {
          toast.success(nuevoEstado ? "Médico reactivado" : "Médico desactivado")
          loadMedicos()
        } else {
          toast.error(data.error || "Error al cambiar estado")
        }
      }
    } catch (e) {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  };

  const handleGuardarAjuste = async () => {
    if (
      !nuevoAjuste.productoSeleccionado ||
      !nuevoAjuste.sucursalId ||
      nuevoAjuste.nuevoStock < 0 ||
      !nuevoAjuste.motivo ||
      nuevoAjuste.cantidad <= 0
    ) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    setLoading(true);
    try {
      const ajusteData = {
        productoId:
          nuevoAjuste.productoSeleccionado.codigoBarras,
        nombreProducto: nuevoAjuste.productoSeleccionado.nombre,
        sucursalId: nuevoAjuste.sucursalId,
        sucursalNombre: SUCURSALES.find(
          (s) => s.id === nuevoAjuste.sucursalId,
        )?.nombre,
        accion: nuevoAjuste.accion, // Agregar o Restar
        cantidad: nuevoAjuste.cantidad, // Cantidad ajustada
        nuevoStock: nuevoAjuste.nuevoStock,
        motivo: nuevoAjuste.motivo,
        notas: nuevoAjuste.notas,
        referencia: user.username, // Usuario actual
        creadoPor: user.name, // Nombre del usuario
        fecha: new Date().toISOString(),
      };

      const isEditing = !!editingAjuste;
      const url = isEditing
        ? `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ajustes/${editingAjuste.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ajustes`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ajusteData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(
          isEditing
            ? "Ajuste actualizado correctamente"
            : "Ajuste registrado correctamente",
        );

        // Actualización optimista del estado local de productos
        setProductos((prevProductos) =>
          prevProductos.map((p) => {
            if (
              p.codigoBarras === ajusteData.productoId ||
              p.id === ajusteData.productoId
            ) {
              const updatedStock = {
                ...p.stockBySucursal,
                [ajusteData.sucursalId]: ajusteData.nuevoStock,
              };

              // Si este es el producto que se está visualizando en detalle, actualizarlo también directamente
              // aunque el useEffect lo manejará, esto es inmediato
              if (
                productoDetalles &&
                (productoDetalles.id === p.id ||
                  productoDetalles.codigoBarras ===
                    p.codigoBarras)
              ) {
                setProductoDetalles({
                  ...productoDetalles,
                  stockBySucursal: updatedStock,
                });
              }

              return {
                ...p,
                stockBySucursal: updatedStock,
              };
            }
            return p;
          }),
        );

        setNuevoAjuste({
          productoSeleccionado: null,
          sucursalId: "",
          accion: "restar",
          cantidad: 0,
          nuevoStock: 0,
          motivo: "",
          notas: "",
          referencia: "Supervisor",
        });
        setSearchProducto("");
        setEditingAjuste(null);
        setSubMenuAjustes("historial-ajustes"); // Volver al historial después de guardar
        loadAjustes();
        loadData(); // Recargar productos para confirmar con el servidor
      } else {
        toast.error("Error al registrar el ajuste");
      }
    } catch (error) {
      console.error("Error guardando ajuste:", error);
      toast.error("Error al guardar el ajuste");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAjuste = async () => {
    if (!ajusteToDelete) return;

    if (!motivoEliminacionAjuste.trim()) {
      toast.error(
        "Debes proporcionar un motivo de eliminación",
      );
      return;
    }

    setDeletingAjuste(ajusteToDelete.id);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ajustes/${ajusteToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            motivo: motivoEliminacionAjuste,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Ajuste eliminado correctamente");
        setAjusteToDelete(null);
        setMotivoEliminacionAjuste("");
        loadAjustes();
        loadData(); // Recargar productos
      } else {
        toast.error(
          data.error || "Error al eliminar el ajuste",
        );
      }
    } catch (error) {
      console.error("Error eliminando ajuste:", error);
      toast.error("Error al eliminar el ajuste");
    } finally {
      setDeletingAjuste(null);
    }
  };

  const handleSaveProduct = async (updatedProduct: any) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos/${updatedProduct.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedProduct),
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Producto actualizado correctamente");

        // Update local state
        setProductos((prev) =>
          prev.map((p) =>
            p.id === updatedProduct.id ? data.producto : p,
          ),
        );

        // If viewing details of this product, update it too
        if (
          productoDetalles &&
          productoDetalles.id === updatedProduct.id
        ) {
          setProductoDetalles(data.producto);
        }

        setSelectedProductToEdit(null);
      } else {
        toast.error(
          "Error al actualizar producto: " +
            (data.error || "Desconocido"),
        );
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Error al actualizar producto");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async (motivo: string) => {
    if (!selectedProductToDelete) return;

    setLoading(true);
    try {
      // In a real scenario we would pass the reason to the backend to log it properly
      // For now the backend just deletes, but we updated it to log the deletion action.
      // We should ideally pass the 'motivo' in the body or headers, but the current DELETE implementation
      // in server only takes ID. However, the requirement was "ingrese los motivos".
      // The audit log in backend logs the deletion.
      // To strictly follow the requirement of logging the motive, I should update the backend DELETE
      // to accept a body (which some clients/servers don't support well) or use a POST/PUT for "soft delete"
      // or pass it as a query param.
      // Given the server code I wrote:
      /*
        const id = c.req.param("id");
        const producto = await kv.get(id);
        await kv.del(id);
        // Log...
      */
      // It doesn't use the motive. I should probably update the backend to take a query param `?motivo=...`
      // or similar if I want to log the specific motive entered by user.

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/productos/${selectedProductToDelete.id}?motivo=${encodeURIComponent(motivo)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Producto eliminado correctamente");
        setProductos((prev) =>
          prev.filter(
            (p) => p.id !== selectedProductToDelete.id,
          ),
        );
        setSelectedProductToDelete(null);
      } else {
        toast.error("Error al eliminar producto");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Error al eliminar producto");
    } finally {
      setLoading(false);
    }
  };

  // ========== Funciones para manejar ventas ==========
  const handleEditVenta = async (
    ventaId: string,
    updates: any,
  ) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ventas/${ventaId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(updates),
        },
      );

      if (response.ok) {
        toast.success("Venta actualizada correctamente");
        await loadData(); // Recargar datos
        setSelectedVentaToEdit(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al actualizar venta");
      }
    } catch (error) {
      console.error("Error updating venta:", error);
      toast.error("Error al actualizar venta");
    } finally {
      setLoading(false);
    }
  };

  const handleDevolucionVenta = async (
    ventaId: string,
    motivo: string,
  ) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ventas/${ventaId}/devolucion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ motivo }),
        },
      );

      if (response.ok) {
        toast.success("Devolución procesada correctamente");
        await loadData(); // Recargar datos
        setSelectedVentaDevolucion(null);
      } else {
        const error = await response.json();
        toast.error(
          error.error || "Error al procesar devolución",
        );
      }
    } catch (error) {
      console.error("Error processing devolucion:", error);
      toast.error("Error al procesar devolución");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVenta = async (ventaId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/ventas/${ventaId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );

      if (response.ok) {
        toast.success("Venta eliminada correctamente");
        setVentas((prev) =>
          prev.filter((v) => v.id !== ventaId),
        );
        setSelectedVentaToDelete(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al eliminar venta");
      }
    } catch (error) {
      console.error("Error deleting venta:", error);
      toast.error("Error al eliminar venta");
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Dashboard General
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-blue-600">
              {stats.totalProductos}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm">
            Total Productos
          </h3>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-2xl font-bold text-red-600">
              {stats.stockBajo}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm">Stock Bajo</h3>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-green-600">
              ${stats.totalVentas.toFixed(2)}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm">
            Ventas Totales
          </h3>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-purple-600">
              ${stats.ventasHoy.toFixed(2)}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm">Ventas Hoy</h3>
        </div>
      </div>

      {/* Últimos Movimientos */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Últimos Movimientos
          </h3>
        </div>

        {/* Pestañas */}
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            <button
              onClick={() =>
                setUltimosMovimientosPestana("ventas")
              }
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                ultimosMovimientosPestana === "ventas"
                  ? "border-green-600 text-green-600 bg-green-50"
                  : "border-transparent text-gray-600 hover:text-green-600 hover:border-green-300"
              }`}
            >
              <ShoppingCart className="w-4 h-4 inline mr-2" />
              Ventas
            </button>
            <button
              onClick={() =>
                setUltimosMovimientosPestana("cotizacion")
              }
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                ultimosMovimientosPestana === "cotizacion"
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-blue-600 hover:border-blue-300"
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Cotización
            </button>
            <button
              onClick={() =>
                setUltimosMovimientosPestana("compras")
              }
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                ultimosMovimientosPestana === "compras"
                  ? "border-purple-600 text-purple-600 bg-purple-50"
                  : "border-transparent text-gray-600 hover:text-purple-600 hover:border-purple-300"
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Compras
            </button>
            <button
              onClick={() =>
                setUltimosMovimientosPestana("traslados")
              }
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                ultimosMovimientosPestana === "traslados"
                  ? "border-orange-600 text-orange-600 bg-orange-50"
                  : "border-transparent text-gray-600 hover:text-orange-600 hover:border-orange-300"
              }`}
            >
              <ArrowLeftRight className="w-4 h-4 inline mr-2" />
              Traslados
            </button>
            <button
              onClick={() =>
                setUltimosMovimientosPestana("proveedores")
              }
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                ultimosMovimientosPestana === "proveedores"
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50"
                  : "border-transparent text-gray-600 hover:text-indigo-600 hover:border-indigo-300"
              }`}
            >
           <Truck className="w-4 h-4 inline mr-2" />
              Proveedores
            </button>
            <button
              onClick={() =>
                setUltimosMovimientosPestana("ajustes")
              }
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                ultimosMovimientosPestana === "ajustes"
                  ? "border-red-600 text-red-600 bg-red-50"
                  : "border-transparent text-gray-600 hover:text-red-600 hover:border-red-300"
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Ajustes
            </button>
          </div>
        </div>

        {/* Contenido de Pestañas */}
        <div className="overflow-x-auto">
          {ultimosMovimientosPestana === "ventas" && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Folio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sucursal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ventas
                  .filter(
                    (v) =>
                      selectedSucursal === "todas" ||
                      v.sucursalId === selectedSucursal,
                  )
                  .slice(0, 10)
                  .map((venta, index) => {
                    const sucursalVenta = SUCURSALES.find(
                      (s) => s.id === venta.sucursalId,
                    );
                    return (
                      <tr
                        key={index}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {venta.folio || venta.id?.slice(-8)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {venta.fecha
                            ? new Date(
                                venta.fecha,
                              ).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {sucursalVenta?.nombre || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {venta.usuario || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-600">
                          $
                          {parseFloat(venta.total || 0).toFixed(
                            2,
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              venta.estado === "completada"
                                ? "bg-green-100 text-green-800"
                                : venta.estado === "devuelta"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {venta.estado || "Completada"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          {ultimosMovimientosPestana === "cotizacion" && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Folio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sucursal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ventas
                  .filter(
                    (v) =>
                      (selectedSucursal === "todas" ||
                        v.sucursalId === selectedSucursal) &&
                      v.tipo === "cotizacion",
                  )
                  .slice(0, 10)
                  .map((cotizacion, index) => {
                    const sucursalCot = SUCURSALES.find(
                      (s) => s.id === cotizacion.sucursalId,
                    );
                    return (
                      <tr
                        key={index}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {cotizacion.folio ||
                            cotizacion.id?.slice(-8)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {cotizacion.fecha
                            ? new Date(
                                cotizacion.fecha,
                              ).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {sucursalCot?.nombre || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {cotizacion.cliente || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                          $
                          {parseFloat(
                            cotizacion.total || 0,
                          ).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                {ventas.filter(
                  (v) =>
                    (selectedSucursal === "todas" ||
                      v.sucursalId === selectedSucursal) &&
                    v.tipo === "cotizacion",
                ).length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No hay cotizaciones registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {ultimosMovimientosPestana === "compras" && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Precio Compra
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {compras
                  .filter(
                    (c) =>
                      selectedSucursal === "todas" ||
                      c.sucursalId === selectedSucursal,
                  )
                  .slice(0, 10)
                  .map((compra, index) => {
                    // Buscar el producto por ID o por código de barras (productoId)
                    const producto = productos.find(
                      (p) =>
                        p.id === compra.productoId ||
                        p.codigoBarras === compra.productoId,
                    );

                    // Usar nombreProducto si está disponible, sino buscar en productos
                    const nombreProducto =
                      compra.nombreProducto ||
                      producto?.nombre ||
                      "Producto no encontrado";

                    return (
                      <tr
                        key={index}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {compra.fecha
                            ? new Date(
                                compra.fecha,
                              ).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {nombreProducto}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {compra.cantidad}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          $
                          {parseFloat(
                            compra.precioCompra || 0,
                          ).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {compra.proveedor || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-purple-600">
                          $
                          {(
                            parseFloat(
                              compra.precioCompra || 0,
                            ) * parseFloat(compra.cantidad || 0)
                          ).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                {compras.filter(
                  (c) =>
                    selectedSucursal === "todas" ||
                    c.sucursalId === selectedSucursal,
                ).length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No hay compras registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {ultimosMovimientosPestana === "traslados" && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Productos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Origen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Destino
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {traslados
                  .filter((t) => {
                    // Usar campos correctos del backend (sucursalOrigenId y sucursalDestinoId)
                    const origen =
                      t.sucursalOrigenId || t.sucursalOrigen;
                    const destino =
                      t.sucursalDestinoId || t.sucursalDestino;
                    return (
                      selectedSucursal === "todas" ||
                      origen === selectedSucursal ||
                      destino === selectedSucursal
                    );
                  })
                  .sort((a, b) => {
                    // Ordenar por fecha descendente (más recientes primero)
                    const fechaA = new Date(
                      a.fecha || 0,
                    ).getTime();
                    const fechaB = new Date(
                      b.fecha || 0,
                    ).getTime();
                    return fechaB - fechaA;
                  })
                  .slice(0, 10)
                  .map((traslado, index) => {
                    // Usar campos correctos del backend
                    const origen =
                      traslado.sucursalOrigenId ||
                      traslado.sucursalOrigen;
                    const destino =
                      traslado.sucursalDestinoId ||
                      traslado.sucursalDestino;
                    const sucOrigen = SUCURSALES.find(
                      (s) => s.id === origen,
                    );
                    const sucDestino = SUCURSALES.find(
                      (s) => s.id === destino,
                    );
                    const cantidadProductos = Array.isArray(
                      traslado.productos,
                    )
                      ? traslado.productos.length
                      : 0;

                    // Calcular el total dinámicamente si no existe o es 0
                    let totalCalculado = parseFloat(
                      traslado.total || 0,
                    );

                    // Debug detallado para el primer traslado
                    if (index === 0) {
                      console.log(
                        "🔍 DEBUG Traslado completo:",
                        traslado,
                      );
                      console.log(
                        "🔍 Total original:",
                        traslado.total,
                      );
                      console.log(
                        "🔍 Productos:",
                        traslado.productos,
                      );
                    }

                    if (
                      totalCalculado === 0 &&
                      Array.isArray(traslado.productos) &&
                      traslado.productos.length > 0
                    ) {
                      totalCalculado =
                        traslado.productos.reduce(
                          (sum: number, item: any) => {
                            const cantidad = parseFloat(
                              item.cantidad || 0,
                            );
                            const precioUnitario = parseFloat(
                              item.precioUnitario || 0,
                            );
                            const subtotal =
                              cantidad * precioUnitario;

                            // Debug para cada producto
                            if (index === 0) {
                              console.log(
                                `🔍 Producto: ${item.productoNombre}, Cantidad: ${cantidad}, Precio: ${precioUnitario}, Subtotal: ${subtotal}`,
                              );
                            }

                            return sum + subtotal;
                          },
                          0,
                        );

                      if (index === 0) {
                        console.log(
                          "🔍 Total calculado dinámicamente:",
                          totalCalculado,
                        );
                      }
                    }

                    return (
                      <tr
                        key={index}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {traslado.fecha
                            ? new Date(
                                traslado.fecha,
                              ).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {traslado.descripcion ||
                            "Sin descripción"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {cantidadProductos}{" "}
                          {cantidadProductos === 1
                            ? "producto"
                            : "productos"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {sucOrigen?.nombre || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {sucDestino?.nombre || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-orange-600">
                          ${totalCalculado.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              traslado.estado === "completado"
                                ? "bg-green-100 text-green-800"
                                : traslado.estado === "aprobado"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {traslado.estado || "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                {traslados.filter((t) => {
                  const origen =
                    t.sucursalOrigenId || t.sucursalOrigen;
                  const destino =
                    t.sucursalDestinoId || t.sucursalDestino;
                  return (
                    selectedSucursal === "todas" ||
                    origen === selectedSucursal ||
                    destino === selectedSucursal
                  );
                }).length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No hay traslados registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {ultimosMovimientosPestana === "proveedores" && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    RFC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Productos
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {proveedores
                  .slice(0, 10)
                  .map((proveedor, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {proveedor.nombre}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {proveedor.empresa || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {proveedor.telefono || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {proveedor.email || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {proveedor.rfc || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs">
                          {proveedor.productosQueSurte?.split(
                            ",",
                          ).length || 0}{" "}
                          productos
                        </span>
                      </td>
                    </tr>
                  ))}
                {proveedores.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No hay proveedores registrados
                    </td>
                  </tr>
                )}
             </tbody>
            </table>
          )}

          {ultimosMovimientosPestana === "ajustes" && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sucursal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ajustes
                  .filter((a) => selectedSucursal === "todas" || a.sucursalId === selectedSucursal)
                  .slice(0, 10)
                  .map((ajuste, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {ajuste.fecha ? new Date(ajuste.fecha).toLocaleDateString("es-MX") : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {ajuste.nombreProducto || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {SUCURSALES.find((s) => s.id === ajuste.sucursalId)?.nombre || ajuste.sucursalId || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          ajuste.accion === "agregar"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {ajuste.accion === "agregar" ? "➕ Agregar" : "➖ Restar"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                        {ajuste.cantidad || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {ajuste.motivo?.replace(/_/g, " ") || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {ajuste.creadoPor || ajuste.referencia || "N/A"}
                      </td>
                    </tr>
                  ))}
                {ajustes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No hay ajustes registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Productos con Stock Bajo */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Productos con Stock Bajo (menos de 20 unidades)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Precio
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productos
                .filter((p) => getStock(p) < 20)
                .map((producto, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      {producto.codigoBarras}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {producto.nombre}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">
                        {getStock(producto)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      $
                      {parseFloat(
                        producto.precioVenta || 0,
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderReporteInventario = () => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <div>
<button
  onClick={() => setSubMenuReportes(null)}
  className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 block"
>
  ← Volver a reportes
</button>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-purple-600" />
            Reporte de Inventario
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Vista:{" "}
            {selectedSucursal === "todas"
              ? "Todas las Sucursales"
              : sucursal?.nombre}
          </p>
        </div>
        <button
          onClick={handleExportToExcel}
          className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Descargar Excel
        </button>
      </div>

      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            key="search-reporte"
            type="text"
            value={searchProducto}
            onChange={(e) => setSearchProducto(e.target.value)}
            placeholder="Buscar por código o nombre..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-800 text-white uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">
                Código
              </th>
              <th className="px-6 py-4 font-semibold">
                Producto
              </th>
              <th className="px-6 py-4 font-semibold text-right">
                Comprado
              </th>
              <th className="px-6 py-4 font-semibold text-right">
                Vendido
              </th>
              <th className="px-6 py-4 font-semibold text-right">
                Ganancia/Pérdida
              </th>
              <th className="px-6 py-4 font-semibold text-right">
                En Bodega
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {productos
              .filter((prod) => {
                const term = searchProducto.toLowerCase();
                return (
                  prod.nombre?.toLowerCase().includes(term) ||
                  prod.codigoBarras
                    ?.toLowerCase()
                    .includes(term)
                );
              })
              .map((prod) => {
                // Stock Actual (Bodega)
                const stock =
                  selectedSucursal === "todas"
                    ? Object.values(
                        prod.stockBySucursal || {},
                      ).reduce(
                        (a: any, b: any) =>
                          Number(a) + Number(b),
                        0,
                      )
                    : prod.stockBySucursal?.[
                        selectedSucursal
                      ] || 0;

                const costoActual =
                  parseFloat(prod.precioCompra) || 0;
                const precioVenta =
                  parseFloat(prod.precioVenta) || 0;

                // Ventas Registradas
                const relevantVentas =
                  selectedSucursal === "todas"
                    ? ventas
                    : ventas.filter(
                        (v) =>
                          v.sucursalId === selectedSucursal,
                      );

                let soldQty = 0;
                let soldVal = 0;

                relevantVentas.forEach((v) => {
                  const item = v.productos?.find(
                    (p: any) =>
                      p.productoId === prod.id ||
                      p.codigoBarras === prod.codigoBarras,
                  );
                  if (item) {
                    soldQty += item.cantidad || 0;
                    soldVal +=
                      (item.precio || precioVenta) *
                      (item.cantidad || 0);
                  }
                });

                // Compras Registradas (Histórico real)
                const relevantCompras =
                  selectedSucursal === "todas"
                    ? compras
                    : compras.filter(
                        (c) =>
                          c.sucursalId === selectedSucursal,
                      );

                let purchasedQtyReal = 0;
                let purchasedValReal = 0;

                relevantCompras.forEach((c) => {
                  if (
                    c.productoId === prod.codigoBarras ||
                    c.productoId === prod.id ||
                    c.nombreProducto === prod.nombre
                  ) {
                    purchasedQtyReal += Number(c.cantidad) || 0;
                    purchasedValReal +=
                      Number(c.total) ||
                      Number(c.cantidad) *
                        Number(c.precioCompra) ||
                      0;
                  }
                });

                // Ajustes Registrados (Histórico real)
                // Los ajustes pueden ser positivos (entrada) o negativos (salida/merma)
                // Ajuste.nuevoStock es el stock FINAL, no el delta. Necesitamos inferir el delta si es posible, o usar el motivo.
                // El backend de ajustes guarda: nuevoStock, motivo, notas. No guarda el delta directamente en el objeto principal a veces.
                // Asumiremos que para el "Comprado" (Entradas), nos interesan las compras + inventario inicial.

                // Cálculo de Flujo de Inventario para determinar "Comprado / Entradas Totales"
                // Entradas Totales (Teóricas) = Stock Actual + Ventas Totales - (Ajustes netos)
                // Como no tenemos el historial perfecto de ajustes delta, usaremos una aproximación híbrida.

                // Si las compras registradas son MENORES que (Stock + Vendido), significa que hubo Inventario Inicial no registrado como compra.
                // En ese caso, imputamos la diferencia como "Inventario Inicial" valorizado al costo actual.
                const stockMasVendido = Number(stock) + soldQty;

                let displayPurchasedQty = purchasedQtyReal;
                let displayPurchasedVal = purchasedValReal;

                if (stockMasVendido > purchasedQtyReal) {
                  const diffQty =
                    stockMasVendido - purchasedQtyReal;
                  displayPurchasedQty += diffQty;
                  displayPurchasedVal += diffQty * costoActual;
                }

                const stockVal = Number(stock) * costoActual;

                // Ganancia Bruta = Ventas - Costo de lo Vendido
                // Costo de lo Vendido = Cantidad Vendida * Costo Promedio (o Costo Actual si no hay promedio)
                const costOfGoodsSold = soldQty * costoActual;
                const profit = soldVal - costOfGoodsSold;

                return (
                  <tr
                    key={prod.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {prod.codigoBarras}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-semibold">
                      {prod.nombre}
                    </td>
                    <td className="px-6 py-4 text-sm text-right bg-gray-50">
                      <div className="font-bold text-gray-800">
                        $
                        {displayPurchasedVal.toLocaleString(
                          "es-MX",
                          { minimumFractionDigits: 2 },
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        ({displayPurchasedQty} pzas)
                      </div>
                      {purchasedQtyReal > 0 &&
                        purchasedQtyReal <
                          displayPurchasedQty && (
                          <span className="text-[10px] text-gray-400 block">
                            *Incl. Inv. Inicial
                          </span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="font-bold text-blue-600">
                        $
                        {soldVal.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        ({soldQty} pzas)
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right bg-gray-50">
                      <div
                        className={`font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        $
                        {profit.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="font-bold text-purple-600">
                        $
                        {stockVal.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        ({stock} pzas)
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderListaProductos = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-xl">
            Lista de Productos -{" "}
            {selectedSucursal === "todas"
              ? "Todas las Sucursales"
              : sucursal?.nombre}
          </h3>
          <div className="flex gap-2">
            {/* Solo Administrador y Gerente pueden agregar productos */}
            {selectedSucursal !== "todas" && isAdmin && (
              <button
                onClick={() => setShowAddProductModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar Producto
              </button>
            )}

            {selectedSucursal !== "todas" && isAdmin && (
  <button
    onClick={() => setSubMenuInventario("carga-masiva")}
    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
  >
    <Upload className="w-4 h-4" />
    Carga Masiva
  </button>
)}
            
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            key="search-productos"
            type="text"
            value={searchProducto}
            onChange={(e) => setSearchProducto(e.target.value)}
            placeholder="Buscar producto por nombre o código..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Precio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Existencia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Unidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Alerta Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {productos
              .filter((producto) => {
                const term = searchProducto.toLowerCase();
                return (
                  producto.nombre
                    ?.toLowerCase()
                    .includes(term) ||
                  producto.codigoBarras
                    ?.toLowerCase()
                    .includes(term)
                );
              })
              .map((producto, index) => {
                const stock = getStock(producto);
                const alertaStock = stock < 20;

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      {producto.codigoBarras}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {producto.nombre}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {producto.categoria ||
                        producto.grupo ||
                        "-"}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      $
                      {parseFloat(
                        producto.precioVenta || 0,
                      ).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          alertaStock
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {producto.presentacion || "PZA"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {alertaStock ? (
                        <span className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          Bajo
                        </span>
                      ) : (
                        <span className="text-green-600">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setProductoDetalles(producto)
                          }
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Solo Administrador y Gerente pueden editar productos */}
                        {isAdmin && (
                          <button
                            onClick={() =>
                              setSelectedProductToEdit(producto)
                            }
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setSelectedProductToPrint(producto)
                          }
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Imprimir"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Solo Administrador puede eliminar productos */}
                        {isAdmin ? (
                          <button
                            onClick={() =>
                              setSelectedProductToDelete(
                                producto,
                              )
                            }
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar Producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="p-2 text-gray-400 cursor-not-allowed rounded-lg opacity-50"
                            title="Eliminar (Solo Administrador)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderListaCompras = () => {
    return (
      <ComprasManagement
        selectedSucursal={selectedSucursal}
        isAdmin={isAdmin}
        compras={compras}
        productos={productos}
        loadCompras={loadCompras}
        loadData={loadData}
        onNavigateToAddCompra={(compra) => {
          if (compra) {
            setEditingCompra(compra);
          }
          setSubMenuCompras("agregar-individual");
        }}
        onNavigateToAddCompraMasiva={() => {
          setSubMenuCompras("agregar-masivo");
        }}
      />
    );
  };

   const renderAgregarCompraIndividual = () => (
  <AgregarCompraIndividual
    selectedSucursal={selectedSucursal}
    editingCompra={editingCompra}
    user={user}
    onBack={() => { setSubMenuCompras("lista-compras"); setEditingCompra(null); }}
    onSuccess={() => { loadCompras(); loadData(); }}
  />
);

  const renderAgregarCompraMasiva = () => (
    <ComprasMasivas
      selectedSucursal={selectedSucursal}
      sucursalNombre={sucursal?.nombre || ""}
      user={user}
      onBack={() => {
        setSubMenuCompras("lista-compras");
      }}
      onSuccess={() => {
        loadCompras();
        loadData();
      }}
    />
  );

  const renderListaTraslados = () => (
    <HistorialTraslados
      user={user!}
      selectedSucursal={selectedSucursal}
      refreshTrigger={trasladosRefreshTrigger}
      onNavigateToAddTraslado={() =>
        setSubMenuTraslados("agregar-traslado-individual")
      }
      onNavigateToAddTrasladoMasivo={() =>
        setSubMenuTraslados("agregar-traslado-masivo")
      }
    />
  );

  const renderAgregarTrasladoIndividual = () => (
    <AgregarTrasladoIndividual
      user={user!}
      selectedSucursal={selectedSucursal}
      onBack={() => setSubMenuTraslados("lista-traslados")}
      onSuccess={() => {
        setTrasladosRefreshTrigger((prev) => prev + 1);
        loadData();
      }}
    />
  );

  const renderAgregarTrasladoMasivo = () => (
    <TrasladosMasivos
      user={user!}
      selectedSucursal={selectedSucursal}
      sucursalNombre={sucursal?.nombre || ""}
      onBack={() => setSubMenuTraslados("lista-traslados")}
      onSuccess={() => {
        setTrasladosRefreshTrigger((prev) => prev + 1);
        loadData();
      }}
    />
  );

  // AJUSTES RENDERS
  const renderMenuAjustes = () => {
    if (subMenuAjustes === "nuevo-ajuste") {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <button
              onClick={() => {
                setSubMenuAjustes(null);
                setEditingAjuste(null);
              }}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-4"
            >
              ← Volver al menú de ajustes
            </button>
            <h3 className="font-bold text-xl">
              {editingAjuste
                ? "Editar Ajuste de Inventario"
                : "Nuevo Ajuste de Inventario"}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Producto *
              </label>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchProducto}
                  onChange={(e) =>
                    setSearchProducto(e.target.value)
                  }
                  placeholder="Buscar por nombre o código..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {searchProducto && (
                <div className="max-h-64 overflow-y-auto border rounded-lg mb-4">
                  {productos
                    .filter(
                      (p) =>
                        p.nombre
                          ?.toLowerCase()
                          .includes(
                            searchProducto.toLowerCase(),
                          ) ||
                        p.codigoBarras?.includes(
                          searchProducto,
                        ),
                    )
                    .map((producto, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setNuevoAjuste({
                            ...nuevoAjuste,
                            productoSeleccionado: producto,
                          });
                          setSearchProducto("");
                        }}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                      >
                        <p className="font-semibold text-sm">
                          {producto.nombre}
                        </p>
                        <p className="text-xs text-gray-500">
                          {producto.codigoBarras}
                        </p>
                      </div>
                    ))}
                </div>
              )}

              {nuevoAjuste.productoSeleccionado && (
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 mb-4">
                  <p className="font-semibold text-lg text-indigo-900">
                    {nuevoAjuste.productoSeleccionado.nombre}
                  </p>
                  <p className="text-sm text-gray-600">
                    Código:{" "}
                    {
                      nuevoAjuste.productoSeleccionado
                        .codigoBarras
                    }
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sucursal *
                </label>
                <select
                  value={nuevoAjuste.sucursalId}
                  onChange={(e) =>
                    setNuevoAjuste({
                      ...nuevoAjuste,
                      sucursalId: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                >
                  <option value="">
                    Seleccionar sucursal...
                  </option>
                  {SUCURSALES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {nuevoAjuste.productoSeleccionado &&
                nuevoAjuste.sucursalId && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Stock Actual en{" "}
                      {
                        SUCURSALES.find(
                          (s) =>
                            s.id === nuevoAjuste.sucursalId,
                        )?.nombre
                      }
                      :
                    </p>
                    <p className="text-2xl font-bold text-gray-800">
                      {nuevoAjuste.productoSeleccionado
                        .stockBySucursal?.[
                        nuevoAjuste.sucursalId
                      ] || 0}
                    </p>
                  </div>
                )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Acción *
                </label>
                <select
                  value={nuevoAjuste.accion}
                  onChange={(e) => {
                    const accion = e.target.value as
                      | "restar"
                      | "agregar";
                    const stockActual =
                      nuevoAjuste.productoSeleccionado
                        ?.stockBySucursal?.[
                        nuevoAjuste.sucursalId
                      ] || 0;
                    const cantidad = nuevoAjuste.cantidad;
                    const nuevoStock =
                      accion === "agregar"
                        ? stockActual + cantidad
                        : Math.max(0, stockActual - cantidad);
                    setNuevoAjuste({
                      ...nuevoAjuste,
                      accion,
                      nuevoStock,
                    });
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="restar">Restar</option>
                  <option value="agregar">Agregar</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad *
                </label>
                <input
                  type="number"
                  min="0"
                  value={nuevoAjuste.cantidad}
                  onChange={(e) => {
                    const cantidad =
                      parseInt(e.target.value) || 0;
                    const stockActual =
                      nuevoAjuste.productoSeleccionado
                        ?.stockBySucursal?.[
                        nuevoAjuste.sucursalId
                      ] || 0;
                    const nuevoStock =
                      nuevoAjuste.accion === "agregar"
                        ? stockActual + cantidad
                        : Math.max(0, stockActual - cantidad);
                    setNuevoAjuste({
                      ...nuevoAjuste,
                      cantidad,
                      nuevoStock,
                    });
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Cantidad a ajustar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuevo Stock (Calculado Automáticamente)
                </label>
                <input
                  type="number"
                  min="0"
                  value={nuevoAjuste.nuevoStock}
                  readOnly
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-700 font-bold"
                />
              </div>
            </div>

            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo del Ajuste *
                </label>
                <select
                  value={nuevoAjuste.motivo}
                  onChange={(e) =>
                    setNuevoAjuste({
                      ...nuevoAjuste,
                      motivo: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">
                    Seleccionar motivo...
                  </option>
                  <option value="inventario_fisico">
                    Inventario Físico (Corrección)
                  </option>
                  <option value="merma">Merma / Dañado</option>
                  <option value="caducidad">Caducidad</option>
                  <option value="entrada_extraordinaria">
                    Entrada Extraordinaria
                  </option>
                  <option value="salida_extraordinaria">
                    Salida Extraordinaria
                  </option>
                  <option value="error_sistema">
                    Corrección Error Sistema
                  </option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas / Observaciones
                </label>
                <textarea
                  value={nuevoAjuste.notas}
                  onChange={(e) =>
                    setNuevoAjuste({
                      ...nuevoAjuste,
                      notas: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none"
                  placeholder="Detalles adicionales sobre el ajuste..."
                />
              </div>

              <button
                onClick={handleGuardarAjuste}
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Settings className="w-5 h-5" />
                {loading
                  ? editingAjuste
                    ? "Actualizando..."
                    : "Guardando..."
                  : editingAjuste
                    ? "Actualizar Ajuste"
                    : "Confirmar Ajuste"}
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (subMenuAjustes === "ajuste-masivo") {
      return <AjusteMasivo
        selectedSucursal={selectedSucursal}
        onBack={() => setSubMenuAjustes(null)}
        onSuccess={() => { setSubMenuAjustes(null); loadProductos(); }}
      />;
    }
    if (subMenuAjustes === "inventario-fisico") {
      return <InventarioFisico
        selectedSucursal={selectedSucursal}
        user={user}
        onBack={() => setSubMenuAjustes(null)}
        onSuccess={() => { loadData(); }}
      />;
    }
    if (subMenuAjustes === "historial-ajustes") {
      return (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex justify-between items-center">
            <div>
              <button
                onClick={() => setSubMenuAjustes(null)}
                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-2"
              >
                ← Volver al menú de ajustes
              </button>
              <h3 className="font-bold text-xl">
                Historial Completo de Ajustes -{" "}
                {selectedSucursal === "todas"
                  ? "Todas las Sucursales"
                  : sucursal?.nombre}
              </h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sucursal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Motivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Creado por
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Usuario
                  </th>
                  {(user.role === "supervisor" ||
                    user.role === "gerente" ||
                    user.role === "administrador") && (
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ajustes
                  .filter((ajuste) =>
                    selectedSucursal === "todas"
                      ? true
                      : ajuste.sucursalId === selectedSucursal,
                  )
                  .map((ajuste, index) => (
                    <tr
                      key={ajuste.id || index}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm">
                        {new Date(
                          ajuste.fecha,
                        ).toLocaleDateString("es-MX", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                        <br />
                        <span className="text-gray-500 text-xs">
                          {new Date(
                            ajuste.fecha,
                          ).toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium">
                          {ajuste.nombreProducto}
                        </div>
                        {ajuste.accion && ajuste.cantidad && (
                          <div className="text-xs mt-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded ${
                                ajuste.accion === "agregar"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {ajuste.accion === "agregar"
                                ? "+"
                                : "-"}
                              {ajuste.cantidad}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {ajuste.sucursalNombre ||
                          SUCURSALES.find(
                            (s) => s.id === ajuste.sucursalId,
                          )?.nombre}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="capitalize">
                          {ajuste.motivo?.replace(/_/g, " ")}
                        </span>
                        {ajuste.notas && (
                          <p className="text-xs text-gray-500 mt-1">
                            {ajuste.notas}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {ajuste.creadoPor || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {ajuste.referencia || "N/A"}
                      </td>
                      {(user.role === "supervisor" ||
                        user.role === "gerente" ||
                        user.role === "administrador") && (
                        <td className="px-6 py-4 text-sm text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => {
                                setEditingAjuste(ajuste);
                                setSubMenuAjustes(
                                  "nuevo-ajuste",
                                );
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                              title="Editar ajuste"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {(user.role === "gerente" ||
                              user.role ===
                                "administrador") && (
                              <button
                                onClick={() =>
                                  setAjusteToDelete(ajuste)
                                }
                                disabled={
                                  deletingAjuste === ajuste.id
                                }
                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                                title="Eliminar ajuste"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Gestión de Ajustes de Inventario
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => setSubMenuAjustes("nuevo-ajuste")}
            className="bg-white p-8 rounded-xl shadow hover:shadow-lg transition-all border-l-4 border-red-500 flex flex-col items-center text-center group"
          >
            <div className="bg-red-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Nuevo Ajuste
            </h3>
            <p className="text-gray-600">
              Registrar corrección de stock, mermas o
              entradas/salidas manuales.
            </p>
          </button>

          <button
            onClick={() =>
              setSubMenuAjustes("historial-ajustes")
            }
            className="bg-white p-8 rounded-xl shadow hover:shadow-lg transition-all border-l-4 border-gray-500 flex flex-col items-center text-center group"
          >
            <div className="bg-gray-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <ClipboardList className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Historial de Ajustes
            </h3>
            <p className="text-gray-600">
              Consultar bitácora de movimientos manuales de inventario.
            </p>
          </button>
          <button
            onClick={() => setSubMenuAjustes("inventario-fisico")}
            className="bg-white p-8 rounded-xl shadow hover:shadow-lg transition-all border-l-4 border-teal-500 flex flex-col items-center text-center group md:col-span-2"
          >
            <div className="bg-teal-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Inventario Físico
            </h3>
            <p className="text-gray-600">
              Conteo físico masivo con captura y ajuste automático de diferencias por sucursal.
            </p>
          </button>
          <button
            onClick={() => setSubMenuAjustes("ajuste-masivo")}
            className="bg-white p-8 rounded-xl shadow hover:shadow-lg transition-all border-l-4 border-orange-500 flex flex-col items-center text-center group md:col-span-2"
          >
            <div className="bg-orange-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Ajuste Masivo
            </h3>
            <p className="text-gray-600">
              Cargar correcciones de stock de múltiples productos desde Excel.
            </p>
          </button>
        </div>
      </div>
    );
  };

  // PERSONAL RENDERS
  const renderMenuPersonalSection = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Gestión de Personal
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => setSubMenuPersonal("lista-medicos")}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left border-t-4 border-blue-500"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Stethoscope className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-blue-600">
              {medicos.length}
            </span>
          </div>
          <h3 className="font-bold text-lg mb-1">Médicos</h3>
          <p className="text-sm text-gray-500">
            Gestionar plantilla médica
          </p>
        </button>

        <button
          onClick={() =>
            setSubMenuPersonal("lista-farmaceuticos")
          }
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left border-t-4 border-green-500"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-green-600">
              {farmaceuticos.length}
            </span>
          </div>
          <h3 className="font-bold text-lg mb-1">
            Farmacéuticos
          </h3>
          <p className="text-sm text-gray-500">
            Gestionar personal de farmacia
          </p>
        </button>

        <button
          onClick={() =>
            setSubMenuPersonal("lista-proveedores")
          }
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left border-t-4 border-purple-500"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-purple-600">
              {proveedores.length}
            </span>
          </div>
          <h3 className="font-bold text-lg mb-1">
            Proveedores
          </h3>
          <p className="text-sm text-gray-500">
            Directorio de proveedores
          </p>
        </button>

        <button
          onClick={() =>
            setSubMenuPersonal("asignacion-turnos")
          }
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left border-t-4 border-orange-500 md:col-span-2"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="font-bold text-lg mb-1">
            Asignación de Turnos y Sucursales
          </h3>
          <p className="text-sm text-gray-500">
            Gestionar rotación de personal y asignaciones
            diarias
          </p>
        </button>

        <button
          onClick={() =>
            setSubMenuPersonal("historico-medicos")
          }
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left border-t-4 border-gray-500"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="bg-gray-100 p-3 rounded-lg">
              <Archive className="w-6 h-6 text-gray-600" />
            </div>
          </div>
          <h3 className="font-bold text-lg mb-1">
            Histórico de Médicos
          </h3>
          <p className="text-sm text-gray-500">
            Ver médicos desactivados y su historial
          </p>
        </button>
      </div>
    </div>
  );

  const renderListaMedicosSection = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex justify-between items-center flex-wrap gap-3">
        <div>
          <button
            onClick={() => setSubMenuPersonal(null)}
            className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-2"
          >
            ← Volver a personal
          </button>
          <h3 className="font-bold text-xl">
            Directorio de Médicos
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {medicos.length} médico(s) registrado(s)
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Filtro por sucursal */}
          <select
            value={selectedSucursal}
            onChange={(e) =>
              setSelectedSucursal(e.target.value)
            }
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todas las sucursales</option>
            {SUCURSALES.map((suc) => (
              <option key={suc.id} value={suc.id}>
                {suc.nombre}
              </option>
            ))}
          </select>

          {isAdmin && (
            <button
              onClick={() => setShowClearMedicosModal(true)}
              className="border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 flex items-center gap-2 text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Limpiar Directorio
            </button>
          )}
          <button
            onClick={() => setSubMenuPersonal("agregar-medico")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Agregar Médico
          </button>
        </div>
      </div>

      {/* Modal de confirmación para limpiar directorio */}
      {showClearMedicosModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  Limpiar Directorio de Médicos
                </h3>
                <p className="text-sm text-gray-500">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800 font-medium mb-2">
                ⚠️ Se eliminarán permanentemente:
              </p>
              <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                <li>
                  Todos los médicos registrados (
                  {medicos.length} en total)
                </li>
                <li>Médicos genéricos de demostración</li>
                <li>Médicos editados o personalizados</li>
                <li>Histórico de médicos desactivados</li>
              </ul>
              <p className="text-sm text-amber-800 font-semibold mt-3">
                El directorio quedará completamente vacío y
                listo para nuevos registros.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearMedicosModal(false)}
                disabled={clearingMedicos}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAllMedicos}
                disabled={clearingMedicos}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4" />
                {clearingMedicos
                  ? "Limpiando..."
                  : "Sí, Limpiar Todo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {medicos.length === 0 ? (
        <div className="py-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Stethoscope className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium text-lg">
            Directorio vacío
          </p>
          <p className="text-gray-400 text-sm mt-1">
            No hay médicos registrados. Usa el botón "Agregar
            Médico" para comenzar.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Especialidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cédula
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sucursal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Escuela
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {medicos
                .filter((m) =>
                  selectedSucursal === "todas"
                    ? true
                    : m.sucursalId === selectedSucursal,
                )
                .sort((a, b) => {
                  // Ordenar: activos primero, luego inactivos
                  if (a.activo !== false && b.activo === false)
                    return -1;
                  if (a.activo === false && b.activo !== false)
                    return 1;
                  return 0;
                })
                .map((medico, index) => (
                  <tr
                    key={index}
                    className={`hover:bg-gray-50 ${medico.activo === false ? "bg-gray-100 opacity-60" : ""}`}
                  >
                    <td className="px-6 py-4 text-sm font-medium">
                      {medico.name || medico.nombre}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {medico.especialidad || "General"}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono">
                      {medico.cedula || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {medico.sucursalId
                        ? SUCURSALES.find(
                            (s) => s.id === medico.sucursalId,
                          )?.nombre || "N/A"
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {medico.escuela || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {medico.email || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={medico.activo !== false}
                            onChange={() =>
                              handleToggleMedicoActivo(medico)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                        <span
                          className={`text-xs font-medium ${medico.activo !== false ? "text-green-600" : "text-gray-400"}`}
                        >
                          {medico.activo !== false
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setSelectedUserToEdit(medico)
                          }
                          className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                          title="Editar médico"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() =>
                              handleDeleteUser(
                                medico.id,
                                "medico",
                              )
                            }
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                            title="Eliminar permanentemente (solo Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderHistoricoMedicosSection = () => {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <button
              onClick={() => setSubMenuPersonal(null)}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-2"
            >
              ← Volver a personal
            </button>
            <h3 className="font-bold text-xl">
              Histórico de Médicos Desactivados
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Consulta y recetas archivadas de médicos inactivos
            </p>
          </div>
        </div>

        {historicoDetalle ? (
          // Vista de detalle de un histórico específico
          <div className="p-6">
            <button
              onClick={() => setHistoricoDetalle(null)}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-4"
            >
              ← Volver a lista de históricos
            </button>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-xl font-bold text-gray-800">
                    {historicoDetalle.medicoInfo.nombre}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Cédula: {historicoDetalle.medicoInfo.cedula}
                  </p>
                  <p className="text-sm text-gray-600">
                    Especialidad:{" "}
                    {historicoDetalle.medicoInfo.especialidad ||
                      "General"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">
                    Desactivado:
                  </span>
                  <p className="text-sm font-semibold text-gray-700">
                    {new Date(
                      historicoDetalle.fechaDesactivacion,
                    ).toLocaleDateString("es-MX", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-100 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {historicoDetalle.totalConsultas}
                  </p>
                  <p className="text-sm text-blue-800">
                    Consultas Archivadas
                  </p>
                </div>
                <div className="bg-purple-100 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {historicoDetalle.totalRecetas}
                  </p>
                  <p className="text-sm text-purple-800">
                    Recetas Archivadas
                  </p>
                </div>
              </div>
            </div>

            {/* Mostrar consultas */}
            {historicoDetalle.consultas &&
              historicoDetalle.consultas.length > 0 && (
                <div className="mb-6">
                  <h5 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Consultas Archivadas (
                    {historicoDetalle.consultas.length})
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Paciente
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Servicio
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Fecha
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Monto
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {historicoDetalle.consultas.map(
                          (consulta: any, idx: number) => (
                            <tr
                              key={idx}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-3 text-sm">
                                {consulta.nombrePaciente}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {consulta.servicio}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {new Date(
                                  consulta.fecha,
                                ).toLocaleDateString("es-MX")}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold">
                                ${consulta.monto.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    consulta.estado ===
                                    "atendida"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {consulta.estado}
                                </span>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Mostrar recetas */}
            {historicoDetalle.recetas &&
              historicoDetalle.recetas.length > 0 && (
                <div>
                  <h5 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Recetas Archivadas (
                    {historicoDetalle.recetas.length})
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Paciente
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Fecha
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Diagnóstico
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Medicamentos
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {historicoDetalle.recetas.map(
                          (receta: any, idx: number) => (
                            <tr
                              key={idx}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-3 text-sm">
                                {receta.nombrePaciente}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {new Date(
                                  receta.fecha,
                                ).toLocaleDateString("es-MX")}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {receta.diagnostico || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {receta.medicamentos?.length ||
                                  0}{" "}
                                medicamentos
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
          </div>
        ) : (
          // Lista de históricos
          <div className="p-6">
            {historicoMedicos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Archive className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">
                  No hay médicos desactivados
                </p>
                <p className="text-sm mt-1">
                  El histórico aparecerá cuando se desactive un
                  médico
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {historicoMedicos.map(
                  (historico: any, index: number) => (
                    <div
                      key={index}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() =>
                        setHistoricoDetalle(historico)
                      }
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-gray-800">
                            {historico.medicoInfo.nombre}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Cédula:{" "}
                            {historico.medicoInfo.cedula}
                          </p>
                          <p className="text-xs text-gray-500">
                            {historico.medicoInfo
                              .especialidad || "General"}
                          </p>
                        </div>
                        <Archive className="w-5 h-5 text-gray-400" />
                      </div>

                      <div className="text-xs text-gray-600 mb-3">
                        <span className="font-medium">
                          Desactivado:
                        </span>
                        <br />
                        {new Date(
                          historico.fechaDesactivacion,
                        ).toLocaleDateString("es-MX", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1 bg-blue-50 rounded px-2 py-1">
                          <p className="text-xs text-blue-600 font-semibold">
                            {historico.totalConsultas}
                          </p>
                          <p className="text-xs text-blue-800">
                            Consultas
                          </p>
                        </div>
                        <div className="flex-1 bg-purple-50 rounded px-2 py-1">
                          <p className="text-xs text-purple-600 font-semibold">
                            {historico.totalRecetas}
                          </p>
                          <p className="text-xs text-purple-800">
                            Recetas
                          </p>
                        </div>
                      </div>

                     <div className="flex gap-2 mt-3">
                        <button 
                          className="flex-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          onClick={(e) => { e.stopPropagation(); setHistoricoDetalle(historico); }}
                        >
                          Ver Detalles →
                        </button>
                        {historico._id && (
                          <button
                            className="flex-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 font-medium px-2 py-1 rounded"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm("¿Reactivar este médico?")) return;
                              const { error } = await supabase.from("perfiles").update({ activo: true }).eq("id", historico._id);
                              if (!error) { toast.success("Médico reactivado"); loadMedicos(); loadHistoricoMedicos(); }
                              else toast.error("Error al reactivar");
                            }}
                          >
                            ✓ Reactivar
                          </button>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAgregarMedicoSection = () => (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
      <button
        onClick={() => setSubMenuPersonal("lista-medicos")}
        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-6"
      >
        ← Volver a lista
      </button>
      <h3 className="font-bold text-xl mb-6">
        Registrar Nuevo Médico
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre Completo *
          </label>
          <input
            type="text"
            value={nuevoMedico.nombre}
            onChange={(e) =>
              setNuevoMedico({
                ...nuevoMedico,
                nombre: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Especialidad *
          </label>
          <input
            type="text"
            value={nuevoMedico.especialidad}
            onChange={(e) =>
              setNuevoMedico({
                ...nuevoMedico,
                especialidad: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cédula Profesional *
          </label>
          <input
            type="text"
            value={nuevoMedico.cedula}
            onChange={(e) =>
              setNuevoMedico({
                ...nuevoMedico,
                cedula: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={nuevoMedico.email}
            onChange={(e) =>
              setNuevoMedico({
                ...nuevoMedico,
                email: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Usuario (login)
            <span className="text-xs text-gray-500 block mt-1">
              Se genera automáticamente si se deja vacío
            </span>
          </label>
          <input
            type="text"
            value={nuevoMedico.username}
            onChange={(e) =>
              setNuevoMedico({
                ...nuevoMedico,
                username: e.target.value,
              })
            }
            placeholder="Ej: dr.martinez (opcional)"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contraseña
            <span className="text-xs text-gray-500 block mt-1">
              Default: 123 (si se deja vacío)
            </span>
          </label>
          <input
            type="text"
            value={nuevoMedico.password}
            onChange={(e) =>
              setNuevoMedico({
                ...nuevoMedico,
                password: e.target.value,
              })
            }
            placeholder="123"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sucursal Base
          </label>
          <select
            value={nuevoMedico.sucursalId}
            onChange={(e) =>
              setNuevoMedico({
                ...nuevoMedico,
                sucursalId: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Sin asignar</option>
            {SUCURSALES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Escuela/Universidad
          </label>
          <input
            type="text"
            value={nuevoMedico.escuela}
            onChange={(e) =>
              setNuevoMedico({
                ...nuevoMedico,
                escuela: e.target.value,
              })
            }
            placeholder="Nombre de la institución"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logotipo de Escuela
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  const formData = new FormData();
                  formData.append("file", file);

                  const fileExt = file.name.split('.').pop()
                  const fileName = `logo_${Date.now()}.${fileExt}`
                  const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('make-7d799f19-medicos')
                    .upload(fileName, file, { upsert: true })
                  if (uploadError) throw new Error(uploadError.message)
                  const { data: urlData } = supabase.storage.from('make-7d799f19-medicos').getPublicUrl(fileName)
                  const result = { publicUrl: urlData.publicUrl }
                  if (result.publicUrl) {
                    setNuevoMedico({
                      ...nuevoMedico,
                      logoEscuela: result.publicUrl,
                    })
                  // Actualizar en Supabase si el médico ya existe
                  if (nuevoMedico.id) {
                    await supabase.from("perfiles").update({ logo_universidad: result.publicUrl }).eq("id", nuevoMedico.id)
                  };
                    toast.success("Logo cargado correctamente");
                  }
                } catch (error: any) {
                  console.error("Error al cargar logo:", error);
                  toast.error(
                    error.message || "Error al cargar el logo",
                  );
                }
              }
            }}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {nuevoMedico.logoEscuela && (
            <div className="mt-2">
              <img
                src={nuevoMedico.logoEscuela}
                alt="Logo"
                className="h-16 w-auto object-contain"
              />
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Horario
          </label>
          <input
            type="text"
            value={nuevoMedico.horario}
            onChange={(e) =>
              setNuevoMedico({
                ...nuevoMedico,
                horario: e.target.value,
              })
            }
            placeholder="Ej. Lunes a Viernes 9:00 - 18:00"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        onClick={handleGuardarMedico}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        {loading ? "Guardando..." : "Guardar Médico"}
      </button>
    </div>
  );

  const renderListaProveedoresSection = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex justify-between items-center">
        <div>
          <button
            onClick={() => setSubMenuPersonal(null)}
            className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-2"
          >
            ← Volver a personal
          </button>
          <h3 className="font-bold text-xl">
            Directorio de Proveedores
          </h3>
        </div>
        <button
          onClick={() =>
            setSubMenuPersonal("agregar-proveedor")
          }
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar Proveedor
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Empresa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Contacto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Productos
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {proveedores.map((prov, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium">
                  {prov.empresa}
                </td>
                <td className="px-6 py-4 text-sm">
                  {prov.nombre}
                </td>
                <td className="px-6 py-4 text-sm">
                  {prov.telefono}
                </td>
                <td className="px-6 py-4 text-sm">
                  {prov.email}
                </td>
                <td className="px-6 py-4 text-sm">
                  {prov.productosQueSurte}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAgregarProveedorSection = () => (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
      <button
        onClick={() => setSubMenuPersonal("lista-proveedores")}
        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-6"
      >
        ← Volver a lista
      </button>
      <h3 className="font-bold text-xl mb-6">
        Registrar Nuevo Proveedor
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de la Empresa *
          </label>
          <input
            type="text"
            value={nuevoProveedor.empresa}
            onChange={(e) =>
              setNuevoProveedor({
                ...nuevoProveedor,
                empresa: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de Contacto *
          </label>
          <input
            type="text"
            value={nuevoProveedor.nombre}
            onChange={(e) =>
              setNuevoProveedor({
                ...nuevoProveedor,
                nombre: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono *
          </label>
          <input
            type="tel"
            value={nuevoProveedor.telefono}
            onChange={(e) =>
              setNuevoProveedor({
                ...nuevoProveedor,
                telefono: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={nuevoProveedor.email}
            onChange={(e) =>
              setNuevoProveedor({
                ...nuevoProveedor,
                email: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            RFC
          </label>
          <input
            type="text"
            value={nuevoProveedor.rfc}
            onChange={(e) =>
              setNuevoProveedor({
                ...nuevoProveedor,
                rfc: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dirección
          </label>
          <input
            type="text"
            value={nuevoProveedor.direccion}
            onChange={(e) =>
              setNuevoProveedor({
                ...nuevoProveedor,
                direccion: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Productos que surte
          </label>
          <textarea
            value={nuevoProveedor.productosQueSurte}
            onChange={(e) =>
              setNuevoProveedor({
                ...nuevoProveedor,
                productosQueSurte: e.target.value,
              })
            }
            placeholder="Ej. Medicamentos genéricos, Material de curación..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-24"
          />
        </div>
      </div>

      <button
        onClick={handleGuardarProveedor}
        disabled={loading}
        className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        {loading ? "Guardando..." : "Guardar Proveedor"}
      </button>
    </div>
  );

  const renderListaFarmaceuticosSection = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex justify-between items-center">
        <div>
          <button
            onClick={() => setSubMenuPersonal(null)}
            className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-2"
          >
            ← Volver a personal
          </button>
          <h3 className="font-bold text-xl">
            Personal de Farmacia
          </h3>
        </div>
        <div className="flex gap-2 items-center">
          {/* Filtro por sucursal */}
          <select
            value={selectedSucursal}
            onChange={(e) =>
              setSelectedSucursal(e.target.value)
            }
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todas las sucursales</option>
            {SUCURSALES.map((suc) => (
              <option key={suc.id} value={suc.id}>
                {suc.nombre}
              </option>
            ))}
          </select>

          <button
            onClick={() =>
              setSubMenuPersonal("agregar-farmaceutico")
            }
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Agregar Farmacéutico
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID Empleado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Sucursal Base
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Turno
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {farmaceuticos
              .filter((f) =>
                selectedSucursal === "todas"
                  ? true
                  : f.sucursalId === selectedSucursal,
              )
              .map((farm, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">
                    {farm.name || farm.nombre}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono">
                    {farm.cedula || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {SUCURSALES.find(
                      (s) => s.id === farm.sucursalId,
                    )?.nombre || "Sin asignar"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {farm.turno}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {farm.username || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setSelectedUserToEdit(farm)
                        }
                        className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                        title="Editar farmacéutico"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() =>
                            handleDeleteUser(
                              farm.id,
                              "farmaceutico",
                            )
                          }
                          className="text-red-600 hover:bg-red-50 p-1 rounded"
                          title="Eliminar permanentemente (solo Admin)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAgregarFarmaceuticoSection = () => (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
      <button
        onClick={() =>
          setSubMenuPersonal("lista-farmaceuticos")
        }
        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-6"
      >
        ← Volver a lista
      </button>
      <h3 className="font-bold text-xl mb-6">
        Registrar Nuevo Farmacéutico
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre Completo *
          </label>
          <input
            type="text"
            value={nuevoFarmaceutico.nombre}
            onChange={(e) =>
              setNuevoFarmaceutico({
                ...nuevoFarmaceutico,
                nombre: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ID Empleado *
          </label>
          <input
            type="text"
            value={nuevoFarmaceutico.cedula}
            onChange={(e) =>
              setNuevoFarmaceutico({
                ...nuevoFarmaceutico,
                cedula: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Turno *
          </label>
          <select
            value={nuevoFarmaceutico.turno}
            onChange={(e) =>
              setNuevoFarmaceutico({
                ...nuevoFarmaceutico,
                turno: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">Seleccionar...</option>
            <option value="Matutino">Matutino</option>
            <option value="Vespertino">Vespertino</option>
            <option value="Completo">Completo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Usuario (login)
            <span className="text-xs text-gray-500 block mt-1">
              Se genera automáticamente si se deja vacío
            </span>
          </label>
          <input
            type="text"
            value={nuevoFarmaceutico.username}
            onChange={(e) =>
              setNuevoFarmaceutico({
                ...nuevoFarmaceutico,
                username: e.target.value,
              })
            }
            placeholder="Ej: farm.garcia (opcional)"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contraseña
            <span className="text-xs text-gray-500 block mt-1">
              Default: 123 (si se deja vacío)
            </span>
          </label>
          <input
            type="text"
            value={nuevoFarmaceutico.password}
            onChange={(e) =>
              setNuevoFarmaceutico({
                ...nuevoFarmaceutico,
                password: e.target.value,
              })
            }
            placeholder="123"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sucursal Base
          </label>
          <select
            value={nuevoFarmaceutico.sucursalId}
            onChange={(e) =>
              setNuevoFarmaceutico({
                ...nuevoFarmaceutico,
                sucursalId: e.target.value,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="todas">
              Sin asignar / Rotativo
            </option>
            {SUCURSALES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleGuardarFarmaceutico}
        disabled={loading}
        className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        {loading ? "Guardando..." : "Guardar Farmacéutico"}
      </button>
    </div>
  );

  // REPORTES RENDERS
  const renderMenuReportes = () => {
    const reportes = [
      {
        id: "mensual",
        nombre: "Reporte Mensual",
        icono: Calendar,
      },
      {
        id: "inventario",
        nombre: "Reporte Inventario",
        icono: Package,
      },
      {
        id: "productos-top",
        nombre: "Reporte Productos TOP",
        icono: TrendingUp,
      },
      {
        id: "cortes",
        nombre: "Reporte de Cortes",
        icono: DollarSign,
      },
      {
        id: "stock-bajo",
        nombre: "Productos Stock Bajo",
        icono: AlertTriangle,
      },
      {
        id: "caducidades",
        nombre: "Reporte de Caducidades",
        icono: Calendar,
      },
      {
        id: "comprado-vs-vendido",
        nombre: "Comprado Vs Vendido",
        icono: BarChart3,
      },
      {
        id: "traspasos",
        nombre: "Reporte Traspasos",
        icono: ArrowLeftRight,
      },
      {
        id: "categorias",
        nombre: "Reporte por Categorías",
        icono: Package,
      },
      {
        id: "ventas",
        nombre: "Reporte Ventas",
        icono: TrendingUp,
      },
      {
        id: "antibioticos",
        nombre: "Libro de Antibióticos",
        icono: FileText,
      },
      {
        id: "balance-general",
        nombre: "Balance General",
        icono: DollarSign,
      },
      {
        id: "compras",
        nombre: "Reporte de Compras",
        icono: ShoppingCart,
      },
      {
        id: "gastos",
        nombre: "Reporte de Gastos",
        icono: Receipt,
      },
      {
        id: "proveedores",
        nombre: "Reporte de Proveedores",
        icono: Truck,
      },
      {
        id: "personal",
        nombre: "Reporte de Personal",
        icono: Users,
      },
      {
        id: "pacientes",
        nombre: "Reporte de Pacientes",
        icono: Stethoscope,
      },
      {
        id: "movimientos",
        nombre: "Movimientos por Producto",
        icono: Package,
      },
      {
        id: "servicios-medicos",
        nombre: "Reporte de Servicios Médicos",
        icono: ClipboardList,
      },
    ];

    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Reportes del Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportes.map((reporte) => {
            const Icono = reporte.icono;
            return (
              <button
                key={reporte.id}
                onClick={() =>
                  setSubMenuReportes(reporte.id as any)
                }
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <Icono className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold">
                    {reporte.nombre}
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  Ver reporte detallado
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderReporteStockBajo = () => {
    const productosStockBajo = productos.filter((p) => {
      if (selectedSucursal === "todas") {
        // Para "todas", verificar si alguna sucursal tiene stock bajo
        return Object.values(p.stockBySucursal || {}).some(
          (stock: any) => stock < 20,
        );
      }
      return (p.stockBySucursal?.[selectedSucursal] || 0) < 20;
    });

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <button
              onClick={() => setSubMenuReportes(null)}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-2"
            >
              ← Volver a reportes
            </button>
            <h3 className="font-bold text-xl">
              Reporte de Productos con Stock Bajo
            </h3>
            <p className="text-sm text-gray-600">
              {selectedSucursal === "todas"
                ? "Todas las Sucursales"
                : sucursal?.nombre}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const registros: any[] = [];
                antibioticosSucursal.forEach((registro) => {
                  registro.antibioticos?.forEach((ab: any) => {
                    registros.push({ fecha: registro.fecha, ...ab });
                  });
                });
                const ws = XLSX.utils.json_to_sheet(registros.map((r) => ({
                  Fecha: new Date(r.fecha).toLocaleDateString("es-MX"),
                  Cantidad: r.cantidad,
                  Medicamento: r.nombre,
                  "Inv. Actual": r.stockActual,
                  Médico: r.medico?.nombre || "Sin nombre",
                  Cédula: r.medico?.cedula || "-",
                  Dirección: r.medico?.direccion || "-",
                  "Código Control": r.codigoControl || "-",
                  Observaciones: r.observaciones || "-",
                })));
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Antibióticos");
                XLSX.writeFile(wb, `Libro_Antibioticos_${new Date().toISOString().split("T")[0]}.xlsx`);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
            <button
              onClick={() => {
                const registros: any[] = [];
                antibioticosSucursal.forEach((registro) => {
                  registro.antibioticos?.forEach((ab: any) => {
                    registros.push({ fecha: registro.fecha, ...ab });
                  });
                });
                const printWindow = window.open("", "_blank", "width=900,height=700");
                if (!printWindow) return;
                const filas = registros.map((r) => `
                  <tr>
                    <td>${new Date(r.fecha).toLocaleDateString("es-MX")}</td>
                    <td>${r.cantidad}</td>
                    <td>${r.nombre}</td>
                    <td>${r.stockActual}</td>
                    <td>${r.medico?.nombre || "Sin nombre"}</td>
                    <td>${r.medico?.cedula || "-"}</td>
                    <td>${r.medico?.direccion || "-"}</td>
                    <td>${r.codigoControl || "-"}</td>
                    <td>${r.observaciones || "-"}</td>
                  </tr>`).join("");
                printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Libro de Antibióticos</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
  h2 { color: #1d4ed8; text-align: center; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1d4ed8; color: white; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
  tr:nth-child(even) { background: #f9fafb; }
  @media print { body { padding: 10px; } }
</style></head>
<body>
<h2>Libro de Antibióticos — ${selectedSucursal === "todas" ? "Todas las Sucursales" : sucursal?.nombre}</h2>
<p style="text-align:center;color:#6b7280;margin-bottom:12px;">Generado: ${new Date().toLocaleDateString("es-MX")}</p>
<table>
  <thead>
    <tr>
      <th>Fecha</th><th>Cantidad</th><th>Medicamento</th><th>Inv. Actual</th>
      <th>Médico</th><th>Cédula</th><th>Dirección</th><th>Código Control</th><th>Observaciones</th>
    </tr>
  </thead>
  <tbody>${filas}</tbody>
</table>
<script>window.onload=function(){window.print();setTimeout(()=>window.close(),500);}<\/script>
</body></html>`);
                printWindow.document.close();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stock Actual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productosStockBajo.map((producto, index) => {
                const stock =
                  selectedSucursal === "todas"
                    ? Object.values(
                        producto.stockBySucursal || {},
                      ).reduce(
                        (a: any, b: any) =>
                          Number(a) + Number(b),
                        0,
                      )
                    : producto.stockBySucursal?.[
                        selectedSucursal
                      ] || 0;
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      {producto.codigoBarras}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {producto.nombre}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {producto.grupo || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">
                        {stock} unidades
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      $
                      {parseFloat(
                        producto.precioVenta || 0,
                      ).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-red-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        Crítico
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-6 border-t bg-gray-50">
          <p className="font-semibold">
            Total de productos con stock bajo:{" "}
            {productosStockBajo.length}
          </p>
        </div>
      </div>
    );
  };

  const renderReporteMensual = () => {
    const ventasSucursal = ventas.filter((v) =>
      selectedSucursal === "todas"
        ? true
        : v.sucursalId === selectedSucursal,
    );
    const totalVentas = ventasSucursal.reduce(
      (sum, v) => sum + (v.total || 0),
      0,
    );
    const comprasSucursal = compras.filter((c) =>
      selectedSucursal === "todas"
        ? true
        : c.sucursalId === selectedSucursal,
    );
    const totalCompras = comprasSucursal.reduce(
      (sum, c) => sum + (c.total || 0),
      0,
    );
    const utilidad = totalVentas - totalCompras;

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <button
              onClick={() => setSubMenuReportes(null)}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-2"
            >
              ← Volver a reportes
            </button>
            <h3 className="font-bold text-xl">
              Reporte Mensual
            </h3>
            <p className="text-sm text-gray-600">
              {selectedSucursal === "todas"
                ? "Todas las Sucursales"
                : sucursal?.nombre}
            </p>
          </div>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">
                Total Ventas
              </p>
              <p className="text-2xl font-bold text-green-600">
                ${totalVentas.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {ventasSucursal.length} transacciones
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-gray-600 mb-1">
                Total Compras
              </p>
              <p className="text-2xl font-bold text-red-600">
                ${totalCompras.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {comprasSucursal.length} compras
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">
                Utilidad Estimada
              </p>
              <p className="text-2xl font-bold text-blue-600">
                ${utilidad.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Ventas - Compras
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReporteAntibioticos = () => {
    // Filtrar antibióticos por sucursal
    const antibioticosSucursal = antibioticos.filter((a) =>
      selectedSucursal === "todas"
        ? true
        : a.sucursalId === selectedSucursal,
    );

    // Aplanar la estructura para mostrar cada antibiótico individual
    const registros: any[] = [];
    antibioticosSucursal.forEach((registro) => {
      registro.antibioticos?.forEach((ab: any) => {
        registros.push({
          fecha: registro.fecha,
          ...ab,
        });
      });
    });

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <button
              onClick={() => setSubMenuReportes(null)}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-2"
            >
              ← Volver a reportes
            </button>
            <h3 className="font-bold text-xl">
              Libro de Antibióticos
            </h3>
            <p className="text-sm text-gray-600">
              {selectedSucursal === "todas"
                ? "Todas las Sucursales"
                : sucursal?.nombre}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {registros.length} registros encontrados
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const ws = XLSX.utils.json_to_sheet(registros.map((r) => ({
                  Fecha: new Date(r.fecha).toLocaleDateString("es-MX"),
                  Cantidad: r.cantidad,
                  Medicamento: r.nombre,
                  "Inv. Actual": r.stockActual,
                  Médico: r.medico?.nombre || "Sin nombre",
                  Cédula: r.medico?.cedula || "-",
                  Dirección: r.medico?.direccion || "-",
                  "Código Control": r.codigoControl || "-",
                  Observaciones: r.observaciones || "-",
                })));
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Antibióticos");
                XLSX.writeFile(wb, `Libro_Antibioticos_${new Date().toISOString().split("T")[0]}.xlsx`);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
            <button
              onClick={() => {
                const printWindow = window.open("", "_blank", "width=900,height=700");
                if (!printWindow) return;
                const filas = registros.map((r) => `
                  <tr>
                    <td>${new Date(r.fecha).toLocaleDateString("es-MX")}</td>
                    <td>${r.cantidad}</td>
                    <td>${r.nombre}</td>
                    <td>${r.stockActual}</td>
                    <td>${r.medico?.nombre || "Sin nombre"}</td>
                    <td>${r.medico?.cedula || "-"}</td>
                    <td>${r.medico?.direccion || "-"}</td>
                    <td>${r.codigoControl || "-"}</td>
                    <td>${r.observaciones || "-"}</td>
                  </tr>`).join("");
                printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Libro de Antibióticos</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
  h2 { color: #1d4ed8; text-align: center; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1d4ed8; color: white; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
  tr:nth-child(even) { background: #f9fafb; }
  @media print { body { padding: 10px; } }
</style></head>
<body>
<h2>Libro de Antibióticos — ${selectedSucursal === "todas" ? "Todas las Sucursales" : sucursal?.nombre}</h2>
<p style="text-align:center;color:#6b7280;margin-bottom:12px;">Generado: ${new Date().toLocaleDateString("es-MX")}</p>
<table>
  <thead>
    <tr>
      <th>Fecha</th><th>Cantidad</th><th>Medicamento</th><th>Inv. Actual</th>
      <th>Médico</th><th>Cédula</th><th>Dirección</th><th>Código Control</th><th>Observaciones</th>
    </tr>
  </thead>
  <tbody>${filas}</tbody>
</table>
<script>window.onload=function(){window.print();setTimeout(()=>window.close(),500);}<\/script>
</body></html>`);
                printWindow.document.close();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cantidad
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Medicamento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Inv. Actual
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Médico
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cédula
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Dirección
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Código Control
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Observaciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {registros.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No se encontraron registros de antibi��ticos
                    para esta sucursal
                  </td>
                </tr>
              ) : (
                registros.map((registro, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(
                        registro.fecha,
                      ).toLocaleDateString("es-MX", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {registro.cantidad}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {registro.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          registro.stockActual > 10
                            ? "bg-green-100 text-green-800"
                            : registro.stockActual > 0
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {registro.stockActual}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {registro.medico?.nombre || <span className="text-gray-400 italic">Sin nombre</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {registro.medico?.cedula || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {registro.medico?.direccion || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {registro.codigoControl ? (
                        <span className="font-mono bg-indigo-50 px-2 py-1 rounded text-indigo-700">
                          {registro.codigoControl}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {registro.observaciones || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderListaVentas = () => {
    const ventasFiltradas = ventas
      .filter((v) =>
        selectedSucursal === "todas"
          ? true
          : v.sucursalId === selectedSucursal,
      )
      .filter((v) => {
        const term = searchVenta.toLowerCase();
        return (
          v.id?.toLowerCase().includes(term) ||
          v.usuario?.toLowerCase().includes(term) ||
          v.vendedor?.toLowerCase().includes(term) ||
          v.sucursalId?.toLowerCase().includes(term)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.fecha).getTime() -
          new Date(a.fecha).getTime(),
      );

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-xl">
              Ventas -{" "}
              {selectedSucursal === "todas"
                ? "Todas las Sucursales"
                : SUCURSALES.find(
                    (s) => s.id === selectedSucursal,
                  )?.nombre}
            </h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchVenta}
              onChange={(e) => setSearchVenta(e.target.value)}
              placeholder="Buscar venta por ID, vendedor o sucursal..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Referencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sucursal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ventasFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No se encontraron ventas
                  </td>
                </tr>
              ) : (
                ventasFiltradas.map((venta, index) => {
                  // Generar un ID único para el dropdown
                  const dropdownId = `dropdown-${venta.id || index}`;

                  return (
                    <tr
                      key={venta.id || `venta-${index}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm">
                        {new Date(
                          venta.fecha,
                        ).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <p className="font-medium">
                            {venta.usuario ||
                              venta.vendedor ||
                              "N/A"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {venta.id}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm capitalize">
                        {venta.sucursalId}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {venta.estado === "devuelto" ? (
                          <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                            Devuelto
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                            Completado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                        ${venta.total?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="relative flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(
                                openDropdownId === dropdownId
                                  ? null
                                  : dropdownId,
                              );
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Acciones"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          {/* Dropdown Menu */}
                          {openDropdownId === dropdownId && (
                            <>
                              {/* Overlay para cerrar el dropdown */}
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() =>
                                  setOpenDropdownId(null)
                                }
                              />

                              {/* Menu desplegable */}
                              <div className="absolute right-0 top-10 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[220px]">
                                {/* Ver Detalles */}
                                <button
                                  onClick={() => {
                                    setSelectedVentaDetalles(
                                      venta,
                                    );
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center gap-3 text-sm transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-blue-600" />
                                  <span className="text-gray-700">
                                    Ver Detalles
                                  </span>
                                </button>

                                {/* Forma de Pago */}
                                <button
                                  onClick={() => {
                                    setSelectedVentaPago(venta);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left hover:bg-purple-50 flex items-center gap-3 text-sm transition-colors"
                                >
                                  <CreditCard className="w-4 h-4 text-purple-600" />
                                  <span className="text-gray-700">
                                    Forma de Pago
                                  </span>
                                </button>

                                {/* Ver Recibo */}
                                <button
                                  onClick={() => {
                                    setSelectedVentaRecibo(
                                      venta,
                                    );
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 flex items-center gap-3 text-sm transition-colors"
                                >
                                  <Receipt className="w-4 h-4 text-indigo-600" />
                                  <span className="text-gray-700">
                                    Ver Recibo
                                  </span>
                                </button>

                                {/* Descargar PDF */}
                                <button
                                  onClick={() => {
                                    setSelectedVentaRecibo(
                                      venta,
                                    );
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left hover:bg-green-50 flex items-center gap-3 text-sm transition-colors"
                                >
                                  <Download className="w-4 h-4 text-green-600" />
                                  <span className="text-gray-700">
                                    Descargar PDF
                                  </span>
                                </button>

                                {/* Divisor solo si es Admin */}
                                {isAdmin && (
                                  <div className="border-t border-gray-200 my-2" />
                                )}

                                {/* Acciones solo para Admin */}
                                {isAdmin && (
                                  <>
                                    {/* Editar Venta */}
                                    <button
                                      onClick={() => {
                                        setSelectedVentaToEdit(
                                          venta,
                                        );
                                        setOpenDropdownId(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left hover:bg-orange-50 flex items-center gap-3 text-sm transition-colors"
                                    >
                                      <Edit className="w-4 h-4 text-orange-600" />
                                      <span className="text-gray-700">
                                        Editar Venta
                                      </span>
                                    </button>

                                    {/* Procesar Devolución */}
                                    {venta.estado !==
                                      "devuelto" && (
                                      <button
                                        onClick={() => {
                                          setSelectedVentaDevolucion(
                                            venta,
                                          );
                                          setOpenDropdownId(
                                            null,
                                          );
                                        }}
                                        className="w-full px-4 py-2.5 text-left hover:bg-amber-50 flex items-center gap-3 text-sm transition-colors"
                                      >
                                        <ArrowLeftRight className="w-4 h-4 text-amber-600" />
                                        <span className="text-gray-700">
                                          Procesar Devolución
                                        </span>
                                      </button>
                                    )}

                                    {/* Eliminar Venta */}
                                    <button
                                      onClick={() => {
                                        setSelectedVentaToDelete(
                                          venta,
                                        );
                                        setOpenDropdownId(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left hover:bg-red-50 flex items-center gap-3 text-sm transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                      <span className="text-gray-700">
                                        Eliminar Venta
                                      </span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación y Stats */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Total de ventas:{" "}
              <span className="font-semibold">
                {ventasFiltradas.length}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Total general:{" "}
              <span className="font-semibold text-green-600">
                $
                {ventasFiltradas
                  .reduce((sum, v) => sum + (v.total || 0), 0)
                  .toFixed(2)}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderPlaceholder = (titulo: string) => (
    <div className="bg-white rounded-lg shadow p-12">
      <div className="text-center">
        <button
          onClick={() => {
            setSubMenuReportes(null);
            setSubMenuPersonal(null);
          }}
          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-4 mx-auto"
        >
          ← Volver
        </button>
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {titulo}
        </h3>
        <p className="text-gray-600">
          Esta funcionalidad estará disponible próximamente
        </p>
      </div>
    </div>
  );

  const renderContenido = () => {
    // Permission Checks
    if (
      menuActivo === "dashboard" &&
      !hasPermission("ver_dashboard")
    )
      return (
        <div className="p-8 text-center text-red-600 font-bold">
          Acceso Denegado
        </div>
      );
    if (
      menuActivo === "inventario" &&
      !hasPermission("ver_inventario")
    )
      return (
        <div className="p-8 text-center text-red-600 font-bold">
          Acceso Denegado
        </div>
      );
    if (
      menuActivo === "compras" &&
      !hasPermission("realizar_compras") && !hasPermission("compras")
    )
      return (
        <div className="p-8 text-center text-red-600 font-bold">
          Acceso Denegado
        </div>
      );
    if (
      menuActivo === "traslados" &&
      !hasPermission("realizar_traslados")
    )
      return (
        <div className="p-8 text-center text-red-600 font-bold">
          Acceso Denegado
        </div>
      );
    if (
      menuActivo === "ventas" &&
      !hasPermission("ver_reportes") &&
      !hasPermission("realizar_ventas")
    )
      return (
        <div className="p-8 text-center text-red-600 font-bold">
          Acceso Denegado
        </div>
      );
    if (
      menuActivo === "ajustes" &&
      !hasPermission("realizar_ajustes")
    )
      return (
        <div className="p-8 text-center text-red-600 font-bold">
          Acceso Denegado
        </div>
      );
    if (
      menuActivo === "personal" &&
      !hasPermission("gestionar_personal")
    )
      return (
        <div className="p-8 text-center text-red-600 font-bold">
          Acceso Denegado
        </div>
      );
    if (
      menuActivo === "reportes" &&
      !hasPermission("ver_reportes")
    )
      return (
        <div className="p-8 text-center text-red-600 font-bold">
          Acceso Denegado
        </div>
      );

    if (menuActivo === "dashboard") return renderDashboard();

   if (menuActivo === "inventario") {
  if (subMenuInventario === "lista-productos")
    return renderListaProductos();
  if (subMenuInventario === "carga-masiva")
    return (
      <InventarioMasivo
        selectedSucursal={selectedSucursal}
        sucursalNombre={sucursal?.nombre || ""}
        onBack={() => setSubMenuInventario("lista-productos")}
        onSuccess={() => loadData()}
      />
    );
  setSubMenuInventario("lista-productos");
  return renderListaProductos();
}

    if (menuActivo === "compras") {
      if (subMenuCompras === "lista-compras")
        return renderListaCompras();
      if (subMenuCompras === "agregar-individual")
        return renderAgregarCompraIndividual();
      if (subMenuCompras === "agregar-masivo")
        return renderAgregarCompraMasiva();
      setSubMenuCompras("lista-compras");
      return renderListaCompras();
    }

    if (menuActivo === "traslados") {
      if (subMenuTraslados === "lista-traslados")
        return renderListaTraslados();
      if (subMenuTraslados === "agregar-traslado-individual")
        return renderAgregarTrasladoIndividual();
      if (subMenuTraslados === "agregar-traslado-masivo")
        return renderAgregarTrasladoMasivo();
      setSubMenuTraslados("lista-traslados");
      return renderListaTraslados();
    }

    if (menuActivo === "gastos") {
      if (subMenuGastos === "agregar-gasto") {
        return (
          <AgregarGasto
            user={user!}
            selectedSucursal={selectedSucursal}
            onGastoCreated={() => {
              setGastosRefreshTrigger((prev) => prev + 1);
              setSubMenuGastos("lista-gastos");
            }}
          />
        );
      }
      if (subMenuGastos === "lista-gastos") {
        return (
          <HistorialGastos
            user={user!}
            selectedSucursal={selectedSucursal}
            refreshTrigger={gastosRefreshTrigger}
            onNavigateToAddGasto={() =>
              setSubMenuGastos("agregar-gasto")
            }
          />
        );
      }
      setSubMenuGastos("lista-gastos");
      return (
        <HistorialGastos
          user={user!}
          selectedSucursal={selectedSucursal}
          refreshTrigger={gastosRefreshTrigger}
          onNavigateToAddGasto={() =>
            setSubMenuGastos("agregar-gasto")
          }
        />
      );
    }
    if (menuActivo === "ventas") {
      if (subMenuVentas === "lista-ventas")
        return renderListaVentas();
      setSubMenuVentas("lista-ventas");
      return renderListaVentas();
    }

    if (menuActivo === "ajustes") {
      return renderMenuAjustes();
    }

    if (menuActivo === "personal") {
      if (!subMenuPersonal) return renderMenuPersonalSection();
      if (subMenuPersonal === "asignacion-turnos")
        return (
          <div>
            <button
              onClick={() => setSubMenuPersonal(null)}
              className="mb-4 text-indigo-600 hover:text-indigo-800 flex items-center gap-2"
            >
              ← Volver al Menú
            </button>
            <StaffManagement currentUser={user!} />
          </div>
        );
      if (subMenuPersonal === "lista-medicos")
        return renderListaMedicosSection();
      if (subMenuPersonal === "agregar-medico")
        return renderAgregarMedicoSection();
      if (subMenuPersonal === "historico-medicos")
        return renderHistoricoMedicosSection();
      if (subMenuPersonal === "lista-proveedores")
        return renderListaProveedoresSection();
      if (subMenuPersonal === "agregar-proveedor")
        return renderAgregarProveedorSection();
      if (subMenuPersonal === "lista-farmaceuticos")
        return renderListaFarmaceuticosSection();
      if (subMenuPersonal === "agregar-farmaceutico")
        return renderAgregarFarmaceuticoSection();

      return renderMenuPersonalSection();
    }

    if (menuActivo === "reportes") {
      if (!subMenuReportes) return renderMenuReportes();
      if (subMenuReportes === "stock-bajo")
        return renderReporteStockBajo();
      if (subMenuReportes === "mensual")
        return (
          <ReporteMensual
            sucursalId={selectedSucursal}
            todasLasSucursales={selectedSucursal === "todas"}
            onVolver={() => setSubMenuReportes(null)}
          />
        );
      if (subMenuReportes === "antibioticos")
        return renderReporteAntibioticos();
      if (subMenuReportes === "inventario")
        return renderReporteInventario();
      if (subMenuReportes === "cortes")
        return (
          <ReporteCortes
            selectedSucursal={selectedSucursal}
            onBack={() => setSubMenuReportes(null)}
          />
        );
      if (subMenuReportes === "productos-top")
        return (
          <ReportesRouter
            reporte="productos-top"
            sucursalId={selectedSucursal}
            onVolver={() => setSubMenuReportes(null)}
          />
        );
      if (subMenuReportes === "caducidades")
        return (
          <ReportesRouter
            reporte="caducidades"
            sucursalId={selectedSucursal}
            onVolver={() => setSubMenuReportes(null)}
          />
        );
      if (subMenuReportes === "comprado-vs-vendido")
        return (
          <ReportesRouter
            reporte="comprado-vs-vendido"
            sucursalId={selectedSucursal}
            onVolver={() => setSubMenuReportes(null)}
          />
        );
      if (subMenuReportes === "traspasos")
        return (
          <ReportesRouter
            reporte="traspasos"
            sucursalId={selectedSucursal}
            onVolver={() => setSubMenuReportes(null)}
          />
        );
      if (subMenuReportes === "categorias")
        return (
          <ReportesRouter
            reporte="categorias"
            sucursalId={selectedSucursal}
            onVolver={() => setSubMenuReportes(null)}
          />
        );
      if (subMenuReportes === "ventas")
        return (
          <ReportesRouter
            reporte="ventas"
            sucursalId={selectedSucursal}
            onVolver={() => setSubMenuReportes(null)}
          />
        );
      if (subMenuReportes === "balance-general")
        return (
          <ReportesRouter
            reporte="balance-general"
            sucursalId={selectedSucursal}
            onVolver={() => setSubMenuReportes(null)}
          />
        );
      if (subMenuReportes === "compras") 
        return (
          <ReporteCompras 
            sucursalId={selectedSucursal} 
            todasLasSucursales={selectedSucursal === "todas"} 
            onVolver={() => setSubMenuReportes(null)}
            />
        );
      
      if (subMenuReportes === "gastos") 
        return (
          <ReporteGastos sucursalId={selectedSucursal} 
            todasLasSucursales={selectedSucursal === "todas"} 
            onVolver={() => setSubMenuReportes(null)} 
            />
          );
      
      if (subMenuReportes === "proveedores") 
        return (
          <ReporteProveedores sucursalId={selectedSucursal} 
            todasLasSucursales={selectedSucursal === "todas"} 
            onVolver={() => setSubMenuReportes(null)} 
            />
          );
      
      if (subMenuReportes === "personal") 
        return (
          <ReportePersonal sucursalId={selectedSucursal} 
            todasLasSucursales={selectedSucursal === "todas"} 
            onVolver={() => setSubMenuReportes(null)} 
            />
          );

      if (subMenuReportes === "pacientes")
        return (
          <ReportePacientes
            sucursalId={selectedSucursal}
            todasLasSucursales={selectedSucursal === "todas"}
            onVolver={() => setSubMenuReportes(null)}
          />
        );

      if (subMenuReportes === "movimientos")
        return (
          <ReporteMovimientos
            sucursalId={selectedSucursal}
            todasLasSucursales={selectedSucursal === "todas"}
            onVolver={() => setSubMenuReportes(null)}
          />
        );

      if (subMenuReportes === "servicios-medicos")
        return (
          <ReporteServicios
            sucursalId={selectedSucursal}
            todasLasSucursales={selectedSucursal === "todas"}
            onVolver={() => setSubMenuReportes(null)}
          />
        );
      
      return renderMenuReportes();
    }

    if (menuActivo === "cajas") {
      return <CajasConfig />;
    }

    if (menuActivo === "servicios") {
      return (
        <ServiciosMedicosView
          selectedSucursal={selectedSucursal}
        />
      );
    }

    return renderDashboard();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                Call Center - Panel Supervisor
              </h1>
              <p className="text-sm opacity-90">
                {user?.name} | Gestión y Administración
              </p>
            </div>

            {/* Selector de Sucursal Dropdown */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() =>
                    setShowSucursalDropdown(
                      !showSucursalDropdown,
                    )
                  }
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                >
                  <Building className="w-5 h-5" />
                  <span className="font-medium">
                    {selectedSucursal === "todas"
                      ? "Todas las Sucursales"
                      : sucursal?.nombre}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showSucursalDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-50 py-2">
                    <button
                      onClick={() => {
                        setSelectedSucursal("todas");
                        setShowSucursalDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                        selectedSucursal === "todas"
                          ? "bg-indigo-50 text-indigo-600"
                          : "text-gray-700"
                      }`}
                    >
                      <Building className="w-4 h-4" />
                      <span className="font-medium">
                        Todas las Sucursales
                      </span>
                      {selectedSucursal === "todas" && (
                        <span className="ml-auto text-indigo-600">
                          ✓
                        </span>
                      )}
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    {SUCURSALES.map((suc) => (
                      <button
                        key={suc.id}
                        onClick={() => {
                          setSelectedSucursal(suc.id);
                          setShowSucursalDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                          selectedSucursal === suc.id
                            ? "bg-indigo-50 text-indigo-600"
                            : "text-gray-700"
                        }`}
                      >
                        <Building className="w-4 h-4" />
                        <span className="font-medium">
                          {suc.nombre}
                        </span>
                        {selectedSucursal === suc.id && (
                          <span className="ml-auto text-indigo-600">
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
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
        </div>

        {/* Menú de Navegación */}
        <div className="bg-white/10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-1 overflow-x-auto">
              {hasPermission("ver_dashboard") && (
                <button
                  onClick={() => handleMenuClick("dashboard")}
                  className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors border-b-2 ${
                    menuActivo === "dashboard"
                      ? "border-white text-white"
                      : "border-transparent text-white/70 hover:text-white hover:border-white/50"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
              )}

              {hasPermission("ver_inventario") && (
                <button
                  onClick={() => {
                    handleMenuClick("inventario");
                    setSubMenuInventario("lista-productos");
                  }}
                  className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors border-b-2 ${
                    menuActivo === "inventario"
                      ? "border-white text-white"
                      : "border-transparent text-white/70 hover:text-white hover:border-white/50"
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Inventario
                </button>
              )}

              {hasPermission("realizar_compras") && (
                <button
                  onClick={() => {
                    handleMenuClick("compras");
                    setSubMenuCompras("lista-compras");
                  }}
                  className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors border-b-2 ${
                    menuActivo === "compras"
                      ? "border-white text-white"
                      : "border-transparent text-white/70 hover:text-white hover:border-white/50"
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Compras
                </button>
              )}

              {hasPermission("realizar_traslados") && (
                <button
                  onClick={() => {
                    handleMenuClick("traslados");
                    setSubMenuTraslados("lista-traslados");
                  }}
                  className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors border-b-2 ${
                    menuActivo === "traslados"
                      ? "border-white text-white"
                      : "border-transparent text-white/70 hover:text-white hover:border-white/50"
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Traslados
                </button>
              )}

              {hasPermission("ver_dashboard") && (
                <button
                  onClick={() => {
                    handleMenuClick("gastos");
                    setSubMenuGastos("lista-gastos");
                  }}
                  className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors border-b-2 ${
                    menuActivo === "gastos"
                      ? "border-white text-white"
                      : "border-transparent text-white/70 hover:text-white hover:border-white/50"
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  Gastos
                </button>
              )}

              {(hasPermission("ver_reportes") ||
                hasPermission("realizar_ventas")) && (
                <button
                  onClick={() => handleMenuClick("ventas")}
                  className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors border-b-2 ${
                    menuActivo === "ventas"
                      ? "border-white text-white"
                      : "border-transparent text-white/70 hover:text-white hover:border-white/50"
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Ventas
                </button>
              )}

              {hasPermission("realizar_ajustes") && (
                <button
                  onClick={() => handleMenuClick("ajustes")}
                  className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors border-b-2 ${
                    menuActivo === "ajustes"
                      ? "border-white text-white"
                      : "border-transparent text-white/70 hover:text-white hover:border-white/50"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Ajustes
                </button>
              )}

              {hasPermission("gestionar_personal") && (
                <button
                  onClick={() => {
                    handleMenuClick("personal");
                    setSubMenuPersonal(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors border-b-2 ${
                    menuActivo === "personal"
                      ? "border-white text-white"
                      : "border-transparent text-white/70 hover:text-white hover:border-white/50"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Personal
                </button>
              )}

              {hasPermission("ver_reportes") && (
                <button
                  onClick={() => handleMenuClick("reportes")}
                  className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors border-b-2 ${
                    menuActivo === "reportes"
                      ? "border-white text-white"
                      : "border-transparent text-white/70 hover:text-white hover:border-white/50"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Reportes
                </button>
              )}

              <button
                onClick={() => handleMenuClick("servicios")}
                className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors border-b-2 ${
                  menuActivo === "servicios"
                    ? "border-white text-white"
                    : "border-transparent text-white/70 hover:text-white hover:border-white/50"
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                Servicios Méd.
              </button>

              <button
                onClick={() => handleMenuClick("cajas")}
                className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors border-b-2 ${
                  menuActivo === "cajas"
                    ? "border-white text-white"
                    : "border-transparent text-white/70 hover:text-white hover:border-white/50"
                }`}
              >
                <Monitor className="w-4 h-4" />
                Cajas
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto p-6">
        {renderContenido()}
      </div>

      {/* Modal Editar Producto */}
      {selectedProductToPrint && (
        <PrintLabelModal
          product={selectedProductToPrint}
          onClose={() => setSelectedProductToPrint(null)}
        />
      )}

      {selectedProductToDelete && (
        <DeleteProductModal
          product={selectedProductToDelete}
          onClose={() => setSelectedProductToDelete(null)}
          onConfirm={handleConfirmDelete}
          isDeleting={loading}
        />
      )}

      {selectedProductToEdit && (
        <EditProductModal
          product={selectedProductToEdit}
          onClose={() => setSelectedProductToEdit(null)}
          onSave={handleSaveProduct}
          isLoading={loading}
        />
      )}

      {/* Modal Agregar Producto */}
      {showAddProductModal && (
        <AddProductModal
          sucursalId={selectedSucursal}
          onClose={() => setShowAddProductModal(false)}
          onSuccess={() => {
            fetchProductos();
            setShowAddProductModal(false);
          }}
        />
      )}

      {/* Modal de Detalles del Producto */}
      {productoDetalles && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-2xl">
              <div className="p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">
                    {productoDetalles.nombre}
                  </h2>
                  <p className="text-sm opacity-90 mt-1">
                    Código: {productoDetalles.codigoBarras}
                  </p>
                </div>
                <div className="flex gap-2">
                  {/* Solo Administrador y Gerente pueden editar productos */}
                  {(user?.role === "admin" ||
                    user?.role === "gerente") && (
                    <button
                      onClick={() => {
                        setProductoDetalles(null); // Cerrar detalles
                        setSelectedProductToEdit(
                          productoDetalles,
                        ); // Abrir editor
                      }}
                      className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setProductoDetalles(null);
                      setPestanaDetalles("detalle");
                    }}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Pestañas de Navegación */}
              <div className="flex overflow-x-auto border-t border-white/20">
                <button
                  onClick={() => setPestanaDetalles("detalle")}
                  className={`flex items-center gap-2 px-6 py-3 whitespace-nowrap transition-all border-b-2 ${
                    pestanaDetalles === "detalle"
                      ? "border-white bg-white/10"
                      : "border-transparent hover:bg-white/5"
                  }`}
                >
                  <Info className="w-4 h-4" />
                  Detalle del Producto
                </button>
                <button
                  onClick={() => setPestanaDetalles("grafica")}
                  className={`flex items-center gap-2 px-6 py-3 whitespace-nowrap transition-all border-b-2 ${
                    pestanaDetalles === "grafica"
                      ? "border-white bg-white/10"
                      : "border-transparent hover:bg-white/5"
                  }`}
                >
                  <LineChart className="w-4 h-4" />
                  Gráfica
                </button>
                <button
                  onClick={() => setPestanaDetalles("ventas")}
                  className={`flex items-center gap-2 px-6 py-3 whitespace-nowrap transition-all border-b-2 ${
                    pestanaDetalles === "ventas"
                      ? "border-white bg-white/10"
                      : "border-transparent hover:bg-white/5"
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Ventas
                </button>
                <button
                  onClick={() =>
                    setPestanaDetalles("cotizacion")
                  }
                  className={`flex items-center gap-2 px-6 py-3 whitespace-nowrap transition-all border-b-2 ${
                    pestanaDetalles === "cotizacion"
                      ? "border-white bg-white/10"
                      : "border-transparent hover:bg-white/5"
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Cotización
                </button>
                <button
                  onClick={() => setPestanaDetalles("compras")}
                  className={`flex items-center gap-2 px-6 py-3 whitespace-nowrap transition-all border-b-2 ${
                    pestanaDetalles === "compras"
                      ? "border-white bg-white/10"
                      : "border-transparent hover:bg-white/5"
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  Compras
                </button>
                <button
                  onClick={() =>
                    setPestanaDetalles("traslados")
                  }
                  className={`flex items-center gap-2 px-6 py-3 whitespace-nowrap transition-all border-b-2 ${
                    pestanaDetalles === "traslados"
                      ? "border-white bg-white/10"
                      : "border-transparent hover:bg-white/5"
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Traslados
                </button>
                <button
                  onClick={() => setPestanaDetalles("ajustes")}
                  className={`flex items-center gap-2 px-6 py-3 whitespace-nowrap transition-all border-b-2 ${
                    pestanaDetalles === "ajustes"
                      ? "border-white bg-white/10"
                      : "border-transparent hover:bg-white/5"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Ajustes de Cantidad
                </button>
              {(isAdmin || user.role === "gerente" || user.role === "administrador") && (
                  <button
                    onClick={() => setPestanaDetalles("auditoria")}
                    className={`flex items-center gap-2 px-6 py-3 whitespace-nowrap transition-all border-b-2 ${
                      pestanaDetalles === "auditoria"
                        ? "border-white bg-white/10"
                        : "border-transparent hover:bg-white/5"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Auditoría
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Contenido según pestaña activa */}

              {/* PESTAÑA: DETALLE DEL PRODUCTO */}
              {pestanaDetalles === "detalle" && (
                <>
                  {/* Información General */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-purple-600">
                      <Package className="w-5 h-5" />
                      Información General
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">
                          Código de Barras:
                        </p>
                        <p className="font-semibold">
                          {productoDetalles.codigoBarras}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Nombre:
                        </p>
                        <p className="font-semibold">
                          {productoDetalles.nombre}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Laboratorio:
                        </p>
                        <p className="font-semibold">
                          {productoDetalles.laboratorio ||
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Sustancia Activa:
                        </p>
                        <p className="font-semibold">
                          {productoDetalles.sustanciaActiva ||
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Presentación:
                        </p>
                        <p className="font-semibold">
                          {productoDetalles.presentacion ||
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Descripción:
                        </p>
                        <p className="font-semibold">
                          {productoDetalles.descripcion ||
                            "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Información de Clasificación */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-indigo-600">
                      <BarChart3 className="w-5 h-5" />
                      Clasificación
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">
                          Grupo:
                        </p>
                        <p className="font-semibold">
                          {productoDetalles.grupo || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Agrupación:
                        </p>
                        <p className="font-semibold">
                          {productoDetalles.agrupacion || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Categoría:
                        </p>
                        <p className="font-semibold">
                          {productoDetalles.categoria || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Clave SAT:
                        </p>
                        <p className="font-semibold">
                          {productoDetalles.claveSAT || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Información de Precios */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-green-600">
                      <DollarSign className="w-5 h-5" />
                      Precios
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">
                          Precio de Compra:
                        </p>
                        <p className="font-bold text-lg text-blue-600">
                          $
                          {parseFloat(
                            productoDetalles.precioCompra || 0,
                          ).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Precio de Venta:
                        </p>
                        <p className="font-bold text-lg text-green-600">
                          $
                          {parseFloat(
                            productoDetalles.precioVenta || 0,
                          ).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Margen de Ganancia:
                        </p>
                        <p className="font-bold text-lg text-purple-600">
                          $
                          {(
                            parseFloat(
                              productoDetalles.precioVenta || 0,
                            ) -
                            parseFloat(
                              productoDetalles.precioCompra ||
                                0,
                            )
                          ).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          % Ganancia:
                        </p>
                        <p className="font-bold text-lg text-orange-600">
                          {productoDetalles.precioCompra > 0
                            ? (
                                ((parseFloat(
                                  productoDetalles.precioVenta ||
                                    0,
                                ) -
                                  parseFloat(
                                    productoDetalles.precioCompra ||
                                      0,
                                  )) /
                                  parseFloat(
                                    productoDetalles.precioCompra,
                                  )) *
                                100
                              ).toFixed(2)
                            : "0.00"}
                          %
                        </p>
                      </div>
                    </div>
                  </div>
{productoDetalles.fechaVencimiento && (
  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
    <p className="text-sm text-gray-500">Fecha de Vencimiento</p>
    <p className="font-semibold text-amber-900">
      {new Date(productoDetalles.fechaVencimiento).toLocaleDateString("es-MX")}
    </p>
    {(() => {
      const dias = Math.floor(
        (new Date(productoDetalles.fechaVencimiento).getTime() - Date.now())
        / (1000 * 60 * 60 * 24)
      );
      return (
        <p className={`text-xs mt-1 ${dias < 0 ? "text-red-600 font-bold" : dias < 30 ? "text-orange-600" : "text-green-600"}`}>
          {dias < 0 ? "¡VENCIDO!" : dias < 30 ? `⚠️ Vence en ${dias} días` : `✓ Vence en ${dias} días`}
        </p>
      );
    })()}
  </div>
)}
                  {/* Inventario por Sucursal */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-blue-600">
                      <Building className="w-5 h-5" />
                      Inventario por Sucursal
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {SUCURSALES.map((sucursal) => {
                          const stock =
                            productoDetalles.stockBySucursal?.[
                              sucursal.id
                            ] || 0;
                          const alertaStock = stock < 20;
                          return (
                            <div
                              key={sucursal.id}
                              className={`p-3 rounded-lg border-2 ${
                                alertaStock
                                  ? "border-red-200 bg-red-50"
                                  : "border-green-200 bg-green-50"
                              }`}
                            >
                              <p className="text-xs text-gray-600 mb-1">
                                {sucursal.nombre}
                              </p>
                              <p
                                className={`text-2xl font-bold ${
                                  alertaStock
                                    ? "text-red-600"
                                    : "text-green-600"
                                }`}
                              >
                                {stock}
                              </p>
                              {alertaStock && (
                                <div className="flex items-center gap-1 mt-1">
                                  <AlertTriangle className="w-3 h-3 text-red-600" />
                                  <span className="text-xs text-red-600">
                                    Stock Bajo
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-700">
                            Stock Total:
                          </span>
                          <span className="text-2xl font-bold text-indigo-600">
                            {Object.values(
                              productoDetalles.stockBySucursal ||
                                {},
                            ).reduce(
                              (sum: number, stock: any) =>
                                sum + (Number(stock) || 0),
                              0,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Información Adicional */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-gray-600">
                      <FileText className="w-5 h-5" />
                      Información Adicional
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <p className="text-sm text-gray-600">
                            Lugar de Compra:
                          </p>
                          <p className="font-semibold">
                            {productoDetalles.lugarCompra ||
                              "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* PESTAÑA: GRÁFICA */}
              {pestanaDetalles === "grafica" && (
                <div>
                  <h3 className="font-semibold text-xl mb-6 flex items-center gap-2 text-indigo-600">
                    <LineChart className="w-6 h-6" />
                    Gráficas y Estadísticas
                  </h3>

                  {/* Resumen de Movimientos */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">
                        Total Ventas
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {
                          ventas.filter((v) =>
                            v.productos?.some(
                              (p: any) =>
                                p.productoId ===
                                productoDetalles.id,
                            ),
                          ).length
                        }
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">
                        Total Compras
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {
                          compras.filter((c) =>
                            c.productos?.some(
                              (p: any) =>
                                p.productoId ===
                                productoDetalles.id,
                            ),
                          ).length
                        }
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-600 mb-1">
                        Total Traslados
                      </p>
                      <p className="text-2xl font-bold text-purple-600">
                        {
                          traslados.filter((t) =>
                            t.productos?.some(
                              (p: any) =>
                                p.productoId ===
                                productoDetalles.id,
                            ),
                          ).length
                        }
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="text-sm text-gray-600 mb-1">
                        Stock Total
                      </p>
                      <p className="text-2xl font-bold text-orange-600">
                        {Object.values(
                          productoDetalles.stockBySucursal ||
                            {},
                        ).reduce(
                          (sum: number, stock: any) =>
                            sum + (Number(stock) || 0),
                          0,
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Placeholder para gráfica */}
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <LineChart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 font-semibold">
                      Gráfica de Movimientos
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Visualización de ventas, compras y
                      traslados en el tiempo
                    </p>
                  </div>
                </div>
              )}

              {/* PESTAÑA: VENTAS */}
              {pestanaDetalles === "ventas" && (
                <div>
                  <h3 className="font-semibold text-xl mb-6 flex items-center gap-2 text-green-600">
                    <ShoppingCart className="w-6 h-6" />
                    Historial de Ventas
                  </h3>

                  <div className="bg-white rounded-lg border">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Fecha de Venta
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Referencia
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Sucursal
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Precio Unitario
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Total Pagado
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {ventas
                            .filter((v) =>
                              v.productos?.some(
                                (p: any) =>
                                  p.productoId ===
                                  productoDetalles.id,
                              ),
                            )
                            .map((venta, idx) => {
                              const productoVenta =
                                venta.productos?.find(
                                  (p: any) =>
                                    p.productoId ===
                                    productoDetalles.id,
                                );
                              return (
                                <tr
                                  key={idx}
                                  className="hover:bg-gray-50 cursor-pointer transition-colors hover:bg-blue-50/50"
                                  onClick={() =>
                                    setSelectedSale(venta)
                                  }
                                >
                                  <td className="px-4 py-3 text-sm">
                                    {new Date(
                                      venta.fecha,
                                    ).toLocaleDateString(
                                      "es-MX",
                                      {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <span className="font-medium text-blue-600">
                                      {venta.usuarioNombre ||
                                        venta.usuario ||
                                        "Sin referencia"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {SUCURSALES.find(
                                      (s) =>
                                        s.id ===
                                        venta.sucursalId,
                                    )?.nombre || "N/A"}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                                    $
                                    {parseFloat(
                                      productoVenta?.precio ||
                                        0,
                                    ).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-bold text-green-600">
                                    $
                                    {(
                                      (productoVenta?.cantidad ||
                                        0) *
                                      parseFloat(
                                        productoVenta?.precio ||
                                          0,
                                      )
                                    ).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          {ventas.filter((v) =>
                            v.productos?.some(
                              (p: any) =>
                                p.productoId ===
                                productoDetalles.id,
                            ),
                          ).length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-4 py-8 text-center text-gray-500"
                              >
                                No se encontraron ventas para
                                este producto
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA: COTIZACIÓN */}
              {pestanaDetalles === "cotizacion" && (
                <div>
                  <h3 className="font-semibold text-xl mb-6 flex items-center gap-2 text-blue-600">
                    <ClipboardList className="w-6 h-6" />
                    Cotización del Producto
                  </h3>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-lg border border-blue-200">
                    <div className="max-w-2xl mx-auto">
                      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-lg">
                              {productoDetalles.nombre}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Código:{" "}
                              {productoDetalles.codigoBarras}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              Precio Unitario
                            </p>
                            <p className="text-2xl font-bold text-blue-600">
                              $
                              {parseFloat(
                                productoDetalles.precioVenta ||
                                  0,
                              ).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600">
                              Laboratorio
                            </p>
                            <p className="font-semibold">
                              {productoDetalles.laboratorio ||
                                "N/A"}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600">
                              Presentación
                            </p>
                            <p className="font-semibold">
                              {productoDetalles.presentacion ||
                                "N/A"}
                            </p>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <p className="text-xs text-gray-500 mb-2">
                            Cálculo de cantidad:
                          </p>
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              defaultValue={1}
                              min={1}
                              className="border rounded px-3 py-2 w-24"
                            />
                            <span className="text-gray-600">
                              x
                            </span>
                            <span className="font-semibold">
                              $
                              {parseFloat(
                                productoDetalles.precioVenta ||
                                  0,
                              ).toFixed(2)}
                            </span>
                            <span className="text-gray-600">
                              =
                            </span>
                            <span className="text-xl font-bold text-blue-600">
                              $
                              {parseFloat(
                                productoDetalles.precioVenta ||
                                  0,
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2">
                          <Printer className="w-5 h-5" />
                          Imprimir Cotización
                        </button>
                        <button className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2">
                          <Download className="w-5 h-5" />
                          Descargar PDF
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA: COMPRAS */}
              {pestanaDetalles === "compras" && (
                <div>
                  <h3 className="font-semibold text-xl mb-6 flex items-center gap-2 text-orange-600">
                    <Receipt className="w-6 h-6" />
                    Historial de Compras
                  </h3>

                  <div className="bg-white rounded-lg border">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Fecha
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Referencia
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Sucursal
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Proveedor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Nombre del Producto
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Precio
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {compras
                            .filter((c) => {
                              // Verificar si el producto coincide en la raíz (compra individual)
                              const coincideRaiz =
                                c.productoId ===
                                  productoDetalles.codigoBarras ||
                                c.productoId ===
                                  productoDetalles.id;

                              // Verificar si el producto coincide en el array de productos (compra masiva o antigua)
                              const coincideArray =
                                c.productos?.some(
                                  (p: any) =>
                                    p.productoId ===
                                      productoDetalles.id ||
                                    p.productoId ===
                                      productoDetalles.codigoBarras,
                                );

                              return (
                                coincideRaiz || coincideArray
                              );
                            })
                            .map((compra, idx) => {
                              // Intentar encontrar el producto en el array
                              let productoCompra =
                                compra.productos?.find(
                                  (p: any) =>
                                    p.productoId ===
                                      productoDetalles.id ||
                                    p.productoId ===
                                      productoDetalles.codigoBarras,
                                );

                              // Si no se encuentra en array pero coincidió en raíz, construir objeto con datos de raíz
                              if (
                                !productoCompra &&
                                (compra.productoId ===
                                  productoDetalles.codigoBarras ||
                                  compra.productoId ===
                                    productoDetalles.id)
                              ) {
                                productoCompra = {
                                  nombreProducto:
                                    compra.nombreProducto,
                                  precioCompra:
                                    compra.precioCompra,
                                  cantidad: compra.cantidad,
                                  productoId: compra.productoId,
                                };
                              }

                              // Asumimos estado Recibido si no existe, o simulamos para visualización
                              const estado =
                                compra.estado || "Recibido";

                              return (
                                <tr
                                  key={idx}
                                  className="hover:bg-gray-50 cursor-pointer transition-colors hover:bg-orange-50/50"
                                  onClick={() =>
                                    setSelectedCompraDetalle(
                                      compra,
                                    )
                                  }
                                >
                                  <td className="px-4 py-3 text-sm">
                                    {new Date(
                                      compra.fecha,
                                    ).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {compra.usuarioNombre ||
                                      compra.usuario ||
                                      "Sistema"}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {SUCURSALES.find(
                                      (s) =>
                                        s.id ===
                                        compra.sucursalId,
                                    )?.nombre || "N/A"}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {compra.proveedor || "N/A"}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium">
                                    {productoCompra?.nombreProducto ||
                                      productoDetalles.nombre}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-bold text-orange-600">
                                    $
                                    {parseFloat(
                                      productoCompra?.precioCompra ||
                                        0,
                                    ).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        estado === "Recibido" ||
                                        estado === "Completado"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {estado === "Completado"
                                        ? "Recibido"
                                        : estado}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          {compras.filter((c) => {
                            const coincideRaiz =
                              c.productoId ===
                                productoDetalles.codigoBarras ||
                              c.productoId ===
                                productoDetalles.id;
                            const coincideArray =
                              c.productos?.some(
                                (p: any) =>
                                  p.productoId ===
                                    productoDetalles.id ||
                                  p.productoId ===
                                    productoDetalles.codigoBarras,
                              );
                            return (
                              coincideRaiz || coincideArray
                            );
                          }).length === 0 && (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-4 py-8 text-center text-gray-500"
                              >
                                No se encontraron compras para
                                este producto
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA: TRASLADOS */}
              {pestanaDetalles === "traslados" && (
                <div>
                  <h3 className="font-semibold text-xl mb-6 flex items-center gap-2 text-purple-600">
                    <ArrowLeftRight className="w-6 h-6" />
                    Historial de Traslados
                  </h3>

                  <div className="bg-white rounded-lg border">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Fecha
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Referencia
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Nombre del Producto
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Sucursal (De)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Sucursal (Para)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Total
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {traslados
                            .filter((t) =>
                              t.productos?.some(
                                (p: any) =>
                                  p.productoId ===
                                  productoDetalles.id,
                              ),
                            )
                            .map((traslado, idx) => {
                              const productoTraslado =
                                traslado.productos?.find(
                                  (p: any) =>
                                    p.productoId ===
                                    productoDetalles.id,
                                );
                              // Normalizar estado para visualización
                              const estado =
                                traslado.estado || "pendiente";
                              const esCompletado =
                                estado.toLowerCase() ===
                                "completado";

                              return (
                                <tr
                                  key={idx}
                                  className="hover:bg-gray-50"
                                >
                                  <td className="px-4 py-3 text-sm">
                                    {new Date(
                                      traslado.fecha,
                                    ).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {traslado.usuarioNombre ||
                                      traslado.usuario ||
                                      "Sistema"}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium">
                                    {productoTraslado?.nombreProducto ||
                                      productoDetalles.nombre}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {SUCURSALES.find(
                                      (s) =>
                                        s.id ===
                                        traslado.sucursalOrigenId,
                                    )?.nombre || "N/A"}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {SUCURSALES.find(
                                      (s) =>
                                        s.id ===
                                        traslado.sucursalDestinoId,
                                    )?.nombre || "N/A"}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold">
                                    {productoTraslado?.cantidad ||
                                      0}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        esCompletado
                                          ? "bg-green-100 text-green-800"
                                          : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {esCompletado
                                        ? "Completado"
                                        : "Pendiente"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          {traslados.filter((t) =>
                            t.productos?.some(
                              (p: any) =>
                                p.productoId ===
                                productoDetalles.id,
                            ),
                          ).length === 0 && (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-4 py-8 text-center text-gray-500"
                              >
                                No se encontraron traslados para
                                este producto
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA: AJUSTES DE CANTIDAD (HISTORIAL) */}
              {pestanaDetalles === "auditoria" && (
                <div>
                  <h3 className="font-semibold text-xl mb-6 flex items-center gap-2 text-teal-600">
                    <ShieldCheck className="w-6 h-6" />
                    Auditoría y Trazabilidad
                  </h3>

                  {selectedSucursal === "todas" ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                      Selecciona una sucursal específica (arriba) para auditar el inventario de este producto.
                    </div>
                  ) : (
                    <>
                      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
                        <h4 className="font-semibold text-teal-900 mb-3 flex items-center gap-2">
                          <Check className="w-5 h-5" /> Confirmar Inventario Físico — {SUCURSALES.find(s => s.id === selectedSucursal)?.nombre}
                        </h4>
                        {(() => {
                          const stockSistema = (productoDetalles?.stockBySucursal || {})[selectedSucursal] || 0;
                          const dif = auditoriaStockFisico !== "" && !isNaN(parseInt(auditoriaStockFisico))
                            ? parseInt(auditoriaStockFisico) - stockSistema : null;
                          return (
                            <>
                              <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">Stock en Sistema</label>
                                  <div className="px-3 py-2 bg-white border rounded-lg font-bold text-gray-800">{stockSistema}</div>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">Conteo Físico *</label>
                                  <input type="number" value={auditoriaStockFisico}
                                    onChange={(e) => setAuditoriaStockFisico(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500" placeholder="0" />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">Diferencia</label>
                                  <div className={`px-3 py-2 border rounded-lg font-bold ${
                                    dif === null ? "bg-white text-gray-400" :
                                    dif === 0 ? "bg-green-50 text-green-700 border-green-300" :
                                    "bg-red-50 text-red-700 border-red-300"
                                  }`}>
                                    {dif === null ? "�" : dif > 0 ? `+${dif}` : dif}
                                  </div>
                                </div>
                              </div>
                              <input type="text" value={auditoriaNotas}
                                onChange={(e) => setAuditoriaNotas(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 mb-3 text-sm"
                                placeholder="Nota (opcional)" />
                              {dif !== null && dif !== 0 && (
                                <p className="text-xs text-orange-700 mb-3">
                                  Se generará un ajuste automático para corregir el stock de {stockSistema} a {auditoriaStockFisico}.
                                </p>
                              )}
                              <button onClick={confirmarAuditoria} disabled={auditoriaConfirmando}
                                className="w-full bg-teal-600 text-white py-2.5 rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium">
                                <Check className="w-5 h-5" />
                                {auditoriaConfirmando ? "Procesando..." : "Confirmar inventario correcto"}
                              </button>
                            </>
                          );
                        })()}
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-800">Trazabilidad ({auditoriaMovimientos.length} movimientos)</h4>
                      </div>
                      {auditoriaCargando ? (
                        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>
                      ) : auditoriaMovimientos.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 text-sm">Sin movimientos registrados para este producto en esta sucursal</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Tipo</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Cantidad</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Usuario</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Detalle</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {auditoriaMovimientos.map((m: any, i: number) => (
                                <tr key={i} className={`hover:bg-gray-50 ${m.tipo === "auditoria" ? "bg-teal-50" : ""}`}>
                                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{formatearFechaHoraCDMX(m.fecha)}</td>
                                  <td className="px-3 py-2 capitalize text-xs font-medium">{m.tipo}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`inline-flex items-center gap-0.5 font-semibold text-xs ${
                                      m.direccion === "entrada" ? "text-green-600" : m.direccion === "salida" ? "text-red-600" : "text-gray-600"
                                    }`}>
                                      {m.direccion === "entrada" && <ArrowUp className="w-3 h-3" />}
                                      {m.direccion === "salida" && <ArrowDown className="w-3 h-3" />}
                                      {m.cantidad}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-600">{m.usuario}</td>
                                  <td className="px-3 py-2 text-xs text-gray-500">{m.nota}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {pestanaDetalles === "ajustes" && (
                <div>
                  <h3 className="font-semibold text-xl mb-6 flex items-center gap-2 text-red-600">
                    <Settings className="w-6 h-6" />
                    Historial de Ajustes de Inventario
                  </h3>

                  <div className="bg-white rounded-lg border">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Fecha
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Referencia
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Sucursal
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Creado Por
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Observaciones
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Nombre de Producto
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Nuevo Stock
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {ajustes
                            .filter(
                              (a) =>
                                a.productoId ===
                                  productoDetalles.codigoBarras ||
                                a.productoId ===
                                  productoDetalles.id,
                            )
                            .map((ajuste, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-gray-50 cursor-pointer transition-colors hover:bg-red-50/50"
                                onClick={() =>
                                  setSelectedAjusteDetalle(
                                    ajuste,
                                  )
                                }
                              >
                                <td className="px-4 py-3 text-sm">
                                  {new Date(
                                    ajuste.fecha,
                                  ).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {ajuste.referencia || "-"}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {ajuste.sucursalNombre ||
                                    SUCURSALES.find(
                                      (s) =>
                                        s.id ===
                                        ajuste.sucursalId,
                                    )?.nombre ||
                                    "N/A"}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {ajuste.creadoPor ||
                                    "Supervisor"}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {ajuste.notas ||
                                    ajuste.motivo}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium">
                                  {ajuste.nombreProducto}
                                </td>
                                <td className="px-4 py-3 text-sm font-bold">
                                  {ajuste.nuevoStock}
                                </td>
                              </tr>
                            ))}
                          {ajustes.filter(
                            (a) =>
                              a.productoId ===
                                productoDetalles.codigoBarras ||
                              a.productoId ===
                                productoDetalles.id,
                          ).length === 0 && (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-4 py-8 text-center text-gray-500"
                              >
                                No se encontraron ajustes
                                previos para este producto
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">
                  Pestaña activa:
                </span>{" "}
                {pestanaDetalles === "detalle"
                  ? "Detalle del Producto"
                  : pestanaDetalles === "grafica"
                    ? "Gráfica"
                    : pestanaDetalles === "ventas"
                      ? "Ventas"
                      : pestanaDetalles === "cotizacion"
                        ? "Cotización"
                        : pestanaDetalles === "compras"
                          ? "Compras"
                          : pestanaDetalles === "traslados"
                            ? "Traslados"
                            : "Ajustes de Cantidad"}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setProductoDetalles(null);
                    setPestanaDetalles("detalle");
                  }}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cerrar
                </button>
                <button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Venta */}
      {selectedSale && (
        <SaleDetailsModal
          sale={selectedSale}
          allProducts={productos}
          onClose={() => setSelectedSale(null)}
        />
      )}

      {/* Modal de Detalles de Compra (usado en detalles de producto) */}
      {selectedCompraDetalle && (
        <PurchaseDetailsModal
          compra={selectedCompraDetalle}
          onClose={() => setSelectedCompraDetalle(null)}
        />
      )}

      {/* Modal de Detalles de Ajuste */}
      {selectedAjusteDetalle && (
        <AdjustmentDetailsModal
          ajuste={selectedAjusteDetalle}
          onClose={() => setSelectedAjusteDetalle(null)}
        />
      )}

      {/* Modales de Ventas */}
      {selectedVentaDetalles && (
        <VentaDetailsModal
          venta={selectedVentaDetalles}
          onClose={() => setSelectedVentaDetalles(null)}
        />
      )}

      {selectedVentaToEdit && (
        <EditVentaModal
          venta={selectedVentaToEdit}
          onClose={() => setSelectedVentaToEdit(null)}
          onSave={handleEditVenta}
          isLoading={loading}
        />
      )}

      {selectedVentaDevolucion && (
        <DevolucionVentaModal
          venta={selectedVentaDevolucion}
          onClose={() => setSelectedVentaDevolucion(null)}
          onConfirm={handleDevolucionVenta}
          isLoading={loading}
        />
      )}

      {selectedVentaToDelete && (
        <DeleteVentaModal
          venta={selectedVentaToDelete}
          onClose={() => setSelectedVentaToDelete(null)}
          onConfirm={handleDeleteVenta}
          isDeleting={loading}
        />
      )}

      {selectedVentaPago && (
        <PaymentMethodModal
          venta={selectedVentaPago}
          onClose={() => setSelectedVentaPago(null)}
        />
      )}

      {selectedVentaRecibo && (
        <VentaReciboModal
          venta={selectedVentaRecibo}
          onClose={() => setSelectedVentaRecibo(null)}
        />
      )}

      {/* Modal Eliminar Ajuste */}
      {ajusteToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Confirmar Eliminación de Ajuste
            </h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar este ajuste?
              Esta acción no se puede deshacer.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">
                <strong>Producto:</strong>{" "}
                {ajusteToDelete.nombreProducto}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Sucursal:</strong>{" "}
                {SUCURSALES.find(
                  (s) => s.id === ajusteToDelete.sucursalId,
                )?.nombre || "N/A"}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Fecha:</strong>{" "}
                {new Date(
                  ajusteToDelete.fecha,
                ).toLocaleDateString("es-MX")}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Motivo:</strong>{" "}
                {ajusteToDelete.motivo?.replace(/_/g, " ")}
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de eliminación:
              </label>
              <input
                type="text"
                value={motivoEliminacionAjuste}
                onChange={(e) =>
                  setMotivoEliminacionAjuste(e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Escribe el motivo de eliminación"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setAjusteToDelete(null);
                  setMotivoEliminacionAjuste("");
                }}
                disabled={deletingAjuste !== null}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAjuste}
                disabled={deletingAjuste !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deletingAjuste !== null
                  ? "Eliminando..."
                  : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario */}
      {selectedUserToEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">
                Editar Usuario
              </h3>
              <button
                onClick={() => setSelectedUserToEdit(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={
                    selectedUserToEdit.name ||
                    selectedUserToEdit.nombre ||
                    ""
                  }
                  onChange={(e) =>
                    setSelectedUserToEdit({
                      ...selectedUserToEdit,
                      name: e.target.value,
                      nombre: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario (Login)
                </label>
                <input
                  type="text"
                  value={selectedUserToEdit.username || ""}
                  onChange={(e) =>
                    setSelectedUserToEdit({
                      ...selectedUserToEdit,
                      username: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña (Dejar vacío para no cambiar)
                </label>
                <input
                  type="password"
                  placeholder="Nueva contraseña"
                  onChange={(e) => {
                    if (e.target.value)
                      setSelectedUserToEdit({
                        ...selectedUserToEdit,
                        password: e.target.value,
                      });
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {selectedUserToEdit.role === "farmaceutico" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ID Empleado / Cédula
                    </label>
                    <input
                      type="text"
                      value={selectedUserToEdit.cedula || ""}
                      onChange={(e) =>
                        setSelectedUserToEdit({
                          ...selectedUserToEdit,
                          cedula: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Turno
                    </label>
                    <select
                      value={selectedUserToEdit.turno || ""}
                      onChange={(e) =>
                        setSelectedUserToEdit({
                          ...selectedUserToEdit,
                          turno: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Matutino">Matutino</option>
                      <option value="Vespertino">
                        Vespertino
                      </option>
                      <option value="Completo">Completo</option>
                    </select>
                  </div>
                </>
              )}

              {selectedUserToEdit.role === "medico" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Especialidad
                    </label>
                    <input
                      type="text"
                      value={
                        selectedUserToEdit.especialidad || ""
                      }
                      onChange={(e) =>
                        setSelectedUserToEdit({
                          ...selectedUserToEdit,
                          especialidad: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cédula
                    </label>
                    <input
                      type="text"
                      value={selectedUserToEdit.cedula || ""}
                      onChange={(e) =>
                        setSelectedUserToEdit({
                          ...selectedUserToEdit,
                          cedula: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={selectedUserToEdit.email || ""}
                      onChange={(e) =>
                        setSelectedUserToEdit({
                          ...selectedUserToEdit,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Escuela/Universidad
                    </label>
                    <input
                      type="text"
                      value={selectedUserToEdit.escuela || ""}
                      onChange={(e) =>
                        setSelectedUserToEdit({
                          ...selectedUserToEdit,
                          escuela: e.target.value,
                        })
                      }
                      placeholder="Nombre de la institución"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logotipo de Escuela
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const formData = new FormData();
                            formData.append("file", file);

                            const fileExt2 = file.name.split('.').pop()
                            const fileName2 = `logo_${Date.now()}.${fileExt2}`
                            const { data: uploadData2, error: uploadError2 } = await supabase.storage
                              .from('make-7d799f19-medicos')
                              .upload(fileName2, file, { upsert: true })
                            if (uploadError2) throw new Error(uploadError2.message)
                            const { data: urlData2 } = supabase.storage.from('make-7d799f19-medicos').getPublicUrl(fileName2)
                            const result = { publicUrl: urlData2.publicUrl }
                            if (result.publicUrl) {
                              setSelectedUserToEdit({
                                ...selectedUserToEdit,
                                logoEscuela: result.publicUrl,
                              })
                            // Actualizar logo en Supabase
                            await supabase.from("perfiles").update({ logo_universidad: result.publicUrl }).eq("id", selectedUserToEdit.id);
                              toast.success(
                                "Logo cargado correctamente",
                              );
                            }
                          } catch (error: any) {
                            console.error(
                              "Error al cargar logo:",
                              error,
                            );
                            toast.error(
                              error.message ||
                                "Error al cargar el logo",
                            );
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {selectedUserToEdit.logoEscuela && (
                      <div className="mt-2">
                        <img
                          src={selectedUserToEdit.logoEscuela}
                          alt="Logo"
                          className="h-16 w-auto object-contain border rounded"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sucursal Base
                </label>
                <select
                  value={selectedUserToEdit.sucursalId || ""}
                  onChange={(e) =>
                    setSelectedUserToEdit({
                      ...selectedUserToEdit,
                      sucursalId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Sin asignar</option>
                  {SUCURSALES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedUserToEdit(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
