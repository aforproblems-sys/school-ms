import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardSearchPage({
  searchParams,
}: {
  searchParams?: any;
}) {
  const sp = (await searchParams) || {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  if (!q) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Search</h1>
        <p className="mt-2 text-sm text-muted-foreground">Type something in the top search and press Enter.</p>
      </div>
    );
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      systemRole: true,
    },
    take: 20,
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Search Results</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Query: <span className="font-medium">{q}</span> — {users.length} found
      </p>

      <div className="mt-4 space-y-2">
        {users.length === 0 ? (
          <p className="text-sm">No users found.</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="rounded border border-slate-200 dark:border-slate-800 p-3">
              <div className="font-medium">{u.fullName}</div>
              <div className="text-sm text-muted-foreground">{u.email}</div>
              <div className="text-xs text-muted-foreground">Role: {u.systemRole}</div>

              {/* Agar aapke system me user detail page route ho, yahan link set kar denge */}
              <div className="mt-2 text-xs">
                <Link className="underline" href="/dashboard">
                  Back to dashboard
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
