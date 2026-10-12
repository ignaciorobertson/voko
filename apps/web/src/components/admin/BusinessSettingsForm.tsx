import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Palette, Globe, Shield, Save, CheckCircle2, Clock } from 'lucide-react';
import { BusinessDetail, BusinessSettingsDetail } from '@voko/shared';

const settingsSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  contactEmail: z.string().email('Ingrese un correo electrónico válido'),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  brandPrimaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color hex inválido'),
  brandSecondaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color hex inválido'),
  defaultSlotIntervalMinutes: z.coerce.number().min(5).max(240),
  allowPublicBooking: z.boolean(),
  requireEmailVerification: z.boolean(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface BusinessSettingsFormProps {
  business: BusinessDetail;
  settings?: BusinessSettingsDetail;
  onSave: (data: SettingsFormData) => Promise<void>;
  isLoading?: boolean;
}

export const BusinessSettingsForm: React.FC<BusinessSettingsFormProps> = ({
  business,
  settings,
  onSave,
  isLoading,
}) => {
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: business.name,
      contactEmail: business.contactEmail,
      phone: business.phone || '',
      taxId: business.taxId || '',
      brandPrimaryColor: settings?.brandPrimaryColor || '#1E40AF',
      brandSecondaryColor: settings?.brandSecondaryColor || '#38BDF8',
      defaultSlotIntervalMinutes: settings?.defaultSlotIntervalMinutes || 30,
      allowPublicBooking: settings?.allowPublicBooking ?? true,
      requireEmailVerification: settings?.requireEmailVerification ?? false,
    },
  });

  const primaryColor = watch('brandPrimaryColor');
  const secondaryColor = watch('brandSecondaryColor');

  const onSubmit = async (data: SettingsFormData) => {
    await onSave(data);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-fadeIn">
      {savedSuccess && (
        <div className="flex items-center space-x-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl shadow-sm animate-slideDown">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-medium">
            ¡Configuración e identidad visual del negocio guardadas exitosamente en la base de datos!
          </span>
        </div>
      )}

      {/* Identidad Visual y Colores de Marca */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Identidad Visual y Tokens de Marca
            </h3>
            <p className="text-xs text-slate-500">
              Personalice la apariencia que verán sus clientes al reservar en su portal
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pickers */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Color Primario de Marca
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setValue('brandPrimaryColor', e.target.value)}
                  className="w-12 h-12 p-1 rounded-xl border border-slate-200 cursor-pointer bg-white"
                />
                <input
                  type="text"
                  {...register('brandPrimaryColor')}
                  className="w-32 px-3 py-2 text-sm font-mono uppercase rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {errors.brandPrimaryColor && (
                <p className="mt-1 text-xs text-red-600">{errors.brandPrimaryColor.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Color Secundario / Acento
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setValue('brandSecondaryColor', e.target.value)}
                  className="w-12 h-12 p-1 rounded-xl border border-slate-200 cursor-pointer bg-white"
                />
                <input
                  type="text"
                  {...register('brandSecondaryColor')}
                  className="w-32 px-3 py-2 text-sm font-mono uppercase rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {errors.brandSecondaryColor && (
                <p className="mt-1 text-xs text-red-600">{errors.brandSecondaryColor.message}</p>
              )}
            </div>
          </div>

          {/* Vista previa en vivo del widget de marca */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Vista Previa de Marca
            </span>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{watch('name') || business.name}</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Abierto
                </span>
              </div>
              <button
                type="button"
                className="w-full py-2 px-3 rounded-lg text-xs font-medium text-white shadow-sm transition-opacity"
                style={{ backgroundColor: primaryColor }}
              >
                Reservar Turno
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reglas de Reserva y Disponibilidad General */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Reglas de Reserva y Acceso Público
            </h3>
            <p className="text-xs text-slate-500">
              Defina cómo los clientes descubren y solicitan citas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Intervalo predeterminado de turnos (minutos)
            </label>
            <div className="relative">
              <select
                {...register('defaultSlotIntervalMinutes')}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={15}>Cada 15 minutos</option>
                <option value={30}>Cada 30 minutos (Estándar)</option>
                <option value={45}>Cada 45 minutos</option>
                <option value={60}>Cada 60 minutos (1 hora)</option>
              </select>
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-4 pt-1">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('allowPublicBooking')}
                className="w-4 h-4 mt-1 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-900">
                  Permitir reservas públicas sin invitación previa
                </span>
                <p className="text-xs text-slate-500">
                  Cualquier cliente podrá acceder a la URL del negocio y solicitar un turno.
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('requireEmailVerification')}
                className="w-4 h-4 mt-1 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-900">
                  Exigir verificación de correo para reservar
                </span>
                <p className="text-xs text-slate-500">
                  Envía un código de confirmación antes de agendar.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Datos Generales y Fiscales */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Datos Operativos y de Contacto
            </h3>
            <p className="text-xs text-slate-500">
              Información de facturación, contacto y razón social
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre Comercial del Negocio
            </label>
            <input
              type="text"
              {...register('name')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Correo Electrónico de Contacto
            </label>
            <input
              type="email"
              {...register('contactEmail')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
            {errors.contactEmail && (
              <p className="mt-1 text-xs text-red-600">{errors.contactEmail.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Teléfono Comercial
            </label>
            <input
              type="text"
              {...register('phone')}
              placeholder="+54 11 5555-1234"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Identificación Fiscal / CUIT (opcional)
            </label>
            <input
              type="text"
              {...register('taxId')}
              placeholder="30-71234567-8"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center space-x-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isLoading ? 'Guardando Cambios...' : 'Guardar Toda la Configuración'}</span>
        </button>
      </div>
    </form>
  );
};
