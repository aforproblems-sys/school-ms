export type MiddlewareRole =
  | 'SUPER_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'TEACHER'
  | 'ACCOUNTANT'
  | 'PARENT'
  | 'STUDENT';

export interface MiddlewareMaintenanceStatus {
  enabled: boolean;
  message: string;
  enabledAt: string | null;
  allowedRoles: MiddlewareRole[];
}

export function getMaintenanceStatus(): MiddlewareMaintenanceStatus {
  const enabled = process.env.MAINTENANCE_MODE === 'true';

  return {
    enabled,
    message:
      'EduManage Pro is currently undergoing scheduled system maintenance. Please check back shortly.',
    enabledAt: enabled ? null : null,
    allowedRoles: ['SUPER_ADMIN'],
  };
}

export function isRoleAllowedInMaintenance(
  role?: MiddlewareRole | null
): boolean {
  if (!role) return false;
  return role === 'SUPER_ADMIN';
}
