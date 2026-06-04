import { useState } from "react";
import { supabase } from "../../../utils/supabase/client";

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    try {
      const email = `${usuario.trim().toLowerCase()}@lympos.com`;

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !data.user) {
        console.error("Auth error:", authError);
        setError("Usuario o contraseña incorrectos");
        return;
      }

      const { data: perfil, error: perfilError } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (perfilError || !perfil) {
        setError("Perfil no encontrado. Contacta al administrador.");
        return;
      }

      if (!perfil.activo) {
        setError("Usuario deshabilitado. Contacta al administrador.");
        return;
      }

      onLogin({
        id: perfil.id,
        username: perfil.usuario,
        name: perfil.nombre_completo,
        nombre: perfil.nombre_completo,
        email: email,
        role: perfil.rol === "administrador" ? "admin" : perfil.rol,
        sucursalId: perfil.sucursal_id,
        cedula: perfil.cedula_profesional,
        especialidad: perfil.especialidad,
        escuela: perfil.universidad,
        logoEscuela: perfil.logo_universidad,
        turno: perfil.turno,
      });

    } catch (err: any) {
      console.error("Login error:", err);
      setError("Error al iniciar sesión: " + (err?.message || ""));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Panel izquierdo */}
      <div className="flex-1 flex flex-col justify-center px-16 py-12">
        <div className="mb-10">
          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight">Call Center</h1>
          <p className="text-gray-500 text-lg mt-2">Solución Tecnológica Integral para farmacias</p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md">
          {[
            { color: "bg-blue-500", label: "Farmacéutico", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" },
            { color: "bg-green-500", label: "Médico", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
            { color: "bg-purple-600", label: "Supervisor", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
            { color: "bg-orange-500", label: "Gerente", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
          ].map(({ color, label, icon }) => (
            <div key={label} className={`${color} rounded-2xl p-6 flex flex-col items-start gap-3`}>
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
              <span className="text-white font-bold text-lg">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <p className="text-gray-400 text-sm">Sistema integrado de gestión farmacéutica</p>
          <p className="text-gray-400 text-sm">• Punto de Venta • Recetas Médicas • Inventario • Reportes</p>
        </div>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="w-full max-w-lg flex items-center justify-center px-12 py-12 border-l border-gray-100">
        <div className="w-full">
          <div className="border border-blue-200 rounded-2xl p-10 shadow-sm">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Iniciar Sesión</h2>
            <p className="text-gray-500 text-sm mb-8">Ingresa tus credenciales para acceder al sistema</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Usuario</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ej: supervisor.reyna"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={cargando || !usuario || !password}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
              >
                {cargando ? "Iniciando sesión..." : "Iniciar Sesión"}
              </button>
            </form>
          </div>
          <p className="text-center text-gray-400 text-xs mt-6">Call Center © 2026</p>
        </div>
      </div>
    </div>
  );
}