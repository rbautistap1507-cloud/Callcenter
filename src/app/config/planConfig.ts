// Configuración de planes y módulos para LYMPOS

export type PlanType = 'starter' | 'pro' | 'enterprise';

export type ModuleType =
  | 'pos'
  | 'inventario'
  | 'corte_caja'
  | 'consultorio'
  | 'recetas'
  | 'antibioticos'
  | 'reportes'
  | 'multisucursal'
  | 'traslados'
  | 'supervisor_central';

export interface PlanConfig {
  name: string;
  displayName: string;
  description: string;
  modules: ModuleType[];
  price?: string;
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  starter: {
    name: 'starter',
    displayName: 'Plan Starter',
    description: 'Perfecto para farmacias independientes que inician',
    price: '$499/mes',
    modules: [
      'pos',
      'inventario',
      'corte_caja'
    ]
  },
  pro: {
    name: 'pro',
    displayName: 'Plan Pro',
    description: 'Ideal para farmacias con consultorio médico',
    price: '$899/mes',
    modules: [
      'pos',
      'inventario',
      'corte_caja',
      'consultorio',
      'recetas',
      'antibioticos',
      'reportes'
    ]
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Plan Enterprise',
    description: 'Solución completa para cadenas de farmacias',
    price: '$1,499/mes',
    modules: [
      'pos',
      'inventario',
      'corte_caja',
      'consultorio',
      'recetas',
      'antibioticos',
      'reportes',
      'multisucursal',
      'traslados',
      'supervisor_central'
    ]
  }
};

export const MODULE_NAMES: Record<ModuleType, string> = {
  pos: 'Punto de Venta',
  inventario: 'Gestión de Inventario',
  corte_caja: 'Cortes de Caja',
  consultorio: 'Consultorio Médico',
  recetas: 'Recetas Médicas',
  antibioticos: 'Control de Antibióticos',
  reportes: 'Reportes Avanzados',
  multisucursal: 'Multi-Sucursal',
  traslados: 'Traslados entre Sucursales',
  supervisor_central: 'Supervisor Central'
};

export const MODULE_DESCRIPTIONS: Record<ModuleType, string> = {
  pos: 'Sistema completo de punto de venta para atención de clientes',
  inventario: 'Control total de productos, stock y movimientos',
  corte_caja: 'Gestión de cortes de caja y conciliación',
  consultorio: 'Sistema de consultas médicas y gestión de pacientes',
  recetas: 'Generación y gestión de recetas médicas',
  antibioticos: 'Control especial de antibióticos con receta médica',
  reportes: 'Reportes detallados de ventas, inventario y operaciones',
  multisucursal: 'Gestión centralizada de múltiples sucursales',
  traslados: 'Transferencia de productos entre sucursales',
  supervisor_central: 'Panel centralizado para supervisión de todas las operaciones'
};

// Función para verificar si un módulo está disponible en un plan
export function isModuleAvailable(plan: PlanType, module: ModuleType): boolean {
  return PLAN_CONFIGS[plan].modules.includes(module);
}

// Función para obtener el plan mínimo requerido para un módulo
export function getMinimumPlanForModule(module: ModuleType): PlanType {
  if (PLAN_CONFIGS.starter.modules.includes(module)) return 'starter';
  if (PLAN_CONFIGS.pro.modules.includes(module)) return 'pro';
  return 'enterprise';
}

// Función para obtener todos los módulos de un plan
export function getPlanModules(plan: PlanType): ModuleType[] {
  return PLAN_CONFIGS[plan].modules;
}

// Función para comparar planes
export function getUpgradePath(currentPlan: PlanType, targetModule: ModuleType): PlanType | null {
  const minimumPlan = getMinimumPlanForModule(targetModule);

  if (currentPlan === minimumPlan) return null;

  const planHierarchy: PlanType[] = ['starter', 'pro', 'enterprise'];
  const currentIndex = planHierarchy.indexOf(currentPlan);
  const targetIndex = planHierarchy.indexOf(minimumPlan);

  return targetIndex > currentIndex ? minimumPlan : null;
}
