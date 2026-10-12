import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Edit3,
  Trash2,
  Phone,
  Mail,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  customerPortalApi,
  CustomerAppointmentItem,
} from '../../api/customer-portal.api.js';
import { authApi } from '../../api/auth.api.js';

type TabType = 'upcoming' | 'history' | 'profile';

export const CustomerPortalPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  // Modales de acción sobre turnos
  const [cancellingApp, setCancellingApp] = useState<CustomerAppointmentItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [reschedulingApp, setReschedulingApp] = useState<CustomerAppointmentItem | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Perfil form state
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  // Asegurar sesión o login de prueba para demo
  const { data: currentUser } = useQuery({
    queryKey: ['portalMe'],
    queryFn: async () => {
      try {
        return await authApi.getMe();
      } catch {
        try {
          const res = await authApi.login('nicolas@voko.test', 'Secret123!');
          return res.user;
        } catch {
          return null;
        }
      }
    },
  });

  // Consultar perfil del cliente
  const { data: profile } = useQuery({
    queryKey: ['customerProfile', currentUser?.id],
    queryFn: customerPortalApi.getProfile,
    enabled: !!currentUser,
  });

  // Inicializar estado del formulario cuando carga el perfil
  React.useEffect(() => {
    if (profile) {
      setProfileFirstName(profile.firstName || '');
      setProfileLastName(profile.lastName || '');
      setProfilePhone(profile.phone || '');
    }
  }, [profile]);

  // Consultar próximas reservas
  const {
    data: upcomingAppointments = [],
    isLoading: isLoadingUpcoming,
    refetch: refetchUpcoming,
  } = useQuery({
    queryKey: ['portalUpcoming'],
    queryFn: () => customerPortalApi.getAppointments('upcoming'),
  });

  // Consultar historial
  const {
    data: pastAppointments = [],
    isLoading: isLoadingPast,
    refetch: refetchPast,
  } = useQuery({
    queryKey: ['portalPast'],
    queryFn: () => customerPortalApi.getAppointments('past'),
  });

  // Mutación: Actualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string; phone: string }) =>
      customerPortalApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
      setProfileSavedMsg(true);
      setTimeout(() => setProfileSavedMsg(false), 3000);
    },
  });

  // Mutación: Cancelar reserva
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      customerPortalApi.cancelAppointment(id, reason),
    onSuccess: () => {
      setCancellingApp(null);
      setCancelReason('');
      setCancelError(null);
      refetchUpcoming();
      refetchPast();
    },
    onError: (err: any) => {
      setCancelError(
        err.response?.data?.message || 'No se pudo cancelar el turno. Verifique los plazos mínimos.',
      );
    },
  });

  // Mutación: Reprogramar reserva
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, startTime }: { id: string; startTime: string }) =>
      customerPortalApi.rescheduleAppointment(id, startTime),
    onSuccess: () => {
      setReschedulingApp(null);
      setNewDate('');
      setRescheduleError(null);
      refetchUpcoming();
      refetchPast();
    },
    onError: (err: any) => {
      setRescheduleError(
        err.response?.data?.message || 'El horario solicitado no está disponible. Elija otro horario.',
      );
    },
  });

  const handleConfirmCancel = () => {
    if (!cancellingApp) return;
    cancelMutation.mutate({ id: cancellingApp.id, reason: cancelReason });
  };

  const handleConfirmReschedule = () => {
    if (!reschedulingApp || !newDate) return;
    const combinedIso = new Date(`${newDate}T${newTime}:00`).toISOString();
    rescheduleMutation.mutate({ id: reschedulingApp.id, startTime: combinedIso });
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
            <Clock className="w-3 h-3" /> Pendiente de Aprobación
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle className="w-3 h-3" /> Completado
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <AlertTriangle className="w-3 h-3" /> Ausente
          </span>
        );
      case 'CANCELLED_BY_CUSTOMER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Cancelado por vos
          </span>
        );
      case 'CANCELLED_BY_BUSINESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Cancelado por el local
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

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium mr-2"
          >
            <ArrowLeft className="w-4 h-4" /> Inicio
          </Link>
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
              V
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white">Voko</span>
              <span className="text-xs text-indigo-400 ml-2 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 font-medium">
                Área de Clientes
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60 transition-all flex items-center gap-1.5"
          >
            Panel de Negocio <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 lg:px-8 py-8">
        {/* Profile Card Banner */}
        <section className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800/80 rounded-2xl p-6 lg:p-8 mb-8 relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-2xl shadow-inner">
                {profile?.firstName ? profile.firstName[0].toUpperCase() : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    {profile?.fullName || 'Bienvenido a tu cuenta'}
                  </h1>
                  {profile?.emailVerified && (
                    <span title="Email Verificado" className="text-emerald-400">
                      <ShieldCheck className="w-5 h-5" />
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {profile?.email || 'usuario@voko.test'}
                  </span>
                  {profile?.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      {profile.phone}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex-1 sm:flex-initial bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-xl text-center">
                <span className="text-xl font-bold text-indigo-400">
                  {profile?.stats?.upcomingCount ?? upcomingAppointments.length}
                </span>
                <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Próximos
                </span>
              </div>
              <div className="flex-1 sm:flex-initial bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-xl text-center">
                <span className="text-xl font-bold text-emerald-400">
                  {profile?.stats?.completedCount ?? pastAppointments.filter(a => a.status === 'COMPLETED').length}
                </span>
                <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Completados
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'upcoming'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" /> Próximas Reservas
            {upcomingAppointments.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-500/20 text-indigo-300">
                {upcomingAppointments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" /> Historial de Turnos
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" /> Mi Perfil y Datos
          </button>
        </div>

        {/* TAB 1: Próximas Reservas */}
        {activeTab === 'upcoming' && (
          <section className="space-y-4">
            {isLoadingUpcoming ? (
              <div className="flex items-center justify-center p-16 text-slate-400 gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                Cargando reservas programadas...
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto mb-4 text-slate-500">
                  <Calendar className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  No tenés turnos programados
                </h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                  Cuando reserves una cita o clase en cualquier local de Voko, tus reservas aparecerán aquí con opciones de gestión.
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Sparkles className="w-4 h-4" /> Explorar Locales
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingAppointments.map((app) => (
                  <div
                    key={app.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-0.5">
                            {app.businessName}
                          </span>
                          <h3 className="text-lg font-bold text-white tracking-tight">
                            {app.serviceName}
                          </h3>
                        </div>
                        {getStatusBadge(app.status)}
                      </div>

                      <div className="space-y-2 text-sm text-slate-300 my-4 border-y border-slate-800/80 py-3">
                        <div className="flex items-center gap-2.5">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span className="capitalize">{formatDate(app.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <User className="w-4 h-4 text-slate-500" />
                          <span>Especialista: {app.resourceName}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-4 h-4 text-slate-500" />
                          <span>{app.branchName} {app.branchAddress ? `(${app.branchAddress})` : ''}</span>
                        </div>
                        {app.snapshotPrice !== undefined && (
                          <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                            <span className="font-semibold text-slate-300">
                              Importe: {app.snapshotCurrency} ${app.snapshotPrice.toLocaleString('es-AR')}
                            </span>
                            <span>• {app.snapshotDurationMinutes} min</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      {app.canCancelOrReschedule ? (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={() => {
                              setReschedulingApp(app);
                              setNewDate(app.startTime.slice(0, 10));
                              setRescheduleError(null);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/60"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Reprogramar
                          </button>
                          <button
                            onClick={() => {
                              setCancellingApp(app);
                              setCancelReason('');
                              setCancelError(null);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Cancelar
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">
                          Plazo de modificación expirado ({app.cancellationDeadlineMinutes}m de antelación requeridos)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: Historial de Turnos */}
        {activeTab === 'history' && (
          <section>
            {isLoadingPast ? (
              <div className="flex items-center justify-center p-16 text-slate-400 gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                Cargando historial de reservas...
              </div>
            ) : pastAppointments.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-400">
                <Clock className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                <h3 className="text-base font-semibold text-white mb-1">
                  Sin registros pasados
                </h3>
                <p className="text-sm">
                  Aquí figurarán los turnos completados, asistencias y cancelaciones históricas.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/60 text-slate-400 font-semibold text-xs border-b border-slate-800 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Fecha y Hora</th>
                        <th className="py-3.5 px-4">Local / Negocio</th>
                        <th className="py-3.5 px-4">Servicio</th>
                        <th className="py-3.5 px-4">Profesional</th>
                        <th className="py-3.5 px-4">Importe</th>
                        <th className="py-3.5 px-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-slate-300">
                      {pastAppointments.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-slate-200">
                            {formatDate(app.startTime)}
                          </td>
                          <td className="py-3.5 px-4 text-indigo-300 font-medium">
                            {app.businessName}
                          </td>
                          <td className="py-3.5 px-4 text-white">
                            {app.serviceName}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {app.resourceName}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs">
                            {app.snapshotPrice ? `${app.snapshotCurrency} $${app.snapshotPrice.toLocaleString('es-AR')}` : '-'}
                          </td>
                          <td className="py-3.5 px-4">
                            {getStatusBadge(app.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: Perfil y Datos */}
        {activeTab === 'profile' && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 max-w-2xl shadow-lg">
            <h2 className="text-lg font-bold text-white mb-1">
              Datos Personales y Contacto
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Actualizá tus datos para que los establecimientos puedan coordinar la atención y enviarte confirmaciones de reserva.
            </p>

            {profileSavedMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                Datos guardados exitosamente.
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProfileMutation.mutate({
                  firstName: profileFirstName,
                  lastName: profileLastName,
                  phone: profilePhone,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    value={profileFirstName}
                    onChange={(e) => setProfileFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Apellido
                  </label>
                  <input
                    type="text"
                    required
                    value={profileLastName}
                    onChange={(e) => setProfileLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Correo Electrónico (Principal)
                </label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                />
                <span className="text-xs text-slate-500 mt-1 block">
                  El email está vinculado a tu cuenta global de Voko.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Teléfono / WhatsApp de Contacto
                </label>
                <input
                  type="tel"
                  placeholder="+54 9 11 5555-1234"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {updateProfileMutation.isPending && (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  )}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      {/* Modal: Confirmar Cancelación */}
      {cancellingApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              ¿Cancelar esta reserva?
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Estás por cancelar tu turno de <strong className="text-white">{cancellingApp.serviceName}</strong> en {cancellingApp.businessName}. El horario quedará liberado inmediatamente.
            </p>

            {cancelError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {cancelError}
              </div>
            )}

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Motivo de cancelación (opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Compromiso imprevisto de trabajo"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCancellingApp(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2"
              >
                {cancelMutation.isPending && (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                )}
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reprogramar Reserva */}
      {reschedulingApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Reprogramar Turno
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Seleccioná una nueva fecha y hora para <strong className="text-white">{reschedulingApp.serviceName}</strong>.
            </p>

            {rescheduleError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {rescheduleError}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nueva Fecha
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nuevo Horario
                </label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="09:00">09:00 hs</option>
                  <option value="10:00">10:00 hs</option>
                  <option value="11:00">11:00 hs</option>
                  <option value="12:00">12:00 hs</option>
                  <option value="14:00">14:00 hs</option>
                  <option value="15:00">15:00 hs</option>
                  <option value="16:00">16:00 hs</option>
                  <option value="17:00">17:00 hs</option>
                  <option value="18:00">18:00 hs</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReschedulingApp(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                disabled={rescheduleMutation.isPending || !newDate}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
              >
                {rescheduleMutation.isPending && (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                )}
                Confirmar Cambio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
