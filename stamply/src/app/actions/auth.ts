"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { authenticate, registerUser } from "@/domain/accounts";
import { endSession, startSession, clientKey, safeNext } from "@/lib/auth/session";
import { toResult, type ActionResult } from "@/lib/errors";

export async function loginAction(_: unknown, form: FormData): Promise<ActionResult<unknown>> {
  let target = "/";
  const res = await toResult(async () => {
    const user = await authenticate(getDb(), String(form.get("email") ?? ""), String(form.get("password") ?? ""), await clientKey());
    await startSession(user.id);
    target = safeNext(form.get("next"), user.accountType === "business" ? "/business" : "/");
    if (user.accountType === "business" && !target.startsWith("/business") && !target.startsWith("/invite")) target = "/business";
    if (user.accountType === "customer" && target.startsWith("/business")) target = "/";
  });
  if (res.ok) redirect(target);
  return res;
}

export async function registerAction(_: unknown, form: FormData): Promise<ActionResult<unknown>> {
  const accountType = form.get("accountType") === "business" ? "business" : "customer";
  if (form.get("terms") !== "on") {
    return { ok: false, error: "Bitte akzeptiere die Nutzungsbedingungen und die Datenschutzhinweise.", fieldErrors: { terms: "Erforderlich" } };
  }
  let target = accountType === "business" ? "/business/onboarding" : "/";
  const res = await toResult(async () => {
    const user = await registerUser(
      getDb(),
      {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        accountType,
      },
      await clientKey(),
    );
    await startSession(user.id);
    target = safeNext(form.get("next"), target);
  });
  if (res.ok) redirect(target);
  return res;
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}
