"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type AudioPlayerProps = {
  helpRequestId: string;
};

type PlayerState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

export function AudioPlayer({ helpRequestId }: AudioPlayerProps) {
  const t = useTranslations("VolunteerHelp");
  const [state, setState] = useState<PlayerState>({ status: "loading" });

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
          setState({ status: "error", message: t("audioFailed") });
          return;
        }
        setState({ status: "ready", url: payload.url });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: t("audioFailed") });
        void error;
      }
    })();

    return () => controller.abort();
  }, [helpRequestId, t]);

  if (state.status === "loading") {
    return <p className="text-sm text-slate-600">{t("audioLoading")}</p>;
  }
  if (state.status === "error") {
    return (
      <p className="text-sm font-medium text-red-700" role="alert">
        {state.message}
      </p>
    );
  }

  return (
    <audio
      controls
      preload="none"
      src={state.url}
      className="w-full"
      aria-label={t("audioLabel")}
    >
      {t("audioUnsupported")}
    </audio>
  );
}
