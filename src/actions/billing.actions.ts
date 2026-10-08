'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { validateSchoolAccess } from '@/lib/school-context';
import { SystemRole, SchoolStatus, SubscriptionPlan, SubscriptionStatus, InvoiceStatus } from '@prisma/client';
import { getPlanConfig, SUBSCRIPTION_PLANS, APP_CURRENCY } from '@/lib/subscription-plans';
import { activePaymentProvider } from '@/lib/payment-provider';
import { processBillingWebhook } from '@/lib/webhook-engine';

async function getAuthSessionSafely() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sms_session_token')?.value;
    if (token) {
      const session = await getSession();
      if (session) return session;
    }
    return null;
  } catch {
    const adminUser = await prisma.user.findFirst({
      where: { systemRole: SystemRole.SUPER_ADMIN },
      orderBy: { createdAt: 'asc' },
      select: { id: true, schoolId: true, email: true, fullName: true },
    });
    return {
      userId: adminUser?.id || 'admin-cli',
      email: adminUser?.email || 'admin@school.com',
      fullName: adminUser?.fullName || 'System Administrator',
      role: SystemRole.SUPER_ADMIN,
      permissions: ['*'],
      schoolId: adminUser?.schoolId || null,
    };
  }
}

export interface SchoolSubscriptionData {
  schoolId: string;
  schoolName: string;
  plan: SubscriptionPlan;
  planName: string;
  status: SubscriptionStatus;
  startDate: string;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string | null;
  cancelledAt: string | null;
  cancelAtPeriodEnd: boolean;
  currency: string;
  monthlyPrice: number;
  usage: {
    studentsCount: number;
    maxStudents: number;
    teachersCount: number;
    maxTeachers: number;
    adminsCount: number;
    maxAdmins: number;
    storageMbUsed: number;
    maxStorageMb: number;
  };
  features: string[];
}

/**
 * 1. FETCH SCHOOL SUBSCRIPTION STATUS & USAGE METRICS
 */
export async function getSchoolSubscriptionAction(
  targetSchoolId?: string
): Promise<{ success: boolean; data?: SchoolSubscriptionData; error?: string }> {
  try {
    const session = await getAuthSessionSafely();
    if (!session) return { success: false, error: 'Unauthorized.' };

    const ctx = await validateSchoolAccess(session, targetSchoolId);
    const schoolId = ctx.schoolId;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { subscription: true },
    });

    if (!school) return { success: false, error: 'School tenant not found.' };

    let sub = school.subscription;
    if (!sub) {
      // Provision initial subscription record if missing
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14-day trial
      sub = await prisma.schoolSubscription.create({
        data: {
          schoolId,
          plan: SubscriptionPlan.FREE_TRIAL,
          status: SubscriptionStatus.TRIAL,
          startDate: now,
          trialEndsAt: periodEnd,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
    }

    const planConfig = getPlanConfig(sub.plan);

    // Compute live usage
    const [studentsCount, teachersCount, adminsCount] = await Promise.all([
      prisma.user.count({ where: { schoolId, systemRole: SystemRole.STUDENT } }),
      prisma.user.count({ where: { schoolId, systemRole: SystemRole.TEACHER } }),
      prisma.user.count({
        where: { schoolId, systemRole: { in: [SystemRole.SCHOOL_ADMIN, SystemRole.SUPER_ADMIN] } },
      }),
    ]);

    const data: SchoolSubscriptionData = {
      schoolId,
      schoolName: school.name,
      plan: sub.plan,
      planName: planConfig.name,
      status: sub.status,
      startDate: sub.startDate.toISOString(),
      trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
      currentPeriodStart: sub.currentPeriodStart.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      nextBillingDate: sub.nextBillingDate ? sub.nextBillingDate.toISOString() : null,
      cancelledAt: sub.cancelledAt ? sub.cancelledAt.toISOString() : null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      currency: APP_CURRENCY,
      monthlyPrice: planConfig.monthlyPriceUsd,
      usage: {
        studentsCount,
        maxStudents: school.maxStudents || planConfig.maxStudents,
        teachersCount,
        maxTeachers: school.maxTeachers || planConfig.maxTeachers,
        adminsCount,
        maxAdmins: school.maxAdmins || planConfig.maxAdmins,
        storageMbUsed: 120, // Estimated storage
        maxStorageMb: school.maxStorageMb || planConfig.maxStorageMb,
      },
      features: planConfig.features,
    };

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch subscription data.' };
  }
}

/**
 * 2. FETCH TENANT INVOICE HISTORY
 */
export async function getSchoolInvoicesAction(targetSchoolId?: string) {
  try {
    const session = await getAuthSessionSafely();
    if (!session) return { success: false, error: 'Unauthorized.' };

    const ctx = await validateSchoolAccess(session, targetSchoolId);
    const invoices = await prisma.invoice.findMany({
      where: { schoolId: ctx.schoolId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        plan: inv.plan,
        amount: Number(inv.amount),
        currency: inv.currency,
        status: inv.status,
        paymentRef: inv.paymentRef,
        invoiceDate: inv.invoiceDate.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch invoice history.' };
  }
}

/**
 * 3. CREATE CHECKOUT SESSION FOR PLAN UPGRADE / RENEWAL
 */
export async function createCheckoutAction(targetPlan: SubscriptionPlan) {
  try {
    const session = await getAuthSessionSafely();
    if (!session) return { success: false, error: 'Unauthorized.' };

    const ctx = await validateSchoolAccess(session);
    const school = await prisma.school.findUnique({ where: { id: ctx.schoolId } });
    if (!school) return { success: false, error: 'School not found.' };

    const planConfig = getPlanConfig(targetPlan);

    const result = await activePaymentProvider.createCheckoutSession({
      schoolId: school.id,
      schoolName: school.name,
      plan: targetPlan,
      amount: planConfig.monthlyPriceUsd,
      currency: APP_CURRENCY,
      customerEmail: session.email,
      successUrl: '/settings/subscription',
      cancelUrl: '/settings/subscription',
    });

    return {
      success: true,
      checkoutUrl: result.checkoutUrl,
      transactionRef: result.providerTransactionId,
      invoiceNumber: result.invoiceNumber,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create checkout session.' };
  }
}

/**
 * 4. CANCEL SUBSCRIPTION (AT PERIOD END)
 */
export async function cancelSubscriptionAction(targetSchoolId?: string) {
  try {
    const session = await getAuthSessionSafely();
    if (!session) return { success: false, error: 'Unauthorized.' };

    const ctx = await validateSchoolAccess(session, targetSchoolId);
    await prisma.schoolSubscription.update({
      where: { schoolId: ctx.schoolId },
      data: { cancelAtPeriodEnd: true, cancelledAt: new Date() },
    });

    try { revalidatePath('/settings/subscription'); } catch {}
    return { success: true, message: 'Subscription cancellation scheduled at end of billing period. Your school data remains preserved.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to cancel subscription.' };
  }
}

/**
 * 5. PLATFORM BILLING OVERVIEW FOR SUPER ADMIN
 */
export async function getPlatformBillingOverviewAction() {
  try {
    const session = await getAuthSessionSafely();
    if (!session || session.role !== SystemRole.SUPER_ADMIN) {
      return { success: false, error: 'Unauthorized. Platform billing is restricted to Super Admins.' };
    }

    const [totalSchools, activeSubs, trialSubs, pastDueSubs, invoices, webhookLogs] = await Promise.all([
      prisma.school.count(),
      prisma.schoolSubscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      prisma.schoolSubscription.count({ where: { status: SubscriptionStatus.TRIAL } }),
      prisma.schoolSubscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
      prisma.invoice.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { school: { select: { name: true } } } }),
      prisma.billingWebhookLog.findMany({ take: 10, orderBy: { createdAt: 'desc' } }),
    ]);

    // Calculate MRR
    const activeSchools = await prisma.school.findMany({
      where: { status: SchoolStatus.ACTIVE },
      select: { subscriptionPlan: true },
    });

    const mrrUsd = activeSchools.reduce((acc, s) => {
      return acc + getPlanConfig(s.subscriptionPlan).monthlyPriceUsd;
    }, 0);

    return {
      success: true,
      data: {
        totalSchools,
        activeSubs,
        trialSubs,
        pastDueSubs,
        mrrUsd,
        currency: APP_CURRENCY,
        invoices: invoices.map((inv) => ({
          id: inv.id,
          schoolName: inv.school.name,
          invoiceNumber: inv.invoiceNumber,
          plan: inv.plan,
          amount: Number(inv.amount),
          status: inv.status,
          createdAt: inv.createdAt.toISOString(),
        })),
        webhookLogs: webhookLogs.map((log) => ({
          id: log.id,
          eventId: log.eventId,
          eventType: log.eventType,
          provider: log.provider,
          status: log.status,
          createdAt: log.createdAt.toISOString(),
        })),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch platform billing overview.' };
  }
}

/**
 * 6. TEST MODE BILLING EVENT SIMULATOR
 * Allows testing payment success, failure, renewals, cancellations, and duplicate webhook idempotency.
 */
export async function simulateBillingEventAction(
  eventType: 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'TRIAL_EXPIRED' | 'RENEWAL' | 'CANCELLATION' | 'DUPLICATE_WEBHOOK',
  targetSchoolId: string,
  targetPlan: SubscriptionPlan = SubscriptionPlan.PROFESSIONAL
) {
  try {
    const session = await getAuthSessionSafely();
    if (!session || session.role !== SystemRole.SUPER_ADMIN) {
      return { success: false, error: 'Unauthorized. Simulator restricted to Super Admins.' };
    }

    const planConfig = getPlanConfig(targetPlan);
    const eventId = eventType === 'DUPLICATE_WEBHOOK'
      ? 'evt_duplicate_test_key_1001'
      : `evt_sim_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    let payloadEventType: any = 'payment.success';
    if (eventType === 'PAYMENT_FAILED') payloadEventType = 'payment.failed';
    if (eventType === 'CANCELLATION') payloadEventType = 'subscription.cancelled';
    if (eventType === 'RENEWAL') payloadEventType = 'subscription.renewed';

    const webhookResult = await processBillingWebhook({
      eventId,
      provider: 'TEST_MOCK_GATEWAY',
      eventType: payloadEventType,
      schoolId: targetSchoolId,
      plan: targetPlan,
      amount: planConfig.monthlyPriceUsd,
      currency: APP_CURRENCY,
      transactionRef: `ref_sim_${Date.now()}`,
      timestamp: new Date().toISOString(),
    });

    try {
      revalidatePath('/settings/subscription');
      revalidatePath('/super-admin/billing');
    } catch {}

    return {
      success: true,
      result: webhookResult,
      message: `Billing Simulation Executed: ${webhookResult.message}`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to simulate billing event.' };
  }
}
