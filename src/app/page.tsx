import { prisma } from '@/lib/prisma';
import FinancialOverview from '@/components/dashboard/FinancialOverview';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const proyecto = await prisma.proyecto.findFirst({
    where: { codigo: 'OBRA-2026-CHUCO' }
  });

  if (!proyecto) {
    return (
      <div className="p-8 text-center text-slate-400">
        No se encontró el proyecto principal. Ejecuta la semilla con <code className="bg-slate-800 text-blue-400 px-2 py-1 rounded">npm run db:seed</code>
      </div>
    );
  }

  // Cuentas bancarias de tesorería
  const saldoCuentas = await prisma.cuentaBancaria.findMany();

  // Calcular costo directo acumulado (sumatoria de transacciones de egreso)
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

  // Últimas valorizaciones
  const ultimasValorizaciones = await prisma.transaccion.findMany({
    where: {
      proyectoId: proyecto.id,
      tipo: 'VALORIZACION'
    },
    orderBy: { fecha: 'desc' },
    take: 5
  });

  // Últimos egresos
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
