import { prisma } from '@/lib/prisma';
import ProyectosClient from '@/components/proyectos/ProyectosClient';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function ProyectosPage() {
  const proyectos = await prisma.proyecto.findMany({
    orderBy: { creadoEn: 'desc' }
  });

  const cookieStore = await cookies();
  const proyectoActivoId = cookieStore.get('sipro_proyecto_id')?.value || proyectos[0]?.id;

  return (
    <ProyectosClient
      proyectos={proyectos}
      proyectoActivoId={proyectoActivoId}
    />
  );
}
