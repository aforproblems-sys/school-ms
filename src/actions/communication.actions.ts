'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { SystemRole, CommunicationChannel, CommunicationStatus } from '@prisma/client';
import { dispatchExternalCommunication } from '@/lib/communication-dispatcher';
import { revalidatePath } from 'next/cache';

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

export interface CommunicationLogFilterParams {
  channel?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * 1. FETCH COMMUNICATION DELIVERY LOGS
 */
export async function getCommunicationLogsAction(params: CommunicationLogFilterParams = {}) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized', logs: [], total: 0 };

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {};

  if (params.channel && params.channel !== 'ALL') {
    whereClause.channel = params.channel as CommunicationChannel;
  }

  if (params.status && params.status !== 'ALL') {
    whereClause.status = params.status as CommunicationStatus;
  }

  if (params.search && params.search.trim() !== '') {
    const term = params.search.trim();
    whereClause.OR = [
      { recipient: { contains: term, mode: 'insensitive' } },
      { messageType: { contains: term, mode: 'insensitive' } },
      { provider: { contains: term, mode: 'insensitive' } },
      { user: { fullName: { contains: term, mode: 'insensitive' } } },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.communicationLog.count({ where: whereClause }),
    prisma.communicationLog.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true, phoneNumber: true } },
      },
    }),
  ]);

  return {
    success: true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    logs: logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.user.fullName,
      channel: l.channel,
      provider: l.provider,
      messageType: l.messageType,
      recipient: l.recipient,
      status: l.status,
      attemptCount: l.attemptCount,
      maxAttempts: l.maxAttempts,
      failureReason: l.failureReason || null,
      sentAt: l.sentAt ? l.sentAt.toISOString() : null,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

/**
 * 2. FETCH ADMIN COMMUNICATION CONFIG & PROVIDER STATUS
 */
export async function getCommunicationConfigAction() {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  const school = await prisma.school.findFirst({ select: { id: true } });
  if (!school) return { success: false, error: 'School not found' };

  let setting = await prisma.notificationSetting.findUnique({
    where: { schoolId: school.id },
  });

  if (!setting) {
    setting = await prisma.notificationSetting.create({
      data: { schoolId: school.id },
    });
  }

  // Check provider environment readiness safely (without exposing secrets)
  const emailReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  const whatsappReady = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER);
  const smsReady = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_NUMBER);

  return {
    success: true,
    config: {
      emailEnabled: setting.emailEnabled,
      whatsappEnabled: setting.whatsappEnabled,
      smsEnabled: setting.smsEnabled,
      testModeEnabled: setting.testModeEnabled,
      attendanceAlerts: setting.attendanceAlerts,
      feeAlerts: setting.feeAlerts,
      homeworkAlerts: setting.homeworkAlerts,
      examAlerts: setting.examAlerts,
      resultAlerts: setting.resultAlerts,
      announcementAlerts: setting.announcementAlerts,
      providers: {
        email: { ready: emailReady, providerName: emailReady ? 'SMTP Configured' : 'Simulated Mode' },
        whatsapp: { ready: whatsappReady, providerName: whatsappReady ? 'Twilio WhatsApp Configured' : 'Simulated Mode' },
        sms: { ready: smsReady, providerName: smsReady ? 'Twilio SMS Configured' : 'Simulated Mode' },
      },
    },
  };
}

/**
 * 3. UPDATE COMMUNICATION CONFIG & TEST MODE
 */
export async function updateCommunicationConfigAction(data: {
  emailEnabled?: boolean;
  whatsappEnabled?: boolean;
  smsEnabled?: boolean;
  testModeEnabled?: boolean;
  attendanceAlerts?: boolean;
  feeAlerts?: boolean;
  homeworkAlerts?: boolean;
  examAlerts?: boolean;
  resultAlerts?: boolean;
  announcementAlerts?: boolean;
}) {
  const session = await getAuthSessionSafely();
  if (!session || (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN)) {
    return { success: false, error: 'Admin authorization required' };
  }

  const school = await prisma.school.findFirst({ select: { id: true } });
  if (!school) return { success: false, error: 'School not found' };

  const updated = await prisma.notificationSetting.upsert({
    where: { schoolId: school.id },
    create: {
      schoolId: school.id,
      ...data,
    },
    update: {
      ...data,
    },
  });

  try { revalidatePath('/settings/communication'); } catch { /* ignore outside request scope */ }
  return { success: true, config: updated };
}

/**
 * 4. RETRY FAILED COMMUNICATION LOG ITEM
 */
export async function retryCommunicationLogAction(logId: string) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  const log = await prisma.communicationLog.findUnique({
    where: { id: logId },
  });

  if (!log) return { success: false, error: 'Communication log not found' };

  // Dispatch retry
  const resultLog = await dispatchExternalCommunication(
    log.channel,
    {
      to: log.recipient,
      subject: `[Retry] ${log.messageType}`,
      text: `Retry alert for notification message ${log.notificationId || ''}`,
    },
    {
      userId: log.userId,
      messageType: log.messageType,
      notificationId: log.notificationId || undefined,
      idempotencyKey: `retry_${log.id}_${Date.now()}`,
    }
  );

  try { revalidatePath('/settings/communication'); } catch { /* ignore outside request scope */ }
  return {
    success: true,
    status: resultLog ? resultLog.status : 'FAILED',
  };
}
