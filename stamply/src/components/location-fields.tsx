"use client";

import "leaflet/dist/leaflet.css";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { OpeningHours } from "@/db/schema";
import { DAYS } from "@/lib/hours";
import { Field, Spinner } from "./forms";
import { buttonClass, Input } from "./ui";

type Initial = { name?: string; street?: string; postalCode?: string; city?: string; lat?: number | null; lng?: number | null; openingHours?: OpeningHours | null };

/**
 * Address + map position. Clicking the map or dragging the pin sets the exact position.
 * "Adresse suchen" uses OpenStreetMap Nominatim (free, max. 1 request/second, attribution required).
 */
export function LocationFields({ initial = {}, withName, withHours = true }: { initial?: Initial; withName?: boolean; withHours?: boolean }) {
  const [lat, setLat] = useState<number | null>(initial.lat ?? null);
  const [lng, setLng] = useState<number | null>(initial.lng ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const street = useRef<HTMLInputElement>(null);
  const zip = useRef<HTMLInputElement>(null);
  const city = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      const start: [number, number] = lat != null && lng != null ? [lat, lng] : [51.1657, 10.4515];
      const map = L.map(mapEl.current, { scrollWheelZoom: false }).setView(start, lat != null ? 16 : 5);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
      const icon = L.divIcon({ className: "", html: '<div style="width:30px;height:30px;border-radius:999px;background:#6c47ff;border:3px solid #fff;box-shadow:0 6px 16px -4px rgba(60,30,180,.6)"></div>', iconSize: [30, 30], iconAnchor: [15, 15] });
      const place = (p: [number, number]) => {
        if (!markerRef.current) {
          markerRef.current = L.marker(p, { draggable: true, icon }).addTo(map);
          markerRef.current.on("dragend", () => {
            const ll = markerRef.current!.getLatLng();
            setLat(+ll.lat.toFixed(6));
            setLng(+ll.lng.toFixed(6));
          });
        } else markerRef.current.setLatLng(p);
      };
      if (lat != null && lng != null) place([lat, lng]);
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        place([e.latlng.lat, e.latlng.lng]);
        setLat(+e.latlng.lat.toFixed(6));
        setLng(+e.latlng.lng.toFixed(6));
      });
      mapRef.current = map;
      (map as unknown as { __place: typeof place }).__place = place;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const geocode = async () => {
    const q = [street.current?.value, zip.current?.value, city.current?.value].filter(Boolean).join(", ");
    if (!q) return setMsg("Bitte zuerst Straße und Ort eintragen.");
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=de,at,ch&q=${encodeURIComponent(q)}`, { headers: { "Accept-Language": "de" } });
      const data = (await res.json()) as { lat: string; lon: string }[];
      if (!data[0]) return setMsg("Adresse nicht gefunden – setze den Pin bitte direkt auf der Karte.");
      const p: [number, number] = [+(+data[0].lat).toFixed(6), +(+data[0].lon).toFixed(6)];
      setLat(p[0]);
      setLng(p[1]);
      mapRef.current?.setView(p, 17);
      (mapRef.current as unknown as { __place?: (p: [number, number]) => void })?.__place?.(p);
    } catch {
      setMsg("Suche fehlgeschlagen – setze den Pin bitte direkt auf der Karte.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {withName && (
        <Field label="Name des Standorts" name="locName"><Input id="locName" name="locName" defaultValue={initial.name ?? "Hauptfiliale"} /></Field>
      )}
      <Field label="Straße & Hausnummer" name="street"><Input ref={street} id="street" name="street" defaultValue={initial.street} autoComplete="street-address" /></Field>
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <Field label="PLZ" name="postalCode"><Input ref={zip} id="postalCode" name="postalCode" defaultValue={initial.postalCode} autoComplete="postal-code" /></Field>
        <Field label="Ort" name="city"><Input ref={city} id="city" name="city" defaultValue={initial.city} autoComplete="address-level2" /></Field>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Position auf der Karte</span>
          <button type="button" onClick={geocode} disabled={busy} className={buttonClass("outline", "sm")}>{busy ? <Spinner /> : <Search size={14} />} Adresse suchen</button>
        </div>
        <div ref={mapEl} className="h-64 overflow-hidden rounded-2xl border border-line" />
        <p className="mt-1.5 text-xs text-muted">{lat != null ? `Position gesetzt (${lat.toFixed(5)}, ${lng?.toFixed(5)}). Pin ziehen zum Korrigieren.` : "Tippe auf die Karte, um deine Position zu setzen. Ohne Position erscheinst du nicht in der Umkreissuche."}</p>
        {msg && <p className="mt-1 text-xs text-warning">{msg}</p>}
        <input type="hidden" name="lat" value={lat ?? ""} />
        <input type="hidden" name="lng" value={lng ?? ""} />
      </div>
      {withHours && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Öffnungszeiten</legend>
          <div className="space-y-2">
            {DAYS.map(([k, label]) => {
              const slot = initial.openingHours?.[k]?.[0];
              const closed = initial.openingHours ? !slot : k === "sun";
              return (
                <div key={k} className="grid grid-cols-[92px_1fr_1fr_auto] items-center gap-2 text-sm">
                  <span className="font-medium">{label}</span>
                  <Input type="time" name={`${k}_open`} defaultValue={slot?.open ?? "08:00"} className="h-10 px-3" aria-label={`${label} öffnet`} />
                  <Input type="time" name={`${k}_close`} defaultValue={slot?.close ?? "18:00"} className="h-10 px-3" aria-label={`${label} schließt`} />
                  <label className="flex items-center gap-1.5 text-muted"><input type="checkbox" name={`${k}_closed`} defaultChecked={closed} className="accent-[var(--brand)]" /> zu</label>
                </div>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
