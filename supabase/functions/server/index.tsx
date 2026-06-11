import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono().basePath('/make-server-7d799f19');

// Middleware
app.use("*", cors({ origin: "*" }));
app.use("*", logger(console.log));

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Inicializar buckets de storage al arrancar el servidor
(async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    
    // Crear bucket para médicos si no existe
    const medicosBucketName = "make-7d799f19-medicos";
    const medicosBucketExists = buckets?.some(bucket => bucket.name === medicosBucketName);
    
    if (!medicosBucketExists) {
      // Crear bucket público para permitir operaciones de upload
      await supabase.storage.createBucket(medicosBucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
      });
      console.log(`Bucket ${medicosBucketName} creado exitosamente como público`);
    } else {
      // Si ya existe, actualizar sus configuraciones para ser público
      try {
        await supabase.storage.updateBucket(medicosBucketName, {
          public: true,
          fileSizeLimit: 5242880,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
        });
        console.log(`Bucket ${medicosBucketName} actualizado a público`);
      } catch (error) {
        console.log(`Bucket ${medicosBucketName} ya existe (no se pudo actualizar, esto es normal)`);
      }
    }
  } catch (error) {
    console.error("Error inicializando buckets de storage:", error);
  }
})();

// Función para generar código único de receta
function generateCode(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// ==================== STORAGE / UPLOAD ROUTES ====================
app.post("/upload-logo", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return c.json({ error: "No se proporcionó ningún archivo" }, 400);
    }
    
    // Validar tipo de archivo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Tipo de archivo no permitido. Solo se permiten imágenes." }, 400);
    }
    
    // Validar tamaño (5MB max)
    if (file.size > 5242880) {
      return c.json({ error: "El archivo es demasiado grande. Máximo 5MB." }, 400);
    }
    
    const fileName = `logo-escuela-${Date.now()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Upload usando SERVICE_ROLE_KEY (bypassa RLS)
    const { data, error } = await supabase.storage
      .from('make-7d799f19-medicos')
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: false
      });
    
    if (error) {
      console.error("Error subiendo archivo a storage:", error);
      return c.json({ error: `Error subiendo archivo: ${error.message}` }, 500);
    }
    
    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('make-7d799f19-medicos')
      .getPublicUrl(fileName);
    
    return c.json({ 
      success: true, 
      fileName,
      publicUrl: urlData.publicUrl
    });
  } catch (error) {
    console.error("Error en endpoint upload-logo:", error);
    return c.json({ error: `Error procesando upload: ${error.message || error}` }, 500);
  }
});

// ==================== AUDIT LOGS ====================
async function createAuditLog(action: string, user: string, role: string, details: string, sucursalId: string = "") {
  try {
    const logId = `audit:${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const logEntry = {
      id: logId,
      action,
      user, // Nombre del usuario o identificador
      role, // Rol del usuario (ej. Supervisor)
      details,
      sucursalId,
      timestamp: new Date().toISOString(),
    };
    await kv.set(logId, logEntry);
    console.log(`Audit Log created: ${action} by ${user}`);
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
}

app.get("/audit", async (c) => {
  try {
    const logs = await kv.getByPrefix("audit:");
    // Ordenar por fecha descendente
    const sortedLogs = logs.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return c.json({ success: true, logs: sortedLogs });
  } catch (error) {
    console.log("Error obteniendo audit logs:", error);
    return c.json({ error: "Error obteniendo logs de auditoría" }, 500);
  }
});

// ==================== AUTH ROUTES ====================
app.post("/auth/login", async (c) => {
  try {
    const { username, password } = await c.req.json();
    
    const users = await kv.getByPrefix("user:");
    let user = users.find((u: any) => u.username === username && u.password === password);
    
    // Fallback de seguridad para admin
    if (!user && username === "admin" && password === "admin123") {
      user = {
        id: "user:admin1",
        username: "admin",
        role: "admin",
        name: "Administrador General",
        activo: true
      };
      // Auto-reparación: Crear el usuario si no existe
      await kv.set(user.id, { ...user, password: "admin123" });
    }
    
    if (!user) {
      return c.json({ error: "Credenciales inválidas" }, 401);
    }
    
    // Verificar que el usuario esté activo (solo para gerentes y supervisores)
    if ((user.role === "gerente" || user.role === "supervisor") && user.activo === false) {
      return c.json({ error: "Usuario deshabilitado. Contacte al administrador." }, 403);
    }
    
    const { password: _, ...userSinPassword } = user;
return c.json({ 
  success: true, 
  user: {
    ...userSinPassword,
    plan: user.plan || "starter"
  }
});
  } catch (error) {
    console.log("Error en login:", error);
    return c.json({ error: "Error en el servidor" }, 500);
  }
});

app.get("/users", async (c) => {
  try {
    const users = await kv.getByPrefix("user:");
    // Filtrar contraseñas por seguridad
    const safeUsers = users.map((u: any) => {
      const { password, ...rest } = u;
      return rest;
    });
    return c.json({ success: true, users: safeUsers });
  } catch (error) {
    console.log("Error obteniendo usuarios:", error);
    return c.json({ error: "Error obteniendo usuarios" }, 500);
  }
});

app.get("/medicos", async (c) => {
  try {
    const users = await kv.getByPrefix("user:");
    const medicos = users.filter((u: any) => u.role === "medico").map((u: any) => {
       const { password, ...rest } = u;
       return rest;
    });
    return c.json({ success: true, medicos });
  } catch (error) {
    console.log("Error obteniendo medicos:", error);
    return c.json({ error: "Error obteniendo medicos" }, 500);
  }
});

// Eliminar TODOS los médicos (usuarios con role=medico + prefijo medico:)
app.delete("/medicos/clear-all", async (c) => {
  try {
    let deletedCount = 0;

    // 1. Eliminar usuarios con role === "medico" (prefijo user:)
    const allUsers = await kv.getByPrefix("user:");
    const medicoUsers = allUsers.filter((u: any) => u.role === "medico");
    for (const u of medicoUsers) {
      await kv.del(u.id);
      deletedCount++;
      console.log(`Médico eliminado (user:): ${u.id}`);
    }

    // 2. Eliminar registros con prefijo medico: (ruta antigua)
    const oldMedicos = await kv.getByPrefix("medico:");
    for (const m of oldMedicos) {
      await kv.del(m.id);
      deletedCount++;
      console.log(`Médico eliminado (medico:): ${m.id}`);
    }

    // 3. Eliminar históricos de médicos
    const historicos = await kv.getByPrefix("historico:medico:");
    for (const h of historicos) {
      await kv.del(h.id);
      deletedCount++;
      console.log(`Histórico médico eliminado: ${h.id}`);
    }

    console.log(`Total de registros de médicos eliminados: ${deletedCount}`);
    return c.json({ success: true, deletedCount });
  } catch (error) {
    console.log("Error limpiando directorio de médicos:", error);
    return c.json({ error: "Error limpiando directorio de médicos" }, 500);
  }
});

app.get("/farmaceuticos", async (c) => {
  try {
    const users = await kv.getByPrefix("user:");
    const farmaceuticos = users.filter((u: any) => u.role === "farmaceutico").map((u: any) => {
       const { password, ...rest } = u;
       return rest;
    });
    return c.json({ success: true, farmaceuticos });
  } catch (error) {
    console.log("Error obteniendo farmaceuticos:", error);
    return c.json({ error: "Error obteniendo farmaceuticos" }, 500);
  }
});

// ==================== USERS ROUTES ====================
app.post("/users", async (c) => {
  try {
    const userData = await c.req.json();
    
    // Generar username a partir del email o nombre si no se proporciona
    let username = userData.username;
    if (!username) {
      if (userData.email) {
        username = userData.email.split('@')[0];
      } else if (userData.nombre) {
        username = userData.nombre.toLowerCase().replace(/\s+/g, '_');
      } else {
        username = generateCode("USER");
      }
    }
    
    const userId = `user:${username}`;
    
    // Check if username exists
    const existingUser = await kv.get(userId);
    if (existingUser) {
      return c.json({ error: "El usuario ya existe" }, 400);
    }

    // Crear el objeto de usuario completo
    const newUser = {
      ...userData,
      id: userId,
      username: username,
      name: userData.nombre || userData.name,
      activo: true, // Por defecto todos los usuarios están activos
      fechaCreacion: new Date().toISOString(),
    };

    await kv.set(userId, newUser);
    
    // AUDIT LOG
    await createAuditLog(
      "CREACION_USUARIO",
      "Administrador",
      "Administrador",
      `Usuario creado: ${username} (${userData.role})`,
      userData.sucursalId || ""
    );

    return c.json({ success: true, userId, user: newUser });
  } catch (error) {
    console.log("Error creando usuario:", error);
    return c.json({ error: "Error creando usuario" }, 500);
  }
});

app.put("/users/:id", async (c) => {
  try {
    // Decodificar una sola vez (Hono puede pre-decodificar params)
    const rawId = c.req.param("id");
    const id = rawId.includes("%") ? decodeURIComponent(rawId) : rawId;
    const updates = await c.req.json();
    
    console.log(`PUT /users - Buscando usuario con id: "${id}"`);

    // Buscar primero por id directo, si no por prefijo
    let user = await kv.get(id);
    if (!user) {
      // Intentar buscando en todos los usuarios (fallback por si el id no coincide exactamente)
      const allUsers = await kv.getByPrefix("user:");
      user = allUsers.find((u: any) => u.id === id || u.username === id.replace("user:", ""));
    }
    if (!user) {
      console.log(`PUT /users - Usuario no encontrado: "${id}"`);
      return c.json({ error: `Usuario no encontrado: ${id}` }, 404);
    }
    
    // Usar el id real almacenado en el objeto usuario para el guardado
    const realId = user.id || id;
    console.log(`Actualizando usuario ${realId}:`, updates);
    
    const updatedUser = { ...user, ...updates, id: realId };
    await kv.set(realId, updatedUser);
    
    console.log(`Usuario ${realId} actualizado exitosamente`);
    
    // AUDIT LOG
    await createAuditLog(
      "EDICION_USUARIO",
      "Supervisor",
      "Supervisor",
      `Usuario editado: ${user.username} (${user.role})`,
      ""
    );

    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.log("Error actualizando usuario:", error);
    return c.json({ error: "Error actualizando usuario" }, 500);
  }
});

app.delete("/users/:id", async (c) => {
  try {
    const rawId = c.req.param("id");
    const id = rawId.includes("%") ? decodeURIComponent(rawId) : rawId;
    console.log(`DELETE /users - Eliminando usuario con id: "${id}"`);
    let user = await kv.get(id);
    if (!user) {
      const allUsers = await kv.getByPrefix("user:");
      user = allUsers.find((u: any) => u.id === id || u.username === id.replace("user:", ""));
    }
    
    if (user) {
      // Usar el id real almacenado en el objeto usuario para la eliminación
      const realId = user.id || id;
      
      // Registrar ANTES de eliminar
      console.log("🗑️ ELIMINANDO USUARIO:");
      console.log("   ID:", realId);
      console.log("   Username:", user.username);
      console.log("   Role:", user.role);
      console.log("   Name:", user.name);
      console.log("   Timestamp:", new Date().toISOString());
      
      // Guardar registro de auditoría permanente
      const auditKey = `audit:delete_user:${Date.now()}`;
      await kv.set(auditKey, {
        action: "DELETE_USER",
        userId: realId,
        username: user.username,
        role: user.role,
        name: user.name,
        timestamp: new Date().toISOString()
      });
      
      await kv.del(realId);
      console.log("✅ Usuario eliminado permanentemente");
      
      // AUDIT LOG
      await createAuditLog(
        "ELIMINACION_USUARIO",
        "Admin",
        "Admin",
        `Usuario eliminado permanentemente: ${user.username} (${user.role})`,
        ""
      );
    }
    
    return c.json({ success: true, message: "Usuario eliminado" });
  } catch (error) {
    console.log("Error eliminando usuario:", error);
    return c.json({ error: "Error eliminando usuario" }, 500);
  }
});

// Toggle activo/inactivo para médicos
app.post("/users/:id/toggle-active", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    const { activo } = await c.req.json();
    
    const user = await kv.get(id);
    if (!user) {
      return c.json({ error: "Usuario no encontrado" }, 404);
    }
    
    // Actualizar estado del usuario
    const updatedUser = { ...user, activo };
    await kv.set(id, updatedUser);
    
    // Si se está desactivando un médico, mover sus datos al histórico
    if (!activo && user.role === "medico") {
      // Obtener todas las consultas del médico
      const allConsultas = await kv.getByPrefix("consulta:");
      const consultasMedico = allConsultas.filter((c: any) => c.medicoId === id);
      
      // Obtener todas las recetas del médico
      const allRecetas = await kv.getByPrefix("receta:");
      const recetasMedico = allRecetas.filter((r: any) => r.medicoId === id);
      
      // Guardar en histórico con timestamp
      const timestamp = new Date().toISOString();
      const historicoId = `historico:medico:${id}:${timestamp}`;
      
      await kv.set(historicoId, {
        id: historicoId,
        medicoId: id,
        medicoInfo: {
          nombre: user.name || user.nombre,
          cedula: user.cedula,
          especialidad: user.especialidad,
          email: user.email,
        },
        fechaDesactivacion: timestamp,
        consultas: consultasMedico,
        recetas: recetasMedico,
        totalConsultas: consultasMedico.length,
        totalRecetas: recetasMedico.length,
      });
      
      console.log(`Histórico creado para médico ${user.name}: ${consultasMedico.length} consultas, ${recetasMedico.length} recetas`);
    }
    
    // AUDIT LOG
    const action = activo 
      ? (user.role === "medico" ? "MEDICO_REACTIVADO" : "USUARIO_HABILITADO")
      : (user.role === "medico" ? "MEDICO_DESACTIVADO" : "USUARIO_DESHABILITADO");
    
    await createAuditLog(
      action,
      "Administrador",
      "Administrador",
      `${user.role === "medico" ? "Médico" : "Usuario"} ${user.name || user.nombre} ${activo ? "habilitado" : "deshabilitado"} (${user.role})`,
      user.sucursalId || ""
    );
    
    return c.json({ 
      success: true, 
      message: activo 
        ? (user.role === "medico" ? "Médico reactivado" : "Usuario habilitado")
        : (user.role === "medico" ? "Médico desactivado y datos enviados al histórico" : "Usuario deshabilitado"),
      user: updatedUser 
    });
  } catch (error) {
    console.log("Error cambiando estado del médico:", error);
    return c.json({ error: "Error cambiando estado del médico" }, 500);
  }
});

// Obtener histórico de médicos desactivados
app.get("/historico-medicos", async (c) => {
  try {
    const historicos = await kv.getByPrefix("historico:medico:");
    
    // Ordenar por fecha de desactivación (más recientes primero)
    const historicosOrdenados = historicos.sort((a: any, b: any) => {
      const dateA = new Date(a.fechaDesactivacion).getTime();
      const dateB = new Date(b.fechaDesactivacion).getTime();
      return dateB - dateA;
    });
    
    return c.json({ success: true, historicos: historicosOrdenados });
  } catch (error) {
    console.log("Error obteniendo histórico de médicos:", error);
    return c.json({ error: "Error obteniendo histórico de médicos" }, 500);
  }
});

// Obtener histórico específico de un médico
app.get("/historico-medicos/:medicoId", async (c) => {
  try {
    const medicoId = c.req.param("medicoId");
    const allHistoricos = await kv.getByPrefix(`historico:medico:${medicoId}:`);
    
    // Ordenar por fecha de desactivación
    const historicosOrdenados = allHistoricos.sort((a: any, b: any) => {
      const dateA = new Date(a.fechaDesactivacion).getTime();
      const dateB = new Date(b.fechaDesactivacion).getTime();
      return dateB - dateA;
    });
    
    return c.json({ success: true, historicos: historicosOrdenados });
  } catch (error) {
    console.log("Error obteniendo histórico del médico:", error);
    return c.json({ error: "Error obteniendo histórico del médico" }, 500);
  }
});

// ==================== PRODUCTOS ROUTES ====================
app.get("/productos", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // Obtener productos con sus keys
    const { data, error } = await supabase
      .from("kv_store_7d799f19")
      .select("key, value")
      .like("key", "producto:%")
      .limit(10000);
    
    if (error) {
      console.log("Error obteniendo productos:", error);
      return c.json({ error: "Error obteniendo productos" }, 500);
    }
    
    // Agregar el id (key) a cada producto
    const productos = data?.map((d) => ({ 
      ...d.value, 
      id: d.key 
    })) ?? [];
    
    return c.json({ success: true, productos });
  } catch (error) {
    console.log("Error obteniendo productos:", error);
    return c.json({ error: "Error obteniendo productos" }, 500);
  }
});

// ==================== INVENTORY ROUTE (para Dashboard Gerencial) ====================
app.get("/inventory", async (c) => {
  try {
    const sucursalParam = c.req.query("sucursal");
    console.log("📦 Solicitud de inventario para sucursal:", sucursalParam);
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // Obtener productos con sus keys
    const { data, error } = await supabase
      .from("kv_store_7d799f19")
      .select("key, value")
      .like("key", "producto:%")
      .limit(10000);
    
    if (error) {
      console.log("❌ Error obteniendo productos:", error);
      return c.json({ error: "Error obteniendo productos" }, 500);
    }
    
    let productos = data?.map((d) => ({ 
      ...d.value, 
      id: d.key 
    })) ?? [];
    
    console.log(`📦 Total productos encontrados: ${productos.length}`);
    
    // Si se especifica sucursal, filtrar por ella
    if (sucursalParam) {
      // Mapear nombres de sucursales a IDs
      const sucursalMap: { [key: string]: string } = {
        "Carrera": "carrera",
        "Muzquiz": "muzquiz",
        "Porvenir": "porvenir",
        "Zaragoza": "zaragoza",
        "La Villa": "lavilla",
        "San Felipe": "sanfelipe"
      };
      
      const sucursalKey = sucursalMap[sucursalParam] || sucursalParam.toLowerCase().replace(/\s+/g, "");
      console.log(`📦 Nombre: ${sucursalParam}, ID mapeado: ${sucursalKey}`);
      
      // Agregar cantidad específica de la sucursal
      productos = productos.map((p: any) => {
        // El stock puede estar en stockBySucursal o stockPorSucursal
        const stock = p.stockBySucursal || p.stockPorSucursal || {};
        const cantidad = stock[sucursalKey] || 0;
        
        return {
          ...p,
          cantidad: cantidad
        };
      });
      
      console.log(`📦 Productos procesados para ${sucursalParam}: ${productos.length}`);
      console.log(`📦 Ejemplo de producto:`, productos[0] || "No hay productos");
    }
    
    return c.json(productos);
  } catch (error) {
    console.log("❌ Error obteniendo inventario:", error);
    return c.json({ error: "Error obteniendo inventario" }, 500);
  }
});

app.post("/productos", async (c) => {
  try {
    const producto = await c.req.json();
    
    // Validaciones
    if (!producto.nombre || !producto.codigoBarras || !producto.categoria) {
      return c.json({ error: "Faltan campos requeridos: nombre, codigoBarras y categoría" }, 400);
    }
    
    if (!producto.precioVenta || producto.precioVenta <= 0) {
      return c.json({ error: "El precio de venta debe ser mayor a 0" }, 400);
    }
    
    if (!producto.costo || producto.costo <= 0) {
      return c.json({ error: "El costo debe ser mayor a 0" }, 400);
    }
    
    if (producto.precioVenta < producto.costo) {
      return c.json({ error: "El precio de venta no puede ser menor al costo" }, 400);
    }
    
    // Verificar que el código de barras no esté duplicado
    const productosExistentes = await kv.getByPrefix("producto:");
    const codigoDuplicado = productosExistentes.find((p: any) => 
      p.codigoBarras === producto.codigoBarras
    );
    
    if (codigoDuplicado) {
      return c.json({ error: "Ya existe un producto con este código de barras" }, 400);
    }
    
    const productoId = `producto:${generateCode("PROD")}`;
    
    // Inicializar stockBySucursal si no existe
    if (!producto.stockBySucursal) {
      // Si se especifica una sucursal, inicializar solo esa sucursal en 0
      if (producto.sucursalId) {
        producto.stockBySucursal = { [producto.sucursalId]: producto.stockInicial || 0 };
      } else {
        // Si no se especifica sucursal, inicializar todas las sucursales en 0
        const sucursales = ["carrera", "muzquiz", "porvenir", "zaragoza", "lavilla", "sanfelipe"];
        producto.stockBySucursal = Object.fromEntries(sucursales.map(s => [s, 0]));
      }
    }
    
    // Limpiar campos temporales
    delete producto.sucursalId;
    delete producto.stockInicial;
    
    await kv.set(productoId, producto);
    
    console.log(`Producto creado: ${productoId} - ${producto.nombre} (${producto.codigoBarras})`);
    
    return c.json({ success: true, productoId, producto });
  } catch (error) {
    console.log("Error creando producto:", error);
    return c.json({ error: "Error creando producto" }, 500);
  }
});
// ==================== AUDITORIA / TRAZABILIDAD ROUTES ====================

// GET movimientos de un producto (cruza por productoId interno Y codigo de barras)
app.get("/productos/:codigo/movimientos", async (c) => {
  try {
    const codigo = c.req.param("codigo");
    const sucursalFiltro = c.req.query("sucursal"); // opcional

    // Resolver el producto para tener ambos identificadores
    const productos = await kv.getByPrefix("producto:");
    const producto = productos.find(
      (p: any) => p.codigoBarras === codigo || p.id === codigo
    );
    if (!producto) {
      return c.json({ error: "Producto no encontrado" }, 404);
    }
    const idInterno = producto.id;            // producto:PROD-xxxx
    const codigoBarras = producto.codigoBarras; // 7501xxxx

    const coincide = (valor: any) =>
      valor === idInterno || valor === codigoBarras;

    const movimientos: any[] = [];

    // COMPRAS (entradas) - usan productoId = codigo de barras
    const compras = await kv.getByPrefix("compra:");
    compras.forEach((comp: any) => {
      if (coincide(comp.productoId)) {
        if (sucursalFiltro && comp.sucursalId !== sucursalFiltro) return;
        movimientos.push({
          tipo: "compra",
          fecha: comp.fecha || comp.fechaCreacion,
          cantidad: comp.cantidad || 0,
          direccion: "entrada",
          sucursalId: comp.sucursalId,
          usuario: comp.usuarioNombre || comp.proveedor || "-",
          nota: `Compra ${comp.estatus || ""} - Ref: ${comp.referencia || comp.factura || "-"}`,
          estatus: comp.estatus,
        });
      }
    });

    // VENTAS (salidas) - productos[].productoId = id interno
    const ventas = await kv.getByPrefix("venta:");
    ventas.forEach((v: any) => {
      if (sucursalFiltro && v.sucursalId !== sucursalFiltro) return;
      (v.productos || []).forEach((p: any) => {
        if (coincide(p.productoId)) {
          movimientos.push({
            tipo: "venta",
            fecha: v.fecha,
            cantidad: p.cantidad || 0,
            direccion: v.estado === "devuelto" ? "entrada" : "salida",
            sucursalId: v.sucursalId,
            usuario: v.usuario || "-",
            nota: v.estado === "devuelto" ? "Venta devuelta" : `Venta - Folio ${(v.id || "").replace("venta:", "").substring(0,12)}`,
            estatus: v.estado || "completado",
          });
        }
      });
    });

    // AJUSTES - productoId = codigo de barras
    const ajustes = await kv.getByPrefix("ajuste:");
    ajustes.forEach((a: any) => {
      if (coincide(a.productoId)) {
        if (sucursalFiltro && a.sucursalId !== sucursalFiltro) return;
        movimientos.push({
          tipo: "ajuste",
          fecha: a.fecha || a.fechaCreacion,
          cantidad: a.cantidad || 0,
          direccion: a.accion === "agregar" ? "entrada" : "salida",
          sucursalId: a.sucursalId,
          usuario: a.creadoPor || "-",
          nota: `Ajuste (${a.accion}) - ${a.motivo || ""}: ${a.notas || ""}`,
          nuevoStock: a.nuevoStock,
        });
      }
    });

    // TRASLADOS - pueden tener productoId o lista de productos
    const traslados = await kv.getByPrefix("traslado:");
    traslados.forEach((t: any) => {
      // Caso 1: traslado de un producto directo
      if (coincide(t.productoId)) {
        movimientos.push({
          tipo: "traslado",
          fecha: t.fecha || t.fechaCreacion,
          cantidad: t.cantidad || 0,
          direccion: "traslado",
          sucursalId: `${t.sucursalOrigen || "?"} -> ${t.sucursalDestino || "?"}`,
          usuario: t.creadoPor || "-",
          nota: `Traslado ${t.estado || ""}`,
        });
      }
      // Caso 2: traslado con lista de productos
      (t.productos || []).forEach((p: any) => {
        if (coincide(p.productoId)) {
          movimientos.push({
            tipo: "traslado",
            fecha: t.fecha || t.fechaCreacion,
            cantidad: p.cantidad || 0,
            direccion: "traslado",
            sucursalId: `${t.sucursalOrigen || "?"} -> ${t.sucursalDestino || "?"}`,
            usuario: t.creadoPor || "-",
            nota: `Traslado ${t.estado || ""}`,
          });
        }
      });
    });

    // AUDITORIAS - productoId = codigo de barras o id interno
    const auditorias = await kv.getByPrefix("auditoria:");
    auditorias.forEach((au: any) => {
      if (coincide(au.productoId) || coincide(au.codigoBarras)) {
        if (sucursalFiltro && au.sucursalId !== sucursalFiltro) return;
        movimientos.push({
          tipo: "auditoria",
          fecha: au.fecha || au.fechaCreacion,
          cantidad: au.stockFisico,
          direccion: "auditoria",
          sucursalId: au.sucursalId,
          usuario: au.confirmadoPor || "-",
          nota: au.estado === "ajustado"
            ? `Auditoría: ajustado de ${au.stockSistema} a ${au.stockFisico} (dif ${au.diferencia})`
            : `Auditoría: inventario confirmado correcto (${au.stockFisico})`,
          estado: au.estado,
        });
      }
    });

    // Ordenar cronológicamente
    movimientos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    // Stock actual por sucursal
    const stockActual = producto.stockBySucursal || {};

    return c.json({
      success: true,
      producto: {
        id: producto.id,
        nombre: producto.nombre,
        codigoBarras: producto.codigoBarras,
        stockBySucursal: stockActual,
      },
      movimientos,
    });
  } catch (error) {
    console.log("Error obteniendo movimientos:", error);
    return c.json({ error: "Error obteniendo movimientos del producto" }, 500);
  }
});

// POST auditoria individual - confirma inventario de un producto
app.post("/auditorias", async (c) => {
  try {
    const body = await c.req.json();
    const { productoId, sucursalId, stockFisico, notas, confirmadoPor } = body;

    const productos = await kv.getByPrefix("producto:");
    const producto = productos.find(
      (p: any) => p.codigoBarras === productoId || p.id === productoId
    );
    if (!producto) {
      return c.json({ error: "Producto no encontrado" }, 404);
    }

    const stockSistema = (producto.stockBySucursal || {})[sucursalId] || 0;
    const fisico = parseInt(stockFisico);
    const diferencia = fisico - stockSistema;
    const requiereAjuste = diferencia !== 0;

    // Si hay diferencia, crear ajuste para corregir
    if (requiereAjuste) {
      const ajusteId = `ajuste:${generateCode("ADJ")}`;
      await kv.set(ajusteId, {
        id: ajusteId,
        productoId: producto.codigoBarras,
        nombreProducto: producto.nombre,
        sucursalId,
        accion: diferencia > 0 ? "agregar" : "restar",
        cantidad: Math.abs(diferencia),
        nuevoStock: fisico,
        motivo: "inventario_fisico",
        notas: `Ajuste automático por auditoría. ${notas || ""}`,
        creadoPor: confirmadoPor || "Auditoría",
        referencia: "auditoria",
        fecha: new Date().toISOString(),
        fechaCreacion: new Date().toISOString(),
      });
      // Actualizar stock
      const stockBySucursal = { ...producto.stockBySucursal };
      stockBySucursal[sucursalId] = fisico;
      await kv.set(producto.id, { ...producto, stockBySucursal });
    }

    // Registrar la auditoría
    const auditoriaId = `auditoria:${generateCode("AUD")}`;
    await kv.set(auditoriaId, {
      id: auditoriaId,
      productoId: producto.id,
      codigoBarras: producto.codigoBarras,
      nombreProducto: producto.nombre,
      sucursalId,
      stockSistema,
      stockFisico: fisico,
      diferencia,
      ajusteAplicado: requiereAjuste,
      estado: requiereAjuste ? "ajustado" : "correcto",
      notas: notas || "",
      confirmadoPor: confirmadoPor || "Auditoría",
      tipoAuditoria: "individual",
      fecha: new Date().toISOString(),
      fechaCreacion: new Date().toISOString(),
    });

    return c.json({ success: true, auditoriaId, diferencia, estado: requiereAjuste ? "ajustado" : "correcto" });
  } catch (error) {
    console.log("Error creando auditoría:", error);
    return c.json({ error: "Error creando auditoría" }, 500);
  }
});

// POST auditoria masiva - procesa inventario fisico de varios productos
app.post("/auditorias/masiva", async (c) => {
  try {
    const body = await c.req.json();
    const { sucursalId, items, confirmadoPor } = body;
    // items = [{ productoId, stockFisico }]

    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: "No hay items para procesar" }, 400);
    }

    const productos = await kv.getByPrefix("producto:");
    let confirmados = 0;
    let ajustados = 0;
    const detalles: any[] = [];

    for (const item of items) {
      const producto = productos.find(
        (p: any) => p.codigoBarras === item.productoId || p.id === item.productoId
      );
      if (!producto) continue;

      const stockSistema = (producto.stockBySucursal || {})[sucursalId] || 0;
      const fisico = parseInt(item.stockFisico);
      if (isNaN(fisico)) continue;
      const diferencia = fisico - stockSistema;
      const requiereAjuste = diferencia !== 0;

      if (requiereAjuste) {
        const ajusteId = `ajuste:${generateCode("ADJ")}`;
        await kv.set(ajusteId, {
          id: ajusteId,
          productoId: producto.codigoBarras,
          nombreProducto: producto.nombre,
          sucursalId,
          accion: diferencia > 0 ? "agregar" : "restar",
          cantidad: Math.abs(diferencia),
          nuevoStock: fisico,
          motivo: "inventario_fisico",
          notas: "Ajuste automático por inventario físico masivo",
          creadoPor: confirmadoPor || "Inventario Físico",
          referencia: "auditoria_masiva",
          fecha: new Date().toISOString(),
          fechaCreacion: new Date().toISOString(),
        });
        const stockBySucursal = { ...producto.stockBySucursal };
        stockBySucursal[sucursalId] = fisico;
        await kv.set(producto.id, { ...producto, stockBySucursal });
        ajustados++;
      } else {
        confirmados++;
      }

      const auditoriaId = `auditoria:${generateCode("AUD")}`;
      await kv.set(auditoriaId, {
        id: auditoriaId,
        productoId: producto.id,
        codigoBarras: producto.codigoBarras,
        nombreProducto: producto.nombre,
        sucursalId,
        stockSistema,
        stockFisico: fisico,
        diferencia,
        ajusteAplicado: requiereAjuste,
        estado: requiereAjuste ? "ajustado" : "correcto",
        notas: "Inventario físico masivo",
        confirmadoPor: confirmadoPor || "Inventario Físico",
        tipoAuditoria: "masiva",
        fecha: new Date().toISOString(),
        fechaCreacion: new Date().toISOString(),
      });

      detalles.push({ nombre: producto.nombre, stockSistema, stockFisico: fisico, diferencia });
    }

    return c.json({ success: true, confirmados, ajustados, total: confirmados + ajustados, detalles });
  } catch (error) {
    console.log("Error en auditoría masiva:", error);
    return c.json({ error: "Error procesando inventario físico" }, 500);
  }
});

// ==================== VENTAS ROUTES ====================
app.get("/ventas", async (c) => {
  try {
    const sucursalParam = c.req.query("sucursal");
    console.log("💰 Solicitud de ventas para sucursal:", sucursalParam);
    
    let ventas = await kv.getByPrefix("venta:");
    console.log(`💰 Total ventas en base de datos: ${ventas.length}`);
    
    // Filtrar por sucursal si se especifica
    if (sucursalParam) {
      // Mapear nombres de sucursales a IDs
      const sucursalMap: { [key: string]: string } = {
        "Carrera": "carrera",
        "Muzquiz": "muzquiz",
        "Porvenir": "porvenir",
        "Zaragoza": "zaragoza",
        "La Villa": "lavilla",
        "San Felipe": "sanfelipe"
      };
      
      const sucursalKey = sucursalMap[sucursalParam] || sucursalParam.toLowerCase().replace(/\s+/g, "");
      console.log(`💰 Filtrando por sucursal - Nombre: ${sucursalParam}, ID: ${sucursalKey}`);
      
      ventas = ventas.filter((v: any) => v.sucursalId === sucursalKey);
      console.log(`💰 Ventas filtradas: ${ventas.length}`);
    }
    
    console.log("✅ Retornando ventas:", ventas.length);
    
    // Retornar objeto con success y ventas para consistencia con otros endpoints
    return c.json({ success: true, ventas });
  } catch (error) {
    console.log("❌ Error obteniendo ventas:", error);
    return c.json({ error: "Error obteniendo ventas" }, 500);
  }
});

// ==================== REPORTE: VENTAS POR PRODUCTO ====================
app.get("/reportes/ventas-por-producto", async (c) => {
  try {
    const inicioParam = c.req.query("inicio"); // "YYYY-MM-DD"
    const finParam = c.req.query("fin");       // "YYYY-MM-DD"
    const sucursalParam = c.req.query("sucursal"); // opcional

    // Conversion de fecha CDMX (UTC-6) a rango UTC
    const OFFSET = 6;
    const inicioDiaCDMX = (f: string) => {
      const [a, m, d] = f.split("T")[0].split("-").map(Number);
      return new Date(Date.UTC(a, m - 1, d, OFFSET, 0, 0, 0)).toISOString();
    };
    const finDiaCDMX = (f: string) => {
      const [a, m, d] = f.split("T")[0].split("-").map(Number);
      return new Date(Date.UTC(a, m - 1, d, 23 + OFFSET, 59, 59, 999)).toISOString();
    };

    const desde = inicioParam ? inicioDiaCDMX(inicioParam) : null;
    const hasta = finParam ? finDiaCDMX(finParam) : null;

    let ventas = await kv.getByPrefix("venta:");
    const productos = await kv.getByPrefix("producto:");

    // Filtro de fecha
    if (desde) ventas = ventas.filter((v: any) => v.fecha && v.fecha >= desde);
    if (hasta) ventas = ventas.filter((v: any) => v.fecha && v.fecha <= hasta);

    // Filtro de sucursal opcional
    if (sucursalParam && sucursalParam !== "todas") {
      ventas = ventas.filter((v: any) => v.sucursalId === sucursalParam);
    }

    // Indexar productos por id y por codigo de barras
    const prodPorId: Record<string, any> = {};
    for (const p of productos) {
      if (p.id) prodPorId[p.id] = p;
      if (p.codigoBarras) prodPorId[p.codigoBarras] = p;
    }

    // Agregar cantidad y total por producto
    const acum: Record<string, { cantidad: number; total: number; producto: any; pid: string }> = {};
    for (const venta of ventas) {
      const items = venta.productos || [];
      for (const it of items) {
        const pid = it.productoId || "";
        if (pid.startsWith("SERVICE-")) continue; // excluir servicios
        const prod = prodPorId[pid];
        const clave = (prod && prod.id) || pid;
        if (!acum[clave]) acum[clave] = { cantidad: 0, total: 0, producto: prod || null, pid: clave };
        const cant = Number(it.cantidad) || 0;
        const precioUnit = Number(it.precio) || Number(it.precioVenta) || Number(it.precioUnitario) || 0;
        const subtotal = Number(it.subtotal) || (precioUnit * cant);
        acum[clave].cantidad += cant;
        acum[clave].total += subtotal;
      }
    }

    // Construir filas simples
    const filas = Object.values(acum).map((row) => {
      const p = row.producto;
      return {
        codigo: (p && p.codigoBarras) || row.pid,
        nombre: (p && p.nombre) || "(Producto no encontrado)",
        cantidad: row.cantidad,
        total: Math.round(row.total * 100) / 100,
      };
    }).filter((f) => f.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad);

    return c.json({ success: true, filas, totalProductos: filas.length });
  } catch (error) {
    console.log("Error en reporte ventas por producto:", error);
    return c.json({ error: "Error generando reporte" }, 500);
  }
});


// ==================== COTIZACIONES ROUTES ====================
// Una cotizacion es como una venta pero NO afecta inventario ni caja.
// Tiene folio propio (COT-xxx) y se guarda para consulta.

app.post("/cotizaciones", async (c) => {
  try {
    const body = await c.req.json();
    const cotizacionId = `cotizacion:${generateCode("COT")}`;

    // Folio legible incremental
    const cotizacionesExistentes = await kv.getByPrefix("cotizacion:");
    const folioNum = cotizacionesExistentes.length + 1;
    const folio = `COT-${String(folioNum).padStart(5, "0")}`;

    const cotizacion = {
      id: cotizacionId,
      folio,
      fecha: new Date().toISOString(),
      cliente: body.cliente || "",
      productos: body.productos || [],
      total: Number(body.total) || 0,
      subtotal: Number(body.subtotal) || Number(body.total) || 0,
      descuentoTotal: Number(body.descuentoTotal) || 0,
      nivelDescuento: body.nivelDescuento || "",
      vendedor: body.vendedor || body.creadoPor || "",
      notas: body.notas || "",
      sucursalId: body.sucursalId || "principal",
      creadoPor: body.creadoPor || "",
      vigenciaDias: body.vigenciaDias || 15,
    };

    await kv.set(cotizacionId, cotizacion);

    return c.json({ success: true, cotizacion });
  } catch (error) {
    console.log("Error creando cotizacion:", error);
    return c.json({ error: "Error creando cotizacion: " + error }, 500);
  }
});

app.get("/cotizaciones", async (c) => {
  try {
    const sucursalParam = c.req.query("sucursal");
    let cotizaciones = await kv.getByPrefix("cotizacion:");

    if (sucursalParam && sucursalParam !== "todas") {
      cotizaciones = cotizaciones.filter((q: any) => q.sucursalId === sucursalParam);
    }

    // Ordenar por fecha descendente (mas reciente primero)
    cotizaciones.sort((a: any, b: any) =>
      (b.fecha || "").localeCompare(a.fecha || "")
    );

    return c.json({ success: true, cotizaciones });
  } catch (error) {
    console.log("Error obteniendo cotizaciones:", error);
    return c.json({ error: "Error obteniendo cotizaciones" }, 500);
  }
});

app.delete("/cotizaciones/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const key = id.startsWith("cotizacion:") ? id : `cotizacion:${id}`;
    await kv.del(key);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando cotizacion:", error);
    return c.json({ error: "Error eliminando cotizacion" }, 500);
  }
});



app.post("/ventas", async (c) => {
  try {
    const venta = await c.req.json();
    const ventaId = `venta:${generateCode("VEN")}`;
    
    // Obtener caja activa de la sucursal
    const cajas = await kv.getByPrefix("caja:");
    const cajaActiva = cajas.find((caja: any) => 
      caja.sucursalId === venta.sucursalId && caja.estado === "abierta"
    );
    
    // Verificar si hay antibióticos en la venta
    let antibioticos = [];
    let codigoControl = null;
    
    if (venta.cedulaMedico) {
      // Buscar el médico por cédula
      const medicos = await kv.getByPrefix("medico:");
      const medico = medicos.find((m: any) => m.cedula === venta.cedulaMedico);
      
      // Procesar antibióticos
      for (const item of venta.productos) {
        const productoKey = item.productoId.startsWith("producto:") 
          ? item.productoId 
          : `producto:${item.productoId}`;
        
        const producto = await kv.get(productoKey);
        if (producto) {
          const grupo = String(producto.grupo || "").toLowerCase();
          const agrupacion = String(producto.agrupacion || "").toLowerCase();
          const nombreProd = String(producto.nombre || "").toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const esAntibiotico = 
            grupo.includes("antibiótico") || 
            grupo.includes("antibiotico") ||
            agrupacion.includes("antibiótico") ||
            agrupacion.includes("antibiotico") ||
            nombreProd.includes("amoxicilina") ||
            nombreProd.includes("ampicilina") ||
            nombreProd.includes("azitromicina") ||
            nombreProd.includes("ciprofloxacino") ||
            nombreProd.includes("claritromicina") ||
            nombreProd.includes("clindamicina") ||
            nombreProd.includes("doxiciclina") ||
            nombreProd.includes("eritromicina") ||
            nombreProd.includes("levofloxacino") ||
            nombreProd.includes("metronidazol") ||
            nombreProd.includes("penicilina") ||
            nombreProd.includes("trimetoprima") ||
            nombreProd.includes("cefalexina") ||
            nombreProd.includes("ceftriaxona") ||
            nombreProd.includes("nitrofurantoina") ||
            nombreProd.includes("tetraciclina") ||
            nombreProd.includes("lincomicina") ||
            nombreProd.includes("dicloxacilina");
          
          if (esAntibiotico) {
            // Verificar si se surtió completo desde el frontend
            const surtidoCompleto = item.surtidoCompleto === true;
            
            // Solo generar código de control si se surtió completo
            if (surtidoCompleto && !codigoControl) {
              // Obtener o inicializar el contador de antibióticos para esta sucursal
              const contadorKey = `contador_antibioticos:${venta.sucursalId}`;
              let contador = await kv.get(contadorKey);
              if (!contador) {
                contador = 0;
              }
              contador++;
              await kv.set(contadorKey, contador);
              
              // Generar código de control: SUCURSAL-NUMERO
              const sucursalCode = venta.sucursalId.substring(0, 3).toUpperCase();
              codigoControl = `${sucursalCode}-${contador.toString().padStart(6, '0')}`;
            }
            
            antibioticos.push({
              productoId: item.productoId,
              nombre: item.nombre,
              cantidad: item.cantidad,
              cantidadRecetada: item.cantidadRecetada,
              surtidoCompleto: surtidoCompleto,
              stockActual: (producto.stockBySucursal?.[venta.sucursalId] || 0) - item.cantidad,
              medico: medico ? {
                nombre: medico.nombre,
                cedula: medico.cedula,
                telefono: medico.telefono || "",
                direccion: medico.direccion || "",
              } : {
                  nombre: venta.nombreMedicoAntibiotico || "",
                  cedula: venta.cedulaMedico,
                  telefono: "",
                  direccion: "",
                },
                
              codigoControl: surtidoCompleto ? codigoControl : null,
              observaciones: surtidoCompleto ? "" : "Receta no retenida - No se surtió completo",
            });
          }
        }
      }
      
      // Guardar registro de antibióticos si hay
      if (antibioticos.length > 0) {
        const antibioticoId = `antibiotico:${generateCode("ANT")}`;
        await kv.set(antibioticoId, {
          ventaId,
          sucursalId: venta.sucursalId,
          fecha: new Date().toISOString(),
          antibioticos,
          codigoControl,
        });
      }
    }
    
    await kv.set(ventaId, { 
      ...venta, 
      fecha: new Date().toISOString(),
      codigoControlAntibioticos: codigoControl,
      cajaId: cajaActiva ? cajaActiva.id : null,
    });
    
    console.log(`✅ Venta guardada: ${ventaId} - Sucursal: ${venta.sucursalId} - Total: $${venta.total}`);
    
    // Actualizar stock de productos con FEFO (First Expired First Out)
    for (const item of venta.productos) {
      const productoKey = item.productoId.startsWith("producto:") 
        ? item.productoId 
        : `producto:${item.productoId}`;
      
      const producto = await kv.get(productoKey);
      if (producto) {
        // Descontar del stock general del producto
        const stockBySucursal = { ...producto.stockBySucursal };
        // Permite stock negativo — se corrige cuando llegue compra o traslado
        stockBySucursal[venta.sucursalId] = 
          (stockBySucursal[venta.sucursalId] || 0) - item.cantidad;
        await kv.set(productoKey, { ...producto, stockBySucursal });

        // Descontar de lotes por FEFO
        const lotes = await kv.getByPrefix("lote:");
        const lotesProducto = lotes
          .filter((l: any) => 
            l.activo &&
            l.sucursalId === venta.sucursalId &&
            l.cantidadActual > 0 &&
            (l.productoId === producto.codigoBarras ||
             l.codigoBarras === producto.codigoBarras)
          )
          .sort((a: any, b: any) => {
            if (!a.fechaVencimiento) return 1;
            if (!b.fechaVencimiento) return -1;
            return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
          });

        let cantidadPendiente = item.cantidad;
        for (const lote of lotesProducto) {
          if (cantidadPendiente <= 0) break;
          const descuento = Math.min(lote.cantidadActual, cantidadPendiente);
          lote.cantidadActual -= descuento;
          lote.activo = lote.cantidadActual > 0;
          await kv.set(lote.id, lote);
          cantidadPendiente -= descuento;
        }
      }
    }
    
    return c.json({ success: true, ventaId, codigoControl });
  } catch (error) {
    console.log("Error creando venta:", error);
    return c.json({ error: "Error creando venta" }, 500);
  }
});

// ==================== EDITAR VENTA ====================
app.put("/ventas/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    const venta = await kv.get(id);
    if (!venta) {
      return c.json({ error: "Venta no encontrada" }, 404);
    }

    // Actualizar la venta
    const ventaActualizada = {
      ...venta,
      ...updates,
      fechaModificacion: new Date().toISOString()
    };

    await kv.set(id, ventaActualizada);
    
    console.log(`Venta actualizada: ${id}`);
    return c.json({ success: true, venta: ventaActualizada });
  } catch (error) {
    console.log("Error actualizando venta:", error);
    return c.json({ error: "Error actualizando venta" }, 500);
  }
});

// ==================== PROCESAR DEVOLUCIÓN ====================
app.post("/ventas/:id/devolucion", async (c) => {
  try {
    const id = c.req.param("id");
    const { motivo } = await c.req.json();
    
    const venta = await kv.get(id);
    if (!venta) {
      return c.json({ error: "Venta no encontrada" }, 404);
    }

    if (venta.estado === "devuelto") {
      return c.json({ error: "Esta venta ya fue devuelta" }, 400);
    }

    // Devolver el stock de productos
    for (const item of venta.productos) {
      const productoKey = item.productoId.startsWith("producto:") 
        ? item.productoId 
        : `producto:${item.productoId}`;
      
      const producto = await kv.get(productoKey);
      if (producto) {
        const stockBySucursal = { ...producto.stockBySucursal };
        stockBySucursal[venta.sucursalId] = (stockBySucursal[venta.sucursalId] || 0) + item.cantidad;
        await kv.set(productoKey, { ...producto, stockBySucursal });
      }
    }

    // Actualizar la venta
    const ventaActualizada = {
      ...venta,
      estado: "devuelto",
      motivoDevolucion: motivo,
      fechaDevolucion: new Date().toISOString()
    };

    await kv.set(id, ventaActualizada);
    
    console.log(`Devolución procesada para venta: ${id}`);
    return c.json({ success: true, venta: ventaActualizada });
  } catch (error) {
    console.log("Error procesando devolución:", error);
    return c.json({ error: "Error procesando devolución" }, 500);
  }
});

// ==================== ELIMINAR VENTA ====================
app.delete("/ventas/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const venta = await kv.get(id);
    if (!venta) {
      return c.json({ error: "Venta no encontrada" }, 404);
    }

    // NOTA: Esta operación NO devuelve el inventario
    // Si se necesita devolver inventario, usar la función de devolución
    await kv.del(id);
    
    console.log(`Venta eliminada: ${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando venta:", error);
    return c.json({ error: "Error eliminando venta" }, 500);
  }
});

// ==================== PACIENTES ROUTES ====================
app.get("/pacientes", async (c) => {
  try {
    const pacientes = await kv.getByPrefix("paciente:");
    
    // Asegurar que todos los pacientes tengan un campo 'id'
    const pacientesConId = [];
    for (const paciente of pacientes) {
      // Si el paciente no tiene id, buscamos su key original
      if (!paciente.id) {
        // Buscar la key del paciente
        const allKeys = await kv.getByPrefix("paciente:");
        for (const key in allKeys) {
          const p = allKeys[key];
          if (p.nombre === paciente.nombre && p.fecha === paciente.fecha) {
            paciente.id = key;
            break;
          }
        }
        
        // Si aún no tiene ID, generar uno nuevo y actualizar
        if (!paciente.id) {
          const nuevoId = `paciente:${generateCode("PAC")}`;
          paciente.id = nuevoId;
          await kv.set(nuevoId, paciente);
        }
      }
      pacientesConId.push(paciente);
    }
    
    return c.json({ success: true, pacientes: pacientesConId });
  } catch (error) {
    console.log("Error obteniendo pacientes:", error);
    return c.json({ error: "Error obteniendo pacientes" }, 500);
  }
});

app.post("/pacientes", async (c) => {
  try {
    const paciente = await c.req.json();
    const pacienteId = `paciente:${generateCode("PAC")}`;
    await kv.set(pacienteId, { 
      ...paciente, 
      id: pacienteId,
      fecha: new Date().toISOString() 
    });
    return c.json({ success: true, pacienteId });
  } catch (error) {
    console.log("Error creando paciente:", error);
    return c.json({ error: "Error creando paciente" }, 500);
  }
});

// DELETE /pacientes/:medicoId - Eliminar todos los pacientes de un médico
app.delete("/pacientes/:medicoId", async (c) => {
  try {
    const medicoId = c.req.param("medicoId");
    
    // Obtener todos los pacientes con sus keys
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );
    
    const { data: pacientesData, error: pacientesError } = await supabase
      .from("kv_store_7d799f19")
      .select("key, value")
      .like("key", "paciente:%");
    
    if (pacientesError) {
      throw new Error(pacientesError.message);
    }
    
    // Filtrar pacientes del médico específico y obtener sus keys
    const pacientesDelMedico = [];
    for (const item of (pacientesData || [])) {
      if (item.value.medicoId === medicoId) {
        pacientesDelMedico.push(item.key);
      }
    }
    
    // Eliminar todos los pacientes del médico
    if (pacientesDelMedico.length > 0) {
      await kv.mdel(pacientesDelMedico);
    }
    
    // También eliminar las recetas asociadas a esos pacientes
    const { data: recetasData, error: recetasError } = await supabase
      .from("kv_store_7d799f19")
      .select("key, value")
      .like("key", "receta:%");
      
    if (recetasError) {
      throw new Error(recetasError.message);
    }
    
    const recetasDelMedico = [];
    for (const item of (recetasData || [])) {
      if (item.value.medicoId === medicoId) {
        recetasDelMedico.push(item.key);
      }
    }
    
    if (recetasDelMedico.length > 0) {
      await kv.mdel(recetasDelMedico);
    }
    
    console.log(`Eliminados ${pacientesDelMedico.length} pacientes y ${recetasDelMedico.length} recetas del médico ${medicoId}`);
    
    return c.json({ 
      success: true, 
      pacientesEliminados: pacientesDelMedico.length,
      recetasEliminadas: recetasDelMedico.length 
    });
  } catch (error) {
    console.log("Error eliminando pacientes del médico:", error);
    return c.json({ error: "Error eliminando pacientes del médico" }, 500);
  }
});

// ==================== RECETAS ROUTES ====================
app.get("/recetas", async (c) => {
  try {
    const recetas = await kv.getByPrefix("receta:");
    return c.json({ success: true, recetas });
  } catch (error) {
    console.log("Error obteniendo recetas:", error);
    return c.json({ error: "Error obteniendo recetas" }, 500);
  }
});

app.post("/recetas", async (c) => {
  try {
    const receta = await c.req.json();
    const recetaId = `receta:${generateCode("REC")}`;
    const codigo = generateCode("MED");
    
    await kv.set(recetaId, { 
      ...receta, 
      codigo,
      fecha: new Date().toISOString() 
    });
    
    return c.json({ success: true, codigo, recetaId });
  } catch (error) {
    console.log("Error creando receta:", error);
    return c.json({ error: "Error creando receta" }, 500);
  }
});

app.get("/recetas/by-code/:codigo", async (c) => {
  try {
    const codigo = c.req.param("codigo");
    const recetas = await kv.getByPrefix("receta:");
    const receta = recetas.find((r: any) => r.codigo === codigo);
    
    if (!receta) {
      return c.json({ error: "Receta no encontrada" }, 404);
    }
    
    return c.json({ success: true, receta });
  } catch (error) {
    console.log("Error buscando receta:", error);
    return c.json({ error: "Error buscando receta" }, 500);
  }
});

// ==================== SERVICIOS MEDICOS ROUTES ====================
app.post("/servicios-medicos", async (c) => {
  try {
    const servicio = await c.req.json();
    const servicioId = `servicio:${generateCode("SRV")}`;
    
    await kv.set(servicioId, {
      ...servicio,
      fecha: new Date().toISOString()
    });
    
    return c.json({ success: true, servicioId });
  } catch (error) {
    console.log("Error creando servicio médico:", error);
    return c.json({ error: "Error creando servicio médico" }, 500);
  }
});

app.get("/servicios-medicos", async (c) => {
  try {
    const servicios = await kv.getByPrefix("servicio:");
    return c.json({ success: true, servicios });
  } catch (error) {
    console.log("Error obteniendo servicios médicos:", error);
    return c.json({ error: "Error obteniendo servicios médicos" }, 500);
  }
});

// ==================== PERMISSIONS ROUTES ====================
app.get("/permissions", async (c) => {
  try {
    const permissions = await kv.get("config:permissions");
    // If no permissions exist, return defaults
    if (!permissions) {
      const defaultPermissions = {
        supervisor: {
          ver_inventario: true,
          realizar_compras: true,
          realizar_traslados: true,
          ver_reportes: true,
          gestionar_personal: true,
          ver_dashboard: true,
          realizar_ajustes: true,
        },
        gerente: {
          ver_inventario: true,
          ver_reportes: true,
          ver_dashboard: true,
          ver_ventas: true,
          ver_compras: true,
        },
        farmaceutico: {
          realizar_ventas: true,
          ver_inventario: true, // Read only usually
          ver_consultas: true,
        },
        medico: {
          ver_consultas: true,
          gestionar_expediente: true,
        },
        admin: {
          admin_access: true
        }
      };
      return c.json({ success: true, permissions: defaultPermissions });
    }
    return c.json({ success: true, permissions });
  } catch (error) {
    console.log("Error obteniendo permisos:", error);
    return c.json({ error: "Error obteniendo permisos" }, 500);
  }
});

app.post("/permissions", async (c) => {
  try {
    const { permissions } = await c.req.json();
    await kv.set("config:permissions", permissions);
    
    // AUDIT LOG
    await createAuditLog(
      "ACTUALIZACION_PERMISOS",
      "Admin", 
      "Admin", 
      "Se actualizaron los permisos del sistema",
      ""
    );
    
    return c.json({ success: true, message: "Permisos actualizados" });
  } catch (error) {
    console.log("Error guardando permisos:", error);
    return c.json({ error: "Error guardando permisos" }, 500);
  }
});

// ==================== STAFF ASSIGNMENTS ROUTES ====================
app.get("/staff-assignments", async (c) => {
  try {
    const { start, end, userId } = c.req.query();

    // Buscar en AMBOS prefijos para compatibilidad
    const [assignments1, assignments2] = await Promise.all([
      kv.getByPrefix("staff-assignment:"),
      kv.getByPrefix("assignment:"),
    ]);

    const allAssignments = [...assignments1, ...assignments2];

    const filtered = allAssignments.filter((a: any) => {
      // Soporte para campo fecha o date
      const fechaStr = a.fecha || a.date || "";
      
      if (userId && a.userId !== userId) return false;
      
      if (start && fechaStr) {
        if (fechaStr < start) return false;
      }
      if (end && fechaStr) {
        if (fechaStr > end) return false;
      }
      return true;
    });

    return c.json({ success: true, assignments: filtered });
  } catch (error) {
    console.log("Error obteniendo asignaciones:", error);
    return c.json({ error: "Error obteniendo asignaciones" }, 500);
  }
});

app.post("/staff-assignments", async (c) => {
  try {
    const assignment = await c.req.json();
    // Clave compuesta: assignment:userId:date (YYYY-MM-DD)
    const assignmentId = `assignment:${assignment.userId}:${assignment.date}`;
    
    await kv.set(assignmentId, {
      ...assignment,
      id: assignmentId,
      updatedAt: new Date().toISOString()
    });
    
    return c.json({ success: true, assignmentId });
  } catch (error) {
    console.log("Error guardando asignación:", error);
    return c.json({ error: "Error guardando asignación" }, 500);
  }
});

// Get today's assignment for a specific user
app.get("/staff-assignments/today/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const today = new Date().toISOString().split("T")[0];

    // Buscar en ambos prefijos
    const [assignments1, assignments2] = await Promise.all([
      kv.getByPrefix("staff-assignment:"),
      kv.getByPrefix("assignment:"),
    ]);

    const allAssignments = [...assignments1, ...assignments2];

    const assignment = allAssignments.find((a: any) => {
      const fechaStr = a.fecha || a.date || "";
      return a.userId === userId && fechaStr.startsWith(today);
    });

    return c.json({ success: true, assignment: assignment || null });
  } catch (error) {
    console.log("Error obteniendo asignación del día:", error);
    return c.json({ error: "Error obteniendo asignación" }, 500);
  }
});

// Delete assignment
app.post("/staff-assignments/delete", async (c) => {
  try {
    const { assignmentId } = await c.req.json();
    
    if (!assignmentId) {
      return c.json({ error: "ID de asignación requerido" }, 400);
    }
    
    // Obtener la asignación antes de eliminarla
    const assignment = await kv.get(assignmentId);
    
    if (assignment) {
      console.log("🗑️ ELIMINANDO ASIGNACIÓN:");
      console.log("   ID:", assignmentId);
      console.log("   Usuario:", assignment.userId);
      console.log("   Sucursal:", assignment.sucursalId);
      console.log("   Fecha:", assignment.date);
      console.log("   Timestamp:", new Date().toISOString());
      
      // Guardar registro de auditoría
      const auditKey = `audit:delete_assignment:${Date.now()}`;
      await kv.set(auditKey, {
        action: "DELETE_ASSIGNMENT",
        assignmentId,
        assignment,
        timestamp: new Date().toISOString()
      });
    }
    
    // Eliminar la asignación
    await kv.del(assignmentId);
    console.log("✅ Asignación eliminada correctamente");
    
    return c.json({ success: true, message: "Asignación eliminada correctamente" });
  } catch (error) {
    console.log("Error eliminando asignación:", error);
    return c.json({ error: "Error eliminando asignación" }, 500);
  }
});

// ==================== INIT DATA ====================
app.post("/init-data", async (c) => {
  try {
    console.log("=".repeat(80));
    console.log("INIT-DATA LLAMADO EN:", new Date().toISOString());
    console.log("=".repeat(80));
    
    // Verificar si el sistema ya fue inicializado (en el servidor, NO en localStorage)
    const systemInitialized = await kv.get("system:initialized");
    
    if (systemInitialized) {
      console.log("✅ Sistema ya inicializado previamente.");
      console.log("   Fecha de inicialización:", systemInitialized.timestamp);
      console.log("   Versión:", systemInitialized.version);
      console.log("   🚫 NO se crearán ni recrearán datos.");
      console.log("=".repeat(80));
      return c.json({ 
        success: true, 
        message: "Sistema ya inicializado", 
        alreadyInitialized: true,
        initializationDate: systemInitialized.timestamp,
        version: systemInitialized.version
      });
    }
    
    console.log("⚠️ Sistema NO inicializado. Procediendo a crear datos...");
    
    // Crear usuarios base
    const usuarios = [
      {
        id: "user:supervisor1",
        username: "supervisor",
        password: "123",
        role: "supervisor",
        name: "Carlos Ramírez"
      },
      {
        id: "user:gerente1",
        username: "gerente",
        password: "123",
        role: "gerente",
        name: "Ana Martínez"
      },
      {
        id: "user:admin1",
        username: "admin",
        password: "admin123",
        role: "admin",
        name: "Administrador General"
      }
    ];

    // Generar usuarios por sucursal
    const sucursalesConfig = [
      { id: "muzquiz", nombre: "Muzquiz", farmaceuticos: ["M1", "V1"], medicos: ["M1", "V1"] },
      { id: "carrera", nombre: "Carrera", farmaceuticos: ["M1", "V1", "V2"], medicos: ["M1", "V1", "M2", "V2"] },
      { id: "porvenir", nombre: "Porvenir", farmaceuticos: ["M1", "V1"], medicos: ["M1", "V1"] },
      { id: "zaragoza", nombre: "Zaragoza", farmaceuticos: ["M1", "V1"], medicos: ["M1", "V1"] },
      { id: "lavilla", nombre: "La Villa", farmaceuticos: ["M1", "V1"], medicos: ["M1", "V1"] },
      { id: "sanfelipe", nombre: "San Felipe", farmaceuticos: ["M1", "V1"], medicos: ["M1", "V1"] },
    ];

    for (const suc of sucursalesConfig) {
      // Farmacéuticos
      for (const turno of suc.farmaceuticos) {
        const username = `farmaceutico_${suc.id}_${turno.toLowerCase()}`;
        usuarios.push({
          id: `user:${username}`,
          username: username,
          password: "123",
          role: "farmaceutico",
          name: `Farmacéutico ${turno} - ${suc.nombre}`,
          sucursalId: suc.id
        });
      }
      
      // Médicos
      for (const turno of suc.medicos) {
        const username = `medico_${suc.id}_${turno.toLowerCase()}`;
        usuarios.push({
          id: `user:${username}`,
          username: username,
          password: "123",
          role: "medico",
          name: `Médico ${turno} - ${suc.nombre}`,
          sucursalId: suc.id
        });
      }
    }
    
    console.log(`Guardando ${usuarios.length} usuarios...`);
    let usuariosCreados = 0;
    let usuariosOmitidos = 0;
    
    for (const user of usuarios) {
      try {
        // Solo crear si NO existe — preservar cambios manuales (ediciones/eliminaciones)
        const existing = await kv.get(user.id);
        if (!existing) {
          await kv.set(user.id, user);
          console.log(`✅ Usuario creado: ${user.id}`);
          usuariosCreados++;
        } else {
          console.log(`⏭️ Usuario ya existe, omitiendo: ${user.id}`);
          usuariosOmitidos++;
        }
      } catch (error) {
        console.log(`❌ Error guardando usuario ${user.id}:`, error);
      }
    }
    
    console.log(`Resumen: ${usuariosCreados} creados, ${usuariosOmitidos} omitidos (ya existían)`);
    
    // Marcar el sistema como inicializado en el servidor
    await kv.set("system:initialized", { 
      initialized: true, 
      timestamp: new Date().toISOString(),
      version: "v5",
      usersCreated: usuariosCreados,
      usersSkipped: usuariosOmitidos
    });
    console.log("🔒 Sistema marcado como inicializado en el servidor.");
    console.log("=".repeat(80));
    
    // Crear productos de ejemplo
    const sucursales = ["carrera", "muzquiz", "porvenir", "zaragoza", "lavilla", "sanfelipe"];
    const productos = [
      {
        codigoBarras: "7501234567890",
        nombre: "Paracetamol 500mg",
        precioVenta: 15.50,
        stockBySucursal: Object.fromEntries(sucursales.map(s => [s, Math.floor(Math.random() * 100) + 50]))
      },
      {
        codigoBarras: "7501234567891",
        nombre: "Ibuprofeno 400mg",
        precioVenta: 25.00,
        stockBySucursal: Object.fromEntries(sucursales.map(s => [s, Math.floor(Math.random() * 100) + 50]))
      },
      {
        codigoBarras: "7501234567892",
        nombre: "Amoxicilina 500mg",
        precioVenta: 85.00,
        grupo: "Antibiótico",
        stockBySucursal: Object.fromEntries(sucursales.map(s => [s, Math.floor(Math.random() * 100) + 50]))
      },
      {
        codigoBarras: "7501234567893",
        nombre: "Omeprazol 20mg",
        precioVenta: 45.00,
        stockBySucursal: Object.fromEntries(sucursales.map(s => [s, Math.floor(Math.random() * 100) + 50]))
      },
      {
        codigoBarras: "7501234567894",
        nombre: "Losartán 50mg",
        precioVenta: 65.00,
        stockBySucursal: Object.fromEntries(sucursales.map(s => [s, Math.floor(Math.random() * 100) + 50]))
      },
      {
        codigoBarras: "7501234567895",
        nombre: "Metformina 850mg",
        precioVenta: 55.00,
        stockBySucursal: Object.fromEntries(sucursales.map(s => [s, Math.floor(Math.random() * 100) + 50]))
      },
      {
        codigoBarras: "7501234567896",
        nombre: "Atorvastatina 20mg",
        precioVenta: 95.00,
        stockBySucursal: Object.fromEntries(sucursales.map(s => [s, Math.floor(Math.random() * 100) + 50]))
      },
      {
        codigoBarras: "7501234567897",
        nombre: "Ranitidina 150mg",
        precioVenta: 35.00,
        stockBySucursal: Object.fromEntries(sucursales.map(s => [s, Math.floor(Math.random() * 100) + 50]))
      },
      {
        codigoBarras: "7501234567898",
        nombre: "Diclofenaco 100mg",
        precioVenta: 38.00,
        stockBySucursal: Object.fromEntries(sucursales.map(s => [s, Math.floor(Math.random() * 15) + 5]))
      },
      {
        codigoBarras: "7501234567899",
        nombre: "Cetirizina 10mg",
        precioVenta: 28.00,
        stockBySucursal: Object.fromEntries(sucursales.map(s => [s, Math.floor(Math.random() * 15) + 5]))
      }
    ];
    
    console.log("Guardando productos...");
    for (const [index, producto] of productos.entries()) {
      try {
        const productoKey = `producto:PROD-${index}`;
        const existingProducto = await kv.get(productoKey);
        if (!existingProducto) {
          await kv.set(productoKey, producto);
        }
      } catch (error) {
        console.log(`Error guardando producto ${index}:`, error);
      }
    }
    
    console.log("Datos inicializados exitosamente");
    return c.json({ success: true, message: "Datos inicializados correctamente" });
  } catch (error) {
    console.log("Error crítico inicializando datos:", error);
    return c.json({ error: `Error inicializando datos: ${error.message || error}` }, 500);
  }
});

// Eliminar la marca de inicialización para permitir reinicializar usuarios
app.delete("/system/reset-init", async (c) => {
  try {
    console.log("⚠️⚠️⚠️ ALERTA: REINICIALIZACIÓN DEL SISTEMA SOLICITADA ⚠️⚠️⚠️");
    console.log("Timestamp:", new Date().toISOString());
    
    // Registrar en el historial de auditoría
    const auditLog = {
      action: "SYSTEM_RESET_INIT",
      timestamp: new Date().toISOString(),
      description: "Se eliminó la marca de inicialización. El sistema será reinicializado."
    };
    
    // Guardar en historial de auditoría
    const auditKey = `audit:reset:${Date.now()}`;
    await kv.set(auditKey, auditLog);
    
    await kv.del("system:initialized");
    console.log("Marca de inicialización eliminada. El sistema puede ser reinicializado.");
    console.log("⚠️⚠️⚠️ ATENCIÓN: En el próximo /init-data se recrearán usuarios faltantes ⚠️⚠️⚠️");
    
    return c.json({ success: true, message: "Sistema listo para reinicialización" });
  } catch (error) {
    console.log("Error eliminando marca de inicialización:", error);
    return c.json({ error: "Error eliminando marca de inicialización" }, 500);
  }
});

// ==================== AUDIT LOG ENDPOINTS ====================
// Obtener historial de auditoría
app.get("/system/audit-log", async (c) => {
  try {
    console.log("📊 Obteniendo historial de auditoría del sistema...");
    
    // Obtener todos los registros de auditoría
    const auditLogs = await kv.getByPrefix("audit:");
    
    // Ordenar por timestamp (más recientes primero)
    auditLogs.sort((a: any, b: any) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
    
    // Limitar a los últimos 100 registros
    const recentLogs = auditLogs.slice(0, 100);
    
    console.log(`📋 Retornando ${recentLogs.length} registros de auditoría`);
    
    return c.json({ 
      success: true, 
      logs: recentLogs,
      total: auditLogs.length
    });
  } catch (error) {
    console.log("Error obteniendo historial de auditoría:", error);
    return c.json({ error: "Error obteniendo historial de auditoría" }, 500);
  }
});

// Verificar estado de inicialización del sistema
app.get("/system/init-status", async (c) => {
  try {
    const systemInitialized = await kv.get("system:initialized");
    
    if (systemInitialized) {
      return c.json({
        success: true,
        initialized: true,
        ...systemInitialized
      });
    } else {
      return c.json({
        success: true,
        initialized: false,
        message: "Sistema no inicializado"
      });
    }
  } catch (error) {
    console.log("Error verificando estado de inicialización:", error);
    return c.json({ error: "Error verificando estado" }, 500);
  }
});

// ==================== BULK IMPORT PRODUCTOS ====================
app.post("/productos/bulk-import", async (c) => {
  try {
    const { productos } = await c.req.json();
    const sucursales = ["carrera", "muzquiz", "porvenir", "zaragoza", "lavilla", "sanfelipe"];
    
    let importados = 0;
    for (const producto of productos) {
      const productoId = `producto:${generateCode("PROD")}`;
      
      // Validar que tenga los campos requeridos
      if (!producto.codigoBarras || !producto.nombre || !producto.precioVenta) {
        continue;
      }
      
      // Si no tiene stock por sucursal, inicializar a 0
      const stockBySucursal = producto.stockBySucursal || 
        Object.fromEntries(sucursales.map(s => [s, 0]));
      
      await kv.set(productoId, {
        codigoBarras: producto.codigoBarras,
        nombre: producto.nombre,
        precioCompra: parseFloat(producto.precioCompra) || 0,
        precioVenta: parseFloat(producto.precioVenta),
        lugarCompra: producto.lugarCompra || "",
        grupo: producto.grupo || "",
        laboratorio: producto.laboratorio || "",
        sustanciaActiva: producto.sustanciaActiva || "",
        presentacion: producto.presentacion || "",
        descripcion: (producto.descripcion || "").substring(0, 69),
        agrupacion: producto.agrupacion || "",
        claveSAT: producto.claveSAT || "",
        stockBySucursal
      });
      
      importados++;
    }
    
    return c.json({ 
      success: true, 
      message: `${importados} productos importados correctamente` 
    });
  } catch (error) {
    console.log("Error importando productos:", error);
    return c.json({ error: "Error importando productos" }, 500);
  }
});

// ==================== IMPORT FROM EXCEL ====================
app.post("/productos/import-excel", async (c) => {
  try {
    const body = await c.req.json();
    const { data, sucursalActual } = body;
    
    if (!data || !Array.isArray(data)) {
      return c.json({ error: "Formato de datos inválido" }, 400);
    }
    
    const sucursales = ["carrera", "muzquiz", "porvenir", "zaragoza", "lavilla", "sanfelipe"];
    let importados = 0;
    let errores = 0;
    const erroresDetalle = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Validar campos obligatorios
        const codigoBarras = row["codigo de barras"] || row["Codigo de barras"] || row["Código de Barras"] || row["CODIGO DE BARRAS"];
        const nombre = row["nombre del producto"] || row["Nombre del producto"] || row["Nombre del Producto"] || row["NOMBRE DEL PRODUCTO"];
        const precioPublico = row["precio 1"] || row["Precio 1"] || row["precio publico"] || row["Precio publico"] || row["Precio Publico"] || row["PRECIO PUBLICO"] || row["Precio Venta"];
        const precio2In = row["precio 2"] || row["Precio 2"] || row["PRECIO 2"];
        const precio3In = row["precio 3"] || row["Precio 3"] || row["PRECIO 3"];
        const precio4In = row["precio 4"] || row["Precio 4"] || row["PRECIO 4"];
        
        if (!codigoBarras || !nombre || !precioPublico) {
          erroresDetalle.push(`Fila ${i + 1}: Faltan campos obligatorios (código, nombre o precio)`);
          errores++;
          continue;
        }
        
        const productoId = `producto:${generateCode("PROD")}`;
        
        // Construir stockBySucursal desde las columnas de stock
        const stockBySucursal = {
          principal: parseInt(row["stock"] || row["Stock"] || row["STOCK"] || row["stock principal"] || row["Stock Principal"] || 0) || 0,
        };
        
        await kv.set(productoId, {
          codigoBarras: String(codigoBarras).trim(),
          nombre: String(nombre).trim(),
          precioVenta: parseFloat(precioPublico) || 0,
          precio2: precio2In ? parseFloat(precio2In) : undefined,
          precio3: precio3In ? parseFloat(precio3In) : undefined,
          precio4: precio4In ? parseFloat(precio4In) : undefined,
          precioCompra: parseFloat(row["precio compra"] || row["Precio Compra"] || 0) || 0,
          lugarCompra: row["lugar de compra"] || row["Lugar de compra"] || row["Lugar de Compra"] || "",
          grupo: row["nuevo grupo"] || row["Nuevo grupo"] || row["Nuevo Grupo"] || row["Grupo"] || "",
          laboratorio: row["laboratorio"] || row["Laboratorio"] || "",
          sustanciaActiva: row["sustancia activa del producto"] || row["Sustancia activa del producto"] || row["Sustancia Activa"] || "",
          presentacion: row["presentación"] || row["Presentacion"] || row["presentacion"] || "",
          cantidad: row["cantidad"] || row["Cantidad"] || "",
          descripcion: (row["descripción"] || row["Descripcion"] || row["descripcion"] || "").substring(0, 69),
          agrupacion: row["agrupación"] || row["Agrupacion"] || row["agrupacion"] || "",
          claveSAT: row["clave sat"] || row["Clave sat"] || row["Clave SAT"] || row["CLAVE SAT"] || "",
          stockBySucursal
        });
        
        importados++;
      } catch (error) {
        console.log("Error procesando fila", i + 1, ":", error);
        erroresDetalle.push(`Fila ${i + 1}: ${error.message || 'Error desconocido'}`);
        errores++;
      }
    }
    
    return c.json({ 
      success: true, 
      importados,
      errores,
      erroresDetalle: errores > 0 ? erroresDetalle.slice(0, 10) : [], // Solo primeros 10 errores
      message: `${importados} productos importados, ${errores} errores` 
    });
  } catch (error) {
    console.log("Error importando desde Excel:", error);
    return c.json({ error: "Error importando desde Excel: " + error }, 500);
  }
});

// ==================== ACTUALIZAR STOCK ====================
app.put("/productos/:id/stock", async (c) => {
  try {
    const id = c.req.param("id");
    const { sucursalId, cantidad } = await c.req.json();
    
    const producto = await kv.get(id);
    if (!producto) {
      return c.json({ error: "Producto no encontrado" }, 404);
    }
    
    const stockBySucursal = { ...producto.stockBySucursal };
    stockBySucursal[sucursalId] = parseInt(cantidad);
    
    await kv.set(id, { ...producto, stockBySucursal });
    
    return c.json({ success: true, message: "Stock actualizado" });
  } catch (error) {
    console.log("Error actualizando stock:", error);
    return c.json({ error: "Error actualizando stock" }, 500);
  }
});

// ==================== ACTUALIZAR PRODUCTO (PUT) ====================
app.put("/productos/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    // Obtener producto existente para preservar campos que no vienen en updates (como stock)
    const productoExistente = await kv.get(id);
    
    if (!productoExistente) {
      return c.json({ error: "Producto no encontrado" }, 404);
    }
    
    // Mezclar datos existentes con actualizaciones
    // Aseguramos que no se sobrescriba el ID
    const productoActualizado = {
      ...productoExistente,
      ...updates,
      id: id,
      stockBySucursal: productoExistente.stockBySucursal // Preservar stock por seguridad, o permitir update si viene
    };
    
    // Si updates trae stockBySucursal explícitamente, lo usamos
    if (updates.stockBySucursal) {
      productoActualizado.stockBySucursal = updates.stockBySucursal;
    }

    await kv.set(id, productoActualizado);

    // AUDIT LOG
    // Intentamos identificar quién hizo el cambio. En una app real vendría del token.
    // Aquí asumimos que si no se especifica, y dado el contexto, es un Supervisor o Admin.
    const userRole = updates.userRole || "Supervisor"; 
    const userName = updates.userName || "Supervisor";
    
    // Generar detalle de cambios
    const cambios = [];
    if (productoExistente.nombre !== productoActualizado.nombre) cambios.push(`Nombre: ${productoExistente.nombre} -> ${productoActualizado.nombre}`);
    if (productoExistente.precioVenta !== productoActualizado.precioVenta) cambios.push(`Precio: ${productoExistente.precioVenta} -> ${productoActualizado.precioVenta}`);
    if (productoExistente.stockBySucursal !== productoActualizado.stockBySucursal) cambios.push(`Stock actualizado`);
    
    await createAuditLog(
      "EDICION_PRODUCTO",
      userName,
      userRole,
      `Producto editado: ${productoActualizado.nombre} (${productoActualizado.codigoBarras}). ${cambios.join(", ")}`,
      ""
    );
    
    return c.json({ success: true, message: "Producto actualizado correctamente", producto: productoActualizado });
  } catch (error) {
    console.log("Error actualizando producto:", error);
    return c.json({ error: "Error actualizando producto" }, 500);
  }
});

// ==================== ELIMINAR PRODUCTO ====================
app.delete("/productos/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const motivo = c.req.query("motivo") || "Sin motivo especificado";
    
    // Obtener producto antes de eliminar para el log
    const producto = await kv.get(id);
    
    await kv.del(id);

    // AUDIT LOG
    if (producto) {
      await createAuditLog(
        "ELIMINACION_PRODUCTO",
        "Supervisor", // Default role
        "Supervisor", 
        `Producto eliminado: ${producto.nombre} (${producto.codigoBarras}). Motivo: ${motivo}`,
        ""
      );
    }
    
    return c.json({ success: true, message: "Producto eliminado" });
  } catch (error) {
    console.log("Error eliminando producto:", error);
    return c.json({ error: "Error eliminando producto" }, 500);
  }
});

// ==================== COMPRAS ROUTES ====================
app.get("/compras", async (c) => {
  try {
    const sucursalParam = c.req.query("sucursal");
    console.log("🛒 Solicitud de compras para sucursal:", sucursalParam);
    
    let compras = await kv.getByPrefix("compra:");
    console.log(`🛒 Total compras en base de datos: ${compras.length}`);
    
    // Filtrar por sucursal si se especifica
    if (sucursalParam) {
      // Mapear nombres de sucursales a IDs
      const sucursalMap: { [key: string]: string } = {
        "Carrera": "carrera",
        "Muzquiz": "muzquiz",
        "Porvenir": "porvenir",
        "Zaragoza": "zaragoza",
        "La Villa": "lavilla",
        "San Felipe": "sanfelipe"
      };
      
      const sucursalKey = sucursalMap[sucursalParam] || sucursalParam.toLowerCase().replace(/\s+/g, "");
      console.log(`🛒 Filtrando por sucursal - Nombre: ${sucursalParam}, ID: ${sucursalKey}`);
      
      compras = compras.filter((c: any) => c.sucursalId === sucursalKey);
      console.log(`🛒 Compras filtradas: ${compras.length}`);
    }
    
    // Retornar array directo (no objeto con success)
    return c.json(compras);
  } catch (error) {
    console.log("❌ Error obteniendo compras:", error);
    return c.json({ error: "Error obteniendo compras" }, 500);
  }
});

app.post("/compras", async (c) => {
  try {
    const compra = await c.req.json();
    const compraId = `compra:${generateCode("COMP")}`;
    
    const productos = await kv.getByPrefix("producto:");
    const producto = productos.find((p: any) => p.codigoBarras === compra.productoId);
    
    await kv.set(compraId, {
      ...compra,
      id: compraId,
      nombreProducto: producto?.nombre || compra.nombreProducto || "Producto desconocido",
      estatus: compra.estatus || "pendiente",
      fechaCreacion: new Date().toISOString(),
    });

    if (producto && producto.id) {
      const stockActual = producto.stockBySucursal?.[compra.sucursalId] || 0;
      const nuevoStock = stockActual + compra.cantidad;
      
      await kv.set(producto.id, {
        ...producto,
        stockBySucursal: {
          ...producto.stockBySucursal,
          [compra.sucursalId]: nuevoStock,
        },
      });

      await createAuditLog(
        "REGISTRO_COMPRA",
        "Supervisor",
        "Supervisor",
        `Compra registrada: ${compra.cantidad}x ${producto.nombre} a Proveedor: ${compra.proveedor || "N/A"}`,
        compra.sucursalId
      );
    }

    // Crear lote asociado a esta compra
    if (compra.fechaVencimiento && compra.fechaVencimiento !== "") {
      const loteId = `lote:${generateCode("LOT")}`;
      await kv.set(loteId, {
        id: loteId,
        compraId,
        productoId: producto?.codigoBarras || compra.productoId,
        nombreProducto: producto?.nombre || compra.nombreProducto || "Producto desconocido",
        sucursalId: compra.sucursalId,
        codigoBarras: producto?.codigoBarras || compra.productoId,
        proveedor: compra.proveedor || "",
        fechaVencimiento: compra.fechaVencimiento,
        fechaCompra: compra.fecha || new Date().toISOString().split("T")[0],
        cantidadInicial: compra.cantidad,
        cantidadActual: compra.cantidad,
        precioCompra: compra.precioCompra || 0,
        activo: true,
        esMasiva: false,
      });
    }

    return c.json({ success: true, compraId });
  } catch (error) {
    console.log("Error creando compra:", error);
    return c.json({ error: "Error creando compra" }, 500);
  }
});
// Endpoint para compras masivas
app.post("/compras/masivas", async (c) => {
  try {
    const { sucursalId, fecha, estatus, proveedor, compras, referencia, loteCargaId, creadoPor } = await c.req.json();
    
    if (!sucursalId || !fecha || !proveedor || !compras || !Array.isArray(compras)) {
      return c.json({ error: "Datos incompletos para la compra masiva" }, 400);
    }

    const productos = await kv.getByPrefix("producto:");
    const comprasCreadas = [];
    const errores = [];
    let totalGeneral = 0;

    // Función para parsear fecha de vencimiento
    const parsearFechaVenc = (valor: any): string => {
      if (!valor || valor === "") return "";
      const str = String(valor).trim();
      // Número serial de Excel
      const num = Number(str);
      if (!isNaN(num) && num > 1000 && num < 100000) {
        const fecha = new Date((num - 25569) * 86400 * 1000);
        return fecha.toISOString().split("T")[0];
      }
      // Formato DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
        const [d, m, a] = str.split("/");
        return `${a}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
      }
      // Ya es YYYY-MM-DD u otro formato válido
      return str;
    };

    for (const compraItem of compras) {
      try {
        const { codigoProducto, costo, cantidad, variante, descuento, fechaVencimiento, factura: facturaItem, lote: loteItem, referencia: refItem } = compraItem;
        
        // Calcular costo ANTES de cualquier uso
        const costoFinal = descuento > 0 ? costo - (costo * (descuento / 100)) : costo;
        const total = costoFinal * cantidad;
        const fechaVencParsed = parsearFechaVenc(fechaVencimiento);

        // Buscar producto
        const producto = productos.find((p: any) => 
          p.codigoBarras === codigoProducto || 
          p.codigoBarras === String(codigoProducto).trim()
        );
        
        if (!producto) {
          // Crear producto nuevo automáticamente
          const nuevoProductoId = `producto:${String(codigoProducto).trim()}`;
          const nuevoProducto = {
            id: nuevoProductoId,
            codigoBarras: String(codigoProducto).trim(),
            nombre: `Producto ${codigoProducto}`,
            categoria: "Productos de venta libre",
            precioVenta: 0,
            costo: costoFinal,
            stockBySucursal: { [sucursalId]: cantidad },
            fechaCreacion: new Date().toISOString(),
          };
          await kv.set(nuevoProductoId, nuevoProducto);

          const compraId = `compra:${generateCode("COMP")}`;
          await kv.set(compraId, {
            id: compraId,
            sucursalId,
            productoId: String(codigoProducto).trim(),
            nombreProducto: nuevoProducto.nombre,
            cantidad,
            precioCompra: costoFinal,
            total,
            proveedor,
            estatus: estatus || "recibido",
            fecha,
            variante: variante || "",
            descuento: descuento || 0,
            fechaVencimiento: fechaVencParsed,
            fechaCreacion: new Date().toISOString(),
            esMasiva: true,
            esProductoNuevo: true,
            referencia: referencia || "",
            factura: facturaItem || "",
            loteCargaId: loteCargaId || "",
            creadoPor: creadoPor || "Sistema",
          });
          // Crear lote para producto nuevo
        if (fechaVencParsed && fechaVencParsed !== "") {
          const loteId = `lote:${generateCode("LOT")}`;
          await kv.set(loteId, {
            id: loteId,
            compraId,
            productoId: String(codigoProducto).trim(),
            nombreProducto: nuevoProducto.nombre,
            sucursalId,
            codigoBarras: String(codigoProducto).trim(),
            proveedor,
            fechaVencimiento: fechaVencParsed,
            fechaCompra: fecha,
            cantidadInicial: cantidad,
            cantidadActual: cantidad,
            precioCompra: costoFinal,
            activo: true,
            esMasiva: true,
          });
        }

        comprasCreadas.push({ compraId, producto: nuevoProducto.nombre, cantidad, total, esNuevo: true });
        totalGeneral += total;
        continue;
        }

        // Producto encontrado
        const compraId = `compra:${generateCode("COMP")}`;
        await kv.set(compraId, {
          id: compraId,
          sucursalId,
          productoId: producto.codigoBarras,
          nombreProducto: producto.nombre,
          cantidad,
          precioCompra: costoFinal,
          total,
          proveedor,
          estatus: estatus || "recibido",
          fecha,
          variante: variante || "",
          descuento: descuento || 0,
          fechaVencimiento: fechaVencParsed,
          fechaCreacion: new Date().toISOString(),
          esMasiva: true,
          referencia: referencia || "",
          factura: facturaItem || "",
          loteCargaId: loteCargaId || "",
          creadoPor: creadoPor || "Sistema",
          lote: loteItem || "",
        });

        // Actualizar stock
        const stockActual = producto.stockBySucursal?.[sucursalId] || 0;
        await kv.set(producto.id, {
          ...producto,
          stockBySucursal: {
            ...producto.stockBySucursal,
            [sucursalId]: stockActual + cantidad,
          },
        });

        // Crear lote para producto existente
        if (fechaVencParsed && fechaVencParsed !== "") {
          const loteId = `lote:${generateCode("LOT")}`;
          await kv.set(loteId, {
            id: loteId,
            compraId,
            productoId: producto.codigoBarras,
            nombreProducto: producto.nombre,
            sucursalId,
            codigoBarras: producto.codigoBarras,
            proveedor,
            fechaVencimiento: fechaVencParsed,
            fechaCompra: fecha,
            cantidadInicial: cantidad,
            cantidadActual: cantidad,
            precioCompra: costoFinal,
            activo: true,
            esMasiva: true,
          });
        }

        comprasCreadas.push({ compraId, producto: producto.nombre, cantidad, total });
        totalGeneral += total;
        console.log(`✅ ${producto.nombre} x${cantidad} = $${total.toFixed(2)}`);

      } catch (itemError) {
        console.error(`❌ Error:`, compraItem, itemError);
        errores.push({ codigoProducto: compraItem.codigoProducto, error: "Error al procesar" });
      }
    }

    if (comprasCreadas.length > 0) {
      await createAuditLog(
        "REGISTRO_COMPRA_MASIVA", creadoPor || "Administrador", "admin",
        `Compra masiva: ${comprasCreadas.length} productos, Total: $${totalGeneral.toFixed(2)}, Proveedor: ${proveedor}`,
        sucursalId
      );
    }

    return c.json({
      success: true,
      registrosCreados: comprasCreadas.length,
      totalGeneral,
      compras: comprasCreadas,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    console.error("❌ Error en compra masiva:", error);
    return c.json({ error: "Error procesando compra masiva" }, 500);
  }
});

app.put("/compras/:id", async (c) => {
  try {
    const compraId = c.req.param("id");
    const compraActualizada = await c.req.json();
    
    // Obtener la compra actual
    const compraActual = await kv.get(compraId);
    
    if (!compraActual) {
      return c.json({ error: "Compra no encontrada" }, 404);
    }

    // Actualizar la compra
    await kv.set(compraId, {
      ...compraActual,
      ...compraActualizada,
      id: compraId,
      fechaModificacion: new Date().toISOString(),
    });

    // Si cambió la cantidad, actualizar el stock
    if (compraActualizada.cantidad !== compraActual.cantidad) {
      const productos = await kv.getByPrefix("producto:");
      const producto = productos.find((p: any) => p.codigoBarras === compraActualizada.productoId);
      
      if (producto && producto.id) {
        const stockActual = producto.stockBySucursal?.[compraActualizada.sucursalId] || 0;
        const diferencia = compraActualizada.cantidad - compraActual.cantidad;
        const nuevoStock = stockActual + diferencia;
        
        await kv.set(producto.id, {
          ...producto,
          stockBySucursal: {
            ...producto.stockBySucursal,
            [compraActualizada.sucursalId]: Math.max(0, nuevoStock),
          },
        });

        // AUDIT LOG
        await createAuditLog(
          "UPDATE_COMPRA",
          "Administrador",
          "admin",
          `Compra actualizada: ${producto.nombre}. Cantidad anterior: ${compraActual.cantidad}, nueva: ${compraActualizada.cantidad}`,
          compraActualizada.sucursalId
        );
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.log("Error actualizando compra:", error);
    return c.json({ error: "Error actualizando compra" }, 500);
  }
});

app.delete("/compras/:id", async (c) => {
  try {
    const compraId = c.req.param("id");
    const { motivo } = await c.req.json();
    
    // Obtener la compra antes de eliminarla
    const compra = await kv.get(compraId);
    
    if (!compra) {
      return c.json({ error: "Compra no encontrada" }, 404);
    }

    // Restar el stock del producto ya que se está eliminando la compra
    const productos = await kv.getByPrefix("producto:");
    const producto = productos.find((p: any) => p.codigoBarras === compra.productoId);
    
    if (producto && producto.id) {
      const stockActual = producto.stockBySucursal?.[compra.sucursalId] || 0;
      const nuevoStock = Math.max(0, stockActual - compra.cantidad);
      
      await kv.set(producto.id, {
        ...producto,
        stockBySucursal: {
          ...producto.stockBySucursal,
          [compra.sucursalId]: nuevoStock,
        },
      });
    }

    // Marcar la compra como eliminada (no la borramos del historial)
    await kv.set(compraId, {
      ...compra,
      estatus: "eliminado",
      motivoEliminacion: motivo,
      fechaEliminacion: new Date().toISOString(),
    });

    // AUDIT LOG
    await createAuditLog(
      "DELETE_COMPRA",
      "Administrador",
      "admin",
      `Compra eliminada: ${compra.nombreProducto} - Cantidad: ${compra.cantidad} - Proveedor: ${compra.proveedor || "N/A"} - Motivo: ${motivo}`,
      compra.sucursalId
    );

    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando compra:", error);
    return c.json({ error: "Error eliminando compra" }, 500);
  }
});

app.post("/compras/:id/devolver", async (c) => {
  try {
    const compraId = c.req.param("id");
    const { motivo } = await c.req.json();
    
    // Obtener la compra
    const compra = await kv.get(compraId);
    
    if (!compra) {
      return c.json({ error: "Compra no encontrada" }, 404);
    }

    // Actualizar el stock restando la cantidad devuelta
    const productos = await kv.getByPrefix("producto:");
    const producto = productos.find((p: any) => p.codigoBarras === compra.productoId);
    
    if (producto && producto.id) {
      const stockActual = producto.stockBySucursal?.[compra.sucursalId] || 0;
      const nuevoStock = Math.max(0, stockActual - compra.cantidad);
      
      await kv.set(producto.id, {
        ...producto,
        stockBySucursal: {
          ...producto.stockBySucursal,
          [compra.sucursalId]: nuevoStock,
        },
      });
    }

    // Marcar la compra como devuelta
    await kv.set(compraId, {
      ...compra,
      estatus: "devuelto",
      motivoDevolucion: motivo,
      fechaDevolucion: new Date().toISOString(),
    });

    // AUDIT LOG
    await createAuditLog(
      "DEVOLUCION_COMPRA",
      "Administrador",
      "admin",
      `Compra devuelta: ${compra.nombreProducto} - Cantidad: ${compra.cantidad} - Motivo: ${motivo}`,
      compra.sucursalId
    );

    return c.json({ success: true });
  } catch (error) {
    console.log("Error devolviendo compra:", error);
    return c.json({ error: "Error devolviendo compra" }, 500);
  }
});

// ==================== TRASLADOS ROUTES (ANTIGUOS - DESHABILITADOS) ====================
// NOTA: Estos endpoints están deshabilitados porque hay versiones más nuevas más abajo
// que soportan múltiples productos por traslado. No eliminar por si hay datos legacy.

// app.get("/traslados", async (c) => {
//   try {
//     const traslados = await kv.getByPrefix("traslado:");
//     return c.json({ success: true, traslados });
//   } catch (error) {
//     console.log("Error obteniendo traslados:", error);
//     return c.json({ error: "Error obteniendo traslados" }, 500);
//   }
// });

// app.post("/traslados", async (c) => {
//   try {
//     const traslado = await c.req.json();
//     const trasladoId = `traslado:${generateCode("TRAS")}`;
//     
//     // Guardar el traslado
//     await kv.set(trasladoId, {
//       ...traslado,
//       id: trasladoId,
//       fechaCreacion: new Date().toISOString(),
//       estado: "completado",
//     });

//     // Actualizar el stock del producto en ambas sucursales
//     const productos = await kv.getByPrefix("producto:");
//     const producto = productos.find((p: any) => p.codigoBarras === traslado.productoId);
//     
//     if (producto && producto.id) {
//       const stockOrigen = producto.stockBySucursal?.[traslado.sucursalOrigen] || 0;
//       const stockDestino = producto.stockBySucursal?.[traslado.sucursalDestino] || 0;
//       
//       await kv.set(producto.id, {
//         ...producto,
//         stockBySucursal: {
//           ...producto.stockBySucursal,
//           [traslado.sucursalOrigen]: stockOrigen - traslado.cantidad,
//           [traslado.sucursalDestino]: stockDestino + traslado.cantidad,
//         },
//       });

//       // AUDIT LOG
//       await createAuditLog(
//         "REGISTRO_TRASLADO",
//         "Supervisor",
//         "Supervisor",
//         `Traslado de ${traslado.cantidad}x ${producto.nombre} de ${traslado.sucursalOrigen} a ${traslado.sucursalDestino}`,
//         traslado.sucursalOrigen
//       );
//     }

//     return c.json({ success: true, trasladoId });
//   } catch (error) {
//     console.log("Error creando traslado:", error);
//     return c.json({ error: "Error creando traslado" }, 500);
//   }
// });

// ==================== MEDICOS ROUTES ====================
app.get("/medicos", async (c) => {
  try {
    const medicos = await kv.getByPrefix("medico:");
    return c.json({ success: true, medicos });
  } catch (error) {
    console.log("Error obteniendo médicos:", error);
    return c.json({ error: "Error obteniendo médicos" }, 500);
  }
});

app.post("/medicos", async (c) => {
  try {
    const medico = await c.req.json();
    const medicoId = `medico:${generateCode("MED")}`;
    await kv.set(medicoId, {
      ...medico,
      id: medicoId,
      fechaCreacion: new Date().toISOString(),
    });
    return c.json({ success: true, medicoId });
  } catch (error) {
    console.log("Error creando médico:", error);
    return c.json({ error: "Error creando médico" }, 500);
  }
});

// ==================== PROVEEDORES ROUTES ====================
app.get("/proveedores", async (c) => {
  try {
    const proveedores = await kv.getByPrefix("proveedor:");
    return c.json({ success: true, proveedores });
  } catch (error) {
    console.log("Error obteniendo proveedores:", error);
    return c.json({ error: "Error obteniendo proveedores" }, 500);
  }
});

app.post("/proveedores", async (c) => {
  try {
    const proveedor = await c.req.json();
    const proveedorId = `proveedor:${generateCode("PROV")}`;
    await kv.set(proveedorId, {
      ...proveedor,
      id: proveedorId,
      fechaCreacion: new Date().toISOString(),
    });
    return c.json({ success: true, proveedorId });
  } catch (error) {
    console.log("Error creando proveedor:", error);
    return c.json({ error: "Error creando proveedor" }, 500);
  }
});

// ==================== FARMACEUTICOS ROUTES ====================
// Nota: GET /farmaceuticos está registrado en la línea ~206 (lee prefijo "user:" filtrando por role === "farmaceutico")

// ==================== AJUSTES ROUTES ====================
app.get("/ajustes", async (c) => {
  try {
    const ajustes = await kv.getByPrefix("ajuste:");
    return c.json({ success: true, ajustes });
  } catch (error) {
    console.log("Error obteniendo ajustes:", error);
    return c.json({ error: "Error obteniendo ajustes" }, 500);
  }
});

app.post("/ajustes", async (c) => {
  try {
    const ajuste = await c.req.json();
    const ajusteId = `ajuste:${generateCode("ADJ")}`;
    
    // Guardar el ajuste
    await kv.set(ajusteId, {
      ...ajuste,
      id: ajusteId,
      fechaCreacion: new Date().toISOString(),
    });

    // Actualizar el stock del producto
    const productos = await kv.getByPrefix("producto:");
    // Buscamos por código de barras o ID
    const producto = productos.find((p: any) => p.codigoBarras === ajuste.productoId || p.id === ajuste.productoId);
    
    if (producto && producto.id) {
      const stockBySucursal = { ...producto.stockBySucursal };
      const stockAnterior = stockBySucursal[ajuste.sucursalId] || 0;
      stockBySucursal[ajuste.sucursalId] = parseInt(ajuste.nuevoStock);
      
      await kv.set(producto.id, { 
        ...producto, 
        stockBySucursal 
      });

      // AUDIT LOG
      await createAuditLog(
        "AJUSTE_INVENTARIO",
        ajuste.referencia || "Supervisor",
        "Supervisor",
        `Ajuste de inventario para ${producto.nombre}: ${stockAnterior} -> ${ajuste.nuevoStock}. Motivo: ${ajuste.motivo}`,
        ajuste.sucursalId
      );
    }

    return c.json({ success: true, ajusteId });
  } catch (error) {
    console.log("Error creando ajuste:", error);
    return c.json({ error: "Error creando ajuste" }, 500);
  }
});

app.put("/ajustes/:id", async (c) => {
  try {
    const ajusteId = c.req.param("id");
    const ajusteActualizado = await c.req.json();
    
    // Obtener el ajuste actual
    const ajusteActual = await kv.get(ajusteId);
    
    if (!ajusteActual) {
      return c.json({ error: "Ajuste no encontrado" }, 404);
    }

    // Actualizar el ajuste
    await kv.set(ajusteId, {
      ...ajusteActual,
      ...ajusteActualizado,
      id: ajusteId,
      fechaModificacion: new Date().toISOString(),
    });

    // Actualizar el stock del producto si cambió
    const productos = await kv.getByPrefix("producto:");
    const producto = productos.find((p: any) => p.codigoBarras === ajusteActualizado.productoId || p.id === ajusteActualizado.productoId);
    
    if (producto && producto.id) {
      const stockBySucursal = { ...producto.stockBySucursal };
      stockBySucursal[ajusteActualizado.sucursalId] = parseInt(ajusteActualizado.nuevoStock);
      
      await kv.set(producto.id, { 
        ...producto, 
        stockBySucursal 
      });

      // AUDIT LOG
      await createAuditLog(
        "UPDATE_AJUSTE",
        ajusteActualizado.referencia || "Administrador",
        "admin",
        `Ajuste actualizado para ${producto.nombre}: Stock -> ${ajusteActualizado.nuevoStock}. Motivo: ${ajusteActualizado.motivo}`,
        ajusteActualizado.sucursalId
      );
    }

    return c.json({ success: true });
  } catch (error) {
    console.log("Error actualizando ajuste:", error);
    return c.json({ error: "Error actualizando ajuste" }, 500);
  }
});

app.delete("/ajustes/:id", async (c) => {
  try {
    const ajusteId = c.req.param("id");
    
    // Obtener el ajuste antes de eliminarlo para poder revertir el stock
    const ajuste = await kv.get(ajusteId);
    
    if (!ajuste) {
      return c.json({ error: "Ajuste no encontrado" }, 404);
    }

    // Eliminar el ajuste
    await kv.del(ajusteId);

    // AUDIT LOG
    await createAuditLog(
      "DELETE_AJUSTE",
      "Administrador",
      "admin",
      `Ajuste eliminado: ${ajuste.nombreProducto} en ${ajuste.sucursalNombre}. Motivo original: ${ajuste.motivo}`,
      ajuste.sucursalId
    );

    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando ajuste:", error);
    return c.json({ error: "Error eliminando ajuste" }, 500);
  }
});

app.post("/farmaceuticos", async (c) => {
  try {
    const farmaceutico = await c.req.json();
    const farmaceuticoId = `farmaceutico:${generateCode("FARM")}`;
    await kv.set(farmaceuticoId, {
      ...farmaceutico,
      id: farmaceuticoId,
      fechaCreacion: new Date().toISOString(),
    });
    return c.json({ success: true, farmaceuticoId });
  } catch (error) {
    console.log("Error creando farmacéutico:", error);
    return c.json({ error: "Error creando farmacéutico" }, 500);
  }
});

// ==================== ANTIBIOTICOS ROUTES ====================
app.get("/antibioticos", async (c) => {
  try {
    const antibioticos = await kv.getByPrefix("antibiotico:");
    return c.json({ success: true, antibioticos });
  } catch (error) {
    console.log("Error obteniendo antibióticos:", error);
    return c.json({ error: "Error obteniendo antibióticos" }, 500);
  }
});

// ==================== CONSULTAS / SERVICIOS ROUTES ====================
app.get("/consultas", async (c) => {
  try {
    const consultas = await kv.getByPrefix("consulta:");
    return c.json({ success: true, consultas });
  } catch (error) {
    console.log("Error obteniendo consultas:", error);
    return c.json({ error: "Error obteniendo consultas" }, 500);
  }
});

app.post("/consultas", async (c) => {
  try {
    const consulta = await c.req.json();
    const consultaId = `consulta:${generateCode("CONS")}`;
    
    // Obtener caja activa de la sucursal
    const cajas = await kv.getByPrefix("caja:");
    const cajaActiva = cajas.find((caja: any) => 
      caja.sucursalId === consulta.sucursalId && caja.estado === "abierta"
    );
    
    await kv.set(consultaId, {
      ...consulta,
      id: consultaId,
      fecha: new Date().toISOString(),
      cajaId: cajaActiva ? cajaActiva.id : null,
    });
    
    return c.json({ success: true, consultaId });
  } catch (error) {
    console.log("Error creando consulta:", error);
    return c.json({ error: "Error creando consulta" }, 500);
  }
});

app.put("/consultas/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const consulta = await kv.get(id);
    if (!consulta) {
      return c.json({ error: "Consulta no encontrada" }, 404);
    }
    await kv.set(id, { ...consulta, ...updates });
    return c.json({ success: true });
  } catch (error) {
    console.log("Error actualizando consulta:", error);
    return c.json({ error: "Error actualizando consulta" }, 500);
  }
});

app.put("/consultas/:id/atender", async (c) => {
  try {
    const id = c.req.param("id");
    const consulta = await kv.get(id);
    
    if (!consulta) {
      return c.json({ error: "Consulta no encontrada" }, 404);
    }
    
    await kv.set(id, {
      ...consulta,
      estado: "atendida",
      fechaAtencion: new Date().toISOString(),
    });
    
    return c.json({ success: true, message: "Consulta marcada como atendida" });
  } catch (error) {
    console.log("Error actualizando consulta:", error);
    return c.json({ error: "Error actualizando consulta" }, 500);
  }
});

// ==================== CORTES DE CAJA ROUTES ====================

// Obtener todas las cajas (historial de cortes)
app.get("/cajas", async (c) => {
  try {
    const cajas = await kv.getByPrefix("caja:");
    // Ordenar por fecha de apertura (más reciente primero)
    const cajasOrdenadas = cajas.sort((a: any, b: any) => 
      new Date(b.fechaApertura).getTime() - new Date(a.fechaApertura).getTime()
    );
    return c.json({ success: true, cajas: cajasOrdenadas });
  } catch (error) {
    console.log("Error obteniendo cajas:", error);
    return c.json({ error: "Error obteniendo cajas" }, 500);
  }
});

// Obtener caja activa de una sucursal para un farmacéutico específico
app.get("/cajas/activa/:sucursalId", async (c) => {
  try {
    const sucursalId = c.req.param("sucursalId");
    const farmaceuticoId = c.req.query("farmaceuticoId"); // Opcional
    const cajas = await kv.getByPrefix("caja:");
    
    // Si se proporciona farmaceuticoId, buscar su caja abierta
    if (farmaceuticoId) {
      const cajaActiva = cajas.find((caja: any) => 
        caja.sucursalId === sucursalId && 
        caja.estado === "abierta" && 
        caja.farmaceuticoId === farmaceuticoId
      );
      
      if (!cajaActiva) {
        return c.json({ success: true, caja: null });
      }
      
      // Obtener ventas y servicios de esta caja
     const ventas = await kv.getByPrefix("venta:");
     const toCSTServer = (fecha: string): Date => {
       const utc = new Date(fecha);
       return new Date(utc.getTime() - (6 * 60 * 60 * 1000));
     };
     const fechaAperturaCSTServer = toCSTServer(cajaActiva.fechaApertura).getTime();
     const todasVentasCaja = ventas.filter((v: any) => {
       if (v.cajaId === cajaActiva.id) return true;
       if (v.sucursalId === cajaActiva.sucursalId && !v.cajaId) {
         const fechaVentaCST = toCSTServer(v.fecha).getTime();
         return fechaVentaCST >= fechaAperturaCSTServer;
       }
       return false;
     });

// Ventas activas = las que NO están devueltas (incluyendo las que tienen estado NULL)
const ventasCaja = todasVentasCaja.filter((v: any) => v.estado !== "devuelto");

// Devoluciones realizadas HOY en esta sucursal
const hoy = new Date().toISOString().split("T")[0];
const devolucionesHoy = ventas.filter((v: any) => 
  v.estado === "devuelto" &&
  v.sucursalId === sucursalId &&
  v.fechaDevolucion && v.fechaDevolucion.startsWith(hoy)
);

const consultas = await kv.getByPrefix("consulta:");
const consultasCaja = consultas.filter((con: any) => con.cajaId === cajaActiva.id);

return c.json({ 
  success: true, 
  caja: { 
    ...cajaActiva, 
    ventas: ventasCaja,
    servicios: consultasCaja,
    devoluciones: devolucionesHoy
  }
});
    }
    
    // Si no se proporciona farmaceuticoId, buscar cualquier caja activa (comportamiento anterior)
    const cajaActiva = cajas.find((caja: any) => 
      caja.sucursalId === sucursalId && caja.estado === "abierta"
    );
    
    if (!cajaActiva) {
      return c.json({ success: true, caja: null });
    }
    
    // Obtener ventas de esta caja
    const ventas = await kv.getByPrefix("venta:");
    const ventasCaja = ventas.filter((v: any) => v.cajaId === cajaActiva.id);
    
    // Obtener consultas/servicios de esta caja
    const consultas = await kv.getByPrefix("consulta:");
    const consultasCaja = consultas.filter((c: any) => c.cajaId === cajaActiva.id);
    
    return c.json({ 
      success: true, 
      caja: {
        ...cajaActiva,
        ventas: ventasCaja,
        servicios: consultasCaja
      }
    });
  } catch (error) {
    console.log("Error obteniendo caja activa:", error);
    return c.json({ error: "Error obteniendo caja activa" }, 500);
  }
});

// Abrir nueva caja
app.post("/cajas", async (c) => {
  try {
    const { sucursalId, farmaceuticoId, montoInicial, notas, numeroCaja } = await c.req.json();
    
    const cajas = await kv.getByPrefix("caja:");
    const cajaAbierta = cajas.find((caja: any) => 
      caja.sucursalId === sucursalId && 
      caja.estado === "abierta" && 
      caja.numeroCaja === numeroCaja
    );
    
    if (cajaAbierta) {
      return c.json({ 
        error: `La Caja ${numeroCaja} ya está abierta por otro farmacéutico. Por favor, selecciona otra caja.` 
      }, 400);
    }
    
    // Verificar si ya hubo un pre-corte en esta caja hoy
    const todasCajas = await kv.getByPrefix("caja:");
    const hoy = new Date().toISOString().split("T")[0];
    const cajaConPreCorte = todasCajas.find((c: any) => 
      c.sucursalId === sucursalId && 
      c.numeroCaja === (numeroCaja || 1) &&
      c.estado === "preCorte" &&
      c.fechaCierre?.startsWith(hoy)
    );

    // Si hay pre-corte, reactivar esa caja con nuevo farmacéutico
    if (cajaConPreCorte) {
      // Guardar snapshot del pre-corte ANTES de reactivar
      const snapshotId = `caja:SNAPSHOT-${cajaConPreCorte.id}`;
      await kv.set(snapshotId, {
        ...cajaConPreCorte,
        id: snapshotId,
        esSnapshot: true,
        snapshotDe: cajaConPreCorte.id,
      });

      const cajaReactivada = {
        ...cajaConPreCorte,
        estado: "abierta",
        farmaceuticoId,
        farmaceuticoVespertino: farmaceuticoId,
        fechaReapertura: new Date().toISOString(),
        montoInicialVespertino: 0,
        tienePreCorte: true,
        snapshotPreCorteId: snapshotId,
      };
      await kv.set(cajaConPreCorte.id, cajaReactivada);
      return c.json({ success: true, caja: cajaReactivada, tienePreCorte: true });
    }

    const cajaId = `caja:${generateCode("CAJA")}`;
    const caja = {
      id: cajaId,
      sucursalId,
      farmaceuticoId,
      montoInicial: parseFloat(montoInicial) || 0,
      notas: notas || "",
      estado: "abierta",
      numeroCaja: numeroCaja || 1,
      fechaApertura: new Date().toISOString(),
      tienePreCorte: false,
    };
    
    await kv.set(cajaId, caja);
    return c.json({ success: true, caja });
  } catch (error) {
    console.log("Error abriendo caja:", error);
    return c.json({ error: "Error abriendo caja" }, 500);
  }
});

// Cerrar caja (hacer corte)
app.put("/cajas/:id/cerrar", async (c) => {
  try {
    const id = c.req.param("id");
    const { 
      totalVentasGeneradas,
      recargas,
      sobrante,
      certificados,
      serviciosMedicos,
      cobrosConTarjeta,
      valeAzul,
      devoluciones,
      transferencias,
      fondo,
      notasCierre,
      tipoCorte, // "preCorte" | "corteTotal"
      cerrarOtrasCajas, // boolean - para corte total
    } = await c.req.json();
    
    const caja = await kv.get(id);
    if (!caja) {
      return c.json({ error: "Caja no encontrada" }, 404);
    }
    
    if (caja.estado !== "abierta") {
      return c.json({ error: "La caja ya está cerrada" }, 400);
    }
    
    // Obtener todas las ventas de esta caja
    // Helper CST
    const toCST = (fecha: string): Date => {
      const utc = new Date(fecha);
      return new Date(utc.getTime() - (6 * 60 * 60 * 1000));
    };

    const ventas = await kv.getByPrefix("venta:");
    const fechaAperturaCST = toCST(caja.fechaApertura).getTime();
    const ventasCaja = ventas.filter((v: any) => {
      if (v.cajaId === id) return true;
      // Incluir ventas de la misma sucursal registradas desde apertura CST sin cajaId
      if (v.sucursalId === caja.sucursalId && !v.cajaId) {
        const fechaVentaCST = toCST(v.fecha).getTime();
        return fechaVentaCST >= fechaAperturaCST;
      }
      return false;
    });
    
    // Obtener todos los servicios de esta caja
    const consultas = await kv.getByPrefix("consulta:");
    const consultasCaja = consultas.filter((c: any) => {
      if (c.cajaId === id) return true;
      if (c.sucursalId === caja.sucursalId && !c.cajaId) {
        const fechaConsultaCST = toCST(c.fecha).getTime();
        return fechaConsultaCST >= fechaAperturaCST;
      }
      return false;
    });
    
    // Calcular totales por método de pago
    let totalEfectivo = 0;
    let totalTarjeta = 0;
    let totalTransferencia = 0;
    let totalVentas = 0;
    let totalServicios = 0;
    
    ventasCaja.forEach((venta: any) => {
      const monto = parseFloat(venta.total) || 0;
      totalVentas += monto;
      
      if (venta.metodoPago === "efectivo") {
        totalEfectivo += monto;
      } else if (venta.metodoPago === "tarjeta") {
        totalTarjeta += monto;
      } else if (venta.metodoPago === "transferencia") {
        totalTransferencia += monto;
      }
    });
    
    consultasCaja.forEach((consulta: any) => {
      const monto = parseFloat(consulta.monto) || 0;
      totalServicios += monto;
      // NO sumamos al efectivo aquí porque los servicios ya deben tener una venta asociada si se cobraron.
      // Si se suman aquí, se duplican los ingresos.
    });
    
    // Parsear los valores del corte
    const totalVentasGen = parseFloat(totalVentasGeneradas) || 0;
    const recargasNum = parseFloat(recargas) || 0;
    const sobranteNum = parseFloat(sobrante) || 0;
    const certificadosNum = parseFloat(certificados) || 0;
    const serviciosMedicosNum = parseFloat(serviciosMedicos) || 0;
    
    const cobrosConTarjetaNum = parseFloat(cobrosConTarjeta) || 0;
    const valeAzulNum = parseFloat(valeAzul) || 0;
    const devolucionesNum = parseFloat(devoluciones) || 0;
    const transferenciasNum = parseFloat(transferencias) || 0;
    
    // Calcular SUMAN
    const fondoNum = parseFloat(fondo) || 0;
    const esPreCorte = tipoCorte === "preCorte";
    // En pre-corte el fondo NO se suma
    const totalSuman = totalVentasGen + recargasNum + sobranteNum + 
                       (esPreCorte ? 0 : fondoNum) + certificadosNum + serviciosMedicosNum;
    
    // Calcular RESTAN
    const totalRestan = cobrosConTarjetaNum + valeAzulNum + devolucionesNum + transferenciasNum + serviciosMedicosNum;
    
    // Calcular Efectivo a Entregar
    const efectivoAEntregar = totalSuman - totalRestan;
    
    // Si es corte total, cerrar otras cajas de la misma sucursal
    if (!esPreCorte && cerrarOtrasCajas) {
      const todasCajas = await kv.getByPrefix("caja:");
      const otrasAbiertas = todasCajas.filter((c: any) =>
        c.sucursalId === caja.sucursalId &&
        (c.estado === "abierta" || c.estado === "preCorte") &&
        c.id !== id
      );
      for (const otraCaja of otrasAbiertas) {
        await kv.set(otraCaja.id, { 
          ...otraCaja, 
          estado: "cerrada",
          fechaCierre: new Date().toISOString(),
          tipoCierre: "automatico",
          cerradaPorCorteTotal: id
        });
      }
    }

    const cajaCerrada = {
      ...caja,
      estado: esPreCorte ? "preCorte" : "cerrada",
      fechaCierre: new Date().toISOString(),
      tipoCorte: esPreCorte ? "preCorte" : "corteTotal",
      // SUMAN
      totalVentasGeneradas: totalVentasGen,
      recargas: recargasNum,
      sobrante: sobranteNum,
      certificados: certificadosNum,
      serviciosMedicos: serviciosMedicosNum,
      fondo: fondoNum,
      totalSuman,
      // RESTAN
      cobrosConTarjeta: cobrosConTarjetaNum,
      valeAzul: valeAzulNum,
      devoluciones: devolucionesNum,
      transferencias: transferenciasNum,
      totalRestan,
      // RESULTADO
      efectivoAEntregar,
      // Totales del sistema (para referencia)
      totalVentas,
      totalServicios,
      totalEfectivo,
      totalTarjeta,
      totalTransferencia,
      // Contadores
      numeroVentas: ventasCaja.length,
      numeroServicios: consultasCaja.length,
      notasCierre: notasCierre || "",
    };
    
    await kv.set(id, cajaCerrada);
    return c.json({ success: true, caja: cajaCerrada });
  } catch (error) {
    console.log("Error cerrando caja:", error);
    return c.json({ error: "Error cerrando caja" }, 500);
  }
});

// Eliminar todo el historial de cajas (Reset)
app.delete("/cajas", async (c) => {
  try {
    const cajas = await kv.getByPrefix("caja:");
    for (const caja of cajas) {
      await kv.del(caja.id);
    }
    return c.json({ success: true, message: "Historial de cajas eliminado" });
  } catch (error) {
    console.log("Error eliminando historial:", error);
    return c.json({ error: "Error eliminando historial" }, 500);
  }
});

// Cerrar todas las cajas de una sucursal (Cierre Diario)
app.post("/cajas/cierre-diario/:sucursalId", async (c) => {
  try {
    const sucursalId = c.req.param("sucursalId");
    const cajas = await kv.getByPrefix("caja:");
    
    // Buscar todas las cajas abiertas de esta sucursal
    const cajasAbiertas = cajas.filter((caja: any) => 
      caja.sucursalId === sucursalId && caja.estado === "abierta"
    );
    
    if (cajasAbiertas.length === 0) {
      return c.json({ error: "No hay cajas abiertas para cerrar" }, 400);
    }
    
    // Cerrar cada caja con un corte automático
    const cajasCerradas = [];
    const fechaCierre = new Date().toISOString();
    
    for (const caja of cajasAbiertas) {
      // Obtener ventas y servicios de esta caja
      const ventas = await kv.getByPrefix("venta:");
      const ventasCaja = ventas.filter((v: any) => v.cajaId === caja.id);
      
      const consultas = await kv.getByPrefix("consulta:");
      const consultasCaja = consultas.filter((c: any) => c.cajaId === caja.id);
      
      // Calcular totales automáticamente
      let totalVentas = 0;
      let totalEfectivo = 0;
      let totalTarjeta = 0;
      let totalTransferencia = 0;
      
      ventasCaja.forEach((venta: any) => {
        const monto = parseFloat(venta.total) || 0;
        totalVentas += monto;
        
        if (venta.metodoPago === "efectivo") {
          totalEfectivo += monto;
        } else if (venta.metodoPago === "tarjeta") {
          totalTarjeta += monto;
        } else if (venta.metodoPago === "transferencia") {
          totalTransferencia += monto;
        }
      });
      
      let totalServicios = 0;
      consultasCaja.forEach((consulta: any) => {
        totalServicios += parseFloat(consulta.monto) || 0;
      });
      
      // Crear corte automático
      const cajaCerrada = {
        ...caja,
        estado: "cerrada",
        fechaCierre: fechaCierre,
        tipoCierre: "diario",
        // SUMAN
        totalVentasGeneradas: totalEfectivo,
        recargas: 0,
        sobrante: 0,
        certificados: 0,
        serviciosMedicos: totalServicios,
        totalSuman: totalEfectivo + totalServicios,
        // RESTAN
        cobrosConTarjeta: totalTarjeta,
        valeAzul: 0,
        devoluciones: 0,
        transferencias: totalTransferencia,
        totalRestan: totalTarjeta + totalTransferencia,
        // RESULTADO
        efectivoAEntregar: totalEfectivo + totalServicios - (totalTarjeta + totalTransferencia),
        // Totales del sistema
        totalVentas,
        totalServicios,
        totalEfectivo,
        totalTarjeta,
        totalTransferencia,
        // Contadores
        numeroVentas: ventasCaja.length,
        numeroServicios: consultasCaja.length,
        notasCierre: "Cierre diario automático",
      };
      
      await kv.set(caja.id, cajaCerrada);
      cajasCerradas.push(cajaCerrada);
    }
    
    return c.json({ 
      success: true, 
      message: `${cajasCerradas.length} caja(s) cerrada(s) exitosamente`,
      cajas: cajasCerradas 
    });
  } catch (error) {
    console.log("Error en cierre diario:", error);
    return c.json({ error: "Error en cierre diario" }, 500);
  }
});

// Obtener reporte de todos los cortes (consolidado por día)
app.get("/cajas/reporte-cortes", async (c) => {
  try {
    const sucursalId = c.req.query("sucursalId");
    const cajas = await kv.getByPrefix("caja:");
    
    // Filtrar cajas cerradas
    let cajasCerradas = cajas.filter((caja: any) => caja.estado === "cerrada");
    
    // Si se especifica sucursal, filtrar por ella
    if (sucursalId && sucursalId !== "todas") {
      cajasCerradas = cajasCerradas.filter((caja: any) => caja.sucursalId === sucursalId);
    }
    
    // Ordenar por fecha de cierre descendente (más reciente primero)
    cajasCerradas.sort((a: any, b: any) => {
      if (!a.fechaCierre || !b.fechaCierre) return 0;
      return new Date(b.fechaCierre).getTime() - new Date(a.fechaCierre).getTime();
    });
    
    // Agrupar por día
    const cortesPorDia = new Map<string, any>();
    
    for (const caja of cajasCerradas) {
      // Obtener fecha en formato YYYY-MM-DD
      const fechaCierre = new Date(caja.fechaCierre);
      const fechaKey = fechaCierre.toISOString().split('T')[0];
      const diaSemanaKey = `${fechaKey}-${caja.sucursalId}`;
      
      if (!cortesPorDia.has(diaSemanaKey)) {
        // Crear nuevo registro consolidado para este día
        cortesPorDia.set(diaSemanaKey, {
          id: `consolidado-${diaSemanaKey}`,
          sucursalId: caja.sucursalId,
          fecha: fechaKey,
          fechaCierre: caja.fechaCierre,
          cortesIndividuales: [],
          // Totales acumulados
          montoInicialTotal: 0,
          efectivoAEntregarTotal: 0,
          totalSumanTotal: 0,
          totalRestanTotal: 0,
          duracionTotal: 0,
        });
      }
      
      const registro = cortesPorDia.get(diaSemanaKey);
      
      // Calcular duración en minutos
      let duracionMinutos = 0;
      if (caja.fechaApertura && caja.fechaCierre) {
        const apertura = new Date(caja.fechaApertura);
        const cierre = new Date(caja.fechaCierre);
        duracionMinutos = (cierre.getTime() - apertura.getTime()) / (1000 * 60);
      }
      
      // Agregar corte individual al registro
      registro.cortesIndividuales.push({
        cajaId: caja.id,
        numeroCaja: caja.numeroCaja || 1,
        farmaceuticoId: caja.farmaceuticoId,
        fechaApertura: caja.fechaApertura,
        fechaCierre: caja.fechaCierre,
        duracionMinutos,
        montoInicial: caja.montoInicial || 0,
        efectivoAEntregar: caja.efectivoAEntregar || 0,
        totalSuman: caja.totalSuman || 0,
        totalRestan: caja.totalRestan || 0,
        tipoCierre: caja.tipoCierre || "parcial",
      });
      
      // Sumar totales
      registro.montoInicialTotal += (caja.montoInicial || 0);
      registro.efectivoAEntregarTotal += (caja.efectivoAEntregar || 0);
      registro.totalSumanTotal += (caja.totalSuman || 0);
      registro.totalRestanTotal += (caja.totalRestan || 0);
      registro.duracionTotal += duracionMinutos;
    }
    
    // Convertir a array y enriquecer con información adicional
    const farmaceuticos = await kv.getByPrefix("user:");
    const cortesConsolidados = Array.from(cortesPorDia.values()).map((registro: any) => {
      // Obtener nombres de todos los farmacéuticos únicos
      const farmaceuticosUnicos = new Set(
        registro.cortesIndividuales.map((c: any) => c.farmaceuticoId)
      );
      
      const nombresUsuarios = Array.from(farmaceuticosUnicos).map((id: any) => {
        const farm = farmaceuticos.find((u: any) => u.id === id);
        return farm?.nombre || farm?.name || "Desconocido";
      });
      
      // Calcular primera apertura y último cierre
      const aperturas = registro.cortesIndividuales.map((c: any) => 
        new Date(c.fechaApertura).getTime()
      );
      const cierres = registro.cortesIndividuales.map((c: any) => 
        new Date(c.fechaCierre).getTime()
      );
      
      const primeraApertura = new Date(Math.min(...aperturas)).toISOString();
      const ultimoCierre = new Date(Math.max(...cierres)).toISOString();
      
      // Calcular duración total formateada
      const horas = Math.floor(registro.duracionTotal / 60);
      const minutos = Math.floor(registro.duracionTotal % 60);
      
      return {
        ...registro,
        fechaApertura: primeraApertura,
        fechaCierre: ultimoCierre,
        duracion: `${horas}h ${minutos}m`,
        numeroCortes: registro.cortesIndividuales.length,
        usuarios: nombresUsuarios.join(", "),
        cajas: [...new Set(registro.cortesIndividuales.map((c: any) => c.numeroCaja))].sort(),
      };
    });
    
    return c.json({ success: true, cortes: cortesConsolidados });
  } catch (error) {
    console.log("Error obteniendo reporte de cortes:", error);
    return c.json({ error: "Error obteniendo reporte de cortes" }, 500);
  }
});

// ==================== CAJAS CONFIG ROUTES ====================

// GET: Obtener configuraciones de cajas de todas las sucursales
app.get("/cajas-config", async (c) => {
  try {
    const records = await kv.getByPrefix("cajas-config:");
    return c.json({ success: true, configs: records });
  } catch (error) {
    console.log("Error obteniendo configuración de cajas:", error);
    return c.json({ error: "Error obteniendo configuración de cajas" }, 500);
  }
});

// GET: Obtener configuración de una sucursal específica
app.get("/cajas-config/:sucursalId", async (c) => {
  try {
    const sucursalId = c.req.param("sucursalId");
    const record = await kv.get(`cajas-config:${sucursalId}`);
    if (!record) {
      return c.json({ success: true, config: { sucursalId, numeroCajas: 1 } });
    }
    return c.json({ success: true, config: record });
  } catch (error) {
    console.log("Error obteniendo configuración de caja:", error);
    return c.json({ error: "Error obteniendo configuración de caja" }, 500);
  }
});

// PUT: Guardar/actualizar número de cajas para una sucursal
app.put("/cajas-config/:sucursalId", async (c) => {
  try {
    const sucursalId = c.req.param("sucursalId");
    const body = await c.req.json();
    const numeroCajas = Math.min(5, Math.max(1, parseInt(body.numeroCajas) || 1));
    const config = {
      sucursalId,
      numeroCajas,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`cajas-config:${sucursalId}`, config);
    return c.json({ success: true, config });
  } catch (error) {
    console.log("Error guardando configuración de caja:", error);
    return c.json({ error: "Error guardando configuración de caja" }, 500);
  }
});

// ==================== GASTOS ROUTES ====================

// GET: Obtener todos los gastos
app.get("/gastos", async (c) => {
  try {
    console.log("📤 GET /gastos - Obteniendo todos los gastos...");
    const records = await kv.getByPrefix("gasto:");
    console.log(`📦 Records obtenidos de KV:`, records.length);
    
    if (records.length > 0) {
      console.log("📋 Primer record (ejemplo):", JSON.stringify(records[0], null, 2));
    }
    
    // getByPrefix ya retorna { id: key, ...value }, solo necesitamos reemplazar el prefijo
    const gastos = records.map((r: any) => {
      // Destructurar para separar el id del resto de propiedades
      const { id, ...resto } = r;
      return {
        id: id.replace("gasto:", ""),
        ...resto
      };
    });
    
    console.log(`📊 Gastos procesados:`, gastos.length);
    if (gastos.length > 0) {
      console.log("📋 Primer gasto procesado:", JSON.stringify(gastos[0], null, 2));
    }
    
    // Ordenar por fecha (más recientes primero)
    gastos.sort((a: any, b: any) => {
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
    
    console.log(`✅ Retornando ${gastos.length} gastos`);
    return c.json({ success: true, gastos });
  } catch (error) {
    console.error("❌ Error obteniendo gastos:", error);
    return c.json({ error: "Error obteniendo gastos" }, 500);
  }
});

// GET: Obtener un gasto específico
app.get("/gastos/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const gasto = await kv.get(`gasto:${id}`);
    
    if (!gasto) {
      return c.json({ error: "Gasto no encontrado" }, 404);
    }
    
    return c.json({ 
      success: true, 
      gasto: { id, ...gasto }
    });
  } catch (error) {
    console.error("Error obteniendo gasto:", error);
    return c.json({ error: "Error obteniendo gasto" }, 500);
  }
});

// POST: Crear nuevo gasto
app.post("/gastos", async (c) => {
  try {
    const body = await c.req.json();
    console.log("📥 POST /gastos - Body recibido:", JSON.stringify(body, null, 2));
    
    const { categoria, sucursalId, monto, nota, creadoPor, creadoPorNombre } = body;
    
    // Validaciones
    if (!categoria || !sucursalId || monto === undefined || !nota) {
      console.log("❌ Validación fallida - campos faltantes:", { categoria, sucursalId, monto, nota });
      return c.json({ error: "Faltan campos requeridos" }, 400);
    }
    
    if (typeof monto !== "number" || monto <= 0) {
      console.log("❌ Validación fallida - monto inválido:", monto, typeof monto);
      return c.json({ error: "El monto debe ser un número positivo" }, 400);
    }
    
    // Crear ID único
    const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    const gasto = {
      categoria,
      sucursalId,
      monto,
      nota,
      creadoPor,
      creadoPorNombre,
      fecha: new Date().toISOString(),
    };
    
    console.log("💾 Guardando gasto con ID:", id);
    console.log("💾 Datos del gasto:", JSON.stringify(gasto, null, 2));
    
    await kv.set(`gasto:${id}`, gasto);
    
    console.log(`✅ Gasto creado: ${id} - ${categoria} - $${monto}`);
    
    return c.json({ 
      success: true, 
      gasto: { id, ...gasto }
    });
  } catch (error) {
    console.error("❌ Error creando gasto:", error);
    return c.json({ error: "Error creando gasto" }, 500);
  }
});

// PUT: Actualizar gasto existente
app.put("/gastos/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { categoria, sucursalId, monto, nota } = body;
    
    // Obtener gasto existente
    const gastoExistente = await kv.get(`gasto:${id}`);
    
    if (!gastoExistente) {
      return c.json({ error: "Gasto no encontrado" }, 404);
    }
    
    // Validaciones
    if (!categoria || !sucursalId || monto === undefined || !nota) {
      return c.json({ error: "Faltan campos requeridos" }, 400);
    }
    
    if (typeof monto !== "number" || monto <= 0) {
      return c.json({ error: "El monto debe ser un número positivo" }, 400);
    }
    
    // Actualizar gasto
    const gastoActualizado = {
      ...gastoExistente,
      categoria,
      sucursalId,
      monto,
      nota,
      editadoPor: body.editadoPor || gastoExistente.creadoPor,
      editadoPorNombre: body.editadoPorNombre || gastoExistente.creadoPorNombre,
      fechaEdicion: new Date().toISOString(),
    };
    
    await kv.set(`gasto:${id}`, gastoActualizado);
    
    console.log(`Gasto actualizado: ${id}`);
    
    return c.json({ 
      success: true, 
      gasto: { id, ...gastoActualizado }
    });
  } catch (error) {
    console.error("Error actualizando gasto:", error);
    return c.json({ error: "Error actualizando gasto" }, 500);
  }
});

// DELETE: Eliminar gasto
app.delete("/gastos/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    // Verificar que el gasto existe
    const gasto = await kv.get(`gasto:${id}`);
    
    if (!gasto) {
      return c.json({ error: "Gasto no encontrado" }, 404);
    }
    
    await kv.del(`gasto:${id}`);
    
    console.log(`Gasto eliminado: ${id}`);
    
    return c.json({ 
      success: true, 
      message: "Gasto eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error eliminando gasto:", error);
    return c.json({ error: "Error eliminando gasto" }, 500);
  }
});

// ==================== RUTAS DE TRASLADOS ====================

// GET: Obtener todos los traslados
app.get("/traslados", async (c) => {
  try {
    console.log("📤 GET /traslados - Obteniendo todos los traslados...");
    const records = await kv.getByPrefix("traslado:");
    console.log(`📦 Records obtenidos de KV:`, records.length);
    
    // getByPrefix ya retorna { id: key, ...value }
    const traslados = records.map((r: any) => {
      const { id, ...resto } = r;
      return {
        id: id.replace("traslado:", ""),
        ...resto
      };
    });
    
    // Ordenar por fecha (más recientes primero)
    traslados.sort((a: any, b: any) => {
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
    
    console.log(`✅ Retornando ${traslados.length} traslados`);
    return c.json({ success: true, traslados });
  } catch (error) {
    console.error("❌ Error obteniendo traslados:", error);
    return c.json({ error: "Error obteniendo traslados" }, 500);
  }
});

// GET: Obtener un traslado específico
app.get("/traslados/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const traslado = await kv.get(`traslado:${id}`);
    
    if (!traslado) {
      return c.json({ error: "Traslado no encontrado" }, 404);
    }
    
    return c.json({ 
      success: true, 
      traslado: { id, ...traslado }
    });
  } catch (error) {
    console.error("Error obteniendo traslado:", error);
    return c.json({ error: "Error obteniendo traslado" }, 500);
  }
});

// POST: Crear nuevo traslado
app.post("/traslados", async (c) => {
  try {
    const body = await c.req.json();
    console.log("📥 POST /traslados - Body recibido:", JSON.stringify(body, null, 2));
    
    const { 
      descripcion, 
      sucursalOrigenId, 
      sucursalDestinoId, 
      productos, 
      total, 
      estado, 
      creadoPor, 
      creadoPorNombre 
    } = body;
    
    // Validaciones
    if (!descripcion || !sucursalOrigenId || !sucursalDestinoId || !productos || !Array.isArray(productos)) {
      console.log("❌ Validación fallida - campos faltantes");
      return c.json({ error: "Faltan campos requeridos" }, 400);
    }
    
    if (sucursalOrigenId === sucursalDestinoId) {
      return c.json({ error: "La sucursal de origen y destino no pueden ser iguales" }, 400);
    }
    
    if (productos.length === 0) {
      return c.json({ error: "Debe agregar al menos un producto al traslado" }, 400);
    }
    
    // Crear ID único
    const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    const traslado = {
      descripcion,
      sucursalOrigenId,
      sucursalDestinoId,
      productos,
      total: total || 0,
      estado: estado || "pendiente",
      creadoPor,
      creadoPorNombre,
      fecha: new Date().toISOString(),
    };
    
    console.log("💾 Guardando traslado con ID:", id);
    
    await kv.set(`traslado:${id}`, traslado);
    
    console.log(`✅ Traslado creado: ${id} - ${descripcion}`);
    
    return c.json({ 
      success: true, 
      traslado: { id, ...traslado }
    });
  } catch (error) {
    console.error("❌ Error creando traslado:", error);
    return c.json({ error: "Error creando traslado" }, 500);
  }
});

// PUT: Actualizar traslado existente
app.put("/traslados/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    console.log("📝 PUT /traslados - ID recibido:", id);
    console.log("📝 PUT /traslados - Buscando en KV con key:", `traslado:${id}`);
    
    const { descripcion, sucursalOrigenId, sucursalDestinoId, productos, total, estado } = body;
    
    // Obtener traslado existente
    const trasladoExistente = await kv.get(`traslado:${id}`);
    console.log("📝 PUT /traslados - Traslado encontrado:", trasladoExistente ? "SI" : "NO");
    
    if (!trasladoExistente) {
      // Debug: Intentar listar todos los traslados para ver qué IDs existen
      const todosLosTraslados = await kv.getByPrefix("traslado:");
      console.log("🔍 DEBUG - Traslados existentes en DB:", todosLosTraslados.map((t: any) => t.id));
      return c.json({ error: "Traslado no encontrado" }, 404);
    }
    
    // Validaciones
    if (sucursalOrigenId === sucursalDestinoId) {
      return c.json({ error: "La sucursal de origen y destino no pueden ser iguales" }, 400);
    }
    
    // Calcular el total si no se proporciona
    let totalFinal = total;
    if (totalFinal === undefined || totalFinal === 0) {
      // Recalcular el total basado en los productos
      const productosFinales = productos || trasladoExistente.productos;
      if (Array.isArray(productosFinales) && productosFinales.length > 0) {
        totalFinal = productosFinales.reduce((sum: number, item: any) => {
          const cantidad = parseFloat(item.cantidad || 0);
          const precioUnitario = parseFloat(item.precioUnitario || 0);
          return sum + (cantidad * precioUnitario);
        }, 0);
        console.log(`📊 Total recalculado para traslado ${id}: $${totalFinal.toFixed(2)}`);
      }
    }
    
    const trasladoActualizado = {
      ...trasladoExistente,
      descripcion: descripcion || trasladoExistente.descripcion,
      sucursalOrigenId: sucursalOrigenId || trasladoExistente.sucursalOrigenId,
      sucursalDestinoId: sucursalDestinoId || trasladoExistente.sucursalDestinoId,
      productos: productos || trasladoExistente.productos,
      total: totalFinal !== undefined ? totalFinal : trasladoExistente.total,
      estado: estado || trasladoExistente.estado,
      editadoPor: body.editadoPor || trasladoExistente.creadoPor,
      editadoPorNombre: body.editadoPorNombre || trasladoExistente.creadoPorNombre,
      fechaEdicion: new Date().toISOString(),
    };
    
    // 🔥 LÓGICA DE INVENTARIO: Si el traslado cambia a "completado", actualizar inventario
    const estadoAnterior = trasladoExistente.estado;
    const estadoNuevo = trasladoActualizado.estado;
    
    if (estadoAnterior !== "completado" && estadoNuevo === "completado") {
      console.log(`📦 Traslado ${id} cambiando a COMPLETADO - Actualizando inventario...`);
      
      // Obtener todos los productos del inventario
      const todosLosProductos = await kv.getByPrefix("producto:");
      
      // Procesar cada producto del traslado
      for (const itemTraslado of trasladoActualizado.productos) {
        const cantidad = parseFloat(itemTraslado.cantidad || 0);
        
        // Buscar el producto en el inventario
        const producto = todosLosProductos.find((p: any) => 
          p.id === itemTraslado.productoId || 
          p.codigoBarras === itemTraslado.codigoBarras
        );
        
        if (producto) {
          const stockOrigen = parseFloat(producto.stockBySucursal?.[trasladoActualizado.sucursalOrigenId] || 0);
          const stockDestino = parseFloat(producto.stockBySucursal?.[trasladoActualizado.sucursalDestinoId] || 0);
          
          // Validar que hay suficiente stock en origen
          if (stockOrigen < cantidad) {
            console.log(`⚠️ ADVERTENCIA: Stock insuficiente en origen para ${producto.nombre}: ${stockOrigen} < ${cantidad}`);
            // Continuar de todos modos pero logear el warning
          }
          
          const nuevoStockOrigen = stockOrigen - cantidad; // permite negativo
          const nuevoStockDestino = stockDestino + cantidad;
          
          // Actualizar el stock del producto
          await kv.set(producto.id, {
            ...producto,
            stockBySucursal: {
              ...producto.stockBySucursal,
              [trasladoActualizado.sucursalOrigenId]: nuevoStockOrigen,
              [trasladoActualizado.sucursalDestinoId]: nuevoStockDestino,
            },
          });
          
          console.log(`  ✅ ${producto.nombre}:`);
          console.log(`     Origen (${trasladoActualizado.sucursalOrigenId}): ${stockOrigen} → ${nuevoStockOrigen}`);
          console.log(`     Destino (${trasladoActualizado.sucursalDestinoId}): ${stockDestino} → ${nuevoStockDestino}`);
        } else {
          console.log(`  ⚠️ Producto no encontrado: ${itemTraslado.productoNombre} (${itemTraslado.productoId})`);
        }
      }
      
      // Marcar fecha de completado
      trasladoActualizado.fechaCompletado = new Date().toISOString();
      
      console.log(`✅ Inventario actualizado para traslado ${id}`);
    }
    
    await kv.set(`traslado:${id}`, trasladoActualizado);
    
    console.log(`✅ Traslado actualizado: ${id}`);
    
    return c.json({ 
      success: true, 
      traslado: { id, ...trasladoActualizado }
    });
  } catch (error) {
    console.error("❌ Error actualizando traslado:", error);
    return c.json({ error: "Error actualizando traslado" }, 500);
  }
});

// DELETE: Eliminar traslado
app.delete("/traslados/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    // Verificar que el traslado exists
    const traslado = await kv.get(`traslado:${id}`);
    
    if (!traslado) {
      return c.json({ error: "Traslado no encontrado" }, 404);
    }
    
    await kv.del(`traslado:${id}`);
    
    console.log(`✅ Traslado eliminado: ${id}`);
    
    return c.json({ 
      success: true, 
      message: "Traslado eliminado exitosamente"
    });
  } catch (error) {
    console.error("❌ Error eliminando traslado:", error);
    return c.json({ error: "Error eliminando traslado" }, 500);
  }
});

// POST: Recalcular precios de traslados (útil para traslados antiguos con precioUnitario en 0)
app.post("/traslados/recalcular-precios", async (c) => {
  try {
    console.log("🔄 Iniciando recálculo de precios de traslados...");
    
    // Obtener todos los traslados
    const traslados = await kv.getByPrefix("traslado:");
    console.log(`📦 Encontrados ${traslados.length} traslados`);
    
    // Obtener todos los productos
    const productos = await kv.getByPrefix("producto:");
    console.log(`📦 Encontrados ${productos.length} productos`);
    
    // Crear un mapa de productos por código de barras para búsqueda rápida
    const productosMap = new Map();
    productos.forEach((prod: any) => {
      if (prod.codigoBarras) {
        productosMap.set(prod.codigoBarras, prod);
      }
      if (prod.id) {
        productosMap.set(prod.id, prod);
      }
    });
    
    let trasladosActualizados = 0;
    let trasladosSinCambios = 0;
    const errores = [];
    
    for (const traslado of traslados) {
      try {
        let necesitaActualizacion = false;
        const productosActualizados = [];
        
        // Verificar si tiene productos con precioUnitario en 0
        if (Array.isArray(traslado.productos)) {
          for (const item of traslado.productos) {
            const precioActual = parseFloat(item.precioUnitario || 0);
            
            if (precioActual === 0) {
              // Buscar el producto por ID o código de barras
              const producto = productosMap.get(item.productoId) || productosMap.get(item.codigoBarras);
              
              if (producto) {
                const precioNuevo = parseFloat(producto.costo || producto.precioVenta || 0);
                
                if (precioNuevo > 0) {
                  productosActualizados.push({
                    ...item,
                    precioUnitario: precioNuevo
                  });
                  necesitaActualizacion = true;
                  console.log(`  ✏️ Producto ${item.productoNombre}: $0.00 → $${precioNuevo.toFixed(2)}`);
                } else {
                  productosActualizados.push(item);
                }
              } else {
                productosActualizados.push(item);
                console.log(`  ⚠️ Producto no encontrado: ${item.productoNombre} (${item.productoId})`);
              }
            } else {
              productosActualizados.push(item);
            }
          }
          
          if (necesitaActualizacion) {
            // Recalcular el total
            const nuevoTotal = productosActualizados.reduce((sum: number, item: any) => {
              const cantidad = parseFloat(item.cantidad || 0);
              const precioUnitario = parseFloat(item.precioUnitario || 0);
              return sum + (cantidad * precioUnitario);
            }, 0);
            
            // Actualizar el traslado
            await kv.set(traslado.id, {
              ...traslado,
              productos: productosActualizados,
              total: nuevoTotal,
              preciosRecalculados: true,
              fechaRecalculo: new Date().toISOString()
            });
            
            trasladosActualizados++;
            console.log(`✅ Traslado ${traslado.id}: Nuevo total $${nuevoTotal.toFixed(2)}`);
          } else {
            trasladosSinCambios++;
          }
        } else {
          trasladosSinCambios++;
        }
      } catch (error) {
        console.error(`❌ Error procesando traslado ${traslado.id}:`, error);
        errores.push({ id: traslado.id, error: String(error) });
      }
    }
    
    console.log("🎉 Recálculo completado:");
    console.log(`  ✅ Actualizados: ${trasladosActualizados}`);
    console.log(`  ⏭️ Sin cambios: ${trasladosSinCambios}`);
    console.log(`  ❌ Errores: ${errores.length}`);
    
    return c.json({ 
      success: true,
      message: "Recálculo de precios completado",
      estadisticas: {
        total: traslados.length,
        actualizados: trasladosActualizados,
        sinCambios: trasladosSinCambios,
        errores: errores.length
      },
      errores: errores.length > 0 ? errores : undefined
    });
  } catch (error) {
    console.error("❌ Error en recálculo de precios:", error);
    return c.json({ error: "Error en recálculo de precios" }, 500);
  }
});

// ==================== AI ASSISTANT ====================
app.post("/ai-assistant", async (c) => {
  try {
    const { query, inventory, cart } = await c.req.json();

    // Obtener API key de Claude desde variables de entorno
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return c.json({
        success: false,
        error: "API key de Claude no configurada. Contacta al administrador."
      }, 500);
    }

    // Preparar el prompt para Claude
    const systemPrompt = `Eres un asistente farmacéutico experto. Tu tarea es ayudar a los farmacéuticos a encontrar productos en el inventario y detectar posibles interacciones medicamentosas.

INVENTARIO DISPONIBLE:
${JSON.stringify(inventory, null, 2)}

${cart && cart.length > 0 ? `PRODUCTOS EN EL CARRITO:
${JSON.stringify(cart, null, 2)}` : ''}

Instrucciones:
1. Analiza la consulta del farmacéutico y sugiere productos del inventario que mejor coincidan
2. Si hay más de un producto en el carrito, analiza posibles interacciones medicamentosas entre ellos
3. Responde SIEMPRE en formato JSON con esta estructura:
{
  "products": [
    {
      "nombre": "nombre del producto",
      "sustancia": "sustancia activa",
      "precio": precio numérico,
      "stock": stock numérico,
      "reason": "breve razón de por qué lo recomiendas"
    }
  ],
  "interactions": [
    {
      "title": "Título de la interacción",
      "description": "Descripción detallada",
      "severity": "baja|media|alta"
    }
  ],
  "explanation": "Explicación general de la recomendación"
}

IMPORTANTE:
- Solo sugiere productos que EXISTAN en el inventario proporcionado
- Solo indica interacciones si hay 2 o más productos en el carrito
- Sé específico y profesional
- Si no encuentras productos relevantes, explícalo en "explanation"`;

    // Llamar a Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `${systemPrompt}\n\nCONSULTA DEL FARMACÉUTICO: ${query}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error de Claude API:", errorData);
      return c.json({
        success: false,
        error: "Error al procesar con IA. Intenta de nuevo."
      }, 500);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Extraer JSON de la respuesta
    let aiResponse;
    try {
      // Intentar parsear directamente
      aiResponse = JSON.parse(content);
    } catch (e) {
      // Si falla, buscar JSON entre bloques de código
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        aiResponse = {
          products: [],
          interactions: [],
          explanation: content,
        };
      }
    }

    return c.json({
      success: true,
      response: aiResponse,
    });
  } catch (error) {
    console.error("Error en AI assistant:", error);
    return c.json({
      success: false,
      error: "Error interno del servidor"
    }, 500);
  }
});

// ==================== REPORTES ENDPOINTS ====================

// Endpoint para Reporte Mensual
app.get("/api/reportes/mensual", async (c) => {
  try {
    const mesParam = c.req.query("mes");
    const añoParam = c.req.query("año");
    const sucursalParam = c.req.query("sucursal");
    const todasSucursales = c.req.query("todas") === "true";

    console.log("📊 Reporte Mensual:", { mes: mesParam, año: añoParam, sucursal: sucursalParam, todas: todasSucursales });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const mes = parseInt(mesParam || "0");
    const año = parseInt(añoParam || new Date().getFullYear().toString());
   // Rango del mes en horario CDMX (UTC-6) expresado en UTC
    // Día 1 a las 00:00 CDMX = día 1 a las 06:00 UTC
    const primerDia = new Date(Date.UTC(año, mes, 1, 6, 0, 0, 0));
    // Último instante del mes en CDMX = día 1 del mes siguiente a las 05:59:59.999 UTC
    const ultimoDia = new Date(Date.UTC(año, mes + 1, 1, 5, 59, 59, 999));

    // Consultar ventas
    let queryVentas = supabaseAdmin
      .from("kv_store_7d799f19")
      .select("value")
      .like("key", "venta:%");

    const { data: ventasData } = await queryVentas;
    let ventas = ventasData?.map(d => d.value) || [];

    // Filtrar por fecha y sucursal
    ventas = ventas.filter((v: any) => {
      const fechaVenta = new Date(v.fecha);
      const enRango = fechaVenta >= primerDia && fechaVenta <= ultimoDia;
      const enSucursal = todasSucursales || !sucursalParam || v.sucursalId === sucursalParam;
      return enRango && enSucursal;
    });

    // Consultar servicios médicos
    let queryServicios = supabaseAdmin
      .from("kv_store_7d799f19")
      .select("value")
      .like("key", "servicio_medico:%");

    const { data: serviciosData } = await queryServicios;
    let servicios = serviciosData?.map(d => d.value) || [];

    servicios = servicios.filter((s: any) => {
      const fechaServicio = new Date(s.fecha);
      const enRango = fechaServicio >= primerDia && fechaServicio <= ultimoDia;
      const enSucursal = todasSucursales || !sucursalParam || s.sucursalId === sucursalParam;
      return enRango && enSucursal;
    });

    // Consultar compras
    let queryCompras = supabaseAdmin
      .from("kv_store_7d799f19")
      .select("value")
      .like("key", "compra:%");

    const { data: comprasData } = await queryCompras;
    let compras = comprasData?.map(d => d.value) || [];

    compras = compras.filter((c: any) => {
      const fechaCompra = new Date(c.fecha);
      const enRango = fechaCompra >= primerDia && fechaCompra <= ultimoDia;
      const enSucursal = todasSucursales || !sucursalParam || c.sucursalId === sucursalParam;
      return enRango && enSucursal;
    });

    // Consultar gastos
    let queryGastos = supabaseAdmin
      .from("kv_store_7d799f19")
      .select("value")
      .like("key", "gasto:%");

    const { data: gastosData } = await queryGastos;
    let gastos = gastosData?.map(d => d.value) || [];

    gastos = gastos.filter((g: any) => {
      const fechaGasto = new Date(g.fecha);
      const enRango = fechaGasto >= primerDia && fechaGasto <= ultimoDia;
      const enSucursal = todasSucursales || !sucursalParam || g.sucursalId === sucursalParam;
      return enRango && enSucursal;
    });

    // Consultar productos para alertas
    const { data: productosData } = await supabaseAdmin
      .from("kv_store_7d799f19")
      .select("key, value")
      .like("key", "producto:%");

    const productos = productosData?.map(d => ({ ...d.value, id: d.key })) || [];

    // Mes anterior para comparativo
    const mesAnterior = mes === 0 ? 11 : mes - 1;
    const añoAnterior = mes === 0 ? año - 1 : año;
    const primerDiaAnterior = new Date(añoAnterior, mesAnterior, 1);
    const ultimoDiaAnterior = new Date(añoAnterior, mesAnterior + 1, 0);

    const ventasMesAnterior = (ventasData?.map((d: any) => d.value) || []).filter((v: any) => {
      const fecha = new Date(v.fecha);
      return fecha >= primerDiaAnterior && fecha <= ultimoDiaAnterior &&
        (todasSucursales || !sucursalParam || v.sucursalId === sucursalParam);
    });

    const serviciosMesAnterior = (serviciosData?.map((d: any) => d.value) || []).filter((s: any) => {
      const fecha = new Date(s.fecha);
      return fecha >= primerDiaAnterior && fecha <= ultimoDiaAnterior &&
        (todasSucursales || !sucursalParam || s.sucursalId === sucursalParam);
    });

    const { data: medicosData } = await supabaseAdmin
      .from("kv_store_7d799f19")
      .select("value")
      .like("key", "medico:%");
    const medicos = medicosData?.map((d: any) => d.value) || [];

    return c.json({
      ventasMes: ventas,
      serviciosMes: servicios,
      comprasMes: compras,
      gastosMes: gastos,
      ventasMesAnterior,
      serviciosMesAnterior,
      productos,
      medicos,
    });
  } catch (error) {
    console.error("❌ Error en reporte mensual:", error);
    return c.json({ error: "Error obteniendo reporte mensual" }, 500);
  }
});

// Endpoint para Reporte de Productos Top
app.get("/api/reportes/productos-top", async (c) => {
  try {
    const fechaInicio = c.req.query("fechaInicio");
    const fechaFin = c.req.query("fechaFin");
    const sucursalParam = c.req.query("sucursal");
    const todasSucursales = c.req.query("todas") === "true";

    console.log("📊 Reporte Productos Top:", { fechaInicio, fechaFin, sucursal: sucursalParam });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Consultar ventas
    const { data: ventasData } = await supabaseAdmin
      .from("kv_store_7d799f19")
      .select("value")
      .like("key", "venta:%");

    let ventas = ventasData?.map(d => d.value) || [];

    // Filtrar por fecha y sucursal
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      ventas = ventas.filter((v: any) => {
        const fechaVenta = new Date(v.fecha);
        const enRango = fechaVenta >= inicio && fechaVenta <= fin;
        const enSucursal = todasSucursales || !sucursalParam || v.sucursalId === sucursalParam;
        return enRango && enSucursal;
      });
    }

    // Consultar compras
    const { data: comprasData } = await supabaseAdmin
      .from("kv_store_7d799f19")
      .select("value")
      .like("key", "compra:%");

    let compras = comprasData?.map(d => d.value) || [];

    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      compras = compras.filter((c: any) => {
        const fechaCompra = new Date(c.fecha);
        const enRango = fechaCompra >= inicio && fechaCompra <= fin;
        const enSucursal = todasSucursales || !sucursalParam || c.sucursalId === sucursalParam;
        return enRango && enSucursal;
      });
    }

    // Consultar productos
    const { data: productosData } = await supabaseAdmin
      .from("kv_store_7d799f19")
      .select("key, value")
      .like("key", "producto:%");

    const productos = productosData?.map(d => ({ ...d.value, id: d.key })) || [];

    return c.json({
      ventas,
      compras,
      productos,
    });
  } catch (error) {
    console.error("❌ Error en reporte productos top:", error);
    return c.json({ error: "Error obteniendo reporte de productos" }, 500);
  }
});

// Endpoint para Reporte de Caducidades
app.get("/api/reportes/caducidades", async (c) => {
  try {
    const sucursalParam = c.req.query("sucursal");
    const todasSucursales = c.req.query("todas") === "true";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: comprasData } = await supabaseAdmin
      .from("kv_store_7d799f19")
      .select("key, value")
      .like("key", "compra:%");

    const { data: productosData } = await supabaseAdmin
      .from("kv_store_7d799f19")
      .select("key, value")
      .like("key", "producto:%");

    const compras = comprasData?.map((d: any) => d.value) || [];
    const productos = productosData?.map((d: any) => d.value) || [];

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const parsearFecha = (valor: any): Date | null => {
      if (!valor || valor === "") return null;
      const str = String(valor).trim();
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
        const [d, m, a] = str.split("/");
        return new Date(`${a}-${m.padStart(2,"0")}-${d.padStart(2,"0")}T00:00:00`);
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return new Date(str + "T00:00:00");
      }
      const num = Number(str);
      if (!isNaN(num) && num > 1000 && num < 100000) {
        return new Date((num - 25569) * 86400 * 1000);
      }
      return null;
    };

    const productosConCaducidad: any[] = [];

    compras.forEach((compra: any) => {
      if (compra.estatus === "eliminado" || compra.estatus === "devuelto") return;
      if (!todasSucursales && sucursalParam && compra.sucursalId !== sucursalParam) return;

      const fechaVencDate = parsearFecha(compra.fechaVencimiento);
      if (!fechaVencDate) return;

      const diasRestantes = Math.floor(
        (fechaVencDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Buscar producto en catálogo para obtener código y categoría
      const productoCatalogo = productos.find((p: any) =>
        p.codigoBarras === compra.productoId ||
        p.nombre === compra.nombreProducto
      );

      productosConCaducidad.push({
        nombre: compra.nombreProducto || "Sin nombre",
        codigoBarras: compra.productoId || productoCatalogo?.codigoBarras || "",
        categoria: productoCatalogo?.categoria || "Sin categoría",
        sucursalId: compra.sucursalId,
        cantidad: compra.cantidad || 0,
        stockTotal: compra.cantidad || 0,
        fechaVencimiento: fechaVencDate.toISOString().split("T")[0],
        diasRestantes,
        precioCompra: compra.precioCompra || 0,
        estatus: compra.estatus,
        esMasiva: compra.esMasiva || false,
      });
    });

    productosConCaducidad.sort((a, b) => a.diasRestantes - b.diasRestantes);

    return c.json({ productos: productosConCaducidad });
  } catch (error) {
    console.error("❌ Error en reporte caducidades:", error);
    return c.json({ error: "Error obteniendo reporte de caducidades" }, 500);
  }
});

// Endpoint para Reporte Comprado vs Vendido
app.get("/api/reportes/comprado-vs-vendido", async (c) => {
  try {
    const fechaInicio = c.req.query("fechaInicio");
    const fechaFin = c.req.query("fechaFin");
    const sucursalParam = c.req.query("sucursal");
    const todasSucursales = c.req.query("todas") === "true";

    console.log("📊 Reporte Comprado vs Vendido:", { fechaInicio, fechaFin, sucursal: sucursalParam });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Consultar ventas
    const { data: ventasData } = await supabaseAdmin
      .from("kv_store_7d799f19")
      .select("value")
      .like("key", "venta:%");

    let ventas = ventasData?.map(d => d.value) || [];

    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      ventas = ventas.filter((v: any) => {
        const fechaVenta = new Date(v.fecha);
        const enRango = fechaVenta >= inicio && fechaVenta <= fin;
        const enSucursal = todasSucursales || !sucursalParam || v.sucursalId === sucursalParam;
        return enRango && enSucursal;
      });
    }

    // Consultar compras
    const { data: comprasData } = await supabaseAdmin
      .from("kv_store_7d799f19")
      .select("value")
      .like("key", "compra:%");

    let compras = comprasData?.map(d => d.value) || [];

    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      compras = compras.filter((c: any) => {
        const fechaCompra = new Date(c.fecha);
        const enRango = fechaCompra >= inicio && fechaCompra <= fin;
        const enSucursal = todasSucursales || !sucursalParam || c.sucursalId === sucursalParam;
        return enRango && enSucursal;
      });
    }

    // Consultar productos
    const { data: productosData } = await supabaseAdmin
      .from("kv_store_7d799f19")
      .select("key, value")
      .like("key", "producto:%");

    const productos = productosData?.map(d => ({ ...d.value, id: d.key })) || [];

    return c.json({
      ventas,
      compras,
      productos,
    });
  } catch (error) {
    console.error("❌ Error en reporte comprado vs vendido:", error);
    return c.json({ error: "Error obteniendo reporte" }, 500);
  }
});

// Endpoint para Reporte de Traspasos
app.get("/api/reportes/traspasos", async (c) => {
  try {
    const fechaInicio = c.req.query("fechaInicio");
    const fechaFin = c.req.query("fechaFin");
    const sucursalParam = c.req.query("sucursal");
    const todasSucursales = c.req.query("todas") === "true";

    console.log("📊 Reporte Traspasos:", { fechaInicio, fechaFin, sucursal: sucursalParam });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Consultar traspasos
    const { data: traspasosData } = await supabaseAdmin
      .from("kv_store_7d799f19")
      .select("key, value")
      .like("key", "traslado:%");

    let traspasos = traspasosData?.map(d => ({ ...d.value, id: d.key })) || [];

    // Filtrar por fecha y sucursal
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      traspasos = traspasos.filter((t: any) => {
        const fechaTraspaso = new Date(t.fecha);
        const enRango = fechaTraspaso >= inicio && fechaTraspaso <= fin;
        const enSucursal = todasSucursales || !sucursalParam ||
          t.sucursalOrigen === sucursalParam || t.sucursalDestino === sucursalParam;
        return enRango && enSucursal;
      });
    }

    // Consultar productos para mostrar detalles
    const { data: productosData } = await supabaseAdmin
      .from("kv_store_7d799f19")
      .select("key, value")
      .like("key", "producto:%");

    const productos = productosData?.map(d => ({ ...d.value, id: d.key })) || [];

    return c.json({
      traspasos,
      productos,
    });
  } catch (error) {
    console.error("❌ Error en reporte traspasos:", error);
    return c.json({ error: "Error obteniendo reporte de traspasos" }, 500);
  }
});
// Endpoint para Reporte de Categorias
app.get("/api/reportes/categorias", async (c) => {
  try {
    const fechaInicio = c.req.query("fechaInicio");
    const fechaFin = c.req.query("fechaFin");
    const sucursalId = c.req.query("sucursal");
    const todas = c.req.query("todas") === "true";
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: ventasData } = await supabaseAdmin
      .from("kv_store_7d799f19")
      .select("value")
      .like("key", "venta:%");
    const { data: productosData } = await supabaseAdmin
      .from("kv_store_7d799f19")
      .select("key, value")
      .like("key", "producto:%");
    let ventas = ventasData?.map((d: any) => d.value) || [];
    const productos = productosData?.map((d: any) => ({ ...d.value, id: d.key })) || [];
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      ventas = ventas.filter((v: any) => {
        const fecha = new Date(v.fecha);
        const enRango = fecha >= inicio && fecha <= fin;
        const enSucursal = todas || !sucursalId || v.sucursalId === sucursalId;
        return enRango && enSucursal && v.estado !== "devuelto";
      });
    }
    return c.json({ ventas, productos });
  } catch (error) {
    console.error("Error en reporte categorías:", error);
    return c.json({ error: "Error obteniendo reporte categorías" }, 500);
  }
});

app.get("/lotes", async (c) => {
  try {
    const sucursalId = c.req.query("sucursal");
    const lotes = await kv.getByPrefix("lote:");
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let lotesFiltrados = lotes.filter((l: any) => 
      l.activo && 
      l.cantidadActual > 0 &&
      (!sucursalId || l.sucursalId === sucursalId)
    );

    lotesFiltrados = lotesFiltrados.map((l: any) => {
      if (!l.fechaVencimiento) return { ...l, diasRestantes: 9999 };
      const fechaVenc = new Date(l.fechaVencimiento + "T00:00:00");
      const diasRestantes = Math.floor(
        (fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
      );
      return { ...l, diasRestantes };
    });

    return c.json({ success: true, lotes: lotesFiltrados });
  } catch (error) {
    console.error("Error obteniendo lotes:", error);
    return c.json({ error: "Error obteniendo lotes" }, 500);
  }
});

app.post("/inventario/masivo", async (c) => {
  try {
    const { sucursalId, productos: productosNuevos } = await c.req.json();

    if (!sucursalId || !productosNuevos || !Array.isArray(productosNuevos)) {
      return c.json({ error: "Datos incompletos" }, 400);
    }

    const productosExistentes = await kv.getByPrefix("producto:");
    const creados = [];
    const actualizados = [];
    const errores = [];

    for (const item of productosNuevos) {
      try {
        const { codigoBarras, nombre, sustanciaActiva, concentracion, forma,
                categoria, departamento, lote, caducidad,
                precioCompra, precioVenta, precio2, precio3, precio4, stockInicial,
                stockMinimo, piezasPorCaja } = item;

        if (!codigoBarras || !nombre || !precioVenta) {
          errores.push({ codigoBarras, error: "Faltan campos obligatorios" });
          continue;
        }

        // Buscar si el producto ya existe
        const productoExistente = productosExistentes.find(
          (p: any) => p.codigoBarras === String(codigoBarras).trim()
        );

        if (productoExistente) {
          // Actualizar producto existente
          const stockActual = productoExistente.stockBySucursal || {};
          const stockActualSucursal = stockActual[sucursalId] || 0;
          
          await kv.set(productoExistente.id, {
            ...productoExistente,
            nombre: nombre || productoExistente.nombre,
            sustanciaActiva: sustanciaActiva || productoExistente.sustanciaActiva,
            concentracion: concentracion || productoExistente.concentracion,
            forma: forma || productoExistente.forma,
            categoria: categoria || productoExistente.categoria,
            departamento: departamento || productoExistente.departamento || "",
            lote: lote || productoExistente.lote || "",
            caducidad: caducidad || productoExistente.caducidad || "",
            precioCompra: Number(precioCompra) || productoExistente.precioCompra,
            precioVenta: Number(precioVenta) || productoExistente.precioVenta,
            precio2: precio2 ? Number(precio2) : productoExistente.precio2,
            precio3: precio3 ? Number(precio3) : productoExistente.precio3,
            precio4: precio4 ? Number(precio4) : productoExistente.precio4,
            stockMinimo: Number(stockMinimo) || productoExistente.stockMinimo || 10,
            piezasPorCaja: Number(piezasPorCaja) || productoExistente.piezasPorCaja || 1,
            stockBySucursal: {
              ...stockActual,
              [sucursalId]: stockActualSucursal + Number(stockInicial || 0),
            },
          });
          actualizados.push(nombre);
        } else {
          // Crear producto nuevo
          const nuevoId = `producto:PROD-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
          const stockBySucursal: Record<string, number> = {
            principal: 0,
          };
          stockBySucursal[sucursalId] = Number(stockInicial || 0);

          await kv.set(nuevoId, {
            id: nuevoId,
            codigoBarras: String(codigoBarras).trim(),
            nombre: String(nombre).trim(),
            sustanciaActiva: String(sustanciaActiva || "").trim(),
            concentracion: String(concentracion || "").trim(),
            forma: String(forma || "").trim(),
            categoria: String(categoria || "").trim(),
            departamento: String(departamento || "").trim(),
            lote: String(lote || "").trim(),
            caducidad: String(caducidad || "").trim(),
            precioCompra: Number(precioCompra || 0),
            precioVenta: Number(precioVenta),
            precio2: precio2 ? Number(precio2) : undefined,
            precio3: precio3 ? Number(precio3) : undefined,
            precio4: precio4 ? Number(precio4) : undefined,
            stockMinimo: Number(stockMinimo || 10),
            piezasPorCaja: Number(piezasPorCaja || 1),
            stockBySucursal,
            laboratorio: "",
            presentacion: "",
            grupo: "",
            agrupacion: "",
            claveSAT: "",
            fechaCreacion: new Date().toISOString(),
          });
          creados.push(nombre);
        }
      } catch (itemError) {
        errores.push({ item, error: "Error procesando producto" });
      }
    }

    return c.json({
      success: true,
      creados: creados.length,
      actualizados: actualizados.length,
      errores: errores.length > 0 ? errores : undefined,
      mensaje: `${creados.length} productos creados, ${actualizados.length} actualizados`,
    });
  } catch (error) {
    console.error("Error en carga masiva de inventario:", error);
    return c.json({ error: "Error procesando inventario masivo" }, 500);
  }
});

app.get("/api/reportes/ventas", async (c) => {
  try {
    const sucursalId = c.req.query("sucursal");
    const todas = c.req.query("todas") === "true";
    const fechaInicio = c.req.query("fechaInicio");
    const fechaFin = c.req.query("fechaFin");

    const ventas = await kv.getByPrefix("venta:");

    let ventasFiltradas = ventas.filter((v: any) => {
      // Filtrar por sucursal
      if (!todas && sucursalId && v.sucursalId !== sucursalId) return false;
      
      // Filtrar por fecha
      if (fechaInicio && v.fecha) {
        if (new Date(v.fecha) < new Date(fechaInicio)) return false;
      }
      if (fechaFin && v.fecha) {
        if (new Date(v.fecha) > new Date(fechaFin)) return false;
      }
      
      return true;
    });

    // Enriquecer con folio y forma_pago
    ventasFiltradas = ventasFiltradas.map((v: any) => ({
      ...v,
      folio: v.id?.replace("venta:", "").substring(0, 12) || "-",
      forma_pago: v.metodoPago === "efectivo" ? "Efectivo" :
                  v.metodoPago === "tarjeta" ? "Tarjeta" :
                  v.metodoPago === "transferencia" ? "Transferencia" :
                  v.metodoPago === "dividido" ? "Pago Dividido" : "Efectivo",
      estado: v.estado || "completado",
    }));

    return c.json({ success: true, ventas: ventasFiltradas });
  } catch (error) {
    console.error("Error en reporte ventas:", error);
    return c.json({ error: "Error generando reporte de ventas" }, 500);
  }
});

app.get("/api/reportes/balance-general", async (c) => {
  try {
    const sucursalId = c.req.query("sucursal");
    const todas = c.req.query("todas") === "true";
    const fechaInicio = c.req.query("fechaInicio");
    const fechaFin = c.req.query("fechaFin");

    const filtrarPorFechaYSucursal = (items: any[], fechaField = "fecha") => {
      return items.filter((item: any) => {
        if (!todas && sucursalId && item.sucursalId !== sucursalId) return false;
        if (fechaInicio && item[fechaField]) {
          if (new Date(item[fechaField]) < new Date(fechaInicio)) return false;
        }
        if (fechaFin && item[fechaField]) {
          if (new Date(item[fechaField]) > new Date(fechaFin)) return false;
        }
        return true;
      });
    };

    // Cargar todos los datos en paralelo
    const [ventasRaw, consultasRaw, comprasRaw, gastosRaw] = await Promise.all([
      kv.getByPrefix("venta:"),
      kv.getByPrefix("consulta:"),
      kv.getByPrefix("compra:"),
      kv.getByPrefix("gasto:"),
    ]);

    // Filtrar ventas — excluir devueltas
    const ventas = filtrarPorFechaYSucursal(ventasRaw).filter(
      (v: any) => v.estado !== "devuelto"
    ).map((v: any) => ({
      ...v,
      forma_pago: v.metodoPago === "efectivo" ? "Efectivo" :
                  v.metodoPago === "tarjeta" ? "Tarjeta" :
                  v.metodoPago === "transferencia" ? "Transferencia" :
                  v.metodoPago === "dividido" ? "Pago Dividido" : "Efectivo",
    }));

    const servicios = filtrarPorFechaYSucursal(consultasRaw);
    const compras = filtrarPorFechaYSucursal(comprasRaw, "fechaCreacion");
    const gastos = filtrarPorFechaYSucursal(gastosRaw, "creadoEn");

    return c.json({
      success: true,
      ventas,
      servicios,
      compras,
      gastos,
    });
  } catch (error) {
    console.error("Error en balance general:", error);
    return c.json({ error: "Error generando balance general" }, 500);
  }
});

app.get("/api/reportes/compras", async (c) => {
  try {
    const sucursalId = c.req.query("sucursal");
    const todas = c.req.query("todas") === "true";
    const fechaInicio = c.req.query("fechaInicio");
    const fechaFin = c.req.query("fechaFin");

    const comprasRaw = await kv.getByPrefix("compra:");

    const compras = comprasRaw.filter((c: any) => {
      if (!todas && sucursalId && c.sucursalId !== sucursalId) return false;
      if (fechaInicio && c.fecha) {
        if (new Date(c.fecha) < new Date(fechaInicio)) return false;
      }
      if (fechaFin && c.fecha) {
        if (new Date(c.fecha) > new Date(fechaFin)) return false;
      }
      return true;
    });

    return c.json({ success: true, compras });
  } catch (error) {
    console.error("Error en reporte compras:", error);
    return c.json({ error: "Error generando reporte de compras" }, 500);
  }
});

app.get("/api/reportes/gastos", async (c) => {
  try {
    const sucursalId = c.req.query("sucursal");
    const todas = c.req.query("todas") === "true";
    const fechaInicio = c.req.query("fechaInicio");
    const fechaFin = c.req.query("fechaFin");

    const gastosRaw = await kv.getByPrefix("gasto:");

    const gastos = gastosRaw.filter((g: any) => {
      if (!todas && sucursalId && g.sucursalId !== sucursalId) return false;
      const fecha = g.creadoEn || g.fecha || g.createdAt;
      if (fechaInicio && fecha) {
        if (new Date(fecha) < new Date(fechaInicio)) return false;
      }
      if (fechaFin && fecha) {
        if (new Date(fecha) > new Date(fechaFin)) return false;
      }
      return true;
    });

    return c.json({ success: true, gastos });
  } catch (error) {
    console.error("Error en reporte gastos:", error);
    return c.json({ error: "Error generando reporte de gastos" }, 500);
  }
});

app.get("/api/reportes/proveedores", async (c) => {
  try {
    const sucursalId = c.req.query("sucursal");
    const todas = c.req.query("todas") === "true";

    const [comprasRaw, lotesRaw] = await Promise.all([
      kv.getByPrefix("compra:"),
      kv.getByPrefix("lote:"),
    ]);

    const compras = comprasRaw.filter((c: any) =>
      todas || !sucursalId || c.sucursalId === sucursalId
    );

    const lotes = lotesRaw.filter((l: any) =>
      todas || !sucursalId || l.sucursalId === sucursalId
    );

    // Agrupar por proveedor
    const proveedoresMap: any = {};

    compras.forEach((c: any) => {
      const proveedor = c.proveedor || "Sin proveedor";
      if (!proveedoresMap[proveedor]) {
        proveedoresMap[proveedor] = {
          nombre: proveedor,
          totalCompras: 0,
          cantidadOrdenes: 0,
          productos: {},
          ultimaCompra: null,
        };
      }
      proveedoresMap[proveedor].totalCompras += c.total || 0;
      proveedoresMap[proveedor].cantidadOrdenes++;

      const fechaCompra = c.fecha || c.fechaCreacion;
      if (!proveedoresMap[proveedor].ultimaCompra || 
          new Date(fechaCompra) > new Date(proveedoresMap[proveedor].ultimaCompra)) {
        proveedoresMap[proveedor].ultimaCompra = fechaCompra;
      }

      const nombreProducto = c.nombreProducto || "Sin nombre";
      if (!proveedoresMap[proveedor].productos[nombreProducto]) {
        proveedoresMap[proveedor].productos[nombreProducto] = {
          nombre: nombreProducto,
          cantidad: 0,
          totalGastado: 0,
          precioUnitario: c.precioCompra || 0,
        };
      }
      proveedoresMap[proveedor].productos[nombreProducto].cantidad += c.cantidad || 0;
      proveedoresMap[proveedor].productos[nombreProducto].totalGastado += c.total || 0;
    });

    const proveedores = Object.values(proveedoresMap).sort((a: any, b: any) =>
      b.totalCompras - a.totalCompras
    );

    return c.json({ success: true, proveedores, compras });
  } catch (error) {
    console.error("Error en reporte proveedores:", error);
    return c.json({ error: "Error generando reporte de proveedores" }, 500);
  }
});

app.get("/api/reportes/personal", async (c) => {
  try {
    const sucursalId = c.req.query("sucursal");
    const todas = c.req.query("todas") === "true";
    const fechaInicio = c.req.query("fechaInicio");
    const fechaFin = c.req.query("fechaFin");

    const [usuarios, ventasRaw, consultasRaw, recetasRaw, productosRaw] = await Promise.all([
  kv.getByPrefix("user:"),
  kv.getByPrefix("venta:"),
  kv.getByPrefix("consulta:"),
  kv.getByPrefix("receta:"),
  kv.getByPrefix("producto:"),
]);

// Mapa de precios por código de barras
const preciosPorCodigo: Record<string, number> = {};
productosRaw.forEach((p: any) => {
  if (p.codigoBarras) {
    preciosPorCodigo[p.codigoBarras] = parseFloat(p.precioVenta) || parseFloat(p.precio) || 0;
  }
});

    const filtrar = (items: any[], campo = "fecha") =>
      items.filter((item: any) => {
        if (!todas && sucursalId && item.sucursalId !== sucursalId) return false;
        if (fechaInicio && item[campo] && new Date(item[campo]) < new Date(fechaInicio)) return false;
        if (fechaFin && item[campo] && new Date(item[campo]) > new Date(fechaFin)) return false;
        return true;
      });

    const ventas = filtrar(ventasRaw).filter((v: any) => v.estado !== "devuelto");
    const devoluciones = filtrar(ventasRaw).filter((v: any) => v.estado === "devuelto");
    const consultas = filtrar(consultasRaw);
    const recetas = filtrar(recetasRaw);

    const personalMap: any = {};

    usuarios.forEach((u: any) => {
      const { password, ...userSafe } = u;
      personalMap[u.id] = {
        ...userSafe,
        ventasCount: 0,
        ventasTotal: 0,
        ventasDetalle: [],
        consultasCount: 0,
        consultasTotal: 0,
        consultasDetalle: [],
        ticketPromedio: 0,
        devolucionesCount: 0,
        devolucionesDetalle: [],
        recetasCount: 0,
        recetasMontoGenerado: 0,
        recetasMontoVendido: 0,
        recetasDetalle: [],
      };
    });

    // Ventas por farmacéutico
    ventas.forEach((v: any) => {
  const userId = v.farmaceuticoId;
  if (personalMap[userId]) {
    personalMap[userId].ventasCount++;
    personalMap[userId].ventasTotal += v.total || 0;
    personalMap[userId].ventasDetalle.push({
      fecha: v.fecha,
      productos: v.productos || [],
      total: v.total || 0,
      metodoPago: v.metodoPago || "efectivo",
      sucursalId: v.sucursalId,
    });
  }
});

    // Devoluciones por farmacéutico
    devoluciones.forEach((v: any) => {
      const userId = v.farmaceuticoId;
      if (personalMap[userId]) {
        personalMap[userId].devolucionesCount++;
        personalMap[userId].devolucionesDetalle.push({
          fecha: v.fechaDevolucion || v.fecha,
          monto: v.total || 0,
          motivo: v.motivoDevolucion || "Sin motivo",
          productos: v.productos || [],
          sucursalId: v.sucursalId,
        });
      }
    });

    // Consultas por médico
    consultas.forEach((c: any) => {
  const userId = c.medicoId;
  if (personalMap[userId]) {
    personalMap[userId].consultasCount++;
    personalMap[userId].consultasTotal += c.monto || 0;
    personalMap[userId].consultasDetalle.push({
      fecha: c.fecha,
      nombrePaciente: c.nombrePaciente || "Sin nombre",
      servicio: c.servicio || "-",
      monto: c.monto || 0,
      estado: c.estado || "pendiente",
    });
  }
});

    // Recetas por médico
    recetas.forEach((r: any) => {
  const userId = r.medicoId;
  if (!personalMap[userId]) return;

  personalMap[userId].recetasCount++;

  // Agregar detalle de receta
  if (!personalMap[userId].recetasDetalle) {
    personalMap[userId].recetasDetalle = [];
  }

  // Calcular monto total de la receta
  const montoReceta = (r.medicamentos || []).reduce((sum: number, med: any) => {
  const precio = med.precio || preciosPorCodigo[med.codigo] || 0;
  return sum + (precio * (med.cantidad || 0));
}, 0);

  personalMap[userId].recetasDetalle.push({
        fecha: r.fecha,
        codigo: r.codigo,
        paciente: r.paciente?.nombre || "Sin nombre",
        medicamentos: (r.medicamentos || []).map((med: any) => ({
          ...med,
          precio: med.precio || preciosPorCodigo[med.codigo] || 0,
        })),
        montoTotal: montoReceta,
      });

      personalMap[userId].recetasMontoGenerado += montoReceta;

      // Monto vendido — ventas que tienen este código de receta
      const ventasDeEstaReceta = ventas.filter((v: any) => 
        v.codigoReceta === r.codigo
      );
      const montoVendido = ventasDeEstaReceta.reduce(
        (sum: number, v: any) => sum + (v.total || 0), 0
      );
      personalMap[userId].recetasMontoVendido += montoVendido;

      // Acreditar al farmacéutico que vendió
      ventasDeEstaReceta.forEach((v: any) => {
        const farmId = v.farmaceuticoId;
        if (personalMap[farmId]) {
          if (!personalMap[farmId].ventasPorReceta) {
            personalMap[farmId].ventasPorReceta = 0;
          }
          personalMap[farmId].ventasPorReceta += v.total || 0;
        }
      });
    });  // ← cierre del forEach de recetas

    Object.values(personalMap).forEach((p: any) => {
      p.ticketPromedio = p.ventasCount > 0 ? p.ventasTotal / p.ventasCount : 0;
    });

    const personal = Object.values(personalMap).filter((p: any) =>
      p.ventasCount > 0 || p.consultasCount > 0 || p.devolucionesCount > 0 || p.recetasCount > 0
    );

    return c.json({ success: true, personal });
  } catch (error) {
    console.error("Error en reporte personal:", error);
    return c.json({ error: "Error generando reporte de personal" }, 500);
  }
});
// ==================== HISTORIAS CLINICAS ====================

app.get("/contador-historia-clinica", async (c) => {
  try {
    const contador = await kv.get("contador:historia-clinica");
    return c.json({ success: true, contador: contador || 0 });
  } catch (error) {
    return c.json({ error: "Error obteniendo contador" }, 500);
  }
});

app.get("/historias-clinicas", async (c) => {
  try {
    const historias = await kv.getByPrefix("historia-clinica:");
    const ordenadas = historias.sort((a: any, b: any) =>
      (b.numeroInt || 0) - (a.numeroInt || 0)
    );
    return c.json({ success: true, historias: ordenadas });
  } catch (error) {
    return c.json({ error: "Error obteniendo historias clinicas" }, 500);
  }
});

app.post("/historias-clinicas", async (c) => {
  try {
    const payload = await c.req.json();
    const numero = payload.numeroInt || 1;
    await kv.set("contador:historia-clinica", numero);
    const id = `historia-clinica:${generateCode("HC")}`;
    await kv.set(id, { ...payload, id });
    return c.json({ success: true, id });
  } catch (error) {
    return c.json({ error: "Error creando historia clinica" }, 500);
  }
});

app.put("/historias-clinicas/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(id);
    if (!existing) return c.json({ error: "Historia clinica no encontrada" }, 404);
    await kv.set(id, { ...existing, ...updates, id });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Error actualizando historia clinica" }, 500);
  }
});

Deno.serve(app.fetch);
