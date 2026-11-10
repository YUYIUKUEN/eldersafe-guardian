"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type AudioPlayerProps = {
  helpRequestId: string;
  elderId: string;
  transcript?: string | null;
};

type SourceState =
  | { status: "loading" }
  | { status: "ready"; url: string; fetchedAt: number }
  | { status: "error"; message: string };

type Speed = 1 | 0.75;

const SIGNED_URL_TTL_MS = 5 * 60 * 1000;
const SIGNED_URL_REFRESH_MARGIN_MS = 30_000;

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  helpRequestId,
  elderId,
  transcript,
}: AudioPlayerProps) {
  const t = useTranslations("VolunteerHelp");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loggedPlayRef = useRef(false);
  const seekingRef = useRef(false);

  const [source, setSource] = useState<SourceState>({ status: "loading" });
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<Speed>(1);
  const [playError, setPlayError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch(
          `/api/volunteers/help-requests/${helpRequestId}/audio`,
          { signal: controller.signal },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          url?: string;
        };
        if (!response.ok || !payload.url) {
          throw new Error("sign_failed");
        }
        setSource({ status: "ready", url: payload.url, fetchedAt: Date.now() });
      } catch {
        if (controller.signal.aborted) return;
        setSource({ status: "error", message: t("audioFailed") });
      }
    })();

    return () => controller.abort();
  }, [helpRequestId, t]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || source.status !== "ready") return;

    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
    audio.playbackRate = speed;

    const onLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onTime = () => {
      if (!seekingRef.current) setCurrentTime(audio.currentTime);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(audio.duration || 0);
    };
    const onError = () => {
      setPlayError(t("audioFailed"));
      setPlaying(false);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    // Safari sometimes only exposes duration after a tiny seek probe.
    if (audio.readyState >= 1) onLoaded();

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [source, speed, t]);

  // Quietly renew the signed URL before it expires (keeps Safari play() in-gesture).
  useEffect(() => {
    if (source.status !== "ready") return;
    const age = Date.now() - source.fetchedAt;
    const renewIn = Math.max(
      SIGNED_URL_TTL_MS - SIGNED_URL_REFRESH_MARGIN_MS - age,
      5_000,
    );
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/volunteers/help-requests/${helpRequestId}/audio`,
          );
          const payload = (await response.json().catch(() => ({}))) as {
            url?: string;
          };
          if (!response.ok || !payload.url) return;
          setSource({
            status: "ready",
            url: payload.url,
            fetchedAt: Date.now(),
          });
          const audio = audioRef.current;
          if (audio && audio.paused) {
            audio.src = payload.url;
          }
        } catch {
          // Next play attempt will surface an error if needed.
        }
      })();
    }, renewIn);
    return () => window.clearTimeout(timer);
  }, [source, helpRequestId]);

  async function logPlayOnce() {
    if (loggedPlayRef.current) return;
    loggedPlayRef.current = true;
    try {
      await fetch(`/api/volunteers/help-requests/${helpRequestId}/audio/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elderId }),
      });
    } catch {
      // Logging must not block playback.
    }
  }

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio || source.status !== "ready") return;
    setPlayError(null);

    if (!audio.paused) {
      audio.pause();
      return;
    }

    audio.playbackRate = speed;

    try {
      // Do not await network before play() — iPhone Safari needs the user gesture.
      await audio.play();
      void logPlayOnce();
    } catch {
      setPlayError(t("audioPlayFailed"));
      setPlaying(false);
    }
  }

  function onSeek(value: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(duration) || duration <= 0) return;
    const next = Math.min(Math.max(value, 0), duration);
    seekingRef.current = true;
    setCurrentTime(next);
    audio.currentTime = next;
    seekingRef.current = false;
  }

  function toggleSpeed() {
    const next: Speed = speed === 1 ? 0.75 : 1;
    setSpeed(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  }

  if (source.status === "loading") {
    return <p className="text-sm text-slate-600">{t("audioLoading")}</p>;
  }
  if (source.status === "error") {
    return (
      <p className="text-sm font-medium text-red-700" role="alert">
        {source.message}
      </p>
    );
  }

  const progressMax = duration > 0 ? duration : 0;
  const transcriptText = transcript?.trim() ?? "";

  return (
    <div className="space-y-3">
      <audio
        ref={audioRef}
        src={source.url}
        preload="metadata"
        playsInline
        className="hidden"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void togglePlay();
          }}
          className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm transition hover:brightness-110 active:scale-95 sm:size-20"
          aria-label={playing ? t("audioPause") : t("audioPlay")}
        >
          <span className="text-2xl font-bold leading-none sm:text-3xl" aria-hidden="true">
            {playing ? "❚❚" : "▶"}
          </span>
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2 text-sm text-slate-700">
            <span>{formatClock(currentTime)}</span>
            <span>
              {duration > 0 ? formatClock(duration) : t("audioDurationPending")}
            </span>
          </div>
          <label className="block">
            <span className="sr-only">{t("audioProgress")}</span>
            <input
              type="range"
              min={0}
              max={progressMax || 1}
              step={0.1}
              value={Math.min(currentTime, progressMax || 0)}
              disabled={progressMax <= 0}
              onChange={(event) => onSeek(Number(event.target.value))}
              className="h-3 w-full cursor-pointer accent-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSpeed}
              className="min-h-10 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-300"
              aria-label={t("audioSpeedAria", { speed: String(speed) })}
            >
              {t("audioSpeed", { speed: String(speed) })}
            </button>
            <span className="text-xs text-slate-500">{t("audioSignedHint")}</span>
          </div>
        </div>
      </div>

      {playError ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {playError}
        </p>
      ) : null}

      <div className="rounded-xl bg-slate-50 px-3 py-2">
        <p className="text-sm font-semibold text-slate-800">{t("transcript")}</p>
        {transcriptText ? (
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
            {transcriptText}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">{t("transcriptEmpty")}</p>
        )}
      </div>
    </div>
  );
}
