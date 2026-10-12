import { requestPasswordReset } from "@/actions/password-reset.actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: { sent?: string };
}) {
  const sent = searchParams?.sent === "1";

  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "");
    await requestPasswordReset(email);
    redirect("/forgot-password?sent=1");
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">Forgot Password</h1>

      {sent ? (
        <p className="mt-3 text-sm text-muted-foreground">
          If an account exists, we sent a reset link to your email.
        </p>
      ) : (
        <form action={action} className="mt-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <button className="w-full rounded bg-black px-3 py-2 text-white">
            Send reset link
          </button>
        </form>
      )}

      <div className="mt-4 text-sm">
        <Link className="underline" href="/login">
          Back to login
        </Link>
      </div>
    </div>
  );
}
