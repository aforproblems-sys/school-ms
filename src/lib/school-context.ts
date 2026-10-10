import { UserSession } from '@/types/auth';
import { prisma } from './prisma';
import { SystemRole, SchoolStatus, SubscriptionPlan } from '@prisma/client';
import { getPlanConfig } from './subscription-plans';

export interface SchoolContextResult {
  schoolId: string;
  isSuperAdmin: boolean;
  role: SystemRole;
}

/**
 * Validates that the current user has authorization to access data for the specified school context.
 * Strict multi-tenant safeguard: Non-Super-Admins can NEVER access another school's data.
 */
export async function validateSchoolAccess(
  session: UserSession,
  targetSchoolId?: string | null
): Promise<SchoolContextResult> {
  const isSuperAdmin = session.role === SystemRole.SUPER_ADMIN;

if (isSuperAdmin) {
  let resolvedSchoolId = targetSchoolId || session.schoolId;

  if (!resolvedSchoolId) {
    const firstSchool = await prisma.school.findFirst({ select: { id: true } });
    if (!firstSchool) {
      throw new Error('No schools found. Please create/onboard a school first.');
    }
    resolvedSchoolId = firstSchool.id;
  }

  const exists = await prisma.school.findUnique({
    where: { id: resolvedSchoolId },
    select: { id: true },
  });

  if (!exists) {
    throw new Error(`School tenant [${resolvedSchoolId}] not found.`);
  }

  return {
    schoolId: resolvedSchoolId,
    isSuperAdmin: true,
    role: session.role,
  };
}
  const userSchoolId = session.schoolId;
  if (!userSchoolId) {
    throw new Error('Unauthorized. User is not assigned to any school tenant.');
  }

  if (targetSchoolId && targetSchoolId !== userSchoolId) {
    throw new Error('Cross-Tenant Access Denied. You do not have permission to view or modify records from another school.');
  }

  // Verify school status (Active/Trial vs Suspended/Cancelled)
  await assertSchoolActive(userSchoolId);

  return {
    schoolId: userSchoolId,
    isSuperAdmin: false,
    role: session.role,
  };
}

/**
 * Enforces school operational status rules.
 */
export async function assertSchoolActive(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, status: true, trialEndsAt: true },
  });

  if (!school) {
    throw new Error(`School tenant [${schoolId}] not found.`);
  }

  if (school.status === SchoolStatus.SUSPENDED) {
    throw new Error(`Access Restricted: School [${school.name}] account is currently SUSPENDED. Normal school operations are disabled.`);
  }

  if (school.status === SchoolStatus.CANCELLED) {
    throw new Error(`Access Restricted: School [${school.name}] account subscription has been CANCELLED.`);
  }

  if (school.status === SchoolStatus.TRIAL && school.trialEndsAt && new Date() > school.trialEndsAt) {
    throw new Error(`Trial Expired: School [${school.name}] trial period has ended. Please upgrade subscription.`);
  }

  return school;
}

/**
 * Validates whether a school has capacity to add more resources based on subscription plan limits.
 */
export async function checkSubscriptionLimit(
  schoolId: string,
  resource: 'STUDENTS' | 'TEACHERS' | 'ADMINS' | 'STORAGE_MB'
): Promise<{ allowed: boolean; currentCount: number; maxLimit: number; error?: string }> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      subscriptionPlan: true,
      maxStudents: true,
      maxTeachers: true,
      maxAdmins: true,
      maxStorageMb: true,
    },
  });

  if (!school) {
    return { allowed: false, currentCount: 0, maxLimit: 0, error: 'School not found' };
  }

  const planConfig = getPlanConfig(school.subscriptionPlan);
  let currentCount = 0;
  let maxLimit = 0;

  if (resource === 'STUDENTS') {
    maxLimit = school.maxStudents || planConfig.maxStudents;
    currentCount = await prisma.student.count({
      where: { user: { schoolId } },
    });
  } else if (resource === 'TEACHERS') {
    maxLimit = school.maxTeachers || planConfig.maxTeachers;
    currentCount = await prisma.teacher.count({
      where: { user: { schoolId } },
    });
  } else if (resource === 'ADMINS') {
    maxLimit = school.maxAdmins || planConfig.maxAdmins;
    currentCount = await prisma.user.count({
      where: {
        schoolId,
        systemRole: { in: [SystemRole.SCHOOL_ADMIN, SystemRole.SUPER_ADMIN] },
      },
    });
  }

  if (currentCount >= maxLimit) {
    return {
      allowed: false,
      currentCount,
      maxLimit,
      error: `Subscription Plan Limit Reached: School has reached the maximum allowed ${resource.toLowerCase()} limit (${currentCount}/${maxLimit}) on the ${planConfig.name}. Upgrade subscription plan to add more.`,
    };
  }

  return { allowed: true, currentCount, maxLimit };
}
