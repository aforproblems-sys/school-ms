import { prisma } from './prisma';
import { WebhookEventPayload } from './payment-provider';
import { SubscriptionStatus, SchoolStatus, InvoiceStatus, AuditAction } from '@prisma/client';
import { getPlanConfig } from './subscription-plans';
import { publishRealtimeEvent } from './realtime';

export interface WebhookProcessingResult {
  processed: boolean;
  duplicate: boolean;
  status: 'PROCESSED' | 'IGNORED' | 'FAILED';
  message: string;
}

/**
 * Processes payment & billing webhooks with 100% idempotency protection.
 * Ensures the same webhook eventId is NEVER processed twice.
 */
export async function processBillingWebhook(
  event: WebhookEventPayload
): Promise<WebhookProcessingResult> {
  // 1. Idempotency Check
  const existingLog = await prisma.billingWebhookLog.findUnique({
    where: { eventId: event.eventId },
  });

  if (existingLog) {
    return {
      processed: false,
      duplicate: true,
      status: 'IGNORED',
      message: `Idempotency Protection: Duplicate webhook event [${event.eventId}] already processed on ${existingLog.createdAt.toISOString()}.`,
    };
  }

  try {
    const planConfig = getPlanConfig(event.plan);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 Days

    // Execute atomic DB transaction
    await prisma.$transaction(async (tx) => {
      // Create Webhook Log
      await tx.billingWebhookLog.create({
        data: {
          eventId: event.eventId,
          provider: event.provider,
          eventType: event.eventType,
          payload: event as any,
          status: 'PROCESSED',
        },
      });

      if (event.eventType === 'payment.success' || event.eventType === 'subscription.activated' || event.eventType === 'subscription.renewed') {
        // Update School Tenant Subscription & Capacity Limits
        await tx.school.update({
          where: { id: event.schoolId },
          data: {
            status: SchoolStatus.ACTIVE,
            subscriptionPlan: event.plan,
            maxStudents: planConfig.maxStudents,
            maxTeachers: planConfig.maxTeachers,
            maxAdmins: planConfig.maxAdmins,
            maxStorageMb: planConfig.maxStorageMb,
          },
        });

        // Upsert SchoolSubscription Record
        await tx.schoolSubscription.upsert({
          where: { schoolId: event.schoolId },
          create: {
            schoolId: event.schoolId,
            plan: event.plan,
            status: SubscriptionStatus.ACTIVE,
            startDate: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextBillingDate: periodEnd,
            providerSubscriptionId: event.transactionRef,
          },
          update: {
            plan: event.plan,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextBillingDate: periodEnd,
            cancelAtPeriodEnd: false,
            cancelledAt: null,
            providerSubscriptionId: event.transactionRef,
          },
        });

        // Create or Update Paid Invoice
        const invoiceNumber = `INV-${event.schoolId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}`;
        await tx.invoice.create({
          data: {
            schoolId: event.schoolId,
            invoiceNumber,
            plan: event.plan,
            amount: event.amount,
            currency: event.currency || 'USD',
            status: InvoiceStatus.PAID,
            paymentRef: event.transactionRef,
            billingPeriodStart: now,
            billingPeriodEnd: periodEnd,
            invoiceDate: now,
            dueDate: now,
            paidAt: now,
          },
        });

        // Create Audit Log Entry
        await tx.auditLog.create({
          data: {
            action: AuditAction.PAYMENT_PROCESSED,
            entity: 'SchoolSubscription',
            entityId: event.schoolId,
            newValue: {
              plan: event.plan,
              amount: event.amount,
              currency: event.currency,
              transactionRef: event.transactionRef,
            },
          },
        });

        publishRealtimeEvent(
          'fees:payment_received',
          'dashboard',
          { schoolId: event.schoolId, plan: event.plan, amount: event.amount },
          event.schoolId
        );
      } else if (event.eventType === 'payment.failed') {
        // Handle Payment Failure
        await tx.schoolSubscription.update({
          where: { schoolId: event.schoolId },
          data: { status: SubscriptionStatus.PAST_DUE },
        });

        await tx.auditLog.create({
          data: {
            action: AuditAction.UPDATE,
            entity: 'SchoolSubscription',
            entityId: event.schoolId,
            newValue: { status: 'PAST_DUE', reason: 'Payment failed' },
          },
        });
      } else if (event.eventType === 'subscription.cancelled') {
        // Handle Subscription Cancellation
        await tx.schoolSubscription.update({
          where: { schoolId: event.schoolId },
          data: {
            status: SubscriptionStatus.CANCELLED,
            cancelAtPeriodEnd: true,
            cancelledAt: now,
          },
        });
      }
    });

    return {
      processed: true,
      duplicate: false,
      status: 'PROCESSED',
      message: `Webhook event [${event.eventId}] processed successfully for School Tenant [${event.schoolId}].`,
    };
  } catch (error: any) {
    return {
      processed: false,
      duplicate: false,
      status: 'FAILED',
      message: `Webhook Processing Error: ${error.message}`,
    };
  }
}
