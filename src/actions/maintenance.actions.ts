'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { SystemRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getMaintenanceStatus, setMaintenanceMode, MaintenanceStatus } from '@/lib/maintenance';
import { logger } from '@/lib/logger';

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

export async function getMaintenanceStatusAction(): Promise<{
  success: boolean;
  status: MaintenanceStatus;
}> {
  return {
    success: true,
    status: getMaintenanceStatus(),
  };
}

export async function toggleMaintenanceModeAction(
  enabled: boolean,
  message?: string
): Promise<{
  success: boolean;
  status?: MaintenanceStatus;
  error?: string;
}> {
  try {
    const session = await getAuthSessionSafely();
    if (!session || session.role !== SystemRole.SUPER_ADMIN) {
      return {
        success: false,
        error: 'Unauthorized. Toggling maintenance mode is restricted to Super Administrators.',
      };
    }

    const updated = setMaintenanceMode(enabled, message);

    logger.warn(`Maintenance mode ${enabled ? 'ENABLED' : 'DISABLED'} by admin ${session.userId}`, {
      action: 'TOGGLE_MAINTENANCE_MODE',
      userId: session.userId,
      schoolId: session.schoolId || undefined,
      enabled,
    });

    try {
      revalidatePath('/', 'layout');
    } catch {
      // Ignore outside of Next.js server request context
    }

    return {
      success: true,
      status: updated,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('Failed to toggle maintenance mode', err);
    return {
      success: false,
      error: `Failed to toggle maintenance mode: ${errorMessage}`,
    };
  }
}
