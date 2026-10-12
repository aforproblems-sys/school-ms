import { resetPassword } from "@/actions/password-reset.actions";
import { redirect } from "next/navigation";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { token?: string; error?: string };
}) {
  const token = searchParams?.token || "";
  const error = searchParams?.error || "";

  async function action(formData: FormData) {
    "use server";
    const token = String(formData.get("token") || "");
    const password = String(formData.get("password") || "");
    const confirm = String(formData.get("confirm") || "");

    if (!token) redirect("/reset-password?error=invalid");
    if (password !== confirm) redirect(`/reset-password?token=${token}&error=nomatch`);

    const res = await resetPassword(token, password);
    if (!res.ok) redirect(`/reset-password?token=${token}&error=${res.error || "invalid"}`);

    redirect("/login?reset=1");
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-semibold">Reset Password</h1>
        <p className="mt-2 text-sm text-muted-foreground">Invalid reset link.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">Reset Password</h1>

      {error ? (
        <p className="mt-2 text-sm text-red-600">
          {error === "nomatch"
            ? "Passwords do not match."
            : "Reset link is invalid or expired."}
        </p>
      ) : null}

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="token" value={token} />

        <div className="space-y-1">
          <label className="text-sm">New password</label>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Confirm password</label>
          <input
            name="confirm"
            type="password"
            required
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <button className="w-full rounded bg-black px-3 py-2 text-white">
          Update password
        </button>
      </form>
    </div>
  );
}
