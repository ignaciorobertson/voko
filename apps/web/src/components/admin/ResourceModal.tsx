import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, UserCheck, Save, MapPin } from 'lucide-react';
import { ResourceDetail, BranchDetail, ServiceDetail, ResourceType } from '@voko/shared';

const resourceSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  resourceType: z.nativeEnum(ResourceType).default(ResourceType.STAFF),
  branchId: z.string().min(1, 'Debe seleccionar una sucursal'),
  description: z.string().optional(),
  serviceIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ResourceFormData) => Promise<void>;
  initialData?: ResourceDetail | null;
  branches: BranchDetail[];
  availableServices: ServiceDetail[];
  isLoading?: boolean;
}

export const ResourceModal: React.FC<ResourceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  branches,
  availableServices,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      name: '',
      resourceType: ResourceType.STAFF,
      branchId: branches[0]?.id || '',
      description: '',
      serviceIds: [],
      isActive: true,
    },
  });

  const selectedServices = watch('serviceIds') || [];

  React.useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        resourceType: initialData.resourceType,
        branchId: initialData.branchId,
        description: initialData.description || '',
        serviceIds: initialData.serviceIds || [],
        isActive: initialData.isActive,
      });
    } else {
      reset({
        name: '',
        resourceType: ResourceType.STAFF,
        branchId: branches[0]?.id || '',
        description: '',
        serviceIds: [],
        isActive: true,
      });
    }
  }, [initialData, branches, reset]);

  if (!isOpen) return null;

  const toggleService = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      setValue(
        'serviceIds',
        selectedServices.filter((id) => id !== serviceId),
      );
    } else {
      setValue('serviceIds', [...selectedServices, serviceId]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">
                {initialData ? 'Editar Recurso / Profesional' : 'Nuevo Recurso Operativo'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure personal, canchas, salas, boxes o equipos de atención
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
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Nombre y Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre del Recurso / Profesional <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                placeholder="Ej: Dr. Mateo / Cancha #1"
                className={`w-full px-3.5 py-2 rounded-xl border text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  errors.name ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de Recurso <span className="text-red-500">*</span>
              </label>
              <select
                {...register('resourceType')}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value={ResourceType.STAFF}>Profesional / Empleado (STAFF)</option>
                <option value={ResourceType.ROOM}>Sala / Consultorio (ROOM)</option>
                <option value={ResourceType.COURT}>Cancha Deportiva (COURT)</option>
                <option value={ResourceType.BOX}>Box de Atención (BOX)</option>
                <option value={ResourceType.EQUIPMENT}>Equipo Especial (EQUIPMENT)</option>
              </select>
            </div>
          </div>

          {/* Sucursal Asignada */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sucursal / Sede Asignada <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                {...register('branchId')}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.isDefault ? '(Predeterminada)' : ''}
                  </option>
                ))}
              </select>
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            {errors.branchId && (
              <p className="mt-1 text-xs text-red-600">{errors.branchId.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descripción u Observaciones
            </label>
            <input
              type="text"
              {...register('description')}
              placeholder="Ej: Especialista en kinesiología / Cancha de cemento sintético"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Servicios que puede realizar */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Servicios que puede prestar este recurso
            </label>
            {availableServices.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                No hay servicios creados aún. Puede asociarlos más adelante desde la pestaña Servicios.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border rounded-xl border-slate-200">
                {availableServices.map((srv) => {
                  const isChecked = selectedServices.includes(srv.id);
                  return (
                    <div
                      key={srv.id}
                      onClick={() => toggleService(srv.id)}
                      className={`flex items-center space-x-2.5 p-2 rounded-lg cursor-pointer text-sm transition-colors ${
                        isChecked ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                      />
                      <span className="font-medium truncate">{srv.name}</span>
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
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Guardando...' : 'Guardar Recurso'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
