# Instalación del Módulo de Facturación CFDI 4.0

## 📦 1. Instalar dependencias

El módulo de facturación requiere la librería `crypto-js` para encriptar las contraseñas:

```bash
pnpm add crypto-js
pnpm add -D @types/crypto-js
```

## 🗄️ 2. Aplicar migraciones de base de datos

Necesitas ejecutar los siguientes archivos SQL en tu base de datos de Supabase:

### Opción A: Desde la consola de Supabase (Recomendado)

1. Ve a https://supabase.com y accede a tu proyecto
2. Navega a **SQL Editor**
3. Ejecuta los siguientes archivos en orden:

   **Primero:** `/supabase/migrations/create_cfdi_tables.sql`
   - Crea las tablas: `configuracion_fiscal`, `clientes_fiscales`, `cfdi_emitidos`, `cfdi_conceptos`
   - Configura RLS y triggers

   **Segundo:** `/supabase/migrations/catalogos_sat_seed.sql`
   - Carga los catálogos SAT necesarios
   - Crea funciones auxiliares de búsqueda

### Opción B: Usando Supabase CLI

```bash
# Desde la raíz del proyecto
supabase db push
```

## 🔐 3. Configurar variables de entorno

**⚠️ MUY IMPORTANTE:** La clave de encriptación está hardcodeada en el componente por defecto.

En producción, **DEBES** cambiarla a una variable de entorno:

### Paso 1: Crear archivo `.env.local`

```bash
# En la raíz del proyecto
echo "VITE_ENCRYPTION_KEY=tu_clave_super_secreta_aqui_cambiala" > .env.local
```

### Paso 2: Actualizar el componente

En `/src/app/components/admin/ConfiguracionFiscal.tsx`, línea ~11:

**Antes:**
```typescript
const ENCRYPTION_KEY = "LYMPOS_SECRET_KEY_2024"; // ⚠️ Cambiar en producción
```

**Después:**
```typescript
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || "LYMPOS_SECRET_KEY_2024";
```

### Paso 3: Configurar en Supabase (Producción)

Si usas Supabase Edge Functions, también deberás configurar la clave allí:

```bash
supabase secrets set ENCRYPTION_KEY=tu_clave_super_secreta_aqui_cambiala
```

## 🚀 4. Probar el módulo

1. **Accede como Administrador**
   - Inicia sesión con un usuario con rol `administrador`

2. **Ve a Configuración Fiscal**
   - En el dashboard de administrador, verás una nueva pestaña verde "Configuración Fiscal"

3. **Completa los datos del emisor**
   - RFC, Razón Social, Régimen Fiscal, etc.

4. **Sube los certificados CSD**
   - Archivo `.cer`
   - Archivo `.key`
   - Contraseña del CSD
   - Haz clic en "Validar CSD"

5. **Configura el PAC**
   - Selecciona tu proveedor (Facturama, SW Sapien, Finkok)
   - Ingresa las credenciales de la API
   - **Mantén en modo Sandbox** hasta que estés listo para producción
   - Haz clic en "Probar Conexión"

6. **Guarda la configuración**

7. **Registra tus clientes**
   - Ve a la pestaña "Clientes Fiscales" (azul)
   - Agrega los datos fiscales de tus clientes
   - RFC, Razón Social, Régimen Fiscal, Email, CP, Uso de CFDI

## 🔧 5. Endpoints del servidor requeridos (Opcional)

Los siguientes endpoints son llamados por el componente pero son opcionales:

### `/validar-csd` (POST)
Valida que los archivos .cer y .key sean correctos con la contraseña proporcionada.

**Si no implementas este endpoint**, el componente aceptará los archivos sin validación estricta.

### `/probar-conexion-pac` (POST)
Prueba la conexión con el PAC seleccionado.

**Si no implementas este endpoint**, el componente simulará una conexión exitosa.

## ⚠️ Consideraciones de seguridad

### 1. Encriptación de datos sensibles

Los siguientes campos se encriptan antes de guardar en la base de datos:
- `csd_password` - Contraseña del Certificado de Sello Digital
- `pac_password` - Contraseña de la API del PAC

### 2. Archivos CSD

Los archivos `.cer` y `.key` se convierten a base64 antes de guardarse.

**Recomendación adicional:** En producción, considera usar Supabase Storage para almacenar estos archivos en lugar de guardarlos en la base de datos.

### 3. Row Level Security (RLS)

Las políticas RLS actuales verifican solo que el usuario esté autenticado.

**Para producción, debes:**

1. Crear una tabla `usuarios` con columna `role`
2. Actualizar las políticas RLS para verificar roles reales
3. Solo usuarios con rol `administrador` pueden editar `configuracion_fiscal`

Ver detalles en `/supabase/migrations/README_CFDI.md`

## 📋 Checklist final

- [ ] Instalada la dependencia `crypto-js`
- [ ] Aplicadas las migraciones SQL
- [ ] Configurada la clave de encriptación en variables de entorno
- [ ] Probado el acceso a "Configuración Fiscal" como admin
- [ ] Subidos y validados los certificados CSD
- [ ] Configurado y probado el PAC en modo sandbox
- [ ] Registrados los primeros clientes en "Clientes Fiscales"
- [ ] Revisadas las políticas RLS para producción

## 🆘 Solución de problemas

### Error: "crypto-js is not defined"
```bash
pnpm add crypto-js
```

### Error: "configuracion_fiscal table does not exist"
Ejecuta las migraciones SQL en Supabase.

### Los archivos CSD no se validan
Normal si no has implementado el endpoint `/validar-csd`. El componente acepta los archivos de todos modos.

### No puedo acceder a "Configuración Fiscal"
Verifica que tu usuario tenga rol `administrador`.

## 📚 Recursos adicionales

- [Documentación SAT - CFDI 4.0](http://omawww.sat.gob.mx/factura/Paginas/documentos_factura.htm)
- [Catálogos SAT](http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/Catalogos_revision_2022.xls)
- [API Facturama](https://www.facturama.mx/api/)
- [API SW Sapien](https://developers.sw.com.mx/)
- [API Finkok](https://wiki.finkok.com/)

---

**Listo!** 🎉 Tu módulo de facturación CFDI 4.0 está instalado y configurado.
