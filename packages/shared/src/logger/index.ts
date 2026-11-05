export type LogLevel = "info" | "warn" | "error";

export type LogEntry = {
  level: LogLevel;
  message: string;
  actorType?: "elder" | "volunteer" | "admin" | "system";
  actorId?: string;
  metadata?: Record<string, unknown>;
  at: string;
};

/**
 * Lightweight logger skeleton for shared use across the three apps.
 * Later this can write into the Supabase activity log table.
 */
export function createLogger(scope: string) {
  function write(
    level: LogLevel,
    message: string,
    extras?: Omit<LogEntry, "level" | "message" | "at">,
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message: `[${scope}] ${message}`,
      at: new Date().toISOString(),
      ...extras,
    };

    if (level === "error") {
      console.error(entry);
    } else if (level === "warn") {
      console.warn(entry);
    } else {
      console.info(entry);
    }

    return entry;
  }

  return {
    info: (message: string, extras?: Omit<LogEntry, "level" | "message" | "at">) =>
      write("info", message, extras),
    warn: (message: string, extras?: Omit<LogEntry, "level" | "message" | "at">) =>
      write("warn", message, extras),
    error: (message: string, extras?: Omit<LogEntry, "level" | "message" | "at">) =>
      write("error", message, extras),
  };
}
