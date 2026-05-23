import { PrismaClient } from '@prisma/client';
import DepartmentsClient from './DepartmentsClient';

const prisma = new PrismaClient();

export default async function DepartmentsPage() {
  const departments = await prisma.department.findMany({
    include: { positions: true },
    orderBy: { name: 'asc' },
  });

  const serialized = departments.map(d => ({
    id: d.id,
    name: d.name,
    positions: d.positions.map(p => ({ id: p.id, title: p.title, departmentId: p.departmentId })),
  }));

  return <DepartmentsClient initialDepartments={serialized} />;
}
