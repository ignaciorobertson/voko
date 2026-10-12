import React from 'react';
import { HealthStatusBadge } from '../components/HealthStatusBadge.js';
import { ModalitiesPreview } from '../components/ModalitiesPreview.js';
import { ArchitectureSummary } from '../components/ArchitectureSummary.js';
import { ArrowRight, Terminal } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="pt-10 sm:pt-14 pb-6">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200/80 px-3 py-1.5 rounded-full text-xs font-semibold text-blue-800">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>Hito 1 Completado — Esqueleto Técnico e Identidad Visual</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Gestión y Solicitud de Turnos <br className="hidden sm:inline" />
            <span className="text-blue-700">Multiempresa y de Alta Precisión</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Plataforma web genérica y configurable para barberías, consultorios, gimnasios, talleres y complejos deportivos.
            Turnos individuales, clases grupales con cupos y reservas de recursos físicos.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a
              href="http://localhost:3000/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 py-2 rounded-xl shadow-sm hover:shadow transition-all text-xs"
            >
              <Terminal className="w-4 h-4" />
              <span>Swagger API</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>

            <a
              href="/portal"
              className="inline-flex items-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold px-4 py-2 rounded-xl transition-colors text-xs"
            >
              <span>Área de Clientes</span>
            </a>

            <a
              href="/admin"
              className="inline-flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold px-4 py-2 rounded-xl transition-colors text-xs"
            >
              <span>Panel de Negocios</span>
            </a>

            <a
              href="/superadmin"
              className="inline-flex items-center space-x-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold px-4 py-2 rounded-xl transition-colors text-xs"
            >
              <span>Consola Superadmin</span>
            </a>
          </div>
        </div>

        {/* Live Diagnostics Card */}
        <div className="max-w-2xl mx-auto mt-10">
          <HealthStatusBadge />
        </div>
      </section>

      {/* Portales Públicos de Demostración en Vivo */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm">
          <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
              Hito 6 — Autoservicio en Vivo
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Portales Públicos de Reserva por Negocio
            </h2>
            <p className="text-sm text-slate-600">
              Hacé clic en cualquiera de los establecimientos para probar el flujo de autoservicio para clientes reales.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                slug: 'voko-barber',
                name: 'Voko Barber Club',
                type: 'Modalidad A — Individual 1 a 1',
                badge: 'Barbería & Estilo',
                color: '#0F172A',
                desc: 'Corte clásico, barba y perfilado con elección de barbero.',
              },
              {
                slug: 'olympus-gym',
                name: 'Gimnasio Olympus',
                type: 'Modalidad B — Clases Grupales',
                badge: 'Fitness & Salud',
                color: '#DC2626',
                desc: 'Clases de Spinning y Cross Training con cupo limitado.',
              },
              {
                slug: 'sonrisas-dental',
                name: 'Clínica Sonrisas',
                type: 'Modalidad A & C — Salud',
                badge: 'Salud & Odontología',
                color: '#0284C7',
                desc: 'Consultas odontológicas y reserva de sillones de atención.',
              },
              {
                slug: 'voko-complex',
                name: 'Complejo Deportivo',
                type: 'Modalidad C — Recursos',
                badge: 'Deportes & Pádel',
                color: '#16A34A',
                desc: 'Alquiler exclusivo de canchas de pádel de césped sintético.',
              },
            ].map((biz) => (
              <a
                key={biz.slug}
                href={`/${biz.slug}`}
                className="group bg-slate-50 hover:bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-blue-500 hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      {biz.badge}
                    </span>
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: biz.color }}
                    />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {biz.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">{biz.type}</p>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">{biz.desc}</p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                  <span>Probar Reserva</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Modalidades de Reserva */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ModalitiesPreview />
      </div>

      {/* Arquitectura y Seguridad */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ArchitectureSummary />
      </div>
    </div>
  );
};
