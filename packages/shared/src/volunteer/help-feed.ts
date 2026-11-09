export type VolunteerHelpFeedStatus = "pending" | "accepted" | "completed";

export type VolunteerHelpFeedItem = {
  id: string;
  status: VolunteerHelpFeedStatus;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  audioPath: string;
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

type FeedRow = {
  id: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  audio_path: string;
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
    audioPath: row.audio_path,
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
