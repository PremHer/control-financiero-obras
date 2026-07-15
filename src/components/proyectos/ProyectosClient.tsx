'use client';

import React, { useState, useEffect } from 'react';
import { 
  HardHat, 
  Plus, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  MapPin, 
  Trash2, 
  FileSpreadsheet, 
  FileText, 
  UploadCloud, 
  AlertTriangle 
} from 'lucide-react';
import { crearProyecto, crearProyectoConPartidas, seleccionarProyecto, eliminarProyecto } from '@/app/actions';
import { formatPEN, formatDate } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';

interface ProyectoRow {
  id: string;
  codigo: string;
  nombre: string;
  cliente: string;
  ubicacion: string;
  fechaInicio: Date | string;
  presupuestoTotal: number;
}

interface PartidaImportada {
  item: string;
  descripcion: string;
  unidad: string;
  metrado: number;
  precioUnitario: number;
  parcialPresupuesto: number;
}

export default function ProyectosClient({
  proyectos,
  proyectoActivoId,
}: {
  proyectos: ProyectoRow[];
  proyectoActivoId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'MANUAL' | 'EXCEL' | 'PDF'>('MANUAL');
  const [loading, setLoading] = useState(false);
  const [loadingSelect, setLoadingSelect] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);

  // Abrir modal en modo importación si viene en URL
  useEffect(() => {
    if (searchParams.get('import') === 'true') {
      setShowModal(true);
      setActiveTab('EXCEL');
    }
  }, [searchParams]);

  // Formulario de datos básicos de proyecto
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [cliente, setCliente] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [presupuestoTotal, setPresupuestoTotal] = useState<number | ''>('');

  // Partidas importadas (para pestañas Excel / PDF)
  const [partidasImportadas, setPartidasImportadas] = useState<PartidaImportada[]>([]);
  const [textoPDF, setTextoPDF] = useState('');
  const [errorImport, setErrorImport] = useState('');

  const handleCreateManual = async (e: React.FormEvent) => {
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
      closeAndReset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWithPartidas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo || !nombre || !cliente || !ubicacion) {
      setErrorImport('Por favor completa los datos de la obra (Código, Nombre, Cliente y Ubicación).');
      return;
    }
    if (partidasImportadas.length === 0) {
      setErrorImport('No hay partidas detectadas para importar.');
      return;
    }

    setLoading(true);
    try {
      const presupuestoCalculado = partidasImportadas.reduce((acc, p) => acc + p.parcialPresupuesto, 0);
      await crearProyectoConPartidas(
        {
          codigo,
          nombre,
          cliente,
          ubicacion,
          fechaInicio,
          presupuestoTotal: presupuestoTotal ? Number(presupuestoTotal) : presupuestoCalculado,
        },
        partidasImportadas
      );
      closeAndReset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const closeAndReset = () => {
    setShowModal(false);
    setCodigo('');
    setNombre('');
    setCliente('');
    setUbicacion('');
    setPresupuestoTotal('');
    setPartidasImportadas([]);
    setTextoPDF('');
    setErrorImport('');
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

  const handleDelete = async (id: string, nombreObra: string) => {
    if (!window.confirm(`¿Estás completamente seguro de eliminar la obra "${nombreObra}" y todas sus partidas y egresos históricos? Esta acción es irreversible.`)) {
      return;
    }
    setLoadingDelete(id);
    try {
      await eliminarProyecto(id);
      router.refresh();
    } finally {
      setLoadingDelete(null);
    }
  };

  // ==========================================
  // PARSER DE EXCEL (.xlsx / .csv)
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

        const parsed: PartidaImportada[] = [];
        let totalCalculado = 0;

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 2) continue;

          // Buscar filas donde la primera o segunda columna tenga patrón de ítem o descripción
          const col0 = String(row[0] || '').trim();
          const col1 = String(row[1] || '').trim();
          const col2 = String(row[2] || '').trim();
          const col3 = Number(row[3]) || 0;
          const col4 = Number(row[4]) || 0;
          const col5 = Number(row[5]) || col3 * col4;

          // Verificar que parezca una partida (ej. 01.01 o descripción clara)
          if (/^\d+([\.\-\_]\d+)*$/.test(col0) && col1.length > 2) {
            parsed.push({
              item: col0,
              descripcion: col1,
              unidad: col2 || 'glb',
              metrado: col3 || 1,
              precioUnitario: col4 || col5,
              parcialPresupuesto: col5
            });
            totalCalculado += col5;
          } else if (col0.length > 3 && !isNaN(Number(row[1])) && Number(row[1]) > 0) {
            // Caso en el que no hay ítem separado pero hay descripción y metrado/precio
            parsed.push({
              item: `P-${parsed.length + 1}`,
              descripcion: col0,
              unidad: col1 || 'glb',
              metrado: Number(row[1]) || 1,
              precioUnitario: Number(row[2]) || Number(row[3]) || 0,
              parcialPresupuesto: Number(row[3]) || Number(row[2]) || 0
            });
            totalCalculado += (Number(row[3]) || Number(row[2]) || 0);
          }
        }

        if (parsed.length === 0) {
          setErrorImport('No se pudieron detectar columnas válidas (Ítem, Descripción, Unidad, Metrado, Precio Unitario). Asegrate de que tu Excel tenga esas columnas.');
        } else {
          setPartidasImportadas(parsed);
          if (!presupuestoTotal) setPresupuestoTotal(totalCalculado);
        }
      } catch (err) {
        setErrorImport('Error al procesar el archivo Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ==========================================
  // PARSER DE PDF / TABLA PEGADA DE S10 OR CRONOGRAMA
  // ==========================================
  const handleParsePDFText = () => {
    setErrorImport('');
    if (!textoPDF.trim()) {
      setErrorImport('Por favor pega el texto del PDF de presupuesto o cronograma.');
      return;
    }

    const lines = textoPDF.split(/\r?\n/);
    const parsed: PartidaImportada[] = [];
    let totalCalculado = 0;

    for (const line of lines) {
      const clean = line.trim();
      if (!clean) continue;

      // Expresión regular para capturar: ITEM | DESCRIPCION | UNIDAD | METRADO | P.UNIT | PARCIAL
      // Ejemplos: 
      // "01.01.01 EXCAVACION EN TERRENO NORMAL m3 1,200.00 15.50 18,600.00"
      // "02.01 CONCRETO f'c=210 kg/cm2 GLB 1.00 5,000.00 5,000.00"
      const matchRegex = /^([\d\.\-\_]+)\s+(.+?)\s+([a-zA-Z%23\/\'\"]{1,6})\s+([\d\,\.]+)\s+([\d\,\.]+)\s+([\d\,\.]+)$/;
      const match = clean.match(matchRegex);

      if (match) {
        const item = match[1];
        const desc = match[2];
        const und = match[3];
        const met = Number(match[4].replace(/,/g, ''));
        const pu = Number(match[5].replace(/,/g, ''));
        const parc = Number(match[6].replace(/,/g, ''));

        if (!isNaN(parc) && parc > 0) {
          parsed.push({
            item,
            descripcion: desc,
            unidad: und,
            metrado: met,
            precioUnitario: pu,
            parcialPresupuesto: parc
          });
          totalCalculado += parc;
          continue;
        }
      }

      // Parser alternativo por si las columnas están separadas por tabulador (copiado de tabla de PDF o MS Project)
      const tabs = clean.split(/\t/);
      if (tabs.length >= 4) {
        const item = tabs[0].trim();
        const desc = tabs[1].trim();
        const und = tabs[2]?.trim() || 'glb';
        const met = Number((tabs[3] || '1').replace(/,/g, '')) || 1;
        const pu = Number((tabs[4] || tabs[3] || '0').replace(/,/g, '')) || 0;
        const parc = Number((tabs[5] || tabs[4] || tabs[3] || '0').replace(/,/g, '')) || met * pu;

        if (desc.length > 3 && /^\d+([\.\-\_]\d+)*/.test(item)) {
          parsed.push({
            item,
            descripcion: desc,
            unidad: und,
            metrado: met,
            precioUnitario: pu,
            parcialPresupuesto: parc
          });
          totalCalculado += parc;
        }
      }
    }

    if (parsed.length === 0) {
      setErrorImport('No se detectaron partidas en el texto pegado. Asegrate de copiar las filas que contienen: [Ítem] [Descripción] [Unidad] [Metrado] [Precio Unitario] [Parcial].');
    } else {
      setPartidasImportadas(parsed);
      if (!presupuestoTotal) setPresupuestoTotal(totalCalculado);
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
            Administra tus obras civiles, activa la obra en curso para control presupuestal o importa presupuestos desde archivos.
          </p>
        </div>
        <div>
          <button
            onClick={() => {
              setActiveTab('MANUAL');
              setShowModal(true);
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" /> + Registrar o Importar Obra
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
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg"
          >
            + Crear o Importar Mi Primer Proyecto
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
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                        {prj.codigo}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(prj.id, prj.nombre)}
                      disabled={loadingDelete === prj.id}
                      title="Eliminar esta obra permanentemente"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/60 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white leading-snug">{prj.nombre}</h3>
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

                <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center gap-2">
                  {isActivo ? (
                    <button
                      onClick={() => router.push('/')}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20"
                    >
                      Ir al Panel de Control <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelect(prj.id)}
                      disabled={loadingSelect === prj.id}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition border border-slate-700"
                    >
                      {loadingSelect === prj.id ? 'Activando Obra...' : 'Seleccionar como Obra Activa'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nueva Obra & Importación */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Header del Modal */}
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" /> Registrar Obra e Importar Presupuesto
              </h3>
              <button
                onClick={closeAndReset}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Pestañas de Modos de Creación */}
            <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('MANUAL')}
                className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 ${
                  activeTab === 'MANUAL'
                    ? 'bg-slate-900 text-blue-400 border-t border-x border-slate-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <HardHat className="w-4 h-4" /> 1. Proyecto Manual
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('EXCEL')}
                className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 ${
                  activeTab === 'EXCEL'
                    ? 'bg-slate-900 text-emerald-400 border-t border-x border-slate-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> 2. Importar de Excel / CSV (`.xlsx`)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PDF')}
                className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 ${
                  activeTab === 'PDF'
                    ? 'bg-slate-900 text-purple-400 border-t border-x border-slate-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4 text-purple-400" /> 3. Importar de PDF (Tabla / S10)
              </button>
            </div>

            {/* Cuerpo del Modal scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {errorImport && (
                <div className="p-3.5 bg-rose-950 border border-rose-500 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorImport}</span>
                </div>
              )}

              {/* Datos base de la obra (siempre visibles o necesarios) */}
              <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Datos Contractuales de la Obra
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Código / Expediente</label>
                    <input
                      type="text"
                      placeholder="Ej. OBRA-2026-LIMA"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre Completo de la Obra</label>
                    <input
                      type="text"
                      placeholder="Ej. Construcción del Colegio Gran Mariscal"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Cliente / Entidad</label>
                    <input
                      type="text"
                      placeholder="Ej. Gobierno Regional de Lima"
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Ubicación</label>
                    <input
                      type="text"
                      placeholder="Ej. Lima / Cañete"
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Fecha de Inicio</label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Presupuesto Total (PEN) {partidasImportadas.length > 0 && '(Autocalculado)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={presupuestoTotal}
                      onChange={(e) => setPresupuestoTotal(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-emerald-400 font-bold font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Pestaña 1: Manual */}
              {activeTab === 'MANUAL' && (
                <div className="py-4 text-center space-y-3">
                  <p className="text-xs text-slate-400">
                    Al crear la obra manualmente, podrás ir agregando las partidas de presupuesto de forma individual o en lote desde el módulo de Presupuesto.
                  </p>
                  <button
                    onClick={handleCreateManual}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/20 transition"
                  >
                    {loading ? 'Creando Obra...' : 'Crear Obra y Empezar'}
                  </button>
                </div>
              )}

              {/* Pestaña 2: Excel */}
              {activeTab === 'EXCEL' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/60 rounded-2xl p-6 text-center transition bg-slate-950/40">
                    <UploadCloud className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <label className="block text-xs font-semibold text-white cursor-pointer hover:underline">
                      Haz clic para seleccionar tu archivo Excel (`.xlsx` o `.csv`)
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleExcelUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Columnas sugeridas: Ítem | Descripción | Unidad | Metrado | Precio Unitario | Parcial
                    </p>
                  </div>

                  {partidasImportadas.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
                        <span>✅ {partidasImportadas.length} Partidas Detectadas</span>
                        <span>Total Presupuesto: {formatPEN(partidasImportadas.reduce((a, b) => a + b.parcialPresupuesto, 0))}</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-950 text-slate-400 uppercase">
                            <tr>
                              <th className="p-2">Ítem</th>
                              <th className="p-2">Descripción</th>
                              <th className="p-2">Und</th>
                              <th className="p-2 text-right">Metrado</th>
                              <th className="p-2 text-right">P.U.</th>
                              <th className="p-2 text-right">Parcial</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {partidasImportadas.slice(0, 15).map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30 text-slate-300">
                                <td className="p-2 font-mono text-blue-400">{p.item}</td>
                                <td className="p-2">{p.descripcion}</td>
                                <td className="p-2">{p.unidad}</td>
                                <td className="p-2 text-right font-mono">{p.metrado}</td>
                                <td className="p-2 text-right font-mono">{p.precioUnitario}</td>
                                <td className="p-2 text-right font-mono font-bold text-emerald-400">{formatPEN(p.parcialPresupuesto)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {partidasImportadas.length > 15 && (
                        <p className="text-[10px] text-slate-500 text-center">...y {partidasImportadas.length - 15} partidas más listas para importar</p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleCreateWithPartidas}
                    disabled={loading || partidasImportadas.length === 0}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-lg transition"
                  >
                    {loading ? 'Importando partidas y creando obra...' : `Importar ${partidasImportadas.length} Partidas y Activar Obra`}
                  </button>
                </div>
              )}

              {/* Pestaña 3: PDF / S10 */}
              {activeTab === 'PDF' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-purple-300 mb-1">
                      Pega aquí las filas copiadas de tu Presupuesto o Cronograma en PDF (S10 / MS Project)
                    </label>
                    <textarea
                      rows={5}
                      value={textoPDF}
                      onChange={(e) => setTextoPDF(e.target.value)}
                      placeholder={`Pega el texto aquí. Ejemplo:\n01.01.01 EXCAVACION EN ZANJAS PARA CIMIENTOS M3 150.00 45.20 6,780.00\n01.01.02 SOLADO DE CONCRETO C:H 1:12 M2 120.00 25.00 3,000.00\n02.01 CONCRETO EN COLUMNAS f'c=210 kg/cm2 M3 85.00 380.00 32,300.00`}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleParsePDFText}
                      className="mt-2 py-2 px-4 bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> Analizar e Identificar Partidas del Texto
                    </button>
                  </div>

                  {partidasImportadas.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-purple-400">
                        <span>✅ {partidasImportadas.length} Partidas Parseadas del PDF</span>
                        <span>Total Presupuesto: {formatPEN(partidasImportadas.reduce((a, b) => a + b.parcialPresupuesto, 0))}</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-950 text-slate-400 uppercase">
                            <tr>
                              <th className="p-2">Ítem</th>
                              <th className="p-2">Descripción</th>
                              <th className="p-2">Und</th>
                              <th className="p-2 text-right">Metrado</th>
                              <th className="p-2 text-right">P.U.</th>
                              <th className="p-2 text-right">Parcial</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {partidasImportadas.slice(0, 15).map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30 text-slate-300">
                                <td className="p-2 font-mono text-purple-400">{p.item}</td>
                                <td className="p-2">{p.descripcion}</td>
                                <td className="p-2">{p.unidad}</td>
                                <td className="p-2 text-right font-mono">{p.metrado}</td>
                                <td className="p-2 text-right font-mono">{p.precioUnitario}</td>
                                <td className="p-2 text-right font-mono font-bold text-purple-400">{formatPEN(p.parcialPresupuesto)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCreateWithPartidas}
                    disabled={loading || partidasImportadas.length === 0}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-lg transition"
                  >
                    {loading ? 'Importando partidas y creando obra...' : `Crear Obra con ${partidasImportadas.length} Partidas del PDF`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
