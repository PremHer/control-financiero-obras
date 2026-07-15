'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

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
    // 1. Eliminar transacciones del proyecto
    await tx.transaccion.deleteMany({
      where: { proyectoId }
    });

    // 2. Eliminar partidas del proyecto
    await tx.partida.deleteMany({
      where: { proyectoId }
    });

    // 3. Eliminar el proyecto
    await tx.proyecto.delete({
      where: { id: proyectoId }
    });
  });

  // Si el proyecto eliminado era el activo en la cookie, lo limpiamos o asignamos el siguiente
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
  }>
) {
  if (!partidas || partidas.length === 0) return { success: false, message: 'No hay partidas para importar' };

  await prisma.partida.createMany({
    data: partidas.map((p) => ({
      proyectoId,
      item: p.item || '01',
      descripcion: p.descripcion || 'Sin descripción',
      unidad: p.unidad || 'glb',
      metrado: Number(p.metrado) || 1,
      precioUnitario: Number(p.precioUnitario) || 0,
      parcialPresupuesto: Number(p.parcialPresupuesto) || 0
    }))
  });

  revalidatePath('/presupuesto');
  revalidatePath('/');
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
