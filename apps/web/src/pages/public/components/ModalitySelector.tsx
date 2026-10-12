import React from 'react';
import { BookingMode } from '@voko/shared';
import { User, Users, Box } from 'lucide-react';

interface ModalitySelectorProps {
  availableModalities: BookingMode[];
  selectedModality: BookingMode;
  onSelectModality: (mode: BookingMode) => void;
  primaryColor: string;
}

export const ModalitySelector: React.FC<ModalitySelectorProps> = ({
  availableModalities,
  selectedModality,
  onSelectModality,
  primaryColor,
}) => {
  if (availableModalities.length <= 1) {
    return null; // Si el negocio solo ofrece una modalidad, no hace falta selector
  }

  const modalitiesConfig = [
    {
      id: BookingMode.INDIVIDUAL,
      title: 'Turnos Individuales',
      subtitle: 'Atención 1 a 1 personalizada',
      icon: User,
    },
    {
      id: BookingMode.GROUP_SESSION,
      title: 'Clases y Talleres',
      subtitle: 'Actividades grupales con cupo',
      icon: Users,
    },
    {
      id: BookingMode.RESOURCE_ONLY,
      title: 'Canchas y Espacios',
      subtitle: 'Alquiler exclusivo de instalaciones',
      icon: Box,
    },
  ];

  const visibleModalities = modalitiesConfig.filter((m) =>
    availableModalities.includes(m.id),
  );

  return (
    <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm max-w-2xl mx-auto mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {visibleModalities.map((item) => {
          const isSelected = selectedModality === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectModality(item.id)}
              className={`flex items-center sm:flex-col justify-start sm:justify-center text-left sm:text-center p-3 rounded-xl transition-all ${
                isSelected
                  ? 'text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              style={{
                backgroundColor: isSelected ? primaryColor : undefined,
              }}
            >
              <div
                className={`p-2 rounded-lg mr-3 sm:mr-0 sm:mb-2 ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">{item.title}</p>
                <p
                  className={`text-[11px] leading-tight ${
                    isSelected ? 'text-white/80' : 'text-slate-600'
                  }`}
                >
                  {item.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
