-- =============================================
-- MÓDULO DE FACTURACIÓN CFDI 4.0 - LYMPOS
-- =============================================

-- Habilitar extensión para UUID si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLA: configuracion_fiscal
-- Almacena la configuración fiscal del emisor y credenciales del PAC
-- =============================================
CREATE TABLE IF NOT EXISTS configuracion_fiscal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfc_emisor TEXT NOT NULL,
    razon_social TEXT NOT NULL,
    regimen_fiscal TEXT NOT NULL,
    codigo_postal_fiscal TEXT NOT NULL,
    csd_certificado TEXT, -- Archivo .cer en base64
    csd_llave TEXT, -- Archivo .key en base64
    csd_password TEXT, -- Contraseña del CSD (se debe encriptar en la app)
    pac_proveedor TEXT CHECK (pac_proveedor IN ('facturama', 'sw_sapien', 'finkok')),
    pac_usuario TEXT,
    pac_password TEXT, -- Contraseña API del PAC (se debe encriptar en la app)
    pac_modo TEXT DEFAULT 'sandbox' CHECK (pac_modo IN ('sandbox', 'produccion')),
    serie_factura TEXT DEFAULT 'A',
    folio_actual INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda rápida por RFC emisor
CREATE INDEX IF NOT EXISTS idx_configuracion_fiscal_rfc ON configuracion_fiscal(rfc_emisor);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_configuracion_fiscal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_configuracion_fiscal_updated_at
    BEFORE UPDATE ON configuracion_fiscal
    FOR EACH ROW
    EXECUTE FUNCTION update_configuracion_fiscal_updated_at();

-- =============================================
-- TABLA: clientes_fiscales
-- Almacena información fiscal de los clientes receptores
-- =============================================
CREATE TABLE IF NOT EXISTS clientes_fiscales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfc TEXT NOT NULL UNIQUE,
    nombre_razon_social TEXT NOT NULL,
    regimen_fiscal TEXT NOT NULL, -- Requerido en CFDI 4.0
    codigo_postal TEXT NOT NULL, -- Requerido en CFDI 4.0
    email TEXT,
    telefono TEXT,
    uso_cfdi_default TEXT DEFAULT 'G03', -- G03 = Gastos en general
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Validación básica de RFC
    CONSTRAINT valid_rfc CHECK (LENGTH(rfc) >= 12 AND LENGTH(rfc) <= 13)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_clientes_fiscales_rfc ON clientes_fiscales(rfc);
CREATE INDEX IF NOT EXISTS idx_clientes_fiscales_email ON clientes_fiscales(email);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_clientes_fiscales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_clientes_fiscales_updated_at
    BEFORE UPDATE ON clientes_fiscales
    FOR EACH ROW
    EXECUTE FUNCTION update_clientes_fiscales_updated_at();

-- =============================================
-- TABLA: cfdi_emitidos
-- Almacena los CFDIs timbrados y su información principal
-- =============================================
CREATE TABLE IF NOT EXISTS cfdi_emitidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uuid_sat TEXT UNIQUE, -- UUID asignado por el SAT al timbrar
    serie TEXT NOT NULL,
    folio INTEGER NOT NULL,
    fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rfc_emisor TEXT NOT NULL,
    rfc_receptor TEXT NOT NULL,
    nombre_receptor TEXT NOT NULL,
    uso_cfdi TEXT NOT NULL, -- Catálogo SAT: G01, G03, D01, etc.
    regimen_fiscal_receptor TEXT NOT NULL,
    codigo_postal_receptor TEXT NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    descuento DECIMAL(12, 2) DEFAULT 0,
    iva DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('PUE', 'PPD')), -- PUE = Pago en Una Exhibición, PPD = Pago en Parcialidades o Diferido
    forma_pago TEXT NOT NULL, -- 01=Efectivo, 03=Transferencia, 04=Tarjeta, 28=Tarjeta débito, 29=Tarjeta crédito
    tipo_comprobante TEXT NOT NULL CHECK (tipo_comprobante IN ('I', 'E', 'P')), -- I=Ingreso, E=Egreso (nota crédito), P=Pago
    estado TEXT DEFAULT 'timbrado' CHECK (estado IN ('timbrado', 'cancelado', 'error')),
    xml_timbrado TEXT, -- XML completo del CFDI timbrado
    pdf_url TEXT, -- URL del PDF en Supabase Storage
    xml_url TEXT, -- URL del XML en Supabase Storage
    venta_id UUID, -- Relación con la venta original (puede ser NULL)
    motivo_cancelacion TEXT,
    cfdi_relacionado TEXT, -- UUID del CFDI relacionado (para notas de crédito)
    sucursal_id TEXT NOT NULL,
    created_by TEXT NOT NULL, -- Usuario que generó la factura
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Restricciones
    CONSTRAINT unique_serie_folio UNIQUE (serie, folio),
    CONSTRAINT positive_amounts CHECK (subtotal >= 0 AND total >= 0 AND iva >= 0)
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_cfdi_emitidos_uuid_sat ON cfdi_emitidos(uuid_sat);
CREATE INDEX IF NOT EXISTS idx_cfdi_emitidos_rfc_receptor ON cfdi_emitidos(rfc_receptor);
CREATE INDEX IF NOT EXISTS idx_cfdi_emitidos_fecha ON cfdi_emitidos(fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_cfdi_emitidos_estado ON cfdi_emitidos(estado);
CREATE INDEX IF NOT EXISTS idx_cfdi_emitidos_sucursal ON cfdi_emitidos(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_cfdi_emitidos_venta ON cfdi_emitidos(venta_id);
CREATE INDEX IF NOT EXISTS idx_cfdi_emitidos_serie_folio ON cfdi_emitidos(serie, folio);

-- =============================================
-- TABLA: cfdi_conceptos
-- Detalle de los conceptos (productos/servicios) de cada CFDI
-- =============================================
CREATE TABLE IF NOT EXISTS cfdi_conceptos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cfdi_id UUID NOT NULL REFERENCES cfdi_emitidos(id) ON DELETE CASCADE,
    clave_prod_serv TEXT NOT NULL, -- Catálogo SAT de productos y servicios (ej: 51101500 para medicamentos)
    clave_unidad TEXT NOT NULL, -- Catálogo SAT de unidades (ej: H87=Pieza, E48=Unidad de servicio)
    cantidad DECIMAL(12, 3) NOT NULL,
    descripcion TEXT NOT NULL,
    valor_unitario DECIMAL(12, 2) NOT NULL,
    importe DECIMAL(12, 2) NOT NULL,
    descuento DECIMAL(12, 2) DEFAULT 0,
    objeto_imp TEXT NOT NULL CHECK (objeto_imp IN ('01', '02', '03')), -- 01=No objeto, 02=Sí objeto, 03=Sí objeto pero no obligado

    -- Restricciones
    CONSTRAINT positive_concepto_amounts CHECK (cantidad > 0 AND valor_unitario >= 0 AND importe >= 0)
);

-- Índices para relaciones
CREATE INDEX IF NOT EXISTS idx_cfdi_conceptos_cfdi_id ON cfdi_conceptos(cfdi_id);

-- =============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE configuracion_fiscal ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_fiscales ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfdi_emitidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfdi_conceptos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS - configuracion_fiscal
-- Solo administradores pueden editar
-- Supervisores, gerentes y admins pueden leer
-- =============================================

-- Política de lectura: supervisor, gerente, administrador
CREATE POLICY "Lectura configuracion_fiscal - roles autorizados"
ON configuracion_fiscal
FOR SELECT
USING (
    auth.uid() IS NOT NULL
    -- En producción, deberías verificar el rol desde una tabla de usuarios
    -- Ejemplo: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('supervisor', 'gerente', 'administrador'))
);

-- Política de inserción: solo administrador
CREATE POLICY "Inserción configuracion_fiscal - solo admin"
ON configuracion_fiscal
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'administrador')
);

-- Política de actualización: solo administrador
CREATE POLICY "Actualización configuracion_fiscal - solo admin"
ON configuracion_fiscal
FOR UPDATE
USING (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'administrador')
);

-- Política de eliminación: solo administrador
CREATE POLICY "Eliminación configuracion_fiscal - solo admin"
ON configuracion_fiscal
FOR DELETE
USING (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'administrador')
);

-- =============================================
-- POLÍTICAS RLS - clientes_fiscales
-- Supervisor, gerente y admin pueden leer y escribir
-- =============================================

-- Política de lectura
CREATE POLICY "Lectura clientes_fiscales - roles autorizados"
ON clientes_fiscales
FOR SELECT
USING (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('supervisor', 'gerente', 'administrador'))
);

-- Política de inserción
CREATE POLICY "Inserción clientes_fiscales - roles autorizados"
ON clientes_fiscales
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('supervisor', 'gerente', 'administrador'))
);

-- Política de actualización
CREATE POLICY "Actualización clientes_fiscales - roles autorizados"
ON clientes_fiscales
FOR UPDATE
USING (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('supervisor', 'gerente', 'administrador'))
);

-- Política de eliminación
CREATE POLICY "Eliminación clientes_fiscales - roles autorizados"
ON clientes_fiscales
FOR DELETE
USING (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('supervisor', 'gerente', 'administrador'))
);

-- =============================================
-- POLÍTICAS RLS - cfdi_emitidos
-- Supervisor, gerente y admin pueden leer y escribir
-- =============================================

-- Política de lectura
CREATE POLICY "Lectura cfdi_emitidos - roles autorizados"
ON cfdi_emitidos
FOR SELECT
USING (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('supervisor', 'gerente', 'administrador'))
);

-- Política de inserción
CREATE POLICY "Inserción cfdi_emitidos - roles autorizados"
ON cfdi_emitidos
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('supervisor', 'gerente', 'administrador'))
);

-- Política de actualización
CREATE POLICY "Actualización cfdi_emitidos - roles autorizados"
ON cfdi_emitidos
FOR UPDATE
USING (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('supervisor', 'gerente', 'administrador'))
);

-- Política de eliminación (generalmente no se eliminan CFDIs, solo se cancelan)
CREATE POLICY "Eliminación cfdi_emitidos - solo admin"
ON cfdi_emitidos
FOR DELETE
USING (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'administrador')
);

-- =============================================
-- POLÍTICAS RLS - cfdi_conceptos
-- Acceso vinculado a cfdi_emitidos
-- =============================================

-- Política de lectura
CREATE POLICY "Lectura cfdi_conceptos - roles autorizados"
ON cfdi_conceptos
FOR SELECT
USING (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('supervisor', 'gerente', 'administrador'))
);

-- Política de inserción
CREATE POLICY "Inserción cfdi_conceptos - roles autorizados"
ON cfdi_conceptos
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('supervisor', 'gerente', 'administrador'))
);

-- Política de actualización
CREATE POLICY "Actualización cfdi_conceptos - roles autorizados"
ON cfdi_conceptos
FOR UPDATE
USING (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('supervisor', 'gerente', 'administrador'))
);

-- Política de eliminación
CREATE POLICY "Eliminación cfdi_conceptos - roles autorizados"
ON cfdi_conceptos
FOR DELETE
USING (
    auth.uid() IS NOT NULL
    -- En producción: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('supervisor', 'gerente', 'administrador'))
);

-- =============================================
-- FUNCIÓN AUXILIAR: Incrementar folio automáticamente
-- =============================================
CREATE OR REPLACE FUNCTION incrementar_folio_cfdi()
RETURNS TRIGGER AS $$
BEGIN
    -- Incrementar el folio_actual en configuracion_fiscal cuando se inserta un nuevo CFDI
    UPDATE configuracion_fiscal
    SET folio_actual = folio_actual + 1
    WHERE serie_factura = NEW.serie;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para incrementar folio automáticamente
CREATE TRIGGER trigger_incrementar_folio_cfdi
    AFTER INSERT ON cfdi_emitidos
    FOR EACH ROW
    EXECUTE FUNCTION incrementar_folio_cfdi();

-- =============================================
-- COMENTARIOS EN LAS TABLAS (Documentación)
-- =============================================
COMMENT ON TABLE configuracion_fiscal IS 'Configuración fiscal del emisor y credenciales del PAC para timbrado de CFDIs';
COMMENT ON TABLE clientes_fiscales IS 'Catálogo de clientes con información fiscal para facturación electrónica';
COMMENT ON TABLE cfdi_emitidos IS 'Registro de todos los CFDIs (facturas electrónicas) emitidos';
COMMENT ON TABLE cfdi_conceptos IS 'Detalle de conceptos (productos/servicios) de cada CFDI emitido';

COMMENT ON COLUMN configuracion_fiscal.csd_certificado IS 'Certificado de Sello Digital (.cer) en formato base64';
COMMENT ON COLUMN configuracion_fiscal.csd_llave IS 'Llave privada del CSD (.key) en formato base64';
COMMENT ON COLUMN configuracion_fiscal.csd_password IS 'Contraseña del CSD - DEBE SER ENCRIPTADA en la aplicación';
COMMENT ON COLUMN configuracion_fiscal.pac_password IS 'Contraseña de la API del PAC - DEBE SER ENCRIPTADA en la aplicación';

COMMENT ON COLUMN clientes_fiscales.uso_cfdi_default IS 'Uso de CFDI por defecto del cliente (catálogo SAT): G01, G02, G03, D01, etc.';
COMMENT ON COLUMN clientes_fiscales.regimen_fiscal IS 'Régimen fiscal del receptor (catálogo SAT), requerido en CFDI 4.0';

COMMENT ON COLUMN cfdi_emitidos.uuid_sat IS 'UUID (Folio Fiscal) asignado por el SAT al timbrar el CFDI';
COMMENT ON COLUMN cfdi_emitidos.metodo_pago IS 'PUE = Pago en Una Exhibición, PPD = Pago en Parcialidades o Diferido';
COMMENT ON COLUMN cfdi_emitidos.forma_pago IS 'Catálogo SAT: 01=Efectivo, 03=Transferencia, 04=Tarjeta, etc.';
COMMENT ON COLUMN cfdi_emitidos.tipo_comprobante IS 'I=Ingreso, E=Egreso (nota de crédito), P=Pago';

COMMENT ON COLUMN cfdi_conceptos.clave_prod_serv IS 'Clave del catálogo SAT de productos y servicios (ej: 51101500 = Medicamentos)';
COMMENT ON COLUMN cfdi_conceptos.clave_unidad IS 'Clave del catálogo SAT de unidades (ej: H87=Pieza, E48=Unidad de servicio)';
COMMENT ON COLUMN cfdi_conceptos.objeto_imp IS '01=No objeto de impuesto, 02=Sí objeto de impuesto, 03=Sí objeto pero no obligado a desglose';

-- =============================================
-- INSERCIÓN DE DATOS DE EJEMPLO (OPCIONAL)
-- Descomentar si deseas datos de prueba
-- =============================================

/*
-- Ejemplo de configuración fiscal (modo sandbox)
INSERT INTO configuracion_fiscal (
    rfc_emisor,
    razon_social,
    regimen_fiscal,
    codigo_postal_fiscal,
    pac_proveedor,
    pac_modo,
    serie_factura,
    folio_actual
) VALUES (
    'AAA010101AAA',
    'FARMACIA LYM SA DE CV',
    '601',
    '01000',
    'facturama',
    'sandbox',
    'A',
    1
);

-- Ejemplo de cliente fiscal
INSERT INTO clientes_fiscales (
    rfc,
    nombre_razon_social,
    regimen_fiscal,
    codigo_postal,
    email,
    uso_cfdi_default
) VALUES (
    'XAXX010101000',
    'PUBLICO EN GENERAL',
    '616',
    '01000',
    'clientes@lympos.com',
    'S01'
);
*/
