import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Users,
  Activity,
  History,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Lock,
  Unlock,
  UserCheck,
  FileText,
  DollarSign,
  TrendingUp,
  X,
  Filter,
  Eye,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  superadminApi,
  SuperadminBusinessItem,
  CreateBusinessSuperadminPayload,
} from '../../api/superadmin.api.js';
import { authApi } from '../../api/auth.api.js';
import { BusinessStatus, UserRole } from '@voko/shared';

type SuperadminTab = 'overview' | 'businesses' | 'users' | 'audit';

export const SuperadminDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SuperadminTab>('overview');

  // Filtros de Negocios
  const [businessSearch, setBusinessSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BusinessStatus | 'ALL'>('ALL');

  // Filtro de Usuarios
  const [userSearch, setUserSearch] = useState('');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDetailsId, setSelectedDetailsId] = useState<string | null>(null);
  const [statusModalBusiness, setStatusModalBusiness] = useState<SuperadminBusinessItem | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [assignAdminBusiness, setAssignAdminBusiness] = useState<SuperadminBusinessItem | null>(null);

  // Form State para Crear Negocio
  const [createForm, setCreateForm] = useState<CreateBusinessSuperadminPayload>({
    name: '',
    slug: '',
    industry: 'Salud y Medicina',
    contactEmail: '',
    phone: '',
    ownerEmail: '',
    ownerFirstName: '',
    ownerLastName: '',
    initialPassword: 'Password123!',
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Form State para Asignar Admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminRole, setAdminRole] = useState<UserRole>(UserRole.ADMIN);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Mensaje flotante de feedback
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // 1. Obtener usuario autenticado actual
  const { data: currentUser, refetch: refetchUser } = useQuery({
    queryKey: ['superadminAuthMe'],
    queryFn: async () => {
      try {
        return await authApi.getMe();
      } catch {
        return null;
      }
    },
  });

  // Mutación para Auto-Login como Superadmin en Demo
  const demoLoginMutation = useMutation({
    mutationFn: async (credentials: { email: string; pass: string }) => {
      return await authApi.login(credentials.email, credentials.pass);
    },
    onSuccess: () => {
      refetchUser();
      queryClient.invalidateQueries();
      showSuccess('Sesión iniciada con éxito con credenciales de Superadministrador.');
    },
    onError: (err: any) => {
      alert(`Error al iniciar sesión: ${err?.response?.data?.detail || err.message}`);
    },
  });

  const isSuperadmin = !!currentUser?.isSuperadmin;

  // 2. Query KPIs Overview
  const {
    data: overviewData,
    isLoading: isLoadingOverview,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['superadminOverview'],
    queryFn: superadminApi.getOverview,
    enabled: isSuperadmin,
  });

  // 3. Query Lista de Negocios
  const {
    data: businessesList = [],
    isLoading: isLoadingBusinesses,
  } = useQuery({
    queryKey: ['superadminBusinesses', businessSearch, statusFilter],
    queryFn: () =>
      superadminApi.listBusinesses({
        search: businessSearch || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    enabled: isSuperadmin,
  });

  // 4. Query Ficha Técnica de Negocio
  const { data: businessDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['superadminBusinessDetails', selectedDetailsId],
    queryFn: () => superadminApi.getBusinessDetails(selectedDetailsId!),
    enabled: isSuperadmin && !!selectedDetailsId,
  });

  // 5. Query Directorio de Usuarios
  const {
    data: usersList = [],
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['superadminUsers', userSearch],
    queryFn: () => superadminApi.listUsers(userSearch || undefined),
    enabled: isSuperadmin && activeTab === 'users',
  });

  // 6. Query Auditoría Global
  const {
    data: auditLogs = [],
    isLoading: isLoadingAudit,
    refetch: refetchAudit,
  } = useQuery({
    queryKey: ['superadminAudit'],
    queryFn: () => superadminApi.getAuditLogs(60),
    enabled: isSuperadmin && activeTab === 'audit',
  });

  // Mutación: Crear Negocio
  const createBusinessMutation = useMutation({
    mutationFn: superadminApi.createBusiness,
    onSuccess: (data) => {
      setIsCreateModalOpen(false);
      setCreateForm({
        name: '',
        slug: '',
        industry: 'Salud y Medicina',
        contactEmail: '',
        phone: '',
        ownerEmail: '',
        ownerFirstName: '',
        ownerLastName: '',
        initialPassword: 'Password123!',
      });
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ['superadminBusinesses'] });
      queryClient.invalidateQueries({ queryKey: ['superadminOverview'] });
      showSuccess(`Negocio '${data.business.name}' creado exitosamente.`);
    },
    onError: (err: any) => {
      setCreateError(err?.response?.data?.detail || err.message || 'Error al crear negocio');
    },
  });

  // Mutación: Cambiar Estado (Suspender / Reactivar)
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: BusinessStatus; reason?: string }) => {
      return await superadminApi.updateBusinessStatus(id, { status, reason });
    },
    onSuccess: (res) => {
      setStatusModalBusiness(null);
      setStatusReason('');
      queryClient.invalidateQueries({ queryKey: ['superadminBusinesses'] });
      queryClient.invalidateQueries({ queryKey: ['superadminOverview'] });
      showSuccess(res.message || 'Estado actualizado exitosamente.');
    },
    onError: (err: any) => {
      alert(`Error al actualizar estado: ${err?.response?.data?.detail || err.message}`);
    },
  });

  // Mutación: Asignar Administrador
  const assignAdminMutation = useMutation({
    mutationFn: async ({ businessId, payload }: { businessId: string; payload: any }) => {
      return await superadminApi.assignAdmin(businessId, payload);
    },
    onSuccess: (data) => {
      setAssignAdminBusiness(null);
      setAdminEmail('');
      setAdminFirstName('');
      setAdminLastName('');
      setAdminError(null);
      queryClient.invalidateQueries({ queryKey: ['superadminBusinesses'] });
      showSuccess(`Administrador ${data.email} asignado con rol ${data.role}.`);
    },
    onError: (err: any) => {
      setAdminError(err?.response?.data?.detail || err.message || 'Error al asignar administrador');
    },
  });

  // Mutación: Toggle Superadmin
  const toggleSuperadminMutation = useMutation({
    mutationFn: (userId: string) => superadminApi.toggleSuperadmin(userId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['superadminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['superadminOverview'] });
      showSuccess(res.message);
    },
    onError: (err: any) => {
      alert(`Operación denegada: ${err?.response?.data?.detail || err.message}`);
    },
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-16">
      {/* Toast Notificación */}
      {actionSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-semibold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Header Principal */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-white">Voko Global Ops</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Hito 8 Superadmin
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consola de control maestro, aprovisionamiento multiempresa y auditoría de plataforma
                </p>
              </div>
            </div>

            {/* Estado de Acceso & Demo Login */}
            <div className="flex items-center gap-3">
              {isSuperadmin ? (
                <div className="flex items-center gap-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div className="text-xs">
                    <p className="font-semibold text-slate-200">{currentUser.firstName} {currentUser.lastName}</p>
                    <p className="text-slate-400 font-mono">{currentUser.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-amber-950/60 border border-amber-800/50 rounded-xl p-2 px-3">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="text-xs mr-2">
                    <p className="text-amber-200 font-semibold">Sesión sin rol Superadmin</p>
                    <p className="text-amber-400/80">Inicie sesión con cuenta autorizada</p>
                  </div>
                  <button
                    onClick={() =>
                      demoLoginMutation.mutate({
                        email: 'admin@voko.app',
                        pass: 'Secret123!',
                      })
                    }
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
                  >
                    Login Superadmin
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex overflow-x-auto gap-2 mt-6 border-b border-slate-800 pb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all border-b-2 -mb-px ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <Activity className="w-4 h-4" />
              Visión Global
            </button>
            <button
              onClick={() => setActiveTab('businesses')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all border-b-2 -mb-px ${
                activeTab === 'businesses'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Red de Negocios
              {overviewData && (
                <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                  {overviewData.overview.totalBusinesses}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all border-b-2 -mb-px ${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <Users className="w-4 h-4" />
              Directorio de Usuarios
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all border-b-2 -mb-px ${
                activeTab === 'audit'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <History className="w-4 h-4" />
              Pista de Auditoría
            </button>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {!isSuperadmin ? (
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-10 text-center max-w-xl mx-auto mt-12 shadow-xl">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido a Superadministradores</h2>
            <p className="text-sm text-slate-400 mb-6">
              Esta sección está protegida bajo el criterio de seguridad de control de acceso global del Hito 8. Solamente usuarios con el flag <code className="text-amber-300 font-mono">isSuperadmin: true</code> pueden inspeccionar o modificar información agregada.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() =>
                  demoLoginMutation.mutate({
                    email: 'admin@voko.app',
                    pass: 'Secret123!',
                  })
                }
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:opacity-90 font-bold text-sm text-slate-950 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
              >
                Ingresar como Superadmin Demo (admin@voko.app)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* TAB 1: VISIÓN GLOBAL */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-white">Indicadores Clave de la Plataforma</h2>
                    <p className="text-xs text-slate-400">Resumen agregado en tiempo real sobre todos los negocios y reservas</p>
                  </div>
                  <button
                    onClick={() => refetchOverview()}
                    className="p-2 text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-xl transition-colors flex items-center gap-2 text-xs font-medium"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Actualizar KPIs
                  </button>
                </div>

                {isLoadingOverview ? (
                  <div className="p-12 text-center text-slate-400">Cargando métricas consolidadas...</div>
                ) : overviewData ? (
                  <>
                    {/* Top KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Negocios Registrados</span>
                          <Building2 className="w-5 h-5 text-indigo-400" />
                        </div>
                        <p className="text-3xl font-extrabold text-white">{overviewData.overview.totalBusinesses}</p>
                        <div className="mt-3 flex items-center gap-3 text-xs">
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            {overviewData.overview.activeBusinesses} Activos
                          </span>
                          {overviewData.overview.suspendedBusinesses > 0 && (
                            <span className="text-rose-400 font-semibold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                              {overviewData.overview.suspendedBusinesses} Suspendidos
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Usuarios Totales</span>
                          <Users className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-3xl font-extrabold text-white">{overviewData.overview.totalUsers}</p>
                        <div className="mt-3 text-xs text-slate-400">
                          <span className="text-indigo-400 font-semibold">{overviewData.overview.totalSuperadmins}</span> Superadministradores de plataforma
                        </div>
                      </div>

                      <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Turnos Globales</span>
                          <Calendar className="w-5 h-5 text-amber-400" />
                        </div>
                        <p className="text-3xl font-extrabold text-white">{overviewData.overview.totalAppointments}</p>
                        <div className="mt-3 text-xs text-slate-400">
                          <span className="text-emerald-400 font-semibold">{overviewData.overview.completedAppointments}</span> atendidos exitosamente
                        </div>
                      </div>

                      <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Volumen Transaccionado</span>
                          <DollarSign className="w-5 h-5 text-cyan-400" />
                        </div>
                        <p className="text-3xl font-extrabold text-white">
                          ${overviewData.overview.totalVolumeRevenue.toLocaleString('es-AR')}
                        </p>
                        <div className="mt-3 text-xs text-slate-400">
                          Moneda base: <span className="text-cyan-400 font-semibold">{overviewData.overview.currency}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gráficos y Distribución */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Desglose por Industrias */}
                      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-indigo-400" />
                          Distribución por Industrias
                        </h3>
                        {overviewData.industryBreakdown.length === 0 ? (
                          <p className="text-xs text-slate-500 py-6 text-center">No hay registros clasificados</p>
                        ) : (
                          <div className="space-y-3">
                            {overviewData.industryBreakdown.map((item, idx) => {
                              const pct = Math.round((item.count / overviewData.overview.totalBusinesses) * 100) || 0;
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-300 font-medium">{item.industry}</span>
                                    <span className="text-slate-400">{item.count} negocio(s) ({pct}%)</span>
                                  </div>
                                  <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                                      style={{ width: `${pct}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Estados de Citas */}
                      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          Salud Operativa de Turnos
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-400 mb-1">Completados</p>
                            <p className="text-xl font-bold text-emerald-400">
                              {overviewData.appointmentsStatusBreakdown.completed}
                            </p>
                          </div>
                          <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-400 mb-1">Pendientes/Conf.</p>
                            <p className="text-xl font-bold text-indigo-400">
                              {overviewData.appointmentsStatusBreakdown.pendingOrConfirmed}
                            </p>
                          </div>
                          <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-400 mb-1">Cancelados Clie.</p>
                            <p className="text-xl font-bold text-amber-400">
                              {overviewData.appointmentsStatusBreakdown.cancelledByCustomer}
                            </p>
                          </div>
                          <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-400 mb-1">No-Shows</p>
                            <p className="text-xl font-bold text-rose-400">
                              {overviewData.appointmentsStatusBreakdown.noShow}
                            </p>
                          </div>
                        </div>
                        <div className="mt-5 p-4 rounded-xl bg-slate-900/40 border border-slate-700/30 text-xs text-slate-400 flex items-center gap-3">
                          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                          <span>
                            El aislamiento multi-tenant garantiza que ningún negocio tenga acceso a los datos de otros participantes.
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* TAB 2: RED DE NEGOCIOS */}
            {activeTab === 'businesses' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">Negocios Registrados en la Red</h2>
                    <p className="text-xs text-slate-400">Gestión de estados, métricas agregadas y aprovisionamiento rápido</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Alta Rápida de Negocio
                    </button>
                  </div>
                </div>

                {/* Barra de Filtros */}
                <div className="flex flex-col sm:flex-row gap-3 bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, slug, industria o email de contacto..."
                      value={businessSearch}
                      onChange={(e) => setBusinessSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400 ml-2" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">Todos los Estados</option>
                      <option value={BusinessStatus.ACTIVE}>Activos (ACTIVE)</option>
                      <option value={BusinessStatus.SUSPENDED}>Suspendidos (SUSPENDED)</option>
                      <option value={BusinessStatus.PENDING_REVIEW}>En Revisión (PENDING_REVIEW)</option>
                    </select>
                  </div>
                </div>

                {/* Listado de Negocios */}
                {isLoadingBusinesses ? (
                  <div className="p-12 text-center text-slate-400">Cargando negocios...</div>
                ) : businessesList.length === 0 ? (
                  <div className="p-12 text-center bg-slate-800/40 border border-slate-700/40 rounded-2xl">
                    <Building2 className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-300">No se encontraron negocios</p>
                    <p className="text-xs text-slate-500 mt-1">Pruebe modificando los términos de búsqueda o filtros.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {businessesList.map((biz) => {
                      const isSuspended = biz.status === BusinessStatus.SUSPENDED;
                      return (
                        <div
                          key={biz.id}
                          className={`bg-slate-800/80 border rounded-2xl p-5 transition-all shadow-md hover:shadow-indigo-500/5 ${
                            isSuspended ? 'border-rose-900/50 bg-rose-950/10' : 'border-slate-700/70 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-3">
                                <h3 className="text-base font-bold text-white">{biz.name}</h3>
                                {isSuspended ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                    <XCircle className="w-3 h-3" />
                                    Suspendido
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Activo
                                  </span>
                                )}
                                <span className="text-xs px-2 py-0.5 rounded bg-slate-700/60 text-slate-300">
                                  {biz.industry}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                                <span className="flex items-center gap-1 text-indigo-400">
                                  slug: /{biz.slug}
                                  <a
                                    href={`/b/${biz.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:text-indigo-300 ml-0.5"
                                  >
                                    <ExternalLink className="w-3 h-3 inline" />
                                  </a>
                                </span>
                                <span>{biz.contactEmail}</span>
                                {biz.owner && (
                                  <span className="text-slate-300">
                                    Dueño: <strong className="text-white">{biz.owner.name}</strong> ({biz.owner.email})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Métricas y Acciones */}
                            <div className="flex flex-wrap items-center gap-4">
                              {/* Chips de métricas */}
                              <div className="flex items-center gap-2 text-xs bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-700/60">
                                <div>
                                  <span className="text-slate-400">Sucursales:</span>{' '}
                                  <strong className="text-white">{biz.metrics.branchesCount}</strong>
                                </div>
                                <span className="text-slate-600">|</span>
                                <div>
                                  <span className="text-slate-400">Servicios:</span>{' '}
                                  <strong className="text-white">{biz.metrics.servicesCount}</strong>
                                </div>
                                <span className="text-slate-600">|</span>
                                <div>
                                  <span className="text-slate-400">Recursos:</span>{' '}
                                  <strong className="text-white">{biz.metrics.resourcesCount}</strong>
                                </div>
                                <span className="text-slate-600">|</span>
                                <div>
                                  <span className="text-slate-400">Turnos:</span>{' '}
                                  <strong className="text-emerald-400">{biz.metrics.appointmentsCount}</strong>
                                </div>
                              </div>

                              {/* Botones */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedDetailsId(biz.id)}
                                  className="px-3 py-1.5 text-xs font-semibold bg-slate-700/80 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Ficha
                                </button>
                                <button
                                  onClick={() => setAssignAdminBusiness(biz)}
                                  className="px-3 py-1.5 text-xs font-semibold bg-slate-700/80 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                                  Asignar Admin
                                </button>
                                <button
                                  onClick={() => setStatusModalBusiness(biz)}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                                    isSuspended
                                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                                  }`}
                                >
                                  {isSuspended ? (
                                    <>
                                      <Unlock className="w-3.5 h-3.5" />
                                      Reactivar
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-3.5 h-3.5" />
                                      Suspender
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DIRECTORIO DE USUARIOS */}
            {activeTab === 'users' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-white">Directorio Global de Usuarios</h2>
                    <p className="text-xs text-slate-400">Control de privilegios y auditoría de accesos a nivel plataforma</p>
                  </div>
                  <button
                    onClick={() => refetchUsers()}
                    className="p-2 text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-xl transition-colors flex items-center gap-2 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Actualizar
                  </button>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar usuario por nombre o correo electrónico..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {isLoadingUsers ? (
                  <div className="p-12 text-center text-slate-400">Cargando directorio de usuarios...</div>
                ) : (
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold border-b border-slate-700/60">
                        <tr>
                          <th className="py-3 px-4">Usuario</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Membresías</th>
                          <th className="py-3 px-4">Rol Plataforma</th>
                          <th className="py-3 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/40 text-slate-300">
                        {usersList.map((u) => {
                          const isSelf = u.id === currentUser.id;
                          return (
                            <tr key={u.id} className="hover:bg-slate-750/30 transition-colors">
                              <td className="py-3 px-4 font-semibold text-white">
                                {u.firstName} {u.lastName}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-400">{u.email}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                                  {u.activeMembershipsCount} activa(s)
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {u.isSuperadmin ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit">
                                    <Shield className="w-3 h-3" />
                                    Superadmin
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs text-slate-400 bg-slate-700/50">
                                    Usuario Estándar
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  disabled={isSelf && u.isSuperadmin}
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        u.isSuperadmin
                                          ? `¿Está seguro de revocar permisos de Superadmin a ${u.email}?`
                                          : `¿Confirma conceder privilegios globales de Superadmin a ${u.email}?`,
                                      )
                                    ) {
                                      toggleSuperadminMutation.mutate(u.id);
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                                    isSelf && u.isSuperadmin
                                      ? 'opacity-40 cursor-not-allowed text-slate-500 bg-slate-800'
                                      : u.isSuperadmin
                                      ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                                      : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30'
                                  }`}
                                >
                                  {u.isSuperadmin ? 'Revocar Superadmin' : 'Hacer Superadmin'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PISTA DE AUDITORÍA GLOBAL */}
            {activeTab === 'audit' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-white">Registro de Auditoría de Plataforma (Audit Log)</h2>
                    <p className="text-xs text-slate-400">Trazabilidad inmutable de todas las acciones operativas realizadas</p>
                  </div>
                  <button
                    onClick={() => refetchAudit()}
                    className="p-2 text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-xl transition-colors flex items-center gap-2 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Actualizar Logs
                  </button>
                </div>

                {isLoadingAudit ? (
                  <div className="p-12 text-center text-slate-400">Cargando pistas de auditoría...</div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-12 text-center bg-slate-800/40 border border-slate-700/40 rounded-2xl text-slate-400">
                    No hay eventos de auditoría registrados aún.
                  </div>
                ) : (
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold border-b border-slate-700/60">
                          <tr>
                            <th className="py-3 px-4">Fecha y Hora</th>
                            <th className="py-3 px-4">Actor</th>
                            <th className="py-3 px-4">Acción</th>
                            <th className="py-3 px-4">Entidad</th>
                            <th className="py-3 px-4">Detalles / Metadata</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/40 text-slate-300">
                          {auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-750/30 transition-colors">
                              <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString('es-AR')}
                              </td>
                              <td className="py-3 px-4">
                                {log.actor ? (
                                  <div>
                                    <p className="font-semibold text-white">{log.actor.name}</p>
                                    <p className="text-slate-400 font-mono text-2xs">{log.actor.email}</p>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 italic">Sistema / Anónimo</span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono">
                                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-400">
                                {log.entityName}
                                {log.entityId && (
                                  <span className="block font-mono text-2xs text-slate-500 truncate max-w-[120px]">
                                    {log.entityId}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono text-2xs text-slate-400 max-w-xs truncate">
                                {log.diffData ? JSON.stringify(log.diffData) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL: ALTA RÁPIDA DE NEGOCIO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Alta de Nuevo Negocio (Superadmin)</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createBusinessMutation.mutate(createForm);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre Comercial del Negocio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Clínica Dental Vanguardia"
                  value={createForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)+/g, '');
                    setCreateForm({ ...createForm, name, slug });
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Slug URL (/b/:slug) *</label>
                  <input
                    type="text"
                    required
                    value={createForm.slug}
                    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Rubro / Industria</label>
                  <select
                    value={createForm.industry}
                    onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Salud y Medicina">Salud y Medicina</option>
                    <option value="Belleza y Estética">Belleza y Estética</option>
                    <option value="Deportes y Fitness">Deportes y Fitness</option>
                    <option value="Bienestar y Spa">Bienestar y Spa</option>
                    <option value="Servicios Profesionales">Servicios Profesionales</option>
                    <option value="Automotor y Técnica">Automotor y Técnica</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email de Contacto del Negocio *</label>
                  <input
                    type="email"
                    required
                    placeholder="contacto@empresa.com"
                    value={createForm.contactEmail}
                    onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="+54 9 11 1234-5678"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <p className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Datos del Primer Propietario (Owner)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      placeholder="Juan"
                      value={createForm.ownerFirstName}
                      onChange={(e) => setCreateForm({ ...createForm, ownerFirstName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Apellido *</label>
                    <input
                      type="text"
                      required
                      placeholder="Pérez"
                      value={createForm.ownerLastName}
                      onChange={(e) => setCreateForm({ ...createForm, ownerLastName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Email del Propietario *</label>
                    <input
                      type="email"
                      required
                      placeholder="juan.perez@empresa.com"
                      value={createForm.ownerEmail}
                      onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Contraseña Provisoria *</label>
                    <input
                      type="text"
                      required
                      value={createForm.initialPassword}
                      onChange={(e) => setCreateForm({ ...createForm, initialPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-amber-300 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createBusinessMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
                >
                  {createBusinessMutation.isPending ? 'Creando...' : 'Crear Negocio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR ESTADO (SUSPENDER / REACTIVAR) */}
      {statusModalBusiness && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {statusModalBusiness.status === BusinessStatus.SUSPENDED ? (
                  <Unlock className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Lock className="w-5 h-5 text-rose-400" />
                )}
                <h3 className="text-base font-bold text-white">
                  {statusModalBusiness.status === BusinessStatus.SUSPENDED
                    ? 'Reactivar Negocio'
                    : 'Suspender Negocio'}
                </h3>
              </div>
              <button
                onClick={() => setStatusModalBusiness(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                Negocio: <strong className="text-white">{statusModalBusiness.name}</strong>
              </p>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-slate-400">
                <ShieldCheck className="w-4 h-4 text-indigo-400 inline mr-1.5" />
                <strong>Garantía de integridad:</strong> La suspensión deshabilita el acceso público de reservas y el portal operativo, pero <em>conserva el 100%</em> de las sucursales, servicios, historial de turnos y datos sin ninguna pérdida.
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Motivo de Auditoría (opcional / justificación)
                </label>
                <textarea
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Ej: Auditoría preventiva de pagos, solicitud del titular o revisión comercial..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStatusModalBusiness(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({
                    id: statusModalBusiness.id,
                    status:
                      statusModalBusiness.status === BusinessStatus.SUSPENDED
                        ? BusinessStatus.ACTIVE
                        : BusinessStatus.SUSPENDED,
                    reason: statusReason || undefined,
                  })
                }
                className={`px-5 py-2 font-bold rounded-xl text-xs transition-colors ${
                  statusModalBusiness.status === BusinessStatus.SUSPENDED
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {statusMutation.isPending
                  ? 'Procesando...'
                  : statusModalBusiness.status === BusinessStatus.SUSPENDED
                  ? 'Confirmar Reactivación'
                  : 'Confirmar Suspensión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASIGNAR ADMINISTRADOR */}
      {assignAdminBusiness && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Asignar Administrador</h3>
              </div>
              <button
                onClick={() => setAssignAdminBusiness(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Negocio destino: <strong className="text-white">{assignAdminBusiness.name}</strong>
            </p>

            {adminError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                {adminError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                assignAdminMutation.mutate({
                  businessId: assignAdminBusiness.id,
                  payload: {
                    email: adminEmail,
                    firstName: adminFirstName || undefined,
                    lastName: adminLastName || undefined,
                    role: adminRole,
                  },
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email del Administrador *</label>
                <input
                  type="email"
                  required
                  placeholder="admin.sucursal@empresa.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Nombre</label>
                  <input
                    type="text"
                    placeholder="Mariana"
                    value={adminFirstName}
                    onChange={(e) => setAdminFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Apellido</label>
                  <input
                    type="text"
                    placeholder="López"
                    value={adminLastName}
                    onChange={(e) => setAdminLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Rol de Membresía</label>
                <select
                  value={adminRole}
                  onChange={(e) => setAdminRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={UserRole.ADMIN}>ADMIN (Administrador Operativo)</option>
                  <option value={UserRole.OWNER}>OWNER (Titular / Propietario)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssignAdminBusiness(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={assignAdminMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  {assignAdminMutation.isPending ? 'Asignando...' : 'Asignar Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FICHA TÉCNICA DETALLADA */}
      {selectedDetailsId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Ficha Técnica de Soporte</h3>
              </div>
              <button
                onClick={() => setSelectedDetailsId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingDetails || !businessDetails ? (
              <div className="p-8 text-center text-slate-400">Cargando ficha técnica del negocio...</div>
            ) : (
              <div className="space-y-4">
                {/* Resumen */}
                <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-1">
                  <div className="flex justify-between items-center">
                    <h4 className="text-base font-bold text-white">{businessDetails.business.name}</h4>
                    <span className="px-2 py-0.5 rounded font-mono text-xs bg-indigo-500/20 text-indigo-300">
                      ID: {businessDetails.business.id}
                    </span>
                  </div>
                  <p className="text-slate-400">
                    Slug: <strong className="text-slate-200">/{businessDetails.business.slug}</strong> • Rubro:{' '}
                    <strong className="text-slate-200">{businessDetails.business.industry}</strong>
                  </p>
                  <p className="text-slate-400">
                    Email de contacto: <strong className="text-slate-200">{businessDetails.business.contactEmail}</strong> • Moneda:{' '}
                    <strong className="text-slate-200">{businessDetails.business.currency}</strong>
                  </p>
                </div>

                {/* Estadísticas de Turnos */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/40">
                    <p className="text-slate-400 text-2xs">Total Citas</p>
                    <p className="text-base font-bold text-white">{businessDetails.stats.totalAppointments}</p>
                  </div>
                  <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/40">
                    <p className="text-slate-400 text-2xs">Completadas</p>
                    <p className="text-base font-bold text-emerald-400">{businessDetails.stats.completedAppointments}</p>
                  </div>
                  <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/40">
                    <p className="text-slate-400 text-2xs">Canceladas</p>
                    <p className="text-base font-bold text-amber-400">{businessDetails.stats.cancelledAppointments}</p>
                  </div>
                  <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/40">
                    <p className="text-slate-400 text-2xs">No-Shows</p>
                    <p className="text-base font-bold text-rose-400">{businessDetails.stats.noShowAppointments}</p>
                  </div>
                </div>

                {/* Sucursales */}
                <div>
                  <h5 className="font-bold text-slate-300 mb-2">Sucursales ({businessDetails.branches.length})</h5>
                  <div className="space-y-1.5">
                    {businessDetails.branches.map((b) => (
                      <div
                        key={b.id}
                        className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/30 flex justify-between items-center"
                      >
                        <span className="font-semibold text-white">{b.name}</span>
                        <span className="text-slate-400 font-mono text-2xs">{b.address || 'Sin dirección'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Servicios */}
                <div>
                  <h5 className="font-bold text-slate-300 mb-2">Servicios ({businessDetails.services.length})</h5>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {businessDetails.services.map((s) => (
                      <div
                        key={s.id}
                        className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/30 flex justify-between items-center"
                      >
                        <span className="text-slate-200">{s.name} ({s.durationMinutes} min)</span>
                        <span className="font-bold text-emerald-400">${s.price.toLocaleString('es-AR')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Miembros del Negocio */}
                <div>
                  <h5 className="font-bold text-slate-300 mb-2">Equipo / Miembros ({businessDetails.members.length})</h5>
                  <div className="space-y-1.5">
                    {businessDetails.members.map((m) => (
                      <div
                        key={m.id}
                        className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/30 flex justify-between items-center"
                      >
                        <div>
                          <span className="text-white font-medium">{m.name}</span>
                          <span className="text-slate-400 font-mono text-2xs ml-2">({m.email})</span>
                        </div>
                        <span className="px-2 py-0.5 rounded font-bold text-2xs uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setSelectedDetailsId(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperadminDashboardPage;
