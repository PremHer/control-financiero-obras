'use client';

import React, { useState } from 'react';
import { HardHat, Sparkles, PlusCircle, Building2, CheckCircle2, ArrowRight } from 'lucide-react';
import { cargarDatosSemillaAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NoProjectsWelcome() {
  const router = useRouter();
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSeed = async () => {
    setLoadingSeed(true);
    try {
      await cargarDatosSemillaAction();
      setSuccess(true);
      setTimeout(() => {
        router.refresh();
      }, 1200);
    } catch (error) {
      console.error(error);
      setLoadingSeed(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
      {/* Efecto de fondo sutil */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/20">
          <Building2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-3.5 py-1.5 rounded-full border border-blue-800 inline-block">
            Bienvenido a SIPRO v2.4
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Gestión Presupuestal y Control Financiero de Obras
          </h1>
          <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
            El sistema se encuentra activo en producción. Para comenzar a administrar egresos amarrados a partida y tesorería, selecciona una de las siguientes opciones de inicialización:
          </p>
        </div>

        {success && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-500 rounded-2xl flex items-center justify-center gap-3 text-emerald-200 font-medium animate-fade-in max-w-lg mx-auto">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>¡Datos del proyecto Chuco cargados con éxito! Entrando al Dashboard...</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 text-left max-w-3xl mx-auto">
          {/* Tarjeta 1: Cargar Semilla */}
          <div className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition flex flex-col justify-between space-y-4 group">
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
                <Sparkles className="w-4 h-4" /> Proyecto de Prueba (Semilla)
              </div>
              <h3 className="text-lg font-bold text-white">
                Canal de Riego Jesús - Chuco
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Carga instantáneamente la obra precargada con partidas de excavación, el cliente <span className="text-slate-300">Programa Subsectorial de Irrigaciones</span>, la proveedora <span className="text-slate-300">Sandoval Alva</span> y cuentas bancarias.
              </p>
            </div>

            <button
              onClick={handleSeed}
              disabled={loadingSeed || success}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2 group-hover:scale-[1.01]"
            >
              {loadingSeed ? 'Cargando datos relacionales...' : '🌱 Cargar Proyecto Chuco y Explorar'}
            </button>
          </div>

          {/* Tarjeta 2: Crear Proyecto Nuevo */}
          <div className="bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 transition flex flex-col justify-between space-y-4 group">
            <div>
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm mb-2">
                <HardHat className="w-4 h-4" /> Obra Personalizada
              </div>
              <h3 className="text-lg font-bold text-white">
                Crear Nuevo Proyecto desde Cero
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Administra tu propia constructora u obra privada/pública ingresando el nombre de tu proyecto, cliente, ubicación contractual y presupuesto total inicial.
              </p>
            </div>

            <Link
              href="/proyectos"
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs border border-slate-700 transition flex items-center justify-center gap-2 group-hover:scale-[1.01]"
            >
              <PlusCircle className="w-4 h-4 text-purple-400" /> Ir a Gestión de Proyectos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
