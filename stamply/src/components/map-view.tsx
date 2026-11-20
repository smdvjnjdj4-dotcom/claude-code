"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

export type MapPoint = { id: string; lat: number; lng: number; title: string; subtitle?: string; href?: string; emoji?: string };

/**
 * OpenStreetMap via Leaflet (both free/open source). For production traffic use a tile provider
 * with an appropriate plan or self-hosted tiles – see docs/KOSTEN.md.
 */
export default function MapView({ points, center, zoom = 13, className }: { points: MapPoint[]; center?: { lat: number; lng: number } | null; zoom?: number; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView(
      center ? [center.lat, center.lng] : points[0] ? [points[0].lat, points[0].lng] : [51.1657, 10.4515],
      center || points[0] ? zoom : 6,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const layer = L.layerGroup().addTo(m);
    const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
    for (const p of points) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:999px;background:#6c47ff;border:3px solid #fff;box-shadow:0 6px 16px -4px rgba(60,30,180,.5);font-size:17px">${esc(p.emoji ?? "📍")}</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      const popup = `<div style="min-width:160px"><strong>${esc(p.title)}</strong>${p.subtitle ? `<br/><span style="color:#6e6e7a">${esc(p.subtitle)}</span>` : ""}${p.href ? `<br/><a href="${esc(p.href)}" style="color:#6c47ff;font-weight:600">Profil öffnen →</a>` : ""}</div>`;
      L.marker([p.lat, p.lng], { icon, title: p.title }).bindPopup(popup).addTo(layer);
    }
    if (center) {
      L.circleMarker([center.lat, center.lng], { radius: 7, color: "#fff", weight: 3, fillColor: "#0a84ff", fillOpacity: 1 }).addTo(layer);
    }
    if (points.length > 1 && !center) m.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40] });
    return () => {
      layer.remove();
    };
  }, [points, center]);

  return <div ref={el} className={className} role="region" aria-label="Karte" />;
}
