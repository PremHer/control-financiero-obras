import { prisma } from '@/lib/prisma';
import { formatPEN, formatDate } from '@/lib/utils';
import { Landmark, ArrowUpRight, ArrowDownRight, CheckCircle, RefreshCw } from 'lucide-react';

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
    }
  });

  const saldoLiquidoTotal = cuentas.reduce((acc, c) => acc + c.saldoActual, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Landmark className="w-6 h-6 text-purple-400" /> Módulo de Tesorería y Conciliación Bancaria
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestión en tiempo real del saldo disponible, cuentas corrientes y detracciones.
          </p>
        </div>
        <div className="bg-slate-950 px-5 py-3 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-purple-400">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Saldo Líquido Conciliado</div>
            <div className="text-xl font-bold text-purple-400">{formatPEN(saldoLiquidoTotal)}</div>
          </div>
        </div>
      </div>

      {/* Tarjetas de Cuentas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cuentas.map((cta) => (
          <div key={cta.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950 px-2.5 py-1 rounded border border-blue-800">
                    {cta.tipoCuenta}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-3">{cta.banco}</h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">Cta: {cta.numeroCuenta}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Saldo Actual ({cta.moneda})</div>
                  <div className="text-2xl font-bold text-white mt-1">{formatPEN(cta.saldoActual)}</div>
                </div>
              </div>

              {/* Movimientos recientes de la cuenta */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
                <div className="text-xs font-bold uppercase text-slate-400">Últimos movimientos de esta cuenta</div>
                {cta.transacciones.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">Sin movimientos recientes</p>
                ) : (
                  cta.transacciones.slice(0, 4).map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="flex items-center gap-2">
                        {t.tipo === 'EGRESO' ? (
                          <ArrowDownRight className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold text-slate-200">{t.entidad.razonSocial}</div>
                          <div className="text-[10px] text-slate-400">
                            {t.partida ? `Partida: ${t.partida.item}` : t.tipoComprobante} • {formatDate(t.fecha)}
                          </div>
                        </div>
                      </div>
                      <div className={`font-mono font-bold ${t.tipo === 'EGRESO' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {t.tipo === 'EGRESO' ? '-' : '+'}{formatPEN(t.monto)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" /> Conciliación automática activa
              </span>
              <span>Actualizado al {new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
