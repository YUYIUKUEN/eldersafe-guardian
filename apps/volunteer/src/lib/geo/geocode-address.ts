const cache = new Map<string, { latitude: number; longitude: number }>();

/** Forward-geocode a free-text address via Nominatim (best-effort). */
export async function geocodeAddress(
  address: string,
  locale: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const language = locale.startsWith("zh") ? "zh-HK" : "en";
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", address);
    url.searchParams.set("limit", "1");
    url.searchParams.set("accept-language", language);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "ElderSafeGuardianVolunteer/0.1 (local-dev)",
      },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
    }>;
    const hit = payload[0];
    if (!hit?.lat || !hit?.lon) return null;
    const point = {
      latitude: Number(hit.lat),
      longitude: Number(hit.lon),
    };
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
      return null;
    }
    cache.set(key, point);
    return point;
  } catch {
    return null;
  }
}
