"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { changePassword } from "@/domain/accounts";
import { claimStampCode } from "@/domain/codes";
import { setMarketingConsent } from "@/domain/consent";
import { deleteAccount, markAllRead, updateProfile } from "@/domain/customers";
import { toggleFavorite, toggleFollow } from "@/domain/discovery";
import { submitReceipt } from "@/domain/receipts/service";
import { endSession, getCurrentUser, requireUser } from "@/lib/auth/session";
import { DomainError, toResult, type ActionResult } from "@/lib/errors";
import { saveLocation, type SavedLocation } from "@/lib/location";

export async function setLocationAction(loc: SavedLocation | null) {
  await saveLocation(loc);
  revalidatePath("/", "layout");
}

export async function toggleFavoriteAction(businessId: string, on: boolean, path: string) {
  const user = await requireUser("customer");
  await toggleFavorite(getDb(), user.id, businessId, on);
  revalidatePath(path);
}

export async function toggleFollowAction(businessId: string, on: boolean, path: string) {
  const user = await requireUser("customer");
  await toggleFollow(getDb(), user.id, businessId, on);
  revalidatePath(path);
}

export async function setConsentAction(businessId: string, granted: boolean, source: string, path: string): Promise<ActionResult> {
  const user = await requireUser("customer");
  const r = await toResult(() => setMarketingConsent(getDb(), user.id, businessId, granted, source));
  revalidatePath(path);
  return r as ActionResult;
}

export type CollectResult = ActionResult<{ status: string; progress?: number; required?: number; reward?: string; message: string }>;

export async function claimCodeAction(_: unknown, form: FormData): Promise<CollectResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Bitte melde dich an, um Stempel zu sammeln." };
  return toResult(async () => {
    const r = await claimStampCode(getDb(), user.id, String(form.get("code") ?? ""));
    revalidatePath("/", "layout");
    return {
      status: "approved",
      progress: r.progress,
      required: r.required,
      reward: r.rewards[0]?.title,
      message: r.rewards.length ? "Karte voll – deine Belohnung ist freigeschaltet!" : `${r.stampsAdded} Stempel gesammelt!`,
    };
  });
}

export async function uploadReceiptAction(_: unknown, form: FormData): Promise<CollectResult> {
  const user = await requireUser("customer");
  return toResult(async () => {
    const file = form.get("receipt");
    if (!file || typeof file === "string" || file.size === 0) throw new DomainError("no_file", "Bitte fotografiere deinen Kassenbon oder wähle ein Foto aus.");
    const out = await submitReceipt(getDb(), user.id, { programId: String(form.get("programId") ?? ""), image: Buffer.from(await file.arrayBuffer()) });
    revalidatePath("/", "layout");
    if (out.status === "approved") {
      return {
        status: "approved",
        progress: out.award.progress,
        required: out.award.required,
        reward: out.award.rewards[0]?.title,
        message: out.award.rewards.length ? "Bon bestätigt – deine Belohnung ist freigeschaltet!" : "Bon bestätigt – Stempel gesammelt!",
      };
    }
    if (out.status === "rejected") return { status: "rejected", message: out.reason };
    return { status: "needs_review", message: "Danke! Dein Bon wird vom Geschäft kurz geprüft. Du wirst benachrichtigt, sobald dein Stempel da ist." };
  });
}

export async function updateProfileAction(_: unknown, form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const r = await toResult(
    () =>
      updateProfile(getDb(), user.id, {
        name: String(form.get("name") ?? ""),
        interests: form.getAll("interests").map(String),
        birthday: String(form.get("birthday") ?? ""),
        birthdayConsent: form.get("birthdayConsent") === "on",
        transactionalPush: form.get("transactionalPush") === "on",
        marketingPaused: form.get("marketingPaused") === "on",
      }),
    "Gespeichert.",
  );
  revalidatePath("/profile");
  return r as ActionResult;
}

export async function changePasswordAction(_: unknown, form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const r = await toResult(() => changePassword(getDb(), user.id, String(form.get("current") ?? ""), String(form.get("next") ?? "")));
  if (r.ok) {
    await endSession();
    redirect("/login?changed=1");
  }
  return r as ActionResult;
}

export async function markAllReadAction() {
  const user = await requireUser();
  await markAllRead(getDb(), user.id);
  revalidatePath("/notifications");
}

export async function deleteAccountAction(_: unknown, form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (form.get("confirm") !== "LÖSCHEN") return { ok: false, error: "Bitte tippe LÖSCHEN zur Bestätigung." };
  const r = await toResult(() => deleteAccount(getDb(), user.id, String(form.get("password") ?? "")));
  if (r.ok) {
    await endSession();
    redirect("/login?deleted=1");
  }
  return r as ActionResult;
}
