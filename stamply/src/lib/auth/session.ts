import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import type { User } from "@/db/schema";
import { requireMember, type MemberContext } from "@/domain/access";
import { createSession, deleteSession, getSessionUser, SESSION_TTL_DAYS } from "@/domain/accounts";
import { membershipsForUser } from "@/domain/businesses";
import { hmac } from "@/lib/crypto";
import { env } from "@/lib/env";
import type { Permission } from "@/lib/permissions";

export const SESSION_COOKIE = "stamply_session";
export const BUSINESS_COOKIE = "stamply_biz";

/** Current user for this request (memoised per request). */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getSessionUser(getDb(), token);
});

export async function startSession(userId: string) {
  const { token, expiresAt } = await createSession(getDb(), userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_TTL_DAYS * 86400,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(getDb(), token);
  jar.delete(SESSION_COOKIE);
  jar.delete(BUSINESS_COOKIE);
}

/** Requires a logged-in user, optionally of a given account type. Redirects otherwise. */
export async function requireUser(type?: "customer" | "business"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const h = await headers();
    const next = h.get("x-pathname") ?? "";
    redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  if (type && user.accountType !== type) redirect(user.accountType === "business" ? "/business" : "/");
  return user;
}

/**
 * Resolves the active business for a business user (multi-business support via cookie) and
 * checks the permission. Redirects to onboarding if the user has no business yet.
 */
export async function requireBusiness(permission?: Permission): Promise<MemberContext & { user: User }> {
  const user = await requireUser("business");
  const memberships = await membershipsForUser(getDb(), user.id);
  if (!memberships.length) redirect("/business/onboarding");
  const preferred = (await cookies()).get(BUSINESS_COOKIE)?.value;
  const chosen = memberships.find((m) => m.businessId === preferred) ?? memberships[0];
  try {
    const ctx = await requireMember(getDb(), user.id, chosen.businessId, permission);
    return { ...ctx, user };
  } catch {
    redirect("/business?denied=1");
  }
}

/** Pseudonymous client key for rate limiting (never stored in clear). */
export async function clientKey() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return hmac(`ip:${ip}`).slice(0, 24);
}

/** Validates a post-login redirect target (only same-site paths). */
export function safeNext(next: unknown, fallback: string) {
  return typeof next === "string" && /^\/(?!\/)[^\s\\]*$/.test(next) ? next : fallback;
}
