# ✅ Checklist de Implementación - Sistema de Planes LYMPOS

## 🎯 Estado Actual

### ✅ Completado

- [x] Archivo de configuración de planes (`planConfig.ts`)
- [x] Context Provider para el plan (`PlanContext.tsx`)
- [x] Hook `usePlan()` para usar en componentes
- [x] Componente `ModuleGuard` para proteger módulos
- [x] Componente `UpgradeScreen` (pantalla de actualización)
- [x] Componente `PlanSwitcher` (selector de plan para admin)
- [x] Componente `ModuleStatusPanel` (panel de estado)
- [x] Integración del `PlanProvider` en `App.tsx`
- [x] Integración del `PlanSwitcher` en `AdminDashboard.tsx`
- [x] Documentación completa del sistema

### 📋 Archivos Creados

```
✅ src/app/config/planConfig.ts
✅ src/app/contexts/PlanContext.tsx
✅ src/app/hooks/usePlan.ts
✅ src/app/components/ModuleGuard.tsx
✅ src/app/components/UpgradeScreen.tsx
✅ src/app/components/PlanSwitcher.tsx
✅ src/app/components/ModuleStatusPanel.tsx
✅ PLAN_SYSTEM_README.md
✅ PLAN_SYSTEM_USAGE.md
✅ PLAN_INTEGRATION_EXAMPLES.md
✅ PLAN_VISUAL_GUIDE.md
✅ PLAN_IMPLEMENTATION_CHECKLIST.md (este archivo)
```

---

## 🚀 Próximos Pasos de Implementación

### Fase 1: Integración Básica (Recomendado hacer ahora)

- [ ] **FarmaceuticoDashboard.tsx**
  - [ ] Importar `usePlan`
  - [ ] Proteger tab de Reportes con `ModuleGuard` (si existe)
  - [ ] Ocultar botones de funciones avanzadas si no están activas

- [ ] **MedicoDashboard.tsx**
  - [ ] Importar `usePlan`
  - [ ] Proteger generación de recetas con validación de módulo
  - [ ] Proteger control de antibióticos con validación

- [ ] **SupervisorDashboard.tsx**
  - [ ] Importar `usePlan`
  - [ ] Proteger funciones de traslados
  - [ ] Proteger gestión multi-sucursal

- [ ] **GerenteDashboard.tsx**
  - [ ] Importar `usePlan`
  - [ ] Proteger reportes avanzados
  - [ ] Mostrar información del plan actual

### Fase 2: Mejoras Visuales (Opcional)

- [ ] Agregar `ModuleStatusPanel` en AdminDashboard
- [ ] Agregar badges de plan requerido en botones bloqueados
- [ ] Crear página de comparación de planes
- [ ] Agregar tooltips explicativos

### Fase 3: Integración con Backend (Para producción)

- [ ] Crear endpoint para obtener plan del usuario
  ```tsx
  GET /make-server-7d799f19/user-plan?userId={id}
  ```

- [ ] Crear endpoint para actualizar plan
  ```tsx
  POST /make-server-7d799f19/update-user-plan
  Body: { userId, plan }
  ```

- [ ] Cargar plan del usuario al hacer login
- [ ] Sincronizar cambios de plan con Supabase
- [ ] Agregar validación de plan en el backend

### Fase 4: Analytics y Optimización (Opcional)

- [ ] Registrar intentos de acceso a módulos bloqueados
- [ ] Crear reporte de uso de módulos
- [ ] Implementar sistema de notificaciones de upgrade
- [ ] Agregar trials temporales de módulos premium

---

## 🔍 Verificación de Implementación

### Test 1: Cambio de Plan
1. [ ] Abrir AdminDashboard
2. [ ] Hacer clic en PlanSwitcher
3. [ ] Cambiar a "Plan Starter"
4. [ ] Verificar que solo 3 módulos están activos
5. [ ] Cambiar a "Plan Pro"
6. [ ] Verificar que 7 módulos están activos
7. [ ] Cambiar a "Plan Enterprise"
8. [ ] Verificar que 10 módulos están activos

### Test 2: ModuleGuard
1. [ ] Cambiar a "Plan Starter"
2. [ ] Intentar acceder a un módulo bloqueado
3. [ ] Verificar que aparece UpgradeScreen
4. [ ] Hacer clic en "Actualizar a Pro"
5. [ ] Verificar que el módulo ahora está disponible

### Test 3: Hook usePlan
1. [ ] En un componente, usar `const { isModuleActive } = usePlan()`
2. [ ] Verificar que `isModuleActive('pos')` retorna `true`
3. [ ] Cambiar a "Plan Starter"
4. [ ] Verificar que `isModuleActive('reportes')` retorna `false`

### Test 4: Persistencia
1. [ ] Cambiar a "Plan Starter"
2. [ ] Recargar la página
3. [ ] Verificar que el plan sigue siendo "Starter"
4. [ ] Abrir DevTools → Application → Local Storage
5. [ ] Verificar que existe `lympos-plan` con valor "starter"

---

## 📝 Ejemplos de Código para Cada Dashboard

### FarmaceuticoDashboard.tsx

```tsx
import { usePlan } from './hooks/usePlan';
import ModuleGuard from './components/ModuleGuard';

// En el componente:
const { isModuleActive } = usePlan();

// En el JSX:
<TabsContent value="reportes">
  <ModuleGuard module="reportes">
    <ReportesView />
  </ModuleGuard>
</TabsContent>
```

### MedicoDashboard.tsx

```tsx
import { usePlan } from './hooks/usePlan';

// En el componente:
const { isModuleActive } = usePlan();

const handleGenerarReceta = () => {
  if (!isModuleActive('recetas')) {
    toast.error('Las recetas requieren el plan Pro');
    return;
  }
  // Generar receta...
};
```

### SupervisorDashboard.tsx

```tsx
import { usePlan } from './hooks/usePlan';

// En el componente:
const { isModuleActive } = usePlan();

// En el JSX:
{isModuleActive('traslados') && (
  <Button onClick={abrirTraslados}>
    Gestionar Traslados
  </Button>
)}
```

### GerenteDashboard.tsx

```tsx
import { usePlan } from './hooks/usePlan';
import ModuleGuard from './components/ModuleGuard';

// En el componente:
const { getPlanInfo } = usePlan();

// En el JSX:
<div className="text-sm text-gray-600">
  Plan actual: {getPlanInfo().displayName}
</div>

<ModuleGuard module="reportes">
  <ReportesAvanzadosSection />
</ModuleGuard>
```

### AdminDashboard.tsx

```tsx
// Ya integrado con PlanSwitcher
// Opcional: Agregar ModuleStatusPanel

import ModuleStatusPanel from './components/ModuleStatusPanel';

// En una nueva pestaña:
<TabsContent value="module_status">
  <ModuleStatusPanel />
</TabsContent>
```

---

## 🎯 Priorización de Tareas

### 🔥 Alta Prioridad (Hacer Primero)
1. Probar el sistema cambiando planes en AdminDashboard
2. Integrar `usePlan` en al menos 2 dashboards principales
3. Proteger al menos 3 módulos con `ModuleGuard`

### 📊 Media Prioridad (Hacer Después)
1. Agregar `ModuleStatusPanel` en AdminDashboard
2. Personalizar mensajes de `UpgradeScreen`
3. Agregar tooltips y badges visuales

### 🔮 Baja Prioridad (Futuro)
1. Integración con backend para guardar plan
2. Sistema de analytics
3. Trials temporales

---

## 🐛 Troubleshooting

### Problema: "usePlanContext must be used within a PlanProvider"

**Solución**: Verificar que `PlanProvider` envuelve toda la app en `App.tsx`

```tsx
// App.tsx debe tener:
<PlanProvider initialPlan="enterprise">
  {/* Todo tu contenido */}
</PlanProvider>
```

### Problema: El plan no persiste al recargar

**Solución**: Verificar que localStorage está habilitado y funcionando

```tsx
// En la consola del navegador:
localStorage.getItem('lympos-plan')
```

### Problema: ModuleGuard no muestra UpgradeScreen

**Solución**: Verificar que el módulo está correctamente definido en `planConfig.ts`

```tsx
// El nombre del módulo debe coincidir exactamente:
<ModuleGuard module="consultorio"> // ← debe existir en ModuleType
```

### Problema: PlanSwitcher no cambia el plan

**Solución**: Verificar que se está usando `changePlan` del hook

```tsx
const { changePlan } = usePlan();
changePlan('starter'); // Debe cambiar el plan
```

---

## 📚 Recursos

### Documentación
- [PLAN_SYSTEM_README.md](./PLAN_SYSTEM_README.md) - Guía principal
- [PLAN_SYSTEM_USAGE.md](./PLAN_SYSTEM_USAGE.md) - Uso detallado
- [PLAN_INTEGRATION_EXAMPLES.md](./PLAN_INTEGRATION_EXAMPLES.md) - Ejemplos
- [PLAN_VISUAL_GUIDE.md](./PLAN_VISUAL_GUIDE.md) - Guía visual

### Archivos de Código
- `src/app/config/planConfig.ts` - Configuración
- `src/app/hooks/usePlan.ts` - Hook principal
- `src/app/components/ModuleGuard.tsx` - Protección de módulos
- `src/app/components/UpgradeScreen.tsx` - Pantalla de upgrade

---

## ✅ Checklist Final

Antes de considerar la implementación completa:

- [ ] Sistema probado con los 3 planes
- [ ] Al menos 2 dashboards integrados
- [ ] ModuleGuard funcionando correctamente
- [ ] UpgradeScreen personalizada con branding
- [ ] Documentación revisada
- [ ] Plan por defecto configurado correctamente
- [ ] localStorage funcionando
- [ ] Equipo capacitado en el uso del sistema

---

## 🎉 ¡Listo!

Una vez completado este checklist, tu sistema de planes estará completamente funcional y listo para usar.

**Siguiente paso sugerido**: Integrar el sistema en `FarmaceuticoDashboard.tsx` y `MedicoDashboard.tsx` como prueba inicial.

---

**Fecha de creación**: Abril 2026  
**Versión**: 1.0  
**Sistema**: LYMPOS - Software Farmacéutico
