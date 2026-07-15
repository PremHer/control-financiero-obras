import { prisma } from '@/lib/prisma';
import PresupuestoTable from '@/components/presupuesto/PresupuestoTable';

export const dynamic = 'force-dynamic';

export default async function PresupuestoPage() {
  const proyecto = await prisma.proyecto.findFirst({
    where: { codigo: 'OBRA-2026-CHUCO' }
  });

  if (!proyecto) return null;

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
      saldo
    };
  });

  return <PresupuestoTable partidas={partidasConGastos} />;
}
