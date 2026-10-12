import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Phone,
  Mail,
  MoreVertical,
} from 'lucide-react';
import { adminOperationsApi } from '../../api/admin-operations.api.js';
import { ManualAppointmentModal } from './ManualAppointmentModal.js';
import { QuickBlockModal } from './QuickBlockModal.js';
import { ServiceDetail, ResourceDetail, BranchDetail } from '@voko/shared';

interface Props {
  businessId: string;
  services: ServiceDetail[];
  resources: ResourceDetail[];
  branches: BranchDetail[];
}

export const AgendaTab: React.FC<Props> = ({
  businessId,
  services,
  resources,
  branches,
}) => {
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [actionMenuAppId, setActionMenuAppId] = useState<string | null>(null);

  // Consultar citas de la agenda
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: [
      'agendaAppointments',
      businessId,
      selectedDate,
      selectedResourceId,
      selectedBranchId,
      selectedStatus,
    ],
    queryFn: () => {
      let startDate = `${selectedDate}T00:00:00.000Z`;
      let endDate = `${selectedDate}T23:59:59.999Z`;

      if (viewMode === 'weekly') {
        const d = new Date(selectedDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // lunes
        const monday = new Date(d.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        startDate = monday.toISOString().slice(0, 10) + 'T00:00:00.000Z';
        endDate = sunday.toISOString().slice(0, 10) + 'T23:59:59.999Z';
      }

      return adminOperationsApi.getAppointments(businessId, {
        startDate,
        endDate,
        resourceId: selectedResourceId || undefined,
        branchId: selectedBranchId || undefined,
        status: selectedStatus || undefined,
      });
    },
  });

  // Mutación: Actualizar estado operativo
  const statusMutation = useMutation({
    mutationFn: ({
      appointmentId,
      status,
      notes,
    }: {
      appointmentId: string;
      status: string;
      notes?: string;
    }) => adminOperationsApi.updateAppointmentStatus(businessId, appointmentId, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendaAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      queryClient.invalidateQueries({ queryKey: ['adminAudit'] });
      setActionMenuAppId(null);
    },
  });

  // Navegación de fechas
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - (viewMode === 'weekly' ? 7 : 1));
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (viewMode === 'weekly' ? 7 : 1));
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  const formatHeaderDate = (isoDate: string) => {
    try {
      const d = new Date(isoDate + 'T12:00:00');
      return new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
    } catch {
      return isoDate;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" /> Confirmado
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Pendiente
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle className="w-3 h-3" /> Atendido
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <AlertTriangle className="w-3 h-3" /> No-Show
          </span>
        );
      case 'CANCELLED_BY_CUSTOMER':
      case 'CANCELLED_BY_BUSINESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar: Date Navigation & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 lg:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-lg">
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={handleNextDay}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            title="Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white font-medium focus:outline-none focus:border-indigo-500"
          />

          <span className="text-sm font-bold text-white capitalize hidden lg:inline ml-2">
            {formatHeaderDate(selectedDate)}
          </span>
        </div>

        {/* View Toggle & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'daily'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vista Diaria
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'weekly'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semana
            </button>
          </div>

          <button
            onClick={() => setIsBlockModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold text-xs border border-amber-500/20 transition-all"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Bloqueo Rápido
          </button>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" /> Nuevo Turno Mostrador
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center gap-3 overflow-x-auto text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[11px] mr-1">
          <Filter className="w-3.5 h-3.5" /> Filtros:
        </div>

        {/* Filter por Profesional */}
        <select
          value={selectedResourceId}
          onChange={(e) => setSelectedResourceId(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="">Todos los profesionales</option>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        {/* Filter por Sucursal */}
        {branches.length > 1 && (
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        {/* Filter por Estado */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="">Todos los estados</option>
          <option value="CONFIRMED">Solo Confirmados</option>
          <option value="PENDING">Solo Pendientes</option>
          <option value="COMPLETED">Solo Atendidos</option>
          <option value="NO_SHOW">Solo No-Show</option>
        </select>

        {(selectedResourceId || selectedBranchId || selectedStatus) && (
          <button
            onClick={() => {
              setSelectedResourceId('');
              setSelectedBranchId('');
              setSelectedStatus('');
            }}
            className="text-slate-400 hover:text-white ml-auto underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Grid of Appointments */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16 text-slate-400 gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          Cargando agenda de turnos...
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-16 text-center text-slate-400">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <h3 className="text-base font-semibold text-white mb-1">
            No hay turnos registrados en este período
          </h3>
          <p className="text-sm max-w-md mx-auto mb-5">
            Podés registrar un turno de mostrador o llamada haciendo clic en "Nuevo Turno Mostrador".
          </p>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md"
          >
            <Plus className="w-4 h-4" /> Registrar Turno Manual
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {appointments.map((app) => {
            const startDateObj = new Date(app.startTime);
            const endDateObj = new Date(app.endTime);
            const timeRange = `${startDateObj.toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
            })} - ${endDateObj.toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
            })}`;

            return (
              <div
                key={app.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg relative flex flex-col justify-between transition-all"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white tracking-tight block">
                          {timeRange}
                        </span>
                        <span className="text-xs text-slate-400">
                          {startDateObj.toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(app.status)}

                      {/* Dropdown Menu Trigger */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActionMenuAppId(
                              actionMenuAppId === app.id ? null : app.id,
                            )
                          }
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {actionMenuAppId === app.id && (
                          <div className="absolute right-0 top-7 z-20 w-44 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-1.5 text-xs animate-in fade-in">
                            <button
                              onClick={() =>
                                statusMutation.mutate({
                                  appointmentId: app.id,
                                  status: 'COMPLETED',
                                })
                              }
                              className="w-full text-left px-3 py-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 font-medium"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Marcar Atendido
                            </button>
                            <button
                              onClick={() =>
                                statusMutation.mutate({
                                  appointmentId: app.id,
                                  status: 'NO_SHOW',
                                })
                              }
                              className="w-full text-left px-3 py-2 rounded-lg text-purple-400 hover:bg-purple-500/10 flex items-center gap-2 font-medium"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" /> Marcar No-Show
                            </button>
                            <button
                              onClick={() =>
                                statusMutation.mutate({
                                  appointmentId: app.id,
                                  status: 'CANCELLED_BY_BUSINESS',
                                  notes: 'Cancelado por recepción',
                                })
                              }
                              className="w-full text-left px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Cancelar Turno
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Service & Resource Info */}
                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 mb-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-sm">
                        {app.service?.name || 'Servicio General'}
                      </span>
                      <span className="text-xs text-indigo-400 font-mono font-semibold">
                        {app.snapshotPrice ? `$${app.snapshotPrice}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>{app.resource?.name || 'Cualquiera'}</span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1 text-xs text-slate-300">
                    <span className="font-semibold text-slate-200 block text-sm">
                      {app.customer
                        ? `${app.customer.firstName} ${app.customer.lastName}`
                        : 'Cliente'}
                    </span>
                    {app.customer?.phone && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{app.customer.phone}</span>
                      </div>
                    )}
                    {app.customer?.email && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span className="truncate">{app.customer.email}</span>
                      </div>
                    )}
                    {app.customerNotes && (
                      <p className="mt-2 text-[11px] italic text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                        "{app.customerNotes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Action Footer */}
                <div className="pt-3 mt-4 border-t border-slate-800 flex items-center gap-2">
                  {app.status === 'CONFIRMED' && (
                    <button
                      onClick={() =>
                        statusMutation.mutate({
                          appointmentId: app.id,
                          status: 'COMPLETED',
                        })
                      }
                      disabled={statusMutation.isPending}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors text-center"
                    >
                      Check-in / Atender
                    </button>
                  )}
                  {app.status === 'PENDING' && (
                    <button
                      onClick={() =>
                        statusMutation.mutate({
                          appointmentId: app.id,
                          status: 'CONFIRMED',
                        })
                      }
                      disabled={statusMutation.isPending}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors text-center"
                    >
                      Aprobar Reserva
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <ManualAppointmentModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        businessId={businessId}
        services={services}
        resources={resources}
        branches={branches}
      />

      <QuickBlockModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        businessId={businessId}
        resources={resources}
      />
    </div>
  );
};
