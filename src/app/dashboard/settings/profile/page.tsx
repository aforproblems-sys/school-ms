import { updateMyAvatar } from "@/actions/avatar.actions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/middleware-auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: any;
}) {
  const sp = (await searchParams) || {};
  const updated = sp.updated === "1";

  const token = (await cookies()).get("sms_session_token")?.value;
  const session = token ? await verifySessionToken(token) : null;

  // UserSession me `user` object nahi hai, so userId direct use karo
  const userId = (session as any)?.userId || (session as any)?.id;

  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, email: true, avatarUrl: true },
  });

  async function action(formData: FormData) {
    "use server";
    const res = await updateMyAvatar(formData);
    if (res.ok) redirect("/dashboard/settings/profile?updated=1");
    redirect("/dashboard/settings/profile?updated=0");
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-semibold">Profile</h1>

      <div className="mt-4 flex items-center gap-4">
        <img
          src={user?.avatarUrl || "/favicon.ico"}
          alt="Avatar"
          className="h-16 w-16 rounded-full object-cover border"
        />
        <div>
          <div className="font-medium">{user?.fullName}</div>
          <div className="text-sm text-muted-foreground">{user?.email}</div>
        </div>
      </div>

      {updated ? (
        <p className="mt-3 text-sm text-green-600">DP updated successfully.</p>
      ) : null}

      <form action={action} className="mt-4 space-y-3">
        <div className="space-y-1">
          <label className="text-sm">Upload DP (jpg/png/webp, max 2MB)</label>
          <input name="avatar" type="file" accept="image/*" required />
        </div>

        <button className="rounded bg-black px-3 py-2 text-white">
          Save DP
        </button>
      </form>
    </div>
  );
}
