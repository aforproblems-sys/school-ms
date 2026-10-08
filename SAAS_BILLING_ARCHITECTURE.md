# 💳 School Management System - SaaS Subscription & Billing Architecture

## Overview
This document describes the Provider-Independent SaaS Subscription and Billing Architecture for EduManage Pro. The architecture provides centralized plan management, server-side feature access authorization, resource capacity limit enforcement, invoice record management, payment provider abstraction with a Test Mode simulator, and **100% idempotent webhook processing**.

---

## 1. Centralized Subscription Plans & Feature Flags

Plan tiers and feature flags are defined centrally in [subscription-plans.ts](file:///Users/macbookpro/School%20MS/src/lib/subscription-plans.ts):

### Plan Matrix & Limits
| Plan | Monthly Price | Max Students | Max Teachers | Max Admins | Storage Quota | Monthly Comm. Limit |
|---|---|---|---|---|---|---|
| **FREE_TRIAL** | $0 (14 Days) | 100 | 10 | 3 | 1,000 MB | 100 Messages |
| **FREE** | $0 | 50 | 5 | 2 | 500 MB | 20 Messages |
| **BASIC** | $49 | 300 | 30 | 5 | 5,000 MB | 500 Messages |
| **PROFESSIONAL** | $149 | 1,500 | 100 | 15 | 25,000 MB | 3,000 Messages |
| **ENTERPRISE** | $399 | 10,000 | 500 | 50 | 100,000 MB | 20,000 Messages |

### Server-Side Feature Access Authorization
Modules check feature access server-side using [feature-access.ts](file:///Users/macbookpro/School%20MS/src/lib/feature-access.ts):
```ts
const canExport = await canUseFeature(session, 'bulk_import');
await assertFeatureAccess(session, 'advanced_reports');
```

Supported Feature Flags:
- `advanced_reports`
- `bulk_import`
- `whatsapp_notifications`
- `sms_notifications`
- `advanced_analytics`
- `api_access`
- `custom_branding`

---

## 2. Database Models & Billing Schema

The schema includes three core billing entities in PostgreSQL:

### 1. `SchoolSubscription`
- Tracks tenant subscription status: `TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELLED`, `EXPIRED`.
- Stores `startDate`, `trialEndsAt`, `currentPeriodStart`, `currentPeriodEnd`, `nextBillingDate`, `cancelledAt`, `cancelAtPeriodEnd`, and provider customer references.

### 2. `Invoice`
- Stores invoice records: `invoiceNumber` (e.g. `INV-SCHA-179150`), `plan`, `amount`, `currency` (Default: `USD`), `status` (`DRAFT`, `PENDING`, `PAID`, `FAILED`, `CANCELLED`, `REFUNDED`), `paymentRef`, `billingPeriodStart`, `billingPeriodEnd`, `dueDate`, `paidAt`.

### 3. `BillingWebhookLog`
- Logs incoming billing webhooks with unique `eventId` idempotency keys, `provider`, `eventType`, raw JSON `payload`, and `status` (`PROCESSED`, `IGNORED`, `FAILED`).

---

## 3. Provider-Independent Payment Abstraction

The payment layer is completely decoupled from specific payment providers via [payment-provider.ts](file:///Users/macbookpro/School%20MS/src/lib/payment-provider.ts):

### Payment Provider Interface
```ts
export interface PaymentProvider {
  providerName: string;
  createCheckoutSession(params: PaymentCheckoutParams): Promise<PaymentCheckoutResult>;
  verifyPayment(transactionRef: string): Promise<{ success: boolean; status: string }>;
  cancelSubscription(subscriptionId: string): Promise<{ success: boolean }>;
}
```

### Test Billing Provider (`TestBillingProvider`)
In development and test environments, `TestBillingProvider` simulates checkout sessions, invoice generation, and payment callbacks without invoking real payment gateways or charging real money.

---

## 4. Idempotent Webhook Engine

Webhooks are processed through [webhook-engine.ts](file:///Users/macbookpro/School%20MS/src/lib/webhook-engine.ts) with **guaranteed idempotency**:
1. Before executing any business logic, `eventId` is queried in `BillingWebhookLog`.
2. If `eventId` already exists, the event is immediately ignored with status `IGNORED` and `duplicate: true`.
3. If new `eventId`, an atomic database transaction:
   - Updates `SchoolSubscription` status to `ACTIVE` and extends period by 30 days.
   - Updates `School` model capacity limits based on the new plan tier.
   - Updates `Invoice` status to `PAID` with `paidAt` timestamp and payment reference.
   - Creates an `AuditLog` entry.
   - Broadcasts realtime event `fees:payment_received`.

---

## 5. Trial Lifecycle & Cancellation Safeguard

- **New School Trial**: Automatically receives a 14-day `FREE_TRIAL` subscription upon onboarding.
- **Trial Expiration**: Once trial period expires, operational features require plan activation. **Database records are NEVER deleted**.
- **Subscription Cancellation**: Calling cancellation marks `cancelAtPeriodEnd = true`. School retains full access until `currentPeriodEnd`, after which status transitions to `CANCELLED`. All data remains preserved intact according to retention policy.

---

## 6. Future Payment Gateway Integration Guide

To connect a production payment gateway (e.g. Stripe, JazzCash, Easypaisa):
1. Implement the `PaymentProvider` interface in `src/lib/payment-providers/stripe-provider.ts`.
2. Map gateway webhook event payloads to `WebhookEventPayload` in `/api/webhooks/billing/route.ts`.
3. Pass webhook payload to `processBillingWebhook(event)` in [webhook-engine.ts](file:///Users/macbookpro/School%20MS/src/lib/webhook-engine.ts).
4. No changes to core business logic or application code required!

---

## 7. Automated Testing Runbook

To run the full automated billing integration test suite against PostgreSQL:
```bash
npx tsx src/scripts/test-phase24-billing-architecture.ts
```
