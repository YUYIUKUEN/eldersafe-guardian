"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { clearDeviceKey, readDeviceKey } from "@/lib/elder/device-storage";
import type { HelpRequestListItem } from "@/lib/elder/help-request-types";
import { subscribeHelpRequestsLive } from "@/lib/elder/help-requests-live";
import { useRouter } from "@/i18n/navigation";
import { BigButton } from "@/components/ui/BigButton";
import { BigText } from "@/components/ui/BigText";
import { Page } from "@/components/ui/Page";
import { ConfirmCompletePanel } from "./ConfirmCompletePanel";
import { ElderSessionGate } from "./ElderSessionGate";

function statusTone(item: HelpRequestListItem): {
  card: string;
  title: string;
} {
  if (item.status === "pending") {
    return {
      card: "border-assist bg-assist-soft",
      title: "text-assist",
    };
  }
  if (item.status === "accepted") {
    return {
      card: "border-brand bg-[#e8f0f8]",
      title: "text-brand",
    };
  }
  if (item.status === "completed") {
    return {
      card: "border-neutral bg-[#e7f3ec]",
      title: "text-neutral",
    };
  }
  return {
    card: "border-[#64748b] bg-[#eef2f6]",
    title: "text-muted",
  };
}

function statusLabel(
  item: HelpRequestListItem,
  t: ReturnType<typeof useTranslations<"HelpRecords">>,
): string {
  if (item.status === "pending") return t("status.pending");
  if (item.status === "cancelled") return t("status.cancelled");
  if (item.status === "completed") return t("status.completed");
  if (item.awaitingElderConfirm) {
    return t("status.volunteerDone", {
      name: item.volunteerName ?? t("volunteerFallback"),
    });
  }
  return t("status.accepted", {
    name: item.volunteerName ?? t("volunteerFallback"),
  });
}

function formatWhen(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === "zh-HK" ? "zh-HK" : "en-HK", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function HelpRecordsContent() {
  const t = useTranslations("HelpRecords");
  const tElder = useTranslations("Elder");
  const locale = useLocale();
  const router = useRouter();
  const [items, setItems] = useState<HelpRequestListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const deviceKey = readDeviceKey();
    if (!deviceKey) {
      router.replace("/onboarding");
      return;
    }

    return subscribeHelpRequestsLive(deviceKey, {
      onItems: (next) => {
        setItems(next);
        setError(null);
      },
      onError: () => setError(t("loadFailed")),
      onUnauthorized: () => {
        clearDeviceKey();
        router.replace("/onboarding");
      },
    });
  }, [router, t]);

  async function reloadList(deviceKey: string) {
    const response = await fetch("/api/elders/help-requests", {
      headers: { "X-Elder-Device-Key": deviceKey },
    });
    if (response.status === 401) {
      clearDeviceKey();
      router.replace("/onboarding");
      return;
    }
    const payload = (await response.json()) as {
      helpRequests?: HelpRequestListItem[];
      error?: string;
    };
    if (!response.ok || !payload.helpRequests) {
      throw new Error(payload.error ?? "list_failed");
    }
    setItems(payload.helpRequests);
  }

  async function cancelRequest(id: string) {
    const deviceKey = readDeviceKey();
    if (!deviceKey) {
      router.replace("/onboarding");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/elders/help-requests/${id}/cancel`, {
        method: "POST",
        headers: { "X-Elder-Device-Key": deviceKey },
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "cancel_failed");
      }
      await reloadList(deviceKey);
    } catch {
      setError(t("cancelFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRequest(id: string, rating: number | null) {
    const deviceKey = readDeviceKey();
    if (!deviceKey) {
      router.replace("/onboarding");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/elders/help-requests/${id}/confirm`, {
        method: "POST",
        headers: {
          "X-Elder-Device-Key": deviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        if (payload.error === "not_confirmable") {
          setError(t("alreadyConfirmed"));
          await reloadList(deviceKey);
          return;
        }
        throw new Error(payload.error ?? "confirm_failed");
      }
      await reloadList(deviceKey);
    } catch {
      setError(t("confirmFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Page backHref="/">
      <BigText as="h1" size="title" tone="brand" className="text-center">
        {t("title")}
      </BigText>
      <BigText className="text-center" tone="muted">
        {t("autoUpdateHint")}
      </BigText>

      {items == null && !error ? (
        <BigText className="text-center" tone="muted">
          {tElder("checkingDevice")}
        </BigText>
      ) : null}

      {error ? (
        <p role="alert" className="text-[22px] font-bold text-emergency">
          {error}
        </p>
      ) : null}

      {items && items.length === 0 ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-4">
          <BigText className="text-center">{t("empty")}</BigText>
          <BigButton href="/assist" variant="assist">
            {t("askHelp")}
          </BigButton>
        </section>
      ) : null}

      {items && items.length > 0 ? (
        <section className="flex flex-col gap-4 pb-4">
          {items.map((item) => {
            const tone = statusTone(item);
            const busy = busyId === item.id;
            return (
              <article
                key={item.id}
                className={[
                  "flex flex-col gap-4 rounded-3xl border-4 px-4 py-5",
                  tone.card,
                ].join(" ")}
              >
                <p
                  className={[
                    "text-center text-[28px] font-bold leading-tight",
                    tone.title,
                  ].join(" ")}
                >
                  {statusLabel(item, t)}
                </p>
                <BigText className="text-center" tone="muted">
                  {t("createdAt", {
                    when: formatWhen(item.createdAt, locale),
                  })}
                </BigText>

                {item.canConfirm ? (
                  <ConfirmCompletePanel
                    busy={busy}
                    onConfirm={(rating) => confirmRequest(item.id, rating)}
                  />
                ) : null}

                {item.canCancel ? (
                  <BigButton
                    variant="emergencySoft"
                    disabled={busy}
                    onClick={() => void cancelRequest(item.id)}
                  >
                    {busy ? t("cancelling") : t("cancelRequest")}
                  </BigButton>
                ) : null}

                <BigButton
                  href={`/assist/status/${item.id}`}
                  variant="neutral"
                  className="min-h-[72px]"
                >
                  {t("openStatus")}
                </BigButton>
              </article>
            );
          })}
        </section>
      ) : null}
    </Page>
  );
}

export function HelpRecordsScreen() {
  return (
    <ElderSessionGate>{() => <HelpRecordsContent />}</ElderSessionGate>
  );
}
