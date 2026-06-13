import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2, Save, X, Users, RefreshCw } from "lucide-react";

interface Cliente {
  id: string;
  nombre: string;
  rfc?: string;
  fechaCreacion?: string;
}

export default function GestionClientes() {
  const base = `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19`;
  const headers = {
    Authorization: `Bearer ${publicAnonKey}`,
    "Content-Type": "application/json",
  };

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Formulario (alta / edicion)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [nombre, setNombre] = useState("");
  const [rfc, setRfc] = useState("");

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    setCargando(true);
    try {
      const resp = await fetch(`${base}/clientes`, { headers });
      const data = await resp.json();
      if (data.success) setClientes(data.clientes || []);
      else toast.error(data.error || "Error al cargar clientes");
    } catch (e) {
      toast.error("Error al cargar clientes");
    } finally {
      setCargando(false);
    }
  };

  const abrirNuevo = () => {
    setEditando(null);
    setNombre("");
    setRfc("");
    setModalAbierto(true);
  };

  const abrirEditar = (cli: Cliente) => {
    setEditando(cli);
    setNombre(cli.nombre || "");
    setRfc(cli.rfc || "");
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
    setNombre("");
    setRfc("");
  };

  const guardar = async () => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setGuardando(true);
    try {
      const payload = JSON.stringify({ nombre: nombreLimpio, rfc: rfc.trim() });
      let resp;
      if (editando) {
        resp = await fetch(`${base}/clientes/${encodeURIComponent(editando.id)}`, {
          method: "PUT",
          headers,
          body: payload,
        });
      } else {
        resp = await fetch(`${base}/clientes`, {
          method: "POST",
          headers,
          body: payload,
        });
      }
      const data = await resp.json();
      if (data.success) {
        toast.success(editando ? "Cliente actualizado" : "Cliente agregado");
        cerrarModal();
        cargarClientes();
      } else {
        toast.error(data.error || "Error al guardar");
      }
    } catch (e) {
      toast.error("Error al guardar cliente");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (cli: Cliente) => {
    if (!confirm(`¿Eliminar al cliente "${cli.nombre}"?`)) return;
    try {
      const resp = await fetch(`${base}/clientes/${encodeURIComponent(cli.id)}`, {
        method: "DELETE",
        headers,
      });
      const data = await resp.json();
      if (data.success) {
        toast.success("Cliente eliminado");
        cargarClientes();
      } else {
        toast.error(data.error || "Error al eliminar");
      }
    } catch (e) {
      toast.error("Error al eliminar cliente");
    }
  };

  const filtrados = clientes.filter((c) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (
      String(c.nombre || "").toLowerCase().includes(q) ||
      String(c.rfc || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
            <p className="text-gray-500 text-sm">Catálogo de clientes para ventas y cotizaciones</p>
          </div>
        </div>
        <button
          onClick={abrirNuevo}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      {/* Buscador */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o RFC..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={cargarClientes}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
          title="Actualizar"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {cargando ? (
          <div className="p-8 text-center text-gray-500">Cargando clientes...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {busqueda ? "No se encontraron clientes." : "Aún no hay clientes registrados."}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RFC</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtrados.map((cli) => (
                <tr key={cli.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{cli.nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{cli.rfc || "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => abrirEditar(cli)}
                        className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => eliminar(cli)}
                        className="text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!cargando && filtrados.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">{filtrados.length} cliente(s)</p>
      )}

      {/* Modal alta / edicion */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                {editando ? "Editar Cliente" : "Nuevo Cliente"}
              </h3>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  RFC <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={rfc}
                  onChange={(e) => setRfc(e.target.value.toUpperCase())}
                  placeholder="RFC del cliente"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={cerrarModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
