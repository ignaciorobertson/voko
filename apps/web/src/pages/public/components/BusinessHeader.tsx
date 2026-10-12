import React from 'react';
import { PublicBusinessData } from '../../../api/public.api.js';
import { MapPin, Phone, Mail, Clock, ShieldCheck } from 'lucide-react';

interface BusinessHeaderProps {
  data: PublicBusinessData;
}

export const BusinessHeader: React.FC<BusinessHeaderProps> = ({ data }) => {
  const { business, settings, branches } = data;
  const mainBranch = branches.find((b) => b.isDefault) || branches[0];
  const primaryColor = settings.brandPrimaryColor || '#2563EB';

  return (
    <header className="relative overflow-hidden bg-white border-b border-slate-200">
      {/* Top Brand Accent Line */}
      <div
        className="h-2 w-full transition-all"
        style={{ backgroundColor: primaryColor }}
      />

      {/* Decorative gradient glow */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ backgroundColor: primaryColor }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center space-x-4">
            {/* Business Avatar / Logo Icon */}
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg flex-shrink-0"
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 10px 25px -5px ${primaryColor}40`,
              }}
            >
              {business.name.substring(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Establecimiento Verificado</span>
                </span>
                <span className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{business.timezone.replace('_', ' ')}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {business.name}
              </h1>

              {business.description && (
                <p className="text-sm text-slate-600 max-w-xl leading-relaxed">
                  {business.description}
                </p>
              )}
            </div>
          </div>

          {/* Quick contact / Location pills */}
          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 text-xs text-slate-600 font-medium">
            {mainBranch && (
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {mainBranch.name} {mainBranch.address ? `• ${mainBranch.address}` : ''}
                </span>
              </div>
            )}

            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{business.phone}</span>
              </a>
            )}

            {business.contactEmail && (
              <a
                href={`mailto:${business.contactEmail}`}
                className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>{business.contactEmail}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
