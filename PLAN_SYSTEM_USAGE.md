# Sistema de Planes LYMPOS - Guía de Uso

## 📋 Descripción General

El sistema de planes permite controlar el acceso a diferentes módulos según el plan contratado por el cliente.

## 🎯 Planes Disponibles

### Starter ($499/mes)
- ✅ Punto de Venta (POS)
- ✅ Gestión de Inventario
- ✅ Cortes de Caja

### Pro ($899/mes)
- ✅ Todo lo de Starter
- ✅ Consultorio Médico
- ✅ Recetas Médicas
- ✅ Control de Antibióticos
- ✅ Reportes Avanzados

### Enterprise ($1,499/mes)
- ✅ Todo lo de Pro
- ✅ Multi-Sucursal
- ✅ Traslados entre Sucursales
- ✅ Supervisor Central

## 🚀 Cómo Usar

### 1. Proteger un módulo completo con ModuleGuard

```tsx
import ModuleGuard from './components/ModuleGuard';

function MiComponente() {
  return (
    <ModuleGuard module="consultorio">
      {/* Si el módulo está activo, se muestra este contenido */}
      <ConsultorioMedicoView />
    </ModuleGuard>
  );
}
```

### 2. Verificar acceso con el hook usePlan

```tsx
import { usePlan } from './hooks/usePlan';

function MiDashboard() {
  const { isModuleActive, currentPlan, getPlanInfo } = usePlan();

  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Mostrar módulo solo si está activo */}
      {isModuleActive('reportes') && (
        <ReportesSection />
      )}

      {/* Mostrar mensaje de upgrade */}
      {!isModuleActive('traslados') && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <p>Los traslados requieren el plan Enterprise</p>
        </div>
      )}

      {/* Mostrar información del plan actual */}
      <p>Plan actual: {getPlanInfo().displayName}</p>
    </div>
  );
}
```

### 3. Agregar el PlanSwitcher en un Dashboard de Admin

```tsx
import PlanSwitcher from './components/PlanSwitcher';

function AdminDashboard() {
  return (
    <div>
      <header className="flex items-center justify-between p-4">
        <h1>Panel de Administración</h1>
        {/* Permite cambiar el plan en modo demo */}
        <PlanSwitcher />
      </header>
      {/* ... resto del dashboard */}
    </div>
  );
}
```

### 4. Ejemplo completo en un Dashboard

```tsx
import { usePlan } from './hooks/usePlan';
import ModuleGuard from './components/ModuleGuard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

function FarmaceuticoDashboard({ user, onLogout }) {
  const { isModuleActive } = usePlan();

  return (
    <div>
      <Tabs defaultValue="pos">
        <TabsList>
          {/* Siempre disponible en todos los planes */}
          <TabsTrigger value="pos">POS</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          
          {/* Solo mostrar tab si el módulo está activo */}
          {isModuleActive('reportes') && (
            <TabsTrigger value="reportes">Reportes</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pos">
          <POSView />
        </TabsContent>

        <TabsContent value="inventario">
          <InventarioView />
        </TabsContent>

        {/* Proteger el contenido del tab con ModuleGuard */}
        <TabsContent value="reportes">
          <ModuleGuard module="reportes">
            <ReportesView />
          </ModuleGuard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## 🔧 Métodos del Hook usePlan

```tsx
const {
  currentPlan,           // 'starter' | 'pro' | 'enterprise'
  isModuleActive,        // (module: ModuleType) => boolean
  getRequiredPlan,       // (module: ModuleType) => PlanType
  needsUpgrade,          // (module: ModuleType) => boolean
  getPlanInfo,           // () => PlanConfig
  changePlan             // (plan: PlanType) => void
} = usePlan();
```

## 📦 Módulos Disponibles

```typescript
type ModuleType =
  | 'pos'                  // Punto de Venta
  | 'inventario'           // Gestión de Inventario
  | 'corte_caja'          // Cortes de Caja
  | 'consultorio'         // Consultorio Médico
  | 'recetas'             // Recetas Médicas
  | 'antibioticos'        // Control de Antibióticos
  | 'reportes'            // Reportes Avanzados
  | 'multisucursal'       // Multi-Sucursal
  | 'traslados'           // Traslados entre Sucursales
  | 'supervisor_central'; // Supervisor Central
```

## 💡 Casos de Uso Comunes

### Ocultar botón si módulo no está activo

```tsx
const { isModuleActive } = usePlan();

{isModuleActive('consultorio') && (
  <Button onClick={abrirConsultorio}>
    Abrir Consultorio
  </Button>
)}
```

### Mostrar badge del plan requerido

```tsx
const { getRequiredPlan, isModuleActive } = usePlan();

{!isModuleActive('traslados') && (
  <Badge variant="outline">
    Requiere {getRequiredPlan('traslados')}
  </Badge>
)}
```

### Verificar antes de ejecutar acción

```tsx
const { isModuleActive } = usePlan();

const handleCrearTraslado = () => {
  if (!isModuleActive('traslados')) {
    toast.error('Esta función requiere el plan Enterprise');
    return;
  }
  
  // Ejecutar acción...
};
```

## 🎨 Personalizar la Pantalla de Upgrade

Si necesitas una pantalla de upgrade personalizada:

```tsx
import { usePlan } from './hooks/usePlan';
import { getMinimumPlanForModule } from './config/planConfig';

function MiUpgradePersonalizado({ module }) {
  const { changePlan } = usePlan();
  const requiredPlan = getMinimumPlanForModule(module);

  return (
    <div className="upgrade-container">
      <h2>Actualiza a {requiredPlan}</h2>
      <button onClick={() => changePlan(requiredPlan)}>
        Actualizar ahora
      </button>
    </div>
  );
}
```

## 🔒 Notas Importantes

1. **El PlanProvider debe envolver toda la aplicación** (ya está configurado en App.tsx)
2. **El plan se guarda en localStorage** como `lympos-plan`
3. **Plan por defecto:** Enterprise (todos los módulos activos)
4. **Modo Demo:** Los cambios de plan son solo locales y para demostración

## 📱 Integración con Backend

Para integrar con Supabase y guardar el plan del cliente:

```tsx
// En el componente de login o perfil
const loadUserPlan = async (userId: string) => {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/get-user-plan`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    }
  );
  
  const { plan } = await response.json();
  changePlan(plan); // Actualizar el plan desde el servidor
};
```

## ✨ Ejemplo Completo Integrado

Ver los archivos de ejemplo:
- `src/app/components/ModuleGuard.tsx` - Protección de módulos
- `src/app/components/PlanSwitcher.tsx` - Cambio de planes
- `src/app/components/UpgradeScreen.tsx` - Pantalla de upgrade
- `src/app/hooks/usePlan.ts` - Hook principal
- `src/app/config/planConfig.ts` - Configuración de planes
