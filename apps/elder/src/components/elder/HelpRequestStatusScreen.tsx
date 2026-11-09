"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { readDeviceKey, clearDeviceKey } from "@/lib/elder/device-storage";
import type { HelpRequestListItem } from "@/lib/elder/help-request-types";
import { useRouter } from "@/i18n/navigation";
import { BigButton } from "@/components/ui/BigButton";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";
import { LocationSharingPanel } from "./LocationSharingPanel";

const POLL_MS = 4_000;

export function HelpRequestStatusScreen({ id }: { id: string }) {
  const t = useTranslations("VoiceAssist");
  const tRecords = useTranslations("HelpRecords");
  const tElder = useTranslations("Elder");
  const router = useRouter();
  const [item, setItem] = useState<HelpRequestListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function load() {
      const deviceKey = readDeviceKey();
      if (!deviceKey) {
        router.replace("/onboarding");
        return;
      }

      try {
        const response = await fetch(`/api/elders/help-requests/${id}`, {
          headers: { "X-Elder-Device-Key": deviceKey },
        });
        if (response.status === 401) {
          clearDeviceKey();
          router.replace("/onboarding");
          return;
        }
        const payload = (await response.json()) as {
          helpRequest?: HelpRequestListItem;
          error?: string;
        };
        if (!response.ok || !payload.helpRequest) {
          throw new Error(payload.error ?? "not_found");
        }
        if (!cancelled) {
          setItem(payload.helpRequest);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError(t("statusLoadFailed"));
        }
      }
    }

    void load();
    timer = window.setInterval(() => {
      void load();
    }, POLL_MS);

    return () => {
      cancelled = true;
      if (timer != null) window.clearInterval(timer);
    };
  }, [id, router, t]);

  async function cancelRequest() {
    const deviceKey = readDeviceKey();
    if (!deviceKey) {
      router.replace("/onboarding");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/elders/help-requests/${id}/cancel`, {
        method: "POST",
        headers: { "X-Elder-Device-Key": deviceKey },
      });
      if (!response.ok) throw new Error("cancel_failed");
    } catch {
      setError(tRecords("cancelFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmRequest() {
    const deviceKey = readDeviceKey();
    if (!deviceKey) {
      router.replace("/onboarding");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/elders/help-requests/${id}/confirm`, {
        method: "POST",
        headers: { "X-Elder-Device-Key": deviceKey },
      });
      if (!response.ok) throw new Error("confirm_failed");
    } catch {
      setError(tRecords("confirmFailed"));
    } finally {
      setBusy(false);
    }
  }

  const sharingActive =
    item?.status === "pending" ||
    (item?.status === "accepted" && !item.awaitingElderConfirm);

  const statusText = !item
    ? null
    : item.status === "pending"
      ? tRecords("status.pending")
      : item.status === "cancelled"
        ? tRecords("status.cancelled")
        : item.status === "completed"
          ? tRecords("status.completed")
          : item.awaitingElderConfirm
            ? tRecords("status.volunteerDone", {
                name: item.volunteerName ?? tRecords("volunteerFallback"),
              })
            : tRecords("status.accepted", {
                name: item.volunteerName ?? tRecords("volunteerFallback"),
              });

  return (
    <Page backHref="/records">
      <BigText as="h1" size="title" tone="brand" className="text-center">
        {t("statusTitle")}
      </BigText>

      {!item && !error ? (
        <BigText className="text-center" tone="muted">
          {tElder("checkingDevice")}
        </BigText>
      ) : null}

      {error ? (
        <p role="alert" className="text-[22px] font-bold text-emergency">
          {error}
        </p>
      ) : null}

      {item ? (
        <section className="flex flex-1 flex-col gap-5">
          <div className="text-center">
            <BigText size="title" tone="assist">
              {statusText}
            </BigText>
            <BigText tone="muted">{t("statusHint")}</BigText>
          </div>

          {item.canConfirm ? (
            <BigButton
              variant="assist"
              className="min-h-[110px] text-[26px] leading-snug"
              disabled={busy}
              onClick={() => void confirmRequest()}
            >
              {busy ? tRecords("confirming") : tRecords("confirmThanks")}
            </BigButton>
          ) : null}

          {item.canCancel ? (
            <BigButton
              variant="emergencySoft"
              disabled={busy}
              onClick={() => void cancelRequest()}
            >
              {busy ? tRecords("cancelling") : tRecords("cancelRequest")}
            </BigButton>
          ) : null}

          {sharingActive ||
          item.status === "completed" ||
          item.status === "cancelled" ||
          item.awaitingElderConfirm ? (
            <LocationSharingPanel
              helpRequestId={id}
              active={Boolean(sharingActive)}
            />
          ) : null}

          <BigButton href="/records" variant="assist">
            {tRecords("backToRecords")}
          </BigButton>
        </section>
      ) : null}
    </Page>
  );
}
