import { removeMyAvatar, updateMyAvatar } from "@/actions/avatar.actions";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/middleware-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProfilePage({ searchParams }: { searchParams?: any }) {
  const sp = (await searchParams) || {};
  const updated = sp.updated === "1";
  const removed = sp.removed === "1";

  const token = (await cookies()).get("sms_session_token")?.value;
  const session = token ? await verifySessionToken(token) : null;
  const userId = (session as any)?.userId || (session as any)?.id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, email: true, avatarUrl: true },
  });

  async function uploadAction(formData: FormData) {
    "use server";
    const res = await updateMyAvatar(formData);
    if (res.ok) redirect("/dashboard/settings/profile?updated=1");
    redirect("/dashboard/settings/profile?updated=0");
  }

  async function removeAction() {
    "use server";
    const res = await removeMyAvatar();
    if (res.ok) redirect("/dashboard/settings/profile?removed=1");
    redirect("/dashboard/settings/profile?removed=0");
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Profile Settings</h1>

      {(updated || removed) ? (
        <div className="mt-3 rounded border px-3 py-2 text-sm">
          {updated ? "DP updated successfully." : null}
          {removed ? "DP removed successfully." : null}
        </div>
      ) : null}

      <div className="mt-6 flex items-center gap-4">
        <img
          src={user?.avatarUrl || "/favicon.ico"}
          alt="Avatar"
          className="h-20 w-20 rounded-full object-cover border"
        />

        <div>
          <div className="text-lg font-medium">{user?.fullName}</div>
          <div className="text-sm text-muted-foreground">{user?.email}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            DP auto square + face-center (Cloudinary)
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form action={uploadAction} encType="multipart/form-data" className="flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded bg-black px-3 py-2 text-white">
            Change DP
            <input name="avatar" type="file" accept="image/*" className="hidden" required />
          </label>

          <button className="rounded border px-3 py-2">
            Upload
          </button>
        </form>

        {user?.avatarUrl ? (
          <form action={removeAction}>
            <button className="rounded border border-red-500 px-3 py-2 text-red-600">
              Remove DP
            </button>
          </form>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Allowed: jpg/png/webp, max 2MB
      </p>
    </div>
  );
}
