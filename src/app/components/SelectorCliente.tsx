import { useState, useEffect, useRef } from "react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { toast } from "sonner";
import { Search, Plus, Check, X } from "lucide-react";

interface Cliente {
  id: string;
  nombre: string;
  rfc?: string;
}

interface SelectorClienteProps {
  // Nombre del cliente actualmente seleccionado/escrito
  value: string;
  // Se llama cuando cambia el nombre del cliente (texto)
  onChange: (nombre: string) => void;
  // Opcional: se llama cuando se selecciona/crea un cliente del catálogo (con su RFC)
  onSelectCliente?: (cliente: Cliente | null) => void;
  placeholder?: string;
}

export default function SelectorCliente({
  value,
  onChange,
  onSelectCliente,
  placeholder = "Buscar o escribir cliente...",
}: SelectorClienteProps) {
  const base = `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19`;
  const headers = {
    Authorization: `Bearer ${publicAnonKey}`,
    "Content-Type": "application/json",
  };

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargarClientes();
  }, []);

  // Cerrar el desplegable al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cargarClientes = async () => {
    try {
      const resp = await fetch(`${base}/clientes`, { headers });
      const data = await resp.json();
      if (data.success) setClientes(data.clientes || []);
    } catch (e) {
      // silencioso: el campo sigue funcionando como texto libre
    }
  };

  const q = (value || "").trim().toLowerCase();
  const filtrados = q
    ? clientes.filter(
        (c) =>
          String(c.nombre || "").toLowerCase().includes(q) ||
          String(c.rfc || "").toLowerCase().includes(q)
      )
    : clientes;

  // ¿Existe un cliente con exactamente este nombre?
  const existeExacto = clientes.some(
    (c) => String(c.nombre || "").trim().toLowerCase() === q
  );

  const seleccionar = (cli: Cliente) => {
    onChange(cli.nombre);
    if (onSelectCliente) onSelectCliente(cli);
    setAbierto(false);
  };

  const crearCliente = async () => {
    const nombre = (value || "").trim();
    if (!nombre) {
      toast.error("Escribe un nombre para agregar el cliente");
      return;
    }
    setCreando(true);
    try {
      const resp = await fetch(`${base}/clientes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ nombre, rfc: "" }),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success("Cliente agregado al catálogo");
        setClientes((prev) => [...prev, data.cliente]);
        onChange(data.cliente.nombre);
        if (onSelectCliente) onSelectCliente(data.cliente);
        setAbierto(false);
      } else {
        toast.error(data.error || "Error al agregar cliente");
      }
    } catch (e) {
      toast.error("Error al agregar cliente");
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="relative" ref={contenedorRef}>
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (onSelectCliente) onSelectCliente(null);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              if (onSelectCliente) onSelectCliente(null);
              setAbierto(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Limpiar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {abierto && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtrados.length > 0 ? (
            filtrados.map((cli) => (
              <button
                type="button"
                key={cli.id}
                onClick={() => seleccionar(cli)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between"
              >
                <span className="text-sm text-gray-800">{cli.nombre}</span>
                {cli.rfc ? (
                  <span className="text-xs text-gray-400">{cli.rfc}</span>
                ) : null}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">Sin coincidencias</div>
          )}

          {/* Opción para agregar el cliente escrito si no existe exacto */}
          {value.trim() && !existeExacto && (
            <button
              type="button"
              onClick={crearCliente}
              disabled={creando}
              className="w-full text-left px-3 py-2 border-t border-gray-100 hover:bg-green-50 text-green-700 flex items-center gap-2 disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              {creando ? "Agregando..." : `Agregar "${value.trim()}" como nuevo cliente`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
