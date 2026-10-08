'use client';

import React, { useState, useEffect } from 'react';
import {
  getUserNotificationPreferencesAction,
  updateUserNotificationPreferencesAction,
  getAdminNotificationSettingsAction,
  updateAdminNotificationSettingsAction,
} from '@/actions/notification.actions';
import {
  Bell,
  Mail,
  Shield,
  CheckCircle,
  SlidersHorizontal,
  Save,
  AlertTriangle,
} from 'lucide-react';

export default function NotificationSettingsPage() {
  const [userPref, setUserPref] = useState({ inAppEnabled: true, emailEnabled: true });
  const [adminSetting, setAdminSetting] = useState({
    attendanceAlerts: true,
    feeAlerts: true,
    homeworkAlerts: true,
    examAlerts: true,
    resultAlerts: true,
    announcementAlerts: true,
  });

  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      getUserNotificationPreferencesAction(),
      getAdminNotificationSettingsAction(),
    ]).then(([prefRes, settingRes]) => {
      if (prefRes.success && prefRes.preferences) {
        setUserPref({
          inAppEnabled: prefRes.preferences.inAppEnabled,
          emailEnabled: prefRes.preferences.emailEnabled,
        });
      }
      if (settingRes.success && settingRes.settings) {
        setAdminSetting({
          attendanceAlerts: settingRes.settings.attendanceAlerts,
          feeAlerts: settingRes.settings.feeAlerts,
          homeworkAlerts: settingRes.settings.homeworkAlerts,
          examAlerts: settingRes.settings.examAlerts,
          resultAlerts: settingRes.settings.resultAlerts,
          announcementAlerts: settingRes.settings.announcementAlerts,
        });
      }
      setLoading(false);
    });
  }, []);

  const handleSaveUserPref = async () => {
    setSavingUser(true);
    setMsg(null);
    const res = await updateUserNotificationPreferencesAction(userPref);
    setSavingUser(false);
    if (res.success) {
      setMsg({ type: 'success', text: 'Personal notification preferences saved.' });
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to save preferences.' });
    }
  };

  const handleSaveAdminSetting = async () => {
    setSavingAdmin(true);
    setMsg(null);
    const res = await updateAdminNotificationSettingsAction(adminSetting);
    setSavingAdmin(false);
    if (res.success) {
      setMsg({ type: 'success', text: 'School-wide notification settings updated.' });
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to update settings.' });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
          <SlidersHorizontal className="w-6 h-6 text-indigo-600" />
          Notification Settings & Preferences
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Configure personal notification delivery channels and school-wide automated alert triggers.
        </p>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-gray-400 animate-pulse">
          Loading notification settings...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Personal User Preferences Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="border-b border-gray-100 dark:border-gray-700 pb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                Personal Delivery Channels
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Control how alerts are delivered to your account.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-indigo-600" />
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      In-App Bell Alerts
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Live pop-up toasts and dropdown notifications.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={userPref.inAppEnabled}
                  onChange={(e) => setUserPref({ ...userPref, inAppEnabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      Email Notifications
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Receive fee receipts and urgent notices via email.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={userPref.emailEnabled}
                  onChange={(e) => setUserPref({ ...userPref, emailEnabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </label>

              <button
                onClick={handleSaveUserPref}
                disabled={savingUser}
                className="w-full py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingUser ? 'Saving...' : 'Save Preferences'}</span>
              </button>
            </div>
          </div>

          {/* 2. School-Wide Admin Settings Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="border-b border-gray-100 dark:border-gray-700 pb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                School Automated Triggers (Admin)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Enable or disable automatic system notification triggers.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { key: 'attendanceAlerts', label: 'Attendance Absent Alerts' },
                { key: 'feeAlerts', label: 'Fee Payment & Receipt Alerts' },
                { key: 'homeworkAlerts', label: 'Homework Assignment Alerts' },
                { key: 'examAlerts', label: 'Exam Creation & Schedule Alerts' },
                { key: 'resultAlerts', label: 'Exam Result Publication Alerts' },
                { key: 'announcementAlerts', label: 'School Announcement Alerts' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750 cursor-pointer"
                >
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {item.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={(adminSetting as any)[item.key]}
                    onChange={(e) =>
                      setAdminSetting({ ...adminSetting, [item.key]: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                </label>
              ))}

              <button
                onClick={handleSaveAdminSetting}
                disabled={savingAdmin}
                className="w-full py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 mt-2"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingAdmin ? 'Saving...' : 'Save Admin Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
