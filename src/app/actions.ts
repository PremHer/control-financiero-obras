'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// ==========================================
// ACCIONES PARA GESTIÓN DE PROYECTOS Y SEMILLA
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

  // Establecer como proyecto activo en cookie
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

export async function cargarDatosSemillaAction() {
  // 1. Verificar si ya existe para no duplicar en exceso o limpiar y cargar
  let proyecto = await prisma.proyecto.findFirst({
    where: { codigo: 'OBRA-2026-CHUCO' }
  });

  if (!proyecto) {
    proyecto = await prisma.proyecto.create({
      data: {
        codigo: 'OBRA-2026-CHUCO',
        nombre: 'Mejoramiento del Canal de Riego Jesús - Chuco',
        cliente: 'Programa Subsectorial de Irrigaciones',
        ubicacion: 'Cajamarca / Jesús / Chuco',
        fechaInicio: new Date('2026-06-01'),
        presupuestoTotal: 1450000.00,
      },
    });

    const clienteEntidad = await prisma.entidad.create({
      data: {
        razonSocial: 'Programa Subsectorial de Irrigaciones',
        documento: '20140939638',
        tipo: 'CLIENTE',
        direccion: 'Av. Las Irrigaciones 450, Lima',
      },
    });

    const proveedorSandoval = await prisma.entidad.create({
      data: {
        razonSocial: 'Sandoval Alva Jhalixa Yuliza',
        documento: '10723456781',
        tipo: 'PROVEEDOR',
        email: 'sandoval.jhalixa@proveedores.pe',
        telefono: '987654321',
      },
    });

    const ctaCorriente = await prisma.cuentaBancaria.create({
      data: {
        banco: 'Banco de la Nación',
        numeroCuenta: '00-068-345892',
        tipoCuenta: 'CORRIENTE',
        moneda: 'PEN',
        saldoActual: 285400.00,
      },
    });

    const ctaDetracciones = await prisma.cuentaBancaria.create({
      data: {
        banco: 'Banco de la Nación',
        numeroCuenta: '00-068-112233',
        tipoCuenta: 'DETRACCIONES',
        moneda: 'PEN',
        saldoActual: 32450.00,
      },
    });

    const partida1 = await prisma.partida.create({
      data: {
        proyectoId: proyecto.id,
        item: '11.01.01',
        descripcion: 'Excavación masiva con equipo pesado',
        unidad: 'm3',
        metrado: 72276.25,
        precioUnitario: 3.13,
        parcialPresupuesto: 226224.66,
      },
    });

    const partida2 = await prisma.partida.create({
      data: {
        proyectoId: proyecto.id,
        item: '01.03',
        descripcion: 'Movilización y desmovilización de maquinaria',
        unidad: 'glb',
        metrado: 1.00,
        precioUnitario: 8734.89,
        parcialPresupuesto: 8734.89,
      },
    });

    await prisma.transaccion.create({
      data: {
        tipo: 'VALORIZACION',
        fecha: new Date('2026-06-15'),
        proyectoId: proyecto.id,
        entidadId: clienteEntidad.id,
        cuentaBancariaId: ctaCorriente.id,
        monto: 180000.00,
        tipoComprobante: 'RESOLUCION',
        numeroComprobante: 'VAL-NRO-001-2026',
        estado: 'COBRADO',
        observaciones: 'Valorización N° 01 - Avance de Obra Junio',
      },
    });

    await prisma.transaccion.create({
      data: {
        tipo: 'EGRESO',
        fecha: new Date('2026-06-20'),
        proyectoId: proyecto.id,
        partidaId: partida1.id,
        entidadId: proveedorSandoval.id,
        cuentaBancariaId: ctaCorriente.id,
        monto: 15650.00,
        tipoComprobante: 'FACTURA',
        numeroComprobante: 'F001-000452',
        estado: 'PAGADO',
        observaciones: 'Pago parcial por avance de excavación masiva tramo 1',
      },
    });
  }

  const cookieStore = await cookies();
  cookieStore.set('sipro_proyecto_id', proyecto.id, { path: '/' });

  revalidatePath('/');
  revalidatePath('/proyectos');
  revalidatePath('/presupuesto');
  revalidatePath('/egresos');
  revalidatePath('/ingresos');
  revalidatePath('/tesoreria');
  return { success: true, proyectoId: proyecto.id };
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
