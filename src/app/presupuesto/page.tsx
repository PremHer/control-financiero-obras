import { prisma } from '@/lib/prisma';
import PresupuestoTable from '@/components/presupuesto/PresupuestoTable';
import NoProjectsWelcome from '@/components/proyectos/NoProjectsWelcome';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function PresupuestoPage() {
  const cookieStore = await cookies();
  const proyectoIdCookie = cookieStore.get('sipro_proyecto_id')?.value;

  let proyecto = null;
  if (proyectoIdCookie) {
    proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoIdCookie } });
  }
  if (!proyecto) {
    proyecto = await prisma.proyecto.findFirst({ orderBy: { creadoEn: 'desc' } });
  }

  if (!proyecto) return <NoProjectsWelcome />;

  const partidas = await prisma.partida.findMany({
    where: { proyectoId: proyecto.id },
    include: {
      transacciones: {
        where: { tipo: 'EGRESO', estado: 'PAGADO' }
      }
    },
    orderBy: { item: 'asc' }
  });

  const partidasConGastos = partidas.map((p) => {
    const gastado = p.transacciones.reduce((acc, t) => acc + t.monto, 0);
    const saldo = p.parcialPresupuesto - gastado;
    return {
      id: p.id,
      item: p.item,
      descripcion: p.descripcion,
      unidad: p.unidad,
      metrado: p.metrado,
      precioUnitario: p.precioUnitario,
      parcialPresupuesto: p.parcialPresupuesto,
      gastado,
      saldo,
      fechaInicioProg: p.fechaInicioProg,
      fechaFinProg: p.fechaFinProg,
      duracionDias: p.duracionDias,
      porcentajeAvance: p.porcentajeAvance || 0
    };
  });

  return (
    <PresupuestoTable
      proyectoId={proyecto.id}
      nombreProyecto={proyecto.nombre}
      partidas={partidasConGastos}
    />
  );
}
