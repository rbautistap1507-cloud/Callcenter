# 🏥 Guía de Carga de Productos - LYMPOS

Esta guía te explica las diferentes formas de cargar productos en tu sistema LYMPOS con todos los campos necesarios para el punto de venta y gestión de inventario.

## 📋 Campos del Sistema

El sistema LYMPOS maneja los siguientes campos para cada producto:

### Campos Obligatorios ✅
- **Código de Barras**: Código único del producto (13 dígitos recomendado)
- **Nombre del Producto**: Nombre comercial completo
- **Precio Venta**: Precio de venta al público

### Campos Opcionales 📝
- **Lugar de Compra**: Proveedor o distribuidor
- **Grupo**: Categoría del medicamento (Analgésicos, Antibióticos, etc.)
- **Laboratorio**: Nombre del laboratorio fabricante
- **Sustancia Activa**: Principio activo del medicamento
- **Presentación**: Forma farmacéutica (Tableta, Jarabe, Cápsula, etc.)
- **Precio Compra**: Costo de adquisición del producto
- **Descripción**: Descripción del producto (máximo 69 caracteres)
- **Agrupación**: Agrupación comercial o categoría general
- **Clave SAT**: Clave del Servicio de Administración Tributaria
- **Stock Inicial**: Cantidad inicial para la sucursal actual

---

## 📥 Método 1: Importación desde Excel (Recomendado)

### Paso 1: Acceder al módulo de importación

1. Inicia sesión como **Supervisor**
2. Ve a **Menús de Administración**
3. Haz clic en **Importar Excel**

### Paso 2: Descargar la plantilla

1. En el modal que se abre, haz clic en **"Descargar Plantilla"**
2. Se descargará un archivo Excel con el formato correcto y ejemplos

### Paso 3: Llenar la plantilla

Abre el archivo descargado y completa con tus productos:

| Lugar de Compra | Grupo | Código de Barras | Laboratorio | Sustancia Activa | Presentación | Nombre del Producto | Precio Compra | Precio Venta | Descripción | Agrupación | Clave SAT | Stock Inicial |
|----------------|-------|------------------|-------------|------------------|--------------|---------------------|---------------|--------------|-------------|------------|-----------|---------------|
| Proveedor XYZ | Analgésicos | 7501234567890 | Laboratorio ABC | Paracetamol | Tableta | Paracetamol 500mg | 10.50 | 15.50 | Analgésico y antipirético de uso general | Medicamentos | 51121700 | 100 |
| Proveedor ABC | Antiinflamatorios | 7501234567891 | Laboratorio XYZ | Ibuprofeno | Tableta | Ibuprofeno 400mg | 18.00 | 25.00 | Antiinflamatorio no esteroideo | Medicamentos | 51121700 | 80 |

### Paso 4: Subir el archivo

1. Guarda tu archivo Excel
2. Haz clic en el área de carga o arrastra el archivo
3. Revisa la vista previa que muestra las primeras 5 filas
4. Verifica que los datos sean correctos
5. Haz clic en **"Importar Productos"**

### Paso 5: Verificación

El sistema mostrará un mensaje indicando:
- ✅ Cantidad de productos importados correctamente
- ⚠️ Cantidad de errores (si los hay)

**Importante:** El stock inicial se asignará únicamente a la sucursal seleccionada.

---

## 💻 Método 2: Importación Masiva via Consola

Para usuarios avanzados, puedes usar la consola del navegador para importar productos con JavaScript.

### Abrir la consola

- **Chrome/Edge**: Presiona `F12` → pestaña "Console"
- **Firefox**: Presiona `F12` → pestaña "Consola"

### Código de ejemplo

```javascript
const productos = [
  {
    codigoBarras: "7501001234567",
    nombre: "Aspirina 500mg",
    precioVenta: 12.50,
    precioCompra: 8.00,
    lugarCompra: "Distribuidora Farmacéutica SA",
    grupo: "Analgésicos",
    laboratorio: "Bayer",
    sustanciaActiva: "Ácido acetilsalicílico",
    presentacion: "Tableta",
    descripcion: "Analgésico, antipirético y antiinflamatorio",
    agrupacion: "Medicamentos OTC",
    claveSAT: "51121700",
    stockBySucursal: {
      carrera: 150,
      muzquiz: 120,
      porvenir: 80,
      zaragoza: 100,
      lavilla: 90,
      sanfelipe: 110
    }
  },
  {
    codigoBarras: "7501001234568",
    nombre: "Amoxicilina 500mg",
    precioVenta: 85.00,
    precioCompra: 60.00,
    lugarCompra: "Laboratorios Unidos",
    grupo: "Antibióticos",
    laboratorio: "Pisa",
    sustanciaActiva: "Amoxicilina",
    presentacion: "Cápsula",
    descripcion: "Antibiótico de amplio espectro",
    agrupacion: "Medicamentos Controlados",
    claveSAT: "51121700",
    stockBySucursal: {
      carrera: 80,
      muzquiz: 70,
      porvenir: 60,
      zaragoza: 75,
      lavilla: 65,
      sanfelipe: 80
    }
  }
];

// Ejecutar importación
fetch('https://teklpnqyqvpzmvurhjud.supabase.co/functions/v1/make-server-7d799f19/productos/bulk-import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRla2xwbnF5cXZwem12dXJoanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDMzMTksImV4cCI6MjA4MTQxOTMxOX0.SOc3Ymp0qmvDItqC_ug3ff84xXMx0YrmT9tICJrD-Os'
  },
  body: JSON.stringify({ productos })
})
.then(res => res.json())
.then(data => {
  console.log('✓ Resultado:', data);
  if (data.success) {
    console.log(`✅ ${data.message}`);
  }
})
.catch(err => console.error('✗ Error:', err));
```

---

## 🔄 Método 3: Actualización Individual de Stock

Si ya tienes productos cargados y solo necesitas actualizar el stock de una sucursal:

```javascript
const productoId = "producto:PROD-1234567890-1234"; // ID del producto
const sucursalId = "carrera"; // ID de la sucursal
const nuevaCantidad = 50; // Nueva cantidad en stock

fetch('https://teklpnqyqvpzmvurhjud.supabase.co/functions/v1/make-server-7d799f19/productos/' + productoId + '/stock', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRla2xwbnF5cXZwem12dXJoanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDMzMTksImV4cCI6MjA4MTQxOTMxOX0.SOc3Ymp0qmvDItqC_ug3ff84xXMx0YrmT9tICJrD-Os'
  },
  body: JSON.stringify({ sucursalId, cantidad: nuevaCantidad })
})
.then(res => res.json())
.then(data => console.log('✓ Stock actualizado:', data))
.catch(err => console.error('✗ Error:', err));
```

---

## 📖 Ejemplos de Productos por Categoría

### Analgésicos y Antipiréticos

```javascript
{
  codigoBarras: "7501001100001",
  nombre: "Paracetamol 500mg",
  precioVenta: 15.50,
  precioCompra: 10.00,
  lugarCompra: "Distribuidora Nacional",
  grupo: "Analgésicos",
  laboratorio: "Genomma Lab",
  sustanciaActiva: "Paracetamol",
  presentacion: "Tableta",
  descripcion: "Analgésico y antipirético para dolor leve a moderado",
  agrupacion: "Medicamentos OTC",
  claveSAT: "51121700"
}
```

### Antibióticos

```javascript
{
  codigoBarras: "7501001200001",
  nombre: "Amoxicilina 500mg Caja 12 Cápsulas",
  precioVenta: 85.00,
  precioCompra: 60.00,
  lugarCompra: "Laboratorios Farmacéuticos",
  grupo: "Antibióticos",
  laboratorio: "Pisa",
  sustanciaActiva: "Amoxicilina",
  presentacion: "Cápsula",
  descripcion: "Antibiótico betalactámico de amplio espectro",
  agrupacion: "Medicamentos Controlados",
  claveSAT: "51121700"
}
```

### Antiinflamatorios

```javascript
{
  codigoBarras: "7501001300001",
  nombre: "Ibuprofeno 400mg",
  precioVenta: 25.00,
  precioCompra: 18.00,
  lugarCompra: "Medicamentos del Centro",
  grupo: "Antiinflamatorios",
  laboratorio: "Grin",
  sustanciaActiva: "Ibuprofeno",
  presentacion: "Tableta",
  descripcion: "AINE para dolor e inflamación",
  agrupacion: "Medicamentos OTC",
  claveSAT: "51121700"
}
```

### Vitaminas y Suplementos

```javascript
{
  codigoBarras: "7501001400001",
  nombre: "Vitamina C 1000mg",
  precioVenta: 35.00,
  precioCompra: 22.00,
  lugarCompra: "Naturista SA",
  grupo: "Vitaminas",
  laboratorio: "Omnilife",
  sustanciaActiva: "Ácido ascórbico",
  presentacion: "Tableta efervescente",
  descripcion: "Suplemento vitamínico antioxidante",
  agrupacion: "Suplementos",
  claveSAT: "51121700"
}
```

---

## 🏢 IDs de Sucursales

Usa estos IDs al especificar el stock por sucursal:

| Sucursal | ID |
|----------|-----|
| Carrera | `carrera` |
| Muzquiz | `muzquiz` |
| Porvenir | `porvenir` |
| Zaragoza | `zaragoza` |
| La Villa | `lavilla` |
| San Felipe | `sanfelipe` |

---

## ✅ Validaciones del Sistema

El sistema valida automáticamente:

1. ✅ **Código de Barras**: Campo obligatorio, debe ser único
2. ✅ **Nombre del Producto**: Campo obligatorio
3. ✅ **Precio Venta**: Campo obligatorio, debe ser un número positivo
4. ⚠️ **Descripción**: Se trunca automáticamente a 69 caracteres
5. ⚠️ **Stock**: Si no se proporciona, se inicializa en 0 para todas las sucursales

---

## 🔍 Consultar Productos Cargados

Para ver todos los productos cargados en el sistema:

```javascript
fetch('https://teklpnqyqvpzmvurhjud.supabase.co/functions/v1/make-server-7d799f19/productos', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRla2xwbnF5cXZwem12dXJoanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDMzMTksImV4cCI6MjA4MTQxOTMxOX0.SOc3Ymp0qmvDItqC_ug3ff84xXMx0YrmT9tICJrD-Os'
  }
})
.then(res => res.json())
.then(data => {
  console.log('Productos en sistema:', data.productos.length);
  console.table(data.productos);
})
.catch(err => console.error('Error:', err));
```

---

## 🗑️ Eliminar Productos

Para eliminar un producto específico:

```javascript
const productoId = "producto:PROD-1234567890-1234";

fetch('https://teklpnqyqvpzmvurhjud.supabase.co/functions/v1/make-server-7d799f19/productos/' + productoId, {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRla2xwbnF5cXZwem12dXJoanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDMzMTksImV4cCI6MjA4MTQxOTMxOX0.SOc3Ymp0qmvDItqC_ug3ff84xXMx0YrmT9tICJrD-Os'
  }
})
.then(res => res.json())
.then(data => console.log('✓ Producto eliminado:', data))
.catch(err => console.error('✗ Error:', err));
```

---

## 💡 Tips y Mejores Prácticas

1. **Códigos de Barras**: Usa el formato estándar EAN-13 (13 dígitos)
2. **Nombres**: Sé descriptivo e incluye la presentación (ej: "Paracetamol 500mg 20 tabletas")
3. **Precios**: Usa dos decimales para mayor precisión
4. **Descripción**: Aprovecha los 69 caracteres para incluir información útil
5. **Stock Inicial**: Si usas Excel, el stock se asigna solo a la sucursal actual
6. **Claves SAT**: Consulta el catálogo oficial del SAT para medicamentos (51121700 es el código general)
7. **Respaldos**: Antes de importar masivamente, prueba con 5-10 productos
8. **Validación**: Revisa siempre la vista previa antes de confirmar la importación

---

## ❓ Preguntas Frecuentes

**P: ¿Qué pasa si el código de barras ya existe?**
R: Se creará un nuevo producto con un ID único. El sistema permite códigos duplicados.

**P: ¿Puedo modificar un producto después de crearlo?**
R: Actualmente solo puedes actualizar el stock. Para modificar otros campos, elimina y vuelve a crear el producto.

**P: ¿Cómo sé el ID de un producto para actualizarlo?**
R: Usa el código de consulta de productos mostrado arriba. Cada producto tiene un campo `_key` que es su ID.

**P: ¿El inventario se actualiza automáticamente al vender?**
R: Sí, el sistema descuenta automáticamente del stock de la sucursal correspondiente.

**P: ¿Puedo importar productos sin stock?**
R: Sí, simplemente no incluyas la columna "Stock Inicial" o déjala en blanco.

---

## 📞 Soporte

Para más información sobre el sistema LYMPOS, contacta al equipo de desarrollo.

**Versión:** 2.0.0  
**Última actualización:** Diciembre 2024
