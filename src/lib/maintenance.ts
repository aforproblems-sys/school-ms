import { SystemRole } from '@prisma/client';

export interface MaintenanceStatus {
  enabled: boolean;
  message: string;
  enabledAt: string | null;
  allowedRoles: SystemRole[];
}

let inMemoryMaintenanceState: MaintenanceStatus = {
  enabled: process.env.MAINTENANCE_MODE === 'true',
  message: 'EduManage Pro is currently undergoing scheduled system maintenance. Please check back shortly.',
  enabledAt: process.env.MAINTENANCE_MODE === 'true' ? new Date().toISOString() : null,
  allowedRoles: [SystemRole.SUPER_ADMIN],
};

/**
  * Returns the current maintenance mode state.
  */
export function getMaintenanceStatus(): MaintenanceStatus {
  return { ...inMemoryMaintenanceState };
}

/**
  * Enables or disables system maintenance mode.
  */
export function setMaintenanceMode(
  enabled: boolean,
  message?: string,
  allowedRoles: SystemRole[] = [SystemRole.SUPER_ADMIN]
): MaintenanceStatus {
  inMemoryMaintenanceState = {
    enabled,
    message: message || 'EduManage Pro is currently undergoing scheduled system maintenance. Please check back shortly.',
    enabledAt: enabled ? new Date().toISOString() : null,
    allowedRoles,
  };
  return { ...inMemoryMaintenanceState };
}

/**
  * Checks if a user's role allows them to bypass maintenance mode.
  */
export function isRoleAllowedInMaintenance(role?: SystemRole | null): boolean {
  if (!role) return false;
  return inMemoryMaintenanceState.allowedRoles.includes(role);
}
