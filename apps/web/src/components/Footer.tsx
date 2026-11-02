import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10 bg-[#120f17] py-6 text-center text-xs text-zinc-400 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1.5">
        <p className="font-semibold text-zinc-300">
          VOKO — Plataforma SaaS Multiempresa de Gestión Inteligente de Turnos
        </p>
        <p className="text-[11px] text-zinc-500">
          Construido con React, TypeScript, Vite, NestJS y PostgreSQL.
        </p>
      </div>
    </footer>
  );
};
