import React from 'react';
import { PublicResource } from '../../../api/public.api.js';
import { User, Users, CheckCircle2, ChevronLeft, Box } from 'lucide-react';
import { ResourceType } from '@voko/shared';

interface ResourceStepProps {
  resources: PublicResource[];
  selectedResourceId: string | null;
  onSelectResource: (resourceId: string | null) => void;
  onBack: () => void;
  primaryColor: string;
}

export const ResourceStep: React.FC<ResourceStepProps> = ({
  resources,
  selectedResourceId,
  onSelectResource,
  onBack,
  primaryColor,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            2. Seleccioná el profesional o espacio
          </h2>
          <p className="text-sm text-slate-500">
            Podés elegir un especialista en particular o ver la disponibilidad general.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Cambiar servicio</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Opción: Cualquier profesional disponible */}
        <div
          onClick={() => onSelectResource(null)}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer bg-white flex items-center justify-between ${
            selectedResourceId === null
              ? 'border-blue-600 shadow-md ring-2 ring-blue-600/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
          style={{
            borderColor: selectedResourceId === null ? primaryColor : undefined,
          }}
        >
          <div className="flex items-center space-x-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedResourceId === null
                  ? 'text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
              style={{
                backgroundColor: selectedResourceId === null ? primaryColor : undefined,
              }}
            >
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Cualquiera disponible
              </h4>
              <p className="text-xs text-slate-500">
                Mayor disponibilidad de horarios
              </p>
            </div>
          </div>

          {selectedResourceId === null && (
            <CheckCircle2
              className="w-5 h-5 flex-shrink-0"
              style={{ color: primaryColor }}
            />
          )}
        </div>

        {/* Lista de recursos específicos */}
        {resources.map((res) => {
          const isSelected = selectedResourceId === res.id;
          const isStaff = res.resourceType === ResourceType.STAFF;
          const Icon = isStaff ? User : Box;

          return (
            <div
              key={res.id}
              onClick={() => onSelectResource(res.id)}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer bg-white flex items-center justify-between ${
                isSelected
                  ? 'border-blue-600 shadow-md ring-2 ring-blue-600/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              style={{
                borderColor: isSelected ? primaryColor : undefined,
              }}
            >
              <div className="flex items-center space-x-3.5">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${
                    isSelected
                      ? 'text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                  style={{
                    backgroundColor: isSelected ? primaryColor : undefined,
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {res.name}
                  </h4>
                  <p className="text-xs text-slate-500 capitalize">
                    {isStaff ? 'Profesional' : res.resourceType.toLowerCase()}
                  </p>
                </div>
              </div>

              {isSelected && (
                <CheckCircle2
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: primaryColor }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
