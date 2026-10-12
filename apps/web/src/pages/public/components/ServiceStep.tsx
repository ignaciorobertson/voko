import React from 'react';
import { PublicService } from '../../../api/public.api.js';
import { Clock, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { ConfirmationMode } from '@voko/shared';

interface ServiceStepProps {
  services: PublicService[];
  selectedService: PublicService | null;
  onSelectService: (service: PublicService) => void;
  primaryColor: string;
}

export const ServiceStep: React.FC<ServiceStepProps> = ({
  services,
  selectedService,
  onSelectService,
  primaryColor,
}) => {
  if (services.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">No hay servicios disponibles</h3>
        <p className="text-sm text-slate-500 mt-1">
          No se encontraron servicios activos para esta modalidad en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center sm:text-left mb-6">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          1. Seleccioná el servicio o actividad
        </h2>
        <p className="text-sm text-slate-500">
          Elegí la opción que deseás reservar para ver los horarios disponibles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => {
          const isSelected = selectedService?.id === service.id;

          return (
            <div
              key={service.id}
              onClick={() => onSelectService(service)}
              className={`group relative bg-white rounded-2xl p-5 border-2 transition-all cursor-pointer hover:shadow-md ${
                isSelected
                  ? 'shadow-md border-blue-600 ring-2 ring-blue-600/20'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
              style={{
                borderColor: isSelected ? primaryColor : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {service.name}
                    </h3>
                  </div>

                  {service.description && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {service.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                    <span className="inline-flex items-center space-x-1 font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{service.durationMinutes} min</span>
                    </span>

                    {service.confirmationMode === ConfirmationMode.MANUAL_APPROVAL && (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-lg">
                        Requiere confirmación previa
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex flex-col items-end justify-between self-stretch">
                  <span className="text-lg font-black text-slate-900">
                    {service.price === 0
                      ? 'Gratis'
                      : `$${service.price.toLocaleString('es-AR')} ${service.currency}`}
                  </span>

                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all mt-3 ${
                      isSelected
                        ? 'text-white'
                        : 'text-slate-400 bg-slate-50 group-hover:bg-slate-100'
                    }`}
                    style={{
                      backgroundColor: isSelected ? primaryColor : undefined,
                    }}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
