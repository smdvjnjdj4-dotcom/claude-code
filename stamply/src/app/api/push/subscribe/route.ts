import { getDb } from "@/db";
import { removePushSubscription, savePushSubscription } from "@/domain/customers";
import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(env.appUrl).origin || origin === new URL(req.url).origin;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  try {
    await savePushSubscription(getDb(), user.id, await req.json());
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "invalid subscription" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await removePushSubscription(getDb(), user.id, endpoint);
  return Response.json({ ok: true });
}
