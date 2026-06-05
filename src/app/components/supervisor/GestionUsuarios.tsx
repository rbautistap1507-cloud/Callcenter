import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserPlus, Users, Key, Power, RefreshCw } from "lucide-react";
import { supabase } from "../../../../utils/supabase/client";
import { projectId, serviceRoleKey } from "../../../../utils/supabase/info";

interface GestionUsuariosProps {
  user: any;
}

export default function GestionUsuarios({ user }: GestionUsuariosProps) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ nombre: "", usuario: "", password: "" });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("perfiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setUsuarios(data || []);
    } catch {
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const createUser = async () => {
    if (!newUser.nombre.trim() || !newUser.usuario.trim() || !newUser.password) {
      toast.error("Todos los campos son obligatorios");
      return;
    }
    if (newUser.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setCreating(true);
    try {
      const emailAuth = `${newUser.usuario.trim().toLowerCase()}@lympos.com`;
      const { data, error } = await supabase.auth.signUp({
        email: emailAuth,
        password: newUser.password,
        options: {
          data: { nombre_completo: newUser.nombre, rol: "supervisor" },
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
      const { data: existe } = await supabase
        .from("perfiles").select("id").eq("id", userId).single();
      if (!existe) {
        const { error: perfilError } = await supabase.from("perfiles").insert({
          id: userId,
          nombre_completo: newUser.nombre.trim(),
          usuario: newUser.usuario.trim().toLowerCase(),
          rol: "supervisor",
          sucursal_id: "principal",
          activo: true,
        });
        if (perfilError) {
          toast.error("Error creando perfil: " + perfilError.message);
          return;
        }
      }
      toast.success(`Usuario "${newUser.usuario}" creado. Ya puede iniciar sesión.`);
      setNewUser({ nombre: "", usuario: "", password: "" });
      await fetchUsers();
    } catch (err: any) {
      toast.error("Error de conexión: " + (err?.message || "desconocido"));
    } finally {
      setCreating(false);
    }
  };

  const toggleActivo = async (u: any) => {
    try {
      const { error } = await supabase
        .from("perfiles")
        .update({ activo: !u.activo })
        .eq("id", u.id);
      if (error) {
        toast.error("Error al actualizar: " + error.message);
        return;
      }
      toast.success(`Usuario ${!u.activo ? "activado" : "desactivado"}`);
      await fetchUsers();
    } catch {
      toast.error("Error al actualizar el usuario");
    }
  };

  const editarPassword = async (u: any) => {
    const nueva = prompt(`Nueva contraseña para ${u.nombre_completo || u.usuario} (mínimo 6 caracteres):`);
    if (!nueva || nueva.length < 6) {
      toast.error("Contraseña inválida, mínimo 6 caracteres");
      return;
    }
    try {
      const res = await fetch(`https://${projectId}.supabase.co/auth/v1/admin/users/${u.id}`, {
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
        toast.success(`Contraseña de ${u.usuario} actualizada`);
      } else {
        toast.error("Error: " + (data.message || "No se pudo actualizar"));
      }
    } catch {
      toast.error("Error al actualizar contraseña");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Users className="w-6 h-6" /> Gestión de Usuarios
      </h2>

      {/* Crear usuario */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> Nuevo Usuario
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input
              type="text"
              value={newUser.nombre}
              onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input
              type="text"
              value={newUser.usuario}
              onChange={(e) => setNewUser({ ...newUser, usuario: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="jperez"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="text"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>
        <button
          onClick={createUser}
          disabled={creating}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
        >
          <UserPlus className="w-4 h-4" />
          {creating ? "Creando..." : "Crear Usuario"}
        </button>
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-700">Usuarios del Sistema</h3>
          <button onClick={fetchUsers} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </button>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-900">{u.nombre_completo || "—"}</td>
                <td className="px-6 py-3 text-sm text-gray-600 font-mono">{u.usuario}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{u.rol === "administrador" ? "Administrador" : "Usuario"}</td>
                <td className="px-6 py-3 text-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${u.activo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => editarPassword(u)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                      title="Cambiar contraseña"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    {u.rol !== "administrador" && (
                      <button
                        onClick={() => toggleActivo(u)}
                        className={`p-1 rounded hover:bg-gray-100 ${u.activo ? "text-red-600" : "text-green-600"}`}
                        title={u.activo ? "Desactivar" : "Activar"}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {loading ? "Cargando..." : "No hay usuarios registrados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
