'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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
    // 1. Crear la transacción de egreso
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

    // 2. Restar saldo a la cuenta bancaria de origen
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
  tipo: string; // INGRESO o VALORIZACION
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
