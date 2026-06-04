import { useState } from "react";
import { toast } from "sonner";
import { FileCheck, Check, Printer, ArrowLeft, Eye } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { SUCURSALES } from "../shared";

interface CertificadoMedicoFormProps {
  user: User;
  onBack: () => void;
}

export default function CertificadoMedicoForm({ user, onBack }: CertificadoMedicoFormProps) {
  const sucursal = SUCURSALES.find(s => s.id === user.sucursalId);
  const direccionSucursal = sucursal?.direccion || "Dirección no disponible";

  const [certificado, setCertificado] = useState({
    nombrePaciente: "",
    edad: "",
    alergias: "",
    enfermedadesCronicas: "",
    medicamentos: "",
    cirugias: "",
    fracturas: "",
    transfusiones: "",
    hospitalizaciones: "",
    vacunas: "",
    peso: "",
    talla: "",
    ta: "",
    spo2: "",
    fc: "",
    fr: "",
    temperatura: "",
    tipoSanguineo: "",
    exploracionFisica: false,
    pruebasMentales: false,
    clinicamenteSano: false,
  });

  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [certificadoParaImprimir, setCertificadoParaImprimir] = useState<any>(null);

  const handleGenerarCertificado = async () => {
    if (!certificado.nombrePaciente.trim()) {
      toast.error("Ingresa el nombre del paciente");
      return;
    }

    setLoading(true);
    try {
      // Guardar en backend
      const registro = {
        tipo: "certificado",
        paciente: certificado.nombrePaciente,
        medicoId: user.id,
        sucursalId: user.sucursalId,
        detalles: certificado,
        fecha: new Date().toISOString(),
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7d799f19/servicios-medicos`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registro),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Certificado generado correctamente");
        setCertificadoParaImprimir({ ...certificado });
        setShowPreview(true);
      } else {
        toast.error("Error al registrar el certificado");
      }
    } catch (error) {
      console.error("Error guardando certificado:", error);
      toast.error("Error al guardar el certificado");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCertificado = () => {
    window.print();
  };

  const resetFormulario = () => {
    setCertificado({
      nombrePaciente: "",
      edad: "",
      alergias: "",
      enfermedadesCronicas: "",
      medicamentos: "",
      cirugias: "",
      fracturas: "",
      transfusiones: "",
      hospitalizaciones: "",
      vacunas: "",
      peso: "",
      talla: "",
      ta: "",
      spo2: "",
      fc: "",
      fr: "",
      temperatura: "",
      tipoSanguineo: "",
      exploracionFisica: false,
      pruebasMentales: false,
      clinicamenteSano: false,
    });
    setCertificadoParaImprimir(null);
    setShowPreview(false);
  };

  return (
    <>
      {/* Vista de Impresión del Certificado */}
      <div className="print-only">
        {certificadoParaImprimir && (
          <div className="certificado-medico">
            {/* Header con logos */}
            <div className="certificado-header">
              <div className="logo-left">
                <svg width="80" height="80" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="#0d9488" />
                  <text x="50" y="50" textAnchor="middle" dy=".3em" fill="white" fontSize="24" fontWeight="bold">
                    UAC
                  </text>
                </svg>
              </div>
              
              <div className="doctor-info-center">
                <h1>{user.name}</h1>
                <p>Médica Cirujana</p>
                <p>Cédula Profesional: {user.cedula || "1234567"}</p>
                <p>Universidad Autónoma de Coahuila</p>
              </div>

              <div className="logo-right">
                <svg width="80" height="80" viewBox="0 0 100 100">
                  <g transform="translate(50,50)">
                    <line x1="0" y1="-35" x2="0" y2="35" stroke="#0d9488" strokeWidth="4"/>
                    <circle cx="0" cy="-25" r="8" fill="none" stroke="#0d9488" strokeWidth="2.5"/>
                    <path d="M -15,-25 Q -15,-10 0,0 Q 15,-10 15,-25" fill="none" stroke="#0d9488" strokeWidth="2.5"/>
                    <path d="M -10,20 Q 0,30 10,20" fill="none" stroke="#0d9488" strokeWidth="2.5"/>
                  </g>
                </svg>
              </div>
            </div>

            <div className="certificado-destinatario">
              <h2>A QUIEN CORRESPONDA:</h2>
              <p>PRESENTE.</p>
            </div>

            <div className="certificado-body">
              <p className="certificado-intro">
                La que suscribe <strong>Médica Cirujana</strong>, legalmente autorizada para ejercer su profesión, 
                con <strong>Cédula Profesional {user.cedula || "1234567"}</strong>; certifica que, habiendo realizado 
                el Examen Médico Clínico a: <strong>{certificadoParaImprimir.nombrePaciente}</strong> de{" "}
                <strong>{certificadoParaImprimir.edad} años de edad</strong>, quien cuenta con los siguientes 
                antecedentes de importancia:
              </p>

              <p className="antecedentes-texto">
                <strong>Alergias:</strong> {certificadoParaImprimir.alergias || "Ninguna"}, {" "}
                <strong>Enfermedades Crónico Degenerativas:</strong> {certificadoParaImprimir.enfermedadesCronicas || "Ninguna"}, {" "}
                <strong>Medicamentos:</strong> {certificadoParaImprimir.medicamentos || "Ninguno"}, {" "}
                <strong>Cirugías:</strong> {certificadoParaImprimir.cirugias || "Ninguna"}, {" "}
                <strong>Fracturas:</strong> {certificadoParaImprimir.fracturas || "Ninguna"}, {" "}
                <strong>Transfusiones:</strong> {certificadoParaImprimir.transfusiones || "Ninguna"}, {" "}
                <strong>Hospitalizaciones Previas:</strong> {certificadoParaImprimir.hospitalizaciones || "Ninguna"}, {" "}
                <strong>Vacunas:</strong> {certificadoParaImprimir.vacunas || "Esquema completo"}.
              </p>

              <h3 className="section-title">EXPLORACIÓN FÍSICA:</h3>
              
              <div className="signos-vitales">
                <p><strong>SIGNOS VITALES:</strong></p>
                <p>
                  Peso: <strong>{certificadoParaImprimir.peso} Kg</strong>, 
                  Talla: <strong>{certificadoParaImprimir.talla} m</strong>, 
                  TA: <strong>{certificadoParaImprimir.ta} mmHg</strong>, 
                  SPO2: <strong>{certificadoParaImprimir.spo2}%</strong>, 
                  FC: <strong>{certificadoParaImprimir.fc} Lpm</strong>, 
                  FR: <strong>{certificadoParaImprimir.fr} rpm</strong>, 
                  Temp: <strong>{certificadoParaImprimir.temperatura}°C</strong>. 
                  Tipo Sanguíneo: <strong>{certificadoParaImprimir.tipoSanguineo}</strong>
                </p>
              </div>

              {(certificadoParaImprimir.exploracionFisica || certificadoParaImprimir.pruebasMentales) && (
                <div className="exploracion-detallada">
                  <p>
                    Paciente consciente, orientado, cooperador al interrogatorio y exploración física piel y 
                    tegumentos con adecuada coloración e hidratación. normocéfalo, cráneo sin endocitosis o 
                    exostosis, cuello cilíndrico con tráquea móvil central, no se palpan masa en glándula 
                    tiroides, sin adenomegalias cervicales, pulsos carotídeos presentes sin soplos. isocoria 
                    y reflejos pupilares fotomotor, consensual y de acomodación presentes sin alteraciones. 
                    labios simétricos, mucosa oral normohidratada, sin lesiones, orofaringe normocrómica, 
                    Amígdalas sin hipertrofia, paladar y úvula simétricos. Buena agudeza auditiva, pabellones 
                    auriculares simétricos sin lesiones. tórax normolíneo y simétrico, con movimientos de 
                    amplexión y amplexación normales, sin puntos dolorosos a la palpación, a la auscultación 
                    con buena entrada y salida de aire, sin presencia de ruidos agregados, claro pulmonar a 
                    la percusión; ruidos cardiacos regulares y rítmicos, de buen tono e intensidad, sin soplos 
                    o ruidos agregados. Abdomen simétrico, con cicatriz umbilical central, peristalsis normal, 
                    blando, depresible, sin dolor a la palpación, sin datos de irritación peritoneal, sin 
                    visceromegalias palpables. Extremidades íntegras, simétricas, sin edema, color y temperatura 
                    normales, pulsos distales presentes, reflejos osteotendinosos, fuerza Daniels 5/5, 
                    sensibilidad conservada, llenado capilar de 2 segundos.
                  </p>
                </div>
              )}

              {certificadoParaImprimir.clinicamenteSano && (
                <div className="conclusion-section">
                  <p className="conclusion-text">
                    POR MEDIO DE LA PRESENTE, CERTIFICO QUE DESPUÉS DE HABER REALIZADO UN ESTUDIO MINUCIOSO 
                    TANTO FÍSICO COMO MENTAL A: <strong>{certificadoParaImprimir.nombrePaciente.toUpperCase()}</strong>, 
                    ESTE SÍ SE ENCUENTRA <strong>CLÍNICAMENTE SANO</strong> AL MOMENTO DE LA EXPLORACIÓN FÍSICA 
                    Y SÍ SE CONSIDERÓ <strong>APTO</strong> PARA LA REALIZACIÓN DE CUALQUIER TIPO DE ACTIVIDAD 
                    FÍSICA Y/O DEPORTIVA QUE SE LE IMPONGA DE ACUERDO A EDAD Y SEXO, ASÍ MISMO NO SE ENCONTRARON 
                    DATOS DE ENFERMEDADES INFECTOCONTAGIOSAS.
                  </p>
                </div>
              )}

              <div className="firma-section-certificado">
                <p className="fecha-expedicion">
                  Fecha de expedición: {new Date().toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <div className="firma-line-certificado">
                  <p>_________________________________</p>
                  <p><strong>{user.name}</strong></p>
                  <p>Médica Cirujana</p>
                  <p>Cédula Profesional: {user.cedula || "1234567"}</p>
                </div>
              </div>

              <div className="direccion-consultorio">
                <p>Dirección del Consultorio: {direccionSucursal}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vista Normal (No imprimir) */}
      <div className="no-print">
        <div className="bg-white rounded-lg shadow p-6 max-w-5xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al menú
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-green-100">
              <FileCheck className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Certificado Médico Laboral</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Datos del Paciente */}
            <div className="col-span-2">
              <h3 className="font-bold text-lg mb-3 text-gray-700">Datos del Paciente</h3>
            </div>

            <div className="col-span-2">
              <label className="block text-sm mb-2 text-gray-700">Nombre Completo *</label>
              <input
                type="text"
                value={certificado.nombrePaciente}
                onChange={(e) => setCertificado({ ...certificado, nombrePaciente: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Nombre completo del paciente"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Edad *</label>
              <input
                type="text"
                value={certificado.edad}
                onChange={(e) => setCertificado({ ...certificado, edad: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Edad en años"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Tipo Sanguíneo</label>
              <select
                value={certificado.tipoSanguineo}
                onChange={(e) => setCertificado({ ...certificado, tipoSanguineo: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Seleccionar</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            {/* Antecedentes */}
            <div className="col-span-2 mt-4">
              <h3 className="font-bold text-lg mb-3 text-gray-700">Antecedentes de Importancia</h3>
            </div>

            <div className="col-span-2">
              <label className="block text-sm mb-2 text-gray-700">Alergias</label>
              <input
                type="text"
                value={certificado.alergias}
                onChange={(e) => setCertificado({ ...certificado, alergias: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ninguna / Especificar alergias"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm mb-2 text-gray-700">Enfermedades Crónico Degenerativas</label>
              <input
                type="text"
                value={certificado.enfermedadesCronicas}
                onChange={(e) => setCertificado({ ...certificado, enfermedadesCronicas: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ninguna / Especificar enfermedades"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm mb-2 text-gray-700">Medicamentos</label>
              <input
                type="text"
                value={certificado.medicamentos}
                onChange={(e) => setCertificado({ ...certificado, medicamentos: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ninguno / Especificar medicamentos"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Cirugías</label>
              <input
                type="text"
                value={certificado.cirugias}
                onChange={(e) => setCertificado({ ...certificado, cirugias: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ninguna / Especificar"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Fracturas</label>
              <input
                type="text"
                value={certificado.fracturas}
                onChange={(e) => setCertificado({ ...certificado, fracturas: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ninguna / Especificar"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Transfusiones</label>
              <input
                type="text"
                value={certificado.transfusiones}
                onChange={(e) => setCertificado({ ...certificado, transfusiones: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ninguna / Especificar"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Hospitalizaciones Previas</label>
              <input
                type="text"
                value={certificado.hospitalizaciones}
                onChange={(e) => setCertificado({ ...certificado, hospitalizaciones: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ninguna / Especificar"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm mb-2 text-gray-700">Vacunas</label>
              <input
                type="text"
                value={certificado.vacunas}
                onChange={(e) => setCertificado({ ...certificado, vacunas: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Esquema completo / Especificar"
              />
            </div>

            {/* Exploración Física - Signos Vitales */}
            <div className="col-span-2 mt-4">
              <h3 className="font-bold text-lg mb-3 text-gray-700">Exploración Física - Signos Vitales</h3>
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Peso (Kg)</label>
              <input
                type="text"
                value={certificado.peso}
                onChange={(e) => setCertificado({ ...certificado, peso: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: 70"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Talla (m)</label>
              <input
                type="text"
                value={certificado.talla}
                onChange={(e) => setCertificado({ ...certificado, talla: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: 1.70"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">TA (mmHg)</label>
              <input
                type="text"
                value={certificado.ta}
                onChange={(e) => setCertificado({ ...certificado, ta: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: 120/80"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">SPO2 (%)</label>
              <input
                type="text"
                value={certificado.spo2}
                onChange={(e) => setCertificado({ ...certificado, spo2: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: 98"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">FC (Lpm)</label>
              <input
                type="text"
                value={certificado.fc}
                onChange={(e) => setCertificado({ ...certificado, fc: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: 72"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">FR (rpm)</label>
              <input
                type="text"
                value={certificado.fr}
                onChange={(e) => setCertificado({ ...certificado, fr: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: 18"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700">Temperatura (°C)</label>
              <input
                type="text"
                value={certificado.temperatura}
                onChange={(e) => setCertificado({ ...certificado, temperatura: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: 36.5"
              />
            </div>

            {/* Checkboxes */}
            <div className="col-span-2 mt-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={certificado.exploracionFisica}
                  onChange={(e) => setCertificado({ ...certificado, exploracionFisica: e.target.checked })}
                  className="w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Se realizó exploración física completa
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={certificado.pruebasMentales}
                  onChange={(e) => setCertificado({ ...certificado, pruebasMentales: e.target.checked })}
                  className="w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Se realizaron pruebas mentales
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={certificado.clinicamenteSano}
                  onChange={(e) => setCertificado({ ...certificado, clinicamenteSano: e.target.checked })}
                  className="w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  El paciente se encuentra clínicamente sano (apto para actividad física/laboral)
                </span>
              </label>
            </div>

            {/* Botones de Acción */}
            <div className="col-span-2 mt-6 flex gap-3">
              <button
                onClick={handleGenerarCertificado}
                disabled={loading}
                className="flex-1 bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                {loading ? "Generando..." : "Generar Certificado"}
              </button>

              {certificadoParaImprimir && (
                <>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    {showPreview ? "Ocultar" : "Vista Previa"}
                  </button>
                  <button
                    onClick={handlePrintCertificado}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Printer className="w-5 h-5" />
                    Imprimir
                  </button>
                </>
              )}
            </div>

            {/* Vista Previa en Pantalla */}
            {showPreview && certificadoParaImprimir && (
              <div className="col-span-2 mt-6 border-2 border-gray-300 rounded-lg p-8 bg-white shadow-lg">
                <div className="certificado-preview">
                  <div className="flex justify-between items-start mb-6">
                    <div className="text-center flex-1">
                      <svg width="60" height="60" viewBox="0 0 100 100" className="mx-auto mb-2">
                        <circle cx="50" cy="50" r="45" fill="#0d9488" />
                        <text x="50" y="50" textAnchor="middle" dy=".3em" fill="white" fontSize="24" fontWeight="bold">
                          UAC
                        </text>
                      </svg>
                    </div>

                    <div className="text-center flex-1">
                      <h2 className="font-bold text-lg">{user.name}</h2>
                      <p className="text-sm">Médica Cirujana</p>
                      <p className="text-sm">Cédula: {user.cedula || "1234567"}</p>
                      <p className="text-sm">Universidad Autónoma de Coahuila</p>
                    </div>

                    <div className="text-center flex-1">
                      <svg width="60" height="60" viewBox="0 0 100 100" className="mx-auto mb-2">
                        <g transform="translate(50,50)">
                          <line x1="0" y1="-35" x2="0" y2="35" stroke="#0d9488" strokeWidth="4"/>
                          <circle cx="0" cy="-25" r="8" fill="none" stroke="#0d9488" strokeWidth="2.5"/>
                        </g>
                      </svg>
                    </div>
                  </div>

                  <h3 className="font-bold text-xl mb-2">A QUIEN CORRESPONDA:</h3>
                  <p className="mb-4">PRESENTE.</p>

                  <div className="text-sm space-y-3">
                    <p className="text-justify">
                      La que suscribe <strong>Médica Cirujana</strong>, legalmente autorizada para ejercer su profesión, 
                      con <strong>Cédula Profesional {user.cedula || "1234567"}</strong>; certifica que ha realizado 
                      el examen médico a <strong>{certificadoParaImprimir.nombrePaciente}</strong> de{" "}
                      <strong>{certificadoParaImprimir.edad} años</strong>, quien cuenta con los siguientes antecedentes de importancia:
                    </p>

                    <p className="text-justify text-xs">
                      <strong>Alergias:</strong> {certificadoParaImprimir.alergias || "Ninguna"}, {" "}
                      <strong>Enfermedades Crónico Degenerativas:</strong> {certificadoParaImprimir.enfermedadesCronicas || "Ninguna"}, {" "}
                      <strong>Medicamentos:</strong> {certificadoParaImprimir.medicamentos || "Ninguno"}, {" "}
                      <strong>Cirugías:</strong> {certificadoParaImprimir.cirugias || "Ninguna"}, {" "}
                      <strong>Fracturas:</strong> {certificadoParaImprimir.fracturas || "Ninguna"}, {" "}
                      <strong>Transfusiones:</strong> {certificadoParaImprimir.transfusiones || "Ninguna"}, {" "}
                      <strong>Hospitalizaciones Previas:</strong> {certificadoParaImprimir.hospitalizaciones || "Ninguna"}, {" "}
                      <strong>Vacunas:</strong> {certificadoParaImprimir.vacunas || "Esquema completo"}.
                    </p>

                    <h4 className="font-bold mt-4">EXPLORACIÓN FÍSICA:</h4>

                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs"><strong>SIGNOS VITALES:</strong></p>
                      <p className="text-xs">
                        Peso: <strong>{certificadoParaImprimir.peso} Kg</strong>, 
                        Talla: <strong>{certificadoParaImprimir.talla} m</strong>, 
                        TA: <strong>{certificadoParaImprimir.ta} mmHg</strong>, 
                        SPO2: <strong>{certificadoParaImprimir.spo2}%</strong>, 
                        FC: <strong>{certificadoParaImprimir.fc} Lpm</strong>, 
                        FR: <strong>{certificadoParaImprimir.fr} rpm</strong>, 
                        Temp: <strong>{certificadoParaImprimir.temperatura}°C</strong>, 
                        Tipo Sanguíneo: <strong>{certificadoParaImprimir.tipoSanguineo}</strong>
                      </p>
                    </div>

                    {(certificadoParaImprimir.exploracionFisica || certificadoParaImprimir.pruebasMentales) && (
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <p className="text-xs text-justify">
                          Paciente consciente, orientado, cooperador al interrogatorio y exploración física piel y 
                          tegumentos con adecuada coloración e hidratación. normocéfalo, cráneo sin endocitosis o 
                          exostosis, cuello cilíndrico con tráquea móvil central, no se palpan masa en glándula 
                          tiroides, sin adenomegalias cervicales, pulsos carotídeos presentes sin soplos. isocoria 
                          y reflejos pupilares fotomotor, consensual y de acomodación presentes sin alteraciones. 
                          labios simétricos, mucosa oral normohidratada, sin lesiones, orofaringe normocrómica, 
                          Amígdalas sin hipertrofia, paladar y úvula simétricos. Buena agudeza auditiva, pabellones 
                          auriculares simétricos sin lesiones. tórax normolíneo y simétrico, con movimientos de 
                          amplexión y amplexación normales, sin puntos dolorosos a la palpación, a la auscultación 
                          con buena entrada y salida de aire, sin presencia de ruidos agregados, claro pulmonar a 
                          la percusión; ruidos cardiacos regulares y rítmicos, de buen tono e intensidad, sin soplos 
                          o ruidos agregados. Abdomen simétrico, con cicatriz umbilical central, peristalsis normal, 
                          blando, depresible, sin dolor a la palpación, sin datos de irritación peritoneal, sin 
                          visceromegalias palpables. Extremidades íntegras, simétricas, sin edema, color y temperatura 
                          normales, pulsos distales presentes, reflejos osteotendinosos, fuerza Daniels 5/5, 
                          sensibilidad conservada, llenado capilar de 2 segundos.
                        </p>
                      </div>
                    )}

                    {certificadoParaImprimir.clinicamenteSano && (
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="text-xs font-semibold text-green-800 text-justify">
                          POR MEDIO DE LA PRESENTE, CERTIFICO QUE DESPUÉS DE HABER REALIZADO UN ESTUDIO MINUCIOSO 
                          TANTO FÍSICO COMO MENTAL A: <strong>{certificadoParaImprimir.nombrePaciente.toUpperCase()}</strong>, 
                          ESTE SÍ SE ENCUENTRA <strong>CLÍNICAMENTE SANO</strong> AL MOMENTO DE LA EXPLORACIÓN FÍSICA 
                          Y SÍ SE CONSIDERÓ <strong>APTO</strong> PARA LA REALIZACIÓN DE CUALQUIER TIPO DE ACTIVIDAD 
                          FÍSICA Y/O DEPORTIVA QUE SE LE IMPONGA DE ACUERDO A EDAD Y SEXO, ASÍ MISMO NO SE ENCONTRARON 
                          DATOS DE ENFERMEDADES INFECTOCONTAGIOSAS.
                        </p>
                      </div>
                    )}

                    {/* Sección de Firma en Vista Previa */}
                    <div className="mt-12 pt-6 border-t-2 border-gray-300">
                      <div className="text-right mb-8">
                        <p className="text-xs text-gray-600">
                          Fecha de expedición: {new Date().toLocaleDateString("es-MX", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-center mt-12">
                        <p className="mb-2 text-lg">_________________________________</p>
                        <p className="font-bold text-base">{user.name}</p>
                        <p className="text-sm text-gray-700">Médica Cirujana</p>
                        <p className="text-sm text-gray-700">Cédula Profesional: {user.cedula || "1234567"}</p>
                      </div>
                    </div>

                    {/* Dirección de la Sucursal en Vista Previa */}
                    <div className="mt-12 pt-4 border-t border-gray-300">
                      <p className="text-xs text-center text-gray-600">
                        <strong>Dirección del Consultorio:</strong> {direccionSucursal}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }

        @media screen {
          .print-only {
            display: none !important;
          }
        }

        .certificado-medico {
          max-width: 21cm;
          margin: 0 auto;
          padding: 2cm 1.5cm;
          background: white;
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.4;
        }

        .certificado-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 2px solid #0d9488;
        }

        .doctor-info-center {
          text-align: center;
          flex: 1;
        }

        .doctor-info-center h1 {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 5px;
          color: #0d9488;
        }

        .doctor-info-center p {
          font-size: 10pt;
          margin: 2px 0;
          color: #333;
        }

        .certificado-destinatario {
          text-align: left;
          margin: 20px 0;
        }

        .certificado-destinatario h2 {
          font-size: 12pt;
          font-weight: bold;
          margin-bottom: 5px;
          color: #000;
        }

        .certificado-destinatario p {
          font-size: 11pt;
          margin: 0;
          color: #000;
        }

        .certificado-title {
          text-align: center;
          font-size: 14pt;
          font-weight: bold;
          margin: 15px 0 5px 0;
          color: #000;
        }

        .certificado-subtitle {
          text-align: center;
          font-size: 11pt;
          margin-bottom: 20px;
          color: #000;
        }

        .certificado-body {
          margin: 20px 0;
        }

        .certificado-intro {
          text-align: justify;
          margin-bottom: 15px;
          line-height: 1.6;
        }

        .antecedentes-texto {
          text-align: justify;
          margin-bottom: 15px;
          line-height: 1.6;
          font-size: 10pt;
        }

        .antecedentes-section {
          margin: 15px 0;
          padding: 10px;
          background-color: #f9fafb;
          border-left: 3px solid #0d9488;
        }

        .antecedentes-section p {
          margin: 5px 0;
          font-size: 10pt;
        }

        .section-title {
          font-size: 12pt;
          font-weight: bold;
          margin: 20px 0 10px 0;
          color: #0d9488;
          text-transform: uppercase;
        }

        .signos-vitales {
          margin: 10px 0;
          padding: 10px;
          background-color: #f0f9ff;
          border: 1px solid #0d9488;
        }

        .signos-vitales p {
          margin: 5px 0;
          font-size: 10pt;
        }

        .exploracion-detallada {
          margin: 15px 0;
          padding: 10px;
          text-align: justify;
          background-color: #fefce8;
          border-left: 3px solid #eab308;
        }

        .exploracion-detallada p {
          font-size: 9.5pt;
          line-height: 1.5;
        }

        .conclusion-section {
          margin: 20px 0;
          padding: 15px;
          background-color: #f0fdf4;
          border: 2px solid #16a34a;
          border-radius: 8px;
        }

        .conclusion-text {
          text-align: justify;
          font-size: 10pt;
          font-weight: 500;
          line-height: 1.6;
          color: #000;
        }

        .firma-section-certificado {
          margin-top: 50px;
        }

        .fecha-expedicion {
          text-align: right;
          font-size: 10pt;
          margin-bottom: 30px;
        }

        .firma-line-certificado {
          text-align: center;
          margin-top: 20px;
        }

        .firma-line-certificado p {
          font-size: 11pt;
          margin: 5px 0;
        }

        .direccion-consultorio {
          position: absolute;
          bottom: 1.5cm;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 9pt;
          color: #666;
          padding: 0 1.5cm;
        }

        @page {
          size: letter;
          margin: 1cm;
        }
      `}</style>
    </>
  );
}