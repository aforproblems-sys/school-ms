'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { SystemRole } from '@prisma/client';
import { createStaffAction, listStaffAction, deactivateStaffAction, StaffRow } from '@/actions/staff.actions';

export default function StaffClient({ allowedRoles }: { allowedRoles: SystemRole[] }) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [systemRole, setSystemRole] = useState<SystemRole>(allowedRoles[0] ?? SystemRole.TEACHER);

  const [employeeId, setEmployeeId] = useState('');
  const [qualification, setQualification] = useState('');
  const [joiningDate, setJoiningDate] = useState('');

  async function load() {
    setError(null);
    const res = await listStaffAction();
    if (!res.success) {
      setError(res.error || 'Failed to load staff');
      setStaff([]);
      return;
    }
    setStaff(res.staff);
  }

  useEffect(() => {
    startTransition(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isTeacher = systemRole === SystemRole.TEACHER;

  const rows = useMemo(() => staff, [staff]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await createStaffAction({
        fullName,
        email,
        phoneNumber: phoneNumber || null,
        password,
        systemRole,
        employeeId: isTeacher ? employeeId : null,
        qualification: isTeacher ? qualification : null,
        joiningDate: isTeacher ? joiningDate : null,
      });

      if (!res.success) {
        const anyRes = res as any;
        const fe = anyRes.fieldErrors || null;
        if (fe) {
          const parts: string[] = [];
          for (const [k, v] of Object.entries(fe)) {
            if (Array.isArray(v) && v.length) parts.push(`${k}: ${v.join(', ')}`);
          }
          setError(parts.length ? parts.join(' | ') : (res.error || 'Validation failed'));
        } else {
          setError(res.error || 'Failed to create staff');
        }
        return;
      }

      setFullName('');
      setEmail('');
      setPhoneNumber('');
      setPassword('');
      setEmployeeId('');
      setQualification('');
      setJoiningDate('');
      await load();
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Staff & Teachers</h1>
        <p className="text-slate-400 text-sm">Create and manage school staff accounts.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <form onSubmit={onCreate} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Full Name</label>
            <input className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
              value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Phone</label>
            <input className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
              value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Initial Password</label>
            <input type="password" className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Role</label>
            <select className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
              value={systemRole} onChange={(e) => setSystemRole(e.target.value as SystemRole)}>
              {allowedRoles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {isTeacher && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Employee ID</label>
                <input className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
                  value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Qualification</label>
                <input className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
                  value={qualification} onChange={(e) => setQualification(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Joining Date</label>
                <input type="date" className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
                  value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {isPending ? 'Working…' : 'Add Staff'}
        </button>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-950/30">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Staff List</h2>
          <button onClick={() => startTransition(() => void load())} className="text-xs text-slate-300 hover:text-white" disabled={isPending}>
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-slate-400">No staff found.</td></tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} className="border-b border-slate-900/80">
                    <td className="px-4 py-3">{u.fullName}</td>
                    <td className="px-4 py-3 text-slate-300">{u.email}</td>
                    <td className="px-4 py-3 font-mono">{u.systemRole}</td>
                    <td className="px-4 py-3">{u.isActive ? 'ACTIVE' : 'INACTIVE'}</td>
                    <td className="px-4 py-3 text-slate-300">{new Date(u.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <button
                          className="text-xs text-rose-300 hover:text-rose-200"
                          onClick={() => {
                            if (!confirm('Deactivate this staff member?')) return;
                            startTransition(async () => {
                              const res = await deactivateStaffAction(u.id);
                              if (!res.success) setError(res.error || 'Failed');
                              await load();
                            });
                          }}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
