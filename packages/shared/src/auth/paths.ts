import { locales } from "../i18n/locales";

function stripLocalePrefix(pathname: string): string[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [];
  if ((locales as readonly string[]).includes(parts[0])) {
    return parts.slice(1);
  }
  return parts;
}

function firstSegment(pathname: string): string | null {
  const parts = stripLocalePrefix(pathname);
  return parts[0] ?? null;
}

/** Paths that stay public on the volunteer app (no auth / approval). */
export function isVolunteerPublicPath(pathname: string): boolean {
  const segment = firstSegment(pathname);
  return segment === "login" || segment === "register" || segment === "health";
}

/** Paths that stay public on the admin app. */
export function isAdminPublicPath(pathname: string): boolean {
  const segment = firstSegment(pathname);
  return segment === "login" || segment === "health";
}

export function volunteerLoginPath(): string {
  return "/login";
}

export function adminLoginPath(): string {
  return "/login";
}
