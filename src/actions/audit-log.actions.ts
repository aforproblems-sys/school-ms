'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { AuditAction, SystemRole } from '@prisma/client';
import { validateSchoolAccess } from '@/lib/school-context';

export interface AuditLogItem {
  id: string;
  createdAt: string;
  action: string;
  entity: string;
  entityId: string | null;
  ipAddress: string | null;
  userName: string | null;
  userEmail: string | null;
}

async function getAuthSessionSafely() {
  try {
    return await getSession();
  } catch (e) {
    console.error('getSession error:', e);
    return null;
  }
}

export async function getAuditLogActionsAction() {
  return { success: true as const, actions: Object.values(AuditAction) };
}

export async function getAuditLogsAction(input?: {
  q?: string | null;
  action?: string | null;
  entity?: string | null;
  from?: string | null; // YYYY-MM-DD
  to?: string | null; // YYYY-MM-DD
  take?: number | null;
  targetSchoolId?: string | null;
}) {
  try {
    const session = await getAuthSessionSafely();
    if (!session) return { success: false as const, error: 'Unauthorized', logs: [] as AuditLogItem[] };

    const ctx = await validateSchoolAccess(session, input?.targetSchoolId);
    const take = Math.min(Math.max(Number(input?.take ?? 200), 1), 500);

    const clauses: any[] = [];

    // Tenant safety
    if (ctx.role !== SystemRole.SUPER_ADMIN) {
      clauses.push({ user: { schoolId: ctx.schoolId } });
    }

    const action = (input?.action || '').trim();
    const entity = (input?.entity || '').trim();
    const q = (input?.q || '').trim();

    if (action) clauses.push({ action: action as any });
    if (entity) clauses.push({ entity: { contains: entity, mode: 'insensitive' } });

    const from = input?.from ? new Date(input.from) : null;
    const to = input?.to ? new Date(input.to) : null;

    if ((from && !Number.isNaN(from.valueOf())) || (to && !Number.isNaN(to.valueOf()))) {
      const range: any = {};
      if (from && !Number.isNaN(from.valueOf())) range.gte = from;
      if (to && !Number.isNaN(to.valueOf())) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        range.lte = end;
      }
      clauses.push({ createdAt: range });
    }

    if (q) {
      clauses.push({
        OR: [
          { entity: { contains: q, mode: 'insensitive' } },
          { entityId: { contains: q, mode: 'insensitive' } },
          { ipAddress: { contains: q, mode: 'insensitive' } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
          { user: { fullName: { contains: q, mode: 'insensitive' } } },
        ],
      });
    }

    const where = clauses.length ? { AND: clauses } : {};

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { fullName: true, email: true } } },
    });

    return {
      success: true as const,
      logs: logs.map((l) => ({
        id: l.id,
        createdAt: l.createdAt.toISOString(),
        action: String(l.action),
        entity: l.entity,
        entityId: l.entityId ?? null,
        ipAddress: l.ipAddress ?? null,
        userName: l.user?.fullName ?? null,
        userEmail: l.user?.email ?? null,
      })),
    };
  } catch (e) {
    console.error('getAuditLogsAction error:', e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return {
      success: false as const,
      error: process.env.VERCEL_ENV === 'preview' ? msg : 'Failed to load audit logs',
      logs: [] as AuditLogItem[],
    };
  }
}
