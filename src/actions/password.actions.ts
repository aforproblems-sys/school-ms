'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, verifyPassword, hashPassword, clearSessionCookie } from '@/lib/auth';
import { AuditAction } from '@prisma/client';

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export async function changeMyPasswordAction(input: unknown) {
  const session = await getSession();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) return { success: false as const, error: 'User not found' };

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return { success: false as const, error: 'Current password is incorrect' };

  const newHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.UPDATE,
        entity: 'UserPassword',
        entityId: user.id,
      },
    });
  });

  // force re-login after password change
  await clearSessionCookie();

  return { success: true as const, redirectTo: '/login' };
}
