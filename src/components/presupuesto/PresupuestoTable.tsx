'use client';

import React, { useState } from 'react';
import { 
  Search, 
  FileSpreadsheet, 
  FileText, 
  Plus, 
  UploadCloud, 
  Calendar, 
  DollarSign, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { 
  agregarPartidaIndividual, 
  agregarPartidasAProyecto, 
  eliminarPartida, 
  actualizarCronogramaPartida,
  extraerTextoPDFAction
} from '@/app/actions';
import { formatPEN, formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

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
  fechaInicioProg?: Date | string | null;
  fechaFinProg?: Date | string | null;
  duracionDias?: number | null;
  porcentajeAvance?: number;
  esTitulo?: boolean;
}

export default function PresupuestoTable({
  proyectoId,
  nombreProyecto,
  partidas
}: {
  proyectoId: string;
  nombreProyecto: string;
  partidas: PartidaRow[];
}) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'PRESUPUESTO' | 'CRONOGRAMA'>('PRESUPUESTO');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditCronograma, setShowEditCronograma] = useState<PartidaRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);

  // Formulario Add Partida
  const [item, setItem] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [unidad, setUnidad] = useState('m3');
  const [metrado, setMetrado] = useState<number | ''>('');
  const [precioUnitario, setPrecioUnitario] = useState<number | ''>('');
  const [fechaInicioProg, setFechaInicioProg] = useState('');
  const [fechaFinProg, setFechaFinProg] = useState('');
  const [duracionDias, setDuracionDias] = useState<number | ''>('');

  // Formulario Editar Cronograma / Avance
  const [editFechaInicio, setEditFechaInicio] = useState('');
  const [editFechaFin, setEditFechaFin] = useState('');
  const [editDuracion, setEditDuracion] = useState<number | ''>('');
  const [editAvance, setEditAvance] = useState<number | ''>('');

  // Importador en Lote
  const [importTab, setImportTab] = useState<'EXCEL' | 'PDF_PRESUPUESTO' | 'PDF_CRONOGRAMA'>('EXCEL');
  const [textoImport, setTextoImport] = useState('');
  const [errorImport, setErrorImport] = useState('');
  const [partidasDetectadas, setPartidasDetectadas] = useState<any[]>([]);

  // Función de comparación jerárquica natural para códigos EDT / WBS (Ej: 1.1 < 1.2 < 1.10 < 1.10.1)
  const compareEDT = (itemA: string, itemB: string) => {
    const partsA = itemA.split(/[\.\-\_]/).map(Number);
    const partsB = itemB.split(/[\.\-\_]/).map(Number);
    const len = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < len; i++) {
      const numA = isNaN(partsA[i]) ? -1 : partsA[i];
      const numB = isNaN(partsB[i]) ? -1 : partsB[i];
      if (numA !== numB) {
        return numA - numB;
      }
    }
    return itemA.localeCompare(itemB, undefined, { numeric: true, sensitivity: 'base' });
  };

  const filtered = partidas
    .filter(
      (p) =>
        p.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => compareEDT(a.item, b.item));

  const totalPresupuestado = partidas.reduce((acc, p) => acc + p.parcialPresupuesto, 0);
  const totalGastado = partidas.reduce((acc, p) => acc + p.gastado, 0);
  const totalSaldo = totalPresupuestado - totalGastado;
  const avanceFisicoPromedio = partidas.length > 0
    ? partidas.reduce((acc, p) => acc + (p.porcentajeAvance || 0), 0) / partidas.length
    : 0;

  // ==========================================
  // HANDLERS CRUD
  // ==========================================
  const handleAddPartida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !descripcion || metrado === '' || precioUnitario === '') return;

    setLoading(true);
    try {
      await agregarPartidaIndividual({
        proyectoId,
        item,
        descripcion,
        unidad,
        metrado: Number(metrado),
        precioUnitario: Number(precioUnitario),
        fechaInicioProg: fechaInicioProg || undefined,
        fechaFinProg: fechaFinProg || undefined,
        duracionDias: duracionDias !== '' ? Number(duracionDias) : undefined
      });
      setShowAddModal(false);
      resetAddForm();
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const resetAddForm = () => {
    setItem('');
    setDescripcion('');
    setUnidad('m3');
    setMetrado('');
    setPrecioUnitario('');
    setFechaInicioProg('');
    setFechaFinProg('');
    setDuracionDias('');
  };

  const handleDelete = async (id: string, itemStr: string) => {
    if (!window.confirm(`¿Seguro de eliminar la partida "${itemStr}" y sus transacciones financieras?`)) return;
    setLoadingDelete(id);
    try {
      await eliminarPartida(id);
      router.refresh();
    } finally {
      setLoadingDelete(null);
    }
  };

  const handleUpdateCronograma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditCronograma) return;

    setLoading(true);
    try {
      await actualizarCronogramaPartida({
        id: showEditCronograma.id,
        fechaInicioProg: editFechaInicio || undefined,
        fechaFinProg: editFechaFin || undefined,
        duracionDias: editDuracion !== '' ? Number(editDuracion) : undefined,
        porcentajeAvance: editAvance !== '' ? Number(editAvance) : undefined
      });
      setShowEditCronograma(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // IMPORTADORES (EXCEL Y PDF)
  // ==========================================
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
          setErrorImport('No se detectaron partidas con columnas: [Ítem] [Descripción] [Und] [Metrado] [P.Unitario].');
        } else {
          setPartidasDetectadas(parsed);
        }
      } catch (err) {
        setErrorImport('Error al procesar el archivo Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Subida y lectura automática de archivos PDF (.pdf)
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
        parseTextAndExtract(res.text);
      }
    } catch (err: any) {
      setErrorImport('Error de conexión o lectura al procesar el archivo PDF.');
    } finally {
      setLoadingPDF(false);
    }
  };

  const parseTextAndExtract = (rawTextInput?: string) => {
    setErrorImport('');
    const contentToParse = typeof rawTextInput === 'string' ? rawTextInput : textoImport;
    if (!contentToParse.trim()) {
      setErrorImport('Por favor sube tu archivo PDF o pega las filas copiadas.');
      return;
    }

    const rawLines = contentToParse.split(/\r?\n/);
    const lines: string[] = [];

    // Pre-procesamiento: unir líneas divididas por saltos de página o descripciones largas en S10
    for (const raw of rawLines) {
      const clean = raw.trim();
      if (!clean) continue;

      // Si empieza por encabezados de página S10 o fechas, ignorar
      if (/^S10\s+Página/i.test(clean) || /^Presupuesto\s+\d+/i.test(clean) || /^SALDO DE OBRA/i.test(clean) || /^Cliente\s+/i.test(clean) || /^Lugar\s+/i.test(clean) || /^Ítem\s+Descripción/i.test(clean)) {
        continue;
      }

      // Si llegamos al pie del presupuesto (Costo Directo, Supervisión, Gastos Generales, Utilidad, IGV), DETENER la importación de partidas para tomar solo ejecución
      if (/^(?:COSTO\s+DIRECTO|GASTOS\s+GENERALES|UTILIDAD|SUB\s*TOTAL|IGV|TOTAL\s+PRESUPUESTO|SUPERVISION|SUPERVISIÓN|GASTOS\s+DE\s+SUPERVISION|EXPEDIENTE|LIQUIDACION|LIQUIDACIÓN|SON:\s*)/i.test(clean)) {
        break;
      }

      // Si empieza con un código jerárquico (Ej: "01", "01.01", "1.1"), es nueva fila
      if (/^[\d\.\-\_]+\s+/.test(clean) && !/^\d{4}\s+/.test(clean)) {
        lines.push(clean);
      } else if (lines.length > 0) {
        // Si no empieza con código, es la continuación de la descripción o montos de la línea anterior
        lines[lines.length - 1] += ' ' + clean;
      }
    }

    const parsed: any[] = [];

    for (const line of lines) {
      const clean = line.trim();
      if (!clean) continue;

      if (importTab === 'PDF_PRESUPUESTO') {
        const matchCodigo = clean.match(/^([\d\.\-\_]+)\s+(.+)$/);
        if (!matchCodigo) continue;

        const item = matchCodigo[1];
        let resto = matchCodigo[2].trim();

        if (item.length > 15 || /^\d{4}$/.test(item)) continue;

        // Intentar capturar 3 números al final (Metrado, PU, Parcial)
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

            // Es partida ejecutable de Costo Directo
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

            // Si es un título jerárquico puro o cabecera con 1 solo monto al final (ej: "01 OBRAS PROVISIONALES 11,021.78")
            // Lo identificamos con esTitulo: true y no suma al Costo Directo total para evitar duplicar montos
            const esTit = und === 'TITULO' || !item.includes('.');
            parsed.push({ item, descripcion: desc, unidad: esTit ? 'TITULO' : und, metrado: esTit ? '-' : 1, precioUnitario: esTit ? '-' : parc, parcialPresupuesto: esTit ? 0 : parc, montoReferencialTitulo: esTit ? parc : undefined, esTitulo: esTit });
            continue;
          }
        }

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
      } else if (importTab === 'PDF_CRONOGRAMA') {
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

        const tabs = clean.includes('\t') ? clean.split(/\t/) : clean.split(/\s{2,}/);
        if (tabs.length >= 3) {
          let item = tabs[0].trim();
          let desc = tabs[1].trim();
          if (/^\d+$/.test(item) && /^\d+([\.\-\_]\d+)*/.test(desc)) {
            item = desc;
            desc = tabs[2].trim();
          }
          const dur = Number(String(tabs[tabs.length - 1] || '').replace(/\D/g, '')) || 10;
          if (/^\d+([\.\-\_]\d+)*/.test(item) && desc.length > 2) {
            parsed.push({ item, descripcion: desc, unidad: 'glb', metrado: 1, precioUnitario: 0, parcialPresupuesto: 0, duracionDias: dur, esTitulo: false });
          }
        }
      }
    }

    // Post-proceso: identificar qué ítems son padres (ej: "01", "01.01" si existe "01.01.01") para no duplicar sumas
    const itemsSet = new Set(parsed.map(p => p.item));
    for (const p of parsed) {
      const tieneHijos = parsed.some(otro => otro.item !== p.item && otro.item.startsWith(p.item + '.'));
      if (tieneHijos || p.esTitulo) {
        p.esTitulo = true;
        if (p.parcialPresupuesto > 0) {
          p.montoReferencialTitulo = p.parcialPresupuesto;
          p.parcialPresupuesto = 0; // Excluir de la suma del Costo Directo
          p.metrado = '-';
          p.precioUnitario = '-';
        }
      }
    }

    if (parsed.length === 0) {
      setErrorImport('No se detectaron partidas en la tabla. Verifica que las filas del PDF o texto extraído contengan código, descripción y montos/duración.');
      setPartidasDetectadas([]);
    } else {
      setPartidasDetectadas(parsed.sort((a, b) => compareEDT(a.item, b.item)));
    }
  };

  const handleImportBatch = async () => {
    if (partidasDetectadas.length === 0) return;
    setLoading(true);
    try {
      await agregarPartidasAProyecto(proyectoId, partidasDetectadas);
      setShowImportModal(false);
      setPartidasDetectadas([]);
      setTextoImport('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

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
        'Duración (Días)': p.duracionDias || '-',
        'Avance Físico %': p.porcentajeAvance || 0
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto_y_Cronograma');
    XLSX.writeFile(wb, `Presupuesto_${nombreProyecto.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950 px-2.5 py-1 rounded border border-blue-800">
            OBRA ACTIVA: {nombreProyecto}
          </span>
          <h1 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
            Control de Presupuesto y Cronograma de Ejecución
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestiona partidas, sube archivos PDF o Excel de presupuesto, y controla los tiempos y avances físicos en Gantt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" /> + Agregar Partida
          </button>
          <button
            onClick={() => {
              setShowImportModal(true);
              setPartidasDetectadas([]);
              setErrorImport('');
            }}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-purple-600/20"
          >
            <UploadCloud className="w-4 h-4" /> 📥 Importar PDF / Excel
          </button>
          <button
            onClick={exportExcel}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Exportar
          </button>
        </div>
      </div>

      {/* Pestañas de Vista Presupuesto vs Cronograma */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveView('PRESUPUESTO')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeView === 'PRESUPUESTO' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" /> 💰 1. Control Presupuestal ({partidas.length} partidas)
          </button>
          <button
            onClick={() => setActiveView('CRONOGRAMA')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeView === 'CRONOGRAMA' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" /> 📅 2. Cronograma y Avance Físico
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ítem o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          {activeView === 'CRONOGRAMA' && (
            <div className="hidden md:flex items-center gap-2 bg-purple-950/60 px-3 py-1.5 rounded-xl border border-purple-800 text-xs font-bold text-purple-300">
              <TrendingUp className="w-4 h-4 text-purple-400" /> Avance Promedio: {avanceFisicoPromedio.toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      {/* VISTA 1: TABLA FINANCIERA DE PRESUPUESTO */}
      {activeView === 'PRESUPUESTO' && (
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
                  <th className="py-3.5 px-4 text-right text-blue-400">Presupuestado</th>
                  <th className="py-3.5 px-4 text-right text-amber-400">Gastado</th>
                  <th className="py-3.5 px-4 text-right text-emerald-400 font-bold">Saldo Partida</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No hay partidas registradas en esta obra. Pulsa <span className="text-blue-400 font-bold">+ Agregar Partida</span> o <span className="text-purple-400 font-bold">📥 Importar PDF / Excel</span>.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const porcentaje = p.parcialPresupuesto > 0 ? ((p.gastado / p.parcialPresupuesto) * 100).toFixed(1) : '0.0';
                    const partesItem = p.item.split(/[\.\-\_]/).filter(Boolean);
                    const nivel = Math.max(0, partesItem.length - 1);
                    const esPadre = p.esTitulo || p.unidad === 'TITULO' || filtered.some((o) => o.item !== p.item && o.item.startsWith(p.item + '.'));

                    return (
                      <tr
                        key={p.id}
                        className={`transition group ${
                          esPadre
                            ? 'bg-slate-950/90 font-bold border-t border-slate-800 text-amber-200'
                            : 'hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap" style={{ paddingLeft: `${nivel * 1.5 + 1}rem` }}>
                          <span className={esPadre ? 'text-amber-400' : 'text-blue-400'}>
                            {esPadre && (nivel === 0 ? '📂 ' : '└─ ')}
                            {!esPadre && nivel > 0 && '├─ '}
                            {p.item}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-sm">
                          <span className={esPadre ? 'text-amber-300 font-bold uppercase tracking-wide' : 'text-slate-100 font-medium'}>
                            {p.descripcion}
                          </span>
                          {!esPadre && p.parcialPresupuesto > 0 && (
                            <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-800/80">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  Number(porcentaje) > 90 ? 'bg-rose-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(Number(porcentaje), 100)}%` }}
                              />
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          {esPadre ? <span className="bg-amber-950/80 text-amber-400 px-1.5 py-0.5 rounded text-[10px]">TÍTULO</span> : p.unidad}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-300">{esPadre ? '-' : p.metrado?.toLocaleString('es-PE')}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-400">{esPadre ? '-' : formatPEN(p.precioUnitario)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">{esPadre ? '-' : formatPEN(p.parcialPresupuesto)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                          {esPadre ? '-' : (
                            <>
                              {formatPEN(p.gastado)}
                              <span className="block text-[10px] text-slate-500">{porcentaje}%</span>
                            </>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">{esPadre ? '-' : formatPEN(p.saldo)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleDelete(p.id, p.item)}
                            disabled={loadingDelete === p.id}
                            title="Eliminar esta partida"
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/60 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: TABLA DE CRONOGRAMA DE EJECUCIÓN (GANTT & AVANCE FÍSICO) */}
      {activeView === 'CRONOGRAMA' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="py-3.5 px-4 font-mono">Ítem</th>
                  <th className="py-3.5 px-4">Descripción de Partida</th>
                  <th className="py-3.5 px-4 text-center">Duración</th>
                  <th className="py-3.5 px-4 text-center">F. Inicio Programada</th>
                  <th className="py-3.5 px-4 text-center">F. Fin Programada</th>
                  <th className="py-3.5 px-4 text-center w-48">% Avance Físico Real</th>
                  <th className="py-3.5 px-4 text-center">Acción Gantt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No hay partidas registradas en esta obra.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const avance = p.porcentajeAvance || 0;
                    const partesItem = p.item.split(/[\.\-\_]/).filter(Boolean);
                    const nivel = Math.max(0, partesItem.length - 1);
                    const esPadre = p.esTitulo || p.unidad === 'TITULO' || filtered.some((o) => o.item !== p.item && o.item.startsWith(p.item + '.'));

                    return (
                      <tr
                        key={p.id}
                        className={`transition ${
                          esPadre
                            ? 'bg-purple-950/40 font-bold border-t border-purple-900/60 text-purple-200'
                            : 'hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap" style={{ paddingLeft: `${nivel * 1.5 + 1}rem` }}>
                          <span className={esPadre ? 'text-purple-300' : 'text-purple-400'}>
                            {esPadre && (nivel === 0 ? '📂 ' : '└─ ')}
                            {!esPadre && nivel > 0 && '├─ '}
                            {p.item}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-sm">
                          <span className={esPadre ? 'text-purple-200 font-bold uppercase tracking-wide' : 'text-slate-100 font-medium'}>
                            {p.descripcion}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                          {p.duracionDias ? `${p.duracionDias} días` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                          {p.fechaInicioProg ? formatDate(p.fechaInicioProg) : 'Por programar'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                          {p.fechaFinProg ? formatDate(p.fechaFinProg) : 'Por programar'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-mono font-bold text-purple-300">{avance}%</span>
                            <span className="text-[10px] text-slate-500 uppercase">{avance === 100 ? 'Completado' : 'En ejecución'}</span>
                          </div>
                          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/80">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                avance === 100 ? 'bg-emerald-500' : avance > 0 ? 'bg-purple-500' : 'bg-slate-700'
                              }`}
                              style={{ width: `${Math.min(avance, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setShowEditCronograma(p);
                              setEditFechaInicio(p.fechaInicioProg ? new Date(p.fechaInicioProg).toISOString().split('T')[0] : '');
                              setEditFechaFin(p.fechaFinProg ? new Date(p.fechaFinProg).toISOString().split('T')[0] : '');
                              setEditDuracion(p.duracionDias || '');
                              setEditAvance(p.porcentajeAvance || 0);
                            }}
                            className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-600 text-purple-300 hover:text-white rounded-lg text-xs font-semibold transition border border-purple-800 flex items-center gap-1 mx-auto"
                          >
                            <Clock className="w-3.5 h-3.5" /> Programar / %
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: AGREGAR PARTIDA INDIVIDUAL (CON CRONOGRAMA) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" /> Registrar Partida (Presupuesto + Cronograma)
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleAddPartida} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Ítem</label>
                  <input
                    type="text"
                    placeholder="Ej. 01.01.01"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Descripción de Partida</label>
                  <input
                    type="text"
                    placeholder="Ej. Excavación en terreno normal con maquinaria"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Unidad</label>
                  <input
                    type="text"
                    placeholder="m3, kg, glb"
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Metrado</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={metrado}
                    onChange={(e) => setMetrado(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Precio Unitario (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={precioUnitario}
                    onChange={(e) => setPrecioUnitario(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-bold font-mono"
                    required
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
                <div className="text-xs font-bold uppercase text-purple-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Cronograma de Ejecución (Opcional)
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">F. Inicio Programada</label>
                    <input
                      type="date"
                      value={fechaInicioProg}
                      onChange={(e) => setFechaInicioProg(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">F. Fin Programada</label>
                    <input
                      type="date"
                      value={fechaFinProg}
                      onChange={(e) => setFechaFinProg(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Duración (Días)</label>
                    <input
                      type="number"
                      placeholder="Ej. 15"
                      value={duracionDias}
                      onChange={(e) => setDuracionDias(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">Cancelar</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20">
                  {loading ? 'Guardando...' : 'Registrar Partida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: IMPORTAR PARTIDAS EN LOTE (SUBIR ARCHIVO PDF DIRECTO O EXCEL) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-purple-400" /> Importar Partidas en Lote para: {nombreProyecto}
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => { setImportTab('EXCEL'); setErrorImport(''); }}
                className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 ${
                  importTab === 'EXCEL' ? 'bg-slate-900 text-emerald-400 border-t border-x border-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Excel / CSV (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => { setImportTab('PDF_PRESUPUESTO'); setErrorImport(''); }}
                className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 ${
                  importTab === 'PDF_PRESUPUESTO' ? 'bg-slate-900 text-blue-400 border-t border-x border-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-400" /> Archivo PDF Presupuesto (S10)
              </button>
              <button
                type="button"
                onClick={() => { setImportTab('PDF_CRONOGRAMA'); setErrorImport(''); }}
                className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 ${
                  importTab === 'PDF_CRONOGRAMA' ? 'bg-slate-900 text-purple-400 border-t border-x border-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4 text-purple-400" /> Archivo PDF Cronograma Gantt
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {errorImport && (
                <div className="p-3.5 bg-rose-950 border border-rose-500 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorImport}</span>
                </div>
              )}

              {importTab === 'EXCEL' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/60 rounded-2xl p-6 text-center transition bg-slate-950/40">
                    <UploadCloud className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <label className="block text-xs font-semibold text-white cursor-pointer hover:underline">
                      Seleccionar archivo Excel (`.xlsx`)
                      <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} className="hidden" />
                    </label>
                    <p className="text-[11px] text-slate-500 mt-1">Columnas esperadas: Ítem | Descripción | Und | Metrado | P. Unitario</p>
                  </div>
                </div>
              )}

              {(importTab === 'PDF_PRESUPUESTO' || importTab === 'PDF_CRONOGRAMA') && (
                <div className="space-y-4">
                  {/* Zona principal: SUBIR ARCHIVO PDF (.pdf) DIRECTO */}
                  <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/60 rounded-2xl p-6 text-center transition bg-slate-950/60 relative">
                    {loadingPDF ? (
                      <div className="flex flex-col items-center justify-center py-3 space-y-2">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        <span className="text-xs font-semibold text-blue-300">Extrayendo tablas y analizando páginas de tu archivo PDF...</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-10 h-10 text-blue-400 mx-auto mb-2" />
                        <label className="block text-xs font-bold text-white cursor-pointer hover:underline">
                          Haz clic para subir y analizar tu archivo PDF (`.pdf`) directamente
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handlePDFFileUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                          El servidor extraerá automáticamente todas las tablas del PDF ({importTab === 'PDF_PRESUPUESTO' ? 'S10 / Presupuesto' : 'Cronograma MS Project / Fechas'}) para organizarlas por partidas.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Cuadro colapsado/secundario de texto copiado o extraído para revisión opcional */}
                  <div className="space-y-2 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Previsualización / Edición de texto extraído (O si prefieres pegar filas manualmente):
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
                      placeholder={
                        importTab === 'PDF_PRESUPUESTO'
                          ? 'Al subir tu PDF aquí aparecerá su contenido para su análisis. También puedes pegar filas manualmente (Ej: 01.01 EXCAVACION m3 150 45.20 6780)'
                          : 'Al subir tu PDF de Cronograma aquí aparecerá el texto. También puedes pegar filas (Ej: 01.01 EXCAVACION 15 días 01/08/2026 15/08/2026)'
                      }
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              {partidasDetectadas.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-400 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <span>✅ {partidasDetectadas.length} Ítems Detectados ({partidasDetectadas.filter(p => !p.esTitulo).length} Partidas de Costo Directo)</span>
                    <span className="text-sm bg-emerald-950 px-3 py-1 rounded-lg border border-emerald-800 text-emerald-300">
                      Costo Directo Total: {formatPEN(partidasDetectadas.reduce((a, b) => a + (b.parcialPresupuesto || 0), 0))}
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-950 text-slate-400 uppercase sticky top-0 z-10">
                        <tr>
                          <th className="p-2">Ítem</th>
                          <th className="p-2">Descripción</th>
                          <th className="p-2">Und / Duración</th>
                          <th className="p-2 text-right">Metrado / F.Inicio</th>
                          <th className="p-2 text-right">P.U. / F.Fin</th>
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
                                {p.esTitulo ? <span className="bg-amber-950/80 text-amber-400 px-1.5 py-0.5 rounded text-[10px]">TÍTULO</span> : (p.unidad || `${p.duracionDias || '-'} días`)}
                              </td>
                              <td className="p-2 text-right font-mono">{p.metrado || p.fechaInicioProg || '-'}</td>
                              <td className="p-2 text-right font-mono">{p.precioUnitario || p.fechaFinProg || '-'}</td>
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

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">Cancelar</button>
                <button
                  type="button"
                  onClick={handleImportBatch}
                  disabled={loading || partidasDetectadas.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-lg transition"
                >
                  {loading ? 'Importando en bloque...' : `Importar ${partidasDetectadas.length} Partidas a "${nombreProyecto}"`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDITAR CRONOGRAMA / AVANCE FÍSICO */}
      {showEditCronograma && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" /> Programar y Registrar Avance Físico
              </h3>
              <button onClick={() => setShowEditCronograma(null)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleUpdateCronograma} className="p-6 space-y-4">
              <div>
                <span className="font-mono text-xs font-bold text-purple-400">{showEditCronograma.item}</span>
                <h4 className="text-sm font-bold text-white mt-1">{showEditCronograma.descripcion}</h4>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fecha Inicio Programada</label>
                  <input
                    type="date"
                    value={editFechaInicio}
                    onChange={(e) => setEditFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fecha Fin Programada</label>
                  <input
                    type="date"
                    value={editFechaFin}
                    onChange={(e) => setEditFechaFin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Duración (Días)</label>
                  <input
                    type="number"
                    value={editDuracion}
                    onChange={(e) => setEditDuracion(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-purple-300 font-bold mb-1">% Avance Físico Real</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editAvance}
                    onChange={(e) => setEditAvance(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-slate-950 border border-purple-500 rounded-xl text-xs text-purple-400 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowEditCronograma(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">Cancelar</button>
                <button type="submit" disabled={loading} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/20">
                  {loading ? 'Actualizando...' : 'Guardar Cronograma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
