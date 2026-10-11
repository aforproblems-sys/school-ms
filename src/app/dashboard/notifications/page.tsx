'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getUserNotificationsAction,
  markNotificationAsReadAction,
  markNotificationAsUnreadAction,
  markAllNotificationsAsReadAction,
} from '@/actions/notification.actions';
import {
  Bell,
  CheckCheck,
  Check,
  RotateCcw,
  ExternalLink,
  Megaphone,
  Receipt,
  CalendarCheck,
  BookMarked,
  FileSpreadsheet,
  Award,
  MessageSquare,
  Filter,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  linkUrl: string;
  type: string;
  createdAt: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  NEW_NOTICE: Megaphone,
  FEE_PAYMENT: Receipt,
  FEE_REMINDER: Receipt,
  ATTENDANCE_ALERT: CalendarCheck,
  NEW_HOMEWORK: BookMarked,
  EXAM_ANNOUNCEMENT: FileSpreadsheet,
  RESULT_PUBLISHED: Award,
  NEW_MESSAGE: MessageSquare,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const loadNotifications = () => {
    setLoading(true);
    getUserNotificationsAction({ limit: 100 }).then((res) => {
      if (res.success) {
        setNotifications(res.notifications);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await markNotificationAsReadAction(id);
  };

  const handleMarkUnread = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
    await markNotificationAsUnreadAction(id);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsAsReadAction();
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'UNREAD' && n.isRead) return false;
    if (activeTab === 'READ' && !n.isRead) return false;
    if (typeFilter !== 'ALL' && n.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-indigo-600 text-white shadow-sm">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time activity alerts, announcements, fee receipts, and messaging updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Tabs & Type Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* State Tabs */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 w-fit">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'ALL'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('UNREAD')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'UNREAD'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setActiveTab('READ')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'READ'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>

        {/* Category Type Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Categories</option>
            <option value="NEW_NOTICE">Announcements</option>
            <option value="FEE_PAYMENT">Fee Payments</option>
            <option value="ATTENDANCE_ALERT">Attendance Alerts</option>
            <option value="RESULT_PUBLISHED">Exam Results</option>
            <option value="NEW_MESSAGE">Messages</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 animate-pulse">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Bell className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              No notifications found
            </p>
            <p className="text-xs text-gray-400">
              You are all caught up! New alerts will appear here in real time.
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const IconComponent = TYPE_ICONS[item.type] || Bell;

            return (
              <div
                key={item.id}
                className={`p-4 transition-colors flex items-start gap-4 ${
                  item.isRead
                    ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
                    : 'bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.isRead
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm font-bold ${item.isRead ? 'text-gray-800 dark:text-gray-200' : 'text-gray-900 dark:text-white'}`}>
                      {item.title}
                    </h3>
                    <span className="text-[10px] font-mono text-gray-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/40">
                    <div className="flex items-center gap-3">
                      {item.isRead ? (
                        <button
                          onClick={() => handleMarkUnread(item.id)}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Mark Unread</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMarkRead(item.id)}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Read</span>
                        </button>
                      )}
                    </div>

                    <Link
                      href={item.linkUrl || '/dashboard'}
                      onClick={() => {
                        if (!item.isRead) handleMarkRead(item.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                    >
                      <span>Open Page</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
