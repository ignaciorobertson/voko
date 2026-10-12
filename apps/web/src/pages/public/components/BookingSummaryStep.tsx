import React from 'react';
import { PublicService, PublicResource, PublicSlot } from '../../../api/public.api.js';
import { CustomerFormData } from './CustomerFormStep.js';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  Loader2,
  Tag,
} from 'lucide-react';
import { ConfirmationMode } from '@voko/shared';

interface BookingSummaryStepProps {
  service: PublicService;
  resource: PublicResource | null;
  slot: PublicSlot;
  customer: CustomerFormData;
  businessName: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onBack: () => void;
  primaryColor: string;
}

export const BookingSummaryStep: React.FC<BookingSummaryStepProps> = ({
  service,
  resource,
  slot,
  customer,
  businessName,
  isSubmitting,
  errorMessage,
  onConfirm,
  onBack,
  primaryColor,
}) => {
  const startDate = parseISO(slot.startTime);
  const formattedDate = format(startDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const formattedTime = format(startDate, 'HH:mm');

  const isManualApproval = service.confirmationMode === ConfirmationMode.MANUAL_APPROVAL;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            5. Revisión y Confirmación
          </h2>
          <p className="text-sm text-slate-500">
            Verificá que todos los datos sean correctos antes de enviar la reserva.
          </p>
        </div>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={onBack}
          className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Editar datos</span>
        </button>
      </div>

      {/* Error Callout */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <div>
            <h4 className="text-sm font-bold">No se pudo completar la reserva</h4>
            <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Desglose Principal del Turno */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Establecimiento
            </span>
            <h3 className="text-lg font-bold text-slate-900">{businessName}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Servicio</p>
                <p className="font-bold text-slate-900">{service.name}</p>
                <p className="text-xs text-slate-500">{service.durationMinutes} minutos de duración</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Atención por</p>
                <p className="font-bold text-slate-900">
                  {resource ? resource.name : 'Cualquier profesional disponible'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Fecha</p>
                <p className="font-bold text-slate-900 capitalize">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Horario de Inicio</p>
                <p className="font-bold text-slate-900">{formattedTime} hs</p>
              </div>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="border-t border-slate-100 pt-5 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Titular de la Reserva
            </span>
            <div className="bg-slate-50 rounded-xl p-3.5 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900 text-sm">
                {customer.firstName} {customer.lastName}
              </p>
              <p className="text-slate-600">Email: {customer.email}</p>
              <p className="text-slate-600">Teléfono: {customer.phone}</p>
              {customer.notes && (
                <p className="text-slate-500 italic mt-1 pt-1 border-t border-slate-200/60">
                  Notas: "{customer.notes}"
                </p>
              )}
            </div>
          </div>

          {/* Política de Cancelación */}
          <div className="border-t border-slate-100 pt-4 flex items-center space-x-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              {service.cancellationDeadlineMinutes > 0
                ? `Cancelación sin cargo hasta ${Math.round(service.cancellationDeadlineMinutes / 60)} horas antes del turno.`
                : 'Podés gestionar tu turno en cualquier momento.'}
            </span>
          </div>
        </div>

        {/* Card Lateral de Pago / Confirmación */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total a Pagar en el Local
            </h4>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 text-center">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {service.price === 0
                  ? 'Sin Cargo'
                  : `$${service.price.toLocaleString('es-AR')}`}
              </span>
              {service.price > 0 && (
                <span className="text-xs font-bold text-slate-500 ml-1">
                  {service.currency}
                </span>
              )}
              <p className="text-[11px] text-slate-400 mt-1">Pago presencial al asistir</p>
            </div>

            {isManualApproval ? (
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Aprobación Manual</span>
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Tu turno quedará registrado en estado pendiente hasta que el establecimiento lo valide.
                </p>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Confirmación Inmediata</span>
                </p>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Tu cupo quedará asegurado al instante al hacer clic en el botón.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="w-full inline-flex items-center justify-center space-x-2 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: primaryColor }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Confirmando reserva...</span>
              </>
            ) : (
              <span>{isManualApproval ? 'Solicitar Turno' : 'Confirmar Reserva Ahora'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
