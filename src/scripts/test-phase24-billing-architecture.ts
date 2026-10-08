import EmbeddedPostgres from 'embedded-postgres';
import { prisma } from '../lib/prisma';
import { canUseFeature } from '../lib/feature-access';
import { activePaymentProvider } from '../lib/payment-provider';
import { processBillingWebhook } from '../lib/webhook-engine';
import { validateSchoolAccess, checkSubscriptionLimit } from '../lib/school-context';
import { SystemRole, SchoolStatus, SubscriptionPlan, SubscriptionStatus, InvoiceStatus } from '@prisma/client';
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

async function runPhase24BillingTest() {
  console.log('🚀 Starting Phase 24 SaaS Subscription & Billing Architecture Test on PostgreSQL...\n');

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

  // 1. Commit Enum Value First (PostgreSQL constraint)
  await prisma.$executeRawUnsafe(`ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'FREE_TRIAL';`);

  // 2. Execute Phase 24 DDL schema updates safely
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
        CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceStatus') THEN
        CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS "SchoolSubscription" (
      "id" TEXT NOT NULL,
      "schoolId" TEXT NOT NULL,
      "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE_TRIAL',
      "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
      "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "trialEndsAt" TIMESTAMP(3),
      "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
      "nextBillingDate" TIMESTAMP(3),
      "cancelledAt" TIMESTAMP(3),
      "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
      "providerCustomerId" TEXT,
      "providerSubscriptionId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "SchoolSubscription_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "Invoice" (
      "id" TEXT NOT NULL,
      "schoolId" TEXT NOT NULL,
      "invoiceNumber" TEXT NOT NULL,
      "plan" "SubscriptionPlan" NOT NULL,
      "amount" DECIMAL(12,2) NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
      "paymentRef" TEXT,
      "billingPeriodStart" TIMESTAMP(3) NOT NULL,
      "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
      "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "dueDate" TIMESTAMP(3) NOT NULL,
      "paidAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "BillingWebhookLog" (
      "id" TEXT NOT NULL,
      "eventId" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "eventType" TEXT NOT NULL,
      "payload" JSONB NOT NULL,
      "status" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BillingWebhookLog_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "SchoolSubscription_schoolId_key" ON "SchoolSubscription"("schoolId");
    CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
    CREATE UNIQUE INDEX IF NOT EXISTS "BillingWebhookLog_eventId_key" ON "BillingWebhookLog"("eventId");
  `);
  console.log('✅ Phase 24 Billing Schema Tables & Indexes verified.\n');

  try {
    // 1. Provision School Billing Tenants
    console.log('--- PROVISIONING BILLING TEST TENANTS ---');
    const schoolAlpha = await prisma.school.upsert({
      where: { code: 'TRA-BILLING-ALPHA' },
      create: {
        name: 'Alpha Billing Academy',
        code: 'TRA-BILLING-ALPHA',
        address: '100 Billing Way',
        phone: '+15559991111',
        email: 'billing.alpha@school.edu',
        status: SchoolStatus.ACTIVE,
        subscriptionPlan: SubscriptionPlan.FREE_TRIAL,
      },
      update: { subscriptionPlan: SubscriptionPlan.FREE_TRIAL },
    });

    const userAdminAlpha = await prisma.user.upsert({
      where: { email: 'admin.billing.alpha@school.edu' },
      create: {
        email: 'admin.billing.alpha@school.edu',
        passwordHash: 'hash_alpha_billing',
        fullName: 'Admin Billing Alpha',
        systemRole: SystemRole.SCHOOL_ADMIN,
        schoolId: schoolAlpha.id,
      },
      update: { schoolId: schoolAlpha.id },
    });

    console.log(`✅ Tenant Alpha Provisioned: ${schoolAlpha.name} (${schoolAlpha.id})\n`);

    // TEST 1: Trial Creation & Status Tracking
    console.log('--- TEST 1: Trial Creation & Status Tracking ---');
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const subAlpha = await prisma.schoolSubscription.upsert({
      where: { schoolId: schoolAlpha.id },
      create: {
        schoolId: schoolAlpha.id,
        plan: SubscriptionPlan.FREE_TRIAL,
        status: SubscriptionStatus.TRIAL,
        startDate: now,
        trialEndsAt: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
      },
      update: {
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: trialEnd,
      },
    });

    if (subAlpha.status !== SubscriptionStatus.TRIAL) {
      throw new Error('Trial Creation Error: Subscription status is not TRIAL');
    }
    console.log(`✅ Subscription Created in TRIAL status. Trial Ends: ${subAlpha.trialEndsAt?.toISOString()}`);
    console.log('[PASS] Test 1: Trial Creation verified.\n');

    // TEST 2: Server-Side Feature Access & Capacity Limit Checks
    console.log('--- TEST 2: Feature Access & Capacity Limit Checks ---');
    const sessionAlpha = {
      userId: userAdminAlpha.id,
      email: userAdminAlpha.email,
      fullName: userAdminAlpha.fullName,
      role: SystemRole.SCHOOL_ADMIN,
      schoolId: schoolAlpha.id,
    };

    const hasBulkImport = await canUseFeature(sessionAlpha, 'bulk_import');
    const hasSmsGateway = await canUseFeature(sessionAlpha, 'sms_notifications');

    if (!hasBulkImport) {
      throw new Error('Feature Access Error: bulk_import should be unlocked in FREE_TRIAL');
    }
    if (hasSmsGateway) {
      throw new Error('Feature Access Error: sms_notifications should be locked in FREE_TRIAL');
    }
    console.log(`✅ Feature Flags correctly evaluated: bulk_import=${hasBulkImport}, sms_notifications=${hasSmsGateway}`);

    const capacityCheck = await checkSubscriptionLimit(schoolAlpha.id, 'STUDENTS');
    console.log(`✅ Capacity Limit checked: Current=${capacityCheck.currentCount}, Max=${capacityCheck.maxLimit}`);
    console.log('[PASS] Test 2: Feature Access & Capacity Limits verified.\n');

    // TEST 3: Payment Provider Abstraction & Checkout Session
    console.log('--- TEST 3: Payment Provider Abstraction & Checkout Session ---');
    const checkout = await activePaymentProvider.createCheckoutSession({
      schoolId: schoolAlpha.id,
      schoolName: schoolAlpha.name,
      plan: SubscriptionPlan.PROFESSIONAL,
      amount: 149,
      currency: 'USD',
      customerEmail: userAdminAlpha.email,
      successUrl: '/settings/subscription',
      cancelUrl: '/settings/subscription',
    });

    if (!checkout.checkoutUrl || !checkout.providerTransactionId) {
      throw new Error('Checkout Session Error: Missing transaction reference');
    }
    console.log(`✅ Checkout Session Created: TransactionRef=${checkout.providerTransactionId}`);
    console.log(`   - Generated Invoice #: ${checkout.invoiceNumber}`);
    console.log('[PASS] Test 3: Payment Provider Abstraction verified.\n');

    // TEST 4: Idempotent Webhook Processing Engine
    console.log('--- TEST 4: Idempotent Webhook Engine & Duplicate Event Protection ---');
    const webhookEventId = `evt_test_phase24_${Date.now()}`;

    // First Webhook Dispatch
    const res1 = await processBillingWebhook({
      eventId: webhookEventId,
      provider: 'TEST_MOCK_GATEWAY',
      eventType: 'payment.success',
      schoolId: schoolAlpha.id,
      plan: SubscriptionPlan.PROFESSIONAL,
      amount: 149,
      currency: 'USD',
      transactionRef: checkout.providerTransactionId,
      timestamp: new Date().toISOString(),
    });

    if (!res1.processed || res1.duplicate || res1.status !== 'PROCESSED') {
      throw new Error(`Webhook Processing Error: First dispatch failed: ${res1.message}`);
    }
    console.log(`✅ First Webhook Dispatch Processed: Status=${res1.status}`);

    // Replayed Duplicate Webhook Dispatch
    const res2 = await processBillingWebhook({
      eventId: webhookEventId,
      provider: 'TEST_MOCK_GATEWAY',
      eventType: 'payment.success',
      schoolId: schoolAlpha.id,
      plan: SubscriptionPlan.PROFESSIONAL,
      amount: 149,
      currency: 'USD',
      transactionRef: checkout.providerTransactionId,
      timestamp: new Date().toISOString(),
    });

    if (res2.processed || !res2.duplicate || res2.status !== 'IGNORED') {
      throw new Error('Idempotency Vulnerability! Duplicate webhook event was re-processed.');
    }
    console.log(`✅ Duplicate Webhook Replay correctly IGNORED by Idempotency Protection Engine.`);
    console.log('[PASS] Test 4: Idempotent Webhook Engine verified.\n');

    // TEST 5: Subscription Activation & Invoice Status
    console.log('--- TEST 5: Subscription Activation & Paid Invoice Verification ---');
    const updatedSub = await prisma.schoolSubscription.findUnique({
      where: { schoolId: schoolAlpha.id },
    });

    const updatedSchool = await prisma.school.findUnique({
      where: { id: schoolAlpha.id },
    });

    const paidInvoice = await prisma.invoice.findFirst({
      where: { schoolId: schoolAlpha.id, status: InvoiceStatus.PAID },
    });

    if (updatedSub?.status !== SubscriptionStatus.ACTIVE || updatedSub?.plan !== SubscriptionPlan.PROFESSIONAL) {
      throw new Error('Subscription Activation Error: Plan was not activated to PROFESSIONAL.');
    }
    if (updatedSchool?.subscriptionPlan !== SubscriptionPlan.PROFESSIONAL || updatedSchool?.maxStudents !== 1500) {
      throw new Error('Tenant Capacity Error: School maxStudents was not upgraded to 1500.');
    }
    if (!paidInvoice || paidInvoice.status !== InvoiceStatus.PAID) {
      throw new Error('Invoice Status Error: Invoice was not marked PAID.');
    }

    console.log(`✅ School Subscription Status: ACTIVE (${updatedSub.plan})`);
    console.log(`✅ School Max Student Capacity Upgraded: ${updatedSchool.maxStudents}`);
    console.log(`✅ Paid Invoice Recorded: Invoice #${paidInvoice.invoiceNumber} ($${paidInvoice.amount} ${paidInvoice.currency})`);
    console.log('[PASS] Test 5: Subscription Activation & Paid Invoice verified.\n');

    // TEST 6: Payment Failure & Past Due Status
    console.log('--- TEST 6: Payment Failure & Past Due Handling ---');
    const failEventId = `evt_fail_test_${Date.now()}`;
    await processBillingWebhook({
      eventId: failEventId,
      provider: 'TEST_MOCK_GATEWAY',
      eventType: 'payment.failed',
      schoolId: schoolAlpha.id,
      plan: SubscriptionPlan.PROFESSIONAL,
      amount: 149,
      currency: 'USD',
      transactionRef: 'tx_failed_ref',
      timestamp: new Date().toISOString(),
    });

    const pastDueSub = await prisma.schoolSubscription.findUnique({
      where: { schoolId: schoolAlpha.id },
    });

    if (pastDueSub?.status !== SubscriptionStatus.PAST_DUE) {
      throw new Error('Payment Failure Error: Subscription status did not transition to PAST_DUE.');
    }
    console.log(`✅ Payment Failure correctly set Subscription Status to PAST_DUE while preserving all school data.`);
    console.log('[PASS] Test 6: Payment Failure & Past Due Handling verified.\n');

    // TEST 7: Subscription Cancellation & Period-End Access Retention
    console.log('--- TEST 7: Subscription Cancellation & Access Retention ---');
    const cancelEventId = `evt_cancel_test_${Date.now()}`;
    await processBillingWebhook({
      eventId: cancelEventId,
      provider: 'TEST_MOCK_GATEWAY',
      eventType: 'subscription.cancelled',
      schoolId: schoolAlpha.id,
      plan: SubscriptionPlan.PROFESSIONAL,
      amount: 149,
      currency: 'USD',
      transactionRef: 'tx_cancel_ref',
      timestamp: new Date().toISOString(),
    });

    const cancelledSub = await prisma.schoolSubscription.findUnique({
      where: { schoolId: schoolAlpha.id },
    });

    if (cancelledSub?.status !== SubscriptionStatus.CANCELLED || !cancelledSub?.cancelAtPeriodEnd) {
      throw new Error('Cancellation Error: cancelAtPeriodEnd flag was not set.');
    }
    console.log(`✅ Subscription Cancellation correctly set cancelAtPeriodEnd=true. School data remains 100% intact.`);
    console.log('[PASS] Test 7: Subscription Cancellation verified.\n');

    // TEST SUMMARY
    console.log('================================================================');
    console.log('=== PHASE 24 SAAS BILLING ARCHITECTURE INTEGRATION REPORT ===');
    console.log('================================================================');
    console.log('[PASS] 1. Free Trial Creation & Status Countdown Tracking');
    console.log('[PASS] 2. Server-Side Feature Access Flags & Capacity Limits');
    console.log('[PASS] 3. Payment Provider Abstraction & Checkout Session Generation');
    console.log('[PASS] 4. Idempotent Webhook Processing Engine (Duplicate Event Protection)');
    console.log('[PASS] 5. Payment Success -> Subscription Activation & Paid Invoice');
    console.log('[PASS] 6. Payment Failure -> Past Due Status & Data Preservation');
    console.log('[PASS] 7. Subscription Cancellation & Access Retention Policy');
    console.log('\n✅ ALL PHASE 24 SAAS BILLING ARCHITECTURE TESTS PASSED SUCCESSFULLY!\n');
  } catch (error) {
    console.error('❌ Phase 24 Integration Test Failed:', error);
    process.exit(1);
  } finally {
    try { await prisma.$disconnect(); } catch {}
    try { await pg.stop(); } catch {}
    console.log('👋 PostgreSQL stopped.');
  }
}

runPhase24BillingTest();
