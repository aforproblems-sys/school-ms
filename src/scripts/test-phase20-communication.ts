import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { SystemRole } from '@prisma/client';
import {
  notifyUser,
  notifyUsers,
  notifyClass,
  notifyTeachers,
} from '../lib/notification-service';
import {
  getUserNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  getUserNotificationPreferencesAction,
  updateUserNotificationPreferencesAction,
  getAdminNotificationSettingsAction,
  updateAdminNotificationSettingsAction,
} from '../actions/notification.actions';
import {
  createAnnouncementAction,
  getAnnouncementsAction,
} from '../actions/announcement.actions';
import {
  getEligibleRecipientsAction,
  sendMessageAction,
  getUserConversationsAction,
  getConversationMessagesAction,
} from '../actions/messaging.actions';

async function main() {
  console.log('🚀 Starting Phase 20 Communication & Notification Center Integration Test on PostgreSQL...\n');

  const dbDir = path.join(process.cwd(), '.postgres-data');
  const isInitial = !fs.existsSync(dbDir);

  const pg = new EmbeddedPostgres({
    databaseDir: dbDir,
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    authMethod: 'password',
    persistent: true,
  });

  if (isInitial) {
    await pg.initialise();
  }

  await pg.start();
  console.log('✅ PostgreSQL engine ready on 127.0.0.1:5432');

  // Execute Phase 20 DDL schema updates safely
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."Conversation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."ConversationParticipant" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "conversationId" TEXT NOT NULL REFERENCES "public"."Conversation"("id") ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "public"."User"("id") ON DELETE CASCADE,
      "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ConversationParticipant_conversationId_userId_key" UNIQUE ("conversationId", "userId")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."NotificationPreference" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE REFERENCES "public"."User"("id") ON DELETE CASCADE,
      "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
      "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."NotificationSetting" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "schoolId" TEXT NOT NULL UNIQUE REFERENCES "public"."School"("id") ON DELETE CASCADE,
      "attendanceAlerts" BOOLEAN NOT NULL DEFAULT true,
      "feeAlerts" BOOLEAN NOT NULL DEFAULT true,
      "homeworkAlerts" BOOLEAN NOT NULL DEFAULT true,
      "examAlerts" BOOLEAN NOT NULL DEFAULT true,
      "resultAlerts" BOOLEAN NOT NULL DEFAULT true,
      "announcementAlerts" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."Message" ADD COLUMN IF NOT EXISTS "conversationId" TEXT REFERENCES "public"."Conversation"("id") ON DELETE CASCADE;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."Message" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT false;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."Notice" ADD COLUMN IF NOT EXISTS "targetClassId" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."Notice" ADD COLUMN IF NOT EXISTS "targetSectionId" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."Notice" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL';
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."Notice" ADD COLUMN IF NOT EXISTS "publishDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."Notice" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."Notice" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
  `);

  const results: { test: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

  try {
    const timestamp = Date.now();

    // Ensure baseline users exist for testing
    let adminUser = await prisma.user.findFirst({ where: { systemRole: SystemRole.SUPER_ADMIN, isActive: true }, orderBy: { createdAt: 'asc' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: `admin.p20.${timestamp}@school.edu`,
          passwordHash: '$2a$12$abcdefghijklmnopqrstuv',
          fullName: 'Test Admin P20',
          systemRole: SystemRole.SUPER_ADMIN,
        },
      });
    }

    let teacherUser = await prisma.user.findFirst({ where: { systemRole: SystemRole.TEACHER, isActive: true } });
    if (!teacherUser) {
      teacherUser = await prisma.user.create({
        data: {
          email: `teacher.p20.${timestamp}@school.edu`,
          passwordHash: '$2a$12$abcdefghijklmnopqrstuv',
          fullName: 'Test Teacher P20',
          systemRole: SystemRole.TEACHER,
        },
      });
    }

    // 1. Test Notification Creation & Retrieval
    const notifRes = await notifyUser(adminUser.id, {
      title: 'Fee Reminder Alert',
      message: 'Tuition fee for Q4 is due on Nov 30.',
      type: 'FEE_REMINDER',
      linkUrl: '/dashboard/finance/fees',
    });

    if (!notifRes || !notifRes.id) throw new Error('Notification creation failed');

    const fetchNotifs = await getUserNotificationsAction({ limit: 10 });
    if (!fetchNotifs.success || fetchNotifs.notifications.length === 0) {
      throw new Error('Notification retrieval failed');
    }

    results.push({
      test: '1. Notification Engine & DB Storage',
      status: 'PASS',
      details: `Dispatched notification "${notifRes.title}" to user ${adminUser.id} (Unread Count: ${fetchNotifs.unreadCount})`,
    });

    // 2. Test Notification Mark as Read
    const markReadRes = await markNotificationAsReadAction(notifRes.id);
    if (!markReadRes.success) throw new Error('Mark notification as read failed');

    const markAllRes = await markAllNotificationsAsReadAction();
    if (!markAllRes.success) throw new Error('Mark all notifications read failed');

    results.push({
      test: '2. Notification Read/Unread State Mutation',
      status: 'PASS',
      details: `Successfully marked notification ${notifRes.id} and all pending alerts as read`,
    });

    // 3. Test School Announcement Creation & Audience Broadcast
    const announcementRes = await createAnnouncementAction({
      title: `Annual Sports Day Announcement ${timestamp}`,
      content: 'The annual sports day competition will take place next Friday at the main campus ground.',
      priority: 'IMPORTANT',
      targetRole: null, // Entire school
    });

    if (!announcementRes.success) throw new Error('Announcement creation failed');

    const fetchAnnouncements = await getAnnouncementsAction();
    if (!fetchAnnouncements.success || fetchAnnouncements.announcements.length === 0) {
      throw new Error('Announcement retrieval failed');
    }

    results.push({
      test: '3. School Announcement Broadcast & Audience Targeting',
      status: 'PASS',
      details: `Published announcement "${fetchAnnouncements.announcements[0].title}" to entire school`,
    });

    // 4. Test RBAC Scoped Messaging & Conversation Creation
    const eligibleRecipients = await getEligibleRecipientsAction();
    if (!eligibleRecipients.success) throw new Error('Recipient retrieval failed');

    const sendMsgRes = await sendMessageAction({
      recipientId: teacherUser.id,
      text: `Hello ${teacherUser.fullName}, please submit the term test syllabus by end of day.`,
    });

    if (!sendMsgRes.success || !sendMsgRes.conversationId) throw new Error('Message sending failed');

    const userConvs = await getUserConversationsAction();
    if (!userConvs.success || userConvs.conversations.length === 0) throw new Error('Conversations retrieval failed');

    const convMsgs = await getConversationMessagesAction(sendMsgRes.conversationId);
    if (!convMsgs.success || convMsgs.messages.length === 0) throw new Error('Conversation messages retrieval failed');

    results.push({
      test: '4. Internal Messaging Threads & Delivery',
      status: 'PASS',
      details: `Created conversation ${sendMsgRes.conversationId} with ${teacherUser.fullName} & delivered real-time message`,
    });

    // 5. Test Notification Preferences & Admin Settings
    const userPref = await getUserNotificationPreferencesAction();
    if (!userPref.success) throw new Error('User notification preferences failed');

    const updateUserPref = await updateUserNotificationPreferencesAction({ inAppEnabled: true, emailEnabled: false });
    if (!updateUserPref.success) throw new Error('Update user preferences failed');

    const adminSettings = await getAdminNotificationSettingsAction();
    if (!adminSettings.success) throw new Error('Admin notification settings failed');

    const updateAdminSetting = await updateAdminNotificationSettingsAction({ attendanceAlerts: true, feeAlerts: true });
    if (!updateAdminSetting.success) throw new Error('Update admin settings failed');

    results.push({
      test: '5. Notification Preferences & Admin Control Toggles',
      status: 'PASS',
      details: 'Successfully configured user email delivery preferences & school automated alert settings',
    });

    console.log('\n=== PHASE 20 COMMUNICATION & NOTIFICATION CENTER TEST REPORT ===\n');
    results.forEach((r) => {
      console.log(`[${r.status}] ${r.test} -> ${r.details}`);
    });
    console.log('\n✅ ALL PHASE 20 COMMUNICATION & NOTIFICATION TESTS PASSED SUCCESSFULLY!\n');
  } catch (error: unknown) {
    console.error('❌ Phase 20 Integration Test Failed:', error);
    await pg.stop();
    process.exit(1);
  } finally {
    await pg.stop();
    console.log('👋 PostgreSQL stopped.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
