import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  publicApi,
  PublicService,
  PublicSlot,
  PublicBookResponse,
} from '../../api/public.api.js';
import { BusinessHeader } from './components/BusinessHeader.js';
import { ModalitySelector } from './components/ModalitySelector.js';
import { ServiceStep } from './components/ServiceStep.js';
import { ResourceStep } from './components/ResourceStep.js';
import { DateTimeStep } from './components/DateTimeStep.js';
import { CustomerFormStep, CustomerFormData } from './components/CustomerFormStep.js';
import { BookingSummaryStep } from './components/BookingSummaryStep.js';
import { BookingSuccessView } from './components/BookingSuccessView.js';
import { GroupSessionsView } from './components/GroupSessionsView.js';
import { BookingMode } from '@voko/shared';
import {
  Loader2,
  AlertCircle,
  Home,
  Check,
} from 'lucide-react';

export const PublicBookingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  // 1. Cargar información pública del negocio
  const {
    data,
    isLoading: isLoadingBusiness,
    isError: isErrorBusiness,
  } = useQuery({
    queryKey: ['public-business', slug],
    queryFn: () => publicApi.getBusiness(slug!),
    enabled: !!slug,
  });

  // Modalidad seleccionada (INDIVIDUAL, GROUP_SESSION, RESOURCE_ONLY)
  const [selectedModality, setSelectedModality] = useState<BookingMode>(BookingMode.INDIVIDUAL);

  // Stepper state
  // 1 = Servicio, 2 = Profesional, 3 = Fecha/Hora, 4 = Datos, 5 = Resumen, 6 = Éxito
  const [step, setStep] = useState<number>(1);

  // Selección de turno
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<PublicSlot | null>(null);
  const [customerData, setCustomerData] = useState<CustomerFormData | null>(null);

  // Estado de confirmación
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingErrorMessage, setBookingErrorMessage] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<PublicBookResponse | null>(null);

  // Determinar modalidades disponibles según catálogo
  const availableModalities: BookingMode[] = React.useMemo(() => {
    if (!data) return [BookingMode.INDIVIDUAL];
    const modes = new Set<BookingMode>();
    data.services.forEach((s) => modes.add(s.bookingMode));
    if (data.upcomingSessions.length > 0) modes.add(BookingMode.GROUP_SESSION);
    const arr = Array.from(modes);
    return arr.length > 0 ? arr : [BookingMode.INDIVIDUAL];
  }, [data]);

  // Sincronizar modalidad por defecto
  useEffect(() => {
    if (availableModalities.length > 0 && !availableModalities.includes(selectedModality)) {
      setSelectedModality(availableModalities[0]);
    }
  }, [availableModalities, selectedModality]);

  // Cargar slots en tiempo real cuando se está en el paso de fecha/hora
  const {
    data: slotsData,
    isLoading: isLoadingSlots,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: [
      'public-slots',
      slug,
      selectedService?.id,
      selectedDate,
      selectedResourceId,
    ],
    queryFn: () =>
      publicApi.getSlots(slug!, {
        serviceId: selectedService!.id,
        date: selectedDate,
        resourceId: selectedResourceId || undefined,
      }),
    enabled: !!slug && !!selectedService && step === 3,
  });

  const primaryColor = data?.settings?.brandPrimaryColor || '#2563EB';

  // Manejo de cambio de modalidad
  const handleSelectModality = (mode: BookingMode) => {
    setSelectedModality(mode);
    setStep(1);
    setSelectedService(null);
    setSelectedResourceId(null);
    setSelectedSlot(null);
    setBookingErrorMessage(null);
  };

  // Paso 1: Seleccionar Servicio
  const handleSelectService = (service: PublicService) => {
    setSelectedService(service);
    setSelectedSlot(null);

    // Si el servicio no tiene múltiples recursos asignados, avanzar directamente a fecha/hora
    if (service.resources.length <= 1) {
      setSelectedResourceId(service.resources[0]?.id || null);
      setStep(3);
    } else {
      setStep(2);
    }
  };

  // Paso 2: Seleccionar Profesional / Recurso
  const handleSelectResource = (resourceId: string | null) => {
    setSelectedResourceId(resourceId);
    setStep(3);
  };

  // Paso 3: Seleccionar Horario
  const handleSelectSlot = (slot: PublicSlot) => {
    setSelectedSlot(slot);
    setStep(4);
  };

  // Paso 4: Completar Datos del Cliente
  const handleCustomerSubmit = (formData: CustomerFormData) => {
    setCustomerData(formData);
    setStep(5);
  };

  // Paso 5: Confirmar Reserva
  const handleConfirmBooking = async () => {
    if (!slug || !selectedService || !selectedSlot || !customerData) return;

    setIsSubmittingBooking(true);
    setBookingErrorMessage(null);

    try {
      const response = await publicApi.bookAppointment(slug, {
        serviceId: selectedService.id,
        resourceId: selectedSlot.resourceId || selectedResourceId || undefined,
        startTime: selectedSlot.startTime,
        customer: customerData,
      });

      setConfirmedBooking(response);
      setStep(6);
    } catch (err: any) {
      // Manejo de conflicto / doble reserva (409 Conflict)
      if (err.response?.status === 409) {
        setBookingErrorMessage(
          'El horario seleccionado acaba de ser ocupado por otra persona. Por favor, seleccioná otro horario disponible.',
        );
        refetchSlots();
        setStep(3); // Regresar al selector de horarios
      } else {
        const msg =
          err.response?.data?.message ||
          'Ocurrió un error al procesar tu reserva. Por favor, intentá nuevamente.';
        setBookingErrorMessage(msg);
      }
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Reiniciar flujo para nueva reserva
  const handleResetFlow = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedResourceId(null);
    setSelectedSlot(null);
    setCustomerData(null);
    setConfirmedBooking(null);
    setBookingErrorMessage(null);
  };

  // Filtrar servicios correspondientes a la modalidad activa
  const filteredServices = (data?.services || []).filter(
    (s) => s.bookingMode === selectedModality,
  );

  // Estado de Carga
  if (isLoadingBusiness) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-700">Cargando establecimiento...</h2>
        <p className="text-xs text-slate-500">Preparando portal de turnos en línea</p>
      </div>
    );
  }

  // Estado de Error / Negocio No Encontrado
  if (isErrorBusiness || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Establecimiento no disponible</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            No pudimos encontrar un negocio activo con el identificador{' '}
            <strong className="text-slate-900">"{slug}"</strong>. Verificá que la dirección web sea correcta.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center space-x-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 px-5 py-2.5 rounded-xl transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Volver a Voko Principal</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedResourceObj = selectedService?.resources.find(
    (r) => r.id === (selectedSlot?.resourceId || selectedResourceId),
  ) || null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div>
        {/* Encabezado con Identidad Visual Dinámica */}
        <BusinessHeader data={data} />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* Si está en pantalla de éxito, mostrar únicamente la confirmación */}
          {step === 6 && confirmedBooking ? (
            <BookingSuccessView
              data={confirmedBooking}
              businessName={data.business.name}
              onReset={handleResetFlow}
              primaryColor={primaryColor}
            />
          ) : (
            <>
              {/* Selector de Modalidades */}
              <ModalitySelector
                availableModalities={availableModalities}
                selectedModality={selectedModality}
                onSelectModality={handleSelectModality}
                primaryColor={primaryColor}
              />

              {/* Si es Modalidad B (Clases Grupales), renderizar vista especializada */}
              {selectedModality === BookingMode.GROUP_SESSION ? (
                <GroupSessionsView
                  sessions={data.upcomingSessions}
                  businessSlug={data.business.slug}
                  businessName={data.business.name}
                  primaryColor={primaryColor}
                />
              ) : (
                <div className="space-y-8">
                  {/* Stepper Progress Bar */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
                    <div className="flex items-center justify-between max-w-2xl mx-auto text-xs font-semibold text-slate-400">
                      {[
                        { num: 1, label: 'Servicio' },
                        { num: 2, label: 'Profesional' },
                        { num: 3, label: 'Horario' },
                        { num: 4, label: 'Datos' },
                        { num: 5, label: 'Confirmar' },
                      ].map((s, idx, arr) => {
                        const isDone = step > s.num;
                        const isCurrent = step === s.num;

                        return (
                          <React.Fragment key={s.num}>
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                  isDone
                                    ? 'bg-emerald-500 text-white shadow-sm'
                                    : isCurrent
                                    ? 'text-white shadow-md'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                                style={{
                                  backgroundColor: isCurrent ? primaryColor : undefined,
                                }}
                              >
                                {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                              </div>
                              <span
                                className={`hidden sm:inline ${
                                  isCurrent ? 'text-slate-900 font-bold' : isDone ? 'text-slate-600' : ''
                                }`}
                              >
                                {s.label}
                              </span>
                            </div>

                            {idx < arr.length - 1 && (
                              <div
                                className={`flex-1 h-0.5 mx-2 rounded-full ${
                                  step > s.num ? 'bg-emerald-400' : 'bg-slate-100'
                                }`}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pasos del Stepper */}
                  {step === 1 && (
                    <ServiceStep
                      services={filteredServices}
                      selectedService={selectedService}
                      onSelectService={handleSelectService}
                      primaryColor={primaryColor}
                    />
                  )}

                  {step === 2 && selectedService && (
                    <ResourceStep
                      resources={selectedService.resources}
                      selectedResourceId={selectedResourceId}
                      onSelectResource={handleSelectResource}
                      onBack={() => setStep(1)}
                      primaryColor={primaryColor}
                    />
                  )}

                  {step === 3 && selectedService && (
                    <DateTimeStep
                      selectedDate={selectedDate}
                      onChangeDate={setSelectedDate}
                      slots={slotsData || []}
                      isLoadingSlots={isLoadingSlots}
                      selectedSlot={selectedSlot}
                      onSelectSlot={handleSelectSlot}
                      onBack={() => {
                        if (selectedService.resources.length <= 1) {
                          setStep(1);
                        } else {
                          setStep(2);
                        }
                      }}
                      primaryColor={primaryColor}
                    />
                  )}

                  {step === 4 && selectedService && selectedSlot && (
                    <CustomerFormStep
                      initialData={customerData || undefined}
                      onSubmit={handleCustomerSubmit}
                      onBack={() => setStep(3)}
                      primaryColor={primaryColor}
                    />
                  )}

                  {step === 5 && selectedService && selectedSlot && customerData && (
                    <BookingSummaryStep
                      service={selectedService}
                      resource={selectedResourceObj}
                      slot={selectedSlot}
                      customer={customerData}
                      businessName={data.business.name}
                      isSubmitting={isSubmittingBooking}
                      errorMessage={bookingErrorMessage}
                      onConfirm={handleConfirmBooking}
                      onBack={() => setStep(4)}
                      primaryColor={primaryColor}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Footer Simple del Portal */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} {data.business.name}. Todos los derechos reservados.</p>
          <div className="flex items-center space-x-1 text-slate-400">
            <span>Powered by</span>
            <Link to="/" className="font-bold text-slate-700 hover:text-blue-600 transition-colors">
              Voko Platform
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
