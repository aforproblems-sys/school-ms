'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changeMyPasswordAction } from '@/actions/password.actions';

export default function ChangePasswordClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Change Password</h1>
        <p className="text-slate-400 text-sm">Update your login password.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <form
        className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-4 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);

          if (newPassword !== confirm) {
            setError('New password and confirm password do not match');
            return;
          }

          startTransition(async () => {
            const res: any = await changeMyPasswordAction({ currentPassword, newPassword });
            if (!res.success) {
              setError(res.error || 'Failed');
              return;
            }
            router.push(res.redirectTo || '/login');
          });
        }}
      >
        <div>
          <label className="block text-xs text-slate-400 mb-1">Current Password</label>
          <input
            type="password"
            className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">New Password</label>
          <input
            type="password"
            className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Confirm New Password</label>
          <input
            type="password"
            className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {isPending ? 'Working…' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
