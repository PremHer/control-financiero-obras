'use client';

import React, { useState } from 'react';
import { Search, UploadCloud, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { registrarEgreso } from '@/app/actions';
import { formatPEN } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface PartidaOption {
  id: string;
  item: string;
  descripcion: string;
  saldoDisponible: number;
}

interface ProveedorOption {
  id: string;
  razonSocial: string;
  documento: string;
}

interface CuentaOption {
  id: string;
  banco: string;
  numeroCuenta: string;
  saldoActual: number;
}

export default function EgresoFormClient({
  proyectoId,
  partidas,
  proveedores,
  cuentas,
}: {
  proyectoId: string;
  partidas: PartidaOption[];
  proveedores: ProveedorOption[];
  cuentas: CuentaOption[];
}) {
  const router = useRouter();
  const [searchPartida, setSearchPartida] = useState('');
  const [selectedPartida, setSelectedPartida] = useState<PartidaOption | null>(null);
  const [monto, setMonto] = useState<number | ''>('');
  const [entidadId, setEntidadId] = useState('');
  const [cuentaId, setCuentaId] = useState(cuentas[0]?.id || '');
  const [tipoComprobante, setTipoComprobante] = useState('FACTURA');
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const partidasFiltradas = partidas.filter(
    (p) =>
      p.item.toLowerCase().includes(searchPartida.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(searchPartida.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedPartida || !monto || !entidadId || !cuentaId || !numeroComprobante) {
      setError('Por favor completa todos los campos obligatorios.');
      return;
    }
    if (Number(monto) <= 0) {
      setError('El monto del egreso debe ser mayor a cero.');
      return;
    }

    setLoading(true);
    try {
      await registrarEgreso({
        proyectoId,
        partidaId: selectedPartida.id,
        entidadId,
        cuentaBancariaId: cuentaId,
        monto: Number(monto),
        tipoComprobante,
        numeroComprobante,
        observaciones,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Error al registrar el egreso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {success && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500 rounded-2xl flex items-center gap-3 text-emerald-200 animate-fade-in shadow-xl shadow-emerald-950">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold">¡Egreso registrado exitosamente!</div>
            <div className="text-xs text-emerald-300">
              Descontado del saldo de la partida y reflejado en el balance bancario. Redirigiendo al Dashboard...
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/80 border border-rose-500 rounded-2xl flex items-center gap-3 text-rose-200">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-slate-950 px-6 py-5 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-white">Registro de Egresos en Campo / Oficina</h1>
            <p className="text-xs text-slate-400 mt-1">
              Amarrado obligatoriamente a una partida para control estricto del costo directo.
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 1. Selección de Partida con Autocompletado */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
              1. Buscar y Asignar Partida Presupuestal (Obligatorio)
            </label>
            {selectedPartida ? (
              <div className="flex items-center justify-between p-4 bg-blue-950/60 border border-blue-500/50 rounded-xl">
                <div>
                  <span className="font-mono text-blue-400 font-bold mr-2.5 text-sm">{selectedPartida.item}</span>
                  <span className="text-sm font-semibold text-white">{selectedPartida.descripcion}</span>
                  <div className="text-xs text-emerald-400 mt-1.5 font-bold">
                    Saldo disponible en partida: {formatPEN(selectedPartida.saldoDisponible)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPartida(null)}
                  className="text-xs text-blue-300 hover:text-white underline bg-blue-900/50 px-3 py-1 rounded-lg"
                >
                  Cambiar partida
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchPartida}
                  onChange={(e) => setSearchPartida(e.target.value)}
                  placeholder="Escribe el ítem (ej. 11.01.01) o descripción (Excavación)..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition text-white placeholder-slate-500"
                />
                {searchPartida && (
                  <div className="absolute z-10 w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl max-h-48 overflow-y-auto shadow-2xl">
                    {partidasFiltradas.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPartida(p);
                          setSearchPartida('');
                        }}
                        className="p-3.5 hover:bg-slate-900 cursor-pointer border-b border-slate-900/80 text-sm flex justify-between items-center transition"
                      >
                        <div>
                          <span className="font-mono font-bold text-blue-400 mr-2">{p.item}</span>
                          <span className="text-slate-200 font-medium">{p.descripcion}</span>
                        </div>
                        <span className="text-xs text-emerald-400 font-mono font-semibold">
                          Saldo: {formatPEN(p.saldoDisponible)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Monto y Comprobante */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
                Tipo Comprobante
              </label>
              <select
                value={tipoComprobante}
                onChange={(e) => setTipoComprobante(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-white"
              >
                <option value="FACTURA">Factura Electrónica</option>
                <option value="BOLETA">Boleta de Venta</option>
                <option value="RECIBO">Recibo por Honorarios / RH</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
                Número Comprobante
              </label>
              <input
                type="text"
                placeholder="Ej. F001-000452"
                value={numeroComprobante}
                onChange={(e) => setNumeroComprobante(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 font-mono text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
                Monto Pagado (PEN)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 font-bold text-white font-mono"
                required
              />
            </div>
          </div>

          {/* 3. Proveedor y Cuenta de Origen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
                Proveedor / Destinatario
              </label>
              <select
                value={entidadId}
                onChange={(e) => setEntidadId(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-white"
                required
              >
                <option value="">-- Seleccionar Proveedor --</option>
                {proveedores.map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    {prov.razonSocial} (RUC: {prov.documento})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
                Cuenta Bancaria de Origen
              </label>
              <select
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-white"
                required
              >
                {cuentas.map((cta) => (
                  <option key={cta.id} value={cta.id}>
                    {cta.banco} - {cta.numeroCuenta} ({formatPEN(cta.saldoActual)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Observaciones */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
              Observaciones / Concepto Detallado del Gasto
            </label>
            <input
              type="text"
              placeholder="Ej. Pago por alquiler de maquinaria pesada semana 2..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-white"
            />
          </div>

          {/* 5. Adjuntar Comprobante Digital */}
          <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-950/40">
            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-300">
              Haz clic o arrastra aquí el archivo o foto del comprobante de campo
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Soporta PDF, JPG o PNG de la factura/boleta</p>
          </div>

          <button
            type="submit"
            disabled={!selectedPartida || !monto || !entidadId || loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 font-bold text-white rounded-xl shadow-xl shadow-blue-600/20 transition flex items-center justify-center gap-2 text-sm"
          >
            {loading ? 'Procesando y Descontando de Partida...' : 'Registrar Egreso y Afectar Presupuesto'}
          </button>
        </form>
      </div>
    </div>
  );
}
