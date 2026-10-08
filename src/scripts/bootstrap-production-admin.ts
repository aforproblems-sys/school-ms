import EmbeddedPostgres from 'embedded-postgres';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';
import { SystemRole } from '@prisma/client';
import fs from 'fs';
import path from 'path';

process.on('uncaughtException', (err: unknown) => {
  const errorObj = err as { code?: string; message?: string };
  if (errorObj?.code === '57P01' || errorObj?.message?.includes('terminating connection')) {
    return;
  }
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

export async function bootstrapProductionAdmin() {
  console.log('🚀 Bootstrapping Initial Platform Super Admin Account...\n');

  const adminEmail = process.env.INITIAL_SUPER_ADMIN_EMAIL || 'admin.platform@edumanage.com';
  const rawPassword = process.env.INITIAL_SUPER_ADMIN_PASSWORD || 'AdminSecure2026!';
  const adminName = process.env.INITIAL_SUPER_ADMIN_NAME || 'Platform Super Administrator';

  const passwordHash = await hashPassword(rawPassword);

  // Upsert Super Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    create: {
      email: adminEmail.toLowerCase(),
      passwordHash,
      fullName: adminName,
      systemRole: SystemRole.SUPER_ADMIN,
      isActive: true,
    },
    update: {
      passwordHash,
      fullName: adminName,
      systemRole: SystemRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Platform Super Admin Created/Updated Successfully:`);
  console.log(`   - User ID : ${adminUser.id}`);
  console.log(`   - Email   : ${adminUser.email}`);
  console.log(`   - Role    : ${adminUser.systemRole}`);
  console.log(`   - Password: [SECURELY_HASHED]`);
  console.log('\n🔐 Credentials note: You can sign in immediately with your configured admin credentials.');

  return adminUser;
}

async function runStandaloneBootstrap() {
  const dbDir = path.join(process.cwd(), '.postgres-data');
  const isInitial = !fs.existsSync(dbDir);

  const pg = new EmbeddedPostgres({
    databaseDir: dbDir,
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    authMethod: 'password',
    persistent: true,
  });

  if (isInitial) {
    await pg.initialise();
  }

  await pg.start();
  try {
    await bootstrapProductionAdmin();
  } catch (err) {
    console.error('❌ Bootstrap Admin Failed:', err);
    process.exit(1);
  } finally {
    try { await prisma.$disconnect(); } catch {}
    try { await pg.stop(); } catch {}
  }
}

// Execute standalone if executed directly via tsx
if (require.main === module) {
  runStandaloneBootstrap();
}
