import React from 'react';
import { Bell, Search } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import ProjectSelector from '@/components/layout/ProjectSelector';

export default async function Header() {
  const proyectos = await prisma.proyecto.findMany({
    select: {
      id: true,
      codigo: true,
      nombre: true,
      ubicacion: true,
    },
    orderBy: { creadoEn: 'desc' },
  });

  const cookieStore = await cookies();
  const proyectoActivoId = cookieStore.get('sipro_proyecto_id')?.value;
  const proyectoActivo = proyectos.find((p) => p.id === proyectoActivoId) || proyectos[0] || null;

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <ProjectSelector proyectos={proyectos} proyectoActivo={proyectoActivo} />
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
