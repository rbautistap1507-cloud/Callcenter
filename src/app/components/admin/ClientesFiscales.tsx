import React, { useState, useEffect } from "react";
import { supabase } from "/utils/supabase/client";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Save,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface ClienteFiscal {
  id?: string;
  rfc: string;
  nombre_razon_social: string;
  regimen_fiscal: string;
  codigo_postal: string;
  email: string;
  uso_cfdi_default: string;
  created_at?: string;
  updated_at?: string;
}

interface UsoCFDI {
  clave: string;
  descripcion: string;
}

interface RegimenFiscal {
  clave: string;
  descripcion: string;
}

export default function ClientesFiscales() {
  const [clientes, setClientes] = useState<ClienteFiscal[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<ClienteFiscal[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<ClienteFiscal | null>(null);

  // Catálogos SAT
  const [usosCFDI, setUsosCFDI] = useState<UsoCFDI[]>([]);
  const [regimenesFiscales, setRegimenesFiscales] = useState<RegimenFiscal[]>([]);

  // Estado del formulario
  const [formulario, setFormulario] = useState<ClienteFiscal>({
    rfc: "",
    nombre_razon_social: "",
    regimen_fiscal: "",
    codigo_postal: "",
    email: "",
    uso_cfdi_default: "G01",
  });

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{
    tipo: "success" | "error";
    texto: string;
  } | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    filtrarClientes();
  }, [busqueda, clientes]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Cargar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes_fiscales")
        .select("*")
        .order("nombre_razon_social", { ascending: true });

      if (clientesError) throw clientesError;
      setClientes(clientesData || []);

      // Cargar catálogos SAT
      const { data: usosData } = await supabase
        .from("cat_uso_cfdi")
        .select("clave, descripcion")
        .order("clave", { ascending: true });

      const { data: regimenesData } = await supabase
        .from("cat_regimen_fiscal")
        .select("clave, descripcion")
        .order("clave", { ascending: true });

      setUsosCFDI(usosData || []);
      setRegimenesFiscales(regimenesData || []);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      mostrarMensaje("error", "Error al cargar los datos");
    } finally {
      setCargando(false);
    }
  };

  const filtrarClientes = () => {
    if (!busqueda.trim()) {
      setClientesFiltrados(clientes);
      return;
    }

    const termino = busqueda.toLowerCase();
    const filtrados = clientes.filter(
      (c) =>
        c.rfc.toLowerCase().includes(termino) ||
        c.nombre_razon_social.toLowerCase().includes(termino) ||
        c.email.toLowerCase().includes(termino)
    );
    setClientesFiltrados(filtrados);
  };

  const validarRFC = (rfc: string): boolean => {
    const regex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{2,3}$/;
    return regex.test(rfc);
  };

  const validarEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!formulario.rfc.trim()) {
      nuevosErrores.rfc = "El RFC es obligatorio";
    } else if (!validarRFC(formulario.rfc.toUpperCase())) {
      nuevosErrores.rfc = "RFC inválido (12-13 caracteres, formato SAT)";
    }

    if (!formulario.nombre_razon_social.trim()) {
      nuevosErrores.nombre_razon_social = "La razón social es obligatoria";
    }

    if (!formulario.regimen_fiscal) {
      nuevosErrores.regimen_fiscal = "El régimen fiscal es obligatorio";
    }

    if (!formulario.codigo_postal.trim()) {
      nuevosErrores.codigo_postal = "El código postal es obligatorio";
    } else if (!/^\d{5}$/.test(formulario.codigo_postal)) {
      nuevosErrores.codigo_postal = "Código postal inválido (5 dígitos)";
    }

    if (!formulario.email.trim()) {
      nuevosErrores.email = "El email es obligatorio";
    } else if (!validarEmail(formulario.email)) {
      nuevosErrores.email = "Email inválido";
    }

    if (!formulario.uso_cfdi_default) {
      nuevosErrores.uso_cfdi_default = "El uso de CFDI es obligatorio";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const abrirModalNuevo = () => {
    setModoEdicion(false);
    setClienteEditando(null);
    setFormulario({
      rfc: "",
      nombre_razon_social: "",
      regimen_fiscal: "",
      codigo_postal: "",
      email: "",
      uso_cfdi_default: "G01",
    });
    setErrores({});
    setMostrarModal(true);
  };

  const abrirModalEditar = (cliente: ClienteFiscal) => {
    setModoEdicion(true);
    setClienteEditando(cliente);
    setFormulario({ ...cliente });
    setErrores({});
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setModoEdicion(false);
    setClienteEditando(null);
    setFormulario({
      rfc: "",
      nombre_razon_social: "",
      regimen_fiscal: "",
      codigo_postal: "",
      email: "",
      uso_cfdi_default: "G01",
    });
    setErrores({});
  };

  const handleGuardar = async () => {
    if (!validarFormulario()) {
      mostrarMensaje("error", "Por favor corrige los errores del formulario");
      return;
    }

    setGuardando(true);
    try {
      const datosGuardar = {
        ...formulario,
        rfc: formulario.rfc.toUpperCase(),
      };

      if (modoEdicion && clienteEditando?.id) {
        // Actualizar
        const { error } = await supabase
          .from("clientes_fiscales")
          .update(datosGuardar)
          .eq("id", clienteEditando.id);

        if (error) throw error;
        mostrarMensaje("success", "Cliente actualizado correctamente");
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from("clientes_fiscales")
          .insert([datosGuardar]);

        if (error) {
          if (error.code === "23505") {
            // Unique constraint violation
            mostrarMensaje("error", "Ya existe un cliente con ese RFC");
            return;
          }
          throw error;
        }
        mostrarMensaje("success", "Cliente creado correctamente");
      }

      cerrarModal();
      cargarDatos();
    } catch (error) {
      console.error("Error al guardar cliente:", error);
      mostrarMensaje("error", "Error al guardar el cliente");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (cliente: ClienteFiscal) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar al cliente "${cliente.nombre_razon_social}"?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("clientes_fiscales")
        .delete()
        .eq("id", cliente.id);

      if (error) {
        if (error.code === "23503") {
          // Foreign key constraint
          mostrarMensaje(
            "error",
            "No se puede eliminar: el cliente tiene facturas emitidas"
          );
          return;
        }
        throw error;
      }

      mostrarMensaje("success", "Cliente eliminado correctamente");
      cargarDatos();
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      mostrarMensaje("error", "Error al eliminar el cliente");
    }
  };

  const mostrarMensaje = (tipo: "success" | "error", texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Cargando clientes fiscales...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Clientes Fiscales
            </h2>
            <p className="text-sm text-gray-600">
              Gestiona los datos fiscales de tus clientes para facturación
            </p>
          </div>
        </div>
        <button
          onClick={abrirModalNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      {/* Mensaje de éxito/error */}
      {mensaje && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
            mensaje.tipo === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {mensaje.tipo === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Búsqueda */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por RFC, nombre o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RFC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Razón Social / Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Régimen Fiscal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uso CFDI
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {busqueda
                      ? "No se encontraron clientes"
                      : "No hay clientes registrados"}
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-medium text-gray-900">
                        {cliente.rfc}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {cliente.nombre_razon_social}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs text-gray-600">
                        {cliente.regimen_fiscal}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {cliente.email}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {cliente.codigo_postal}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {cliente.uso_cfdi_default}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => abrirModalEditar(cliente)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(cliente)}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Contador */}
        {clientesFiltrados.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Mostrando {clientesFiltrados.length} de {clientes.length}{" "}
              cliente(s)
            </p>
          </div>
        )}
      </div>

      {/* Modal de nuevo/editar cliente */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {modoEdicion ? "Editar Cliente Fiscal" : "Nuevo Cliente Fiscal"}
                </h3>
              </div>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 space-y-6">
              {/* RFC */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RFC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formulario.rfc}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      rfc: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="ABC123456DEF"
                  maxLength={13}
                  className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
                    errores.rfc
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  } focus:ring-2 focus:border-transparent`}
                />
                {errores.rfc && (
                  <p className="mt-1 text-sm text-red-600">{errores.rfc}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  12-13 caracteres (persona moral: 12, persona física: 13)
                </p>
              </div>

              {/* Razón Social */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón Social / Nombre Completo{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formulario.nombre_razon_social}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      nombre_razon_social: e.target.value,
                    })
                  }
                  placeholder="ACME S.A. de C.V."
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errores.nombre_razon_social
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  } focus:ring-2 focus:border-transparent`}
                />
                {errores.nombre_razon_social && (
                  <p className="mt-1 text-sm text-red-600">
                    {errores.nombre_razon_social}
                  </p>
                )}
              </div>

              {/* Régimen Fiscal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Régimen Fiscal <span className="text-red-500">*</span>
                </label>
                <select
                  value={formulario.regimen_fiscal}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      regimen_fiscal: e.target.value,
                    })
                  }
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errores.regimen_fiscal
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  } focus:ring-2 focus:border-transparent`}
                >
                  <option value="">Selecciona un régimen fiscal</option>
                  {regimenesFiscales.map((regimen) => (
                    <option key={regimen.clave} value={regimen.clave}>
                      {regimen.clave} - {regimen.descripcion}
                    </option>
                  ))}
                </select>
                {errores.regimen_fiscal && (
                  <p className="mt-1 text-sm text-red-600">
                    {errores.regimen_fiscal}
                  </p>
                )}
              </div>

              {/* Email y CP en dos columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formulario.email}
                    onChange={(e) =>
                      setFormulario({ ...formulario, email: e.target.value })
                    }
                    placeholder="cliente@ejemplo.com"
                    className={`w-full px-3 py-2 border rounded-lg ${
                      errores.email
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    } focus:ring-2 focus:border-transparent`}
                  />
                  {errores.email && (
                    <p className="mt-1 text-sm text-red-600">{errores.email}</p>
                  )}
                </div>

                {/* Código Postal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código Postal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formulario.codigo_postal}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        codigo_postal: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    placeholder="01000"
                    maxLength={5}
                    className={`w-full px-3 py-2 border rounded-lg font-mono ${
                      errores.codigo_postal
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    } focus:ring-2 focus:border-transparent`}
                  />
                  {errores.codigo_postal && (
                    <p className="mt-1 text-sm text-red-600">
                      {errores.codigo_postal}
                    </p>
                  )}
                </div>
              </div>

              {/* Uso de CFDI por defecto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uso de CFDI (por defecto){" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={formulario.uso_cfdi_default}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      uso_cfdi_default: e.target.value,
                    })
                  }
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errores.uso_cfdi_default
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  } focus:ring-2 focus:border-transparent`}
                >
                  <option value="">Selecciona un uso de CFDI</option>
                  {usosCFDI.map((uso) => (
                    <option key={uso.clave} value={uso.clave}>
                      {uso.clave} - {uso.descripcion}
                    </option>
                  ))}
                </select>
                {errores.uso_cfdi_default && (
                  <p className="mt-1 text-sm text-red-600">
                    {errores.uso_cfdi_default}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Este uso se aplicará por defecto al facturar a este cliente
                </p>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={cerrarModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {guardando ? "Guardando..." : "Guardar Cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
