import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Scissors,
  Dumbbell,
  Smile,
  Trophy,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { playDewSound } from '../../utils/soundEffects.js';

interface DemoBusiness {
  slug: string;
  name: string;
  badge: string;
  category: string;
  icon: React.ReactNode;
  accentColor: string;
  modality: string;
  description: string;
  features: string[];
  mockStats: { label: string; value: string };
}

export const PlaygroundPage: React.FC = () => {
  const [selectedSlug, setSelectedSlug] = useState<string>('voko-barber');

  const demoBusinesses: DemoBusiness[] = [
    {
      slug: 'voko-barber',
      name: 'Voko Barber Club',
      badge: 'Barbería & Estilo',
      category: 'Servicios 1 a 1',
      icon: <Scissors className="w-6 h-6 text-amber-400" />,
      accentColor: 'from-amber-500 to-orange-600',
      modality: 'Modalidad A — Citas Individuales',
      description: 'Corte clásico, barba y perfilado con selección de barbero y horario disponible.',
      features: [
        'Reserva 1 a 1 con profesional asignado',
        'Cálculo dinámico de duración y horarios',
        'Notificación y confirmación automática',
        'Validación anti-doble turno en tiempo real',
      ],
      mockStats: { label: 'Duración Promedio', value: '45 min' },
    },
    {
      slug: 'olympus-gym',
      name: 'Gimnasio Olympus',
      badge: 'Fitness & Entrenamiento',
      category: 'Clases Grupales',
      icon: <Dumbbell className="w-6 h-6 text-rose-400" />,
      accentColor: 'from-rose-500 to-red-600',
      modality: 'Modalidad B — Sesiones con Cupos',
      description: 'Clases de Spinning Power y Cross Training con capacidad máxima controlada.',
      features: [
        'Límite estricto de cupos por clase',
        'Contador en tiempo real de vacantes',
        'Inscripción instantánea con teléfono de contacto',
        'Liberación automática de vacante al cancelar',
      ],
      mockStats: { label: 'Cupo por Clase', value: '15 personas' },
    },
    {
      slug: 'sonrisas-dental',
      name: 'Clínica Dental Sonrisas',
      badge: 'Salud & Odontología',
      category: 'Consultorios Médicos',
      icon: <Smile className="w-6 h-6 text-sky-400" />,
      accentColor: 'from-sky-500 to-blue-600',
      modality: 'Modalidad A & C — Salud & Equipos',
      description: 'Consultas odontológicas, ortodoncia y reserva de sillones de atención dental.',
      features: [
        'Asignación conjunta de Odontólogo + Sillón',
        'Política de cancelación estricta (antelación)',
        'Formulario de datos clínicos del paciente',
        'Disponibilidad según excepciones y feriados',
      ],
      mockStats: { label: 'Anticipación', value: '3 horas mín.' },
    },
    {
      slug: 'voko-complex',
      name: 'Complejo Deportivo',
      badge: 'Deportes & Pádel',
      category: 'Espacios Físicos',
      icon: <Trophy className="w-6 h-6 text-emerald-400" />,
      accentColor: 'from-emerald-500 to-teal-600',
      modality: 'Modalidad C — Recursos Físicos',
      description: 'Alquiler exclusivo de canchas de pádel de césped sintético y vestuarios.',
      features: [
        'Reserva directa de canchas e infraestructura',
        'Sin necesidad de asignar staff obligatorio',
        'Bloqueo preventivo de horarios por mantenimiento',
        'Selección por franja horaria y duración fija',
      ],
      mockStats: { label: 'Canchas Activas', value: '4 Canchas' },
    },
  ];

  const currentBiz = demoBusinesses.find((b) => b.slug === selectedSlug) || demoBusinesses[0];

  return (
    <div className="min-h-[calc(100vh-8rem)] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 mb-2 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Entorno Interactivo de Demostración</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
            Playground de Reservas para Clientes
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl mt-1">
            Explora y prueba la experiencia real de autoservicio que ven los clientes finales para cada tipo de negocio.
          </p>
        </div>

        <Link
          to="/"
          onClick={() => playDewSound()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:text-white shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </Link>
      </div>

      {/* Grid de Selección de Negocios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {demoBusinesses.map((biz) => {
          const isSelected = biz.slug === selectedSlug;
          return (
            <button
              key={biz.slug}
              type="button"
              onClick={() => {
                playDewSound();
                setSelectedSlug(biz.slug);
              }}
              className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-cyan-400 shadow-[0_0_25px_rgba(56,189,248,0.35)] ring-1 ring-cyan-400'
                  : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700 shadow-sm'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden">
                  <div className="bg-cyan-500 text-slate-950 text-[10px] font-black py-0.5 px-6 transform rotate-45 translate-x-3 -translate-y-1 shadow-sm">
                    Activo
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center">
                  {biz.icon}
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {biz.badge}
                  </span>
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {biz.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-medium">{biz.modality}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-cyan-400">
                <span>{isSelected ? 'Seleccionado' : 'Ver Detalles'}</span>
                <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'translate-x-1' : ''}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Tarjeta de Detalle del Negocio Seleccionado y Acceso Directo */}
      <div className="bg-slate-900/80 rounded-3xl border border-cyan-500/30 p-6 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {currentBiz.category}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                {currentBiz.modality}
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {currentBiz.name}
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                {currentBiz.description}
              </p>
            </div>

            {/* Características de la Modalidad */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Capacidades de esta Modalidad:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentBiz.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel de Lanzamiento de la Demo en Vivo */}
          <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-6 space-y-5 text-center flex flex-col justify-between h-full">
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Métrica Clave
              </span>
              <div className="text-3xl font-extrabold text-white">
                {currentBiz.mockStats.value}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {currentBiz.mockStats.label}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <Link
                to={`/${currentBiz.slug}`}
                onClick={() => playDewSound()}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl neon-btn text-white font-bold text-sm tracking-wide transition-all group"
              >
                <span>Probar Reserva en Vivo</span>
                <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>

              <p className="text-[11px] text-slate-500">
                No requiere inicio de sesión. Simula el autoservicio completo del cliente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
