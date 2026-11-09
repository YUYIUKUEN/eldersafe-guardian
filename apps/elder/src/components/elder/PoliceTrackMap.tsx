"use client";

import { useEffect, useId, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type TrackLocationPoint = {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  recordedAt: string;
};

type PoliceTrackMapProps = {
  locations: TrackLocationPoint[];
  emptyLabel: string;
};

export function PoliceTrackMap({ locations, emptyLabel }: PoliceTrackMapProps) {
  const mapId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").CircleMarker | null>(null);
  const pathRef = useRef<import("leaflet").Polyline | null>(null);

  const latest = locations[locations.length - 1] ?? null;

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (!containerRef.current || !latest) return;
      const L = await import("leaflet");

      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView([latest.latitude, latest.longitude], 16);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(mapRef.current);

        markerRef.current = L.circleMarker(
          [latest.latitude, latest.longitude],
          {
            radius: 10,
            color: "#B71C1C",
            fillColor: "#B71C1C",
            fillOpacity: 0.9,
            weight: 2,
          },
        ).addTo(mapRef.current);
      } else {
        mapRef.current.setView([latest.latitude, latest.longitude]);
        markerRef.current?.setLatLng([latest.latitude, latest.longitude]);
      }

      const latLngs = locations.map(
        (point) => [point.latitude, point.longitude] as [number, number],
      );
      if (pathRef.current) {
        pathRef.current.setLatLngs(latLngs);
      } else if (mapRef.current) {
        pathRef.current = L.polyline(latLngs, {
          color: "#B71C1C",
          weight: 4,
        }).addTo(mapRef.current);
      }

      if (latLngs.length > 1 && mapRef.current) {
        mapRef.current.fitBounds(L.latLngBounds(latLngs).pad(0.2));
      }

      mapRef.current.invalidateSize();
    }

    void setup();

    return () => {
      cancelled = true;
    };
  }, [latest, locations, mapId]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      pathRef.current = null;
    };
  }, []);

  if (!latest) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border-2 border-neutral bg-white px-4 text-center text-[20px] font-bold text-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id={`police-track-map-${mapId}`}
      className="min-h-[320px] w-full overflow-hidden rounded-2xl border-2 border-neutral"
      role="img"
      aria-label="Live location map"
    />
  );
}
