import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inicializando datos de semilla para Control Financiero de Obras...');

  // Limpiar BD existente si fuera necesario para pruebas
  await prisma.transaccion.deleteMany();
  await prisma.partida.deleteMany();
  await prisma.proyecto.deleteMany();
  await prisma.cuentaBancaria.deleteMany();
  await prisma.entidad.deleteMany();

  // 1. Crear Proyecto (Mejoramiento del Canal de Riego Jesús - Chuco)
  const proyecto = await prisma.proyecto.create({
    data: {
      codigo: 'OBRA-2026-CHUCO',
      nombre: 'Mejoramiento del Canal de Riego Jesús - Chuco',
      cliente: 'Programa Subsectorial de Irrigaciones',
      ubicacion: 'Cajamarca / Jesús / Chuco',
      fechaInicio: new Date('2026-06-01'),
      presupuestoTotal: 1450000.00,
    },
  });

  // 2. Crear Entidades (Cliente y Proveedor)
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

  // 3. Crear Cuentas Bancarias
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

  // 4. Crear Partidas Presupuestales solicitadas
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

  // 5. Crear algunas transacciones de prueba (1 Valorización cobrada y 1 Egreso de prueba para ver el Dashboard interactivo)
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

  console.log('✅ Semilla ejecutada con éxito. Proyecto y datos de Chuco cargados.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
