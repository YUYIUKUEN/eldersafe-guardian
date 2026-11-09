"use client";

import { tryGetSupabaseAnonConfig } from "@eldersafe/shared";
import { createClient } from "@/lib/supabase/browser";
import type { HelpRequestListItem } from "./help-request-types";

const POLL_MS = 4_000;

export type HelpRequestsLiveHandlers = {
  onItems: (items: HelpRequestListItem[]) => void;
  onError: (message: string) => void;
  onUnauthorized: () => void;
};

/**
 * Keeps the elder help-request list fresh:
 * - always polls the device-key API
 * - also listens to Supabase Realtime when public env is configured
 *   (service-role writes from volunteer/admin still publish; client refreshes)
 */
export function subscribeHelpRequestsLive(
  deviceKey: string,
  handlers: HelpRequestsLiveHandlers,
): () => void {
  let stopped = false;
  let timer: number | null = null;
  let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
    null;

  async function refresh() {
    if (stopped) return;
    try {
      const response = await fetch("/api/elders/help-requests", {
        headers: { "X-Elder-Device-Key": deviceKey },
      });
      if (response.status === 401) {
        handlers.onUnauthorized();
        return;
      }
      const payload = (await response.json()) as {
        helpRequests?: HelpRequestListItem[];
        error?: string;
      };
      if (!response.ok || !payload.helpRequests) {
        throw new Error(payload.error ?? "list_failed");
      }
      if (!stopped) handlers.onItems(payload.helpRequests);
    } catch {
      if (!stopped) handlers.onError("load_failed");
    }
  }

  void refresh();
  timer = window.setInterval(() => {
    void refresh();
  }, POLL_MS);

  const onVisible = () => {
    if (document.visibilityState === "visible") void refresh();
  };
  document.addEventListener("visibilitychange", onVisible);

  let supabase: ReturnType<typeof createClient> | null = null;
  if (tryGetSupabaseAnonConfig()) {
    try {
      supabase = createClient();
      channel = supabase
        .channel(`elder-help-requests-${deviceKey.slice(0, 12)}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "help_requests",
          },
          () => {
            void refresh();
          },
        )
        .subscribe();
    } catch {
      // Polling remains the reliable path when Realtime setup fails.
      supabase = null;
      channel = null;
    }
  }

  return () => {
    stopped = true;
    if (timer != null) window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
    if (supabase && channel) {
      void supabase.removeChannel(channel);
    }
  };
}
