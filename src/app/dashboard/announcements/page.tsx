'use client';

import React, { useState, useEffect } from 'react';
import {
  getAnnouncementsAction,
  createAnnouncementAction,
  deleteAnnouncementAction,
  AnnouncementItem,
} from '@/actions/announcement.actions';
import {
  Megaphone,
  Plus,
  Trash2,
  AlertTriangle,
  Pin,
  Calendar,
  User,
  Users,
  Paperclip,
  CheckCircle,
  X,
} from 'lucide-react';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    title: '',
    content: '',
    priority: 'NORMAL',
    targetRole: '',
    attachmentUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAnnouncements = () => {
    setLoading(true);
    getAnnouncementsAction().then((res) => {
      if (res.success && res.announcements) {
        setAnnouncements(res.announcements);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg(null);

    const res = await createAnnouncementAction({
      title: formValues.title,
      content: formValues.content,
      priority: formValues.priority,
      targetRole: formValues.targetRole ? (formValues.targetRole as any) : null,
      attachmentUrl: formValues.attachmentUrl || null,
    });

    setSubmitting(false);

    if (res.success) {
      setStatusMsg({ type: 'success', text: 'Announcement published successfully!' });
      setFormValues({ title: '', content: '', priority: 'NORMAL', targetRole: '', attachmentUrl: '' });
      setIsCreateOpen(false);
      loadAnnouncements();
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to publish announcement.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    const res = await deleteAnnouncementAction(id);
    if (res.success) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-indigo-600" />
            School Announcements & Notices
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Official broadcasts, event notices, academic reminders, and general school updates.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Announcement</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 animate-pulse">
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-12 text-center rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
            <Megaphone className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              No active announcements
            </p>
            <p className="text-xs text-gray-400">
              Published school notices will be displayed here.
            </p>
          </div>
        ) : (
          announcements.map((item) => {
            const isUrgent = item.priority === 'URGENT' || item.priority === 'HIGH';

            return (
              <div
                key={item.id}
                className={`p-6 rounded-2xl border transition-all ${
                  isUrgent
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60 shadow-sm'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {isUrgent && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white flex items-center gap-1 shadow-sm">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{item.priority}</span>
                        </span>
                      )}
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>By {item.authorName}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{new Date(item.publishDate).toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                        <Users className="w-3.5 h-3.5" />
                        <span>{item.targetRole || 'Entire School'}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-gray-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-gray-700 dark:text-gray-300 mt-4 leading-relaxed whitespace-pre-line">
                  {item.content}
                </p>

                {item.attachmentUrl && (
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                    <a
                      href={item.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      View Attachment File
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Publish Announcement Drawer / Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-indigo-600" />
                Publish School Announcement
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formValues.title}
                  onChange={(e) => setFormValues({ ...formValues, title: e.target.value })}
                  placeholder="e.g. Mid-Term Examination Schedule & Guidelines"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={formValues.priority}
                    onChange={(e) => setFormValues({ ...formValues, priority: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="IMPORTANT">Important</option>
                    <option value="URGENT">Urgent / Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Target Audience
                  </label>
                  <select
                    value={formValues.targetRole}
                    onChange={(e) => setFormValues({ ...formValues, targetRole: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Entire School (All Roles)</option>
                    <option value="TEACHER">Teachers Only</option>
                    <option value="STUDENT">Students Only</option>
                    <option value="PARENT">Parents Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Message Content *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formValues.content}
                  onChange={(e) => setFormValues({ ...formValues, content: e.target.value })}
                  placeholder="Enter full notice announcement details..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Attachment Link (Optional)
                </label>
                <input
                  type="url"
                  value={formValues.attachmentUrl}
                  onChange={(e) => setFormValues({ ...formValues, attachmentUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
