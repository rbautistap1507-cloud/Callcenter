import { ReactNode } from 'react';
import { ModuleType } from '../config/planConfig';
import { usePlan } from '../hooks/usePlan';
import UpgradeScreen from './UpgradeScreen';

interface ModuleGuardProps {
  module: ModuleType;
  children: ReactNode;
}

/**
 * ModuleGuard - Componente que protege módulos según el plan activo
 *
 * Uso:
 * <ModuleGuard module="consultorio">
 *   <MiComponente />
 * </ModuleGuard>
 */
export default function ModuleGuard({ module, children }: ModuleGuardProps) {
  // const { isModuleActive } = usePlan();
  // if (!isModuleActive(module)) {
  //   return <UpgradeScreen module={module} />;
  // }
  return <>{children}</>;
}