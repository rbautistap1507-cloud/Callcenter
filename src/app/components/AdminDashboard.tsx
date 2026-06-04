import { useState, useEffect } from "react";
import { User } from "../shared";
import { supabase } from "../../../utils/supabase/client";
import { toast } from "sonner";
import {
  Shield, Users, Settings, LogOut, Check, LayoutDashboard,
  TrendingUp, Stethoscope, RefreshCw, Trash2, AlertTriangle,
} from "lucide-react";
import GerenteDashboard from "./GerenteDashboard";
import PlanSwitcher from "./PlanSwitcher";

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

interface Permissions {
  [role: string]: { [feature: string]: boolean };
}

const ROLES = ["supervisor", "gerente", "farmaceutico", "medico"];
const FEATURES = [
  { id: "ver_inventario", label: "Ver Inventario" },
  { id: "realizar_ventas", label: "Realizar Ventas" },
  { id: "realizar_compras", label: "Realizar Compras" },
  { id: "realizar_traslados", label: "Realizar Traslados" },
  { id: "ver_reportes", label: "Ver Reportes" },
  { id: "gestionar_personal", label: "Gestionar Personal" },
  { id: "ver_dashboard", label: "Ver Dashboard" },
  { id: "realizar_ajustes", label: "Realizar Ajustes" },
  { id: "ver_consultas", label: "Ver Consultas" },
  { id: "gestionar_expediente", label: "Gestionar Expediente" },
];

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  farmaceutico: {
    ver_inventario: false, realizar_ventas: true, realizar_compras: false,
    realizar_traslados: false, ver_reportes: false, gestionar_personal: false,
    ver_dashboard: false, realizar_ajustes: false, ver_consultas: false, gestionar_expediente: false,
  },
  medico: {
    ver_inventario: false, realizar_ventas: false, realizar_compras: false,
    realizar_traslados: false, ver_reportes: false, gestionar_personal: false,
    ver_dashboard: false, realizar_ajustes: false, ver_consultas: true, gestionar_expediente: true,
  },
  supervisor: {
    ver_inventario: true, realizar_ventas: false, realizar_compras: true,
    realizar_traslados: true, ver_reportes: true, gestionar_personal: true,
    ver_dashboard: true, realizar_ajustes: true, ver_consultas: false, gestionar_expediente: false,
  },
  gerente: {
    ver_inventario: true, realizar_ventas: false, realizar_compras: true,
    realizar_traslados: true, ver_reportes: true, gestionar_personal: true,
    ver_dashboard: true, realizar_ajustes: true, ver_consultas: false, gestionar_expediente: false,
  },
};

type ActiveTab = "permissions" | "gerente_view" | "test_data" | "diagnostics" | "user_management";

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("permissions");
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [auditLogs] = useState<any[]>([]);

  // Gestión de pruebas
  const [testUsers, setTestUsers] = useState<any[]>([]);
  const [loadingTestUsers, setLoadingTestUsers] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  // Gestión de usuarios
  const [newUser, setNewUser] = useState({
    nombre: "", usuario: "", password: "",
    role: "gerente" as "gerente" | "supervisor",
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

  useEffect(() => { fetchPermissions(); }, []);

  useEffect(() => {
    if (activeTab === "diagnostics") fetchDiagnostics();
    if (activeTab === "user_management") fetchUsers();
    if (activeTab === "test_data") fetchTestUsers();
  }, [activeTab]);

  // ── Permisos ────────────────────────────────────────────

  const fetchPermissions = () => {
    try {
      const stored = localStorage.getItem("lympos_permissions");
      setPermissions(stored ? JSON.parse(stored) : DEFAULT_PERMISSIONS);
    } catch { setPermissions(DEFAULT_PERMISSIONS); }
  };

  const savePermissions = async () => {
    setLoading(true);
    try {
      localStorage.setItem("lympos_permissions", JSON.stringify(permissions));
      toast.success("Permisos actualizados correctamente");
    } finally { setLoading(false); }
  };

  const togglePermission = (role: string, feature: string) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: { ...prev[role], [feature]: !prev[role]?.[feature] },
    }));
  };

  const fetchDiagnostics = () => {
    setSystemStatus({ initialized: true, timestamp: new Date().toISOString(), version: "v1.0" });
  };

  // ── Gestión de Pruebas ──────────────────────────────────

  const fetchTestUsers = async () => {
    setLoadingTestUsers(true);
    try {
      const { data, error } = await supabase
        .from("perfiles").select("*").order("created_at", { ascending: false });
      if (!error) setTestUsers(data || []);
    } catch { toast.error("Error al cargar usuarios"); }
    finally { setLoadingTestUsers(false); }
  };

  const deleteTestUser = async (userId: string, nombre: string) => {
    if (!confirm(`¿Eliminar el usuario "${nombre}"? Esta acción no se puede deshacer.`)) return;
    setDeletingUserId(userId);
    try {
      await supabase.from("perfiles").delete().eq("id", userId);
      toast.success(`Usuario "${nombre}" eliminado`);
      fetchTestUsers();
    } catch { toast.error("Error al eliminar usuario"); }
    finally { setDeletingUserId(null); }
  };

  const deleteAllTestUsers = async () => {
    if (!confirm("¿Eliminar TODOS los usuarios? Esta acción no se puede deshacer.")) return;
    setDeletingAll(true);
    try {
      await supabase.from("perfiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      toast.success("Todos los usuarios han sido eliminados");
      setTestUsers([]);
    } catch { toast.error("Error al eliminar usuarios"); }
    finally { setDeletingAll(false); }
  };

  // ── Gestión de Usuarios ─────────────────────────────────

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("perfiles").select("*")
        .in("rol", ["gerente", "supervisor"])
        .order("created_at", { ascending: false });
      if (!error) setUsuarios(data || []);
    } catch { toast.error("Error al cargar usuarios"); }
  };

 const editarPassword = async (userId: string, userName: string) => {
    const nueva = prompt(`Nueva contraseña para ${userName} (mínimo 6 caracteres):`);
    if (!nueva || nueva.length < 6) { 
      toast.error("Contraseña inválida, mínimo 6 caracteres"); 
      return; 
    }
    try {
      const { serviceRoleKey } = await import("../../../utils/supabase/info");
      const res = await fetch(`https://teklpnqyqvpzmvurhjud.supabase.co/auth/v1/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ password: nueva }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Contraseña de ${userName} actualizada correctamente`);
      } else {
        toast.error("Error: " + (data.message || "No se pudo actualizar"));
      }
    } catch (error) {
      toast.error("Error al actualizar contraseña");
    }
  };

  const createUser = async () => {
    if (!newUser.nombre || !newUser.usuario || !newUser.password) {
      toast.error("Todos los campos son obligatorios");
      return;
    }
    if (newUser.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setCreatingUser(true);
    try {
      // El email de auth se construye como usuario@lympos.com
      // igual que como funciona el Login
      const emailAuth = `${newUser.usuario.trim().toLowerCase()}@lympos.com`;

      const { data, error } = await supabase.auth.signUp({
        email: emailAuth,
        password: newUser.password,
        options: {
          data: {
            nombre_completo: newUser.nombre,
            rol: newUser.role,
          },
        },
      });

      if (error) {
        toast.error("Error creando usuario: " + error.message);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        toast.error("No se pudo obtener el ID del usuario. Verifica que 'Confirm email' esté desactivado en Supabase.");
        return;
      }

      // Verificar si ya existe el perfil
      const { data: perfilExiste } = await supabase
        .from("perfiles").select("id").eq("id", userId).single();

      if (!perfilExiste) {
        const { error: profileError } = await supabase.from("perfiles").insert({
          id: userId,
          nombre_completo: newUser.nombre,
          usuario: newUser.usuario.trim().toLowerCase(),
          rol: newUser.role,
          sucursal_id: null,
          activo: true,
        });
        if (profileError) {
          toast.error("Error creando perfil: " + profileError.message);
          return;
        }
      }

      toast.success(`Usuario "${newUser.usuario}" creado correctamente. Ya puede iniciar sesión.`);
      await fetchUsers();
      setNewUser({ nombre: "", usuario: "", password: "", role: "gerente" });

    } catch (err: any) {
      toast.error("Error de conexión: " + (err?.message || "desconocido"));
    } finally {
      setCreatingUser(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setTogglingUser(userId);
    try {
      await supabase.from("perfiles").update({ activo: !currentStatus }).eq("id", userId);
      toast.success(!currentStatus ? "Usuario habilitado" : "Usuario deshabilitado");
      fetchUsers();
    } catch { toast.error("Error al actualizar"); }
    finally { setTogglingUser(null); }
  };

  const getRolBadge = (rol: string) => {
    const colors: Record<string, string> = {
      gerente: "bg-orange-100 text-orange-800",
      supervisor: "bg-blue-100 text-blue-800",
      farmaceutico: "bg-green-100 text-green-800",
      medico: "bg-purple-100 text-purple-800",
      administrador: "bg-red-100 text-red-800",
    };
    return colors[rol] || "bg-gray-100 text-gray-800";
  };

  // ── Renders ─────────────────────────────────────────────

  const renderPermissionsManager = () => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Administración de Permisos</h2>
          <p className="text-gray-600">Control de acceso por rol y funcionalidad</p>
        </div>
        <button onClick={savePermissions} disabled={loading}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
          {loading ? "Guardando..." : "Guardar Cambios"}<Check className="w-4 h-4" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase">Funcionalidad</th>
              {ROLES.map((role) => (
                <th key={role} className="px-6 py-4 text-center text-sm font-semibold text-gray-600 uppercase">
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {FEATURES.map((feature) => (
              <tr key={feature.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{feature.label}</td>
                {ROLES.map((role) => {
                  const isEnabled = permissions[role]?.[feature.id];
                  return (
                    <td key={`${role}-${feature.id}`} className="px-6 py-4 text-center">
                      <button onClick={() => togglePermission(role, feature.id)}
                        className={`w-6 h-6 rounded border flex items-center justify-center transition-colors mx-auto ${
                          isEnabled ? "bg-green-500 border-green-600 text-white" : "bg-white border-gray-300 hover:border-gray-400"
                        }`}>
                        {isEnabled && <Check className="w-4 h-4" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTestData = () => {
    const byRol = (rol: string) => testUsers.filter((u) => u.rol === rol);
    const roles = [
      { key: "gerente", label: "Gerentes" },
      { key: "supervisor", label: "Supervisores" },
      { key: "farmaceutico", label: "Farmacéuticos" },
      { key: "medico", label: "Médicos" },
    ];

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-red-50 flex justify-between items-center flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold text-red-800 flex items-center gap-2">
                <Stethoscope className="w-6 h-6" />Gestión de Datos de Prueba
              </h2>
              <p className="text-red-600 mt-1">⚠️ Solo para desarrolladores. Usar con precaución.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchTestUsers}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm">
                <RefreshCw className="w-4 h-4" />Actualizar
              </button>
              <button onClick={deleteAllTestUsers} disabled={deletingAll || testUsers.length === 0}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                <Trash2 className="w-4 h-4" />{deletingAll ? "Eliminando..." : "Eliminar Todos"}
              </button>
            </div>
          </div>

          <div className="p-6">
            {loadingTestUsers ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                Cargando usuarios...
              </div>
            ) : testUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 font-medium text-lg">Sin usuarios registrados</p>
                <p className="text-gray-400 text-sm mt-1">El sistema está limpio y listo para producción</p>
              </div>
            ) : (
              <div className="space-y-6">
                {roles.map(({ key, label }) => {
                  const users = byRol(key);
                  if (users.length === 0) return null;
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-semibold text-gray-700">{label}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRolBadge(key)}`}>
                          {users.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {users.map((u) => (
                          <div key={u.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {u.nombre_completo || u.nombre || "—"}
                              </p>
                              <p className="text-xs text-gray-500">
                                Usuario: <span className="font-mono">{u.usuario || "—"}</span>
                                {u.created_at && (
                                  <span className="ml-2">· {new Date(u.created_at).toLocaleDateString("es-MX")}</span>
                                )}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteTestUser(u.id, u.nombre_completo || u.usuario || u.id)}
                              disabled={deletingUserId === u.id}
                              className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                              <Trash2 className="w-3 h-3" />
                              {deletingUserId === u.id ? "..." : "Eliminar"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Importante</p>
            <ul className="space-y-1 list-disc list-inside text-yellow-700">
              <li>Eliminar un usuario solo borra el perfil — la cuenta de Auth en Supabase persiste</li>
              <li>Los usuarios eliminados del perfil no podrán acceder al sistema</li>
              <li>Usa "Eliminar Todos" solo al finalizar las pruebas del día</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderUserManagement = () => (
    <div className="max-w-5xl mx-auto space-y-6">
     
           {/* Formulario crear usuario */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-blue-50">
          <h2 className="text-2xl font-bold text-blue-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />Crear Nuevo Usuario
          </h2>
          <p className="text-gray-600 mt-1">Agrega gerentes y supervisores al sistema</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre Completo *</label>
              <input type="text" value={newUser.nombre}
                onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                placeholder="Ej: María García López"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Usuario *
                <span className="text-xs text-gray-400 ml-1">— con esto inicia sesión</span>
              </label>
              <input type="text" value={newUser.usuario}
                onChange={(e) => setNewUser({ ...newUser, usuario: e.target.value.toLowerCase().replace(/\s/g, "") })}
                placeholder="Ej: supervisor.reyna"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              {newUser.usuario && (
                <p className="text-xs text-gray-400 mt-1">
                  Email auth: <span className="font-mono">{newUser.usuario}@lympos.com</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contraseña *</label>
              <input type="password" value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rol *</label>
              <select value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "gerente" | "supervisor" })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white">
                <option value="gerente">Gerente</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
          </div>
          <div className="mt-6">
            <button onClick={createUser} disabled={creatingUser}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center gap-2">
              {creatingUser
                ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Creando...</>
                : <><Users className="w-4 h-4" />Crear Usuario</>}
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Lista de Usuarios</h3>
            <p className="text-sm text-gray-600 mt-1">Gerentes y supervisores registrados</p>
          </div>
          <button onClick={fetchUsers} className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          {usuarios.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usuarios.map((u, i) => {
                    const isActivo = u.activo !== false;
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.nombre_completo || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">{u.usuario || "—"}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRolBadge(u.rol)}`}>{u.rol}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button onClick={() => toggleUserStatus(u.id, isActivo)} disabled={togglingUser === u.id}
                            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                              isActivo ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"
                            } disabled:opacity-50`}>
                            {togglingUser === u.id ? "..." : isActivo ? "✓ Habilitado" : "✗ Deshabilitado"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button onClick={() => editarPassword(u.id, u.nombre_completo || u.usuario)}
                            className="px-3 py-1 rounded text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white">
                              Editar
                        </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No hay usuarios registrados aún</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-gray-900 text-white shadow-md z-50 relative">
        <div className="max-w-full mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-lg"><Shield className="w-6 h-6" /></div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Panel de Administrador</h1>
              <p className="text-xs text-gray-400">Farmacias LYM</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <PlanSwitcher />
            <div className="text-right mr-4">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-gray-400">Administrador</p>
            </div>
            <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-gray-800 px-6 py-2 flex gap-2 overflow-x-auto">
          {[
            { id: "permissions", label: "Permisos", icon: Settings, active: "bg-indigo-600" },
            { id: "gerente_view", label: "Vista Gerente", icon: TrendingUp, active: "bg-orange-600" },
            { id: "test_data", label: "Gestión de Pruebas", icon: Stethoscope, active: "bg-red-600" },
            { id: "diagnostics", label: "Diagnósticos", icon: LayoutDashboard, active: "bg-yellow-600" },
            { id: "user_management", label: "Gestión de Usuarios", icon: Users, active: "bg-blue-600" },
          ].map(({ id, label, icon: Icon, active }) => (
            <button key={id} onClick={() => setActiveTab(id as ActiveTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all whitespace-nowrap ${
                activeTab === id ? `${active} text-white shadow-lg` : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "permissions" && (
          <div className="p-8 overflow-y-auto h-full">
            <div className="max-w-6xl mx-auto">{renderPermissionsManager()}</div>
          </div>
        )}
        {activeTab === "gerente_view" && (
          <div className="flex-1 overflow-y-auto border-t-4 border-orange-500 relative">
            <div className="absolute top-0 left-0 bg-orange-500 text-white text-xs px-3 py-1 rounded-br-lg z-50 font-bold shadow-md">
              VISTA DE GERENTE (ADMIN MODE)
            </div>
            <GerenteDashboard user={{ ...user, role: "gerente" }} onLogout={() => setActiveTab("permissions")} />
          </div>
        )}
        {activeTab === "test_data" && (
          <div className="p-8 overflow-y-auto h-full">{renderTestData()}</div>
        )}
        {activeTab === "diagnostics" && (
          <div className="p-8 overflow-y-auto h-full">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-yellow-50">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <LayoutDashboard className="w-6 h-6 text-yellow-600" />Diagnóstico del Sistema
                  </h2>
                </div>
                <div className="p-6">
                  {systemStatus && (
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Estado:</span>
                        <span className="font-bold text-green-600">✅ Operativo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Última verificación:</span>
                        <span className="text-gray-600">{new Date(systemStatus.timestamp).toLocaleString("es-MX")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Versión:</span>
                        <span className="text-gray-600">{systemStatus.version}</span>
                      </div>
                    </div>
                  )}
                  <button onClick={fetchDiagnostics}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />Actualizar
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800">Historial de Auditoría</h3>
                </div>
                <div className="p-6 text-center py-8 text-gray-500">
                  {auditLogs.length === 0 ? "📭 No hay registros de auditoría disponibles" : null}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "user_management" && (
          <div className="p-8 overflow-y-auto h-full">{renderUserManagement()}</div>
        )}
      </div>
    </div>
  );
}