import React, { useState } from 'react';
import { PublicUpcomingSession, PublicJoinSessionResponse, publicApi } from '../../../api/public.api.js';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Users,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const joinSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresá un correo electrónico válido'),
  phone: z.string().min(6, 'Ingresá un teléfono válido'),
  notes: z.string().optional(),
});

type JoinFormData = z.infer<typeof joinSchema>;

interface GroupSessionsViewProps {
  sessions: PublicUpcomingSession[];
  businessSlug: string;
  businessName: string;
  primaryColor: string;
}

export const GroupSessionsView: React.FC<GroupSessionsViewProps> = ({
  sessions,
  businessSlug,
  businessName,
  primaryColor,
}) => {
  const [selectedSession, setSelectedSession] = useState<PublicUpcomingSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<PublicJoinSessionResponse | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JoinFormData>({
    resolver: zodResolver(joinSchema),
  });

  const handleOpenEnrollModal = (session: PublicUpcomingSession) => {
    setSelectedSession(session);
    setErrorMessage(null);
    setSuccessData(null);
    reset();
  };

  const handleCloseModal = () => {
    setSelectedSession(null);
    setErrorMessage(null);
    setSuccessData(null);
  };

  const onSubmitJoin = async (formData: JoinFormData) => {
    if (!selectedSession) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await publicApi.joinSession(businessSlug, selectedSession.id, {
        customer: formData,
      });
      setSuccessData(response);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'No se pudo completar la inscripción. Verificá si quedan cupos disponibles.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">No hay clases programadas</h3>
        <p className="text-sm text-slate-500 mt-1">
          En este momento no hay actividades grupales con inscripción abierta. Consultá nuevamente más tarde.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Próximas Clases y Actividades Grupales
        </h2>
        <p className="text-sm text-slate-500">
          Asegurá tu lugar en las sesiones con cupo limitado disponibles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sessions.map((sess) => {
          const startDate = parseISO(sess.startTime);
          const endDate = parseISO(sess.endTime);
          const isFull = sess.remainingSpots <= 0;
          const percentageOccupied = Math.round(
            (sess.currentAttendees / sess.maxCapacity) * 100,
          );

          return (
            <div
              key={sess.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {sess.serviceName}
                  </h3>

                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${
                      isFull
                        ? 'bg-slate-100 text-slate-500'
                        : sess.remainingSpots <= 2
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isFull ? 'Cupo Lleno' : `${sess.remainingSpots} cupos libres`}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="capitalize font-medium">
                      {format(startDate, "EEEE d 'de' MMMM", { locale: es })}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {format(startDate, 'HH:mm')} a {format(endDate, 'HH:mm')} hs
                    </span>
                  </div>

                  {sess.instructorName && (
                    <div className="flex items-center space-x-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Instructor: <strong>{sess.instructorName}</strong></span>
                    </div>
                  )}
                </div>

                {/* Barra de progreso de cupos */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Ocupación: {sess.currentAttendees}/{sess.maxCapacity}</span>
                    <span>{percentageOccupied}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isFull
                          ? 'bg-slate-400'
                          : sess.remainingSpots <= 2
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, percentageOccupied)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-sm font-black text-slate-900">
                    {sess.servicePrice === 0
                      ? 'Sin Cargo'
                      : `$${sess.servicePrice?.toLocaleString('es-AR')}`}
                  </span>
                  {sess.servicePrice && sess.servicePrice > 0 && (
                    <span className="text-[10px] text-slate-500 ml-1">
                      {sess.serviceCurrency}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isFull}
                  onClick={() => handleOpenEnrollModal(sess)}
                  className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                    isFull
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'text-white shadow hover:opacity-95'
                  }`}
                  style={{
                    backgroundColor: !isFull ? primaryColor : undefined,
                  }}
                >
                  {isFull ? 'Agotado' : 'Inscribirme'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Inscripción Rápida */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={handleCloseModal}
              className="absolute right-5 top-5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {successData ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">¡Inscripción Exitosa!</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ya estás inscripto en <strong>{selectedSession.serviceName}</strong>. Guardá tu código de confirmación:
                </p>

                <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl font-black text-slate-900 tracking-wider">
                  {successData.confirmationCode}
                </div>

                <button
                  onClick={handleCloseModal}
                  className="w-full text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow"
                  style={{ backgroundColor: primaryColor }}
                >
                  Entendido
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Inscripción a Clase — {businessName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedSession.serviceName} • {format(parseISO(selectedSession.startTime), "d 'de' MMMM, HH:mm", { locale: es })} hs
                  </p>
                </div>

                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmitJoin)} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Nombre *
                      </label>
                      <input
                        {...register('firstName')}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                        placeholder="Juan"
                      />
                      {errors.firstName && (
                        <p className="text-[10px] text-red-600 mt-0.5">{errors.firstName.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Apellido *
                      </label>
                      <input
                        {...register('lastName')}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                        placeholder="Pérez"
                      />
                      {errors.lastName && (
                        <p className="text-[10px] text-red-600 mt-0.5">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                      placeholder="juan@ejemplo.com"
                    />
                    {errors.email && (
                      <p className="text-[10px] text-red-600 mt-0.5">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      {...register('phone')}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                      placeholder="+54 11 5555 1234"
                    />
                    {errors.phone && (
                      <p className="text-[10px] text-red-600 mt-0.5">{errors.phone.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center space-x-2 text-white font-bold py-3 rounded-xl text-xs transition-all shadow mt-2 disabled:opacity-60"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Confirmando lugar...</span>
                      </>
                    ) : (
                      <span>Completar Inscripción</span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
