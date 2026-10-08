import { SystemRole } from '@prisma/client';

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
  role: SystemRole;
  schoolId?: string | null;
  avatarUrl?: string | null;
  permissions?: string[];
}
