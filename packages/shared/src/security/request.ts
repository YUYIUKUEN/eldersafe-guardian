const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type ReadJsonBodyError = "invalid_json" | "body_too_large";

export async function readJsonBody<T>(
  request: Request,
  maxBytes = 65536,
): Promise<
  { ok: true; value: T } | { ok: false; error: ReadJsonBodyError }
> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (
      Number.isFinite(contentLength) &&
      contentLength > maxBytes
    ) {
      return { ok: false, error: "body_too_large" };
    }
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, error: "invalid_json" };
  }

  if (text.length > maxBytes) {
    return { ok: false, error: "body_too_large" };
  }

  if (text.trim() === "") {
    return { ok: false, error: "invalid_json" };
  }

  try {
    const value = JSON.parse(text) as T;
    return { ok: true, value };
  } catch {
    return { ok: false, error: "invalid_json" };
  }
}