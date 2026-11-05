export const VOLUNTEER_SESSION_KEY = "eldersafe.volunteer.session";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(VOLUNTEER_SESSION_KEY);
}

export function setSessionToken(token: string) {
  window.localStorage.setItem(VOLUNTEER_SESSION_KEY, token);
}

export function clearSessionToken() {
  window.localStorage.removeItem(VOLUNTEER_SESSION_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
