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

const VOLUNTEER_AUTH_PUBLIC = new Set([
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "health",
]);

/** Paths that stay public on the volunteer app (no auth / approval). */
export function isVolunteerPublicPath(pathname: string): boolean {
  const segment = firstSegment(pathname);
  return segment !== null && VOLUNTEER_AUTH_PUBLIC.has(segment);
}

/** Pending volunteers may only stay on this path (plus health). */
export function isVolunteerPendingPath(pathname: string): boolean {
  return firstSegment(pathname) === "pending";
}

/** Rejected / disabled volunteers may only stay on this path (plus health). */
export function isVolunteerBlockedPath(pathname: string): boolean {
  return firstSegment(pathname) === "account-status";
}

/** Paths that stay public on the admin app. */
export function isAdminPublicPath(pathname: string): boolean {
  const segment = firstSegment(pathname);
  return segment === "login" || segment === "health";
}

/** Signed-in non-admins land here (no portal access). */
export function isAdminUnauthorizedPath(pathname: string): boolean {
  return firstSegment(pathname) === "unauthorized";
}

export function volunteerLoginPath(): string {
  return "/login";
}

export function volunteerPendingPath(): string {
  return "/pending";
}

export function volunteerBlockedPath(): string {
  return "/account-status";
}

export function adminLoginPath(): string {
  return "/login";
}

export function adminUnauthorizedPath(): string {
  return "/unauthorized";
}
