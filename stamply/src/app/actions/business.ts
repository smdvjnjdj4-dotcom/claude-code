"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getDb } from "@/db";
import type { Plan } from "@/db/schema";
import { requireMember } from "@/domain/access";
import {
  acceptInvite,
  addGalleryImage,
  changeMemberRole,
  changePlanTestMode,
  createBusiness,
  inviteMember,
  removeGalleryImage,
  removeMember,
  revokeInvite,
  setBusinessImage,
  setPublished,
  updateBusinessProfile,
  upsertLocation,
  deleteLocation,
} from "@/domain/businesses";
import { createStampCode } from "@/domain/codes";
import { deleteBusiness } from "@/domain/customers";
import { redeemReward } from "@/domain/loyalty";
import { createProgram, createOffer, deleteOffer, setOfferActive, setProgramImage, setProgramStatus, updateProgram, type ProgramInput } from "@/domain/programs";
import { createCampaign, setCampaignStatus, updateCampaign, type CampaignInput } from "@/domain/push/campaigns";
import { reviewReceipt } from "@/domain/receipts/service";
import { BUSINESS_COOKIE, requireBusiness, requireUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { DomainError, toResult, type ActionResult } from "@/lib/errors";
import { fileFromForm, saveImage } from "@/lib/storage";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => (s(f, k) === "" ? null : Number(s(f, k).replace(",", ".")));

function hoursFromForm(f: FormData) {
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const out: Record<string, { open: string; close: string }[]> = {};
  let any = false;
  for (const d of days) {
    const open = s(f, `${d}_open`);
    const close = s(f, `${d}_close`);
    out[d] = f.get(`${d}_closed`) === "on" || !open || !close ? [] : [{ open, close }];
    if (out[d].length) any = true;
  }
  return any ? out : null;
}

function locationFromForm(f: FormData) {
  return {
    name: s(f, "locName") || "Hauptfiliale",
    street: s(f, "street"),
    postalCode: s(f, "postalCode"),
    city: s(f, "city"),
    lat: num(f, "lat"),
    lng: num(f, "lng"),
    openingHours: hoursFromForm(f),
  };
}

/* ─────────────────────────── Onboarding & profile ─────────────────────────── */

export async function onboardingAction(_: unknown, form: FormData): Promise<ActionResult> {
  const user = await requireUser("business");
  let id = "";
  const r = await toResult(async () => {
    const b = await createBusiness(getDb(), user.id, { name: s(form, "name"), category: s(form, "category"), location: locationFromForm(form) });
    id = b.id;
  });
  if (!r.ok) return r as ActionResult;
  (await cookies()).set(BUSINESS_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/business?welcome=1");
}

export async function switchBusinessAction(businessId: string) {
  const user = await requireUser("business");
  await requireMember(getDb(), user.id, businessId);
  (await cookies()).set(BUSINESS_COOKIE, businessId, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/business", "layout");
}

export async function updateProfileAction(_: unknown, form: FormData): Promise<ActionResult> {
  const ctx = await requireBusiness("business.edit");
  const r = await toResult(
    () =>
      updateBusinessProfile(getDb(), ctx.userId, ctx.businessId, {
        name: s(form, "name"),
        category: s(form, "category") as never,
        description: s(form, "description"),
        phone: s(form, "phone"),
        email: s(form, "email"),
        website: s(form, "website"),
        instagram: s(form, "instagram"),
        receiptAliases: ctx.business.receiptAliases,
        receiptReviewMode: ctx.business.receiptReviewMode,
      }),
    "Profil gespeichert.",
  );
  revalidatePath("/business", "layout");
  return r as ActionResult;
}

export async function uploadImageAction(_: unknown, form: FormData): Promise<ActionResult> {
  const ctx = await requireBusiness("business.edit");
  const kind = s(form, "kind") as "logo" | "cover" | "gallery";
  const r = await toResult(async () => {
    const buf = await fileFromForm(form, "file");
    if (!buf) throw new DomainError("no_file", "Bitte wähle ein Bild aus.");
    const key = await saveImage(buf, kind);
    if (kind === "gallery") await addGalleryImage(getDb(), ctx.userId, ctx.businessId, key);
    else await setBusinessImage(getDb(), ctx.userId, ctx.businessId, kind, key);
  }, "Bild hochgeladen.");
  revalidatePath("/business/profile");
  return r as ActionResult;
}

export async function removeGalleryImageAction(imageId: string) {
  const ctx = await requireBusiness("business.edit");
  await removeGalleryImage(getDb(), ctx.userId, ctx.businessId, imageId);
  revalidatePath("/business/profile");
}

export async function setPublishedAction(published: boolean): Promise<ActionResult> {
  const ctx = await requireBusiness("business.edit");
  const r = await toResult(() => setPublished(getDb(), ctx.userId, ctx.businessId, published), published ? "Dein Profil ist jetzt sichtbar." : "Profil verborgen.");
  revalidatePath("/business", "layout");
  return r as ActionResult;
}

export async function saveLocationAction(_: unknown, form: FormData): Promise<ActionResult> {
  const ctx = await requireBusiness("business.edit");
  const id = s(form, "locationId") || undefined;
  const r = await toResult(() => upsertLocation(getDb(), ctx.userId, ctx.businessId, locationFromForm(form), id), "Standort gespeichert.");
  revalidatePath("/business/profile");
  return r as ActionResult;
}

export async function deleteLocationAction(locationId: string): Promise<ActionResult> {
  const ctx = await requireBusiness("business.edit");
  const r = await toResult(() => deleteLocation(getDb(), ctx.userId, ctx.businessId, locationId));
  revalidatePath("/business/profile");
  return r as ActionResult;
}

export async function saveSettingsAction(_: unknown, form: FormData): Promise<ActionResult> {
  const ctx = await requireBusiness("business.edit");
  const b = ctx.business;
  const aliases = s(form, "receiptAliases").split(/[\n,]/).map((a) => a.trim()).filter(Boolean);
  const r = await toResult(
    () =>
      updateBusinessProfile(getDb(), ctx.userId, ctx.businessId, {
        name: b.name, category: b.category as never, description: b.description, phone: b.phone ?? "", email: b.email ?? "",
        website: b.website ?? "", instagram: b.instagram ?? "", receiptAliases: aliases,
        receiptReviewMode: form.get("receiptReviewMode") === "always_manual" ? "always_manual" : "auto_low_risk",
      }),
    "Einstellungen gespeichert.",
  );
  revalidatePath("/business/settings");
  return r as ActionResult;
}

export async function deleteBusinessAction(_: unknown, form: FormData): Promise<ActionResult> {
  const ctx = await requireBusiness();
  const r = await toResult(() => deleteBusiness(getDb(), ctx.userId, ctx.businessId, s(form, "confirmName")));
  if (r.ok) {
    (await cookies()).delete(BUSINESS_COOKIE);
    redirect("/business");
  }
  return r as ActionResult;
}

/* ─────────────────────────── Programs & offers ─────────────────────────── */

function programFromForm(f: FormData): ProgramInput {
  const rewardType = s(f, "rewardType") as ProgramInput["rewardType"];
  let rewardValue: number | null = num(f, "rewardValue");
  if (rewardType === "fixed_discount" && rewardValue != null) rewardValue = Math.round(rewardValue * 100);
  const min = num(f, "minPurchase");
  return {
    name: s(f, "name"),
    description: s(f, "description"),
    stampsRequired: Number(s(f, "stampsRequired")),
    rewardType,
    rewardTitle: s(f, "rewardTitle"),
    rewardValue,
    minPurchaseCents: min == null ? 0 : Math.round(min * 100),
    stampValidityDays: s(f, "stampValidityDays") as never,
    rewardValidityDays: s(f, "rewardValidityDays") as never,
    maxStampsPerDay: Number(s(f, "maxStampsPerDay") || 1),
    locationIds: f.getAll("locationIds").map(String).filter(Boolean),
    eligibleItems: s(f, "eligibleItems"),
    redemptionTerms: s(f, "redemptionTerms"),
    startsAt: s(f, "startsAt") as never,
    endsAt: s(f, "endsAt") as never,
    color: s(f, "color") || "#6C47FF",
  };
}

export async function saveProgramAction(_: unknown, form: FormData): Promise<ActionResult> {
  const ctx = await requireBusiness("programs.manage");
  const id = s(form, "programId");
  const activate = form.get("intent") === "activate";
  let target = "";
  const r = await toResult(async () => {
    const input = programFromForm(form);
    const p = id
      ? await updateProgram(getDb(), ctx.userId, ctx.businessId, id, input)
      : await createProgram(getDb(), ctx.userId, ctx.businessId, input, activate);
    const img = await fileFromForm(form, "image");
    if (img) await setProgramImage(getDb(), ctx.userId, ctx.businessId, p.id, await saveImage(img, "program"));
    target = `/business/programs/${p.id}?saved=1`;
  }, "Gespeichert.");
  if (r.ok) {
    revalidatePath("/business/programs");
    redirect(target);
  }
  return r as ActionResult;
}

export async function setProgramStatusAction(programId: string, status: "active" | "paused" | "archived"): Promise<ActionResult> {
  const ctx = await requireBusiness("programs.manage");
  const r = await toResult(() => setProgramStatus(getDb(), ctx.userId, ctx.businessId, programId, status));
  revalidatePath("/business/programs", "layout");
  return r as ActionResult;
}

export async function createOfferAction(_: unknown, form: FormData): Promise<ActionResult> {
  const ctx = await requireBusiness("offers.manage");
  const r = await toResult(
    () =>
      createOffer(getDb(), ctx.userId, ctx.businessId, {
        title: s(form, "title"),
        description: s(form, "description"),
        newCustomersOnly: form.get("newCustomersOnly") === "on",
        startsAt: s(form, "startsAt") as never,
        endsAt: s(form, "endsAt") as never,
      }),
    "Aktion veröffentlicht.",
  );
  revalidatePath("/business/marketing");
  return r as ActionResult;
}

export async function setOfferActiveAction(offerId: string, active: boolean) {
  const ctx = await requireBusiness("offers.manage");
  await setOfferActive(getDb(), ctx.userId, ctx.businessId, offerId, active);
  revalidatePath("/business/marketing");
}

export async function deleteOfferAction(offerId: string) {
  const ctx = await requireBusiness("offers.manage");
  await deleteOffer(getDb(), ctx.userId, ctx.businessId, offerId);
  revalidatePath("/business/marketing");
}

/* ─────────────────────────── Counter: codes & redemption ─────────────────────────── */

export type CodeResult = ActionResult<{ code: string; expiresAt: string; qr: string; stamps: number }>;

export async function createCodeAction(_: unknown, form: FormData): Promise<CodeResult> {
  const ctx = await requireBusiness("stamps.issue");
  return toResult(async () => {
    const c = await createStampCode(getDb(), ctx.userId, {
      businessId: ctx.businessId,
      programId: s(form, "programId"),
      locationId: s(form, "locationId") || null,
      stamps: Number(s(form, "stamps") || 1),
    });
    const url = `${env.appUrl}/collect?code=${c.code}`;
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 480, errorCorrectionLevel: "M", color: { dark: "#0b0b10", light: "#ffffff" } });
    return { code: c.code, expiresAt: c.expiresAt.toISOString(), qr, stamps: c.stamps };
  });
}

export async function redeemAction(_: unknown, form: FormData): Promise<ActionResult<{ title: string }>> {
  const ctx = await requireBusiness("rewards.redeem");
  const r = await toResult(async () => {
    const reward = await redeemReward(getDb(), ctx.userId, ctx.businessId, s(form, "code"));
    return { title: reward.title };
  });
  if (r.ok) r.message = `Eingelöst: ${r.data?.title}`;
  revalidatePath("/business/rewards");
  return r;
}

/* ─────────────────────────── Receipts ─────────────────────────── */

export async function reviewReceiptAction(_: unknown, form: FormData): Promise<ActionResult> {
  const ctx = await requireBusiness("receipts.review");
  const decision = form.get("decision") === "approve" ? "approve" : "reject";
  const r = await toResult(
    () => reviewReceipt(getDb(), ctx.userId, ctx.businessId, s(form, "receiptId"), decision, s(form, "note")),
    decision === "approve" ? "Bestätigt – Stempel vergeben." : "Abgelehnt.",
  );
  revalidatePath("/business/receipts");
  revalidatePath("/business", "layout");
  return r as ActionResult;
}

/* ─────────────────────────── Campaigns ─────────────────────────── */

function campaignFromForm(f: FormData, imagePath: string | null): CampaignInput {
  const type = s(f, "type") as CampaignInput["type"];
  const interval = s(f, "intervalDays") === "custom" ? s(f, "customInterval") : s(f, "intervalDays");
  return {
    name: s(f, "name"),
    type,
    trigger: (s(f, "trigger") || null) as CampaignInput["trigger"],
    triggerParam: s(f, "triggerParam") ? Number(s(f, "triggerParam")) : null,
    segment: (s(f, "segment") || "all_consented") as CampaignInput["segment"],
    programId: s(f, "programId") || null,
    title: s(f, "title"),
    body: s(f, "body"),
    link: s(f, "link") || null,
    sendMode: s(f, "sendMode") === "later" ? "later" : "now",
    scheduledAt: s(f, "scheduledAt") ? new Date(s(f, "scheduledAt")) : null,
    intervalDays: interval ? Number(interval) : null,
    imagePath,
  };
}

export async function saveCampaignAction(_: unknown, form: FormData): Promise<ActionResult> {
  const ctx = await requireBusiness("campaigns.manage");
  const id = s(form, "campaignId");
  const activate = form.get("intent") === "activate";
  const r = await toResult(async () => {
    const img = await fileFromForm(form, "image");
    const imagePath = img ? await saveImage(img, "campaign") : s(form, "existingImage") || null;
    const input = campaignFromForm(form, imagePath);
    if (id) {
      await updateCampaign(getDb(), ctx.userId, ctx.businessId, id, input);
      if (activate) await setCampaignStatus(getDb(), ctx.userId, ctx.businessId, id, "activate");
    } else {
      await createCampaign(getDb(), ctx.userId, ctx.businessId, input, activate);
    }
  });
  if (r.ok) {
    revalidatePath("/business/campaigns");
    redirect("/business/campaigns?saved=1");
  }
  return r as ActionResult;
}

export async function campaignStatusAction(campaignId: string, action: "activate" | "pause" | "archive"): Promise<ActionResult> {
  const ctx = await requireBusiness("campaigns.manage");
  const r = await toResult(() => setCampaignStatus(getDb(), ctx.userId, ctx.businessId, campaignId, action));
  revalidatePath("/business/campaigns", "layout");
  return r as ActionResult;
}

/* ─────────────────────────── Team ─────────────────────────── */

export async function inviteAction(_: unknown, form: FormData): Promise<ActionResult<{ link: string }>> {
  const ctx = await requireBusiness("team.manage");
  const r = await toResult(async () => {
    const { token } = await inviteMember(getDb(), ctx.userId, ctx.businessId, s(form, "email"), s(form, "role") === "manager" ? "manager" : "staff");
    return { link: `${env.appUrl}/invite/${token}` };
  });
  if (r.ok) r.message = "Einladung erstellt – teile den Link mit deinem Teammitglied (7 Tage gültig).";
  revalidatePath("/business/team");
  return r;
}

export async function changeRoleAction(userId: string, role: "manager" | "staff"): Promise<ActionResult> {
  const ctx = await requireBusiness("team.manage");
  const r = await toResult(() => changeMemberRole(getDb(), ctx.userId, ctx.businessId, userId, role));
  revalidatePath("/business/team");
  return r as ActionResult;
}

export async function removeMemberAction(userId: string): Promise<ActionResult> {
  const ctx = await requireBusiness("team.manage");
  const r = await toResult(() => removeMember(getDb(), ctx.userId, ctx.businessId, userId));
  revalidatePath("/business/team");
  return r as ActionResult;
}

export async function revokeInviteAction(inviteId: string) {
  const ctx = await requireBusiness("team.manage");
  await revokeInvite(getDb(), ctx.userId, ctx.businessId, inviteId);
  revalidatePath("/business/team");
}

export async function acceptInviteAction(token: string): Promise<ActionResult> {
  const user = await requireUser("business");
  let businessId = "";
  const r = await toResult(async () => {
    businessId = await acceptInvite(getDb(), user.id, token);
  });
  if (r.ok) {
    (await cookies()).set(BUSINESS_COOKIE, businessId, { httpOnly: true, sameSite: "lax", path: "/" });
    redirect("/business");
  }
  return r as ActionResult;
}

/* ─────────────────────────── Billing (test mode) ─────────────────────────── */

export async function changePlanAction(plan: Plan): Promise<ActionResult> {
  const ctx = await requireBusiness("billing.manage");
  const r = await toResult(() => changePlanTestMode(getDb(), ctx.userId, ctx.businessId, plan), "Tarif im Testmodus geändert – es wurde keine Zahlung ausgelöst.");
  revalidatePath("/business", "layout");
  return r as ActionResult;
}
