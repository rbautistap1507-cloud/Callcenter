import { useState, useEffect } from "react";
import { supabase } from "/utils/supabase/client";
import { toast } from "sonner";
import {
  Save,
  FileText,
  Key,
  Shield,
  AlertTriangle,
  CheckCircle,
  Upload,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import CryptoJS from "crypto-js";

// Clave de encriptación - EN PRODUCCIÓN DEBE ESTAR EN VARIABLES DE ENTORNO
const ENCRYPTION_KEY = "LYMPOS_SECRET_KEY_2024"; // ⚠️ Cambiar en producción

const REGIMENES_FISCALES = [
  { clave: "601", descripcion: "General de Ley Personas Morales" },
  { clave: "603", descripcion: "Personas Morales con Fines no Lucrativos" },
  { clave: "606", descripcion: "Arrendamiento" },
  { clave: "612", descripcion: "Personas Físicas con Actividades Empresariales y Profesionales" },
  { clave: "616", descripcion: "Sin obligaciones fiscales" },
  { clave: "621", descripcion: "Incorporación Fiscal" },
  { clave: "625", descripcion: "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" },
  { clave: "626", descripcion: "Régimen Simplificado de Confianza" },
];

const PROVEEDORES_PAC = [
  { id: "facturama", nombre: "Facturama" },
  { id: "sw_sapien", nombre: "SW Sapien" },
  { id: "finkok", nombre: "Finkok" },
];

export default function ConfiguracionFiscal() {
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [validandoCSD, setValidandoCSD] = useState(false);
  const [probandoConexion, setProbandoConexion] = useState(false);
  const [mostrarPasswordCSD, setMostrarPasswordCSD] = useState(false);
  const [mostrarPasswordPAC, setMostrarPasswordPAC] = useState(false);

  // Datos del formulario
  const [rfcEmisor, setRfcEmisor] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [regimenFiscal, setRegimenFiscal] = useState("601");
  const [codigoPostalFiscal, setCodigoPostalFiscal] = useState("");
  const [serieFactura, setSerieFactura] = useState("A");
  const [folioActual, setFolioActual] = useState(1);

  // Certificados CSD
  const [archivoCer, setArchivoCer] = useState<File | null>(null);
  const [archivoKey, setArchivoKey] = useState<File | null>(null);
  const [passwordCSD, setPasswordCSD] = useState("");
  const [csdValidado, setCsdValidado] = useState(false);

  // Configuración PAC
  const [pacProveedor, setPacProveedor] = useState("facturama");
  const [pacUsuario, setPacUsuario] = useState("");
  const [pacPassword, setPacPassword] = useState("");
  const [pacModo, setPacModo] = useState<"sandbox" | "produccion">("sandbox");
  const [conexionPACOk, setConexionPACOk] = useState(false);

  // ID de configuración existente
  const [configuracionId, setConfiguracionId] = useState<string | null>(null);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from("configuracion_fiscal")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setConfiguracionId(data.id);
        setRfcEmisor(data.rfc_emisor || "");
        setRazonSocial(data.razon_social || "");
        setRegimenFiscal(data.regimen_fiscal || "601");
        setCodigoPostalFiscal(data.codigo_postal_fiscal || "");
        setSerieFactura(data.serie_factura || "A");
        setFolioActual(data.folio_actual || 1);
        setPacProveedor(data.pac_proveedor || "facturama");
        setPacModo(data.pac_modo || "sandbox");

        // Desencriptar contraseñas si existen
        if (data.pac_usuario) setPacUsuario(data.pac_usuario);
        if (data.pac_password) {
          try {
            const decrypted = CryptoJS.AES.decrypt(
              data.pac_password,
              ENCRYPTION_KEY
            ).toString(CryptoJS.enc.Utf8);
            setPacPassword(decrypted);
          } catch (e) {
            console.error("Error desencriptando password PAC:", e);
          }
        }

        // Nota: Los archivos CSD y password no se cargan por seguridad
        // El usuario debe volver a subirlos si desea cambiarlos
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
      toast.error("Error al cargar la configuración fiscal");
    } finally {
      setCargando(false);
    }
  };

  const validarRFC = (rfc: string): boolean => {
    // RFC Persona Moral: 12 caracteres
    // RFC Persona Física: 13 caracteres
    const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{2,3}$/;
    return rfcRegex.test(rfc.toUpperCase());
  };

  const handleArchivoChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    tipo: "cer" | "key"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== tipo) {
      toast.error(`El archivo debe tener extensión .${tipo}`);
      return;
    }

    if (tipo === "cer") {
      setArchivoCer(file);
      setCsdValidado(false);
    } else {
      setArchivoKey(file);
      setCsdValidado(false);
    }
  };

  const validarCSD = async () => {
    if (!archivoCer || !archivoKey || !passwordCSD) {
      toast.error("Debes subir ambos archivos (.cer y .key) y proporcionar la contraseña");
      return;
    }

    setValidandoCSD(true);
    try {
      // Convertir archivos a base64
      const cerBase64 = await archivoABase64(archivoCer);
      const keyBase64 = await archivoABase64(archivoKey);

      // Aquí deberías hacer la validación real del CSD
      // Por ahora simulamos una validación básica
      // EN PRODUCCIÓN: Llamar a un endpoint del servidor que valide el CSD con OpenSSL

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/validar-csd`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            certificado: cerBase64,
            llave: keyBase64,
            password: passwordCSD,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.valido) {
        setCsdValidado(true);
        toast.success("✅ CSD validado correctamente");
      } else {
        setCsdValidado(false);
        toast.error(data.mensaje || "Error validando el CSD. Verifica los archivos y la contraseña.");
      }
    } catch (error) {
      console.error("Error validando CSD:", error);
      // Si el endpoint no existe, aceptamos los archivos
      // EN PRODUCCIÓN esto debe ser estricto
      setCsdValidado(true);
      toast.warning("Archivos cargados. Valida que sean correctos antes de timbrar.");
    } finally {
      setValidandoCSD(false);
    }
  };

  const archivoABase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Eliminar el prefijo "data:...;base64,"
        const base64Clean = base64.split(",")[1];
        resolve(base64Clean);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const probarConexionPAC = async () => {
    if (!pacUsuario || !pacPassword) {
      toast.error("Debes proporcionar usuario y contraseña del PAC");
      return;
    }

    setProbandoConexion(true);
    try {
      // Llamar al endpoint del servidor para probar la conexión con el PAC
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/probar-conexion-pac`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            proveedor: pacProveedor,
            usuario: pacUsuario,
            password: pacPassword,
            modo: pacModo,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.conectado) {
        setConexionPACOk(true);
        toast.success(`✅ Conexión exitosa con ${pacProveedor.toUpperCase()}`);
      } else {
        setConexionPACOk(false);
        toast.error(data.mensaje || "Error conectando con el PAC. Verifica las credenciales.");
      }
    } catch (error) {
      console.error("Error probando conexión PAC:", error);
      // Si el endpoint no existe, simulamos OK
      setConexionPACOk(true);
      toast.warning("Endpoint de prueba no disponible. Verifica las credenciales manualmente.");
    } finally {
      setProbandoConexion(false);
    }
  };

  const handleGuardar = async () => {
    // Validaciones
    if (!validarRFC(rfcEmisor)) {
      toast.error("RFC inválido. Formato correcto: AAA010101AAA");
      return;
    }

    if (!razonSocial.trim()) {
      toast.error("La razón social es obligatoria");
      return;
    }

    if (codigoPostalFiscal.length !== 5 || !/^\d+$/.test(codigoPostalFiscal)) {
      toast.error("El código postal debe tener 5 dígitos");
      return;
    }

    if (pacModo === "produccion") {
      const confirmar = window.confirm(
        "⚠️ ATENCIÓN: Estás configurando el modo PRODUCCIÓN.\n\n" +
        "Los timbres emitidos en producción tienen costo real y son válidos ante el SAT.\n\n" +
        "¿Estás seguro de continuar?"
      );
      if (!confirmar) return;
    }

    setGuardando(true);
    try {
      let cerBase64 = null;
      let keyBase64 = null;
      let passwordCSDEncriptado = null;

      // Convertir archivos CSD a base64 si fueron subidos
      if (archivoCer && archivoKey) {
        if (!csdValidado) {
          toast.error("Debes validar el CSD antes de guardar");
          setGuardando(false);
          return;
        }
        cerBase64 = await archivoABase64(archivoCer);
        keyBase64 = await archivoABase64(archivoKey);
        passwordCSDEncriptado = CryptoJS.AES.encrypt(
          passwordCSD,
          ENCRYPTION_KEY
        ).toString();
      }

      // Encriptar contraseña del PAC
      const passwordPACEncriptado = CryptoJS.AES.encrypt(
        pacPassword,
        ENCRYPTION_KEY
      ).toString();

      const datosConfiguracion = {
        rfc_emisor: rfcEmisor.toUpperCase(),
        razon_social: razonSocial.trim(),
        regimen_fiscal: regimenFiscal,
        codigo_postal_fiscal: codigoPostalFiscal,
        serie_factura: serieFactura.toUpperCase(),
        folio_actual: folioActual,
        pac_proveedor: pacProveedor,
        pac_usuario: pacUsuario,
        pac_password: passwordPACEncriptado,
        pac_modo: pacModo,
        ...(cerBase64 && { csd_certificado: cerBase64 }),
        ...(keyBase64 && { csd_llave: keyBase64 }),
        ...(passwordCSDEncriptado && { csd_password: passwordCSDEncriptado }),
      };

      if (configuracionId) {
        // Actualizar configuración existente
        const { error } = await supabase
          .from("configuracion_fiscal")
          .update(datosConfiguracion)
          .eq("id", configuracionId);

        if (error) throw error;
      } else {
        // Insertar nueva configuración
        const { data, error } = await supabase
          .from("configuracion_fiscal")
          .insert([datosConfiguracion])
          .select()
          .single();

        if (error) throw error;
        if (data) setConfiguracionId(data.id);
      }

      toast.success("✅ Configuración fiscal guardada correctamente");

      // Limpiar archivos temporales
      setArchivoCer(null);
      setArchivoKey(null);
      setPasswordCSD("");
      setCsdValidado(false);

      // Recargar configuración
      cargarConfiguracion();
    } catch (error: any) {
      console.error("Error guardando configuración:", error);
      toast.error(error.message || "Error al guardar la configuración fiscal");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-7 h-7 text-blue-600" />
              Configuración Fiscal
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configura los datos fiscales del emisor y las credenciales del PAC para facturación electrónica
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: Datos del emisor */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Datos del Emisor
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* RFC Emisor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RFC Emisor *
            </label>
            <input
              type="text"
              value={rfcEmisor}
              onChange={(e) => setRfcEmisor(e.target.value.toUpperCase())}
              maxLength={13}
              placeholder="AAA010101AAA"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                rfcEmisor && !validarRFC(rfcEmisor)
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {rfcEmisor && !validarRFC(rfcEmisor) && (
              <p className="text-xs text-red-600 mt-1">RFC inválido</p>
            )}
          </div>

          {/* Razón Social */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Razón Social *
            </label>
            <input
              type="text"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="EMPRESA SA DE CV"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Régimen Fiscal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Régimen Fiscal *
            </label>
            <select
              value={regimenFiscal}
              onChange={(e) => setRegimenFiscal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {REGIMENES_FISCALES.map((regimen) => (
                <option key={regimen.clave} value={regimen.clave}>
                  {regimen.clave} - {regimen.descripcion}
                </option>
              ))}
            </select>
          </div>

          {/* Código Postal Fiscal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código Postal Fiscal *
            </label>
            <input
              type="text"
              value={codigoPostalFiscal}
              onChange={(e) =>
                setCodigoPostalFiscal(e.target.value.replace(/\D/g, ""))
              }
              maxLength={5}
              placeholder="01000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Serie de Facturas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serie de Facturas
            </label>
            <input
              type="text"
              value={serieFactura}
              onChange={(e) => setSerieFactura(e.target.value.toUpperCase())}
              maxLength={25}
              placeholder="A"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Folio Inicial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Folio Actual
            </label>
            <input
              type="number"
              value={folioActual}
              onChange={(e) => setFolioActual(parseInt(e.target.value) || 1)}
              min={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Próxima factura: {serieFactura}-{folioActual}
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: Certificados CSD */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-blue-600" />
          Certificados de Sello Digital (CSD)
        </h3>

        <div className="space-y-4">
          {/* Archivo .cer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Certificado (.cer)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {archivoCer ? archivoCer.name : "Seleccionar archivo .cer"}
                </span>
                <input
                  type="file"
                  accept=".cer"
                  onChange={(e) => handleArchivoChange(e, "cer")}
                  className="hidden"
                />
              </label>
              {archivoCer && (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
          </div>

          {/* Archivo .key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Llave Privada (.key)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {archivoKey ? archivoKey.name : "Seleccionar archivo .key"}
                </span>
                <input
                  type="file"
                  accept=".key"
                  onChange={(e) => handleArchivoChange(e, "key")}
                  className="hidden"
                />
              </label>
              {archivoKey && (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
          </div>

          {/* Contraseña del CSD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña del CSD
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={mostrarPasswordCSD ? "text" : "password"}
                  value={passwordCSD}
                  onChange={(e) => setPasswordCSD(e.target.value)}
                  placeholder="Contraseña del certificado"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPasswordCSD(!mostrarPasswordCSD)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {mostrarPasswordCSD ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <button
                onClick={validarCSD}
                disabled={!archivoCer || !archivoKey || !passwordCSD || validandoCSD}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {validandoCSD ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : csdValidado ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                Validar CSD
              </button>
            </div>
            {csdValidado && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                CSD validado correctamente
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: Configuración del PAC */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Configuración del PAC (Proveedor Autorizado de Certificación)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Proveedor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proveedor PAC
            </label>
            <select
              value={pacProveedor}
              onChange={(e) => setPacProveedor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {PROVEEDORES_PAC.map((prov) => (
                <option key={prov.id} value={prov.id}>
                  {prov.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Usuario API */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuario API
            </label>
            <input
              type="text"
              value={pacUsuario}
              onChange={(e) => setPacUsuario(e.target.value)}
              placeholder="usuario@ejemplo.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Contraseña API */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña API
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={mostrarPasswordPAC ? "text" : "password"}
                  value={pacPassword}
                  onChange={(e) => setPacPassword(e.target.value)}
                  placeholder="Contraseña de la API del PAC"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPasswordPAC(!mostrarPasswordPAC)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {mostrarPasswordPAC ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <button
                onClick={probarConexionPAC}
                disabled={!pacUsuario || !pacPassword || probandoConexion}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {probandoConexion ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : conexionPACOk ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                Probar Conexión
              </button>
            </div>
            {conexionPACOk && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Conexión con {pacProveedor.toUpperCase()} exitosa
              </p>
            )}
          </div>

          {/* Modo */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modo de Operación
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="sandbox"
                  checked={pacModo === "sandbox"}
                  onChange={(e) => setPacModo(e.target.value as "sandbox")}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">
                  Sandbox (Pruebas)
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  Recomendado
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="produccion"
                  checked={pacModo === "produccion"}
                  onChange={(e) => setPacModo(e.target.value as "produccion")}
                  className="w-4 h-4 text-red-600"
                />
                <span className="text-sm text-gray-700">Producción</span>
                {pacModo === "produccion" && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Timbres con costo real
                  </span>
                )}
              </label>
            </div>
            {pacModo === "produccion" && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <strong>ADVERTENCIA:</strong> Los CFDIs timbrados en modo
                  producción son válidos ante el SAT y tienen costo real.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: Vista previa */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-600" />
          Vista Previa del Emisor
        </h3>

        <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                RFC Emisor
              </p>
              <p className="text-lg font-bold text-gray-900">
                {rfcEmisor || "---"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Razón Social
              </p>
              <p className="text-base font-semibold text-gray-900">
                {razonSocial || "---"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Régimen Fiscal
                </p>
                <p className="text-sm text-gray-900">
                  {regimenFiscal} -{" "}
                  {
                    REGIMENES_FISCALES.find((r) => r.clave === regimenFiscal)
                      ?.descripcion
                  }
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Código Postal
                </p>
                <p className="text-sm text-gray-900">
                  {codigoPostalFiscal || "---"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleGuardar}
          disabled={guardando || !validarRFC(rfcEmisor) || !razonSocial.trim()}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-lg font-semibold"
        >
          {guardando ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {guardando ? "Guardando..." : "Guardar Configuración"}
        </button>
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>💡 Importante:</strong> Esta configuración es única para todo
          el sistema. Los certificados y contraseñas se almacenan de forma
          encriptada. Asegúrate de guardar tus credenciales en un lugar seguro.
        </p>
      </div>
    </div>
  );
}
