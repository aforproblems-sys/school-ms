import { UserSession } from '@/types/auth';
import { prisma } from './prisma';
import { SystemRole, SubscriptionStatus, SchoolStatus } from '@prisma/client';
import { FeatureFlag, getPlanConfig } from './subscription-plans';
import { assertSchoolActive } from './school-context';

/**
 * Checks if the user's school subscription allows access to a specific feature flag.
 * Evaluates tenant subscription status and plan configuration server-side.
 */
export async function canUseFeature(
  session: UserSession,
  feature: FeatureFlag
): Promise<boolean> {
  // Super Admin has unrestricted platform access
  if (session.role === SystemRole.SUPER_ADMIN) {
    return true;
  }

  const schoolId = session.schoolId;
  if (!schoolId) return false;

  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { subscription: true },
    });

    if (!school) return false;

    // Check school operational status
    if (school.status === SchoolStatus.SUSPENDED || school.status === SchoolStatus.CANCELLED) {
      return false;
    }

    // Check subscription status
    if (school.subscription) {
      const subStatus = school.subscription.status;
      if (subStatus === SubscriptionStatus.EXPIRED || subStatus === SubscriptionStatus.CANCELLED) {
        return false;
      }
    }

    const planConfig = getPlanConfig(school.subscriptionPlan);
    return planConfig.features.includes(feature);
  } catch {
    return false;
  }
}

/**
 * Enforces feature access authorization server-side. Throws an error if forbidden.
 */
export async function assertFeatureAccess(
  session: UserSession,
  feature: FeatureFlag
): Promise<void> {
  const allowed = await canUseFeature(session, feature);
  if (!allowed) {
    throw new Error(
      `Feature Access Restricted: The feature [${feature}] is not included in your school's current subscription plan or subscription is inactive. Please upgrade plan to unlock.`
    );
  }
}
