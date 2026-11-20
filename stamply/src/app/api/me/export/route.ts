import { getDb } from "@/db";
import { exportPersonalData } from "@/domain/customers";
import { getCurrentUser } from "@/lib/auth/session";
import { enforce } from "@/lib/rate-limit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  try {
    await enforce(getDb(), `export:${user.id}`, 5, 3600);
  } catch {
    return new Response("Zu viele Anfragen", { status: 429 });
  }
  const data = await exportPersonalData(getDb(), user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="stamply-datenexport-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
