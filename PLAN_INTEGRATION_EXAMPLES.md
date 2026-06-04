# Ejemplos de Integración del Sistema de Planes

## 📌 Ejemplo 1: Proteger Pestañas en un Dashboard

```tsx
// FarmaceuticoDashboard.tsx
import { usePlan } from './hooks/usePlan';
import ModuleGuard from './components/ModuleGuard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Lock } from 'lucide-react';

export default function FarmaceuticoDashboard({ user, onLogout }) {
  const { isModuleActive } = usePlan();
  const [activeTab, setActiveTab] = useState('pos');

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {/* Módulos básicos - siempre disponibles */}
          <TabsTrigger value="pos">
            Punto de Venta
          </TabsTrigger>
          
          <TabsTrigger value="inventario">
            Inventario
          </TabsTrigger>
          
          {/* Módulo condicional - mostrar con indicador si no está activo */}
          <TabsTrigger 
            value="reportes" 
            disabled={!isModuleActive('reportes')}
          >
            Reportes
            {!isModuleActive('reportes') && (
              <Lock className="w-3 h-3 ml-2 text-gray-400" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pos">
          <POSView />
        </TabsContent>

        <TabsContent value="inventario">
          <InventarioView />
        </TabsContent>

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

## 📌 Ejemplo 2: Ocultar Botones Según el Plan

```tsx
// SupervisorDashboard.tsx
import { usePlan } from './hooks/usePlan';
import { Badge } from './components/ui/badge';
import { ArrowLeftRight, Lock } from 'lucide-react';

export default function SupervisorDashboard({ user, onLogout }) {
  const { isModuleActive, getRequiredPlan } = usePlan();
  const [showTraslados, setShowTraslados] = useState(false);

  const handleAbrirTraslados = () => {
    if (!isModuleActive('traslados')) {
      toast.error('Los traslados requieren el plan Enterprise');
      return;
    }
    setShowTraslados(true);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {/* Botón siempre disponible */}
        <Button onClick={() => setShowInventario(true)}>
          Ver Inventario
        </Button>

        {/* Botón condicional - Opción 1: Ocultar completamente */}
        {isModuleActive('traslados') && (
          <Button onClick={handleAbrirTraslados}>
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Traslados
          </Button>
        )}

        {/* Botón condicional - Opción 2: Mostrar deshabilitado con badge */}
        <Button
          onClick={handleAbrirTraslados}
          disabled={!isModuleActive('traslados')}
          variant={isModuleActive('traslados') ? 'default' : 'outline'}
        >
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Traslados
          {!isModuleActive('traslados') && (
            <>
              <Lock className="w-3 h-3 ml-2" />
              <Badge variant="outline" className="ml-2 text-xs">
                {getRequiredPlan('traslados')}
              </Badge>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
```

## 📌 Ejemplo 3: Mostrar Secciones Condicionales

```tsx
// GerenteDashboard.tsx
import { usePlan } from './hooks/usePlan';
import ModuleGuard from './components/ModuleGuard';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function GerenteDashboard({ user, onLogout }) {
  const { isModuleActive } = usePlan();

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Sección siempre visible */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas del Día</CardTitle>
        </CardHeader>
        <CardContent>
          <VentasDelDiaView />
        </CardContent>
      </Card>

      {/* Sección condicional - Opción 1: Con ModuleGuard */}
      <ModuleGuard module="reportes">
        <Card>
          <CardHeader>
            <CardTitle>
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Reportes Avanzados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportesAvanzadosView />
          </CardContent>
        </Card>
      </ModuleGuard>

      {/* Sección condicional - Opción 2: Con renderizado condicional */}
      {isModuleActive('multisucursal') ? (
        <Card>
          <CardHeader>
            <CardTitle>Vista Multi-Sucursal</CardTitle>
          </CardHeader>
          <CardContent>
            <MultiSucursalView />
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-50 border-dashed">
          <CardHeader>
            <CardTitle className="text-gray-500 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Vista Multi-Sucursal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Actualiza al plan Enterprise para gestionar múltiples sucursales
            </p>
            <Button variant="outline" className="mt-4">
              Ver Planes
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

## 📌 Ejemplo 4: Validar Antes de Acciones

```tsx
// MedicoDashboard.tsx
import { usePlan } from './hooks/usePlan';
import { toast } from 'sonner';

export default function MedicoDashboard({ user, onLogout }) {
  const { isModuleActive } = usePlan();

  const handleGenerarReceta = (paciente) => {
    // Verificar si el módulo está activo antes de continuar
    if (!isModuleActive('recetas')) {
      toast.error('La generación de recetas requiere el plan Pro o Enterprise', {
        description: 'Contacta a tu administrador para actualizar el plan',
        action: {
          label: 'Ver Planes',
          onClick: () => window.location.href = '/planes'
        }
      });
      return;
    }

    // Continuar con la acción
    generarRecetaAPI(paciente);
  };

  const handleControlAntibiotico = (producto) => {
    if (!isModuleActive('antibioticos')) {
      toast.error('El control de antibióticos requiere el plan Pro o Enterprise');
      return;
    }

    registrarAntibiotico(producto);
  };

  return (
    <div>
      <Button onClick={() => handleGenerarReceta(pacienteSeleccionado)}>
        Generar Receta
      </Button>
    </div>
  );
}
```

## 📌 Ejemplo 5: Menú de Navegación Dinámico

```tsx
// Navigation.tsx
import { usePlan } from './hooks/usePlan';
import { Lock } from 'lucide-react';

export default function Navigation() {
  const { isModuleActive } = usePlan();

  const menuItems = [
    { label: 'POS', path: '/pos', module: 'pos', icon: ShoppingCart },
    { label: 'Inventario', path: '/inventario', module: 'inventario', icon: Package },
    { label: 'Reportes', path: '/reportes', module: 'reportes', icon: TrendingUp },
    { label: 'Consultorio', path: '/consultorio', module: 'consultorio', icon: Stethoscope },
    { label: 'Traslados', path: '/traslados', module: 'traslados', icon: ArrowLeftRight },
  ];

  return (
    <nav>
      {menuItems.map((item) => {
        const isActive = isModuleActive(item.module);
        const Icon = item.icon;

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`
              flex items-center gap-3 px-4 py-2 rounded-lg
              ${isActive 
                ? 'hover:bg-gray-100 text-gray-900' 
                : 'text-gray-400 cursor-not-allowed'
              }
            `}
            onClick={(e) => {
              if (!isActive) {
                e.preventDefault();
                toast.error(`${item.label} no está disponible en tu plan actual`);
              }
            }}
          >
            <Icon className="w-5 h-5" />
            {item.label}
            {!isActive && <Lock className="w-4 h-4 ml-auto" />}
          </Link>
        );
      })}
    </nav>
  );
}
```

## 📌 Ejemplo 6: Panel de Estado de Módulos en Admin

```tsx
// AdminDashboard.tsx
import ModuleStatusPanel from './components/ModuleStatusPanel';
import PlanSwitcher from './components/PlanSwitcher';

export default function AdminDashboard({ user, onLogout }) {
  return (
    <div>
      <header className="flex items-center justify-between p-4">
        <h1>Panel de Administración</h1>
        <PlanSwitcher />
      </header>

      {/* Mostrar estado de todos los módulos */}
      <div className="grid grid-cols-2 gap-6">
        <ModuleStatusPanel />
        
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Otras configuraciones */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## 📌 Ejemplo 7: Formulario Condicional

```tsx
// ConfiguracionForm.tsx
import { usePlan } from './hooks/usePlan';

export default function ConfiguracionForm() {
  const { isModuleActive } = usePlan();

  return (
    <form>
      {/* Campos básicos siempre visibles */}
      <Input label="Nombre de la Farmacia" />
      <Input label="Dirección" />

      {/* Campos condicionales */}
      {isModuleActive('multisucursal') && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">
            Configuración Multi-Sucursal
          </h3>
          <Select label="Sucursal Principal">
            {sucursales.map(s => <option key={s.id}>{s.nombre}</option>)}
          </Select>
          <Checkbox label="Sincronizar inventario automáticamente" />
        </div>
      )}

      {!isModuleActive('multisucursal') && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            💡 Actualiza al plan Enterprise para gestionar múltiples sucursales
          </p>
        </div>
      )}
    </form>
  );
}
```

## 📌 Ejemplo 8: Tabla con Acciones Condicionales

```tsx
// InventarioTable.tsx
import { usePlan } from './hooks/usePlan';

export default function InventarioTable({ productos }) {
  const { isModuleActive } = usePlan();

  return (
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Stock</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {productos.map(producto => (
          <tr key={producto.id}>
            <td>{producto.nombre}</td>
            <td>{producto.stock}</td>
            <td className="flex gap-2">
              {/* Acción siempre disponible */}
              <Button size="sm" onClick={() => editarProducto(producto)}>
                Editar
              </Button>

              {/* Acción condicional */}
              {isModuleActive('traslados') ? (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => trasladarProducto(producto)}
                >
                  Trasladar
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="ghost"
                  disabled
                  title="Requiere plan Enterprise"
                >
                  <Lock className="w-3 h-3 mr-1" />
                  Trasladar
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## 🎯 Mejores Prácticas

### ✅ DO - Recomendado

```tsx
// ✅ Verificar el módulo al inicio de la función
const handleAction = () => {
  if (!isModuleActive('reportes')) {
    toast.error('Función no disponible');
    return;
  }
  // ... resto del código
};

// ✅ Usar ModuleGuard para componentes completos
<ModuleGuard module="consultorio">
  <ConsultorioView />
</ModuleGuard>

// ✅ Mostrar feedback claro al usuario
{!isModuleActive('traslados') && (
  <Alert>
    Esta función requiere el plan Enterprise
  </Alert>
)}
```

### ❌ DON'T - Evitar

```tsx
// ❌ No verificar después de ejecutar lógica
const handleAction = () => {
  const result = doExpensiveOperation();
  if (!isModuleActive('reportes')) return; // ¡Muy tarde!
};

// ❌ No asumir que el módulo está activo
const data = generateReport(); // Podría fallar si reportes no está activo

// ❌ No mostrar funcionalidad sin indicar que está bloqueada
<Button onClick={handleTraslado}>Trasladar</Button> // Sin indicar si está disponible
```

## 🔄 Integración Completa en un Dashboard

```tsx
import { useState } from 'react';
import { usePlan } from './hooks/usePlan';
import ModuleGuard from './components/ModuleGuard';
import PlanSwitcher from './components/PlanSwitcher';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Lock } from 'lucide-react';

export default function CompleteDashboard({ user, onLogout }) {
  const { isModuleActive, getPlanInfo } = usePlan();
  const [activeTab, setActiveTab] = useState('pos');

  // Definir tabs disponibles según el plan
  const tabs = [
    { id: 'pos', label: 'POS', module: 'pos', component: POSView },
    { id: 'inventario', label: 'Inventario', module: 'inventario', component: InventarioView },
    { id: 'reportes', label: 'Reportes', module: 'reportes', component: ReportesView },
    { id: 'consultorio', label: 'Consultorio', module: 'consultorio', component: ConsultorioView },
    { id: 'traslados', label: 'Traslados', module: 'traslados', component: TrasladosView },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">LYMPOS</h1>
        <div className="flex items-center gap-4">
          {user.role === 'admin' && <PlanSwitcher />}
          <span className="text-sm text-gray-600">{user.name}</span>
          <Button onClick={onLogout}>Salir</Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {tabs.map(tab => {
              const active = isModuleActive(tab.module);
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  disabled={!active}
                  className={!active ? 'opacity-50' : ''}
                >
                  {tab.label}
                  {!active && <Lock className="w-3 h-3 ml-2" />}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id}>
              <ModuleGuard module={tab.module}>
                <tab.component />
              </ModuleGuard>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
```
