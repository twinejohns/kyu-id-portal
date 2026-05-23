import { PrismaClient } from '@prisma/client';
import ApplicationsClient from './ApplicationsClient';

const prisma = new PrismaClient();

export default async function ApplicationsPage() {
  const [applications, departments] = await Promise.all([
    prisma.staffApplication.findMany({
      include: { department: true, position: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const serialized = applications.map(a => ({
    id: a.id,
    fullName: a.fullName,
    email: a.email,
    applicationType: a.applicationType,
    status: a.status,
    employmentTerm: a.employmentTerm,
    createdAt: a.createdAt.toISOString(),
    generatedIdNumber: a.generatedIdNumber ?? null,
    replacementReason: a.replacementReason ?? null,
    department: { id: a.department.id, name: a.department.name },
    position:   { id: a.position.id,   title: a.position.title },
    photoUrl: a.photoUrl,
    signatureUrl: a.signatureUrl,
  }));

  const serializedDepts = departments.map(d => ({ id: d.id, name: d.name }));

  return <ApplicationsClient initialApplications={serialized} departments={serializedDepts} />;
}
