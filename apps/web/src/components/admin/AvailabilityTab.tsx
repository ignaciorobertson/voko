import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Plus,
  Trash2,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { adminOperationsApi } from '../../api/admin-operations.api.js';
import { ResourceDetail } from '@voko/shared';

interface Props {
  businessId: string;
  resources: ResourceDetail[];
}

const DAYS_OF_WEEK = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export const AvailabilityTab: React.FC<Props> = ({
  businessId,
  resources,
}) => {
  const queryClient = useQueryClient();

  // New Rule Form State
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [ruleResourceId, setRuleResourceId] = useState('');
  const [isRuleFormOpen, setIsRuleFormOpen] = useState(false);

  // New Exception Form State
  const [exStartDate, setExStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [exStartTime, setExStartTime] = useState('09:00');
  const [exEndTime, setExEndTime] = useState('18:00');
  const [exReason, setExReason] = useState('Feriado Nacional / Cierre');
  const [exResourceId, setExResourceId] = useState('');
  const [isExFormOpen, setIsExFormOpen] = useState(false);

  // Consultar Reglas Semanales
  const { data: rules = [], isLoading: isLoadingRules } = useQuery({
    queryKey: ['availabilityRules', businessId],
    queryFn: () => adminOperationsApi.getAvailabilityRules(businessId),
  });

  // Consultar Excepciones
  const { data: exceptions = [], isLoading: isLoadingEx } = useQuery({
    queryKey: ['availabilityExceptions', businessId],
    queryFn: () => adminOperationsApi.getAvailabilityExceptions(businessId),
  });

  // Mutación: Crear regla
  const createRuleMutation = useMutation({
    mutationFn: () =>
      adminOperationsApi.createAvailabilityRule(businessId, {
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        resourceId: ruleResourceId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilityRules'] });
      setIsRuleFormOpen(false);
    },
  });

  // Mutación: Eliminar regla
  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) =>
      adminOperationsApi.deleteAvailabilityRule(businessId, ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilityRules'] });
    },
  });

  // Mutación: Crear excepción
  const createExMutation = useMutation({
    mutationFn: () => {
      const startIso = new Date(`${exStartDate}T${exStartTime}:00`).toISOString();
      const endIso = new Date(`${exStartDate}T${exEndTime}:00`).toISOString();
      return adminOperationsApi.createAvailabilityException(businessId, {
        startDate: startIso,
        endDate: endIso,
        isBlocking: true,
        reason: exReason,
        resourceId: exResourceId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilityExceptions'] });
      setIsExFormOpen(false);
    },
  });

  // Mutación: Eliminar excepción
  const deleteExMutation = useMutation({
    mutationFn: (exId: string) =>
      adminOperationsApi.deleteAvailabilityException(businessId, exId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilityExceptions'] });
    },
  });

  return (
    <div className="space-y-8">
      {/* 1. Reglas de Horarios Semanales Habituales */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" /> Horarios de Atención Habitual (Semanales)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configurá los turnos habituales de cada día. Soporta turnos partidos (e.g. 09:00 a 13:00 y 16:00 a 20:00).
            </p>
          </div>
          <button
            onClick={() => setIsRuleFormOpen(!isRuleFormOpen)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar Franja Horaria
          </button>
        </div>

        {/* Formulario Agregar Regla */}
        {isRuleFormOpen && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createRuleMutation.mutate();
            }}
            className="mt-5 p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs animate-in fade-in"
          >
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Día de la semana</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              >
                {DAYS_OF_WEEK.map((name, idx) => (
                  <option key={idx} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Hora Inicio</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Hora Fin</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Profesional (Opcional)</label>
              <select
                value={ruleResourceId}
                onChange={(e) => setRuleResourceId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Todo el establecimiento</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4 flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRuleFormOpen(false)}
                className="py-1.5 px-3 rounded-lg text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createRuleMutation.isPending}
                className="py-1.5 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 text-center"
              >
                Guardar Horario
              </button>
            </div>
          </form>
        )}

        {/* Lista de Reglas */}
        <div className="mt-5 space-y-2">
          {isLoadingRules ? (
            <div className="p-8 text-center text-slate-400 text-xs">Cargando reglas semanales...</div>
          ) : rules.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Aún no se han configurado reglas específicas. Agregá los horarios de apertura de tu local.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rules.map((rule: any) => (
                <div
                  key={rule.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">
                      {DAYS_OF_WEEK[(rule.dayOfWeek - 1) % 7] || 'Día'}
                    </span>
                    <span className="text-indigo-400 font-mono font-semibold">
                      {rule.startTime} - {rule.endTime} hs
                    </span>
                  </div>
                  <button
                    onClick={() => deleteRuleMutation.mutate(rule.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Eliminar franja"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 2. Excepciones de Disponibilidad (Feriados, Bloqueos, Aperturas Extraordinarias) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> Excepciones, Feriados y Bloqueos
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cierres extraordinarios, feriados y vacaciones que invalidan los slots de atención.
            </p>
          </div>
          <button
            onClick={() => setIsExFormOpen(!isExFormOpen)}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva Excepción
          </button>
        </div>

        {/* Formulario Agregar Excepción */}
        {isExFormOpen && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createExMutation.mutate();
            }}
            className="mt-5 p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs animate-in fade-in"
          >
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Fecha</label>
              <input
                type="date"
                required
                value={exStartDate}
                onChange={(e) => setExStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Horario (Desde - Hasta)</label>
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  required
                  value={exStartTime}
                  onChange={(e) => setExStartTime(e.target.value)}
                  className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                />
                <input
                  type="time"
                  required
                  value={exEndTime}
                  onChange={(e) => setExEndTime(e.target.value)}
                  className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Motivo</label>
              <input
                type="text"
                required
                placeholder="Ej: Feriado, Vacaciones"
                value={exReason}
                onChange={(e) => setExReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Recurso Afectado</label>
              <select
                value={exResourceId}
                onChange={(e) => setExResourceId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Todo el establecimiento</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4 flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsExFormOpen(false)}
                className="py-1.5 px-3 rounded-lg text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createExMutation.isPending}
                className="py-1.5 px-5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors disabled:opacity-50 text-center"
              >
                Guardar Excepción
              </button>
            </div>
          </form>
        )}

        {/* Lista de Excepciones */}
        <div className="mt-5 space-y-2">
          {isLoadingEx ? (
            <div className="p-8 text-center text-slate-400 text-xs">Cargando excepciones...</div>
          ) : exceptions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No hay excepciones registradas. Tu negocio opera según el cronograma semanal habitual.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {exceptions.map((ex: any) => (
                <div
                  key={ex.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-rose-400 block flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {ex.reason || 'Bloqueo'}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(ex.startTime).toLocaleDateString('es-AR')} •{' '}
                      {new Date(ex.startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(ex.endTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                    </span>
                  </div>
                  <button
                    onClick={() => deleteExMutation.mutate(ex.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Eliminar bloqueo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
