import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import Login from "./components/Login";
import FarmaceuticoDashboard from "./components/FarmaceuticoDashboard";
import MedicoDashboard from "./components/MedicoDashboard";
import SupervisorDashboard from "./components/SupervisorDashboard";
import GerenteDashboard from "./components/GerenteDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { toast, Toaster } from "sonner";
import { User, SUCURSALES } from "./shared";
import { PlanProvider } from "./contexts/PlanContext";
import { usePlan } from "./hooks/usePlan";

// Componente interno que ya tiene acceso al PlanProvider
function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { changePlan } = usePlan(); // ✅ Aquí sí funciona porque está dentro de PlanProvider

  useEffect(() => {
    const storedUser = localStorage.getItem("lympos-user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        if (userData.plan) {
          changePlan(userData.plan as any);
        }
      } catch (e) {
        localStorage.removeItem("lympos-user");
      }
    }
    initializeData();
    setLoading(false);
  }, []);

  const initializeData = async () => {
    try {
      console.log("Verificando inicialización del sistema...");
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/init-data`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      console.log("Respuesta del servidor:", data);
      localStorage.setItem("lympos-initialized-v5", "true");
    } catch (error) {
      console.error("Error inicializando datos:", error);
      localStorage.setItem("lympos-initialized-v5", "true");
    }
  };

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem("lympos-user", JSON.stringify(userData));
    if (userData.plan) {
      changePlan(userData.plan as any);
    }
    toast.success(`Bienvenido ${userData.name}`);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("lympos-user");
    toast.success("Sesión cerrada");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-800 to-indigo-900">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {(user.role === "admin" || user.role === "supervisor" || user.role === "gerente") && (
        <SupervisorDashboard user={user} onLogout={handleLogout} />
      )}
      {user.role === "farmaceutico" && (
        <FarmaceuticoDashboard user={user} onLogout={handleLogout} />
      )}
      {user.role === "medico" && (
        <MedicoDashboard user={user} onLogout={handleLogout} />
      )}
      <Toaster position="top-right" richColors />
    </div>
  );
}

// Componente raíz que envuelve todo con PlanProvider
export default function App() {
  return (
    <PlanProvider initialPlan="starter">
      <AppContent />
    </PlanProvider>
  );
}
