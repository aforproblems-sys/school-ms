import { EventEmitter } from 'events';

export type RealtimeEventType =
  | 'attendance:updated'
  | 'fees:payment_received'
  | 'student:created'
  | 'student:updated'
  | 'student:deleted'
  | 'exam:marks_updated'
  | 'exam:results_published'
  | 'notice:created'
  | 'notification:new'
  | 'message:sent'
  | 'communication:status_updated'
  | 'dashboard:stats_updated'
  | 'school:status_updated';

export interface RealtimeEventPayload {
  eventId: string;
  type: RealtimeEventType;
  channel: string; // e.g. "global", "dashboard", "section:123", "user:456"
  schoolId?: string | null;
  timestamp: string;
  data: Record<string, any>;
}

// Global EventEmitter singleton across Node server modules
const globalForRealtime = globalThis as unknown as {
  realtimeEmitter: EventEmitter | undefined;
};

export const realtimeEmitter =
  globalForRealtime.realtimeEmitter ?? new EventEmitter();

// Allow unlimited listeners for SSE streaming connections
realtimeEmitter.setMaxListeners(0);

if (process.env.NODE_ENV !== 'production') {
  globalForRealtime.realtimeEmitter = realtimeEmitter;
}

/**
  Publish event to server EventEmitter with school tenant isolation
 */
export function publishRealtimeEvent(
  type: RealtimeEventType,
  channel: string,
  data: Record<string, any>,
  schoolId?: string | null
) {
  const eventId = `evt_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const eventPayload: RealtimeEventPayload = {
    eventId,
    type,
    channel,
    schoolId: schoolId || null,
    timestamp: new Date().toISOString(),
    data,
  };

  realtimeEmitter.emit('realtime_event', eventPayload);
  return eventPayload;
}

/**
 * Validates whether a subscriber from subscriberSchoolId is authorized to receive event.
 * Multi-Tenant Safeguard: A School A subscriber MUST NEVER receive School B events.
 */
export function isEventAuthorizedForSchool(
  event: RealtimeEventPayload,
  subscriberSchoolId?: string | null,
  isSuperAdmin: boolean = false
): boolean {
  if (isSuperAdmin) return true;
  if (!event.schoolId) return true; // System-wide global event
  if (!subscriberSchoolId) return false;
  return event.schoolId === subscriberSchoolId;
}

// Domain-Specific Helper Broadcast Triggers

export function broadcastAttendanceUpdate(sectionId: string, date: string, payload: any, schoolId?: string) {
  publishRealtimeEvent('attendance:updated', `section:${sectionId}`, { sectionId, date, ...payload }, schoolId);
  publishRealtimeEvent('attendance:updated', 'dashboard', { sectionId, date }, schoolId);
}

export function broadcastFeePayment(userId: string, receiptNo: string, amount: number, payload: any = {}, schoolId?: string) {
  publishRealtimeEvent('fees:payment_received', `user:${userId}`, { receiptNo, amount, ...payload }, schoolId);
  publishRealtimeEvent('fees:payment_received', 'dashboard', { receiptNo, amount }, schoolId);
}

export function broadcastStudentChange(action: 'create' | 'update' | 'delete', studentId: string, payload: any = {}, schoolId?: string) {
  const typeMap = {
    create: 'student:created' as const,
    update: 'student:updated' as const,
    delete: 'student:deleted' as const,
  };
  publishRealtimeEvent(typeMap[action], 'dashboard', { studentId, ...payload }, schoolId);
}

export function broadcastExamMarksUpdate(examSubjectId: string, payload: any = {}, schoolId?: string) {
  publishRealtimeEvent('exam:marks_updated', `exam:${examSubjectId}`, { examSubjectId, ...payload }, schoolId);
}

export function broadcastExamPublishStatus(examId: string, isPublished: boolean, examName: string, schoolId?: string) {
  publishRealtimeEvent('exam:results_published', 'global', { examId, isPublished, examName }, schoolId);
}

export function broadcastUserNotification(userId: string, notification: { title: string; message: string; linkUrl?: string }, schoolId?: string) {
  publishRealtimeEvent('notification:new', `user:${userId}`, notification, schoolId);
}

export function broadcastNoticeCreated(targetRole: string | null, notice: { id: string; title: string; authorName: string }, schoolId?: string) {
  const channel = targetRole ? `role:${targetRole}` : 'global';
  publishRealtimeEvent('notice:created', channel, notice, schoolId);
}

export function broadcastMessageSent(receiverUserId: string, message: { id: string; senderName: string; text: string }, schoolId?: string) {
  publishRealtimeEvent('message:sent', `user:${receiverUserId}`, message, schoolId);
}
