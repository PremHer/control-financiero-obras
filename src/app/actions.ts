'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { parsePdfBuffer } from '@/lib/pdf-service';

export async function extraerTextoPDFAction(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'No se recibió ningún archivo PDF.' };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = await parsePdfBuffer(buffer);

    return { success: true, text };
  } catch (error: any) {
    console.error('Error procesando PDF en servidor:', error);
    return { success: false, error: error?.message || 'Error al procesar y extraer texto del archivo PDF.' };
  }
}

// ==========================================
// ACCIONES PARA GESTIÓN DE PROYECTOS
// ==========================================

export async function crearProyecto(formData: {
  codigo: string;
  nombre: string;
  cliente: string;
  ubicacion: string;
  fechaInicio: string;
  presupuestoTotal: number;
}) {
  const { codigo, nombre, cliente, ubicacion, fechaInicio, presupuestoTotal } = formData;

  const nuevoProyecto = await prisma.proyecto.create({
    data: {
      codigo,
      nombre,
      cliente,
      ubicacion,
      fechaInicio: new Date(fechaInicio),
      presupuestoTotal: Number(presupuestoTotal)
    }
  });

  const cookieStore = await cookies();
  cookieStore.set('sipro_proyecto_id', nuevoProyecto.id, { path: '/' });

  revalidatePath('/');
  revalidatePath('/proyectos');
  revalidatePath('/presupuesto');
  revalidatePath('/egresos');
  revalidatePath('/ingresos');
  revalidatePath('/tesoreria');
  return { success: true, proyecto: nuevoProyecto };
}

export async function crearProyectoConPartidas(
  formData: {
    codigo: string;
    nombre: string;
    cliente: string;
    ubicacion: string;
    fechaInicio: string;
    presupuestoTotal: number;
  },
  partidas: Array<{
    item: string;
    descripcion: string;
    unidad: string;
    metrado: number;
    precioUnitario: number;
    parcialPresupuesto: number;
  }>
) {
  const { codigo, nombre, cliente, ubicacion, fechaInicio, presupuestoTotal } = formData;

  const resultado = await prisma.$transaction(async (tx) => {
    const nuevoProyecto = await tx.proyecto.create({
      data: {
        codigo,
        nombre,
        cliente,
        ubicacion,
        fechaInicio: new Date(fechaInicio),
        presupuestoTotal: Number(presupuestoTotal)
      }
    });

    if (partidas && partidas.length > 0) {
      await tx.partida.createMany({
        data: partidas.map((p) => ({
          proyectoId: nuevoProyecto.id,
          item: p.item || '01',
          descripcion: p.descripcion || 'Sin descripción',
          unidad: p.unidad || 'glb',
          metrado: Number(p.metrado) || 1,
          precioUnitario: Number(p.precioUnitario) || 0,
          parcialPresupuesto: Number(p.parcialPresupuesto) || 0
        }))
      });
    }

    return nuevoProyecto;
  });

  const cookieStore = await cookies();
  cookieStore.set('sipro_proyecto_id', resultado.id, { path: '/' });

  revalidatePath('/');
  revalidatePath('/proyectos');
  revalidatePath('/presupuesto');
  revalidatePath('/egresos');
  revalidatePath('/ingresos');
  revalidatePath('/tesoreria');
  return { success: true, proyecto: resultado };
}

export async function seleccionarProyecto(proyectoId: string) {
  const cookieStore = await cookies();
  cookieStore.set('sipro_proyecto_id', proyectoId, { path: '/' });

  revalidatePath('/');
  revalidatePath('/proyectos');
  revalidatePath('/presupuesto');
  revalidatePath('/egresos');
  revalidatePath('/ingresos');
  revalidatePath('/tesoreria');
  return { success: true };
}

export async function eliminarProyecto(proyectoId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.transaccion.deleteMany({
      where: { proyectoId }
    });

    await tx.partida.deleteMany({
      where: { proyectoId }
    });

    await tx.proyecto.delete({
      where: { id: proyectoId }
    });
  });

  const cookieStore = await cookies();
  const activeId = cookieStore.get('sipro_proyecto_id')?.value;
  if (activeId === proyectoId) {
    const remaining = await prisma.proyecto.findFirst({ orderBy: { creadoEn: 'desc' } });
    if (remaining) {
      cookieStore.set('sipro_proyecto_id', remaining.id, { path: '/' });
    } else {
      cookieStore.delete('sipro_proyecto_id');
    }
  }

  revalidatePath('/');
  revalidatePath('/proyectos');
  revalidatePath('/presupuesto');
  revalidatePath('/egresos');
  revalidatePath('/ingresos');
  revalidatePath('/tesoreria');
  return { success: true };
}

export async function agregarPartidasAProyecto(
  proyectoId: string,
  partidas: Array<{
    item: string;
    descripcion: string;
    unidad: string;
    metrado: number;
    precioUnitario: number;
    parcialPresupuesto: number;
    fechaInicioProg?: string;
    fechaFinProg?: string;
    duracionDias?: number;
    porcentajeAvance?: number;
  }>,
  limpiarAntes: boolean = true
) {
  if (!partidas || partidas.length === 0) return { success: false, message: 'No hay partidas para importar' };

  await prisma.$transaction(async (tx) => {
    if (limpiarAntes) {
      await tx.transaccion.deleteMany({ where: { proyectoId, partidaId: { not: null } } });
      await tx.partida.deleteMany({ where: { proyectoId } });
    }

    for (const p of partidas) {
      const itemCode = (p.item || '01').trim();
      await tx.partida.upsert({
        where: {
          proyectoId_item: {
            proyectoId,
            item: itemCode
          }
        },
        update: {
          descripcion: p.descripcion || 'Sin descripción',
          unidad: p.unidad || 'glb',
          metrado: Number(p.metrado) || 1,
          precioUnitario: Number(p.precioUnitario) || 0,
          parcialPresupuesto: Number(p.parcialPresupuesto) || 0,
          ...(p.fechaInicioProg ? { fechaInicioProg: new Date(p.fechaInicioProg) } : {}),
          ...(p.fechaFinProg ? { fechaFinProg: new Date(p.fechaFinProg) } : {}),
          ...(p.duracionDias !== undefined && p.duracionDias !== null ? { duracionDias: Number(p.duracionDias) } : {}),
          ...(p.porcentajeAvance !== undefined && p.porcentajeAvance !== null ? { porcentajeAvance: Number(p.porcentajeAvance) } : {})
        },
        create: {
          proyectoId,
          item: itemCode,
          descripcion: p.descripcion || 'Sin descripción',
          unidad: p.unidad || 'glb',
          metrado: Number(p.metrado) || 1,
          precioUnitario: Number(p.precioUnitario) || 0,
          parcialPresupuesto: Number(p.parcialPresupuesto) || 0,
          fechaInicioProg: p.fechaInicioProg ? new Date(p.fechaInicioProg) : null,
          fechaFinProg: p.fechaFinProg ? new Date(p.fechaFinProg) : null,
          duracionDias: p.duracionDias ? Number(p.duracionDias) : null,
          porcentajeAvance: p.porcentajeAvance ? Number(p.porcentajeAvance) : 0
        }
      });
    }
  });

  revalidatePath('/presupuesto');
  revalidatePath('/');
  return { success: true };
}

export async function agregarPartidaIndividual(formData: {
  proyectoId: string;
  item: string;
  descripcion: string;
  unidad: string;
  metrado: number;
  precioUnitario: number;
  fechaInicioProg?: string;
  fechaFinProg?: string;
  duracionDias?: number;
}) {
  const {
    proyectoId,
    item,
    descripcion,
    unidad,
    metrado,
    precioUnitario,
    fechaInicioProg,
    fechaFinProg,
    duracionDias
  } = formData;

  const itemCode = (item || '01').trim();
  await prisma.partida.upsert({
    where: {
      proyectoId_item: {
        proyectoId,
        item: itemCode
      }
    },
    update: {
      descripcion,
      unidad,
      metrado: Number(metrado) || 1,
      precioUnitario: Number(precioUnitario) || 0,
      parcialPresupuesto: (Number(metrado) || 1) * (Number(precioUnitario) || 0),
      ...(fechaInicioProg ? { fechaInicioProg: new Date(fechaInicioProg) } : {}),
      ...(fechaFinProg ? { fechaFinProg: new Date(fechaFinProg) } : {}),
      ...(duracionDias ? { duracionDias: Number(duracionDias) } : {})
    },
    create: {
      proyectoId,
      item: itemCode,
      descripcion,
      unidad,
      metrado: Number(metrado) || 1,
      precioUnitario: Number(precioUnitario) || 0,
      parcialPresupuesto: (Number(metrado) || 1) * (Number(precioUnitario) || 0),
      fechaInicioProg: fechaInicioProg ? new Date(fechaInicioProg) : null,
      fechaFinProg: fechaFinProg ? new Date(fechaFinProg) : null,
      duracionDias: duracionDias ? Number(duracionDias) : null,
      porcentajeAvance: 0
    }
  });

  revalidatePath('/presupuesto');
  revalidatePath('/');
  return { success: true };
}

export async function eliminarPartida(id: string) {
  await prisma.$transaction(async (tx) => {
    await tx.transaccion.deleteMany({ where: { partidaId: id } });
    await tx.partida.delete({ where: { id } });
  });

  revalidatePath('/presupuesto');
  revalidatePath('/');
  return { success: true };
}

export async function eliminarTodasLasPartidas(proyectoId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.transaccion.deleteMany({ where: { proyectoId, partidaId: { not: null } } });
    await tx.partida.deleteMany({ where: { proyectoId } });
  });

  revalidatePath('/presupuesto');
  revalidatePath('/');
  return { success: true };
}

export async function eliminarPartidasMasivo(partidasIds: string[], proyectoId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.transaccion.deleteMany({ where: { partidaId: { in: partidasIds } } });
    await tx.partida.deleteMany({ where: { id: { in: partidasIds }, proyectoId } });
  });

  revalidatePath('/presupuesto');
  revalidatePath('/');
  return { success: true };
}

export async function actualizarCronogramaPartida(formData: {
  id: string;
  fechaInicioProg?: string;
  fechaFinProg?: string;
  duracionDias?: number;
  porcentajeAvance?: number;
}) {
  const { id, fechaInicioProg, fechaFinProg, duracionDias, porcentajeAvance } = formData;

  await prisma.partida.update({
    where: { id },
    data: {
      fechaInicioProg: fechaInicioProg ? new Date(fechaInicioProg) : null,
      fechaFinProg: fechaFinProg ? new Date(fechaFinProg) : null,
      duracionDias: duracionDias ? Number(duracionDias) : null,
      porcentajeAvance: porcentajeAvance !== undefined ? Number(porcentajeAvance) : undefined
    }
  });

  revalidatePath('/presupuesto');
  revalidatePath('/');
  return { success: true };
}


// ==========================================
// ACCIONES PARA TESORERÍA Y CUENTAS BANCARIAS
// ==========================================

export async function crearCuentaBancaria(formData: {
  banco: string;
  numeroCuenta: string;
  tipoCuenta: string;
  moneda: string;
  saldoInicial: number;
}) {
  const { banco, numeroCuenta, tipoCuenta, moneda, saldoInicial } = formData;

  await prisma.cuentaBancaria.create({
    data: {
      banco,
      numeroCuenta,
      tipoCuenta,
      moneda,
      saldoActual: Number(saldoInicial) || 0
    }
  });

  revalidatePath('/');
  revalidatePath('/tesoreria');
  revalidatePath('/egresos');
  revalidatePath('/ingresos');
  return { success: true };
}

export async function eliminarCuentaBancaria(id: string) {
  await prisma.$transaction(async (tx) => {
    // 1. Eliminar transacciones históricas vinculadas a esta cuenta
    await tx.transaccion.deleteMany({
      where: { cuentaBancariaId: id }
    });

    // 2. Eliminar la cuenta bancaria
    await tx.cuentaBancaria.delete({
      where: { id }
    });
  });

  revalidatePath('/');
  revalidatePath('/tesoreria');
  revalidatePath('/egresos');
  revalidatePath('/ingresos');
  return { success: true };
}

export async function actualizarSaldoCuenta(id: string, nuevoSaldo: number) {
  await prisma.cuentaBancaria.update({
    where: { id },
    data: {
      saldoActual: Number(nuevoSaldo)
    }
  });

  revalidatePath('/');
  revalidatePath('/tesoreria');
  return { success: true };
}

// ==========================================
// ACCIONES FINANCIERAS (EGRESOS E INGRESOS)
// ==========================================

export async function registrarEgreso(formData: {
  proyectoId: string;
  partidaId: string;
  entidadId: string;
  cuentaBancariaId: string;
  monto: number;
  tipoComprobante: string;
  numeroComprobante: string;
  observaciones?: string;
}) {
  const {
    proyectoId,
    partidaId,
    entidadId,
    cuentaBancariaId,
    monto,
    tipoComprobante,
    numeroComprobante,
    observaciones
  } = formData;

  await prisma.$transaction(async (tx) => {
    await tx.transaccion.create({
      data: {
        tipo: 'EGRESO',
        proyectoId,
        partidaId,
        entidadId,
        cuentaBancariaId,
        monto,
        tipoComprobante,
        numeroComprobante,
        estado: 'PAGADO',
        observaciones: observaciones || 'Egreso registrado desde módulo de obra'
      }
    });

    await tx.cuentaBancaria.update({
      where: { id: cuentaBancariaId },
      data: {
        saldoActual: {
          decrement: monto
        }
      }
    });
  });

  revalidatePath('/');
  revalidatePath('/egresos');
  revalidatePath('/presupuesto');
  revalidatePath('/tesoreria');
  return { success: true };
}

export async function registrarIngreso(formData: {
  proyectoId: string;
  entidadId: string;
  cuentaBancariaId: string;
  monto: number;
  tipoComprobante: string;
  numeroComprobante: string;
  tipo: string;
  observaciones?: string;
}) {
  const {
    proyectoId,
    entidadId,
    cuentaBancariaId,
    monto,
    tipoComprobante,
    numeroComprobante,
    tipo,
    observaciones
  } = formData;

  await prisma.$transaction(async (tx) => {
    await tx.transaccion.create({
      data: {
        tipo,
        proyectoId,
        entidadId,
        cuentaBancariaId,
        monto,
        tipoComprobante,
        numeroComprobante,
        estado: 'COBRADO',
        observaciones: observaciones || 'Ingreso / Valorización registrada'
      }
    });

    await tx.cuentaBancaria.update({
      where: { id: cuentaBancariaId },
      data: {
        saldoActual: {
          increment: monto
        }
      }
    });
  });

  revalidatePath('/');
  revalidatePath('/ingresos');
  revalidatePath('/tesoreria');
  return { success: true };
}
