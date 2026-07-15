'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  TrendingDown, 
  TrendingUp, 
  Landmark, 
  Building2, 
  ShieldCheck,
  HardHat
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard Principal', href: '/', icon: LayoutDashboard },
  { name: 'Gestión de Proyectos', href: '/proyectos', icon: Building2 },
  { name: 'Módulo de Presupuesto', href: '/presupuesto', icon: FileText },
  { name: 'Registro de Egresos', href: '/egresos', icon: TrendingDown },
  { name: 'Ingresos y Valorizaciones', href: '/ingresos', icon: TrendingUp },
  { name: 'Tesorería y Cuentas', href: '/tesoreria', icon: Landmark },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 hidden md:flex min-h-screen">
      <div>
        {/* Logo corporativo */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-white text-sm">SIPRO - Obras</div>
            <div className="text-[10px] text-slate-400 font-medium">Control Financiero v2.4</div>
          </div>
        </div>

        {/* Menú principal */}
        <nav className="p-4 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-2">
            Gestión de Obra
          </div>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Pie de sidebar de usuario en obra */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-bold text-xs border border-slate-700">
            AA
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-white truncate">Admin de Obra</div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" /> Sesión activa
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
