export type MapNavigationTarget = {
  latitude: number;
  longitude: number;
  label?: string;
};

/** Cross-platform maps deep link (Apple Maps on iOS, Google Maps otherwise). */
export function buildMapNavigationUrl(
  target: MapNavigationTarget,
  platformHint?: "ios" | "other",
): string {
  const { latitude, longitude, label } = target;
  const dest = `${latitude},${longitude}`;
  const isIos =
    platformHint === "ios" ||
    (typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent));

  if (isIos) {
    const params = new URLSearchParams({
      daddr: dest,
      dirflg: "d",
    });
    if (label) params.set("q", label);
    return `https://maps.apple.com/?${params.toString()}`;
  }

  const params = new URLSearchParams({
    api: "1",
    destination: label ? `${label} @${dest}` : dest,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
