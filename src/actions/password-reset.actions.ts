"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hasSmtpEnv, sendMail } from "@/lib/mailer";

function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function requestPasswordReset(emailRaw: string) {
  const email = String(emailRaw || "").trim().toLowerCase();
  if (!email) return { ok: true };

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true },
  });

  // Security: always return ok (don't reveal if account exists)
  if (!user) return { ok: true };

  // one active token per user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const url = `${getAppUrl()}/reset-password?token=${token}`;

  // If SMTP not configured yet, just log link (DEV friendly)
  if (!hasSmtpEnv()) {
    console.log("[ForgotPassword] Reset link:", url);
    return { ok: true };
  }

  await sendMail({
    to: user.email,
    subject: "Reset your password",
    html: `
      <p>You requested a password reset.</p>
      <p><a href="${url}">Click here to reset your password</a></p>
      <p>This link expires in 30 minutes.</p>
      <p>If you did not request this, ignore this email.</p>
    `,
    text: `Reset your password: ${url}`,
  });

  return { ok: true };
}

export async function resetPassword(tokenRaw: string, newPasswordRaw: string) {
  const token = String(tokenRaw || "").trim();
  const newPassword = String(newPasswordRaw || "");

  if (!token) return { ok: false, error: "INVALID_TOKEN" };
  if (newPassword.length < 6) return { ok: false, error: "WEAK_PASSWORD" };

  const tokenHash = sha256(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!record) return { ok: false, error: "INVALID_TOKEN" };
  if (record.expiresAt.getTime() < Date.now())
    return { ok: false, error: "TOKEN_EXPIRED" };

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.delete({ where: { id: record.id } });

  return { ok: true };
}
