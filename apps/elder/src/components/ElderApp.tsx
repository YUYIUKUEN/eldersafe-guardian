"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getElderProfile,
  getOrCreateDeviceKey,
  type StoredElderProfile,
} from "@eldersafe/shared";
import { AssistPanel } from "@/components/AssistPanel";
import { EmergencyPanel } from "@/components/EmergencyPanel";
import { HelpRequestList } from "@/components/HelpRequestList";
import { OnboardingForm } from "@/components/OnboardingForm";

type View = "home" | "emergency" | "assist" | "requests";

export function ElderApp() {
  const t = useTranslations("Elder");
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<StoredElderProfile | null>(null);
  const [view, setView] = useState<View>("home");

  useEffect(() => {
    getOrCreateDeviceKey();
    setProfile(getElderProfile());
    setReady(true);
  }, []);

  if (!ready) {
    return <p className="py-10 text-center text-[20px] text-slate-700">…</p>;
  }

  if (!profile) {
    return <OnboardingForm onComplete={setProfile} />;
  }

  if (view === "emergency") {
    return (
      <EmergencyPanel profile={profile} onClose={() => setView("home")} />
    );
  }

  if (view === "assist") {
    return (
      <AssistPanel
        profile={profile}
        onClose={() => setView("home")}
        onSent={() => setView("requests")}
      />
    );
  }

  if (view === "requests") {
    return (
      <HelpRequestList profile={profile} onBack={() => setView("home")} />
    );
  }

  return (
    <section className="flex flex-1 flex-col justify-center gap-5 py-4">
      <h1 className="text-center text-[28px] font-bold leading-tight">
        {t("title")}
      </h1>

      <button
        type="button"
        onClick={() => setView("emergency")}
        className="min-h-28 rounded-3xl bg-red-700 px-4 text-[28px] font-black text-white shadow-md"
      >
        {t("homeEmergency")}
      </button>

      <button
        type="button"
        onClick={() => setView("assist")}
        className="min-h-28 rounded-3xl bg-blue-700 px-4 text-[28px] font-black text-white shadow-md"
      >
        {t("homeAssist")}
      </button>

      <button
        type="button"
        onClick={() => setView("requests")}
        className="mx-auto text-[20px] font-semibold text-slate-700 underline underline-offset-4"
      >
        {t("myRequests")}
      </button>

      <p className="text-center text-[20px] leading-relaxed text-slate-600">
        {t("addToHomeHint")}
      </p>
    </section>
  );
}
