export function formatHkDateTime(iso: string | null | undefined, locale: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-HK" : "zh-HK", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatHkDate(iso: string | null | undefined, locale: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-HK" : "zh-HK", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatServiceAreas(areas: string[] | null | undefined) {
  if (!areas || areas.length === 0) return "—";
  return areas.join(", ");
}

/** Human-readable duration for admin tables (HK locale aware labels via caller). */
export function durationParts(fromIso: string | null | undefined, toIso: string | null | undefined) {
  if (!fromIso) return null;
  const from = new Date(fromIso).getTime();
  const to = toIso ? new Date(toIso).getTime() : Date.now();
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return null;
  const totalMinutes = Math.floor((to - from) / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes, totalMinutes };
}

export function formatDuration(
  fromIso: string | null | undefined,
  toIso: string | null | undefined,
  labels: { days: string; hours: string; minutes: string; empty: string },
) {
  const parts = durationParts(fromIso, toIso);
  if (!parts) return labels.empty;
  if (parts.days > 0) {
    return `${parts.days}${labels.days} ${parts.hours}${labels.hours}`;
  }
  if (parts.hours > 0) {
    return `${parts.hours}${labels.hours} ${parts.minutes}${labels.minutes}`;
  }
  return `${parts.minutes}${labels.minutes}`;
}

export function shortId(id: string) {
  return id.slice(0, 8);
}

export function parseAudioStoragePath(audioPath: string) {
  const trimmed = audioPath.replace(/^\/+/, "");
  const slash = trimmed.indexOf("/");
  if (slash <= 0) {
    return { bucket: "voice-recordings", path: trimmed };
  }
  return {
    bucket: trimmed.slice(0, slash),
    path: trimmed.slice(slash + 1),
  };
}

export function policeTrackUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_ELDER_APP_URL?.replace(/\/$/, "") ?? "";
  const path = `/track/${token}`;
  return base ? `${base}${path}` : path;
}
