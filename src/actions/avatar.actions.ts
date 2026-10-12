"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary";
import { verifySessionToken } from "@/lib/middleware-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function getUserIdFromSession(session: any): string | null {
  return session?.userId || session?.id || null;
}

function avatarPublicId(userId: string) {
  return `school-ms/avatars/user_${userId}`;
}

export async function updateMyAvatar(formData: FormData) {
  try {
    const token = (await cookies()).get("sms_session_token")?.value;
    const session = token ? await verifySessionToken(token) : null;
    const userId = getUserIdFromSession(session);
    if (!userId) return { ok: false as const, error: "UNAUTHORIZED" as const };

    const file = formData.get("avatar") as File | null;
    if (!file) return { ok: false as const, error: "NO_FILE" as const };

    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type)) return { ok: false as const, error: "INVALID_TYPE" as const };

    // NOTE: Next server-actions default limit sometimes ~1MB
    // If big image fails, upload a smaller image or we will increase limit in next.config.ts
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const publicId = avatarPublicId(userId);

    const uploaded = await cloudinary.uploader.upload(dataUri, {
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      resource_type: "image",
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
    revalidatePath("/dashboard");
    return { ok: true as const, url: uploaded.secure_url };
  } catch (err) {
    console.error("[AvatarUpload] failed:", err);
    return { ok: false as const, error: "UPLOAD_FAILED" as const };
  }
}

export async function removeMyAvatar() {
  try {
    const token = (await cookies()).get("sms_session_token")?.value;
    const session = token ? await verifySessionToken(token) : null;
    const userId = getUserIdFromSession(session);
    if (!userId) return { ok: false as const, error: "UNAUTHORIZED" as const };

    const publicId = avatarPublicId(userId);

    try {
      await cloudinary.uploader.destroy(publicId, { invalidate: true });
    } catch {}

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    revalidatePath("/dashboard/settings/profile");
    revalidatePath("/dashboard");
    return { ok: true as const };
  } catch (err) {
    console.error("[AvatarRemove] failed:", err);
    return { ok: false as const, error: "REMOVE_FAILED" as const };
  }
}

/** wrappers for client <form action={...}> */
export async function updateMyAvatarForm(formData: FormData): Promise<void> {
  const res = await updateMyAvatar(formData);
  if (!res.ok) redirect(`/dashboard/settings/profile?error=${res.error}`);
  redirect(`/dashboard/settings/profile?updated=1`);
}

export async function removeMyAvatarForm(_: FormData): Promise<void> {
  const res = await removeMyAvatar();
  if (!res.ok) redirect(`/dashboard/settings/profile?error=${res.error}`);
  redirect(`/dashboard/settings/profile?removed=1`);
}
