import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  Calendar,
  AlertCircle,
  XCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import {
  notificationsApi,
  InAppNotification,
} from '../../api/notifications.api.js';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Token de sesión
  const token = typeof window !== 'undefined' ? localStorage.getItem('voko_token') : null;

  // 1. Contador de no leídas (polling ligero cada 30s sólo si autenticado)
  const { data: countData } = useQuery({
    queryKey: ['inAppUnreadCount'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: Boolean(token),
    refetchInterval: token ? 30000 : false,
    retry: false,
  });

  // 2. Lista de notificaciones
  const { data: notifData, isLoading } = useQuery({
    queryKey: ['inAppNotifications', filterUnread],
    queryFn: () =>
      notificationsApi.getMyInAppNotifications({
        isRead: filterUnread ? false : undefined,
        limit: 20,
      }),
    enabled: isOpen && Boolean(token),
    retry: false,
  });

  // 3. Mutación: Marcar una como leída
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markInAppAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inAppUnreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['inAppNotifications'] });
    },
  });

  // 4. Mutación: Marcar todas como leídas
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllInAppAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inAppUnreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['inAppNotifications'] });
    },
  });

  const unreadCount = countData?.unreadCount || 0;
  const items = notifData?.items || [];

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'APPOINTMENT_CONFIRMED':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'APPOINTMENT_CANCELLED':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'APPOINTMENT_RESCHEDULED':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'APPOINTMENT_REMINDER':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-indigo-600" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} d`;
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de Campana */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-slate-100 transition-colors focus:outline-none"
        title="Centro de Notificaciones"
        aria-label="Centro de Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Cabecera */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 text-sm">Notificaciones</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 hover:underline transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar leídas
              </button>
            )}
          </div>

          {/* Filtros */}
          <div className="px-3 py-1.5 bg-white border-b border-slate-100 flex gap-2">
            <button
              onClick={() => setFilterUnread(false)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                !filterUnread ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterUnread(true)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterUnread ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              No leídas ({unreadCount})
            </button>
          </div>

          {/* Lista de Notificaciones */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-400">Cargando avisos...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium text-slate-500">
                  {filterUnread ? 'No tienes alertas pendientes' : 'No hay notificaciones registradas'}
                </p>
              </div>
            ) : (
              items.map((item: InAppNotification) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.isRead) {
                      markReadMutation.mutate(item.id);
                    }
                  }}
                  className={`p-3 text-left transition-colors cursor-pointer flex gap-3 items-start ${
                    item.isRead ? 'bg-white hover:bg-slate-50/80 opacity-75' : 'bg-blue-50/40 hover:bg-blue-50'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 bg-white rounded-lg shadow-xs border border-slate-200 shrink-0">
                    {getEventIcon(item.eventType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-semibold text-slate-900 truncate">{item.title}</p>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="No leída" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
