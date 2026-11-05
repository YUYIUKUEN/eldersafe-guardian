"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createHelpRequest,
  createLogger,
  type StoredElderProfile,
} from "@eldersafe/shared";
import { getCurrentPosition } from "@/lib/geolocation";

type AssistPanelProps = {
  profile: StoredElderProfile;
  onClose: () => void;
  onSent: () => void;
};

const log = createLogger("elder-assist");

export function AssistPanel({ profile, onClose, onSent }: AssistPanelProps) {
  const t = useTranslations("ElderAssist");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      mediaRecorderRef.current?.stream
        .getTracks()
        .forEach((track) => track.stop());
    };
  }, [audioUrl]);

  async function startRecording() {
    setError(null);
    setStatus(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setStatus(t("ready"));
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setStatus(t("recording"));
    } catch {
      setError(t("micDenied"));
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function rerecord() {
    setAudioBlob(null);
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setStatus(null);
    void startRecording();
  }

  async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function send() {
    if (!audioBlob) {
      setError(t("needRecording"));
      return;
    }
    setSending(true);
    setError(null);
    setStatus(t("sending"));
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const point = await getCurrentPosition();
        latitude = point.latitude;
        longitude = point.longitude;
      } catch {
        setError(t("locationDenied"));
        setSending(false);
        return;
      }

      const audioDataUrl = await blobToDataUrl(audioBlob);

      // Keep a local copy for same-browser elder UI.
      const local = createHelpRequest({
        deviceKey: profile.deviceKey,
        audioDataUrl,
        latitude,
        longitude,
      });

      // Prefer Supabase Storage when configured; otherwise keep data URL.
      let audioPath: string | undefined;
      let audioUrl: string | undefined = audioDataUrl;
      const uploadForm = new FormData();
      uploadForm.set("deviceKey", profile.deviceKey);
      uploadForm.set(
        "file",
        new File([audioBlob], "help.webm", {
          type: audioBlob.type || "audio/webm",
        }),
      );
      const uploadResponse = await fetch("/api/recordings/upload", {
        method: "POST",
        body: uploadForm,
      });
      if (uploadResponse.ok) {
        const uploaded = await uploadResponse.json();
        if (uploaded.mode === "supabase" && uploaded.publicUrl) {
          audioPath = uploaded.path;
          audioUrl = uploaded.publicUrl;
        }
      }

      const response = await fetch("/api/help-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceKey: profile.deviceKey,
          elderName: profile.name,
          elderAge: profile.age,
          elderAddress: profile.address,
          elderPhone: profile.phone,
          emergencyContact: profile.emergencyContact,
          healthNotes: profile.healthNotes,
          audioDataUrl: audioUrl,
          audioPath,
          audioUrl,
          latitude,
          longitude,
        }),
      });
      if (!response.ok) {
        throw new Error("sync failed");
      }
      const data = await response.json();

      log.info("help request created", {
        actorType: "elder",
        actorId: profile.deviceKey,
        metadata: {
          localId: local.id,
          sharedId: data.item?.id,
          storage: Boolean(audioPath),
        },
      });
      setStatus(t("sent"));
      onSent();
    } catch {
      setError(t("needRecording"));
    } finally {
      setSending(false);
    }
  }

  const buttonClass =
    "min-h-16 rounded-2xl px-4 text-[22px] font-bold text-white disabled:opacity-50";

  return (
    <section className="flex flex-1 flex-col gap-5 py-6">
      <h1 className="text-[28px] font-bold text-blue-800">{t("title")}</h1>
      {status ? <p className="text-[20px] text-slate-800">{status}</p> : null}
      {error ? <p className="text-[20px] text-red-700">{error}</p> : null}

      {audioUrl ? <audio className="w-full" controls src={audioUrl} /> : null}

      <div className="grid gap-3">
        {!recording && !audioUrl ? (
          <button
            type="button"
            className={`${buttonClass} bg-blue-700`}
            onClick={() => void startRecording()}
          >
            {t("start")}
          </button>
        ) : null}
        {recording ? (
          <button
            type="button"
            className={`${buttonClass} bg-slate-800`}
            onClick={stopRecording}
          >
            {t("stop")}
          </button>
        ) : null}
        {audioUrl && !recording ? (
          <>
            <button
              type="button"
              className={`${buttonClass} bg-slate-700`}
              onClick={() => {
                const audio = document.querySelector("audio");
                void audio?.play();
              }}
            >
              {t("replay")}
            </button>
            <button
              type="button"
              className={`${buttonClass} bg-slate-600`}
              onClick={rerecord}
            >
              {t("rerecord")}
            </button>
            <button
              type="button"
              className={`${buttonClass} bg-blue-700`}
              disabled={sending}
              onClick={() => void send()}
            >
              {t("send")}
            </button>
          </>
        ) : null}
        <button
          type="button"
          className={`${buttonClass} bg-brand`}
          onClick={onClose}
        >
          {t("close")}
        </button>
      </div>
    </section>
  );
}
