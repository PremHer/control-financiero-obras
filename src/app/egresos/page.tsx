import { prisma } from '@/lib/prisma';
import EgresoFormClient from '@/components/egresos/EgresoFormClient';
import { formatPEN, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function EgresosPage() {
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

  const partidasOpciones = partidas.map((p) => {
    const gastado = p.transacciones.reduce((acc, t) => acc + t.monto, 0);
    return {
      id: p.id,
      item: p.item,
      descripcion: p.descripcion,
      saldoDisponible: p.parcialPresupuesto - gastado
    };
  });

  const proveedores = await prisma.entidad.findMany({
    where: { tipo: 'PROVEEDOR' },
    orderBy: { razonSocial: 'asc' }
  });

  const cuentas = await prisma.cuentaBancaria.findMany();

  const historialEgresos = await prisma.transaccion.findMany({
    where: {
      proyectoId: proyecto.id,
      tipo: 'EGRESO'
    },
    include: {
      partida: true,
      entidad: true,
      cuentaBancaria: true
    },
    orderBy: { fecha: 'desc' }
  });

  return (
    <div className="space-y-10">
      <EgresoFormClient
        proyectoId={proyecto.id}
        partidas={partidasOpciones}
        proveedores={proveedores}
        cuentas={cuentas}
      />

      {/* Historial de Egresos */}
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-white">Historial General de Egresos Registrados</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Partida</th>
                <th className="py-3 px-3">Proveedor / Destinatario</th>
                <th className="py-3 px-3">Comprobante</th>
                <th className="py-3 px-3">Cuenta Origen</th>
                <th className="py-3 px-3 text-right">Monto (S/)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {historialEgresos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No se han registrado egresos aún
                  </td>
                </tr>
              ) : (
                historialEgresos.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 text-slate-400">{formatDate(e.fecha)}</td>
                    <td className="py-3 px-3 font-mono font-bold text-blue-400">
                      {e.partida ? `${e.partida.item} - ${e.partida.descripcion}` : 'General'}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-200">{e.entidad.razonSocial}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {e.tipoComprobante}: {e.numeroComprobante}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{e.cuentaBancaria.banco}</td>
                    <td className="py-3 px-3 text-right font-bold text-rose-400 font-mono">
                      -{formatPEN(e.monto)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
