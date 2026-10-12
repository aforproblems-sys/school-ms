import { PrismaClient, SystemRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function main() {
  console.log('🌱 Seeding (clean) ...');

  const schoolName = process.env.INITIAL_SCHOOL_NAME || 'Islamia Public School';
  const schoolCode = process.env.INITIAL_SCHOOL_CODE || 'IPS-001';

  const superEmail = need('INITIAL_SUPER_ADMIN_EMAIL').toLowerCase();
  const superName = need('INITIAL_SUPER_ADMIN_NAME');
  const superPassword = need('INITIAL_SUPER_ADMIN_PASSWORD');

  const schoolAdminEmail = need('INITIAL_SCHOOL_ADMIN_EMAIL').toLowerCase();
  const schoolAdminName = need('INITIAL_SCHOOL_ADMIN_NAME');
  const schoolAdminPassword = need('INITIAL_SCHOOL_ADMIN_PASSWORD');

  const school = await prisma.school.upsert({
    where: { code: schoolCode },
    update: { name: schoolName },
    create: {
      name: schoolName,
      code: schoolCode,
      address: '—',
      phone: '—',
      email: '—',
      currency: 'PKR',
    },
  });

  const superHash = await bcrypt.hash(superPassword, 12);
  const adminHash = await bcrypt.hash(schoolAdminPassword, 12);

  await prisma.user.upsert({
    where: { email: superEmail },
    update: { fullName: superName, passwordHash: superHash, systemRole: SystemRole.SUPER_ADMIN, schoolId: school.id, isActive: true, deletedAt: null },
    create: { email: superEmail, fullName: superName, passwordHash: superHash, systemRole: SystemRole.SUPER_ADMIN, schoolId: school.id, isActive: true },
  });

  await prisma.user.upsert({
    where: { email: schoolAdminEmail },
    update: { fullName: schoolAdminName, passwordHash: adminHash, systemRole: SystemRole.SCHOOL_ADMIN, schoolId: school.id, isActive: true, deletedAt: null },
    create: { email: schoolAdminEmail, fullName: schoolAdminName, passwordHash: adminHash, systemRole: SystemRole.SCHOOL_ADMIN, schoolId: school.id, isActive: true },
  });

  console.log('✅ Seed done:', { school: schoolName, superEmail, schoolAdminEmail });
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
