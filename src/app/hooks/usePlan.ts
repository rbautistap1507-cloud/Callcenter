import { usePlanContext } from '../contexts/PlanContext';
import { ModuleType, isModuleAvailable, getMinimumPlanForModule, PLAN_CONFIGS } from '../config/planConfig';

export function usePlan() {
  const { currentPlan, setPlan } = usePlanContext();

  // Verificar si un módulo específico está activo en el plan actual
  const isModuleActive = (module: ModuleType): boolean => {
    return isModuleAvailable(currentPlan, module);
  };

  // Obtener el plan mínimo requerido para un módulo
  const getRequiredPlan = (module: ModuleType) => {
    return getMinimumPlanForModule(module);
  };

  // Verificar si el plan actual necesita actualización para un módulo
  const needsUpgrade = (module: ModuleType): boolean => {
    return !isModuleActive(module);
  };

  // Obtener información del plan actual
  const getPlanInfo = () => {
    return PLAN_CONFIGS[currentPlan];
  };

  // Cambiar el plan actual
  const changePlan = (newPlan: 'starter' | 'pro' | 'enterprise') => {
    setPlan(newPlan);
  };

  return {
    currentPlan,
    isModuleActive,
    getRequiredPlan,
    needsUpgrade,
    getPlanInfo,
    changePlan
  };
}
