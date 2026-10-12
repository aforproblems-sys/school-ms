"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary";
import { verifySessionToken } from "@/lib/middleware-auth";
import { revalidatePath } from "next/cache";

function getUserIdFromSession(session: any): string | null {
  return session?.userId || session?.id || null;
}

function avatarPublicId(userId: string) {
  // fixed id so overwrite + delete easy
  return `school-ms/avatars/user_${userId}`;
}

export async function updateMyAvatar(formData: FormData) {
  const token = (await cookies()).get("sms_session_token")?.value;
  const session = token ? await verifySessionToken(token) : null;
  const userId = getUserIdFromSession(session);
  if (!userId) return { ok: false, error: "UNAUTHORIZED" };

  const file = formData.get("avatar") as File | null;
  if (!file) return { ok: false, error: "NO_FILE" };

  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) return { ok: false, error: "INVALID_TYPE" };

  const max = 2 * 1024 * 1024; // 2MB
  if (file.size > max) return { ok: false, error: "TOO_LARGE" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  const publicId = avatarPublicId(userId);

  const uploaded = await cloudinary.uploader.upload(dataUri, {
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    resource_type: "image",
    // auto square dp + face center
    transformation: [
      { width: 256, height: 256, crop: "thumb", gravity: "face" },
      { quality: "auto", fetch_format: "auto" },
    ],
  });

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: uploaded.secure_url },
  });

  revalidatePath("/dashboard/settings/profile");
  revalidatePath("/dashboard"); // so navbar refresh (if server rendered)
  return { ok: true, url: uploaded.secure_url };
}

export async function removeMyAvatar() {
  const token = (await cookies()).get("sms_session_token")?.value;
  const session = token ? await verifySessionToken(token) : null;
  const userId = getUserIdFromSession(session);
  if (!userId) return { ok: false, error: "UNAUTHORIZED" };

  const publicId = avatarPublicId(userId);

  // delete from cloudinary (ignore errors)
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch {}

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
  });

  revalidatePath("/dashboard/settings/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}
