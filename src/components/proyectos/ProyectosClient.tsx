'use client';

import React, { useState } from 'react';
import { HardHat, Plus, Building2, CheckCircle2, ArrowRight, MapPin, Calendar, Wallet, Sparkles } from 'lucide-react';
import { crearProyecto, seleccionarProyecto, cargarDatosSemillaAction } from '@/app/actions';
import { formatPEN, formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface ProyectoRow {
  id: string;
  codigo: string;
  nombre: string;
  cliente: string;
  ubicacion: string;
  fechaInicio: Date | string;
  presupuestoTotal: number;
  gastoAcumulado?: number;
}

export default function ProyectosClient({
  proyectos,
  proyectoActivoId,
}: {
  proyectos: ProyectoRow[];
  proyectoActivoId?: string;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSelect, setLoadingSelect] = useState<string | null>(null);
  const [loadingSeed, setLoadingSeed] = useState(false);

  // Formulario nuevo proyecto
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [cliente, setCliente] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [presupuestoTotal, setPresupuestoTotal] = useState<number | ''>('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo || !nombre || !cliente || !ubicacion || !presupuestoTotal) return;

    setLoading(true);
    try {
      await crearProyecto({
        codigo,
        nombre,
        cliente,
        ubicacion,
        fechaInicio,
        presupuestoTotal: Number(presupuestoTotal),
      });
      setShowModal(false);
      setCodigo('');
      setNombre('');
      setCliente('');
      setUbicacion('');
      setPresupuestoTotal('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id: string) => {
    setLoadingSelect(id);
    try {
      await seleccionarProyecto(id);
      router.push('/');
      router.refresh();
    } finally {
      setLoadingSelect(null);
    }
  };

  const handleSeed = async () => {
    setLoadingSeed(true);
    try {
      await cargarDatosSemillaAction();
      router.refresh();
    } finally {
      setLoadingSeed(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Cabecera del módulo de proyectos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-400" /> Cartera de Proyectos y Obras
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Administra tus obras civiles, activa la obra en curso para control presupuestal o registra nuevos proyectos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={loadingSeed}
            className="px-4 py-2.5 bg-amber-600/90 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-amber-600/20 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" /> {loadingSeed ? 'Cargando Semilla...' : 'Cargar Proyecto Chuco'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" /> + Nueva Obra
          </button>
        </div>
      </div>

      {/* Grid de Proyectos */}
      {proyectos.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <HardHat className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-400">No tienes obras registradas actualmente en este servidor.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs"
          >
            + Crear Mi Primer Proyecto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proyectos.map((prj) => {
            const isActivo = prj.id === proyectoActivoId;
            return (
              <div
                key={prj.id}
                className={`bg-slate-900 border rounded-2xl p-6 flex flex-col justify-between transition relative overflow-hidden ${
                  isActivo
                    ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-2xl shadow-blue-950'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {isActivo && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-md">
                    <CheckCircle2 className="w-3 h-3" /> Obra Seleccionada
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                      {prj.codigo}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-2 leading-snug">{prj.nombre}</h3>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" /> {prj.ubicacion}
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Cliente:</span>
                      <span className="font-medium text-slate-200 truncate max-w-[180px]">{prj.cliente}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Fecha Inicio:</span>
                      <span className="font-mono text-slate-300">{formatDate(prj.fechaInicio)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Presupuesto Total:</span>
                      <span className="font-bold text-emerald-400 font-mono">{formatPEN(prj.presupuestoTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800/80">
                  {isActivo ? (
                    <button
                      onClick={() => router.push('/')}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20"
                    >
                      Ir al Panel de Control <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelect(prj.id)}
                      disabled={loadingSelect === prj.id}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition border border-slate-700"
                    >
                      {loadingSelect === prj.id ? 'Seleccionando Obra...' : 'Seleccionar como Obra Activa'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nueva Obra */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Registrar Nueva Obra / Proyecto Civil</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Código de Obra</label>
                <input
                  type="text"
                  placeholder="Ej. OBRA-2026-LIMA01"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Nombre Completo de la Obra</label>
                <input
                  type="text"
                  placeholder="Ej. Construcción del Puente Peatonal Santa Rosa"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Cliente / Entidad</label>
                  <input
                    type="text"
                    placeholder="Ej. Municipalidad de Lima"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Ubicación</label>
                  <input
                    type="text"
                    placeholder="Ej. Lima / Miraflores"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Fecha de Inicio</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Presupuesto Total (PEN)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={presupuestoTotal}
                    onChange={(e) => setPresupuestoTotal(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-bold font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20"
                >
                  {loading ? 'Registrando Obra...' : 'Crear y Activar Obra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
