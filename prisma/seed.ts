import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Seed Users for all 5 roles
  const users = [
    {
      email: 'admin@kyu.ac.ug',
      password: 'password123',
      role: 'SUPERADMIN',
      name: 'Super System Admin',
    },
    {
      email: 'dicts@kyu.ac.ug',
      password: 'password123',
      role: 'MEDIAOFFICER',
      name: 'DICTS Media Officer',
    },
    {
      email: 'hr@kyu.ac.ug',
      password: 'password123',
      role: 'HR',
      name: 'HR Admin',
    },
    {
      email: 'printer@kyu.ac.ug',
      password: 'password123',
      role: 'PRINTER',
      name: 'Card Printer Officer',
    },
    {
      email: 'issuance@kyu.ac.ug',
      password: 'password123',
      role: 'ISSUANCE',
      name: 'ID Issuance Officer',
    },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name },
      create: u,
    });
    console.log(`Seeded user: ${user.email} as ${user.role}`);
  }

  // Create initial Department and Position
  const itDept = await prisma.department.upsert({
    where: { name: 'Information Technology' },
    update: {},
    create: {
      name: 'Information Technology',
    },
  });

  const existingPos = await prisma.position.findFirst({
    where: { title: 'Software Developer', departmentId: itDept.id }
  });

  if (!existingPos) {
    await prisma.position.create({
      data: {
        title: 'Software Developer',
        departmentId: itDept.id,
      },
    });
    console.log('Seeded position: Software Developer');
  }

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
