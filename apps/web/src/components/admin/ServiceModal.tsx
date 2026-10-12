import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Scissors, Save, Clock, DollarSign } from 'lucide-react';
import { ServiceDetail, ResourceDetail, BookingMode, ConfirmationMode } from '@voko/shared';

const serviceSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().min(5, 'La duración mínima es de 5 minutos').max(1440),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo').optional(),
  currency: z.string().default('ARS'),
  bufferBeforeMinutes: z.coerce.number().min(0).default(0),
  bufferAfterMinutes: z.coerce.number().min(0).default(0),
  minBookingNoticeMinutes: z.coerce.number().min(0).default(60),
  maxBookingAdvanceDays: z.coerce.number().min(1).max(365).default(30),
  cancellationDeadlineMinutes: z.coerce.number().min(0).default(120),
  bookingMode: z.nativeEnum(BookingMode).default(BookingMode.INDIVIDUAL),
  confirmationMode: z.nativeEnum(ConfirmationMode).default(ConfirmationMode.AUTOMATIC),
  resourceIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServiceFormData) => Promise<void>;
  initialData?: ServiceDetail | null;
  availableResources: ResourceDetail[];
  isLoading?: boolean;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  availableResources,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      durationMinutes: 45,
      price: 0,
      currency: 'ARS',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 10,
      minBookingNoticeMinutes: 60,
      maxBookingAdvanceDays: 30,
      cancellationDeadlineMinutes: 120,
      bookingMode: BookingMode.INDIVIDUAL,
      confirmationMode: ConfirmationMode.AUTOMATIC,
      resourceIds: [],
      isActive: true,
    },
  });

  const selectedResources = watch('resourceIds') || [];
  const currentBookingMode = watch('bookingMode');

  React.useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || '',
        durationMinutes: initialData.durationMinutes,
        price: initialData.price || 0,
        currency: initialData.currency || 'ARS',
        bufferBeforeMinutes: initialData.bufferBeforeMinutes,
        bufferAfterMinutes: initialData.bufferAfterMinutes,
        minBookingNoticeMinutes: initialData.minBookingNoticeMinutes,
        maxBookingAdvanceDays: initialData.maxBookingAdvanceDays,
        cancellationDeadlineMinutes: initialData.cancellationDeadlineMinutes,
        bookingMode: initialData.bookingMode,
        confirmationMode: initialData.confirmationMode,
        resourceIds: initialData.resources?.map((r) => r.resourceId) || [],
        isActive: initialData.isActive,
      });
    } else {
      reset({
        name: '',
        description: '',
        durationMinutes: 45,
        price: 0,
        currency: 'ARS',
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 10,
        minBookingNoticeMinutes: 60,
        maxBookingAdvanceDays: 30,
        cancellationDeadlineMinutes: 120,
        bookingMode: BookingMode.INDIVIDUAL,
        confirmationMode: ConfirmationMode.AUTOMATIC,
        resourceIds: [],
        isActive: true,
      });
    }
  }, [initialData, reset]);

  if (!isOpen) return null;

  const toggleResource = (resourceId: string) => {
    if (selectedResources.includes(resourceId)) {
      setValue(
        'resourceIds',
        selectedResources.filter((id) => id !== resourceId),
      );
    } else {
      setValue('resourceIds', [...selectedResources, resourceId]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">
                {initialData ? 'Editar Servicio' : 'Nuevo Servicio Reservable'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure tiempos, precio, modalidad y profesionales habilitados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Modalidad de Reserva */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Modalidad de Reserva del Servicio <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  mode: BookingMode.INDIVIDUAL,
                  title: '1 a 1 Individual',
                  desc: 'Turno estándar con 1 cliente',
                },
                {
                  mode: BookingMode.GROUP_SESSION,
                  title: 'Sesión Grupal',
                  desc: 'Clases o talleres con cupos',
                },
                {
                  mode: BookingMode.RESOURCE_ONLY,
                  title: 'Recurso Físico',
                  desc: 'Alquiler de cancha, sala o box',
                },
              ].map((item) => (
                <div
                  key={item.mode}
                  onClick={() => setValue('bookingMode', item.mode)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    currentBookingMode === item.mode
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Nombre y Descripción */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre del Servicio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                placeholder="Ej: Corte Degradado + Lavado"
                className={`w-full px-3.5 py-2 rounded-xl border text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  errors.name ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descripción Detallada
              </label>
              <textarea
                {...register('description')}
                rows={2}
                placeholder="Explique qué incluye el servicio para los clientes..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Duración y Precio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Duración del Turno (minutos) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  {...register('durationMinutes')}
                  min={5}
                  step={5}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              {errors.durationMinutes && (
                <p className="mt-1 text-xs text-red-600">{errors.durationMinutes.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Precio (opcional)
              </label>
              <div className="relative">
                <input
                  type="number"
                  {...register('price')}
                  min={0}
                  step={100}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Márgenes / Buffers */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Márgenes Operativos de Tiempo (Buffers)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Margen Previo (minutos de preparación)
                </label>
                <input
                  type="number"
                  {...register('bufferBeforeMinutes')}
                  min={0}
                  step={5}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Margen Posterior (minutos de limpieza/espera)
                </label>
                <input
                  type="number"
                  {...register('bufferAfterMinutes')}
                  min={0}
                  step={5}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Asignación de Recursos */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Profesionales / Recursos que brindan este servicio
            </label>
            {availableResources.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                No hay recursos activos configurados en este negocio. Cree profesionales o salas en la pestaña Recursos para asociarlos.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border rounded-xl border-slate-200">
                {availableResources.map((res) => {
                  const isChecked = selectedResources.includes(res.id);
                  return (
                    <div
                      key={res.id}
                      onClick={() => toggleResource(res.id)}
                      className={`flex items-center space-x-2.5 p-2 rounded-lg cursor-pointer text-sm transition-colors ${
                        isChecked ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                      />
                      <span className="font-medium truncate">{res.name}</span>
                      <span className="text-xs text-slate-400 capitalize">({res.resourceType})</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Guardando...' : 'Guardar Servicio'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
