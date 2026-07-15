import { prisma } from '@/lib/prisma';
import IngresoFormClient from '@/components/ingresos/IngresoFormClient';
import { formatPEN, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function IngresosPage() {
  const proyecto = await prisma.proyecto.findFirst({
    where: { codigo: 'OBRA-2026-CHUCO' }
  });

  if (!proyecto) return null;

  const clientes = await prisma.entidad.findMany({
    where: { tipo: 'CLIENTE' },
    orderBy: { razonSocial: 'asc' }
  });

  const cuentas = await prisma.cuentaBancaria.findMany();

  const historialIngresos = await prisma.transaccion.findMany({
    where: {
      proyectoId: proyecto.id,
      tipo: { in: ['INGRESO', 'VALORIZACION'] }
    },
    include: {
      entidad: true,
      cuentaBancaria: true
    },
    orderBy: { fecha: 'desc' }
  });

  const totalIngresado = historialIngresos.reduce((acc, t) => acc + t.monto, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Módulo de Ingresos y Valorizaciones</h1>
        <p className="text-xs text-slate-400 mt-1">
          Control de entradas de dinero al proyecto (Adelantos, Valorizaciones aprobadas por {proyecto.cliente})
        </p>
      </div>

      <IngresoFormClient
        proyectoId={proyecto.id}
        clientes={clientes}
        cuentas={cuentas}
      />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-white">Histórico de Valorizaciones / Cobros Registrados</h2>
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-800">
            Total Ingresado: {formatPEN(totalIngresado)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Entidad Pagadora</th>
                <th className="py-3 px-3">Comprobante / Resolución</th>
                <th className="py-3 px-3">Cuenta Acreditada</th>
                <th className="py-3 px-3">Observaciones</th>
                <th className="py-3 px-3 text-right">Monto (S/)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {historialIngresos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    No se han registrado valorizaciones ni adelantos aún
                  </td>
                </tr>
              ) : (
                historialIngresos.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 text-slate-400">{formatDate(i.fecha)}</td>
                    <td className="py-3 px-3">
                      <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-bold text-[10px] border border-emerald-800">
                        {i.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-200">{i.entidad.razonSocial}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{i.tipoComprobante}: {i.numeroComprobante}</td>
                    <td className="py-3 px-3 text-slate-400">{i.cuentaBancaria.banco}</td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">{i.observaciones || '-'}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400 font-mono">
                      +{formatPEN(i.monto)}
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
