import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/middleware-auth";
import { isAuthorizedRoute } from "@/lib/middleware-rbac";

type RouteItem = {
  label: string;
  href: string;
  keywords: string[];
};

const ROUTES: RouteItem[] = [
  { label: "Dashboard", href: "/dashboard", keywords: ["home", "main"] },
  { label: "Change Password", href: "/dashboard/settings/change-password", keywords: ["password", "change password", "reset password"] },
  { label: "Notification Settings", href: "/dashboard/settings/notifications", keywords: ["notifications", "alerts"] },
  { label: "Communication Settings", href: "/dashboard/settings/communication", keywords: ["sms", "email", "whatsapp", "communication"] },
  { label: "Access Control", href: "/dashboard/settings/access-control", keywords: ["rbac", "roles", "permissions", "access"] },
  { label: "System Status", href: "/dashboard/settings/system-status", keywords: ["system", "health", "status"] },
  { label: "Announcements", href: "/dashboard/announcements", keywords: ["notice", "notices", "announcement"] },
  { label: "Messages", href: "/dashboard/messages", keywords: ["chat", "inbox"] },
  { label: "Students", href: "/dashboard/users/students", keywords: ["student", "admission"] },
  { label: "Staff", href: "/dashboard/users/staff", keywords: ["teacher", "staff"] },
  { label: "Exams", href: "/dashboard/examinations/exams", keywords: ["exam", "paper"] },
  { label: "Timetable", href: "/dashboard/timetable", keywords: ["schedule", "time table"] },
];

function includesQuery(item: RouteItem, q: string) {
  const hay = `${item.label} ${item.keywords.join(" ")}`.toLowerCase();
  return hay.includes(q);
}

export default async function DashboardSearchPage({
  searchParams,
}: {
  searchParams?: any;
}) {
  const sp = (await searchParams) || {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const qLower = q.toLowerCase();

  // get role for RBAC filter
  const token = (await cookies()).get("sms_session_token")?.value;
  const session = token ? await verifySessionToken(token) : null;
  const role = session?.role;

  if (!q) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Search</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Type in top search and press Enter. You can search pages (e.g. "change password") or users (name/email).
        </p>
      </div>
    );
  }

  const pageResults = ROUTES
    .filter((r) => includesQuery(r, qLower))
    .filter((r) => {
      // Only show allowed dashboard routes for this role (if we have role)
      if (!role) return true;
      if (!r.href.startsWith("/dashboard")) return true;
      return isAuthorizedRoute(r.href, role);
    })
    .slice(0, 12);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, email: true, systemRole: true },
    take: 20,
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Search Results</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Query: <span className="font-medium">{q}</span>
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold mb-2">Pages / Modules</h2>
          <div className="space-y-2">
            {pageResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pages found.</p>
            ) : (
              pageResults.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="block rounded border border-slate-200 dark:border-slate-800 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <div className="font-medium">{r.label}</div>
                  <div className="text-xs text-muted-foreground">{r.href}</div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2">Users</h2>
          <div className="space-y-2">
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users found.</p>
            ) : (
              users.map((u) => (
                <div key={u.id} className="rounded border border-slate-200 dark:border-slate-800 p-3">
                  <div className="font-medium">{u.fullName}</div>
                  <div className="text-sm text-muted-foreground">{u.email}</div>
                  <div className="text-xs text-muted-foreground">Role: {u.systemRole}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
