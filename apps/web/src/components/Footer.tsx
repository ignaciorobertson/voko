import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-white py-8 mt-12 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
        <p className="font-medium text-slate-700">
          VOKO — Plataforma SaaS Multiempresa de Gestión y Solicitud de Turnos
        </p>
        <p>
          Construido con React, TypeScript, Vite, NestJS y PostgreSQL.
        </p>
        <p className="text-slate-400">
          Hito 1: Esqueleto Técnico e Identidad Visual • Versión 1.0.0
        </p>
      </div>
    </footer>
  );
};
