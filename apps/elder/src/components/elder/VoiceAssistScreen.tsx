"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
// format is detected once on the client; MediaRecorder is browser-only.
import { readDeviceKey } from "@/lib/elder/device-storage";
import {
  MAX_RECORDING_SECONDS,
  pickSupportedAudioFormat,
  type PickedAudioFormat,
} from "@/lib/elder/media-recorder";
import { useRouter } from "@/i18n/navigation";
import { BigButton } from "@/components/ui/BigButton";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";
import { ElderSessionGate } from "./ElderSessionGate";

type Phase =
  | "ready"
  | "permissionDenied"
  | "unsupported"
  | "recording"
  | "review"
  | "submitting"
  | "submitted";

type LocationFix = {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
};

function VoiceAssistContent() {
  const t = useTranslations("VoiceAssist");
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("ready");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<PickedAudioFormat | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanupRecording();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  function cleanupRecording() {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current != null) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function resetBlobPreview() {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
    blobRef.current = null;
    chunksRef.current = [];
  }

  async function startRecording() {
    setError(null);
    const picked = format ?? pickSupportedAudioFormat();
    if (!picked) {
      setPhase("unsupported");
      return;
    }
    setFormat(picked);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (
        name === "NotAllowedError" ||
        name === "PermissionDeniedError" ||
        name === "SecurityError"
      ) {
        setPhase("permissionDenied");
        return;
      }
      setError(t("micError"));
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    resetBlobPreview();

    let recorder: MediaRecorder;
    try {
      recorder = picked.mimeType
        ? new MediaRecorder(stream, { mimeType: picked.mimeType })
        : new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setPhase("unsupported");
      return;
    }

    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || picked.mimeType || "audio/webm",
      });
      blobRef.current = blob;
      const url = URL.createObjectURL(blob);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = url;
      setAudioUrl(url);
      setPhase("review");
      cleanupRecording();
    };

    recorder.start(250);
    setSeconds(0);
    setPhase("recording");

    timerRef.current = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    autoStopRef.current = window.setTimeout(() => {
      stopRecording();
    }, MAX_RECORDING_SECONDS * 1000);
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current != null) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }

  function reRecord() {
    setError(null);
    resetBlobPreview();
    setSeconds(0);
    setPhase("ready");
  }

  async function readLocation(): Promise<LocationFix | null> {
    if (!navigator.geolocation) {
      setError(t("locationUnsupported"));
      return null;
    }

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          });
        },
      );
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyM: Number.isFinite(position.coords.accuracy)
          ? position.coords.accuracy
          : null,
      };
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? Number((err as { code: number }).code)
          : null;
      if (code === 1) {
        setError(t("locationDenied"));
      } else {
        setError(t("locationError"));
      }
      return null;
    }
  }

  async function submitRecording() {
    const blob = blobRef.current;
    const picked = format;
    const deviceKey = readDeviceKey();
    if (!blob || !picked || !deviceKey) {
      setError(t("submitFailed"));
      return;
    }

    setPhase("submitting");
    setError(null);

    const location = await readLocation();
    if (!location) {
      setPhase("review");
      return;
    }

    const body = new FormData();
    body.append(
      "audio",
      new File([blob], `voice.${picked.extension}`, {
        type: blob.type || picked.mimeType || "application/octet-stream",
      }),
    );
    body.append("mimeType", blob.type || picked.mimeType || "");
    body.append("extension", picked.extension);
    body.append("latitude", String(location.latitude));
    body.append("longitude", String(location.longitude));
    if (location.accuracyM != null) {
      body.append("accuracyM", String(location.accuracyM));
    }

    try {
      const response = await fetch("/api/elders/help-requests", {
        method: "POST",
        headers: { "X-Elder-Device-Key": deviceKey },
        body,
      });
      const payload = (await response.json()) as {
        helpRequest?: { id: string };
        error?: string;
      };
      if (!response.ok || !payload.helpRequest?.id) {
        throw new Error(payload.error ?? "submit_failed");
      }

      setPhase("submitted");
      window.setTimeout(() => {
        router.replace(`/assist/status/${payload.helpRequest!.id}`);
      }, 1800);
    } catch {
      setError(t("submitFailed"));
      setPhase("review");
    }
  }

  const timerLabel = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;

  return (
    <Page backHref="/" hideLanguageSwitcher={phase === "recording"}>
      <BigText as="h1" size="title" tone="brand" className="text-center">
        {t("title")}
      </BigText>

      {phase === "unsupported" ? (
        <BigText className="text-center text-emergency" size="caption">
          {t("unsupported")}
        </BigText>
      ) : null}

      {phase === "permissionDenied" ? (
        <section className="flex flex-col gap-4">
          <BigText className="text-emergency" size="caption">
            {t("micDeniedTitle")}
          </BigText>
          <BigText>{t("micDeniedIphone")}</BigText>
          <BigText>{t("micDeniedAndroid")}</BigText>
          <BigButton variant="assist" onClick={() => setPhase("ready")}>
            {t("tryAgain")}
          </BigButton>
        </section>
      ) : null}

      {phase === "ready" ? (
        <section className="flex flex-1 flex-col justify-center gap-4">
          <BigText className="text-center" tone="muted">
            {t("hint")}
          </BigText>
          <BigButton
            variant="assist"
            className="min-h-[160px] whitespace-normal text-[28px] leading-snug"
            onClick={() => void startRecording()}
          >
            {t("start")}
          </BigButton>
        </section>
      ) : null}

      {phase === "recording" ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-6">
          <div
            className="elder-recording-pulse flex size-40 items-center justify-center rounded-full bg-assist text-[28px] font-bold text-assist-fg"
            aria-live="polite"
          >
            {timerLabel}
          </div>
          <BigText className="text-center" size="caption" tone="assist">
            {t("recording")}
          </BigText>
          <BigText className="text-center" tone="muted">
            {t("maxSeconds", { seconds: MAX_RECORDING_SECONDS })}
          </BigText>
          <BigButton variant="emergency" onClick={stopRecording}>
            {t("stop")}
          </BigButton>
        </section>
      ) : null}

      {phase === "review" || phase === "submitting" ? (
        <section className="flex flex-1 flex-col gap-4">
          <BigText className="text-center" tone="muted">
            {t("reviewHint")}
          </BigText>
          {audioUrl ? (
            <audio
              controls
              src={audioUrl}
              className="w-full rounded-2xl border-2 border-border"
            >
              {t("replay")}
            </audio>
          ) : null}
          <BigButton
            variant="assistSoft"
            disabled={phase === "submitting"}
            onClick={() => {
              const player = document.querySelector("audio");
              if (player instanceof HTMLAudioElement) {
                void player.play();
              }
            }}
          >
            {t("replay")}
          </BigButton>
          <BigButton
            variant="neutral"
            disabled={phase === "submitting"}
            onClick={reRecord}
          >
            {t("reRecord")}
          </BigButton>
          <BigButton
            variant="assist"
            disabled={phase === "submitting"}
            onClick={() => void submitRecording()}
          >
            {phase === "submitting" ? t("submitting") : t("submit")}
          </BigButton>
        </section>
      ) : null}

      {phase === "submitted" ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <BigText as="h2" size="title" tone="assist">
            {t("submitted")}
          </BigText>
          <BigText tone="muted">{t("redirecting")}</BigText>
        </section>
      ) : null}

      {error ? (
        <p role="alert" className="text-[22px] font-bold text-emergency">
          {error}
        </p>
      ) : null}
    </Page>
  );
}

export function VoiceAssistScreen() {
  return (
    <ElderSessionGate>
      {() => <VoiceAssistContent />}
    </ElderSessionGate>
  );
}
