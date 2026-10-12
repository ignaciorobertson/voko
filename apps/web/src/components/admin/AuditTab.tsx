import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  User,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { adminOperationsApi } from '../../api/admin-operations.api.js';

interface Props {
  businessId: string;
}

export const AuditTab: React.FC<Props> = ({ businessId }) => {
  const { data: auditEvents = [], isLoading } = useQuery({
    queryKey: ['adminAudit', businessId],
    queryFn: () => adminOperationsApi.getAuditHistory(businessId, 50),
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-0.5">
          <History className="w-4 h-4 text-indigo-400" /> Historial de Operaciones y Auditoría
        </h3>
        <p className="text-xs text-slate-400">
          Registro inmutable de todas las creaciones, reprogramaciones, cancelaciones y cambios de estado de reservas.
        </p>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          Cargando eventos de auditoría...
        </div>
      ) : auditEvents.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-16 text-center text-slate-400">
          <History className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <h3 className="text-base font-semibold text-white mb-1">
            Sin operaciones registradas aún
          </h3>
          <p className="text-xs">
            Cada cambio realizado sobre un turno generará un registro inmutable en este panel.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="divide-y divide-slate-800/70">
            {auditEvents.map((event) => (
              <div
                key={event.id}
                className="p-4 hover:bg-slate-800/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">
                      {event.serviceName}
                    </span>
                    <span className="text-slate-400">• Para: {event.customerName}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 font-bold text-[10px] uppercase text-indigo-300">
                      {event.eventType}
                    </span>
                    {event.previousStatus ? (
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                        {event.previousStatus} <ArrowRight className="w-3 h-3 text-slate-600" />{' '}
                        <strong className="text-emerald-400">{event.newStatus}</strong>
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-emerald-400 font-bold">
                        {event.newStatus}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-400 sm:text-right">
                  <div>
                    <div className="flex items-center sm:justify-end gap-1.5 text-slate-300 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      {event.actorName}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center sm:justify-end gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(event.createdAt).toLocaleString('es-AR')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
