export interface User {
  id: string;
  username: string;
  name: string;
  nombre: string;
  email: string;
  role: "farmaceutico" | "medico" | "supervisor" | "gerente" | "admin" | "administrador";
  sucursalId?: string;
}

export interface StaffAssignment {
  id?: string;
  userId: string;
  sucursalId: string;
  date: string; // YYYY-MM-DD
  shift: "Matutino" | "Vespertino" | "Nocturno" | "Mixto";
  notes?: string;
}

export interface Sucursal {
  id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export const SUCURSALES: Sucursal[] = [
  {
    id: "principal",
    nombre: "Principal",
    direccion: "",
    telefono: "",
    email: ""
  },
];

// Sucursales de LYMPOS — SOLO informativas, para registrar el destino de un traslado.
// NO afectan el inventario de las farmacias (son sistemas separados); el stock solo
// se descuenta de Call Center (origen "principal").
export const SUCURSALES_DESTINO_LYMPOS: Sucursal[] = [
  { id: "lympos:carrera", nombre: "LYMPOS - Carrera" },
  { id: "lympos:muzquiz", nombre: "LYMPOS - Muzquiz" },
  { id: "lympos:porvenir", nombre: "LYMPOS - Porvenir" },
  { id: "lympos:zaragoza", nombre: "LYMPOS - Zaragoza" },
  { id: "lympos:lavilla", nombre: "LYMPOS - La Villa" },
  { id: "lympos:sanfelipe", nombre: "LYMPOS - San Felipe" },
];

// Resuelve el nombre de una sucursal por id, buscando tanto en las de Call Center
// como en las de LYMPOS (destino informativo). Devuelve el id si no la encuentra.
export const nombreSucursal = (id?: string): string => {
  if (!id) return "";
  const todas = [...SUCURSALES, ...SUCURSALES_DESTINO_LYMPOS];
  return todas.find((s) => s.id === id)?.nombre || id;
};