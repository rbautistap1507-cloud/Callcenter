# Migración: Módulo de Facturación CFDI 4.0

## Descripción

Este archivo SQL crea las tablas necesarias para el módulo de facturación electrónica CFDI 4.0 en el sistema LYMPOS.

## Tablas creadas

1. **configuracion_fiscal** - Configuración del emisor y credenciales del PAC
2. **clientes_fiscales** - Catálogo de clientes con datos fiscales
3. **cfdi_emitidos** - Registro de facturas electrónicas timbradas
4. **cfdi_conceptos** - Detalle de conceptos por cada CFDI

## Cómo aplicar la migración

### Opción 1: Desde la consola de Supabase

1. Accede a tu proyecto en https://supabase.com
2. Ve a **SQL Editor**
3. Crea un nuevo query
4. Copia y pega el contenido de `create_cfdi_tables.sql`
5. Ejecuta el query (Run)

### Opción 2: Usando Supabase CLI

```bash
# Desde la raíz del proyecto
supabase db reset  # Si quieres aplicar todas las migraciones desde cero

# O aplicar solo esta migración
supabase db push
```

### Opción 3: Ejecutar directamente con psql

```bash
psql -h <tu-host>.supabase.co -U postgres -d postgres -f supabase/migrations/create_cfdi_tables.sql
```

## Seguridad - Row Level Security (RLS)

Las políticas RLS están configuradas pero **requieren integración con tu sistema de autenticación**.

### ⚠️ IMPORTANTE: Ajustar políticas en producción

Las políticas actuales verifican solo que `auth.uid() IS NOT NULL`. En producción, debes:

1. **Crear una tabla de usuarios** con columna `role`:

```sql
CREATE TABLE usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT,
    nombre TEXT,
    role TEXT CHECK (role IN ('farmaceutico', 'medico', 'supervisor', 'gerente', 'administrador')),
    sucursal_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

2. **Actualizar las políticas RLS** para verificar roles reales:

```sql
-- Ejemplo para configuracion_fiscal
DROP POLICY IF EXISTS "Lectura configuracion_fiscal - roles autorizados" ON configuracion_fiscal;

CREATE POLICY "Lectura configuracion_fiscal - roles autorizados"
ON configuracion_fiscal
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM usuarios 
        WHERE id = auth.uid() 
        AND role IN ('supervisor', 'gerente', 'administrador')
    )
);
```

## Consideraciones de Seguridad

### 🔐 Datos sensibles

Los siguientes campos contienen información sensible y **DEBEN ser encriptados** antes de almacenarlos:

- `configuracion_fiscal.csd_password` - Contraseña del Certificado de Sello Digital
- `configuracion_fiscal.pac_password` - Contraseña de la API del PAC
- `configuracion_fiscal.csd_llave` - Llave privada del CSD

### Opciones de encriptación

#### Opción 1: Encriptar en la aplicación (Recomendado)

```typescript
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.ENCRYPTION_KEY; // Guardar en variables de entorno

// Encriptar antes de guardar
const encryptedPassword = CryptoJS.AES.encrypt(
    password, 
    SECRET_KEY
).toString();

// Desencriptar al usar
const decryptedPassword = CryptoJS.AES.decrypt(
    encryptedPassword, 
    SECRET_KEY
).toString(CryptoJS.enc.Utf8);
```

#### Opción 2: Usar extensión pgcrypto de PostgreSQL

```sql
-- Habilitar extensión
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encriptar al insertar
INSERT INTO configuracion_fiscal (csd_password, pac_password) 
VALUES (
    pgp_sym_encrypt('mi_password_csd', 'clave_secreta'),
    pgp_sym_encrypt('mi_password_pac', 'clave_secreta')
);

-- Desencriptar al consultar
SELECT 
    pgp_sym_decrypt(csd_password::bytea, 'clave_secreta') as csd_password_decrypted
FROM configuracion_fiscal;
```

#### Opción 3: Usar Supabase Vault (Recomendado para producción)

```sql
-- Almacenar en Vault
SELECT vault.create_secret('csd_password_value', 'mi_password_csd');
SELECT vault.create_secret('pac_password_value', 'mi_password_pac');

-- Referenciar el secret ID en la tabla
UPDATE configuracion_fiscal 
SET csd_password = 'vault_secret_id_here';

-- Recuperar el secret
SELECT vault.decrypted_secrets WHERE name = 'csd_password_value';
```

## Funcionalidades incluidas

### Auto-incremento de folios

Se incluye un trigger que incrementa automáticamente el `folio_actual` en `configuracion_fiscal` cada vez que se emite un nuevo CFDI.

### Timestamps automáticos

- `created_at` se establece automáticamente al crear registros
- `updated_at` se actualiza automáticamente en `configuracion_fiscal` y `clientes_fiscales`

### Validaciones

- RFC debe tener entre 12 y 13 caracteres
- Montos deben ser positivos
- Estados y tipos están restringidos a valores válidos del catálogo SAT

## Catálogos SAT importantes

### Uso de CFDI más comunes
- `G01` - Adquisición de mercancías
- `G02` - Devoluciones, descuentos o bonificaciones
- `G03` - Gastos en general
- `D01` - Honorarios médicos
- `S01` - Sin efectos fiscales (Público en general)

### Forma de pago
- `01` - Efectivo
- `03` - Transferencia electrónica de fondos
- `04` - Tarjeta de crédito
- `28` - Tarjeta de débito
- `29` - Tarjeta de servicios

### Método de pago
- `PUE` - Pago en Una Exhibición
- `PPD` - Pago en Parcialidades o Diferido

### Tipo de comprobante
- `I` - Ingreso (factura normal)
- `E` - Egreso (nota de crédito)
- `P` - Pago

### Objeto de impuesto
- `01` - No objeto de impuesto
- `02` - Sí objeto de impuesto
- `03` - Sí objeto del impuesto y no obligado al desglose

## Próximos pasos

1. ✅ Aplicar la migración en tu base de datos
2. ⚠️ Configurar encriptación para campos sensibles
3. ⚠️ Actualizar políticas RLS con verificación de roles real
4. 📝 Crear la tabla `usuarios` si no existe
5. 🔐 Configurar variables de entorno para claves de encriptación
6. 🧪 Probar en modo sandbox del PAC antes de producción
7. ✅ Implementar la interfaz de usuario para gestión de CFDIs (ConfiguracionFiscal.tsx, ClientesFiscales.tsx)
8. 📄 Implementar la interfaz de timbrado de facturas desde ventas

## Recursos adicionales

- [Documentación oficial SAT - CFDI 4.0](http://omawww.sat.gob.mx/factura/Paginas/documentos_factura.htm)
- [Catálogos SAT](http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/Catalogos_revision_2022.xls)
- [Facturama API Docs](https://www.facturama.mx/api/)
- [SW Sapien API Docs](https://developers.sw.com.mx/)

## Soporte

Para dudas o problemas con esta migración, contacta al equipo de desarrollo de LYMPOS.
