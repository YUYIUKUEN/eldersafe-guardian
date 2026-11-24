"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { ElderPublicProfile, HelpMeetingType } from "@eldersafe/shared";
import { readDeviceKey } from "@/lib/elder/device-storage";
import {
  MAX_RECORDING_SECONDS,
  pickSupportedAudioFormat,
  type PickedAudioFormat,
} from "@/lib/elder/media-recorder";
import { Link, useRouter } from "@/i18n/navigation";
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

function VoiceAssistContent({ elder }: { elder: ElderPublicProfile }) {
  const t = useTranslations("VoiceAssist");
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("ready");
  const [secondsLeft, setSecondsLeft] = useState(MAX_RECORDING_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<PickedAudioFormat | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [meetingType, setMeetingType] = useState<HelpMeetingType>("home");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);
  const autoSubmitRef = useRef(false);
  const meetingTypeRef = useRef<HelpMeetingType>(meetingType);

  useEffect(() => {
    meetingTypeRef.current = meetingType;
  }, [meetingType]);

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
    if (!meetingType) {
      setError(t("meetingRequired"));
      return;
    }

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
    autoSubmitRef.current = false;

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
      cleanupRecording();

      if (autoSubmitRef.current) {
        setPhase("submitting");
        void submitRecording({ auto: true });
        return;
      }
      setPhase("review");
    };

    recorder.start(250);
    setSecondsLeft(MAX_RECORDING_SECONDS);
    setPhase("recording");

    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, MAX_RECORDING_SECONDS - elapsed);
      setSecondsLeft(left);
    }, 250);

    autoStopRef.current = window.setTimeout(() => {
      autoSubmitRef.current = true;
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
    autoSubmitRef.current = false;
    resetBlobPreview();
    setSecondsLeft(MAX_RECORDING_SECONDS);
    setPhase("ready");
  }

  async function submitRecording(options?: { auto?: boolean }) {
    const blob = blobRef.current;
    const picked = format;
    const deviceKey = readDeviceKey();
    if (!blob || !picked || !deviceKey) {
      setError(t("submitFailed"));
      if (options?.auto) setPhase("review");
      return;
    }

    if (!meetingTypeRef.current) {
      setError(t("meetingRequired"));
      setPhase("review");
      return;
    }

    setPhase("submitting");
    setError(null);

    const body = new FormData();
    body.append(
      "audio",
      new File([blob], `voice.${picked.extension}`, {
        type: blob.type || picked.mimeType || "application/octet-stream",
      }),
    );
    body.append("mimeType", blob.type || picked.mimeType || "");
    body.append("extension", picked.extension);
    body.append("meetingType", meetingTypeRef.current);

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

  const customPlace = elder.meetingPlace?.trim() || null;
  const resolvedCustomHint = customPlace
    ? t("meetingCustomHint", { place: customPlace })
    : t("meetingCustomFallbackHint", { address: elder.address });

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
        <section className="flex flex-1 flex-col justify-center gap-5">
          <BigText className="text-center" tone="muted">
            {t("hint")}
          </BigText>

          <div className="rounded-2xl border-2 border-border bg-surface px-4 py-4">
            <BigText size="caption" tone="assist" className="mb-2">
              {t("examplesTitle")}
            </BigText>
            <ul className="flex flex-col gap-2">
              <li>
                <BigText>{t("example1")}</BigText>
              </li>
              <li>
                <BigText>{t("example2")}</BigText>
              </li>
              <li>
                <BigText>{t("example3")}</BigText>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <BigText size="caption" className="text-center">
              {t("meetingTitle")}
            </BigText>
            <BigButton
              variant={meetingType === "home" ? "assist" : "assistSoft"}
              className="whitespace-normal text-[22px] leading-snug"
              onClick={() => setMeetingType("home")}
            >
              {t("meetingHome")}
            </BigButton>
            <BigText className="text-center" tone="muted" size="caption">
              {t("meetingHomeHint", { address: elder.address })}
            </BigText>
            <BigButton
              variant={meetingType === "custom" ? "assist" : "assistSoft"}
              className="whitespace-normal text-[22px] leading-snug"
              onClick={() => setMeetingType("custom")}
            >
              {t("meetingCustom")}
            </BigButton>
            <BigText className="text-center" tone="muted" size="caption">
              {resolvedCustomHint}
            </BigText>
            {!customPlace ? (
              <Link
                href="/profile"
                className="text-center text-[20px] font-semibold text-assist underline"
              >
                {t("meetingEditLink")}
              </Link>
            ) : null}
          </div>

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
            {secondsLeft}
          </div>
          <BigText className="text-center" size="caption" tone="assist">
            {t("recording")}
          </BigText>
          <BigText className="text-center" tone="muted">
            {t("countdown", { seconds: secondsLeft })}
          </BigText>
          <BigText className="text-center" tone="muted">
            {t("maxSeconds", { seconds: MAX_RECORDING_SECONDS })}
          </BigText>
          <BigButton
            variant="emergency"
            onClick={() => {
              autoSubmitRef.current = false;
              stopRecording();
            }}
          >
            {t("stop")}
          </BigButton>
        </section>
      ) : null}

      {phase === "review" || phase === "submitting" ? (
        <section className="flex flex-1 flex-col gap-4">
          {phase === "submitting" && autoSubmitRef.current ? (
            <BigText className="text-center" tone="assist">
              {t("autoSubmitting")}
            </BigText>
          ) : (
            <BigText className="text-center" tone="muted">
              {t("reviewHint")}
            </BigText>
          )}
          {audioUrl ? (
            <audio
              controls
              src={audioUrl}
              className="w-full rounded-2xl border-2 border-border"
            >
              {t("replay")}
            </audio>
          ) : null}

          <div className="flex flex-col gap-3">
            <BigText size="caption" className="text-center">
              {t("meetingTitle")}
            </BigText>
            <BigButton
              variant={meetingType === "home" ? "assist" : "assistSoft"}
              disabled={phase === "submitting"}
              className="whitespace-normal text-[22px] leading-snug"
              onClick={() => setMeetingType("home")}
            >
              {t("meetingHome")}
            </BigButton>
            <BigButton
              variant={meetingType === "custom" ? "assist" : "assistSoft"}
              disabled={phase === "submitting"}
              className="whitespace-normal text-[22px] leading-snug"
              onClick={() => setMeetingType("custom")}
            >
              {t("meetingCustom")}
            </BigButton>
          </div>

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
      {(elder) => <VoiceAssistContent elder={elder} />}
    </ElderSessionGate>
  );
}
