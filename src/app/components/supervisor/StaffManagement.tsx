import { useState, useEffect } from "react";
import { User, SUCURSALES, StaffAssignment } from "../../shared";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { toast } from "sonner";
import {
  Calendar,
  User as UserIcon,
  Clock,
  Save,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle,
  CalendarRange,
  Users,
  Stethoscope,
  FlaskConical,
} from "lucide-react";
import ShiftCalendarPicker, { getDatesInRange } from "./ShiftCalendarPicker";

interface StaffManagementProps {
  currentUser: User;
}

type RoleFilter = "farmaceutico" | "medico";

export default function StaffManagement({ currentUser }: StaffManagementProps) {
  // ── Filtro de tipo de personal ────────────────────────────────────────
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("farmaceutico");

  // ── Fecha / Rango ─────────────────────────────────────────────────────
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  // ── Datos ─────────────────────────────────────────────────────────────
  const [staffList, setStaffList] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Formulario ────────────────────────────────────────────────────────
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedShift, setSelectedShift] = useState("Matutino");

  // ── Tabla asignaciones ────────────────────────────────────────────────
  const [tableDate, setTableDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [tableRoleFilter, setTableRoleFilter] = useState<"todos" | "farmaceutico" | "medico">("todos");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [tableDate]);

  // Resetear personal seleccionado al cambiar tipo
  const handleRoleFilterChange = (role: RoleFilter) => {
    setRoleFilter(role);
    setSelectedStaffId("");
    setSelectedBranchId("");
  };

  const fetchUsers = async () => {
    setLoadingStaff(true);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );
      const { data, error } = await supabase
        .from("perfiles")
        .select("*")
        .in("rol", ["medico", "farmaceutico"])
        .eq("activo", true)
        .order("nombre_completo");
      if (!error) {
        setStaffList((data || []).map((u: any) => ({
          ...u,
          id: u.id,
          name: u.nombre_completo,
          nombre: u.nombre_completo,
          username: u.usuario,
          role: u.rol,
        })));
      }
    } catch (e) {
      console.error("Error fetching users", e);
      toast.error("Error cargando personal");
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/staff-assignments`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        setAssignments(data.assignments || []);
      }
    } catch (e) {
      console.error("Error fetching assignments", e);
    }
  };

  const handleAssign = async () => {
    if (!selectedStaffId || !selectedBranchId) {
      toast.error("Selecciona personal y sucursal");
      return;
    }

    let datesToAssign: string[] = [];
    if (dateMode === "single") {
      if (!selectedDate) {
        toast.error("Selecciona una fecha");
        return;
      }
      datesToAssign = [selectedDate];
    } else {
      if (!rangeStart || !rangeEnd) {
        toast.error("Selecciona el rango de fechas completo");
        return;
      }
      datesToAssign = getDatesInRange(rangeStart, rangeEnd);
      if (datesToAssign.length === 0) {
        toast.error("Rango de fechas inválido");
        return;
      }
    }

    setLoading(true);
    const loadingToast = toast.loading(
      datesToAssign.length === 1
        ? "Asignando turno..."
        : `Asignando ${datesToAssign.length} turnos...`
    );

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const date of datesToAssign) {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/staff-assignments`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: selectedStaffId,
              sucursalId: selectedBranchId,
              date,
              shift: selectedShift,
            }),
          }
        );
        const data = await response.json();
        if (data.success) successCount++;
        else errorCount++;
      }

      toast.dismiss(loadingToast);

      if (successCount > 0 && errorCount === 0) {
        toast.success(
          datesToAssign.length === 1
            ? "Turno asignado correctamente"
            : `${successCount} turno(s) asignados correctamente`
        );
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`${successCount} asignados, ${errorCount} con error`);
      } else {
        toast.error("Error al asignar turnos");
      }

      loadAssignments();
      setSelectedStaffId("");

      if (datesToAssign.length > 0) {
        setTableDate(datesToAssign[0]);
      }
    } catch (e) {
      toast.dismiss(loadingToast);
      console.error("Error assigning shift", e);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta asignación?")) return;

    const loadingToast = toast.loading("Eliminando asignación...");

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/staff-assignments/delete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ assignmentId }),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast.dismiss(loadingToast);
        toast.success("Asignación eliminada");
        loadAssignments();
      } else {
        toast.dismiss(loadingToast);
        toast.error("Error al eliminar asignación");
      }
    } catch (e) {
      toast.dismiss(loadingToast);
      console.error("Error deleting assignment:", e);
      toast.error("Error de conexión");
    }
  };

  // ── Datos derivados ───────────────────────────────────────────────────
  const medicos = staffList.filter((u) => u.role === "medico");
  const farmaceuticos = staffList.filter((u) => u.role === "farmaceutico");
  const currentRoleList = roleFilter === "medico" ? medicos : farmaceuticos;

  // Lista del directorio (filtrada por búsqueda y tab de directorio)
  const directorioFiltered = staffList
    .filter((s) =>
      (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.username || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((s) => {
      if (tableRoleFilter === "todos") return true;
      return s.role === tableRoleFilter;
    });

  const getAssignmentsForDate = (date: string) => {
    const dayAssignments = assignments.filter((a) => a.date === date);
    if (tableRoleFilter === "todos") return dayAssignments;
    return dayAssignments.filter((a) => {
      const staff = staffList.find((s) => s.id === a.userId);
      return staff?.role === tableRoleFilter;
    });
  };

  const rangeDayCount =
    dateMode === "range" && rangeStart && rangeEnd
      ? getDatesInRange(rangeStart, rangeEnd).length
      : 0;

  const roleConfig = {
    farmaceutico: {
      label: "Farmacéutico",
      color: "emerald",
      activeBg: "bg-emerald-600",
      activeText: "text-white",
      inactiveBg: "bg-white",
      inactiveText: "text-emerald-700",
      border: "border-emerald-300",
      hoverBg: "hover:bg-emerald-50",
      badgeBg: "bg-emerald-100",
      badgeText: "text-emerald-800",
      icon: FlaskConical,
      count: farmaceuticos.length,
    },
    medico: {
      label: "Médico",
      color: "indigo",
      activeBg: "bg-indigo-600",
      activeText: "text-white",
      inactiveBg: "bg-white",
      inactiveText: "text-indigo-700",
      border: "border-indigo-300",
      hoverBg: "hover:bg-indigo-50",
      badgeBg: "bg-indigo-100",
      badgeText: "text-indigo-800",
      icon: Stethoscope,
      count: medicos.length,
    },
  };

  const activeRole = roleConfig[roleFilter];
  const ActiveIcon = activeRole.icon;

  return (
    <div className="space-y-6">
      {/* ── Formulario de Asignación ───────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              Gestión de Turnos y Asignaciones
            </h2>
            <p className="text-xs text-gray-500">
              Asigna turnos a médicos y farmacéuticos por fecha o rango
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
          {/* ── Columna 1: Fecha ─────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {dateMode === "single" ? "Fecha de Asignación" : "Rango de Fechas"}
            </label>
            <ShiftCalendarPicker
              mode={dateMode}
              selectedDate={selectedDate}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onModeChange={setDateMode}
              onSingleDateChange={(d) => {
                setSelectedDate(d);
                if (d) setTableDate(d);
              }}
              onRangeChange={(s, e) => {
                setRangeStart(s);
                setRangeEnd(e);
                if (s) setTableDate(s);
              }}
            />
            {dateMode === "range" && rangeDayCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-200">
                <CalendarRange className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  <span className="font-bold">{rangeDayCount} días</span>{" "}
                  seleccionados
                </span>
              </div>
            )}
          </div>

          {/* ── Columna 2: Tipo + Personal ───────────────────────────── */}
          <div className="space-y-2">
            {/* Toggle Tipo de Personal */}
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Tipo de Personal
            </label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              {(["farmaceutico", "medico"] as RoleFilter[]).map((role) => {
                const cfg = roleConfig[role];
                const Icon = cfg.icon;
                const isActive = roleFilter === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleFilterChange(role)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold transition-all
                      ${isActive
                        ? `${cfg.activeBg} ${cfg.activeText} shadow-inner`
                        : `bg-white ${cfg.inactiveText} ${cfg.hoverBg}`
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cfg.label}</span>
                    <span
                      className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold
                        ${isActive
                          ? "bg-white/20 text-white"
                          : `${cfg.badgeBg} ${cfg.badgeText}`
                        }`}
                    >
                      {cfg.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dropdown Personal filtrado por tipo */}
            <div className="relative">
              {loadingStaff ? (
                <div className="w-full p-2 border border-gray-200 rounded-lg text-sm text-gray-400 text-center bg-gray-50">
                  Cargando personal...
                </div>
              ) : currentRoleList.length === 0 ? (
                <div className={`w-full p-2 border rounded-lg text-xs text-center
                  ${roleFilter === "farmaceutico"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                    : "border-indigo-200 bg-indigo-50 text-indigo-600"
                  }`}
                >
                  <ActiveIcon className="w-4 h-4 mx-auto mb-1 opacity-60" />
                  No hay {activeRole.label.toLowerCase()}s registrados
                </div>
              ) : (
                <select
                  value={selectedStaffId}
                  onChange={(e) => {
                    setSelectedStaffId(e.target.value);
                    const u = staffList.find((u) => u.id === e.target.value);
                    if (u?.sucursalId) setSelectedBranchId(u.sucursalId);
                  }}
                  className={`w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors bg-white
                    ${roleFilter === "farmaceutico"
                      ? "border-emerald-300 focus:ring-emerald-400 focus:border-emerald-400"
                      : "border-indigo-300 focus:ring-indigo-400 focus:border-indigo-400"
                    }`}
                >
                  <option value="">
                    — Seleccionar {activeRole.label.toLowerCase()}...
                  </option>
                  {currentRoleList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                      {staff.sucursalId
                        ? ` · ${SUCURSALES.find((s) => s.id === staff.sucursalId)?.nombre || staff.sucursalId}`
                        : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Info del personal seleccionado */}
            {selectedStaffId && (() => {
              const sel = staffList.find((s) => s.id === selectedStaffId);
              if (!sel) return null;
              const cfg = roleConfig[sel.role as RoleFilter];
              const SIcon = cfg.icon;
              return (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${cfg.badgeBg} ${cfg.border}`}>
                  <SIcon className={`w-3.5 h-3.5 ${cfg.badgeText}`} />
                  <span className={`font-semibold ${cfg.badgeText}`}>{sel.name}</span>
                  <span className="text-gray-500 ml-auto">{sel.username}</span>
                </div>
              );
            })()}
          </div>

          {/* ── Columna 3: Sucursal + Turno ─────────────────────────── */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Sucursal y Turno
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm bg-white"
            >
              <option value="">Seleccionar sucursal...</option>
              {SUCURSALES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm bg-white"
            >
              <option value="Matutino">☀️ Matutino</option>
              <option value="Vespertino">🌤️ Vespertino</option>
              <option value="Completo">🌙 Completo</option>
            </select>
          </div>

          {/* ── Columna 4: Botón ─────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleAssign}
              disabled={
                loading ||
                !selectedStaffId ||
                !selectedBranchId ||
                (dateMode === "single" ? !selectedDate : !rangeStart || !rangeEnd)
              }
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors font-semibold text-sm shadow-sm"
            >
              <Save className="w-4 h-4" />
              {loading
                ? "Asignando..."
                : dateMode === "range" && rangeDayCount > 1
                ? `Asignar ${rangeDayCount} Turnos`
                : "Asignar Turno"}
            </button>

            {/* Resumen rápido */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="text-center bg-indigo-50 rounded-lg py-1.5 border border-indigo-100">
                <p className="text-lg font-bold text-indigo-700">{medicos.length}</p>
                <p className="text-[10px] text-indigo-500 font-medium uppercase tracking-wide">Médicos</p>
              </div>
              <div className="text-center bg-emerald-50 rounded-lg py-1.5 border border-emerald-100">
                <p className="text-lg font-bold text-emerald-700">{farmaceuticos.length}</p>
                <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wide">Farm.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabla de Asignaciones ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header tabla */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              Asignaciones del día
            </h3>

            {/* Navegador de fecha */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const d = new Date(tableDate + "T12:00:00");
                  d.setDate(d.getDate() - 1);
                  setTableDate(d.toISOString().split("T")[0]);
                }}
                className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                title="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={tableDate}
                onChange={(e) => setTableDate(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={() => {
                  const d = new Date(tableDate + "T12:00:00");
                  d.setDate(d.getDate() + 1);
                  setTableDate(d.toISOString().split("T")[0]);
                }}
                className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                title="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTableDate(new Date().toISOString().split("T")[0])}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                Hoy
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Filtro de rol para la tabla */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                {(["todos", "farmaceutico", "medico"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTableRoleFilter(r)}
                    className={`px-3 py-1.5 transition-colors capitalize ${
                      tableRoleFilter === r
                        ? "bg-gray-700 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {r === "todos" ? "Todos" : r === "farmaceutico" ? "Farmacéuticos" : "Médicos"}
                  </button>
                ))}
              </div>

              {/* Leyenda */}
              <div className="flex items-center gap-3 text-xs pl-2">
                <span className="flex items-center gap-1 text-gray-500">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Hoy
                </span>
                <span className="flex items-center gap-1 text-gray-500">
                  <Clock className="w-3 h-3 text-blue-500" />
                  Programado
                </span>
                <span className="text-gray-400 font-medium">
                  {getAssignmentsForDate(tableDate).length} registro(s)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-600 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Personal</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Sucursal Asignada</th>
                <th className="px-6 py-3">Turno</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {getAssignmentsForDate(tableDate).length > 0 ? (
                getAssignmentsForDate(tableDate).map((assignment) => {
                  const staff = staffList.find((s) => s.id === assignment.userId);
                  const sucursal = SUCURSALES.find(
                    (s) => s.id === assignment.sucursalId
                  );
                  const today = new Date().toISOString().split("T")[0];
                  const isToday = assignment.date === today;
                  const staffRole = staff?.role as RoleFilter | undefined;
                  const cfg = staffRole ? roleConfig[staffRole] : null;
                  const RIcon = cfg?.icon;

                  return (
                    <tr
                      key={assignment.id}
                      className="bg-white hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          {cfg && RIcon && (
                            <span className={`p-1 rounded-md ${cfg.badgeBg}`}>
                              <RIcon className={`w-3.5 h-3.5 ${cfg.badgeText}`} />
                            </span>
                          )}
                          <span className="font-medium text-gray-900">
                            {staff?.name || assignment.userId}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {cfg ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}
                          >
                            {cfg.label}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                          {sucursal?.nombre || assignment.sucursalId}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {assignment.shift}
                      </td>
                      <td className="px-6 py-3">
                        {isToday ? (
                          <span className="text-green-600 flex items-center gap-1 font-semibold text-xs">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Asignado
                          </span>
                        ) : (
                          <span className="text-blue-500 flex items-center gap-1 text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            Programado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleDeleteAssignment(assignment.id!)}
                          className="text-red-500 hover:text-red-700 flex items-center gap-1 text-xs hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">
                      No hay asignaciones para el {tableDate}
                    </p>
                    <p className="text-xs mt-1">
                      Usa el formulario de arriba para asignar turnos
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Directorio de Personal ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <h3 className="font-bold text-lg text-gray-800">
              Directorio de Personal
            </h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {staffList.length} registrados
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filtro tabs directorio */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
              {(["todos", "farmaceutico", "medico"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTableRoleFilter(r)}
                  className={`px-3 py-1.5 transition-colors ${
                    tableRoleFilter === r
                      ? r === "farmaceutico"
                        ? "bg-emerald-600 text-white"
                        : r === "medico"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-700 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {r === "todos"
                    ? `Todos (${staffList.length})`
                    : r === "farmaceutico"
                    ? `Farmacéuticos (${farmaceuticos.length})`
                    : `Médicos (${medicos.length})`}
                </button>
              ))}
            </div>

            {/* Búsqueda */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar personal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm w-52"
              />
            </div>
          </div>
        </div>

        {directorioFiltered.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium">No se encontró personal</p>
            {searchTerm && (
              <p className="text-xs mt-1">
                Intenta con otro término de búsqueda
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {directorioFiltered.map((staff) => {
              const role = staff.role as RoleFilter;
              const cfg = roleConfig[role];
              const SIcon = cfg?.icon || UserIcon;
              return (
                <div
                  key={staff.id}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all hover:border-gray-300 flex items-start gap-3 group"
                >
                  <div
                    className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
                      role === "medico"
                        ? "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200"
                        : "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200"
                    }`}
                  >
                    <SIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {staff.name}
                      </p>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
                          cfg?.badgeBg
                        } ${cfg?.badgeText}`}
                      >
                        {role === "medico" ? "MED" : "FARM"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Sucursal:{" "}
                      <span className="font-medium text-gray-700">
                        {SUCURSALES.find((s) => s.id === staff.sucursalId)
                          ?.nombre || "Sin asignar"}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {staff.username}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}