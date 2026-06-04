import { useState } from 'react'
import { Crown, Check, Phone, Mail, X, ChevronRight, ArrowLeft } from 'lucide-react'

const ADDONS = [
  {
    id: 'ia_farmaceutico',
    nombre: 'Asistente IA para Farmacéutico',
    emoji: '🤖',
    descripcion: 'El farmacéutico escribe el nombre aproximado de un medicamento y la IA sugiere el producto correcto del inventario, posibles interacciones con otros medicamentos en el carrito, y si el producto requiere receta médica.',
  },
  {
    id: 'reportes_ia',
    nombre: 'Reportes con IA',
    emoji: '📊',
    descripcion: 'El supervisor pregunta en lenguaje natural: "¿Qué productos se vendieron menos este mes?" y la IA analiza los datos de ventas e inventario, respondiendo con un resumen ejecutivo y gráfica automática.',
  },
  {
    id: 'alertas_inventario',
    nombre: 'Alertas Inteligentes de Inventario',
    emoji: '🔔',
    descripcion: 'La IA analiza el histórico de ventas y predice cuándo se agotará cada producto. Envía alertas por WhatsApp o email antes de que el stock baje del mínimo, con sugerencia de cantidad a reordenar.',
  },
  {
    id: 'facturacion_cfdi',
    nombre: 'Facturación CFDI 4.0',
    emoji: '🧾',
    descripcion: 'Generación de facturas electrónicas directamente desde el punto de venta. Cumple con los requisitos del SAT para CFDI 4.0 sin necesidad de software adicional.',
  },
  {
    id: 'integracion_proveedores',
    nombre: 'Integración con Proveedores',
    emoji: '🚚',
    descripcion: 'Conectar directamente con el catálogo de distribuidores. El supervisor genera órdenes de compra desde Call Center y el pedido llega directamente al proveedor. Ahorra tiempo y errores en reorden.',
  },
]

export default function PlanSwitcher() {
  const [showModal, setShowModal] = useState(false)
  const [selectedAddon, setSelectedAddon] = useState<typeof ADDONS[0] | null>(null)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-md"
      >
        <Crown className="w-4 h-4" />
        Plan Premium
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">

            {/* Vista detalle de add-on */}
            {selectedAddon ? (
              <>
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-t-2xl p-6 text-white">
                  <button
                    onClick={() => setSelectedAddon(null)}
                    className="flex items-center gap-1 text-yellow-100 hover:text-white text-sm mb-3 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver al plan
                  </button>
                  <div className="text-4xl mb-2">{selectedAddon.emoji}</div>
                  <h2 className="text-xl font-bold">{selectedAddon.nombre}</h2>
                  <span className="inline-block mt-2 bg-white/20 text-xs px-2 py-1 rounded-full font-semibold">
                    Servicio Adicional
                  </span>
                </div>

                <div className="p-6">
                  <h3 className="font-bold text-gray-800 mb-3">¿Qué incluye?</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">
                    {selectedAddon.descripcion}
                  </p>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold text-yellow-800 mb-3">
                      ¿Te interesa este servicio? Contáctanos:
                    </p>
                    <div className="space-y-2">
                      <a
                        href="tel:+525566149322"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <Phone className="w-4 h-4" />
                        55 6614 9322
                      </a>
                      <a
                        href="mailto:reynabp_10@hotmail.com"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <Mail className="w-4 h-4" />
                        reynabp_10@hotmail.com
                      </a>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedAddon(null)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              /* Vista principal del plan */
              <>
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-t-2xl p-6 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-6 h-6" />
                        <span className="text-xl font-bold">Plan Premium</span>
                      </div>
                      <p className="text-yellow-100 text-sm">Farmacias LYM · Plan activo</p>
                    </div>
                    <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-4 bg-white/20 rounded-xl p-4">
                    <p className="text-sm font-semibold mb-3">✓ Incluido en tu plan:</p>
                    <div className="grid grid-cols-2 gap-1.5 text-xs text-yellow-50">
                      {[
                        'POS completo',
                        'Inventario multi-sucursal',
                        'Módulo médico',
                        'Traslados entre sucursales',
                        'Reportes ejecutivos',
                        'Cortes de caja',
                        'Gestión de personal',
                        'Libro de antibióticos',
                        'Bitácora completa',
                        'Soporte técnico',
                      ].map((f) => (
                        <div key={f} className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 flex-shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-bold text-gray-800 mb-1">Servicios adicionales disponibles</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Potencia tu farmacia con estas funcionalidades extra. Da clic para ver más detalles.
                  </p>

                  <div className="space-y-2 mb-6">
                    {ADDONS.map((addon) => (
                      <button
                        key={addon.id}
                        onClick={() => setSelectedAddon(addon)}
                        className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-yellow-400 hover:bg-yellow-50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{addon.emoji}</span>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-yellow-800">
                            {addon.nombre}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold">
                            Contratar
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-yellow-600" />
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Contacto */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Contacto general:</p>
                    <div className="space-y-2">
                      <a
                        href="tel:+525566149322"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <Phone className="w-4 h-4" />
                        55 6614 9322
                      </a>
                      <a
                        href="mailto:reynabp_10@hotmail.com"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <Mail className="w-4 h-4" />
                        reynabp_10@hotmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}