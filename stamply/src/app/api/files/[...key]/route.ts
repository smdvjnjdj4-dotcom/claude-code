import { getDb } from "@/db";
import { canViewReceiptImage } from "@/domain/receipts/service";
import { getCurrentUser } from "@/lib/auth/session";
import { isValidKey, readStored } from "@/lib/storage";

/** Serves stored images. Public images are cacheable; receipt images require authorization. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!isValidKey(key)) return new Response("Not found", { status: 404 });
  const isPrivate = key.startsWith("private/");
  if (isPrivate) {
    const user = await getCurrentUser();
    if (!user || !(await canViewReceiptImage(getDb(), user.id, key))) return new Response("Not found", { status: 404 });
  }
  const buf = await readStored(key);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "image/webp",
      "cache-control": isPrivate ? "private, no-store" : "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'none'; sandbox",
    },
  });
}
