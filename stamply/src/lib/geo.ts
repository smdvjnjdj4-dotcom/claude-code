export type GeoPoint = { lat: number; lng: number };

/** Great-circle distance in metres (haversine). */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(m: number | null | undefined): string | null {
  if (m == null || !Number.isFinite(m)) return null;
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toLocaleString("de-DE", { maximumFractionDigits: m < 10000 ? 1 : 0 })} km`;
}

export function isValidPoint(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/** Preset cities for the location picker (coordinates of city centres). */
export const CITY_PRESETS: { label: string; lat: number; lng: number }[] = [
  { label: "Berlin", lat: 52.52, lng: 13.405 },
  { label: "Hamburg", lat: 53.5511, lng: 9.9937 },
  { label: "München", lat: 48.1374, lng: 11.5755 },
  { label: "Köln", lat: 50.9375, lng: 6.9603 },
  { label: "Frankfurt am Main", lat: 50.1109, lng: 8.6821 },
  { label: "Stuttgart", lat: 48.7758, lng: 9.1829 },
  { label: "Düsseldorf", lat: 51.2277, lng: 6.7735 },
  { label: "Leipzig", lat: 51.3397, lng: 12.3731 },
  { label: "Wien", lat: 48.2082, lng: 16.3738 },
  { label: "Zürich", lat: 47.3769, lng: 8.5417 },
];
