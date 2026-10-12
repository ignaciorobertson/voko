import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Users,
  Award,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { adminOperationsApi } from '../../api/admin-operations.api.js';

interface Props {
  businessId: string;
}

export const ReportsTab: React.FC<Props> = ({ businessId }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: ['adminReports', businessId, startDate, endDate],
    queryFn: () => adminOperationsApi.getReportsSummary(businessId, startDate, endDate),
  });

  return (
    <div className="space-y-6">
      {/* Date Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 lg:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <h3 className="text-base font-bold text-white mb-0.5">
            Métricas Operativas y Financieras
          </h3>
          <p className="text-xs text-slate-400">
            Cálculo consolidado en tiempo real sobre las reservas e historial de atención.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
            title="Fecha Inicial"
          />
          <span className="text-slate-500">hasta</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
            title="Fecha Final"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-slate-400 hover:text-white underline ml-2"
            >
              Restablecer
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          Calculando métricas operativas...
        </div>
      ) : report ? (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Realized Revenue */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Facturación Realizada
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                ${report.metrics.realizedRevenue.toLocaleString('es-AR')}{' '}
                <span className="text-xs font-normal text-slate-400">{report.metrics.currency}</span>
              </div>
              <span className="text-xs text-emerald-400/90 mt-1 block">
                {report.metrics.completedAppointments} turnos completados
              </span>
            </div>

            {/* Projected Revenue */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Ingresos Proyectados
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                ${report.metrics.projectedRevenue.toLocaleString('es-AR')}{' '}
                <span className="text-xs font-normal text-slate-400">{report.metrics.currency}</span>
              </div>
              <span className="text-xs text-indigo-400/90 mt-1 block">
                {report.metrics.confirmedAppointments + report.metrics.pendingAppointments} turnos por atender
              </span>
            </div>

            {/* Attendance Rate */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tasa de Asistencia
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {report.metrics.attendanceRate}%
              </div>
              <span className="text-xs text-slate-400 mt-1 block">
                Puntualidad del cliente
              </span>
            </div>

            {/* No-Show Rate */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Ausentismo (No-Show)
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {report.metrics.noShowRate}%
              </div>
              <span className="text-xs text-purple-400/90 mt-1 block">
                {report.metrics.noShowAppointments} ausencias registradas
              </span>
            </div>
          </div>

          {/* Breakdown Section: Top Services & Resource Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Services */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-400" /> Servicios Más Demandados
              </h4>
              {report.topServices.length === 0 ? (
                <div className="text-slate-400 text-xs py-8 text-center">
                  Sin reservas registradas aún.
                </div>
              ) : (
                <div className="space-y-3">
                  {report.topServices.map((service, idx) => (
                    <div
                      key={service.id}
                      className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-white block">{service.name}</span>
                          <span className="text-slate-400">{service.count} reservas totales</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400">
                          ${service.revenue.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resource Performance */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" /> Rendimiento por Profesional / Recurso
              </h4>
              {report.resourcePerformance.length === 0 ? (
                <div className="text-slate-400 text-xs py-8 text-center">
                  Sin actividad de profesionales registrada.
                </div>
              ) : (
                <div className="space-y-3">
                  {report.resourcePerformance.map((res) => (
                    <div
                      key={res.id}
                      className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{res.name}</span>
                        <span className="text-slate-400">
                          {res.completedAppointments} atendidos de {res.totalAppointments} totales
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-indigo-400 flex items-center gap-1 justify-end">
                          <Clock className="w-3.5 h-3.5" /> {res.hoursWorked} hs
                        </span>
                        <span className="text-[11px] text-slate-500">atención neta</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
