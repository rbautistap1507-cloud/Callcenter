# 🎨 Guía Visual del Sistema de Planes

## 📊 Pantallas del Sistema

### 1. PlanSwitcher (Selector de Plan)

**Ubicación**: Header del AdminDashboard  
**Función**: Permite cambiar el plan actual en modo demo

```
┌─────────────────────────────────────────┐
│  [⚡ Plan Enterprise ⚙️]  ← Botón       │
└─────────────────────────────────────────┘
```

**Al hacer clic se abre un diálogo con:**

```
╔══════════════════════════════════════════════╗
║  Configuración de Plan (Demo)                ║
╟──────────────────────────────────────────────╢
║                                              ║
║  ┌────────────────────────────────────┐     ║
║  │ ⚡ Plan Starter        $499/mes    │     ║
║  │ Perfecto para farmacias...         │     ║
║  │ [pos] [inventario] [corte_caja]    │     ║
║  └────────────────────────────────────┘     ║
║                                              ║
║  ┌────────────────────────────────────┐     ║
║  │ 📈 Plan Pro           $899/mes     │     ║
║  │ Ideal para farmacias con...  ✓Activo│    ║
║  │ [pos] [inventario] [consultorio]...│     ║
║  └────────────────────────────────────┘     ║
║                                              ║
║  ┌────────────────────────────────────┐     ║
║  │ 👑 Plan Enterprise    $1,499/mes   │     ║
║  │ Solución completa para cadenas     │     ║
║  │ [pos] [inventario] [consultorio]...│     ║
║  └────────────────────────────────────┘     ║
║                                              ║
║  ⚠️ Modo Demo: Los cambios son locales      ║
╚══════════════════════════════════════════════╝
```

---

### 2. UpgradeScreen (Pantalla de Actualización)

**Cuándo aparece**: Cuando un usuario intenta acceder a un módulo bloqueado

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│              ┌─────────┐                            │
│              │  🔒     │                            │
│              └─────────┘                            │
│                                                      │
│            Módulo Premium                           │
│                                                      │
│   El módulo "Consultorio Médico" requiere una      │
│         actualización de plan                       │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  📋 Consultorio Médico    [Requiere Pro]   │    │
│  │  Sistema de consultas médicas y gestión... │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ℹ️ Plan actual: Plan Starter                       │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ ⚡ Starter   │  │ 📈 Pro ★     │  │ 👑 Enter │ │
│  │ $499/mes     │  │ $899/mes     │  │ $1,499   │ │
│  │ 3 módulos    │  │ 7 módulos    │  │ 10 módu  │ │
│  │              │  │              │  │          │ │
│  │ [Plan Actual]│  │[Actualizar] │  │[Actualiz]│ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
│                                                      │
│  💡 ¿Necesitas más información?                     │
│     [Contactar Ventas]                              │
│                                                      │
│  🔧 Modo Demo: Los cambios son locales              │
└──────────────────────────────────────────────────────┘
```

---

### 3. ModuleStatusPanel (Panel de Estado)

**Ubicación**: Puede agregarse en AdminDashboard o configuración

```
┌──────────────────────────────────────────────────┐
│  Estado de Módulos - Plan Pro                    │
│  Módulos activos: 7 de 10 módulos                │
├──────────────────────────────────────────────────┤
│                                                  │
│  Operaciones Básicas                             │
│  ┌──────────────────────────────────────────┐   │
│  │ ✅ Punto de Venta              [Activo]   │   │
│  │ Sistema completo de punto de venta...     │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ ✅ Gestión de Inventario       [Activo]   │   │
│  │ Control total de productos, stock...      │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ ✅ Cortes de Caja              [Activo]   │   │
│  │ Gestión de cortes de caja...              │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  Servicios Médicos                               │
│  ┌──────────────────────────────────────────┐   │
│  │ ✅ Consultorio Médico          [Activo]   │   │
│  │ Sistema de consultas médicas...           │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ ✅ Recetas Médicas             [Activo]   │   │
│  │ Generación y gestión de recetas...        │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  Multi-Sucursal                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ 🔒 Multi-Sucursal    [Requiere Enterprise]│   │
│  │ Gestión centralizada de múltiples...      │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ 🔒 Traslados         [Requiere Enterprise]│   │
│  │ Transferencia de productos entre...       │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ℹ️ Plan Actual: Plan Pro - $899/mes             │
│     Ideal para farmacias con consultorio médico │
└──────────────────────────────────────────────────┘
```

---

### 4. ModuleGuard en Acción

**Dashboard con pestañas protegidas:**

```
┌──────────────────────────────────────────────────┐
│  LYMPOS                        Plan: Pro  [Salir]│
├──────────────────────────────────────────────────┤
│                                                  │
│  [POS] [Inventario] [Reportes] [🔒 Traslados]   │
│  ───────────────────────────────────────────     │
│                                                  │
│  Si el usuario hace clic en "Traslados":         │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │                                            │ │
│  │        🔒 Módulo Premium                   │ │
│  │                                            │ │
│  │  El módulo "Traslados entre Sucursales"   │ │
│  │  requiere una actualización de plan       │ │
│  │                                            │ │
│  │  [Ver Planes]                              │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

### 5. Botones con Estados

**Botón de módulo activo:**
```
┌─────────────────────────┐
│ 📊 Ver Reportes         │  ← Habilitado, clic funciona
└─────────────────────────┘
```

**Botón de módulo bloqueado - Opción 1 (Oculto):**
```
(No se muestra nada)
```

**Botón de módulo bloqueado - Opción 2 (Deshabilitado con indicador):**
```
┌──────────────────────────────┐
│ 🔒 Traslados [Enterprise]    │  ← Deshabilitado, con badge
└──────────────────────────────┘
```

**Botón de módulo bloqueado - Opción 3 (Card de upgrade):**
```
┌────────────────────────────────────┐
│ 🔒 Traslados entre Sucursales      │
│                                    │
│ Actualiza al plan Enterprise para  │
│ gestionar traslados                │
│                                    │
│ [Ver Planes]                       │
└────────────────────────────────────┘
```

---

### 6. Navegación Lateral con Estados

```
┌─────────────────────────────────┐
│  LYMPOS                         │
├─────────────────────────────────┤
│                                 │
│  🛒 POS                         │  ← Activo
│  📦 Inventario                  │  ← Activo
│  💰 Cortes de Caja              │  ← Activo
│  🩺 Consultorio                 │  ← Activo
│  📋 Recetas                     │  ← Activo
│  💊 Antibióticos                │  ← Activo
│  📊 Reportes                    │  ← Activo
│                                 │
│  ─────────────────────────      │
│                                 │
│  🔒 Multi-Sucursal              │  ← Bloqueado
│  🔒 Traslados                   │  ← Bloqueado
│  🔒 Supervisor Central          │  ← Bloqueado
│                                 │
└─────────────────────────────────┘
```

---

### 7. Toast/Notificaciones

**Al intentar usar módulo bloqueado:**
```
┌─────────────────────────────────────────┐
│ ❌ Esta función requiere el plan        │
│    Enterprise                           │
│                                         │
│ Contacta a tu administrador   [Cerrar] │
└─────────────────────────────────────────┘
```

**Al cambiar de plan:**
```
┌─────────────────────────────────────────┐
│ ✅ Plan actualizado a Enterprise        │
│                                         │
│ Ahora tienes acceso a todos  [Cerrar]  │
│ los módulos                             │
└─────────────────────────────────────────┘
```

---

## 🎯 Estados Visuales por Módulo

### Módulo Activo ✅
- **Color**: Verde
- **Icono**: Check (✓)
- **Badge**: "Activo"
- **Interacción**: Totalmente funcional
- **Cursor**: Normal

### Módulo Bloqueado 🔒
- **Color**: Gris
- **Icono**: Lock (🔒)
- **Badge**: "Requiere [Plan]"
- **Interacción**: Click muestra UpgradeScreen
- **Cursor**: not-allowed o pointer según diseño

---

## 📱 Flujo de Usuario Completo

### Escenario 1: Usuario con Plan Starter intenta usar Consultorio

```
1. Usuario hace clic en "Consultorio"
   ↓
2. ModuleGuard detecta que módulo no está activo
   ↓
3. Se muestra UpgradeScreen con:
   - Explicación del módulo
   - Plan actual (Starter)
   - Opción de upgrade a Pro
   ↓
4. Usuario hace clic en "Actualizar a Pro"
   ↓
5. Plan se actualiza (en demo: localStorage)
   ↓
6. Toast confirma cambio
   ↓
7. Usuario ahora puede acceder al Consultorio
```

### Escenario 2: Administrador explora planes

```
1. Admin abre AdminDashboard
   ↓
2. Ve PlanSwitcher en header mostrando "Plan Enterprise"
   ↓
3. Hace clic en PlanSwitcher
   ↓
4. Se abre diálogo con los 3 planes
   ↓
5. Selecciona "Plan Starter" para probar
   ↓
6. Plan cambia a Starter
   ↓
7. Navega al dashboard y ve que solo 3 módulos están activos
   ↓
8. Intenta usar "Reportes" → UpgradeScreen aparece
   ↓
9. Vuelve a cambiar el plan a Enterprise
```

---

## 🎨 Códigos de Color Sugeridos

### Por Plan
- **Starter**: Azul (`#3B82F6`)
- **Pro**: Púrpura (`#9333EA`)
- **Enterprise**: Ámbar/Dorado (`#F59E0B`)

### Por Estado
- **Activo**: Verde (`#10B981`)
- **Bloqueado**: Gris (`#6B7280`)
- **Recomendado**: Índigo (`#4F46E5`)

### Por Acción
- **Éxito**: Verde (`#10B981`)
- **Error/Bloqueado**: Rojo (`#EF4444`)
- **Info**: Azul (`#3B82F6`)
- **Advertencia**: Ámbar (`#F59E0B`)

---

## 🔖 Iconos Sugeridos (Lucide React)

```tsx
import {
  Zap,           // Plan Starter
  TrendingUp,    // Plan Pro
  Crown,         // Plan Enterprise
  Check,         // Activo
  Lock,          // Bloqueado
  AlertCircle,   // Info
  ShoppingCart,  // POS
  Package,       // Inventario
  DollarSign,    // Corte de Caja
  Stethoscope,   // Consultorio
  FileText,      // Recetas
  Pill,          // Antibióticos
  BarChart,      // Reportes
  Building2,     // Multi-Sucursal
  ArrowLeftRight,// Traslados
  Eye,           // Supervisor
} from 'lucide-react';
```

---

## 💡 Tips de UX

### ✅ Buenas Prácticas

1. **Feedback inmediato**: Mostrar siempre por qué algo no está disponible
2. **Path claro**: Indicar exactamente qué plan se necesita
3. **Consistencia**: Usar los mismos colores/iconos en todo el sistema
4. **Accesibilidad**: Incluir badges de texto, no solo colores
5. **Modo demo claro**: Indicar que los cambios son locales

### ❌ Evitar

1. No mostrar funciones sin indicar que están bloqueadas
2. No usar solo color para diferenciar estados
3. No esconder el plan actual del usuario
4. No hacer procesos de upgrade confusos
5. No bloquear sin dar alternativas

---

## 📸 Capturas Sugeridas

Para documentación completa, considera capturar:

1. ✅ PlanSwitcher cerrado
2. ✅ PlanSwitcher abierto con los 3 planes
3. ✅ UpgradeScreen completa
4. ✅ ModuleStatusPanel
5. ✅ Dashboard con módulos activos/bloqueados
6. ✅ Toast de módulo bloqueado
7. ✅ Toast de cambio de plan exitoso
8. ✅ Navegación con items bloqueados
