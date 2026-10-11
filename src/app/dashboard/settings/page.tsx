import Link from 'next/link';

const cards = [
  {
    title: 'Notification Settings',
    desc: 'In-app notification preferences & rules.',
    href: '/dashboard/settings/notifications',
  },
  {
    title: 'External Communication',
    desc: 'Email/WhatsApp/SMS configuration & test mode.',
    href: '/dashboard/settings/communication',
  },
  {
    title: 'Subscription & Billing',
    desc: 'Plan, limits, invoices and billing settings.',
    href: '/dashboard/settings/subscription',
  },
  {
    title: 'System Health & Backup Status',
    desc: 'System status, backups, monitoring.',
    href: '/dashboard/settings/system-status',
  },
];

export default function SettingsHomePage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">School Settings</h1>
        <p className="text-slate-400 text-sm">Manage your school configuration.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 hover:bg-slate-900/40 transition"
          >
            <div className="text-white font-semibold">{c.title}</div>
            <div className="text-slate-400 text-sm mt-1">{c.desc}</div>
            <div className="text-indigo-400 text-xs mt-3">Open →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
