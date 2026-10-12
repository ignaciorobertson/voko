import React, { useState } from 'react';
import { PublicBookResponse } from '../../../api/public.api.js';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  User,
  Copy,
  Check,
  CalendarPlus,
  RefreshCw,
  Home,
  Tag,
} from 'lucide-react';
import { AppointmentStatus } from '@voko/shared';
import { Link } from 'react-router-dom';

interface BookingSuccessViewProps {
  data: PublicBookResponse;
  businessName: string;
  onReset: () => void;
  primaryColor: string;
}

export const BookingSuccessView: React.FC<BookingSuccessViewProps> = ({
  data,
  businessName,
  onReset,
  primaryColor,
}) => {
  const [copied, setCopied] = useState(false);

  const startDate = parseISO(data.startTime);
  const endDate = parseISO(data.endTime);
  const formattedDate = format(startDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const formattedTime = format(startDate, 'HH:mm');
  const formattedEndTime = format(endDate, 'HH:mm');

  const isPending = data.status === AppointmentStatus.PENDING;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(data.confirmationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generador de enlace de Google Calendar
  const getGoogleCalendarUrl = () => {
    const title = encodeURIComponent(`${data.serviceName} en ${businessName}`);
    const details = encodeURIComponent(
      `Código de reserva: ${data.confirmationCode}\nTitular: ${data.customer.firstName} ${data.customer.lastName}`,
    );
    const location = encodeURIComponent(data.branchName || businessName);
    const startStr = format(startDate, "yyyyMMdd'T'HHmmss'Z'");
    const endStr = format(endDate, "yyyyMMdd'T'HHmmss'Z'");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
  };

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center shadow-sm relative overflow-hidden">
        {/* Glow behind check */}
        <div
          className="w-32 h-32 rounded-full absolute -top-10 left-1/2 -translate-x-1/2 opacity-15 blur-2xl pointer-events-none"
          style={{ backgroundColor: isPending ? '#F59E0B' : '#10B981' }}
        />

        <div
          className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 shadow-lg ${
            isPending ? 'bg-amber-500 shadow-amber-500/20' : 'bg-emerald-500 shadow-emerald-500/20'
          }`}
        >
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          {isPending ? '¡Solicitud de Reserva Recibida!' : '¡Reserva Confirmada con Éxito!'}
        </h2>

        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
          {isPending
            ? 'Tu turno quedó registrado y está pendiente de validación por parte del establecimiento. Te llegará un aviso con la confirmación final.'
            : 'Tu lugar ya está reservado. Guardá tu código de confirmación para presentar en el establecimiento.'}
        </p>

        {/* Confirmation Code Pill */}
        <div className="inline-flex items-center space-x-2 bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-2xl mt-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Código:
          </span>
          <span className="text-base font-black text-slate-900 tracking-wider">
            {data.confirmationCode}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-1 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
            title="Copiar código"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Recap Details Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Detalles de la Cita
        </h3>

        <div className="space-y-3 text-sm">
          <div className="flex items-center space-x-3 text-slate-700">
            <Tag className="w-4 h-4 text-slate-400" />
            <span className="font-medium">
              Servicio: <strong className="text-slate-900">{data.serviceName}</strong> (
              {data.durationMinutes} min)
            </span>
          </div>

          <div className="flex items-center space-x-3 text-slate-700">
            <User className="w-4 h-4 text-slate-400" />
            <span className="font-medium">
              Atención:{' '}
              <strong className="text-slate-900">
                {data.resourceName || 'Profesional asignado'}
              </strong>
            </span>
          </div>

          <div className="flex items-center space-x-3 text-slate-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-medium capitalize">
              Fecha: <strong className="text-slate-900">{formattedDate}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-3 text-slate-700">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="font-medium">
              Horario:{' '}
              <strong className="text-slate-900">
                {formattedTime} a {formattedEndTime} hs
              </strong>
            </span>
          </div>

          {data.branchName && (
            <div className="flex items-center space-x-3 text-slate-700">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="font-medium">
                Lugar: <strong className="text-slate-900">{data.branchName}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Titular: {data.customer.firstName} {data.customer.lastName}</span>
          <span>Total a pagar: <strong>${data.price.toLocaleString('es-AR')} {data.currency}</strong></span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <a
          href={getGoogleCalendarUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-sm transition-all"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Agregar a Google Calendar</span>
        </a>

        <button
          onClick={onReset}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold px-5 py-3 rounded-xl transition-all shadow-sm"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Hacer otra reserva</span>
        </button>

        <Link
          to="/"
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-slate-500 hover:text-slate-800 text-sm font-medium px-4 py-3 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Inicio Voko</span>
        </Link>
      </div>
    </div>
  );
};
