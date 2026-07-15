'use client';

import React, { useState } from 'react';
import { HardHat, ChevronDown, Check, Plus, Building2, MapPin } from 'lucide-react';
import { seleccionarProyecto } from '@/app/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProyectoMin {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion: string;
}

export default function ProjectSelector({
  proyectos,
  proyectoActivo,
}: {
  proyectos: ProyectoMin[];
  proyectoActivo?: ProyectoMin | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSelect = async (id: string) => {
    setLoadingId(id);
    try {
      await seleccionarProyecto(id);
      setOpen(false);
      router.push('/');
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  };

  if (!proyectoActivo && proyectos.length === 0) {
    return (
      <Link
        href="/proyectos"
        className="flex items-center gap-2 text-xs font-semibold text-blue-400 bg-blue-950/80 border border-blue-800 px-3.5 py-1.5 rounded-xl hover:bg-blue-900/80 transition"
      >
        <Building2 className="w-4 h-4 text-blue-400" />
        <span>+ Seleccionar o Crear Proyecto</span>
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-semibold text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-xl shadow-sm transition"
      >
        <HardHat className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="truncate max-w-[200px] md:max-w-xs">{proyectoActivo?.nombre || 'Obra no seleccionada'}</span>
        {proyectoActivo && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 ml-1 font-mono">
            {proyectoActivo.codigo}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in divide-y divide-slate-800/80">
          <div className="px-4 py-2.5 bg-slate-950 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Cambiar Obra / Proyecto Activo
          </div>

          <div className="max-h-60 overflow-y-auto">
            {proyectos.map((p) => {
              const isSelected = p.id === proyectoActivo?.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  disabled={loadingId === p.id}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-800/60 transition flex items-center justify-between text-xs ${
                    isSelected ? 'bg-blue-950/40 text-blue-400 font-semibold' : 'text-slate-200'
                  }`}
                >
                  <div className="overflow-hidden pr-2">
                    <div className="font-bold truncate">{p.nombre}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                      <span>{p.codigo}</span> • <MapPin className="w-2.5 h-2.5 text-slate-500 inline" /> {p.ubicacion}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="p-2 bg-slate-950/80">
            <Link
              href="/proyectos"
              onClick={() => setOpen(false)}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" /> Gestionar Proyectos y Obras
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
