import React from 'react';
import { PublicSlot } from '../../../api/public.api.js';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, Sun, Sunset, AlertCircle, Loader2 } from 'lucide-react';

interface DateTimeStepProps {
  selectedDate: string; // YYYY-MM-DD
  onChangeDate: (date: string) => void;
  slots: PublicSlot[];
  isLoadingSlots: boolean;
  selectedSlot: PublicSlot | null;
  onSelectSlot: (slot: PublicSlot) => void;
  onBack: () => void;
  primaryColor: string;
}

export const DateTimeStep: React.FC<DateTimeStepProps> = ({
  selectedDate,
  onChangeDate,
  slots,
  isLoadingSlots,
  selectedSlot,
  onSelectSlot,
  onBack,
  primaryColor,
}) => {
  // Generar próximos 14 días para selección rápida
  const daysList = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));

  // Clasificar slots por turno mañana y tarde
  const morningSlots = slots.filter((slot) => {
    const hours = parseISO(slot.startTime).getUTCHours();
    return hours < 13;
  });

  const afternoonSlots = slots.filter((slot) => {
    const hours = parseISO(slot.startTime).getUTCHours();
    return hours >= 13;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            3. Elegí fecha y horario
          </h2>
          <p className="text-sm text-slate-500">
            Los horarios se calculan en tiempo real según la disponibilidad oficial.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Volver al paso previo</span>
        </button>
      </div>

      {/* Selector de días horizontal */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
          {daysList.map((dayDate) => {
            const dateStr = format(dayDate, 'yyyy-MM-dd');
            const isSelected = selectedDate === dateStr;
            const isToday = isSameDay(dayDate, new Date());

            return (
              <button
                key={dateStr}
                onClick={() => onChangeDate(dateStr)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-16 py-3 px-1 rounded-xl transition-all border ${
                  isSelected
                    ? 'text-white shadow-md border-transparent font-bold'
                    : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-slate-200/70 font-medium'
                }`}
                style={{
                  backgroundColor: isSelected ? primaryColor : undefined,
                }}
              >
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider ${
                    isSelected ? 'text-white/80' : 'text-slate-400'
                  }`}
                >
                  {isToday ? 'Hoy' : format(dayDate, 'EEE', { locale: es })}
                </span>
                <span className="text-lg font-black leading-tight my-0.5">
                  {format(dayDate, 'd')}
                </span>
                <span
                  className={`text-[10px] capitalize ${
                    isSelected ? 'text-white/80' : 'text-slate-500'
                  }`}
                >
                  {format(dayDate, 'MMM', { locale: es })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grilla de horarios disponibles */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm min-h-[220px]">
        {isLoadingSlots ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-slate-500">
              Consultando turnos disponibles en tiempo real...
            </p>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-10 max-w-sm mx-auto space-y-2">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">
              No hay turnos disponibles para esta fecha
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Todos los turnos para este día están ocupados o el establecimiento no atiende. Probá seleccionando otro día en el calendario superior.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mañana */}
            {morningSlots.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Turno Mañana ({morningSlots.length} disponibles)</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {morningSlots.map((slot) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    const timeLabel = format(parseISO(slot.startTime), 'HH:mm');

                    return (
                      <button
                        key={slot.startTime}
                        onClick={() => onSelectSlot(slot)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all border ${
                          isSelected
                            ? 'text-white shadow-md border-transparent scale-[1.02]'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 hover:border-slate-300'
                        }`}
                        style={{
                          backgroundColor: isSelected ? primaryColor : undefined,
                        }}
                      >
                        {timeLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tarde */}
            {afternoonSlots.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  <Sunset className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Turno Tarde / Noche ({afternoonSlots.length} disponibles)</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {afternoonSlots.map((slot) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    const timeLabel = format(parseISO(slot.startTime), 'HH:mm');

                    return (
                      <button
                        key={slot.startTime}
                        onClick={() => onSelectSlot(slot)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all border ${
                          isSelected
                            ? 'text-white shadow-md border-transparent scale-[1.02]'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 hover:border-slate-300'
                        }`}
                        style={{
                          backgroundColor: isSelected ? primaryColor : undefined,
                        }}
                      >
                        {timeLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
