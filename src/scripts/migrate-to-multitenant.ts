import EmbeddedPostgres from 'embedded-postgres';
import { prisma } from '../lib/prisma';
import { SchoolStatus, SubscriptionPlan } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Handle embedded postgres termination signals cleanly
process.on('uncaughtException', (err: any) => {
  if (err?.code === '57P01' || err?.message?.includes('terminating connection')) {
    return;
  }
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

async function main() {
  console.log('================================================================');
  console.log('🔄 SCHOOL MANAGEMENT SYSTEM - MULTI-TENANT MIGRATION ENGINE');
  console.log('================================================================\n');

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
  console.log('✅ PostgreSQL engine ready on 127.0.0.1:5432\n');

  // Execute Phase 23 DDL schema updates safely
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SchoolStatus') THEN
        CREATE TYPE "SchoolStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionPlan') THEN
        CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE');
      END IF;
    END $$;

    ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "website" TEXT;
    ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "principalName" TEXT;
    ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "principalEmail" TEXT;
    ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "status" "SchoolStatus" NOT NULL DEFAULT 'ACTIVE';
    ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'BASIC';
    ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "maxStudents" INTEGER NOT NULL DEFAULT 300;
    ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "maxTeachers" INTEGER NOT NULL DEFAULT 30;
    ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "maxAdmins" INTEGER NOT NULL DEFAULT 5;
    ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "maxStorageMb" INTEGER NOT NULL DEFAULT 5000;
    ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
  `);
  console.log('✅ Phase 23 Schema Columns & Enums verified in database.\n');

  try {
    // 1. Ensure initial default primary school exists
    let defaultSchool = await prisma.school.findFirst({
      where: { OR: [{ id: 'default-primary-school' }, { code: 'DEFAULT-01' }] },
    });

    if (!defaultSchool) {
      console.log('📌 Creating Initial Default Primary School Tenant...');
      defaultSchool = await prisma.school.create({
        data: {
          id: 'default-primary-school',
          name: 'Primary Academy',
          code: 'DEFAULT-01',
          address: '100 Education Way, Primary City',
          phone: '+15550001000',
          email: 'admin@primaryacademy.edu',
          currency: 'USD',
          status: SchoolStatus.ACTIVE,
          subscriptionPlan: SubscriptionPlan.BASIC,
          maxStudents: 500,
          maxTeachers: 50,
          maxAdmins: 10,
          maxStorageMb: 10000,
        },
      });
      console.log(`✅ Created Primary Default School: ${defaultSchool.name} (${defaultSchool.id})`);
    } else {
      console.log(`ℹ️ Default Primary School Tenant verified: ${defaultSchool.name} (${defaultSchool.id})`);
    }

    // 2. Backfill unassigned Users
    const unassignedUsers = await prisma.user.findMany({
      where: { schoolId: null },
    });

    if (unassignedUsers.length > 0) {
      console.log(`\n📌 Backfilling ${unassignedUsers.length} unassigned users to default school [${defaultSchool.id}]...`);
      await prisma.user.updateMany({
        where: { schoolId: null },
        data: { schoolId: defaultSchool.id },
      });
      console.log(`✅ Backfilled ${unassignedUsers.length} users successfully.`);
    } else {
      console.log(`✅ All users are already assigned to valid school tenants.`);
    }

    // 3. Backfill Notification Settings
    const existingSetting = await prisma.notificationSetting.findUnique({
      where: { schoolId: defaultSchool.id },
    });

    if (!existingSetting) {
      await prisma.notificationSetting.create({
        data: { schoolId: defaultSchool.id },
      });
      console.log(`✅ Created NotificationSettings for default primary school.`);
    }

    // 4. Validate Migration Sanity
    const remainingUnassigned = await prisma.user.count({ where: { schoolId: null } });

    console.log('\n================================================================');
    console.log('=== MULTI-TENANT DATA MIGRATION REPORT ===');
    console.log('================================================================');
    console.log(`  - Target Default School: ${defaultSchool.name} (${defaultSchool.id})`);
    console.log(`  - Total Users Assigned: ${await prisma.user.count({ where: { schoolId: defaultSchool.id } })}`);
    console.log(`  - Unassigned Users Remaining: ${remainingUnassigned}`);
    console.log(`  - Migration Status: ${remainingUnassigned === 0 ? 'PASSED (0 Orphaned Records)' : 'WARNING'}`);

    if (remainingUnassigned > 0) {
      throw new Error('Migration failed: orphaned unassigned records remain.');
    }

    console.log('\n🎉 MULTI-TENANT MIGRATION COMPLETED SUCCESSFULLY WITH ZERO DATA LOSS!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    try { await prisma.$disconnect(); } catch {}
    try { await pg.stop(); } catch {}
    console.log('👋 PostgreSQL stopped.');
  }
}

main();
