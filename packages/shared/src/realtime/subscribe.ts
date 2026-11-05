import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type RealtimeHandlers = {
  onHelpRequestChange?: () => void;
  onEmergencyChange?: () => void;
};

/**
 * Subscribe to help_requests + emergencies changes.
 * No-op when supabase client is null (local mode).
 */
export function subscribeElderSafeRealtime(
  client: SupabaseClient | null,
  handlers: RealtimeHandlers,
): () => void {
  if (!client) return () => undefined;

  const channels: RealtimeChannel[] = [];

  if (handlers.onHelpRequestChange) {
    const channel = client
      .channel("help-requests-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "help_requests" },
        () => handlers.onHelpRequestChange?.(),
      )
      .subscribe();
    channels.push(channel);
  }

  if (handlers.onEmergencyChange) {
    const channel = client
      .channel("emergencies-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergencies" },
        () => handlers.onEmergencyChange?.(),
      )
      .subscribe();
    channels.push(channel);
  }

  return () => {
    channels.forEach((channel) => {
      void client.removeChannel(channel);
    });
  };
}
