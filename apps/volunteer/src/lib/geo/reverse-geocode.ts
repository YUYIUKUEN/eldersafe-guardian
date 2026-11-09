const cache = new Map<string, string>();

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

function formatCoords(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/**
 * Reverse-geocode via OpenStreetMap Nominatim (no API key).
 * Falls back to coordinate text when the request fails.
 */
export async function reverseGeocodeAreaName(
  latitude: number,
  longitude: number,
  locale: string,
): Promise<string> {
  const key = cacheKey(latitude, longitude);
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const language = locale.startsWith("zh") ? "zh-HK" : "en";
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("zoom", "16");
    url.searchParams.set("accept-language", language);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "ElderSafeGuardianVolunteer/0.1 (local-dev)",
      },
    });
    if (!response.ok) {
      return formatCoords(latitude, longitude);
    }

    const payload = (await response.json()) as {
      name?: string;
      display_name?: string;
      address?: {
        suburb?: string;
        neighbourhood?: string;
        quarter?: string;
        city_district?: string;
        district?: string;
        city?: string;
        town?: string;
        road?: string;
      };
    };

    const parts = [
      payload.address?.road,
      payload.address?.neighbourhood ??
        payload.address?.suburb ??
        payload.address?.quarter,
      payload.address?.city_district ?? payload.address?.district,
      payload.address?.city ?? payload.address?.town,
    ].filter(Boolean);

    const label =
      parts.slice(0, 2).join("") ||
      payload.name ||
      payload.display_name?.split(",").slice(0, 2).join(",").trim() ||
      formatCoords(latitude, longitude);

    cache.set(key, label);
    return label;
  } catch {
    return formatCoords(latitude, longitude);
  }
}
