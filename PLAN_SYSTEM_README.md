# 🎯 Sistema de Planes LYMPOS

Sistema completo de gestión de planes y módulos para el software farmacéutico LYMPOS.

## 📚 Documentación

- **[PLAN_SYSTEM_USAGE.md](./PLAN_SYSTEM_USAGE.md)** - Guía completa de uso del sistema
- **[PLAN_INTEGRATION_EXAMPLES.md](./PLAN_INTEGRATION_EXAMPLES.md)** - Ejemplos prácticos de integración

## 🚀 Inicio Rápido

### 1. El sistema ya está configurado en App.tsx

```tsx
// App.tsx ya incluye el PlanProvider
<PlanProvider initialPlan="enterprise">
  <YourApp />
</PlanProvider>
```

### 2. Usar el hook en cualquier componente

```tsx
import { usePlan } from './hooks/usePlan';

function MiComponente() {
  const { isModuleActive } = usePlan();
  
  if (!isModuleActive('reportes')) {
    return <div>Módulo no disponible</div>;
  }
  
  return <ReportesView />;
}
```

### 3. Proteger módulos completos

```tsx
import ModuleGuard from './components/ModuleGuard';

<ModuleGuard module="consultorio">
  <ConsultorioMedicoView />
</ModuleGuard>
```

## 📦 Archivos Creados

```
src/
├── app/
│   ├── config/
│   │   └── planConfig.ts           # Configuración de planes y módulos
│   ├── contexts/
│   │   └── PlanContext.tsx         # Context Provider para el plan
│   ├── hooks/
│   │   └── usePlan.ts              # Hook principal para usar en componentes
│   └── components/
│       ├── ModuleGuard.tsx         # Componente para proteger módulos
│       ├── UpgradeScreen.tsx       # Pantalla cuando módulo no está activo
│       ├── PlanSwitcher.tsx        # Selector de plan (para admin)
│       └── ModuleStatusPanel.tsx   # Panel de estado de módulos
└── PLAN_*.md                       # Documentación
```

## 🎯 Planes Disponibles

| Plan | Precio | Módulos Incluidos |
|------|--------|-------------------|
| **Starter** | $499/mes | POS, Inventario, Corte de Caja |
| **Pro** | $899/mes | Todo Starter + Consultorio, Recetas, Antibióticos, Reportes |
| **Enterprise** | $1,499/mes | Todo Pro + Multi-Sucursal, Traslados, Supervisor Central |

## 🔧 Componentes Principales

### usePlan Hook

```tsx
const {
  currentPlan,        // Plan actual del usuario
  isModuleActive,     // Verificar si un módulo está activo
  getRequiredPlan,    // Obtener el plan mínimo requerido
  needsUpgrade,       // Verificar si necesita actualizar
  getPlanInfo,        // Información del plan actual
  changePlan          // Cambiar el plan (demo)
} = usePlan();
```

### ModuleGuard Component

```tsx
<ModuleGuard module="consultorio">
  {/* Este contenido solo se muestra si el módulo está activo */}
  <ConsultorioView />
</ModuleGuard>
```

### PlanSwitcher Component

```tsx
{/* Solo para administradores - permite cambiar el plan en modo demo */}
<PlanSwitcher />
```

### UpgradeScreen Component

Se muestra automáticamente cuando:
- Un usuario intenta acceder a un módulo no activo
- Se usa ModuleGuard con un módulo bloqueado

## 💡 Casos de Uso Comunes

### Ocultar funcionalidad no disponible

```tsx
const { isModuleActive } = usePlan();

{isModuleActive('reportes') && (
  <Button>Ver Reportes Avanzados</Button>
)}
```

### Mostrar mensaje de upgrade

```tsx
const { isModuleActive, getRequiredPlan } = usePlan();

{!isModuleActive('traslados') && (
  <Alert>
    Los traslados requieren el plan {getRequiredPlan('traslados')}
  </Alert>
)}
```

### Validar antes de ejecutar acción

```tsx
const { isModuleActive } = usePlan();

const handleCrearTraslado = () => {
  if (!isModuleActive('traslados')) {
    toast.error('Función no disponible en tu plan');
    return;
  }
  // Ejecutar acción...
};
```

## 🎨 Personalización

### Cambiar el plan por defecto

```tsx
// En App.tsx
<PlanProvider initialPlan="starter"> {/* Cambia "enterprise" a "starter" o "pro" */}
  <YourApp />
</PlanProvider>
```

### Agregar nuevos módulos

```tsx
// En src/app/config/planConfig.ts
export type ModuleType =
  | 'pos'
  | 'inventario'
  | 'mi_nuevo_modulo'; // ← Agregar aquí

export const MODULE_NAMES: Record<ModuleType, string> = {
  // ...
  mi_nuevo_modulo: 'Mi Nuevo Módulo', // ← Agregar nombre
};

// Luego agregarlo a un plan
export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  pro: {
    // ...
    modules: [
      'pos',
      'inventario',
      'mi_nuevo_modulo', // ← Agregar al plan deseado
    ]
  }
};
```

## 🔌 Integración con Backend

### Guardar el plan en Supabase

```tsx
// En el servidor (supabase/functions/server/index.tsx)
app.post('/update-user-plan', async (c) => {
  const { userId, plan } = await c.req.json();
  
  await kv.set(`user_plan_${userId}`, plan);
  
  return c.json({ success: true });
});

// En el frontend
const updatePlan = async (newPlan) => {
  await fetch(`/make-server-7d799f19/update-user-plan`, {
    method: 'POST',
    body: JSON.stringify({ userId: user.id, plan: newPlan })
  });
  
  changePlan(newPlan);
};
```

### Cargar el plan al hacer login

```tsx
// En Login.tsx o App.tsx
const loadUserPlan = async (userId: string) => {
  const response = await fetch(
    `/make-server-7d799f19/get-user-plan?userId=${userId}`
  );
  const { plan } = await response.json();
  changePlan(plan || 'starter');
};

useEffect(() => {
  if (user) {
    loadUserPlan(user.id);
  }
}, [user]);
```

## 🧪 Testing en Modo Demo

El sistema está configurado para trabajar en modo demo:

1. **El plan se guarda en localStorage**: `lympos-plan`
2. **Plan por defecto**: `enterprise` (todos los módulos activos)
3. **PlanSwitcher**: Permite cambiar el plan para probar diferentes configuraciones
4. **Los cambios son locales**: No afectan a otros usuarios o sesiones

### Probar diferentes planes

1. Abre el AdminDashboard
2. Haz clic en el botón del plan (esquina superior derecha)
3. Selecciona un plan diferente
4. Navega por el sistema para ver qué módulos están activos/bloqueados

## 📱 Ejemplos de Integración por Dashboard

### FarmaceuticoDashboard
```tsx
import ModuleGuard from './components/ModuleGuard';

// Proteger el tab de reportes
<TabsContent value="reportes">
  <ModuleGuard module="reportes">
    <ReportesView />
  </ModuleGuard>
</TabsContent>
```

### MedicoDashboard
```tsx
const { isModuleActive } = usePlan();

const handleGenerarReceta = () => {
  if (!isModuleActive('recetas')) {
    toast.error('Las recetas requieren el plan Pro');
    return;
  }
  // Generar receta...
};
```

### SupervisorDashboard
```tsx
// Mostrar botón de traslados solo si está activo
{isModuleActive('traslados') && (
  <Button onClick={abrirTraslados}>
    Gestionar Traslados
  </Button>
)}
```

### GerenteDashboard
```tsx
// Proteger reportes avanzados
<ModuleGuard module="reportes">
  <ReportesAvanzadosSection />
</ModuleGuard>
```

### AdminDashboard
```tsx
import PlanSwitcher from './components/PlanSwitcher';
import ModuleStatusPanel from './components/ModuleStatusPanel';

// Ya integrado:
// - PlanSwitcher en el header
// - Puede agregarse ModuleStatusPanel en una pestaña
```

## 🎯 Próximos Pasos

1. **Integrar en cada Dashboard**: Usa los ejemplos de [PLAN_INTEGRATION_EXAMPLES.md](./PLAN_INTEGRATION_EXAMPLES.md)
2. **Personalizar UpgradeScreen**: Ajusta los textos y diseño según tu marca
3. **Conectar con Backend**: Guarda el plan del usuario en Supabase
4. **Agregar analytics**: Registra qué módulos intentan usar los usuarios

## ❓ Preguntas Frecuentes

### ¿Cómo cambio el plan por defecto?
Edita el `initialPlan` en App.tsx:
```tsx
<PlanProvider initialPlan="starter"> {/* Cambia aquí */}
```

### ¿Cómo agrego un nuevo módulo?
1. Agrégalo en `planConfig.ts` a `ModuleType`
2. Agrégalo a `MODULE_NAMES` y `MODULE_DESCRIPTIONS`
3. Inclúyelo en los planes deseados en `PLAN_CONFIGS`

### ¿El sistema funciona sin conexión?
Sí, el plan se guarda en localStorage y funciona completamente offline.

### ¿Puedo tener diferentes planes por sucursal?
Sí, puedes extender el sistema para guardar el plan por sucursal:
```tsx
const { currentPlan } = usePlan();
const planBySucursal = getPlanForSucursal(user.sucursalId);
```

### ¿Cómo desactivo el modo demo?
Elimina o desactiva el `PlanSwitcher` en los dashboards y conecta el sistema con tu backend.

## 📞 Soporte

Para dudas o problemas:
1. Revisa [PLAN_SYSTEM_USAGE.md](./PLAN_SYSTEM_USAGE.md) para uso básico
2. Consulta [PLAN_INTEGRATION_EXAMPLES.md](./PLAN_INTEGRATION_EXAMPLES.md) para ejemplos
3. Revisa el código de los componentes en `src/app/components/`

---

**Versión**: 1.0  
**Última actualización**: Abril 2026  
**Sistema**: LYMPOS - Software Farmacéutico
