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