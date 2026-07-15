'use client';

import React, { useState } from 'react';
import { Search, FileSpreadsheet, FileText, ChevronRight, ChevronDown, Filter } from 'lucide-react';
import { formatPEN } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PartidaRow {
  id: string;
  item: string;
  descripcion: string;
  unidad: string;
  metrado: number;
  precioUnitario: number;
  parcialPresupuesto: number;
  gastado: number;
  saldo: number;
}

export default function PresupuestoTable({ partidas }: { partidas: PartidaRow[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = partidas.filter(
    (p) =>
      p.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPresupuestado = partidas.reduce((acc, p) => acc + p.parcialPresupuesto, 0);
  const totalGastado = partidas.reduce((acc, p) => acc + p.gastado, 0);
  const totalSaldo = totalPresupuestado - totalGastado;

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((p) => ({
        Ítem: p.item,
        Descripción: p.descripcion,
        Unidad: p.unidad,
        Metrado: p.metrado,
        'P. Unitario': p.precioUnitario,
        Presupuestado: p.parcialPresupuesto,
        Gastado: p.gastado,
        Saldo: p.saldo,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto_Chuco');
    XLSX.writeFile(wb, 'Presupuesto_Canal_Riego_Chuco.xlsx');
  };

  const exportPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    doc.setFontSize(16);
    doc.text('Control Presupuestal por Partidas - Canal de Riego Jesús Chuco', 40, 40);
    doc.setFontSize(10);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-PE')}`, 40, 60);

    const bodyData = filtered.map((p) => [
      p.item,
      p.descripcion,
      p.unidad,
      p.metrado.toLocaleString(),
      formatPEN(p.precioUnitario),
      formatPEN(p.parcialPresupuesto),
      formatPEN(p.gastado),
      formatPEN(p.saldo),
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['Ítem', 'Descripción', 'Und', 'Metrado', 'P.U.', 'Presupuestado', 'Gastado', 'Saldo Partida']],
      body: bodyData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save('Presupuesto_Canal_Riego_Chuco.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white">Módulo de Presupuesto por Partidas</h1>
          <p className="text-xs text-slate-400 mt-1">
            Estructura jerárquica con control automático de costos directos vs. saldo real por partida.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportExcel}
            className="px-4 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
          </button>
          <button
            onClick={exportPDF}
            className="px-4 py-2 bg-rose-600/90 hover:bg-rose-600 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-rose-600/20"
          >
            <FileText className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por ítem (11.01) o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-300 w-full sm:w-auto justify-end">
          <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            Total Presupuestado: <span className="font-bold text-white ml-1">{formatPEN(totalPresupuestado)}</span>
          </div>
          <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            Total Gastado: <span className="font-bold text-amber-400 ml-1">{formatPEN(totalGastado)}</span>
          </div>
          <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            Saldo Total: <span className="font-bold text-emerald-400 ml-1">{formatPEN(totalSaldo)}</span>
          </div>
        </div>
      </div>

      {/* Tabla Jerárquica */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                <th className="py-3.5 px-4 font-mono">Ítem</th>
                <th className="py-3.5 px-4">Descripción de Partida</th>
                <th className="py-3.5 px-4 text-center">Und.</th>
                <th className="py-3.5 px-4 text-right">Metrado</th>
                <th className="py-3.5 px-4 text-right">P. Unitario</th>
                <th className="py-3.5 px-4 text-right text-blue-400">Presupuestado (S/)</th>
                <th className="py-3.5 px-4 text-right text-amber-400">Gastado (S/)</th>
                <th className="py-3.5 px-4 text-right text-emerald-400 font-bold">Saldo Partida (S/)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((p) => {
                const porcentaje = ((p.gastado / p.parcialPresupuesto) * 100).toFixed(1);
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400 whitespace-nowrap">
                      {p.item}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-100 max-w-sm">
                      {p.descripcion}
                      <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-800/80">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            Number(porcentaje) > 90 ? 'bg-rose-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(Number(porcentaje), 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">{p.unidad}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      {p.metrado.toLocaleString('es-PE')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                      {formatPEN(p.precioUnitario)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">
                      {formatPEN(p.parcialPresupuesto)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                      {formatPEN(p.gastado)}
                      <span className="block text-[10px] text-slate-500">{porcentaje}%</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatPEN(p.saldo)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
