"use client";

/** Preferred MIME types: Safari/iOS first, then Chromium/Android. */
const MIME_CANDIDATES = [
  "audio/mp4",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/aac",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
] as const;

export type PickedAudioFormat = {
  mimeType: string;
  extension: "m4a" | "webm" | "ogg" | "mp4";
};

export function pickSupportedAudioFormat(): PickedAudioFormat | null {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }

  for (const mimeType of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return { mimeType, extension: extensionForMime(mimeType) };
    }
  }

  // Browser may still record with an unspecified default type.
  return { mimeType: "", extension: "webm" };
}

function extensionForMime(mimeType: string): PickedAudioFormat["extension"] {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base === "audio/mp4" || base === "audio/aac" || base === "audio/x-m4a") {
    return "m4a";
  }
  if (base === "audio/ogg") return "ogg";
  if (base === "audio/webm") return "webm";
  return "mp4";
}

export const MAX_RECORDING_SECONDS = 60;
