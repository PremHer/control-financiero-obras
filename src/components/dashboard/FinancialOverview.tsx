'use client';

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Wallet, TrendingUp, AlertTriangle, ArrowUpRight, CheckCircle2, DollarSign, Building } from 'lucide-react';
import Link from 'next/link';
import { formatPEN, formatDate } from '@/lib/utils';

interface FinancialOverviewProps {
  proyectoNombre: string;
  presupuestoTotal: number;
  gastoAcumulado: number;
  saldoCuentas: { id: string; banco: string; numeroCuenta: string; tipoCuenta: string; saldoActual: number }[];
  ultimasValorizaciones: { id: string; fecha: Date; monto: number; estado: string; numeroComprobante: string; observaciones: string | null }[];
  ultimosEgresos: { id: string; fecha: Date; monto: number; numeroComprobante: string; partida: { item: string; descripcion: string } | null; entidad: { razonSocial: string } }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function FinancialOverview({
  proyectoNombre,
  presupuestoTotal,
  gastoAcumulado,
  saldoCuentas,
  ultimasValorizaciones,
  ultimosEgresos,
}: FinancialOverviewProps) {
  const saldoDisponible = presupuestoTotal - gastoAcumulado;
  const porcentajeGastado = ((gastoAcumulado / presupuestoTotal) * 100).toFixed(1);
  const totalCuentas = saldoCuentas.reduce((acc, c) => acc + c.saldoActual, 0);

  const barData = [
    { name: 'Presupuestado', valor: presupuestoTotal },
    { name: 'Costo Directo (Gasto)', valor: gastoAcumulado },
    { name: 'Saldo por Ejecutar', valor: saldoDisponible },
  ];

  const pieData = [
    { name: 'Ejecutado', value: gastoAcumulado },
    { name: 'Saldo Disponible', value: saldoDisponible },
  ];

  return (
    <div className="space-y-6">
      {/* Cabecera y botón de acción */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-3 py-1 rounded-full border border-blue-800">
              Panel de Control General
            </span>
            <span className="text-xs text-slate-400">| Conciliado en tiempo real</span>
          </div>
          <h1 className="text-2xl font-bold mt-2 tracking-tight text-white">{proyectoNombre}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Presupuesto, Egresos Amarrados a Partida y Estado del Flujo de Caja
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/egresos"
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center gap-2 text-sm"
          >
            + Registrar Egreso
          </Link>
          <Link
            href="/presupuesto"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition text-sm"
          >
            Ver Presupuesto
          </Link>
        </div>
      </div>

      {/* Tarjetas de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Presupuesto Aprobado</span>
            <Wallet className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-3">{formatPEN(presupuestoTotal)}</div>
          <div className="mt-2 flex items-center text-xs text-blue-400 font-medium">
            <ArrowUpRight className="w-4 h-4 mr-1" /> Línea base contractual
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Costo Directo Ejecutado</span>
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-3">{formatPEN(gastoAcumulado)}</div>
          <div className="mt-2 text-xs text-amber-400 font-medium">
            {porcentajeGastado}% del presupuesto consumido
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Saldo Presupuestal</span>
            <AlertTriangle className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-3">{formatPEN(saldoDisponible)}</div>
          <div className="mt-2 text-xs text-slate-400 font-medium">
            Por ejecutar en partidas
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Liquidez Total en Bancos</span>
            <DollarSign className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-3">{formatPEN(totalCuentas)}</div>
          <div className="mt-2 text-xs text-purple-300/80 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {saldoCuentas.length} cuentas conciliadas
          </div>
        </div>
      </div>

      {/* Sección Gráfica y Estado de Cuentas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-base font-bold text-white mb-6">
            Comparativa: Presupuestado vs. Real vs. Saldo (S/)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#64748b" tickFormatter={(val) => `S/ ${val/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                  formatter={(value: any) => [formatPEN(Number(value || 0)), 'Monto']}
                />
                <Bar dataKey="valor" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tarjetas de Cuentas y Tesorería */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Estado de Cuentas Bancarias</h3>
              <Link href="/tesoreria" className="text-xs text-blue-400 hover:underline">Ver todas</Link>
            </div>
            <div className="space-y-3.5">
              {saldoCuentas.map((cta) => (
                <div key={cta.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-100">{cta.banco}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{cta.numeroCuenta}</div>
                    <div className="text-[10px] uppercase font-semibold text-blue-400 mt-1 bg-blue-950/60 px-2 py-0.5 rounded w-fit">
                      {cta.tipoCuenta}
                    </div>
                  </div>
                  <div className="text-right font-bold text-white text-base">
                    {formatPEN(cta.saldoActual)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 flex justify-between items-center">
            <span>Conciliación de saldos de obra</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Al día
            </span>
          </div>
        </div>
      </div>

      {/* Tablas de últimas transacciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos Egresos */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">Últimos Egresos por Partida</h3>
            <Link href="/egresos" className="text-xs text-blue-400 hover:underline">Ver egresos</Link>
          </div>
          <div className="space-y-3">
            {ultimosEgresos.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No hay egresos registrados aún</p>
            ) : (
              ultimosEgresos.map((e) => (
                <div key={e.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="font-mono text-xs text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                        {e.partida?.item || 'N/A'}
                      </span>
                      <span>{e.entidad.razonSocial}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{e.partida?.descripcion || 'Gasto general'}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{e.numeroComprobante} • {formatDate(e.fecha)}</div>
                  </div>
                  <div className="font-bold text-rose-400 text-right">
                    - {formatPEN(e.monto)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Últimas Valorizaciones / Ingresos */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">Valorizaciones e Ingresos Cobrados</h3>
            <Link href="/ingresos" className="text-xs text-blue-400 hover:underline">Ver ingresos</Link>
          </div>
          <div className="space-y-3">
            {ultimasValorizaciones.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No hay valorizaciones cobradas aún</p>
            ) : (
              ultimasValorizaciones.map((v) => (
                <div key={v.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                        {v.estado}
                      </span>
                      <span>{v.numeroComprobante}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{v.observaciones || 'Avance de obra'}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{formatDate(v.fecha)}</div>
                  </div>
                  <div className="font-bold text-emerald-400 text-right">
                    + {formatPEN(v.monto)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
