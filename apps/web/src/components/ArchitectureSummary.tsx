import React from 'react';
import { Lock, Database, Globe, RefreshCcw, Shield, FileText } from 'lucide-react';

export const ArchitectureSummary: React.FC = () => {
  const points = [
    {
      icon: Lock,
      title: 'Aislamiento Multi-Tenant Estricto',
      desc: 'Base de datos compartida con discriminador business_id validado en el servidor. Prohibido acceso cruzado entre negocios.',
    },
    {
      icon: Database,
      title: 'PostgreSQL 16 & Migraciones Versionadas',
      desc: 'TypeORM configurado exclusivamente con migraciones controladas. Prohibido synchronize: true en todos los entornos.',
    },
    {
      icon: RefreshCcw,
      title: 'Consistencia Anti-Overbooking',
      desc: 'Transacciones atómicas y bloqueos pesimistas (SELECT ... FOR UPDATE) para prevenir dobles reservas y cupos excedidos.',
    },
    {
      icon: Shield,
      title: 'Seguridad Criptográfica',
      desc: 'Contraseñas hasheadas con Argon2id. Sesiones con Access Token y Refresh Token en cookies HttpOnly con rotación estricta.',
    },
    {
      icon: Globe,
      title: 'Zonas Horarias IANA & UTC',
      desc: 'Almacenamiento temporal en UTC (TIMESTAMPTZ) con preservación del timezone del establecimiento para agendas perfectas.',
    },
    {
      icon: FileText,
      title: 'Transactional Outbox & Notificaciones',
      desc: 'Desacoplamiento total entre la reserva y el despacho de correos. Resiliencia garantizada si el proveedor externo falla.',
    },
  ];

  return (
    <section id="arquitectura" className="py-12 border-t border-slate-200">
      <div className="max-w-3xl mx-auto text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Cimientos Técnicos y Arquitectura de Grado Comercial
        </h2>
        <p className="mt-2 text-sm sm:text-base text-slate-600">
          Diseñado bajo estándares de ingeniería de software senior para máxima confiabilidad y escalabilidad.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {points.map((p, idx) => {
          const Icon = p.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start space-x-3.5"
            >
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{p.title}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
