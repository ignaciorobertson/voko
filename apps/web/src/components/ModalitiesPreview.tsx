import React from 'react';
import { UserCheck, Users, Box, Check } from 'lucide-react';

export const ModalitiesPreview: React.FC = () => {
  const modalities = [
    {
      id: 'individual',
      title: 'Modalidad A: Turnos Individuales',
      subtitle: 'Atención 1 a 1 profesional o personalizada',
      icon: UserCheck,
      badge: 'Slots Consecutivos',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description:
        'Reserva exclusiva de un profesional o especialista por un intervalo determinado, con cálculo estricto de márgenes antes y después.',
      examples: ['Barberías & Peluquerías', 'Consultas Médicas', 'Servicio Técnico Automotor'],
      technicalFeatures: [
        'Respeto de buffers de preparación y limpieza (before/after)',
        'Asignación obligatoria o automática de profesional',
        'Prevención de solapamiento mediante bloqueos pesimistas en DB',
      ],
    },
    {
      id: 'grupales',
      title: 'Modalidad B: Sesiones Grupales con Cupos',
      subtitle: 'Actividades colectivas con capacidad limitada',
      icon: Users,
      badge: 'Control de Capacidad',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description:
        'Sesiones fijas con horario preestablecido donde múltiples clientes pueden anotarse hasta completar el cupo máximo.',
      examples: ['Clases de Yoga & Pilates', 'Cursos y Talleres', 'Entrenamiento Funcional'],
      technicalFeatures: [
        'Transacciones atómicas anti-overbooking bajo alta concurrencia',
        'Contador de inscriptos en tiempo real con status OPEN/FULL',
        'Historial de asistencia individualizado por participante',
      ],
    },
    {
      id: 'recursos',
      title: 'Modalidad C: Reservas de Recursos Físicos',
      subtitle: 'Espacios e instalaciones compartidas',
      icon: Box,
      badge: 'Recurso Puro',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description:
        'Reserva de instalaciones o equipamiento físico por intervalo de tiempo, con o sin un profesional asignado.',
      examples: ['Canchas de Pádel & Fútbol', 'Consultorios & Boxes', 'Salas de Reuniones & Equipos'],
      technicalFeatures: [
        'Bloqueo directo del recurso físico sin requerir staff humano',
        'Soporte para múltiples sucursales y ubicaciones físicas',
        'Reglas de anticipación y cancelación configurables por recurso',
      ],
    },
  ];

  return (
    <section id="modalidades" className="py-12">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Tres Modalidades de Reserva en un Mismo Núcleo
        </h2>
        <p className="mt-3 text-base text-slate-600">
          Voko es genérico por configuración. Cada negocio adapta su funcionamiento a una o varias modalidades sin alterar la integridad del sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modalities.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">{item.subtitle}</p>

                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  {item.description}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Ejemplos de aplicación:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.examples.map((ex, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Garantías técnicas del motor:
                  </div>
                  {item.technicalFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-start text-xs text-slate-600 space-x-2">
                      <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <span className="text-xs text-slate-400 italic">
                  Definido en Hito 0 • Implementación de motor en Hito 5
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
