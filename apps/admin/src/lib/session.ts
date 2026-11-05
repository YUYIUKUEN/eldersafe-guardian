export const ADMIN_SESSION_KEY = "eldersafe.admin.session";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ADMIN_SESSION_KEY);
}

export function setSessionToken(token: string) {
  window.localStorage.setItem(ADMIN_SESSION_KEY, token);
}

export function clearSessionToken() {
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getBearer(request: Request): string | null {
  const auth = request.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}
