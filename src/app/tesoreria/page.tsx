import { prisma } from '@/lib/prisma';
import TesoreriaClient from '@/components/tesoreria/TesoreriaClient';

export const dynamic = 'force-dynamic';

export default async function TesoreriaPage() {
  const cuentas = await prisma.cuentaBancaria.findMany({
    include: {
      transacciones: {
        orderBy: { fecha: 'desc' },
        take: 10,
        include: {
          entidad: true,
          partida: true
        }
      }
    },
    orderBy: { banco: 'asc' }
  });

  return <TesoreriaClient cuentas={cuentas} />;
}
