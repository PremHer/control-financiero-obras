import { prisma } from '@/lib/prisma';
import ProyectosClient from '@/components/proyectos/ProyectosClient';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function ProyectosPage() {
  const proyectosRaw = await prisma.proyecto.findMany({
    include: {
      partidas: { select: { id: true } },
      transacciones: {
        where: { tipo: 'EGRESO', estado: 'PAGADO' },
        select: { monto: true }
      }
    },
    orderBy: { creadoEn: 'desc' }
  });

  const proyectos = projectsMapped(proyectosRaw);

  const cookieStore = await cookies();
  const proyectoActivoId = cookieStore.get('sipro_proyecto_id')?.value || proyectos[0]?.id;

  return (
    <ProyectosClient
      proyectos={proyectos}
      proyectoActivoId={proyectoActivoId}
    />
  );
}

function projectsMapped(raw: any[]) {
  return raw.map((p) => {
    const totalEgresos = p.transacciones.reduce((acc: number, t: any) => acc + (t.monto || 0), 0);
    const saldoProyecto = p.presupuestoTotal - totalEgresos;
    return {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      cliente: p.cliente,
      ubicacion: p.ubicacion,
      fechaInicio: p.fechaInicio,
      presupuestoTotal: p.presupuestoTotal,
      creadoEn: p.creadoEn,
      totalPartidas: p.partidas.length,
      totalEgresos,
      saldoProyecto
    };
  });
}
