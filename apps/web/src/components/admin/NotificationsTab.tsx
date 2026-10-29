import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Send,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Bell,
  Eye,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Code,
  X,
} from 'lucide-react';
import {
  notificationsApi,
  NotificationItem,
  TemplatePreviewResponse,
} from '../../api/notifications.api.js';
import { NotificationChannel, NotificationStatus } from '@voko/shared';

interface NotificationsTabProps {
  businessId: string;
  businessName?: string;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  businessId,
  businessName = 'Tu Negocio',
}) => {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<NotificationStatus | 'ALL'>('ALL');
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | 'ALL'>('ALL');
  const [selectedPayload, setSelectedPayload] = useState<NotificationItem | null>(null);

  // Modal de Vista Previa de Plantilla
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewEventType, setPreviewEventType] = useState<
    'APPOINTMENT_CONFIRMED' | 'APPOINTMENT_CANCELLED' | 'APPOINTMENT_RESCHEDULED' | 'APPOINTMENT_REMINDER'
  >('APPOINTMENT_CONFIRMED');
  const [previewResult, setPreviewResult] = useState<TemplatePreviewResponse | null>(null);

  // Modal de Arquitectura info
  const [isArchInfoOpen, setIsArchInfoOpen] = useState(false);

  // Notificación flotante
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setTimeout(() => setAlertMessage(null), 4000);
  };

  // 1. Consultar métricas del Outbox
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['notificationsStats', businessId],
    queryFn: () => notificationsApi.getStats(businessId),
    enabled: !!businessId,
  });

  // 2. Consultar lista de notificaciones del negocio
  const {
    data: listData,
    isLoading: isLoadingList,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['notificationsList', businessId, statusFilter, channelFilter],
    queryFn: () =>
      notificationsApi.getNotifications(businessId, {
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        channel: channelFilter === 'ALL' ? undefined : channelFilter,
      }),
    enabled: !!businessId,
  });

  // Mutación: Despachar lote pendiente
  const dispatchBatchMutation = useMutation({
    mutationFn: () => notificationsApi.dispatchBatch(businessId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notificationsStats', businessId] });
      queryClient.invalidateQueries({ queryKey: ['notificationsList', businessId] });
      showAlert(`Lote procesado: ${data.sentCount} enviados, ${data.retryingCount} en reintento, ${data.failedCount} fallidos.`);
    },
    onError: (err: any) => {
      alert(`Error al despachar lote: ${err.message}`);
    },
  });

  // Mutación: Escanear recordatorios 24h
  const remindersMutation = useMutation({
    mutationFn: () => notificationsApi.dispatchReminders(businessId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notificationsStats', businessId] });
      queryClient.invalidateQueries({ queryKey: ['notificationsList', businessId] });
      showAlert(`Recordatorios: Se han encolado ${data.remindersCreated} recordatorios para las próximas 24 horas.`);
    },
    onError: (err: any) => {
      alert(`Error al generar recordatorios: ${err.message}`);
    },
  });

  // Mutación: Reintento manual
  const retryMutation = useMutation({
    mutationFn: (notifId: string) => notificationsApi.retryNotification(businessId, notifId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['notificationsStats', businessId] });
      queryClient.invalidateQueries({ queryKey: ['notificationsList', businessId] });
      showAlert(`Notificación ${res.id} reintentada con estado actual: ${res.status}.`);
    },
    onError: (err: any) => {
      alert(`Error en reintento: ${err.message}`);
    },
  });

  // Mutación: Generar vista previa de plantilla
  const previewMutation = useMutation({
    mutationFn: (eventType: any) =>
      notificationsApi.testPreview(businessId, {
        eventType,
        payload: {
          businessName,
          customerName: 'Lucas Paciente',
          serviceName: 'Consulta Médica de Especialidad',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          previousStartTime: new Date().toISOString(),
          branchName: 'Sede Central',
          branchAddress: 'Av. Libertador 4500',
          resourceName: 'Dr. Roberto Cardiólogo',
          price: 15000,
          currency: 'ARS',
          reason: 'Reprogramación solicitada por el paciente',
        },
      }),
    onSuccess: (data) => {
      setPreviewResult(data);
    },
  });

  const handleOpenPreview = (type: any) => {
    setPreviewEventType(type);
    setIsPreviewOpen(true);
    previewMutation.mutate(type);
  };

  return (
    <div className="space-y-6">
      {/* Mensaje de Feedback */}
      {alertMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{alertMessage}</span>
        </div>
      )}

      {/* Header y Acciones Rápidas */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Transactional Outbox & Notificaciones
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Hito 9 Activo
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Notificaciones internas, Transactional Outbox y automatizaciones nativas en NestJS + PostgreSQL
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenPreview('APPOINTMENT_CONFIRMED')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            Plantillas Email
          </button>
          <button
            onClick={() => setIsArchInfoOpen(true)}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Arquitectura Lean
          </button>
          <button
            disabled={remindersMutation.isPending}
            onClick={() => remindersMutation.mutate()}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            {remindersMutation.isPending ? 'Escaneando...' : 'Recordatorios 24h'}
          </button>
          <button
            disabled={dispatchBatchMutation.isPending}
            onClick={() => dispatchBatchMutation.mutate()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {dispatchBatchMutation.isPending ? 'Despachando...' : 'Procesar Cola Outbox'}
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas del Outbox */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-2xs font-bold uppercase tracking-wider block mb-1">Total Encoladas</span>
          <p className="text-2xl font-black text-slate-900">{stats?.total || 0}</p>
          <span className="text-2xs text-slate-400 mt-1 block">Historial del Outbox</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-emerald-600 text-2xs font-bold uppercase tracking-wider block mb-1">Entregadas (SENT)</span>
          <p className="text-2xl font-black text-emerald-600">{stats?.sent || 0}</p>
          <span className="text-2xs text-emerald-600/80 font-semibold mt-1 block">{stats?.deliverySuccessRate || 100}% éxito</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-amber-600 text-2xs font-bold uppercase tracking-wider block mb-1">Pendientes (PENDING)</span>
          <p className="text-2xl font-black text-amber-600">{stats?.pending || 0}</p>
          <span className="text-2xs text-slate-400 mt-1 block">Listas para despacho</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-indigo-600 text-2xs font-bold uppercase tracking-wider block mb-1">En Reintento (RETRY)</span>
          <p className="text-2xl font-black text-indigo-600">{stats?.retrying || 0}</p>
          <span className="text-2xs text-slate-400 mt-1 block">Backoff exponencial</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-rose-600 text-2xs font-bold uppercase tracking-wider block mb-1">Fallidas (FAILED)</span>
          <p className="text-2xl font-black text-rose-600">{stats?.failed || 0}</p>
          <span className="text-2xs text-slate-400 mt-1 block">Excedieron reintentos</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-emerald-600 text-2xs font-bold uppercase tracking-wider block mb-1">Notificaciones Internas</span>
          <p className="text-2xl font-black text-emerald-600">{stats?.byChannel?.inApp || 0}</p>
          <span className="text-2xs text-slate-400 mt-1 block">In-App activas</span>
        </div>
      </div>

      {/* Filtros de la Tabla */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-200 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
          <span className="text-slate-400 font-bold uppercase text-2xs ml-1">Filtrar por:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todos los Estados</option>
            <option value={NotificationStatus.PENDING}>Pendientes (PENDING)</option>
            <option value={NotificationStatus.SENT}>Entregadas (SENT)</option>
            <option value={NotificationStatus.RETRYING}>En Reintento (RETRYING)</option>
            <option value={NotificationStatus.FAILED}>Fallidas (FAILED)</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todos los Canales</option>
            <option value={NotificationChannel.IN_APP}>Notificaciones Internas (IN_APP)</option>
            <option value={NotificationChannel.EMAIL}>Correo Electrónico (EMAIL)</option>
          </select>
        </div>

        <button
          onClick={() => {
            refetchStats();
            refetchList();
          }}
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          title="Actualizar tabla"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabla del Outbox */}
      {isLoadingList ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-3xl border border-slate-200">
          Cargando cola de notificaciones...
        </div>
      ) : listData?.items.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 space-y-2">
          <Mail className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-600">No hay notificaciones en la cola con los filtros seleccionados</p>
          <p className="text-xs text-slate-400">Las reservas realizadas se encolarán de manera atómica automáticamente.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-2xs tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fecha Encolado</th>
                  <th className="py-3 px-4">Destinatario</th>
                  <th className="py-3 px-4">Evento</th>
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Reintentos</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {listData?.items.map((notif) => {
                  const isSent = notif.status === NotificationStatus.SENT;
                  const isRetrying = notif.status === NotificationStatus.RETRYING;
                  const isFailed = notif.status === NotificationStatus.FAILED;

                  return (
                    <tr key={notif.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-2xs text-slate-500 whitespace-nowrap">
                        {new Date(notif.createdAt).toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{notif.recipientEmail}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-mono text-2xs bg-slate-100 text-slate-700 border border-slate-200">
                          {notif.eventType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 font-semibold text-slate-600">
                          {notif.channel === NotificationChannel.EMAIL ? (
                            <>
                              <Mail className="w-3.5 h-3.5 text-blue-600" />
                              Email
                            </>
                          ) : (
                            <>
                              <Bell className="w-3.5 h-3.5 text-emerald-600" />
                              Interna
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isSent && (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            Entregado
                          </span>
                        )}
                        {isRetrying && (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 w-fit">
                            <RotateCcw className="w-3 h-3" />
                            Reintento ({notif.retryCount})
                          </span>
                        )}
                        {isFailed && (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" />
                            Fallido
                          </span>
                        )}
                        {notif.status === NotificationStatus.PENDING && (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" />
                            En Cola
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-2xs">
                        {notif.retryCount > 0 ? (
                          <span className="font-bold text-indigo-600">{notif.retryCount} reintento(s)</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                        {notif.lastError && (
                          <span className="block text-rose-500 truncate max-w-xs" title={notif.lastError}>
                            {notif.lastError}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedPayload(notif)}
                            className="px-2 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-2xs font-bold transition-colors"
                            title="Ver datos del payload"
                          >
                            Payload
                          </button>
                          {(isFailed || isRetrying) && (
                            <button
                              disabled={retryMutation.isPending}
                              onClick={() => retryMutation.mutate(notif.id)}
                              className="px-2 py-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-2xs font-bold transition-colors"
                              title="Reintentar ahora"
                            >
                              Reintentar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: INSPECCIONAR PAYLOAD */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Payload de Notificación</h3>
              </div>
              <button
                onClick={() => setSelectedPayload(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <p>
                <strong>ID:</strong> <code className="text-indigo-600 font-mono">{selectedPayload.id}</code>
              </p>
              <p>
                <strong>Evento:</strong> <code className="text-slate-800 font-mono">{selectedPayload.eventType}</code>
              </p>
              <p>
                <strong>Destinatario:</strong> {selectedPayload.recipientEmail}
              </p>
              {selectedPayload.lastError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-2xs">
                  <strong>Último Error:</strong> {selectedPayload.lastError}
                </div>
              )}

              <div>
                <span className="block font-bold text-slate-700 mb-1">Cuerpo JSON persistido en Outbox:</span>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto text-2xs max-h-56">
                  {JSON.stringify(selectedPayload.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VISTA PREVIA DE PLANTILLAS */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Vista Previa de Plantillas de Correo</h3>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de plantilla */}
            <div className="flex flex-wrap gap-2">
              {[
                { type: 'APPOINTMENT_CONFIRMED', label: '1. Confirmación' },
                { type: 'APPOINTMENT_CANCELLED', label: '2. Cancelación' },
                { type: 'APPOINTMENT_RESCHEDULED', label: '3. Reprogramación' },
                { type: 'APPOINTMENT_REMINDER', label: '4. Recordatorio 24h' },
              ].map((t) => (
                <button
                  key={t.type}
                  onClick={() => handleOpenPreview(t.type as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    previewEventType === t.type
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {previewMutation.isPending || !previewResult ? (
              <div className="p-8 text-center text-slate-400 text-xs">Renderizando plantilla...</div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <p>
                    <strong>Asunto:</strong> <span className="text-slate-800">{previewResult.subject}</span>
                  </p>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div
                    className="p-4 bg-slate-50 max-h-96 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: previewResult.html }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INFORMACIÓN DE ARQUITECTURA LEAN */}
      {isArchInfoOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Arquitectura Lean y Notificaciones Internas</h3>
              </div>
              <button
                onClick={() => setIsArchInfoOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-slate-600 leading-relaxed">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Plataforma SaaS Autónoma (Costo Cero en Servicios Obligatorios)</p>
                  <p className="text-2xs text-emerald-700">
                    Voko opera sin servidores externos de automatización ni dependencias de pago. Las notificaciones de reservas, cancelaciones y reprogramaciones se gestionan de forma nativa e interna.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">1. Notificaciones Internas (In-App)</h4>
                <p className="text-2xs text-slate-500 mb-2">
                  Cada cambio de estado en un turno genera alertas para clientes y profesionales directamente en la interfaz (campana con badge y lista de no leídas), persistidas en PostgreSQL.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">2. Automatizaciones Nativas (NestJS + PostgreSQL)</h4>
                <p className="text-2xs text-slate-500">
                  Los procesos programados (como el escaneo de turnos de las próximas 24 horas para recordatorios) se ejecutan con NestJS Scheduler y control de concurrencia e idempotencia en PostgreSQL, garantizando supervivencia ante reinicios del backend sin requerir Redis ni BullMQ.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsArchInfoOpen(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
