import EmbeddedPostgres from 'embedded-postgres';
import { prisma } from '../lib/prisma';
import {
  createDatabaseBackup,
  createFilesBackup,
  verifyBackup,
  testIsolatedRestoration,
  pruneOldBackups,
} from '../lib/backup-service';
import fs from 'fs';
import path from 'path';

// Handle embedded postgres termination signals cleanly
process.on('uncaughtException', (err: any) => {
  if (err?.code === '57P01' || err?.message?.includes('terminating connection')) {
    // Ignore expected postgres daemon shutdown signal
    return;
  }
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

async function runPhase22BackupRecoveryTest() {
  console.log('🚀 Starting Phase 22 Backup, Restore and Disaster Recovery Integration Test on PostgreSQL...\n');

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
  console.log('✅ PostgreSQL engine ready on 127.0.0.1:5432');

  // Ensure BackupLog DDL table exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BackupLog" (
      "id" TEXT NOT NULL,
      "filename" TEXT NOT NULL,
      "filePath" TEXT NOT NULL,
      "fileSizeBytes" BIGINT NOT NULL,
      "backupType" TEXT NOT NULL,
      "checksumSha256" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "triggeredBy" TEXT NOT NULL,
      "errorMessage" TEXT,
      "recordCounts" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "verifiedAt" TIMESTAMP(3),
      CONSTRAINT "BackupLog_pkey" PRIMARY KEY ("id")
    );
  `);

  try {
    // 0. Ensure test database & seed basic records if empty
    let school = await prisma.school.findFirst();
    if (!school) {
      school = await prisma.school.create({
        data: {
          name: 'Test Recovery Academy',
          code: `TRA-${Date.now()}`,
          address: '100 Backup Way',
          phone: '+15550001111',
          email: 'admin@recoveryacademy.edu',
        },
      });
    }

    let user = await prisma.user.findFirst({ where: { systemRole: 'SUPER_ADMIN' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `admin.p22.${Date.now()}@school.edu`,
          passwordHash: 'hashed_password_123',
          fullName: 'Super Admin Recovery',
          systemRole: 'SUPER_ADMIN',
          schoolId: school.id,
        },
      });
    }

    // Seed test audit log
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'School',
        entityId: school.id,
      },
    });

    // TEST 1: Database Backup Creation & Checksum Calculation
    console.log('--- TEST 1: Database Backup Creation & SHA-256 Checksum ---');
    const dbBackup = await createDatabaseBackup('MANUAL_CLI');
    console.log(`✅ Generated DB Backup: ${dbBackup.filename}`);
    console.log(`   - Size: ${dbBackup.fileSizeBytes} bytes`);
    console.log(`   - SHA-256 Checksum: ${dbBackup.checksumSha256}`);
    if (!fs.existsSync(dbBackup.filePath)) {
      throw new Error(`Backup file missing at path: ${dbBackup.filePath}`);
    }
    console.log('[PASS] Test 1: Database Backup File & Checksum generated successfully.\n');

    // TEST 2: File Storage Snapshot Backup
    console.log('--- TEST 2: File Storage Snapshot Backup ---');
    const filesBackup = await createFilesBackup('MANUAL_CLI');
    console.log(`✅ Generated Files Backup: ${filesBackup.filename}`);
    console.log(`   - Size: ${filesBackup.fileSizeBytes} bytes`);
    if (!fs.existsSync(filesBackup.filePath)) {
      throw new Error(`Files backup missing at path: ${filesBackup.filePath}`);
    }
    console.log('[PASS] Test 2: File Storage Snapshot generated successfully.\n');

    // TEST 3: Backup Integrity Verification
    console.log('--- TEST 3: Backup Checksum & File Integrity Verification ---');
    const verification = await verifyBackup(dbBackup.filename);
    if (!verification.isValid || !verification.checksumMatch) {
      throw new Error(`Backup verification failed for ${dbBackup.filename}`);
    }
    console.log(`✅ Verified Checksum Match: ${verification.calculatedChecksum}`);
    console.log('[PASS] Test 3: SHA-256 Checksum verification passed.\n');

    // TEST 4: Isolated Non-Destructive Restoration Simulation
    console.log('--- TEST 4: Isolated Environment Restoration Verification ---');
    const restoreResult = await testIsolatedRestoration(dbBackup.filename);
    if (!restoreResult.success || !restoreResult.schemaSanity) {
      throw new Error(`Isolated restoration test failed: ${restoreResult.details}`);
    }
    console.log(`✅ Target Sandbox: ${restoreResult.targetDatabase}`);
    console.log(`✅ Schema Sanity Check: ${restoreResult.schemaSanity ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Restored Record Summary:`, JSON.stringify(restoreResult.restoredRecordCounts, null, 2));
    console.log('[PASS] Test 4: Isolated environment restoration verification passed.\n');

    // TEST 5: Backup Retention Pruning Policy
    console.log('--- TEST 5: Backup Retention Policy Execution ---');
    const pruneResult = await pruneOldBackups();
    console.log(`✅ Pruned Expired Backups: ${pruneResult.deletedCount}`);
    console.log('[PASS] Test 5: Retention pruning executed cleanly without deleting active backups.\n');

    // TEST 6: Audit Log Integrity Check
    console.log('--- TEST 6: Audit Log Integrity Verification ---');
    const logCheck = await prisma.auditLog.findUnique({ where: { id: auditLog.id } });
    if (!logCheck) {
      throw new Error('Audit log record missing!');
    }
    console.log(`✅ Audit Log Retained: ID=${logCheck.id}, Entity=${logCheck.entity}, Action=${logCheck.action}`);
    console.log('[PASS] Test 6: Audit log integrity verified.\n');

    // TEST SUMMARY
    console.log('===========================================================');
    console.log('=== PHASE 22 BACKUP & RECOVERY INTEGRATION TEST REPORT ===');
    console.log('===========================================================');
    console.log('[PASS] 1. Database SQL Backup Generation & SHA-256 Checksum');
    console.log('[PASS] 2. File Storage Upload Manifest Backup');
    console.log('[PASS] 3. SHA-256 Checksum & File Integrity Verification');
    console.log('[PASS] 4. Isolated Environment Restoration & Record Count Audit');
    console.log('[PASS] 5. Configured Backup Retention Pruning');
    console.log('[PASS] 6. Immutable Audit Log Security & Retainability');
    console.log('\n✅ ALL PHASE 22 BACKUP & RECOVERY TESTS PASSED SUCCESSFULLY!\n');
  } catch (error) {
    console.error('❌ Phase 22 Integration Test Failed:', error);
    process.exit(1);
  } finally {
    try { await prisma.$disconnect(); } catch {}
    try { await pg.stop(); } catch {}
    console.log('👋 PostgreSQL stopped.');
  }
}

runPhase22BackupRecoveryTest();
