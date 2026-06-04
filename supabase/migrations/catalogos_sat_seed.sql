-- =============================================
-- CATÁLOGOS SAT - DATOS DE REFERENCIA
-- =============================================
-- Este archivo contiene tablas auxiliares con catálogos
-- del SAT frecuentemente utilizados en facturación
-- =============================================

-- =============================================
-- TABLA: cat_uso_cfdi
-- Catálogo de usos de CFDI (los más comunes)
-- =============================================
CREATE TABLE IF NOT EXISTS cat_uso_cfdi (
    clave TEXT PRIMARY KEY,
    descripcion TEXT NOT NULL,
    aplica_persona_fisica BOOLEAN DEFAULT true,
    aplica_persona_moral BOOLEAN DEFAULT true,
    regimen_fiscal TEXT[] -- Array de regímenes compatibles
);

INSERT INTO cat_uso_cfdi (clave, descripcion, aplica_persona_fisica, aplica_persona_moral) VALUES
('G01', 'Adquisición de mercancías', true, true),
('G02', 'Devoluciones, descuentos o bonificaciones', true, true),
('G03', 'Gastos en general', true, true),
('I01', 'Construcciones', true, true),
('I02', 'Mobiliario y equipo de oficina por inversiones', true, true),
('I03', 'Equipo de transporte', true, true),
('I04', 'Equipo de cómputo y accesorios', true, true),
('I05', 'Dados, troqueles, moldes, matrices y herramental', false, true),
('I06', 'Comunicaciones telefónicas', true, true),
('I07', 'Comunicaciones satelitales', true, true),
('I08', 'Otra maquinaria y equipo', true, true),
('D01', 'Honorarios médicos, dentales y gastos hospitalarios', true, false),
('D02', 'Gastos médicos por incapacidad o discapacidad', true, false),
('D03', 'Gastos funerales', true, false),
('D04', 'Donativos', true, false),
('D05', 'Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)', true, false),
('D06', 'Aportaciones voluntarias al SAR', true, false),
('D07', 'Primas por seguros de gastos médicos', true, false),
('D08', 'Gastos de transportación escolar obligatoria', true, false),
('D09', 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones', true, false),
('D10', 'Pagos por servicios educativos (colegiaturas)', true, false),
('S01', 'Sin efectos fiscales', true, true),
('CP01', 'Pagos', true, true),
('CN01', 'Nómina', false, true)
ON CONFLICT (clave) DO NOTHING;

-- =============================================
-- TABLA: cat_forma_pago
-- Catálogo de formas de pago SAT
-- =============================================
CREATE TABLE IF NOT EXISTS cat_forma_pago (
    clave TEXT PRIMARY KEY,
    descripcion TEXT NOT NULL,
    bancarizado BOOLEAN DEFAULT false
);

INSERT INTO cat_forma_pago (clave, descripcion, bancarizado) VALUES
('01', 'Efectivo', false),
('02', 'Cheque nominativo', true),
('03', 'Transferencia electrónica de fondos', true),
('04', 'Tarjeta de crédito', true),
('05', 'Monedero electrónico', true),
('06', 'Dinero electrónico', true),
('08', 'Vales de despensa', false),
('12', 'Dación en pago', false),
('13', 'Pago por subrogación', false),
('14', 'Pago por consignación', false),
('15', 'Condonación', false),
('17', 'Compensación', false),
('23', 'Novación', false),
('24', 'Confusión', false),
('25', 'Remisión de deuda', false),
('26', 'Prescripción o caducidad', false),
('27', 'A satisfacción del acreedor', false),
('28', 'Tarjeta de débito', true),
('29', 'Tarjeta de servicios', true),
('30', 'Aplicación de anticipos', false),
('31', 'Intermediario pagos', true),
('99', 'Por definir', false)
ON CONFLICT (clave) DO NOTHING;

-- =============================================
-- TABLA: cat_regimen_fiscal
-- Catálogo de regímenes fiscales SAT
-- =============================================
CREATE TABLE IF NOT EXISTS cat_regimen_fiscal (
    clave TEXT PRIMARY KEY,
    descripcion TEXT NOT NULL,
    aplica_persona_fisica BOOLEAN DEFAULT true,
    aplica_persona_moral BOOLEAN DEFAULT true
);

INSERT INTO cat_regimen_fiscal (clave, descripcion, aplica_persona_fisica, aplica_persona_moral) VALUES
('601', 'General de Ley Personas Morales', false, true),
('603', 'Personas Morales con Fines no Lucrativos', false, true),
('605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios', true, false),
('606', 'Arrendamiento', true, false),
('607', 'Régimen de Enajenación o Adquisición de Bienes', true, false),
('608', 'Demás ingresos', true, false),
('610', 'Residentes en el Extranjero sin Establecimiento Permanente en México', true, true),
('611', 'Ingresos por Dividendos (socios y accionistas)', true, false),
('612', 'Personas Físicas con Actividades Empresariales y Profesionales', true, false),
('614', 'Ingresos por intereses', true, false),
('615', 'Régimen de los ingresos por obtención de premios', true, false),
('616', 'Sin obligaciones fiscales', true, true),
('620', 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', false, true),
('621', 'Incorporación Fiscal', true, false),
('622', 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', false, true),
('623', 'Opcional para Grupos de Sociedades', false, true),
('624', 'Coordinados', false, true),
('625', 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', true, false),
('626', 'Régimen Simplificado de Confianza', true, true)
ON CONFLICT (clave) DO NOTHING;

-- =============================================
-- TABLA: cat_producto_servicio
-- Catálogo de productos y servicios SAT (versión simplificada)
-- Solo incluye las claves más comunes para farmacias
-- =============================================
CREATE TABLE IF NOT EXISTS cat_producto_servicio (
    clave TEXT PRIMARY KEY,
    descripcion TEXT NOT NULL,
    incluye_iva BOOLEAN DEFAULT true,
    palabras_similares TEXT[] -- Para búsqueda
);

INSERT INTO cat_producto_servicio (clave, descripcion, incluye_iva, palabras_similares) VALUES
('51101500', 'Medicamentos de patente', true, ARRAY['medicamento', 'medicina', 'fármaco', 'droga']),
('51101501', 'Tabletas medicinales', true, ARRAY['tableta', 'pastilla', 'comprimido']),
('51101502', 'Cápsulas medicinales', true, ARRAY['cápsula', 'capsula']),
('51101503', 'Líquidos medicinales', true, ARRAY['jarabe', 'suspensión', 'solución', 'líquido']),
('51101504', 'Medicamentos en polvo', true, ARRAY['polvo', 'sobre']),
('51101505', 'Supositorios', true, ARRAY['supositorio', 'óvulo']),
('51101506', 'Parches medicados', true, ARRAY['parche', 'emplasto']),
('51101507', 'Inyecciones', true, ARRAY['inyección', 'ampolleta', 'ampolla', 'jeringa']),
('51101508', 'Ungüentos y cremas', true, ARRAY['crema', 'pomada', 'ungüento', 'gel']),
('51101509', 'Aerosoles medicinales', true, ARRAY['aerosol', 'spray', 'inhalador']),
('51101510', 'Medicamentos veterinarios', true, ARRAY['veterinario', 'animal', 'mascota']),
('53131600', 'Vendajes y apósitos', true, ARRAY['vendaje', 'venda', 'apósito', 'curita', 'gasa']),
('42142000', 'Algodón', true, ARRAY['algodón', 'algodon']),
('42142100', 'Alcohol', true, ARRAY['alcohol', 'alcoholado']),
('42151600', 'Jeringas', true, ARRAY['jeringa', 'aguja']),
('42151700', 'Material de sutura', true, ARRAY['sutura', 'hilo']),
('42182100', 'Termómetros médicos', true, ARRAY['termómetro', 'termometro']),
('42191500', 'Instrumentos de diagnóstico', true, ARRAY['diagnóstico', 'diagnostico', 'prueba']),
('42281500', 'Oxígeno medicinal', true, ARRAY['oxígeno', 'oxigeno', 'o2']),
('53131700', 'Mascarillas médicas', true, ARRAY['mascarilla', 'cubrebocas', 'tapabocas']),
('53131800', 'Guantes médicos', true, ARRAY['guante', 'guantes']),
('85121800', 'Servicios de consulta médica', true, ARRAY['consulta', 'médico', 'doctor']),
('85101500', 'Servicios de vacunación', true, ARRAY['vacuna', 'vacunación', 'inmunización']),
('01010101', 'No existe en el catálogo', true, ARRAY['genérico', 'otro', 'varios'])
ON CONFLICT (clave) DO NOTHING;

-- =============================================
-- TABLA: cat_unidad
-- Catálogo de unidades de medida SAT (las más comunes)
-- =============================================
CREATE TABLE IF NOT EXISTS cat_unidad (
    clave TEXT PRIMARY KEY,
    descripcion TEXT NOT NULL,
    simbolo TEXT
);

INSERT INTO cat_unidad (clave, descripcion, simbolo) VALUES
('H87', 'Pieza', 'Pza'),
('E48', 'Unidad de servicio', 'US'),
('XBX', 'Caja', 'Cj'),
('XPK', 'Paquete', 'Pq'),
('BX', 'Caja base', 'Cj'),
('KGM', 'Kilogramo', 'kg'),
('GRM', 'Gramo', 'g'),
('MGM', 'Miligramo', 'mg'),
('LTR', 'Litro', 'L'),
('MLT', 'Mililitro', 'mL'),
('MTR', 'Metro', 'm'),
('CMT', 'Centímetro', 'cm'),
('MMT', 'Milímetro', 'mm'),
('HUR', 'Hora', 'h'),
('ACT', 'Actividad', 'Actividad'),
('SET', 'Conjunto', 'Conjunto'),
('EA', 'Elemento', 'Elem')
ON CONFLICT (clave) DO NOTHING;

-- =============================================
-- ÍNDICES para búsquedas rápidas
-- =============================================
CREATE INDEX IF NOT EXISTS idx_cat_producto_servicio_descripcion ON cat_producto_servicio USING gin(to_tsvector('spanish', descripcion));
CREATE INDEX IF NOT EXISTS idx_cat_producto_servicio_palabras ON cat_producto_servicio USING gin(palabras_similares);

-- =============================================
-- FUNCIÓN AUXILIAR: Buscar código de producto
-- =============================================
CREATE OR REPLACE FUNCTION buscar_codigo_producto(termino TEXT)
RETURNS TABLE (
    clave TEXT,
    descripcion TEXT,
    relevancia REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.clave,
        p.descripcion,
        ts_rank(
            to_tsvector('spanish', p.descripcion || ' ' || array_to_string(p.palabras_similares, ' ')),
            plainto_tsquery('spanish', termino)
        ) as relevancia
    FROM cat_producto_servicio p
    WHERE
        to_tsvector('spanish', p.descripcion || ' ' || array_to_string(p.palabras_similares, ' ')) @@
        plainto_tsquery('spanish', termino)
    ORDER BY relevancia DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMENTARIOS
-- =============================================
COMMENT ON TABLE cat_uso_cfdi IS 'Catálogo SAT de usos de CFDI';
COMMENT ON TABLE cat_forma_pago IS 'Catálogo SAT de formas de pago';
COMMENT ON TABLE cat_regimen_fiscal IS 'Catálogo SAT de regímenes fiscales';
COMMENT ON TABLE cat_producto_servicio IS 'Catálogo SAT de productos y servicios (versión simplificada para farmacias)';
COMMENT ON TABLE cat_unidad IS 'Catálogo SAT de unidades de medida';

COMMENT ON FUNCTION buscar_codigo_producto IS 'Busca códigos de producto/servicio SAT por término de búsqueda';

-- =============================================
-- EJEMPLO DE USO
-- =============================================

/*
-- Buscar código de producto para "medicamento"
SELECT * FROM buscar_codigo_producto('medicamento');

-- Buscar código de producto para "consulta médica"
SELECT * FROM buscar_codigo_producto('consulta médica');

-- Obtener todos los usos de CFDI para persona física
SELECT * FROM cat_uso_cfdi WHERE aplica_persona_fisica = true;

-- Obtener formas de pago bancarizadas
SELECT * FROM cat_forma_pago WHERE bancarizado = true;
*/
