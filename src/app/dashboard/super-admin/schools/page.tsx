'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  GraduationCap,
  Sparkles,
  Search,
  Globe,
  Mail,
  Phone,
  Layers,
  Power,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import {
  getPlatformSchoolsAction,
  onboardSchoolAction,
  updateSchoolStatusAction,
  updateSchoolSubscriptionAction,
  PlatformSchoolItem,
} from '@/actions/school-management.actions';
import { SchoolStatus, SubscriptionPlan } from '@prisma/client';

export default function PlatformSchoolsPage() {
  const [schools, setSchools] = useState<PlatformSchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Onboarding Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    principalName: '',
    principalEmail: '',
    subscriptionPlan: 'BASIC' as SubscriptionPlan,
    adminFullName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const fetchSchools = async () => {
    setLoading(true);
    setError(null);
    const res = await getPlatformSchoolsAction();
    if (res.success && res.schools) {
      setSchools(res.schools);
    } else {
      setError(res.error || 'Failed to load platform schools');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    const res = await onboardSchoolAction(formData);
    if (res.success) {
      setMessage(res.message || 'School onboarded successfully!');
      setShowModal(false);
      setFormData({
        name: '',
        code: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        principalName: '',
        principalEmail: '',
        subscriptionPlan: 'BASIC',
        adminFullName: '',
        adminEmail: '',
        adminPassword: '',
      });
      await fetchSchools();
    } else {
      setError(res.error || 'Failed to onboard school');
    }
    setSubmitting(false);
  };

  const handleStatusToggle = async (schoolId: string, currentStatus: SchoolStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const res = await updateSchoolStatusAction(schoolId, nextStatus);
    if (res.success) {
      setMessage(res.message || 'Status updated');
      await fetchSchools();
    } else {
      setError(res.error || 'Failed to update status');
    }
  };

  const handlePlanChange = async (schoolId: string, plan: SubscriptionPlan) => {
    const res = await updateSchoolSubscriptionAction(schoolId, plan);
    if (res.success) {
      setMessage(res.message || 'Subscription updated');
      await fetchSchools();
    } else {
      setError(res.error || 'Failed to update subscription');
    }
  };

  const filteredSchools = schools.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalStudents = schools.reduce((acc, s) => acc + s.studentCount, 0);
  const activeSchools = schools.filter((s) => s.status === 'ACTIVE').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Platform Multi-School Administration
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              SaaS Engine Active
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Global tenant management, multi-school onboarding, subscription plan tiers, and operational status controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSchools}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Onboard New School
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total School Tenants</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{schools.length}</span>
            <span className="text-xs text-indigo-500 font-semibold">Onboarded</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Tenants</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{activeSchools}</span>
            <span className="text-xs text-emerald-500 font-semibold">Operational</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Enrolled Students</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{totalStudents}</span>
            <span className="text-xs text-purple-500 font-semibold">Across Tenants</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Security Isolation</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-purple-600 dark:text-purple-400">100% Strict</span>
            <span className="text-xs text-slate-400 font-mono">Server-Enforced</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by school name, code, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500 font-medium">Status Filter:</span>
          {['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* School List Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-4">School & Code</th>
                <th className="p-4">Principal / Contact</th>
                <th className="p-4">Status</th>
                <th className="p-4">Subscription Plan</th>
                <th className="p-4">Tenant Capacity</th>
                <th className="p-4 text-right">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSchools.length > 0 ? (
                filteredSchools.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {s.code}
                        </span>
                        <span className="text-slate-400 text-[11px] truncate max-w-[160px]">{s.email}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {s.principalName || 'Not Set'}
                      </div>
                      <div className="text-slate-400 text-[11px]">{s.phone}</div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : s.status === 'TRIAL'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {s.status}
                      </span>
                    </td>

                    <td className="p-4">
                      <select
                        value={s.subscriptionPlan}
                        onChange={(e) => handlePlanChange(s.id, e.target.value as SubscriptionPlan)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-indigo-600 dark:text-indigo-400 text-xs focus:outline-none"
                      >
                        <option value="FREE">FREE (50 Students)</option>
                        <option value="BASIC">BASIC (300 Students)</option>
                        <option value="PROFESSIONAL">PROFESSIONAL (1.5k Students)</option>
                        <option value="ENTERPRISE">ENTERPRISE (10k Students)</option>
                      </select>
                    </td>

                    <td className="p-4 space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>Students: {s.studentCount} / {s.maxStudents}</span>
                        <span>{Math.round((s.studentCount / s.maxStudents) * 100)}%</span>
                      </div>
                      <div className="w-36 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (s.studentCount / s.maxStudents) * 100)}%` }}
                        />
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleStatusToggle(s.id, s.status)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors ${
                          s.status === 'ACTIVE'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {s.status === 'ACTIVE' ? 'Suspend School' : 'Activate School'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No school tenants found. Click "Onboard New School" to add the first multi-tenant school.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard School Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                Onboard New School Tenant
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">School Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Oakridge International Academy"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Unique School Code *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. OAKRIDGE-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">School Email *</label>
                  <input
                    required
                    type="email"
                    placeholder="contact@oakridge.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Phone Number *</label>
                  <input
                    required
                    type="text"
                    placeholder="+1 555-019-2831"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Physical Address *</label>
                  <input
                    required
                    type="text"
                    placeholder="123 Education Boulevard, Campus City"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Subscription Plan *</label>
                  <select
                    value={formData.subscriptionPlan}
                    onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value as SubscriptionPlan })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
                  >
                    <option value="FREE">FREE (50 Students Limit)</option>
                    <option value="BASIC">BASIC (300 Students Limit)</option>
                    <option value="PROFESSIONAL">PROFESSIONAL (1,500 Students Limit)</option>
                    <option value="ENTERPRISE">ENTERPRISE (10,000 Students Limit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Principal Name</label>
                  <input
                    type="text"
                    placeholder="Dr. Eleanor Vance"
                    value={formData.principalName}
                    onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-3">School Admin Initial Account Setup</h3>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Admin Full Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="Admin Administrator"
                    value={formData.adminFullName}
                    onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Admin Email *</label>
                  <input
                    required
                    type="email"
                    placeholder="admin@oakridge.edu"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Onboarding School...' : 'Complete Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
