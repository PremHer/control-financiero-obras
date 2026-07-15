'use client';

import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, TrendingUp, PlusCircle } from 'lucide-react';
import { registrarIngreso } from '@/app/actions';
import { formatPEN } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function IngresoFormClient({
  proyectoId,
  clientes,
  cuentas,
}: {
  proyectoId: string;
  clientes: { id: string; razonSocial: string; documento: string }[];
  cuentas: { id: string; banco: string; numeroCuenta: string; saldoActual: number }[];
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState('VALORIZACION');
  const [monto, setMonto] = useState<number | ''>('');
  const [entidadId, setEntidadId] = useState(clientes[0]?.id || '');
  const [cuentaId, setCuentaId] = useState(cuentas[0]?.id || '');
  const [tipoComprobante, setTipoComprobante] = useState('RESOLUCION');
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!monto || !entidadId || !cuentaId || !numeroComprobante) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      await registrarIngreso({
        proyectoId,
        entidadId,
        cuentaBancariaId: cuentaId,
        monto: Number(monto),
        tipoComprobante,
        numeroComprobante,
        tipo,
        observaciones,
      });
      setSuccess(true);
      setTimeout(() => {
        router.refresh();
        setSuccess(false);
        setMonto('');
        setNumeroComprobante('');
        setObservaciones('');
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Error al registrar el ingreso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-400" /> Registrar Ingreso o Valorización Aprobada
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            El monto ingresado aumentará de forma inmediata el saldo en la cuenta de tesorería seleccionada.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-950 border border-emerald-500 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ¡Ingreso registrado y cuenta bancaria incrementada!
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-950 border border-rose-500 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">Tipo de Movimiento</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
          >
            <option value="VALORIZACION">Valorización Aprobada por Cliente</option>
            <option value="INGRESO">Adelanto Directo / Ingreso General</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">Entidad (Cliente / Pagador)</label>
          <select
            value={entidadId}
            onChange={(e) => setEntidadId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.razonSocial}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">Cuenta Bancaria de Destino</label>
          <select
            value={cuentaId}
            onChange={(e) => setCuentaId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
          >
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.banco} - {c.numeroCuenta} ({formatPEN(c.saldoActual)})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">Tipo y N° Comprobante</label>
          <div className="flex gap-2">
            <select
              value={tipoComprobante}
              onChange={(e) => setTipoComprobante(e.target.value)}
              className="px-2.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white w-32"
            >
              <option value="RESOLUCION">Resolución</option>
              <option value="FACTURA">Factura</option>
              <option value="RECIBO">Recibo</option>
            </select>
            <input
              type="text"
              placeholder="Ej. VAL-002-2026"
              value={numeroComprobante}
              onChange={(e) => setNumeroComprobante(e.target.value)}
              className="flex-1 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">Monto del Ingreso (PEN)</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={monto}
            onChange={(e) => setMonto(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-emerald-400 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">Observaciones</label>
          <input
            type="text"
            placeholder="Ej. Valorización N° 02 Avance Julio"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
          />
        </div>

        <div className="sm:col-span-2 md:col-span-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
          >
            {loading ? 'Acreditando en cuenta...' : 'Registrar Ingreso en Tesorería'}
          </button>
        </div>
      </form>
    </div>
  );
}
