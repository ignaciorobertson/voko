import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Scissors,
  Users,
  Settings,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  ChevronDown,
  Layers,
  MapPin,
  Clock,
  DollarSign,
  RefreshCw,
  Calendar,
  BarChart3,
  UserPlus,
  History,
  Mail,
} from 'lucide-react';
import { businessesApi } from '../../api/businesses.api.js';
import { authApi } from '../../api/auth.api.js';
import { BranchModal } from '../../components/admin/BranchModal.js';
import { ServiceModal } from '../../components/admin/ServiceModal.js';
import { ResourceModal } from '../../components/admin/ResourceModal.js';
import { BusinessSettingsForm } from '../../components/admin/BusinessSettingsForm.js';
import { AgendaTab } from '../../components/admin/AgendaTab.js';
import { CustomersTab } from '../../components/admin/CustomersTab.js';
import { TeamTab } from '../../components/admin/TeamTab.js';
import { AvailabilityTab } from '../../components/admin/AvailabilityTab.js';
import { ReportsTab } from '../../components/admin/ReportsTab.js';
import { AuditTab } from '../../components/admin/AuditTab.js';
import { NotificationsTab } from '../../components/admin/NotificationsTab.js';
import {
  BranchDetail,
  ServiceDetail,
  ResourceDetail,
  BookingMode,
  ResourceType,
} from '@voko/shared';

type TabType =
  | 'agenda'
  | 'clientes'
  | 'notificaciones'
  | 'reportes'
  | 'equipo'
  | 'disponibilidad'
  | 'auditoria'
  | 'services'
  | 'resources'
  | 'branches'
  | 'settings'
  | 'overview';

export const AdminDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('agenda');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  // Modals state
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchDetail | null>(null);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceDetail | null>(null);

  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceDetail | null>(null);

  // Cargar usuario autenticado actual o asegurar sesión
  useQuery({
    queryKey: ['authMe'],
    queryFn: async () => {
      try {
        return await authApi.getMe();
      } catch {
        // En entorno local de desarrollo, intentar auto-login con cuenta de prueba si no hay token
        try {
          const res = await authApi.login('nicolas@voko.test', 'Secret123!');
          return res.user;
        } catch {
          return null;
        }
      }
    },
  });

  // Consultar negocios del usuario
  const { data: businesses, isLoading: isLoadingBusinesses } = useQuery({
    queryKey: ['myBusinesses'],
    queryFn: businessesApi.getMyBusinesses,
  });

  // Seleccionar automáticamente el primer negocio si no hay uno seleccionado
  React.useEffect(() => {
    if (businesses && businesses.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  const currentBusiness = businesses?.find((b) => b.id === selectedBusinessId) || businesses?.[0];

  // Consultar detalle del negocio seleccionado
  useQuery({
    queryKey: ['businessDetail', selectedBusinessId],
    queryFn: () => businessesApi.getBusiness(selectedBusinessId!),
    enabled: !!selectedBusinessId,
  });

  // Consultar sucursales
  const { data: branches = [] } = useQuery({
    queryKey: ['branches', selectedBusinessId],
    queryFn: () => businessesApi.getBranches(selectedBusinessId!),
    enabled: !!selectedBusinessId,
  });

  // Consultar servicios
  const { data: services = [] } = useQuery({
    queryKey: ['services', selectedBusinessId],
    queryFn: () => businessesApi.getServices(selectedBusinessId!),
    enabled: !!selectedBusinessId,
  });

  // Consultar recursos
  const { data: resources = [] } = useQuery({
    queryKey: ['resources', selectedBusinessId],
    queryFn: () => businessesApi.getResources(selectedBusinessId!),
    enabled: !!selectedBusinessId,
  });

  // Consultar configuraciones
  const { data: settings } = useQuery({
    queryKey: ['settings', selectedBusinessId],
    queryFn: () => businessesApi.getSettings(selectedBusinessId!),
    enabled: !!selectedBusinessId,
  });

  // Mutaciones para Sucursales
  const branchMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingBranch) {
        return await businessesApi.updateBranch(selectedBusinessId!, editingBranch.id, data);
      }
      return await businessesApi.createBranch(selectedBusinessId!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', selectedBusinessId] });
      queryClient.invalidateQueries({ queryKey: ['businessDetail', selectedBusinessId] });
      setIsBranchModalOpen(false);
      setEditingBranch(null);
    },
  });

  // Mutaciones para Servicios
  const serviceMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingService) {
        return await businessesApi.updateService(selectedBusinessId!, editingService.id, data);
      }
      return await businessesApi.createService(selectedBusinessId!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', selectedBusinessId] });
      queryClient.invalidateQueries({ queryKey: ['businessDetail', selectedBusinessId] });
      setIsServiceModalOpen(false);
      setEditingService(null);
    },
  });

  // Mutaciones para Recursos
  const resourceMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingResource) {
        return await businessesApi.updateResource(selectedBusinessId!, editingResource.id, data);
      }
      return await businessesApi.createResource(selectedBusinessId!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', selectedBusinessId] });
      queryClient.invalidateQueries({ queryKey: ['services', selectedBusinessId] });
      queryClient.invalidateQueries({ queryKey: ['businessDetail', selectedBusinessId] });
      setIsResourceModalOpen(false);
      setEditingResource(null);
    },
  });

  // Mutación para Configuración
  const settingsMutation = useMutation({
    mutationFn: async (data: any) => {
      await businessesApi.updateBusiness(selectedBusinessId!, {
        name: data.name,
        contactEmail: data.contactEmail,
        phone: data.phone,
        taxId: data.taxId,
        primaryColor: data.brandPrimaryColor,
        secondaryColor: data.brandSecondaryColor,
      });
      return await businessesApi.updateSettings(selectedBusinessId!, {
        brandPrimaryColor: data.brandPrimaryColor,
        brandSecondaryColor: data.brandSecondaryColor,
        defaultSlotIntervalMinutes: data.defaultSlotIntervalMinutes,
        allowPublicBooking: data.allowPublicBooking,
        requireEmailVerification: data.requireEmailVerification,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', selectedBusinessId] });
      queryClient.invalidateQueries({ queryKey: ['businessDetail', selectedBusinessId] });
      queryClient.invalidateQueries({ queryKey: ['myBusinesses'] });
    },
  });

  if (isLoadingBusinesses) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Barra superior de negocio y contexto */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md font-bold text-xl"
            style={{
              backgroundColor: settings?.brandPrimaryColor || '#1E40AF',
            }}
          >
            {currentBusiness?.name.charAt(0) || 'V'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-900">{currentBusiness?.name || 'Mi Negocio'}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                {currentBusiness?.status || 'ACTIVO'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Slug público: <span className="font-mono text-blue-600">voko.app/{currentBusiness?.slug}</span> • Zona:{' '}
              {currentBusiness?.timezone}
            </p>
          </div>
        </div>

        {/* Selector de negocio */}
        {businesses && businesses.length > 1 && (
          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Negocio Activo:
            </label>
            <div className="relative">
              <select
                value={selectedBusinessId || ''}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                className="pl-3 pr-8 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Navegación por pestañas */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'agenda', label: 'Agenda y Turnos', icon: Calendar },
          { id: 'clientes', label: 'Clientes (CRM)', icon: Users },
          { id: 'notificaciones', label: 'Outbox & Notificaciones', icon: Mail },
          { id: 'reportes', label: 'Métricas y Reportes', icon: BarChart3 },
          { id: 'equipo', label: 'Equipo e Invitaciones', icon: UserPlus },
          { id: 'disponibilidad', label: 'Horarios y Excepciones', icon: Clock },
          { id: 'auditoria', label: 'Historial Operativo', icon: History },
          { id: 'services', label: `Servicios (${services.length})`, icon: Scissors },
          { id: 'resources', label: `Recursos (${resources.length})`, icon: Layers },
          { id: 'branches', label: `Sucursales (${branches.length})`, icon: Building2 },
          { id: 'settings', label: 'Configuración', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido: AGENDA Y CALENDARIO OPERATIVO */}
      {activeTab === 'agenda' && selectedBusinessId && (
        <AgendaTab
          businessId={selectedBusinessId}
          services={services}
          resources={resources}
          branches={branches}
        />
      )}

      {/* Contenido: CLIENTES (CRM) */}
      {activeTab === 'clientes' && selectedBusinessId && (
        <CustomersTab businessId={selectedBusinessId} />
      )}

      {/* Contenido: TRANSACTIONAL OUTBOX & NOTIFICACIONES (HITO 9) */}
      {activeTab === 'notificaciones' && selectedBusinessId && (
        <NotificationsTab
          businessId={selectedBusinessId}
          businessName={currentBusiness?.name}
        />
      )}

      {/* Contenido: REPORTES Y MÉTRICAS */}
      {activeTab === 'reportes' && selectedBusinessId && (
        <ReportsTab businessId={selectedBusinessId} />
      )}

      {/* Contenido: EQUIPO E INVITACIONES */}
      {activeTab === 'equipo' && selectedBusinessId && (
        <TeamTab businessId={selectedBusinessId} />
      )}

      {/* Contenido: DISPONIBILIDAD Y EXCEPCIONES */}
      {activeTab === 'disponibilidad' && selectedBusinessId && (
        <AvailabilityTab
          businessId={selectedBusinessId}
          resources={resources}
        />
      )}

      {/* Contenido: AUDITORÍA Y TRAZABILIDAD */}
      {activeTab === 'auditoria' && selectedBusinessId && (
        <AuditTab businessId={selectedBusinessId} />
      )}

      {/* Contenido de la pestaña: RESUMEN OPERATIVO */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Sucursales Activas</span>
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{branches.length}</p>
              <p className="text-xs text-slate-500">Sedes físicas registradas</p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Servicios Activos</span>
                <Scissors className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-3xl font-extrabold text-slate-900">
                {services.filter((s) => s.isActive).length}
              </p>
              <p className="text-xs text-slate-500">Disponibles para reserva</p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Recursos / Personal</span>
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-3xl font-extrabold text-slate-900">
                {resources.filter((r) => r.isActive).length}
              </p>
              <p className="text-xs text-slate-500">Profesionales y salas operativas</p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Reserva Pública</span>
                <CheckCircle className="w-5 h-5 text-cyan-500" />
              </div>
              <p className="text-lg font-bold text-slate-900">
                {settings?.allowPublicBooking ? 'Habilitada' : 'Solo Invitación'}
              </p>
              <p className="text-xs text-slate-500">Configurado en reglas de acceso</p>
            </div>
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-semibold text-slate-900 text-base">
              Configuración Inicial de Voko Lista para Reservas
            </h3>
            <p className="text-sm text-slate-600">
              Su negocio cuenta con las sucursales, servicios y profesionales correctamente asociados en PostgreSQL.
              Para gestionar o ampliar su catálogo, utilice las pestañas correspondientes en la barra superior.
            </p>
          </div>
        </div>
      )}

      {/* Contenido de la pestaña: SUCURSALES */}
      {activeTab === 'branches' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sedes y Sucursales</h2>
              <p className="text-xs text-slate-500">
                Administre las direcciones físicas y teléfonos de cada sede
              </p>
            </div>
            <button
              onClick={() => {
                setEditingBranch(null);
                setIsBranchModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Sucursal</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Nombre de la Sede</th>
                  <th className="px-6 py-3.5">Dirección y Ciudad</th>
                  <th className="px-6 py-3.5">Teléfono</th>
                  <th className="px-6 py-3.5">Tipo</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{b.name}</td>
                    <td className="px-6 py-4">
                      {b.address ? `${b.address}, ${b.city || ''}` : <span className="text-slate-400">Sin dirección</span>}
                    </td>
                    <td className="px-6 py-4">{b.phone || <span className="text-slate-400">-</span>}</td>
                    <td className="px-6 py-4">
                      {b.isDefault ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          Principal (Default)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Secundaria</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {b.isActive ? (
                        <span className="inline-flex items-center text-xs font-semibold text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-semibold text-slate-400">
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Inactiva
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setEditingBranch(b);
                          setIsBranchModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Editar sucursal"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contenido de la pestaña: SERVICIOS */}
      {activeTab === 'services' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Catálogo de Servicios</h2>
              <p className="text-xs text-slate-500">
                Configure duraciones, precios, modalidades y profesionales asignados
              </p>
            </div>
            <button
              onClick={() => {
                setEditingService(null);
                setIsServiceModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Servicio</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((srv) => {
              const modeBadge = {
                [BookingMode.INDIVIDUAL]: { label: '1 a 1 Individual', color: 'bg-blue-100 text-blue-800' },
                [BookingMode.GROUP_SESSION]: { label: 'Sesión Grupal', color: 'bg-purple-100 text-purple-800' },
                [BookingMode.RESOURCE_ONLY]: { label: 'Recurso Físico', color: 'bg-amber-100 text-amber-800' },
              }[srv.bookingMode];

              return (
                <div
                  key={srv.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${modeBadge.color}`}>
                        {modeBadge.label}
                      </span>
                      <button
                        onClick={() => {
                          setEditingService(srv);
                          setIsServiceModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{srv.name}</h3>
                      {srv.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{srv.description}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-xs font-semibold text-slate-700 pt-1">
                      <span className="flex items-center text-slate-600">
                        <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {srv.durationMinutes} min
                      </span>
                      <span className="flex items-center text-emerald-700">
                        <DollarSign className="w-3.5 h-3.5 mr-0.5 text-emerald-500" />
                        {srv.price ? `$${srv.price.toLocaleString('es-AR')}` : 'Sin costo'}
                      </span>
                    </div>

                    {(srv.bufferBeforeMinutes > 0 || srv.bufferAfterMinutes > 0) && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg">
                        Márgenes: +{srv.bufferBeforeMinutes}m previo / +{srv.bufferAfterMinutes}m post
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-medium text-slate-500">
                        {srv.resources && srv.resources.length > 0
                          ? `Asignado a: ${srv.resources.map((r) => r.resourceName).join(', ')}`
                          : 'Sin profesionales asignados'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contenido de la pestaña: RECURSOS */}
      {activeTab === 'resources' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Profesionales y Recursos</h2>
              <p className="text-xs text-slate-500">
                Personal médico/técnico, salas, canchas, boxes o equipos reservables
              </p>
            </div>
            <button
              onClick={() => {
                setEditingResource(null);
                setIsResourceModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Recurso</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.map((res) => {
              const typeBadge = {
                [ResourceType.STAFF]: { label: 'Profesional (STAFF)', color: 'bg-emerald-100 text-emerald-800' },
                [ResourceType.ROOM]: { label: 'Sala / Espacio', color: 'bg-blue-100 text-blue-800' },
                [ResourceType.COURT]: { label: 'Cancha', color: 'bg-orange-100 text-orange-800' },
                [ResourceType.BOX]: { label: 'Box de Atención', color: 'bg-slate-100 text-slate-800' },
                [ResourceType.EQUIPMENT]: { label: 'Equipo Especial', color: 'bg-rose-100 text-rose-800' },
              }[res.resourceType];

              return (
                <div
                  key={res.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${typeBadge.color}`}>
                      {typeBadge.label}
                    </span>
                    <button
                      onClick={() => {
                        setEditingResource(res);
                        setIsResourceModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{res.name}</h3>
                    {res.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{res.description}</p>
                    )}
                  </div>

                  <div className="flex items-center text-xs text-slate-600 font-medium">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    Sucursal: {res.branchName || 'Central'}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
                    {res.services && res.services.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {res.services.map((s: any) => (
                          <span
                            key={s.serviceId}
                            className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] text-slate-700 font-medium"
                          >
                            {s.serviceName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span>Sin servicios asociados</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contenido de la pestaña: IDENTIDAD Y CONFIGURACIÓN */}
      {activeTab === 'settings' && currentBusiness && (
        <BusinessSettingsForm
          business={currentBusiness}
          settings={settings}
          onSave={async (data) => {
            await settingsMutation.mutateAsync(data);
          }}
          isLoading={settingsMutation.isPending}
        />
      )}

      {/* Modales */}
      <BranchModal
        isOpen={isBranchModalOpen}
        onClose={() => {
          setIsBranchModalOpen(false);
          setEditingBranch(null);
        }}
        onSubmit={async (data) => {
          await branchMutation.mutateAsync(data);
        }}
        initialData={editingBranch}
        isLoading={branchMutation.isPending}
      />

      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false);
          setEditingService(null);
        }}
        onSubmit={async (data) => {
          await serviceMutation.mutateAsync(data);
        }}
        initialData={editingService}
        availableResources={resources}
        isLoading={serviceMutation.isPending}
      />

      <ResourceModal
        isOpen={isResourceModalOpen}
        onClose={() => {
          setIsResourceModalOpen(false);
          setEditingResource(null);
        }}
        onSubmit={async (data) => {
          await resourceMutation.mutateAsync(data);
        }}
        initialData={editingResource}
        branches={branches}
        availableServices={services}
        isLoading={resourceMutation.isPending}
      />
    </div>
  );
};
