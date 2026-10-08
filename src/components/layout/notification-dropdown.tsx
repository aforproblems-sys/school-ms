'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  getUserNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  NotificationType,
} from '@/actions/notification.actions';
import { useRealtime } from '@/hooks/use-realtime';
import {
  Bell,
  CheckCheck,
  Check,
  CalendarCheck,
  Receipt,
  BookMarked,
  FileSpreadsheet,
  Megaphone,
  MessageSquare,
  Award,
  Sparkles,
  X,
  ExternalLink,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  linkUrl: string;
  type: NotificationType;
  createdAt: Date | string;
}

interface NotificationDropdownProps {
  userId: string;
}

const TYPE_ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  NEW_NOTICE: Megaphone,
  FEE_PAYMENT: Receipt,
  FEE_REMINDER: Receipt,
  ATTENDANCE_ALERT: CalendarCheck,
  NEW_HOMEWORK: BookMarked,
  EXAM_ANNOUNCEMENT: FileSpreadsheet,
  RESULT_PUBLISHED: Award,
  MESSAGE_RECEIVED: MessageSquare,
};

export function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toastAlert, setToastAlert] = useState<{ title: string; message: string } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch initial notifications list
  const fetchNotifications = () => {
    getUserNotificationsAction({ limit: 15 }).then((res) => {
      if (res.success) {
        setUnreadCount(res.unreadCount);
        setNotifications(res.notifications as any);
      }
    });
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Real-time Event Subscription for Live Notification Updates (No Page Refresh!)
  useRealtime({
    channels: [`user:${userId}`, 'global'],
    onEvent: (eventPayload) => {
      if (
        eventPayload.type === 'notification:new' ||
        eventPayload.type === 'notice:created' ||
        eventPayload.type === 'message:sent'
      ) {
        const newNotif: NotificationItem = {
          id: eventPayload.data.notificationId || `realtime_${Date.now()}`,
          title: eventPayload.data.title || 'New Notification',
          message: eventPayload.data.message || eventPayload.data.text || 'You have a new alert.',
          isRead: false,
          linkUrl: eventPayload.data.linkUrl || '/dashboard',
          type: (eventPayload.data.type as NotificationType) || 'NEW_NOTICE',
          createdAt: new Date().toISOString(),
        };

        setNotifications((prev) => [newNotif, ...prev.slice(0, 14)]);
        setUnreadCount((count) => count + 1);

        // Display brief live toast alert
        setToastAlert({ title: newNotif.title, message: newNotif.message });
        setTimeout(() => setToastAlert(null), 4000);
      }
    },
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    await markNotificationAsReadAction(id);
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await markAllNotificationsAsReadAction();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white shadow-md shadow-rose-600/30">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Live Pop-up Toast Alert */}
      {toastAlert && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-2xl bg-indigo-950/90 border border-indigo-700 text-white shadow-2xl flex items-start gap-3 max-w-sm animate-in slide-in-from-top-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1 text-xs space-y-0.5">
            <p className="font-bold text-white">{toastAlert.title}</p>
            <p className="text-slate-300 line-clamp-2">{toastAlert.message}</p>
          </div>
          <button onClick={() => setToastAlert(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in-50">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No notifications right now.
              </div>
            ) : (
              notifications.map((item) => {
                const IconComponent = TYPE_ICONS[item.type] || Bell;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 transition-colors flex items-start gap-3 group ${
                      item.isRead ? 'bg-slate-900/40 hover:bg-slate-800/40' : 'bg-indigo-950/30 hover:bg-indigo-950/50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        item.isRead
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-bold truncate ${item.isRead ? 'text-slate-300' : 'text-white'}`}>
                          {item.title}
                        </p>
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 font-medium">
                        {item.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-2">
                          {!item.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(item.id)}
                              className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-0.5"
                            >
                              <Check className="w-3 h-3" />
                              <span>Read</span>
                            </button>
                          )}
                          <Link
                            href={item.linkUrl}
                            onClick={() => {
                              if (!item.isRead) handleMarkAsRead(item.id);
                              setIsOpen(false);
                            }}
                            className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
