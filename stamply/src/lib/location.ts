import { cookies } from "next/headers";
import { isValidPoint } from "./geo";

export const LOCATION_COOKIE = "stamply_loc";
export type SavedLocation = { label: string; lat: number; lng: number };

export async function getSavedLocation(): Promise<SavedLocation | null> {
  const raw = (await cookies()).get(LOCATION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as SavedLocation;
    if (typeof v.label === "string" && isValidPoint(v.lat, v.lng)) return v;
  } catch {}
  return null;
}

/** Stores the location rounded to 3 decimals (~100 m) – enough for distances, less sensitive. */
export async function saveLocation(loc: SavedLocation | null) {
  const jar = await cookies();
  if (!loc) {
    jar.delete(LOCATION_COOKIE);
    return;
  }
  if (!isValidPoint(loc.lat, loc.lng)) return;
  const value = JSON.stringify({
    label: String(loc.label).slice(0, 60),
    lat: Math.round(loc.lat * 1000) / 1000,
    lng: Math.round(loc.lng * 1000) / 1000,
  });
  jar.set(LOCATION_COOKIE, value, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180 });
}
