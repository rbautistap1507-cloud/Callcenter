import { usePlan } from '../hooks/usePlan';
import { MODULE_NAMES, MODULE_DESCRIPTIONS, ModuleType, PLAN_CONFIGS } from '../config/planConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Check, Lock, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

/**
 * ModuleStatusPanel - Panel que muestra el estado de todos los módulos
 * Útil para dashboards de administración
 */
export default function ModuleStatusPanel() {
  const { currentPlan, isModuleActive, getRequiredPlan, getPlanInfo } = usePlan();
  const planInfo = getPlanInfo();

  // Agrupar módulos por categoría
  const moduleCategories = {
    'Operaciones Básicas': ['pos', 'inventario', 'corte_caja'] as ModuleType[],
    'Servicios Médicos': ['consultorio', 'recetas', 'antibioticos'] as ModuleType[],
    'Análisis y Gestión': ['reportes'] as ModuleType[],
    'Multi-Sucursal': ['multisucursal', 'traslados', 'supervisor_central'] as ModuleType[]
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado de Módulos - {planInfo.displayName}</CardTitle>
        <CardDescription>
          Módulos activos en tu plan actual ({planInfo.modules.length} de 10 módulos)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(moduleCategories).map(([category, modules]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                {category}
              </h3>
              <div className="space-y-2">
                {modules.map((module) => {
                  const isActive = isModuleActive(module);
                  const requiredPlan = getRequiredPlan(module);
                  const requiredPlanConfig = PLAN_CONFIGS[requiredPlan];

                  return (
                    <div
                      key={module}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isActive
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isActive
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {isActive ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {MODULE_NAMES[module]}
                            </p>
                            <Badge
                              variant={isActive ? 'default' : 'outline'}
                              className={
                                isActive
                                  ? 'bg-green-600'
                                  : 'border-amber-500 text-amber-700'
                              }
                            >
                              {isActive ? 'Activo' : `Requiere ${requiredPlanConfig.displayName}`}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {MODULE_DESCRIPTIONS[module]}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Resumen */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Plan Actual: {planInfo.displayName} - {planInfo.price}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {planInfo.description}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
