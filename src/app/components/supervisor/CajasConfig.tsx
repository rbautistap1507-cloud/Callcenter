import { useState, useEffect } from "react";
import { SUCURSALES } from "../../shared";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { toast } from "sonner";
import {
  Building,
  Save,
  CheckCircle,
  Monitor,
  Minus,
  Plus,
} from "lucide-react";

interface CajasConfigData {
  sucursalId: string;
  numeroCajas: number;
  updatedAt?: string;
}

export default function CajasConfig() {
  const [configs, setConfigs] = useState<Record<string, CajasConfigData>>({});
  const [loading, setLoading] = useState(false);
  const [savedSucursal, setSavedSucursal] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas-config`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        const map: Record<string, CajasConfigData> = {};
        (data.configs || []).forEach((cfg: any) => {
          map[cfg.sucursalId] = cfg;
        });
        setConfigs(map);
      }
    } catch (error) {
      console.error("Error cargando configuración de cajas:", error);
    }
  };

  const getNumeroCajas = (sucursalId: string) => {
    return configs[sucursalId]?.numeroCajas || 1;
  };

  const handleChangeNumeroCajas = (sucursalId: string, delta: number) => {
    const current = getNumeroCajas(sucursalId);
    const next = Math.min(5, Math.max(1, current + delta));
    setConfigs((prev) => ({
      ...prev,
      [sucursalId]: {
        ...prev[sucursalId],
        sucursalId,
        numeroCajas: next,
      },
    }));
  };

  const handleSetNumeroCajas = (sucursalId: string, num: number) => {
    setConfigs((prev) => ({
      ...prev,
      [sucursalId]: {
        ...prev[sucursalId],
        sucursalId,
        numeroCajas: num,
      },
    }));
  };

  const handleGuardar = async (sucursalId: string) => {
    const numeroCajas = getNumeroCajas(sucursalId);
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/cajas-config/${sucursalId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ numeroCajas }),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast.success(`Configuración guardada para ${SUCURSALES.find((s) => s.id === sucursalId)?.nombre}`);
        setSavedSucursal(sucursalId);
        setTimeout(() => setSavedSucursal(null), 2000);
        loadConfigs();
      } else {
        toast.error(data.error || "Error al guardar configuración");
      }
    } catch (error) {
      console.error("Error guardando configuración de cajas:", error);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const getColorForNum = (num: number) => {
    const colors = [
      "bg-teal-500",
      "bg-blue-500",
      "bg-indigo-500",
      "bg-purple-500",
      "bg-pink-500",
    ];
    return colors[num - 1] || "bg-gray-500";
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Monitor className="w-7 h-7 text-indigo-600" />
          Configuración de Cajas por Sucursal
        </h2>
        <p className="text-gray-500 mt-1 text-sm">
          Define el número de cajas disponibles por sucursal (máximo 5). Los farmacéuticos podrán elegir su caja al iniciar turno.
        </p>
      </div>

      {/* Cards por sucursal */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {SUCURSALES.map((sucursal) => {
          const num = getNumeroCajas(sucursal.id);
          const isSaved = savedSucursal === sucursal.id;

          return (
            <div
              key={sucursal.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Encabezado de la card */}
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">
                      {sucursal.nombre}
                    </h3>
                    <p className="text-blue-100 text-xs mt-0.5">
                      {sucursal.id}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {/* Selector de número de cajas */}
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Número de cajas asignadas
                  </label>

                  {/* Stepper */}
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <button
                      onClick={() => handleChangeNumeroCajas(sucursal.id, -1)}
                      disabled={num <= 1}
                      className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="text-center">
                      <span className="text-5xl font-black text-indigo-600">
                        {num}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {num === 1 ? "caja" : "cajas"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleChangeNumeroCajas(sucursal.id, 1)}
                      disabled={num >= 5}
                      className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  {/* Selector visual 1-5 */}
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => handleSetNumeroCajas(sucursal.id, n)}
                        className={`w-10 h-10 rounded-lg font-bold text-sm transition-all border-2 ${
                          num === n
                            ? "bg-indigo-600 text-white border-indigo-600 scale-110 shadow-md"
                            : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview de cajas */}
                <div className="mb-5 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Vista previa de cajas
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: num }, (_, i) => i + 1).map((cajaNum) => (
                      <div
                        key={cajaNum}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${getColorForNum(cajaNum)}`}
                      >
                        <Monitor className="w-3 h-3" />
                        Caja {cajaNum}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Config guardada previamente */}
                {configs[sucursal.id]?.updatedAt && (
                  <p className="text-xs text-gray-400 mb-3">
                    Última actualización:{" "}
                    {new Date(configs[sucursal.id].updatedAt!).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}

                {/* Botón guardar */}
                <button
                  onClick={() => handleGuardar(sucursal.id)}
                  disabled={loading}
                  className={`w-full py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                    isSaved
                      ? "bg-green-500 text-white"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {isSaved ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      ¡Guardado!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {loading ? "Guardando..." : "Guardar Configuración"}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nota informativa */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-3">
          <Monitor className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">¿Cómo funciona?</p>
            <ul className="text-sm text-blue-700 mt-1 space-y-1 list-disc list-inside">
              <li>Si una sucursal tiene <strong>1 caja</strong>, el farmacéutico abrirá la Caja 1 directamente sin preguntar.</li>
              <li>Si tiene <strong>más de 1 caja</strong>, el farmacéutico deberá seleccionar qué caja va a abrir al inicio de su turno.</li>
              <li>Máximo <strong>5 cajas</strong> por sucursal.</li>
              <li>Los cambios aplican inmediatamente para el siguiente turno.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
