'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSessionCookie, clearSessionCookie, getSession } from '@/lib/auth';
import { getDefaultDashboard } from '@/lib/rbac';
import { redirect } from 'next/navigation';

import { AuditAction } from '@prisma/client';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function loginAction(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const validation = loginSchema.safeParse({ email, password });
  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      return {
        success: false,
        error: 'Invalid credentials or inactive account',
      };
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return {
        success: false,
        error: 'Invalid credentials or inactive account',
      };
    }

    await createSessionCookie({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.systemRole,
      avatarUrl: user.avatarUrl,
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.LOGIN,
        entity: 'User',
        entityId: user.id,
      },
    });

    return {
      success: true,
      redirectTo: getDefaultDashboard(user.systemRole),
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'An unexpected authentication error occurred',
    };
  }
}

export async function logoutAction() {
  const session = await getSession();
  if (session) {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: AuditAction.LOGOUT,
        entity: 'User',
        entityId: session.userId,
      },
    }).catch(() => {});
  }
  await clearSessionCookie();
  redirect('/login');
}
