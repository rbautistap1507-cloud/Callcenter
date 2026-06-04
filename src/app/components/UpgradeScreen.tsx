import { useState } from 'react';
import { ModuleType, PLAN_CONFIGS, MODULE_NAMES, MODULE_DESCRIPTIONS, getMinimumPlanForModule } from '../config/planConfig';
import { usePlan } from '../hooks/usePlan';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Lock, Zap, TrendingUp, Crown, Check, ArrowRight, Phone, Mail, MapPin, Building2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface UpgradeScreenProps {
  module: ModuleType;
}

export default function UpgradeScreen({ module }: UpgradeScreenProps) {
  const { currentPlan, changePlan } = usePlan();
  const [showContactModal, setShowContactModal] = useState(false);
  const requiredPlan = getMinimumPlanForModule(module);
  const requiredPlanConfig = PLAN_CONFIGS[requiredPlan];
  const currentPlanConfig = PLAN_CONFIGS[currentPlan];

  const planIcons = {
    starter: Zap,
    pro: TrendingUp,
    enterprise: Crown
  };

  const PlanIcon = planIcons[requiredPlan];

  const allPlans = [
    { plan: 'starter' as const, config: PLAN_CONFIGS.starter },
    { plan: 'pro' as const, config: PLAN_CONFIGS.pro },
    { plan: 'enterprise' as const, config: PLAN_CONFIGS.enterprise }
  ];

  const handleUpgrade = (plan: 'starter' | 'pro' | 'enterprise') => {
    changePlan(plan);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-6 shadow-lg">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Módulo Premium
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            El módulo <span className="font-semibold text-indigo-600">{MODULE_NAMES[module]}</span> requiere una actualización de plan
          </p>
        </div>

        {/* Información del módulo */}
        <Card className="mb-12 border-2 border-indigo-200 bg-white/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{MODULE_NAMES[module]}</CardTitle>
                <CardDescription className="text-base">
                  {MODULE_DESCRIPTIONS[module]}
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300">
                <PlanIcon className="w-3 h-3 mr-1" />
                Requiere {requiredPlanConfig.displayName}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Plan actual */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Plan actual:</span> {currentPlanConfig.displayName}
          </p>
        </div>

        {/* Planes disponibles */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {allPlans.map(({ plan, config }) => {
            const Icon = planIcons[plan];
            const isCurrentPlan = plan === currentPlan;
            const isRequired = plan === requiredPlan;
            const canUpgrade = !isCurrentPlan;
            const hasModule = config.modules.includes(module);

            return (
              <Card
                key={plan}
                className={`relative overflow-hidden transition-all duration-300 ${
                  isRequired
                    ? 'border-4 border-indigo-600 shadow-2xl scale-105 bg-gradient-to-br from-white to-indigo-50'
                    : hasModule
                    ? 'border-2 border-green-300 bg-gradient-to-br from-white to-green-50'
                    : 'border border-gray-200 opacity-60'
                }`}
              >
                {isRequired && (
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    Recomendado
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <Icon className={`w-8 h-8 ${
                      plan === 'starter' ? 'text-blue-600' :
                      plan === 'pro' ? 'text-purple-600' :
                      'text-amber-600'
                    }`} />
                    {isCurrentPlan && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">
                        Actual
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl">{config.displayName}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-900">{config.price}</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3 mb-6">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      {config.modules.length} módulos incluidos:
                    </p>
                    {config.modules.slice(0, 5).map((mod) => (
                      <div key={mod} className="flex items-center text-sm">
                        <Check className={`w-4 h-4 mr-2 ${
                          mod === module ? 'text-indigo-600' : 'text-green-600'
                        }`} />
                        <span className={mod === module ? 'font-semibold text-indigo-600' : ''}>
                          {MODULE_NAMES[mod]}
                        </span>
                      </div>
                    ))}
                    {config.modules.length > 5 && (
                      <p className="text-xs text-gray-500 ml-6">
                        + {config.modules.length - 5} módulos más
                      </p>
                    )}
                  </div>

                  {hasModule && canUpgrade && (
                    <Button
                      onClick={() => handleUpgrade(plan)}
                      className={`w-full ${
                        isRequired
                          ? 'bg-indigo-600 hover:bg-indigo-700'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      Actualizar a {config.displayName}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}

                  {isCurrentPlan && (
                    <Button disabled className="w-full" variant="outline">
                      Plan Actual
                    </Button>
                  )}

                  {!hasModule && (
                    <Button disabled className="w-full" variant="ghost">
                      No incluye este módulo
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Información adicional */}
        <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Crown className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">¿Necesitas más información?</h3>
                <p className="text-indigo-100 mb-4">
                  Nuestro equipo puede ayudarte a elegir el plan perfecto para tu farmacia
                </p>
                <Button
                  variant="secondary"
                  className="bg-white text-indigo-600 hover:bg-indigo-50"
                  onClick={() => setShowContactModal(true)}
                >
                  Contactar Ventas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo mode notice */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            🔧 Modo Demo: Los cambios de plan son solo para demostración y se guardan localmente
          </p>
        </div>
      </div>

      {/* Modal de Contacto */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Building2 className="w-6 h-6 text-indigo-600" />
              Contacta con Call Center
            </DialogTitle>
            <DialogDescription>
              Nuestro equipo está listo para ayudarte a actualizar tu plan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Teléfono */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Teléfono</p>
                <a
                  href="tel:+525512345678"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  +52 55 1234 5678
                </a>
                <p className="text-xs text-gray-600 mt-1">Lun - Vie, 9:00 - 18:00</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Email</p>
                <a
                  href="mailto:ventas@lympos.com"
                  className="text-green-600 hover:text-green-700 font-medium break-all"
                >
                  ventas@lympos.com
                </a>
                <p className="text-xs text-gray-600 mt-1">Respuesta en 24 horas</p>
              </div>
            </div>

            {/* Dirección */}
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Oficinas</p>
                <p className="text-sm text-gray-700">
                  Ciudad de México, CDMX
                </p>
                <p className="text-xs text-gray-600 mt-1">Visitas con cita previa</p>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-sm text-indigo-900 font-medium mb-2">
              📋 Información que necesitarás:
            </p>
            <ul className="text-xs text-indigo-800 space-y-1 ml-4">
              <li>• Plan actual: <span className="font-semibold">{currentPlanConfig.displayName}</span></li>
              <li>• Módulo de interés: <span className="font-semibold">{MODULE_NAMES[module]}</span></li>
              <li>• Plan requerido: <span className="font-semibold">{requiredPlanConfig.displayName}</span></li>
            </ul>
          </div>

          <Button
            onClick={() => setShowContactModal(false)}
            className="w-full"
          >
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
