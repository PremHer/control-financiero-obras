'use client';

import React, { useState } from 'react';
import { Landmark, Plus, Trash2, Edit3, RefreshCw, CheckCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { crearCuentaBancaria, eliminarCuentaBancaria, actualizarSaldoCuenta } from '@/app/actions';
import { formatPEN, formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface CuentaRow {
  id: string;
  banco: string;
  numeroCuenta: string;
  tipoCuenta: string;
  moneda: string;
  saldoActual: number;
  transacciones: Array<{
    id: string;
    tipo: string;
    monto: number;
    fecha: Date | string;
    tipoComprobante: string;
    entidad: { razonSocial: string };
    partida?: { item: string } | null;
  }>;
}

export default function TesoreriaClient({ cuentas }: { cuentas: CuentaRow[] }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<CuentaRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);

  // Formulario nueva cuenta
  const [banco, setBanco] = useState('');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('CORRIENTE');
  const [moneda, setMoneda] = useState('PEN');
  const [saldoInicial, setSaldoInicial] = useState<number | ''>('');

  // Formulario editar saldo
  const [nuevoSaldo, setNuevoSaldo] = useState<number | ''>('');

  const saldoLiquidoTotal = cuentas.reduce((acc, c) => acc + c.saldoActual, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banco || !numeroCuenta) return;

    setLoading(true);
    try {
      await crearCuentaBancaria({
        banco,
        numeroCuenta,
        tipoCuenta,
        moneda,
        saldoInicial: Number(saldoInicial) || 0
      });
      setShowModal(false);
      setBanco('');
      setNumeroCuenta('');
      setSaldoInicial('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, nombreBanco: string, numCta: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la cuenta "${nombreBanco} - ${numCta}"? Se eliminarán también los registros de movimientos en esta cuenta.`)) {
      return;
    }
    setLoadingDelete(id);
    try {
      await eliminarCuentaBancaria(id);
      router.refresh();
    } finally {
      setLoadingDelete(null);
    }
  };

  const handleEditSaldo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal || nuevoSaldo === '') return;

    setLoading(true);
    try {
      await actualizarSaldoCuenta(showEditModal.id, Number(nuevoSaldo));
      setShowEditModal(null);
      setNuevoSaldo('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Cabecera del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Landmark className="w-6 h-6 text-purple-400" /> Módulo de Tesorería y Cuentas Bancarias
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de liquidez, cuentas bancarias, cajas chicas y movimientos conciliados.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-purple-400">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Liquidez Conciliada</div>
              <div className="text-base font-bold text-purple-400">{formatPEN(saldoLiquidoTotal)}</div>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-purple-600/20"
          >
            <Plus className="w-4 h-4" /> + Agregar Cuenta / Caja
          </button>
        </div>
      </div>

      {/* Grid de Cuentas */}
      {cuentas.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <Landmark className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No tienes cuentas bancarias registradas en Tesorería</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Puedes registrar tus cuentas del Banco de la Nación, BCP, BBVA, Interbank o tus cajas chicas de obra para administrar el flujo de fondos y saldos en vivo.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg"
          >
            + Crear Mi Primera Cuenta / Caja
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cuentas.map((cta) => (
            <div key={cta.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6 relative group">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950 px-2.5 py-1 rounded border border-blue-800">
                      {cta.tipoCuenta}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-3">{cta.banco}</h3>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">Cta: {cta.numeroCuenta}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="text-right mr-2">
                      <div className="text-xs text-slate-400">Saldo Actual ({cta.moneda})</div>
                      <div className="text-2xl font-bold text-white mt-1">{formatPEN(cta.saldoActual)}</div>
                    </div>
                    <button
                      onClick={() => {
                        setShowEditModal(cta);
                        setNuevoSaldo(cta.saldoActual);
                      }}
                      title="Editar saldo manual de esta cuenta"
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cta.id, cta.banco, cta.numeroCuenta)}
                      disabled={loadingDelete === cta.id}
                      title="Eliminar esta cuenta bancaria permanentemente"
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/60 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Movimientos recientes de la cuenta */}
                <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="text-xs font-bold uppercase text-slate-400">Últimos movimientos de esta cuenta</div>
                  {cta.transacciones.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">Sin movimientos recientes en esta cuenta</p>
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
                  <CheckCircle className="w-3.5 h-3.5" /> Conciliación bancaria activa
                </span>
                <span>ID: {cta.id.slice(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nueva Cuenta */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-purple-400" /> Registrar Cuenta o Caja Chica
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Nombre de Banco / Caja</label>
                <input
                  type="text"
                  placeholder="Ej. Banco de la Nación, BCP, Caja Chica Obra"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Número de Cuenta o Referencia</label>
                <input
                  type="text"
                  placeholder="Ej. 00-068-123456 ó CAJA-01"
                  value={numeroCuenta}
                  onChange={(e) => setNumeroCuenta(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Tipo de Cuenta</label>
                  <select
                    value={tipoCuenta}
                    onChange={(e) => setTipoCuenta(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="CORRIENTE">Cuenta Corriente</option>
                    <option value="DETRACCIONES">Detracciones</option>
                    <option value="AHORROS">Ahorros</option>
                    <option value="CAJA_CHICA">Caja Chica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Moneda</label>
                  <select
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  >
                    <option value="PEN">PEN (S/)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Saldo Inicial Conciliado (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-purple-400 font-bold font-mono"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">Cancelar</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/20">
                  {loading ? 'Registrando...' : 'Registrar Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Saldo */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-400" /> Ajustar Saldo Conciliado
              </h3>
              <button onClick={() => setShowEditModal(null)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleEditSaldo} className="p-6 space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-300">{showEditModal.banco}</div>
                <div className="text-[11px] font-mono text-slate-500 mb-3">{showEditModal.numeroCuenta}</div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Nuevo Saldo Real (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  value={nuevoSaldo}
                  onChange={(e) => setNuevoSaldo(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-purple-400 font-bold font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowEditModal(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">Cancelar</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold">
                  {loading ? 'Guardando...' : 'Actualizar Saldo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
