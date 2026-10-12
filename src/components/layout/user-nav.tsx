'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { UserSession } from '@/types/auth';
import { ROLE_NAMES } from '@/lib/rbac';
import { getInitials } from '@/lib/utils';
import { logoutAction } from '@/actions/auth.actions';
import { removeMyAvatarForm, updateMyAvatarForm } from '@/actions/avatar.actions';
import { LogOut, Shield, User, Camera, Trash2 } from 'lucide-react';

interface UserNavProps {
  user: UserSession;
  avatarUrl?: string | null;
}

export function UserNav({ user, avatarUrl }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
            {getInitials(user.fullName)}
          </div>
        )}

        <div className="text-left hidden sm:block">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user.fullName}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            {ROLE_NAMES[user.role]}
          </p>
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in-80 slide-in-from-top-2">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{user.fullName}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>

            <div className="py-1">
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                <span>Role: {user.role}</span>
              </div>

              <Link
                href="/dashboard/settings/profile"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                Profile Settings
              </Link>

              {/* Change DP (auto upload on select) */}
              <form encType="multipart/form-data" action={updateMyAvatarForm} className="px-3 py-2">
                <label className="w-full inline-flex items-center gap-2 justify-center cursor-pointer rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Camera className="w-3.5 h-3.5" />
                  Change DP
                  <input
                    name="avatar"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    required
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  />
                </label>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  Auto square + face-center, max 2MB
                </p>
              </form>

              {/* Remove DP */}
              {avatarUrl ? (
                <form action={removeMyAvatarForm} className="px-3 pb-2">
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 justify-center rounded-lg border border-rose-300 dark:border-rose-900 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove DP
                  </button>
                </form>
              ) : null}
            </div>

            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
