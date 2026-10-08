import { SubscriptionPlan } from '@prisma/client';
import { getPlanConfig } from './subscription-plans';

export interface PaymentCheckoutParams {
  schoolId: string;
  schoolName: string;
  plan: SubscriptionPlan;
  amount: number;
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentCheckoutResult {
  checkoutUrl: string;
  providerTransactionId: string;
  invoiceNumber: string;
}

export interface WebhookEventPayload {
  eventId: string;
  provider: string;
  eventType: 'payment.success' | 'payment.failed' | 'subscription.activated' | 'subscription.renewed' | 'subscription.cancelled';
  schoolId: string;
  plan: SubscriptionPlan;
  amount: number;
  currency: string;
  transactionRef: string;
  timestamp: string;
}

export interface PaymentProvider {
  providerName: string;
  createCheckoutSession(params: PaymentCheckoutParams): Promise<PaymentCheckoutResult>;
  verifyPayment(transactionRef: string): Promise<{ success: boolean; status: string }>;
  cancelSubscription(subscriptionId: string): Promise<{ success: boolean }>;
}

/**
 * Provider-independent Test / Development Billing Simulator.
 * Allows developers and platform admins to test complete checkout, invoice generation,
 * webhook processing, renewals, and cancellations without touching real money.
 */
export class TestBillingProvider implements PaymentProvider {
  providerName = 'TEST_MOCK_GATEWAY';

  async createCheckoutSession(params: PaymentCheckoutParams): Promise<PaymentCheckoutResult> {
    const timestamp = Date.now();
    const providerTransactionId = `tx_test_${timestamp}_${Math.floor(1000 + Math.random() * 9000)}`;
    const invoiceNumber = `INV-${params.schoolId.slice(-4).toUpperCase()}-${timestamp.toString().slice(-6)}`;

    // In test mode, return direct checkout callback simulation URL
    const checkoutUrl = `${params.successUrl}?tx_ref=${providerTransactionId}&invoice=${invoiceNumber}&plan=${params.plan}`;

    return {
      checkoutUrl,
      providerTransactionId,
      invoiceNumber,
    };
  }

  async verifyPayment(transactionRef: string): Promise<{ success: boolean; status: string }> {
    return {
      success: true,
      status: 'PAID',
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean }> {
    return { success: true };
  }
}

export const activePaymentProvider: PaymentProvider = new TestBillingProvider();
