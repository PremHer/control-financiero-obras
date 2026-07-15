'use client';

import React from 'react';
import { HardHat, FileSpreadsheet, PlusCircle, Building2, ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';

export default function NoProjectsWelcome() {
  return (
    <div className="max-w-4xl mx-auto my-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
      {/* Efectos de fondo sutil */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/20">
          <Building2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-3.5 py-1.5 rounded-full border border-blue-800 inline-block">
            Sistema Web de Obras SIPRO
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Gestión Presupuestal y Control Financiero de Obras
          </h1>
          <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
            El sistema se encuentra en línea y listo para operar. No tienes ningún proyecto de construcción registrado actualmente. Elige cómo deseas crear y configurar tu primer proyecto:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 text-left max-w-3xl mx-auto">
          {/* Tarjeta 1: Importar de Presupuesto/Cronograma */}
          <div className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition flex flex-col justify-between space-y-4 group">
            <div>
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm mb-2">
                <FileSpreadsheet className="w-4 h-4" /> Importación Inteligente
              </div>
              <h3 className="text-lg font-bold text-white">
                Crear desde Presupuesto o Cronograma (Excel / PDF / S10)
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Sube tu archivo <span className="text-slate-300">Excel (`.xlsx`)</span> o pega la tabla de tu <span className="text-slate-300">Presupuesto en PDF</span> para detectar e importar automáticamente todas las partidas con sus metrados, precios y montos parciales.
              </p>
            </div>

            <Link
              href="/proyectos?import=true"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2 group-hover:scale-[1.01]"
            >
              <FileText className="w-4 h-4" /> Importar Partidas y Crear Obra <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Tarjeta 2: Crear Proyecto Manual */}
          <div className="bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 transition flex flex-col justify-between space-y-4 group">
            <div>
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm mb-2">
                <HardHat className="w-4 h-4" /> Obra Manual
              </div>
              <h3 className="text-lg font-bold text-white">
                Crear Proyecto desde Cero (Manual)
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Registra tu contrato u obra ingresando manualmente el nombre, cliente, código, ubicación y presupuesto global para luego ir agregando las partidas según avance tu obra.
              </p>
            </div>

            <Link
              href="/proyectos"
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs border border-slate-700 transition flex items-center justify-center gap-2 group-hover:scale-[1.01]"
            >
              <PlusCircle className="w-4 h-4 text-purple-400" /> Registrar Proyecto Manual <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
