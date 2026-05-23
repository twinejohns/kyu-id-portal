import { PrismaClient } from '@prisma/client';
import UsersClient from './UsersClient';

const prisma = new PrismaClient();

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });

  const serialized = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  }));

  return <UsersClient initialUsers={serialized} />;
}
