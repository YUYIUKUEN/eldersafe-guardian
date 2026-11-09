"use client";

import { useEffect, useState } from "react";

export type VolunteerCoords = {
  latitude: number;
  longitude: number;
};

export type VolunteerLocationState = {
  coords: VolunteerCoords | null;
  status: "idle" | "prompting" | "ready" | "denied" | "unavailable";
};

export function useVolunteerLocation(): VolunteerLocationState {
  const [state, setState] = useState<VolunteerLocationState>(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return { coords: null, status: "unavailable" };
    }
    return { coords: null, status: "prompting" };
  });

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          status: "ready",
        });
      },
      (error) => {
        setState({
          coords: null,
          status:
            error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        });
      },
      {
        enableHighAccuracy: false,
        maximumAge: 30_000,
        timeout: 15_000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return state;
}
