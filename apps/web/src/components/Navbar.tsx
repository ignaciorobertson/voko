import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Layers, LayoutDashboard, Shield } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3">
          <img
            src="/brand/voko-logo.svg"
            alt="Logotipo Voko"
            className="h-10 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center space-x-5">
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4" />
            Inicio
          </Link>
          <Link
            to="/portal"
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-800 transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-200"
          >
            <BookOpen className="w-4 h-4" />
            Área de Clientes
          </Link>
          <Link
            to="/admin"
            className="text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-200"
          >
            <LayoutDashboard className="w-4 h-4" />
            Panel de Negocios
          </Link>
          <Link
            to="/superadmin"
            className="text-sm font-semibold text-rose-700 hover:text-rose-800 transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 rounded-xl border border-rose-200"
          >
            <Shield className="w-4 h-4" />
            Superadmin
          </Link>
          <a
            href="http://localhost:3000/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" />
            API Docs
          </a>
        </nav>

        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            Hito 9 — Notificaciones & Outbox
          </span>
        </div>
      </div>
    </header>
  );
};
