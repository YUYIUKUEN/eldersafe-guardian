export type VolunteerHelpFeedStatus = "pending" | "accepted" | "completed";

export type VolunteerHelpFeedItem = {
  id: string;
  status: VolunteerHelpFeedStatus;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  elderConfirmedAt: string | null;
  audioPath: string;
  /** Optional speech-to-text; null/empty when not available. */
  transcript: string | null;
  requestLatitude: number | null;
  requestLongitude: number | null;
  volunteerId: string | null;
  elderId: string;
  elderName: string;
  elderAge: number;
  /** Null until this volunteer has accepted the request. */
  elderAddress: string | null;
  /** Null until this volunteer has accepted the request. */
  elderPhone: string | null;
  liveLatitude: number | null;
  liveLongitude: number | null;
  liveRecordedAt: string | null;
};

export type VolunteerHelpFeedFilter = "pending" | "mine" | "completed";
export type VolunteerHelpFeedSort = "newest" | "distance";

export type VolunteerDisplayStatus =
  | "pending"
  | "accepted"
  | "awaiting_elder"
  | "completed";

type FeedRow = {
  id: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  elder_confirmed_at?: string | null;
  audio_path: string;
  transcript?: string | null;
  request_latitude: number | null;
  request_longitude: number | null;
  volunteer_id: string | null;
  elder_id: string;
  elder_name: string;
  elder_age: number;
  elder_address: string | null;
  elder_phone: string | null;
  live_latitude: number | null;
  live_longitude: number | null;
  live_recorded_at: string | null;
};

function asStatus(value: string): VolunteerHelpFeedStatus | null {
  if (value === "pending" || value === "accepted" || value === "completed") {
    return value;
  }
  return null;
}

export function isAwaitingElderConfirm(item: {
  status: VolunteerHelpFeedStatus;
  completedAt: string | null;
  elderConfirmedAt: string | null;
}): boolean {
  return (
    item.status === "accepted" &&
    item.completedAt != null &&
    item.elderConfirmedAt == null
  );
}

export function volunteerDisplayStatus(
  item: VolunteerHelpFeedItem,
): VolunteerDisplayStatus {
  if (item.status === "completed") return "completed";
  if (isAwaitingElderConfirm(item)) return "awaiting_elder";
  if (item.status === "accepted") return "accepted";
  return "pending";
}

/** Service duration in hours from accept → volunteer mark-complete. */
export function serviceHoursBetween(
  acceptedAt: string | null,
  completedAt: string | null,
): number | null {
  if (!acceptedAt || !completedAt) return null;
  const start = Date.parse(acceptedAt);
  const end = Date.parse(completedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }
  return (end - start) / (1000 * 60 * 60);
}

export function mapVolunteerHelpFeedRow(
  row: FeedRow,
): VolunteerHelpFeedItem | null {
  const status = asStatus(row.status);
  if (!status) return null;
  return {
    id: row.id,
    status,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    completedAt: row.completed_at,
    elderConfirmedAt: row.elder_confirmed_at ?? null,
    audioPath: row.audio_path,
    transcript: row.transcript?.trim() ? row.transcript.trim() : null,
    requestLatitude: row.request_latitude,
    requestLongitude: row.request_longitude,
    volunteerId: row.volunteer_id,
    elderId: row.elder_id,
    elderName: row.elder_name,
    elderAge: row.elder_age,
    elderAddress: row.elder_address,
    elderPhone: row.elder_phone,
    liveLatitude: row.live_latitude,
    liveLongitude: row.live_longitude,
    liveRecordedAt: row.live_recorded_at,
  };
}

export function filterVolunteerHelpFeed(
  items: VolunteerHelpFeedItem[],
  filter: VolunteerHelpFeedFilter,
  volunteerId: string,
): VolunteerHelpFeedItem[] {
  switch (filter) {
    case "pending":
      return items.filter((item) => item.status === "pending");
    case "mine":
      return items.filter(
        (item) =>
          item.volunteerId === volunteerId && item.status === "accepted",
      );
    case "completed":
      return items.filter(
        (item) =>
          item.volunteerId === volunteerId && item.status === "completed",
      );
    default:
      return items;
  }
}

export type VolunteerRecordsSummary = {
  serviceCount: number;
  totalHours: number;
  history: VolunteerHelpFeedItem[];
};

/** Confirmed services + awaiting-confirm history for「我的紀錄」. */
export function buildVolunteerRecordsSummary(
  items: VolunteerHelpFeedItem[],
  volunteerId: string,
): VolunteerRecordsSummary {
  const mine = items.filter((item) => item.volunteerId === volunteerId);
  const history = mine
    .filter(
      (item) =>
        item.status === "completed" || isAwaitingElderConfirm(item),
    )
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.createdAt).getTime() -
        new Date(a.completedAt ?? a.createdAt).getTime(),
    );

  const confirmed = history.filter((item) => item.status === "completed");
  let totalHours = 0;
  for (const item of confirmed) {
    const hours = serviceHoursBetween(item.acceptedAt, item.completedAt);
    if (hours != null) totalHours += hours;
  }

  return {
    serviceCount: confirmed.length,
    totalHours,
    history,
  };
}
