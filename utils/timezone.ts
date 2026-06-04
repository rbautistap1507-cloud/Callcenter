// utils/timezone.ts
// Helper central de zona horaria para LYMPOS.
// La farmacia opera en CDMX = CST = UTC-6 (sin horario de verano desde 2023).
//
// Las ventas y registros se GUARDAN en UTC (new Date().toISOString()), lo cual es correcto.
// Estas funciones convierten entre el día local (CDMX) que elige el usuario y el rango UTC
// equivalente, para que los filtros de reportes cuadren con la operación real.

const OFFSET_CDMX_HORAS = 6; // UTC-6

/**
 * Convierte una fecha "YYYY-MM-DD" (día local CDMX elegido por el usuario)
 * al instante UTC que corresponde a las 00:00:00 de ese día en CDMX.
 *
 * Ej: "2026-05-29" -> "2026-05-29T06:00:00.000Z"
 * (medianoche del 29 en CDMX = 6 AM del 29 en UTC)
 */
export function inicioDiaCDMX(fechaStr: string): string {
  // Tomar solo la parte de fecha por si viene con hora
  const soloFecha = fechaStr.split("T")[0];
  const [anio, mes, dia] = soloFecha.split("-").map(Number);
  // Medianoche CDMX = 00:00 - (-6) = 06:00 UTC del mismo día
  const utc = new Date(Date.UTC(anio, mes - 1, dia, OFFSET_CDMX_HORAS, 0, 0, 0));
  return utc.toISOString();
}

/**
 * Convierte una fecha "YYYY-MM-DD" (día local CDMX elegido por el usuario)
 * al instante UTC que corresponde a las 23:59:59.999 de ese día en CDMX.
 *
 * Ej: "2026-05-29" -> "2026-05-30T05:59:59.999Z"
 * (las 23:59:59 del 29 en CDMX = 5:59:59 AM del 30 en UTC)
 */
export function finDiaCDMX(fechaStr: string): string {
  const soloFecha = fechaStr.split("T")[0];
  const [anio, mes, dia] = soloFecha.split("-").map(Number);
  // 23:59:59.999 CDMX = (23:59:59.999 + 6h) UTC = 05:59:59.999 del día siguiente
  const utc = new Date(Date.UTC(anio, mes - 1, dia, 23 + OFFSET_CDMX_HORAS, 59, 59, 999));
  return utc.toISOString();
}

/**
 * Devuelve el string "YYYY-MM-DD" del día de HOY en horario CDMX.
 * Útil para inicializar filtros de fecha sin que el offset UTC cambie el día.
 */
export function hoyCDMX(): string {
  const ahora = new Date();
  // Restar 6h para obtener la hora local CDMX, luego tomar la parte de fecha
  const local = new Date(ahora.getTime() - OFFSET_CDMX_HORAS * 60 * 60 * 1000);
  return local.toISOString().split("T")[0];
}

/**
 * Devuelve "YYYY-MM-DD" de hace N días en CDMX (para atajos semana/mes).
 */
export function hoyCDMXMenosDias(dias: number): string {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - OFFSET_CDMX_HORAS * 60 * 60 * 1000);
  local.setDate(local.getDate() - dias);
  return local.toISOString().split("T")[0];
}

/**
 * Devuelve "YYYY-MM-DD" de hace N meses en CDMX.
 */
export function hoyCDMXMenosMeses(meses: number): string {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - OFFSET_CDMX_HORAS * 60 * 60 * 1000);
  local.setMonth(local.getMonth() - meses);
  return local.toISOString().split("T")[0];
}

/**
 * Formatea una fecha UTC (ISO string) para mostrar en pantalla en horario CDMX.
 * Reemplaza a new Date(fecha).toLocaleString() que usa el timezone del navegador.
 */
export function formatearFechaHoraCDMX(fechaUTC: string): string {
  if (!fechaUTC) return "-";
  return new Date(fechaUTC).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatea solo la fecha (sin hora) en CDMX.
 */
export function formatearFechaCDMX(fechaUTC: string): string {
  if (!fechaUTC) return "-";
  // Si es solo fecha (YYYY-MM-DD sin hora), formatear directo sin conversion de zona
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaUTC.trim())) {
    const [a, m, d] = fechaUTC.trim().split("-");
    return `${d}/${m}/${a}`;
  }
  return new Date(fechaUTC).toLocaleDateString("es-MX", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Devuelve la hora (0-23) de una fecha UTC en horario CDMX.
 * Útil para gráficas de "ventas por hora" que deben mostrar la hora local.
 */
export function horaCDMX(fechaUTC: string): number {
  const local = new Date(new Date(fechaUTC).getTime() - OFFSET_CDMX_HORAS * 60 * 60 * 1000);
  return local.getUTCHours();
}
