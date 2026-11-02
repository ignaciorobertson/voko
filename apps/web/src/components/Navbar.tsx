import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Shield, Sparkles } from 'lucide-react';
import { NotificationCenter } from './notifications/NotificationCenter.js';
import { playDewSound } from '../utils/soundEffects.js';
import { VokoLogo } from './VokoLogo.js';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-[#120f17]/90 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" onClick={() => playDewSound()} className="flex items-center space-x-3 group">
          <VokoLogo className="h-10 w-auto group-hover:scale-105 transition-transform drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
        </Link>

        <nav className="hidden md:flex items-center space-x-2.5">
          <Link
            to="/playground"
            onClick={() => playDewSound()}
            className="text-xs font-semibold text-white transition-all flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-xl border border-white/20 hover:border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.06)] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] group"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-300 group-hover:text-white animate-pulse" />
            <span>Playground de Reservas</span>
          </Link>
          <Link
            to="/portal"
            onClick={() => playDewSound()}
            className="text-xs font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 rounded-xl border border-zinc-800 hover:border-zinc-700"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>Área de Clientes</span>
          </Link>
          <Link
            to="/admin"
            onClick={() => playDewSound()}
            className="text-xs font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 rounded-xl border border-zinc-800 hover:border-zinc-700"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-zinc-400" />
            <span>Panel de Negocios</span>
          </Link>
          <Link
            to="/superadmin"
            onClick={() => playDewSound()}
            className="text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/60 hover:bg-zinc-800 rounded-xl border border-zinc-800/80 hover:border-zinc-700"
          >
            <Shield className="w-3.5 h-3.5 text-zinc-500" />
            <span>Superadmin</span>
          </Link>
        </nav>

        <div className="flex items-center space-x-3">
          <NotificationCenter />
        </div>
      </div>
    </header>
  );
};
