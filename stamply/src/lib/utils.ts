import clsx, { type ClassValue } from "clsx";

export const cn = (...v: ClassValue[]) => clsx(v);

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Deterministic pleasant gradient for placeholders (no stock images). */
export function gradientFor(seed: string, base?: string | null) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  if (base) return `linear-gradient(135deg, ${base} 0%, hsl(${hue} 70% 62%) 100%)`;
  return `linear-gradient(135deg, hsl(${hue} 72% 64%) 0%, hsl(${(hue + 40) % 360} 75% 55%) 100%)`;
}
