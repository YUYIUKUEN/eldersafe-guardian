"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";

export type MapPoint = {
  latitude: number;
  longitude: number;
  kind: "live" | "address" | "volunteer";
};

type HelpRequestMapProps = {
  points: MapPoint[];
};

const KIND_COLOR: Record<MapPoint["kind"], string> = {
  live: "#c62828",
  address: "#1d4f91",
  volunteer: "#2e7d32",
};

export function HelpRequestMap({ points }: HelpRequestMapProps) {
  const t = useTranslations("VolunteerHelpDetail");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").CircleMarker[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (!containerRef.current || points.length === 0) return;
      const L = await import("leaflet");

      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      const map = mapRef.current;
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];

      const latLngs: import("leaflet").LatLngExpression[] = [];
      for (const point of points) {
        const latLng: import("leaflet").LatLngExpression = [
          point.latitude,
          point.longitude,
        ];
        latLngs.push(latLng);
        const marker = L.circleMarker(latLng, {
          radius: 10,
          color: "#ffffff",
          weight: 2,
          fillColor: KIND_COLOR[point.kind],
          fillOpacity: 0.95,
        }).addTo(map);
        marker.bindPopup(
          point.kind === "live"
            ? t("markerLive")
            : point.kind === "address"
              ? t("markerAddress")
              : t("markerVolunteer"),
        );
        markersRef.current.push(marker);
      }

      if (latLngs.length === 1) {
        map.setView(latLngs[0]!, 16);
      } else {
        map.fitBounds(L.latLngBounds(latLngs), { padding: [36, 36] });
      }

      // Leaflet needs a tick after layout to size correctly in flex containers.
      window.setTimeout(() => map.invalidateSize(), 50);
    }

    void setup();

    return () => {
      cancelled = true;
    };
  }, [points, t]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = [];
    };
  }, []);

  if (points.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-10 text-center text-sm text-slate-600">
        {t("mapEmpty")}
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-72 w-full overflow-hidden rounded-2xl border border-slate-200 sm:h-96"
      role="img"
      aria-label={t("mapLabel")}
    />
  );
}
