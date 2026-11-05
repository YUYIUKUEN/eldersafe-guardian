import { createId } from "../elder/id";
import { calculateAwardPoints } from "../points/rules";
import { getSupabaseServerClient } from "../supabase/server";
import { hashPassword } from "./file-store";
import type {
  SharedActivityLog,
  SharedAdmin,
  SharedElder,
  SharedEmergency,
  SharedHelpRequest,
  SharedVolunteer,
} from "./store-types";

function db() {
  return getSupabaseServerClient();
}

function mapElder(row: Record<string, unknown>): SharedElder {
  return {
    deviceKey: String(row.device_key),
    name: String(row.name),
    age: Number(row.age),
    phone: String(row.phone),
    address: String(row.address),
    emergencyContact: String(row.emergency_contact),
    healthNotes: (row.health_notes as string | null) ?? undefined,
    disabled: Boolean(row.disabled),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapVolunteer(row: Record<string, unknown>): SharedVolunteer {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    age: Number(row.age),
    serviceAreas: (row.service_areas as string[]) ?? [],
    bio: String(row.bio ?? ""),
    approved: Boolean(row.approved),
    disabled: Boolean(row.disabled),
    points: Number(row.points ?? 0),
    createdAt: String(row.created_at),
  };
}

function mapAdmin(row: Record<string, unknown>): SharedAdmin {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    createdAt: String(row.created_at),
  };
}

function mapHelp(row: Record<string, unknown>): SharedHelpRequest {
  return {
    id: String(row.id),
    deviceKey: String(row.device_key),
    elderName: String(row.elder_name),
    elderAge: Number(row.elder_age),
    elderAddress: String(row.elder_address),
    status: row.status as SharedHelpRequest["status"],
    volunteerId: (row.volunteer_id as string | null) ?? null,
    audioDataUrl: (row.audio_url as string | null) ?? undefined,
    audioPath: (row.audio_path as string | null) ?? undefined,
    audioUrl: (row.audio_url as string | null) ?? undefined,
    latitude: row.latitude == null ? undefined : Number(row.latitude),
    longitude: row.longitude == null ? undefined : Number(row.longitude),
    createdAt: String(row.created_at),
    completedAt: (row.completed_at as string | null) ?? undefined,
    elderConfirmedAt: (row.elder_confirmed_at as string | null) ?? undefined,
    pointsAwardedAt: (row.points_awarded_at as string | null) ?? undefined,
  };
}

function mapEmergency(row: Record<string, unknown>): SharedEmergency {
  return {
    id: String(row.id),
    deviceKey: String(row.device_key),
    policeShareToken: String(row.police_share_token),
    elderName: String(row.elder_name),
    latitude: row.latitude == null ? undefined : Number(row.latitude),
    longitude: row.longitude == null ? undefined : Number(row.longitude),
    locationUpdatedAt: (row.location_updated_at as string | null) ?? undefined,
    createdAt: String(row.created_at),
    notifiedAdmin: Boolean(row.notified_admin),
  };
}

function mapLog(row: Record<string, unknown>): SharedActivityLog {
  return {
    id: String(row.id),
    actorType: row.actor_type as SharedActivityLog["actorType"],
    actorId: (row.actor_id as string | null) ?? undefined,
    action: String(row.action),
    metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
    createdAt: String(row.created_at),
  };
}

async function writeLog(
  entry: Omit<SharedActivityLog, "id" | "createdAt">,
) {
  await db().from("activity_logs").insert({
    actor_type: entry.actorType,
    actor_id: entry.actorId ?? null,
    action: entry.action,
    metadata: entry.metadata ?? null,
  });
}

export async function sbUpsertElder(
  input: Omit<SharedElder, "updatedAt">,
): Promise<SharedElder> {
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("elders")
    .upsert(
      {
        device_key: input.deviceKey,
        name: input.name,
        age: input.age,
        phone: input.phone,
        address: input.address,
        emergency_contact: input.emergencyContact,
        health_notes: input.healthNotes ?? null,
        disabled: input.disabled ?? false,
        created_at: input.createdAt,
        updated_at: now,
      },
      { onConflict: "device_key" },
    )
    .select("*")
    .single();
  if (error) throw error;
  await writeLog({
    actorType: "elder",
    actorId: input.deviceKey,
    action: "elder.upsert",
    metadata: { name: input.name },
  });
  return mapElder(data);
}

export async function sbListElders(): Promise<SharedElder[]> {
  const { data, error } = await db()
    .from("elders")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapElder);
}

export async function sbSetElderDisabled(
  deviceKey: string,
  disabled: boolean,
): Promise<SharedElder> {
  const { data, error } = await db()
    .from("elders")
    .update({ disabled, updated_at: new Date().toISOString() })
    .eq("device_key", deviceKey)
    .select("*")
    .single();
  if (error) throw error;
  await writeLog({
    actorType: "admin",
    actorId: deviceKey,
    action: disabled ? "elder.disable" : "elder.enable",
  });
  return mapElder(data);
}

export async function sbCreateHelpRequest(
  input: Omit<SharedHelpRequest, "id" | "status" | "createdAt">,
): Promise<SharedHelpRequest> {
  const elder = await db()
    .from("elders")
    .select("disabled")
    .eq("device_key", input.deviceKey)
    .maybeSingle();
  if (elder.data?.disabled) throw new Error("ELDER_DISABLED");

  const { data, error } = await db()
    .from("help_requests")
    .insert({
      device_key: input.deviceKey,
      elder_name: input.elderName,
      elder_age: input.elderAge,
      elder_address: input.elderAddress,
      status: "pending",
      audio_path: input.audioPath ?? null,
      audio_url: input.audioUrl ?? input.audioDataUrl ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  await writeLog({
    actorType: "elder",
    actorId: input.deviceKey,
    action: "help_request.create",
    metadata: { requestId: data.id },
  });
  return mapHelp(data);
}

export async function sbListHelpRequests(filter?: {
  deviceKey?: string;
  volunteerId?: string;
}): Promise<SharedHelpRequest[]> {
  let query = db().from("help_requests").select("*");
  if (filter?.deviceKey) query = query.eq("device_key", filter.deviceKey);
  if (filter?.volunteerId) query = query.eq("volunteer_id", filter.volunteerId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapHelp);
}

export async function sbAcceptHelpRequest(
  requestId: string,
  volunteerId: string,
): Promise<SharedHelpRequest> {
  const volunteer = await sbGetVolunteer(volunteerId);
  if (!volunteer || !volunteer.approved || volunteer.disabled) {
    throw new Error("VOLUNTEER_NOT_ALLOWED");
  }
  const existing = await db()
    .from("help_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (existing.error) throw new Error("NOT_FOUND");
  if (existing.data.status !== "pending") throw new Error("NOT_PENDING");

  const { data, error } = await db()
    .from("help_requests")
    .update({ status: "accepted", volunteer_id: volunteerId })
    .eq("id", requestId)
    .select("*")
    .single();
  if (error) throw error;
  await writeLog({
    actorType: "volunteer",
    actorId: volunteerId,
    action: "help_request.accept",
    metadata: { requestId },
  });
  return mapHelp(data);
}

export async function sbCompleteHelpRequest(
  requestId: string,
  volunteerId: string,
): Promise<SharedHelpRequest> {
  const existing = await db()
    .from("help_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (existing.error) throw new Error("NOT_FOUND");
  if (existing.data.volunteer_id !== volunteerId) throw new Error("FORBIDDEN");
  if (existing.data.status !== "accepted") throw new Error("NOT_ACCEPTED");

  const { data, error } = await db()
    .from("help_requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select("*")
    .single();
  if (error) throw error;
  await writeLog({
    actorType: "volunteer",
    actorId: volunteerId,
    action: "help_request.complete",
    metadata: { requestId },
  });
  return mapHelp(data);
}

export async function sbConfirmHelpRequestByElder(
  requestId: string,
  deviceKey: string,
): Promise<SharedHelpRequest> {
  const existing = await db()
    .from("help_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (existing.error) throw new Error("NOT_FOUND");
  if (existing.data.device_key !== deviceKey) throw new Error("FORBIDDEN");
  if (existing.data.status !== "completed") throw new Error("NOT_COMPLETED");
  if (existing.data.elder_confirmed_at) return mapHelp(existing.data);

  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("help_requests")
    .update({
      elder_confirmed_at: now,
      points_awarded_at: now,
    })
    .eq("id", requestId)
    .select("*")
    .single();
  if (error) throw error;

  if (existing.data.volunteer_id) {
    const award = calculateAwardPoints({
      requestStatus: "completed",
      elderConfirmed: true,
    });
    const volunteer = await sbGetVolunteer(String(existing.data.volunteer_id));
    if (volunteer) {
      await db()
        .from("volunteers")
        .update({ points: volunteer.points + award })
        .eq("id", volunteer.id);
    }
  }

  await writeLog({
    actorType: "elder",
    actorId: deviceKey,
    action: "help_request.confirm",
    metadata: { requestId, volunteerId: existing.data.volunteer_id },
  });
  return mapHelp(data);
}

export async function sbRegisterVolunteer(input: {
  name: string;
  phone: string;
  email: string;
  password: string;
  age: number;
  serviceAreas: string[];
  bio: string;
}): Promise<SharedVolunteer> {
  const email = input.email.trim().toLowerCase();
  const { data, error } = await db()
    .from("volunteers")
    .insert({
      name: input.name.trim(),
      phone: input.phone.trim(),
      email,
      password_hash: hashPassword(input.password),
      age: input.age,
      service_areas: input.serviceAreas,
      bio: input.bio.trim(),
      approved: false,
      disabled: false,
      points: 0,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("EMAIL_EXISTS");
    throw error;
  }
  await writeLog({
    actorType: "volunteer",
    actorId: data.id,
    action: "volunteer.register",
    metadata: { email },
  });
  return mapVolunteer(data);
}

export async function sbLoginVolunteer(
  email: string,
  password: string,
): Promise<SharedVolunteer> {
  const { data, error } = await db()
    .from("volunteers")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error || !data || data.password_hash !== hashPassword(password)) {
    throw new Error("INVALID_CREDENTIALS");
  }
  if (data.disabled) throw new Error("DISABLED");
  await writeLog({
    actorType: "volunteer",
    actorId: data.id,
    action: "volunteer.login",
  });
  return mapVolunteer(data);
}

export async function sbGetVolunteer(
  id: string,
): Promise<SharedVolunteer | null> {
  const { data } = await db().from("volunteers").select("*").eq("id", id).maybeSingle();
  return data ? mapVolunteer(data) : null;
}

export async function sbListVolunteers(): Promise<SharedVolunteer[]> {
  const { data, error } = await db()
    .from("volunteers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapVolunteer);
}

export async function sbApproveVolunteer(
  id: string,
  adminId?: string,
): Promise<SharedVolunteer> {
  const { data, error } = await db()
    .from("volunteers")
    .update({ approved: true })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await writeLog({
    actorType: adminId ? "admin" : "system",
    actorId: adminId ?? id,
    action: "volunteer.approve",
    metadata: { volunteerId: id },
  });
  return mapVolunteer(data);
}

export async function sbSetVolunteerDisabled(
  id: string,
  disabled: boolean,
  adminId?: string,
): Promise<SharedVolunteer> {
  const { data, error } = await db()
    .from("volunteers")
    .update({ disabled })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await writeLog({
    actorType: "admin",
    actorId: adminId,
    action: disabled ? "volunteer.disable" : "volunteer.enable",
    metadata: { volunteerId: id },
  });
  return mapVolunteer(data);
}

export async function sbAdjustVolunteerPoints(
  id: string,
  points: number,
  adminId?: string,
): Promise<SharedVolunteer> {
  const { data, error } = await db()
    .from("volunteers")
    .update({ points: Math.max(0, Math.floor(points)) })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await writeLog({
    actorType: "admin",
    actorId: adminId,
    action: "volunteer.points_adjust",
    metadata: { volunteerId: id, points },
  });
  return mapVolunteer(data);
}

export async function sbListLeaderboard(): Promise<
  Array<{ id: string; name: string; points: number }>
> {
  const { data, error } = await db()
    .from("volunteers")
    .select("id,name,points,approved,disabled")
    .eq("approved", true)
    .eq("disabled", false)
    .order("points", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    points: Number(row.points ?? 0),
  }));
}

/** Monthly leaderboard based on confirmed completions in YYYY-MM. */
export async function sbListMonthlyLeaderboard(
  month = new Date().toISOString().slice(0, 7),
): Promise<Array<{ id: string; name: string; points: number }>> {
  const start = `${month}-01T00:00:00.000Z`;
  const endDate = new Date(start);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  const end = endDate.toISOString();

  const { data, error } = await db()
    .from("help_requests")
    .select("volunteer_id, points_awarded_at")
    .not("points_awarded_at", "is", null)
    .gte("points_awarded_at", start)
    .lt("points_awarded_at", end);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.volunteer_id) continue;
    const id = String(row.volunteer_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const volunteers = await sbListVolunteers();
  return volunteers
    .filter((item) => item.approved && !item.disabled && counts.has(item.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      points: (counts.get(item.id) ?? 0) * calculateAwardPoints({
        requestStatus: "completed",
        elderConfirmed: true,
      }),
    }))
    .sort((a, b) => b.points - a.points);
}

export async function sbCreateEmergency(input: {
  deviceKey: string;
  elderName: string;
  latitude?: number;
  longitude?: number;
  locationUpdatedAt?: string;
  policeShareToken?: string;
}): Promise<SharedEmergency> {
  const token = input.policeShareToken ?? createId("police");
  const { data, error } = await db()
    .from("emergencies")
    .insert({
      device_key: input.deviceKey,
      police_share_token: token,
      elder_name: input.elderName,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      location_updated_at: input.locationUpdatedAt ?? null,
      notified_admin: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  await writeLog({
    actorType: "elder",
    actorId: input.deviceKey,
    action: "emergency.create",
    metadata: { emergencyId: data.id },
  });
  return mapEmergency(data);
}

export async function sbUpdateEmergencyByToken(
  token: string,
  latitude: number,
  longitude: number,
): Promise<SharedEmergency | null> {
  const { data, error } = await db()
    .from("emergencies")
    .update({
      latitude,
      longitude,
      location_updated_at: new Date().toISOString(),
    })
    .eq("police_share_token", token)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapEmergency(data) : null;
}

export async function sbGetEmergencyByToken(
  token: string,
): Promise<SharedEmergency | null> {
  const { data } = await db()
    .from("emergencies")
    .select("*")
    .eq("police_share_token", token)
    .maybeSingle();
  return data ? mapEmergency(data) : null;
}

export async function sbListEmergencies(): Promise<SharedEmergency[]> {
  const { data, error } = await db()
    .from("emergencies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapEmergency);
}

export async function sbLoginAdmin(
  email: string,
  password: string,
): Promise<SharedAdmin> {
  const { data } = await db()
    .from("admins")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (!data || data.password_hash !== hashPassword(password)) {
    throw new Error("INVALID_CREDENTIALS");
  }
  await writeLog({
    actorType: "admin",
    actorId: data.id,
    action: "admin.login",
  });
  return mapAdmin(data);
}

export async function sbGetAdmin(id: string): Promise<SharedAdmin | null> {
  const { data } = await db().from("admins").select("*").eq("id", id).maybeSingle();
  return data ? mapAdmin(data) : null;
}

export async function sbListActivityLogs(filter?: {
  actorType?: SharedActivityLog["actorType"];
  action?: string;
}): Promise<SharedActivityLog[]> {
  let query = db().from("activity_logs").select("*");
  if (filter?.actorType) query = query.eq("actor_type", filter.actorType);
  if (filter?.action) query = query.ilike("action", `%${filter.action}%`);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLog);
}

export async function sbGetActivitySummary() {
  const [elders, volunteers, helpRequests, emergencies] = await Promise.all([
    sbListElders(),
    sbListVolunteers(),
    sbListHelpRequests(),
    sbListEmergencies(),
  ]);
  return {
    elders: elders.map((elder) => ({
      id: elder.deviceKey,
      name: elder.name,
      requests: helpRequests.filter((item) => item.deviceKey === elder.deviceKey)
        .length,
      emergencies: emergencies.filter(
        (item) => item.deviceKey === elder.deviceKey,
      ).length,
      disabled: Boolean(elder.disabled),
      updatedAt: elder.updatedAt,
    })),
    volunteers: volunteers.map((volunteer) => ({
      id: volunteer.id,
      name: volunteer.name,
      accepted: helpRequests.filter((item) => item.volunteerId === volunteer.id)
        .length,
      completed: helpRequests.filter(
        (item) =>
          item.volunteerId === volunteer.id && item.status === "completed",
      ).length,
      points: volunteer.points,
      approved: volunteer.approved,
      disabled: volunteer.disabled,
      createdAt: volunteer.createdAt,
    })),
  };
}

export async function sbListPairings() {
  const [requests, volunteers] = await Promise.all([
    sbListHelpRequests(),
    sbListVolunteers(),
  ]);
  return requests.map((request) => {
    const volunteer = request.volunteerId
      ? volunteers.find((item) => item.id === request.volunteerId)
      : null;
    return {
      ...request,
      volunteerName: volunteer?.name ?? null,
      volunteerEmail: volunteer?.email ?? null,
    };
  });
}

export async function sbUploadRecording(
  deviceKey: string,
  bytes: ArrayBuffer,
  contentType = "audio/webm",
): Promise<{ path: string; publicUrl: string }> {
  const path = `${deviceKey}/${createId("audio")}.webm`;
  const { error } = await db()
    .storage.from("recordings")
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
  const { data } = db().storage.from("recordings").getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
