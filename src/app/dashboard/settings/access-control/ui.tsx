'use client';

import { useEffect, useMemo, useState } from 'react';

type ManagedRole = 'TEACHER' | 'ACCOUNTANT' | 'PARENT' | 'STUDENT';

export default function AccessControlClient({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [schools, setSchools] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [targetSchoolId, setTargetSchoolId] = useState<string>('');
  const [matrix, setMatrix] = useState<any>(null);

  async function loadAll(schoolId?: string) {
    setLoading(true);
    setError(null);
    try {
      if (isSuperAdmin) {
        const s = await fetch('/api/access-control/schools', { cache: 'no-store' }).then((r) => r.json());
        if (s.success) setSchools(s.schools || []);
        else setError(s.error || 'Failed to load schools');
      }

      const qs = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
      const m = await fetch(`/api/access-control/matrix${qs}`, { cache: 'no-store' }).then((r) => r.json());
      if (!m.success) {
        setMatrix(null);
        setError(m.error || 'Failed to load matrix');
        return;
      }
      setMatrix(m);
    } catch (e: any) {
      setMatrix(null);
      setError(e?.message || String(e) || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deniedMap = useMemo(() => matrix?.denied || {}, [matrix]);

  async function onToggle(role: ManagedRole, perm: string, enabled: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/access-control/toggle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          schoolId: isSuperAdmin ? (targetSchoolId || null) : null,
          systemRole: role,
          permissionCode: perm,
          enabled,
        }),
      }).then((r) => r.json());

      if (!res.success) setError(res.error || 'Failed to save');
      await loadAll(isSuperAdmin ? targetSchoolId : '');
    } catch (e: any) {
      setError(e?.message || String(e) || 'Unexpected save error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Access Control</h1>
        <p className="text-slate-400 text-sm">Enable/disable permissions per role (per school).</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {isSuperAdmin && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-2">
          <div className="text-xs text-slate-400">Target School</div>
          <select
            className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
            value={targetSchoolId}
            onChange={(e) => {
              const v = e.target.value;
              setTargetSchoolId(v);
              void loadAll(v);
            }}
          >
            <option value="">(Use your current school)</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && !matrix ? (
        <div className="text-slate-400 text-sm">Loading…</div>
      ) : !matrix ? (
        <div className="text-slate-400 text-sm">No data.</div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-950/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="text-white font-semibold">Permissions Matrix</div>
            <div className="text-xs text-slate-400">{saving ? 'Saving…' : ''}</div>
          </div>

          <div className="p-4 space-y-6">
            {matrix.permissionGroups.map((g: any) => (
              <div key={g.group} className="space-y-2">
                <div className="text-slate-200 font-semibold">{g.group}</div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-slate-400">
                      <tr className="border-b border-slate-800">
                        <th className="text-left px-3 py-2">Permission</th>
                        {matrix.roles.map((r: ManagedRole) => (
                          <th key={r} className="text-left px-3 py-2">{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-slate-200">
                      {g.codes.map((perm: string) => (
                        <tr key={perm} className="border-b border-slate-900/80">
                          <td className="px-3 py-2 font-mono text-slate-300">{perm}</td>
                          {matrix.roles.map((r: ManagedRole) => {
                            const denied = (deniedMap[r] || []).includes(perm);
                            const enabled = !denied;
                            return (
                              <td key={r + perm} className="px-3 py-2">
                                <input type="checkbox" checked={enabled} onChange={(e) => onToggle(r, perm, e.target.checked)} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
