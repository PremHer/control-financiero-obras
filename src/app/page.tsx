import { prisma } from '@/lib/prisma';
import FinancialOverview from '@/components/dashboard/FinancialOverview';
import NoProjectsWelcome from '@/components/proyectos/NoProjectsWelcome';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const proyectoIdCookie = cookieStore.get('sipro_proyecto_id')?.value;

  let proyecto = null;
  if (proyectoIdCookie) {
    proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoIdCookie } });
  }
  if (!proyecto) {
    proyecto = await prisma.proyecto.findFirst({ orderBy: { creadoEn: 'desc' } });
  }

  // Si no hay ningún proyecto en toda la base de datos (BD recién iniciada en Railway)
  if (!proyecto) {
    return <NoProjectsWelcome />;
  }

  const saldoCuentas = await prisma.cuentaBancaria.findMany();

  const egresosAgregados = await prisma.transaccion.aggregate({
    where: {
      proyectoId: proyecto.id,
      tipo: 'EGRESO',
      estado: 'PAGADO'
    },
    _sum: {
      monto: true
    }
  });

  const gastoAcumulado = egresosAgregados._sum.monto || 0;

  const ultimasValorizaciones = await prisma.transaccion.findMany({
    where: {
      proyectoId: proyecto.id,
      tipo: 'VALORIZACION'
    },
    orderBy: { fecha: 'desc' },
    take: 5
  });

  const ultimosEgresos = await prisma.transaccion.findMany({
    where: {
      proyectoId: proyecto.id,
      tipo: 'EGRESO'
    },
    include: {
      partida: true,
      entidad: true
    },
    orderBy: { fecha: 'desc' },
    take: 5
  });

  return (
    <FinancialOverview
      proyectoNombre={proyecto.nombre}
      presupuestoTotal={proyecto.presupuestoTotal}
      gastoAcumulado={gastoAcumulado}
      saldoCuentas={saldoCuentas}
      ultimasValorizaciones={ultimasValorizaciones}
      ultimosEgresos={ultimosEgresos}
    />
  );
}
