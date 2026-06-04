import { usePlan } from "../hooks/usePlan";
import { ModuleType, MODULE_NAMES, PLAN_CONFIGS } from "../config/planConfig";

interface RequierePlanProps {
  modulo: ModuleType;
  children: React.ReactNode;
}

export default function RequierePlan({ modulo, children }: RequierePlanProps) {
  const { isModuleActive, getRequiredPlan } = usePlan();

  if (isModuleActive(modulo)) {
    return <>{children}</>;
  }

  const planRequerido = getRequiredPlan(modulo);
  const nombrePlan = PLAN_CONFIGS[planRequerido].displayName;
  const nombreModulo = MODULE_NAMES[modulo];

  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {nombreModulo}
        </h3>
        <p className="text-gray-600 mb-2">
          Esta función requiere el <strong>{nombrePlan}</strong>
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Actualiza tu plan para acceder a todas las funciones de Call Center
        </p>
        
          href="mailto:contacto@lympos.mx"
          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Contactar para actualizar
        </a>
      </div>
    </div>
  );
}