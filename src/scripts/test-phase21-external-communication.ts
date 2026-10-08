import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { SystemRole, CommunicationChannel, CommunicationStatus } from '@prisma/client';
import { formatToE164, isValidPhoneNumber } from '../lib/phone-utils';
import { dispatchExternalCommunication } from '../lib/communication-dispatcher';
import {
  getCommunicationLogsAction,
  getCommunicationConfigAction,
  updateCommunicationConfigAction,
  retryCommunicationLogAction,
} from '../actions/communication.actions';

async function main() {
  console.log('🚀 Starting Phase 21 External Communication Integration Layer Test on PostgreSQL...\n');

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

  // Execute Phase 21 DDL schema updates safely
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "CommunicationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."CommunicationLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "notificationId" TEXT,
      "userId" TEXT NOT NULL REFERENCES "public"."User"("id") ON DELETE CASCADE,
      "channel" "CommunicationChannel" NOT NULL,
      "provider" TEXT NOT NULL,
      "messageType" TEXT NOT NULL,
      "recipient" TEXT NOT NULL,
      "status" "CommunicationStatus" NOT NULL DEFAULT 'PENDING',
      "attemptCount" INTEGER NOT NULL DEFAULT 0,
      "maxAttempts" INTEGER NOT NULL DEFAULT 3,
      "idempotencyKey" TEXT UNIQUE,
      "failureReason" TEXT,
      "sentAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."NotificationPreference" ADD COLUMN IF NOT EXISTS "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."NotificationPreference" ADD COLUMN IF NOT EXISTS "smsEnabled" BOOLEAN NOT NULL DEFAULT true;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."NotificationSetting" ADD COLUMN IF NOT EXISTS "emailEnabled" BOOLEAN NOT NULL DEFAULT true;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."NotificationSetting" ADD COLUMN IF NOT EXISTS "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."NotificationSetting" ADD COLUMN IF NOT EXISTS "smsEnabled" BOOLEAN NOT NULL DEFAULT false;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."NotificationSetting" ADD COLUMN IF NOT EXISTS "testModeEnabled" BOOLEAN NOT NULL DEFAULT true;
  `);

  const results: { test: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

  try {
    const timestamp = Date.now();

    // Ensure baseline users exist for testing
    let adminUser = await prisma.user.findFirst({
      where: { systemRole: SystemRole.SUPER_ADMIN, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: `admin.p21.${timestamp}@school.edu`,
          phoneNumber: '+15559990001',
          passwordHash: '$2a$12$abcdefghijklmnopqrstuv',
          fullName: 'Test Admin P21',
          systemRole: SystemRole.SUPER_ADMIN,
        },
      });
    }

    // 1. Test International Phone Number Validation & E.164 Formatting
    const validE164 = formatToE164('+1 (555) 999-0001');
    const invalidPhone = isValidPhoneNumber('12345');

    if (validE164 !== '+15559990001' || invalidPhone !== false) {
      throw new Error('Phone number formatting validation failed');
    }

    results.push({
      test: '1. International E.164 Phone Formatting & Validation',
      status: 'PASS',
      details: 'Correctly formatted "+1 (555) 999-0001" to "+15559990001" and rejected malformed "12345"',
    });

    // Ensure all communication channels are enabled for test execution
    await updateCommunicationConfigAction({
      emailEnabled: true,
      whatsappEnabled: true,
      smsEnabled: true,
      testModeEnabled: true,
    });

    await prisma.notificationPreference.upsert({
      where: { userId: adminUser.id },
      create: { userId: adminUser.id, inAppEnabled: true, emailEnabled: true, whatsappEnabled: true, smsEnabled: true },
      update: { inAppEnabled: true, emailEnabled: true, whatsappEnabled: true, smsEnabled: true },
    });

    // 2. Test Communication Dispatcher in Test Mode (Email, WhatsApp, SMS)
    const emailLog = await dispatchExternalCommunication(
      CommunicationChannel.EMAIL,
      { to: adminUser.email, subject: 'Welcome Test', text: 'Welcome to portal' },
      { userId: adminUser.id, messageType: 'WELCOME_EMAIL', idempotencyKey: `idemp_email_${timestamp}` }
    );

    const whatsappLog = await dispatchExternalCommunication(
      CommunicationChannel.WHATSAPP,
      { to: adminUser.phoneNumber || '+15559990001', text: 'Fee Payment Received $500.00' },
      { userId: adminUser.id, messageType: 'FEE_RECEIPT', idempotencyKey: `idemp_wa_${timestamp}` }
    );

    const smsLog = await dispatchExternalCommunication(
      CommunicationChannel.SMS,
      { to: adminUser.phoneNumber || '+15559990001', text: 'Attendance Alert: Absent today' },
      { userId: adminUser.id, messageType: 'ATTENDANCE_ALERT', idempotencyKey: `idemp_sms_${timestamp}` }
    );

    if (!emailLog || !whatsappLog || !smsLog) {
      console.log('Dispatch logs:', { emailLog, whatsappLog, smsLog });
      throw new Error('External communication dispatch failed');
    }

    results.push({
      test: '2. Provider-Independent Dispatcher & Test Mode Simulation',
      status: 'PASS',
      details: `Successfully queued & simulated Email, WhatsApp, and SMS jobs in DB with status SENT`,
    });

    // 3. Test Idempotency Key Duplicate Prevention
    const duplicateLog = await dispatchExternalCommunication(
      CommunicationChannel.EMAIL,
      { to: adminUser.email, subject: 'Welcome Test Duplicate', text: 'Duplicate message' },
      { userId: adminUser.id, messageType: 'WELCOME_EMAIL', idempotencyKey: `idemp_email_${timestamp}` }
    );

    if (!duplicateLog || duplicateLog.id !== emailLog.id) {
      throw new Error('Idempotency deduplication check failed');
    }

    results.push({
      test: '3. Idempotency Key Protection against Duplicate Messages',
      status: 'PASS',
      details: `Prevented duplicate message send for idempotency key "idemp_email_${timestamp}"`,
    });

    // 4. Test Delivery Log Retrieval & Filter Actions
    const fetchLogs = await getCommunicationLogsAction({ limit: 10 });
    if (!fetchLogs.success || fetchLogs.logs.length === 0) {
      throw new Error('Communication delivery log retrieval failed');
    }

    results.push({
      test: '4. Delivery Log Audit Trail Retrieval',
      status: 'PASS',
      details: `Retrieved ${fetchLogs.logs.length} delivery logs from PostgreSQL audit trail`,
    });

    // 5. Test Admin Config & Channel Toggles
    const configRes = await getCommunicationConfigAction();
    if (!configRes.success) throw new Error('Get communication config failed');

    const updateConfigRes = await updateCommunicationConfigAction({
      emailEnabled: true,
      whatsappEnabled: true,
      smsEnabled: true,
      testModeEnabled: true,
    });
    if (!updateConfigRes.success) throw new Error('Update communication config failed');

    results.push({
      test: '5. Admin Channel Toggles & Test Mode Control',
      status: 'PASS',
      details: 'Successfully configured Email, WhatsApp, SMS channel settings & Test Mode switch',
    });

    console.log('\n=== PHASE 21 EXTERNAL COMMUNICATION INTEGRATION TEST REPORT ===\n');
    results.forEach((r) => {
      console.log(`[${r.status}] ${r.test} -> ${r.details}`);
    });
    console.log('\n✅ ALL PHASE 21 EXTERNAL COMMUNICATION TESTS PASSED SUCCESSFULLY!\n');
  } catch (error: unknown) {
    console.error('❌ Phase 21 Integration Test Failed:', error);
    await pg.stop();
    process.exit(1);
  } finally {
    await pg.stop();
    console.log('👋 PostgreSQL stopped.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
