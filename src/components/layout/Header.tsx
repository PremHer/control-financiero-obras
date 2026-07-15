'use client';

import React from 'react';
import { HardHat, Bell, Search, MapPin } from 'lucide-react';

export default function Header({ proyectoNombre = 'Mejoramiento del Canal de Riego Jesús - Chuco' }: { proyectoNombre?: string }) {
  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white bg-slate-800/80 border border-slate-700 px-3.5 py-1.5 rounded-xl shadow-sm">
          <HardHat className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate max-w-[200px] md:max-w-md">{proyectoNombre}</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 ml-1">
            <MapPin className="w-2.5 h-2.5 text-blue-400" /> Cajamarca
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar partidas, egresos..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <button className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/60 relative transition">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-slate-900" />
        </button>
      </div>
    </header>
  );
}
