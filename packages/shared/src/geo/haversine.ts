const EARTH_RADIUS_M = 6371000;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in metres between two WGS84 points. */
export function haversineDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export function formatDistanceMeters(meters: number, locale: string): string {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) {
    const rounded = Math.round(meters);
    return locale.startsWith("zh") ? `${rounded} 米` : `${rounded} m`;
  }
  const km = meters / 1000;
  const text = km >= 10 ? km.toFixed(0) : km.toFixed(1);
  return locale.startsWith("zh") ? `${text} 公里` : `${text} km`;
}
