'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { crearProyectoConPartidas, eliminarProyecto, extraerTextoPDFAction } from '@/app/actions';
import { formatPEN, formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

interface ProyectoRow {
  id: string;
  codigo: string;
  nombre: string;
  cliente: string;
  ubicacion: string;
  fechaInicio: Date | string;
  presupuestoTotal: number;
  creadoEn: Date | string;
  totalPartidas?: number;
  totalEgresos?: number;
  saldoProyecto?: number;
}

export default function ProyectosClient({
  proyectos,
  proyectoActivoId
}: {
  proyectos: ProyectoRow[];
  proyectoActivoId?: string;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<'MANUAL' | 'EXCEL' | 'PDF'>('EXCEL');
  const [loading, setLoading] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);

  // Formulario General
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [cliente, setCliente] = useState('');
  const [ubicacion, setUbicacion] = useState('Cajamarca, Perú');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [presupuestoTotalManual, setPresupuestoTotalManual] = useState<number | ''>('');

  // Importador en lote
  const [textoImport, setTextoImport] = useState('');
  const [errorImport, setErrorImport] = useState('');
  const [partidasDetectadas, setPartidasDetectadas] = useState<any[]>([]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !codigo || !cliente) return;

    setLoading(true);
    try {
      const sumaPartidas = partidasDetectadas.reduce((a, b) => a + (b.parcialPresupuesto || 0), 0);
      await crearProyectoConPartidas(
        {
          nombre,
          codigo,
          cliente,
          ubicacion,
          fechaInicio,
          presupuestoTotal: tab === 'MANUAL' ? Number(presupuestoTotalManual) || 0 : sumaPartidas
        },
        partidasDetectadas
      );
      setShowModal(false);
      resetForm();
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNombre('');
    setCodigo('');
    setCliente('');
    setUbicacion('Cajamarca, Perú');
    setFechaInicio(new Date().toISOString().split('T')[0]);
    setPresupuestoTotalManual('');
    setTextoImport('');
    setPartidasDetectadas([]);
    setErrorImport('');
  };

  const handleDelete = async (id: string, nombreObra: string) => {
    if (!window.confirm(`¿Seguro de eliminar la obra "${nombreObra}" junto a todas sus partidas, egresos e ingresos en cascada?`)) return;
    setLoadingDelete(id);
    try {
      await eliminarProyecto(id);
      router.refresh();
    } finally {
      setLoadingDelete(null);
    }
  };

  const handleSelectProyecto = (id: string) => {
    document.cookie = `sipro_proyecto_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
    router.push('/');
    router.refresh();
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorImport('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const parsed: any[] = [];
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 2) continue;

          const col0 = String(row[0] || '').trim();
          const col1 = String(row[1] || '').trim();
          const col2 = String(row[2] || '').trim();
          const col3 = Number(row[3]) || 0;
          const col4 = Number(row[4]) || 0;
          const col5 = Number(row[5]) || col3 * col4;

          if (/^\d+([\.\-\_]\d+)*/.test(col0) && col1.length > 2) {
            parsed.push({
              item: col0,
              descripcion: col1,
              unidad: col2 || 'glb',
              metrado: col3 || 1,
              precioUnitario: col4 || col5,
              parcialPresupuesto: col5
            });
          }
        }

        if (parsed.length === 0) {
          setErrorImport('No se detectaron partidas con el formato: [Ítem] [Descripción] [Und] [Metrado] [P.Unitario].');
        } else {
          setPartidasDetectadas(parsed);
          if (!nombre && file.name) setNombre(file.name.replace(/\.xlsx|\.xls|\.csv/i, '').replace(/_/g, ' '));
          if (!codigo) setCodigo(`OBRA-${Math.floor(100 + Math.random() * 900)}`);
          if (!cliente) setCliente('Gobierno Regional / Cliente');
        }
      } catch (err) {
        setErrorImport('Error al leer el archivo Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePDFFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorImport('');
    setLoadingPDF(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await extraerTextoPDFAction(formData);

      if (!res.success || !res.text) {
        setErrorImport(res.error || 'No se pudo extraer el contenido del archivo PDF.');
      } else {
        setTextoImport(res.text);
        if (!nombre && file.name) setNombre(file.name.replace(/\.pdf/i, '').replace(/_/g, ' '));
        if (!codigo) setCodigo(`OBRA-${Math.floor(100 + Math.random() * 900)}`);
        if (!cliente) setCliente('Gobierno Regional / Cliente');
        parseTextAndExtract(res.text);
      }
    } catch (err: any) {
      setErrorImport('Error de conexión al procesar el archivo PDF.');
    } finally {
      setLoadingPDF(false);
    }
  };

  const parseTextAndExtract = (rawTextInput?: string) => {
    setErrorImport('');
    const contentToParse = typeof rawTextInput === 'string' ? rawTextInput : textoImport;
    if (!contentToParse.trim()) {
      setErrorImport('Sube tu archivo PDF o pega las filas aquí.');
      return;
    }

    const rawLines = contentToParse.split(/\r?\n/);
    const s10RawFiltered = rawLines.filter(raw => {
      const clean = raw.trim();
      if (!clean) return false;
      if (/^S10\s+Página/i.test(clean) || /^Presupuesto\s+\d+/i.test(clean) || /^SALDO DE OBRA/i.test(clean) || /^Cliente\s+/i.test(clean) || /^Lugar\s+/i.test(clean) || /^Ítem\s+Descripción/i.test(clean) || /^Costo\s+al\s+/i.test(clean)) {
        return false;
      }
      if (/^(?:COSTO\s+DIRECTO|GASTOS\s+GENERALES|UTILIDAD|SUB\s*TOTAL|IGV|TOTAL\s+PRESUPUESTO|SUPERVISION|SUPERVISIÓN|GASTOS\s+DE\s+SUPERVISION|EXPEDIENTE|LIQUIDACION|LIQUIDACIÓN|SON:\s*)/i.test(clean)) {
        return false;
      }
      return true;
    });

    // Normalizador S10 para ordenar líneas donde pdf-parse extrajo la descripción primero ("DEMOLICIÓN... m3 02.06 7.56 27.76 209.87")
    let fullTextS10 = s10RawFiltered.join(' \n ');
    fullTextS10 = fullTextS10.replace(
      /([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\/\%\-\_\(\)\,\.\+\:\;\s]{2,}?)\s+([a-zA-Z0-9\/\%\-\_]{1,6})\s+(\b(?:0[1-9]|[1-9]\d*)(?:\.\d{1,3})+\b)\s+([\d\,\.\-]+)\s+([\d\,\.\-]+)\s+([\d\,\.\-]+)/g,
      '\n$3 $1 $2 $4 $5 $6\n'
    );
    // Asegurar ruptura de línea antes de cada código jerárquico o título padre de S10
    fullTextS10 = fullTextS10.replace(/\s+(?=(?:0[1-9]|[1-9]\d*)(?:\.\d{1,3})+\s+[A-ZÁÉÍÓÚÑa-záéíóúñ])/g, '\n');
    fullTextS10 = fullTextS10.replace(/\s+(?=(?:0[1-9]|[1-9]\d*)\s+[A-ZÁÉÍÓÚÑ]{3,})/g, '\n');

    const s10NormalizedLines = fullTextS10.split(/\r?\n/);
    const lines: string[] = [];

    for (const raw of s10NormalizedLines) {
      const clean = raw.trim();
      if (!clean) continue;
      if (/^(?:0[1-9]|[1-9]\d*)(?:\.\d{1,3})*\s+/.test(clean) && !/^\d{4,}\s+/.test(clean)) {
        lines.push(clean);
      } else if (lines.length > 0) {
        lines[lines.length - 1] += ' ' + clean;
      }
    }

    const parsed: any[] = [];

    for (const line of lines) {
      const clean = line.trim();
      if (!clean) continue;

      // 1. Algoritmo Heurístico Universal S10 (Extraer ítem al inicio)
      const matchCodigo = clean.match(/^([\d\.\-\_]+)\s+(.+)$/);
      if (matchCodigo) {
        const item = matchCodigo[1].trim();
        const resto = matchCodigo[2].trim();

        if (item.length <= 15 && !/^\d{4,}$/.test(item)) {
          // A) Extraer 3 números montos del final (Metrado, PU, Parcial)
          const match3Nums = resto.match(/^(.*?)\s+([\d\,\.\-]+)\s+([\d\,\.\-]+)\s+([\d\,\.\-]+)$/);
          const match2Nums = resto.match(/^(.*?)\s+([\d\,\.\-]+)\s+([\d\,\.\-]+)$/);
          const match1Num = resto.match(/^(.*?)\s+([\d\,\.\-]+)$/);

          if (match3Nums) {
            const textCentro = match3Nums[1].trim();
            const met = Number(match3Nums[2].replace(/,/g, ''));
            const pu = Number(match3Nums[3].replace(/,/g, ''));
            const parc = Number(match3Nums[4].replace(/,/g, ''));

            if (!isNaN(parc) && textCentro.length > 1) {
              const matchUnd = textCentro.match(/^(.*?)\s+([a-zA-Z0-9\/\%\-\_]{1,8})$/);
              const desc = matchUnd && matchUnd[1].length > 2 ? matchUnd[1].trim() : textCentro;
              const und = matchUnd && matchUnd[1].length > 2 ? matchUnd[2].trim() : 'glb';

              parsed.push({ item, descripcion: desc, unidad: und, metrado: isNaN(met) ? 1 : met, precioUnitario: isNaN(pu) ? parc : pu, parcialPresupuesto: parc, esTitulo: false });
              continue;
            }
          }

          if (match2Nums) {
            const textCentro = match2Nums[1].trim();
            const n1 = Number(match2Nums[2].replace(/,/g, ''));
            const n2 = Number(match2Nums[3].replace(/,/g, ''));

            if (!isNaN(n2) && textCentro.length > 1) {
              const matchUnd = textCentro.match(/^(.*?)\s+([a-zA-Z0-9\/\%\-\_]{1,8})$/);
              const desc = matchUnd && matchUnd[1].length > 2 ? matchUnd[1].trim() : textCentro;
              const und = matchUnd && matchUnd[1].length > 2 ? matchUnd[2].trim() : 'glb';

              parsed.push({ item, descripcion: desc, unidad: und, metrado: isNaN(n1) ? 1 : n1, precioUnitario: isNaN(n2) ? 0 : n2, parcialPresupuesto: isNaN(n2) ? (isNaN(n1) ? 0 : n1) : n1 * n2, esTitulo: false });
              continue;
            }
          }

          if (match1Num) {
            const textCentro = match1Num[1].trim();
            const parc = Number(match1Num[2].replace(/,/g, ''));

            if (!isNaN(parc) && textCentro.length > 2 && textCentro !== 'Parcial S/' && !textCentro.includes('Presupuesto')) {
              const matchUnd = textCentro.match(/^(.*?)\s+([a-zA-Z0-9\/\%\-\_]{1,8})$/);
              const desc = matchUnd && matchUnd[1].length > 2 ? matchUnd[1].trim() : textCentro;
              const und = matchUnd && matchUnd[1].length > 2 ? matchUnd[2].trim() : 'TITULO';

              const esTit = und === 'TITULO' || !item.includes('.');
              parsed.push({ item, descripcion: desc, unidad: esTit ? 'TITULO' : und, metrado: esTit ? '-' : 1, precioUnitario: esTit ? '-' : parc, parcialPresupuesto: esTit ? 0 : parc, montoReferencialTitulo: esTit ? parc : undefined, esTitulo: esTit });
              continue;
            }
          }

          if (resto.length > 2 && !resto.includes('Descripción')) {
            parsed.push({ item, descripcion: resto, unidad: 'TITULO', metrado: '-', precioUnitario: '-', parcialPresupuesto: 0, esTitulo: true });
          }
        }
      }

      // 2. Regex Cronograma Gantt/MS Project (Ej: "3 1.1.1 CARTEL DE OBRA 4.80 m x 3.60 m 1 día")
      const matchGantt = clean.match(/^(?:\d+\s+)?([\d\.\-\_]+)\s+(.+?)\s+(\d+)\s*(?:días|dias|día|dia|d)\b(?:\s+([\d\/\-\.]+)\s+([\d\/\-\.]+))?/i);
      if (matchGantt) {
        const item = matchGantt[1];
        const desc = matchGantt[2];
        const duracion = Number(matchGantt[3]);
        const fIni = matchGantt[4] ? matchGantt[4].split('/').reverse().join('-') : undefined;
        const fFin = matchGantt[5] ? matchGantt[5].split('/').reverse().join('-') : undefined;

        parsed.push({
          item,
          descripcion: desc,
          unidad: 'glb',
          metrado: 1,
          precioUnitario: 0,
          parcialPresupuesto: 0,
          duracionDias: duracion,
          fechaInicioProg: fIni,
          fechaFinProg: fFin,
          esTitulo: false
        });
        continue;
      }

      // 3. Tab o múltiples espacios
      const tabs = clean.includes('\t') ? clean.split(/\t/) : clean.split(/\s{2,}/);
      if (tabs.length >= 4 && /^\d+([\.\-\_]\d+)*/.test(tabs[0].trim())) {
        const itemTab = tabs[0].trim();
        const descTab = tabs[1].trim();
        const undTab = tabs[2]?.trim() || 'glb';
        const metTab = Number((tabs[3] || '1').replace(/,/g, '')) || 1;
        const puTab = Number((tabs[4] || tabs[3] || '0').replace(/,/g, '')) || 0;
        const parcTab = Number((tabs[5] || tabs[4] || tabs[3] || '0').replace(/,/g, '')) || metTab * puTab;

        if (descTab.length > 2) {
          parsed.push({ item: itemTab, descripcion: descTab, unidad: undTab, metrado: metTab, precioUnitario: puTab, parcialPresupuesto: parcTab, esTitulo: false });
          continue;
        }
      }
    }

    // Post-proceso para diferenciar títulos y evitar duplicación en suma del Costo Directo
    for (const p of parsed) {
      const tieneHijos = parsed.some(otro => otro.item !== p.item && otro.item.startsWith(p.item + '.'));
      if (tieneHijos || p.esTitulo) {
        p.esTitulo = true;
        if (p.parcialPresupuesto > 0) {
          p.montoReferencialTitulo = p.parcialPresupuesto;
          p.parcialPresupuesto = 0;
          p.metrado = '-';
          p.precioUnitario = '-';
        }
      }
    }

    // Función de comparación jerárquica natural WBS / EDT (Ej: 1.1 < 1.2 < 1.10)
    const compareEDT = (itemA: string, itemB: string) => {
      const partsA = (itemA || '').split(/[\.\-\_]/).map(Number);
      const partsB = (itemB || '').split(/[\.\-\_]/).map(Number);
      const len = Math.max(partsA.length, partsB.length);
      for (let i = 0; i < len; i++) {
        const numA = isNaN(partsA[i]) ? -1 : partsA[i];
        const numB = isNaN(partsB[i]) ? -1 : partsB[i];
        if (numA !== numB) return numA - numB;
      }
      return (itemA || '').localeCompare(itemB || '', undefined, { numeric: true, sensitivity: 'base' });
    };

    if (parsed.length === 0) {
      setErrorImport('No se detectaron partidas en el documento. Verifica que las filas del PDF o texto extraído contengan código, descripción y montos/duración.');
      setPartidasDetectadas([]);
    } else {
      const sorted = parsed.sort((a, b) => compareEDT(a.item, b.item));
      setPartidasDetectadas(sorted);
      if (!nombre && sorted[0]?.descripcion) setNombre(`Proyecto: ${sorted[0].descripcion.slice(0, 40)}`);
      if (!codigo) setCodigo(`OBRA-${Math.floor(100 + Math.random() * 900)}`);
      if (!cliente) setCliente('Gobierno Regional / Cliente');
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-400" /> Portafolio Multi-Obra / Proyectos
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Administra todos tus contratos de obra, crea nuevos proyectos e importa presupuestos o cronogramas en segundos.
          </p>
        </div>

        <button
          onClick={() => { setShowModal(true); setPartidasDetectadas([]); setErrorImport(''); }}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-blue-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" /> + Registrar o Importar Obra
        </button>
      </div>

      {/* Grid de Proyectos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {proyectos.map((p) => {
          const egresos = p.totalEgresos || 0;
          const saldo = p.saldoProyecto !== undefined ? p.saldoProyecto : p.presupuestoTotal - egresos;
          const partidasCount = p.totalPartidas || 0;
          const avancePresupuesto = p.presupuestoTotal > 0 ? ((egresos / p.presupuestoTotal) * 100).toFixed(1) : '0.0';
          return (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition flex flex-col justify-between shadow-xl group relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950 px-2.5 py-1 rounded-md border border-blue-800/80">
                    {p.codigo}
                  </span>
                  <button
                    onClick={() => handleDelete(p.id, p.nombre)}
                    disabled={loadingDelete === p.id}
                    title="Eliminar este proyecto y todo su historial"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/60 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition line-clamp-2">
                  {p.nombre}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  🏢 {p.cliente} • 📍 {p.ubicacion}
                </p>

                <div className="mt-5 space-y-2.5 border-t border-slate-800/80 pt-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Presupuesto Directo:</span>
                    <span className="font-mono font-bold text-slate-200">{formatPEN(p.presupuestoTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Egresos Reales ({avancePresupuesto}%):</span>
                    <span className="font-mono font-bold text-amber-400">{formatPEN(egresos)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">Saldo de Obra:</span>
                    <span className="font-mono font-bold text-emerald-400">{formatPEN(saldo)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                    <span>Partidas Presupuestales:</span>
                    <span className="font-mono font-bold text-slate-300">{partidasCount} ítems</span>
                  </div>
                </div>

                <div className="w-full bg-slate-950 h-2 rounded-full mt-3 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      Number(avancePresupuesto) > 90 ? 'bg-rose-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(Number(avancePresupuesto), 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Inicio: {formatDate(p.fechaInicio)}</span>
                <button
                  onClick={() => handleSelectProyecto(p.id)}
                  className="px-4 py-2 bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-blue-600/20"
                >
                  Administrar Obra <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CREAR/IMPORTAR PROYECTO */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-400" /> Registrar Nueva Obra e Importar Partidas
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            {/* Selector de Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => { setTab('EXCEL'); setErrorImport(''); }}
                className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 ${
                  tab === 'EXCEL' ? 'bg-slate-900 text-emerald-400 border-t border-x border-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Importar de Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => { setTab('PDF'); setErrorImport(''); }}
                className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 ${
                  tab === 'PDF' ? 'bg-slate-900 text-blue-400 border-t border-x border-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-400" /> Subir Archivo PDF Presupuesto (S10)
              </button>
              <button
                type="button"
                onClick={() => { setTab('MANUAL'); setPartidasDetectadas([]); setErrorImport(''); }}
                className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 ${
                  tab === 'MANUAL' ? 'bg-slate-900 text-purple-400 border-t border-x border-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-4 h-4 text-purple-400" /> Creación Manual (Proyecto Vacío)
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Datos Generales de la Obra */}
              <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                <span className="text-xs font-bold text-slate-300 uppercase block">1. Datos Generales del Contrato / Obra</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Nombre Oficial de la Obra *</label>
                    <input
                      type="text"
                      placeholder="Ej. Mejoramiento del Canal de Riego..."
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Código o SNIP *</label>
                    <input
                      type="text"
                      placeholder="Ej. OBRA-2026-01"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Cliente / Entidad *</label>
                    <input
                      type="text"
                      placeholder="Ej. Gobierno Regional de Cajamarca"
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Ubicación / Región</label>
                    <input
                      type="text"
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fecha de Inicio</label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                {tab === 'MANUAL' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Presupuesto Total Directo (S/)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej. 1500000.00"
                      value={presupuestoTotalManual}
                      onChange={(e) => setPresupuestoTotalManual(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-emerald-400"
                    />
                  </div>
                )}
              </div>

              {/* Zona de Importación según Tab */}
              {tab !== 'MANUAL' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase block">2. Cargar y Analizar Archivo de Partidas</span>

                  {errorImport && (
                    <div className="p-3 bg-rose-950 border border-rose-500 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{errorImport}</span>
                    </div>
                  )}

                  {tab === 'EXCEL' ? (
                    <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/60 rounded-2xl p-6 text-center transition bg-slate-950/40">
                      <UploadCloud className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                      <label className="block text-xs font-semibold text-white cursor-pointer hover:underline">
                        Haz clic para seleccionar o arrastrar tu archivo Excel (`.xlsx`, `.csv`)
                        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} className="hidden" />
                      </label>
                      <p className="text-[11px] text-slate-500 mt-1">Columnas detectadas: Ítem | Descripción | Und | Metrado | P. Unitario</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* SUBIR ARCHIVO PDF DIRECTO */}
                      <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/60 rounded-2xl p-6 text-center transition bg-slate-950/60">
                        {loadingPDF ? (
                          <div className="flex flex-col items-center justify-center py-3 space-y-2">
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                            <span className="text-xs font-semibold text-blue-300">Extrayendo tablas y analizando páginas de tu archivo PDF...</span>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="w-10 h-10 text-blue-400 mx-auto mb-2" />
                            <label className="block text-xs font-bold text-white cursor-pointer hover:underline">
                              Haz clic para subir tu archivo PDF de Presupuesto (`.pdf`) y extraer todas sus partidas
                              <input type="file" accept=".pdf" onChange={handlePDFFileUpload} className="hidden" />
                            </label>
                            <p className="text-[11px] text-slate-400 mt-1">
                              El servidor extraerá el contenido automáticamente y organizará ítems, metrados y precios.
                            </p>
                          </>
                        )}
                      </div>

                      {/* Cuadro de previsualización de texto copiado o extraído */}
                      <div className="space-y-2 pt-1 border-t border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-400">
                            Previsualización de texto extraído / O si prefieres pegar las filas manualmente:
                          </span>
                          <button
                            type="button"
                            onClick={() => parseTextAndExtract()}
                            className="py-1 px-3 bg-purple-600/80 hover:bg-purple-600 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" /> Re-analizar Texto
                          </button>
                        </div>
                        <textarea
                          rows={4}
                          value={textoImport}
                          onChange={(e) => setTextoImport(e.target.value)}
                          placeholder="Al subir el archivo PDF aparecerá aquí su contenido, o puedes pegar filas manualmente (Ej: 01.01 EXCAVACION m3 150 45.20 6780)"
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {partidasDetectadas.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center text-xs font-bold text-emerald-400 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {partidasDetectadas.length} Ítems ({partidasDetectadas.filter(p => !p.esTitulo).length} Partidas CD)</span>
                        <span className="text-sm bg-emerald-950 px-3 py-1 rounded-lg border border-emerald-800 text-emerald-300">
                          Costo Directo Total: {formatPEN(partidasDetectadas.reduce((a, b) => a + (b.parcialPresupuesto || 0), 0))}
                        </span>
                      </div>
                      <div className="max-h-56 overflow-y-auto border border-slate-800 rounded-xl">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-950 text-slate-400 uppercase sticky top-0 z-10">
                            <tr>
                              <th className="p-2">Ítem</th>
                              <th className="p-2">Descripción</th>
                              <th className="p-2">Und</th>
                              <th className="p-2 text-right">Metrado</th>
                              <th className="p-2 text-right">P.U.</th>
                              <th className="p-2 text-right">Parcial / Costo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {partidasDetectadas.slice(0, 80).map((p, idx) => {
                              const partes = (p.item || '').split(/[\.\-\_]/).filter(Boolean);
                              const nivel = Math.max(0, partes.length - 1);
                              return (
                                <tr key={idx} className={`hover:bg-slate-800/30 ${p.esTitulo ? 'bg-slate-950/80 text-amber-300 font-bold border-t border-slate-800' : 'text-slate-300'}`}>
                                  <td className="p-2 font-mono whitespace-nowrap" style={{ paddingLeft: `${nivel * 1 + 0.5}rem` }}>
                                    <span className={p.esTitulo ? 'text-amber-400' : 'text-blue-400'}>
                                      {p.esTitulo && (nivel === 0 ? '📂 ' : '└─ ')}
                                      {!p.esTitulo && nivel > 0 && '├─ '}
                                      {p.item}
                                    </span>
                                  </td>
                                  <td className="p-2">{p.descripcion}</td>
                                  <td className="p-2">
                                    {p.esTitulo ? <span className="bg-amber-950/80 text-amber-400 px-1.5 py-0.5 rounded text-[10px]">TÍTULO</span> : p.unidad}
                                  </td>
                                  <td className="p-2 text-right font-mono">{p.metrado}</td>
                                  <td className="p-2 text-right font-mono">{p.precioUnitario}</td>
                                  <td className="p-2 text-right font-mono font-bold">
                                    {p.esTitulo ? (
                                      <span className="text-amber-400/80">{formatPEN(p.montoReferencialTitulo || 0)}</span>
                                    ) : (
                                      <span className="text-emerald-400">{formatPEN(p.parcialPresupuesto || 0)}</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">Cancelar</button>
                <button
                  type="submit"
                  disabled={loading || (tab !== 'MANUAL' && partidasDetectadas.length === 0)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/20 transition"
                >
                  {loading ? 'Creando Obra...' : tab === 'MANUAL' ? 'Crear Obra Vacía' : `Crear Obra e Importar ${partidasDetectadas.length} Partidas`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
