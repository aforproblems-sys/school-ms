import { SubscriptionPlan } from '@prisma/client';

export type FeatureFlag =
  | 'advanced_reports'
  | 'bulk_import'
  | 'whatsapp_notifications'
  | 'sms_notifications'
  | 'advanced_analytics'
  | 'api_access'
  | 'custom_branding';

export interface SubscriptionPlanConfig {
  plan: SubscriptionPlan;
  name: string;
  description: string;
  maxStudents: number;
  maxTeachers: number;
  maxAdmins: number;
  maxStorageMb: number;
  monthlyCommunicationLimit: number;
  allowWhatsApp: boolean;
  allowSms: boolean;
  allowBulkExport: boolean;
  monthlyPriceUsd: number;
  features: FeatureFlag[];
}

export const APP_CURRENCY = process.env.NEXT_PUBLIC_BILLING_CURRENCY || 'USD';

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanConfig> = {
  FREE_TRIAL: {
    plan: 'FREE_TRIAL',
    name: '14-Day Free Trial',
    description: 'Full feature trial evaluation for new school onboarding',
    maxStudents: 100,
    maxTeachers: 10,
    maxAdmins: 3,
    maxStorageMb: 1000,
    monthlyCommunicationLimit: 100,
    allowWhatsApp: true,
    allowSms: false,
    allowBulkExport: true,
    monthlyPriceUsd: 0,
    features: ['bulk_import', 'advanced_reports', 'whatsapp_notifications'],
  },
  FREE: {
    plan: 'FREE',
    name: 'Free Starter Plan',
    description: 'Basic tier for micro-schools and non-profits',
    maxStudents: 50,
    maxTeachers: 5,
    maxAdmins: 2,
    maxStorageMb: 500,
    monthlyCommunicationLimit: 20,
    allowWhatsApp: false,
    allowSms: false,
    allowBulkExport: false,
    monthlyPriceUsd: 0,
    features: [],
  },
  BASIC: {
    plan: 'BASIC',
    name: 'Basic Plan',
    description: 'Standard tier for small to mid-sized schools',
    maxStudents: 300,
    maxTeachers: 30,
    maxAdmins: 5,
    maxStorageMb: 5000,
    monthlyCommunicationLimit: 500,
    allowWhatsApp: true,
    allowSms: false,
    allowBulkExport: true,
    monthlyPriceUsd: 49,
    features: ['bulk_import', 'whatsapp_notifications', 'advanced_reports'],
  },
  PROFESSIONAL: {
    plan: 'PROFESSIONAL',
    name: 'Professional Plan',
    description: 'Advanced tier for growing institutions with full communications',
    maxStudents: 1500,
    maxTeachers: 100,
    maxAdmins: 15,
    maxStorageMb: 25000,
    monthlyCommunicationLimit: 3000,
    allowWhatsApp: true,
    allowSms: true,
    allowBulkExport: true,
    monthlyPriceUsd: 149,
    features: [
      'bulk_import',
      'whatsapp_notifications',
      'sms_notifications',
      'advanced_reports',
      'advanced_analytics',
      'custom_branding',
    ],
  },
  ENTERPRISE: {
    plan: 'ENTERPRISE',
    name: 'Enterprise Plan',
    description: 'High-scale tier with dedicated limits and custom parameters',
    maxStudents: 10000,
    maxTeachers: 500,
    maxAdmins: 50,
    maxStorageMb: 100000,
    monthlyCommunicationLimit: 20000,
    allowWhatsApp: true,
    allowSms: true,
    allowBulkExport: true,
    monthlyPriceUsd: 399,
    features: [
      'bulk_import',
      'whatsapp_notifications',
      'sms_notifications',
      'advanced_reports',
      'advanced_analytics',
      'api_access',
      'custom_branding',
    ],
  },
};

export function getPlanConfig(plan: SubscriptionPlan): SubscriptionPlanConfig {
  return SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS.BASIC;
}
