/** Map thrown errors to stable client-facing codes (avoid leaking internals). */
export function toSafeErrorCode(
  error: unknown,
  fallback: string,
): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message) return fallback;
  // Allow known stable codes used across routes.
  if (/^[A-Z][A-Z0-9_]{2,63}$/.test(message)) return message;
  if (/^[a-z][a-z0-9_]{2,63}$/.test(message)) return message;
  return fallback;
}
